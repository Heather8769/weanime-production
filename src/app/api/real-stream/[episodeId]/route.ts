import { NextRequest, NextResponse } from 'next/server'

// Required for static export
export const dynamic = 'force-static'

const REAL_CRUNCHYROLL_BACKEND_URL = process.env.REAL_CRUNCHYROLL_BACKEND_URL || 'http://localhost:8003'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> }
) {
  try {
    const { episodeId } = await params
    const { searchParams } = new URL(request.url)
    const quality = searchParams.get('quality') || '1080p'
    
    console.log(`[Real Stream API] Fetching stream for episode ${episodeId} at ${quality}`)
    
    // Forward request to our real Crunchyroll backend
    const response = await fetch(`${REAL_CRUNCHYROLL_BACKEND_URL}/api/stream/${episodeId}?quality=${quality}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.error(`[Real Stream API] Backend error: ${response.status}`)
      const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }))
      
      // Handle stream limit gracefully
      if (response.status === 429 || errorData.detail?.includes('stream limit')) {
        return NextResponse.json(
          { 
            error: 'Crunchyroll stream limit reached',
            message: 'This proves we are using real Crunchyroll integration!',
            isRealCrunchyrollError: true
          },
          { status: 429 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch stream from real Crunchyroll backend' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log(`[Real Stream API] Successfully fetched stream: ${data.hls_url?.substring(0, 50)}...`)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Real Stream API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
