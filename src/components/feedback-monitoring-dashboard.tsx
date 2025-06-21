'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageSquare, 
  AlertTriangle, 
  TrendingUp, 
  Clock,
  CheckCircle,
  Bug,
  Star,
  Users,
  RefreshCw,
  Bell,
  BarChart3,
  Settings,
  Download,
  Zap
} from 'lucide-react'

interface FeedbackAnalytics {
  totalFeedback: number
  newToday: number
  newThisWeek: number
  averageResponseTime: number
  resolutionRate: number
  satisfactionScore: number
  byType: Record<string, number>
  byPriority: Record<string, number>
  byStatus: Record<string, number>
  trends: {
    daily: Array<{ date: string; count: number }>
    weekly: Array<{ week: string; count: number }>
    monthly: Array<{ month: string; count: number }>
  }
  topIssues: Array<{
    title: string
    count: number
    category: string
  }>
  userSentiment: {
    positive: number
    neutral: number
    negative: number
  }
}

interface FeedbackAlert {
  id: string
  type: 'critical_bug' | 'high_volume' | 'negative_sentiment' | 'escalation_needed'
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  feedbackIds: string[]
  createdAt: string
  acknowledged: boolean
}

interface AutoResponse {
  id: string
  trigger: 'keyword' | 'category' | 'sentiment' | 'priority'
  condition: string
  response: string
  actions: Array<'assign' | 'tag' | 'escalate' | 'notify'>
  enabled: boolean
}

export function FeedbackMonitoringDashboard() {
  const [analytics, setAnalytics] = useState<FeedbackAnalytics | null>(null)
  const [alerts, setAlerts] = useState<FeedbackAlert[]>([])
  const [autoResponses, setAutoResponses] = useState<AutoResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadDashboardData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadDashboardData = async () => {
    try {
      setRefreshing(true)

      // Load analytics
      const analyticsResponse = await fetch('/api/feedback-monitoring?type=analytics')
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json()
        setAnalytics(analyticsData.analytics)
      }

      // Load alerts
      const alertsResponse = await fetch('/api/feedback-monitoring?type=alerts')
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        setAlerts(alertsData.activeAlerts || [])
      }

      // Load auto-responses
      const autoResponsesResponse = await fetch('/api/feedback-monitoring?type=auto-responses')
      if (autoResponsesResponse.ok) {
        const autoResponsesData = await autoResponsesResponse.json()
        setAutoResponses(autoResponsesData.autoResponses || [])
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/feedback-monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'acknowledge_alert',
          data: { alertId }
        })
      })

      if (response.ok) {
        setAlerts(prev => prev.filter(alert => alert.id !== alertId))
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
    }
  }

  const exportData = async () => {
    try {
      const response = await fetch('/api/feedback-monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export_data',
          data: { filters: {} }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `feedback-export-${new Date().toISOString().split('T')[0]}.json`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export data:', error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      default: return 'bg-gray-500'
    }
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'critical_bug': return <Bug className="h-4 w-4" />
      case 'high_volume': return <TrendingUp className="h-4 w-4" />
      case 'negative_sentiment': return <AlertTriangle className="h-4 w-4" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMinutes / 60)

    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMinutes > 0) return `${diffMinutes}m ago`
    return 'Just now'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <span className="ml-2">Loading feedback monitoring...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <MessageSquare className="h-6 w-6 mr-2" />
            Feedback Monitoring
          </h2>
          <p className="text-muted-foreground">
            Real-time monitoring and analysis of user feedback and bug reports
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={exportData} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadDashboardData} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Active Alerts ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 bg-white rounded border">
                  <div className="flex items-center space-x-3">
                    {getAlertIcon(alert.type)}
                    <div>
                      <div className="font-medium">{alert.title}</div>
                      <div className="text-sm text-muted-foreground">{alert.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={`${getSeverityColor(alert.severity)} text-white`}>
                      {alert.severity}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(alert.createdAt)}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-blue-500" />
                Total Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalFeedback}</div>
              <p className="text-xs text-muted-foreground">
                +{analytics.newToday} today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Clock className="h-4 w-4 mr-2 text-orange-500" />
                Avg Response Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.averageResponseTime.toFixed(1)}h
              </div>
              <p className="text-xs text-muted-foreground">
                Average resolution time
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                Resolution Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.resolutionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Issues resolved
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Star className="h-4 w-4 mr-2 text-yellow-500" />
                Satisfaction Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.satisfactionScore.toFixed(1)}/5
              </div>
              <p className="text-xs text-muted-foreground">
                User satisfaction
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="analytics" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Feedback by Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics.byType).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{type}</span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics.byPriority).map(([priority, count]) => (
                      <div key={priority} className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{priority}</span>
                        <Badge className={getSeverityColor(priority)}>{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Status Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(analytics.byStatus).map(([status, count]) => (
                      <div key={status} className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">{status.replace('-', ' ')}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle>Top Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  {analytics.topIssues.length === 0 ? (
                    <p className="text-muted-foreground">No common issues identified</p>
                  ) : (
                    <div className="space-y-2">
                      {analytics.topIssues.map((issue, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <div className="font-medium">{issue.title}</div>
                            <div className="text-sm text-muted-foreground">{issue.category}</div>
                          </div>
                          <Badge variant="destructive">{issue.count} reports</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Sentiment</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-green-600">Positive</span>
                      <span className="text-sm">{analytics.userSentiment.positive.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">Neutral</span>
                      <span className="text-sm">{analytics.userSentiment.neutral.toFixed(1)}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-red-600">Negative</span>
                      <span className="text-sm">{analytics.userSentiment.negative.toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Feedback Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              {analytics?.trends ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Daily Trends (Last 7 Days)</h4>
                    <div className="grid grid-cols-7 gap-2">
                      {analytics.trends.daily.map((day, index) => (
                        <div key={index} className="text-center">
                          <div className="text-xs text-muted-foreground">{day.date.split('-')[2]}</div>
                          <div className="text-sm font-medium">{day.count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Loading trend analytics...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automation" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="h-5 w-5 mr-2" />
                Auto-Response Rules
              </CardTitle>
            </CardHeader>
            <CardContent>
              {autoResponses.length === 0 ? (
                <p className="text-muted-foreground">No auto-response rules configured</p>
              ) : (
                <div className="space-y-3">
                  {autoResponses.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{rule.trigger}: {rule.condition}</div>
                        <div className="text-sm text-muted-foreground">{rule.response}</div>
                      </div>
                      <Badge variant={rule.enabled ? 'default' : 'secondary'}>
                        {rule.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Key Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics && (
                    <>
                      <div className="p-3 bg-blue-50 rounded">
                        <div className="font-medium text-blue-700">Volume Trend</div>
                        <div className="text-sm text-blue-600">
                          {analytics.newThisWeek > analytics.newToday * 7 
                            ? 'Feedback volume is increasing this week'
                            : 'Feedback volume is stable'
                          }
                        </div>
                      </div>
                      
                      <div className="p-3 bg-green-50 rounded">
                        <div className="font-medium text-green-700">Response Performance</div>
                        <div className="text-sm text-green-600">
                          {analytics.averageResponseTime < 24 
                            ? 'Response times are excellent (< 24h)'
                            : 'Response times need improvement'
                          }
                        </div>
                      </div>
                      
                      <div className="p-3 bg-yellow-50 rounded">
                        <div className="font-medium text-yellow-700">User Satisfaction</div>
                        <div className="text-sm text-yellow-600">
                          {analytics.satisfactionScore >= 4 
                            ? 'Users are highly satisfied'
                            : analytics.satisfactionScore >= 3
                            ? 'User satisfaction is moderate'
                            : 'User satisfaction needs attention'
                          }
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
                    <div className="font-medium">Improve Response Times</div>
                    <div className="text-sm text-muted-foreground">
                      Set up more auto-response rules for common issues
                    </div>
                  </div>
                  
                  <div className="p-3 border-l-4 border-green-500 bg-green-50">
                    <div className="font-medium">Monitor Critical Issues</div>
                    <div className="text-sm text-muted-foreground">
                      Enable real-time alerts for critical bug reports
                    </div>
                  </div>
                  
                  <div className="p-3 border-l-4 border-purple-500 bg-purple-50">
                    <div className="font-medium">Analyze Patterns</div>
                    <div className="text-sm text-muted-foreground">
                      Review top issues to identify systemic problems
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
