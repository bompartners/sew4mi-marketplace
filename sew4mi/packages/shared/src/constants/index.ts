export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
} as const;

// USER_ROLES moved to roles.ts to match database schema

export const PAYMENT_PROVIDERS = {
  MTN_MOMO: 'mtn_momo',
  VODAFONE_CASH: 'vodafone_cash',
  AIRTEL_MONEY: 'airtel_money',
  HUBTEL: 'hubtel',
} as const;

export * from './payment'
export * from './escrow'
export * from './roles'
export * from './milestone'
export * from './dispute'
export * from './tailors'
export * from './search'
export * from './garment-types'
