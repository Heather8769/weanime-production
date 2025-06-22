import { NextRequest, NextResponse } from 'next/server'


const JIKAN_BASE_URL = 'https://api.jikan.moe/v4'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const animeId = searchParams.get('animeId')
    
    if (!animeId) {
      return NextResponse.json(
        { error: 'animeId parameter is required' },
        { status: 400 }
      )
    }
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

    const response = await fetch(`${JIKAN_BASE_URL}/anime/${animeId}`, {
      headers: {
        'Accept': 'application/json',
      },
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      return NextResponse.json(
        { error: `Jikan API error: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    console.error('Jikan API proxy error:', error)

    // Handle timeout specifically
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Jikan API request timed out' },
        { status: 408 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch from Jikan API' },
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
