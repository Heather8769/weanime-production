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

// Demo users storage (shared with register route)
const DEMO_USERS: Record<string, {
  id: string,
  email: string,
  username: string,
  password: string,
  created_at: string
}> = {}

function verifyPassword(password: string, hash: string): boolean {
  return Buffer.from(password).toString('base64') === hash
}

function generateToken(): string {
  return 'demo_token_' + Math.random().toString(36).substr(2, 16)
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        {
          error: 'Missing required fields: email, password',
          success: false
        },
        { status: 400 }
      )
    }

    // Try Supabase first if configured
    if (supabase && isSupabaseConfigured) {
      try {
        console.log(`Attempting to login user: ${email} (using Supabase)`)

        // Authenticate user
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (authError) {
          console.error('Login error:', authError)
          return NextResponse.json(
            {
              error: authError.message,
              success: false
            },
            { status: 401 }
          )
        }

        if (!authData.user) {
          return NextResponse.json(
            {
              error: 'Authentication failed',
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

        console.log(`Successfully logged in user: ${email}`)

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
        console.error('Supabase login failed, falling back to demo mode:', supabaseError)
      }
    }

    // Fallback to demo mode
    console.log(`Attempting to login user: ${email} (using fallback auth)`)

    // Find user by email
    const user = Object.values(DEMO_USERS).find(u => u.email === email)

    if (!user) {
      return NextResponse.json(
        {
          error: 'User not found. Please register first.',
          success: false
        },
        { status: 401 }
      )
    }

    // Verify password
    if (!verifyPassword(password, user.password)) {
      return NextResponse.json(
        {
          error: 'Invalid password',
          success: false
        },
        { status: 401 }
      )
    }

    console.log(`Successfully logged in demo user: ${email}`)

    const token = generateToken()
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000) // 24 hours

    return NextResponse.json({
      success: true,
      message: 'Login successful (demo mode)',
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
        access_token: token,
        refresh_token: token + '_refresh',
        expires_at: expiresAt
      },
      mode: 'demo',
      note: 'This is a demo login. Session will not persist between server restarts.',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Login error:', error)

    return NextResponse.json(
      {
        error: 'Failed to login',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    )
  }
}
