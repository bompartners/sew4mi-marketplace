/**
 * API Error Handler Utility
 * Provides consistent error handling for API calls with contextual error messages
 */

import { 
  createContextualError, 
  getUserFriendlyMessage, 
  EnhancedError,
  GHANA_ERROR_MESSAGES 
} from '@sew4mi/shared/utils';

export interface ApiErrorContext {
  operation: string;
  resource?: string;
  field?: string;
  userId?: string;
  requestData?: any;
}

/**
 * Handle API errors with enhanced context
 */
export function handleApiError(
  error: any,
  context: ApiErrorContext
): EnhancedError {
  let statusCode = 500;
  let originalMessage = 'An unexpected error occurred';
  
  // Handle different error types
  if (error?.response) {
    // HTTP error response
    statusCode = error.response.status;
    originalMessage = error.response.data?.message || error.response.statusText || originalMessage;
  } else if (error?.message) {
    // JavaScript error
    originalMessage = error.message;
  } else if (typeof error === 'string') {
    // String error
    originalMessage = error;
  }

  // Create contextual error with enhanced information
  const enhancedError = createContextualError(
    originalMessage,
    {
      ...context,
      details: {
        statusCode,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        requestData: context.requestData
      }
    },
    statusCode
  );

  // Add specific handling for common scenarios
  if (statusCode === 401) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.AUTH.SESSION_EXPIRED;
  } else if (statusCode === 403) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS;
  } else if (statusCode === 429) {
    enhancedError.userMessage = 'Too many requests. Please wait a moment and try again.';
  } else if (statusCode >= 500) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.NETWORK.SERVER_ERROR;
  }

  return enhancedError;
}

/**
 * Handle phone-related API errors
 */
export function handlePhoneApiError(
  error: any,
  phoneNumber: string,
  operation: string
): EnhancedError {
  const context: ApiErrorContext = {
    operation,
    field: 'phone',
    resource: 'phone_validation',
    requestData: { phoneNumber }
  };
  
  const enhancedError = handleApiError(error, context);
  
  // Add phone-specific error handling
  const lowerMessage = enhancedError.message.toLowerCase();
  
  if (lowerMessage.includes('invalid') || lowerMessage.includes('format')) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.PHONE.INVALID_FORMAT;
  } else if (lowerMessage.includes('network') || lowerMessage.includes('provider')) {
    enhancedError.userMessage = 'Phone number network could not be determined. Please verify the number.';
  }
  
  return enhancedError;
}

/**
 * Handle payment-related API errors
 */
export function handlePaymentApiError(
  error: any,
  paymentData: any,
  operation: string
): EnhancedError {
  const context: ApiErrorContext = {
    operation,
    resource: 'payment',
    requestData: paymentData
  };
  
  const enhancedError = handleApiError(error, context);
  
  // Add payment-specific error handling
  const lowerMessage = enhancedError.message.toLowerCase();
  
  if (lowerMessage.includes('insufficient')) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.PAYMENT.INSUFFICIENT_BALANCE;
  } else if (lowerMessage.includes('timeout')) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.PAYMENT.NETWORK_TIMEOUT;
  } else if (lowerMessage.includes('pin') || lowerMessage.includes('password')) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.PAYMENT.INVALID_PIN;
  } else if (lowerMessage.includes('limit')) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.PAYMENT.DAILY_LIMIT_EXCEEDED;
  } else if (lowerMessage.includes('service') || lowerMessage.includes('unavailable')) {
    const provider = paymentData?.provider || 'Mobile money';
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.PAYMENT.SERVICE_UNAVAILABLE(provider);
  }
  
  return enhancedError;
}

/**
 * Handle auth-related API errors
 */
export function handleAuthApiError(
  error: any,
  credentialType: 'email' | 'phone',
  operation: string
): EnhancedError {
  const context: ApiErrorContext = {
    operation,
    resource: 'authentication',
    field: credentialType
  };
  
  const enhancedError = handleApiError(error, context);
  
  // Add auth-specific error handling
  const lowerMessage = enhancedError.message.toLowerCase();
  
  if (lowerMessage.includes('invalid') || lowerMessage.includes('credentials')) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.AUTH.INVALID_CREDENTIALS;
  } else if (lowerMessage.includes('locked') || lowerMessage.includes('suspended')) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.AUTH.ACCOUNT_LOCKED;
  } else if (lowerMessage.includes('verification') || lowerMessage.includes('verify')) {
    enhancedError.userMessage = credentialType === 'email' 
      ? GHANA_ERROR_MESSAGES.AUTH.EMAIL_NOT_VERIFIED
      : GHANA_ERROR_MESSAGES.AUTH.PHONE_NOT_VERIFIED;
  }
  
  return enhancedError;
}

/**
 * Handle file upload errors
 */
export function handleFileUploadError(
  error: any,
  fileName: string,
  fileSize?: number,
  fileType?: string
): EnhancedError {
  const context: ApiErrorContext = {
    operation: 'file_upload',
    resource: 'file',
    requestData: { fileName, fileSize, fileType }
  };
  
  const enhancedError = handleApiError(error, context);
  
  // Add file-specific error handling
  const lowerMessage = enhancedError.message.toLowerCase();
  
  if (lowerMessage.includes('size') || lowerMessage.includes('large')) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.FILE.TOO_LARGE('5MB');
  } else if (lowerMessage.includes('type') || lowerMessage.includes('format')) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.FILE.INVALID_TYPE(['JPG', 'PNG', 'PDF']);
  } else if (lowerMessage.includes('corrupt') || lowerMessage.includes('damaged')) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.FILE.CORRUPT_FILE;
  } else {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.FILE.UPLOAD_FAILED;
  }
  
  return enhancedError;
}

/**
 * Handle network connectivity errors
 */
export function handleNetworkError(error: any, operation: string): EnhancedError {
  const context: ApiErrorContext = {
    operation,
    resource: 'network'
  };
  
  const enhancedError = handleApiError(error, context);
  
  // Add network-specific error handling
  const lowerMessage = enhancedError.message.toLowerCase();
  
  if (lowerMessage.includes('offline') || lowerMessage.includes('network')) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.NETWORK.OFFLINE;
  } else if (lowerMessage.includes('timeout')) {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.NETWORK.REQUEST_TIMEOUT;
  } else {
    enhancedError.userMessage = GHANA_ERROR_MESSAGES.NETWORK.SLOW_CONNECTION;
  }
  
  return enhancedError;
}

/**
 * Create a standardized error response for API endpoints
 */
export function createErrorResponse(
  error: Error | EnhancedError,
  statusCode?: number
): Response {
  const enhancedError = error as EnhancedError;
  const code = statusCode || enhancedError.statusCode || 500;
  
  return new Response(
    JSON.stringify({
      error: true,
      message: enhancedError.userMessage || enhancedError.message,
      details: enhancedError.context,
      timestamp: new Date().toISOString()
    }),
    {
      status: code,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}