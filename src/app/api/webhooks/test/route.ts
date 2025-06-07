// Webhook Test API Endpoint
import { NextRequest, NextResponse } from 'next/server'
import { webhookAlerts, sendErrorAlert } from '@/lib/webhook-alerts'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type = 'all', level = 'info', message } = body

    // Test different types of alerts
    switch (type) {
      case 'error':
        await sendErrorAlert({
          message: message || 'Test critical error - Database connection failed',
          level: 'error',
          component: 'DatabaseConnection',
          url: '/api/webhooks/test',
          stack: 'Error: Connection timeout\n  at Database.connect (db.js:45)\n  at VideoPlayer.loadEpisode (player.js:123)',
          metadata: {
            test: true,
            severity: 'high',
            affectedUsers: 150
          }
        })
        break

      case 'warning':
        await sendErrorAlert({
          message: message || 'Test warning - High API response time detected',
          level: 'warn',
          component: 'AnimeSearch',
          url: '/api/search',
          metadata: {
            test: true,
            responseTime: '2.5s',
            threshold: '1s'
          }
        })
        break

      case 'info':
        await sendErrorAlert({
          message: message || 'Test info - New deployment completed successfully',
          level: 'info',
          component: 'Deployment',
          url: '/api/webhooks/test',
          metadata: {
            test: true,
            version: 'v1.2.3',
            environment: 'production'
          }
        })
        break

      case 'all':
        // Test all webhook types
        const testResults = await webhookAlerts.testWebhooks()
        
        return NextResponse.json({
          success: true,
          message: 'Webhook tests completed',
          results: testResults,
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use: error, warning, info, or all' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      message: `Test ${type} alert sent successfully`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Webhook test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Webhook test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get webhook configuration status
    const configStatus = webhookAlerts.getConfigStatus()
    
    return NextResponse.json({
      status: 'healthy',
      message: 'Webhook system operational',
      configuration: configStatus,
      availableTests: [
        'error - Test critical error alert',
        'warning - Test warning alert', 
        'info - Test info alert',
        'all - Test all configured webhooks'
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        message: 'Webhook system check failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
