/**
 * Order creation and progress tracking types for the Sew4Mi platform
 * Used across frontend and backend for order creation workflow and progress tracking
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

// Order Progress Tracking Extensions
export interface OrderWithProgress {
  id: string;
  milestones: import('./milestone').OrderMilestone[];
  progressPercentage: number;
  nextMilestone?: import('./milestone').MilestoneStage;
  estimatedDaysRemaining?: number;
  chatMessages?: OrderMessage[];
  currentStatus: OrderStatus;
  estimatedCompletion?: Date;
}

export interface OrderMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderType: OrderParticipantRole;
  senderName: string;
  message: string;
  messageType: OrderMessageType;
  mediaUrl?: string;
  isInternal: boolean;
  readBy: string[];
  sentAt: Date;
  readAt?: Date;
  deliveredAt?: Date;
}

export interface OrderNotificationPreferences {
  userId: string;
  sms: boolean;
  email: boolean;
  whatsapp: boolean;
  orderStatusUpdates: boolean;
  milestoneUpdates: boolean;
  paymentReminders: boolean;
  deliveryNotifications: boolean;
  inAppNotifications: boolean;
  pushNotifications: boolean;
}

export interface OrderProgressCalculation {
  orderId: string;
  currentStatus: OrderStatus;
  progressPercentage: number;
  completedMilestones: number;
  totalMilestones: number;
  nextMilestone?: import('./milestone').MilestoneStage;
  estimatedCompletion?: Date;
  daysRemaining?: number;
}

// Progress tracking enums
export enum OrderStatus {
  CREATED = 'CREATED',
  DEPOSIT_PAID = 'DEPOSIT_PAID',
  IN_PRODUCTION = 'IN_PRODUCTION',
  FITTING_READY = 'FITTING_READY',
  ADJUSTMENTS_IN_PROGRESS = 'ADJUSTMENTS_IN_PROGRESS',
  READY_FOR_DELIVERY = 'READY_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED'
}

export enum OrderParticipantRole {
  CUSTOMER = 'CUSTOMER',
  TAILOR = 'TAILOR',
  ADMIN = 'ADMIN'
}

export enum OrderMessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  VOICE = 'VOICE',
  SYSTEM = 'SYSTEM'
}

// API types for order progress
export interface OrderTimelineRequest {
  orderId: string;
  includeMessages?: boolean;
  includePhotos?: boolean;
}

export interface OrderTimelineResponse {
  orderId: string;
  currentStatus: OrderStatus;
  progressPercentage: number;
  estimatedCompletion?: Date;
  milestones: import('./milestone').OrderMilestone[];
  nextMilestone?: {
    type: import('./milestone').MilestoneStage;
    estimatedDate?: Date;
    description: string;
  };
  daysRemaining?: number;
}

export interface SendOrderMessageRequest {
  orderId: string;
  message: string;
  messageType: OrderMessageType;
  mediaUrl?: string;
}

export interface SendOrderMessageResponse {
  messageId: string;
  sentAt: Date;
  deliveredAt?: Date;
}

export interface OrderHistoryRequest {
  customerId?: string;
  tailorId?: string;
  status?: OrderStatus[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'estimatedCompletion';
  sortOrder?: 'asc' | 'desc';
}

export interface OrderHistoryResponse {
  orders: OrderHistoryItem[];
  totalCount: number;
  hasMore: boolean;
}

export interface OrderHistoryItem {
  id: string;
  orderNumber: string;
  customerName: string;
  tailorName: string;
  garmentType: string;
  status: OrderStatus;
  progressPercentage: number;
  totalAmount: number;
  createdAt: Date;
  estimatedCompletion?: Date;
  thumbnailUrl?: string;
}

// Notification types
export interface OrderNotificationRequest {
  userId: string;
  preferences: OrderNotificationPreferences;
}

export interface RegisterPushDeviceRequest {
  userId: string;
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  enabled: boolean;
}