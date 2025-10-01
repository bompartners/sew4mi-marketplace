/**
 * Unit tests for family measurement profile types and validation
 */

import { describe, it, expect } from 'vitest';
import { 
  RelationshipType, 
  ProfileVisibility, 
  ReminderFrequency,
  FamilyPermission
} from '@sew4mi/shared/types/family-profiles';
import { 
  FamilyMeasurementProfileSchema,
  CreateFamilyProfileRequestSchema,
  validateAge,
  validateMeasurementsForAge,
  validateGhanaPhoneNumber
} from '@sew4mi/shared/schemas/family-profiles.schema';
import {
  getRelationshipDisplayName,
  canEditProfile,
  getDefaultMeasurements,
  shouldEnableGrowthTracking,
  getDefaultPrivacySettings
} from '@sew4mi/shared/constants/relationships';
import { Gender } from '@sew4mi/shared/types/order-creation';

describe('Family Profile Types', () => {
  describe('RelationshipType enum', () => {
    it('should contain all expected relationship types', () => {
      expect(RelationshipType.SELF).toBe('SELF');
      expect(RelationshipType.SPOUSE).toBe('SPOUSE');
      expect(RelationshipType.CHILD).toBe('CHILD');
      expect(RelationshipType.PARENT).toBe('PARENT');
      expect(RelationshipType.SIBLING).toBe('SIBLING');
      expect(RelationshipType.OTHER).toBe('OTHER');
    });
  });

  describe('ProfileVisibility enum', () => {
    it('should contain all expected visibility levels', () => {
      expect(ProfileVisibility.PRIVATE).toBe('PRIVATE');
      expect(ProfileVisibility.FAMILY_ONLY).toBe('FAMILY_ONLY');
      expect(ProfileVisibility.PUBLIC).toBe('PUBLIC');
    });
  });

  describe('ReminderFrequency enum', () => {
    it('should contain all expected reminder frequencies', () => {
      expect(ReminderFrequency.MONTHLY).toBe('MONTHLY');
      expect(ReminderFrequency.QUARTERLY).toBe('QUARTERLY');
      expect(ReminderFrequency.BIANNUALLY).toBe('BIANNUALLY');
      expect(ReminderFrequency.NEVER).toBe('NEVER');
    });
  });
});

describe('Family Profile Validation', () => {
  describe('CreateFamilyProfileRequestSchema', () => {
    const validProfileData = {
      nickname: "Kofi - School",
      relationship: RelationshipType.CHILD,
      gender: Gender.MALE,
      birthDate: "2015-06-15",
      measurements: {
        chest: 70,
        waist: 65,
        shoulderWidth: 35
      },
      privacySettings: {
        visibility: ProfileVisibility.FAMILY_ONLY,
        shareWithFamily: true,
        allowEditing: false
      },
      growthTracking: {
        reminderFrequency: ReminderFrequency.QUARTERLY,
        isTrackingEnabled: true
      }
    };

    it('should validate a complete valid profile', () => {
      const result = CreateFamilyProfileRequestSchema.safeParse(validProfileData);
      expect(result.success).toBe(true);
    });

    it('should require nickname', () => {
      const invalidData = { ...validProfileData, nickname: '' };
      const result = CreateFamilyProfileRequestSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('nickname'))).toBe(true);
      }
    });

    it('should require at least one measurement', () => {
      const invalidData = { ...validProfileData, measurements: {} };
      const result = CreateFamilyProfileRequestSchema.safeParse(invalidData);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => issue.path.includes('measurements'))).toBe(true);
      }
    });

    it('should require birth date for children with growth tracking enabled', () => {
      const invalidData = {
        ...validProfileData,
        birthDate: undefined,
        relationship: RelationshipType.CHILD,
        growthTracking: {
          reminderFrequency: ReminderFrequency.QUARTERLY,
          isTrackingEnabled: true
        }
      };
      
      const result = CreateFamilyProfileRequestSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow children without birth date if growth tracking is disabled', () => {
      const validData = {
        ...validProfileData,
        birthDate: undefined,
        relationship: RelationshipType.CHILD,
        growthTracking: {
          reminderFrequency: ReminderFrequency.NEVER,
          isTrackingEnabled: false
        }
      };
      
      const result = CreateFamilyProfileRequestSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should validate Ghana-specific relationship requirements', () => {
      // Test various relationships
      const relationships = [
        RelationshipType.SELF,
        RelationshipType.SPOUSE,
        RelationshipType.PARENT,
        RelationshipType.SIBLING,
        RelationshipType.OTHER
      ];

      relationships.forEach(relationship => {
        const data = { ...validProfileData, relationship };
        const result = CreateFamilyProfileRequestSchema.safeParse(data);
        expect(result.success).toBe(true);
      });
    });

    it('should validate proper date format', () => {
      const invalidDateFormats = [
        '15-06-2015',
        '2015/06/15',
        '15/06/2015',
        'Jun 15, 2015',
        'invalid-date'
      ];

      invalidDateFormats.forEach(dateFormat => {
        const invalidData = { ...validProfileData, birthDate: dateFormat };
        const result = CreateFamilyProfileRequestSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('validateAge', () => {
    it('should calculate correct age for different birth dates', () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      
      // Child born 10 years ago
      const childBirthDate = new Date(currentYear - 10, today.getMonth(), today.getDate());
      expect(validateAge(childBirthDate)).toBe(10);
      
      // Adult born 25 years ago
      const adultBirthDate = new Date(currentYear - 25, today.getMonth(), today.getDate());
      expect(validateAge(adultBirthDate)).toBe(25);
      
      // Baby born this year
      const babyBirthDate = new Date(currentYear, today.getMonth(), today.getDate());
      expect(validateAge(babyBirthDate)).toBe(0);
    });

    it('should handle birthday edge cases', () => {
      const today = new Date();
      const currentYear = today.getFullYear();
      
      // Birthday hasn't happened this year yet
      const futurebirthday = new Date(currentYear - 10, today.getMonth() + 1, today.getDate());
      expect(validateAge(futurebirthday)).toBe(9);
      
      // Birthday already happened this year
      const pastBirthday = new Date(currentYear - 10, today.getMonth() - 1, today.getDate());
      expect(validateAge(pastBirthday)).toBe(10);
    });
  });

  describe('validateMeasurementsForAge', () => {
    it('should validate infant measurements (0-2 years)', () => {
      const measurements = { chest: 50, waist: 48 };
      const errors = validateMeasurementsForAge(measurements, 1);
      expect(errors).toHaveLength(0);
    });

    it('should flag unusual infant measurements', () => {
      const measurements = { chest: 100 }; // Too large for infant
      const errors = validateMeasurementsForAge(measurements, 1);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]).toContain('infant');
    });

    it('should validate child measurements (3-12 years)', () => {
      const measurements = { chest: 70, waist: 65 };
      const errors = validateMeasurementsForAge(measurements, 8);
      expect(errors).toHaveLength(0);
    });

    it('should validate teen measurements (13-17 years)', () => {
      const measurements = { chest: 85, waist: 75 };
      const errors = validateMeasurementsForAge(measurements, 15);
      expect(errors).toHaveLength(0);
    });

    it('should validate adult measurements (18+ years)', () => {
      const measurements = { chest: 95, waist: 85 };
      const errors = validateMeasurementsForAge(measurements, 25);
      expect(errors).toHaveLength(0);
    });

    it('should return empty array when no age provided', () => {
      const measurements = { chest: 200 }; // Unusual measurement
      const errors = validateMeasurementsForAge(measurements);
      expect(errors).toHaveLength(0);
    });
  });

  describe('validateGhanaPhoneNumber', () => {
    it('should validate correct Ghana phone numbers', () => {
      const validNumbers = [
        '+233201234567',
        '+233241234567',
        '+233541234567',
        '+233261234567',
        '+233271234567'
      ];

      validNumbers.forEach(number => {
        expect(validateGhanaPhoneNumber(number)).toBe(true);
      });
    });

    it('should reject invalid Ghana phone numbers', () => {
      const invalidNumbers = [
        '0241234567',        // Missing country code
        '+2332412345',       // Too short
        '+23324123456789',   // Too long
        '+1234567890',       // Wrong country code
        '241234567',         // No plus sign
        '+233-24-123-4567',  // Contains dashes
        '+233 24 123 4567'   // Contains spaces
      ];

      invalidNumbers.forEach(number => {
        expect(validateGhanaPhoneNumber(number)).toBe(false);
      });
    });
  });
});

describe('Relationship Utilities', () => {
  describe('getRelationshipDisplayName', () => {
    it('should return English display names by default', () => {
      expect(getRelationshipDisplayName(RelationshipType.SELF)).toBe('Myself');
      expect(getRelationshipDisplayName(RelationshipType.SPOUSE)).toBe('My Spouse');
      expect(getRelationshipDisplayName(RelationshipType.CHILD)).toBe('My Child');
      expect(getRelationshipDisplayName(RelationshipType.PARENT)).toBe('My Parent');
      expect(getRelationshipDisplayName(RelationshipType.SIBLING)).toBe('My Sibling');
      expect(getRelationshipDisplayName(RelationshipType.OTHER)).toBe('Other Family');
    });

    it('should return Twi names when specified', () => {
      expect(getRelationshipDisplayName(RelationshipType.CHILD, 'twi')).toBe('Wo ba');
      expect(getRelationshipDisplayName(RelationshipType.PARENT, 'twi')).toBe('Wo maam/wo papa');
    });

    it('should return Ga names when specified', () => {
      expect(getRelationshipDisplayName(RelationshipType.CHILD, 'ga')).toBe('Wo tso');
      expect(getRelationshipDisplayName(RelationshipType.PARENT, 'ga')).toBe('Wo maa/wo da');
    });
  });

  describe('canEditProfile', () => {
    it('should allow users to edit their own profiles', () => {
      expect(canEditProfile(RelationshipType.SELF, RelationshipType.SELF)).toBe(true);
    });

    it('should respect family hierarchy for editing permissions', () => {
      // Parents can edit children's profiles
      expect(canEditProfile(RelationshipType.SELF, RelationshipType.CHILD)).toBe(true);
      
      // Spouses can edit each other's profiles
      expect(canEditProfile(RelationshipType.SELF, RelationshipType.SPOUSE)).toBe(true);
      
      // Children cannot edit parent profiles
      expect(canEditProfile(RelationshipType.CHILD, RelationshipType.PARENT)).toBe(false);
      
      // Siblings at same level can edit each other
      expect(canEditProfile(RelationshipType.SIBLING, RelationshipType.SIBLING)).toBe(true);
    });
  });

  describe('getDefaultMeasurements', () => {
    it('should return appropriate measurements for children', () => {
      const childMeasurements = getDefaultMeasurements(RelationshipType.CHILD, 8);
      expect(childMeasurements.chest).toBeDefined();
      expect(childMeasurements.chest).toBeGreaterThan(0);
      expect(childMeasurements.chest).toBeLessThan(100); // Reasonable child chest size
    });

    it('should return appropriate measurements for adults', () => {
      const adultMeasurements = getDefaultMeasurements(RelationshipType.SELF, 25);
      expect(adultMeasurements.chest).toBeDefined();
      expect(adultMeasurements.chest).toBeGreaterThan(70); // Adult chest size
    });

    it('should return measurements for different age ranges', () => {
      const infantMeasurements = getDefaultMeasurements(RelationshipType.CHILD, 1);
      const teenMeasurements = getDefaultMeasurements(RelationshipType.CHILD, 15);
      
      expect(infantMeasurements.chest).toBeLessThan(teenMeasurements.chest!);
    });
  });

  describe('shouldEnableGrowthTracking', () => {
    it('should enable growth tracking for children by default', () => {
      expect(shouldEnableGrowthTracking(RelationshipType.CHILD, 8)).toBe(true);
    });

    it('should disable growth tracking for adults', () => {
      expect(shouldEnableGrowthTracking(RelationshipType.SELF, 25)).toBe(false);
      expect(shouldEnableGrowthTracking(RelationshipType.SPOUSE, 30)).toBe(false);
      expect(shouldEnableGrowthTracking(RelationshipType.PARENT, 45)).toBe(false);
    });

    it('should enable growth tracking for young siblings', () => {
      expect(shouldEnableGrowthTracking(RelationshipType.SIBLING, 12)).toBe(true);
    });

    it('should disable growth tracking for adult siblings', () => {
      expect(shouldEnableGrowthTracking(RelationshipType.SIBLING, 20)).toBe(false);
    });

    it('should handle edge cases for age limits', () => {
      // At exactly trackUntilAge
      expect(shouldEnableGrowthTracking(RelationshipType.CHILD, 18)).toBe(false);
      expect(shouldEnableGrowthTracking(RelationshipType.SIBLING, 16)).toBe(false);
      
      // Just under trackUntilAge
      expect(shouldEnableGrowthTracking(RelationshipType.CHILD, 17)).toBe(true);
      expect(shouldEnableGrowthTracking(RelationshipType.SIBLING, 15)).toBe(true);
    });
  });

  describe('getDefaultPrivacySettings', () => {
    it('should return appropriate privacy settings for different relationships', () => {
      const selfSettings = getDefaultPrivacySettings(RelationshipType.SELF);
      expect(selfSettings.defaultVisibility).toBe('FAMILY_ONLY');
      expect(selfSettings.defaultSharing).toBe(true);
      
      const childSettings = getDefaultPrivacySettings(RelationshipType.CHILD);
      expect(childSettings.defaultVisibility).toBe('FAMILY_ONLY');
      expect(childSettings.defaultSharing).toBe(true);
      expect(childSettings.defaultEditing).toBe(true);
      
      const parentSettings = getDefaultPrivacySettings(RelationshipType.PARENT);
      expect(parentSettings.defaultVisibility).toBe('PRIVATE');
      expect(parentSettings.defaultSharing).toBe(false);
    });
  });
});

describe('FamilyMeasurementProfile Schema Integration', () => {
  it('should validate a complete family profile with all fields', () => {
    const completeProfile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      nickname: 'Little Kofi',
      gender: Gender.MALE,
      relationship: RelationshipType.CHILD,
      birthDate: new Date('2015-06-15'),
      age: 9,
      avatarUrl: 'https://example.com/avatar.jpg',
      measurements: {
        chest: 70,
        waist: 65,
        shoulderWidth: 35,
        sleeveLength: 45
      },
      voiceNoteUrl: 'https://example.com/voice-note.mp3',
      lastUpdated: new Date(),
      isActive: true,
      privacySettings: {
        visibility: ProfileVisibility.FAMILY_ONLY,
        shareWithFamily: true,
        allowEditing: true
      },
      growthTracking: {
        lastMeasurementUpdate: new Date(),
        reminderFrequency: ReminderFrequency.QUARTERLY,
        nextReminderDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        isTrackingEnabled: true
      },
      familyAccountId: '123e4567-e89b-12d3-a456-426614174002',
      createdBy: '123e4567-e89b-12d3-a456-426614174001',
      sharedWith: ['123e4567-e89b-12d3-a456-426614174003'],
      auditTrail: []
    };

    const result = FamilyMeasurementProfileSchema.safeParse(completeProfile);
    expect(result.success).toBe(true);
  });

  it('should handle optional fields correctly', () => {
    const minimalProfile = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      userId: '123e4567-e89b-12d3-a456-426614174001',
      nickname: 'Test Profile',
      gender: Gender.FEMALE,
      relationship: RelationshipType.SELF,
      measurements: { chest: 90 },
      lastUpdated: new Date(),
      isActive: true,
      privacySettings: {
        visibility: ProfileVisibility.PRIVATE,
        shareWithFamily: false,
        allowEditing: false
      },
      growthTracking: {
        lastMeasurementUpdate: new Date(),
        reminderFrequency: ReminderFrequency.NEVER,
        isTrackingEnabled: false
      },
      createdBy: '123e4567-e89b-12d3-a456-426614174001',
      sharedWith: [],
      auditTrail: []
    };

    const result = FamilyMeasurementProfileSchema.safeParse(minimalProfile);
    expect(result.success).toBe(true);
  });
});