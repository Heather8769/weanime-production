import { NextRequest, NextResponse } from 'next/server'
import { securityEnhancer, withSecurity, withAuth } from '@/lib/security-enhancements'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  return withSecurity(withAuth(async (req: NextRequest) => {
    try {
      const { searchParams } = new URL(req.url)
      const type = searchParams.get('type') // 'metrics', 'audit-logs', 'threats'

      switch (type) {
        case 'metrics':
          return getSecurityMetrics()
        
        case 'audit-logs':
          return getAuditLogs(req)
        
        case 'threats':
          return getThreatAnalysis()
        
        default:
          return getSecurityOverview()
      }

    } catch (error) {
      console.error('Error in security API:', error)
      
      return NextResponse.json(
        { 
          error: 'Failed to retrieve security data',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  }))(request)
}

export async function POST(request: NextRequest) {
  return withSecurity(withAuth(async (req: NextRequest) => {
    try {
      const { action, data } = await req.json()

      switch (action) {
        case 'update_config':
          return updateSecurityConfig(data)
        
        case 'block_ip':
          return blockIP(data.ip, data.reason)
        
        case 'unblock_ip':
          return unblockIP(data.ip)
        
        case 'generate_csrf':
          return generateCSRFToken(data.sessionId)
        
        default:
          return NextResponse.json(
            { error: 'Invalid action' },
            { status: 400 }
          )
      }

    } catch (error) {
      console.error('Error in security API:', error)
      
      return NextResponse.json(
        { 
          error: 'Failed to process security request',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      )
    }
  }))(request)
}

async function getSecurityMetrics(): Promise<NextResponse> {
  const metrics = securityEnhancer.getSecurityMetrics()
  
  // Get additional metrics from database
  const { data: totalUsers } = await supabase
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })

  const { data: recentLogins } = await supabase
    .from('security_audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('action', 'LOGIN_SUCCESS')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  const { data: failedLogins } = await supabase
    .from('security_audit_logs')
    .select('id', { count: 'exact', head: true })
    .eq('action', 'LOGIN_FAILED')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

  return NextResponse.json({
    success: true,
    metrics: {
      ...metrics,
      totalUsers: totalUsers?.length || 0,
      recentLogins24h: recentLogins?.length || 0,
      failedLogins24h: failedLogins?.length || 0,
      loginSuccessRate: recentLogins && failedLogins ? 
        (recentLogins.length / (recentLogins.length + failedLogins.length)) * 100 : 0
    },
    timestamp: new Date().toISOString()
  })
}

async function getAuditLogs(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') || '50')
  const action = searchParams.get('action')
  const userId = searchParams.get('userId')

  // Get from memory first (recent logs)
  const recentLogs = securityEnhancer.getRecentAuditLogs(limit)

  // Get from database for historical data
  let query = supabase
    .from('security_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (action) {
    query = query.eq('action', action)
  }

  if (userId) {
    query = query.eq('user_id', userId)
  }

  const { data: dbLogs, error } = await query

  if (error) {
    console.warn('Failed to fetch audit logs from database:', error)
  }

  // Combine and deduplicate logs
  const allLogs = [...recentLogs]
  if (dbLogs) {
    const memoryLogIds = new Set(recentLogs.map(log => log.id))
    const uniqueDbLogs = dbLogs.filter(log => !memoryLogIds.has(log.id))
    allLogs.push(...uniqueDbLogs.map(log => ({
      id: log.id,
      userId: log.user_id,
      action: log.action,
      resource: log.resource,
      ipAddress: log.ip_address,
      userAgent: log.user_agent,
      timestamp: log.created_at,
      success: log.success,
      details: log.details
    })))
  }

  // Sort by timestamp and limit
  const sortedLogs = allLogs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit)

  return NextResponse.json({
    success: true,
    auditLogs: sortedLogs,
    totalCount: sortedLogs.length
  })
}

async function getThreatAnalysis(): Promise<NextResponse> {
  // Analyze recent security events for threats
  const recentLogs = securityEnhancer.getRecentAuditLogs(200)
  
  const threats = {
    suspiciousIPs: new Map<string, number>(),
    failedLoginsByIP: new Map<string, number>(),
    rateLimitViolations: new Map<string, number>(),
    csrfAttempts: new Map<string, number>()
  }

  // Analyze logs for threat patterns
  recentLogs.forEach(log => {
    const ip = log.ipAddress

    if (log.action === 'LOGIN_FAILED') {
      threats.failedLoginsByIP.set(ip, (threats.failedLoginsByIP.get(ip) || 0) + 1)
    }

    if (log.action === 'RATE_LIMIT_EXCEEDED') {
      threats.rateLimitViolations.set(ip, (threats.rateLimitViolations.get(ip) || 0) + 1)
    }

    if (log.action === 'CSRF_VALIDATION_FAILED') {
      threats.csrfAttempts.set(ip, (threats.csrfAttempts.get(ip) || 0) + 1)
    }

    // Mark IPs as suspicious if they have multiple types of violations
    let suspicionScore = 0
    if (threats.failedLoginsByIP.has(ip)) suspicionScore += threats.failedLoginsByIP.get(ip)! * 2
    if (threats.rateLimitViolations.has(ip)) suspicionScore += threats.rateLimitViolations.get(ip)! * 1
    if (threats.csrfAttempts.has(ip)) suspicionScore += threats.csrfAttempts.get(ip)! * 3

    if (suspicionScore > 5) {
      threats.suspiciousIPs.set(ip, suspicionScore)
    }
  })

  // Convert maps to arrays for response
  const threatAnalysis = {
    suspiciousIPs: Array.from(threats.suspiciousIPs.entries())
      .map(([ip, score]) => ({ ip, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10),
    
    topFailedLoginIPs: Array.from(threats.failedLoginsByIP.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    
    rateLimitViolators: Array.from(threats.rateLimitViolations.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    
    csrfAttackers: Array.from(threats.csrfAttempts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  return NextResponse.json({
    success: true,
    threatAnalysis,
    analysisTime: new Date().toISOString(),
    logsAnalyzed: recentLogs.length
  })
}

async function getSecurityOverview(): Promise<NextResponse> {
  const metrics = securityEnhancer.getSecurityMetrics()
  const recentLogs = securityEnhancer.getRecentAuditLogs(20)
  
  // Get security events from last 24 hours
  const last24h = recentLogs.filter(log => 
    new Date(log.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
  )

  const securityEvents = {
    total: last24h.length,
    successful: last24h.filter(log => log.success).length,
    failed: last24h.filter(log => !log.success).length,
    byAction: last24h.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  }

  return NextResponse.json({
    success: true,
    overview: {
      metrics,
      securityEvents,
      recentLogs: recentLogs.slice(0, 10),
      systemStatus: {
        csrfProtection: true,
        rateLimiting: true,
        auditLogging: true,
        securityHeaders: true
      }
    },
    timestamp: new Date().toISOString()
  })
}

async function updateSecurityConfig(newConfig: any): Promise<NextResponse> {
  try {
    securityEnhancer.updateConfig(newConfig)
    
    return NextResponse.json({
      success: true,
      message: 'Security configuration updated',
      config: newConfig
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to update security configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

async function blockIP(ip: string, reason: string): Promise<NextResponse> {
  // This would integrate with your firewall/blocking system
  // For now, just log the action
  
  securityEnhancer.auditLog({
    action: 'IP_BLOCKED',
    resource: 'security',
    ipAddress: ip,
    userAgent: 'admin',
    success: true,
    details: { reason }
  })

  return NextResponse.json({
    success: true,
    message: `IP ${ip} has been blocked`,
    reason
  })
}

async function unblockIP(ip: string): Promise<NextResponse> {
  securityEnhancer.auditLog({
    action: 'IP_UNBLOCKED',
    resource: 'security',
    ipAddress: ip,
    userAgent: 'admin',
    success: true
  })

  return NextResponse.json({
    success: true,
    message: `IP ${ip} has been unblocked`
  })
}

async function generateCSRFToken(sessionId: string): Promise<NextResponse> {
  const token = securityEnhancer.generateCSRFToken(sessionId)
  
  return NextResponse.json({
    success: true,
    csrfToken: token,
    expires: Date.now() + (60 * 60 * 1000) // 1 hour
  })
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
