'use client'

import { useState, useEffect } from 'react'
import { diagnostics, type SystemHealth, type DiagnosticResult } from '@/lib/comprehensive-diagnostics'
import { autoFixEngine, type AutoFixResult } from '@/lib/auto-fix-engine'

export default function DiagnosticsPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [fixingIssues, setFixingIssues] = useState<Set<number>>(new Set())
  const [fixResults, setFixResults] = useState<Map<number, AutoFixResult>>(new Map())

  useEffect(() => {
    runDiagnostics()
    
    if (autoRefresh) {
      const interval = setInterval(runDiagnostics, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const runDiagnostics = async () => {
    setLoading(true)
    try {
      const result = await diagnostics.runHealthCheck()
      setHealth(result)
    } catch (error) {
      console.error('Failed to run diagnostics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getCategoryIcon = (category: string) => {
    const icons = {
      api: '🔌',
      database: '🗄️',
      authentication: '🔐',
      frontend: '⚛️',
      performance: '⚡',
      security: '🛡️'
    }
    return icons[category as keyof typeof icons] || '📊'
  }

  const getIssueIcon = (category: string) => {
    const icons = {
      critical: '🚨',
      warning: '⚠️',
      info: 'ℹ️',
      success: '✅'
    }
    return icons[category as keyof typeof icons] || '📝'
  }

  const autoFixIssue = async (issue: DiagnosticResult, index: number) => {
    setFixingIssues(prev => new Set(prev).add(index))

    try {
      const result = await autoFixEngine.fixIssue(issue)
      setFixResults(prev => new Map(prev).set(index, result))

      if (result.success) {
        // Re-run diagnostics after successful fix
        setTimeout(runDiagnostics, 2000)
      }
    } catch (error) {
      setFixResults(prev => new Map(prev).set(index, {
        success: false,
        message: 'Auto-fix failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }))
    } finally {
      setFixingIssues(prev => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }
  }

  const autoFixAllIssues = async () => {
    if (!health) return

    const autoFixableIssues = health.issues.filter(issue => issue.autoFixAvailable)

    for (let i = 0; i < autoFixableIssues.length; i++) {
      await autoFixIssue(autoFixableIssues[i], i)
      // Add delay between fixes
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  if (loading && !health) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Running comprehensive diagnostics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Diagnostics</h1>
              <p className="text-gray-600">Comprehensive health monitoring and auto-fix system</p>
            </div>
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="mr-2"
                />
                Auto-refresh
              </label>
              <button
                onClick={runDiagnostics}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Running...' : 'Run Diagnostics'}
              </button>
              {health && health.issues.filter(i => i.autoFixAvailable).length > 0 && (
                <button
                  onClick={autoFixAllIssues}
                  disabled={loading || fixingIssues.size > 0}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  Auto-Fix All Issues
                </button>
              )}
            </div>
          </div>
        </div>

        {health && (
          <>
            {/* Overall Health Score */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Overall System Health</h2>
                  <p className="text-gray-600">Last updated: {new Date().toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <div className={`text-4xl font-bold ${getScoreColor(health.overallScore)}`}>
                    {health.overallScore}%
                  </div>
                  <p className="text-gray-600">Health Score</p>
                </div>
              </div>
            </div>

            {/* Category Scores */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {Object.entries(health.categories).map(([category, score]) => (
                <div key={category} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-2xl mr-3">{getCategoryIcon(category)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900 capitalize">{category}</h3>
                        <p className="text-sm text-gray-600">System Component</p>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
                      {score}%
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {health.recommendations.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">📋 Recommendations</h3>
                <ul className="space-y-2">
                  {health.recommendations.map((rec, index) => (
                    <li key={index} className="text-blue-800">{rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Issues List */}
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  Issues Detected ({health.issues.length})
                </h3>
              </div>
              <div className="divide-y divide-gray-200">
                {health.issues.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    ✅ No issues detected - system is healthy!
                  </div>
                ) : (
                  health.issues.map((issue, index) => (
                    <div key={index} className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-xl mr-2">{getIssueIcon(issue.category)}</span>
                            <h4 className="font-semibold text-gray-900">{issue.issue}</h4>
                            <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                              issue.category === 'critical' ? 'bg-red-100 text-red-800' :
                              issue.category === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {issue.category}
                            </span>
                            <span className="ml-2 text-sm text-gray-500">
                              Priority: {issue.priority}/10
                            </span>
                          </div>
                          <p className="text-gray-600 mb-2">{issue.description}</p>
                          <p className="text-sm text-gray-500">Component: {issue.component}</p>
                          {issue.fix && (
                            <p className="text-sm text-blue-600 mt-2">💡 Fix: {issue.fix}</p>
                          )}
                        </div>
                        {issue.autoFixAvailable && (
                          <button
                            onClick={() => autoFixIssue(issue)}
                            className="ml-4 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                          >
                            Auto-Fix
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
