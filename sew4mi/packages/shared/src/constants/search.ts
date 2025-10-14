// Search configuration constants
export const SEARCH_CONFIG = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 50,
  MIN_QUERY_LENGTH: 2,
  MAX_QUERY_LENGTH: 100,
  SEARCH_DEBOUNCE_MS: 300,
  AUTOCOMPLETE_DEBOUNCE_MS: 150,
  DEFAULT_RADIUS_KM: 50,
  MAX_RADIUS_KM: 1000,
} as const;

// Cache configuration
export const CACHE_CONFIG = {
  SEARCH_RESULTS_TTL_SECONDS: 300, // 5 minutes
  AUTOCOMPLETE_TTL_SECONDS: 3600, // 1 hour
  FEATURED_TAILORS_TTL_SECONDS: 1800, // 30 minutes
  POPULAR_SEARCHES_TTL_SECONDS: 7200, // 2 hours
} as const;

// Featured tailor selection criteria
export const FEATURED_TAILOR_CRITERIA = {
  MIN_RATING: 4.5,
  MIN_REVIEWS: 10,
  MAX_RESPONSE_HOURS: 2,
  MIN_COMPLETION_RATE: 0.95,
  MAX_DAYS_SINCE_LAST_ORDER: 30,
  DEFAULT_LIMIT: 6,
} as const;

// Search analytics
export const ANALYTICS_CONFIG = {
  TRACK_SEARCH_QUERIES: true,
  TRACK_CLICK_THROUGH: true,
  TRACK_CONVERSIONS: true,
  BATCH_SIZE: 100,
  FLUSH_INTERVAL_MS: 30000, // 30 seconds
} as const;

// Common specializations for Ghana
export const GHANA_SPECIALIZATIONS = [
  'Kente Weaving',
  'Traditional Wear',
  'Formal Suits',
  'Wedding Dresses',
  'Casual Wear',
  'School Uniforms',
  'Corporate Wear',
  'Evening Gowns',
  'Ankara Designs',
  'Dashiki',
  'Agbada',
  'Kaftan',
  'Children\'s Wear',
  'Alterations',
  'Embroidery',
  'Beadwork',
  'Leather Work',
  'Hat Making',
  'Bag Making',
  'Shoe Repair',
] as const;

// Major Ghana cities for location filtering
export const GHANA_MAJOR_CITIES = [
  'Accra',
  'Kumasi',
  'Tamale',
  'Takoradi',
  'Cape Coast',
  'Sunyani',
  'Ho',
  'Koforidua',
  'Wa',
  'Bolgatanga',
  'Tema',
  'Techiman',
  'Obuasi',
  'Kasoa',
  'Madina',
] as const;

// Import GHANA_REGIONS from tailors constants to avoid duplication

// Search sort options with display labels
export const SORT_OPTIONS = [
  { value: 'rating', label: 'Highest Rated', order: 'desc' },
  { value: 'price', label: 'Lowest Price', order: 'asc' },
  { value: 'responseTime', label: 'Fastest Response', order: 'asc' },
  { value: 'distance', label: 'Nearest', order: 'asc' },
] as const;

// Price range options (in GHS)
export const PRICE_RANGES = [
  { label: 'Under ₵50', min: 0, max: 50 },
  { label: '₵50 - ₵100', min: 50, max: 100 },
  { label: '₵100 - ₵200', min: 100, max: 200 },
  { label: '₵200 - ₵500', min: 200, max: 500 },
  { label: 'Over ₵500', min: 500, max: 10000 },
] as const;

// Search result display modes
export const DISPLAY_MODES = {
  GRID: 'grid',
  LIST: 'list',
  MAP: 'map',
} as const;

// Error codes for search operations
export const SEARCH_ERROR_CODES = {
  INVALID_QUERY: 'SEARCH_INVALID_QUERY',
  LOCATION_REQUIRED: 'SEARCH_LOCATION_REQUIRED',
  RATE_LIMITED: 'SEARCH_RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SEARCH_SERVICE_UNAVAILABLE',
  INVALID_CURSOR: 'SEARCH_INVALID_CURSOR',
} as const;

// Rate limiting for search operations
export const SEARCH_RATE_LIMITS = {
  SEARCH_PER_MINUTE: 100,
  AUTOCOMPLETE_PER_MINUTE: 200,
  FAVORITES_PER_MINUTE: 50,
} as const;

// Story 4.4: Advanced search filter constants

// Ghana-specific occasions
export const GHANA_OCCASIONS = [
  'Wedding',
  'Engagement',
  'Funeral',
  'Naming Ceremony',
  'Church Service',
  'Corporate Event',
  'Festival',
  'Birthday Party',
  'Graduation',
  'Casual Wear',
] as const;

// Style categories with icons
export const STYLE_CATEGORIES = [
  { value: 'traditional', label: 'Traditional', icon: '🏛️', description: 'Classic Ghanaian styles' },
  { value: 'contemporary', label: 'Contemporary', icon: '✨', description: 'Modern fashion designs' },
  { value: 'fusion', label: 'Fusion', icon: '🔄', description: 'Blend of traditional and modern' },
] as const;

// Ghana fabric types
export const GHANA_FABRICS = [
  'Kente',
  'Ankara',
  'Batik',
  'Cotton',
  'Silk',
  'Linen',
  'Lace',
  'Velvet',
  'African Print',
  'Woodin',
  'Vlisco',
  'Dashiki',
  'Adinkra',
] as const;

// Ghana languages
export const GHANA_LANGUAGES = [
  { code: 'EN', label: 'English' },
  { code: 'TWI', label: 'Twi' },
  { code: 'GA', label: 'Ga' },
  { code: 'EWE', label: 'Ewe' },
  { code: 'HAUSA', label: 'Hausa' },
  { code: 'FANTE', label: 'Fante' },
  { code: 'DAGBANI', label: 'Dagbani' },
  { code: 'NZEMA', label: 'Nzema' },
] as const;

// Size ranges with descriptions
export const SIZE_RANGES = [
  { value: 'petite', label: 'Petite', description: 'XS-M sizes' },
  { value: 'regular', label: 'Regular', description: 'S-XL sizes' },
  { value: 'plus-size', label: 'Plus Size', description: '2XL+ sizes' },
  { value: 'children', label: 'Children', description: 'Ages 0-16' },
  { value: 'tall', label: 'Tall', description: 'Extended lengths' },
] as const;

// Delivery timeframe presets (in days)
export const DELIVERY_TIMEFRAMES = [
  { label: 'Rush (1-3 days)', min: 1, max: 3 },
  { label: 'Fast (4-7 days)', min: 4, max: 7 },
  { label: 'Standard (1-2 weeks)', min: 8, max: 14 },
  { label: 'Flexible (2-4 weeks)', min: 15, max: 28 },
  { label: 'Extended (1+ month)', min: 29, max: 90 },
] as const;

// Saved search configuration
export const SAVED_SEARCH_CONFIG = {
  MAX_SAVED_SEARCHES_PER_USER: 10,
  MIN_NAME_LENGTH: 3,
  MAX_NAME_LENGTH: 100,
  ALERT_CHECK_INTERVAL_MINUTES: 15, // For instant alerts
} as const;

// Alert frequency options
export const ALERT_FREQUENCIES = [
  { value: 'instant', label: 'Instant', description: 'Notify immediately when new matches are found' },
  { value: 'daily', label: 'Daily', description: 'Daily digest at 8:00 AM' },
  { value: 'weekly', label: 'Weekly', description: 'Weekly summary on Mondays' },
] as const;