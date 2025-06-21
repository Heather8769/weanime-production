'use client'

import { useEffect } from 'react'
import { diagnostics } from '@/lib/comprehensive-diagnostics'

export function DiagnosticsProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize diagnostics system
    console.log('🔍 Comprehensive Diagnostics System initialized')
    
    // Run initial health check after a short delay
    setTimeout(() => {
      diagnostics.runHealthCheck().then(health => {
        console.log('📊 Initial Health Check Results:', {
          overallScore: health.overallScore,
          criticalIssues: health.issues.filter(i => i.category === 'critical').length,
          totalIssues: health.issues.length
        })
        
        // Log critical issues immediately
        const criticalIssues = health.issues.filter(i => i.category === 'critical')
        if (criticalIssues.length > 0) {
          console.warn('🚨 Critical Issues Detected:', criticalIssues)
        }
      }).catch(error => {
        console.error('❌ Initial health check failed:', error)
      })
    }, 2000)
    
    // Set up periodic health checks (every 5 minutes)
    const interval = setInterval(() => {
      diagnostics.runHealthCheck().then(health => {
        if (health.overallScore < 80) {
          console.warn('⚠️ System health degraded:', health.overallScore + '%')
        }
      }).catch(console.error)
    }, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  return <>{children}</>
}
