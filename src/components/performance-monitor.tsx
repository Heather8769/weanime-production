'use client'

import { useEffect } from 'react'
import { logPerformanceIssue } from '@/lib/error-collector'

interface PerformanceMetrics {
  lcp?: number
  fid?: number
  cls?: number
  ttfb?: number
  fcp?: number
}

export function PerformanceMonitor() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Monitor Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'largest-contentful-paint':
            const lcp = entry.startTime
            if (lcp > 2500) {
              logPerformanceIssue('LCP', lcp, 2500, {
                url: window.location.href,
                element: (entry as any).element?.tagName
              })
            }
            break
            
          case 'first-input':
            const fid = (entry as any).processingStart - entry.startTime
            if (fid > 100) {
              logPerformanceIssue('FID', fid, 100, {
                url: window.location.href,
                target: (entry as any).target?.tagName
              })
            }
            break
            
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              const cls = (entry as any).value
              if (cls > 0.1) {
                logPerformanceIssue('CLS', cls, 0.1, {
                  url: window.location.href,
                  sources: (entry as any).sources?.map((s: any) => s.node?.tagName)
                })
              }
            }
            break
        }
      }
    })

    // Observe Core Web Vitals
    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
    } catch (error) {
      console.warn('Performance monitoring not supported:', error)
    }

    // Monitor navigation timing
    const checkNavigationTiming = () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      if (navigation) {
        const ttfb = navigation.responseStart - navigation.requestStart
        const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart
        const loadComplete = navigation.loadEventEnd - navigation.loadEventStart

        if (ttfb > 600) {
          logPerformanceIssue('TTFB', ttfb, 600, {
            url: window.location.href,
            type: 'navigation'
          })
        }

        if (domContentLoaded > 1000) {
          logPerformanceIssue('DOM Content Loaded', domContentLoaded, 1000, {
            url: window.location.href,
            type: 'navigation'
          })
        }

        if (loadComplete > 2000) {
          logPerformanceIssue('Load Complete', loadComplete, 2000, {
            url: window.location.href,
            type: 'navigation'
          })
        }
      }
    }

    // Check navigation timing after page load
    if (document.readyState === 'complete') {
      checkNavigationTiming()
    } else {
      window.addEventListener('load', checkNavigationTiming)
    }

    // Monitor long tasks
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          logPerformanceIssue('Long Task', entry.duration, 50, {
            url: window.location.href,
            name: entry.name,
            type: 'long-task'
          })
        }
      }
    })

    try {
      longTaskObserver.observe({ entryTypes: ['longtask'] })
    } catch (error) {
      console.warn('Long task monitoring not supported:', error)
    }

    // Monitor memory usage (if available)
    const checkMemoryUsage = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory
        const usedMB = memory.usedJSHeapSize / 1024 / 1024
        const limitMB = memory.jsHeapSizeLimit / 1024 / 1024
        const usagePercent = (usedMB / limitMB) * 100

        if (usagePercent > 80) {
          logPerformanceIssue('Memory Usage', usagePercent, 80, {
            url: window.location.href,
            usedMB: Math.round(usedMB),
            limitMB: Math.round(limitMB),
            type: 'memory'
          })
        }
      }
    }

    // Check memory usage every 30 seconds
    const memoryInterval = setInterval(checkMemoryUsage, 30000)

    // Cleanup
    return () => {
      observer.disconnect()
      longTaskObserver.disconnect()
      clearInterval(memoryInterval)
      window.removeEventListener('load', checkNavigationTiming)
    }
  }, [])

  return null // This component doesn't render anything
}

// Hook for manual performance tracking
export function usePerformanceTracking() {
  const trackPageLoad = (pageName: string) => {
    if (typeof window === 'undefined') return

    const startTime = performance.now()
    
    return () => {
      const endTime = performance.now()
      const loadTime = endTime - startTime
      
      if (loadTime > 1000) {
        logPerformanceIssue(`${pageName} Load Time`, loadTime, 1000, {
          url: window.location.href,
          page: pageName,
          type: 'page-load'
        })
      }
    }
  }

  const trackApiCall = (endpoint: string) => {
    const startTime = performance.now()
    
    return (success: boolean) => {
      const endTime = performance.now()
      const duration = endTime - startTime
      
      if (duration > 2000) {
        logPerformanceIssue(`API Call Duration`, duration, 2000, {
          endpoint,
          success,
          type: 'api-call'
        })
      }
    }
  }

  return { trackPageLoad, trackApiCall }
}
