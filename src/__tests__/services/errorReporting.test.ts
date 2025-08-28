import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { errorReportingService, reportError } from '../errorReporting'

// Mock console.error to avoid noise in tests
const mockConsoleError = vi.fn()
global.console.error = mockConsoleError

describe('ErrorReportingService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    errorReportingService.clearReports()
    
    // Mock process.env for tests
    process.env.NODE_ENV = 'test'
  })
  
  afterEach(() => {
    process.env.NODE_ENV = 'test'
  })

  it('reports errors with basic information', () => {
    const testError = new Error('Test error')
    const errorId = errorReportingService.reportError(testError)
    
    expect(errorId).toMatch(/^err_\d+_[a-z0-9]{6}$/)
    
    const reports = errorReportingService.getRecentReports(1)
    expect(reports).toHaveLength(1)
    expect(reports[0].error.message).toBe('Test error')
    expect(reports[0].severity).toBe('medium')
    expect(reports[0].handled).toBe(true)
  })

  it('reports errors with custom severity and context', () => {
    const testError = new Error('Critical error')
    const context = { userId: 'test123', sessionId: 'session456' }
    
    const errorId = errorReportingService.reportError(testError, 'critical', context, false)
    
    const reports = errorReportingService.getRecentReports(1)
    expect(reports[0].severity).toBe('critical')
    expect(reports[0].handled).toBe(false)
    expect(reports[0].context).toMatchObject(context)
  })

  it('updates and maintains context', () => {
    errorReportingService.updateContext({ userId: 'user123' })
    errorReportingService.updateContext({ sessionId: 'session456' })
    
    const testError = new Error('Context test')
    errorReportingService.reportError(testError)
    
    const reports = errorReportingService.getRecentReports(1)
    expect(reports[0].context.userId).toBe('user123')
    expect(reports[0].context.sessionId).toBe('session456')
  })

  it('limits stored reports to prevent memory issues', () => {
    // Generate more than 100 reports
    for (let i = 0; i < 105; i++) {
      errorReportingService.reportError(new Error(`Error ${i}`))
    }
    
    const allReports = errorReportingService.getRecentReports(200)
    expect(allReports.length).toBe(100) // Should be capped at 100
    
    // Should keep the most recent ones
    expect(allReports[allReports.length - 1].error.message).toBe('Error 104')
  })

  it('generates error statistics', () => {
    errorReportingService.reportError(new Error('Error 1'), 'low')
    errorReportingService.reportError(new Error('Error 2'), 'medium')
    errorReportingService.reportError(new Error('Error 3'), 'high')
    errorReportingService.reportError(new TypeError('Type Error'), 'critical')
    
    const stats = errorReportingService.getErrorStats()
    
    expect(stats.total).toBe(4)
    expect(stats.bySeverity).toEqual({
      low: 1,
      medium: 1,
      high: 1,
      critical: 1
    })
    expect(stats.byType).toEqual({
      Error: 3,
      TypeError: 1
    })
    expect(Array.isArray(stats.recentTrend)).toBe(true)
    expect(stats.recentTrend).toHaveLength(24)
  })

  it('exports reports in a structured format', () => {
    errorReportingService.reportError(new Error('Export test'))
    
    const exported = errorReportingService.exportReports()
    const parsed = JSON.parse(exported)
    
    expect(parsed.exportTime).toBeTypeOf('number')
    expect(parsed.context).toBeTypeOf('object')
    expect(Array.isArray(parsed.reports)).toBe(true)
    expect(parsed.reports[0].error.message).toBe('Export test')
  })

  it('stores error reports in localStorage', () => {
    const testError = new Error('Storage test')
    errorReportingService.reportError(testError)
    
    // Check that something was stored
    const keys = Object.keys(localStorage)
      .filter(key => key.startsWith('error_report_'))
    
    expect(keys.length).toBe(1)
    
    const stored = JSON.parse(localStorage.getItem(keys[0]) || '{}')
    expect(stored.message).toBe('Storage test')
  })

  it('cleans up old localStorage reports', () => {
    // Generate many reports
    for (let i = 0; i < 55; i++) {
      errorReportingService.reportError(new Error(`Cleanup test ${i}`))
    }
    
    // Should keep only 50 reports
    const keys = Object.keys(localStorage)
      .filter(key => key.startsWith('error_report_'))
    
    expect(keys.length).toBe(50)
  })

  it('logs to console in development', () => {
    process.env.NODE_ENV = 'development'
    
    const testError = new Error('Console test')
    errorReportingService.reportError(testError, 'high')
    
    expect(mockConsoleError).toHaveBeenCalledWith(
      expect.stringContaining('[ErrorService] HIGH:'),
      expect.objectContaining({
        message: 'Console test'
      })
    )
  })

  it('provides helper functions', () => {
    const errorId = reportError('Helper test error', 'low', { test: 'context' })
    
    expect(errorId).toMatch(/^err_\d+_[a-z0-9]{6}$/)
    
    const reports = errorReportingService.getRecentReports(1)
    expect(reports[0].error.message).toBe('Helper test error')
    expect(reports[0].severity).toBe('low')
    expect(reports[0].context.test).toBe('context')
  })
})