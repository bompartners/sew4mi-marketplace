import { z } from 'zod';
import { userRoleSchema } from './role.schema';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: userRoleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const OrderSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  tailorId: z.string().uuid(),
  status: z.enum(['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'disputed']),
  totalAmount: z.number().positive(),
  escrowAmount: z.number().positive(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type UserInput = z.infer<typeof UserSchema>;
export type OrderInput = z.infer<typeof OrderSchema>;

// Re-export auth schemas to make them available through the main schemas export
export {
  phoneSchema,
  emailSchema,
  passwordSchema,
  registrationSchema,
  loginSchema,
  otpSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  profileUpdateSchema,
  tailorProfileSchema,
  type RegistrationInput,
  type LoginInput,
  type OTPInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type ProfileUpdateInput,
  type TailorProfileInput,
} from './auth.schema';

// Re-export role schemas
export {
  userRoleSchema,
  registerableRoleSchema,
  roleChangeRequestSchema,
  roleAssignmentSchema,
  roleVerificationSchema,
  adminRoleActionSchema,
  adminRoleChangeSchema,
  bulkRoleOperationSchema,
  tailorApplicationSchema,
  permissionSchema,
  type RoleChangeRequest,
  type RoleAssignment,
  type RoleVerification,
  type AdminRoleAction,
  type AdminRoleChange,
  type BulkRoleOperation,
  type TailorApplication,
  validateUserRole,
  validateRegistrableRole,
  validatePermission,
  roleValidationHelpers
} from './role.schema';

// Re-export payment schemas
export {
  paymentTransactionSchema,
  paymentInitiationRequestSchema,
  hubtelPaymentRequestSchema,
  hubtelWebhookPayloadSchema,
  ghanaPhoneValidationSchema,
  type PaymentTransactionInput,
  type PaymentInitiationRequestSchema,
  type HubtelPaymentRequestSchema,
  type HubtelWebhookPayloadSchema,
} from './payment.schema';

// Re-export escrow schemas
export {
  EscrowStageSchema,
  EscrowTransactionTypeSchema,
  EscrowBreakdownSchema,
  EscrowStatusSchema,
  EscrowMilestoneApprovalSchema,
  EscrowInitiatePaymentSchema,
  EscrowMilestoneApproveSchema,
  EscrowReconciliationSchema,
  EscrowTransactionSchema,
  EscrowCalculationResponseSchema,
  EscrowStatusResponseSchema,
  EscrowInitiateResponseSchema,
  EscrowApprovalResponseSchema,
  type EscrowStageFromSchema,
  type EscrowTransactionTypeFromSchema,
  type EscrowBreakdownFromSchema,
  type EscrowStatusFromSchema,
  type EscrowMilestoneApprovalFromSchema,
  type EscrowInitiatePaymentFromSchema,
  type EscrowMilestoneApproveFromSchema,
  type EscrowReconciliationFromSchema,
  type EscrowTransactionFromSchema,
} from './escrow.schema';

// Re-export milestone schemas
export {
  milestoneStageSchema,
  milestoneApprovalStatusSchema,
  milestoneApprovalActionSchema,
  orderMilestoneSchema,
  milestoneApprovalSchema,
  milestonePhotoUploadRequestSchema,
  milestonePhotoUploadResponseSchema,
  milestoneApprovalRequestSchema,
  milestoneApprovalResponseSchema,
  milestoneProgressSchema,
  milestoneDisputeRequestSchema,
  autoApprovalResultSchema,
  milestoneValidationHelpers,
  type MilestoneStageFromSchema,
  type MilestoneApprovalStatusFromSchema,
  type MilestoneApprovalActionFromSchema,
  type OrderMilestoneFromSchema,
  type MilestoneApprovalFromSchema,
  type MilestonePhotoUploadRequestFromSchema,
  type MilestonePhotoUploadResponseFromSchema,
  type MilestoneApprovalRequestFromSchema,
  type MilestoneApprovalResponseFromSchema,
  type MilestoneProgressFromSchema,
  type MilestoneDisputeRequestFromSchema,
  type AutoApprovalResultFromSchema,
} from './milestone.schema';

// Re-export dispute schemas
export {
  disputeCategorySchema,
  disputeStatusSchema,
  disputePrioritySchema,
  disputeResolutionTypeSchema,
  disputeParticipantRoleSchema,
  disputeSchema,
  disputeEvidenceSchema,
  disputeMessageSchema,
  disputeResolutionSchema,
  createDisputeRequestSchema,
  createDisputeSchema,
  uploadEvidenceRequestSchema,
  sendMessageRequestSchema,
  assignDisputeRequestSchema,
  resolveDisputeRequestSchema,
  markMessagesReadRequestSchema,
  disputeFiltersSchema,
  disputeSortOptionsSchema,
  disputePaginationOptionsSchema,
  adminDashboardQuerySchema,
  disputeAnalyticsQuerySchema,
  validateFileUpload,
  validateDisputeTitle,
  validateDisputeDescription,
  validateMessage
} from './dispute.schema';

// Re-export tailor schemas
export {
  TailorProfileSchema,
  TailorReviewSchema,
  TailorAvailabilitySchema,
  GarmentPricingSchema,
  CreateReviewSchema,
  UpdateAvailabilitySchema,
  UpdatePricingSchema,
  WhatsAppContactSchema,
  PortfolioUploadSchema,
  ProfileUpdateSchema,
} from './tailor.schema';

// Re-export search schemas
export {
  AutocompleteQuerySchema,
  AddFavoriteSchema,
  RemoveFavoriteSchema,
  FeaturedTailorFiltersSchema,
  SearchAnalyticsSchema,
  type TailorSearchFiltersInput,
  type TailorSearchFilters,
  type AutocompleteQuery,
  type AddFavoriteInput,
  type RemoveFavoriteInput,
  type FeaturedTailorFilters,
  type SearchAnalyticsInput,
} from './search.schema';

// Import and re-export TailorSearchFiltersSchema from search schema (avoiding duplicate)
export { TailorSearchFiltersSchema } from './search.schema';

// Re-export order creation schemas
export {
  CreateOrderInputSchema,
  CalculatePricingRequestSchema,
  ValidateMeasurementsRequestSchema,
  TailorAvailabilityRequestSchema,
  GarmentTypeSchema,
  OrderMeasurementProfileSchema,
  OrderCreationStateSchema,
  GarmentTypeStepSchema,
  FabricSelectionStepSchema,
  MeasurementSelectionStepSchema,
  TimelineSelectionStepSchema,
  SpecialInstructionsStepSchema,
  OrderCreationSchemas
} from './order-creation.schema';

// Re-export family profile schemas
export {
  FamilyPrivacySettingsSchema,
  GrowthTrackingSettingsSchema,
  FamilyMeasurementProfileSchema,
  FamilyAccountSettingsSchema,
  FamilyAccountSchema,
  CreateFamilyProfileRequestSchema,
  UpdateFamilyProfileRequestSchema,
  FamilyProfilesListRequestSchema,
  ScheduleReminderRequestSchema,
  GrowthHistoryRequestSchema,
  CreateFamilyAccountRequestSchema,
  InviteToFamilyRequestSchema,
  JoinFamilyRequestSchema,
  ShareProfileRequestSchema,
  UpdatePrivacySettingsRequestSchema,
  MeasurementHistorySchema,
  FamilyProfileSchemas,
  validateGhanaPhoneNumber,
  validateAge,
  validateMeasurementsForAge
} from './family-profiles.schema';

// Re-export group order schemas
export {
  EventTypeSchema,
  GroupOrderStatusSchema,
  PaymentModeSchema,
  DeliveryStrategySchema,
  PaymentStatusSchema,
  DeliveryStatusSchema,
  FabricSourceSchema,
  FabricDetailsSchema,
  FamilyMemberSelectionSchema,
  CreateGroupOrderRequestSchema,
  UpdateGroupOrderRequestSchema,
  AddGroupOrderItemRequestSchema,
  CalculateBulkDiscountRequestSchema,
  ProcessGroupPaymentRequestSchema,
  GroupOrderProgressRequestSchema,
  UpdateDeliveryScheduleRequestSchema,
  GroupOrderItemSchema,
  GroupProgressSummarySchema,
  GroupPaymentTrackingSchema,
  DeliveryScheduleSchema,
  EnhancedGroupOrderSchema,
  type CreateGroupOrderRequestInput,
  type UpdateGroupOrderRequestInput,
  type AddGroupOrderItemRequestInput,
  type CalculateBulkDiscountRequestInput,
  type ProcessGroupPaymentRequestInput,
  type GroupOrderProgressRequestInput,
  type UpdateDeliveryScheduleRequestInput,
  type EnhancedGroupOrderInput,
} from './group-order.schema';
