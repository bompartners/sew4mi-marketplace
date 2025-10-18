/**
 * Unit Tests for ReviewService (Story 4.5)
 * Following TDD approach: Tests written BEFORE implementation
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { ReviewService } from '@/lib/services/review.service';
import { ReviewRepository } from '@/lib/repositories/review.repository';
import {
  CreateReviewInput,
  ModerationStatus,
  ReviewIneligibilityReason,
  VoteType,
} from '@sew4mi/shared/types/review';

describe('ReviewService', () => {
  let service: ReviewService;
  let mockRepository: {
    checkReviewEligibility: Mock;
    createReview: Mock;
    getReviewsByTailor: Mock;
    getReviewById: Mock;
    addVote: Mock;
    addResponse: Mock;
    updateModerationStatus: Mock;
    getPendingReviews: Mock;
  };

  beforeEach(() => {
    mockRepository = {
      checkReviewEligibility: vi.fn(),
      createReview: vi.fn(),
      getReviewsByTailor: vi.fn(),
      getReviewById: vi.fn(),
      addVote: vi.fn(),
      addResponse: vi.fn(),
      updateModerationStatus: vi.fn(),
      getPendingReviews: vi.fn(),
    };

    service = new ReviewService(mockRepository as any);
    vi.clearAllMocks();
  });

  describe('submitReview', () => {
    it('checks eligibility before creating review', async () => {
      const input: CreateReviewInput = {
        orderId: 'order-1',
        ratingFit: 4,
        ratingQuality: 5,
        ratingCommunication: 4,
        ratingTimeliness: 5,
        reviewText: 'Great tailor! Excellent work.',
      };

      mockRepository.checkReviewEligibility.mockResolvedValue({
        canReview: false,
        reason: ReviewIneligibilityReason.NOT_DELIVERED,
      });

      try {
        await service.submitReview(input, 'customer-1', 'tailor-1');
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/Order is not eligible for review/);
        expect(mockRepository.checkReviewEligibility).toHaveBeenCalledWith('order-1');
        expect(mockRepository.createReview).not.toHaveBeenCalled();
      }
    });

    it('auto-approves clean review', async () => {
      const input: CreateReviewInput = {
        orderId: 'order-1',
        ratingFit: 4,
        ratingQuality: 5,
        ratingCommunication: 4,
        ratingTimeliness: 5,
        reviewText: 'Great tailor! Excellent work and quality.',
      };

      mockRepository.checkReviewEligibility.mockResolvedValue({
        canReview: true,
      });

      const mockReview = {
        id: 'review-1',
        orderId: input.orderId,
        customerId: 'customer-1',
        tailorId: 'tailor-1',
        moderationStatus: ModerationStatus.PENDING,
      };

      const mockApprovedReview = {
        ...mockReview,
        moderationStatus: ModerationStatus.APPROVED,
      };

      mockRepository.createReview.mockResolvedValue(mockReview);
      mockRepository.updateModerationStatus.mockResolvedValue(mockApprovedReview);

      const result = await service.submitReview(input, 'customer-1', 'tailor-1');

      expect(result.moderationStatus).toBe(ModerationStatus.APPROVED);
      expect(mockRepository.createReview).toHaveBeenCalled();
      expect(mockRepository.updateModerationStatus).toHaveBeenCalledWith(
        'review-1',
        ModerationStatus.APPROVED,
        'system'
      );
    });

    it('flags review with profanity for manual review', async () => {
      const input: CreateReviewInput = {
        orderId: 'order-1',
        ratingFit: 1,
        ratingQuality: 1,
        ratingCommunication: 1,
        ratingTimeliness: 1,
        reviewText: 'This damn fool damn stupid damn bad tailor!', // 3+ profane words
      };

      mockRepository.checkReviewEligibility.mockResolvedValue({
        canReview: true,
      });

      const mockReview = {
        id: 'review-1',
        orderId: input.orderId,
        customerId: 'customer-1',
        tailorId: 'tailor-1',
        moderationStatus: ModerationStatus.PENDING,
      };

      mockRepository.createReview.mockResolvedValue(mockReview);
      mockRepository.updateModerationStatus.mockResolvedValue({
        ...mockReview,
        moderationStatus: ModerationStatus.FLAGGED,
      });

      const result = await service.submitReview(input, 'customer-1', 'tailor-1');

      expect(mockRepository.updateModerationStatus).toHaveBeenCalledWith(
        'review-1',
        ModerationStatus.FLAGGED,
        'system',
        expect.stringContaining('profane')
      );
    });

    it('flags review with multiple links as spam', async () => {
      const input: CreateReviewInput = {
        orderId: 'order-1',
        ratingFit: 5,
        ratingQuality: 5,
        ratingCommunication: 5,
        ratingTimeliness: 5,
        reviewText: 'Visit http://spam.com and https://more-spam.com and www.spam-again.com',
      };

      mockRepository.checkReviewEligibility.mockResolvedValue({
        canReview: true,
      });

      const mockReview = {
        id: 'review-1',
        moderationStatus: ModerationStatus.PENDING,
      };

      mockRepository.createReview.mockResolvedValue(mockReview);
      mockRepository.updateModerationStatus.mockResolvedValue({
        ...mockReview,
        moderationStatus: ModerationStatus.FLAGGED,
      });

      const result = await service.submitReview(input, 'customer-1', 'tailor-1');

      expect(mockRepository.updateModerationStatus).toHaveBeenCalledWith(
        'review-1',
        ModerationStatus.FLAGGED,
        'system',
        expect.stringContaining('links')
      );
    });

    it('flags review with all caps text as spam', async () => {
      const input: CreateReviewInput = {
        orderId: 'order-1',
        ratingFit: 5,
        ratingQuality: 5,
        ratingCommunication: 5,
        ratingTimeliness: 5,
        reviewText: 'THIS IS ALL CAPS SPAM MESSAGE VERY BAD',
      };

      mockRepository.checkReviewEligibility.mockResolvedValue({
        canReview: true,
      });

      const mockReview = {
        id: 'review-1',
        moderationStatus: ModerationStatus.PENDING,
      };

      mockRepository.createReview.mockResolvedValue(mockReview);
      mockRepository.updateModerationStatus.mockResolvedValue({
        ...mockReview,
        moderationStatus: ModerationStatus.FLAGGED,
      });

      const result = await service.submitReview(input, 'customer-1', 'tailor-1');

      expect(mockRepository.updateModerationStatus).toHaveBeenCalledWith(
        'review-1',
        ModerationStatus.FLAGGED,
        'system',
        expect.stringContaining('all caps')
      );
    });
  });

  describe('voteOnReview', () => {
    it('adds helpful vote successfully', async () => {
      const mockVote = {
        id: 'vote-1',
        reviewId: 'review-1',
        userId: 'user-1',
        voteType: VoteType.HELPFUL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRepository.addVote.mockResolvedValue(mockVote);

      const result = await service.voteOnReview('review-1', 'user-1', VoteType.HELPFUL);

      expect(result.voteType).toBe(VoteType.HELPFUL);
      expect(mockRepository.addVote).toHaveBeenCalledWith('review-1', 'user-1', VoteType.HELPFUL);
    });

    it('changes vote from helpful to unhelpful', async () => {
      const mockVote = {
        id: 'vote-1',
        reviewId: 'review-1',
        userId: 'user-1',
        voteType: VoteType.UNHELPFUL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRepository.addVote.mockResolvedValue(mockVote);

      const result = await service.voteOnReview('review-1', 'user-1', VoteType.UNHELPFUL);

      expect(result.voteType).toBe(VoteType.UNHELPFUL);
    });
  });

  describe('respondToReview', () => {
    it('creates tailor response successfully', async () => {
      const mockResponse = {
        id: 'response-1',
        reviewId: 'review-1',
        tailorId: 'tailor-1',
        responseText: 'Thank you for your feedback!',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockRepository.addResponse.mockResolvedValue(mockResponse);

      const result = await service.respondToReview(
        'review-1',
        'tailor-1',
        'Thank you for your feedback!'
      );

      expect(result.responseText).toBe('Thank you for your feedback!');
      expect(mockRepository.addResponse).toHaveBeenCalledWith(
        'review-1',
        'tailor-1',
        'Thank you for your feedback!'
      );
    });

    it('validates minimum response length', async () => {
      try {
        await service.respondToReview('review-1', 'tailor-1', 'Too short');
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/Response must be at least 10 characters/);
        expect(mockRepository.addResponse).not.toHaveBeenCalled();
      }
    });

    it('validates maximum response length', async () => {
      const longResponse = 'a'.repeat(1001);

      try {
        await service.respondToReview('review-1', 'tailor-1', longResponse);
        // Should not reach here
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toMatch(/Response must be less than 1000 characters/);
        expect(mockRepository.addResponse).not.toHaveBeenCalled();
      }
    });
  });

  describe('moderateReview', () => {
    it('approves review successfully', async () => {
      const mockReview = {
        id: 'review-1',
        moderationStatus: ModerationStatus.APPROVED,
        moderatedBy: 'admin-1',
        moderatedAt: new Date().toISOString(),
      };

      mockRepository.updateModerationStatus.mockResolvedValue(mockReview);

      const result = await service.moderateReview(
        'review-1',
        ModerationStatus.APPROVED,
        'admin-1'
      );

      expect(result.moderationStatus).toBe(ModerationStatus.APPROVED);
      expect(mockRepository.updateModerationStatus).toHaveBeenCalledWith(
        'review-1',
        ModerationStatus.APPROVED,
        'admin-1',
        undefined
      );
    });

    it('rejects review with reason', async () => {
      const mockReview = {
        id: 'review-1',
        moderationStatus: ModerationStatus.REJECTED,
        moderationReason: 'Inappropriate content',
        moderatedBy: 'admin-1',
        moderatedAt: new Date().toISOString(),
      };

      mockRepository.updateModerationStatus.mockResolvedValue(mockReview);

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

  describe('getReviewsForTailor', () => {
    it('fetches paginated reviews', async () => {
      const mockPage = {
        reviews: [
          {
            id: 'review-1',
            tailorId: 'tailor-1',
            overallRating: 4.5,
          },
        ],
        total: 1,
        hasMore: false,
      };

      mockRepository.getReviewsByTailor.mockResolvedValue(mockPage);

      const result = await service.getReviewsForTailor('tailor-1', {
        sortBy: 'newest',
        limit: 10,
        offset: 0,
      });

      expect(result.reviews).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockRepository.getReviewsByTailor).toHaveBeenCalledWith({
        tailorId: 'tailor-1',
        sortBy: 'newest',
        limit: 10,
        offset: 0,
      });
    });
  });

  describe('checkEligibility', () => {
    it('delegates to repository', async () => {
      const mockEligibility = {
        canReview: true,
        daysRemaining: 65,
      };

      mockRepository.checkReviewEligibility.mockResolvedValue(mockEligibility);

      const result = await service.checkEligibility('order-1');

      expect(result.canReview).toBe(true);
      expect(result.daysRemaining).toBe(65);
      expect(mockRepository.checkReviewEligibility).toHaveBeenCalledWith('order-1');
    });
  });

  describe('getPendingModerationQueue', () => {
    it('fetches pending and flagged reviews', async () => {
      const mockPage = {
        reviews: [
          { id: 'review-1', moderationStatus: ModerationStatus.PENDING },
          { id: 'review-2', moderationStatus: ModerationStatus.FLAGGED },
        ],
        total: 2,
        hasMore: false,
      };

      mockRepository.getPendingReviews.mockResolvedValue(mockPage);

      const result = await service.getPendingModerationQueue(10, 0);

      expect(result.reviews).toHaveLength(2);
      expect(mockRepository.getPendingReviews).toHaveBeenCalledWith(10, 0);
    });
  });
});

