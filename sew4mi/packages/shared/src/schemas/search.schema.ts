import { z } from 'zod';

export const TailorSearchFiltersSchema = z.object({
  query: z.string().optional().transform(val => val?.trim()),
  city: z.string().optional(),
  region: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  maxPrice: z.number().min(0).optional(),
  minPrice: z.number().min(0).optional(),
  sortBy: z.enum(['rating', 'price', 'responseTime', 'distance']).optional().default('rating'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  cursor: z.string().optional(),
  limit: z.number().min(1).max(50).optional().default(20),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    radius: z.number().min(0).max(1000).optional().default(50), // 50km default radius
  }).optional(),
  verified: z.boolean().optional(),
  acceptsRushOrders: z.boolean().optional(),
  // Story 4.4: Advanced search filters
  occasions: z.array(z.string()).optional(),
  deliveryTimeframeMin: z.number().min(0).max(365).optional(),
  deliveryTimeframeMax: z.number().min(0).max(365).optional(),
  styleCategories: z.array(z.string()).optional(),
  fabricPreferences: z.array(z.string()).optional(),
  colorPreferences: z.array(z.string()).optional(),
  sizeRanges: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
}).refine(data => {
  // Ensure minPrice <= maxPrice if both are provided
  if (data.minPrice !== undefined && data.maxPrice !== undefined) {
    return data.minPrice <= data.maxPrice;
  }
  return true;
}, {
  message: "minPrice must be less than or equal to maxPrice",
}).refine(data => {
  // Ensure deliveryTimeframeMin <= deliveryTimeframeMax if both are provided
  if (data.deliveryTimeframeMin !== undefined && data.deliveryTimeframeMax !== undefined) {
    return data.deliveryTimeframeMin <= data.deliveryTimeframeMax;
  }
  return true;
}, {
  message: "deliveryTimeframeMin must be less than or equal to deliveryTimeframeMax",
});

export const AutocompleteQuerySchema = z.object({
  query: z.string().min(1).max(100),
  limit: z.number().min(1).max(20).optional().default(10),
  types: z.array(z.enum(['tailor', 'specialization', 'location'])).optional(),
});

export const AddFavoriteSchema = z.object({
  tailorId: z.string().uuid(),
});

export const RemoveFavoriteSchema = z.object({
  tailorId: z.string().uuid(),
});

export const FeaturedTailorFiltersSchema = z.object({
  limit: z.number().min(1).max(20).optional().default(6),
  city: z.string().optional(),
  region: z.string().optional(),
  specializations: z.array(z.string()).optional(),
});

export const SearchAnalyticsSchema = z.object({
  query: z.string(),
  filters: TailorSearchFiltersSchema,
  resultsCount: z.number().min(0),
  searchTime: z.number().min(0),
  sessionId: z.string(),
  clickedResults: z.array(z.string().uuid()).optional(),
  convertedResults: z.array(z.string().uuid()).optional(),
});

// Story 4.4: Saved search schemas
export const SavedSearchInputSchema = z.object({
  name: z.string().min(3).max(100),
  filters: TailorSearchFiltersSchema,
  alertEnabled: z.boolean().optional().default(false),
  alertFrequency: z.enum(['daily', 'weekly', 'instant']).optional().default('weekly'),
});

export const SavedSearchUpdateSchema = z.object({
  name: z.string().min(3).max(100).optional(),
  filters: TailorSearchFiltersSchema.optional(),
  alertEnabled: z.boolean().optional(),
  alertFrequency: z.enum(['daily', 'weekly', 'instant']).optional(),
}).refine(data => {
  // At least one field must be provided for update
  return Object.keys(data).length > 0;
}, {
  message: "At least one field must be provided for update",
});

export const SavedSearchSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  name: z.string(),
  filters: TailorSearchFiltersSchema,
  alertEnabled: z.boolean(),
  alertFrequency: z.enum(['daily', 'weekly', 'instant']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastNotifiedAt: z.string().datetime().nullable(),
});

// Export types inferred from schemas
export type TailorSearchFiltersInput = z.input<typeof TailorSearchFiltersSchema>;
export type TailorSearchFilters = z.output<typeof TailorSearchFiltersSchema>;
export type AutocompleteQuery = z.infer<typeof AutocompleteQuerySchema>;
export type AddFavoriteInput = z.infer<typeof AddFavoriteSchema>;
export type RemoveFavoriteInput = z.infer<typeof RemoveFavoriteSchema>;
export type FeaturedTailorFilters = z.infer<typeof FeaturedTailorFiltersSchema>;
export type SearchAnalyticsInput = z.infer<typeof SearchAnalyticsSchema>;
export type SavedSearchInput = z.infer<typeof SavedSearchInputSchema>;
export type SavedSearchUpdate = z.infer<typeof SavedSearchUpdateSchema>;
export type SavedSearch = z.infer<typeof SavedSearchSchema>;