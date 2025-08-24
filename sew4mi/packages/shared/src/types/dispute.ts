// Dispute Resolution Framework Types
// Story 2.4: Comprehensive dispute types for resolution system

export enum DisputeCategory {
  QUALITY_ISSUE = 'QUALITY_ISSUE',
  DELIVERY_DELAY = 'DELIVERY_DELAY',
  PAYMENT_PROBLEM = 'PAYMENT_PROBLEM',
  COMMUNICATION_ISSUE = 'COMMUNICATION_ISSUE',
  MILESTONE_REJECTION = 'MILESTONE_REJECTION',
  OTHER = 'OTHER'
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  ESCALATED = 'ESCALATED'
}

export enum DisputePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum DisputeResolutionType {
  FULL_REFUND = 'FULL_REFUND',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
  ORDER_COMPLETION = 'ORDER_COMPLETION',
  NO_ACTION = 'NO_ACTION'
}

export enum DisputeParticipantRole {
  CUSTOMER = 'customer',
  TAILOR = 'tailor',
  ADMIN = 'admin'
}

// Request Types (moved to avoid duplicate interface)
// ResolveDisputeRequest is defined later in the file

// Core Dispute Interface
export interface Dispute {
  id: string;
  orderId: string;
  milestoneId?: string; // Optional for non-milestone disputes
  createdBy: string;
  category: DisputeCategory;
  title: string;
  description: string;
  status: DisputeStatus;
  priority: DisputePriority;
  assignedAdmin?: string;
  slaDeadline: Date;
  
  // Resolution fields
  resolutionType?: DisputeResolutionType;
  resolutionDescription?: string;
  refundAmount?: number;
  resolvedBy?: string;
  resolvedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Dispute Evidence Interface
export interface DisputeEvidence {
  id: string;
  disputeId: string;
  uploadedBy: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  description?: string;
  uploadedAt: Date;
}

// Dispute Message Interface
export interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderRole: DisputeParticipantRole;
  senderName: string;
  message: string;
  attachments?: string[];
  isInternal: boolean; // Admin-only internal notes
  readBy: string[]; // Array of user IDs who have read the message
  createdAt: Date;
}

// Dispute Resolution Interface
export interface DisputeResolution {
  id: string;
  disputeId: string;
  resolutionType: DisputeResolutionType;
  outcome: string;
  refundAmount?: number;
  reasonCode: string;
  adminNotes?: string;
  customerNotified: boolean;
  tailorNotified: boolean;
  paymentProcessed: boolean;
  resolvedBy: string;
  resolvedAt: Date;
}

// Dashboard View Interfaces
export interface AdminDisputeDashboardItem {
  id: string;
  orderId: string;
  category: DisputeCategory;
  title: string;
  status: DisputeStatus;
  priority: DisputePriority;
  assignedAdmin?: string;
  slaDeadline: Date;
  createdAt: Date;
  resolvedAt?: Date;
  orderAmount: number;
  creatorEmail: string;
  customerEmail: string;
  tailorEmail: string;
  adminEmail?: string;
  isOverdue: boolean;
  hoursUntilSla: number;
  messageCount: number;
  evidenceCount: number;
}

// Request/Response Types
export interface CreateDisputeRequest {
  orderId: string;
  milestoneId?: string;
  category: DisputeCategory;
  title: string;
  description: string;
}

export interface CreateDisputeResponse {
  disputeId: string;
  priority: DisputePriority;
  slaDeadline: Date;
}

export interface UploadEvidenceRequest {
  disputeId: string;
  file: {
    size: number;
    type: string;
    name: string;
  };
  description?: string;
}

export interface UploadEvidenceResponse {
  evidenceId: string;
  fileUrl: string;
}

export interface SendMessageRequest {
  disputeId: string;
  message: string;
  attachments?: string[];
  isInternal?: boolean;
}

export interface SendMessageResponse {
  messageId: string;
  createdAt: Date;
}

export interface AssignDisputeRequest {
  disputeId: string;
  adminId: string;
}

export interface ResolveDisputeRequest {
  disputeId: string;
  resolutionType: DisputeResolutionType;
  outcome: string;
  refundAmount?: number;
  reasonCode?: string;
  adminNotes?: string;
}

export interface ResolveDisputeResponse {
  resolutionId: string;
  resolvedAt: Date;
  paymentRequired: boolean;
}

// Analytics Types
export interface DisputeAnalytics {
  totalDisputes: number;
  openDisputes: number;
  resolvedDisputes: number;
  avgResolutionTimeHours: number;
  resolutionRate: number;
  categoryBreakdown: Record<DisputeCategory, number>;
  priorityBreakdown: Record<DisputePriority, number>;
  slaPerformance: {
    totalResolved: number;
    slaMet: number;
    slaMissed: number;
    slaPerformanceRate: number;
  };
}

export interface DisputeCategoryStats {
  category: DisputeCategory;
  total: number;
  resolved: number;
  avgResolutionTime: number;
  commonReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

export interface DisputeTrendData {
  date: string;
  opened: number;
  resolved: number;
  pending: number;
}

// Notification Types
export interface DisputeNotification {
  id: string;
  disputeId: string;
  userId: string;
  type: 'DISPUTE_CREATED' | 'DISPUTE_ASSIGNED' | 'DISPUTE_MESSAGE' | 'DISPUTE_RESOLVED' | 'SLA_WARNING';
  title: string;
  message: string;
  data?: {
    disputeId: string;
    orderId: string;
    priority: DisputePriority;
    hoursUntilSla?: number;
  };
  readAt?: Date;
  createdAt: Date;
}

// Utility Types
export interface DisputeFilters {
  status?: DisputeStatus[];
  priority?: DisputePriority[];
  category?: DisputeCategory[];
  assignedAdmin?: string;
  createdBy?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  isOverdue?: boolean;
}

export interface DisputeSortOptions {
  field: 'createdAt' | 'slaDeadline' | 'priority' | 'status' | 'updatedAt';
  direction: 'asc' | 'desc';
}

export interface DisputePaginationOptions {
  page: number;
  limit: number;
  filters?: DisputeFilters;
  sort?: DisputeSortOptions;
}

// Form Validation Types
export interface DisputeValidationErrors {
  title?: string;
  description?: string;
  category?: string;
  evidence?: string;
}

export interface MessageValidationErrors {
  message?: string;
  attachments?: string;
}

// Constants are now in ../constants/dispute.ts

// Type guards
export function isDisputeCategory(value: string): value is DisputeCategory {
  return Object.values(DisputeCategory).includes(value as DisputeCategory);
}

export function isDisputeStatus(value: string): value is DisputeStatus {
  return Object.values(DisputeStatus).includes(value as DisputeStatus);
}

export function isDisputePriority(value: string): value is DisputePriority {
  return Object.values(DisputePriority).includes(value as DisputePriority);
}

export function isDisputeResolutionType(value: string): value is DisputeResolutionType {
  return Object.values(DisputeResolutionType).includes(value as DisputeResolutionType);
}

// Helper functions
export function getDisputePriorityColor(priority: DisputePriority): string {
  switch (priority) {
    case DisputePriority.CRITICAL:
      return 'red';
    case DisputePriority.HIGH:
      return 'orange';
    case DisputePriority.MEDIUM:
      return 'yellow';
    case DisputePriority.LOW:
      return 'green';
    default:
      return 'gray';
  }
}

export function getDisputeStatusColor(status: DisputeStatus): string {
  switch (status) {
    case DisputeStatus.OPEN:
      return 'blue';
    case DisputeStatus.IN_PROGRESS:
      return 'yellow';
    case DisputeStatus.RESOLVED:
      return 'green';
    case DisputeStatus.CLOSED:
      return 'gray';
    case DisputeStatus.ESCALATED:
      return 'red';
    default:
      return 'gray';
  }
}

export function formatDisputeCategory(category: DisputeCategory): string {
  switch (category) {
    case DisputeCategory.QUALITY_ISSUE:
      return 'Quality Issue';
    case DisputeCategory.DELIVERY_DELAY:
      return 'Delivery Delay';
    case DisputeCategory.PAYMENT_PROBLEM:
      return 'Payment Problem';
    case DisputeCategory.COMMUNICATION_ISSUE:
      return 'Communication Issue';
    case DisputeCategory.MILESTONE_REJECTION:
      return 'Milestone Rejection';
    case DisputeCategory.OTHER:
      return 'Other';
    default:
      return category;
  }
}

export function isDisputeOverdue(dispute: Dispute): boolean {
  return ['OPEN', 'IN_PROGRESS'].includes(dispute.status) && 
         new Date() > dispute.slaDeadline;
}

export function getHoursUntilSla(dispute: Dispute): number {
  const now = new Date();
  const hoursRemaining = (dispute.slaDeadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  return Math.max(0, hoursRemaining);
}

export function isSupportedFileType(_fileType: string): boolean {
  // This function is now available in ../constants/dispute.ts
  return false; // Deprecated - use isFileTypeSupported from constants/dispute
}