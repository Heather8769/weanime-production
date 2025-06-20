'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  Lock,
  Users,
  Activity,
  Ban,
  RefreshCw,
  TrendingUp,
  Clock
} from 'lucide-react'

interface SecurityMetrics {
  rateLimitEntries: number
  csrfTokens: number
  loginAttempts: number
  auditLogs: number
  blockedIPs: number
  totalUsers: number
  recentLogins24h: number
  failedLogins24h: number
  loginSuccessRate: number
}

interface AuditLog {
  id: string
  userId?: string
  action: string
  resource: string
  ipAddress: string
  userAgent: string
  timestamp: string
  success: boolean
  details?: any
}

interface ThreatAnalysis {
  suspiciousIPs: Array<{ ip: string; score: number }>
  topFailedLoginIPs: Array<{ ip: string; count: number }>
  rateLimitViolators: Array<{ ip: string; count: number }>
  csrfAttackers: Array<{ ip: string; count: number }>
}

export function SecurityDashboard() {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [threatAnalysis, setThreatAnalysis] = useState<ThreatAnalysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadSecurityData()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSecurityData, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadSecurityData = async () => {
    try {
      setRefreshing(true)

      // Load metrics
      const metricsResponse = await fetch('/api/security?type=metrics', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData.metrics)
      }

      // Load audit logs
      const logsResponse = await fetch('/api/security?type=audit-logs&limit=50', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      if (logsResponse.ok) {
        const logsData = await logsResponse.json()
        setAuditLogs(logsData.auditLogs || [])
      }

      // Load threat analysis
      const threatsResponse = await fetch('/api/security?type=threats', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` }
      })
      if (threatsResponse.ok) {
        const threatsData = await threatsResponse.json()
        setThreatAnalysis(threatsData.threatAnalysis)
      }

    } catch (error) {
      console.error('Failed to load security data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const blockIP = async (ip: string, reason: string) => {
    try {
      const response = await fetch('/api/security', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          action: 'block_ip',
          data: { ip, reason }
        })
      })

      if (response.ok) {
        loadSecurityData() // Refresh data
      }
    } catch (error) {
      console.error('Failed to block IP:', error)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'LOGIN_FAILED': return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'RATE_LIMIT_EXCEEDED': return <Ban className="h-4 w-4 text-orange-500" />
      case 'CSRF_VALIDATION_FAILED': return <Shield className="h-4 w-4 text-red-500" />
      case 'IP_BLOCKED': return <Ban className="h-4 w-4 text-red-600" />
      default: return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'LOGIN_SUCCESS': return 'text-green-600'
      case 'LOGIN_FAILED': return 'text-red-600'
      case 'RATE_LIMIT_EXCEEDED': return 'text-orange-600'
      case 'CSRF_VALIDATION_FAILED': return 'text-red-600'
      case 'IP_BLOCKED': return 'text-red-700'
      default: return 'text-blue-600'
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
        <span className="ml-2">Loading security data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Shield className="h-6 w-6 mr-2" />
            Security Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor security events and system protection
          </p>
        </div>
        <Button onClick={loadSecurityData} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Security Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Users className="h-4 w-4 mr-2 text-blue-500" />
                Active Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.recentLogins24h} logins today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
                Login Success Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.loginSuccessRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.failedLogins24h} failed attempts
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Ban className="h-4 w-4 mr-2 text-red-500" />
                Blocked IPs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.blockedIPs}</div>
              <p className="text-xs text-muted-foreground">
                Rate limited or blocked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center">
                <Activity className="h-4 w-4 mr-2 text-purple-500" />
                Security Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.auditLogs}</div>
              <p className="text-xs text-muted-foreground">
                Recent audit logs
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="events" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="events">Security Events</TabsTrigger>
          <TabsTrigger value="threats">Threat Analysis</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Security Events</h3>
          
          {auditLogs.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No security events recorded
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <Card key={log.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getActionIcon(log.action)}
                        <div>
                          <div className={`font-medium ${getActionColor(log.action)}`}>
                            {log.action.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.resource} • {log.ipAddress}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground">
                          {formatTimeAgo(log.timestamp)}
                        </div>
                        <Badge variant={log.success ? 'default' : 'destructive'}>
                          {log.success ? 'Success' : 'Failed'}
                        </Badge>
                      </div>
                    </div>
                    {log.details && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {JSON.stringify(log.details)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="threats" className="space-y-6">
          {threatAnalysis ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
                    Suspicious IPs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {threatAnalysis.suspiciousIPs.length === 0 ? (
                    <p className="text-muted-foreground">No suspicious activity detected</p>
                  ) : (
                    <div className="space-y-2">
                      {threatAnalysis.suspiciousIPs.map((threat) => (
                        <div key={threat.ip} className="flex items-center justify-between p-2 bg-red-50 rounded">
                          <span className="font-mono text-sm">{threat.ip}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="destructive">Score: {threat.score}</Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => blockIP(threat.ip, 'Suspicious activity detected')}
                            >
                              Block
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="h-5 w-5 mr-2 text-orange-500" />
                    Failed Login Attempts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {threatAnalysis.topFailedLoginIPs.length === 0 ? (
                    <p className="text-muted-foreground">No failed login attempts</p>
                  ) : (
                    <div className="space-y-2">
                      {threatAnalysis.topFailedLoginIPs.map((attempt) => (
                        <div key={attempt.ip} className="flex items-center justify-between p-2 bg-orange-50 rounded">
                          <span className="font-mono text-sm">{attempt.ip}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">{attempt.count} attempts</Badge>
                            {attempt.count > 10 && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => blockIP(attempt.ip, 'Excessive failed login attempts')}
                              >
                                Block
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Ban className="h-5 w-5 mr-2 text-yellow-500" />
                    Rate Limit Violations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {threatAnalysis.rateLimitViolators.length === 0 ? (
                    <p className="text-muted-foreground">No rate limit violations</p>
                  ) : (
                    <div className="space-y-2">
                      {threatAnalysis.rateLimitViolators.map((violator) => (
                        <div key={violator.ip} className="flex items-center justify-between p-2 bg-yellow-50 rounded">
                          <span className="font-mono text-sm">{violator.ip}</span>
                          <Badge variant="secondary">{violator.count} violations</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-purple-500" />
                    CSRF Attacks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {threatAnalysis.csrfAttackers.length === 0 ? (
                    <p className="text-muted-foreground">No CSRF attacks detected</p>
                  ) : (
                    <div className="space-y-2">
                      {threatAnalysis.csrfAttackers.map((attacker) => (
                        <div key={attacker.ip} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                          <span className="font-mono text-sm">{attacker.ip}</span>
                          <div className="flex items-center space-x-2">
                            <Badge variant="destructive">{attacker.count} attempts</Badge>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => blockIP(attacker.ip, 'CSRF attack attempts')}
                            >
                              Block
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                Loading threat analysis...
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Configuration</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">CSRF Protection</span>
                    <Badge className="bg-green-500">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Rate Limiting</span>
                    <Badge className="bg-green-500">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Audit Logging</span>
                    <Badge className="bg-green-500">Enabled</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Security Headers</span>
                    <Badge className="bg-green-500">Enabled</Badge>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Session Timeout</span>
                    <span className="text-sm text-muted-foreground">24 hours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Max Login Attempts</span>
                    <span className="text-sm text-muted-foreground">5 per 15 min</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Password Min Length</span>
                    <span className="text-sm text-muted-foreground">8 characters</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Rate Limit</span>
                    <span className="text-sm text-muted-foreground">60 req/min</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
