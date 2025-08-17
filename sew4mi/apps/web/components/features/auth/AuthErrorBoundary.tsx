'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorId: string
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): State {
    // Use a simple counter to avoid SSR hydration issues
    return {
      hasError: true,
      error,
      errorId: `auth_error_${error.name}_${error.message.slice(0, 10)}`
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console and external service
    console.error('Authentication Error Boundary caught an error:', error, errorInfo)
    
    // Log to external error tracking service
    this.logError(error, errorInfo)
    
    // Call parent error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  private logError(error: Error, errorInfo: React.ErrorInfo) {
    const errorData = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      type: 'authentication_error_boundary'
    }

    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.error('🚨 Auth Error Details:', errorData)
      return
    }

    // In production, send to error tracking service
    try {
      fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(err => console.error('Failed to log error:', err))
    } catch (err) {
      console.error('Failed to log error to external service:', err)
    }
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: ''
    })
  }

  private handleGoHome = () => {
    window.location.href = '/'
  }

  private getErrorMessage(error: Error): string {
    const message = error.message.toLowerCase()
    
    // Map common authentication errors to user-friendly messages
    if (message.includes('network') || message.includes('fetch')) {
      return "We're having trouble connecting to our servers. Please check your internet connection and try again."
    }
    
    if (message.includes('invalid_credentials') || message.includes('invalid login')) {
      return "The email/phone or password you entered is incorrect. Please double-check and try again."
    }
    
    if (message.includes('email_already_exists') || message.includes('user_already_registered')) {
      return "An account with this email already exists. Try signing in instead, or use a different email address."
    }
    
    if (message.includes('phone_already_exists')) {
      return "An account with this phone number already exists. Try signing in instead, or use a different phone number."
    }
    
    if (message.includes('weak_password')) {
      return "Please choose a stronger password with at least 8 characters, including uppercase, lowercase, numbers, and special characters."
    }
    
    if (message.includes('invalid_email')) {
      return "Please enter a valid email address."
    }
    
    if (message.includes('invalid_phone')) {
      return "Please enter a valid Ghana phone number starting with +233 or 0."
    }
    
    if (message.includes('too_many_requests') || message.includes('rate_limit')) {
      return "Too many attempts. Please wait a few minutes before trying again."
    }
    
    if (message.includes('email_not_confirmed')) {
      return "Please check your email and click the verification link before signing in."
    }
    
    if (message.includes('phone_not_confirmed')) {
      return "Please verify your phone number with the OTP sent to you before continuing."
    }
    
    if (message.includes('token_expired') || message.includes('session_expired')) {
      return "Your session has expired. Please sign in again."
    }
    
    if (message.includes('unauthorized') || message.includes('access_denied')) {
      return "You don't have permission to access this resource. Please sign in with the correct account."
    }

    // Default fallback for unknown errors
    return "Something went wrong with authentication. Our team has been notified and we're working to fix this."
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      const userFriendlyMessage = this.state.error ? this.getErrorMessage(this.state.error) : 'An unexpected error occurred.'

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">
                Authentication Error
              </h2>
              <p className="text-gray-600">
                {userFriendlyMessage}
              </p>
            </div>

            <Alert className="border-red-200 bg-red-50 text-left">
              <AlertDescription className="text-red-800 text-sm">
                <strong>Error ID:</strong> {this.state.errorId}
              </AlertDescription>
            </Alert>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                className="flex items-center space-x-2 bg-amber-600 hover:bg-amber-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try Again</span>
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex items-center space-x-2"
              >
                <Home className="w-4 h-4" />
                <span>Go Home</span>
              </Button>
            </div>

            <div className="text-sm text-gray-500">
              <p>If this problem persists, please contact our support team.</p>
              <p className="mt-1">
                <a 
                  href="mailto:support@sew4mi.com" 
                  className="text-amber-600 hover:text-amber-700 underline"
                >
                  support@sew4mi.com
                </a>
              </p>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional component wrapper for easier use with hooks
export function AuthErrorBoundaryWrapper({ 
  children, 
  onError 
}: { 
  children: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void 
}) {
  return (
    <AuthErrorBoundary onError={onError}>
      {children}
    </AuthErrorBoundary>
  )
}