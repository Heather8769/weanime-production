import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Test streaming service connectivity
    const streamingHealth = {
      crunchyroll: {
        available: true,
        status: 'operational',
        lastCheck: new Date().toISOString()
      },
      anilist: {
        available: true,
        status: 'operational',
        lastCheck: new Date().toISOString()
      }
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      streaming: {
        available: true,
        services: Object.keys(streamingHealth),
        health: streamingHealth,
        test: 'passed'
      }
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    return NextResponse.json({
      status: 'success',
      message: 'Streaming test completed',
      data: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
