/**
 * Enhanced error handling utilities for contextual error messages
 */

export interface ErrorContext {
  code?: string;
  field?: string;
  operation?: string;
  resource?: string;
  details?: Record<string, any>;
}

export interface EnhancedError extends Error {
  context?: ErrorContext;
  userMessage?: string;
  developerMessage?: string;
  statusCode?: number;
}

/**
 * Ghana-specific error messages for better user feedback
 */
export const GHANA_ERROR_MESSAGES = {
  PHONE: {
    INVALID_FORMAT: 'Please enter a valid Ghana phone number (e.g., 024 123 4567)',
    INVALID_PREFIX: (prefix: string) => `The prefix ${prefix} is not a valid Ghana network. Please use MTN (024, 025, 053-059), Vodafone (020, 050), or AirtelTigo (026-027, 056-057)`,
    NETWORK_SPECIFIC: {
      MTN: 'Invalid MTN number. Valid prefixes: 024, 025, 053, 054, 055, 059',
      VODAFONE: 'Invalid Vodafone number. Valid prefixes: 020, 050',
      AIRTELTIGO: 'Invalid AirtelTigo number. Valid prefixes: 026, 027, 056, 057'
    },
    TOO_SHORT: 'Phone number is too short. Ghana numbers should be 10 digits (including 0)',
    TOO_LONG: 'Phone number is too long. Ghana numbers should be 10 digits (including 0)',
    MISSING_ZERO: 'Ghana phone numbers should start with 0 (e.g., 024 123 4567)',
    INTERNATIONAL_FORMAT_HINT: 'For international format, use +233 followed by 9 digits'
  },
  PAYMENT: {
    MOBILE_MONEY_FAILED: 'Mobile money transaction failed. Please check your balance and try again',
    INSUFFICIENT_BALANCE: 'Insufficient balance in your mobile money wallet',
    NETWORK_TIMEOUT: 'Network timeout. This is common with mobile money. Please try again',
    INVALID_PIN: 'Invalid mobile money PIN. Please check and try again',
    DAILY_LIMIT_EXCEEDED: 'Daily transaction limit exceeded. Please try again tomorrow',
    SERVICE_UNAVAILABLE: (provider: string) => `${provider} service is temporarily unavailable. Please try again later`
  },
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email/phone or password. Please check and try again',
    ACCOUNT_LOCKED: 'Your account has been locked due to multiple failed attempts. Please reset your password',
    EMAIL_NOT_VERIFIED: 'Please verify your email address to continue',
    PHONE_NOT_VERIFIED: 'Please verify your phone number to continue',
    SESSION_EXPIRED: 'Your session has expired. Please sign in again',
    INSUFFICIENT_PERMISSIONS: 'You do not have permission to perform this action'
  },
  NETWORK: {
    OFFLINE: 'You appear to be offline. Please check your internet connection',
    SLOW_CONNECTION: 'Your connection is slow. This action may take longer than usual',
    REQUEST_TIMEOUT: 'Request timed out. Please check your connection and try again',
    SERVER_ERROR: 'Our servers are experiencing issues. Please try again later'
  },
  VALIDATION: {
    REQUIRED_FIELD: (field: string) => `${field} is required`,
    INVALID_EMAIL: 'Please enter a valid email address',
    PASSWORD_TOO_WEAK: 'Password must be at least 8 characters with uppercase, lowercase, and numbers',
    PASSWORDS_DONT_MATCH: 'Passwords do not match',
    INVALID_DATE: 'Please enter a valid date',
    FUTURE_DATE_REQUIRED: 'Please select a future date',
    PAST_DATE_REQUIRED: 'Please select a past date'
  },
  FILE: {
    TOO_LARGE: (maxSize: string) => `File is too large. Maximum size is ${maxSize}`,
    INVALID_TYPE: (allowedTypes: string[]) => `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
    UPLOAD_FAILED: 'File upload failed. Please try again',
    CORRUPT_FILE: 'File appears to be corrupted. Please try a different file'
  }
};

/**
 * Create an enhanced error with context
 */
export function createContextualError(
  message: string,
  context?: ErrorContext,
  statusCode?: number
): EnhancedError {
  const error = new Error(message) as EnhancedError;
  error.context = context;
  error.statusCode = statusCode;
  error.developerMessage = message;
  error.userMessage = getUserFriendlyMessage(message, context);
  return error;
}

/**
 * Get user-friendly error message based on context
 */
export function getUserFriendlyMessage(
  originalMessage: string,
  context?: ErrorContext
): string {
  // Check for specific error patterns and return appropriate messages
  const lowerMessage = originalMessage.toLowerCase();
  
  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
    return GHANA_ERROR_MESSAGES.NETWORK.REQUEST_TIMEOUT;
  }
  
  // Auth errors
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401')) {
    return GHANA_ERROR_MESSAGES.AUTH.SESSION_EXPIRED;
  }
  
  if (lowerMessage.includes('forbidden') || lowerMessage.includes('403')) {
    return GHANA_ERROR_MESSAGES.AUTH.INSUFFICIENT_PERMISSIONS;
  }
  
  // Payment errors
  if (context?.operation === 'payment') {
    if (lowerMessage.includes('insufficient')) {
      return GHANA_ERROR_MESSAGES.PAYMENT.INSUFFICIENT_BALANCE;
    }
    if (lowerMessage.includes('timeout')) {
      return GHANA_ERROR_MESSAGES.PAYMENT.NETWORK_TIMEOUT;
    }
  }
  
  // Phone validation errors
  if (context?.field === 'phone' || lowerMessage.includes('phone')) {
    if (lowerMessage.includes('invalid')) {
      return GHANA_ERROR_MESSAGES.PHONE.INVALID_FORMAT;
    }
    if (lowerMessage.includes('short')) {
      return GHANA_ERROR_MESSAGES.PHONE.TOO_SHORT;
    }
    if (lowerMessage.includes('long')) {
      return GHANA_ERROR_MESSAGES.PHONE.TOO_LONG;
    }
  }
  
  // Default to original message if no specific case matches
  return originalMessage;
}

/**
 * Enhanced Ghana phone validation with detailed error messages
 */
export interface PhoneValidationResult {
  isValid: boolean;
  errorMessage?: string;
  suggestion?: string;
  network?: 'MTN' | 'VODAFONE' | 'AIRTELTIGO';
}

export function validateGhanaPhoneWithContext(phone: string): PhoneValidationResult {
  if (!phone) {
    return {
      isValid: false,
      errorMessage: GHANA_ERROR_MESSAGES.VALIDATION.REQUIRED_FIELD('Phone number')
    };
  }
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Check for international format
  if (phone.startsWith('+') && !phone.startsWith('+233')) {
    return {
      isValid: false,
      errorMessage: 'Only Ghana phone numbers (+233) are supported',
      suggestion: GHANA_ERROR_MESSAGES.PHONE.INTERNATIONAL_FORMAT_HINT
    };
  }
  
  // Check length
  if (cleaned.length < 9) {
    return {
      isValid: false,
      errorMessage: GHANA_ERROR_MESSAGES.PHONE.TOO_SHORT
    };
  }
  
  if (cleaned.length > 12) {
    return {
      isValid: false,
      errorMessage: GHANA_ERROR_MESSAGES.PHONE.TOO_LONG
    };
  }
  
  // Normalize to local format for validation
  let normalized: string;
  if (cleaned.startsWith('233')) {
    normalized = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('0')) {
    normalized = cleaned;
  } else if (cleaned.length === 9) {
    normalized = '0' + cleaned;
  } else {
    return {
      isValid: false,
      errorMessage: GHANA_ERROR_MESSAGES.PHONE.INVALID_FORMAT
    };
  }
  
  // Validate length after normalization
  if (normalized.length !== 10) {
    return {
      isValid: false,
      errorMessage: GHANA_ERROR_MESSAGES.PHONE.INVALID_FORMAT
    };
  }
  
  // Extract and validate prefix
  const prefix = normalized.substring(1, 3);
  
  // MTN prefixes
  const mtnPrefixes = ['24', '25', '53', '54', '55', '59'];
  if (mtnPrefixes.includes(prefix)) {
    return { isValid: true, network: 'MTN' };
  }
  
  // Vodafone prefixes
  const vodafonePrefixes = ['20', '50'];
  if (vodafonePrefixes.includes(prefix)) {
    return { isValid: true, network: 'VODAFONE' };
  }
  
  // AirtelTigo prefixes
  const airtelTigoPrefixes = ['26', '27', '56', '57'];
  if (airtelTigoPrefixes.includes(prefix)) {
    return { isValid: true, network: 'AIRTELTIGO' };
  }
  
  // Invalid prefix
  return {
    isValid: false,
    errorMessage: GHANA_ERROR_MESSAGES.PHONE.INVALID_PREFIX(prefix),
    suggestion: 'Please check the number and try again'
  };
}

/**
 * Format error for API response
 */
export function formatErrorResponse(error: Error | EnhancedError): {
  error: string;
  message: string;
  details?: ErrorContext;
  statusCode: number;
} {
  const enhancedError = error as EnhancedError;
  
  return {
    error: enhancedError.name || 'Error',
    message: enhancedError.userMessage || enhancedError.message,
    details: enhancedError.context,
    statusCode: enhancedError.statusCode || 500
  };
}

/**
 * Error recovery suggestions based on error type
 */
export function getErrorRecoverySuggestion(error: Error | EnhancedError): string | null {
  const message = error.message.toLowerCase();
  const context = (error as EnhancedError).context;
  
  if (message.includes('network') || message.includes('timeout')) {
    return 'Please check your internet connection and try again';
  }
  
  if (message.includes('session') || message.includes('expired')) {
    return 'Please sign in again to continue';
  }
  
  if (context?.operation === 'payment') {
    return 'If the problem persists, please contact support or try a different payment method';
  }
  
  if (context?.field === 'phone') {
    return 'Make sure to enter your Ghana phone number starting with 0 (e.g., 024 123 4567)';
  }
  
  return null;
}