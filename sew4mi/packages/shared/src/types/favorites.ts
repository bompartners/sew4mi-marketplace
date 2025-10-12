/**
 * Types for Story 4.3: Reorder and Favorites - Favorites System
 */

/**
 * User's favorite order
 */
export interface FavoriteOrder {
  id: string;
  userId: string;
  orderId: string;
  nickname: string;
  sharedWithProfiles: string[];
  createdAt: Date;
}

/**
 * Order analytics for recommendations
 */
export interface OrderAnalytics {
  userId: string;
  garmentTypeFrequency: Record<string, number>;
  fabricPreferences: Record<string, number>;
  colorPreferences: Record<string, number>;
  avgOrderValue: number;
  preferredTailors: string[];
  seasonalPatterns: Record<string, string[]>;
  lastUpdated: Date;
}

/**
 * Recommendation types
 */
export enum RecommendationType {
  GARMENT = 'garment',
  TAILOR = 'tailor',
  FABRIC = 'fabric',
}

/**
 * Recommendation item
 */
export interface Recommendation {
  id: string;
  type: RecommendationType;
  itemId: string;
  score: number;
  reason: string;
  metadata?: Record<string, any>;
}

/**
 * User engagement action on recommendation
 */
export enum RecommendationAction {
  CLICKED = 'clicked',
  ORDERED = 'ordered',
  DISMISSED = 'dismissed',
}

/**
 * Recommendation feedback tracking
 */
export interface RecommendationFeedback {
  recommendationId: string;
  userId: string;
  action: RecommendationAction;
  timestamp: Date;
}

/**
 * Request to add order to favorites
 */
export interface AddToFavoritesRequest {
  orderId: string;
  nickname: string;
}

/**
 * Request to share favorite with family
 */
export interface ShareFavoriteRequest {
  favoriteId: string;
  profileIds: string[];
}

/**
 * Response for favorites list
 */
export interface FavoritesListResponse {
  favorites: FavoriteOrder[];
  orders: Record<string, any>; // Order objects keyed by ID
}

/**
 * Recommendation request parameters
 */
export interface RecommendationRequest {
  type?: RecommendationType;
  limit?: number;
}

/**
 * Recommendation response
 */
export interface RecommendationResponse {
  recommendations: Recommendation[];
  analytics: OrderAnalytics | null;
}
