/**
 * Family measurement profile types for the Sew4Mi platform
 * Extends the existing measurement profile system for family member management
 */

import { OrderMeasurementProfile, Gender } from './order-creation'

// Core family profile types
export enum RelationshipType {
  SELF = 'SELF',
  SPOUSE = 'SPOUSE',
  CHILD = 'CHILD',
  PARENT = 'PARENT',
  SIBLING = 'SIBLING',
  OTHER = 'OTHER'
}

export enum ProfileVisibility {
  PRIVATE = 'PRIVATE',
  FAMILY_ONLY = 'FAMILY_ONLY',
  PUBLIC = 'PUBLIC'
}

export enum ReminderFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  BIANNUALLY = 'BIANNUALLY',
  NEVER = 'NEVER'
}

export enum FamilyPermission {
  VIEW_ONLY = 'VIEW_ONLY',
  EDIT = 'EDIT',
  ADMIN = 'ADMIN'
}

// Privacy and sharing interfaces
export interface FamilyPrivacySettings {
  visibility: ProfileVisibility;
  shareWithFamily: boolean;
  allowEditing: boolean;
}

export interface GrowthTrackingSettings {
  lastMeasurementUpdate: Date;
  reminderFrequency: ReminderFrequency;
  nextReminderDate?: Date;
  isTrackingEnabled: boolean;
}

// Extended family measurement profile
export interface FamilyMeasurementProfile extends OrderMeasurementProfile {
  relationship: RelationshipType;
  birthDate?: Date;
  age?: number;
  avatarUrl?: string;
  privacySettings: FamilyPrivacySettings;
  growthTracking: GrowthTrackingSettings;
  familyAccountId?: string;
  createdBy: string;
  sharedWith: string[]; // Array of user IDs who have access
  auditTrail: ProfileAuditEntry[];
}

// Family account management
export interface FamilyAccount {
  id: string;
  primaryUserId: string;
  familyName?: string;
  memberIds: string[]; // Array of user IDs in the family
  sharedProfileIds: string[]; // Array of profile IDs shared across family
  createdAt: Date;
  updatedAt: Date;
  inviteCode?: string;
  settings: FamilyAccountSettings;
}

export interface FamilyAccountSettings {
  allowInvitations: boolean;
  defaultProfileVisibility: ProfileVisibility;
  requireApprovalForSharing: boolean;
  maxMembers: number;
}

// Family member information
export interface FamilyMember {
  id: string;
  userId: string;
  familyAccountId: string;
  relationship: RelationshipType;
  nickname?: string;
  joinedAt: Date;
  permissions: FamilyPermission[];
  isActive: boolean;
}

// Growth tracking and history
export interface MeasurementHistory {
  id: string;
  profileId: string;
  measurements: Record<string, number>;
  recordedAt: Date;
  recordedBy: string;
  notes?: string;
  photoUrls?: string[];
}

export interface GrowthChart {
  profileId: string;
  measurements: {
    date: Date;
    chest?: number;
    waist?: number;
    height?: number;
    weight?: number;
    [key: string]: Date | number | undefined;
  }[];
  growthRate: Record<string, number>; // percentage change per month
  predictions?: Record<string, number>; // predicted measurements for next period
}

// Audit and security
export interface ProfileAuditEntry {
  id: string;
  profileId: string;
  action: ProfileAuditAction;
  performedBy: string;
  performedAt: Date;
  details?: Record<string, any>;
  ipAddress?: string;
}

export enum ProfileAuditAction {
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  SHARED = 'SHARED',
  UNSHARED = 'UNSHARED',
  VIEWED = 'VIEWED',
  DELETED = 'DELETED',
  RESTORED = 'RESTORED'
}

// API Request/Response types for family profiles
export interface CreateFamilyProfileRequest {
  nickname: string;
  relationship: RelationshipType;
  gender: Gender;
  birthDate?: string;
  measurements: Record<string, number>;
  voiceNoteUrl?: string;
  avatarUrl?: string;
  privacySettings: FamilyPrivacySettings;
  growthTracking: Omit<GrowthTrackingSettings, 'lastMeasurementUpdate' | 'nextReminderDate'>;
}

export interface CreateFamilyProfileResponse {
  success: boolean;
  profile?: FamilyMeasurementProfile;
  errors?: string[];
}

export interface UpdateFamilyProfileRequest {
  profileId: string;
  updates: Partial<Omit<FamilyMeasurementProfile, 'id' | 'userId' | 'createdAt' | 'auditTrail'>>;
}

export interface FamilyProfilesListRequest {
  includeInactive?: boolean;
  relationship?: RelationshipType;
  sortBy?: 'nickname' | 'age' | 'lastUpdated' | 'relationship';
  sortOrder?: 'asc' | 'desc';
}

export interface FamilyProfilesListResponse {
  profiles: FamilyMeasurementProfile[];
  totalCount: number;
}

// Growth tracking API types
export interface ScheduleReminderRequest {
  profileId: string;
  frequency: ReminderFrequency;
  nextReminderDate?: Date;
  notificationChannels: ('SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH')[];
}

export interface GrowthHistoryRequest {
  profileId: string;
  startDate?: Date;
  endDate?: Date;
  includePhotos?: boolean;
}

export interface GrowthHistoryResponse {
  history: MeasurementHistory[];
  growthChart?: GrowthChart;
  recommendations?: string[];
}

// Family account management API types
export interface CreateFamilyAccountRequest {
  familyName?: string;
  settings?: Partial<FamilyAccountSettings>;
}

export interface InviteToFamilyRequest {
  familyAccountId: string;
  inviteeEmail?: string;
  inviteePhone?: string;
  relationship: RelationshipType;
  permissions: FamilyPermission[];
}

export interface JoinFamilyRequest {
  inviteCode: string;
  nickname?: string;
}

// Profile sharing API types
export interface ShareProfileRequest {
  profileId: string;
  shareWithUserIds: string[];
  permissions: FamilyPermission;
  expirationDate?: Date;
}

export interface ShareProfileResponse {
  success: boolean;
  sharedWith: string[];
  shareLink?: string;
  errors?: string[];
}

// Privacy management API types  
export interface UpdatePrivacySettingsRequest {
  profileId: string;
  privacySettings: FamilyPrivacySettings;
}

export interface FamilyProfileAccessRequest {
  profileId: string;
  requestedBy: string;
  reason?: string;
}

// Validation and error types
export interface FamilyProfileValidation {
  nickname?: string;
  relationship?: string;
  birthDate?: string;
  measurements?: string;
  privacySettings?: string;
  growthTracking?: string;
}

export interface FamilyProfileConflict {
  type: 'DUPLICATE_NICKNAME' | 'MEASUREMENT_MISMATCH' | 'AGE_INCONSISTENCY' | 'PERMISSION_DENIED';
  message: string;
  conflictingProfile?: string;
  suggestedResolution?: string;
}

// Component state management types
export interface FamilyProfileState {
  familyProfiles: FamilyMeasurementProfile[];
  selectedProfileId: string | null;
  activeFamily: FamilyAccount | null;
  isLoading: boolean;
  error: string | null;
  filters: {
    relationship?: RelationshipType;
    ageRange?: [number, number];
    hasRecentMeasurements?: boolean;
  };
  sortBy: 'nickname' | 'age' | 'lastUpdated';
  sortOrder: 'asc' | 'desc';
}

export interface FamilyProfileActions {
  // Profile management
  loadFamilyProfiles: () => Promise<void>;
  createFamilyProfile: (profile: CreateFamilyProfileRequest) => Promise<FamilyMeasurementProfile>;
  updateFamilyProfile: (profileId: string, updates: Partial<FamilyMeasurementProfile>) => Promise<void>;
  deleteFamilyProfile: (profileId: string) => Promise<void>;
  
  // Selection and filtering
  selectProfile: (profileId: string | null) => void;
  setFilters: (filters: Partial<FamilyProfileState['filters']>) => void;
  setSorting: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  
  // Growth tracking
  scheduleReminder: (profileId: string, frequency: ReminderFrequency) => Promise<void>;
  updateMeasurements: (profileId: string, measurements: Record<string, number>) => Promise<void>;
  getGrowthHistory: (profileId: string) => Promise<GrowthChart>;
  
  // Privacy and sharing
  updatePrivacySettings: (profileId: string, settings: FamilyPrivacySettings) => Promise<void>;
  shareProfile: (profileId: string, shareWith: string[], permissions: FamilyPermission) => Promise<void>;
  
  // Family account management
  createFamilyAccount: (name?: string) => Promise<FamilyAccount>;
  inviteToFamily: (email: string, relationship: RelationshipType) => Promise<void>;
  
  // Utility actions
  clearError: () => void;
  setLoading: (loading: boolean) => void;
}