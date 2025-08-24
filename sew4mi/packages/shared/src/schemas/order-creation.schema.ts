/**
 * Zod validation schemas for order creation
 * Used for both client-side and server-side validation
 */

import { z } from 'zod';
import { 
  FabricChoice, 
  UrgencyLevel, 
  GarmentCategory,
  Gender 
} from '../types/order-creation';

export const CreateOrderInputSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  tailorId: z.string().uuid('Invalid tailor ID'),
  measurementProfileId: z.string().uuid('Invalid measurement profile ID'),
  garmentType: z.string().min(1, 'Garment type is required'),
  fabricChoice: z.nativeEnum(FabricChoice, {
    errorMap: () => ({ message: 'Invalid fabric choice' })
  }),
  specialInstructions: z.string()
    .max(500, 'Special instructions must be 500 characters or less')
    .optional()
    .default(''),
  totalAmount: z.number()
    .min(30, 'Minimum order amount is GHS 30')
    .max(5000, 'Maximum order amount is GHS 5000'),
  estimatedDelivery: z.date()
    .refine((date) => date > new Date(), 'Delivery date must be in the future'),
  urgencyLevel: z.nativeEnum(UrgencyLevel, {
    errorMap: () => ({ message: 'Invalid urgency level' })
  })
});

export const CalculatePricingRequestSchema = z.object({
  garmentTypeId: z.string().min(1, 'Garment type ID is required'),
  fabricChoice: z.nativeEnum(FabricChoice),
  urgencyLevel: z.nativeEnum(UrgencyLevel),
  tailorId: z.string().uuid('Invalid tailor ID')
});

export const ValidateMeasurementsRequestSchema = z.object({
  garmentTypeId: z.string().min(1, 'Garment type ID is required'),
  measurementProfileId: z.string().uuid('Invalid measurement profile ID')
});

export const TailorAvailabilityRequestSchema = z.object({
  tailorId: z.string().uuid('Invalid tailor ID'),
  estimatedDelivery: z.date(),
  urgencyLevel: z.nativeEnum(UrgencyLevel)
});

export const GarmentTypeSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Name is required'),
  description: z.string().min(1, 'Description is required'),
  category: z.nativeEnum(GarmentCategory),
  imageUrl: z.string().url('Invalid image URL'),
  basePrice: z.number().min(0, 'Base price must be positive'),
  estimatedDays: z.number().min(1, 'Estimated days must be at least 1'),
  fabricRequirements: z.object({
    yardsNeeded: z.number().min(0),
    supportedTypes: z.array(z.string()),
    preferredWidth: z.number().min(0)
  }).optional(),
  measurementsRequired: z.array(z.string()),
  isActive: z.boolean()
});

export const OrderMeasurementProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  nickname: z.string().min(1, 'Nickname is required'),
  gender: z.nativeEnum(Gender),
  measurements: z.object({
    chest: z.number().min(20).max(200).optional(),
    waist: z.number().min(20).max(200).optional(),
    hips: z.number().min(20).max(200).optional(),
    shoulderWidth: z.number().min(20).max(100).optional(),
    sleeveLength: z.number().min(10).max(100).optional(),
    inseam: z.number().min(20).max(120).optional(),
    outseam: z.number().min(20).max(150).optional(),
    neckSize: z.number().min(20).max(60).optional()
  }),
  voiceNoteUrl: z.string().url().optional(),
  lastUpdated: z.date(),
  isActive: z.boolean()
});

export const OrderCreationStateSchema = z.object({
  step: z.string(),
  customerId: z.string().uuid(),
  tailorId: z.string().uuid().optional(),
  garmentType: GarmentTypeSchema.optional(),
  fabricChoice: z.nativeEnum(FabricChoice).optional(),
  measurementProfile: OrderMeasurementProfileSchema.optional(),
  specialInstructions: z.string().max(500).optional(),
  urgencyLevel: z.nativeEnum(UrgencyLevel).optional(),
  estimatedDelivery: z.date().optional(),
  pricingBreakdown: z.object({
    basePrice: z.number(),
    fabricCost: z.number(),
    urgencySurcharge: z.number(),
    totalAmount: z.number(),
    escrowBreakdown: z.object({
      deposit: z.number(),
      fitting: z.number(),
      final: z.number()
    })
  }).optional(),
  isValid: z.boolean(),
  errors: z.record(z.string())
});

// Form validation schemas for each step
export const GarmentTypeStepSchema = z.object({
  garmentType: z.string().min(1, 'Please select a garment type')
});

export const FabricSelectionStepSchema = z.object({
  fabricChoice: z.nativeEnum(FabricChoice, {
    errorMap: () => ({ message: 'Please select fabric option' })
  })
});

export const MeasurementSelectionStepSchema = z.object({
  measurementProfileId: z.string().uuid('Please select a measurement profile')
});

export const TimelineSelectionStepSchema = z.object({
  urgencyLevel: z.nativeEnum(UrgencyLevel),
  estimatedDelivery: z.date()
    .refine((date) => date > new Date(), 'Delivery date must be in the future')
    .refine((date) => {
      const maxDate = new Date();
      maxDate.setMonth(maxDate.getMonth() + 6);
      return date <= maxDate;
    }, 'Delivery date must be within 6 months')
});

export const SpecialInstructionsStepSchema = z.object({
  specialInstructions: z.string()
    .max(500, 'Special instructions must be 500 characters or less')
    .optional()
    .default('')
});

// Export all schemas as a collection for easy importing
export const OrderCreationSchemas = {
  CreateOrderInput: CreateOrderInputSchema,
  CalculatePricingRequest: CalculatePricingRequestSchema,
  ValidateMeasurementsRequest: ValidateMeasurementsRequestSchema,
  TailorAvailabilityRequest: TailorAvailabilityRequestSchema,
  GarmentType: GarmentTypeSchema,
  OrderMeasurementProfile: OrderMeasurementProfileSchema,
  OrderCreationState: OrderCreationStateSchema,
  GarmentTypeStep: GarmentTypeStepSchema,
  FabricSelectionStep: FabricSelectionStepSchema,
  MeasurementSelectionStep: MeasurementSelectionStepSchema,
  TimelineSelectionStep: TimelineSelectionStepSchema,
  SpecialInstructionsStep: SpecialInstructionsStepSchema
};