'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { logReactError } from '@/lib/error-logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo })
    this.props.onError?.(error, errorInfo)

    // Log error to our comprehensive error logging system
    logReactError(error, errorInfo, 'ErrorBoundary')

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 rounded-xl border border-red-500/20 bg-red-500/5 text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-6xl"
          >
            💥
          </motion.div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
            <p className="text-white/80 max-w-md mx-auto">
              An unexpected error occurred. Don't worry, this has been logged and we'll fix it soon.
            </p>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left glass-card p-4 rounded-lg border border-white/10 mt-4">
                <summary className="cursor-pointer text-white/90 font-medium mb-2">
                  Error Details (Development)
                </summary>
                <pre className="text-xs text-red-400 overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
          
          <div className="flex gap-4 justify-center">
            <Button
              onClick={this.handleRetry}
              className="anime-gradient hover:opacity-90 glow-effect-hover"
            >
              Try Again
            </Button>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="glass-card border-white/20 text-white hover:bg-white/10"
            >
              Reload Page
            </Button>
          </div>
        </motion.div>
      )
    }

    return this.props.children
  }
}

// Specialized error boundaries for different sections
export function VideoErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="aspect-video glass-card rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-center"
        >
          <div className="text-center space-y-4">
            <div className="text-4xl">📺</div>
            <h3 className="text-lg font-semibold text-white">Video Player Error</h3>
            <p className="text-white/70 text-sm">
              Unable to load the video player. Please try refreshing the page.
            </p>
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              className="anime-gradient hover:opacity-90"
            >
              Refresh
            </Button>
          </div>
        </motion.div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function ImageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="glass-card rounded-lg border border-white/10 p-4 flex items-center justify-center">
          <div className="text-center text-white/60">
            <div className="text-2xl mb-2">🖼️</div>
            <p className="text-xs">Image unavailable</p>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

export function SearchErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-xl border border-red-500/20 bg-red-500/5 text-center"
        >
          <div className="space-y-4">
            <div className="text-4xl">🔍</div>
            <h3 className="text-lg font-semibold text-white">Search Error</h3>
            <p className="text-white/70">
              Unable to perform search. Please try again.
            </p>
            <Button
              onClick={() => window.location.reload()}
              size="sm"
              className="anime-gradient hover:opacity-90"
            >
              Retry Search
            </Button>
          </div>
        </motion.div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}

// Hook for using error boundary programmatically
export function useErrorHandler() {
  return (error: Error, errorInfo?: ErrorInfo) => {
    // In a real app, you'd send this to your error reporting service
    console.error('Error caught by useErrorHandler:', error, errorInfo)
    
    // You could also trigger a toast notification here
    // toast.error('Something went wrong. Please try again.')
  }
}
