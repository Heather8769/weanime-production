import { NextRequest, NextResponse } from 'next/server'
import { getEnhancedAnimeStreams } from '@/lib/improved-streaming-service'


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const animeId = parseInt(searchParams.get('animeId') || '1')
    const episode = parseInt(searchParams.get('episode') || '1')

    console.log(`🎬 API Route: Fetching streams for anime ${animeId}, episode ${episode}`)

    const streams = await getEnhancedAnimeStreams(animeId, episode)

    return NextResponse.json(streams, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('❌ Anime streams API error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch anime streams',
        message: errorMessage,
        animeId: parseInt(new URL(request.url).searchParams.get('animeId') || '1'),
        episode: parseInt(new URL(request.url).searchParams.get('episode') || '1'),
        fallback: true
      },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
