export enum DatabaseErrorCode {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  TIMEOUT = 'TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  SERVER_ERROR = 'SERVER_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class DatabaseError extends Error {
  public readonly code: DatabaseErrorCode
  public readonly originalError?: Error
  public readonly retryable: boolean
  public readonly statusCode?: number

  constructor(
    message: string,
    code: DatabaseErrorCode,
    originalError?: Error,
    retryable: boolean = false,
    statusCode?: number
  ) {
    super(message)
    this.name = 'DatabaseError'
    this.code = code
    this.originalError = originalError
    this.retryable = retryable
    this.statusCode = statusCode
  }
}

export class ConnectionTimeoutError extends DatabaseError {
  constructor(timeout: number, originalError?: Error) {
    super(
      `Database connection timeout after ${timeout}ms`,
      DatabaseErrorCode.TIMEOUT,
      originalError,
      true
    )
  }
}

export class NetworkError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(
      `Network error: ${message}`,
      DatabaseErrorCode.NETWORK_ERROR,
      originalError,
      true
    )
  }
}

export class AuthenticationError extends DatabaseError {
  constructor(message: string, originalError?: Error) {
    super(
      `Authentication failed: ${message}`,
      DatabaseErrorCode.UNAUTHORIZED,
      originalError,
      false,
      401
    )
  }
}

export function mapSupabaseError(error: any): DatabaseError {
  if (error instanceof DatabaseError) {
    return error
  }

  // Handle network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return new NetworkError('Failed to connect to database', error)
  }

  // Handle timeout errors
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return new ConnectionTimeoutError(30000, error)
  }

  // Handle HTTP status codes
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode

    switch (status) {
      case 400:
        return new DatabaseError(
          error.message || 'Bad request',
          DatabaseErrorCode.VALIDATION_ERROR,
          error,
          false,
          400
        )
      case 401:
        return new AuthenticationError(
          error.message || 'Unauthorized access',
          error
        )
      case 403:
        return new DatabaseError(
          error.message || 'Access forbidden',
          DatabaseErrorCode.FORBIDDEN,
          error,
          false,
          403
        )
      case 404:
        return new DatabaseError(
          error.message || 'Resource not found',
          DatabaseErrorCode.NOT_FOUND,
          error,
          false,
          404
        )
      case 409:
        return new DatabaseError(
          error.message || 'Conflict - resource already exists',
          DatabaseErrorCode.CONFLICT,
          error,
          false,
          409
        )
      case 429:
        return new DatabaseError(
          error.message || 'Rate limit exceeded',
          DatabaseErrorCode.RATE_LIMITED,
          error,
          true,
          429
        )
      case 500:
      case 502:
      case 503:
      case 504:
        return new DatabaseError(
          error.message || 'Server error',
          DatabaseErrorCode.SERVER_ERROR,
          error,
          true,
          status
        )
    }
  }

  // Handle specific Supabase error codes
  if (error.code) {
    switch (error.code) {
      case 'PGRST116':
        return new DatabaseError(
          'Resource not found',
          DatabaseErrorCode.NOT_FOUND,
          error,
          false
        )
      case 'PGRST204':
        return new DatabaseError(
          'Validation error',
          DatabaseErrorCode.VALIDATION_ERROR,
          error,
          false
        )
      case '23505': // PostgreSQL unique violation
        return new DatabaseError(
          'Duplicate entry - resource already exists',
          DatabaseErrorCode.CONFLICT,
          error,
          false
        )
      case '23503': // PostgreSQL foreign key violation
        return new DatabaseError(
          'Invalid reference - related resource does not exist',
          DatabaseErrorCode.VALIDATION_ERROR,
          error,
          false
        )
    }
  }

  // Default case
  return new DatabaseError(
    error.message || 'Unknown database error',
    DatabaseErrorCode.UNKNOWN_ERROR,
    error,
    true
  )
}