import { NextRequest } from 'next/server'
import { backendProxy } from '@/lib/backend-proxy'


export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const animeSlug = searchParams.get('anime_slug')
    const episodeNumber = searchParams.get('episode_number')

    if (!animeSlug) {
      return Response.json(
        { error: 'Parameter "anime_slug" is required' },
        { status: 400 }
      )
    }

    if (!episodeNumber) {
      return Response.json(
        { error: 'Parameter "episode_number" is required' },
        { status: 400 }
      )
    }

    const episodeNum = parseInt(episodeNumber)
    if (isNaN(episodeNum) || episodeNum < 1) {
      return Response.json(
        { error: 'Parameter "episode_number" must be a positive integer' },
        { status: 400 }
      )
    }

    const streamData = await backendProxy.getStreamUrl(animeSlug, episodeNum)
    
    return Response.json({
      success: true,
      data: streamData,
      anime_slug: animeSlug,
      episode_number: episodeNum,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Backend stream proxy error:', error)
    
    return Response.json(
      {
        success: false,
        error: 'Stream fetch failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
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
