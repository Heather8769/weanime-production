import { NextRequest, NextResponse } from 'next/server'


// Required for static export
export const dynamic = 'force-static'
const ANILIST_GRAPHQL_URL = 'https://graphql.anilist.co'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout

    try {
      const response = await fetch(ANILIST_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return NextResponse.json(
          { error: `HTTP error! status: ${response.status}` },
          { status: response.status }
        )
      }

      const data = await response.json()

      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
    } catch (error) {
      clearTimeout(timeoutId)
      throw error
    }


  } catch (error) {
    console.error('AniList API proxy error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch from AniList API' },
      { status: 500 }
    )
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
