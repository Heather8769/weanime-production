import { NextRequest, NextResponse } from 'next/server'

interface VideoPerformanceMetrics {
  sessionId: string
  animeId: number
  episodeId: string
  timestamp: string
  metrics: {
    startupTime: number
    bufferHealth: number
    rebufferingEvents: number
    droppedFrames: number
    playbackQuality: string
    bandwidth: number
    averageLatency: number
    totalWatchTime: number
    completionRate: number
  }
  deviceInfo: {
    userAgent: string
    screenResolution: string
    networkType?: string
    deviceMemory?: number
  }
  errors?: string[]
}

// In-memory storage for development (use Redis/database in production)
const performanceData: VideoPerformanceMetrics[] = []
const MAX_STORED_METRICS = 1000

export async function POST(request: NextRequest) {
  try {
    const metrics: VideoPerformanceMetrics = await request.json()
    
    // Validate required fields
    if (!metrics.sessionId || !metrics.animeId || !metrics.episodeId) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, animeId, episodeId' },
        { status: 400 }
      )
    }

    // Add timestamp if not provided
    if (!metrics.timestamp) {
      metrics.timestamp = new Date().toISOString()
    }

    // Store metrics (limit storage to prevent memory issues)
    performanceData.push(metrics)
    if (performanceData.length > MAX_STORED_METRICS) {
      performanceData.shift() // Remove oldest entry
    }

    // Log performance issues for monitoring
    const { metrics: perf } = metrics
    if (perf.rebufferingEvents > 3) {
      console.warn(`High rebuffering for session ${metrics.sessionId}: ${perf.rebufferingEvents} events`)
    }
    
    if (perf.startupTime > 5000) {
      console.warn(`Slow startup for session ${metrics.sessionId}: ${perf.startupTime}ms`)
    }
    
    if (perf.droppedFrames > 50) {
      console.warn(`High dropped frames for session ${metrics.sessionId}: ${perf.droppedFrames} frames`)
    }

    return NextResponse.json({
      success: true,
      message: 'Performance metrics recorded',
      sessionId: metrics.sessionId
    })

  } catch (error) {
    console.error('Error recording video performance metrics:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to record performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    const animeId = searchParams.get('animeId')
    const limit = parseInt(searchParams.get('limit') || '50')
    const timeframe = searchParams.get('timeframe') || '24h' // 1h, 24h, 7d

    // Calculate time threshold
    const now = new Date()
    let timeThreshold = new Date()
    switch (timeframe) {
      case '1h':
        timeThreshold.setHours(now.getHours() - 1)
        break
      case '7d':
        timeThreshold.setDate(now.getDate() - 7)
        break
      default: // 24h
        timeThreshold.setDate(now.getDate() - 1)
    }

    // Filter data
    let filteredData = performanceData.filter(metric => 
      new Date(metric.timestamp) >= timeThreshold
    )

    if (sessionId) {
      filteredData = filteredData.filter(metric => metric.sessionId === sessionId)
    }

    if (animeId) {
      filteredData = filteredData.filter(metric => metric.animeId === parseInt(animeId))
    }

    // Limit results
    filteredData = filteredData.slice(-limit)

    // Calculate aggregated statistics
    const stats = calculatePerformanceStats(filteredData)

    return NextResponse.json({
      success: true,
      data: filteredData,
      stats,
      totalRecords: filteredData.length,
      timeframe,
      generatedAt: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Access-Control-Allow-Origin': '*'
      }
    })

  } catch (error) {
    console.error('Error retrieving video performance metrics:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve performance metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function calculatePerformanceStats(data: VideoPerformanceMetrics[]) {
  if (data.length === 0) {
    return {
      averageStartupTime: 0,
      averageBufferHealth: 0,
      totalRebufferingEvents: 0,
      averageDroppedFrames: 0,
      qualityDistribution: {},
      averageBandwidth: 0,
      completionRate: 0,
      errorRate: 0
    }
  }

  const totalStartupTime = data.reduce((sum, metric) => sum + metric.metrics.startupTime, 0)
  const totalBufferHealth = data.reduce((sum, metric) => sum + metric.metrics.bufferHealth, 0)
  const totalRebufferingEvents = data.reduce((sum, metric) => sum + metric.metrics.rebufferingEvents, 0)
  const totalDroppedFrames = data.reduce((sum, metric) => sum + metric.metrics.droppedFrames, 0)
  const totalBandwidth = data.reduce((sum, metric) => sum + metric.metrics.bandwidth, 0)
  const totalCompletionRate = data.reduce((sum, metric) => sum + metric.metrics.completionRate, 0)
  const totalErrors = data.reduce((sum, metric) => sum + (metric.errors?.length || 0), 0)

  // Quality distribution
  const qualityDistribution: Record<string, number> = {}
  data.forEach(metric => {
    const quality = metric.metrics.playbackQuality
    qualityDistribution[quality] = (qualityDistribution[quality] || 0) + 1
  })

  return {
    averageStartupTime: Math.round(totalStartupTime / data.length),
    averageBufferHealth: Math.round((totalBufferHealth / data.length) * 100) / 100,
    totalRebufferingEvents,
    averageDroppedFrames: Math.round(totalDroppedFrames / data.length),
    qualityDistribution,
    averageBandwidth: Math.round((totalBandwidth / data.length) * 100) / 100,
    completionRate: Math.round((totalCompletionRate / data.length) * 100) / 100,
    errorRate: Math.round((totalErrors / data.length) * 100) / 100,
    totalSessions: data.length,
    performanceScore: calculatePerformanceScore(data)
  }
}

function calculatePerformanceScore(data: VideoPerformanceMetrics[]): number {
  if (data.length === 0) return 0

  let totalScore = 0
  
  data.forEach(metric => {
    let score = 100 // Start with perfect score
    
    // Deduct points for poor performance
    if (metric.metrics.startupTime > 3000) score -= 20
    if (metric.metrics.rebufferingEvents > 2) score -= 15
    if (metric.metrics.droppedFrames > 30) score -= 15
    if (metric.metrics.bufferHealth < 5) score -= 10
    if (metric.metrics.completionRate < 0.8) score -= 20
    if (metric.errors && metric.errors.length > 0) score -= 10
    
    // Bonus points for good performance
    if (metric.metrics.startupTime < 1000) score += 5
    if (metric.metrics.rebufferingEvents === 0) score += 5
    if (metric.metrics.completionRate > 0.95) score += 5
    
    totalScore += Math.max(0, Math.min(100, score))
  })
  
  return Math.round(totalScore / data.length)
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
