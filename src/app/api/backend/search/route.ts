import { NextRequest } from 'next/server'
import { backendProxy } from '@/lib/backend-proxy'


// Required for static export
export const dynamic = 'force-static'
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query) {
      return Response.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      )
    }

    if (query.length < 2) {
      return Response.json(
        { error: 'Query must be at least 2 characters long' },
        { status: 400 }
      )
    }

    const results = await backendProxy.searchAnime(query)
    
    return Response.json({
      success: true,
      data: results,
      query,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Backend search proxy error:', error)
    
    return Response.json(
      {
        success: false,
        error: 'Search failed',
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
