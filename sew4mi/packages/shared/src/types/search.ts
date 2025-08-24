export interface TailorSearchFilters {
  query?: string; // Full-text search
  city?: string;
  region?: string;
  specializations?: string[];
  minRating?: number;
  maxPrice?: number;
  minPrice?: number;
  sortBy?: 'rating' | 'price' | 'responseTime' | 'distance';
  sortOrder?: 'asc' | 'desc';
  cursor?: string; // For pagination
  limit?: number;
  location?: {
    lat: number;
    lng: number;
    radius?: number; // in km
  };
  verified?: boolean;
  acceptsRushOrders?: boolean;
}

export interface TailorSearchResult {
  tailors: TailorSearchItem[];
  hasMore: boolean;
  nextCursor?: string;
  total: number;
  searchMeta?: {
    query?: string;
    appliedFilters: string[];
    searchTime: number; // milliseconds
  };
}

export interface TailorSearchItem {
  id: string;
  userId: string;
  businessName: string;
  bio: string | null;
  profilePhoto: string | null;
  yearsOfExperience: number | null;
  specializations: string[];
  portfolioImages: string[];
  location: { lat: number; lng: number } | null;
  locationName: string | null;
  city: string | null;
  region: string | null;
  deliveryRadiusKm: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'SUSPENDED';
  rating: number;
  totalReviews: number;
  completedOrders: number;
  completionRate: number;
  averageResponseHours: number | null;
  averageDeliveryDays: number;
  onTimeDeliveryRate: number;
  capacity: number;
  vacationMode: boolean;
  acceptsRushOrders: boolean;
  rushOrderFeePercentage: number;
  // Search-specific fields
  distance?: number; // in km, if location provided
  searchScore?: number; // relevance score
  minPrice?: number; // calculated from pricing tiers
  maxPrice?: number; // calculated from pricing tiers
  isFavorite?: boolean; // for authenticated users
  isOnline?: boolean; // last activity within 24 hours
}

export interface AutocompleteResult {
  suggestions: AutocompleteSuggestion[];
  categories: {
    tailors: AutocompleteSuggestion[];
    specializations: AutocompleteSuggestion[];
    locations: AutocompleteSuggestion[];
  };
}

export interface AutocompleteSuggestion {
  id: string;
  text: string;
  type: 'tailor' | 'specialization' | 'location';
  meta?: {
    city?: string;
    rating?: number;
    imageUrl?: string;
  };
}

export interface CustomerFavorite {
  id: string;
  customerId: string;
  tailorId: string;
  createdAt: string;
}

export interface FeaturedTailorCriteria {
  minRating: number;
  minReviews: number;
  maxResponseHours: number;
  minCompletionRate: number;
  maxDaysSinceLastOrder: number;
}

export interface FeaturedTailor extends TailorSearchItem {
  featuredReason: 'HIGH_RATING' | 'FAST_RESPONSE' | 'NEW_TALENT' | 'POPULAR' | 'ADMIN_PICK';
  featuredUntil?: string;
  promotionalBadge?: string;
}

export interface SearchAnalytics {
  query: string;
  filters: TailorSearchFilters;
  resultsCount: number;
  searchTime: number;
  userId?: string;
  sessionId: string;
  timestamp: string;
  clickedResults?: string[]; // tailor IDs that were clicked
  convertedResults?: string[]; // tailor IDs that led to orders
}

export interface TailorSearchStats {
  totalSearches: number;
  popularQueries: { query: string; count: number }[];
  averageSearchTime: number;
  clickThroughRate: number;
  conversionRate: number;
  popularFilters: Record<string, number>;
}