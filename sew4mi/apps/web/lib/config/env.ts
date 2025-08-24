/**
 * Environment configuration that's consistent between server and client
 */

// These values are embedded at build time for client-side usage
export const ENV_CONFIG = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  
  // Hubtel Payment Gateway Configuration
  HUBTEL_CLIENT_ID: process.env.HUBTEL_CLIENT_ID || '',
  HUBTEL_CLIENT_SECRET: process.env.HUBTEL_CLIENT_SECRET || '',
  HUBTEL_MERCHANT_ACCOUNT_ID: process.env.HUBTEL_MERCHANT_ACCOUNT_ID || '',
  HUBTEL_WEBHOOK_SECRET: process.env.HUBTEL_WEBHOOK_SECRET || '',
  HUBTEL_ENVIRONMENT: (process.env.HUBTEL_ENVIRONMENT || 'sandbox') as 'sandbox' | 'production',
  HUBTEL_BASE_URL: process.env.HUBTEL_BASE_URL || 
    (process.env.HUBTEL_ENVIRONMENT === 'production' 
      ? 'https://api.hubtel.com/v1' 
      : 'https://sandbox-api.hubtel.com/v1'),
  HUBTEL_CALLBACK_URL: process.env.HUBTEL_CALLBACK_URL || '',
} as const;

/**
 * Validates that required environment variables are present
 */
export function validateEnvironment(): void {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
  ] as const;

  const missing = required.filter(key => !ENV_CONFIG[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
}

/**
 * Validates Hubtel payment environment variables
 */
export function validateHubtelEnvironment(): void {
  const required = [
    'HUBTEL_CLIENT_ID',
    'HUBTEL_CLIENT_SECRET', 
    'HUBTEL_MERCHANT_ACCOUNT_ID',
    'HUBTEL_WEBHOOK_SECRET',
    'HUBTEL_CALLBACK_URL',
  ] as const;

  const missing = required.filter(key => !ENV_CONFIG[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required Hubtel environment variables: ${missing.join(', ')}`
    );
  }

  if (!['sandbox', 'production'].includes(ENV_CONFIG.HUBTEL_ENVIRONMENT)) {
    throw new Error(
      `Invalid HUBTEL_ENVIRONMENT: ${ENV_CONFIG.HUBTEL_ENVIRONMENT}. Must be 'sandbox' or 'production'`
    );
  }
}

/**
 * Gets environment configuration with validation
 */
export function getEnvironment() {
  validateEnvironment();
  return ENV_CONFIG;
}