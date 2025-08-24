import { z } from 'zod';
import { PAYMENT_PROVIDERS, PAYMENT_STATUSES, PAYMENT_TYPES, CURRENCY } from '../constants/payment';

const ghanaPhoneRegex = /^(\+233|0)(2[0-9]|5[0-9])\d{7}$/;

export const paymentTransactionSchema = z.object({
  id: z.string().uuid(),
  orderId: z.string().uuid(),
  type: z.enum([
    PAYMENT_TYPES.DEPOSIT,
    PAYMENT_TYPES.FITTING_PAYMENT,
    PAYMENT_TYPES.FINAL_PAYMENT,
    PAYMENT_TYPES.REFUND,
  ]),
  amount: z.number().min(CURRENCY.MIN_AMOUNT).max(100000), // Max GHS 100,000
  provider: z.enum([
    PAYMENT_PROVIDERS.HUBTEL_MTN,
    PAYMENT_PROVIDERS.HUBTEL_VODAFONE,
    PAYMENT_PROVIDERS.HUBTEL_AIRTELTIGO,
    PAYMENT_PROVIDERS.HUBTEL_CARD,
  ]),
  providerTransactionId: z.string().min(1),
  hubtelTransactionId: z.string().optional(),
  paymentMethod: z.string().min(1),
  customerPhoneNumber: z.string().regex(ghanaPhoneRegex).optional(),
  status: z.enum([
    PAYMENT_STATUSES.PENDING,
    PAYMENT_STATUSES.SUCCESS,
    PAYMENT_STATUSES.FAILED,
    PAYMENT_STATUSES.CANCELLED,
  ]),
  webhookReceived: z.boolean().default(false),
  retryCount: z.number().int().min(0).max(10),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const paymentInitiationRequestSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().min(CURRENCY.MIN_AMOUNT).max(100000),
  customerPhoneNumber: z.string().regex(ghanaPhoneRegex, 'Invalid Ghana phone number format'),
  paymentMethod: z.enum(['MTN', 'VODAFONE', 'AIRTELTIGO', 'CARD']),
  description: z.string().max(255).optional(),
});

export const hubtelPaymentRequestSchema = z.object({
  amount: z.number().min(CURRENCY.MIN_AMOUNT),
  customerPhoneNumber: z.string().regex(ghanaPhoneRegex),
  paymentMethod: z.string().min(1),
  transactionId: z.string().min(1),
  description: z.string().max(255).optional(),
  customerName: z.string().max(100).optional(),
});

export const hubtelWebhookPayloadSchema = z.object({
  transactionId: z.string().min(1),
  hubtelTransactionId: z.string().min(1),
  status: z.string().min(1),
  amount: z.number().min(0),
  customerPhoneNumber: z.string().regex(ghanaPhoneRegex),
  paymentMethod: z.string().min(1),
  timestamp: z.string().min(1),
  signature: z.string().min(1),
});

export const ghanaPhoneValidationSchema = z.object({
  phoneNumber: z.string().regex(ghanaPhoneRegex, 'Invalid Ghana phone number format'),
});

export type PaymentTransactionInput = z.infer<typeof paymentTransactionSchema>;
export type PaymentInitiationRequestSchema = z.infer<typeof paymentInitiationRequestSchema>;
export type HubtelPaymentRequestSchema = z.infer<typeof hubtelPaymentRequestSchema>;
export type HubtelWebhookPayloadSchema = z.infer<typeof hubtelWebhookPayloadSchema>;