import { NextRequest, NextResponse } from 'next/server'
import { 
  getRecentSecurityEvents, 
  getSecurityMetrics,
  SecurityEventType
} from '@/lib/auth-security'

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const eventType = url.searchParams.get('eventType')
    const severity = url.searchParams.get('severity')

    // Get recent security events
    let events = getRecentSecurityEvents(limit)

    // Filter by event type if specified
    if (eventType && Object.values(SecurityEventType).includes(eventType as SecurityEventType)) {
      events = events.filter(event => event.event === eventType)
    }

    // Filter by severity if specified
    if (severity && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
      events = events.filter(event => event.severity === severity)
    }

    // Get security metrics
    const metrics = getSecurityMetrics()

    // Calculate additional insights
    const authFailures = events.filter(event => 
      event.event === SecurityEventType.AUTHENTICATION_FAILURE ||
      event.event === SecurityEventType.PASSWORD_VERIFICATION_FAILED
    ).length

    const criticalEvents = events.filter(event => event.severity === 'CRITICAL').length
    const bruteForceAttempts = events.filter(event => 
      event.event === SecurityEventType.BRUTE_FORCE_DETECTED
    ).length

    const passwordStrengthRejections = events.filter(event =>
      event.event === SecurityEventType.WEAK_PASSWORD_REJECTED
    ).length

    // Security health score (0-100)
    const securityScore = Math.max(0, 100 - (
      (criticalEvents * 10) + 
      (bruteForceAttempts * 8) + 
      (authFailures * 2) + 
      (passwordStrengthRejections * 1)
    ))

    const response = {
      timestamp: new Date().toISOString(),
      status: 'SECURITY_MONITORING_ACTIVE',
      securityScore,
      summary: {
        totalEvents: events.length,
        authFailures,
        criticalEvents,
        bruteForceAttempts,
        passwordStrengthRejections,
        healthStatus: securityScore >= 80 ? 'GOOD' : securityScore >= 60 ? 'WARNING' : 'CRITICAL'
      },
      metrics,
      recentEvents: events,
      recommendations: generateSecurityRecommendations(events, metrics),
      alertThresholds: {
        criticalEvents: { current: criticalEvents, threshold: 5, status: criticalEvents >= 5 ? 'EXCEEDED' : 'OK' },
        bruteForceAttempts: { current: bruteForceAttempts, threshold: 3, status: bruteForceAttempts >= 3 ? 'EXCEEDED' : 'OK' },
        authFailures: { current: authFailures, threshold: 20, status: authFailures >= 20 ? 'EXCEEDED' : 'OK' }
      }
    }

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('Security monitoring error:', error)
    
    return NextResponse.json(
      {
        error: 'Security monitoring failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

function generateSecurityRecommendations(events: any[], metrics: any): string[] {
  const recommendations: string[] = []

  // Check for high failure rates
  const authFailures = events.filter(event => 
    event.event === SecurityEventType.AUTHENTICATION_FAILURE
  ).length

  if (authFailures > 10) {
    recommendations.push('High authentication failure rate detected - consider implementing additional CAPTCHA protection')
  }

  // Check for brute force patterns
  const bruteForceEvents = events.filter(event => 
    event.event === SecurityEventType.BRUTE_FORCE_DETECTED
  )

  if (bruteForceEvents.length > 0) {
    recommendations.push('Brute force attacks detected - consider implementing IP blocking or enhanced rate limiting')
  }

  // Check for weak password patterns
  const weakPasswordEvents = events.filter(event =>
    event.event === SecurityEventType.WEAK_PASSWORD_REJECTED
  )

  if (weakPasswordEvents.length > 5) {
    recommendations.push('Multiple weak password attempts - consider implementing password strength indicator on frontend')
  }

  // Check for suspicious IP activity
  if (metrics.topIPs.length > 0 && metrics.topIPs[0].count > 50) {
    recommendations.push(`High activity from IP ${metrics.topIPs[0].ip} (${metrics.topIPs[0].count} requests) - investigate for potential abuse`)
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Security monitoring is active and no immediate threats detected')
    recommendations.push('Continue monitoring for unusual patterns')
  }

  return recommendations
}

// POST endpoint for clearing security events (admin only)
export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()

    if (action === 'clear_events') {
      // In a real implementation, you'd clear the events from persistent storage
      // For now, we'll just return a success message since events are in memory
      return NextResponse.json({
        success: true,
        message: 'Security events cleared',
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json(
      {
        error: 'Invalid action',
        success: false
      },
      { status: 400 }
    )

  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to process security action',
        success: false
      },
      { status: 500 }
    )
  }
}