'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'

interface HealthStatus {
  status: string
  timestamp: string
  services?: any
  overall?: string
  responseTime?: string
}

interface SecurityStatus {
  status: string
  securityScore: number
  summary: any
  recommendations: string[]
  alertThresholds: any
}

interface SystemHealthStatus {
  status: string
  services: any
  metrics: any
  recommendations: string[]
}

export default function MonitoringDashboard() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null)
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealthStatus | null>(null)
  const [errorLogs, setErrorLogs] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchHealthStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setHealthStatus(data)
    } catch (error) {
      console.error('Failed to fetch health status:', error)
      setHealthStatus({ status: 'error', timestamp: new Date().toISOString() })
    }
  }, [])

  const fetchSecurityStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/security/monitoring')
      const data = await response.json()
      setSecurityStatus(data)
    } catch (error) {
      console.error('Failed to fetch security status:', error)
    }
  }, [])

  const fetchSystemHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/system-health')
      const data = await response.json()
      setSystemHealth(data)
    } catch (error) {
      console.error('Failed to fetch system health:', error)
    }
  }, [])

  const fetchErrorLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/error?limit=10')
      const data = await response.json()
      setErrorLogs(data)
    } catch (error) {
      console.error('Failed to fetch error logs:', error)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    await Promise.all([
      fetchHealthStatus(),
      fetchSecurityStatus(),
      fetchSystemHealth(),
      fetchErrorLogs()
    ])
    setLastUpdate(new Date())
    setLoading(false)
  }, [fetchHealthStatus, fetchSecurityStatus, fetchSystemHealth, fetchErrorLogs])

  useEffect(() => {
    refreshAll()

    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshAll, 30000)
    return () => clearInterval(interval)
  }, [refreshAll])

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'good':
      case 'up':
        return 'bg-green-500'
      case 'degraded':
      case 'warning':
        return 'bg-yellow-500'
      case 'unhealthy':
      case 'critical':
      case 'down':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'good':
      case 'up':
        return 'default'
      case 'degraded':
      case 'warning':
        return 'secondary'
      case 'unhealthy':
      case 'critical':
      case 'down':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  if (loading && !healthStatus) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading monitoring dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        <Button onClick={refreshAll} disabled={loading}>
          {loading ? 'Refreshing...' : 'Refresh All'}
        </Button>
      </div>

      {/* Overall Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Application Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(healthStatus?.status || 'unknown')}`}></div>
              <Badge variant={getStatusBadgeVariant(healthStatus?.status || 'unknown')}>
                {healthStatus?.status || 'Unknown'}
              </Badge>
            </div>
            {healthStatus?.responseTime && (
              <p className="text-xs text-muted-foreground mt-1">
                Response: {healthStatus.responseTime}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Security Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {securityStatus?.securityScore || 0}/100
              </div>
              <Progress value={securityStatus?.securityScore || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(systemHealth?.status || 'unknown')}`}></div>
              <Badge variant={getStatusBadgeVariant(systemHealth?.status || 'unknown')}>
                {systemHealth?.status || 'Unknown'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Error Count (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {errorLogs?.stats?.last24h || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Total logs: {errorLogs?.stats?.total || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Monitoring Tabs */}
      <Tabs defaultValue="services" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Status</CardTitle>
              <CardDescription>Current status of all system services</CardDescription>
            </CardHeader>
            <CardContent>
              {systemHealth?.services ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(systemHealth.services).map(([service, status]: [string, any]) => (
                    <div key={service} className="flex items-center justify-between p-3 border rounded">
                      <span className="font-medium capitalize">{service.replace(/([A-Z])/g, ' $1')}</span>
                      <Badge variant={getStatusBadgeVariant(status.status)}>
                        {status.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No service data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Monitoring</CardTitle>
              <CardDescription>Current security status and alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {securityStatus?.summary && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{securityStatus.summary.totalEvents}</div>
                    <div className="text-sm text-muted-foreground">Total Events</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{securityStatus.summary.criticalEvents}</div>
                    <div className="text-sm text-muted-foreground">Critical</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{securityStatus.summary.authFailures}</div>
                    <div className="text-sm text-muted-foreground">Auth Failures</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{securityStatus.summary.bruteForceAttempts}</div>
                    <div className="text-sm text-muted-foreground">Brute Force</div>
                  </div>
                </div>
              )}

              {securityStatus?.recommendations && securityStatus.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Security Recommendations:</h4>
                  <div className="space-y-2">
                    {securityStatus.recommendations.map((rec, index) => (
                      <Alert key={index}>
                        <AlertDescription>{rec}</AlertDescription>
                      </Alert>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>System performance and response times</CardDescription>
            </CardHeader>
            <CardContent>
              {systemHealth?.metrics ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{systemHealth.metrics.totalRequests}</div>
                    <div className="text-sm text-muted-foreground">Total Requests</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {systemHealth.metrics.successRate?.toFixed(1)}%
                    </div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{systemHealth.metrics.averageResponseTime}ms</div>
                    <div className="text-sm text-muted-foreground">Avg Response</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{systemHealth.metrics.errorCount}</div>
                    <div className="text-sm text-muted-foreground">Errors</div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No metrics data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Error Logs</CardTitle>
              <CardDescription>Latest error reports and system issues</CardDescription>
            </CardHeader>
            <CardContent>
              {errorLogs?.logs && errorLogs.logs.length > 0 ? (
                <div className="space-y-2">
                  {errorLogs.logs.slice(0, 10).map((log: any, index: number) => (
                    <div key={index} className="p-3 border rounded space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant={log.level === 'error' ? 'destructive' : 'secondary'}>
                          {log.level}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{log.message}</p>
                      {log.context?.component && (
                        <p className="text-xs text-muted-foreground">
                          Component: {log.context.component}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No recent error logs</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommendations */}
      {(systemHealth?.recommendations || securityStatus?.recommendations) && (
        <Card>
          <CardHeader>
            <CardTitle>System Recommendations</CardTitle>
            <CardDescription>Actions to improve system health and security</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {systemHealth?.recommendations?.map((rec: string, index: number) => (
                <Alert key={`system-${index}`}>
                  <AlertDescription>{rec}</AlertDescription>
                </Alert>
              ))}
              {securityStatus?.recommendations?.map((rec: string, index: number) => (
                <Alert key={`security-${index}`}>
                  <AlertDescription>{rec}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}