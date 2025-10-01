/**
 * Milestone verification system types for order progress tracking
 * @file milestone.ts
 */

/**
 * Available milestone stages in the tailoring process
 */
export enum MilestoneStage {
  FABRIC_SELECTED = 'FABRIC_SELECTED',
  CUTTING_STARTED = 'CUTTING_STARTED', 
  INITIAL_ASSEMBLY = 'INITIAL_ASSEMBLY',
  FITTING_READY = 'FITTING_READY',
  ADJUSTMENTS_COMPLETE = 'ADJUSTMENTS_COMPLETE',
  FINAL_PRESSING = 'FINAL_PRESSING',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY'
}

/**
 * Type alias for backward compatibility
 * @deprecated Use MilestoneStage instead
 */
export type MilestoneType = MilestoneStage;

/**
 * Approval status for milestone completion
 */
export enum MilestoneApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED', 
  REJECTED = 'REJECTED'
}

/**
 * Actions that can be taken on milestone approvals
 */
export enum MilestoneApprovalAction {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  AUTO_APPROVED = 'AUTO_APPROVED'
}

/**
 * Extended order milestone with verification and approval fields
 */
export interface OrderMilestone {
  /** Unique milestone identifier */
  id: string;
  /** Associated order ID */
  orderId: string;
  /** Milestone stage in the tailoring process */
  milestone: MilestoneStage;
  /** URL to uploaded verification photo */
  photoUrl: string;
  /** Optional notes from tailor about milestone */
  notes: string;
  /** Timestamp when milestone was verified */
  verifiedAt: Date;
  /** ID of user who verified the milestone */
  verifiedBy: string;
  /** Current approval status */
  approvalStatus: MilestoneApprovalStatus;
  /** Timestamp when customer reviewed the milestone */
  customerReviewedAt?: Date;
  /** Deadline for automatic approval if no customer response */
  autoApprovalDeadline: Date;
  /** Reason provided if milestone was rejected */
  rejectionReason?: string;
  /** Created timestamp */
  createdAt: Date;
  /** Last updated timestamp */
  updatedAt: Date;
}

/**
 * Audit trail record for milestone approval decisions
 */
export interface MilestoneApproval {
  /** Unique approval record ID */
  id: string;
  /** Associated milestone ID */
  milestoneId: string;
  /** Associated order ID */
  orderId: string;
  /** Customer who made the approval decision */
  customerId: string;
  /** Action taken (approved/rejected/auto-approved) */
  action: MilestoneApprovalAction;
  /** Optional comment provided with decision */
  comment?: string;
  /** Timestamp when decision was made */
  reviewedAt: Date;
}

/**
 * Request payload for milestone photo upload
 */
export interface MilestonePhotoUploadRequest {
  /** Base64 encoded image data */
  imageData: string;
  /** Original filename */
  filename: string;
  /** MIME type of the image */
  mimeType: string;
  /** Optional milestone notes */
  notes?: string;
}

/**
 * Response from milestone photo upload
 */
export interface MilestonePhotoUploadResponse {
  /** Success status */
  success: boolean;
  /** URL of uploaded photo */
  photoUrl: string;
  /** CDN-optimized URL for display */
  cdnUrl: string;
  /** Thumbnail URL for quick preview */
  thumbnailUrl: string;
  /** Upload timestamp */
  uploadedAt: Date;
}

/**
 * Request payload for milestone approval
 */
export interface MilestoneApprovalRequest {
  /** Action being taken */
  action: Exclude<MilestoneApprovalAction, 'AUTO_APPROVED'>;
  /** Optional comment for the decision */
  comment?: string;
}

/**
 * Response from milestone approval/rejection
 */
export interface MilestoneApprovalResponse {
  /** Success status */
  success: boolean;
  /** Updated approval status */
  approvalStatus: MilestoneApprovalStatus;
  /** Timestamp of the decision */
  reviewedAt: Date;
  /** Whether payment was triggered */
  paymentTriggered?: boolean;
}

/**
 * Milestone progress tracking data
 */
export interface MilestoneProgress {
  /** Current milestone stage */
  currentStage: MilestoneStage;
  /** List of completed milestones */
  completedMilestones: OrderMilestone[];
  /** List of pending approval milestones */
  pendingApproval: OrderMilestone[];
  /** Overall completion percentage */
  progressPercentage: number;
  /** Next expected milestone */
  nextMilestone?: MilestoneStage;
}

/**
 * Dispute creation request for rejected milestone
 */
export interface MilestoneDisputeRequest {
  /** Milestone ID being disputed */
  milestoneId: string;
  /** Order ID */
  orderId: string;
  /** Dispute reason */
  reason: string;
  /** Additional evidence or context */
  evidence?: string;
  /** URLs to supporting photos/documents */
  evidenceUrls?: string[];
}

/**
 * Auto-approval cron job processing result
 */
export interface AutoApprovalResult {
  /** Number of milestones processed */
  processed: number;
  /** Number automatically approved */
  autoApproved: number;
  /** Number that failed processing */
  failed: number;
  /** List of milestone IDs that were auto-approved */
  approvedMilestoneIds: string[];
  /** List of errors encountered */
  errors: string[];
}

/**
 * Milestone approval history for audit trail
 */
export interface MilestoneApprovalHistory {
  /** Approval record ID */
  id: string;
  /** Associated milestone information */
  milestone: {
    id: string;
    milestone: MilestoneStage;
    photoUrl: string;
    notes: string;
    verifiedAt: Date;
    approvalStatus: MilestoneApprovalStatus;
    autoApprovalDeadline: Date;
  };
  /** Customer who made the decision */
  customer: {
    id: string;
    email: string;
    profiles?: {
      fullName: string;
    };
  };
  /** Action taken */
  action: MilestoneApprovalAction;
  /** Optional comment */
  comment?: string;
  /** Decision timestamp */
  reviewedAt: Date;
}

/**
 * Comprehensive milestone analytics data
 */
export interface MilestoneAnalytics {
  /** Total number of milestones */
  totalMilestones: number;
  /** Number of approved milestones */
  approvedMilestones: number;
  /** Number of rejected milestones */
  rejectedMilestones: number;
  /** Number of pending milestones */
  pendingMilestones: number;
  /** Number of auto-approved milestones */
  autoApprovedMilestones: number;
  /** Average approval time in hours */
  averageApprovalTime: number;
  /** Rejection rate as percentage */
  rejectionRate: number;
  /** Milestone breakdown by type */
  milestoneBreakdown: MilestoneBreakdownStats[];
  /** Time series data for trends */
  timeSeries: TimeSeriesData[];
}

/**
 * Milestone breakdown statistics by type
 */
export interface MilestoneBreakdownStats {
  /** Milestone type */
  milestone: string;
  /** Total count */
  total: number;
  /** Approved count */
  approved: number;
  /** Rejected count */
  rejected: number;
  /** Pending count */
  pending: number;
  /** Auto-approved count */
  autoApproved: number;
  /** Average approval time */
  avgApprovalTime: number;
  /** Rejection rate percentage */
  rejectionRate: number;
}

/**
 * Time series data point for milestone trends
 */
export interface TimeSeriesData {
  /** Date string (YYYY-MM-DD) */
  date: string;
  /** Number of milestones submitted */
  submitted: number;
  /** Number approved */
  approved: number;
  /** Number rejected */
  rejected: number;
  /** Number auto-approved */
  autoApproved: number;
}

/**
 * Tailor performance metrics for analytics
 */
export interface TailorPerformanceMetrics {
  /** Tailor ID */
  tailorId: string;
  /** Tailor display name */
  tailorName: string;
  /** Total milestones submitted */
  totalMilestones: number;
  /** Approval rate percentage */
  approvalRate: number;
  /** Rejection rate percentage */
  rejectionRate: number;
  /** Average approval time in hours */
  avgApprovalTime: number;
}

/**
 * Milestone rejection pattern analysis
 */
export interface MilestoneRejectionPattern {
  /** Milestone type */
  milestone: string;
  /** Common rejection reasons with statistics */
  commonReasons: Array<{
    reason: string;
    count: number;
    percentage: number;
  }>;
}

/**
 * High rejection rate alert for admin monitoring
 */
export interface HighRejectionAlert {
  /** Tailor ID */
  tailorId: string;
  /** Tailor name */
  tailorName: string;
  /** Current rejection rate */
  rejectionRate: number;
  /** Total milestones count */
  totalMilestones: number;
  /** Recent rejections count */
  recentRejections: number;
  /** Alert severity level */
  alertLevel: 'WARNING' | 'CRITICAL';
}

/**
 * System health metrics for milestone verification
 */
export interface MilestoneSystemHealth {
  /** Number of overdue pending milestones */
  pendingMilestonesOverdue: number;
  /** Average approval time in last 24h */
  avgApprovalTime24h: number;
  /** Whether rejection rate increased significantly */
  rejectionRateIncrease: boolean;
  /** Auto-approval rate in last 24h */
  autoApprovalRate24h: number;
  /** Overall system status */
  systemStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL';
}

/**
 * Audit export data structure
 */
export interface MilestoneAuditExport {
  /** Milestone records */
  milestones: Record<string, unknown>[];
  /** Approval records */
  approvals: Record<string, unknown>[];
  /** Dispute records */
  disputes: Record<string, unknown>[];
  /** Export timestamp */
  exportDate: string;
  /** Applied filters */
  filters: {
    timeRange?: string;
    startDate?: Date;
    endDate?: Date;
    tailorId?: string;
    milestoneType?: string;
  };
}