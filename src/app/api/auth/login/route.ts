import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withRateLimit, rateLimiters } from '@/lib/rate-limiter'
import {
  verifyPassword,
  generateSessionToken,
  logSecurityEvent,
  SecurityEventType,
  SECURITY_MESSAGES,
  detectSuspiciousActivity,
  getClientIP
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

// Fallback authentication when Supabase unavailable (using secure hashing now)
const FALLBACK_USERS: Record<string, {
  id: string,
  email: string,
  username: string,
  password: string, // Now stores bcrypt hash instead of base64
  created_at: string
}> = {}

// Secure login handler with rate limiting and comprehensive security logging
async function loginHandler(request: NextRequest) {
  const clientIP = getClientIP(request)
  let email = ''

  try {
    const { email: userEmail, password } = await request.json()
    email = userEmail

    // Input validation
    if (!email || !password) {
      logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
        email,
        severity: 'MEDIUM',
        additionalData: { reason: 'Missing credentials' }
      })

      return NextResponse.json(
        {
          error: 'Missing required fields: email, password',
          success: false
        },
        { status: 400 }
      )
    }

    // Check for suspicious activity
    const suspiciousCheck = detectSuspiciousActivity(clientIP, email)
    if (suspiciousCheck.isSuspicious) {
      logSecurityEvent(SecurityEventType.BRUTE_FORCE_DETECTED, request, {
        email,
        severity: 'CRITICAL',
        additionalData: {
          reason: suspiciousCheck.reason,
          recentAttempts: suspiciousCheck.recentAttempts
        }
      })

      return NextResponse.json(
        {
          error: SECURITY_MESSAGES.RATE_LIMIT_EXCEEDED,
          success: false,
          retryAfter: 900 // 15 minutes
        },
        { status: 429 }
      )
    }

    // Try Supabase first if configured
    if (supabase && isSupabaseConfigured) {
      try {
        logSecurityEvent(SecurityEventType.AUTHENTICATION_SUCCESS, request, {
          email,
          severity: 'LOW',
          additionalData: { provider: 'supabase', stage: 'attempting' }
        })

        // Authenticate user
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (authError) {
          logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
            email,
            severity: 'MEDIUM',
            additionalData: { provider: 'supabase', error: authError.message }
          })

          return NextResponse.json(
            {
              error: SECURITY_MESSAGES.INVALID_CREDENTIALS,
              success: false
            },
            { status: 401 }
          )
        }

        if (!authData.user) {
          logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
            email,
            severity: 'MEDIUM',
            additionalData: { provider: 'supabase', reason: 'No user data returned' }
          })

          return NextResponse.json(
            {
              error: SECURITY_MESSAGES.INVALID_CREDENTIALS,
              success: false
            },
            { status: 401 }
          )
        }

        // Get user profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', authData.user.id)
          .single()

        logSecurityEvent(SecurityEventType.AUTHENTICATION_SUCCESS, request, {
          email,
          userId: authData.user.id,
          severity: 'LOW',
          additionalData: { provider: 'supabase', stage: 'completed' }
        })

        return NextResponse.json({
          success: true,
          message: 'Login successful',
          user: {
            id: authData.user.id,
            email: authData.user.email,
            username: profile?.username || 'Unknown',
            avatar_url: profile?.avatar_url,
            bio: profile?.bio,
            favorite_genres: profile?.favorite_genres || [],
            watch_preferences: profile?.watch_preferences || {
              autoplay: true,
              subtitle_language: 'english',
              video_quality: 'auto'
            },
            emailConfirmed: authData.user.email_confirmed_at !== null
          },
          session: {
            access_token: authData.session?.access_token,
            refresh_token: authData.session?.refresh_token,
            expires_at: authData.session?.expires_at
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
            fallbackMode: true
          }
        })
      }
    }

    // Fallback to secure fallback mode
    logSecurityEvent(SecurityEventType.AUTHENTICATION_SUCCESS, request, {
      email,
      severity: 'LOW',
      additionalData: { provider: 'fallback', stage: 'attempting' }
    })

    // Find user by email
    const user = Object.values(FALLBACK_USERS).find(u => u.email === email)

    if (!user) {
      logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
        email,
        severity: 'MEDIUM',
        additionalData: { provider: 'fallback', reason: 'User not found' }
      })

      return NextResponse.json(
        {
          error: SECURITY_MESSAGES.INVALID_CREDENTIALS,
          success: false
        },
        { status: 401 }
      )
    }

    // Verify password using secure bcrypt comparison
    const isPasswordValid = await verifyPassword(password, user.password)
    
    if (!isPasswordValid) {
      logSecurityEvent(SecurityEventType.PASSWORD_VERIFICATION_FAILED, request, {
        email,
        userId: user.id,
        severity: 'HIGH',
        additionalData: { provider: 'fallback', reason: 'Invalid password' }
      })

      return NextResponse.json(
        {
          error: SECURITY_MESSAGES.INVALID_CREDENTIALS,
          success: false
        },
        { status: 401 }
      )
    }

    // Generate secure session token
    const sessionData = generateSessionToken(user.id, user.email)

    logSecurityEvent(SecurityEventType.AUTHENTICATION_SUCCESS, request, {
      email,
      userId: user.id,
      severity: 'LOW',
      additionalData: { provider: 'fallback', stage: 'completed' }
    })

    logSecurityEvent(SecurityEventType.SECURE_TOKEN_GENERATED, request, {
      email,
      userId: user.id,
      severity: 'LOW',
      additionalData: { tokenType: 'session', expiresAt: sessionData.expiresAt }
    })

    return NextResponse.json({
      success: true,
      message: 'Login successful (secure fallback mode)',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatar_url: null,
        bio: null,
        favorite_genres: ['Action', 'Adventure'],
        watch_preferences: {
          autoplay: true,
          subtitle_language: 'english',
          video_quality: 'auto'
        },
        emailConfirmed: true
      },
      session: {
        access_token: sessionData.token,
        refresh_token: sessionData.token + '_refresh',
        expires_at: sessionData.expiresAt
      },
      mode: 'secure_demo',
      note: 'Secure demo login with bcrypt hashing and comprehensive logging.',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    logSecurityEvent(SecurityEventType.AUTHENTICATION_FAILURE, request, {
      email,
      severity: 'CRITICAL',
      additionalData: {
        error: error instanceof Error ? error.message : 'Unknown error',
        stage: 'exception'
      }
    })

    return NextResponse.json(
      {
        error: 'Authentication failed',
        success: false
      },
      { status: 500 }
    )
  }
}

// Export POST handler with rate limiting
export const POST = withRateLimit(loginHandler, rateLimiters.auth)
