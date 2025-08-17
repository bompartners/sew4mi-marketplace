export interface NetworkStatus {
  isOnline: boolean
  isSlowConnection: boolean
  effectiveType: string
  rtt: number
}

export interface RetryOptions {
  maxRetries: number
  baseDelay: number
  maxDelay: number
  retryCondition: (error: any) => boolean
}

export class NetworkService {
  private onlineListeners: Set<(status: NetworkStatus) => void> = new Set()
  private currentStatus: NetworkStatus = {
    isOnline: true,
    isSlowConnection: false,
    effectiveType: '4g',
    rtt: 0
  }

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeNetworkMonitoring()
    }
  }

  private initializeNetworkMonitoring() {
    // Monitor online/offline status
    window.addEventListener('online', this.handleOnline)
    window.addEventListener('offline', this.handleOffline)

    // Monitor connection quality if supported
    if ('connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        connection.addEventListener('change', this.handleConnectionChange)
        this.updateConnectionStatus()
      }
    }

    // Initial status check
    this.updateNetworkStatus()
  }

  private handleOnline = () => {
    this.updateNetworkStatus()
    this.notifyListeners()
  }

  private handleOffline = () => {
    this.updateNetworkStatus()
    this.notifyListeners()
  }

  private handleConnectionChange = () => {
    this.updateConnectionStatus()
    this.notifyListeners()
  }

  private updateNetworkStatus() {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
      this.currentStatus.isOnline = navigator.onLine
    }
  }

  private updateConnectionStatus() {
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      if (connection) {
        this.currentStatus.effectiveType = connection.effectiveType || '4g'
        this.currentStatus.rtt = connection.rtt || 0
        this.currentStatus.isSlowConnection = 
          connection.effectiveType === 'slow-2g' || 
          connection.effectiveType === '2g' ||
          connection.rtt > 1000
      }
    }
  }

  private notifyListeners() {
    this.onlineListeners.forEach(listener => {
      try {
        listener(this.currentStatus)
      } catch (error) {
        console.error('Network status listener error:', error)
      }
    })
  }

  /**
   * Get current network status
   */
  getStatus(): NetworkStatus {
    this.updateNetworkStatus()
    this.updateConnectionStatus()
    return { ...this.currentStatus }
  }

  /**
   * Check if device is online
   */
  isOnline(): boolean {
    return navigator.onLine
  }

  /**
   * Check if connection appears to be slow
   */
  isSlowConnection(): boolean {
    return this.currentStatus.isSlowConnection
  }

  /**
   * Subscribe to network status changes
   */
  subscribe(listener: (status: NetworkStatus) => void): () => void {
    this.onlineListeners.add(listener)
    
    // Return unsubscribe function
    return () => {
      this.onlineListeners.delete(listener)
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const defaultOptions: RetryOptions = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryCondition: (error) => this.isRetryableError(error)
    }

    const config = { ...defaultOptions, ...options }
    let lastError: any

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Check if we're online before attempting
        if (!this.isOnline()) {
          throw new Error('Device is offline')
        }

        return await operation()
      } catch (error) {
        lastError = error
        
        // Don't retry if it's the last attempt or error is not retryable
        if (attempt === config.maxRetries || !config.retryCondition(error)) {
          throw error
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(2, attempt),
          config.maxDelay
        )

        console.warn(`Operation failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms:`, error)

        // Wait before retrying
        await this.delay(delay)
      }
    }

    throw lastError
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false

    const message = error.message?.toLowerCase() || ''
    const status = error.status || error.statusCode

    // Network errors that should be retried
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('timeout') ||
      message.includes('connection') ||
      message.includes('offline')
    ) {
      return true
    }

    // HTTP status codes that should be retried
    if (status === 408 || status === 429 || status >= 500) {
      return true
    }

    return false
  }

  /**
   * Create delay promise
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Enhanced fetch with retry logic
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    return this.withRetry(async () => {
      if (!this.isOnline()) {
        throw new Error('No internet connection. Please check your network and try again.')
      }

      const response = await fetch(url, {
        ...options,
        // Add timeout for slow connections
        signal: this.isSlowConnection() ? 
          AbortSignal.timeout(30000) : // 30s for slow connections
          AbortSignal.timeout(10000)   // 10s for normal connections
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    }, {
      maxRetries: this.isSlowConnection() ? 5 : 3,
      baseDelay: this.isSlowConnection() ? 2000 : 1000
    })
  }

  /**
   * Cleanup event listeners
   */
  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline)
      window.removeEventListener('offline', this.handleOffline)

      if ('connection' in navigator) {
        const connection = (navigator as any).connection
        if (connection) {
          connection.removeEventListener('change', this.handleConnectionChange)
        }
      }
    }

    this.onlineListeners.clear()
  }
}

// Singleton instance
export const networkService = new NetworkService()

// Hook for React components
export function useNetworkStatus() {
  // Start with default values to avoid SSR hydration mismatch
  const [status, setStatus] = React.useState<NetworkStatus>({
    isOnline: true,
    isSlowConnection: false,
    effectiveType: '4g',
    rtt: 0
  })

  React.useEffect(() => {
    // Set initial status after component mounts (client-side only)
    setStatus(networkService.getStatus())
    
    const unsubscribe = networkService.subscribe(setStatus)
    return unsubscribe
  }, [])

  return status
}

// React import for the hook
import React from 'react'