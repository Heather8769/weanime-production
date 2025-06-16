'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Settings,
  BarChart3,
  RefreshCw,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'

interface MigrationStats {
  totalAttempts: number
  totalSuccesses: number
  successRate: number
  sourceBreakdown: Record<string, number>
  migrationPercentage: number
}

interface MigrationConfig {
  enableCrunchyroll: boolean
  enableBackend: boolean
  enableRealStreaming: boolean
  fallbackToMock: boolean
  migrationPercentage: number
}

export default function MigrationDashboard() {
  const [stats, setStats] = useState<MigrationStats | null>(null)
  const [config, setConfig] = useState<MigrationConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const fetchMigrationData = async () => {
    try {
      setLoading(true)
      // This would call an API endpoint that exposes migration controller data
      // For now, we'll simulate the data
      const mockStats: MigrationStats = {
        totalAttempts: 150,
        totalSuccesses: 127,
        successRate: 84.7,
        sourceBreakdown: {
          crunchyroll: 45,
          backend: 32,
          mock: 73
        },
        migrationPercentage: 25
      }

      const mockConfig: MigrationConfig = {
        enableCrunchyroll: true,
        enableBackend: true,
        enableRealStreaming: true,
        fallbackToMock: true,
        migrationPercentage: 25
      }

      setStats(mockStats)
      setConfig(mockConfig)
    } catch (error) {
      console.error('Failed to fetch migration data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateMigrationPercentage = async (percentage: number) => {
    if (!config) return

    try {
      setUpdating(true)
      // This would call an API to update the migration percentage
      // For now, we'll just update locally
      setConfig({ ...config, migrationPercentage: percentage })
      
      // Update stats to reflect new percentage
      if (stats) {
        setStats({ ...stats, migrationPercentage: percentage })
      }
    } catch (error) {
      console.error('Failed to update migration percentage:', error)
    } finally {
      setUpdating(false)
    }
  }

  const updateConfig = async (updates: Partial<MigrationConfig>) => {
    if (!config) return

    try {
      setUpdating(true)
      const newConfig = { ...config, ...updates }
      setConfig(newConfig)
    } catch (error) {
      console.error('Failed to update configuration:', error)
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    fetchMigrationData()
    const interval = setInterval(fetchMigrationData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading migration data...</span>
      </div>
    )
  }

  if (!stats || !config) {
    return <div>No migration data available</div>
  }

  const getSourceColor = (source: string) => {
    const colors = {
      crunchyroll: 'bg-orange-500',
      backend: 'bg-blue-500',
      mock: 'bg-gray-500'
    }
    return colors[source as keyof typeof colors] || 'bg-gray-400'
  }

  const getSuccessRateStatus = (rate: number) => {
    if (rate >= 90) return { icon: CheckCircle, color: 'text-green-500', status: 'Excellent' }
    if (rate >= 75) return { icon: TrendingUp, color: 'text-yellow-500', status: 'Good' }
    return { icon: AlertTriangle, color: 'text-red-500', status: 'Needs Attention' }
  }

  const successRateStatus = getSuccessRateStatus(stats.successRate)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Migration Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor and control the gradual migration from mock data to real content
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchMigrationData}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Migration Status Alert */}
      <Alert>
        <Activity className="h-4 w-4" />
        <AlertTitle>Migration Status</AlertTitle>
        <AlertDescription>
          Currently migrating {config.migrationPercentage}% of requests to real content sources.
          {stats.successRate < 75 && ' Consider reducing migration percentage due to low success rate.'}
        </AlertDescription>
      </Alert>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Migration Percentage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{config.migrationPercentage}%</div>
            <Progress value={config.migrationPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center">
              <successRateStatus.icon className={`h-4 w-4 mr-1 ${successRateStatus.color}`} />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</div>
            <div className={`text-sm ${successRateStatus.color}`}>{successRateStatus.status}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAttempts.toLocaleString()}</div>
            <div className="text-sm text-muted-foreground">{stats.totalSuccesses} successful</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Real Content Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((stats.sourceBreakdown.crunchyroll || 0) + (stats.sourceBreakdown.backend || 0))}
            </div>
            <div className="text-sm text-muted-foreground">vs {stats.sourceBreakdown.mock || 0} mock</div>
          </CardContent>
        </Card>
      </div>

      {/* Migration Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Migration Controls
          </CardTitle>
          <CardDescription>
            Adjust migration settings to control the rollout of real content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Migration Percentage Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Migration Percentage</label>
              <span className="text-sm text-muted-foreground">{config.migrationPercentage}%</span>
            </div>
            <Slider
              value={[config.migrationPercentage]}
              onValueChange={(value) => updateMigrationPercentage(value[0])}
              max={100}
              step={5}
              className="w-full"
              disabled={updating}
            />
            <div className="text-xs text-muted-foreground">
              Percentage of requests that will attempt to use real content sources
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Crunchyroll Integration</div>
                <div className="text-sm text-muted-foreground">Use Crunchyroll as primary source</div>
              </div>
              <Switch
                checked={config.enableCrunchyroll}
                onCheckedChange={(checked) => updateConfig({ enableCrunchyroll: checked })}
                disabled={updating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Backend Integration</div>
                <div className="text-sm text-muted-foreground">Use WeAnime backend as source</div>
              </div>
              <Switch
                checked={config.enableBackend}
                onCheckedChange={(checked) => updateConfig({ enableBackend: checked })}
                disabled={updating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Real Streaming</div>
                <div className="text-sm text-muted-foreground">Enable real video streaming</div>
              </div>
              <Switch
                checked={config.enableRealStreaming}
                onCheckedChange={(checked) => updateConfig({ enableRealStreaming: checked })}
                disabled={updating}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Mock Fallback</div>
                <div className="text-sm text-muted-foreground">Fallback to mock data on failure</div>
              </div>
              <Switch
                checked={config.fallbackToMock}
                onCheckedChange={(checked) => updateConfig({ fallbackToMock: checked })}
                disabled={updating}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Source Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            Content Source Breakdown
          </CardTitle>
          <CardDescription>
            Distribution of content sources used in recent requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(stats.sourceBreakdown).map(([source, count]) => {
              const percentage = (count / stats.totalAttempts) * 100
              return (
                <div key={source} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded ${getSourceColor(source)}`} />
                      <span className="capitalize font-medium">{source}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">{count} requests</span>
                      <Badge variant="outline">{percentage.toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
