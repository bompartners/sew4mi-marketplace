/**
 * Review Repository (Story 4.5)
 * Handles all database operations for reviews, votes, photos, and responses
 * Implements dependency injection for testability
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { getClient } from '@/lib/supabase/client';
import {
  Review,
  ReviewEligibility,
  ReviewIneligibilityReason,
  ReviewPhoto,
  ReviewVote,
  ReviewResponse,
  CreateReviewInput,
  ReviewQueryOptions,
  ReviewsPage,
  ModerationStatus,
  VoteType,
  calculateOverallRating,
} from '@sew4mi/shared/types/review';

// Constants for review eligibility
const REVIEW_WINDOW_DAYS = 90;
const EDIT_WINDOW_HOURS = 48;
const PHOTO_ADD_WINDOW_DAYS = 7;

/**
 * Repository for review-related database operations
 */
export class ReviewRepository {
  private client: SupabaseClient;

  /**
   * Constructor with optional client for testing
   * @param client - Optional Supabase client (for testing)
   */
  constructor(client?: SupabaseClient) {
    this.client = client || getClient();
  }

  /**
   * Get the Supabase client (for internal use)
   */
  private getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Check if an order is eligible for review
   * @param orderId - The order ID to check
   * @returns Review eligibility information
   */
  async checkReviewEligibility(orderId: string): Promise<ReviewEligibility> {
    // Fetch order details
    const { data: order, error: orderError } = await this.getClient()
      .from('orders')
      .select('id, status, actual_delivery')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return {
        canReview: false,
        reason: ReviewIneligibilityReason.NOT_FOUND,
      };
    }

    // Check if order is disputed (check before DELIVERED status)
    if (order.status === 'DISPUTED') {
      return {
        canReview: false,
        reason: ReviewIneligibilityReason.DISPUTED,
      };
    }

    // Check if order is delivered
    if (order.status !== 'DELIVERED') {
      return {
        canReview: false,
        reason: ReviewIneligibilityReason.NOT_DELIVERED,
      };
    }

    // Check time window (90 days from delivery)
    if (order.actual_delivery) {
      const daysSinceDelivery = this.calculateDaysSinceDelivery(order.actual_delivery);
      
      if (daysSinceDelivery > REVIEW_WINDOW_DAYS) {
        return {
          canReview: false,
          reason: ReviewIneligibilityReason.TIME_EXPIRED,
        };
      }

      // Check if review already exists
      const { data: existingReview } = await this.getClient()
        .from('reviews')
        .select('*')
        .eq('order_id', orderId)
        .single();

      if (existingReview) {
        return {
          canReview: false,
          reason: ReviewIneligibilityReason.ALREADY_REVIEWED,
          existingReview: this.mapReviewFromDb(existingReview),
        };
      }

      return {
        canReview: true,
        daysRemaining: Math.floor(REVIEW_WINDOW_DAYS - daysSinceDelivery),
      };
    }

    return {
      canReview: false,
      reason: ReviewIneligibilityReason.NOT_DELIVERED,
    };
  }

  /**
   * Calculate days since delivery
   */
  private calculateDaysSinceDelivery(deliveryDate: string): number {
    const delivered = new Date(deliveryDate);
    return (Date.now() - delivered.getTime()) / (1000 * 60 * 60 * 24);
  }

  /**
   * Create a new review
   * @param input - Review input data
   * @param customerId - Customer ID
   * @param tailorId - Tailor ID
   * @returns Created review
   */
  async createReview(
    input: CreateReviewInput,
    customerId: string,
    tailorId: string
  ): Promise<Review> {
    // Calculate overall rating
    const overallRating = calculateOverallRating(
      input.ratingFit,
      input.ratingQuality,
      input.ratingCommunication,
      input.ratingTimeliness
    );

    const reviewData = {
      order_id: input.orderId,
      customer_id: customerId,
      tailor_id: tailorId,
      rating: Math.round(overallRating), // Legacy field
      rating_fit: input.ratingFit,
      quality_rating: input.ratingQuality,
      communication_rating: input.ratingCommunication,
      timeliness_rating: input.ratingTimeliness,
      overall_rating: overallRating,
      review_text: input.reviewText || null,
      moderation_status: 'PENDING',
      is_verified_purchase: true,
      is_hidden: false,
      helpful_count: 0,
      unhelpful_count: 0,
      reported: false,
    };

    const { data, error } = await this.getClient()
      .from('reviews')
      .insert(reviewData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create review: ${error.message}`);
    }

    return this.mapReviewFromDb(data);
  }

  /**
   * Get reviews for a tailor with pagination and filtering
   * @param options - Query options
   * @returns Paginated reviews
   */
  async getReviewsByTailor(options: ReviewQueryOptions): Promise<ReviewsPage> {
    let query = this.getClient()
      .from('reviews')
      .select('*, review_photos(*), review_responses(*)', { count: 'exact' })
      .eq('tailor_id', options.tailorId || '')
      .eq('moderation_status', 'APPROVED')
      .eq('is_hidden', false);

    // Apply sorting
    switch (options.sortBy) {
      case 'most_helpful':
        query = query.order('helpful_count', { ascending: false });
        break;
      case 'highest_rated':
        query = query.order('overall_rating', { ascending: false });
        break;
      case 'lowest_rated':
        query = query.order('overall_rating', { ascending: true });
        break;
      case 'oldest':
        query = query.order('created_at', { ascending: true });
        break;
      case 'newest':
      default:
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Apply pagination
    const limit = options.limit || 10;
    const offset = options.offset || 0;
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch reviews: ${error.message}`);
    }

    const reviews = (data || []).map(this.mapReviewFromDb);
    const total = count || 0;

    return {
      reviews,
      total,
      hasMore: total > offset + reviews.length,
      nextOffset: total > offset + reviews.length ? offset + limit : undefined,
    };
  }

  /**
   * Get a review by ID
   * @param reviewId - Review ID
   * @returns Review with photos and response
   */
  async getReviewById(reviewId: string): Promise<Review> {
    const { data, error } = await this.getClient()
      .from('reviews')
      .select('*, review_photos(*), review_responses(*)')
      .eq('id', reviewId)
      .single();

    if (error || !data) {
      throw new Error(`Review not found: ${reviewId}`);
    }

    return this.mapReviewFromDb(data);
  }

  /**
   * Add or update a vote on a review
   * @param reviewId - Review ID
   * @param userId - User ID
   * @param voteType - Vote type (HELPFUL/UNHELPFUL)
   * @returns Created/updated vote
   */
  async addVote(reviewId: string, userId: string, voteType: VoteType): Promise<ReviewVote> {
    const voteData = {
      review_id: reviewId,
      user_id: userId,
      vote_type: voteType,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.getClient()
      .from('review_votes')
      .upsert(voteData, { onConflict: 'review_id,user_id' })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add vote: ${error.message}`);
    }

    return this.mapVoteFromDb(data);
  }

  /**
   * Add a tailor response to a review
   * @param reviewId - Review ID
   * @param tailorId - Tailor ID
   * @param responseText - Response text
   * @returns Created response
   */
  async addResponse(
    reviewId: string,
    tailorId: string,
    responseText: string
  ): Promise<ReviewResponse> {
    const responseData = {
      review_id: reviewId,
      tailor_id: tailorId,
      response_text: responseText,
    };

    const { data, error } = await this.getClient()
      .from('review_responses')
      .insert(responseData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add response: ${error.message}`);
    }

    return this.mapResponseFromDb(data);
  }

  /**
   * Update moderation status of a review
   * @param reviewId - Review ID
   * @param status - New moderation status
   * @param moderatorId - Moderator user ID
   * @param reason - Optional reason for moderation
   * @returns Updated review
   */
  async updateModerationStatus(
    reviewId: string,
    status: ModerationStatus,
    moderatorId: string,
    reason?: string
  ): Promise<Review> {
    const updateData: any = {
      moderation_status: status,
      moderated_by: moderatorId,
      moderated_at: new Date().toISOString(),
    };

    if (reason) {
      updateData.moderation_reason = reason;
    }

    const { data, error } = await this.getClient()
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update moderation status: ${error.message}`);
    }

    return this.mapReviewFromDb(data);
  }

  /**
   * Get pending reviews for moderation
   * @param limit - Number of reviews to fetch
   * @param offset - Offset for pagination
   * @returns Paginated pending reviews
   */
  async getPendingReviews(limit: number = 10, offset: number = 0): Promise<ReviewsPage> {
    const { data, error, count } = await this.getClient()
      .from('reviews')
      .select('*, review_photos(*)', { count: 'exact' })
      .in('moderation_status', ['PENDING', 'FLAGGED'])
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to fetch pending reviews: ${error.message}`);
    }

    const reviews = (data || []).map(this.mapReviewFromDb);
    const total = count || 0;

    return {
      reviews,
      total,
      hasMore: total > offset + reviews.length,
      nextOffset: total > offset + reviews.length ? offset + limit : undefined,
    };
  }

  /**
   * Map database review to domain model
   */
  private mapReviewFromDb(dbReview: any): Review {
    return {
      id: dbReview.id,
      orderId: dbReview.order_id,
      customerId: dbReview.customer_id,
      tailorId: dbReview.tailor_id,
      rating: dbReview.rating,
      ratingFit: dbReview.rating_fit,
      qualityRating: dbReview.quality_rating,
      communicationRating: dbReview.communication_rating,
      timelinessRating: dbReview.timeliness_rating,
      overallRating: dbReview.overall_rating,
      reviewText: dbReview.review_text,
      moderationStatus: dbReview.moderation_status as ModerationStatus,
      moderationReason: dbReview.moderation_reason,
      moderatedBy: dbReview.moderated_by,
      moderatedAt: dbReview.moderated_at,
      isVerifiedPurchase: dbReview.is_verified_purchase,
      isHidden: dbReview.is_hidden,
      hiddenAt: dbReview.hidden_at,
      helpfulCount: dbReview.helpful_count,
      unhelpfulCount: dbReview.unhelpful_count,
      reported: dbReview.reported,
      reportedReason: dbReview.reported_reason,
      photos: dbReview.review_photos?.map(this.mapPhotoFromDb),
      response: dbReview.review_responses ? this.mapResponseFromDb(dbReview.review_responses) : undefined,
      createdAt: dbReview.created_at,
      updatedAt: dbReview.updated_at,
    };
  }

  /**
   * Map database photo to domain model
   */
  private mapPhotoFromDb(dbPhoto: any): ReviewPhoto {
    return {
      id: dbPhoto.id,
      reviewId: dbPhoto.review_id,
      photoUrl: dbPhoto.photo_url,
      thumbnailUrl: dbPhoto.thumbnail_url,
      mediumUrl: dbPhoto.medium_url,
      optimizedUrl: dbPhoto.optimized_url,
      caption: dbPhoto.caption,
      consentGiven: dbPhoto.consent_given,
      displayOrder: dbPhoto.display_order,
      createdAt: dbPhoto.created_at,
    };
  }

  /**
   * Map database vote to domain model
   */
  private mapVoteFromDb(dbVote: any): ReviewVote {
    return {
      id: dbVote.id,
      reviewId: dbVote.review_id,
      userId: dbVote.user_id,
      voteType: dbVote.vote_type as VoteType,
      createdAt: dbVote.created_at,
      updatedAt: dbVote.updated_at,
    };
  }

  /**
   * Map database response to domain model
   */
  private mapResponseFromDb(dbResponse: any): ReviewResponse {
    return {
      id: dbResponse.id,
      reviewId: dbResponse.review_id,
      tailorId: dbResponse.tailor_id,
      responseText: dbResponse.response_text,
      createdAt: dbResponse.created_at,
      updatedAt: dbResponse.updated_at,
    };
  }
}

