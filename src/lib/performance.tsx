// Performance monitoring and optimization utilities
import React from 'react'

interface PerformanceMetric {
  name: string
  value: number
  timestamp: number
  url?: string
  userId?: string
}

class PerformanceMonitoring {
  private metrics: PerformanceMetric[] = []
  private isProduction = process.env.NODE_ENV === 'production'

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitals()
      this.setupPerformanceObserver()
    }
  }

  private initializeWebVitals() {
    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      this.observeMetric('largest-contentful-paint', (entry) => {
        this.recordMetric('LCP', entry.startTime)
      })

      // First Input Delay (FID)
      this.observeMetric('first-input', (entry) => {
        this.recordMetric('FID', entry.processingStart - entry.startTime)
      })

      // Cumulative Layout Shift (CLS)
      this.observeMetric('layout-shift', (entry) => {
        if (!entry.hadRecentInput) {
          this.recordMetric('CLS', entry.value)
        }
      })
    }
  }

  private observeMetric(type: string, callback: (entry: any) => void) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          callback(entry)
        }
      })
      observer.observe({ type, buffered: true })
    } catch (error) {
      console.warn(`Failed to observe ${type}:`, error)
    }
  }

  private setupPerformanceObserver() {
    // Monitor navigation timing
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      if (navigation) {
        this.recordMetric('TTFB', navigation.responseStart - navigation.requestStart)
        this.recordMetric('DOM_LOAD', navigation.domContentLoadedEventEnd - navigation.fetchStart)
        this.recordMetric('FULL_LOAD', navigation.loadEventEnd - navigation.fetchStart)
      }
    })
  }

  recordMetric(name: string, value: number, additionalData?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      ...additionalData,
    }

    this.metrics.push(metric)

    // Log in development
    if (!this.isProduction) {
      console.log(`Performance metric - ${name}:`, value, 'ms')
    }

    // Send to analytics in production
    if (this.isProduction) {
      this.sendMetricToAnalytics(metric)
    }

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.splice(0, this.metrics.length - 100)
    }
  }

  private async sendMetricToAnalytics(metric: PerformanceMetric) {
    try {
      // Send to your analytics service
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      })
    } catch (error) {
      console.error('Failed to send performance metric:', error)
    }
  }

  // Measure function execution time
  measureFunction<T extends (...args: any[]) => any>(
    fn: T,
    name?: string
  ): T {
    return ((...args: Parameters<T>) => {
      const start = performance.now()
      const result = fn(...args)
      const end = performance.now()
      
      this.recordMetric(name || fn.name || 'anonymous_function', end - start)
      
      return result
    }) as T
  }

  // Measure async function execution time
  measureAsyncFunction<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    name?: string
  ): T {
    return (async (...args: Parameters<T>) => {
      const start = performance.now()
      const result = await fn(...args)
      const end = performance.now()
      
      this.recordMetric(name || fn.name || 'anonymous_async_function', end - start)
      
      return result
    }) as T
  }

  // Measure component render time
  measureComponentRender(componentName: string) {
    return {
      start: () => {
        const startTime = performance.now()
        return {
          end: () => {
            const endTime = performance.now()
            this.recordMetric(`${componentName}_render`, endTime - startTime)
          }
        }
      }
    }
  }

  // Get performance summary
  getPerformanceSummary() {
    const summary: Record<string, { avg: number; min: number; max: number; count: number }> = {}
    
    this.metrics.forEach(metric => {
      if (!summary[metric.name]) {
        summary[metric.name] = { avg: 0, min: Infinity, max: -Infinity, count: 0 }
      }
      
      const s = summary[metric.name]
      s.count++
      s.min = Math.min(s.min, metric.value)
      s.max = Math.max(s.max, metric.value)
      s.avg = (s.avg * (s.count - 1) + metric.value) / s.count
    })
    
    return summary
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = []
  }

  // Get all metrics
  getAllMetrics() {
    return [...this.metrics]
  }
}

// Global performance monitoring instance
export const performanceMonitoring = new PerformanceMonitoring()

// React hook for measuring component performance
export function usePerformanceMetric(componentName: string) {
  const [renderTime, setRenderTime] = React.useState<number | null>(null)
  
  React.useEffect(() => {
    const measure = performanceMonitoring.measureComponentRender(componentName)
    const timer = measure.start()
    
    return () => {
      timer.end()
    }
  }, [componentName])
  
  return renderTime
}

// HOC for measuring component performance
export function withPerformanceMonitoring<T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  componentName?: string
) {
  const name = componentName || Component.displayName || Component.name || 'UnknownComponent'
  
  return function PerformanceMonitoredComponent(props: T) {
    React.useEffect(() => {
      const measure = performanceMonitoring.measureComponentRender(name)
      const timer = measure.start()
      
      return () => {
        timer.end()
      }
    })
    
    return <Component {...props} />
  }
}

// Utility for measuring API call performance
export async function measureApiCall<T>(
  apiCall: () => Promise<T>,
  endpoint: string
): Promise<T> {
  const start = performance.now()
  
  try {
    const result = await apiCall()
    const end = performance.now()
    
    performanceMonitoring.recordMetric(`api_${endpoint}`, end - start, {
      status: 'success',
      endpoint,
    })
    
    return result
  } catch (error) {
    const end = performance.now()
    
    performanceMonitoring.recordMetric(`api_${endpoint}`, end - start, {
      status: 'error',
      endpoint,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    
    throw error
  }
}

// Utility for measuring database query performance
export async function measureDatabaseQuery<T>(
  query: () => Promise<T>,
  queryName: string
): Promise<T> {
  const start = performance.now()
  
  try {
    const result = await query()
    const end = performance.now()
    
    performanceMonitoring.recordMetric(`db_${queryName}`, end - start, {
      status: 'success',
      queryName,
    })
    
    return result
  } catch (error) {
    const end = performance.now()
    
    performanceMonitoring.recordMetric(`db_${queryName}`, end - start, {
      status: 'error',
      queryName,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    
    throw error
  }
}

// Performance budget checker
export function checkPerformanceBudget() {
  const summary = performanceMonitoring.getPerformanceSummary()
  const budgets = {
    LCP: 2500, // 2.5 seconds
    FID: 100,  // 100 milliseconds
    CLS: 0.1,  // 0.1
    TTFB: 600, // 600 milliseconds
  }
  
  const violations: string[] = []
  
  Object.entries(budgets).forEach(([metric, budget]) => {
    const data = summary[metric]
    if (data && data.avg > budget) {
      violations.push(`${metric}: ${data.avg.toFixed(2)}ms (budget: ${budget}ms)`)
    }
  })
  
  if (violations.length > 0) {
    console.warn('Performance budget violations:', violations)
  }
  
  return violations
}
