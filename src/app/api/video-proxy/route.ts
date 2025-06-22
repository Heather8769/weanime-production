import { NextRequest, NextResponse } from 'next/server'

// Video proxy to handle CORS issues with external video sources

// Required for static export
export const dynamic = 'force-static'
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const videoUrl = searchParams.get('url')
    
    if (!videoUrl) {
      return NextResponse.json(
        { error: 'Missing video URL parameter' },
        { status: 400 }
      )
    }

    // Validate the video URL is from allowed domains - NO DEMO SOURCES
    const allowedDomains = [
      // Real anime streaming domains ONLY
      'crunchyroll.com',
      'funimation.com',
      'animelab.com',
      'wakanim.tv',
      // CDN domains commonly used for legitimate anime streaming
      'cloudfront.net',
      'fastly.com',
      'akamaized.net',
      // YouTube for trailers/previews only
      'youtube.com',
      'youtu.be',
      'googlevideo.com'
    ]

    let isAllowed = false
    try {
      const urlObj = new URL(videoUrl)
      isAllowed = allowedDomains.some(domain => urlObj.hostname.includes(domain))
    } catch {
      return NextResponse.json(
        { error: 'Invalid video URL' },
        { status: 400 }
      )
    }

    if (!isAllowed) {
      return NextResponse.json(
        { error: 'Video URL not from allowed domain' },
        { status: 403 }
      )
    }

    console.log(`🎬 Proxying video request: ${videoUrl}`)

    // Fetch the video from the external source
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AnimeStreamer/1.0)',
        'Accept': 'video/*,*/*;q=0.9',
        'Accept-Encoding': 'identity',
        'Range': request.headers.get('range') || ''
      }
    })

    if (!response.ok) {
      console.error(`Failed to fetch video: ${response.status} ${response.statusText}`)
      return NextResponse.json(
        { error: `Failed to fetch video: ${response.status}` },
        { status: response.status }
      )
    }

    // Get the video content
    const videoBuffer = await response.arrayBuffer()
    
    // Create response with proper headers for video streaming
    const headers = new Headers()
    
    // Copy important headers from the original response
    const contentType = response.headers.get('content-type') || 'video/mp4'
    const contentLength = response.headers.get('content-length')
    const acceptRanges = response.headers.get('accept-ranges') || 'bytes'
    
    headers.set('Content-Type', contentType)
    headers.set('Accept-Ranges', acceptRanges)
    headers.set('Access-Control-Allow-Origin', '*')
    headers.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
    headers.set('Access-Control-Allow-Headers', 'Range, Content-Type')
    headers.set('Cache-Control', 'public, max-age=3600')
    
    if (contentLength) {
      headers.set('Content-Length', contentLength)
    }

    // Handle range requests for video seeking
    const rangeHeader = request.headers.get('range')
    if (rangeHeader && response.status === 206) {
      headers.set('Content-Range', response.headers.get('content-range') || '')
      return new NextResponse(videoBuffer, {
        status: 206,
        headers
      })
    }

    return new NextResponse(videoBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Video proxy error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  })
}
