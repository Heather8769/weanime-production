/**
 * @jest-environment jsdom
 */

import { errorLogger, logReactError, useErrorLogger } from '../error-logger'

// Mock fetch
global.fetch = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => 1000),
    getEntriesByType: jest.fn(() => []),
    getEntriesByName: jest.fn(() => []),
    memory: {
      usedJSHeapSize: 1000000
    }
  }
})

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Test Browser)',
    connection: {
      effectiveType: '4g'
    }
  }
})

describe('ErrorLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue('[]')
    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })
  })

  afterEach(() => {
    errorLogger.clearLogs()
  })

  describe('Error Logging', () => {
    it('logs error with correct structure', () => {
      const consoleSpy = jest.spyOn(console, 'group').mockImplementation()
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
      const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation()

      errorLogger.logError({
        message: 'Test error',
        component: 'TestComponent',
        action: 'test_action',
        metadata: { key: 'value' }
      })

      const logs = errorLogger.getLogs()
      expect(logs).toHaveLength(1)
      
      const log = logs[0]
      expect(log.level).toBe('error')
      expect(log.message).toBe('Test error')
      expect(log.context.component).toBe('TestComponent')
      expect(log.context.action).toBe('test_action')
      expect(log.context.metadata).toEqual({ key: 'value' })
      expect(log.resolved).toBe(false)
      expect(log.tags).toContain('error')
      expect(log.tags).toContain('component:TestComponent')
      expect(log.tags).toContain('action:test_action')

      consoleSpy.mockRestore()
      consoleLogSpy.mockRestore()
      consoleGroupEndSpy.mockRestore()
    })

    it('logs warning with correct level', () => {
      errorLogger.logWarn({
        message: 'Test warning',
        component: 'TestComponent'
      })

      const logs = errorLogger.getLogs({ level: 'warn' })
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('warn')
    })

    it('logs info with correct level', () => {
      errorLogger.logInfo({
        message: 'Test info',
        component: 'TestComponent'
      })

      const logs = errorLogger.getLogs({ level: 'info' })
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('info')
    })

    it('logs debug only in development', () => {
      const originalEnv = process.env.NODE_ENV
      
      // Test production (should not log debug)
      process.env.NODE_ENV = 'production'
      errorLogger.logDebug({
        message: 'Debug message',
        component: 'TestComponent'
      })
      
      let logs = errorLogger.getLogs({ level: 'debug' })
      expect(logs).toHaveLength(0)

      // Test development (should log debug)
      process.env.NODE_ENV = 'development'
      errorLogger.logDebug({
        message: 'Debug message',
        component: 'TestComponent'
      })
      
      logs = errorLogger.getLogs({ level: 'debug' })
      expect(logs).toHaveLength(1)

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Log Filtering', () => {
    beforeEach(() => {
      errorLogger.logError({ message: 'Error 1', component: 'ComponentA' })
      errorLogger.logWarn({ message: 'Warning 1', component: 'ComponentB' })
      errorLogger.logInfo({ message: 'Info 1', component: 'ComponentA' })
    })

    it('filters logs by level', () => {
      const errorLogs = errorLogger.getLogs({ level: 'error' })
      expect(errorLogs).toHaveLength(1)
      expect(errorLogs[0].message).toBe('Error 1')

      const warnLogs = errorLogger.getLogs({ level: 'warn' })
      expect(warnLogs).toHaveLength(1)
      expect(warnLogs[0].message).toBe('Warning 1')
    })

    it('filters logs by component', () => {
      const componentALogs = errorLogger.getLogs({ component: 'ComponentA' })
      expect(componentALogs).toHaveLength(2)
      expect(componentALogs.map(log => log.message)).toEqual(['Info 1', 'Error 1'])

      const componentBLogs = errorLogger.getLogs({ component: 'ComponentB' })
      expect(componentBLogs).toHaveLength(1)
      expect(componentBLogs[0].message).toBe('Warning 1')
    })

    it('filters logs by resolved status', () => {
      const logs = errorLogger.getLogs()
      const logId = logs[0].id
      
      errorLogger.markResolved(logId)
      
      const unresolvedLogs = errorLogger.getLogs({ resolved: false })
      const resolvedLogs = errorLogger.getLogs({ resolved: true })
      
      expect(unresolvedLogs).toHaveLength(2)
      expect(resolvedLogs).toHaveLength(1)
    })

    it('filters logs by time range', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

      const recentLogs = errorLogger.getLogs({
        timeRange: { start: oneHourAgo, end: oneHourFromNow }
      })

      expect(recentLogs).toHaveLength(3) // All logs should be within this range
    })
  })

  describe('Error Summary', () => {
    beforeEach(() => {
      errorLogger.logError({ message: 'Error 1', component: 'ComponentA' })
      errorLogger.logError({ message: 'Error 2', component: 'ComponentB' })
      errorLogger.logWarn({ message: 'Warning 1', component: 'ComponentA' })
      errorLogger.logInfo({ message: 'Info 1', component: 'ComponentC' })
    })

    it('generates correct error summary', () => {
      const summary = errorLogger.getErrorSummary()

      expect(summary.total).toBe(4)
      expect(summary.byLevel).toEqual({
        error: 2,
        warn: 1,
        info: 1
      })
      expect(summary.byComponent).toEqual({
        ComponentA: 2,
        ComponentB: 1,
        ComponentC: 1
      })
      expect(summary.unresolved).toBe(2) // Only errors are counted as unresolved
    })
  })

  describe('Persistence', () => {
    it('persists logs to localStorage', () => {
      errorLogger.logError({
        message: 'Test error',
        component: 'TestComponent'
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'weanime_error_logs',
        expect.stringContaining('Test error')
      )
    })

    it('sends logs to backend API', async () => {
      errorLogger.logError({
        message: 'Test error',
        component: 'TestComponent'
      })

      await new Promise(resolve => setTimeout(resolve, 0)) // Wait for async call

      expect(fetch).toHaveBeenCalledWith('/api/monitoring/error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test error')
      })
    })

    it('handles API failures gracefully', async () => {
      ;(fetch as jest.Mock).mockRejectedValue(new Error('API Error'))
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      errorLogger.logError({
        message: 'Test error',
        component: 'TestComponent'
      })

      await new Promise(resolve => setTimeout(resolve, 0))

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to send log to backend:',
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe('Performance Monitoring', () => {
    it('captures performance data with logs', () => {
      errorLogger.logError({
        message: 'Test error',
        component: 'TestComponent'
      })

      const logs = errorLogger.getLogs()
      const log = logs[0]

      expect(log.performance).toBeDefined()
      expect(log.performance?.memory).toBe(1000000)
      expect(log.performance?.timing).toBe(1000)
      expect(log.performance?.networkSpeed).toBe('4g')
    })

    it('logs performance metrics', () => {
      const consoleSpy = jest.spyOn(console, 'group').mockImplementation()
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
      const consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation()

      // Simulate performance metric logging
      errorLogger.logInfo({
        message: 'Performance Metric: LCP',
        component: 'Performance',
        action: 'metric_capture',
        metadata: { metric: 'LCP', value: 1500, threshold: 2500 }
      })

      const logs = errorLogger.getLogs({ component: 'Performance' })
      expect(logs).toHaveLength(1)
      expect(logs[0].context.metadata?.metric).toBe('LCP')

      consoleSpy.mockRestore()
      consoleLogSpy.mockRestore()
      consoleGroupEndSpy.mockRestore()
    })
  })

  describe('Export and Clear', () => {
    beforeEach(() => {
      errorLogger.logError({ message: 'Error 1' })
      errorLogger.logWarn({ message: 'Warning 1' })
    })

    it('exports logs as JSON', () => {
      const exportData = errorLogger.exportLogs()
      const parsedData = JSON.parse(exportData)

      expect(Array.isArray(parsedData)).toBe(true)
      expect(parsedData).toHaveLength(2)
      expect(parsedData[0].message).toBe('Warning 1')
      expect(parsedData[1].message).toBe('Error 1')
    })

    it('clears all logs', () => {
      expect(errorLogger.getLogs()).toHaveLength(2)

      errorLogger.clearLogs()

      expect(errorLogger.getLogs()).toHaveLength(0)
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('weanime_error_logs')
    })
  })

  describe('React Integration', () => {
    it('logs React errors correctly', () => {
      const error = new Error('React component error')
      const errorInfo = {
        componentStack: '\n    in TestComponent\n    in App'
      }

      logReactError(error, errorInfo, 'TestComponent')

      const logs = errorLogger.getLogs()
      expect(logs).toHaveLength(1)
      
      const log = logs[0]
      expect(log.message).toBe('React component error')
      expect(log.stack).toBe(error.stack)
      expect(log.context.component).toBe('TestComponent')
      expect(log.context.action).toBe('component_error')
      expect(log.context.metadata?.errorInfo).toEqual(errorInfo)
    })
  })

  describe('Hook Integration', () => {
    it('provides error logging functions through hook', () => {
      const { logError, logWarn, logInfo, logDebug, getLogs, getErrorSummary } = useErrorLogger()

      expect(typeof logError).toBe('function')
      expect(typeof logWarn).toBe('function')
      expect(typeof logInfo).toBe('function')
      expect(typeof logDebug).toBe('function')
      expect(typeof getLogs).toBe('function')
      expect(typeof getErrorSummary).toBe('function')
    })
  })
})
