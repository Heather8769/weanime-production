'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useErrorLogger } from '@/lib/error-logger'
import { AlertTriangle, Bug, Info, AlertCircle, RefreshCw, Download, Trash2 } from 'lucide-react'

interface ErrorLog {
  id: string
  timestamp: string
  level: 'error' | 'warn' | 'info' | 'debug'
  message: string
  stack?: string
  context: {
    userId?: string
    sessionId: string
    userAgent: string
    url: string
    component?: string
    action?: string
    metadata?: Record<string, any>
  }
  resolved: boolean
  tags: string[]
}

interface ErrorStats {
  total: number
  last24h: number
  byLevel: Record<string, number>
}

export default function MonitoringDashboard() {
  const [logs, setLogs] = useState<ErrorLog[]>([])
  const [stats, setStats] = useState<ErrorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<{
    level?: string
    component?: string
    resolved?: boolean
  }>({})

  const { getErrorSummary, exportLogs, clearLogs } = useErrorLogger()

  useEffect(() => {
    fetchLogs()
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filter.level) params.append('level', filter.level)
      if (filter.component) params.append('component', filter.component)
      if (filter.resolved !== undefined) params.append('resolved', filter.resolved.toString())

      const response = await fetch(`/api/monitoring/error?${params}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportLogs = () => {
    const exportData = exportLogs()
    const blob = new Blob([exportData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `weanime-error-logs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      clearLogs()
      fetchLogs()
    }
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warn': return <AlertCircle className="h-4 w-4 text-yellow-500" />
      case 'info': return <Info className="h-4 w-4 text-blue-500" />
      case 'debug': return <Bug className="h-4 w-4 text-gray-500" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'destructive'
      case 'warn': return 'secondary'
      case 'info': return 'default'
      case 'debug': return 'outline'
      default: return 'default'
    }
  }

  const localSummary = getErrorSummary()

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Error Monitoring Dashboard</h1>
        <div className="flex gap-2">
          <Button onClick={fetchLogs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleExportLogs} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleClearLogs} variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || localSummary.total}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.last24h || localSummary.recent}</div>
            <p className="text-xs text-muted-foreground">Recent activity</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
            <Bug className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats?.byLevel?.error || localSummary.byLevel.error || 0}
            </div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
            <Info className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">{localSummary.unresolved}</div>
            <p className="text-xs text-muted-foreground">Pending review</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex gap-2">
              <Button
                variant={filter.level === undefined ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ ...filter, level: undefined })}
              >
                All Levels
              </Button>
              {['error', 'warn', 'info', 'debug'].map((level) => (
                <Button
                  key={level}
                  variant={filter.level === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter({ ...filter, level })}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter.resolved === undefined ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ ...filter, resolved: undefined })}
              >
                All Status
              </Button>
              <Button
                variant={filter.resolved === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ ...filter, resolved: false })}
              >
                Unresolved
              </Button>
              <Button
                variant={filter.resolved === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter({ ...filter, resolved: true })}
              >
                Resolved
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Error Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No error logs found matching the current filters.
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getLevelIcon(log.level)}
                      <Badge variant={getLevelColor(log.level) as any}>
                        {log.level.toUpperCase()}
                      </Badge>
                      {log.context.component && (
                        <Badge variant="outline">{log.context.component}</Badge>
                      )}
                      {log.resolved && (
                        <Badge variant="default">Resolved</Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <h4 className="font-medium">{log.message}</h4>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p><strong>URL:</strong> {log.context.url}</p>
                    {log.context.userId && (
                      <p><strong>User:</strong> {log.context.userId}</p>
                    )}
                    {log.context.action && (
                      <p><strong>Action:</strong> {log.context.action}</p>
                    )}
                  </div>

                  {log.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {log.stack}
                      </pre>
                    </details>
                  )}

                  {log.context.metadata && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-medium">
                        Metadata
                      </summary>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.context.metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
