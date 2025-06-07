// Error monitoring and logging utilities
import React from 'react'

export interface ErrorContext {
  userId?: string
  userAgent?: string
  url?: string
  timestamp?: string
  additionalData?: Record<string, any>
}

export interface ErrorReport {
  message: string
  stack?: string
  level: 'error' | 'warning' | 'info'
  context?: ErrorContext
}

class ErrorMonitoring {
  private isProduction = process.env.NODE_ENV === 'production'
  private sentryDsn = process.env.SENTRY_DSN

  constructor() {
    if (this.isProduction && this.sentryDsn) {
      this.initializeSentry()
    }
  }

  private initializeSentry() {
    // Initialize Sentry if DSN is provided
    // This would be implemented with @sentry/nextjs
    console.log('Sentry initialized for production')
  }

  logError(error: Error | string, context?: ErrorContext) {
    const errorReport: ErrorReport = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      level: 'error',
      context: {
        ...context,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      }
    }

    // Log to console in development
    if (!this.isProduction) {
      console.error('Error logged:', errorReport)
    }

    // Send to monitoring service in production
    if (this.isProduction) {
      this.sendToMonitoringService(errorReport)
    }

    // Store in local storage for debugging
    this.storeLocalError(errorReport)
  }

  logWarning(message: string, context?: ErrorContext) {
    const warningReport: ErrorReport = {
      message,
      level: 'warning',
      context: {
        ...context,
        timestamp: new Date().toISOString(),
      }
    }

    if (!this.isProduction) {
      console.warn('Warning logged:', warningReport)
    }

    if (this.isProduction) {
      this.sendToMonitoringService(warningReport)
    }
  }

  logInfo(message: string, context?: ErrorContext) {
    const infoReport: ErrorReport = {
      message,
      level: 'info',
      context: {
        ...context,
        timestamp: new Date().toISOString(),
      }
    }

    if (!this.isProduction) {
      console.info('Info logged:', infoReport)
    }
  }

  private async sendToMonitoringService(report: ErrorReport) {
    try {
      // This would send to your monitoring service (Sentry, LogRocket, etc.)
      await fetch('/api/monitoring/error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(report),
      })
    } catch (error) {
      console.error('Failed to send error to monitoring service:', error)
    }
  }

  private storeLocalError(report: ErrorReport) {
    if (typeof window === 'undefined') return

    try {
      const errors = JSON.parse(localStorage.getItem('app_errors') || '[]')
      errors.push(report)
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50)
      }
      
      localStorage.setItem('app_errors', JSON.stringify(errors))
    } catch (error) {
      console.error('Failed to store error locally:', error)
    }
  }

  getLocalErrors(): ErrorReport[] {
    if (typeof window === 'undefined') return []

    try {
      return JSON.parse(localStorage.getItem('app_errors') || '[]')
    } catch (error) {
      console.error('Failed to retrieve local errors:', error)
      return []
    }
  }

  clearLocalErrors() {
    if (typeof window === 'undefined') return

    try {
      localStorage.removeItem('app_errors')
    } catch (error) {
      console.error('Failed to clear local errors:', error)
    }
  }
}

// Global error monitoring instance
export const errorMonitoring = new ErrorMonitoring()

// Global error handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    errorMonitoring.logError(event.error || event.message, {
      additionalData: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      }
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    errorMonitoring.logError(`Unhandled Promise Rejection: ${event.reason}`, {
      additionalData: {
        type: 'unhandledrejection',
        reason: event.reason,
      }
    })
  })
}

// React Error Boundary helper
export function withErrorBoundary<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
) {
  return function WrappedComponent(props: T) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Simple Error Boundary component
class ErrorBoundary extends React.Component<
  { 
    children: React.ReactNode
    fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
  },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    errorMonitoring.logError(error, {
      additionalData: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true,
      }
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return (
        <FallbackComponent 
          error={this.state.error!} 
          resetError={() => this.setState({ hasError: false, error: undefined })}
        />
      )
    }

    return this.props.children
  }
}

// Default error fallback component
function DefaultErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <h2 className="text-2xl font-bold text-destructive">Something went wrong</h2>
        <p className="text-muted-foreground max-w-md">
          We're sorry, but something unexpected happened. Please try refreshing the page.
        </p>
        <div className="space-x-4">
          <button
            onClick={resetError}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
          >
            Refresh Page
          </button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground">
              Error Details (Development Only)
            </summary>
            <pre className="mt-2 text-xs bg-muted p-4 rounded overflow-auto">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}
