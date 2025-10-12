/**
 * Hook for Story 4.3: Recommendations Management
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import type {
  Recommendation,
  RecommendationType,
  RecommendationResponse,
  RecommendationAction,
} from '@sew4mi/shared/types';

interface UseRecommendationsOptions {
  type?: RecommendationType;
  limit?: number;
  enabled?: boolean;
}

export function useRecommendations(options: UseRecommendationsOptions = {}) {
  const { type, limit = 10, enabled = true } = options;

  // Build query params
  const params = new URLSearchParams();
  if (type) params.append('type', type);
  params.append('limit', limit.toString());

  // Fetch recommendations
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<RecommendationResponse>({
    queryKey: ['recommendations', type, limit],
    queryFn: async () => {
      const response = await fetch(`/api/recommendations?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }
      return response.json();
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Track engagement mutation
  const trackEngagementMutation = useMutation({
    mutationFn: async ({ recommendationId, action }: { recommendationId: string; action: RecommendationAction }) => {
      const response = await fetch('/api/recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recommendationId, action }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to track engagement');
      }

      return response.json();
    },
  });

  // Helper functions
  const trackClick = (recommendationId: string) => {
    trackEngagementMutation.mutate({ recommendationId, action: 'clicked' });
  };

  const trackOrder = (recommendationId: string) => {
    trackEngagementMutation.mutate({ recommendationId, action: 'ordered' });
  };

  const trackDismiss = (recommendationId: string) => {
    trackEngagementMutation.mutate({ recommendationId, action: 'dismissed' });
  };

  return {
    recommendations: data?.recommendations || [],
    analytics: data?.analytics,
    isLoading,
    error,
    refetch,

    // Engagement tracking
    trackClick,
    trackOrder,
    trackDismiss,
    isTracking: trackEngagementMutation.isPending,
  };
}

// Specialized hooks for specific recommendation types
export function useGarmentRecommendations(limit = 5) {
  return useRecommendations({ type: 'garment', limit });
}

export function useTailorRecommendations(limit = 3) {
  return useRecommendations({ type: 'tailor', limit });
}

export function useFabricRecommendations(limit = 5) {
  return useRecommendations({ type: 'fabric', limit });
}
