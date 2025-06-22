import { NextRequest, NextResponse } from 'next/server'


// Required for static export
export const dynamic = 'force-static'
const REAL_CRUNCHYROLL_BACKEND_URL = process.env.REAL_CRUNCHYROLL_BACKEND_URL || 'http://localhost:8003'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ animeId: string }> }
) {
  try {
    const { animeId } = await params
    
    console.log(`[Real Episodes API] Fetching episodes for anime ${animeId}`)
    
    // Forward request to our real Crunchyroll backend
    const response = await fetch(`${REAL_CRUNCHYROLL_BACKEND_URL}/api/episodes/${animeId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    
    if (!response.ok) {
      console.error(`[Real Episodes API] Backend error: ${response.status}`)
      return NextResponse.json(
        { error: 'Failed to fetch episodes from real Crunchyroll backend' },
        { status: response.status }
      )
    }
    
    const data = await response.json()
    console.log(`[Real Episodes API] Successfully fetched ${data.episodes?.length || 0} episodes`)
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('[Real Episodes API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
