'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, CheckCircle, XCircle, AlertTriangle, Play, Monitor } from 'lucide-react'

interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'warning'
  details: any
  message: string
}

interface SystemTestResults {
  status: string
  message: string
  results: {
    timestamp: string
    environment: string
    tests: Record<string, TestResult>
    summary: {
      total: number
      passed: number
      failed: number
      warnings: number
    }
  }
}

export default function TestPage() {
  const [testResults, setTestResults] = useState<SystemTestResults | null>(null)
  const [loading, setLoading] = useState(false)
  const [manualTests, setManualTests] = useState({
    homepage: false,
    navigation: false,
    videoPlayer: false,
    errorLogging: false,
    pwa: false,
    mobile: false
  })

  const runSystemTests = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test/system')
      const data = await response.json()
      setTestResults(data)
    } catch (error) {
      console.error('Failed to run system tests:', error)
    } finally {
      setLoading(false)
    }
  }

  const triggerTestError = async (type: string) => {
    try {
      await fetch('/api/test/system', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testType: type })
      })
      alert(`Test ${type} triggered! Check the monitoring dashboard.`)
    } catch (error) {
      console.error('Failed to trigger test error:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'fail':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'default'
      case 'fail':
        return 'destructive'
      case 'warning':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  useEffect(() => {
    runSystemTests()
  }, [])

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">WeAnime Localhost Testing</h1>
          <p className="text-muted-foreground">Comprehensive testing dashboard for local development</p>
        </div>
        <Button onClick={runSystemTests} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Run Tests
        </Button>
      </div>

      {/* System Test Results */}
      {testResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Automated System Tests
              <Badge variant={testResults.status === 'healthy' ? 'default' : 'destructive'}>
                {testResults.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-500">
                    {testResults.results.summary.passed}
                  </div>
                  <div className="text-sm text-muted-foreground">Passed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-500">
                    {testResults.results.summary.failed}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-yellow-500">
                    {testResults.results.summary.warnings}
                  </div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {testResults.results.summary.total}
                  </div>
                  <div className="text-sm text-muted-foreground">Total</div>
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(testResults.results.tests).map(([key, test]) => (
                  <div key={key} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(test.status)}
                      <div>
                        <div className="font-medium">{test.name}</div>
                        <div className="text-sm text-muted-foreground">{test.message}</div>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(test.status) as any}>
                      {test.status.toUpperCase()}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual Testing Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Manual Testing Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { key: 'homepage', label: 'Homepage loads correctly', url: '/' },
              { key: 'navigation', label: 'Navigation works', url: '/browse' },
              { key: 'videoPlayer', label: 'Video player functionality', url: '/watch/1' },
              { key: 'errorLogging', label: 'Error logging dashboard', url: '/admin/monitoring' },
              { key: 'pwa', label: 'PWA manifest and service worker', url: '/manifest.json' },
              { key: 'mobile', label: 'Mobile responsiveness (DevTools)', url: '/' }
            ].map((test) => (
              <div key={test.key} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={manualTests[test.key as keyof typeof manualTests]}
                    onChange={(e) => setManualTests(prev => ({
                      ...prev,
                      [test.key]: e.target.checked
                    }))}
                    className="h-4 w-4"
                  />
                  <div>
                    <div className="font-medium">{test.label}</div>
                    <div className="text-sm text-muted-foreground">{test.url}</div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(test.url, '_blank')}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Test
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Error Testing Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Error Logging Test Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use these tools to test the error logging system. Check the monitoring dashboard after triggering errors.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => triggerTestError('error')}
              >
                Trigger Error
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => triggerTestError('warning')}
              >
                Trigger Warning
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerTestError('info')}
              >
                Trigger Info
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Homepage', url: '/' },
              { label: 'Browse', url: '/browse' },
              { label: 'Trending', url: '/trending' },
              { label: 'Monitoring', url: '/admin/monitoring' },
              { label: 'PWA Manifest', url: '/manifest.json' },
              { label: 'Service Worker', url: '/sw.js' }
            ].map((link) => (
              <Button
                key={link.url}
                variant="outline"
                className="justify-start"
                onClick={() => window.open(link.url, '_blank')}
              >
                {link.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Test Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Test Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Automated Tests</span>
              <Badge variant={testResults?.status === 'healthy' ? 'default' : 'destructive'}>
                {testResults ? (testResults.status === 'healthy' ? 'PASS' : 'FAIL') : 'PENDING'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Manual Tests</span>
              <Badge variant={Object.values(manualTests).every(Boolean) ? 'default' : 'secondary'}>
                {Object.values(manualTests).filter(Boolean).length}/{Object.values(manualTests).length}
              </Badge>
            </div>
            <div className="pt-4 border-t">
              <div className="text-center">
                {testResults?.status === 'healthy' && Object.values(manualTests).every(Boolean) ? (
                  <div className="text-green-600 font-medium">
                    🎉 All tests passed! Ready for staging deployment.
                  </div>
                ) : (
                  <div className="text-yellow-600 font-medium">
                    ⚠️ Complete all tests before proceeding to staging.
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
