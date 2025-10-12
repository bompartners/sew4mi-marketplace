import { NextResponse } from 'next/server';
import { RelationshipType, ProfileVisibility, ReminderFrequency } from '@sew4mi/shared/types/family-profiles';

/**
 * Mock Family Profiles Endpoint
 * Use this as a fallback while debugging the real endpoint
 */
export async function GET() {
  // Mock data matching FamilyMeasurementProfile interface
  const mockProfiles = [
    {
      id: 'mock-profile-1',
      userId: '30000000-0000-0000-0000-000000000001',
      nickname: 'Self',
      gender: 'MALE',
      relationship: RelationshipType.SELF,
      birthDate: new Date('1990-01-15'),
      age: 34,
      avatarUrl: null,
      measurements: {
        chest: 102,
        waist: 86,
        hips: 98,
        shoulderWidth: 45,
        sleeveLength: 61,
        inseam: 81
      },
      voiceNoteUrl: null,
      lastUpdated: new Date(),
      isActive: true,
      privacySettings: {
        visibility: ProfileVisibility.PRIVATE,
        shareWithFamily: false,
        allowEditing: false
      },
      growthTracking: {
        isTrackingEnabled: false,
        reminderFrequency: ReminderFrequency.NEVER,
        lastMeasurementUpdate: new Date(),
        nextReminderDate: undefined
      },
      familyAccountId: null,
      auditTrail: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '30000000-0000-0000-0000-000000000001',
        sharedWith: []
      },
      createdBy: '30000000-0000-0000-0000-000000000001',
      sharedWith: []
    },
    {
      id: 'mock-profile-2',
      userId: '30000000-0000-0000-0000-000000000001',
      nickname: 'Emma',
      gender: 'FEMALE',
      relationship: RelationshipType.CHILD,
      birthDate: new Date('2018-06-20'),
      age: 6,
      avatarUrl: null,
      measurements: {
        chest: 60,
        waist: 56,
        hips: 62,
        height: 118
      },
      voiceNoteUrl: null,
      lastUpdated: new Date(),
      isActive: true,
      privacySettings: {
        visibility: ProfileVisibility.FAMILY_ONLY,
        shareWithFamily: true,
        allowEditing: false
      },
      growthTracking: {
        isTrackingEnabled: true,
        reminderFrequency: ReminderFrequency.QUARTERLY,
        lastMeasurementUpdate: new Date(),
        nextReminderDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      },
      familyAccountId: null,
      auditTrail: {
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: '30000000-0000-0000-0000-000000000001',
        sharedWith: []
      },
      createdBy: '30000000-0000-0000-0000-000000000001',
      sharedWith: []
    }
  ];

  return NextResponse.json({
    success: true,
    data: {
      profiles: mockProfiles,
      totalCount: mockProfiles.length
    }
  });
}
