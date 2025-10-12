/**
 * Family Profile Service
 * Business logic for managing family member measurement profiles
 */

import { 
  FamilyMeasurementProfile,
  CreateFamilyProfileRequest,
  UpdateFamilyProfileRequest,
  FamilyProfilesListRequest,
  FamilyProfilesListResponse,
  CreateFamilyProfileResponse,
  RelationshipType,
  ProfileVisibility,
  ReminderFrequency,
  FamilyProfileValidation,
  FamilyProfileConflict
} from '@sew4mi/shared/types/family-profiles';
import { 
  CreateFamilyProfileRequestSchema,
  UpdateFamilyProfileRequestSchema,
  validateAge,
  validateMeasurementsForAge 
} from '@sew4mi/shared/schemas/family-profiles.schema';
import {
  getDefaultMeasurements,
  shouldEnableGrowthTracking,
  getDefaultPrivacySettings
} from '@sew4mi/shared/constants/relationships';
import { FamilyProfileRepository } from '../repositories/family-profile.repository';
import { ApiError } from '../utils/errors';

export class FamilyProfileService {
  private repository: FamilyProfileRepository;

  constructor(supabaseClient: any) {
    this.repository = new FamilyProfileRepository(supabaseClient);
  }

  /**
   * Create a new family member profile
   */
  async createFamilyProfile(
    userId: string,
    profileData: CreateFamilyProfileRequest
  ): Promise<CreateFamilyProfileResponse> {
    try {
      

      // Validate input data
      const validation = CreateFamilyProfileRequestSchema.safeParse(profileData);
      if (!validation.success) {
        return {
          success: false,
          errors: validation.error.issues.map(issue => issue.message)
        };
      }

      // Check for duplicate nickname within user's profiles
      const existingProfile = await this.repository.findByNickname(userId, profileData.nickname);
      if (existingProfile) {
        return {
          success: false,
          errors: [`A profile with nickname "${profileData.nickname}" already exists`]
        };
      }

      // Calculate age and validate measurements
      let age: number | undefined;
      let validationErrors: string[] = [];

      if (profileData.birthDate) {
        const birthDate = new Date(profileData.birthDate);
        age = validateAge(birthDate);
        
        // Validate measurements for age
        const measurementErrors = validateMeasurementsForAge(profileData.measurements, age);
        validationErrors.push(...measurementErrors);
      }

      // Apply defaults based on relationship and age
      const defaultMeasurements = getDefaultMeasurements(profileData.relationship, age);
      const shouldTrack = shouldEnableGrowthTracking(profileData.relationship, age);
      const defaultPrivacy = getDefaultPrivacySettings(profileData.relationship);

      // Merge provided measurements with defaults
      const finalMeasurements = {
        ...defaultMeasurements,
        ...profileData.measurements
      };

      // Prepare privacy settings with defaults
      const privacySettings = {
        visibility: profileData.privacySettings.visibility || defaultPrivacy.defaultVisibility as ProfileVisibility,
        shareWithFamily: profileData.privacySettings.shareWithFamily ?? defaultPrivacy.defaultSharing,
        allowEditing: profileData.privacySettings.allowEditing ?? defaultPrivacy.defaultEditing
      };

      // Prepare growth tracking settings
      const growthTracking = {
        isTrackingEnabled: profileData.growthTracking.isTrackingEnabled ?? shouldTrack,
        reminderFrequency: profileData.growthTracking.reminderFrequency || (shouldTrack ? ReminderFrequency.QUARTERLY : ReminderFrequency.NEVER),
        lastMeasurementUpdate: new Date(),
        nextReminderDate: shouldTrack ? this.calculateNextReminderDate(profileData.growthTracking.reminderFrequency) : undefined
      };

      // Create the profile
      const familyProfile: Omit<FamilyMeasurementProfile, 'id' | 'auditTrail'> = {
        userId,
        nickname: profileData.nickname,
        gender: profileData.gender,
        relationship: profileData.relationship,
        birthDate: profileData.birthDate ? new Date(profileData.birthDate) : undefined,
        age,
        avatarUrl: profileData.avatarUrl,
        measurements: finalMeasurements,
        voiceNoteUrl: profileData.voiceNoteUrl,
        lastUpdated: new Date(),
        isActive: true,
        privacySettings,
        growthTracking,
        createdBy: userId,
        sharedWith: []
      };

      const createdProfile = await this.repository.create(familyProfile);

      return {
        success: true,
        profile: createdProfile,
        errors: validationErrors.length > 0 ? validationErrors : undefined
      };

    } catch (error) {
      console.error('Error creating family profile:', error);
      return {
        success: false,
        errors: ['Failed to create family profile. Please try again.']
      };
    }
  }

  /**
   * Get all family profiles for a user
   */
  async getFamilyProfiles(
    userId: string,
    filters?: FamilyProfilesListRequest
  ): Promise<FamilyProfilesListResponse> {
    try {
      
      const profiles = await this.repository.findByUser(userId, {
        includeInactive: filters?.includeInactive,
        relationship: filters?.relationship,
        sortBy: filters?.sortBy || 'nickname',
        sortOrder: filters?.sortOrder || 'asc'
      });

      return {
        profiles,
        totalCount: profiles.length
      };

    } catch (error) {
      console.error('Error fetching family profiles:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });
      // Re-throw the original error with more context
      if (error instanceof Error) {
        throw new ApiError(`Failed to fetch family profiles: ${error.message}`, 500);
      }
      throw new ApiError('Failed to fetch family profiles', 500);
    }
  }

  /**
   * Update a family member profile
   */
  async updateFamilyProfile(
    userId: string,
    profileId: string,
    updates: UpdateFamilyProfileRequest['updates']
  ): Promise<FamilyMeasurementProfile> {
    try {
      

      // Validate input
      const validation = UpdateFamilyProfileRequestSchema.safeParse({
        profileId,
        updates
      });

      if (!validation.success) {
        const errorMessages = validation.error.issues.map(issue =>
          `${issue.path.join('.')}: ${issue.message}`
        ).join(', ');
        console.error('Validation failed:', errorMessages);
        console.error('Validation errors:', JSON.stringify(validation.error.issues, null, 2));
        throw new ApiError(`Invalid update data: ${errorMessages}`, 400);
      }

      // Check if profile exists and user has permission
      const existingProfile = await this.repository.findById(profileId);
      if (!existingProfile) {
        throw new ApiError('Profile not found', 404);
      }

      // Check permissions - user must own profile or have edit access
      if (existingProfile.userId !== userId && !existingProfile.sharedWith.includes(userId)) {
        throw new ApiError('Access denied', 403);
      }

      // Validate nickname uniqueness if being updated
      if (updates.nickname && updates.nickname !== existingProfile.nickname) {
        const duplicateProfile = await this.repository.findByNickname(userId, updates.nickname);
        if (duplicateProfile) {
          throw new ApiError(`Profile with nickname "${updates.nickname}" already exists`, 400);
        }
      }

      // Validate measurements for age if either is being updated
      let validationErrors: string[] = [];
      if (updates.measurements || updates.birthDate) {
        const birthDate = updates.birthDate ? new Date(updates.birthDate) : existingProfile.birthDate;
        if (birthDate) {
          const age = validateAge(birthDate);
          const measurements = updates.measurements || existingProfile.measurements;
          validationErrors = validateMeasurementsForAge(measurements, age);
        }
      }

      // Recalculate growth tracking if relationship or birth date changed
      if (updates.relationship || updates.birthDate) {
        const relationship = updates.relationship || existingProfile.relationship;
        const birthDate = updates.birthDate ? new Date(updates.birthDate) : existingProfile.birthDate;
        const age = birthDate ? validateAge(birthDate) : undefined;
        
        if (!updates.growthTracking) {
          const shouldTrack = shouldEnableGrowthTracking(relationship, age);
          updates.growthTracking = {
            isTrackingEnabled: shouldTrack,
            reminderFrequency: shouldTrack ? ReminderFrequency.QUARTERLY : ReminderFrequency.NEVER
          };
        }
      }

      // Update calculated age if birth date changed
      if (updates.birthDate) {
        (updates as any).age = validateAge(new Date(updates.birthDate));
      }

      // Update lastUpdated timestamp
      (updates as any).lastUpdated = new Date();

      const updatedProfile = await this.repository.update(profileId, updates);

      // Log validation warnings if any
      if (validationErrors.length > 0) {
        console.warn('Profile updated with measurement warnings:', validationErrors);
      }

      return updatedProfile;

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error updating family profile:', error);
      throw new ApiError('Failed to update family profile', 500);
    }
  }

  /**
   * Delete (archive) a family profile
   */
  async deleteFamilyProfile(userId: string, profileId: string): Promise<void> {
    try {
      
      const profile = await this.repository.findById(profileId);
      if (!profile) {
        throw new ApiError('Profile not found', 404);
      }

      // Check permissions
      if (profile.userId !== userId && profile.createdBy !== userId) {
        throw new ApiError('Access denied', 403);
      }

      // Archive instead of hard delete
      await this.repository.archive(profileId);

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error deleting family profile:', error);
      throw new ApiError('Failed to delete family profile', 500);
    }
  }

  /**
   * Get a specific family profile by ID
   */
  async getFamilyProfile(userId: string, profileId: string): Promise<FamilyMeasurementProfile | null> {
    try {
      
      const profile = await this.repository.findById(profileId);
      
      if (!profile) {
        return null;
      }

      // Check permissions
      if (profile.userId !== userId && !profile.sharedWith.includes(userId)) {
        throw new ApiError('Access denied', 403);
      }

      return profile;

    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error('Error fetching family profile:', error);
      throw new ApiError('Failed to fetch family profile', 500);
    }
  }

  /**
   * Validate profile data and return validation errors
   */
  async validateProfile(profileData: Partial<FamilyMeasurementProfile>): Promise<FamilyProfileValidation> {
    const errors: FamilyProfileValidation = {};

    // Validate nickname
    if (profileData.nickname) {
      if (profileData.nickname.trim().length === 0) {
        errors.nickname = 'Nickname is required';
      } else if (profileData.nickname.length > 50) {
        errors.nickname = 'Nickname must be 50 characters or less';
      }
    }

    // Validate relationship
    if (profileData.relationship && !Object.values(RelationshipType).includes(profileData.relationship)) {
      errors.relationship = 'Invalid relationship type';
    }

    // Validate birth date
    if (profileData.birthDate) {
      const birthDate = new Date(profileData.birthDate);
      if (isNaN(birthDate.getTime())) {
        errors.birthDate = 'Invalid birth date';
      } else if (birthDate > new Date()) {
        errors.birthDate = 'Birth date cannot be in the future';
      }
    }

    // Validate measurements
    if (profileData.measurements) {
      const measurementCount = Object.keys(profileData.measurements).length;
      if (measurementCount === 0) {
        errors.measurements = 'At least one measurement is required';
      }

      // Check for negative values
      const negativeValues = Object.entries(profileData.measurements)
        .filter(([_, value]) => value !== undefined && value < 0);
      
      if (negativeValues.length > 0) {
        errors.measurements = 'Measurements cannot be negative';
      }
    }

    // Validate privacy settings
    if (profileData.privacySettings) {
      if (!Object.values(ProfileVisibility).includes(profileData.privacySettings.visibility)) {
        errors.privacySettings = 'Invalid privacy visibility setting';
      }
    }

    return errors;
  }

  /**
   * Check for potential conflicts when creating/updating profiles
   */
  async checkForConflicts(
    userId: string,
    profileData: Partial<FamilyMeasurementProfile>,
    excludeProfileId?: string
  ): Promise<FamilyProfileConflict[]> {
    
    const conflicts: FamilyProfileConflict[] = [];

    // Check for duplicate nicknames
    if (profileData.nickname) {
      const existingProfile = await this.repository.findByNickname(userId, profileData.nickname);
      if (existingProfile && existingProfile.id !== excludeProfileId) {
        conflicts.push({
          type: 'DUPLICATE_NICKNAME',
          message: `A profile with nickname "${profileData.nickname}" already exists`,
          conflictingProfile: existingProfile.id,
          suggestedResolution: `Try "${profileData.nickname} (2)" or choose a different nickname`
        });
      }
    }

    // Check for measurement inconsistencies based on age and relationship
    if (profileData.measurements && profileData.birthDate && profileData.relationship) {
      const age = validateAge(new Date(profileData.birthDate));
      const measurementErrors = validateMeasurementsForAge(profileData.measurements, age);
      
      if (measurementErrors.length > 0) {
        conflicts.push({
          type: 'MEASUREMENT_MISMATCH',
          message: measurementErrors.join('; '),
          suggestedResolution: 'Please verify the measurements are correct for the person\'s age'
        });
      }
    }

    return conflicts;
  }

  /**
   * Get measurement suggestions based on relationship and age
   */
  getSuggestedMeasurements(relationship: RelationshipType, age?: number): Record<string, number> {
    return getDefaultMeasurements(relationship, age || 25);
  }

  /**
   * Calculate the next reminder date based on frequency
   */
  private calculateNextReminderDate(frequency: ReminderFrequency): Date {
    const now = new Date();
    
    switch (frequency) {
      case ReminderFrequency.MONTHLY:
        return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      case ReminderFrequency.QUARTERLY:
        return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
      case ReminderFrequency.BIANNUALLY:
        return new Date(now.getFullYear(), now.getMonth() + 6, now.getDate());
      default:
        return new Date(now.getFullYear(), now.getMonth() + 3, now.getDate());
    }
  }
}