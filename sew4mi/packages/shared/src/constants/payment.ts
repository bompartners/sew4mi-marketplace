export const PAYMENT_PROVIDERS = {
  HUBTEL_MTN: 'HUBTEL_MTN',
  HUBTEL_VODAFONE: 'HUBTEL_VODAFONE',
  HUBTEL_AIRTELTIGO: 'HUBTEL_AIRTELTIGO',
  HUBTEL_CARD: 'HUBTEL_CARD',
} as const;

export const PAYMENT_STATUSES = {
  PENDING: 'PENDING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const;

export const PAYMENT_TYPES = {
  DEPOSIT: 'DEPOSIT',
  FITTING_PAYMENT: 'FITTING_PAYMENT',
  FINAL_PAYMENT: 'FINAL_PAYMENT',
  REFUND: 'REFUND',
} as const;

export const HUBTEL_ENDPOINTS = {
  MOBILE_MONEY: '/merchantaccount/merchants/{merchant-id}/receive/mobilemoney',
  CARD_PAYMENT: '/merchantaccount/merchants/{merchant-id}/receive/card',
  TRANSACTION_STATUS: '/merchantaccount/merchants/{merchant-id}/transactions/{transaction-id}',
} as const;

export const GHANA_PHONE_PREFIXES = {
  MTN: ['24', '54', '55', '59'] as readonly string[],
  VODAFONE: ['20', '50'] as readonly string[],
  AIRTELTIGO: ['27', '57', '26', '56'] as readonly string[],
} as const;

export const NETWORK_TIMEOUTS = {
  MTN: 60000,      // 60 seconds
  VODAFONE: 45000, // 45 seconds
  AIRTELTIGO: 90000, // 90 seconds
} as const;

export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  DELAYS: [2000, 5000, 10000], // 2s, 5s, 10s
} as const;

export const RATE_LIMITS = {
  PAYMENT_REQUESTS_PER_MINUTE: 10,
} as const;

export const CURRENCY = {
  GHANA_CEDI: 'GHS',
  MIN_AMOUNT: 0.01,
  SYMBOL: 'GH₵',
} as const;

export const HUBTEL_CHANNELS = {
  MTN: 'mtn-gh',
  VODAFONE: 'vodafone-gh',
  AIRTELTIGO: 'airteltigo-gh',
} as const;

// Commission and Platform Fee Constants
export const COMMISSION = {
  DEFAULT_RATE: 0.20, // 20% platform commission
  PROCESSING_FEE_RATE: 0.025, // 2.5% processing fee estimate
  MIN_COMMISSION: 0.50, // Minimum commission in GHS
  MAX_COMMISSION: 1000.00, // Maximum commission in GHS
} as const;

// Payment Analytics Constants
export const ANALYTICS_PERIODS = {
  DAILY: 'DAILY',
  WEEKLY: 'WEEKLY',
  MONTHLY: 'MONTHLY',
  QUARTERLY: 'QUARTERLY',
  YEARLY: 'YEARLY',
} as const;

export const EXPORT_LIMITS = {
  MAX_RECORDS: 10000,
  MAX_EXPORTS_PER_HOUR: 5,
} as const;

// Payment Status for Dashboard
export const PAYMENT_DASHBOARD_STATUSES = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  DISPUTED: 'DISPUTED',
  REFUNDED: 'REFUNDED',
} as const;

// Escrow Transaction Stages (different from ESCROW_STAGES in escrow.ts)
export const PAYMENT_ESCROW_STAGES = {
  DEPOSIT: 'DEPOSIT',
  FITTING: 'FITTING',
  FINAL: 'FINAL',
  RELEASED: 'RELEASED',
  REFUNDED: 'REFUNDED',
} as const;

// Invoice Constants
export const INVOICE = {
  STATUSES: {
    DRAFT: 'DRAFT',
    ISSUED: 'ISSUED',
    CANCELLED: 'CANCELLED',
  },
  PREFIX: 'INV',
  GHANA_VAT_RATE: 0.125, // 12.5% VAT in Ghana
} as const;