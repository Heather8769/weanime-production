import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withRateLimit, rateLimiters } from '@/lib/rate-limiter'
import {
  hashPassword,
  validatePasswordComplexity,
  generateSessionToken,
  logSecurityEvent,
  SecurityEventType,
  SECURITY_MESSAGES,
  getClientIP,
  generateSecureToken
} from '@/lib/auth-security'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && supabaseServiceKey &&
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  supabaseServiceKey !== 'your_service_role_key_here'

let supabase: any = null

if (isSupabaseConfigured) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey)
  } catch (error) {
    console.error('Failed to initialize Supabase:', error)
  }
}

// Secure fallback authentication system when Supabase is unavailable
const FALLBACK_USERS: Record<string, {
  id: string,
  email: string,
  username: string,
  password: string, // Now stores bcrypt hash
  created_at: string
}> = {}

function generateUserId(): string {
  return 'user_' + generateSecureToken().substring(0, 16)
}

// Secure registration handler with comprehensive validation and security logging
async function registerHandler(request: NextRequest) {
  const clientIP = getClientIP(request)
  let email = ''
  let username = ''

  try {
    const { email: userEmail, password, username: userUsername } = await request.json()
    email = userEmail
    username = userUsername

    // Input validation
    if (!email || !password || !username) {
      logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
        email,
        severity: 'MEDIUM',
        additionalData: { reason: 'Missing required fields', stage: 'registration' }
      })

      return NextResponse.json(
        {
          error: 'Missing required fields: email, password, username',
          success: false
        },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
        email,
        severity: 'MEDIUM',
        additionalData: { reason: 'Invalid email format', stage: 'registration' }
      })

      return NextResponse.json(
        {
          error: 'Invalid email format',
          success: false
        },
        { status: 400 }
      )
    }

    // Comprehensive password validation
    const passwordValidation = validatePasswordComplexity(password)
    if (!passwordValidation.isValid) {
      logSecurityEvent(SecurityEventType.WEAK_PASSWORD_REJECTED, request, {
        email,
        severity: 'HIGH',
        additionalData: {
          errors: passwordValidation.errors,
          strength: passwordValidation.strength,
          stage: 'registration'
        }
      })

      return NextResponse.json(
        {
          error: SECURITY_MESSAGES.WEAK_PASSWORD,
          details: passwordValidation.errors,
          success: false
        },
        { status: 400 }
      )
    }

    // Validate username
    if (username.length < 3 || username.length > 20) {
      logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
        email,
        severity: 'MEDIUM',
        additionalData: { reason: 'Invalid username length', stage: 'registration' }
      })

      return NextResponse.json(
        {
          error: 'Username must be between 3 and 20 characters',
          success: false
        },
        { status: 400 }
      )
    }

    // Try Supabase first if configured
    if (supabase && isSupabaseConfigured) {
      try {
        logSecurityEvent(SecurityEventType.AUTHENTICATION_SUCCESS, request, {
          email,
          severity: 'LOW',
          additionalData: { provider: 'supabase', stage: 'registration_attempting' }
        })

        // Check if username already exists
        const { data: existingUser } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('username', username)
          .single()

        if (existingUser) {
          logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
            email,
            severity: 'MEDIUM',
            additionalData: { reason: 'Username taken', stage: 'registration', provider: 'supabase' }
          })

          return NextResponse.json(
            {
              error: 'Username already taken',
              success: false
            },
            { status: 409 }
          )
        }

        // Create user account
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username
            }
          }
        })

        if (authError) {
          logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
            email,
            severity: 'HIGH',
            additionalData: {
              provider: 'supabase',
              error: authError.message,
              stage: 'registration'
            }
          })

          return NextResponse.json(
            {
              error: authError.message,
              success: false
            },
            { status: 400 }
          )
        }

        if (!authData.user) {
          logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
            email,
            severity: 'CRITICAL',
            additionalData: {
              provider: 'supabase',
              reason: 'No user data returned',
              stage: 'registration'
            }
          })

          return NextResponse.json(
            {
              error: SECURITY_MESSAGES.REGISTRATION_FAILED,
              success: false
            },
            { status: 500 }
          )
        }

        // Create user profile
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: authData.user.id,
            username: username,
            email: email,
            created_at: new Date().toISOString(),
            avatar_url: null,
            bio: null,
            favorite_genres: [],
            watch_preferences: {
              autoplay: true,
              subtitle_language: 'english',
              video_quality: 'auto'
            }
          })

        if (profileError) {
          logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
            email,
            userId: authData.user.id,
            severity: 'MEDIUM',
            additionalData: {
              provider: 'supabase',
              error: profileError.message,
              stage: 'profile_creation'
            }
          })
        }

        logSecurityEvent(SecurityEventType.AUTHENTICATION_SUCCESS, request, {
          email,
          userId: authData.user.id,
          severity: 'LOW',
          additionalData: { provider: 'supabase', stage: 'registration_completed' }
        })

        return NextResponse.json({
          success: true,
          message: 'User registered successfully',
          user: {
            id: authData.user.id,
            email: authData.user.email,
            username: username,
            emailConfirmed: authData.user.email_confirmed_at !== null
          },
          mode: 'supabase',
          timestamp: new Date().toISOString()
        })

      } catch (supabaseError) {
        logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
          email,
          severity: 'HIGH',
          additionalData: {
            provider: 'supabase',
            error: supabaseError instanceof Error ? supabaseError.message : 'Unknown error',
            stage: 'registration',
            fallbackMode: true
          }
        })
      }
    }

    // Secure fallback mode
    logSecurityEvent(SecurityEventType.AUTHENTICATION_SUCCESS, request, {
      email,
      severity: 'LOW',
      additionalData: { provider: 'fallback', stage: 'registration_attempting' }
    })

    // Check if user already exists
    const existingUser = Object.values(FALLBACK_USERS).find(
      user => user.email === email || user.username === username
    )

    if (existingUser) {
      logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
        email,
        severity: 'MEDIUM',
        additionalData: {
          provider: 'fallback',
          reason: existingUser.email === email ? 'Email taken' : 'Username taken',
          stage: 'registration'
        }
      })

      return NextResponse.json(
        {
          error: existingUser.email === email ? 'Email already registered' : 'Username already taken',
          success: false
        },
        { status: 409 }
      )
    }

    // Create user account with secure password hashing
    const userId = generateUserId()
    const hashedPassword = await hashPassword(password)

    logSecurityEvent(SecurityEventType.PASSWORD_HASHED, request, {
      email,
      userId,
      severity: 'LOW',
      additionalData: {
        provider: 'fallback',
        passwordStrength: passwordValidation.strength,
        stage: 'registration'
      }
    })

    FALLBACK_USERS[userId] = {
      id: userId,
      email,
      username,
      password: hashedPassword,
      created_at: new Date().toISOString()
    }

    logSecurityEvent(SecurityEventType.AUTHENTICATION_SUCCESS, request, {
      email,
      userId,
      severity: 'LOW',
      additionalData: { provider: 'fallback', stage: 'registration_completed' }
    })

    return NextResponse.json({
      success: true,
      message: 'User registered successfully (secure fallback mode)',
      user: {
        id: userId,
        email: email,
        username: username,
        emailConfirmed: true // Fallback mode - auto-confirm
      },
      mode: 'secure_demo',
      note: 'Secure demo registration with bcrypt password hashing and comprehensive security logging.',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
      email,
      severity: 'CRITICAL',
      additionalData: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'registration_exception'
      }
    })

    return NextResponse.json(
      {
        error: SECURITY_MESSAGES.REGISTRATION_FAILED,
        success: false
      },
      { status: 500 }
    )
  }
}

// Export POST handler with rate limiting (stricter for registration)
export const POST = withRateLimit(registerHandler, rateLimiters.auth)
