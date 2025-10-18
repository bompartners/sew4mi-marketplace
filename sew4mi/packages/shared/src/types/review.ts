/**
 * Review and Rating Types for Customer Reviews System (Story 4.5)
 * Shared types for reviews, ratings, photos, votes, and responses
 */

import { z } from 'zod';

// ========================================
// Enums
// ========================================

/**
 * Rating categories for tailors
 */
export enum RatingCategory {
  FIT = 'FIT',
  QUALITY = 'QUALITY',
  COMMUNICATION = 'COMMUNICATION',
  TIMELINESS = 'TIMELINESS',
}

/**
 * Moderation status for reviews
 */
export enum ModerationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED',
}

/**
 * Vote types for review voting
 */
export enum VoteType {
  HELPFUL = 'HELPFUL',
  UNHELPFUL = 'UNHELPFUL',
}

/**
 * Review eligibility reasons
 */
export enum ReviewIneligibilityReason {
  NOT_DELIVERED = 'NOT_DELIVERED',
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  ALREADY_REVIEWED = 'ALREADY_REVIEWED',
  TIME_EXPIRED = 'TIME_EXPIRED',
  NOT_FOUND = 'NOT_FOUND',
}

// ========================================
// Core Review Types
// ========================================

/**
 * Review photo with multiple sizes
 */
export interface ReviewPhoto {
  id: string;
  reviewId: string;
  photoUrl: string;
  thumbnailUrl?: string;
  mediumUrl?: string;
  optimizedUrl?: string;
  caption?: string;
  consentGiven: boolean;
  displayOrder: number;
  createdAt: string;
}

/**
 * Review vote (helpful/unhelpful)
 */
export interface ReviewVote {
  id: string;
  reviewId: string;
  userId: string;
  voteType: VoteType;
  createdAt: string;
  updatedAt: string;
}

/**
 * Tailor response to a review
 */
export interface ReviewResponse {
  id: string;
  reviewId: string;
  tailorId: string;
  responseText: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Complete review with all relationships
 */
export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  tailorId: string;
  
  // Overall rating (1-5)
  rating: number;
  
  // Category ratings (1-5)
  ratingFit?: number;
  qualityRating?: number;
  communicationRating?: number;
  timelinessRating?: number;
  
  // Calculated overall rating from categories
  overallRating?: number;
  
  // Review content
  reviewText?: string;
  
  // Moderation
  moderationStatus: ModerationStatus;
  moderationReason?: string;
  moderatedBy?: string;
  moderatedAt?: string;
  
  // Verification and visibility
  isVerifiedPurchase: boolean;
  isHidden: boolean;
  hiddenAt?: string;
  
  // Engagement metrics
  helpfulCount: number;
  unhelpfulCount: number;
  
  // Legacy fields (for backward compatibility)
  reported: boolean;
  reportedReason?: string;
  
  // Relationships (populated when needed)
  photos?: ReviewPhoto[];
  response?: ReviewResponse;
  customerVote?: ReviewVote;
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Review eligibility check result
 */
export interface ReviewEligibility {
  canReview: boolean;
  reason?: ReviewIneligibilityReason;
  daysRemaining?: number;
  existingReview?: Review;
}

/**
 * Review statistics for a tailor
 */
export interface ReviewStats {
  totalReviews: number;
  averageRating: number;
  ratingFitAvg?: number;
  ratingQualityAvg?: number;
  ratingCommunicationAvg?: number;
  ratingTimelinessAvg?: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

// ========================================
// Input/Output Types
// ========================================

/**
 * Input for creating a new review
 */
export interface CreateReviewInput {
  orderId: string;
  ratingFit: number;
  ratingQuality: number;
  ratingCommunication: number;
  ratingTimeliness: number;
  reviewText?: string;
  consentToPhotos?: boolean;
}

/**
 * Input for updating a review
 */
export interface UpdateReviewInput {
  ratingFit?: number;
  ratingQuality?: number;
  ratingCommunication?: number;
  ratingTimeliness?: number;
  reviewText?: string;
}

/**
 * Input for uploading review photos
 */
export interface UploadReviewPhotoInput {
  reviewId: string;
  file: any; // File type is not available in Node.js environment
  caption?: string;
  consentGiven: boolean;
}

/**
 * Result of photo upload
 */
export interface ReviewPhotoUpload {
  id: string;
  photoUrl: string;
  thumbnailUrl: string;
  mediumUrl: string;
  optimizedUrl: string;
}

/**
 * Input for voting on a review
 */
export interface VoteReviewInput {
  reviewId: string;
  voteType: VoteType;
}

/**
 * Input for tailor response
 */
export interface CreateResponseInput {
  reviewId: string;
  responseText: string;
}

/**
 * Input for moderating a review
 */
export interface ModerateReviewInput {
  reviewId: string;
  status: ModerationStatus;
  reason?: string;
}

/**
 * Query options for fetching reviews
 */
export interface ReviewQueryOptions {
  tailorId?: string;
  customerId?: string;
  orderId?: string;
  moderationStatus?: ModerationStatus;
  sortBy?: 'newest' | 'oldest' | 'highest_rated' | 'lowest_rated' | 'most_helpful';
  limit?: number;
  offset?: number;
}

/**
 * Paginated review results
 */
export interface ReviewsPage {
  reviews: Review[];
  total: number;
  hasMore: boolean;
  nextOffset?: number;
}

// ========================================
// Zod Validation Schemas
// ========================================

/**
 * Rating value schema (1-5 stars)
 */
const ratingSchema = z.number().int().min(1).max(5);

/**
 * Schema for creating a review
 */
export const createReviewSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  ratingFit: ratingSchema,
  ratingQuality: ratingSchema,
  ratingCommunication: ratingSchema,
  ratingTimeliness: ratingSchema,
  reviewText: z.string().min(10, 'Review must be at least 10 characters').max(2000, 'Review must be less than 2000 characters').optional(),
  consentToPhotos: z.boolean().optional(),
});

/**
 * Schema for updating a review
 */
export const updateReviewSchema = z.object({
  ratingFit: ratingSchema.optional(),
  ratingQuality: ratingSchema.optional(),
  ratingCommunication: ratingSchema.optional(),
  ratingTimeliness: ratingSchema.optional(),
  reviewText: z.string().min(10).max(2000).optional(),
});

/**
 * Schema for uploading review photo metadata
 */
export const uploadPhotoSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
  caption: z.string().max(200, 'Caption must be less than 200 characters').optional(),
  consentGiven: z.boolean().refine(val => val === true, {
    message: 'Photo consent must be given',
  }),
});

/**
 * Schema for voting on a review
 */
export const voteReviewSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
  voteType: z.nativeEnum(VoteType, {
    errorMap: () => ({ message: 'Vote type must be HELPFUL or UNHELPFUL' }),
  }),
});

/**
 * Schema for tailor response
 */
export const createResponseSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
  responseText: z.string().min(10, 'Response must be at least 10 characters').max(1000, 'Response must be less than 1000 characters'),
});

/**
 * Schema for moderating a review
 */
export const moderateReviewSchema = z.object({
  reviewId: z.string().uuid('Invalid review ID'),
  status: z.nativeEnum(ModerationStatus, {
    errorMap: () => ({ message: 'Invalid moderation status' }),
  }),
  reason: z.string().max(500, 'Reason must be less than 500 characters').optional(),
});

/**
 * Schema for review query options
 */
export const reviewQuerySchema = z.object({
  tailorId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  moderationStatus: z.nativeEnum(ModerationStatus).optional(),
  sortBy: z.enum(['newest', 'oldest', 'highest_rated', 'lowest_rated', 'most_helpful']).optional().default('newest'),
  limit: z.number().int().min(1).max(100).optional().default(10),
  offset: z.number().int().min(0).optional().default(0),
});

// ========================================
// Type Guards
// ========================================

/**
 * Check if a review is approved and visible
 */
export function isReviewVisible(review: Review): boolean {
  return review.moderationStatus === ModerationStatus.APPROVED && !review.isHidden;
}

/**
 * Check if a review can be edited by customer
 */
export function canEditReview(review: Review, hoursLimit: number = 48): boolean {
  const createdAt = new Date(review.createdAt);
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return hoursSinceCreation <= hoursLimit;
}

/**
 * Check if photos can be added to review
 */
export function canAddPhotos(review: Review, daysLimit: number = 7): boolean {
  const createdAt = new Date(review.createdAt);
  const now = new Date();
  const daysSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceCreation <= daysLimit && (review.photos?.length || 0) < 5;
}

/**
 * Calculate overall rating from category ratings
 */
export function calculateOverallRating(
  ratingFit?: number,
  ratingQuality?: number,
  ratingCommunication?: number,
  ratingTimeliness?: number
): number {
  const ratings = [ratingFit, ratingQuality, ratingCommunication, ratingTimeliness].filter(
    (r): r is number => r !== undefined && r !== null
  );
  
  if (ratings.length === 0) return 0;
  
  const sum = ratings.reduce((acc, r) => acc + r, 0);
  return Number((sum / ratings.length).toFixed(2));
}

