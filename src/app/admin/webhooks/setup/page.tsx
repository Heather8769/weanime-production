'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Gamepad2, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Settings
} from 'lucide-react'

export default function WebhookSetupPage() {
  const [slackUrl, setSlackUrl] = useState('')
  const [discordUrl, setDiscordUrl] = useState('')
  const [step, setStep] = useState(1)
  const [copied, setCopied] = useState('')

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text)
    setCopied(type)
    setTimeout(() => setCopied(''), 2000)
  }

  const validateSlackUrl = (url: string) => {
    return url.startsWith('https://hooks.slack.com/services/')
  }

  const validateDiscordUrl = (url: string) => {
    return url.startsWith('https://discord.com/api/webhooks/')
  }

  const generateEnvConfig = () => {
    let config = '# Webhook Configuration for WeAnime\n'
    if (slackUrl && validateSlackUrl(slackUrl)) {
      config += `SLACK_WEBHOOK_URL=${slackUrl}\n`
    }
    if (discordUrl && validateDiscordUrl(discordUrl)) {
      config += `DISCORD_WEBHOOK_URL=${discordUrl}\n`
    }
    return config
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold">Webhook Setup Assistant</h1>
        <p className="text-muted-foreground mt-2">
          Set up Slack and Discord webhooks for WeAnime error alerts
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-4">
          {[1, 2, 3, 4].map((stepNum) => (
            <div key={stepNum} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= stepNum 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {stepNum}
              </div>
              {stepNum < 4 && (
                <ArrowRight className={`h-4 w-4 mx-2 ${
                  step > stepNum ? 'text-primary' : 'text-muted-foreground'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Choose Platform */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Choose Your Platform(s)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border rounded-lg p-6 text-center space-y-4">
                <MessageSquare className="h-12 w-12 text-blue-500 mx-auto" />
                <h3 className="text-xl font-semibold">Slack</h3>
                <p className="text-muted-foreground">
                  Perfect for team notifications and professional environments
                </p>
                <Button 
                  onClick={() => setStep(2)}
                  className="w-full"
                >
                  Set Up Slack
                </Button>
              </div>

              <div className="border rounded-lg p-6 text-center space-y-4">
                <Gamepad2 className="h-12 w-12 text-purple-500 mx-auto" />
                <h3 className="text-xl font-semibold">Discord</h3>
                <p className="text-muted-foreground">
                  Great for community servers and gaming-focused teams
                </p>
                <Button 
                  onClick={() => setStep(3)}
                  variant="outline"
                  className="w-full"
                >
                  Set Up Discord
                </Button>
              </div>
            </div>

            <div className="text-center mt-6">
              <Button 
                onClick={() => setStep(4)}
                variant="secondary"
              >
                Skip to Configuration
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Slack Setup */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              Step 2: Slack Webhook Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Follow these steps:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Go to <a href="https://api.slack.com/apps" target="_blank" className="text-blue-500 hover:underline inline-flex items-center">
                    Slack API <ExternalLink className="h-3 w-3 ml-1" />
                  </a></li>
                  <li>Click "Create New App" → "From scratch"</li>
                  <li>Name: "WeAnime Error Monitor"</li>
                  <li>Select your workspace</li>
                  <li>Go to "Incoming Webhooks" → Toggle ON</li>
                  <li>Click "Add New Webhook to Workspace"</li>
                  <li>Select channel (e.g., #alerts)</li>
                  <li>Copy the webhook URL</li>
                </ol>
              </div>

              <div>
                <Label htmlFor="slackUrl">Paste your Slack Webhook URL:</Label>
                <Input
                  id="slackUrl"
                  placeholder="https://hooks.slack.com/services/..."
                  value={slackUrl}
                  onChange={(e) => setSlackUrl(e.target.value)}
                  className="mt-2"
                />
                {slackUrl && (
                  <div className="mt-2">
                    {validateSlackUrl(slackUrl) ? (
                      <Badge variant="default" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Valid Slack URL
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Invalid URL format
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setStep(1)} variant="outline">
                  Back
                </Button>
                <Button onClick={() => setStep(3)}>
                  Next: Discord Setup
                </Button>
                <Button onClick={() => setStep(4)} variant="secondary">
                  Skip to Configuration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Discord Setup */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gamepad2 className="h-5 w-5 text-purple-500" />
              Step 3: Discord Webhook Setup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">Follow these steps:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Go to your Discord server</li>
                  <li>Right-click on the channel for alerts</li>
                  <li>Select "Edit Channel" → "Integrations"</li>
                  <li>Click "Webhooks" → "New Webhook"</li>
                  <li>Name: "WeAnime Error Monitor"</li>
                  <li>Copy the webhook URL</li>
                </ol>
              </div>

              <div>
                <Label htmlFor="discordUrl">Paste your Discord Webhook URL:</Label>
                <Input
                  id="discordUrl"
                  placeholder="https://discord.com/api/webhooks/..."
                  value={discordUrl}
                  onChange={(e) => setDiscordUrl(e.target.value)}
                  className="mt-2"
                />
                {discordUrl && (
                  <div className="mt-2">
                    {validateDiscordUrl(discordUrl) ? (
                      <Badge variant="default" className="text-green-600">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Valid Discord URL
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Invalid URL format
                      </Badge>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setStep(2)} variant="outline">
                  Back
                </Button>
                <Button onClick={() => setStep(4)}>
                  Next: Configuration
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Configuration */}
      {step === 4 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Step 4: Environment Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-3">Add these lines to your .env.local file:</h4>
                <div className="bg-muted p-4 rounded-lg relative">
                  <pre className="text-sm">{generateEnvConfig()}</pre>
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard(generateEnvConfig(), 'env')}
                  >
                    {copied === 'env' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">⚠️ Important:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Save the .env.local file</li>
                  <li>Restart your development server (Ctrl+C, then npm run dev)</li>
                  <li>Visit the webhook dashboard to test your setup</li>
                </ol>
              </div>

              <div className="flex gap-4">
                <Button onClick={() => setStep(3)} variant="outline">
                  Back
                </Button>
                <Button 
                  onClick={() => window.open('/admin/webhooks', '_blank')}
                  className="flex-1"
                >
                  Open Webhook Dashboard
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={() => window.open('https://api.slack.com/apps', '_blank')}
              className="justify-start"
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Slack API
              <ExternalLink className="h-3 w-3 ml-auto" />
            </Button>

            <Button
              variant="outline"
              onClick={() => window.open('/admin/webhooks', '_blank')}
              className="justify-start"
            >
              <Settings className="h-4 w-4 mr-2" />
              Webhook Dashboard
            </Button>

            <Button
              variant="outline"
              onClick={() => window.open('/test', '_blank')}
              className="justify-start"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Test Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
