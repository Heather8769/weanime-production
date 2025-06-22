import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'


// Required for static export
export const dynamic = 'force-static'
export async function GET(request: NextRequest) {
  try {
    // Test database connection
    const supabase = createServiceClient()

    // Simple query to test connection - just check if we can connect
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1)

    // Any connection is good - even if no data exists
    const isConnected = !error || error.code === 'PGRST116' // PGRST116 is "no rows returned" which is OK

    if (!isConnected && error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: true,
        responseTime: Date.now(), // Simple timestamp
        tables: {
          profiles: 'accessible'
        }
      },
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
      }
    })

  } catch (error) {
    console.error('Database health check failed:', error)
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown database error'
      },
      supabase: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
      }
    }, { status: 503 })
  }
}
