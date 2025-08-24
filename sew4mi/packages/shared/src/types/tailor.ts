export interface TailorProfile {
  id: string;
  userId: string;
  businessName: string;
  bio: string | null;
  profilePhoto: string | null;
  yearsOfExperience: number | null;
  specializations: string[];
  portfolioUrl: string | null;
  portfolioImages: string[];
  location: { lat: number; lng: number } | null;
  locationName: string | null;
  city: string | null;
  region: string | null;
  deliveryRadiusKm: number;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'SUSPENDED';
  verificationDate: string | null;
  verifiedBy: string | null;
  rating: number;
  totalReviews: number;
  totalOrders: number;
  completedOrders: number;
  completionRate: number;
  responseTimeHours: number | null;
  averageResponseHours: number | null;
  averageDeliveryDays: number;
  onTimeDeliveryRate: number;
  capacity: number;
  pricingTiers: Record<string, any>;
  workingHours: Record<string, any>;
  vacationMode: boolean;
  vacationMessage: string | null;
  acceptsRushOrders: boolean;
  rushOrderFeePercentage: number;
  instagramHandle: string | null;
  facebookPage: string | null;
  tiktokHandle: string | null;
  bankAccountDetails: Record<string, any> | null;
  mobileMoneyDetails: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

export interface TailorReview {
  id: string;
  tailorId: string;
  customerId: string;
  orderId: string;
  rating: number; // 1-5 stars
  reviewText: string | null;
  reviewPhotos: string[];
  responseTime: number | null; // Hours for response time tracking
  deliveryOnTime: boolean;
  qualityRating: number | null; // 1-5 for work quality
  communicationRating: number | null; // 1-5 for communication
  isVerified: boolean; // Only from completed orders
  createdAt: string;
  updatedAt: string;
  // Relations
  customer?: {
    id: string;
    fullName: string;
    avatarUrl: string | null;
  };
  order?: {
    id: string;
    orderNumber: string;
    garmentType: string;
  };
}

export interface TailorAvailability {
  id: string;
  tailorId: string;
  date: string;
  status: 'AVAILABLE' | 'BUSY' | 'BLOCKED';
  capacity: number; // Number of orders that day
  currentLoad: number; // Currently scheduled orders
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GarmentPricing {
  id: string;
  tailorId: string;
  garmentType: string; // 'Shirt', 'Dress', 'Suit', etc.
  basePrice: number; // Starting price in GHS
  maxPrice: number; // Maximum price in GHS
  priceFactors: string[]; // ['fabric', 'complexity', 'urgency']
  isActive: boolean;
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface TailorPortfolio {
  images: string[];
  categories: string[];
  featuredWork: {
    imageUrl: string;
    title: string;
    description: string;
    garmentType: string;
  }[];
}

export interface TailorStatistics {
  responseTime: {
    average: number;
    unit: 'hours' | 'days';
  };
  deliveryRate: {
    onTime: number;
    total: number;
    percentage: number;
  };
  orderCompletion: {
    completed: number;
    total: number;
    rate: number;
  };
  customerSatisfaction: {
    rating: number;
    totalReviews: number;
    breakdown: {
      quality: number;
      communication: number;
      timeliness: number;
      value: number;
    };
  };
}

export interface TailorProfileComplete extends TailorProfile {
  reviews: TailorReview[];
  availability: TailorAvailability[];
  pricing: GarmentPricing[];
  portfolio: TailorPortfolio;
  statistics: TailorStatistics;
  user: {
    id: string;
    fullName: string;
    phoneNumber: string | null;
    whatsappNumber: string | null;
  };
}


export interface CreateReviewDto {
  tailorId: string;
  orderId: string;
  rating: number;
  reviewText?: string;
  reviewPhotos?: string[];
  responseTime?: number;
  deliveryOnTime?: boolean;
  qualityRating?: number;
  communicationRating?: number;
}

export interface UpdateAvailabilityDto {
  date: string;
  status: 'AVAILABLE' | 'BUSY' | 'BLOCKED';
  capacity?: number;
  notes?: string;
}

export interface UpdatePricingDto {
  garmentType: string;
  basePrice: number;
  maxPrice: number;
  priceFactors?: string[];
  isActive?: boolean;
}

export interface WhatsAppContactDto {
  tailorId: string;
  customerId: string;
  message: string;
  orderContext?: {
    garmentType: string;
    estimatedBudget: number;
    deliveryDate: string;
  };
}