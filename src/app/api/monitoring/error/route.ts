import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { sendErrorAlert } from '@/lib/webhook-alerts'
import { withRateLimit, rateLimiters } from '@/lib/rate-limiter'


export const POST = withRateLimit(async function(request: NextRequest) {
  try {
    const errorReport = await request.json()
    
    // Validate the error report
    if (!errorReport.message) {
      return NextResponse.json(
        { error: 'Error message is required' },
        { status: 400 }
      )
    }

    // Create Supabase client
    const supabase = createClient()

    // Store error in database (optional)
    const { error } = await supabase
      .from('error_logs')
      .insert({
        id: errorReport.id || `error_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        message: errorReport.message,
        stack: errorReport.stack || null,
        level: errorReport.level || 'error',
        context: errorReport.context || {},
        performance: errorReport.performance || null,
        resolved: false,
        tags: errorReport.tags || []
      })

    if (error) {
      console.error('Failed to store error in database:', error)
      // Don't fail the request if database storage fails
    }

    // Send webhook alerts for critical errors
    if (errorReport.level === 'error') {
      try {
        await sendErrorAlert({
          message: errorReport.message,
          level: errorReport.level,
          component: errorReport.context?.component,
          url: errorReport.context?.url,
          userId: errorReport.context?.userId,
          stack: errorReport.stack,
          metadata: {
            id: errorReport.id,
            timestamp: new Date().toISOString(),
            ...errorReport.context
          }
        })
      } catch (webhookError) {
        console.error('Failed to send webhook alert:', webhookError)
        // Don't fail the request if webhook fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Error logged successfully',
      id: errorReport.id,
      webhookSent: errorReport.level === 'error'
    })
  } catch (error) {
    console.error('Error in monitoring endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}, rateLimiters.monitoring)

async function sendToExternalMonitoring(errorReport: any) {
  // Implementation for external monitoring service
  // This could be Sentry, LogRocket, Datadog, etc.

  if (process.env.SENTRY_DSN) {
    // Send to Sentry
    try {
      // This would use @sentry/nextjs
      console.log('Would send to Sentry:', errorReport)
    } catch (error) {
      console.error('Failed to send to Sentry:', error)
    }
  }

  if (process.env.LOGROCKET_APP_ID) {
    // Send to LogRocket
    try {
      console.log('Would send to LogRocket:', errorReport)
    } catch (error) {
      console.error('Failed to send to LogRocket:', error)
    }
  }

  // Send critical errors to Slack/Discord
  if (errorReport.level === 'error' && process.env.SLACK_WEBHOOK_URL) {
    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 Critical Error in WeAnime`,
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*Error:* ${errorReport.message}\n*Component:* ${errorReport.context?.component}\n*URL:* ${errorReport.context?.url}\n*User:* ${errorReport.context?.userId || 'Anonymous'}`
              }
            }
          ]
        })
      })
    } catch (error) {
      console.error('Failed to send Slack alert:', error)
    }
  }
}

// GET endpoint for retrieving error logs (admin dashboard)
export const GET = withRateLimit(async function(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const level = searchParams.get('level')
    const component = searchParams.get('component')
    const limit = parseInt(searchParams.get('limit') || '50')
    const resolved = searchParams.get('resolved')

    // Try to use Supabase, but fallback to file-based logs if needed
    let logs: any[] = []
    let stats: any = {}

    try {
      const supabase = createClient()

      let query = supabase
        .from('error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (level) {
        query = query.eq('level', level)
      }

      if (component) {
        query = query.eq('context->>component', component)
      }

      if (resolved !== null) {
        query = query.eq('resolved', resolved === 'true')
      }

      const { data, error } = await query

      if (error) {
        console.warn('Supabase query failed, using fallback:', error.message)
        throw error
      }

      logs = data || []

      // Get error summary statistics
      const { data: summary } = await supabase
        .from('error_logs')
        .select('level, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      stats = {
        total: logs.length,
        last24h: summary?.length || 0,
        byLevel: summary?.reduce((acc: any, log: any) => {
          acc[log.level] = (acc[log.level] || 0) + 1
          return acc
        }, {}) || {}
      }

    } catch (supabaseError) {
      // Fallback to file-based error logs
      console.log('Using fallback error log system')

      try {
        const fs = require('fs')
        const path = require('path')
        const logsPath = path.join(process.cwd(), 'logs', 'errors.json')

        if (fs.existsSync(logsPath)) {
          const fileContent = fs.readFileSync(logsPath, 'utf8')
          const allLogs = JSON.parse(fileContent)

          // Apply filters
          logs = allLogs.filter((log: any) => {
            if (level && log.level !== level) return false
            if (component && !log.component?.toLowerCase().includes(component.toLowerCase())) return false
            if (resolved !== null && log.resolved !== (resolved === 'true')) return false
            return true
          }).slice(0, limit)

          stats = {
            total: logs.length,
            last24h: allLogs.filter((log: any) =>
              new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
            ).length,
            byLevel: allLogs.reduce((acc: any, log: any) => {
              acc[log.level] = (acc[log.level] || 0) + 1
              return acc
            }, {})
          }
        } else {
          // No logs available
          logs = []
          stats = { total: 0, last24h: 0, byLevel: {} }
        }
      } catch (fileError) {
        console.warn('File-based fallback also failed:', fileError)
        logs = []
        stats = { total: 0, last24h: 0, byLevel: {} }
      }
    }

    return NextResponse.json({
      success: true,
      logs,
      stats,
      timestamp: new Date().toISOString(),
      source: logs.length > 0 ? 'database' : 'fallback'
    })
  } catch (error) {
    console.error('Failed to retrieve error logs:', error)
    return NextResponse.json(
      {
        error: 'Failed to retrieve error logs',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}, rateLimiters.monitoring)
