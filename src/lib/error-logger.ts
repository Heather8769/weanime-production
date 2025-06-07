// Comprehensive Error Logging & Monitoring System
'use client'

import { getEnvConfig } from './env-validation'

export interface ErrorLog {
  id: string
  timestamp: Date
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
  performance?: {
    memory?: number
    timing?: number
    networkSpeed?: string
  }
  resolved: boolean
  tags: string[]
}

export interface PerformanceMetrics {
  pageLoadTime: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
  firstInputDelay: number
  timeToInteractive: number
}

class ErrorLogger {
  private logs: ErrorLog[] = []
  private sessionId: string
  private maxLogs = 1000
  private isProduction = process.env.NODE_ENV === 'production'
  private sentryEnabled = false

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeErrorHandlers()
    this.initializePerformanceMonitoring()
    this.setupSentry()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private setupSentry() {
    try {
      if (process.env.NEXT_PUBLIC_SENTRY_DSN && this.isProduction) {
        // Initialize Sentry if DSN is provided
        this.sentryEnabled = true
        console.log('Sentry monitoring enabled')
      }
    } catch (error) {
      console.warn('Sentry setup failed:', error)
    }
  }

  private initializeErrorHandlers() {
    // Only initialize in browser environment
    if (typeof window === 'undefined') return

    // Global error handler
    window.addEventListener('error', (event) => {
      this.logError({
        message: event.message,
        stack: event.error?.stack,
        component: 'Global',
        action: 'unhandled_error',
        metadata: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })
    })

    // Promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        component: 'Global',
        action: 'unhandled_promise_rejection',
        metadata: { reason: event.reason }
      })
    })

    // React error boundary integration
    window.__WEANIME_ERROR_LOGGER__ = this
  }

  private initializePerformanceMonitoring() {
    // Only initialize in browser environment
    if (typeof window === 'undefined') return

    if ('performance' in window) {
      // Monitor Core Web Vitals
      this.observePerformanceMetrics()

      // Monitor page load performance
      window.addEventListener('load', () => {
        setTimeout(() => this.capturePageLoadMetrics(), 0)
      })
    }
  }

  private observePerformanceMetrics() {
    // Only run in browser environment
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return

    try {
      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1]
        this.logPerformance('LCP', lastEntry.startTime)
      }).observe({ entryTypes: ['largest-contentful-paint'] })

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          this.logPerformance('FID', entry.processingStart - entry.startTime)
        })
      }).observe({ entryTypes: ['first-input'] })

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let clsValue = 0
        const entries = list.getEntries()
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value
          }
        })
        this.logPerformance('CLS', clsValue)
      }).observe({ entryTypes: ['layout-shift'] })

    } catch (error) {
      console.warn('Performance monitoring setup failed:', error)
    }
  }

  private capturePageLoadMetrics() {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
    if (navigation) {
      const metrics: PerformanceMetrics = {
        pageLoadTime: navigation.loadEventEnd - navigation.fetchStart,
        firstContentfulPaint: this.getMetric('first-contentful-paint'),
        largestContentfulPaint: this.getMetric('largest-contentful-paint'),
        cumulativeLayoutShift: 0, // Will be updated by observer
        firstInputDelay: 0, // Will be updated by observer
        timeToInteractive: navigation.domInteractive - navigation.fetchStart
      }

      this.logInfo({
        message: 'Page Load Performance',
        component: 'Performance',
        action: 'page_load',
        metadata: { metrics }
      })
    }
  }

  private getMetric(name: string): number {
    const entries = performance.getEntriesByName(name)
    return entries.length > 0 ? entries[entries.length - 1].startTime : 0
  }

  private logPerformance(metric: string, value: number) {
    this.logInfo({
      message: `Performance Metric: ${metric}`,
      component: 'Performance',
      action: 'metric_capture',
      metadata: { metric, value, threshold: this.getThreshold(metric) }
    })

    // Alert if performance is poor
    if (this.isPerformancePoor(metric, value)) {
      this.logWarn({
        message: `Poor Performance Detected: ${metric}`,
        component: 'Performance',
        action: 'performance_alert',
        metadata: { metric, value, threshold: this.getThreshold(metric) }
      })
    }
  }

  private getThreshold(metric: string): number {
    const thresholds = {
      'LCP': 2500, // 2.5 seconds
      'FID': 100,  // 100 milliseconds
      'CLS': 0.1   // 0.1 score
    }
    return thresholds[metric as keyof typeof thresholds] || 0
  }

  private isPerformancePoor(metric: string, value: number): boolean {
    const threshold = this.getThreshold(metric)
    return threshold > 0 && value > threshold
  }

  public logError(params: {
    message: string
    stack?: string
    component?: string
    action?: string
    metadata?: Record<string, any>
    userId?: string
  }) {
    this.createLog('error', params)
  }

  public logWarn(params: {
    message: string
    component?: string
    action?: string
    metadata?: Record<string, any>
    userId?: string
  }) {
    this.createLog('warn', params)
  }

  public logInfo(params: {
    message: string
    component?: string
    action?: string
    metadata?: Record<string, any>
    userId?: string
  }) {
    this.createLog('info', params)
  }

  public logDebug(params: {
    message: string
    component?: string
    action?: string
    metadata?: Record<string, any>
    userId?: string
  }) {
    if (!this.isProduction) {
      this.createLog('debug', params)
    }
  }

  private createLog(level: ErrorLog['level'], params: any) {
    const log: ErrorLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      level,
      message: params.message,
      stack: params.stack,
      context: {
        userId: params.userId,
        sessionId: this.sessionId,
        userAgent: navigator.userAgent,
        url: window.location.href,
        component: params.component,
        action: params.action,
        metadata: params.metadata
      },
      performance: this.getCurrentPerformance(),
      resolved: false,
      tags: this.generateTags(level, params)
    }

    this.logs.push(log)
    this.maintainLogLimit()
    this.persistLog(log)
    this.sendToExternalServices(log)

    // Console output for development
    if (!this.isProduction) {
      this.consoleLog(log)
    }
  }

  private getCurrentPerformance() {
    if (typeof window !== 'undefined' && typeof performance !== 'undefined') {
      return {
        memory: (performance as any).memory?.usedJSHeapSize,
        timing: performance.now(),
        networkSpeed: typeof navigator !== 'undefined' ? (navigator as any).connection?.effectiveType : undefined
      }
    }
    return undefined
  }

  private generateTags(level: string, params: any): string[] {
    const tags = [level]
    if (params.component) tags.push(`component:${params.component}`)
    if (params.action) tags.push(`action:${params.action}`)
    if (params.userId) tags.push(`user:${params.userId}`)
    return tags
  }

  private maintainLogLimit() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }
  }

  private persistLog(log: ErrorLog) {
    // Only persist in browser environment
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return

    try {
      const existingLogs = JSON.parse(localStorage.getItem('weanime_error_logs') || '[]')
      existingLogs.push(log)

      // Keep only last 100 logs in localStorage
      const recentLogs = existingLogs.slice(-100)
      localStorage.setItem('weanime_error_logs', JSON.stringify(recentLogs))
    } catch (error) {
      console.warn('Failed to persist log to localStorage:', error)
    }
  }

  private async sendToExternalServices(log: ErrorLog) {
    // Send to backend API
    try {
      await fetch('/api/monitoring/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      })
    } catch (error) {
      console.warn('Failed to send log to backend:', error)
    }

    // Send to Sentry if enabled
    if (this.sentryEnabled && log.level === 'error') {
      this.sendToSentry(log)
    }
  }

  private sendToSentry(log: ErrorLog) {
    // Sentry integration would go here
    console.log('Would send to Sentry:', log)
  }

  private consoleLog(log: ErrorLog) {
    const style = this.getConsoleStyle(log.level)
    console.group(`%c[${log.level.toUpperCase()}] ${log.message}`, style)
    console.log('Timestamp:', log.timestamp.toISOString())
    console.log('Component:', log.context.component)
    console.log('Action:', log.context.action)
    console.log('URL:', log.context.url)
    if (log.context.metadata) console.log('Metadata:', log.context.metadata)
    if (log.stack) console.log('Stack:', log.stack)
    if (log.performance) console.log('Performance:', log.performance)
    console.groupEnd()
  }

  private getConsoleStyle(level: string): string {
    const styles = {
      error: 'color: #ff4444; font-weight: bold;',
      warn: 'color: #ffaa00; font-weight: bold;',
      info: 'color: #4444ff; font-weight: bold;',
      debug: 'color: #888888;'
    }
    return styles[level as keyof typeof styles] || ''
  }

  // Public methods for retrieving logs
  public getLogs(filter?: {
    level?: ErrorLog['level']
    component?: string
    timeRange?: { start: Date; end: Date }
    resolved?: boolean
  }): ErrorLog[] {
    let filteredLogs = [...this.logs]

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level)
      }
      if (filter.component) {
        filteredLogs = filteredLogs.filter(log => log.context.component === filter.component)
      }
      if (filter.timeRange) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp >= filter.timeRange!.start && log.timestamp <= filter.timeRange!.end
        )
      }
      if (filter.resolved !== undefined) {
        filteredLogs = filteredLogs.filter(log => log.resolved === filter.resolved)
      }
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  public getErrorSummary() {
    const summary = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byComponent: {} as Record<string, number>,
      recent: this.logs.filter(log => 
        Date.now() - log.timestamp.getTime() < 24 * 60 * 60 * 1000
      ).length,
      unresolved: this.logs.filter(log => !log.resolved && log.level === 'error').length
    }

    this.logs.forEach(log => {
      summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1
      if (log.context.component) {
        summary.byComponent[log.context.component] = (summary.byComponent[log.context.component] || 0) + 1
      }
    })

    return summary
  }

  public markResolved(logId: string) {
    const log = this.logs.find(l => l.id === logId)
    if (log) {
      log.resolved = true
      this.persistLog(log)
    }
  }

  public exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  public clearLogs() {
    this.logs = []
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('weanime_error_logs')
    }
  }
}

// Global instance
export const errorLogger = new ErrorLogger()

// React Error Boundary integration
export function logReactError(error: Error, errorInfo: any, component?: string) {
  errorLogger.logError({
    message: error.message,
    stack: error.stack,
    component: component || 'React',
    action: 'component_error',
    metadata: { errorInfo }
  })
}

// Hook for React components
export function useErrorLogger() {
  return {
    logError: errorLogger.logError.bind(errorLogger),
    logWarn: errorLogger.logWarn.bind(errorLogger),
    logInfo: errorLogger.logInfo.bind(errorLogger),
    logDebug: errorLogger.logDebug.bind(errorLogger),
    getLogs: errorLogger.getLogs.bind(errorLogger),
    getErrorSummary: errorLogger.getErrorSummary.bind(errorLogger),
    exportLogs: errorLogger.exportLogs.bind(errorLogger),
    clearLogs: errorLogger.clearLogs.bind(errorLogger),
    markResolved: errorLogger.markResolved.bind(errorLogger)
  }
}

// Declare global type
declare global {
  interface Window {
    __WEANIME_ERROR_LOGGER__?: ErrorLogger
  }
}
