import { NextRequest, NextResponse } from 'next/server'
import { backendProxy } from '@/lib/backend-proxy'
import { withValidation, apiSchemas } from '@/lib/api-validation'

export const GET = withValidation(
  apiSchemas.stream,
  async (request: NextRequest, validatedData) => {
    try {
      const { anime_slug, episode_number } = validatedData
      
      const streamData = await backendProxy.getStreamUrl(anime_slug, episode_number)
      
      return NextResponse.json({
        success: true,
        data: streamData,
        anime_slug,
        episode_number,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Backend stream proxy error:', error)
      }
      
      return NextResponse.json(
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
)

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
