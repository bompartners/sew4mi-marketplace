import { describe, it, expect } from 'vitest'
import { 
  DatabaseError, 
  DatabaseErrorCode, 
  ConnectionTimeoutError,
  NetworkError,
  AuthenticationError,
  mapSupabaseError 
} from '../../../../lib/supabase/errors'

describe('Database Error Handling', () => {
  describe('DatabaseError', () => {
    it('should create error with correct properties', () => {
      const error = new DatabaseError(
        'Test error',
        DatabaseErrorCode.CONNECTION_FAILED,
        new Error('Original error'),
        true,
        500
      )

      expect(error.message).toBe('Test error')
      expect(error.code).toBe(DatabaseErrorCode.CONNECTION_FAILED)
      expect(error.retryable).toBe(true)
      expect(error.statusCode).toBe(500)
      expect(error.originalError).toBeInstanceOf(Error)
      expect(error.name).toBe('DatabaseError')
    })

    it('should default retryable to false', () => {
      const error = new DatabaseError(
        'Test error',
        DatabaseErrorCode.VALIDATION_ERROR
      )

      expect(error.retryable).toBe(false)
    })
  })

  describe('ConnectionTimeoutError', () => {
    it('should create timeout error with correct properties', () => {
      const originalError = new Error('Timeout')
      const error = new ConnectionTimeoutError(5000, originalError)

      expect(error.message).toBe('Database connection timeout after 5000ms')
      expect(error.code).toBe(DatabaseErrorCode.TIMEOUT)
      expect(error.retryable).toBe(true)
      expect(error.originalError).toBe(originalError)
    })
  })

  describe('NetworkError', () => {
    it('should create network error with correct properties', () => {
      const originalError = new Error('Network failure')
      const error = new NetworkError('Connection refused', originalError)

      expect(error.message).toBe('Network error: Connection refused')
      expect(error.code).toBe(DatabaseErrorCode.NETWORK_ERROR)
      expect(error.retryable).toBe(true)
      expect(error.originalError).toBe(originalError)
    })
  })

  describe('AuthenticationError', () => {
    it('should create auth error with correct properties', () => {
      const originalError = new Error('Invalid token')
      const error = new AuthenticationError('Token expired', originalError)

      expect(error.message).toBe('Authentication failed: Token expired')
      expect(error.code).toBe(DatabaseErrorCode.UNAUTHORIZED)
      expect(error.retryable).toBe(false)
      expect(error.statusCode).toBe(401)
      expect(error.originalError).toBe(originalError)
    })
  })

  describe('mapSupabaseError', () => {
    it('should return DatabaseError as-is', () => {
      const dbError = new DatabaseError('Test', DatabaseErrorCode.CONFLICT)
      const result = mapSupabaseError(dbError)

      expect(result).toBe(dbError)
    })

    it('should map network fetch errors', () => {
      const fetchError = new TypeError('fetch failed')
      const result = mapSupabaseError(fetchError)

      expect(result).toBeInstanceOf(NetworkError)
      expect(result.message).toContain('Failed to connect to database')
      expect(result.code).toBe(DatabaseErrorCode.NETWORK_ERROR)
      expect(result.retryable).toBe(true)
    })

    it('should map timeout errors', () => {
      const timeoutError = new Error('Operation timeout')
      timeoutError.name = 'AbortError'
      const result = mapSupabaseError(timeoutError)

      expect(result).toBeInstanceOf(ConnectionTimeoutError)
      expect(result.code).toBe(DatabaseErrorCode.TIMEOUT)
      expect(result.retryable).toBe(true)
    })

    it('should map HTTP status codes', () => {
      const testCases = [
        { status: 400, expectedCode: DatabaseErrorCode.VALIDATION_ERROR, retryable: false },
        { status: 401, expectedCode: DatabaseErrorCode.UNAUTHORIZED, retryable: false },
        { status: 403, expectedCode: DatabaseErrorCode.FORBIDDEN, retryable: false },
        { status: 404, expectedCode: DatabaseErrorCode.NOT_FOUND, retryable: false },
        { status: 409, expectedCode: DatabaseErrorCode.CONFLICT, retryable: false },
        { status: 429, expectedCode: DatabaseErrorCode.RATE_LIMITED, retryable: true },
        { status: 500, expectedCode: DatabaseErrorCode.SERVER_ERROR, retryable: true },
        { status: 502, expectedCode: DatabaseErrorCode.SERVER_ERROR, retryable: true },
        { status: 503, expectedCode: DatabaseErrorCode.SERVER_ERROR, retryable: true },
        { status: 504, expectedCode: DatabaseErrorCode.SERVER_ERROR, retryable: true },
      ]

      testCases.forEach(({ status, expectedCode, retryable }) => {
        const httpError = { status, message: `HTTP ${status} error` }
        const result = mapSupabaseError(httpError)

        expect(result.code).toBe(expectedCode)
        expect(result.retryable).toBe(retryable)
        expect(result.statusCode).toBe(status)
      })
    })

    it('should map Supabase error codes', () => {
      const testCases = [
        { code: 'PGRST116', expectedCode: DatabaseErrorCode.NOT_FOUND },
        { code: 'PGRST204', expectedCode: DatabaseErrorCode.VALIDATION_ERROR },
        { code: '23505', expectedCode: DatabaseErrorCode.CONFLICT }, // PostgreSQL unique violation
        { code: '23503', expectedCode: DatabaseErrorCode.VALIDATION_ERROR }, // PostgreSQL foreign key violation
      ]

      testCases.forEach(({ code, expectedCode }) => {
        const supabaseError = { code, message: `Supabase error ${code}` }
        const result = mapSupabaseError(supabaseError)

        expect(result.code).toBe(expectedCode)
      })
    })

    it('should handle unknown errors', () => {
      const unknownError = { message: 'Something went wrong' }
      const result = mapSupabaseError(unknownError)

      expect(result.code).toBe(DatabaseErrorCode.UNKNOWN_ERROR)
      expect(result.retryable).toBe(true)
      expect(result.message).toBe('Something went wrong')
    })

    it('should handle errors without messages', () => {
      const errorWithoutMessage = {}
      const result = mapSupabaseError(errorWithoutMessage)

      expect(result.code).toBe(DatabaseErrorCode.UNKNOWN_ERROR)
      expect(result.message).toBe('Unknown database error')
    })

    it('should preserve error details in mapping', () => {
      const originalError = { 
        status: 400, 
        message: 'Validation failed', 
        details: 'Invalid email format' 
      }
      const result = mapSupabaseError(originalError)

      expect(result.originalError).toBe(originalError)
      expect(result.code).toBe(DatabaseErrorCode.VALIDATION_ERROR)
      expect(result.statusCode).toBe(400)
    })
  })
})