'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Settings, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Webhook,
  MessageSquare,
  Gamepad2,
  TestTube
} from 'lucide-react'

interface WebhookConfig {
  slack: boolean
  discord: boolean
  test: boolean
  custom: boolean
}

interface TestResult {
  [key: string]: boolean
}

export default function WebhooksPage() {
  const [config, setConfig] = useState<WebhookConfig | null>(null)
  const [testResults, setTestResults] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [testMessage, setTestMessage] = useState('')

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/webhooks/test')
      const data = await response.json()
      setConfig(data.configuration)
    } catch (error) {
      console.error('Failed to fetch webhook config:', error)
    }
  }

  const testWebhooks = async (type: string = 'all') => {
    setLoading(true)
    try {
      const payload = type === 'custom' && testMessage 
        ? { type: 'info', message: testMessage }
        : { type }

      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      const data = await response.json()
      
      if (data.results) {
        setTestResults(data.results)
      }
      
      alert(`${data.message} - Check your configured channels for test messages!`)
    } catch (error) {
      console.error('Webhook test failed:', error)
      alert('Webhook test failed. Check console for details.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )
  }

  const getStatusBadge = (status: boolean) => {
    return (
      <Badge variant={status ? 'default' : 'secondary'}>
        {status ? 'CONFIGURED' : 'NOT CONFIGURED'}
      </Badge>
    )
  }

  useEffect(() => {
    fetchConfig()
  }, [])

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Webhook Configuration</h1>
          <p className="text-muted-foreground">Configure and test error alert webhooks</p>
        </div>
        <Button onClick={fetchConfig} variant="outline">
          <Settings className="h-4 w-4 mr-2" />
          Refresh Config
        </Button>
      </div>

      {/* Configuration Status */}
      {config && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="h-5 w-5" />
              Webhook Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <MessageSquare className="h-8 w-8 text-blue-500" />
                  <div>
                    <div className="font-medium">Slack</div>
                    <div className="text-sm text-muted-foreground">Team notifications</div>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusIcon(config.slack)}
                  {getStatusBadge(config.slack)}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Gamepad2 className="h-8 w-8 text-purple-500" />
                  <div>
                    <div className="font-medium">Discord</div>
                    <div className="text-sm text-muted-foreground">Community alerts</div>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusIcon(config.discord)}
                  {getStatusBadge(config.discord)}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <TestTube className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="font-medium">Test Webhook</div>
                    <div className="text-sm text-muted-foreground">Development testing</div>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusIcon(config.test)}
                  {getStatusBadge(config.test)}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Settings className="h-8 w-8 text-orange-500" />
                  <div>
                    <div className="font-medium">Custom</div>
                    <div className="text-sm text-muted-foreground">Custom endpoints</div>
                  </div>
                </div>
                <div className="text-right">
                  {getStatusIcon(config.custom)}
                  {getStatusBadge(config.custom)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Webhooks */}
      <Card>
        <CardHeader>
          <CardTitle>Test Webhook Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => testWebhooks('error')}
                disabled={loading}
                variant="destructive"
                className="h-20 flex-col"
              >
                <AlertTriangle className="h-6 w-6 mb-2" />
                Test Critical Error
              </Button>

              <Button
                onClick={() => testWebhooks('warning')}
                disabled={loading}
                variant="secondary"
                className="h-20 flex-col"
              >
                <AlertTriangle className="h-6 w-6 mb-2" />
                Test Warning
              </Button>

              <Button
                onClick={() => testWebhooks('info')}
                disabled={loading}
                variant="outline"
                className="h-20 flex-col"
              >
                <CheckCircle className="h-6 w-6 mb-2" />
                Test Info Alert
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="testMessage">Custom Test Message</Label>
                <Textarea
                  id="testMessage"
                  placeholder="Enter a custom message for testing..."
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="mt-2"
                />
              </div>

              <Button
                onClick={() => testWebhooks('custom')}
                disabled={loading || !testMessage.trim()}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send Custom Test Message
              </Button>
            </div>

            <Button
              onClick={() => testWebhooks('all')}
              disabled={loading}
              variant="default"
              className="w-full"
            >
              <TestTube className="h-4 w-4 mr-2" />
              Test All Configured Webhooks
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(testResults).map(([webhook, success]) => (
                <div key={webhook} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(success)}
                    <div>
                      <div className="font-medium capitalize">{webhook} Webhook</div>
                      <div className="text-sm text-muted-foreground">
                        {success ? 'Test message sent successfully' : 'Test failed'}
                      </div>
                    </div>
                  </div>
                  <Badge variant={success ? 'default' : 'destructive'}>
                    {success ? 'SUCCESS' : 'FAILED'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Setup Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">🔔 Slack Setup</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Go to <a href="https://api.slack.com/apps" target="_blank" className="text-blue-500 hover:underline">https://api.slack.com/apps</a></li>
                <li>Create New App → From scratch</li>
                <li>Enable "Incoming Webhooks"</li>
                <li>Add webhook to workspace and select channel</li>
                <li>Copy webhook URL and add to <code className="bg-muted px-1 rounded">.env.local</code>:</li>
              </ol>
              <code className="block bg-muted p-2 rounded mt-2 text-sm">
                SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
              </code>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">🎮 Discord Setup</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm">
                <li>Go to your Discord server</li>
                <li>Right-click channel → Edit Channel → Integrations → Webhooks</li>
                <li>Create Webhook with name "WeAnime Error Monitor"</li>
                <li>Copy webhook URL and add to <code className="bg-muted px-1 rounded">.env.local</code>:</li>
              </ol>
              <code className="block bg-muted p-2 rounded mt-2 text-sm">
                DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK
              </code>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <p className="text-sm">
                <strong>💡 Tip:</strong> After adding webhook URLs to your environment file, 
                restart the development server and refresh this page to see the updated configuration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
