/**
 * useFamilyProfiles Hook
 * React hook for managing family measurement profiles state and operations
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FamilyMeasurementProfile,
  CreateFamilyProfileRequest,
  UpdateFamilyProfileRequest,
  FamilyProfilesListRequest,
  RelationshipType,
  ProfileVisibility
} from '@sew4mi/shared/types/family-profiles';

// API functions
const familyProfilesApi = {
  // Get all family profiles
  async getProfiles(params?: FamilyProfilesListRequest): Promise<{ profiles: FamilyMeasurementProfile[]; totalCount: number; }> {
    const searchParams = new URLSearchParams();
    if (params?.includeInactive) searchParams.set('includeInactive', 'true');
    if (params?.relationship) searchParams.set('relationship', params.relationship);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);

    const response = await fetch(`/api/profiles/family?${searchParams.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch family profiles');
    }

    const result = await response.json();
    return result.data;
  },

  // Create a new family profile
  async createProfile(profileData: CreateFamilyProfileRequest): Promise<FamilyMeasurementProfile> {
    const response = await fetch('/api/profiles/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.errors?.[0] || error.error || 'Failed to create family profile');
    }

    const result = await response.json();
    return result.data;
  },

  // Get a specific family profile
  async getProfile(profileId: string): Promise<FamilyMeasurementProfile> {
    const response = await fetch(`/api/profiles/family/${profileId}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch family profile');
    }

    const result = await response.json();
    return result.data;
  },

  // Update a family profile
  async updateProfile(profileId: string, updates: UpdateFamilyProfileRequest['updates']): Promise<FamilyMeasurementProfile> {
    const response = await fetch(`/api/profiles/family/${profileId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update family profile');
    }

    const result = await response.json();
    return result.data;
  },

  // Delete a family profile
  async deleteProfile(profileId: string): Promise<void> {
    const response = await fetch(`/api/profiles/family/${profileId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete family profile');
    }
  }
};

// Query keys for React Query
const queryKeys = {
  familyProfiles: ['familyProfiles'] as const,
  familyProfile: (id: string) => ['familyProfiles', id] as const,
};

interface FamilyProfileFilters {
  relationship?: RelationshipType;
  ageRange?: [number, number];
  hasRecentMeasurements?: boolean;
}

export function useFamilyProfiles() {
  const queryClient = useQueryClient();
  
  // State for filters and sorting
  const [filters, setFilters] = useState<FamilyProfileFilters>({});
  const [sortBy, setSortBy] = useState<'nickname' | 'age' | 'lastUpdated' | 'relationship'>('nickname');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  // Query for fetching family profiles
  const {
    data: profilesData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: [...queryKeys.familyProfiles, filters, sortBy, sortOrder],
    queryFn: () => familyProfilesApi.getProfiles({
      relationship: filters.relationship,
      sortBy,
      sortOrder,
      includeInactive: false
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  const familyProfiles = profilesData?.profiles || [];
  const totalCount = profilesData?.totalCount || 0;

  // Mutation for creating family profile
  const createMutation = useMutation({
    mutationFn: familyProfilesApi.createProfile,
    onSuccess: (newProfile) => {
      // Update the profiles cache
      queryClient.setQueryData(
        [...queryKeys.familyProfiles, filters, sortBy, sortOrder],
        (old: any) => {
          if (!old) return { profiles: [newProfile], totalCount: 1 };
          return {
            profiles: [...old.profiles, newProfile],
            totalCount: old.totalCount + 1
          };
        }
      );
      
      // Invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: queryKeys.familyProfiles });
    }
  });

  // Mutation for updating family profile
  const updateMutation = useMutation({
    mutationFn: ({ profileId, updates }: { profileId: string; updates: UpdateFamilyProfileRequest['updates'] }) =>
      familyProfilesApi.updateProfile(profileId, updates),
    onSuccess: (updatedProfile) => {
      // Update the profiles cache
      queryClient.setQueryData(
        [...queryKeys.familyProfiles, filters, sortBy, sortOrder],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            profiles: old.profiles.map((profile: FamilyMeasurementProfile) =>
              profile.id === updatedProfile.id ? updatedProfile : profile
            )
          };
        }
      );
      
      // Update individual profile cache
      queryClient.setQueryData(
        queryKeys.familyProfile(updatedProfile.id),
        updatedProfile
      );
    }
  });

  // Mutation for deleting family profile
  const deleteMutation = useMutation({
    mutationFn: familyProfilesApi.deleteProfile,
    onSuccess: (_, profileId) => {
      // Remove from profiles cache
      queryClient.setQueryData(
        [...queryKeys.familyProfiles, filters, sortBy, sortOrder],
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            profiles: old.profiles.filter((profile: FamilyMeasurementProfile) => profile.id !== profileId),
            totalCount: Math.max(0, old.totalCount - 1)
          };
        }
      );
      
      // Remove individual profile cache
      queryClient.removeQueries({ queryKey: queryKeys.familyProfile(profileId) });
      
      // Clear selection if deleted profile was selected
      if (selectedProfileId === profileId) {
        setSelectedProfileId(null);
      }
    }
  });

  // Actions
  const loadFamilyProfiles = useCallback(() => {
    return refetch();
  }, [refetch]);

  const createFamilyProfile = useCallback(async (profileData: CreateFamilyProfileRequest): Promise<FamilyMeasurementProfile> => {
    return createMutation.mutateAsync(profileData);
  }, [createMutation]);

  const updateFamilyProfile = useCallback(async (profileId: string, updates: UpdateFamilyProfileRequest['updates']): Promise<FamilyMeasurementProfile> => {
    return updateMutation.mutateAsync({ profileId, updates });
  }, [updateMutation]);

  const deleteFamilyProfile = useCallback(async (profileId: string): Promise<void> => {
    return deleteMutation.mutateAsync(profileId);
  }, [deleteMutation]);

  const selectProfile = useCallback((profileId: string | null) => {
    setSelectedProfileId(profileId);
  }, []);

  const updateFilters = useCallback((newFilters: Partial<FamilyProfileFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const setSorting = useCallback((newSortBy: string, newSortOrder: 'asc' | 'desc') => {
    setSortBy(newSortBy as any);
    setSortOrder(newSortOrder);
  }, []);

  // Get profile by ID
  const getProfile = useCallback((profileId: string) => {
    return familyProfiles.find(profile => profile.id === profileId) || null;
  }, [familyProfiles]);

  // Get profiles by relationship
  const getProfilesByRelationship = useCallback((relationship: RelationshipType) => {
    return familyProfiles.filter(profile => profile.relationship === relationship);
  }, [familyProfiles]);

  // Get profiles with growth tracking enabled
  const getGrowthTrackingProfiles = useCallback(() => {
    return familyProfiles.filter(profile => profile.growthTracking.isTrackingEnabled);
  }, [familyProfiles]);

  // Statistics
  const stats = {
    total: totalCount,
    byRelationship: familyProfiles.reduce((acc, profile) => {
      acc[profile.relationship] = (acc[profile.relationship] || 0) + 1;
      return acc;
    }, {} as Record<RelationshipType, number>),
    withGrowthTracking: familyProfiles.filter(p => p.growthTracking.isTrackingEnabled).length,
    recentlyUpdated: familyProfiles.filter(p => {
      const daysSinceUpdate = Math.floor((Date.now() - new Date(p.lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
      return daysSinceUpdate <= 30;
    }).length
  };

  return {
    // Data
    familyProfiles,
    totalCount,
    selectedProfileId,
    filters,
    sortBy,
    sortOrder,
    stats,

    // State
    isLoading: isLoading || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    error: error || createMutation.error || updateMutation.error || deleteMutation.error,
    
    // Actions
    loadFamilyProfiles,
    createFamilyProfile,
    updateFamilyProfile,
    deleteFamilyProfile,
    selectProfile,
    setFilters: updateFilters,
    setSorting,

    // Getters
    getProfile,
    getProfilesByRelationship,
    getGrowthTrackingProfiles,

    // Mutation states
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

// Hook for fetching a single family profile
export function useFamilyProfile(profileId: string | null) {
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error } = useQuery({
    queryKey: queryKeys.familyProfile(profileId!),
    queryFn: () => familyProfilesApi.getProfile(profileId!),
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  return {
    profile,
    isLoading,
    error
  };
}

// Hook for family profile statistics
export function useFamilyProfileStats() {
  const { familyProfiles } = useFamilyProfiles();

  const calculateStats = useCallback(() => {
    const stats = {
      total: familyProfiles.length,
      children: 0,
      adults: 0,
      withGrowthTracking: 0,
      recentlyUpdated: 0,
      byVisibility: {
        [ProfileVisibility.PRIVATE]: 0,
        [ProfileVisibility.FAMILY_ONLY]: 0,
        [ProfileVisibility.PUBLIC]: 0
      },
      averageAge: 0
    };

    let totalAge = 0;
    let ageCount = 0;

    familyProfiles.forEach(profile => {
      // Age categories
      if (profile.relationship === RelationshipType.CHILD) {
        stats.children++;
      } else {
        stats.adults++;
      }

      // Growth tracking
      if (profile.growthTracking.isTrackingEnabled) {
        stats.withGrowthTracking++;
      }

      // Recently updated (last 30 days)
      const daysSinceUpdate = Math.floor((Date.now() - new Date(profile.lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate <= 30) {
        stats.recentlyUpdated++;
      }

      // Privacy visibility
      stats.byVisibility[profile.privacySettings.visibility]++;

      // Average age calculation
      if (profile.age) {
        totalAge += profile.age;
        ageCount++;
      }
    });

    if (ageCount > 0) {
      stats.averageAge = Math.round(totalAge / ageCount);
    }

    return stats;
  }, [familyProfiles]);

  return calculateStats();
}