/**
 * Constants for milestone verification system
 * @file milestone.ts
 */

import { MilestoneStage } from '../types/milestone';

/**
 * Milestone display names for UI
 */
export const MILESTONE_DISPLAY_NAMES: Record<MilestoneStage, string> = {
  [MilestoneStage.FABRIC_SELECTED]: 'Fabric Selected',
  [MilestoneStage.CUTTING_STARTED]: 'Cutting Started',
  [MilestoneStage.INITIAL_ASSEMBLY]: 'Initial Assembly',
  [MilestoneStage.FITTING_READY]: 'Ready for Fitting',
  [MilestoneStage.ADJUSTMENTS_COMPLETE]: 'Adjustments Complete',
  [MilestoneStage.FINAL_PRESSING]: 'Final Pressing',
  [MilestoneStage.READY_FOR_DELIVERY]: 'Ready for Delivery'
};

/**
 * Milestone descriptions for customer understanding
 */
export const MILESTONE_DESCRIPTIONS: Record<MilestoneStage, string> = {
  [MilestoneStage.FABRIC_SELECTED]: 'Your tailor has selected and confirmed the fabric for your garment',
  [MilestoneStage.CUTTING_STARTED]: 'Cutting of your garment pieces has begun using your measurements',
  [MilestoneStage.INITIAL_ASSEMBLY]: 'Basic assembly of garment pieces is underway',
  [MilestoneStage.FITTING_READY]: 'Your garment is ready for the first fitting session',
  [MilestoneStage.ADJUSTMENTS_COMPLETE]: 'All adjustments from fitting have been completed',
  [MilestoneStage.FINAL_PRESSING]: 'Final pressing and finishing touches are being applied',
  [MilestoneStage.READY_FOR_DELIVERY]: 'Your completed garment is ready for pickup or delivery'
};

/**
 * Milestone order sequence for progress tracking
 */
export const MILESTONE_SEQUENCE: MilestoneStage[] = [
  MilestoneStage.FABRIC_SELECTED,
  MilestoneStage.CUTTING_STARTED,
  MilestoneStage.INITIAL_ASSEMBLY,
  MilestoneStage.FITTING_READY,
  MilestoneStage.ADJUSTMENTS_COMPLETE,
  MilestoneStage.FINAL_PRESSING,
  MilestoneStage.READY_FOR_DELIVERY
];

/**
 * Progress percentage for each milestone
 */
export const MILESTONE_PROGRESS_PERCENTAGES: Record<MilestoneStage, number> = {
  [MilestoneStage.FABRIC_SELECTED]: 15,
  [MilestoneStage.CUTTING_STARTED]: 30,
  [MilestoneStage.INITIAL_ASSEMBLY]: 45,
  [MilestoneStage.FITTING_READY]: 60,
  [MilestoneStage.ADJUSTMENTS_COMPLETE]: 75,
  [MilestoneStage.FINAL_PRESSING]: 90,
  [MilestoneStage.READY_FOR_DELIVERY]: 100
};

/**
 * Expected timeframe for each milestone (in days)
 */
export const MILESTONE_EXPECTED_TIMEFRAMES: Record<MilestoneStage, number> = {
  [MilestoneStage.FABRIC_SELECTED]: 1,
  [MilestoneStage.CUTTING_STARTED]: 2,
  [MilestoneStage.INITIAL_ASSEMBLY]: 5,
  [MilestoneStage.FITTING_READY]: 8,
  [MilestoneStage.ADJUSTMENTS_COMPLETE]: 12,
  [MilestoneStage.FINAL_PRESSING]: 14,
  [MilestoneStage.READY_FOR_DELIVERY]: 15
};

/**
 * Auto-approval timeout (48 hours in milliseconds)
 */
export const AUTO_APPROVAL_TIMEOUT_MS = 48 * 60 * 60 * 1000;

/**
 * Auto-approval timeout (48 hours in hours for display)
 */
export const AUTO_APPROVAL_TIMEOUT_HOURS = 48;

/**
 * Maximum file size for milestone photos (5MB in bytes)
 */
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

/**
 * Supported image formats for milestone photos
 */
export const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/webp'] as const;

/**
 * Image compression settings for Ghana bandwidth optimization
 */
export const IMAGE_COMPRESSION_SETTINGS = {
  quality: 80,
  maxWidth: 1200,
  maxHeight: 1200,
  thumbnailSize: 300,
  format: 'jpeg' as const
};

/**
 * Supabase storage bucket for milestone photos
 */
export const MILESTONE_PHOTOS_BUCKET = 'milestone-photos';

/**
 * CDN cache duration for milestone photos (7 days in seconds)
 */
export const MILESTONE_PHOTO_CACHE_DURATION = 7 * 24 * 60 * 60;

/**
 * Rate limiting for photo uploads (per user per hour)
 */
export const PHOTO_UPLOAD_RATE_LIMIT = 10;

/**
 * Milestone approval notification timing
 */
export const NOTIFICATION_TIMINGS = {
  /** Send reminder 24 hours before auto-approval */
  reminderBeforeAutoApproval: 24 * 60 * 60 * 1000,
  /** Send final reminder 4 hours before auto-approval */
  finalReminderBeforeAutoApproval: 4 * 60 * 60 * 1000,
  /** Send notification immediately when milestone is uploaded */
  immediateNotification: 0
};

/**
 * WhatsApp message templates for milestone notifications
 */
export const WHATSAPP_TEMPLATES = {
  milestoneUploaded: 'milestone_uploaded',
  approvalReminder: 'milestone_approval_reminder',
  autoApprovalWarning: 'milestone_auto_approval_warning',
  milestoneApproved: 'milestone_approved',
  milestoneRejected: 'milestone_rejected'
};

/**
 * Dispute escalation settings
 */
export const DISPUTE_SETTINGS = {
  /** Maximum number of evidence files per dispute */
  maxEvidenceFiles: 5,
  /** Maximum size per evidence file (5MB) */
  maxEvidenceFileSize: 5 * 1024 * 1024,
  /** Automatic escalation timeout (72 hours) */
  autoEscalationTimeout: 72 * 60 * 60 * 1000
};

/**
 * Analytics and monitoring constants
 */
export const ANALYTICS_CONSTANTS = {
  /** Track milestone approval rates by tailor */
  approvalRateThreshold: 0.85,
  /** Flag tailors with high rejection rates */
  rejectionRateThreshold: 0.20,
  /** Minimum milestones for statistical significance */
  minMilestonesForStats: 10
};