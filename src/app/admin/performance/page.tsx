'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { VideoPerformanceDashboard } from '@/components/video-performance-dashboard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  environment: string
  services: {
    frontend: ServiceHealth
    backend: ServiceHealth
    crunchyrollBridge: ServiceHealth
    database: ServiceHealth
    anilist: ServiceHealth
  }
  performance: {
    uptime: number
    memoryUsage: {
      rss: number
      heapUsed: number
      heapTotal: number
      external: number
    }
    responseTime: number
  }
  features: {
    realCrunchyrollIntegration: boolean
    mockDataDisabled: boolean
    performanceMonitoring: boolean
    errorCollection: boolean
  }
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded'
  responseTime?: number
  lastCheck: string
  error?: string
}

interface ErrorSummary {
  total: number
  byLevel: {
    ERROR: number
    WARN: number
    INFO: number
  }
  byComponent: Record<string, number>
  lastHour: number
}

export default function PerformanceDashboard() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [errorData, setErrorData] = useState<ErrorSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchHealthData = async () => {
    try {
      const response = await fetch('/api/health-check')
      const data = await response.json()
      setHealthData(data)
    } catch (error) {
      console.error('Failed to fetch health data:', error)
    }
  }

  const fetchErrorData = async () => {
    try {
      const response = await fetch('/api/errors')
      const data = await response.json()
      setErrorData(data.summary)
    } catch (error) {
      console.error('Failed to fetch error data:', error)
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchHealthData(), fetchErrorData()])
      setLoading(false)
      setLastUpdate(new Date())
    }

    fetchData()
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return 'text-green-600'
      case 'degraded':
        return 'text-yellow-600'
      case 'unhealthy':
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return '✅'
      case 'degraded':
        return '⚠️'
      case 'unhealthy':
      case 'down':
        return '❌'
      default:
        return '❓'
    }
  }

  const formatBytes = (bytes: number) => {
    const mb = bytes / 1024 / 1024
    return `${mb.toFixed(1)} MB`
  }

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}h ${minutes}m`
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading performance dashboard...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">WeAnime Performance Dashboard</h1>
        <div className="text-sm text-gray-500">
          Last updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>

      <Tabs defaultValue="system" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="system">System Performance</TabsTrigger>
          <TabsTrigger value="video">Video Streaming</TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-6">

      {/* Overall Status */}
      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(healthData.status)}
              System Status: <span className={getStatusColor(healthData.status)}>{healthData.status.toUpperCase()}</span>
            </CardTitle>
            <CardDescription>
              Environment: {healthData.environment} | Version: {healthData.version}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium">Uptime</div>
                <div className="text-2xl font-bold">{formatUptime(healthData.performance.uptime)}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Response Time</div>
                <div className="text-2xl font-bold">{healthData.performance.responseTime}ms</div>
              </div>
              <div>
                <div className="text-sm font-medium">Memory Usage</div>
                <div className="text-2xl font-bold">{formatBytes(healthData.performance.memoryUsage.heapUsed)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Services Status */}
      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle>Services Status</CardTitle>
            <CardDescription>Status of all WeAnime services</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(healthData.services).map(([serviceName, service]) => (
                <div key={serviceName} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium capitalize">{serviceName.replace(/([A-Z])/g, ' $1').trim()}</div>
                    <div className="flex items-center gap-1">
                      {getStatusIcon(service.status)}
                      <span className={getStatusColor(service.status)}>{service.status.toUpperCase()}</span>
                    </div>
                  </div>
                  {service.responseTime && (
                    <div className="text-sm text-gray-600">Response: {service.responseTime}ms</div>
                  )}
                  {service.error && (
                    <div className="text-sm text-red-600 mt-1">{service.error}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-1">
                    Last check: {new Date(service.lastCheck).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feature Status */}
      {healthData && (
        <Card>
          <CardHeader>
            <CardTitle>Feature Status</CardTitle>
            <CardDescription>Current feature configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(healthData.features).map(([feature, enabled]) => (
                <div key={feature} className="flex items-center gap-2">
                  <div className={enabled ? 'text-green-600' : 'text-red-600'}>
                    {enabled ? '✅' : '❌'}
                  </div>
                  <div className="text-sm">
                    {feature.replace(/([A-Z])/g, ' $1').trim()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Summary */}
      {errorData && (
        <Card>
          <CardHeader>
            <CardTitle>Error Summary</CardTitle>
            <CardDescription>Recent error statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm font-medium">Total Errors</div>
                <div className="text-2xl font-bold">{errorData.total}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Critical Errors</div>
                <div className="text-2xl font-bold text-red-600">{errorData.byLevel.ERROR}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Warnings</div>
                <div className="text-2xl font-bold text-yellow-600">{errorData.byLevel.WARN}</div>
              </div>
              <div>
                <div className="text-sm font-medium">Last Hour</div>
                <div className="text-2xl font-bold">{errorData.lastHour}</div>
              </div>
            </div>
            
            {Object.keys(errorData.byComponent).length > 0 && (
              <div className="mt-4">
                <div className="text-sm font-medium mb-2">Errors by Component</div>
                <div className="space-y-1">
                  {Object.entries(errorData.byComponent)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([component, count]) => (
                      <div key={component} className="flex justify-between text-sm">
                        <span>{component}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="video">
          <VideoPerformanceDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
