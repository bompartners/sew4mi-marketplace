import { z } from 'zod';
import { USER_ROLES, UserRole, Permission } from '../constants/roles';

/**
 * Schema for validating user roles
 */
export const userRoleSchema = z.enum(['CUSTOMER', 'TAILOR', 'ADMIN']);

/**
 * Schema for roles that can be selected during registration
 */
export const registerableRoleSchema = z.enum(['CUSTOMER', 'TAILOR']);

/**
 * Schema for role change requests
 */
export const roleChangeRequestSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  fromRole: userRoleSchema,
  toRole: userRoleSchema,
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500, 'Reason too long'),
  requestedBy: z.string().uuid('Invalid requester ID'),
  approvedBy: z.string().uuid('Invalid approver ID').optional(),
  effectiveDate: z.string().datetime().optional(),
  notes: z.string().max(1000, 'Notes too long').optional()
});

/**
 * Schema for role assignment during registration
 */
export const roleAssignmentSchema = z.object({
  role: registerableRoleSchema,
  businessJustification: z.string()
    .min(1, 'Business justification required for tailor role')
    .max(200, 'Justification too long')
    .optional()
    .refine((_val) => {
      // Require business justification for tailor role
      // Note: This validation is context-dependent and should be validated at the API level
      return true;
    }, {
      message: 'Business justification is required when applying for tailor role'
    })
});

/**
 * Schema for permission validation
 */
export const permissionSchema = z.enum([
  'view_own_profile',
  'edit_own_profile',
  'delete_own_account',
  'browse_tailors',
  'place_orders',
  'view_own_orders',
  'cancel_own_orders',
  'rate_tailors',
  'create_measurements',
  'manage_family_profiles',
  'create_group_orders',
  'manage_portfolio',
  'view_assigned_orders',
  'accept_orders',
  'update_order_status',
  'upload_milestone_photos',
  'manage_business_profile',
  'set_pricing',
  'manage_availability',
  'view_earnings',
  'respond_to_reviews',
  'view_all_users',
  'edit_user_roles',
  'suspend_users',
  'delete_users',
  'view_all_orders',
  'manage_disputes',
  'view_analytics',
  'manage_platform_settings',
  'verify_tailors',
  'view_audit_logs',
  'moderate_content',
  'manage_payments'
]);

/**
 * Schema for role verification (admin actions)
 */
export const roleVerificationSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  role: userRoleSchema,
  verificationStatus: z.enum(['PENDING', 'VERIFIED', 'SUSPENDED']),
  verificationNotes: z.string().max(1000, 'Notes too long').optional(),
  documentsProvided: z.array(z.string().url('Invalid document URL')).optional(),
  verificationDate: z.string().datetime().optional()
});

/**
 * Schema for admin role management actions
 */
export const adminRoleActionSchema = z.object({
  action: z.enum(['ASSIGN_ROLE', 'CHANGE_ROLE', 'SUSPEND_USER', 'ACTIVATE_USER', 'VERIFY_TAILOR']),
  targetUserId: z.string().uuid('Invalid target user ID'),
  performedBy: z.string().uuid('Invalid admin user ID'),
  newRole: userRoleSchema.optional(),
  previousRole: userRoleSchema.optional(),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
  effectiveImmediately: z.boolean().default(true),
  notifyUser: z.boolean().default(true),
  auditMetadata: z.record(z.any()).optional()
});

/**
 * Schema for admin role changes (simplified for API usage)
 */
export const adminRoleChangeSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  newRole: z.enum(['CUSTOMER', 'TAILOR', 'ADMIN']),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long').optional()
});

/**
 * Schema for bulk role operations
 */
export const bulkRoleOperationSchema = z.object({
  operation: z.enum(['CHANGE_ROLE', 'SUSPEND', 'ACTIVATE', 'VERIFY']),
  userIds: z.array(z.string().uuid('Invalid user ID')).min(1, 'At least one user required').max(100, 'Too many users selected'),
  newRole: userRoleSchema.optional(),
  reason: z.string().min(1, 'Reason is required').max(500, 'Reason too long'),
  performedBy: z.string().uuid('Invalid admin user ID'),
  confirmBulkAction: z.boolean().refine((val) => val === true, {
    message: 'You must confirm this bulk action'
  })
});

/**
 * Schema for role application (tailor registration)
 */
export const tailorApplicationSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters').max(100, 'Business name too long'),
  businessType: z.enum(['individual', 'company', 'cooperative']),
  yearsOfExperience: z.number().min(0, 'Experience cannot be negative').max(50, 'Experience seems too high'),
  specializations: z.array(z.string()).min(1, 'At least one specialization required').max(10, 'Too many specializations'),
  portfolioDescription: z.string().min(50, 'Portfolio description too short').max(1000, 'Portfolio description too long'),
  businessLocation: z.string().min(2, 'Business location required'),
  workspacePhotos: z.array(z.string().url('Invalid photo URL')).min(1, 'At least one workspace photo required').max(5, 'Too many photos'),
  references: z.array(z.object({
    name: z.string().min(2, 'Reference name required'),
    phone: z.string().min(10, 'Valid phone number required'),
    relationship: z.string().min(2, 'Relationship description required')
  })).min(2, 'At least 2 references required').max(5, 'Too many references'),
  businessRegistration: z.string().url('Business registration document required').optional(),
  taxId: z.string().min(1, 'Tax ID required for business registration').optional(),
  agreedToTerms: z.boolean().refine((val) => val === true, {
    message: 'You must agree to the tailor terms and conditions'
  })
});

// Type exports
export type RoleChangeRequest = z.infer<typeof roleChangeRequestSchema>;
export type RoleAssignment = z.infer<typeof roleAssignmentSchema>;
export type RoleVerification = z.infer<typeof roleVerificationSchema>;
export type AdminRoleAction = z.infer<typeof adminRoleActionSchema>;
export type AdminRoleChange = z.infer<typeof adminRoleChangeSchema>;
export type BulkRoleOperation = z.infer<typeof bulkRoleOperationSchema>;
export type TailorApplication = z.infer<typeof tailorApplicationSchema>;

/**
 * Helper functions for schema validation
 */
export function validateUserRole(role: unknown): role is UserRole {
  try {
    userRoleSchema.parse(role);
    return true;
  } catch {
    return false;
  }
}

export function validateRegistrableRole(role: unknown): role is 'CUSTOMER' | 'TAILOR' {
  try {
    registerableRoleSchema.parse(role);
    return true;
  } catch {
    return false;
  }
}

export function validatePermission(permission: unknown): permission is Permission {
  try {
    permissionSchema.parse(permission);
    return true;
  } catch {
    return false;
  }
}

/**
 * Role-specific validation helpers
 */
export const roleValidationHelpers = {
  isValidRoleTransition: (fromRole: UserRole, toRole: UserRole): boolean => {
    // Define allowed role transitions
    const allowedTransitions: Record<UserRole, UserRole[]> = {
      [USER_ROLES.CUSTOMER]: [USER_ROLES.TAILOR], // Customers can become tailors
      [USER_ROLES.TAILOR]: [USER_ROLES.CUSTOMER], // Tailors can downgrade to customers
      [USER_ROLES.ADMIN]: [USER_ROLES.CUSTOMER, USER_ROLES.TAILOR] // Admins can become any role
    };

    return allowedTransitions[fromRole]?.includes(toRole) || false;
  },

  requiresApproval: (fromRole: UserRole, toRole: UserRole): boolean => {
    // Becoming a tailor always requires approval
    if (toRole === USER_ROLES.TAILOR) {
      return true;
    }
    
    // Admin role changes always require approval
    if (fromRole === USER_ROLES.ADMIN || toRole === USER_ROLES.ADMIN) {
      return true;
    }

    return false;
  },

  getRequiredDocuments: (role: UserRole): string[] => {
    switch (role) {
      case USER_ROLES.TAILOR:
        return ['business_registration', 'tax_id', 'portfolio_photos', 'workspace_photos'];
      case USER_ROLES.ADMIN:
        return ['admin_appointment_letter', 'identity_verification'];
      default:
        return [];
    }
  }
};