import { getBackendStatus } from '@/lib/backend-proxy'

export async function GET() {
  try {
    const status = await getBackendStatus()
    
    return Response.json({
      success: true,
      backend: status,
      frontend: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Health check error:', error)
    
    return Response.json(
      {
        success: false,
        error: 'Health check failed',
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
