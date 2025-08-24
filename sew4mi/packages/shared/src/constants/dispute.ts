// Dispute Resolution Framework Constants
// Story 2.4: Constants for dispute system

import { DisputeCategory, DisputePriority, DisputeStatus, DisputeResolutionType } from '../types/dispute';

// SLA Configuration
export const DISPUTE_SLA_HOURS = {
  [DisputePriority.CRITICAL]: 4,
  [DisputePriority.HIGH]: 24,
  [DisputePriority.MEDIUM]: 48,
  [DisputePriority.LOW]: 72
} as const;

// File Upload Limits
export const DISPUTE_FILE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_DISPUTE: 5,
  MAX_ATTACHMENTS_PER_MESSAGE: 3,
  SUPPORTED_FILE_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/webp',
    'application/pdf',
    'text/plain'
  ] as const,
  SUPPORTED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp'
  ] as const
} as const;

// Text Validation Limits
export const DISPUTE_TEXT_LIMITS = {
  TITLE_MIN_LENGTH: 5,
  TITLE_MAX_LENGTH: 200,
  DESCRIPTION_MIN_LENGTH: 10,
  DESCRIPTION_MAX_LENGTH: 2000,
  MESSAGE_MIN_LENGTH: 1,
  MESSAGE_MAX_LENGTH: 1000,
  RESOLUTION_DESCRIPTION_MAX_LENGTH: 1000,
  ADMIN_NOTES_MAX_LENGTH: 2000,
  EVIDENCE_DESCRIPTION_MAX_LENGTH: 500,
  REASON_CODE_MAX_LENGTH: 50
} as const;

// Priority-based styling
export const DISPUTE_PRIORITY_CONFIG = {
  [DisputePriority.CRITICAL]: {
    color: '#dc2626', // red-600
    bgColor: '#fef2f2', // red-50
    borderColor: '#fecaca', // red-200
    label: 'Critical',
    icon: '🚨',
    urgencyScore: 4
  },
  [DisputePriority.HIGH]: {
    color: '#ea580c', // orange-600
    bgColor: '#fff7ed', // orange-50
    borderColor: '#fed7aa', // orange-200
    label: 'High',
    icon: '⚠️',
    urgencyScore: 3
  },
  [DisputePriority.MEDIUM]: {
    color: '#ca8a04', // yellow-600
    bgColor: '#fefce8', // yellow-50
    borderColor: '#fde047', // yellow-300
    label: 'Medium',
    icon: '📋',
    urgencyScore: 2
  },
  [DisputePriority.LOW]: {
    color: '#16a34a', // green-600
    bgColor: '#f0fdf4', // green-50
    borderColor: '#bbf7d0', // green-200
    label: 'Low',
    icon: '📝',
    urgencyScore: 1
  }
} as const;

// Status-based styling
export const DISPUTE_STATUS_CONFIG = {
  [DisputeStatus.OPEN]: {
    color: '#2563eb', // blue-600
    bgColor: '#eff6ff', // blue-50
    borderColor: '#bfdbfe', // blue-200
    label: 'Open',
    icon: '🔓',
    isActive: true
  },
  [DisputeStatus.IN_PROGRESS]: {
    color: '#ca8a04', // yellow-600
    bgColor: '#fefce8', // yellow-50
    borderColor: '#fde047', // yellow-300
    label: 'In Progress',
    icon: '⏳',
    isActive: true
  },
  [DisputeStatus.RESOLVED]: {
    color: '#16a34a', // green-600
    bgColor: '#f0fdf4', // green-50
    borderColor: '#bbf7d0', // green-200
    label: 'Resolved',
    icon: '✅',
    isActive: false
  },
  [DisputeStatus.CLOSED]: {
    color: '#6b7280', // gray-500
    bgColor: '#f9fafb', // gray-50
    borderColor: '#d1d5db', // gray-300
    label: 'Closed',
    icon: '🔒',
    isActive: false
  },
  [DisputeStatus.ESCALATED]: {
    color: '#dc2626', // red-600
    bgColor: '#fef2f2', // red-50
    borderColor: '#fecaca', // red-200
    label: 'Escalated',
    icon: '🔺',
    isActive: true
  }
} as const;

// Category configuration
export const DISPUTE_CATEGORY_CONFIG = {
  [DisputeCategory.QUALITY_ISSUE]: {
    label: 'Quality Issue',
    description: 'Issues with garment quality, fit, or workmanship',
    icon: '🔍',
    color: '#dc2626',
    suggestedPriority: DisputePriority.HIGH,
    commonReasons: [
      'Poor stitching quality',
      'Incorrect measurements',
      'Fabric defects',
      'Color mismatch',
      'Incomplete work'
    ]
  },
  [DisputeCategory.DELIVERY_DELAY]: {
    label: 'Delivery Delay',
    description: 'Late delivery or missed deadlines',
    icon: '📅',
    color: '#ea580c',
    suggestedPriority: DisputePriority.MEDIUM,
    commonReasons: [
      'Missed agreed deadline',
      'No communication about delays',
      'Repeated postponements',
      'Event/occasion missed'
    ]
  },
  [DisputeCategory.PAYMENT_PROBLEM]: {
    label: 'Payment Problem',
    description: 'Payment-related disputes and refund requests',
    icon: '💰',
    color: '#dc2626',
    suggestedPriority: DisputePriority.HIGH,
    commonReasons: [
      'Overcharging',
      'Hidden fees',
      'Payment processing issues',
      'Refund not processed'
    ]
  },
  [DisputeCategory.COMMUNICATION_ISSUE]: {
    label: 'Communication Issue',
    description: 'Poor communication or unresponsive service',
    icon: '💬',
    color: '#ca8a04',
    suggestedPriority: DisputePriority.MEDIUM,
    commonReasons: [
      'Unresponsive to messages',
      'Poor communication',
      'Misunderstanding requirements',
      'Lack of updates'
    ]
  },
  [DisputeCategory.MILESTONE_REJECTION]: {
    label: 'Milestone Rejection',
    description: 'Disputes arising from rejected milestone approvals',
    icon: '🚫',
    color: '#ea580c',
    suggestedPriority: DisputePriority.HIGH,
    commonReasons: [
      'Disagreement with rejection',
      'Quality meets standards',
      'Measurement disputes',
      'Progress verification issues'
    ]
  },
  [DisputeCategory.OTHER]: {
    label: 'Other',
    description: 'Other issues not covered by standard categories',
    icon: '❓',
    color: '#6b7280',
    suggestedPriority: DisputePriority.MEDIUM,
    commonReasons: [
      'Service not as described',
      'Contract disagreement',
      'Change of requirements',
      'Other concerns'
    ]
  }
} as const;

// Resolution type configuration
export const DISPUTE_RESOLUTION_CONFIG = {
  [DisputeResolutionType.FULL_REFUND]: {
    label: 'Full Refund',
    description: 'Complete refund of all payments',
    icon: '💸',
    color: '#dc2626',
    requiresRefundAmount: true,
    impactsOrder: true
  },
  [DisputeResolutionType.PARTIAL_REFUND]: {
    label: 'Partial Refund',
    description: 'Partial refund with order continuation',
    icon: '💰',
    color: '#ea580c',
    requiresRefundAmount: true,
    impactsOrder: true
  },
  [DisputeResolutionType.ORDER_COMPLETION]: {
    label: 'Order Completion',
    description: 'Continue order with modifications',
    icon: '✏️',
    color: '#16a34a',
    requiresRefundAmount: false,
    impactsOrder: false
  },
  [DisputeResolutionType.NO_ACTION]: {
    label: 'No Action',
    description: 'Dispute rejected, no changes required',
    icon: '❌',
    color: '#6b7280',
    requiresRefundAmount: false,
    impactsOrder: false
  }
} as const;

// Common reason codes for resolutions
export const DISPUTE_REASON_CODES = {
  ADMIN_DECISION: 'Admin Decision',
  CUSTOMER_SATISFACTION: 'Customer Satisfaction',
  QUALITY_ISSUE_CONFIRMED: 'Quality Issue Confirmed',
  DELIVERY_DELAY_CONFIRMED: 'Delivery Delay Confirmed',
  PAYMENT_ERROR: 'Payment Error',
  MISCOMMUNICATION: 'Miscommunication',
  POLICY_VIOLATION: 'Policy Violation',
  TECHNICAL_ISSUE: 'Technical Issue',
  CUSTOMER_REQUEST: 'Customer Request',
  BUSINESS_DECISION: 'Business Decision'
} as const;

// Notification configuration
export const DISPUTE_NOTIFICATION_CONFIG = {
  SLA_WARNING_HOURS: [24, 6, 1], // Send warnings at these hour intervals before SLA
  AUTO_ESCALATION_HOURS: 24, // Auto-escalate if no admin response
  REMINDER_INTERVALS: [24, 12, 6, 1], // Hours before deadline for reminders
  MAX_RETRIES: 3, // Maximum notification retry attempts
  BATCH_SIZE: 50 // Process notifications in batches
} as const;

// Default filters for admin dashboard
export const DEFAULT_ADMIN_FILTERS = {
  ACTIVE_DISPUTES: [DisputeStatus.OPEN, DisputeStatus.IN_PROGRESS],
  HIGH_PRIORITY: [DisputePriority.CRITICAL, DisputePriority.HIGH],
  OVERDUE_ONLY: true,
  RECENT_DAYS: 7
} as const;

// Pagination defaults
export const DISPUTE_PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_SORT_FIELD: 'createdAt' as const,
  DEFAULT_SORT_DIRECTION: 'desc' as const
} as const;

// Performance thresholds
export const DISPUTE_PERFORMANCE_THRESHOLDS = {
  SLA_PERFORMANCE_TARGET: 95, // Percentage
  RESOLUTION_TIME_TARGET_HOURS: 48,
  CUSTOMER_SATISFACTION_TARGET: 4.0, // Out of 5
  MAX_RESPONSE_TIME_MS: 2000
} as const;

// Cache configuration
export const DISPUTE_CACHE_CONFIG = {
  ANALYTICS_TTL: 300, // 5 minutes
  DASHBOARD_TTL: 60, // 1 minute
  DISPUTE_LIST_TTL: 30, // 30 seconds
  MESSAGE_LIST_TTL: 10, // 10 seconds
  EVIDENCE_LIST_TTL: 60 // 1 minute
} as const;

// Rate limiting configuration
export const DISPUTE_RATE_LIMITS = {
  CREATE_DISPUTE: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 5 // Max 5 disputes per hour per user
  },
  UPLOAD_EVIDENCE: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 10 // Max 10 uploads per 5 minutes
  },
  SEND_MESSAGE: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20 // Max 20 messages per minute
  }
} as const;

// Webhook events
export const DISPUTE_WEBHOOK_EVENTS = {
  DISPUTE_CREATED: 'dispute.created',
  DISPUTE_ASSIGNED: 'dispute.assigned',
  DISPUTE_MESSAGE_SENT: 'dispute.message.sent',
  DISPUTE_EVIDENCE_UPLOADED: 'dispute.evidence.uploaded',
  DISPUTE_RESOLVED: 'dispute.resolved',
  DISPUTE_SLA_WARNING: 'dispute.sla.warning',
  DISPUTE_ESCALATED: 'dispute.escalated'
} as const;

// Error codes
export const DISPUTE_ERROR_CODES = {
  DISPUTE_NOT_FOUND: 'DISPUTE_NOT_FOUND',
  DISPUTE_ALREADY_RESOLVED: 'DISPUTE_ALREADY_RESOLVED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SLA_ALREADY_PASSED: 'SLA_ALREADY_PASSED',
  INVALID_RESOLUTION_TYPE: 'INVALID_RESOLUTION_TYPE',
  REFUND_AMOUNT_REQUIRED: 'REFUND_AMOUNT_REQUIRED',
  ADMIN_ASSIGNMENT_REQUIRED: 'ADMIN_ASSIGNMENT_REQUIRED'
} as const;

// Helper functions for constants
export const getDisputePriorityConfig = (priority: DisputePriority) => 
  DISPUTE_PRIORITY_CONFIG[priority];

export const getDisputeStatusConfig = (status: DisputeStatus) => 
  DISPUTE_STATUS_CONFIG[status];

export const getDisputeCategoryConfig = (category: DisputeCategory) => 
  DISPUTE_CATEGORY_CONFIG[category];

export const getDisputeResolutionConfig = (resolutionType: DisputeResolutionType) => 
  DISPUTE_RESOLUTION_CONFIG[resolutionType];

export const getSlaHours = (priority: DisputePriority): number => 
  DISPUTE_SLA_HOURS[priority];

export const isFileTypeSupported = (fileType: string): boolean =>
  (DISPUTE_FILE_LIMITS.SUPPORTED_FILE_TYPES as readonly string[]).includes(fileType);

export const isImageFile = (fileType: string): boolean =>
  (DISPUTE_FILE_LIMITS.SUPPORTED_IMAGE_TYPES as readonly string[]).includes(fileType);

// Export all constants as a single object for easier importing
export const DISPUTE_CONSTANTS = {
  SLA_HOURS: DISPUTE_SLA_HOURS,
  FILE_LIMITS: DISPUTE_FILE_LIMITS,
  TEXT_LIMITS: DISPUTE_TEXT_LIMITS,
  PRIORITY_CONFIG: DISPUTE_PRIORITY_CONFIG,
  STATUS_CONFIG: DISPUTE_STATUS_CONFIG,
  CATEGORY_CONFIG: DISPUTE_CATEGORY_CONFIG,
  RESOLUTION_CONFIG: DISPUTE_RESOLUTION_CONFIG,
  REASON_CODES: DISPUTE_REASON_CODES,
  NOTIFICATION_CONFIG: DISPUTE_NOTIFICATION_CONFIG,
  DEFAULT_ADMIN_FILTERS: DEFAULT_ADMIN_FILTERS,
  PAGINATION_DEFAULTS: DISPUTE_PAGINATION_DEFAULTS,
  PERFORMANCE_THRESHOLDS: DISPUTE_PERFORMANCE_THRESHOLDS,
  CACHE_CONFIG: DISPUTE_CACHE_CONFIG,
  RATE_LIMITS: DISPUTE_RATE_LIMITS,
  WEBHOOK_EVENTS: DISPUTE_WEBHOOK_EVENTS,
  ERROR_CODES: DISPUTE_ERROR_CODES
} as const;