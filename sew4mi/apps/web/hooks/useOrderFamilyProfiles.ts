/**
 * Order Family Profiles Hook
 * 
 * Manages family profile selection and measurement verification during order creation
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FamilyMeasurementProfile } from '@sew4mi/shared/types/family-profiles';
import { useFamilyProfiles } from './useFamilyProfiles';

export interface MeasurementAdjustment {
  measurement: string;
  originalValue: number;
  adjustedValue: number;
  reason?: string;
}

export interface OrderMeasurementData {
  profileId: string;
  profileName: string;
  measurements: Record<string, number>;
  adjustments: MeasurementAdjustment[];
  verifiedAt: Date;
}

export interface UseOrderFamilyProfilesOptions {
  userId: string;
  garmentType?: string;
  requiredMeasurements?: string[];
  enabled?: boolean;
}

export interface UseOrderFamilyProfilesReturn {
  // Profile Data
  profiles: FamilyMeasurementProfile[];
  selectedProfile: FamilyMeasurementProfile | null;
  isLoading: boolean;
  error: string | null;
  
  // Profile Selection
  selectProfile: (profile: FamilyMeasurementProfile) => void;
  clearSelection: () => void;
  
  // Measurement Verification
  measurementData: OrderMeasurementData | null;
  confirmMeasurements: (measurements: Record<string, number>, adjustments: MeasurementAdjustment[]) => void;
  resetMeasurements: () => void;
  
  // Validation
  getMissingMeasurements: (profile: FamilyMeasurementProfile) => string[];
  isProfileComplete: (profile: FamilyMeasurementProfile) => boolean;
  isMeasurementsOutdated: (profile: FamilyMeasurementProfile) => boolean;
  
  // Quick Actions
  getRecentProfiles: () => FamilyMeasurementProfile[];
  getFavoriteProfiles: () => FamilyMeasurementProfile[];
  getProfilesByRelationship: (relationship: string) => FamilyMeasurementProfile[];
  
  // Order Integration
  canProceedWithOrder: () => boolean;
  getOrderReadyData: () => {
    profile: FamilyMeasurementProfile;
    measurements: Record<string, number>;
    adjustments: MeasurementAdjustment[];
  } | null;
}

// Default required measurements for different garment types
const GARMENT_MEASUREMENTS: Record<string, string[]> = {
  'kente': ['chest', 'waist', 'length', 'shoulderWidth'],
  'agbada': ['chest', 'waist', 'length', 'shoulderWidth', 'armLength'],
  'kaftan': ['chest', 'waist', 'hips', 'length'],
  'fitted-dress': ['chest', 'waist', 'hips', 'length', 'shoulderWidth'],
  'school-uniform': ['chest', 'waist', 'length', 'shoulderWidth'],
  'formal-suit': ['chest', 'waist', 'hips', 'shoulderWidth', 'armLength', 'inseam'],
  'casual-wear': ['chest', 'waist', 'length'],
  'traditional-wear': ['chest', 'waist', 'length', 'shoulderWidth'],
  'default': ['chest', 'waist', 'hips', 'shoulderWidth']
};

// Profile usage tracking for recent/favorite detection
interface ProfileUsage {
  profileId: string;
  lastUsed: Date;
  usageCount: number;
  isFavorite: boolean;
}

export function useOrderFamilyProfiles({
  userId,
  garmentType = 'default',
  requiredMeasurements,
  enabled = true
}: UseOrderFamilyProfilesOptions): UseOrderFamilyProfilesReturn {
  // State
  const [selectedProfile, setSelectedProfile] = useState<FamilyMeasurementProfile | null>(null);
  const [measurementData, setMeasurementData] = useState<OrderMeasurementData | null>(null);
  const [profileUsage, setProfileUsage] = useState<ProfileUsage[]>([]);

  // Get family profiles using existing hook
  const {
    profiles,
    isLoading,
    error,
    refreshProfiles
  } = useFamilyProfiles({ userId, enabled });

  // Get required measurements for the garment type
  const effectiveRequiredMeasurements = useMemo(() => {
    return requiredMeasurements || 
           GARMENT_MEASUREMENTS[garmentType.toLowerCase()] || 
           GARMENT_MEASUREMENTS.default;
  }, [requiredMeasurements, garmentType]);

  // Load profile usage from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(`order-profile-usage-${userId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setProfileUsage(parsed.map((item: any) => ({
          ...item,
          lastUsed: new Date(item.lastUsed)
        })));
      } catch (error) {
        console.warn('Failed to parse profile usage data:', error);
      }
    }
  }, [userId]);

  // Save profile usage to localStorage
  const saveProfileUsage = useCallback((usage: ProfileUsage[]) => {
    localStorage.setItem(`order-profile-usage-${userId}`, JSON.stringify(usage));
    setProfileUsage(usage);
  }, [userId]);

  // Update profile usage
  const updateProfileUsage = useCallback((profileId: string) => {
    setProfileUsage(prev => {
      const existing = prev.find(usage => usage.profileId === profileId);
      const now = new Date();
      
      let updated: ProfileUsage[];
      
      if (existing) {
        updated = prev.map(usage => 
          usage.profileId === profileId 
            ? { ...usage, lastUsed: now, usageCount: usage.usageCount + 1 }
            : usage
        );
      } else {
        updated = [...prev, {
          profileId,
          lastUsed: now,
          usageCount: 1,
          isFavorite: false
        }];
      }
      
      saveProfileUsage(updated);
      return updated;
    });
  }, [saveProfileUsage]);

  // Profile Selection
  const selectProfile = useCallback((profile: FamilyMeasurementProfile) => {
    setSelectedProfile(profile);
    setMeasurementData(null); // Clear previous measurement data
    updateProfileUsage(profile.id);
  }, [updateProfileUsage]);

  const clearSelection = useCallback(() => {
    setSelectedProfile(null);
    setMeasurementData(null);
  }, []);

  // Measurement Verification
  const confirmMeasurements = useCallback((
    measurements: Record<string, number>, 
    adjustments: MeasurementAdjustment[]
  ) => {
    if (!selectedProfile) return;

    setMeasurementData({
      profileId: selectedProfile.id,
      profileName: selectedProfile.nickname,
      measurements,
      adjustments,
      verifiedAt: new Date()
    });
  }, [selectedProfile]);

  const resetMeasurements = useCallback(() => {
    setMeasurementData(null);
  }, []);

  // Validation Functions
  const getMissingMeasurements = useCallback((profile: FamilyMeasurementProfile): string[] => {
    if (!profile.measurements) return effectiveRequiredMeasurements;
    
    return effectiveRequiredMeasurements.filter(
      measurement => !profile.measurements![measurement]
    );
  }, [effectiveRequiredMeasurements]);

  const isProfileComplete = useCallback((profile: FamilyMeasurementProfile): boolean => {
    return getMissingMeasurements(profile).length === 0;
  }, [getMissingMeasurements]);

  const isMeasurementsOutdated = useCallback((profile: FamilyMeasurementProfile): boolean => {
    const now = new Date();
    const lastUpdated = new Date(profile.lastUpdated);
    const diffMonths = (now.getFullYear() - lastUpdated.getFullYear()) * 12 + 
                      (now.getMonth() - lastUpdated.getMonth());
    
    // For children, measurements older than 3 months are outdated
    if (profile.age && profile.age < 18) {
      return diffMonths > 3;
    }
    
    // For adults, measurements older than 6 months are outdated
    return diffMonths > 6;
  }, []);

  // Quick Actions
  const getRecentProfiles = useCallback((): FamilyMeasurementProfile[] => {
    const recentUsage = profileUsage
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
      .slice(0, 3);
    
    return recentUsage
      .map(usage => profiles.find(p => p.id === usage.profileId))
      .filter((profile): profile is FamilyMeasurementProfile => profile !== undefined);
  }, [profiles, profileUsage]);

  const getFavoriteProfiles = useCallback((): FamilyMeasurementProfile[] => {
    const favoriteUsage = profileUsage.filter(usage => usage.isFavorite);
    
    return favoriteUsage
      .map(usage => profiles.find(p => p.id === usage.profileId))
      .filter((profile): profile is FamilyMeasurementProfile => profile !== undefined);
  }, [profiles, profileUsage]);

  const getProfilesByRelationship = useCallback((relationship: string): FamilyMeasurementProfile[] => {
    return profiles.filter(profile => profile.relationship === relationship);
  }, [profiles]);

  // Order Integration
  const canProceedWithOrder = useCallback((): boolean => {
    return selectedProfile !== null && measurementData !== null;
  }, [selectedProfile, measurementData]);

  const getOrderReadyData = useCallback(() => {
    if (!selectedProfile || !measurementData) return null;
    
    return {
      profile: selectedProfile,
      measurements: measurementData.measurements,
      adjustments: measurementData.adjustments
    };
  }, [selectedProfile, measurementData]);

  // Smart Recommendations
  const getRecommendedProfile = useCallback((): FamilyMeasurementProfile | null => {
    // Prioritize complete profiles that aren't outdated
    const completeProfiles = profiles.filter(profile => 
      isProfileComplete(profile) && !isMeasurementsOutdated(profile)
    );
    
    if (completeProfiles.length === 0) return null;
    
    // If there's recent usage, prioritize that
    const recentProfiles = getRecentProfiles();
    const recentComplete = recentProfiles.find(profile => 
      completeProfiles.includes(profile)
    );
    
    if (recentComplete) return recentComplete;
    
    // Otherwise, return the most recently updated complete profile
    return completeProfiles.sort((a, b) => 
      new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    )[0];
  }, [profiles, isProfileComplete, isMeasurementsOutdated, getRecentProfiles]);

  // Auto-select recommended profile if none selected
  useEffect(() => {
    if (!selectedProfile && profiles.length > 0 && enabled) {
      const recommended = getRecommendedProfile();
      if (recommended) {
        selectProfile(recommended);
      }
    }
  }, [profiles, selectedProfile, enabled, getRecommendedProfile, selectProfile]);

  return {
    // Profile Data
    profiles,
    selectedProfile,
    isLoading,
    error,
    
    // Profile Selection
    selectProfile,
    clearSelection,
    
    // Measurement Verification
    measurementData,
    confirmMeasurements,
    resetMeasurements,
    
    // Validation
    getMissingMeasurements,
    isProfileComplete,
    isMeasurementsOutdated,
    
    // Quick Actions
    getRecentProfiles,
    getFavoriteProfiles,
    getProfilesByRelationship,
    
    // Order Integration
    canProceedWithOrder,
    getOrderReadyData
  };
}