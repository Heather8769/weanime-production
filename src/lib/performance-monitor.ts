// Advanced performance monitoring system
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, number[]> = new Map()
  private observers: PerformanceObserver[] = []
  private isEnabled: boolean = true

  private constructor() {
    this.initializeObservers()
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  private initializeObservers() {
    if (typeof window === 'undefined') return

    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.recordMetric('page-load', entry.duration)
              this.recordMetric('dom-content-loaded', (entry as any).domContentLoadedEventEnd - (entry as any).domContentLoadedEventStart)
            }
          }
        })
        navObserver.observe({ entryTypes: ['navigation'] })
        this.observers.push(navObserver)
      } catch (e) {
        console.warn('Navigation observer not supported')
      }

      // Observe resource timing
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              this.recordMetric(`resource-${this.getResourceType(entry.name)}`, entry.duration)
            }
          }
        })
        resourceObserver.observe({ entryTypes: ['resource'] })
        this.observers.push(resourceObserver)
      } catch (e) {
        console.warn('Resource observer not supported')
      }

      // Observe largest contentful paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('largest-contentful-paint', entry.startTime)
          }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })
        this.observers.push(lcpObserver)
      } catch (e) {
        console.warn('LCP observer not supported')
      }

      // Observe first input delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            this.recordMetric('first-input-delay', (entry as any).processingStart - entry.startTime)
          }
        })
        fidObserver.observe({ entryTypes: ['first-input'] })
        this.observers.push(fidObserver)
      } catch (e) {
        console.warn('FID observer not supported')
      }
    }
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript'
    if (url.includes('.css')) return 'stylesheet'
    if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) return 'image'
    if (url.match(/\.(mp4|webm|ogg)$/)) return 'video'
    if (url.includes('api/') || url.includes('/api/')) return 'api'
    return 'other'
  }

  recordMetric(name: string, value: number) {
    if (!this.isEnabled) return

    if (!this.metrics.has(name)) {
      this.metrics.set(name, [])
    }
    
    const values = this.metrics.get(name)!
    values.push(value)
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift()
    }
  }

  // Measure function execution time
  measureFunction<T>(name: string, fn: () => T): T {
    const start = globalThis.performance.now()
    const result = fn()
    const end = globalThis.performance.now()
    this.recordMetric(name, end - start)
    return result
  }

  // Measure async function execution time
  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = globalThis.performance.now()
    const result = await fn()
    const end = globalThis.performance.now()
    this.recordMetric(name, end - start)
    return result
  }

  // Get performance statistics
  getStats(metricName: string) {
    const values = this.metrics.get(metricName)
    if (!values || values.length === 0) {
      return null
    }

    const sorted = [...values].sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)
    
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    }
  }

  // Get all metrics
  getAllStats() {
    const stats: Record<string, any> = {}
    const metricNames = Array.from(this.metrics.keys())
    for (const name of metricNames) {
      stats[name] = this.getStats(name)
    }
    return stats
  }

  // Memory usage monitoring
  getMemoryUsage() {
    if ('memory' in globalThis.performance) {
      const memory = (globalThis.performance as any).memory
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      }
    }
    return null
  }

  // Network information
  getNetworkInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      }
    }
    return null
  }

  // Core Web Vitals
  getCoreWebVitals() {
    return {
      lcp: this.getStats('largest-contentful-paint'),
      fid: this.getStats('first-input-delay'),
      cls: this.getStats('cumulative-layout-shift'),
    }
  }

  // Performance report
  generateReport() {
    return {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      memory: this.getMemoryUsage(),
      network: this.getNetworkInfo(),
      coreWebVitals: this.getCoreWebVitals(),
      customMetrics: this.getAllStats(),
    }
  }

  // Enable/disable monitoring
  setEnabled(enabled: boolean) {
    this.isEnabled = enabled
  }

  // Clear all metrics
  clear() {
    this.metrics.clear()
  }

  // Cleanup observers
  destroy() {
    this.observers.forEach(observer => observer.disconnect())
    this.observers = []
    this.metrics.clear()
  }
}

// Convenience functions
export const performanceMonitor = PerformanceMonitor.getInstance()

export function measurePerformance<T>(name: string, fn: () => T): T {
  return performanceMonitor.measureFunction(name, fn)
}

export function measureAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
  return performanceMonitor.measureAsync(name, fn)
}

export function recordMetric(name: string, value: number) {
  performanceMonitor.recordMetric(name, value)
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  return {
    recordMetric: (name: string, value: number) => performanceMonitor.recordMetric(name, value),
    measureFunction: <T>(name: string, fn: () => T) => performanceMonitor.measureFunction(name, fn),
    measureAsync: <T>(name: string, fn: () => Promise<T>) => performanceMonitor.measureAsync(name, fn),
    getStats: (name: string) => performanceMonitor.getStats(name),
    getAllStats: () => performanceMonitor.getAllStats(),
    getMemoryUsage: () => performanceMonitor.getMemoryUsage(),
    getNetworkInfo: () => performanceMonitor.getNetworkInfo(),
    generateReport: () => performanceMonitor.generateReport(),
  }
}

// Performance decorator for class methods
export function measurePerformanceDecorator(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const name = metricName || `${target.constructor.name}.${propertyKey}`

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measureFunction(name, () => originalMethod.apply(this, args))
    }

    return descriptor
  }
}

// Performance decorator for async methods
export function measurePerformanceAsyncDecorator(metricName?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value
    const name = metricName || `${target.constructor.name}.${propertyKey}`

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measureAsync(name, () => originalMethod.apply(this, args))
    }

    return descriptor
  }
}
