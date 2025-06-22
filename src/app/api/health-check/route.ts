import { NextRequest, NextResponse } from 'next/server'


// Required for static export
export const dynamic = 'force-static'
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  services: {
    frontend: ServiceHealth
    backend: ServiceHealth
    crunchyrollBridge: ServiceHealth
    database: ServiceHealth
    anilist: ServiceHealth
  }
  performance: {
    uptime: number
    memoryUsage: NodeJS.MemoryUsage
    responseTime: number
  }
  features: {
    realCrunchyrollIntegration: boolean
    mockDataDisabled: boolean
    performanceMonitoring: boolean
    errorCollection: boolean
  }
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  lastCheck: string
  error?: string
}

async function checkServiceHealth(url: string, timeout = 5000): Promise<ServiceHealth> {
  const startTime = Date.now()
  
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'WeAnime-HealthCheck/1.0' }
    })
    
    clearTimeout(timeoutId)
    const responseTime = Date.now() - startTime
    
    return {
      status: response.ok ? 'up' : 'degraded',
      responseTime,
      lastCheck: new Date().toISOString()
    }
  } catch (error) {
    const responseTime = Date.now() - startTime
    return {
      status: 'down',
      responseTime,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Get environment info
    const environment = process.env.NODE_ENV || 'development'
    const version = process.env.npm_package_version || '1.0.0'
    
    // Check all services in parallel
    const [frontendHealth, backendHealth, bridgeHealth, anilistHealth] = await Promise.all([
      checkServiceHealth(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/health`),
      checkServiceHealth(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8003'}/health`),
      checkServiceHealth(`${process.env.CRUNCHYROLL_BRIDGE_URL || 'http://localhost:8081'}/health`),
      checkServiceHealth('https://graphql.anilist.co', 3000)
    ])
    
    // Check database (Supabase)
    let databaseHealth: ServiceHealth
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (supabaseUrl) {
        databaseHealth = await checkServiceHealth(`${supabaseUrl}/rest/v1/`, 3000)
      } else {
        databaseHealth = {
          status: 'down',
          lastCheck: new Date().toISOString(),
          error: 'Supabase URL not configured'
        }
      }
    } catch (error) {
      databaseHealth = {
        status: 'down',
        lastCheck: new Date().toISOString(),
        error: 'Database check failed'
      }
    }
    
    // Calculate overall status
    const services = {
      frontend: frontendHealth,
      backend: backendHealth,
      crunchyrollBridge: bridgeHealth,
      database: databaseHealth,
      anilist: anilistHealth
    }
    
    const serviceStatuses = Object.values(services).map(s => s.status)
    const downServices = serviceStatuses.filter(s => s === 'down').length
    const degradedServices = serviceStatuses.filter(s => s === 'degraded').length
    
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
    if (downServices > 0) {
      overallStatus = downServices >= 2 ? 'unhealthy' : 'degraded'
    } else if (degradedServices > 0) {
      overallStatus = 'degraded'
    } else {
      overallStatus = 'healthy'
    }
    
    // Get performance metrics
    const uptime = process.uptime()
    const memoryUsage = process.memoryUsage()
    const responseTime = Date.now() - startTime
    
    // Check feature flags
    const features = {
      realCrunchyrollIntegration: process.env.NEXT_PUBLIC_ENABLE_REAL_CRUNCHYROLL === 'true',
      mockDataDisabled: process.env.NEXT_PUBLIC_ENABLE_MOCK_DATA !== 'true',
      performanceMonitoring: process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING === 'true',
      errorCollection: process.env.NEXT_PUBLIC_ENABLE_ERROR_COLLECTION === 'true'
    }
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version,
      environment,
      services,
      performance: {
        uptime,
        memoryUsage,
        responseTime
      },
      features
    }
    
    // Return appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503
    
    return NextResponse.json(healthStatus, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
    
  } catch (error) {
    console.error('Health check failed:', error)
    
    const errorResponse: Partial<HealthStatus> = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      performance: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        responseTime: Date.now() - startTime
      }
    }
    
    return NextResponse.json(errorResponse, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
}

// OPTIONS method for CORS
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
