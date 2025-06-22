import { NextResponse } from 'next/server'
import { getStreamingHealth } from '@/lib/improved-streaming-service'


export async function GET() {
  try {
    const health = await getStreamingHealth()
    
    const status = health.overall === 'healthy' ? 200 : 
                   health.overall === 'degraded' ? 206 : 503

    return NextResponse.json({
      status: health.overall,
      timestamp: health.timestamp,
      services: health.services,
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development'
    }, { 
      status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: errorMessage,
      version: '2.0.0'
    }, { status: 500 })
  }
}
