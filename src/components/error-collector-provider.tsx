'use client'

import { useEffect } from 'react'
import { errorCollector } from '@/lib/error-collector'

export function ErrorCollectorProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize error collector
    errorCollector.setEnabled(true)
    
    // Log that error collection is active
    errorCollector.info('ErrorCollector', 'Error collection system initialized')
    
    // Cleanup on unmount
    return () => {
      errorCollector.forceFlush()
    }
  }, [])

  return <>{children}</>
}
