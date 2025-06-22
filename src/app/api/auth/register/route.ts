import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'


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

// Fallback authentication system when Supabase is unavailable
const FALLBACK_USERS: Record<string, {
  id: string,
  email: string,
  username: string,
  password: string,
  created_at: string
}> = {}

function generateUserId(): string {
  return 'user_' + Math.random().toString(36).substr(2, 9)
}

function hashPassword(password: string): string {
  return Buffer.from(password).toString('base64')
}

function verifyPassword(password: string, hash: string): boolean {
  return Buffer.from(password).toString('base64') === hash
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json()

    if (!email || !password || !username) {
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
      return NextResponse.json(
        {
          error: 'Invalid email format',
          success: false
        },
        { status: 400 }
      )
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        {
          error: 'Password must be at least 8 characters long',
          success: false
        },
        { status: 400 }
      )
    }

    // Validate username
    if (username.length < 3 || username.length > 20) {
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
        console.log(`Attempting to register user: ${email} (using Supabase)`)

        // Check if username already exists
        const { data: existingUser } = await supabase
          .from('user_profiles')
          .select('username')
          .eq('username', username)
          .single()

        if (existingUser) {
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
          console.error('Supabase auth error:', authError)
          return NextResponse.json(
            {
              error: authError.message,
              success: false
            },
            { status: 400 }
          )
        }

        if (!authData.user) {
          return NextResponse.json(
            {
              error: 'Failed to create user account',
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
          console.error('Profile creation error:', profileError)
          // Don't fail registration if profile creation fails
        }

        console.log(`Successfully registered user: ${email}`)

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
        console.error('Supabase registration failed, falling back to fallback mode:', supabaseError)
      }
    }

    // Fallback to fallback mode
    console.log(`Attempting to register user: ${email} (using fallback auth)`)

    // Check if user already exists
    const existingUser = Object.values(FALLBACK_USERS).find(
      user => user.email === email || user.username === username
    )

    if (existingUser) {
      return NextResponse.json(
        {
          error: existingUser.email === email ? 'Email already registered' : 'Username already taken',
          success: false
        },
        { status: 409 }
      )
    }

    // Create user account (fallback mode)
    const userId = generateUserId()
    const hashedPassword = hashPassword(password)

    FALLBACK_USERS[userId] = {
      id: userId,
      email,
      username,
      password: hashedPassword,
      created_at: new Date().toISOString()
    }

    console.log(`Successfully registered fallback user: ${email}`)

    return NextResponse.json({
      success: true,
      message: 'User registered successfully (fallback mode)',
      user: {
        id: userId,
        email: email,
        username: username,
        emailConfirmed: true // Fallback mode - auto-confirm
      },
      mode: 'demo',
      note: 'This is a demo registration. Data will not persist between server restarts.',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Registration error:', error)

    return NextResponse.json(
      {
        error: 'Failed to register user',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    )
  }
}
