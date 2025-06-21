'use client'

import { useEffect, useState } from 'react'
import { errorCollector } from '@/lib/error-collector'

interface DeploymentHealth {
  deployment: string
  environment: string
  apiHealth: boolean
  supabaseHealth: boolean
  crunchyrollBridgeHealth: boolean
  timestamp: string
  errors: Array<{
    component: string
    message: string
    timestamp: string
  }>
}

export function DeploymentDiagnostics() {
  const [health, setHealth] = useState<DeploymentHealth | null>(null)
  const [isChecking, setIsChecking] = useState(false)

  const runDiagnostics = async () => {
    setIsChecking(true)
    const diagnostics: DeploymentHealth = {
      deployment: detectDeployment(),
      environment: process.env.NODE_ENV || 'unknown',
      apiHealth: false,
      supabaseHealth: false,
      crunchyrollBridgeHealth: false,
      timestamp: new Date().toISOString(),
      errors: []
    }

    // Test API health
    try {
      const response = await fetch('/api/health')
      diagnostics.apiHealth = response.ok
      if (!response.ok) {
        diagnostics.errors.push({
          component: 'API',
          message: `Health check failed: ${response.status}`,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      diagnostics.errors.push({
        component: 'API',
        message: `Health check error: ${error}`,
        timestamp: new Date().toISOString()
      })
    }

    // Test Supabase connection
    try {
      const response = await fetch('/api/health/database')
      diagnostics.supabaseHealth = response.ok
      if (!response.ok) {
        diagnostics.errors.push({
          component: 'Supabase',
          message: `Database check failed: ${response.status}`,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      diagnostics.errors.push({
        component: 'Supabase',
        message: `Database check error: ${error}`,
        timestamp: new Date().toISOString()
      })
    }

    // Test Crunchyroll bridge
    try {
      const response = await fetch('/api/test-crunchyroll')
      diagnostics.crunchyrollBridgeHealth = response.ok
      if (!response.ok) {
        diagnostics.errors.push({
          component: 'Crunchyroll Bridge',
          message: `Bridge check failed: ${response.status}`,
          timestamp: new Date().toISOString()
        })
      }
    } catch (error) {
      diagnostics.errors.push({
        component: 'Crunchyroll Bridge',
        message: `Bridge check error: ${error}`,
        timestamp: new Date().toISOString()
      })
    }

    // Log all diagnostics to error collector
    errorCollector.info('DeploymentDiagnostics', 'Deployment health check completed', {
      diagnostics,
      deployment: diagnostics.deployment,
      environment: diagnostics.environment
    })

    // Log any errors found
    diagnostics.errors.forEach(error => {
      errorCollector.error(error.component, error.message, {
        deployment: diagnostics.deployment,
        timestamp: error.timestamp
      })
    })

    setHealth(diagnostics)
    setIsChecking(false)
  }

  useEffect(() => {
    // Run diagnostics on component mount
    runDiagnostics()
    
    // Run diagnostics every 30 seconds
    const interval = setInterval(runDiagnostics, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const detectDeployment = (): string => {
    if (typeof window === 'undefined') return 'server'
    
    const hostname = window.location.hostname
    if (hostname.includes('netlify.app') || hostname.includes('weanime.live')) {
      return 'netlify'
    }
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'local'
    }
    return 'unknown'
  }

  if (!health) {
    return (
      <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          <span>Running deployment diagnostics...</span>
        </div>
      </div>
    )
  }

  const overallHealth = health.apiHealth && health.supabaseHealth
  const hasErrors = health.errors.length > 0

  return (
    <div className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow-sm border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Deployment Status</h3>
        <div className={`px-3 py-1 rounded-full text-sm ${
          overallHealth 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
        }`}>
          {overallHealth ? 'Healthy' : 'Issues Detected'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Deployment</span>
          <div className="font-medium">{health.deployment}</div>
        </div>
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Environment</span>
          <div className="font-medium">{health.environment}</div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <HealthIndicator 
          label="API Routes" 
          healthy={health.apiHealth}
          critical={true}
        />
        <HealthIndicator 
          label="Database (Supabase)" 
          healthy={health.supabaseHealth}
          critical={true}
        />
        <HealthIndicator 
          label="Crunchyroll Bridge" 
          healthy={health.crunchyrollBridgeHealth}
          critical={false}
        />
      </div>

      {hasErrors && (
        <div className="border-t pt-4">
          <h4 className="font-medium text-red-600 dark:text-red-400 mb-2">
            Issues Detected ({health.errors.length})
          </h4>
          <div className="space-y-2">
            {health.errors.map((error, index) => (
              <div key={index} className="text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                <div className="font-medium">{error.component}</div>
                <div className="text-red-600 dark:text-red-400">{error.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4">
        Last checked: {new Date(health.timestamp).toLocaleTimeString()}
        {isChecking && (
          <span className="ml-2 flex items-center">
            <div className="animate-spin h-3 w-3 border border-gray-400 border-t-transparent rounded-full mr-1"></div>
            Updating...
          </span>
        )}
      </div>
    </div>
  )
}

function HealthIndicator({ 
  label, 
  healthy, 
  critical = false 
}: { 
  label: string
  healthy: boolean
  critical?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className={`flex items-center space-x-2 ${
        critical && !healthy ? 'text-red-600' : ''
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          healthy 
            ? 'bg-green-500' 
            : critical 
              ? 'bg-red-500' 
              : 'bg-yellow-500'
        }`}></div>
        <span className="text-sm">
          {healthy ? 'OK' : critical ? 'Failed' : 'Warning'}
        </span>
      </div>
    </div>
  )
}