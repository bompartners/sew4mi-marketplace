'use client';

// Client-only wrapper for error logging service
import { errorLogger, useErrorLogging as useErrorLoggingBase } from './errorLoggingService';

/**
 * Client-only error logging hook that's safe for SSR
 */
export function useErrorLogging() {
  // Always call the hook unconditionally
  const hookResult = useErrorLoggingBase();
  
  if (typeof window === 'undefined') {
    // Return no-op functions for SSR
    return {
      logError: () => '',
      logAuthError: () => '',
      logNetworkError: () => '',
      logValidationError: () => '',
      logServerError: () => '',
      getRecentErrors: () => [],
      clearOldErrors: () => {},
      exportErrors: () => ''
    };
  }
  
  return hookResult;
}

export { errorLogger };