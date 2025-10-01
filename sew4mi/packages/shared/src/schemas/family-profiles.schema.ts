/**
 * Zod validation schemas for family measurement profiles
 * Provides type-safe validation for all family profile operations
 */

import { z } from 'zod';
import { Gender } from '../types/order-creation';
import {
  RelationshipType,
  ProfileVisibility,
  ReminderFrequency,
  FamilyPermission
} from '../types/family-profiles';

// Base measurement validation schema
const MeasurementsSchema = z.record(z.string(), z.number().positive().optional());

// Privacy settings schema
export const FamilyPrivacySettingsSchema = z.object({
  visibility: z.nativeEnum(ProfileVisibility),
  shareWithFamily: z.boolean(),
  allowEditing: z.boolean()
});

// Growth tracking settings schema
export const GrowthTrackingSettingsSchema = z.object({
  lastMeasurementUpdate: z.date(),
  reminderFrequency: z.nativeEnum(ReminderFrequency),
  nextReminderDate: z.date().optional(),
  isTrackingEnabled: z.boolean()
});

// Core family profile schema
export const FamilyMeasurementProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  nickname: z.string().min(1, "Nickname is required").max(50, "Nickname too long"),
  gender: z.nativeEnum(Gender),
  relationship: z.nativeEnum(RelationshipType),
  birthDate: z.date().optional(),
  age: z.number().int().min(0).max(120).optional(),
  avatarUrl: z.string().url().optional(),
  measurements: MeasurementsSchema,
  voiceNoteUrl: z.string().url().optional(),
  lastUpdated: z.date(),
  isActive: z.boolean(),
  privacySettings: FamilyPrivacySettingsSchema,
  growthTracking: GrowthTrackingSettingsSchema,
  familyAccountId: z.string().uuid().optional(),
  createdBy: z.string().uuid(),
  sharedWith: z.array(z.string().uuid()),
  auditTrail: z.array(z.any()) // Simplified for now
});

// Family account schemas
export const FamilyAccountSettingsSchema = z.object({
  allowInvitations: z.boolean(),
  defaultProfileVisibility: z.nativeEnum(ProfileVisibility),
  requireApprovalForSharing: z.boolean(),
  maxMembers: z.number().int().min(1).max(20)
});

export const FamilyAccountSchema = z.object({
  id: z.string().uuid(),
  primaryUserId: z.string().uuid(),
  familyName: z.string().min(1).max(100).optional(),
  memberIds: z.array(z.string().uuid()),
  sharedProfileIds: z.array(z.string().uuid()),
  createdAt: z.date(),
  updatedAt: z.date(),
  inviteCode: z.string().min(6).max(20).optional(),
  settings: FamilyAccountSettingsSchema
});

// API request/response schemas
export const CreateFamilyProfileRequestSchema = z.object({
  nickname: z.string().min(1, "Nickname is required").max(50, "Nickname too long"),
  relationship: z.nativeEnum(RelationshipType),
  gender: z.nativeEnum(Gender),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format").optional(),
  measurements: MeasurementsSchema.refine(
    (measurements) => Object.keys(measurements).length > 0,
    "At least one measurement is required"
  ),
  voiceNoteUrl: z.string().url().optional(),
  avatarUrl: z.string().url().optional(),
  privacySettings: FamilyPrivacySettingsSchema,
  growthTracking: z.object({
    reminderFrequency: z.nativeEnum(ReminderFrequency),
    isTrackingEnabled: z.boolean()
  })
}).refine(
  (data) => {
    // If relationship is CHILD and no birthDate, require explicit age tracking
    if (data.relationship === RelationshipType.CHILD && !data.birthDate) {
      return data.growthTracking.isTrackingEnabled === false;
    }
    return true;
  },
  {
    message: "Birth date is required for children when growth tracking is enabled",
    path: ["birthDate"]
  }
);

export const UpdateFamilyProfileRequestSchema = z.object({
  profileId: z.string().uuid(),
  updates: z.object({
    nickname: z.string().min(1).max(50).optional(),
    relationship: z.nativeEnum(RelationshipType).optional(),
    gender: z.nativeEnum(Gender).optional(),
    birthDate: z.date().optional(),
    avatarUrl: z.string().url().optional(),
    measurements: MeasurementsSchema.optional(),
    voiceNoteUrl: z.string().url().optional(),
    privacySettings: FamilyPrivacySettingsSchema.optional(),
    growthTracking: z.object({
      reminderFrequency: z.nativeEnum(ReminderFrequency).optional(),
      isTrackingEnabled: z.boolean().optional()
    }).optional(),
    isActive: z.boolean().optional()
  }).partial()
});

export const FamilyProfilesListRequestSchema = z.object({
  includeInactive: z.boolean().optional(),
  relationship: z.nativeEnum(RelationshipType).optional(),
  sortBy: z.enum(['nickname', 'age', 'lastUpdated', 'relationship']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

// Growth tracking schemas
export const ScheduleReminderRequestSchema = z.object({
  profileId: z.string().uuid(),
  frequency: z.nativeEnum(ReminderFrequency),
  nextReminderDate: z.date().optional(),
  notificationChannels: z.array(z.enum(['SMS', 'WHATSAPP', 'EMAIL', 'PUSH'])).min(1, "At least one notification channel required")
});

export const GrowthHistoryRequestSchema = z.object({
  profileId: z.string().uuid(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  includePhotos: z.boolean().optional()
});

// Family account management schemas
export const CreateFamilyAccountRequestSchema = z.object({
  familyName: z.string().min(1).max(100).optional(),
  settings: FamilyAccountSettingsSchema.partial().optional()
});

export const InviteToFamilyRequestSchema = z.object({
  familyAccountId: z.string().uuid(),
  inviteeEmail: z.string().email().optional(),
  inviteePhone: z.string().regex(/^\+233[0-9]{9}$/, "Invalid Ghana phone number format").optional(),
  relationship: z.nativeEnum(RelationshipType),
  permissions: z.array(z.nativeEnum(FamilyPermission)).min(1, "At least one permission required")
}).refine(
  (data) => data.inviteeEmail || data.inviteePhone,
  {
    message: "Either email or phone number is required",
    path: ["inviteeEmail"]
  }
);

export const JoinFamilyRequestSchema = z.object({
  inviteCode: z.string().min(6).max(20),
  nickname: z.string().min(1).max(50).optional()
});

// Profile sharing schemas
export const ShareProfileRequestSchema = z.object({
  profileId: z.string().uuid(),
  shareWithUserIds: z.array(z.string().uuid()).min(1, "At least one user ID required"),
  permissions: z.nativeEnum(FamilyPermission),
  expirationDate: z.date().optional()
});

export const UpdatePrivacySettingsRequestSchema = z.object({
  profileId: z.string().uuid(),
  privacySettings: FamilyPrivacySettingsSchema
});

// Measurement history schema
export const MeasurementHistorySchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  measurements: MeasurementsSchema,
  recordedAt: z.date(),
  recordedBy: z.string().uuid(),
  notes: z.string().max(500).optional(),
  photoUrls: z.array(z.string().url()).optional()
});

// Validation helpers and custom validators
export const validateGhanaPhoneNumber = (phone: string): boolean => {
  const ghanaPhoneRegex = /^\+233[0-9]{9}$/;
  return ghanaPhoneRegex.test(phone);
};

export const validateAge = (birthDate: Date): number => {
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1;
  }
  
  return age;
};

export const validateMeasurementsForAge = (measurements: Record<string, number>, age?: number): string[] => {
  const errors: string[] = [];
  
  if (!age) return errors;
  
  // Age-based measurement validation
  if (age < 2) {
    // Infant measurements
    if (measurements.chest && (measurements.chest < 40 || measurements.chest > 60)) {
      errors.push("Chest measurement seems unusual for an infant");
    }
  } else if (age < 12) {
    // Child measurements
    if (measurements.chest && (measurements.chest < 50 || measurements.chest > 90)) {
      errors.push("Chest measurement seems unusual for a child");
    }
  } else if (age < 18) {
    // Teen measurements
    if (measurements.chest && (measurements.chest < 70 || measurements.chest > 120)) {
      errors.push("Chest measurement seems unusual for a teenager");
    }
  } else {
    // Adult measurements
    if (measurements.chest && (measurements.chest < 80 || measurements.chest > 140)) {
      errors.push("Chest measurement seems unusual for an adult");
    }
  }
  
  return errors;
};

// Export all schemas as a collection
export const FamilyProfileSchemas = {
  FamilyMeasurementProfile: FamilyMeasurementProfileSchema,
  CreateFamilyProfileRequest: CreateFamilyProfileRequestSchema,
  UpdateFamilyProfileRequest: UpdateFamilyProfileRequestSchema,
  FamilyProfilesListRequest: FamilyProfilesListRequestSchema,
  ScheduleReminderRequest: ScheduleReminderRequestSchema,
  GrowthHistoryRequest: GrowthHistoryRequestSchema,
  CreateFamilyAccountRequest: CreateFamilyAccountRequestSchema,
  InviteToFamilyRequest: InviteToFamilyRequestSchema,
  JoinFamilyRequest: JoinFamilyRequestSchema,
  ShareProfileRequest: ShareProfileRequestSchema,
  UpdatePrivacySettingsRequest: UpdatePrivacySettingsRequestSchema,
  MeasurementHistory: MeasurementHistorySchema,
  FamilyAccount: FamilyAccountSchema
} as const;