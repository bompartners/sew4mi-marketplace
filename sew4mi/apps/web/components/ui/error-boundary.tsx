/**
 * Error Boundary component for graceful error handling
 * Catches JavaScript errors in child components and displays fallback UI
 * @file error-boundary.tsx
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Bug, Info } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Alert, AlertDescription } from './alert';
import { EnhancedError, getUserFriendlyMessage, getErrorRecoverySuggestion } from '@sew4mi/shared/utils';

/**
 * Error boundary props
 */
interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Fallback component to render on error */
  fallback?: (error: Error, retry: () => void) => ReactNode;
  /** Whether to show detailed error information (dev mode) */
  showDetails?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Component name for debugging */
  componentName?: string;
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Whether to allow retry functionality */
  allowRetry?: boolean;
  /** Custom retry action */
  onRetry?: () => void;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Error Boundary class component
 * Catches errors in child components and provides fallback UI
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  /**
   * Static method to update state when error occurs
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  /**
   * Lifecycle method called when error is caught
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    // Update state with error info
    this.setState({
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (if configured)
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  /**
   * Report error to external service
   */
  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // In a real application, you might send this to Sentry, LogRocket, etc.
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentName: this.props.componentName,
      errorInfo: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // Example API call to error reporting service
    fetch('/api/errors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(errorData)
    }).catch(err => {
      console.error('Failed to report error:', err);
    });
  };

  /**
   * Retry handler
   */
  private handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    // Call custom retry handler if provided
    if (this.props.onRetry) {
      this.props.onRetry();
    }

    // Reset error state
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  /**
   * Default error fallback UI
   */
  private renderDefaultFallback = () => {
    const { error, errorInfo, retryCount } = this.state;
    const { 
      errorMessage, 
      componentName, 
      showDetails = process.env.NODE_ENV === 'development',
      allowRetry = true 
    } = this.props;

    const canRetry = allowRetry && retryCount < this.maxRetries;
    
    // Use enhanced error handling if available
    const enhancedError = error as EnhancedError;
    const userFriendlyMessage = errorMessage || 
                               enhancedError?.userMessage || 
                               getUserFriendlyMessage(error?.message || '', enhancedError?.context);
    
    const recoverySuggestion = getErrorRecoverySuggestion(error!);

    return (
      <Card className="w-full max-w-md mx-auto border-destructive">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-destructive">
            {componentName ? `${componentName} Error` : 'Something went wrong'}
          </CardTitle>
          <CardDescription>
            {userFriendlyMessage || 'An error occurred while loading this component.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {recoverySuggestion && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {recoverySuggestion}
              </AlertDescription>
            </Alert>
          )}
          
          {canRetry && (
            <Button 
              onClick={this.handleRetry}
              variant="outline"
              className="w-full"
              disabled={retryCount >= this.maxRetries}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again {retryCount > 0 && `(${retryCount}/${this.maxRetries})`}
            </Button>
          )}

          {retryCount >= this.maxRetries && (
            <Alert>
              <Bug className="h-4 w-4" />
              <AlertDescription>
                Maximum retry attempts reached. Please refresh the page or contact support.
              </AlertDescription>
            </Alert>
          )}

          {showDetails && error && (
            <details className="rounded border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                Error Details (Development)
              </summary>
              <div className="mt-2 space-y-2 text-sm">
                <div>
                  <strong>Error:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {errorInfo && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 overflow-x-auto whitespace-pre-wrap text-xs">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    );
  };

  render() {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Render custom fallback if provided, otherwise use default
      if (fallback) {
        return fallback(error, this.handleRetry);
      }
      
      return this.renderDefaultFallback();
    }

    return children;
  }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for error boundary functionality in function components
 * Provides a way to report errors manually
 */
export function useErrorHandler() {
  return (error: Error, errorInfo?: { componentStack: string }) => {
    console.error('Manual error report:', error);
    
    // In a real application, report to error service
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo?.componentStack,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      }).catch(err => {
        console.error('Failed to report error:', err);
      });
    }
  };
}

export default ErrorBoundary;