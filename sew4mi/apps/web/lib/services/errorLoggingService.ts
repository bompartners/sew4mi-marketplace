export interface ErrorLog {
  id: string
  type: 'authentication' | 'network' | 'validation' | 'server' | 'client' | 'boundary'
  level: 'info' | 'warn' | 'error' | 'critical'
  message: string
  details?: any
  stack?: string
  timestamp: string
  userId?: string
  sessionId?: string
  userAgent: string
  url: string
  additionalContext?: Record<string, any>
}

export interface ErrorMetrics {
  totalErrors: number
  errorsByType: Record<string, number>
  errorsByLevel: Record<string, number>
  recentErrors: ErrorLog[]
}

export class ErrorLoggingService {
  private logs: ErrorLog[] = []
  private maxLogs = 1000 // Keep last 1000 errors in memory
  private sessionId: string

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeErrorHandlers()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private initializeErrorHandlers() {
    if (typeof window !== 'undefined') {
      // Catch unhandled errors
      window.addEventListener('error', (event) => {
        this.logError({
          type: 'client',
          level: 'error',
          message: event.message,
          details: {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno,
            error: event.error
          },
          stack: event.error?.stack
        })
      })

      // Catch unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.logError({
          type: 'client',
          level: 'error',
          message: `Unhandled Promise Rejection: ${event.reason}`,
          details: { reason: event.reason },
          stack: event.reason?.stack
        })
      })
    }
  }

  /**
   * Log an error with context
   */
  logError(error: Partial<ErrorLog> & { message: string; type: ErrorLog['type']; level: ErrorLog['level'] }): string {
    const id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const errorLog: ErrorLog = {
      id,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      ...error
    }

    // Add to memory
    this.logs.push(errorLog)
    
    // Trim logs if too many
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs)
    }

    // Log to console based on level
    const consoleMethod = errorLog.level === 'critical' ? 'error' : 
                         errorLog.level === 'error' ? 'error' :
                         errorLog.level === 'warn' ? 'warn' : 'info'
    
    console[consoleMethod](`[${errorLog.level.toUpperCase()}] ${errorLog.type}:`, errorLog.message, errorLog.details)

    // Send to external service in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.sendToExternalService(errorLog)
    }

    return id
  }

  /**
   * Log authentication specific errors
   */
  logAuthError(message: string, details?: any, level: ErrorLog['level'] = 'error'): string {
    return this.logError({
      type: 'authentication',
      level,
      message,
      details,
      additionalContext: {
        component: 'auth',
        timestamp: Date.now()
      }
    })
  }

  /**
   * Log network errors
   */
  logNetworkError(message: string, details?: any): string {
    return this.logError({
      type: 'network',
      level: 'error',
      message,
      details,
      additionalContext: {
        networkStatus: typeof navigator !== 'undefined' && 'onLine' in navigator ? navigator.onLine : 'unknown',
        connectionType: this.getConnectionType()
      }
    })
  }

  /**
   * Log validation errors
   */
  logValidationError(message: string, details?: any): string {
    return this.logError({
      type: 'validation',
      level: 'warn',
      message,
      details
    })
  }

  /**
   * Log server errors
   */
  logServerError(message: string, details?: any): string {
    return this.logError({
      type: 'server',
      level: 'error',
      message,
      details
    })
  }

  /**
   * Set user context for subsequent logs
   */
  setUserContext(userId: string, additionalContext?: Record<string, any>) {
    // Update future logs with user context
    this.logs.forEach(log => {
      if (!log.userId) {
        log.userId = userId
        if (additionalContext) {
          log.additionalContext = { ...log.additionalContext, ...additionalContext }
        }
      }
    })
  }

  /**
   * Get error metrics
   */
  getMetrics(): ErrorMetrics {
    const errorsByType: Record<string, number> = {}
    const errorsByLevel: Record<string, number> = {}

    this.logs.forEach(log => {
      errorsByType[log.type] = (errorsByType[log.type] || 0) + 1
      errorsByLevel[log.level] = (errorsByLevel[log.level] || 0) + 1
    })

    return {
      totalErrors: this.logs.length,
      errorsByType,
      errorsByLevel,
      recentErrors: this.logs.slice(-10) // Last 10 errors
    }
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: ErrorLog['type']): ErrorLog[] {
    return this.logs.filter(log => log.type === type)
  }

  /**
   * Get recent errors
   */
  getRecentErrors(count = 10): ErrorLog[] {
    return this.logs.slice(-count)
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = []
  }

  /**
   * Export logs for debugging
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2)
  }

  private getConnectionType(): string {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      return connection?.effectiveType || 'unknown'
    }
    return 'unknown'
  }

  private async sendToExternalService(errorLog: ErrorLog) {
    try {
      // Send to error tracking API
      await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorLog)
      })
    } catch (error) {
      // Silently fail - don't create infinite error loops
      console.warn('Failed to send error to external service:', error)
    }
  }

  /**
   * Check if error rate is high (for alerting)
   */
  isErrorRateHigh(): boolean {
    const recentErrors = this.logs.filter(log => {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
      return new Date(log.timestamp).getTime() > fiveMinutesAgo
    })

    return recentErrors.length > 10 // More than 10 errors in 5 minutes
  }

  /**
   * Get error summary for user feedback
   */
  getErrorSummary(): string {
    const metrics = this.getMetrics()
    const criticalErrors = this.logs.filter(log => log.level === 'critical').length
    
    if (criticalErrors > 0) {
      return `We're experiencing technical difficulties. Our team has been notified and is working on a fix.`
    }

    if (metrics.errorsByType.network > 0) {
      return `Connection issues detected. Please check your internet connection.`
    }

    if (metrics.errorsByType.authentication > 3) {
      return `Multiple authentication issues detected. Please try refreshing the page or contact support.`
    }

    return `Some errors occurred, but the system is generally stable.`
  }
}

// Singleton instance
export const errorLogger = new ErrorLoggingService()

// React hook for error logging
export function useErrorLogging() {
  return {
    logError: errorLogger.logError.bind(errorLogger),
    logAuthError: errorLogger.logAuthError.bind(errorLogger),
    logNetworkError: errorLogger.logNetworkError.bind(errorLogger),
    logValidationError: errorLogger.logValidationError.bind(errorLogger),
    logServerError: errorLogger.logServerError.bind(errorLogger),
    setUserContext: errorLogger.setUserContext.bind(errorLogger),
    getMetrics: errorLogger.getMetrics.bind(errorLogger),
    getErrorSummary: errorLogger.getErrorSummary.bind(errorLogger)
  }
}