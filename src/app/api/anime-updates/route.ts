import { NextRequest, NextResponse } from 'next/server'
import { animeDatabaseUpdater, triggerDatabaseUpdate, getDatabaseUpdateStatus } from '@/lib/anime-database-updater'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    switch (action) {
      case 'trigger_update':
        return await handleTriggerUpdate()
      
      case 'sync_anime':
        return await handleSyncAnime(request)
      
      case 'check_new_releases':
        return await handleCheckNewReleases()
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported: trigger_update, sync_anime, check_new_releases' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in anime updates API:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process anime update request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function handleTriggerUpdate(): Promise<NextResponse> {
  try {
    const stats = await triggerDatabaseUpdate()
    
    return NextResponse.json({
      success: true,
      message: 'Database update triggered successfully',
      stats
    })

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to trigger database update',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function handleSyncAnime(request: NextRequest): Promise<NextResponse> {
  try {
    const { animeId, source = 'anilist' } = await request.json()
    
    if (!animeId) {
      return NextResponse.json(
        { error: 'animeId is required' },
        { status: 400 }
      )
    }

    // This would call the anime metadata sync service
    // For now, simulate the sync process
    const syncResult = await syncSingleAnime(animeId, source)
    
    return NextResponse.json({
      success: true,
      message: `Anime ${animeId} synced successfully`,
      result: syncResult
    })

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to sync anime',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function handleCheckNewReleases(): Promise<NextResponse> {
  try {
    // Get recent releases from the database
    const { data: recentReleases, error } = await supabase
      .from('episodes')
      .select(`
        id,
        episode_number,
        title_english,
        air_date,
        anime_metadata!inner(
          id,
          title_english,
          title_romaji,
          status
        )
      `)
      .gte('air_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
      .order('air_date', { ascending: false })
      .limit(50)

    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    const newReleases = (recentReleases || []).map(episode => ({
      episodeId: episode.id,
      episodeNumber: episode.episode_number,
      episodeTitle: episode.title_english,
      airDate: episode.air_date,
      anime: {
        id: (episode.anime_metadata as any).id,
        title: (episode.anime_metadata as any).title_english || (episode.anime_metadata as any).title_romaji,
        status: (episode.anime_metadata as any).status
      }
    }))

    return NextResponse.json({
      success: true,
      newReleases,
      totalCount: newReleases.length,
      timeframe: 'Last 7 days'
    })

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to check new releases',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function syncSingleAnime(animeId: number, source: string): Promise<any> {
  // This would integrate with the real anime metadata sync service
  // For now, simulate the sync process
  
  try {
    const { data: anime, error } = await supabase
      .from('anime_metadata')
      .select('*')
      .eq(source === 'mal' ? 'mal_id' : 'anilist_id', animeId)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is OK
      throw new Error(`Database query failed: ${error.message}`)
    }

    if (anime) {
      // Update existing anime
      const { error: updateError } = await supabase
        .from('anime_metadata')
        .update({
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', anime.id)

      if (updateError) {
        throw new Error(`Failed to update anime: ${updateError.message}`)
      }

      return {
        action: 'updated',
        animeId: anime.id,
        title: anime.title_english || anime.title_romaji
      }
    } else {
      // This would fetch from external API and create new anime
      // For now, just return a placeholder
      return {
        action: 'not_found',
        animeId,
        message: 'Anime not found in database. Would fetch from external API in production.'
      }
    }

  } catch (error) {
    throw new Error(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'status', 'stats', 'recent'

    switch (type) {
      case 'status':
        return getUpdateStatus()
      
      case 'stats':
        return getUpdateStats()
      
      case 'recent':
        return getRecentUpdates()
      
      default:
        return getOverview()
    }

  } catch (error) {
    console.error('Error retrieving anime update data:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve anime update data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getUpdateStatus(): Promise<NextResponse> {
  const status = getDatabaseUpdateStatus()
  
  return NextResponse.json({
    success: true,
    status,
    timestamp: new Date().toISOString()
  })
}

async function getUpdateStats(): Promise<NextResponse> {
  try {
    const { data: stats, error } = await supabase
      .from('anime_update_stats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      throw new Error(`Failed to get update stats: ${error.message}`)
    }

    const summary = stats && stats.length > 0 ? {
      lastUpdate: stats[0].created_at,
      totalChecked: stats[0].total_checked,
      newAnime: stats[0].new_anime,
      newEpisodes: stats[0].new_episodes,
      metadataUpdates: stats[0].metadata_updates,
      errors: stats[0].errors
    } : null

    return NextResponse.json({
      success: true,
      summary,
      history: stats || [],
      totalRecords: stats?.length || 0
    })

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to get update stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getRecentUpdates(): Promise<NextResponse> {
  try {
    const { data: recentAnime, error: animeError } = await supabase
      .from('anime_metadata')
      .select('id, title_english, title_romaji, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(20)

    const { data: recentEpisodes, error: episodeError } = await supabase
      .from('episodes')
      .select(`
        id,
        episode_number,
        title_english,
        air_date,
        anime_metadata!inner(title_english, title_romaji)
      `)
      .order('created_at', { ascending: false })
      .limit(20)

    if (animeError || episodeError) {
      throw new Error('Failed to fetch recent updates')
    }

    return NextResponse.json({
      success: true,
      recentAnime: recentAnime || [],
      recentEpisodes: recentEpisodes || [],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to get recent updates',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getOverview(): Promise<NextResponse> {
  try {
    const status = getDatabaseUpdateStatus()
    
    const { data: totalAnime } = await supabase
      .from('anime_metadata')
      .select('id', { count: 'exact', head: true })

    const { data: totalEpisodes } = await supabase
      .from('episodes')
      .select('id', { count: 'exact', head: true })

    const { data: recentStats } = await supabase
      .from('anime_update_stats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      success: true,
      overview: {
        updateStatus: status,
        database: {
          totalAnime: totalAnime?.length || 0,
          totalEpisodes: totalEpisodes?.length || 0
        },
        lastUpdate: recentStats || null
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to get overview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
