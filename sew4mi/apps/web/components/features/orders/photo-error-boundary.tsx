/**
 * Specialized Error Boundary for photo gallery components
 * Handles image loading errors and provides photo-specific fallbacks
 * @file photo-error-boundary.tsx
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ImageOff, RefreshCw, Camera, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

/**
 * Photo error types
 */
export enum PhotoErrorType {
  LOADING_FAILED = 'loading_failed',
  NETWORK_ERROR = 'network_error',
  COMPONENT_CRASH = 'component_crash',
  PERMISSION_DENIED = 'permission_denied',
  CORRUPTED_DATA = 'corrupted_data'
}

/**
 * Photo error boundary props
 */
interface PhotoErrorBoundaryProps {
  /** Child components */
  children: ReactNode;
  /** Photo URL for fallback display */
  photoUrl?: string;
  /** Alt text for the photo */
  altText?: string;
  /** Milestone stage name */
  milestoneName?: string;
  /** Component size variant */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Whether to show retry button */
  allowRetry?: boolean;
  /** Custom fallback component */
  fallback?: (error: PhotoErrorType, retry: () => void) => ReactNode;
  /** Error callback */
  onError?: (error: Error, errorType: PhotoErrorType) => void;
  /** Retry callback */
  onRetry?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Photo error boundary state
 */
interface PhotoErrorBoundaryState {
  hasError: boolean;
  errorType: PhotoErrorType | null;
  error: Error | null;
  retryCount: number;
}

/**
 * Photo Error Boundary component
 */
export class PhotoErrorBoundary extends Component<PhotoErrorBoundaryProps, PhotoErrorBoundaryState> {
  private maxRetries = 2;

  constructor(props: PhotoErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      errorType: null,
      error: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<PhotoErrorBoundaryState> {
    // Determine error type based on error message
    let errorType = PhotoErrorType.COMPONENT_CRASH;
    
    if (error.message.includes('network') || error.message.includes('fetch')) {
      errorType = PhotoErrorType.NETWORK_ERROR;
    } else if (error.message.includes('load') || error.message.includes('image')) {
      errorType = PhotoErrorType.LOADING_FAILED;
    } else if (error.message.includes('permission')) {
      errorType = PhotoErrorType.PERMISSION_DENIED;
    } else if (error.message.includes('corrupt') || error.message.includes('invalid')) {
      errorType = PhotoErrorType.CORRUPTED_DATA;
    }

    return {
      hasError: true,
      error,
      errorType
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Photo Error Boundary caught error:', error);
    console.error('Error Info:', errorInfo);

    // Report error
    if (this.props.onError) {
      this.props.onError(error, this.state.errorType || PhotoErrorType.COMPONENT_CRASH);
    }

    // Log to analytics in production
    if (process.env.NODE_ENV === 'production') {
      this.reportPhotoError(error, errorInfo);
    }
  }

  /**
   * Report photo-specific error metrics
   */
  private reportPhotoError = (error: Error, errorInfo: ErrorInfo) => {
    const photoErrorData = {
      errorType: this.state.errorType,
      photoUrl: this.props.photoUrl,
      milestoneName: this.props.milestoneName,
      altText: this.props.altText,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      retryCount: this.state.retryCount,
      userAgent: navigator.userAgent,
      connectionType: (navigator as any).connection?.effectiveType,
      networkSpeed: (navigator as any).connection?.downlink
    };

    fetch('/api/errors/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photoErrorData)
    }).catch(err => {
      console.error('Failed to report photo error:', err);
    });
  };

  /**
   * Handle retry action
   */
  private handleRetry = () => {
    if (this.state.retryCount >= this.maxRetries) {
      return;
    }

    if (this.props.onRetry) {
      this.props.onRetry();
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorType: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  /**
   * Get size-based dimensions
   */
  private getSizeDimensions = () => {
    const { size = 'md' } = this.props;
    
    const dimensions = {
      sm: 'w-16 h-16',
      md: 'w-24 h-24',
      lg: 'w-32 h-32',
      xl: 'w-48 h-48'
    };

    return dimensions[size];
  };

  /**
   * Get error icon based on error type
   */
  private getErrorIcon = (errorType: PhotoErrorType) => {
    const iconClass = 'w-6 h-6 text-muted-foreground';
    
    switch (errorType) {
      case PhotoErrorType.LOADING_FAILED:
        return <ImageOff className={iconClass} />;
      case PhotoErrorType.NETWORK_ERROR:
        return <AlertCircle className={iconClass} />;
      case PhotoErrorType.PERMISSION_DENIED:
        return <Camera className={iconClass} />;
      case PhotoErrorType.CORRUPTED_DATA:
        return <ImageOff className={iconClass} />;
      default:
        return <ImageOff className={iconClass} />;
    }
  };

  /**
   * Get user-friendly error message
   */
  private getErrorMessage = (errorType: PhotoErrorType) => {
    switch (errorType) {
      case PhotoErrorType.LOADING_FAILED:
        return 'Photo failed to load';
      case PhotoErrorType.NETWORK_ERROR:
        return 'Network connection issue';
      case PhotoErrorType.PERMISSION_DENIED:
        return 'Access denied';
      case PhotoErrorType.CORRUPTED_DATA:
        return 'Photo data corrupted';
      default:
        return 'Photo unavailable';
    }
  };

  /**
   * Render default photo error fallback
   */
  private renderDefaultFallback = () => {
    const { errorType, retryCount } = this.state;
    const { 
      milestoneName, 
      altText, 
      allowRetry = true, 
      className,
      size = 'md'
    } = this.props;

    const canRetry = allowRetry && retryCount < this.maxRetries;
    const dimensions = this.getSizeDimensions();

    return (
      <Card className={cn(
        'flex flex-col items-center justify-center border-dashed',
        dimensions,
        'bg-muted/30 hover:bg-muted/50 transition-colors',
        className
      )}>
        <CardContent className="flex flex-col items-center justify-center p-4 text-center">
          <div className="mb-2">
            {errorType && this.getErrorIcon(errorType)}
          </div>
          
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              {errorType && this.getErrorMessage(errorType)}
            </p>
            
            {milestoneName && (
              <p className="text-xs text-muted-foreground/80">
                {milestoneName}
              </p>
            )}

            {altText && !milestoneName && (
              <p className="text-xs text-muted-foreground/80 truncate max-w-full">
                {altText}
              </p>
            )}
          </div>

          {canRetry && size !== 'sm' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={this.handleRetry}
              className="mt-2 h-6 px-2 text-xs"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          )}

          {errorType === PhotoErrorType.NETWORK_ERROR && (
            <Badge variant="secondary" className="mt-1 text-xs">
              Offline
            </Badge>
          )}

          {retryCount >= this.maxRetries && (
            <Badge variant="destructive" className="mt-1 text-xs">
              Failed
            </Badge>
          )}
        </CardContent>
      </Card>
    );
  };

  render() {
    const { hasError, errorType } = this.state;
    const { children, fallback } = this.props;

    if (hasError && errorType) {
      if (fallback) {
        return fallback(errorType, this.handleRetry);
      }
      
      return this.renderDefaultFallback();
    }

    return children;
  }
}

/**
 * Hook for handling image loading errors
 */
export function usePhotoErrorHandler() {
  const handleImageError = (
    event: React.SyntheticEvent<HTMLImageElement>,
    photoUrl?: string,
    milestoneName?: string
  ) => {
    const img = event.currentTarget;
    
    // Determine error type
    let errorType = PhotoErrorType.LOADING_FAILED;
    
    if (!navigator.onLine) {
      errorType = PhotoErrorType.NETWORK_ERROR;
    }

    // Log error
    console.warn('Image failed to load:', {
      src: img.src,
      photoUrl,
      milestoneName,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight
    });

    // Set fallback image or hide
    img.style.display = 'none';
    
    // Show error state in parent container
    const container = img.closest('[data-photo-container]');
    if (container) {
      container.classList.add('photo-error');
      container.setAttribute('data-error-type', errorType);
    }

    // Report error in production
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/errors/photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorType,
          photoUrl: photoUrl || img.src,
          milestoneName,
          message: 'Image failed to load',
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          networkStatus: navigator.onLine ? 'online' : 'offline'
        })
      }).catch(err => {
        console.error('Failed to report image error:', err);
      });
    }
  };

  const handleImageLoad = (
    event: React.SyntheticEvent<HTMLImageElement>,
    onSuccess?: () => void
  ) => {
    const img = event.currentTarget;
    
    // Remove error states
    const container = img.closest('[data-photo-container]');
    if (container) {
      container.classList.remove('photo-error');
      container.removeAttribute('data-error-type');
    }

    if (onSuccess) {
      onSuccess();
    }
  };

  return {
    handleImageError,
    handleImageLoad
  };
}

/**
 * Higher-order component for wrapping photo components with error boundary
 */
export function withPhotoErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<PhotoErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <PhotoErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </PhotoErrorBoundary>
  );

  WrappedComponent.displayName = `withPhotoErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

export default PhotoErrorBoundary;