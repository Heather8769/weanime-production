import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  watchlistAddSchema,
  watchlistUpdateSchema,
  watchlistRemoveSchema,
  validateInput
} from '@/lib/validation-schemas'

// Required for static export
export const dynamic = 'force-static'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Production requires valid Supabase configuration - NO DEMO STORAGE
if (!supabaseUrl || !supabaseServiceKey || 
    supabaseUrl === 'https://placeholder.supabase.co' ||
    supabaseServiceKey === 'your_service_role_key_here') {
  throw new Error('WeAnime requires valid Supabase configuration for production. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get user's watchlist
export async function GET(request: NextRequest) {
  try {
    // Get authenticated user ID from middleware headers
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          success: false 
        },
        { status: 401 }
      )
    }

    console.log(`Fetching watchlist for user: ${userId}`)

    // Get user's watchlist
    const { data: watchlist, error } = await supabase
      .from('user_watchlist')
      .select(`
        *,
        anime_metadata (
          id,
          title,
          description,
          image_url,
          total_episodes,
          status,
          genres,
          rating
        )
      `)
      .eq('user_id', userId)
      .order('added_at', { ascending: false })

    if (error) {
      console.error('Watchlist fetch error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to fetch watchlist',
          details: error.message,
          success: false 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      watchlist: watchlist || [],
      count: watchlist?.length || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Watchlist API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch watchlist',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    )
  }
}

// Add anime to watchlist
export async function POST(request: NextRequest) {
  try {
    // Get authenticated user ID from middleware headers
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          success: false 
        },
        { status: 401 }
      )
    }

    // Validate request body
    const requestBody = await request.json()
    const validation = validateInput(watchlistAddSchema, requestBody)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.errors,
          success: false 
        },
        { status: 400 }
      )
    }

    const { animeId, status, currentEpisode, rating, notes } = validation.data

    console.log(`Adding anime ${animeId} to watchlist for user ${userId}`)

    // Check if already in watchlist
    const { data: existing } = await supabase
      .from('user_watchlist')
      .select('id')
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .single()

    if (existing) {
      return NextResponse.json(
        { 
          error: 'Anime already in watchlist',
          success: false 
        },
        { status: 409 }
      )
    }

    // Add to watchlist
    const { data, error } = await supabase
      .from('user_watchlist')
      .insert({
        user_id: userId,
        anime_id: animeId,
        status: status,
        added_at: new Date().toISOString(),
        current_episode: currentEpisode || 0,
        rating: rating || null,
        notes: notes || null
      })
      .select()
      .single()

    if (error) {
      console.error('Watchlist add error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to add to watchlist',
          details: error.message,
          success: false 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Added to watchlist successfully',
      watchlistItem: data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Watchlist add error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to add to watchlist',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    )
  }
}

// Update watchlist item
export async function PUT(request: NextRequest) {
  try {
    // Get authenticated user ID from middleware headers
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          success: false 
        },
        { status: 401 }
      )
    }

    // Validate request body
    const requestBody = await request.json()
    const validation = validateInput(watchlistUpdateSchema, requestBody)
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.errors,
          success: false 
        },
        { status: 400 }
      )
    }

    const { animeId, status, currentEpisode, rating, notes } = validation.data

    console.log(`Updating watchlist item for user ${userId}, anime ${animeId}`)

    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (status) updateData.status = status
    if (currentEpisode !== undefined) updateData.current_episode = currentEpisode
    if (rating !== undefined) updateData.rating = rating
    if (notes !== undefined) updateData.notes = notes

    const { data, error } = await supabase
      .from('user_watchlist')
      .update(updateData)
      .eq('user_id', userId)
      .eq('anime_id', animeId)
      .select()
      .single()

    if (error) {
      console.error('Watchlist update error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to update watchlist',
          details: error.message,
          success: false 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Watchlist updated successfully',
      watchlistItem: data,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Watchlist update error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to update watchlist',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    )
  }
}

// Remove from watchlist
export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user ID from middleware headers
    const userId = request.headers.get('x-user-id')
    
    if (!userId) {
      return NextResponse.json(
        { 
          error: 'Authentication required',
          success: false 
        },
        { status: 401 }
      )
    }

    // Validate query parameters
    const { searchParams } = new URL(request.url)
    const animeIdParam = searchParams.get('animeId')
    
    const validation = validateInput(watchlistRemoveSchema, { animeId: animeIdParam })
    
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validation.errors,
          success: false 
        },
        { status: 400 }
      )
    }

    const { animeId } = validation.data

    console.log(`Removing anime ${animeId} from watchlist for user ${userId}`)

    const { error } = await supabase
      .from('user_watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('anime_id', animeId)

    if (error) {
      console.error('Watchlist remove error:', error)
      return NextResponse.json(
        { 
          error: 'Failed to remove from watchlist',
          details: error.message,
          success: false 
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Removed from watchlist successfully',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Watchlist remove error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to remove from watchlist',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    )
  }
}
