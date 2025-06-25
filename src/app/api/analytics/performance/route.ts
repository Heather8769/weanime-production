import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'


export async function POST(request: NextRequest) {
  try {
    const performanceMetric = await request.json()
    
    // Validate the performance metric
    if (!performanceMetric.name || typeof performanceMetric.value !== 'number') {
      return NextResponse.json(
        { error: 'Metric name and value are required' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createClient()

    // Store performance metric in database (optional)
    const { error } = await supabase
      .from('performance_metrics')
      .insert({
        name: performanceMetric.name,
        value: performanceMetric.value,
        timestamp: performanceMetric.timestamp || Date.now(),
        url: performanceMetric.url,
        user_id: performanceMetric.userId,
        additional_data: performanceMetric.additionalData,
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Failed to store performance metric in database:', error)
      // Don't fail the request if database storage fails
    }

    // In production, you might want to send to analytics service
    if (process.env.NODE_ENV === 'production') {
      await sendToAnalyticsService(performanceMetric)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in performance analytics endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for retrieving performance analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = searchParams.get('timeframe') || '24h' // 1h, 24h, 7d, 30d
    const metric = searchParams.get('metric') // specific metric name
    const limit = parseInt(searchParams.get('limit') || '100')

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
      case '30d':
        timeThreshold.setDate(now.getDate() - 30)
        break
      default: // 24h
        timeThreshold.setDate(now.getDate() - 1)
    }

    // Try to get data from Supabase
    let performanceData: any[] = []
    let stats: any = {}

    try {
      const supabase = createClient()

      let query = supabase
        .from('performance_metrics')
        .select('*')
        .gte('created_at', timeThreshold.toISOString())
        .order('created_at', { ascending: false })
        .limit(limit)

      if (metric) {
        query = query.eq('name', metric)
      }

      const { data, error } = await query

      if (error) {
        console.warn('Supabase query failed, using fallback data:', error.message)
        throw error
      }

      performanceData = data || []

      // Calculate statistics
      if (performanceData.length > 0) {
        const values = performanceData.map(d => d.value).filter(v => typeof v === 'number')
        const sum = values.reduce((a, b) => a + b, 0)
        const sorted = [...values].sort((a, b) => a - b)

        stats = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.length > 0 ? sum / values.length : 0,
          median: values.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0,
          p95: values.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0,
          p99: values.length > 0 ? sorted[Math.floor(sorted.length * 0.99)] : 0,
        }
      }

    } catch (supabaseError) {
      // Fallback to mock data for demonstration
      console.log('Using fallback performance data')

      performanceData = generateMockPerformanceData(timeframe)
      stats = calculateMockStats(performanceData)
    }

    return NextResponse.json({
      success: true,
      data: performanceData,
      stats,
      timeframe,
      metric,
      totalRecords: performanceData.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error retrieving performance analytics:', error)
    return NextResponse.json(
      {
        error: 'Failed to retrieve performance analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function generateMockPerformanceData(timeframe: string) {
  const now = Date.now()
  const data = []
  const count = timeframe === '1h' ? 10 : timeframe === '24h' ? 50 : 100

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (i * 60000)) // Every minute
    data.push({
      id: `mock_${i}`,
      name: ['page_load', 'api_response', 'video_startup', 'search_query'][i % 4],
      value: Math.random() * 1000 + 100, // 100-1100ms
      timestamp: timestamp.getTime(),
      url: '/anime/watch',
      created_at: timestamp.toISOString()
    })
  }

  return data
}

function calculateMockStats(data: any[]) {
  if (data.length === 0) return {}

  const values = data.map(d => d.value)
  const sum = values.reduce((a, b) => a + b, 0)
  const sorted = [...values].sort((a, b) => a - b)

  return {
    count: values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: sum / values.length,
    median: sorted[Math.floor(sorted.length / 2)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    p99: sorted[Math.floor(sorted.length * 0.99)],
  }
}

async function sendToAnalyticsService(metric: any) {
  // Implementation for analytics service
  // This could be Google Analytics, Mixpanel, Amplitude, etc.

  if (process.env.NEXT_PUBLIC_ANALYTICS_ID) {
    // Send to Google Analytics
    try {
      // This would use gtag or Google Analytics 4
      console.log('Would send to Google Analytics:', metric)
    } catch (error) {
      console.error('Failed to send to Google Analytics:', error)
    }
  }

  if (process.env.MIXPANEL_TOKEN) {
    // Send to Mixpanel
    try {
      console.log('Would send to Mixpanel:', metric)
    } catch (error) {
      console.error('Failed to send to Mixpanel:', error)
    }
  }
}
