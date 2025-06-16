/**
 * Centralized Error Collection System
 * Replaces manual error.txt copying with automated error aggregation
 */

interface ErrorData {
  level: 'ERROR' | 'WARN' | 'INFO'
  component: string
  message: string
  stack?: string
  url?: string
  metadata?: Record<string, any>
}

class ErrorCollector {
  private static instance: ErrorCollector
  private isEnabled = true
  private queue: ErrorData[] = []
  private flushInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.setupGlobalErrorHandlers()
    this.startFlushInterval()
  }

  static getInstance(): ErrorCollector {
    if (!ErrorCollector.instance) {
      ErrorCollector.instance = new ErrorCollector()
    }
    return ErrorCollector.instance
  }

  private setupGlobalErrorHandlers() {
    if (typeof window === 'undefined') return

    // Capture unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.logError({
        level: 'ERROR',
        component: 'Global',
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        metadata: {
          lineno: event.lineno,
          colno: event.colno,
          type: 'unhandled_error'
        }
      })
    })

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError({
        level: 'ERROR',
        component: 'Promise',
        message: `Unhandled promise rejection: ${event.reason}`,
        stack: event.reason?.stack,
        metadata: {
          type: 'unhandled_rejection',
          reason: event.reason
        }
      })
    })

    // Capture console errors (override console.error)
    const originalConsoleError = console.error
    console.error = (...args) => {
      originalConsoleError.apply(console, args)
      
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
      
      this.logError({
        level: 'ERROR',
        component: 'Console',
        message,
        metadata: {
          type: 'console_error',
          args: args.length
        }
      })
    }

    // Capture console warnings
    const originalConsoleWarn = console.warn
    console.warn = (...args) => {
      originalConsoleWarn.apply(console, args)
      
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ')
      
      this.logError({
        level: 'WARN',
        component: 'Console',
        message,
        metadata: {
          type: 'console_warn',
          args: args.length
        }
      })
    }
  }

  private startFlushInterval() {
    // Flush errors every 5 seconds
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 5000)
  }

  logError(errorData: ErrorData) {
    if (!this.isEnabled) return

    // Filter out noise - ignore certain non-critical errors
    if (this.shouldIgnoreError(errorData)) {
      return
    }

    const enrichedError: ErrorData = {
      ...errorData,
      url: errorData.url || (typeof window !== 'undefined' ? window.location.href : undefined),
      metadata: {
        ...errorData.metadata,
        timestamp: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        severity: this.calculateSeverity(errorData)
      }
    }

    this.queue.push(enrichedError)

    // If queue is getting large, flush immediately
    if (this.queue.length >= 10) {
      this.flush()
    }

    // For critical errors, flush immediately
    if (enrichedError.metadata?.severity === 'critical') {
      this.flush()
    }
  }

  private shouldIgnoreError(errorData: ErrorData): boolean {
    const message = errorData.message.toLowerCase()

    // Ignore common non-critical errors
    const ignoredPatterns = [
      'non-passive event listener',
      'script error',
      'network request failed',
      'loading chunk',
      'dynamically imported module',
      'hydration',
      'next-dev-overlay'
    ]

    return ignoredPatterns.some(pattern => message.includes(pattern))
  }

  private calculateSeverity(errorData: ErrorData): 'low' | 'medium' | 'high' | 'critical' {
    const message = errorData.message.toLowerCase()

    // Critical errors that break core functionality
    if (message.includes('crunchyroll') ||
        message.includes('authentication') ||
        message.includes('streaming') ||
        errorData.component === 'API') {
      return 'critical'
    }

    // High severity for React errors and unhandled exceptions
    if (errorData.level === 'ERROR' &&
        (message.includes('react') ||
         message.includes('unhandled') ||
         errorData.component.startsWith('React:'))) {
      return 'high'
    }

    // Medium severity for warnings and performance issues
    if (errorData.level === 'WARN' ||
        errorData.component === 'Performance') {
      return 'medium'
    }

    return 'low'
  }

  private async flush() {
    if (this.queue.length === 0) return

    const errorsToSend = [...this.queue]
    this.queue = []

    try {
      for (const error of errorsToSend) {
        await fetch('/api/errors', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(error)
        })
      }
    } catch (error) {
      // If sending fails, put errors back in queue
      this.queue.unshift(...errorsToSend)
      console.warn('Failed to send errors to collection system:', error)
    }
  }

  // Manual logging methods
  error(component: string, message: string, metadata?: Record<string, any>) {
    this.logError({
      level: 'ERROR',
      component,
      message,
      metadata
    })
  }

  warn(component: string, message: string, metadata?: Record<string, any>) {
    this.logError({
      level: 'WARN',
      component,
      message,
      metadata
    })
  }

  info(component: string, message: string, metadata?: Record<string, any>) {
    this.logError({
      level: 'INFO',
      component,
      message,
      metadata
    })
  }

  // API integration error logging
  apiError(endpoint: string, status: number, message: string, metadata?: Record<string, any>) {
    this.logError({
      level: 'ERROR',
      component: 'API',
      message: `${endpoint}: ${message}`,
      metadata: {
        ...metadata,
        endpoint,
        status,
        type: 'api_error'
      }
    })
  }

  // React component error logging
  componentError(componentName: string, error: Error, errorInfo?: any) {
    this.logError({
      level: 'ERROR',
      component: `React:${componentName}`,
      message: error.message,
      stack: error.stack,
      metadata: {
        type: 'react_error',
        errorInfo
      }
    })
  }

  // Performance issue logging
  performanceIssue(metric: string, value: number, threshold: number, metadata?: Record<string, any>) {
    this.logError({
      level: 'WARN',
      component: 'Performance',
      message: `${metric} (${value}) exceeded threshold (${threshold})`,
      metadata: {
        ...metadata,
        metric,
        value,
        threshold,
        type: 'performance_issue'
      }
    })
  }

  // Enable/disable error collection
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  // Force flush all pending errors
  async forceFlush() {
    await this.flush()
  }

  // Cleanup
  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
      this.flushInterval = null
    }
    this.flush() // Final flush
  }
}

// Export singleton instance
export const errorCollector = ErrorCollector.getInstance()

// Export convenience functions
export const logError = (component: string, message: string, metadata?: Record<string, any>) => 
  errorCollector.error(component, message, metadata)

export const logWarn = (component: string, message: string, metadata?: Record<string, any>) => 
  errorCollector.warn(component, message, metadata)

export const logInfo = (component: string, message: string, metadata?: Record<string, any>) => 
  errorCollector.info(component, message, metadata)

export const logApiError = (endpoint: string, status: number, message: string, metadata?: Record<string, any>) => 
  errorCollector.apiError(endpoint, status, message, metadata)

export const logComponentError = (componentName: string, error: Error, errorInfo?: any) => 
  errorCollector.componentError(componentName, error, errorInfo)

export const logPerformanceIssue = (metric: string, value: number, threshold: number, metadata?: Record<string, any>) => 
  errorCollector.performanceIssue(metric, value, threshold, metadata)
