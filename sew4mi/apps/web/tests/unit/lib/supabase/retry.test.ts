import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withRetry, CircuitBreaker, DEFAULT_RETRY_OPTIONS } from '../../../../lib/supabase/retry'
import { DatabaseError } from '../../../../lib/supabase/errors'

describe('Retry Mechanism', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success')
      
      const result = await withRetry(operation)
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should retry on retryable errors', async () => {
      const retryableError = new DatabaseError(
        'Connection timeout',
        'TIMEOUT' as any,
        undefined,
        true
      )
      
      const operation = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success')
      
      const result = await withRetry(operation, { 
        maxAttempts: 3,
        baseDelayMs: 10 // Reduce delay for testing
      })
      
      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new DatabaseError(
        'Validation error',
        'VALIDATION_ERROR' as any,
        undefined,
        false
      )
      
      const operation = vi.fn().mockRejectedValue(nonRetryableError)
      
      await expect(withRetry(operation)).rejects.toThrow('Validation error')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should fail after max attempts', async () => {
      const retryableError = new DatabaseError(
        'Server error',
        'SERVER_ERROR' as any,
        undefined,
        true
      )
      
      const operation = vi.fn().mockRejectedValue(retryableError)
      
      await expect(withRetry(operation, { 
        maxAttempts: 2,
        baseDelayMs: 10
      })).rejects.toThrow('Server error')
      
      expect(operation).toHaveBeenCalledTimes(2)
    })

    it('should apply exponential backoff', async () => {
      const retryableError = new DatabaseError(
        'Connection timeout',
        'TIMEOUT' as any,
        undefined,
        true
      )
      
      const operation = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success')
      
      const startTime = Date.now()
      
      await withRetry(operation, { 
        maxAttempts: 3,
        baseDelayMs: 100,
        backoffFactor: 2
      })
      
      const endTime = Date.now()
      const totalTime = endTime - startTime
      
      // Should have waited at least 100ms + 200ms = 300ms
      expect(totalTime).toBeGreaterThan(200)
      expect(operation).toHaveBeenCalledTimes(3)
    })

    it('should call onRetry callback', async () => {
      const retryableError = new DatabaseError(
        'Connection timeout',
        'TIMEOUT' as any,
        undefined,
        true
      )
      
      const operation = vi.fn()
        .mockRejectedValueOnce(retryableError)
        .mockResolvedValue('success')
      
      const onRetry = vi.fn()
      
      await withRetry(operation, { 
        maxAttempts: 2,
        baseDelayMs: 10,
        onRetry
      })
      
      expect(onRetry).toHaveBeenCalledWith(retryableError, 1)
    })
  })

  describe('CircuitBreaker', () => {
    it('should allow operations when closed', async () => {
      const circuitBreaker = new CircuitBreaker(3, 1000)
      const operation = vi.fn().mockResolvedValue('success')
      
      const result = await circuitBreaker.execute(operation)
      
      expect(result).toBe('success')
      expect(circuitBreaker.getState()).toBe('CLOSED')
    })

    it('should open after failure threshold', async () => {
      const circuitBreaker = new CircuitBreaker(2, 1000) // 2 failures threshold
      const error = new DatabaseError('Server error', 'SERVER_ERROR' as any, undefined, true)
      const operation = vi.fn().mockRejectedValue(error)
      
      // First failure
      await expect(circuitBreaker.execute(operation)).rejects.toThrow()
      expect(circuitBreaker.getState()).toBe('CLOSED')
      
      // Second failure - should open circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow()
      expect(circuitBreaker.getState()).toBe('OPEN')
      
      // Third attempt should fail immediately due to open circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is open')
    })

    it('should transition to half-open after timeout', async () => {
      const circuitBreaker = new CircuitBreaker(1, 100) // 100ms timeout
      const error = new DatabaseError('Server error', 'SERVER_ERROR' as any, undefined, true)
      const operation = vi.fn().mockRejectedValue(error)
      
      // Cause circuit to open
      await expect(circuitBreaker.execute(operation)).rejects.toThrow()
      expect(circuitBreaker.getState()).toBe('OPEN')
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Next call should transition to half-open and attempt operation
      const successOperation = vi.fn().mockResolvedValue('success')
      const result = await circuitBreaker.execute(successOperation)
      
      expect(result).toBe('success')
      expect(circuitBreaker.getState()).toBe('CLOSED')
    })

    it('should reset failure count on successful operation', async () => {
      const circuitBreaker = new CircuitBreaker(2, 1000)
      const error = new DatabaseError('Server error', 'SERVER_ERROR' as any, undefined, true)
      const failingOperation = vi.fn().mockRejectedValue(error)
      const successOperation = vi.fn().mockResolvedValue('success')
      
      // One failure
      await expect(circuitBreaker.execute(failingOperation)).rejects.toThrow()
      expect(circuitBreaker.getFailureCount()).toBe(1)
      
      // Success should reset count
      await circuitBreaker.execute(successOperation)
      expect(circuitBreaker.getFailureCount()).toBe(0)
      expect(circuitBreaker.getState()).toBe('CLOSED')
    })
  })
})