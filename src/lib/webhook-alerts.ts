// WeAnime Webhook Alert System
// Supports Slack, Discord, and custom webhooks

interface ErrorAlert {
  id: string
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  component?: string
  url?: string
  userId?: string
  stack?: string
  timestamp: string
  metadata?: Record<string, any>
}

interface WebhookConfig {
  slack?: string
  discord?: string
  test?: string
  custom?: string[]
}

class WebhookAlertSystem {
  private config: WebhookConfig

  constructor() {
    this.config = {
      slack: process.env.SLACK_WEBHOOK_URL,
      discord: process.env.DISCORD_WEBHOOK_URL,
      test: process.env.TEST_WEBHOOK_URL,
      custom: process.env.CUSTOM_WEBHOOK_URLS?.split(',').filter(Boolean) || []
    }
  }

  async sendAlert(alert: ErrorAlert): Promise<void> {
    const promises: Promise<void>[] = []

    // Send to Slack
    if (this.config.slack) {
      promises.push(this.sendSlackAlert(alert))
    }

    // Send to Discord
    if (this.config.discord) {
      promises.push(this.sendDiscordAlert(alert))
    }

    // Send to test webhook
    if (this.config.test) {
      promises.push(this.sendTestAlert(alert))
    }

    // Send to custom webhooks
    this.config.custom?.forEach(url => {
      promises.push(this.sendCustomAlert(alert, url))
    })

    // Execute all webhook calls
    try {
      await Promise.allSettled(promises)
    } catch (error) {
      console.error('Webhook alert failed:', error)
    }
  }

  private async sendSlackAlert(alert: ErrorAlert): Promise<void> {
    const payload: any = {
      text: `${this.getEmojiForLevel(alert.level)} WeAnime ${alert.level.toUpperCase()} Alert`,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*${this.getEmojiForLevel(alert.level)} ${alert.level.toUpperCase()} ALERT*\n\n*Error:* ${alert.message}\n*Component:* ${alert.component || 'Unknown'}\n*URL:* ${alert.url || 'N/A'}\n*User:* ${alert.userId || 'Anonymous'}\n*Time:* ${alert.timestamp}`
          }
        }
      ]
    }

    // Add stack trace if available
    if (alert.stack && alert.level === 'error') {
      payload.blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Stack Trace:*\n\`\`\`\n${alert.stack.substring(0, 500)}${alert.stack.length > 500 ? '...' : ''}\n\`\`\``
        }
      })
    }

    // Add action buttons
    payload.blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "🔍 View Dashboard"
          },
          url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/monitoring`,
          style: alert.level === 'error' ? 'danger' : 'primary'
        },
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "📊 View Metrics"
          },
          url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/analytics`
        }
      ]
    })

    await this.sendWebhook(this.config.slack!, payload)
  }

  private async sendDiscordAlert(alert: ErrorAlert): Promise<void> {
    const payload = {
      content: `${this.getEmojiForLevel(alert.level)} **WeAnime ${alert.level.toUpperCase()} Alert**`,
      embeds: [
        {
          title: `${this.getEmojiForLevel(alert.level)} ${alert.level.toUpperCase()}`,
          description: alert.message,
          color: this.getColorForLevel(alert.level),
          fields: [
            {
              name: "Component",
              value: alert.component || 'Unknown',
              inline: true
            },
            {
              name: "URL",
              value: alert.url || 'N/A',
              inline: true
            },
            {
              name: "User",
              value: alert.userId || 'Anonymous',
              inline: true
            }
          ],
          timestamp: alert.timestamp,
          footer: {
            text: "WeAnime Error Monitor"
          }
        }
      ]
    }

    // Add stack trace for errors
    if (alert.stack && alert.level === 'error') {
      payload.embeds[0].fields.push({
        name: "Error Details",
        value: `\`\`\`\n${alert.stack.substring(0, 1000)}${alert.stack.length > 1000 ? '...' : ''}\n\`\`\``,
        inline: false
      })
    }

    await this.sendWebhook(this.config.discord!, payload)
  }

  private async sendTestAlert(alert: ErrorAlert): Promise<void> {
    const payload = {
      webhook_type: 'test',
      alert_level: alert.level,
      message: alert.message,
      component: alert.component,
      url: alert.url,
      user_id: alert.userId,
      timestamp: alert.timestamp,
      stack: alert.stack,
      metadata: alert.metadata,
      formatted_message: `${this.getEmojiForLevel(alert.level)} WeAnime ${alert.level.toUpperCase()}: ${alert.message}`
    }

    await this.sendWebhook(this.config.test!, payload)
  }

  private async sendCustomAlert(alert: ErrorAlert, webhookUrl: string): Promise<void> {
    const payload = {
      type: 'weanime_error_alert',
      alert,
      app: 'WeAnime',
      version: '1.0.0',
      environment: process.env.NODE_ENV
    }

    await this.sendWebhook(webhookUrl, payload)
  }

  private async sendWebhook(url: string, payload: any): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WeAnime-Webhook/1.0'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`)
      }
    } catch (error) {
      console.error('Webhook send failed:', error)
      throw error
    }
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

  private getColorForLevel(level: string): number {
    switch (level) {
      case 'error': return 15158332 // Red
      case 'warn': return 16776960  // Yellow
      case 'info': return 3447003   // Blue
      case 'debug': return 9936031  // Purple
      default: return 8421504       // Gray
    }
  }

  // Test method to verify webhook configuration
  async testWebhooks(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {}

    const testAlert: ErrorAlert = {
      id: `test_${Date.now()}`,
      level: 'info',
      message: 'Webhook test from WeAnime - All systems operational!',
      component: 'WebhookTest',
      url: '/test',
      timestamp: new Date().toISOString(),
      metadata: {
        test: true,
        version: '1.0.0'
      }
    }

    // Test each configured webhook
    if (this.config.slack) {
      try {
        await this.sendSlackAlert(testAlert)
        results.slack = true
      } catch (error) {
        results.slack = false
      }
    }

    if (this.config.discord) {
      try {
        await this.sendDiscordAlert(testAlert)
        results.discord = true
      } catch (error) {
        results.discord = false
      }
    }

    if (this.config.test) {
      try {
        await this.sendTestAlert(testAlert)
        results.test = true
      } catch (error) {
        results.test = false
      }
    }

    return results
  }

  // Get webhook configuration status
  getConfigStatus(): { [key: string]: boolean } {
    return {
      slack: !!this.config.slack,
      discord: !!this.config.discord,
      test: !!this.config.test,
      custom: (this.config.custom?.length ?? 0) > 0
    }
  }
}

// Export singleton instance
export const webhookAlerts = new WebhookAlertSystem()

// Helper function to send error alerts
export async function sendErrorAlert(error: {
  message: string
  level?: 'error' | 'warn' | 'info' | 'debug'
  component?: string
  url?: string
  userId?: string
  stack?: string
  metadata?: Record<string, any>
}): Promise<void> {
  const alert: ErrorAlert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
    level: error.level || 'error',
    message: error.message,
    component: error.component,
    url: error.url,
    userId: error.userId,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    metadata: error.metadata
  }

  await webhookAlerts.sendAlert(alert)
}
