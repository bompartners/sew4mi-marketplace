/**
 * useReviews Hook (Story 4.5)
 * React hook for managing reviews data and operations
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Review,
  ReviewsPage,
  CreateReviewInput,
  ReviewEligibility,
  VoteType,
} from '@sew4mi/shared/types/review';

/**
 * Fetch reviews for a tailor
 */
export function useReviews(tailorId: string, options?: {
  sortBy?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery<ReviewsPage>({
    queryKey: ['reviews', tailorId, options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.sortBy) params.append('sortBy', options.sortBy);
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());

      const response = await fetch(`/api/reviews/tailor/${tailorId}?${params}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      return response.json();
    },
  });
}

/**
 * Check order eligibility for review
 */
export function useReviewEligibility(orderId: string) {
  return useQuery<ReviewEligibility>({
    queryKey: ['review-eligibility', orderId],
    queryFn: async () => {
      const response = await fetch(`/api/reviews/check-eligibility/${orderId}`);
      if (!response.ok) throw new Error('Failed to check eligibility');
      return response.json();
    },
    enabled: !!orderId,
  });
}

/**
 * Submit a review
 */
export function useSubmitReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReviewInput) => {
      const response = await fetch('/api/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit review');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Invalidate reviews queries for the tailor
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['review-eligibility', variables.orderId] });
    },
  });
}

/**
 * Vote on a review
 */
export function useVoteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, voteType }: { reviewId: string; voteType: VoteType }) => {
      const response = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType }),
      });
      if (!response.ok) throw new Error('Failed to submit vote');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

/**
 * Submit tailor response
 */
export function useTailorResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ reviewId, responseText }: { reviewId: string; responseText: string }) => {
      const response = await fetch(`/api/reviews/${reviewId}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responseText }),
      });
      if (!response.ok) throw new Error('Failed to submit response');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

/**
 * Moderate a review (admin only)
 */
export function useModerateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reviewId,
      status,
      reason,
    }: {
      reviewId: string;
      status: string;
      reason?: string;
    }) => {
      const response = await fetch(`/api/reviews/${reviewId}/moderate`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason }),
      });
      if (!response.ok) throw new Error('Failed to moderate review');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

