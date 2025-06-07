'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  version: string
  environment: string
  checks: {
    database: HealthCheckResult
    external_apis: HealthCheckResult
    memory: HealthCheckResult
    disk: HealthCheckResult
  }
  uptime: number
  response_time: number
}

interface HealthCheckResult {
  status: 'pass' | 'fail' | 'warn'
  message?: string
  duration?: number
  details?: any
}

export default function StatusPage() {
  const [healthData, setHealthData] = useState<HealthCheck | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealthData(data)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('Failed to fetch health data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealthData()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return 'text-green-600 bg-green-100'
      case 'degraded':
      case 'warn':
        return 'text-yellow-600 bg-yellow-100'
      case 'unhealthy':
      case 'fail':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'pass':
        return '✅'
      case 'degraded':
      case 'warn':
        return '⚠️'
      case 'unhealthy':
      case 'fail':
        return '❌'
      default:
        return '❓'
    }
  }

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor(uptime / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`
    } else {
      return `${seconds}s`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">System Status</h1>
          <div className="animate-pulse">
            <div className="h-32 bg-muted rounded-lg mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-muted rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!healthData) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">System Status</h1>
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Failed to load system status</p>
              <button
                onClick={fetchHealthData}
                className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Retry
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">System Status</h1>
          <button
            onClick={fetchHealthData}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
          >
            Refresh
          </button>
        </div>

        {/* Overall Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">{getStatusIcon(healthData.status)}</span>
              Overall Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <span className={`px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(healthData.status)}`}>
                  {healthData.status.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="font-medium">{formatUptime(healthData.uptime)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Response Time</p>
                <p className="font-medium">{healthData.response_time}ms</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Version</p>
                <p className="font-medium">{healthData.version}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Individual Checks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {Object.entries(healthData.checks).map(([key, check]) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span>{getStatusIcon(check.status)}</span>
                  {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(check.status)}`}>
                      {check.status.toUpperCase()}
                    </span>
                  </div>
                  {check.message && (
                    <div>
                      <span className="text-sm text-muted-foreground">Message</span>
                      <p className="text-sm">{check.message}</p>
                    </div>
                  )}
                  {check.duration && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Duration</span>
                      <span className="text-sm font-medium">{check.duration}ms</span>
                    </div>
                  )}
                  {check.details && (
                    <div>
                      <span className="text-sm text-muted-foreground">Details</span>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                        {JSON.stringify(check.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* System Information */}
        <Card>
          <CardHeader>
            <CardTitle>System Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Environment</p>
                <p className="font-medium">{healthData.environment}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Timestamp</p>
                <p className="font-medium">
                  {new Date(healthData.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Status page automatically refreshes every 30 seconds</p>
          <p className="mt-2">
            For support, please contact{' '}
            <a href="mailto:support@weanime.com" className="text-primary hover:underline">
              support@weanime.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
