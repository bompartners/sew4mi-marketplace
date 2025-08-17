import { DatabaseError, mapSupabaseError } from './errors'

export interface RetryOptions {
  maxAttempts: number
  baseDelayMs: number
  maxDelayMs: number
  backoffFactor: number
  retryCondition?: (error: DatabaseError) => boolean
  onRetry?: (error: DatabaseError, attempt: number) => void
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  backoffFactor: 2,
  retryCondition: (error) => error.retryable,
  onRetry: (error, attempt) => {
    console.warn(`Database operation retry attempt ${attempt}: ${error.message}`)
  }
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options }
  let lastError: DatabaseError | null = null

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const dbError = mapSupabaseError(error)
      lastError = dbError

      // Don't retry if this is the last attempt
      if (attempt === config.maxAttempts) {
        break
      }

      // Don't retry if the error is not retryable
      if (!config.retryCondition!(dbError)) {
        throw dbError
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelayMs
      )

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000

      config.onRetry?.(dbError, attempt)

      await new Promise(resolve => setTimeout(resolve, jitteredDelay))
    }
  }

  throw lastError
}

export class CircuitBreaker {
  private failureCount = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly timeoutMs: number = 60000,
    private readonly monitoringPeriodMs: number = 10000
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeoutMs) {
        this.state = 'HALF_OPEN'
      } else {
        throw new DatabaseError(
          'Circuit breaker is open - database appears to be down',
          'CONNECTION_FAILED' as any,
          undefined,
          true
        )
      }
    }

    try {
      const result = await operation()
      
      if (this.state === 'HALF_OPEN' || this.failureCount > 0) {
        this.reset()
      }
      
      return result
    } catch (error) {
      const dbError = mapSupabaseError(error)
      this.recordFailure()
      throw dbError
    }
  }

  private recordFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
      console.error(
        `Circuit breaker opened after ${this.failureCount} failures. ` +
        `Will retry after ${this.timeoutMs}ms`
      )
    }
  }

  private reset(): void {
    this.failureCount = 0
    this.state = 'CLOSED'
    console.info('Circuit breaker reset - connection restored')
  }

  getState(): string {
    return this.state
  }

  getFailureCount(): number {
    return this.failureCount
  }
}

// Global circuit breaker instance
export const globalCircuitBreaker = new CircuitBreaker()