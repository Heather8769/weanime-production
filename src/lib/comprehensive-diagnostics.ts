/**
 * Comprehensive Project Diagnostics System
 * Automatically detects, collects, and reports all project issues
 */

export interface DiagnosticResult {
  category: 'critical' | 'warning' | 'info' | 'success'
  component: string
  issue: string
  description: string
  fix?: string
  autoFixAvailable: boolean
  priority: number
  timestamp: string
}

export interface SystemHealth {
  overallScore: number
  categories: {
    api: number
    database: number
    authentication: number
    frontend: number
    performance: number
    security: number
  }
  issues: DiagnosticResult[]
  recommendations: string[]
}

export class ComprehensiveDiagnostics {
  private errors: any[] = []
  private performanceMetrics: any[] = []
  private healthChecks: Map<string, boolean> = new Map()

  constructor() {
    this.initializeErrorCollection()
    this.initializePerformanceMonitoring()
  }

  /**
   * Initialize automatic error collection
   */
  private initializeErrorCollection() {
    if (typeof window === 'undefined') return

    // Capture JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href
      })
    })

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        type: 'unhandled_promise_rejection',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: new Date().toISOString(),
        url: window.location.href
      })
    })

    // Capture network errors
    this.interceptFetch()
  }

  /**
   * Intercept fetch requests to monitor API failures
   */
  private interceptFetch() {
    const originalFetch = window.fetch
    window.fetch = async (...args) => {
      const startTime = performance.now()
      try {
        const response = await originalFetch(...args)
        const endTime = performance.now()
        
        // Log slow requests
        if (endTime - startTime > 3000) {
          this.logError({
            type: 'slow_api_request',
            message: `Slow API request: ${args[0]}`,
            duration: endTime - startTime,
            url: args[0],
            timestamp: new Date().toISOString()
          })
        }

        // Log failed requests
        if (!response.ok) {
          this.logError({
            type: 'api_error',
            message: `API request failed: ${response.status} ${response.statusText}`,
            url: args[0],
            status: response.status,
            statusText: response.statusText,
            timestamp: new Date().toISOString()
          })
        }

        return response
      } catch (error) {
        this.logError({
          type: 'network_error',
          message: `Network error: ${error instanceof Error ? error.message : String(error)}`,
          url: args[0],
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        })
        throw error
      }
    }
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring() {
    if (typeof window === 'undefined') return

    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordPerformanceMetric(entry)
        }
      })

      try {
        observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
      } catch (e) {
        console.warn('Performance observer not supported:', e)
      }
    }
  }

  /**
   * Log error to collection system
   */
  private logError(error: any) {
    this.errors.push(error)
    
    // Send to monitoring API (non-blocking)
    this.sendToMonitoring(error).catch(console.warn)
    
    // Keep only last 100 errors in memory
    if (this.errors.length > 100) {
      this.errors = this.errors.slice(-100)
    }
  }

  /**
   * Record performance metric
   */
  private recordPerformanceMetric(entry: PerformanceEntry) {
    this.performanceMetrics.push({
      name: entry.name,
      entryType: entry.entryType,
      startTime: entry.startTime,
      duration: entry.duration,
      timestamp: new Date().toISOString()
    })

    // Keep only last 50 metrics in memory
    if (this.performanceMetrics.length > 50) {
      this.performanceMetrics = this.performanceMetrics.slice(-50)
    }
  }

  /**
   * Send error to monitoring API
   */
  private async sendToMonitoring(error: any) {
    if (typeof window === 'undefined') return

    try {
      await fetch('/api/monitoring/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(error)
      })
    } catch (e) {
      // Silently fail to prevent infinite loops
    }
  }

  /**
   * Run comprehensive system health check
   */
  async runHealthCheck(): Promise<SystemHealth> {
    const issues: DiagnosticResult[] = []
    
    // Check API endpoints
    const apiHealth = await this.checkAPIHealth()
    issues.push(...apiHealth.issues)

    // Check database connectivity
    const dbHealth = await this.checkDatabaseHealth()
    issues.push(...dbHealth.issues)

    // Check authentication system
    const authHealth = await this.checkAuthenticationHealth()
    issues.push(...authHealth.issues)

    // Check frontend components
    const frontendHealth = await this.checkFrontendHealth()
    issues.push(...frontendHealth.issues)

    // Check performance
    const performanceHealth = await this.checkPerformanceHealth()
    issues.push(...performanceHealth.issues)

    // Check security
    const securityHealth = await this.checkSecurityHealth()
    issues.push(...securityHealth.issues)

    // Calculate overall health score
    const categories = {
      api: apiHealth.score,
      database: dbHealth.score,
      authentication: authHealth.score,
      frontend: frontendHealth.score,
      performance: performanceHealth.score,
      security: securityHealth.score
    }

    const overallScore = Math.round(
      Object.values(categories).reduce((sum, score) => sum + score, 0) / Object.keys(categories).length
    )

    return {
      overallScore,
      categories,
      issues: issues.sort((a, b) => b.priority - a.priority),
      recommendations: this.generateRecommendations(issues)
    }
  }

  /**
   * Check API endpoints health
   */
  private async checkAPIHealth() {
    const issues: DiagnosticResult[] = []
    let workingEndpoints = 0
    const totalEndpoints = 6

    const endpoints = [
      { path: '/api/anilist', method: 'GET' },
      { path: '/api/auth/session', method: 'GET' },
      { path: '/api/monitoring/error', method: 'GET' },
      { path: '/api/errors', method: 'GET' },
      { path: '/api/health', method: 'GET' },
      { path: '/api/streaming/test', method: 'GET' }
    ]

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.path, { method: endpoint.method })
        if (response.ok) {
          workingEndpoints++
        } else {
          issues.push({
            category: 'critical',
            component: 'API',
            issue: `${endpoint.path} returning ${response.status}`,
            description: `API endpoint ${endpoint.path} is not responding correctly`,
            autoFixAvailable: true,
            priority: 9,
            timestamp: new Date().toISOString(),
            fix: `Check and fix the ${endpoint.path} route implementation`
          })
        }
      } catch (error) {
        issues.push({
          category: 'critical',
          component: 'API',
          issue: `${endpoint.path} unreachable`,
          description: `API endpoint ${endpoint.path} is completely unreachable`,
          autoFixAvailable: true,
          priority: 10,
          timestamp: new Date().toISOString(),
          fix: `Create missing ${endpoint.path} route`
        })
      }
    }

    return {
      score: Math.round((workingEndpoints / totalEndpoints) * 100),
      issues
    }
  }

  /**
   * Check database connectivity and health
   */
  private async checkDatabaseHealth() {
    const issues: DiagnosticResult[] = []
    let score = 100

    try {
      // Test Supabase connection
      const response = await fetch('/api/health/database')
      if (!response.ok) {
        issues.push({
          category: 'critical',
          component: 'Database',
          issue: 'Database connection failed',
          description: 'Cannot connect to Supabase database',
          autoFixAvailable: true,
          priority: 10,
          timestamp: new Date().toISOString(),
          fix: 'Check Supabase configuration and credentials'
        })
        score = 0
      }
    } catch (error) {
      issues.push({
        category: 'critical',
        component: 'Database',
        issue: 'Database health check failed',
        description: 'Database health endpoint is not responding',
        autoFixAvailable: true,
        priority: 10,
        timestamp: new Date().toISOString(),
        fix: 'Create /api/health/database endpoint'
      })
      score = 0
    }

    return { score, issues }
  }

  /**
   * Check authentication system health
   */
  private async checkAuthenticationHealth() {
    const issues: DiagnosticResult[] = []
    let score = 100

    // Check if Supabase auth is configured
    if (typeof window !== 'undefined') {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      if (!supabaseUrl || supabaseUrl.includes('placeholder')) {
        issues.push({
          category: 'critical',
          component: 'Authentication',
          issue: 'Supabase URL not configured',
          description: 'NEXT_PUBLIC_SUPABASE_URL is missing or using placeholder',
          autoFixAvailable: false,
          priority: 10,
          timestamp: new Date().toISOString(),
          fix: 'Set proper NEXT_PUBLIC_SUPABASE_URL in environment variables'
        })
        score -= 50
      }

      if (!supabaseKey || supabaseKey.includes('placeholder')) {
        issues.push({
          category: 'critical',
          component: 'Authentication',
          issue: 'Supabase anon key not configured',
          description: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is missing or using placeholder',
          autoFixAvailable: false,
          priority: 10,
          timestamp: new Date().toISOString(),
          fix: 'Set proper NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables'
        })
        score -= 50
      }
    }

    return { score: Math.max(0, score), issues }
  }

  /**
   * Check frontend components health
   */
  private async checkFrontendHealth() {
    const issues: DiagnosticResult[] = []
    let score = 100

    // Check for React errors in current session
    if (this.errors.filter(e => e.type === 'javascript_error').length > 0) {
      issues.push({
        category: 'warning',
        component: 'Frontend',
        issue: 'JavaScript errors detected',
        description: `${this.errors.filter(e => e.type === 'javascript_error').length} JavaScript errors found`,
        autoFixAvailable: false,
        priority: 7,
        timestamp: new Date().toISOString(),
        fix: 'Review and fix JavaScript errors in browser console'
      })
      score -= 20
    }

    // Check for infinite loops (excessive re-renders)
    const recentErrors = this.errors.filter(e =>
      Date.now() - new Date(e.timestamp).getTime() < 60000 // Last minute
    )
    if (recentErrors.length > 10) {
      issues.push({
        category: 'critical',
        component: 'Frontend',
        issue: 'Potential infinite loop detected',
        description: `${recentErrors.length} errors in the last minute`,
        autoFixAvailable: true,
        priority: 9,
        timestamp: new Date().toISOString(),
        fix: 'Check for infinite re-renders in React components'
      })
      score -= 40
    }

    return { score: Math.max(0, score), issues }
  }

  /**
   * Check performance health
   */
  private async checkPerformanceHealth() {
    const issues: DiagnosticResult[] = []
    let score = 100

    // Check for slow API requests
    const slowRequests = this.errors.filter(e => e.type === 'slow_api_request')
    if (slowRequests.length > 0) {
      issues.push({
        category: 'warning',
        component: 'Performance',
        issue: 'Slow API requests detected',
        description: `${slowRequests.length} API requests taking >3 seconds`,
        autoFixAvailable: true,
        priority: 6,
        timestamp: new Date().toISOString(),
        fix: 'Optimize slow API endpoints and add caching'
      })
      score -= 15
    }

    // Check Core Web Vitals
    const lcpMetrics = this.performanceMetrics.filter(m => m.entryType === 'largest-contentful-paint')
    if (lcpMetrics.length > 0) {
      const avgLCP = lcpMetrics.reduce((sum, m) => sum + m.startTime, 0) / lcpMetrics.length
      if (avgLCP > 2500) {
        issues.push({
          category: 'warning',
          component: 'Performance',
          issue: 'Poor Largest Contentful Paint',
          description: `Average LCP: ${Math.round(avgLCP)}ms (should be <2500ms)`,
          autoFixAvailable: true,
          priority: 5,
          timestamp: new Date().toISOString(),
          fix: 'Optimize images and critical rendering path'
        })
        score -= 10
      }
    }

    return { score: Math.max(0, score), issues }
  }

  /**
   * Check security health
   */
  private async checkSecurityHealth() {
    const issues: DiagnosticResult[] = []
    let score = 100

    // Check for HTTPS
    if (typeof window !== 'undefined' && window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
      issues.push({
        category: 'critical',
        component: 'Security',
        issue: 'Site not served over HTTPS',
        description: 'Website should use HTTPS in production',
        autoFixAvailable: true,
        priority: 8,
        timestamp: new Date().toISOString(),
        fix: 'Configure HTTPS/SSL certificate'
      })
      score -= 30
    }

    // Check for exposed sensitive data
    if (typeof window !== 'undefined') {
      const scripts = Array.from(document.scripts)
      const hasExposedSecrets = scripts.some(script =>
        script.textContent?.includes('service_role') ||
        script.textContent?.includes('secret_key')
      )

      if (hasExposedSecrets) {
        issues.push({
          category: 'critical',
          component: 'Security',
          issue: 'Potential secret exposure',
          description: 'Sensitive keys may be exposed in client-side code',
          autoFixAvailable: true,
          priority: 10,
          timestamp: new Date().toISOString(),
          fix: 'Move sensitive keys to server-side environment variables'
        })
        score -= 50
      }
    }

    return { score: Math.max(0, score), issues }
  }

  /**
   * Generate recommendations based on issues
   */
  private generateRecommendations(issues: DiagnosticResult[]): string[] {
    const recommendations: string[] = []

    const criticalIssues = issues.filter(i => i.category === 'critical')
    const warningIssues = issues.filter(i => i.category === 'warning')

    if (criticalIssues.length > 0) {
      recommendations.push(`🚨 Address ${criticalIssues.length} critical issues immediately`)
    }

    if (warningIssues.length > 0) {
      recommendations.push(`⚠️ Review ${warningIssues.length} warning issues`)
    }

    const autoFixableIssues = issues.filter(i => i.autoFixAvailable)
    if (autoFixableIssues.length > 0) {
      recommendations.push(`🔧 ${autoFixableIssues.length} issues can be auto-fixed`)
    }

    if (issues.length === 0) {
      recommendations.push('✅ System is healthy - no issues detected')
    }

    return recommendations
  }

  /**
   * Get collected errors
   */
  getErrors() {
    return this.errors
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics() {
    return this.performanceMetrics
  }

  /**
   * Clear collected data
   */
  clearData() {
    this.errors = []
    this.performanceMetrics = []
  }
}

// Global diagnostics instance
export const diagnostics = new ComprehensiveDiagnostics()
