import { NextRequest, NextResponse } from 'next/server'
import { realAnimeDatabase } from '@/lib/real-anime-database'
import { migrationController } from '@/lib/migration-controller'

// Real Anime API - No Mock Data!
// Provides comprehensive anime information from real sources only


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const animeId = parseInt(id)
    
    if (isNaN(animeId)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid anime ID'
      }, { status: 400 })
    }

    console.log(`🎌 Getting real anime data for ID: ${animeId}`)

    // Get comprehensive anime information
    const animeInfo = await realAnimeDatabase.getAnimeInfo(animeId)
    
    if (!animeInfo) {
      return NextResponse.json({
        success: false,
        error: 'Anime not found in any database'
      }, { status: 404 })
    }

    // Get episode list
    const episodes = await realAnimeDatabase.getEpisodeList(animeId)

    // Get streaming availability (if episodes exist)
    const streamingInfo = episodes.length > 0 ? 
      await migrationController.getStreamingData(animeId, 1) : null

    const response = {
      success: true,
      anime: animeInfo,
      episodes: episodes.map(ep => ({
        id: ep.id,
        number: ep.number,
        title: ep.title || `Episode ${ep.number}`,
        description: ep.description,
        airDate: ep.airDate,
        duration: ep.duration,
        thumbnail: ep.thumbnail,
        hasStreaming: ep.sources.length > 0
      })),
      streaming: streamingInfo?.success ? {
        available: true,
        source: streamingInfo.source,
        quality: streamingInfo.data?.quality
      } : {
        available: false,
        reason: streamingInfo?.error || 'No streaming sources available'
      },
      metadata: {
        source: animeInfo.source,
        lastUpdated: new Date().toISOString(),
        episodeCount: episodes.length,
        realContentOnly: true
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Real anime API error:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch anime data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
