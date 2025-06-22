// Slack Integration API - Works with both MCP and Webhooks
import { NextRequest, NextResponse } from 'next/server'
import { SlackWebhookHelper, testSlackWebhookUrl } from '@/lib/slack-webhook-helper'


export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      webhookUrl, 
      channel, 
      message, 
      type = 'test',
      useWebhook = true 
    } = body

    // Validate webhook URL if provided
    if (webhookUrl && !webhookUrl.startsWith('https://hooks.slack.com/services/')) {
      return NextResponse.json(
        { error: 'Invalid Slack webhook URL format' },
        { status: 400 }
      )
    }

    // Use webhook method
    if (useWebhook && webhookUrl) {
      return await handleWebhookMethod(webhookUrl, channel, message, type)
    }

    // Use MCP method (if available and configured)
    return await handleMCPMethod(channel, message, type)

  } catch (error) {
    console.error('Slack integration error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Slack integration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function handleWebhookMethod(
  webhookUrl: string, 
  channel: string | undefined, 
  message: string | undefined, 
  type: string
) {
  try {
    const helper = new SlackWebhookHelper({
      webhookUrl,
      channel,
      username: 'WeAnime Bot',
      iconEmoji: ':robot_face:'
    })

    let success = false

    switch (type) {
      case 'test':
        success = await helper.testWebhook()
        break

      case 'error':
        const errorAlert = helper.createErrorAlert({
          message: message || 'Test critical error from WeAnime',
          level: 'error',
          component: 'SlackTest',
          url: '/api/slack/test',
          timestamp: new Date().toISOString(),
          stack: 'Error: Test error\n  at SlackTest.trigger (test.js:123)\n  at API.handler (route.ts:45)'
        })
        success = await helper.sendWebhook(errorAlert)
        break

      case 'warning':
        const warningAlert = helper.createErrorAlert({
          message: message || 'Test warning from WeAnime',
          level: 'warn',
          component: 'SlackTest',
          url: '/api/slack/test',
          timestamp: new Date().toISOString()
        })
        success = await helper.sendWebhook(warningAlert)
        break

      case 'deployment':
        const deploymentAlert = helper.createDeploymentAlert({
          version: 'v1.0.0',
          environment: 'production',
          status: 'success',
          url: process.env.NEXT_PUBLIC_APP_URL,
          timestamp: new Date().toISOString()
        })
        success = await helper.sendWebhook(deploymentAlert)
        break

      case 'health':
        const healthAlert = helper.createHealthAlert({
          status: 'healthy',
          services: [
            { name: 'Database', status: 'healthy' },
            { name: 'API', status: 'healthy' },
            { name: 'Video Streaming', status: 'healthy' },
            { name: 'Search', status: 'healthy' }
          ],
          timestamp: new Date().toISOString()
        })
        success = await helper.sendWebhook(healthAlert)
        break

      default:
        // Custom message
        success = await helper.sendWebhook({
          text: message || 'Test message from WeAnime',
          username: 'WeAnime Bot',
          icon_emoji: ':robot_face:',
          blocks: [
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*WeAnime Custom Message*\n\n${message || 'Test message from WeAnime'}\n\n*Time:* ${new Date().toLocaleString()}`
              }
            }
          ]
        })
    }

    return NextResponse.json({
      success,
      method: 'webhook',
      message: success 
        ? `Slack ${type} message sent successfully via webhook`
        : `Failed to send Slack ${type} message via webhook`,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        method: 'webhook',
        error: 'Webhook method failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function handleMCPMethod(
  channel: string | undefined, 
  message: string | undefined, 
  type: string
) {
  // This would integrate with Slack MCP when properly configured
  // For now, return information about MCP setup
  
  return NextResponse.json({
    success: false,
    method: 'mcp',
    message: 'Slack MCP integration requires authentication setup',
    instructions: {
      setup: [
        'Configure Slack MCP authentication',
        'Add Slack bot token to environment',
        'Grant necessary permissions to the bot',
        'Test MCP connection'
      ],
      alternative: 'Use webhook method for immediate testing'
    },
    timestamp: new Date().toISOString()
  })
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const testUrl = searchParams.get('webhook_url')

    if (testUrl) {
      // Test a specific webhook URL
      const isValid = await testSlackWebhookUrl(testUrl)
      return NextResponse.json({
        valid: isValid,
        url: testUrl,
        message: isValid 
          ? 'Webhook URL is valid and working'
          : 'Webhook URL test failed',
        timestamp: new Date().toISOString()
      })
    }

    // Return integration status
    const webhookConfigured = !!process.env.SLACK_WEBHOOK_URL
    const mcpAvailable = true // MCP is available but needs auth

    return NextResponse.json({
      status: 'ready',
      integrations: {
        webhook: {
          available: true,
          configured: webhookConfigured,
          url: webhookConfigured ? 'Configured' : 'Not configured'
        },
        mcp: {
          available: mcpAvailable,
          configured: false, // Would check MCP auth status
          status: 'Requires authentication setup'
        }
      },
      recommendations: {
        immediate: 'Use webhook integration for quick setup',
        advanced: 'Configure MCP for full Slack integration'
      },
      testEndpoints: [
        'POST /api/slack/test - Test Slack integration',
        'GET /api/slack/test?webhook_url=URL - Validate webhook URL'
      ],
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get Slack integration status',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
