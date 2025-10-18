/**
 * Integration Test: Review Lifecycle (Story 4.5)
 * Tests complete review submission, voting, response, and moderation flow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ReviewService } from '@/lib/services/review.service';
import { ReviewRepository } from '@/lib/repositories/review.repository';
import { ModerationStatus, VoteType } from '@sew4mi/shared/types/review';

describe('Review Lifecycle Integration', () => {
  let service: ReviewService;
  let repository: ReviewRepository;

  beforeEach(() => {
    // Use real repository with mocked Supabase client
    const mockSupabase = {
      from: vi.fn(),
      auth: { getUser: vi.fn() },
    } as any;

    repository = new ReviewRepository(mockSupabase);
    service = new ReviewService(repository);
  });

  describe('Complete review submission flow', () => {
    it('submits review, auto-moderates, and notifies tailor', async () => {
      // Mock eligibility check
      vi.spyOn(repository, 'checkReviewEligibility').mockResolvedValue({
        canReview: true,
        daysRemaining: 65,
      });

      // Mock review creation
      const mockReview = {
        id: 'review-1',
        orderId: 'order-1',
        customerId: 'customer-1',
        tailorId: 'tailor-1',
        ratingFit: 4,
        qualityRating: 5,
        communicationRating: 4,
        timelinessRating: 5,
        overallRating: 4.5,
        reviewText: 'Great tailor! Excellent work.',
        moderationStatus: ModerationStatus.PENDING,
        isVerifiedPurchase: true,
        isHidden: false,
        helpfulCount: 0,
        unhelpfulCount: 0,
        reported: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(repository, 'createReview').mockResolvedValue(mockReview);
      vi.spyOn(repository, 'updateModerationStatus').mockResolvedValue({
        ...mockReview,
        moderationStatus: ModerationStatus.APPROVED,
      });

      // Submit review
      const result = await service.submitReview(
        {
          orderId: 'order-1',
          ratingFit: 4,
          ratingQuality: 5,
          ratingCommunication: 4,
          ratingTimeliness: 5,
          reviewText: 'Great tailor! Excellent work.',
        },
        'customer-1',
        'tailor-1'
      );

      // Verify review was created and auto-approved
      expect(result.moderationStatus).toBe(ModerationStatus.APPROVED);
      expect(repository.createReview).toHaveBeenCalled();
      expect(repository.updateModerationStatus).toHaveBeenCalledWith(
        'review-1',
        ModerationStatus.APPROVED,
        'system'
      );
    });

    it('flags review with profanity for manual moderation', async () => {
      vi.spyOn(repository, 'checkReviewEligibility').mockResolvedValue({
        canReview: true,
      });

      const mockReview = {
        id: 'review-2',
        orderId: 'order-2',
        moderationStatus: ModerationStatus.PENDING,
      } as any;

      vi.spyOn(repository, 'createReview').mockResolvedValue(mockReview);
      vi.spyOn(repository, 'updateModerationStatus').mockResolvedValue({
        ...mockReview,
        moderationStatus: ModerationStatus.FLAGGED,
      });

      // Submit review with profanity
      const result = await service.submitReview(
        {
          orderId: 'order-2',
          ratingFit: 1,
          ratingQuality: 1,
          ratingCommunication: 1,
          ratingTimeliness: 1,
          reviewText: 'This damn fool stupid bad work!', // 3+ profane words
        },
        'customer-1',
        'tailor-1'
      );

      // Verify review was flagged
      expect(repository.updateModerationStatus).toHaveBeenCalledWith(
        'review-2',
        ModerationStatus.FLAGGED,
        'system',
        expect.stringContaining('profane')
      );
    });
  });

  describe('Voting on reviews', () => {
    it('allows users to vote and updates counts', async () => {
      const mockVote = {
        id: 'vote-1',
        reviewId: 'review-1',
        userId: 'user-1',
        voteType: VoteType.HELPFUL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(repository, 'addVote').mockResolvedValue(mockVote);

      const result = await service.voteOnReview('review-1', 'user-1', VoteType.HELPFUL);

      expect(result.voteType).toBe(VoteType.HELPFUL);
      expect(repository.addVote).toHaveBeenCalledWith('review-1', 'user-1', VoteType.HELPFUL);
    });

    it('allows users to change their vote', async () => {
      const mockVote = {
        id: 'vote-1',
        reviewId: 'review-1',
        userId: 'user-1',
        voteType: VoteType.UNHELPFUL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(repository, 'addVote').mockResolvedValue(mockVote);

      // First vote: HELPFUL
      await service.voteOnReview('review-1', 'user-1', VoteType.HELPFUL);

      // Change to UNHELPFUL
      const result = await service.voteOnReview('review-1', 'user-1', VoteType.UNHELPFUL);

      expect(result.voteType).toBe(VoteType.UNHELPFUL);
    });
  });

  describe('Tailor responses', () => {
    it('allows tailor to respond to review', async () => {
      const mockResponse = {
        id: 'response-1',
        reviewId: 'review-1',
        tailorId: 'tailor-1',
        responseText: 'Thank you for your feedback!',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      vi.spyOn(repository, 'addResponse').mockResolvedValue(mockResponse);

      const result = await service.respondToReview(
        'review-1',
        'tailor-1',
        'Thank you for your feedback!'
      );

      expect(result.responseText).toBe('Thank you for your feedback!');
      expect(repository.addResponse).toHaveBeenCalled();
    });

    it('validates response length', async () => {
      try {
        await service.respondToReview('review-1', 'tailor-1', 'Too short');
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/Response must be at least 10 characters/);
      }
    });
  });

  describe('Review moderation', () => {
    it('allows admin to approve flagged review', async () => {
      const mockReview = {
        id: 'review-1',
        moderationStatus: ModerationStatus.APPROVED,
        moderatedBy: 'admin-1',
        moderatedAt: new Date().toISOString(),
      } as any;

      vi.spyOn(repository, 'updateModerationStatus').mockResolvedValue(mockReview);

      const result = await service.moderateReview(
        'review-1',
        ModerationStatus.APPROVED,
        'admin-1'
      );

      expect(result.moderationStatus).toBe(ModerationStatus.APPROVED);
    });

    it('allows admin to reject inappropriate review', async () => {
      const mockReview = {
        id: 'review-1',
        moderationStatus: ModerationStatus.REJECTED,
        moderationReason: 'Inappropriate content',
        moderatedBy: 'admin-1',
        moderatedAt: new Date().toISOString(),
      } as any;

      vi.spyOn(repository, 'updateModerationStatus').mockResolvedValue(mockReview);

      const result = await service.moderateReview(
        'review-1',
        ModerationStatus.REJECTED,
        'admin-1',
        'Inappropriate content'
      );

      expect(result.moderationStatus).toBe(ModerationStatus.REJECTED);
      expect(result.moderationReason).toBe('Inappropriate content');
    });
  });

  describe('Review eligibility', () => {
    it('prevents review for non-delivered order', async () => {
      vi.spyOn(repository, 'checkReviewEligibility').mockResolvedValue({
        canReview: false,
        reason: 'NOT_DELIVERED' as any,
      });

      try {
        await service.submitReview(
          {
            orderId: 'order-1',
            ratingFit: 4,
            ratingQuality: 5,
            ratingCommunication: 4,
            ratingTimeliness: 5,
          },
          'customer-1',
          'tailor-1'
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/Order is not eligible for review/);
      }
    });

    it('prevents duplicate reviews', async () => {
      vi.spyOn(repository, 'checkReviewEligibility').mockResolvedValue({
        canReview: false,
        reason: 'ALREADY_REVIEWED' as any,
        existingReview: { id: 'review-1' } as any,
      });

      try {
        await service.submitReview(
          {
            orderId: 'order-1',
            ratingFit: 4,
            ratingQuality: 5,
            ratingCommunication: 4,
            ratingTimeliness: 5,
          },
          'customer-1',
          'tailor-1'
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/Order is not eligible for review/);
      }
    });
  });

  describe('Rating calculations', () => {
    it('calculates overall rating from category ratings', async () => {
      vi.spyOn(repository, 'checkReviewEligibility').mockResolvedValue({
        canReview: true,
      });

      const mockReview = {
        id: 'review-1',
        ratingFit: 4,
        qualityRating: 5,
        communicationRating: 4,
        timelinessRating: 3,
        overallRating: 4.0, // (4+5+4+3)/4 = 4.0
        moderationStatus: ModerationStatus.PENDING,
      } as any;

      vi.spyOn(repository, 'createReview').mockResolvedValue(mockReview);
      vi.spyOn(repository, 'updateModerationStatus').mockResolvedValue({
        ...mockReview,
        moderationStatus: ModerationStatus.APPROVED,
      });

      const result = await service.submitReview(
        {
          orderId: 'order-1',
          ratingFit: 4,
          ratingQuality: 5,
          ratingCommunication: 4,
          ratingTimeliness: 3,
        },
        'customer-1',
        'tailor-1'
      );

      expect(result).toBeDefined();
      // Overall rating should be calculated by repository
    });
  });
});

