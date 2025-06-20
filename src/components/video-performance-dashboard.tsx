'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Activity, 
  Clock, 
  Wifi, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Monitor,
  Zap
} from 'lucide-react'

interface PerformanceStats {
  averageStartupTime: number
  averageBufferHealth: number
  totalRebufferingEvents: number
  averageDroppedFrames: number
  qualityDistribution: Record<string, number>
  averageBandwidth: number
  completionRate: number
  errorRate: number
  totalSessions: number
  performanceScore: number
}

interface PerformanceData {
  success: boolean
  data: any[]
  stats: PerformanceStats
  totalRecords: number
  timeframe: string
  generatedAt: string
}

export function VideoPerformanceDashboard() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState('24h')
  const [error, setError] = useState<string | null>(null)

  const fetchPerformanceData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/video-performance?timeframe=${timeframe}&limit=100`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch performance data: ${response.statusText}`)
      }
      
      const data = await response.json()
      setPerformanceData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      console.error('Error fetching performance data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPerformanceData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPerformanceData, 30000)
    return () => clearInterval(interval)
  }, [timeframe])

  const getPerformanceColor = (score: number) => {
    if (score >= 90) return 'text-green-500'
    if (score >= 70) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">Excellent</Badge>
    if (score >= 70) return <Badge className="bg-yellow-500">Good</Badge>
    return <Badge className="bg-red-500">Needs Improvement</Badge>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading performance data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Error Loading Performance Data</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchPerformanceData}>Retry</Button>
      </div>
    )
  }

  if (!performanceData) {
    return (
      <div className="p-8 text-center">
        <Monitor className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Performance Data</h3>
        <p className="text-muted-foreground">No video performance metrics available yet.</p>
      </div>
    )
  }

  const { stats } = performanceData

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Video Performance Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time monitoring of video streaming performance
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
          <Button onClick={fetchPerformanceData} size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Performance Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Overall Performance Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className={`text-4xl font-bold ${getPerformanceColor(stats.performanceScore)}`}>
                {stats.performanceScore}/100
              </div>
              <p className="text-muted-foreground">Based on {stats.totalSessions} sessions</p>
            </div>
            <div>
              {getPerformanceBadge(stats.performanceScore)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Startup Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageStartupTime}ms
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.averageStartupTime < 2000 ? 'Excellent' : 
               stats.averageStartupTime < 4000 ? 'Good' : 'Slow'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Buffer Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageBufferHealth}s
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.averageBufferHealth > 10 ? 'Excellent' : 
               stats.averageBufferHealth > 5 ? 'Good' : 'Low'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Wifi className="h-4 w-4 mr-2" />
              Bandwidth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageBandwidth} Mbps
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.averageBandwidth > 10 ? 'High Speed' : 
               stats.averageBandwidth > 5 ? 'Medium Speed' : 'Low Speed'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Zap className="h-4 w-4 mr-2" />
              Rebuffering
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalRebufferingEvents}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalRebufferingEvents === 0 ? 'Perfect' : 
               stats.totalRebufferingEvents < 5 ? 'Good' : 'High'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quality Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Video Quality Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(stats.qualityDistribution).map(([quality, count]) => {
              const percentage = (count / stats.totalSessions) * 100
              return (
                <div key={quality} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{quality}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.completionRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Episodes watched to completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.errorRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Sessions with errors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dropped Frames</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.averageDroppedFrames}
            </div>
            <p className="text-xs text-muted-foreground">
              Average per session
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Last Updated */}
      <div className="text-center text-sm text-muted-foreground">
        Last updated: {new Date(performanceData.generatedAt).toLocaleString()}
      </div>
    </div>
  )
}
