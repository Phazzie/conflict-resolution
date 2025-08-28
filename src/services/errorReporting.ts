/**
 * Error Reporting Service
 * Provides structured error reporting and logging
 * Can be easily extended with Sentry, LogRocket, or other services
 */

export interface ErrorContext {
  userId?: string
  sessionId?: string
  phase?: string
  userAgent?: string
  url?: string
  timestamp?: number
  buildVersion?: string
  [key: string]: any
}

export interface ErrorReport {
  id: string
  error: Error
  context: ErrorContext
  severity: 'low' | 'medium' | 'high' | 'critical'
  timestamp: number
  handled: boolean
  userId?: string
  sessionId?: string
}

class ErrorReportingService {
  private static instance: ErrorReportingService
  private reports: ErrorReport[] = []
  private context: ErrorContext = {}
  
  static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService()
    }
    return ErrorReportingService.instance
  }
  
  constructor() {
    // Set up global error handlers
    this.setupGlobalHandlers()
    
    // Initialize default context
    this.context = {
      userAgent: navigator.userAgent,
      url: window.location.href,
      buildVersion: '1.0.0', // Should be injected from build
      timestamp: Date.now()
    }
  }
  
  /**
   * Report an error with context
   */
  reportError(
    error: Error, 
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    additionalContext: Partial<ErrorContext> = {},
    handled = true
  ): string {
    const errorId = this.generateErrorId()
    
    const report: ErrorReport = {
      id: errorId,
      error,
      context: { ...this.context, ...additionalContext },
      severity,
      timestamp: Date.now(),
      handled,
      userId: this.context.userId,
      sessionId: this.context.sessionId
    }
    
    // Store report
    this.reports.push(report)
    
    // Keep only last 100 reports to prevent memory issues
    if (this.reports.length > 100) {
      this.reports = this.reports.slice(-100)
    }
    
    // Log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[ErrorService] ${severity.toUpperCase()}:`, {
        id: errorId,
        message: error.message,
        stack: error.stack,
        context: report.context
      })
    }
    
    // Send to external service (placeholder for Sentry, etc.)
    this.sendToExternalService(report)
    
    return errorId
  }
  
  /**
   * Update global context (user session info, etc.)
   */
  updateContext(newContext: Partial<ErrorContext>): void {
    this.context = { ...this.context, ...newContext }
  }
  
  /**
   * Get recent error reports for debugging
   */
  getRecentReports(limit = 10): ErrorReport[] {
    return this.reports.slice(-limit)
  }
  
  /**
   * Clear all stored reports
   */
  clearReports(): void {
    this.reports = []
  }
  
  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number
    bySeverity: Record<string, number>
    byType: Record<string, number>
    recentTrend: number[]
  } {
    const bySeverity: Record<string, number> = {}
    const byType: Record<string, number> = {}
    
    this.reports.forEach(report => {
      bySeverity[report.severity] = (bySeverity[report.severity] || 0) + 1
      byType[report.error.name] = (byType[report.error.name] || 0) + 1
    })
    
    // Simple trend over last 24 hours (hourly buckets)
    const now = Date.now()
    const oneHour = 60 * 60 * 1000
    const recentTrend = Array.from({ length: 24 }, (_, i) => {
      const bucketStart = now - (23 - i) * oneHour
      const bucketEnd = bucketStart + oneHour
      
      return this.reports.filter(r => 
        r.timestamp >= bucketStart && r.timestamp < bucketEnd
      ).length
    })
    
    return {
      total: this.reports.length,
      bySeverity,
      byType,
      recentTrend
    }
  }
  
  /**
   * Export reports for analysis
   */
  exportReports(): string {
    return JSON.stringify({
      exportTime: Date.now(),
      context: this.context,
      reports: this.reports.map(report => ({
        ...report,
        error: {
          name: report.error.name,
          message: report.error.message,
          stack: report.error.stack
        }
      }))
    }, null, 2)
  }
  
  private setupGlobalHandlers(): void {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.reportError(
        new Error(event.message),
        'high',
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        },
        false
      )
    })
    
    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason))
        
      this.reportError(
        error,
        'high',
        { type: 'unhandledPromiseRejection' },
        false
      )
    })
  }
  
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
  }
  
  private async sendToExternalService(report: ErrorReport): Promise<void> {
    try {
      // Placeholder for external error reporting service
      // In production, this would send to Sentry, LogRocket, etc.
      
      // For now, just store in localStorage for debugging
      const key = `error_report_${report.id}`
      localStorage.setItem(key, JSON.stringify({
        id: report.id,
        message: report.error.message,
        stack: report.error.stack,
        severity: report.severity,
        context: report.context,
        timestamp: report.timestamp
      }))
      
      // Clean up old error reports from localStorage
      this.cleanupOldReports()
      
    } catch (error) {
      // Don't let error reporting cause more errors
      console.warn('Failed to send error report:', error)
    }
  }
  
  private cleanupOldReports(): void {
    try {
      const keys = Object.keys(localStorage)
        .filter(key => key.startsWith('error_report_'))
        .sort()
      
      // Keep only the most recent 50 reports
      if (keys.length > 50) {
        const toDelete = keys.slice(0, keys.length - 50)
        toDelete.forEach(key => localStorage.removeItem(key))
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  }
}

// Export the service
export const errorReportingService = ErrorReportingService.getInstance()

// Helper function for easy error reporting
export function reportError(
  error: Error | string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  context: Partial<ErrorContext> = {}
): string {
  const errorObj = error instanceof Error ? error : new Error(error)
  return errorReportingService.reportError(errorObj, severity, context)
}

// Helper for updating context
export function updateErrorContext(context: Partial<ErrorContext>): void {
  errorReportingService.updateContext(context)
}