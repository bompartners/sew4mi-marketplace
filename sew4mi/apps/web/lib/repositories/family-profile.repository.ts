/**
 * Family Profile Repository
 * Data access layer for family measurement profiles
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { 
  FamilyMeasurementProfile,
  RelationshipType,
  ProfileVisibility,
  ReminderFrequency,
  FamilyAccount
} from '@sew4mi/shared/types/family-profiles';
import { Database } from '@sew4mi/shared/types/database';

type MeasurementProfileRow = Database['public']['Tables']['measurement_profiles']['Row'];
type MeasurementProfileInsert = Database['public']['Tables']['measurement_profiles']['Insert'];
type MeasurementProfileUpdate = Database['public']['Tables']['measurement_profiles']['Update'];

export interface FamilyProfileFilters {
  includeInactive?: boolean;
  relationship?: RelationshipType;
  sortBy?: 'nickname' | 'age' | 'lastUpdated' | 'relationship';
  sortOrder?: 'asc' | 'desc';
}

export class FamilyProfileRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new family measurement profile
   */
  async create(profileData: Omit<FamilyMeasurementProfile, 'id' | 'auditTrail'>): Promise<FamilyMeasurementProfile> {
    const insertData: MeasurementProfileInsert = {
      user_id: profileData.userId,
      profile_name: profileData.nickname,
      gender: profileData.gender.toLowerCase(),
      relationship: profileData.relationship,
      birth_date: profileData.birthDate?.toISOString().split('T')[0],
      avatar_url: profileData.avatarUrl,
      measurements: profileData.measurements as any,
      voice_note_url: profileData.voiceNoteUrl,
      is_default: false,
      is_active: profileData.isActive,
      privacy_settings: profileData.privacySettings as any,
      growth_tracking: profileData.growthTracking as any,
      family_account_id: profileData.familyAccountId,
      created_by: profileData.createdBy,
      shared_with: profileData.sharedWith,
      notes: '',
      measurement_unit: 'cm'
    };

    const { data, error } = await this.supabase
      .from('measurement_profiles')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create family profile: ${error.message}`);
    }

    return this.mapRowToFamilyProfile(data);
  }

  /**
   * Find all family profiles for a user
   */
  async findByUser(userId: string, filters: FamilyProfileFilters = {}): Promise<FamilyMeasurementProfile[]> {
    let query = this.supabase
      .from('measurement_profiles')
      .select('*')
      .eq('user_id', userId);

    // Apply filters
    if (!filters.includeInactive) {
      query = query.eq('is_active', true);
    }

    if (filters.relationship) {
      query = query.eq('relationship', filters.relationship);
    }

    // Apply sorting
    const sortColumn = this.mapSortColumn(filters.sortBy || 'nickname');
    const ascending = filters.sortOrder === 'asc';
    query = query.order(sortColumn, { ascending });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch family profiles: ${error.message}`);
    }

    return (data || []).map(row => this.mapRowToFamilyProfile(row));
  }

  /**
   * Find a family profile by ID
   */
  async findById(profileId: string): Promise<FamilyMeasurementProfile | null> {
    const { data, error } = await this.supabase
      .from('measurement_profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw new Error(`Failed to fetch family profile: ${error.message}`);
    }

    return this.mapRowToFamilyProfile(data);
  }

  /**
   * Find a family profile by nickname for a user
   */
  async findByNickname(userId: string, nickname: string): Promise<FamilyMeasurementProfile | null> {
    const { data, error } = await this.supabase
      .from('measurement_profiles')
      .select('*')
      .eq('user_id', userId)
      .eq('profile_name', nickname)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        return null;
      }
      throw new Error(`Failed to fetch family profile by nickname: ${error.message}`);
    }

    return this.mapRowToFamilyProfile(data);
  }

  /**
   * Update a family profile
   */
  async update(profileId: string, updates: Partial<Omit<FamilyMeasurementProfile, 'id' | 'userId' | 'auditTrail'>>): Promise<FamilyMeasurementProfile> {
    const updateData: MeasurementProfileUpdate = {};

    // Map updates to database columns
    if (updates.nickname) updateData.profile_name = updates.nickname;
    if (updates.gender) updateData.gender = updates.gender.toLowerCase();
    if (updates.relationship) updateData.relationship = updates.relationship;
    if (updates.birthDate) updateData.birth_date = updates.birthDate.toISOString().split('T')[0];
    if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl;
    if (updates.measurements) updateData.measurements = updates.measurements as any;
    if (updates.voiceNoteUrl !== undefined) updateData.voice_note_url = updates.voiceNoteUrl;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.privacySettings) updateData.privacy_settings = updates.privacySettings as any;
    if (updates.growthTracking) updateData.growth_tracking = updates.growthTracking as any;
    if (updates.familyAccountId !== undefined) updateData.family_account_id = updates.familyAccountId;
    if (updates.sharedWith) updateData.shared_with = updates.sharedWith;

    const { data, error } = await this.supabase
      .from('measurement_profiles')
      .update(updateData)
      .eq('id', profileId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to update family profile: ${error.message}`);
    }

    return this.mapRowToFamilyProfile(data);
  }

  /**
   * Archive a family profile (soft delete)
   */
  async archive(profileId: string): Promise<void> {
    const { error } = await this.supabase
      .from('measurement_profiles')
      .update({ 
        is_active: false,
        is_archived: true,
        archived_at: new Date().toISOString()
      })
      .eq('id', profileId);

    if (error) {
      throw new Error(`Failed to archive family profile: ${error.message}`);
    }
  }

  /**
   * Find profiles shared with a user
   */
  async findSharedProfiles(userId: string): Promise<FamilyMeasurementProfile[]> {
    const { data, error } = await this.supabase
      .from('measurement_profiles')
      .select('*')
      .contains('shared_with', [userId])
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to fetch shared family profiles: ${error.message}`);
    }

    return (data || []).map(row => this.mapRowToFamilyProfile(row));
  }

  /**
   * Share a profile with additional users
   */
  async shareProfile(profileId: string, shareWithUserIds: string[]): Promise<FamilyMeasurementProfile> {
    // First get the current profile to merge shared_with arrays
    const currentProfile = await this.findById(profileId);
    if (!currentProfile) {
      throw new Error('Profile not found');
    }

    const updatedSharedWith = Array.from(new Set([
      ...currentProfile.sharedWith,
      ...shareWithUserIds
    ]));

    const { data, error } = await this.supabase
      .from('measurement_profiles')
      .update({ shared_with: updatedSharedWith })
      .eq('id', profileId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to share family profile: ${error.message}`);
    }

    return this.mapRowToFamilyProfile(data);
  }

  /**
   * Remove sharing for specific users
   */
  async unshareProfile(profileId: string, removeUserIds: string[]): Promise<FamilyMeasurementProfile> {
    const currentProfile = await this.findById(profileId);
    if (!currentProfile) {
      throw new Error('Profile not found');
    }

    const updatedSharedWith = currentProfile.sharedWith.filter(
      userId => !removeUserIds.includes(userId)
    );

    const { data, error } = await this.supabase
      .from('measurement_profiles')
      .update({ shared_with: updatedSharedWith })
      .eq('id', profileId)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to unshare family profile: ${error.message}`);
    }

    return this.mapRowToFamilyProfile(data);
  }

  /**
   * Find profiles by relationship type across all users (for family account lookup)
   */
  async findByRelationship(relationship: RelationshipType, limit: number = 50): Promise<FamilyMeasurementProfile[]> {
    const { data, error } = await this.supabase
      .from('measurement_profiles')
      .select('*')
      .eq('relationship', relationship)
      .eq('is_active', true)
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch profiles by relationship: ${error.message}`);
    }

    return (data || []).map(row => this.mapRowToFamilyProfile(row));
  }

  /**
   * Get profile count by relationship for a user
   */
  async getProfileCountByRelationship(userId: string): Promise<Record<RelationshipType, number>> {
    const { data, error } = await this.supabase
      .from('measurement_profiles')
      .select('relationship')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to get profile count: ${error.message}`);
    }

    // Initialize count object
    const counts: Record<RelationshipType, number> = {
      [RelationshipType.SELF]: 0,
      [RelationshipType.SPOUSE]: 0,
      [RelationshipType.CHILD]: 0,
      [RelationshipType.PARENT]: 0,
      [RelationshipType.SIBLING]: 0,
      [RelationshipType.OTHER]: 0
    };

    // Count profiles by relationship
    (data || []).forEach(row => {
      const relationship = row.relationship as RelationshipType;
      if (counts[relationship] !== undefined) {
        counts[relationship]++;
      }
    });

    return counts;
  }

  /**
   * Map database row to FamilyMeasurementProfile
   */
  private mapRowToFamilyProfile(row: MeasurementProfileRow): FamilyMeasurementProfile {
    return {
      id: row.id,
      userId: row.user_id,
      nickname: row.profile_name,
      gender: row.gender?.toUpperCase() as any || 'MALE',
      relationship: (row.relationship as RelationshipType) || RelationshipType.SELF,
      birthDate: row.birth_date ? new Date(row.birth_date) : undefined,
      age: row.calculated_age || undefined,
      avatarUrl: row.avatar_url || undefined,
      measurements: (row.measurements as Record<string, number>) || {},
      voiceNoteUrl: row.voice_note_url || undefined,
      lastUpdated: new Date(row.updated_at),
      isActive: row.is_active,
      privacySettings: (row.privacy_settings as any) || {
        visibility: ProfileVisibility.FAMILY_ONLY,
        shareWithFamily: true,
        allowEditing: false
      },
      growthTracking: (row.growth_tracking as any) || {
        isTrackingEnabled: false,
        reminderFrequency: ReminderFrequency.NEVER,
        lastMeasurementUpdate: new Date(row.updated_at)
      },
      familyAccountId: row.family_account_id || undefined,
      createdBy: row.created_by || row.user_id,
      sharedWith: (row.shared_with as string[]) || [],
      auditTrail: [] // Populated separately if needed
    };
  }

  /**
   * Map sort column name to database column
   */
  private mapSortColumn(sortBy: string): string {
    switch (sortBy) {
      case 'nickname':
        return 'profile_name';
      case 'age':
        return 'calculated_age';
      case 'lastUpdated':
        return 'updated_at';
      case 'relationship':
        return 'relationship';
      default:
        return 'profile_name';
    }
  }
}

// Family Account Repository for managing family groups
export class FamilyAccountRepository {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new family account
   */
  async createFamilyAccount(primaryUserId: string, familyName?: string): Promise<FamilyAccount> {
    const insertData = {
      primary_user_id: primaryUserId,
      family_name: familyName,
      member_ids: [primaryUserId],
      shared_profile_ids: [],
      settings: {
        allowInvitations: true,
        defaultProfileVisibility: 'FAMILY_ONLY',
        requireApprovalForSharing: false,
        maxMembers: 10
      }
    };

    const { data, error } = await this.supabase
      .from('family_accounts')
      .insert(insertData)
      .select('*')
      .single();

    if (error) {
      throw new Error(`Failed to create family account: ${error.message}`);
    }

    return this.mapRowToFamilyAccount(data);
  }

  /**
   * Find family account by primary user
   */
  async findByPrimaryUser(userId: string): Promise<FamilyAccount | null> {
    const { data, error } = await this.supabase
      .from('family_accounts')
      .select('*')
      .eq('primary_user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new Error(`Failed to fetch family account: ${error.message}`);
    }

    return this.mapRowToFamilyAccount(data);
  }

  /**
   * Map database row to FamilyAccount
   */
  private mapRowToFamilyAccount(row: any): FamilyAccount {
    return {
      id: row.id,
      primaryUserId: row.primary_user_id,
      familyName: row.family_name,
      memberIds: row.member_ids || [],
      sharedProfileIds: row.shared_profile_ids || [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      inviteCode: row.invite_code,
      settings: row.settings || {}
    };
  }
}