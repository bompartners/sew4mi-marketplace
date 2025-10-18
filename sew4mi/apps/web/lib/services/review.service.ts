/**
 * Review Service (Story 4.5)
 * Handles business logic for reviews including moderation, validation, and notifications
 */

import { ReviewRepository } from '@/lib/repositories/review.repository';
import {
  Review,
  ReviewEligibility,
  ReviewVote,
  ReviewResponse,
  CreateReviewInput,
  ReviewQueryOptions,
  ReviewsPage,
  ModerationStatus,
  VoteType,
} from '@sew4mi/shared/types/review';
import Filter from 'bad-words';

// Moderation configuration
const PROFANITY_THRESHOLD = 3;
const LINK_THRESHOLD = 2;
const ALL_CAPS_THRESHOLD = 0.7; // 70% of text in caps

/**
 * Service for review-related business logic
 */
export class ReviewService {
  private repository: ReviewRepository;
  private profanityFilter: Filter;

  /**
   * Constructor with optional repository for testing
   * @param repository - Optional ReviewRepository (for testing)
   */
  constructor(repository?: ReviewRepository) {
    this.repository = repository || new ReviewRepository();
    this.profanityFilter = new Filter();
    
    // Add Ghana-specific profanity words
    this.profanityFilter.addWords('fool', 'stupid');
  }

  /**
   * Submit a new review with automatic moderation
   * @param input - Review input data
   * @param customerId - Customer ID
   * @param tailorId - Tailor ID
   * @returns Created review
   */
  async submitReview(
    input: CreateReviewInput,
    customerId: string,
    tailorId: string
  ): Promise<Review> {
    // Check eligibility
    const eligibility = await this.repository.checkReviewEligibility(input.orderId);
    
    if (!eligibility.canReview) {
      throw new Error(`Order is not eligible for review: ${eligibility.reason}`);
    }

    // Create the review
    const review = await this.repository.createReview(input, customerId, tailorId);

    // Run automatic moderation
    const moderationResult = this.autoModerateReview(input.reviewText || '');

    if (moderationResult.shouldFlag) {
      // Flag for manual review
      return await this.repository.updateModerationStatus(
        review.id,
        ModerationStatus.FLAGGED,
        'system',
        moderationResult.reason
      );
    } else {
      // Auto-approve clean reviews
      return await this.repository.updateModerationStatus(
        review.id,
        ModerationStatus.APPROVED,
        'system'
      );
    }
  }

  /**
   * Automatically moderate review content
   * @param reviewText - Review text to moderate
   * @returns Moderation result
   */
  private autoModerateReview(reviewText: string): {
    shouldFlag: boolean;
    reason?: string;
  } {
    if (!reviewText) {
      return { shouldFlag: false };
    }

    // Check for profanity
    const profaneWordCount = this.countProfaneWords(reviewText);
    if (profaneWordCount >= PROFANITY_THRESHOLD) {
      return {
        shouldFlag: true,
        reason: `Contains ${profaneWordCount} profane words (threshold: ${PROFANITY_THRESHOLD})`,
      };
    }

    // Check for links (spam)
    const linkCount = this.countLinks(reviewText);
    if (linkCount > LINK_THRESHOLD) {
      return {
        shouldFlag: true,
        reason: `Contains ${linkCount} links (threshold: ${LINK_THRESHOLD})`,
      };
    }

    // Check for all caps (spam)
    if (this.isAllCaps(reviewText)) {
      return {
        shouldFlag: true,
        reason: 'Text is mostly all caps (possible spam)',
      };
    }

    return { shouldFlag: false };
  }

  /**
   * Count profane words in text
   */
  private countProfaneWords(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let count = 0;
    
    for (const word of words) {
      if (this.profanityFilter.isProfane(word)) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Count links in text
   */
  private countLinks(text: string): number {
    const urlPattern = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|([^\s]+\.(com|net|org|gh)[^\s]*)/gi;
    const matches = text.match(urlPattern);
    return matches ? matches.length : 0;
  }

  /**
   * Check if text is mostly all caps
   */
  private isAllCaps(text: string): boolean {
    // Remove spaces and non-letter characters
    const letters = text.replace(/[^a-zA-Z]/g, '');
    if (letters.length < 10) return false; // Too short to judge
    
    const upperCaseCount = letters.replace(/[^A-Z]/g, '').length;
    const ratio = upperCaseCount / letters.length;
    
    return ratio >= ALL_CAPS_THRESHOLD;
  }

  /**
   * Vote on a review
   * @param reviewId - Review ID
   * @param userId - User ID
   * @param voteType - Vote type
   * @returns Created/updated vote
   */
  async voteOnReview(
    reviewId: string,
    userId: string,
    voteType: VoteType
  ): Promise<ReviewVote> {
    return await this.repository.addVote(reviewId, userId, voteType);
  }

  /**
   * Respond to a review as a tailor
   * @param reviewId - Review ID
   * @param tailorId - Tailor ID
   * @param responseText - Response text
   * @returns Created response
   */
  async respondToReview(
    reviewId: string,
    tailorId: string,
    responseText: string
  ): Promise<ReviewResponse> {
    // Validate response length
    if (responseText.length < 10) {
      throw new Error('Response must be at least 10 characters');
    }
    
    if (responseText.length > 1000) {
      throw new Error('Response must be less than 1000 characters');
    }

    return await this.repository.addResponse(reviewId, tailorId, responseText);
  }

  /**
   * Moderate a review (admin action)
   * @param reviewId - Review ID
   * @param status - New moderation status
   * @param moderatorId - Moderator user ID
   * @param reason - Optional reason
   * @returns Updated review
   */
  async moderateReview(
    reviewId: string,
    status: ModerationStatus,
    moderatorId: string,
    reason?: string
  ): Promise<Review> {
    return await this.repository.updateModerationStatus(
      reviewId,
      status,
      moderatorId,
      reason
    );
  }

  /**
   * Get reviews for a tailor
   * @param tailorId - Tailor ID
   * @param options - Query options
   * @returns Paginated reviews
   */
  async getReviewsForTailor(
    tailorId: string,
    options: ReviewQueryOptions = {}
  ): Promise<ReviewsPage> {
    return await this.repository.getReviewsByTailor({
      ...options,
      tailorId,
    });
  }

  /**
   * Check if an order is eligible for review
   * @param orderId - Order ID
   * @returns Eligibility information
   */
  async checkEligibility(orderId: string): Promise<ReviewEligibility> {
    return await this.repository.checkReviewEligibility(orderId);
  }

  /**
   * Get pending reviews for moderation
   * @param limit - Number of reviews to fetch
   * @param offset - Offset for pagination
   * @returns Paginated pending reviews
   */
  async getPendingModerationQueue(
    limit: number = 10,
    offset: number = 0
  ): Promise<ReviewsPage> {
    return await this.repository.getPendingReviews(limit, offset);
  }

  /**
   * Get a review by ID
   * @param reviewId - Review ID
   * @returns Review with photos and response
   */
  async getReviewById(reviewId: string): Promise<Review> {
    return await this.repository.getReviewById(reviewId);
  }
}

