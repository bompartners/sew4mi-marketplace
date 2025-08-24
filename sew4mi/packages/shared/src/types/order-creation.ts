/**
 * Order creation types for the Sew4Mi platform
 * Used across frontend and backend for order creation workflow
 */

export interface CreateOrderInput {
  customerId: string;
  tailorId: string;
  measurementProfileId: string;
  garmentType: string;
  fabricChoice: FabricChoice;
  specialInstructions: string;
  totalAmount: number;
  estimatedDelivery: Date;
  urgencyLevel: UrgencyLevel;
}

export interface OrderPricingBreakdown {
  basePrice: number;
  fabricCost: number;
  urgencySurcharge: number;
  totalAmount: number;
  escrowBreakdown: {
    deposit: number; // 25%
    fitting: number; // 50%
    final: number;   // 25%
  };
}

export interface GarmentTypeOption {
  id: string;
  name: string;
  description: string;
  category: GarmentCategory;
  imageUrl: string;
  basePrice: number;
  estimatedDays: number;
  fabricRequirements?: FabricRequirements;
  measurementsRequired: string[];
  isActive: boolean;
}

export interface FabricRequirements {
  yardsNeeded: number;
  supportedTypes: FabricType[];
  preferredWidth: number; // in inches
}

export interface OrderMeasurementProfile {
  id: string;
  userId: string;
  nickname: string;
  gender: Gender;
  measurements: {
    chest?: number;
    waist?: number;
    hips?: number;
    shoulderWidth?: number;
    sleeveLength?: number;
    inseam?: number;
    outseam?: number;
    neckSize?: number;
    [key: string]: number | undefined;
  };
  voiceNoteUrl?: string;
  lastUpdated: Date;
  isActive: boolean;
}

export interface OrderCreationState {
  step: OrderCreationStep;
  customerId: string;
  tailorId?: string;
  garmentType?: GarmentTypeOption;
  fabricChoice?: FabricChoice;
  measurementProfile?: OrderMeasurementProfile;
  specialInstructions?: string;
  urgencyLevel?: UrgencyLevel;
  estimatedDelivery?: Date;
  pricingBreakdown?: OrderPricingBreakdown;
  isValid: boolean;
  errors: Record<string, string>;
}

// Enums
export enum GarmentCategory {
  FORMAL = 'FORMAL',
  CASUAL = 'CASUAL',
  TRADITIONAL = 'TRADITIONAL',
  SPECIAL_OCCASION = 'SPECIAL_OCCASION'
}

export enum FabricChoice {
  CUSTOMER_PROVIDED = 'CUSTOMER_PROVIDED',
  TAILOR_SOURCED = 'TAILOR_SOURCED'
}

export enum FabricType {
  COTTON = 'COTTON',
  SILK = 'SILK',
  WOOL = 'WOOL',
  KENTE = 'KENTE',
  BATIK = 'BATIK',
  LINEN = 'LINEN',
  POLYESTER = 'POLYESTER',
  BLEND = 'BLEND'
}

export enum UrgencyLevel {
  STANDARD = 'STANDARD',
  EXPRESS = 'EXPRESS'
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE'
}

export enum OrderCreationStep {
  GARMENT_TYPE = 'GARMENT_TYPE',
  SPECIFICATIONS = 'SPECIFICATIONS',
  MEASUREMENTS = 'MEASUREMENTS',
  TIMELINE = 'TIMELINE',
  SUMMARY = 'SUMMARY'
}

// API Request/Response types
export interface CalculatePricingRequest {
  garmentTypeId: string;
  fabricChoice: FabricChoice;
  urgencyLevel: UrgencyLevel;
  tailorId: string;
}

export interface CalculatePricingResponse extends OrderPricingBreakdown {
  estimatedDelivery?: Date;
  warnings?: string[];
}

export interface CreateOrderRequest extends CreateOrderInput {
  source?: string; // Track where the order came from (web, mobile, etc.)
  timestamp?: string;
}

export interface CreateOrderResponse {
  success: boolean;
  orderId?: string;
  orderNumber?: string;
  errors?: string[];
}

export interface ValidateMeasurementsRequest {
  garmentTypeId: string;
  measurementProfileId: string;
}

export interface ValidateMeasurementsResponse {
  isValid: boolean;
  missingMeasurements: string[];
  recommendations?: string[];
}

export interface TailorAvailabilityRequest {
  tailorId: string;
  estimatedDelivery: Date;
  urgencyLevel: UrgencyLevel;
}

export interface TailorAvailabilityResponse {
  isAvailable: boolean;
  alternativeDates?: Date[];
  reason?: string;
}

// Form validation types
export interface OrderCreationValidation {
  garmentType?: string;
  fabricChoice?: string;
  measurementProfile?: string;
  specialInstructions?: string;
  urgencyLevel?: string;
  estimatedDelivery?: string;
}