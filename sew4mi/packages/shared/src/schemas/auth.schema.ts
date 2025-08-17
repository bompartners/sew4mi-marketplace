import { z } from 'zod';

// Ghana phone number validation
const ghanaPhoneRegex = /^(\+233|0)(2[0345678]|5[0456789]|3[0123]|28)\d{7}$/;

export const phoneSchema = z.string()
  .transform((val) => {
    // Remove all spaces and non-numeric characters except +
    const cleaned = val.replace(/[^\d+]/g, '');
    
    // Convert local format to international format
    if (cleaned.startsWith('0')) {
      return '+233' + cleaned.substring(1);
    }
    return cleaned;
  })
  .refine((val) => ghanaPhoneRegex.test(val), {
    message: 'Invalid Ghana phone number. Must be in format +233XXXXXXXXX or 0XXXXXXXXX',
  });

export const emailSchema = z.string()
  .email('Invalid email address')
  .toLowerCase();

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registrationSchema = z.object({
  identifier: z.union([phoneSchema, emailSchema]),
  identifierType: z.enum(['email', 'phone']),
  password: passwordSchema,
  confirmPassword: z.string(),
  role: z.enum(['customer', 'tailor']).default('customer'),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: 'You must accept the terms and conditions',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  identifier: z.union([phoneSchema, emailSchema]),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional().default(false),
});

export const otpSchema = z.object({
  otp: z.string()
    .length(6, 'OTP must be 6 digits')
    .regex(/^\d{6}$/, 'OTP must contain only numbers'),
});

export const forgotPasswordSchema = z.object({
  identifier: z.union([phoneSchema, emailSchema]),
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
  token: z.string().min(1, 'Reset token is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export type RegistrationInput = z.infer<typeof registrationSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OTPInput = z.infer<typeof otpSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

// Profile completion schemas
export const profileUpdateSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  date_of_birth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  preferred_language: z.string().min(2, 'Language is required').optional(),
  whatsapp_opted_in: z.boolean().optional(),
  whatsapp_number: z.union([phoneSchema, z.literal('')]).optional(),
  avatar_url: z.string().url('Invalid avatar URL').optional()
});

export const tailorProfileSchema = z.object({
  business_name: z.string().min(2, 'Business name must be at least 2 characters'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  years_of_experience: z.number().min(0, 'Experience cannot be negative').max(50, 'Experience seems too high').optional(),
  specializations: z.array(z.string()).min(1, 'At least one specialization is required').optional(),
  location_name: z.string().min(2, 'Location is required').optional(),
  city: z.string().min(2, 'City is required').optional(),
  region: z.string().min(2, 'Region is required').optional(),
  delivery_radius_km: z.number().min(1, 'Delivery radius must be at least 1km').max(100, 'Delivery radius too large').optional(),
  instagram_handle: z.string().min(1).optional(),
  facebook_page: z.string().min(1).optional(),
  tiktok_handle: z.string().min(1).optional()
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type TailorProfileInput = z.infer<typeof tailorProfileSchema>;