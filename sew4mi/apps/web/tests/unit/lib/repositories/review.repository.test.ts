/**
 * Unit Tests for ReviewRepository (Story 4.5)
 * Following TDD approach: Tests written BEFORE implementation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewRepository } from '@/lib/repositories/review.repository';
import {
  Review,
  ReviewEligibility,
  ReviewIneligibilityReason,
  ModerationStatus,
  VoteType,
  CreateReviewInput,
  ReviewQueryOptions,
} from '@sew4mi/shared/types/review';
import { createMockSupabaseClient } from '../../../mocks/supabase';

describe('ReviewRepository', () => {
  let repository: ReviewRepository;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    repository = new ReviewRepository(mockSupabase as any);
    vi.clearAllMocks();
  });

  describe('checkReviewEligibility', () => {
    it('returns NOT_DELIVERED when order status is not DELIVERED', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'order-1',
                status: 'IN_PROGRESS',
                actual_delivery: null,
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await repository.checkReviewEligibility('order-1');

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe(ReviewIneligibilityReason.NOT_DELIVERED);
    });

    it('returns TIME_EXPIRED when order delivered >90 days ago', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 91);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'order-1',
                status: 'DELIVERED',
                actual_delivery: oldDate.toISOString(),
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await repository.checkReviewEligibility('order-1');

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe(ReviewIneligibilityReason.TIME_EXPIRED);
    });

    it('returns DISPUTED when order has disputed status', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'order-1',
                status: 'DISPUTED',
                actual_delivery: recentDate.toISOString(),
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await repository.checkReviewEligibility('order-1');

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe(ReviewIneligibilityReason.DISPUTED);
    });

    it('returns ALREADY_REVIEWED when review exists for order', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 2);

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'order-1',
                  status: 'DELIVERED',
                  actual_delivery: recentDate.toISOString(),
                },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'review-1',
                  order_id: 'order-1',
                  customer_id: 'customer-1',
                },
                error: null,
              }),
            }),
          }),
        });

      const result = await repository.checkReviewEligibility('order-1');

      expect(result.canReview).toBe(false);
      expect(result.reason).toBe(ReviewIneligibilityReason.ALREADY_REVIEWED);
      expect(result.existingReview).toBeDefined();
    });

    it('returns canReview=true with daysRemaining for eligible order', async () => {
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 25);

      mockSupabase.from
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'order-1',
                  status: 'DELIVERED',
                  actual_delivery: recentDate.toISOString(),
                },
                error: null,
              }),
            }),
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116' },
              }),
            }),
          }),
        });

      const result = await repository.checkReviewEligibility('order-1');

      expect(result.canReview).toBe(true);
      expect(result.reason).toBeUndefined();
      expect(result.daysRemaining).toBeGreaterThan(60);
      expect(result.daysRemaining).toBeLessThan(66);
    });
  });

  describe('createReview', () => {
    it('creates review with calculated overall rating', async () => {
      const input: CreateReviewInput = {
        orderId: 'order-1',
        ratingFit: 4,
        ratingQuality: 5,
        ratingCommunication: 4,
        ratingTimeliness: 5,
        reviewText: 'Great tailor! Excellent work.',
      };

      const mockReview = {
        id: 'review-1',
        order_id: input.orderId,
        customer_id: 'customer-1',
        tailor_id: 'tailor-1',
        rating_fit: input.ratingFit,
        quality_rating: input.ratingQuality,
        communication_rating: input.ratingCommunication,
        timeliness_rating: input.ratingTimeliness,
        overall_rating: 4.5,
        review_text: input.reviewText,
        moderation_status: 'PENDING',
        is_verified_purchase: true,
        is_hidden: false,
        helpful_count: 0,
        unhelpful_count: 0,
        reported: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockReview,
              error: null,
            }),
          }),
        }),
      });

      const result = await repository.createReview(input, 'customer-1', 'tailor-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('review-1');
      expect(result.overallRating).toBe(4.5);
      expect(mockSupabase.from).toHaveBeenCalledWith('reviews');
    });

    it('throws error when review already exists for order', async () => {
      const input: CreateReviewInput = {
        orderId: 'order-1',
        ratingFit: 4,
        ratingQuality: 5,
        ratingCommunication: 4,
        ratingTimeliness: 5,
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Duplicate key violation' },
            }),
          }),
        }),
      });

      await expect(
        repository.createReview(input, 'customer-1', 'tailor-1')
      ).rejects.toThrow();
    });
  });

  describe('getReviewsByTailor', () => {
    it('fetches approved reviews with pagination', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          order_id: 'order-1',
          customer_id: 'customer-1',
          tailor_id: 'tailor-1',
          rating_fit: 4,
          quality_rating: 5,
          overall_rating: 4.5,
          moderation_status: 'APPROVED',
          is_hidden: false,
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockReviews,
                    error: null,
                    count: 1,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const options: ReviewQueryOptions = {
        tailorId: 'tailor-1',
        limit: 10,
        offset: 0,
      };

      const result = await repository.getReviewsByTailor(options);

      expect(result.reviews).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });

    it('sorts reviews by most helpful', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          tailor_id: 'tailor-1',
          helpful_count: 10,
          created_at: new Date().toISOString(),
        },
        {
          id: 'review-2',
          tailor_id: 'tailor-1',
          helpful_count: 5,
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: mockReviews,
                    error: null,
                    count: 2,
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const options: ReviewQueryOptions = {
        tailorId: 'tailor-1',
        sortBy: 'most_helpful',
      };

      const result = await repository.getReviewsByTailor(options);

      expect(mockSupabase.from).toHaveBeenCalledWith('reviews');
      expect(result.reviews).toHaveLength(2);
    });
  });

  describe('addVote', () => {
    it('adds new vote successfully', async () => {
      const mockVote = {
        id: 'vote-1',
        review_id: 'review-1',
        user_id: 'user-1',
        vote_type: 'HELPFUL',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockVote,
              error: null,
            }),
          }),
        }),
      });

      const result = await repository.addVote('review-1', 'user-1', VoteType.HELPFUL);

      expect(result).toBeDefined();
      expect(result.voteType).toBe(VoteType.HELPFUL);
      expect(mockSupabase.from).toHaveBeenCalledWith('review_votes');
    });

    it('updates existing vote', async () => {
      const mockVote = {
        id: 'vote-1',
        review_id: 'review-1',
        user_id: 'user-1',
        vote_type: 'UNHELPFUL',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        upsert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockVote,
              error: null,
            }),
          }),
        }),
      });

      const result = await repository.addVote('review-1', 'user-1', VoteType.UNHELPFUL);

      expect(result.voteType).toBe(VoteType.UNHELPFUL);
    });
  });

  describe('addResponse', () => {
    it('creates tailor response successfully', async () => {
      const mockResponse = {
        id: 'response-1',
        review_id: 'review-1',
        tailor_id: 'tailor-1',
        response_text: 'Thank you for your feedback!',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockResponse,
              error: null,
            }),
          }),
        }),
      });

      const result = await repository.addResponse(
        'review-1',
        'tailor-1',
        'Thank you for your feedback!'
      );

      expect(result).toBeDefined();
      expect(result.responseText).toBe('Thank you for your feedback!');
      expect(mockSupabase.from).toHaveBeenCalledWith('review_responses');
    });

    it('throws error when response already exists', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: '23505', message: 'Duplicate key violation' },
            }),
          }),
        }),
      });

      await expect(
        repository.addResponse('review-1', 'tailor-1', 'Response text')
      ).rejects.toThrow();
    });
  });

  describe('updateModerationStatus', () => {
    it('updates moderation status to APPROVED', async () => {
      const mockReview = {
        id: 'review-1',
        moderation_status: 'APPROVED',
        moderated_by: 'admin-1',
        moderated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockReview,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await repository.updateModerationStatus(
        'review-1',
        ModerationStatus.APPROVED,
        'admin-1'
      );

      expect(result.moderationStatus).toBe(ModerationStatus.APPROVED);
      expect(result.moderatedBy).toBe('admin-1');
    });

    it('updates moderation status to FLAGGED with reason', async () => {
      const mockReview = {
        id: 'review-1',
        moderation_status: 'FLAGGED',
        moderation_reason: 'Profanity detected',
        moderated_by: 'system',
        moderated_at: new Date().toISOString(),
      };

      mockSupabase.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: mockReview,
                error: null,
              }),
            }),
          }),
        }),
      });

      const result = await repository.updateModerationStatus(
        'review-1',
        ModerationStatus.FLAGGED,
        'system',
        'Profanity detected'
      );

      expect(result.moderationStatus).toBe(ModerationStatus.FLAGGED);
      expect(result.moderationReason).toBe('Profanity detected');
    });
  });

  describe('getReviewById', () => {
    it('fetches review with photos and response', async () => {
      const mockReview = {
        id: 'review-1',
        order_id: 'order-1',
        customer_id: 'customer-1',
        tailor_id: 'tailor-1',
        rating_fit: 4,
        quality_rating: 5,
        overall_rating: 4.5,
        review_text: 'Great work!',
        moderation_status: 'APPROVED',
        created_at: new Date().toISOString(),
        review_photos: [
          {
            id: 'photo-1',
            photo_url: 'https://example.com/photo.jpg',
            thumbnail_url: 'https://example.com/thumb.jpg',
          },
        ],
        review_responses: {
          id: 'response-1',
          response_text: 'Thank you!',
        },
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockReview,
              error: null,
            }),
          }),
        }),
      });

      const result = await repository.getReviewById('review-1');

      expect(result).toBeDefined();
      expect(result.photos).toHaveLength(1);
      expect(result.response).toBeDefined();
    });
  });

  describe('getPendingReviews', () => {
    it('fetches reviews pending moderation', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          moderation_status: 'PENDING',
          created_at: new Date().toISOString(),
        },
        {
          id: 'review-2',
          moderation_status: 'FLAGGED',
          created_at: new Date().toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockReviews,
                error: null,
                count: 2,
              }),
            }),
          }),
        }),
      });

      const result = await repository.getPendingReviews(10, 0);

      expect(result.reviews).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });
});

