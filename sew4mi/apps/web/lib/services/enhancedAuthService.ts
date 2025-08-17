import { authService } from '@/services/auth.service'
import { networkService } from './networkService'
import { errorLogger } from './errorLoggingService'
import type { RegistrationInput, ProfileUpdateInput } from '@sew4mi/shared/schemas/auth.schema'

export interface AuthErrorWithContext extends Error {
  code?: string
  statusCode?: number
  isRetryable?: boolean
  userFriendlyMessage?: string
  context?: Record<string, any>
}

export class EnhancedAuthService {
  /**
   * Enhanced registration with error handling and retry logic
   */
  async register(data: RegistrationInput): Promise<any> {
    const operationId = `register_${Date.now()}`
    
    try {
      errorLogger.logAuthError(`Registration attempt started`, { 
        operationId, 
        identifierType: data.identifierType, 
        role: data.role 
      }, 'info')

      const result = await networkService.withRetry(
        () => authService.register(data),
        {
          maxRetries: 2,
          retryCondition: (error) => this.isRetryableAuthError(error)
        }
      )

      errorLogger.logAuthError(`Registration successful`, { 
        operationId, 
        requiresVerification: result.requiresVerification 
      }, 'info')

      return result
    } catch (error) {
      const enhancedError = this.enhanceAuthError(error as Error, 'registration')
      
      errorLogger.logAuthError(`Registration failed: ${enhancedError.message}`, {
        operationId,
        errorCode: enhancedError.code,
        isRetryable: enhancedError.isRetryable,
        identifierType: data.identifierType,
        originalError: error
      })

      throw enhancedError
    }
  }

  /**
   * Enhanced sign in with error handling
   */
  async signIn(credential: string, password: string, rememberMe: boolean = false): Promise<any> {
    const operationId = `signin_${Date.now()}`
    
    try {
      errorLogger.logAuthError(`Sign in attempt started`, { 
        operationId, 
        credentialType: credential.includes('@') ? 'email' : 'phone',
        rememberMe 
      }, 'info')

      const result = await networkService.withRetry(
        () => authService.signIn(credential, password, rememberMe),
        {
          maxRetries: 1, // Limited retries for auth to avoid account lockout
          retryCondition: (error) => this.isNetworkError(error)
        }
      )

      if (result.success) {
        errorLogger.logAuthError(`Sign in successful`, { operationId }, 'info')
      } else {
        const enhancedError = this.enhanceAuthError(new Error(result.error || 'Sign in failed'), 'signin')
        errorLogger.logAuthError(`Sign in failed: ${result.error}`, { operationId })
      }

      return result
    } catch (error) {
      const enhancedError = this.enhanceAuthError(error as Error, 'signin')
      
      errorLogger.logAuthError(`Sign in error: ${enhancedError.message}`, {
        operationId,
        errorCode: enhancedError.code,
        credentialType: credential.includes('@') ? 'email' : 'phone'
      })

      throw enhancedError
    }
  }

  /**
   * Enhanced OTP verification
   */
  async verifyOTP(identifier: string, otp: string, type: 'email' | 'phone'): Promise<any> {
    const operationId = `verify_otp_${Date.now()}`
    
    try {
      errorLogger.logAuthError(`OTP verification started`, { operationId, type }, 'info')

      const result = await networkService.withRetry(
        () => authService.verifyOTP({ identifier, otp, type }),
        {
          maxRetries: 1,
          retryCondition: (error) => this.isNetworkError(error)
        }
      )

      errorLogger.logAuthError(`OTP verification successful`, { operationId }, 'info')
      return result
    } catch (error) {
      const enhancedError = this.enhanceAuthError(error as Error, 'otp_verification')
      
      errorLogger.logAuthError(`OTP verification failed: ${enhancedError.message}`, {
        operationId,
        type,
        otpLength: otp.length
      })

      throw enhancedError
    }
  }

  /**
   * Enhanced password reset request
   */
  async requestPasswordReset(identifier: string): Promise<any> {
    const operationId = `reset_request_${Date.now()}`
    
    try {
      errorLogger.logAuthError(`Password reset request started`, { operationId }, 'info')

      const result = await networkService.withRetry(
        () => authService.requestPasswordReset({ identifier }),
        {
          maxRetries: 2,
          retryCondition: (error) => this.isRetryableAuthError(error)
        }
      )

      errorLogger.logAuthError(`Password reset request successful`, { operationId }, 'info')
      return result
    } catch (error) {
      const enhancedError = this.enhanceAuthError(error as Error, 'password_reset_request')
      
      errorLogger.logAuthError(`Password reset request failed: ${enhancedError.message}`, {
        operationId,
        identifier: identifier.includes('@') ? 'email' : 'phone'
      })

      throw enhancedError
    }
  }

  /**
   * Enhanced password reset
   */
  async resetPassword(password: string): Promise<any> {
    const operationId = `reset_password_${Date.now()}`
    
    try {
      errorLogger.logAuthError(`Password reset started`, { operationId }, 'info')

      const result = await networkService.withRetry(
        () => authService.resetPassword({ password, confirmPassword: password, token: '' }),
        {
          maxRetries: 2,
          retryCondition: (error) => this.isRetryableAuthError(error)
        }
      )

      errorLogger.logAuthError(`Password reset successful`, { operationId }, 'info')
      return result
    } catch (error) {
      const enhancedError = this.enhanceAuthError(error as Error, 'password_reset')
      
      errorLogger.logAuthError(`Password reset failed: ${enhancedError.message}`, { operationId })

      throw enhancedError
    }
  }

  /**
   * Enhanced profile update
   */
  async updateProfile(data: ProfileUpdateInput): Promise<any> {
    const operationId = `profile_update_${Date.now()}`
    
    try {
      errorLogger.logAuthError(`Profile update started`, { operationId }, 'info')

      const response = await networkService.fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      errorLogger.logAuthError(`Profile update successful`, { operationId }, 'info')
      return result
    } catch (error) {
      const enhancedError = this.enhanceAuthError(error as Error, 'profile_update')
      
      errorLogger.logAuthError(`Profile update failed: ${enhancedError.message}`, { operationId })

      throw enhancedError
    }
  }

  /**
   * Check if error is retryable for auth operations
   */
  private isRetryableAuthError(error: any): boolean {
    if (this.isNetworkError(error)) return true
    
    const message = error.message?.toLowerCase() || ''
    const code = error.code?.toLowerCase() || ''
    
    // Don't retry authentication failures or user errors
    if (
      message.includes('invalid_credentials') ||
      message.includes('wrong_password') ||
      message.includes('user_not_found') ||
      message.includes('email_already_exists') ||
      message.includes('validation') ||
      code.includes('auth')
    ) {
      return false
    }

    // Retry server errors and timeouts
    return message.includes('timeout') || 
           message.includes('server') ||
           error.statusCode >= 500
  }

  /**
   * Check if error is network related
   */
  private isNetworkError(error: any): boolean {
    const message = error.message?.toLowerCase() || ''
    return message.includes('network') ||
           message.includes('fetch') ||
           message.includes('connection') ||
           message.includes('offline') ||
           message.includes('timeout')
  }

  /**
   * Enhance error with user-friendly messages and context
   */
  private enhanceAuthError(error: Error, operation: string): AuthErrorWithContext {
    const message = error.message.toLowerCase()
    let userFriendlyMessage = error.message
    let isRetryable = false
    let code = 'unknown'

    // Network errors
    if (this.isNetworkError(error)) {
      userFriendlyMessage = "We're having trouble connecting to our servers. Please check your internet connection and try again."
      isRetryable = true
      code = 'network_error'
    }
    // Authentication errors
    else if (message.includes('invalid_credentials') || message.includes('invalid login')) {
      userFriendlyMessage = "The email/phone or password you entered is incorrect. Please double-check and try again."
      code = 'invalid_credentials'
    }
    else if (message.includes('email_already_exists')) {
      userFriendlyMessage = "An account with this email already exists. Try signing in instead."
      code = 'email_exists'
    }
    else if (message.includes('phone_already_exists')) {
      userFriendlyMessage = "An account with this phone number already exists. Try signing in instead."
      code = 'phone_exists'
    }
    else if (message.includes('weak_password')) {
      userFriendlyMessage = "Please choose a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and special characters."
      code = 'weak_password'
    }
    else if (message.includes('invalid_email')) {
      userFriendlyMessage = "Please enter a valid email address."
      code = 'invalid_email'
    }
    else if (message.includes('invalid_phone')) {
      userFriendlyMessage = "Please enter a valid Ghana phone number."
      code = 'invalid_phone'
    }
    else if (message.includes('too_many_requests') || message.includes('rate_limit')) {
      userFriendlyMessage = "Too many attempts. Please wait a few minutes before trying again."
      code = 'rate_limited'
    }
    else if (message.includes('email_not_confirmed')) {
      userFriendlyMessage = "Please check your email and click the verification link before signing in."
      code = 'email_unconfirmed'
    }
    else if (message.includes('phone_not_confirmed')) {
      userFriendlyMessage = "Please verify your phone number with the OTP sent to you."
      code = 'phone_unconfirmed'
    }
    else if (message.includes('token_expired') || message.includes('session_expired')) {
      userFriendlyMessage = "Your session has expired. Please sign in again."
      code = 'session_expired'
    }
    else if (message.includes('invalid_otp') || message.includes('wrong_otp')) {
      userFriendlyMessage = "The verification code you entered is incorrect. Please check and try again."
      code = 'invalid_otp'
    }
    else if (message.includes('otp_expired')) {
      userFriendlyMessage = "The verification code has expired. Please request a new one."
      code = 'otp_expired'
    }

    const enhancedError = error as AuthErrorWithContext
    enhancedError.userFriendlyMessage = userFriendlyMessage
    enhancedError.isRetryable = isRetryable
    enhancedError.code = code
    enhancedError.context = { operation, timestamp: Date.now() }

    return enhancedError
  }
}

export const enhancedAuthService = new EnhancedAuthService()