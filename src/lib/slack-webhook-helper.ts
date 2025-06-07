// Slack Webhook Helper for WeAnime
// Enhanced integration with Slack MCP capabilities

interface SlackWebhookPayload {
  text?: string
  blocks?: any[]
  channel?: string
  username?: string
  icon_emoji?: string
}

interface SlackAlertConfig {
  webhookUrl: string
  channel?: string
  username?: string
  iconEmoji?: string
}

export class SlackWebhookHelper {
  private config: SlackAlertConfig

  constructor(config: SlackAlertConfig) {
    this.config = {
      username: 'WeAnime Bot',
      iconEmoji: ':robot_face:',
      ...config
    }
  }

  // Create Slack-optimized error alert
  createErrorAlert(error: {
    message: string
    level: 'error' | 'warn' | 'info' | 'debug'
    component?: string
    url?: string
    userId?: string
    stack?: string
    timestamp: string
  }): SlackWebhookPayload {
    const emoji = this.getEmojiForLevel(error.level)
    const color = this.getColorForLevel(error.level)
    
    const payload: SlackWebhookPayload = {
      text: `${emoji} WeAnime ${error.level.toUpperCase()} Alert`,
      username: this.config.username,
      icon_emoji: this.config.iconEmoji,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} WeAnime ${error.level.toUpperCase()} Alert`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Error:*\n${error.message}`
            },
            {
              type: "mrkdwn",
              text: `*Component:*\n${error.component || 'Unknown'}`
            },
            {
              type: "mrkdwn",
              text: `*URL:*\n${error.url || 'N/A'}`
            },
            {
              type: "mrkdwn",
              text: `*Time:*\n${new Date(error.timestamp).toLocaleString()}`
            }
          ]
        }
      ]
    }

    // Add user info if available
    if (error.userId) {
      payload.blocks![1].fields.push({
        type: "mrkdwn",
        text: `*User:*\n${error.userId}`
      })
    }

    // Add stack trace for errors
    if (error.stack && error.level === 'error') {
      payload.blocks!.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Stack Trace:*\n\`\`\`\n${error.stack.substring(0, 500)}${error.stack.length > 500 ? '...' : ''}\n\`\`\``
        }
      })
    }

    // Add action buttons
    payload.blocks!.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "🔍 View Dashboard"
          },
          url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/monitoring`,
          style: error.level === 'error' ? 'danger' : 'primary'
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "📊 View Analytics"
          },
          url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/analytics`
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "🧪 Test System"
          },
          url: `${process.env.NEXT_PUBLIC_APP_URL}/test`
        }
      ]
    })

    // Add channel if specified
    if (this.config.channel) {
      payload.channel = this.config.channel
    }

    return payload
  }

  // Create deployment notification
  createDeploymentAlert(deployment: {
    version: string
    environment: string
    status: 'success' | 'failed'
    url?: string
    timestamp: string
  }): SlackWebhookPayload {
    const emoji = deployment.status === 'success' ? '🚀' : '❌'
    const color = deployment.status === 'success' ? 'good' : 'danger'

    return {
      text: `${emoji} WeAnime Deployment ${deployment.status === 'success' ? 'Successful' : 'Failed'}`,
      username: this.config.username,
      icon_emoji: this.config.iconEmoji,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} WeAnime Deployment ${deployment.status === 'success' ? 'Successful' : 'Failed'}`
          }
        },
        {
          type: "section",
          fields: [
            {
              type: "mrkdwn",
              text: `*Version:*\n${deployment.version}`
            },
            {
              type: "mrkdwn",
              text: `*Environment:*\n${deployment.environment}`
            },
            {
              type: "mrkdwn",
              text: `*Status:*\n${deployment.status.toUpperCase()}`
            },
            {
              type: "mrkdwn",
              text: `*Time:*\n${new Date(deployment.timestamp).toLocaleString()}`
            }
          ]
        },
        ...(deployment.url ? [{
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "🌐 Visit Site"
              },
              url: deployment.url,
              style: "primary"
            }
          ]
        }] : [])
      ]
    }
  }

  // Create system health alert
  createHealthAlert(health: {
    status: 'healthy' | 'degraded' | 'down'
    services: { name: string; status: string }[]
    timestamp: string
  }): SlackWebhookPayload {
    const emoji = health.status === 'healthy' ? '✅' : health.status === 'degraded' ? '⚠️' : '🚨'
    
    return {
      text: `${emoji} WeAnime System Health: ${health.status.toUpperCase()}`,
      username: this.config.username,
      icon_emoji: this.config.iconEmoji,
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: `${emoji} System Health: ${health.status.toUpperCase()}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Overall Status:* ${health.status.toUpperCase()}\n*Check Time:* ${new Date(health.timestamp).toLocaleString()}`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Service Status:*\n${health.services.map(s => `• ${s.name}: ${s.status}`).join('\n')}`
          }
        }
      ]
    }
  }

  // Send webhook to Slack
  async sendWebhook(payload: SlackWebhookPayload): Promise<boolean> {
    try {
      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WeAnime-Slack-Bot/1.0'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`)
      }

      return true
    } catch (error) {
      console.error('Slack webhook error:', error)
      return false
    }
  }

  // Test webhook with a simple message
  async testWebhook(): Promise<boolean> {
    const testPayload: SlackWebhookPayload = {
      text: "🧪 WeAnime Webhook Test",
      username: this.config.username,
      icon_emoji: this.config.iconEmoji,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*🧪 Webhook Test Successful!*\n\nYour Slack integration is working perfectly.\n\n*App:* WeAnime\n*Test Time:* " + new Date().toLocaleString() + "\n*Status:* All systems operational"
          }
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "🔍 View Dashboard"
              },
              url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/monitoring`,
              style: "primary"
            }
          ]
        }
      ]
    }

    return await this.sendWebhook(testPayload)
  }

  private getEmojiForLevel(level: string): string {
    switch (level) {
      case 'error': return '🚨'
      case 'warn': return '⚠️'
      case 'info': return 'ℹ️'
      case 'debug': return '🔍'
      default: return '📝'
    }
  }

  private getColorForLevel(level: string): string {
    switch (level) {
      case 'error': return 'danger'
      case 'warn': return 'warning'
      case 'info': return 'good'
      case 'debug': return '#9936031'
      default: return '#808080'
    }
  }
}

// Helper function to create and test Slack webhook
export async function createSlackWebhook(webhookUrl: string, channel?: string): Promise<SlackWebhookHelper> {
  const helper = new SlackWebhookHelper({
    webhookUrl,
    channel,
    username: 'WeAnime Bot',
    iconEmoji: ':robot_face:'
  })

  return helper
}

// Test function for immediate webhook testing
export async function testSlackWebhookUrl(webhookUrl: string): Promise<boolean> {
  const helper = await createSlackWebhook(webhookUrl)
  return await helper.testWebhook()
}
