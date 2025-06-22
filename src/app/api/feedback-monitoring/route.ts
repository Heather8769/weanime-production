import { NextRequest, NextResponse } from 'next/server'
import { feedbackMonitor, getFeedbackAnalytics, getActiveAlerts, acknowledgeAlert } from '@/lib/feedback-monitoring'
import { supabase } from '@/lib/supabase'


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'analytics', 'alerts', 'trends', 'auto-responses'

    switch (type) {
      case 'analytics':
        return getAnalytics()
      
      case 'alerts':
        return getAlerts()
      
      case 'trends':
        return getTrends(request)
      
      case 'auto-responses':
        return getAutoResponses()
      
      case 'health':
        return getSystemHealth()
      
      default:
        return getOverview()
    }

  } catch (error) {
    console.error('Error in feedback monitoring API:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to retrieve feedback monitoring data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action, data } = await request.json()

    switch (action) {
      case 'acknowledge_alert':
        return acknowledgeAlertAction(data.alertId)
      
      case 'update_auto_response':
        return updateAutoResponse(data.id, data.updates)
      
      case 'trigger_analysis':
        return triggerAnalysis()
      
      case 'export_data':
        return exportFeedbackData(data.filters)
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error in feedback monitoring API:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process feedback monitoring request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getAnalytics(): Promise<NextResponse> {
  try {
    const analytics = await getFeedbackAnalytics()
    
    return NextResponse.json({
      success: true,
      analytics,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to get analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getAlerts(): Promise<NextResponse> {
  try {
    const activeAlerts = getActiveAlerts()
    
    // Get alert history from database
    const { data: alertHistory, error } = await supabase
      .from('feedback_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.warn('Failed to fetch alert history:', error)
    }

    return NextResponse.json({
      success: true,
      activeAlerts,
      alertHistory: alertHistory || [],
      totalActive: activeAlerts.length
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to get alerts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getTrends(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'week' // 'day', 'week', 'month'
    const metric = searchParams.get('metric') || 'volume' // 'volume', 'sentiment', 'resolution'

    let startDate: Date
    const now = new Date()

    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default: // week
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    const { data: feedback, error } = await supabase
      .from('feedback')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Database query failed: ${error.message}`)
    }

    const trends = generateTrends(feedback || [], period, metric)

    return NextResponse.json({
      success: true,
      trends,
      period,
      metric,
      dataPoints: feedback?.length || 0
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to get trends',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

function generateTrends(feedback: any[], period: string, metric: string): any[] {
  // Group feedback by time periods
  const groups = new Map<string, any[]>()

  feedback.forEach(item => {
    const date = new Date(item.created_at)
    let key: string

    switch (period) {
      case 'day':
        key = `${date.getHours()}:00`
        break
      case 'month':
        key = date.toISOString().split('T')[0] // YYYY-MM-DD
        break
      default: // week
        key = date.toLocaleDateString()
    }

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(item)
  })

  // Calculate metrics for each group
  return Array.from(groups.entries()).map(([time, items]) => {
    let value: number

    switch (metric) {
      case 'sentiment':
        // Calculate average sentiment score
        const ratings = items.filter(item => item.rating).map(item => item.rating)
        value = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0
        break
      case 'resolution':
        // Calculate resolution rate
        const resolved = items.filter(item => item.status === 'resolved').length
        value = items.length > 0 ? (resolved / items.length) * 100 : 0
        break
      default: // volume
        value = items.length
    }

    return { time, value, count: items.length }
  }).sort((a, b) => a.time.localeCompare(b.time))
}

async function getAutoResponses(): Promise<NextResponse> {
  try {
    const autoResponses = feedbackMonitor.getAutoResponses()
    
    return NextResponse.json({
      success: true,
      autoResponses,
      totalEnabled: autoResponses.filter(ar => ar.enabled).length
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to get auto-responses',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getSystemHealth(): Promise<NextResponse> {
  try {
    // Check database connectivity
    const { data: dbTest, error: dbError } = await supabase
      .from('feedback')
      .select('id')
      .limit(1)

    const dbHealthy = !dbError

    // Check recent monitoring activity
    const { data: recentFeedback } = await supabase
      .from('feedback')
      .select('id')
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    const recentActivity = recentFeedback?.length || 0

    // Get system metrics
    const activeAlerts = getActiveAlerts()
    const autoResponses = feedbackMonitor.getAutoResponses()

    return NextResponse.json({
      success: true,
      health: {
        database: dbHealthy ? 'healthy' : 'error',
        monitoring: 'active',
        alerts: {
          active: activeAlerts.length,
          critical: activeAlerts.filter(a => a.severity === 'critical').length
        },
        autoResponses: {
          total: autoResponses.length,
          enabled: autoResponses.filter(ar => ar.enabled).length
        },
        activity: {
          recentFeedback: recentActivity,
          lastHour: recentActivity
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to get system health',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function getOverview(): Promise<NextResponse> {
  try {
    const analytics = await getFeedbackAnalytics()
    const activeAlerts = getActiveAlerts()
    const autoResponses = feedbackMonitor.getAutoResponses()

    return NextResponse.json({
      success: true,
      overview: {
        analytics: {
          totalFeedback: analytics.totalFeedback,
          newToday: analytics.newToday,
          averageResponseTime: analytics.averageResponseTime,
          resolutionRate: analytics.resolutionRate,
          satisfactionScore: analytics.satisfactionScore
        },
        alerts: {
          active: activeAlerts.length,
          critical: activeAlerts.filter(a => a.severity === 'critical').length
        },
        automation: {
          autoResponses: autoResponses.filter(ar => ar.enabled).length,
          totalRules: autoResponses.length
        },
        status: 'operational'
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to get overview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function acknowledgeAlertAction(alertId: string): Promise<NextResponse> {
  try {
    const success = acknowledgeAlert(alertId)
    
    if (success) {
      // Store acknowledgment in database
      await supabase
        .from('feedback_alerts')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId)

      return NextResponse.json({
        success: true,
        message: 'Alert acknowledged'
      })
    } else {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to acknowledge alert',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function updateAutoResponse(id: string, updates: any): Promise<NextResponse> {
  try {
    const success = feedbackMonitor.updateAutoResponse(id, updates)
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Auto-response updated'
      })
    } else {
      return NextResponse.json(
        { error: 'Auto-response not found' },
        { status: 404 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to update auto-response',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function triggerAnalysis(): Promise<NextResponse> {
  try {
    // Trigger immediate analysis
    const analytics = await getFeedbackAnalytics()
    
    return NextResponse.json({
      success: true,
      message: 'Analysis triggered',
      analytics
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to trigger analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function exportFeedbackData(filters: any): Promise<NextResponse> {
  try {
    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.type) {
      query = query.eq('type', filters.type)
    }
    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.priority) {
      query = query.eq('priority', filters.priority)
    }
    if (filters?.startDate) {
      query = query.gte('created_at', filters.startDate)
    }
    if (filters?.endDate) {
      query = query.lte('created_at', filters.endDate)
    }

    const { data: feedback, error } = await query.limit(1000) // Limit for performance

    if (error) {
      throw new Error(`Export query failed: ${error.message}`)
    }

    return NextResponse.json({
      success: true,
      data: feedback || [],
      exportedAt: new Date().toISOString(),
      filters
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to export data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
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
