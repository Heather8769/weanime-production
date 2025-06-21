import { NextRequest, NextResponse } from 'next/server'

// Real anime streaming API endpoints
const CONSUMET_API = 'https://api.consumet.org'
const ANIWATCH_API = 'https://aniwatch-api.vercel.app'

interface StreamingSource {
  url: string
  quality: string
  isM3U8: boolean
}

async function getStreamFromConsumet(episodeId: string): Promise<StreamingSource[]> {
  try {
    console.log(`Fetching stream from Consumet for episode: ${episodeId}`)
    
    const response = await fetch(`${CONSUMET_API}/anime/gogoanime/watch/${episodeId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      throw new Error(`Consumet streaming API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.sources && Array.isArray(data.sources)) {
      return data.sources.map((source: any) => ({
        url: source.url,
        quality: source.quality || 'auto',
        isM3U8: source.isM3U8 || false
      }))
    }

    return []
  } catch (error) {
    console.error('Consumet streaming error:', error)
    throw error
  }
}

async function getStreamFromAniwatch(episodeId: string): Promise<StreamingSource[]> {
  try {
    console.log(`Fetching stream from Aniwatch for episode: ${episodeId}`)
    
    const response = await fetch(`${ANIWATCH_API}/anime/episode-srcs?id=${episodeId}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(15000)
    })

    if (!response.ok) {
      throw new Error(`Aniwatch streaming API error: ${response.status}`)
    }

    const data = await response.json()
    
    if (data.sources && Array.isArray(data.sources)) {
      return data.sources.map((source: any) => ({
        url: source.url,
        quality: source.quality || 'auto',
        isM3U8: source.type === 'hls'
      }))
    }

    // Return empty array with proper logging when no streams found
    console.log(`No Aniwatch streaming sources found for episode: ${episodeId}`)
    return []
  } catch (error) {
    console.error('Aniwatch streaming error:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const episodeId = searchParams.get('episodeId')
    const source = searchParams.get('source') || 'consumet'
    
    if (!episodeId) {
      return NextResponse.json(
        { 
          error: 'Missing episodeId parameter',
          success: false 
        },
        { status: 400 }
      )
    }

    console.log(`Fetching stream for episode: ${episodeId} from source: ${source}`)

    let streamingSources: StreamingSource[] = []
    let usedSource = ''

    // Try the requested source first
    if (source === 'consumet') {
      try {
        streamingSources = await getStreamFromConsumet(episodeId)
        usedSource = 'consumet'
      } catch (error) {
        console.warn('Consumet streaming failed, trying Aniwatch...')
        try {
          streamingSources = await getStreamFromAniwatch(episodeId)
          usedSource = 'aniwatch'
        } catch (fallbackError) {
          console.error('Both streaming sources failed')
        }
      }
    } else {
      try {
        streamingSources = await getStreamFromAniwatch(episodeId)
        usedSource = 'aniwatch'
      } catch (error) {
        console.warn('Aniwatch streaming failed, trying Consumet...')
        try {
          streamingSources = await getStreamFromConsumet(episodeId)
          usedSource = 'consumet'
        } catch (fallbackError) {
          console.error('Both streaming sources failed')
        }
      }
    }

    if (streamingSources.length === 0) {
      return NextResponse.json(
        { 
          error: 'No streaming sources available for this episode',
          success: false,
          episodeId,
          triedSources: ['consumet', 'aniwatch']
        },
        { status: 404 }
      )
    }

    // Get the best quality source
    const bestSource = streamingSources.find(s => s.quality === '1080p') || 
                      streamingSources.find(s => s.quality === '720p') || 
                      streamingSources[0]

    return NextResponse.json({
      success: true,
      episodeId,
      streamUrl: bestSource.url,
      quality: bestSource.quality,
      isM3U8: bestSource.isM3U8,
      allSources: streamingSources,
      source: usedSource,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Streaming API error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch streaming data',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    )
  }
}
