import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

// Required for static export
export const dynamic = 'force-static'

// Implementation based on weanime_fix_guide_with_code.md

/**
 * Save a recently watched episode
 * POST /api/recent-episodes
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { 
      episode_id, 
      anime_id, 
      episode_number, 
      episode_title, 
      anime_title, 
      thumbnail_url, 
      progress_seconds = 0, 
      duration_seconds, 
      completed = false 
    } = body

    if (!episode_id) {
      return NextResponse.json(
        { error: 'episode_id is required' },
        { status: 400 }
      )
    }

    // Save recently watched episode using upsert to handle duplicates
    const { error } = await supabase.from('recent_episodes').upsert([
      { 
        user_id: user.id, 
        episode_id, 
        anime_id,
        episode_number,
        episode_title,
        anime_title,
        thumbnail_url,
        progress_seconds,
        duration_seconds,
        completed,
        watched_at: new Date().toISOString()
      }
    ], {
      onConflict: 'user_id,episode_id'
    })

    if (error) {
      console.error("Failed to save episode", error)
      return NextResponse.json(
        { error: 'Failed to save recently watched episode', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Recently watched episode saved successfully' 
    })

  } catch (error) {
    console.error('Recent episodes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Retrieve recently watched episodes
 * GET /api/recent-episodes
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Fetch recent episodes as per fix guide implementation
    const { data, error } = await supabase
      .from('recent_episodes')
      .select('*')
      .eq('user_id', user.id)
      .order('watched_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Failed to fetch recent episodes", error)
      return NextResponse.json(
        { error: 'Failed to fetch recently watched episodes', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true,
      data: data || [],
      count: data?.length || 0
    })

  } catch (error) {
    console.error('Recent episodes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Delete a recently watched episode
 * DELETE /api/recent-episodes
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const episode_id = searchParams.get('episode_id')

    if (!episode_id) {
      return NextResponse.json(
        { error: 'episode_id parameter is required' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('recent_episodes')
      .delete()
      .eq('user_id', user.id)
      .eq('episode_id', episode_id)

    if (error) {
      console.error("Failed to delete recent episode", error)
      return NextResponse.json(
        { error: 'Failed to delete recently watched episode', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Recently watched episode deleted successfully' 
    })

  } catch (error) {
    console.error('Recent episodes API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
