/**
 * Growth Tracking Hook
 * 
 * Manages growth tracking functionality including:
 * - Reminder scheduling and management
 * - Milestone tracking
 * - Growth progress calculations
 * - Notification handling
 */

import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FamilyMeasurementProfile, ReminderFrequency } from '@sew4mi/shared/types/family-profiles';

// Types
export interface GrowthMilestone {
  id: string;
  profileId: string;
  category: 'measurement' | 'developmental' | 'health' | 'custom';
  title: string;
  description: string;
  targetAge: number; // Age in months
  targetMeasurements?: Record<string, { min: number; max: number; optimal: number }>;
  achievedDate?: Date;
  actualMeasurements?: Record<string, number>;
  notes?: string;
  photoUrls?: string[];
  isOverdue: boolean;
  priority: 'low' | 'medium' | 'high';
  reminderDate?: Date;
}

export interface GrowthReminder {
  id: string;
  profileId: string;
  profileName: string;
  type: 'measurement-due' | 'growth-milestone' | 'checkup-reminder';
  scheduledDate: Date;
  frequency: ReminderFrequency;
  isActive: boolean;
  lastSent?: Date;
  nextReminder?: Date;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  notificationChannels: ('SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH')[];
}

export interface ReminderSettings {
  id?: string;
  profileId: string;
  frequency: ReminderFrequency;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  notificationChannels: ('SMS' | 'WHATSAPP' | 'EMAIL' | 'PUSH')[];
  customMessage?: string;
  advanceNotice: number;
  priority: 'low' | 'medium' | 'high';
  reminderType: 'measurement-update' | 'growth-check' | 'milestone-check' | 'custom';
}

export interface GrowthTrackingData {
  milestones: GrowthMilestone[];
  reminders: GrowthReminder[];
  isLoading: boolean;
  error: string | null;
}

export interface UseGrowthTrackingOptions {
  userId: string;
  profiles: FamilyMeasurementProfile[];
  enabled?: boolean;
}

export interface UseGrowthTrackingReturn {
  // Data
  data: GrowthTrackingData;
  
  // Reminder Management
  scheduleReminder: (settings: ReminderSettings) => Promise<void>;
  updateReminder: (id: string, settings: Partial<ReminderSettings>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  snoozeReminder: (id: string, hours: number) => Promise<void>;
  dismissReminder: (id: string) => Promise<void>;
  testReminder: (settings: ReminderSettings) => Promise<void>;
  
  // Milestone Management
  achieveMilestone: (milestoneId: string, measurements?: Record<string, number>, notes?: string) => Promise<void>;
  createCustomMilestone: (profileId: string, milestone: Omit<GrowthMilestone, 'id' | 'profileId'>) => Promise<void>;
  updateMilestone: (id: string, updates: Partial<GrowthMilestone>) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  
  // Progress Calculations
  getGrowthProgress: (profileId: string) => {
    achieved: number;
    total: number;
    percentage: number;
    nextMilestone?: GrowthMilestone;
    overdueMilestones: number;
  };
  
  getUpcomingReminders: (timeframe: 'week' | 'month' | 'quarter') => GrowthReminder[];
  getOverdueReminders: () => GrowthReminder[];
  
  // Utility Functions
  calculateAgeInMonths: (birthDate: Date) => number;
  getRecommendedFrequency: (age: number) => ReminderFrequency;
  isProfileEligibleForTracking: (profile: FamilyMeasurementProfile) => boolean;
}

// Mock API functions (replace with actual API calls)
const mockAPI = {
  fetchGrowthData: async (userId: string): Promise<GrowthTrackingData> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
      milestones: [],
      reminders: [],
      isLoading: false,
      error: null
    };
  },
  
  scheduleReminder: async (settings: ReminderSettings): Promise<GrowthReminder> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      id: `reminder-${Date.now()}`,
      profileId: settings.profileId,
      profileName: 'Profile Name',
      type: settings.reminderType === 'measurement-update' ? 'measurement-due' : 'growth-milestone',
      scheduledDate: settings.startDate,
      frequency: settings.frequency,
      isActive: settings.isActive,
      message: settings.customMessage || 'Default reminder message',
      priority: settings.priority as 'low' | 'medium' | 'high' | 'urgent',
      notificationChannels: settings.notificationChannels
    };
  },
  
  achieveMilestone: async (milestoneId: string, measurements?: Record<string, number>, notes?: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('Milestone achieved:', { milestoneId, measurements, notes });
  },
  
  createMilestone: async (profileId: string, milestone: Omit<GrowthMilestone, 'id' | 'profileId'>): Promise<GrowthMilestone> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      ...milestone,
      id: `milestone-${Date.now()}`,
      profileId
    };
  },
  
  snoozeReminder: async (id: string, hours: number): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log('Reminder snoozed:', { id, hours });
  },
  
  dismissReminder: async (id: string): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log('Reminder dismissed:', id);
  },
  
  testReminder: async (settings: ReminderSettings): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Test reminder sent:', settings);
  }
};

export function useGrowthTracking({
  userId,
  profiles,
  enabled = true
}: UseGrowthTrackingOptions): UseGrowthTrackingReturn {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Fetch growth tracking data
  const { data, isLoading } = useQuery({
    queryKey: ['growthTracking', userId],
    queryFn: () => mockAPI.fetchGrowthData(userId),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Schedule reminder mutation
  const scheduleReminderMutation = useMutation({
    mutationFn: mockAPI.scheduleReminder,
    onSuccess: (newReminder) => {
      queryClient.setQueryData(['growthTracking', userId], (old: GrowthTrackingData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          reminders: [...old.reminders, newReminder]
        };
      });
    },
    onError: (error) => {
      console.error('Failed to schedule reminder:', error);
      setError('Failed to schedule reminder');
    }
  });

  // Achieve milestone mutation
  const achieveMilestoneMutation = useMutation({
    mutationFn: ({ milestoneId, measurements, notes }: { milestoneId: string; measurements?: Record<string, number>; notes?: string }) =>
      mockAPI.achieveMilestone(milestoneId, measurements, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['growthTracking', userId] });
    },
    onError: (error) => {
      console.error('Failed to achieve milestone:', error);
      setError('Failed to record milestone achievement');
    }
  });

  // Create milestone mutation
  const createMilestoneMutation = useMutation({
    mutationFn: ({ profileId, milestone }: { profileId: string; milestone: Omit<GrowthMilestone, 'id' | 'profileId'> }) =>
      mockAPI.createMilestone(profileId, milestone),
    onSuccess: (newMilestone) => {
      queryClient.setQueryData(['growthTracking', userId], (old: GrowthTrackingData | undefined) => {
        if (!old) return old;
        return {
          ...old,
          milestones: [...old.milestones, newMilestone]
        };
      });
    },
    onError: (error) => {
      console.error('Failed to create milestone:', error);
      setError('Failed to create milestone');
    }
  });

  // Snooze reminder mutation
  const snoozeReminderMutation = useMutation({
    mutationFn: ({ id, hours }: { id: string; hours: number }) => mockAPI.snoozeReminder(id, hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['growthTracking', userId] });
    }
  });

  // Dismiss reminder mutation
  const dismissReminderMutation = useMutation({
    mutationFn: mockAPI.dismissReminder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['growthTracking', userId] });
    }
  });

  // Test reminder mutation
  const testReminderMutation = useMutation({
    mutationFn: mockAPI.testReminder,
    onError: (error) => {
      console.error('Failed to send test reminder:', error);
      setError('Failed to send test reminder');
    }
  });

  // Utility functions
  const calculateAgeInMonths = useCallback((birthDate: Date): number => {
    const now = new Date();
    const ageInMilliseconds = now.getTime() - birthDate.getTime();
    const ageInMonths = Math.floor(ageInMilliseconds / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
    return Math.max(0, ageInMonths);
  }, []);

  const getRecommendedFrequency = useCallback((age: number): ReminderFrequency => {
    if (age < 1) return ReminderFrequency.MONTHLY;
    if (age < 2) return ReminderFrequency.MONTHLY;
    if (age < 13) return ReminderFrequency.QUARTERLY;
    if (age < 18) return ReminderFrequency.SEMI_ANNUAL;
    return ReminderFrequency.ANNUAL;
  }, []);

  const isProfileEligibleForTracking = useCallback((profile: FamilyMeasurementProfile): boolean => {
    return (
      profile.age !== undefined && 
      profile.age < 18 && 
      profile.growthTracking?.isTrackingEnabled === true
    );
  }, []);

  const getGrowthProgress = useCallback((profileId: string) => {
    const profileMilestones = data?.milestones.filter(m => m.profileId === profileId) || [];
    const achievedMilestones = profileMilestones.filter(m => m.achievedDate);
    const total = profileMilestones.length;
    const achieved = achievedMilestones.length;
    const percentage = total > 0 ? (achieved / total) * 100 : 0;
    const nextMilestone = profileMilestones.find(m => !m.achievedDate && !m.isOverdue);
    const overdueMilestones = profileMilestones.filter(m => !m.achievedDate && m.isOverdue).length;

    return {
      achieved,
      total,
      percentage,
      nextMilestone,
      overdueMilestones
    };
  }, [data?.milestones]);

  const getUpcomingReminders = useCallback((timeframe: 'week' | 'month' | 'quarter'): GrowthReminder[] => {
    if (!data?.reminders) return [];

    const now = new Date();
    const cutoff = new Date();
    
    switch (timeframe) {
      case 'week':
        cutoff.setDate(now.getDate() + 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() + 1);
        break;
      case 'quarter':
        cutoff.setMonth(now.getMonth() + 3);
        break;
    }
    
    return data.reminders.filter(reminder => 
      reminder.isActive &&
      reminder.scheduledDate >= now && 
      reminder.scheduledDate <= cutoff
    );
  }, [data?.reminders]);

  const getOverdueReminders = useCallback((): GrowthReminder[] => {
    if (!data?.reminders) return [];
    
    const now = new Date();
    return data.reminders.filter(reminder => 
      reminder.isActive && reminder.scheduledDate < now
    );
  }, [data?.reminders]);

  // Clear error after timeout
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  return {
    data: {
      milestones: data?.milestones || [],
      reminders: data?.reminders || [],
      isLoading,
      error
    },

    // Reminder Management
    scheduleReminder: (settings: ReminderSettings) => scheduleReminderMutation.mutateAsync(settings),
    updateReminder: async (id: string, settings: Partial<ReminderSettings>) => {
      // TODO: Implement update reminder API call
      console.log('Update reminder:', { id, settings });
    },
    deleteReminder: async (id: string) => {
      // TODO: Implement delete reminder API call
      console.log('Delete reminder:', id);
    },
    snoozeReminder: (id: string, hours: number) => snoozeReminderMutation.mutateAsync({ id, hours }),
    dismissReminder: (id: string) => dismissReminderMutation.mutateAsync(id),
    testReminder: (settings: ReminderSettings) => testReminderMutation.mutateAsync(settings),

    // Milestone Management
    achieveMilestone: (milestoneId: string, measurements?: Record<string, number>, notes?: string) =>
      achieveMilestoneMutation.mutateAsync({ milestoneId, measurements, notes }),
    createCustomMilestone: (profileId: string, milestone: Omit<GrowthMilestone, 'id' | 'profileId'>) =>
      createMilestoneMutation.mutateAsync({ profileId, milestone }),
    updateMilestone: async (id: string, updates: Partial<GrowthMilestone>) => {
      // TODO: Implement update milestone API call
      console.log('Update milestone:', { id, updates });
    },
    deleteMilestone: async (id: string) => {
      // TODO: Implement delete milestone API call
      console.log('Delete milestone:', id);
    },

    // Progress Calculations
    getGrowthProgress,
    getUpcomingReminders,
    getOverdueReminders,

    // Utility Functions
    calculateAgeInMonths,
    getRecommendedFrequency,
    isProfileEligibleForTracking
  };
}