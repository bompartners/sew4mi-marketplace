import { z } from 'zod';

export const TailorProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  businessName: z.string().min(2).max(100),
  bio: z.string().max(500).nullable(),
  profilePhoto: z.string().url().nullable(),
  yearsOfExperience: z.number().min(0).max(50).nullable(),
  specializations: z.array(z.string()).default([]),
  portfolioUrl: z.string().url().nullable(),
  portfolioImages: z.array(z.string().url()).default([]),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }).nullable(),
  locationName: z.string().nullable(),
  city: z.string().nullable(),
  region: z.string().nullable(),
  deliveryRadiusKm: z.number().min(0).max(100).default(10),
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'SUSPENDED']),
  verificationDate: z.string().datetime().nullable(),
  verifiedBy: z.string().uuid().nullable(),
  rating: z.number().min(0).max(5).default(0),
  totalReviews: z.number().min(0).default(0),
  totalOrders: z.number().min(0).default(0),
  completedOrders: z.number().min(0).default(0),
  completionRate: z.number().min(0).max(100).default(0),
  responseTimeHours: z.number().min(0).nullable(),
  averageResponseHours: z.number().min(0).nullable(),
  averageDeliveryDays: z.number().min(1).max(90).default(7),
  onTimeDeliveryRate: z.number().min(0).max(100).default(100),
  capacity: z.number().min(1).max(100).default(10),
  pricingTiers: z.record(z.any()).default({}),
  workingHours: z.record(z.any()).default({}),
  vacationMode: z.boolean().default(false),
  vacationMessage: z.string().max(200).nullable(),
  acceptsRushOrders: z.boolean().default(false),
  rushOrderFeePercentage: z.number().min(0).max(100).default(0),
  instagramHandle: z.string().max(50).nullable(),
  facebookPage: z.string().max(100).nullable(),
  tiktokHandle: z.string().max(50).nullable(),
  bankAccountDetails: z.record(z.any()).nullable(),
  mobileMoneyDetails: z.record(z.any()).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TailorReviewSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  customerId: z.string().uuid(),
  orderId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  reviewText: z.string().max(1000).nullable(),
  reviewPhotos: z.array(z.string().url()).default([]),
  responseTime: z.number().min(0).nullable(),
  deliveryOnTime: z.boolean().default(true),
  qualityRating: z.number().min(1).max(5).nullable(),
  communicationRating: z.number().min(1).max(5).nullable(),
  isVerified: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TailorAvailabilitySchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['AVAILABLE', 'BUSY', 'BLOCKED']),
  capacity: z.number().min(0).max(50).default(5),
  currentLoad: z.number().min(0).default(0),
  notes: z.string().max(200).nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const GarmentPricingSchema = z.object({
  id: z.string().uuid(),
  tailorId: z.string().uuid(),
  garmentType: z.string().min(2).max(100),
  basePrice: z.number().min(0).max(10000),
  maxPrice: z.number().min(0).max(10000),
  priceFactors: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
  lastUpdated: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateReviewSchema = z.object({
  tailorId: z.string().uuid(),
  orderId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  reviewText: z.string().max(1000).optional(),
  reviewPhotos: z.array(z.string().url()).optional(),
  responseTime: z.number().min(0).optional(),
  deliveryOnTime: z.boolean().optional(),
  qualityRating: z.number().min(1).max(5).optional(),
  communicationRating: z.number().min(1).max(5).optional(),
});

export const UpdateAvailabilitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(['AVAILABLE', 'BUSY', 'BLOCKED']),
  capacity: z.number().min(0).max(50).optional(),
  notes: z.string().max(200).optional(),
});

export const UpdatePricingSchema = z.object({
  garmentType: z.string().min(2).max(100),
  basePrice: z.number().min(0).max(10000),
  maxPrice: z.number().min(0).max(10000),
  priceFactors: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const WhatsAppContactSchema = z.object({
  tailorId: z.string().uuid(),
  customerId: z.string().uuid(),
  message: z.string().min(1).max(500),
  orderContext: z.object({
    garmentType: z.string(),
    estimatedBudget: z.number().min(0),
    deliveryDate: z.string(),
  }).optional(),
});

export const TailorSearchFiltersSchema = z.object({
  city: z.string().optional(),
  region: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  minRating: z.number().min(0).max(5).optional(),
  priceRange: z.object({
    min: z.number().min(0),
    max: z.number().min(0),
  }).optional(),
  availability: z.object({
    startDate: z.string(),
    endDate: z.string(),
  }).optional(),
  verified: z.boolean().optional(),
  acceptsRushOrders: z.boolean().optional(),
  sortBy: z.enum(['rating', 'price', 'distance', 'popularity']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const PortfolioUploadSchema = z.object({
  images: z.array(z.string().url()).min(1).max(20),
  category: z.string().optional(),
  description: z.string().max(200).optional(),
});

export const ProfileUpdateSchema = z.object({
  businessName: z.string().min(2).max(100).optional(),
  bio: z.string().max(500).optional(),
  profilePhoto: z.string().url().optional(),
  yearsOfExperience: z.number().min(0).max(50).optional(),
  specializations: z.array(z.string()).optional(),
  city: z.string().optional(),
  region: z.string().optional(),
  deliveryRadiusKm: z.number().min(0).max(100).optional(),
  workingHours: z.record(z.any()).optional(),
  vacationMode: z.boolean().optional(),
  vacationMessage: z.string().max(200).optional(),
  acceptsRushOrders: z.boolean().optional(),
  rushOrderFeePercentage: z.number().min(0).max(100).optional(),
  instagramHandle: z.string().max(50).optional(),
  facebookPage: z.string().max(100).optional(),
  tiktokHandle: z.string().max(50).optional(),
});

// Type exports moved to types/tailor.ts to avoid conflicts