export const ORDER_STATUSES = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
} as const;

export const USER_ROLES = {
  CUSTOMER: 'customer',
  TAILOR: 'tailor',
  ADMIN: 'admin',
} as const;

export const PAYMENT_PROVIDERS = {
  MTN_MOMO: 'mtn_momo',
  VODAFONE_CASH: 'vodafone_cash',
  AIRTEL_MONEY: 'airtel_money',
  HUBTEL: 'hubtel',
} as const;
