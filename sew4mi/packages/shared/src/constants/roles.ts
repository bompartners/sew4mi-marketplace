/**
 * User role constants and permission definitions
 * Used throughout the application for role-based access control
 */

// User roles as defined in database enum
export const USER_ROLES = {
  CUSTOMER: 'CUSTOMER',
  TAILOR: 'TAILOR', 
  ADMIN: 'ADMIN'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// Human-readable role names
export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.CUSTOMER]: 'Customer',
  [USER_ROLES.TAILOR]: 'Expert Tailor',
  [USER_ROLES.ADMIN]: 'Administrator'
};

// Role descriptions for UI display
export const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [USER_ROLES.CUSTOMER]: 'Browse tailors, place orders, and manage your wardrobe',
  [USER_ROLES.TAILOR]: 'Showcase your skills, manage orders, and grow your business',
  [USER_ROLES.ADMIN]: 'Manage platform users, handle disputes, and oversee operations'
};

// Permissions available in the system
export const PERMISSIONS = {
  // User management
  VIEW_OWN_PROFILE: 'view_own_profile',
  EDIT_OWN_PROFILE: 'edit_own_profile',
  DELETE_OWN_ACCOUNT: 'delete_own_account',
  
  // Customer permissions
  BROWSE_TAILORS: 'browse_tailors',
  PLACE_ORDERS: 'place_orders',
  VIEW_OWN_ORDERS: 'view_own_orders',
  CANCEL_OWN_ORDERS: 'cancel_own_orders',
  RATE_TAILORS: 'rate_tailors',
  CREATE_MEASUREMENTS: 'create_measurements',
  MANAGE_FAMILY_PROFILES: 'manage_family_profiles',
  CREATE_GROUP_ORDERS: 'create_group_orders',
  
  // Tailor permissions
  MANAGE_PORTFOLIO: 'manage_portfolio',
  VIEW_ASSIGNED_ORDERS: 'view_assigned_orders',
  ACCEPT_ORDERS: 'accept_orders',
  UPDATE_ORDER_STATUS: 'update_order_status',
  UPLOAD_MILESTONE_PHOTOS: 'upload_milestone_photos',
  MANAGE_BUSINESS_PROFILE: 'manage_business_profile',
  SET_PRICING: 'set_pricing',
  MANAGE_AVAILABILITY: 'manage_availability',
  VIEW_EARNINGS: 'view_earnings',
  RESPOND_TO_REVIEWS: 'respond_to_reviews',
  
  // Admin permissions
  VIEW_ALL_USERS: 'view_all_users',
  EDIT_USER_ROLES: 'edit_user_roles',
  SUSPEND_USERS: 'suspend_users',
  DELETE_USERS: 'delete_users',
  VIEW_ALL_ORDERS: 'view_all_orders',
  MANAGE_ORDERS: 'manage_orders',
  MANAGE_DISPUTES: 'manage_disputes',
  VIEW_ANALYTICS: 'view_analytics',
  MANAGE_PLATFORM_SETTINGS: 'manage_platform_settings',
  VERIFY_TAILORS: 'verify_tailors',
  VIEW_AUDIT_LOGS: 'view_audit_logs',
  MODERATE_CONTENT: 'moderate_content',
  MANAGE_PAYMENTS: 'manage_payments'
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// Role-based permission matrix
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [USER_ROLES.CUSTOMER]: [
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.DELETE_OWN_ACCOUNT,
    PERMISSIONS.BROWSE_TAILORS,
    PERMISSIONS.PLACE_ORDERS,
    PERMISSIONS.VIEW_OWN_ORDERS,
    PERMISSIONS.CANCEL_OWN_ORDERS,
    PERMISSIONS.RATE_TAILORS,
    PERMISSIONS.CREATE_MEASUREMENTS,
    PERMISSIONS.MANAGE_FAMILY_PROFILES,
    PERMISSIONS.CREATE_GROUP_ORDERS
  ],
  
  [USER_ROLES.TAILOR]: [
    PERMISSIONS.VIEW_OWN_PROFILE,
    PERMISSIONS.EDIT_OWN_PROFILE,
    PERMISSIONS.DELETE_OWN_ACCOUNT,
    PERMISSIONS.MANAGE_PORTFOLIO,
    PERMISSIONS.VIEW_ASSIGNED_ORDERS,
    PERMISSIONS.ACCEPT_ORDERS,
    PERMISSIONS.UPDATE_ORDER_STATUS,
    PERMISSIONS.UPLOAD_MILESTONE_PHOTOS,
    PERMISSIONS.MANAGE_BUSINESS_PROFILE,
    PERMISSIONS.SET_PRICING,
    PERMISSIONS.MANAGE_AVAILABILITY,
    PERMISSIONS.VIEW_EARNINGS,
    PERMISSIONS.RESPOND_TO_REVIEWS
  ],
  
  [USER_ROLES.ADMIN]: [
    // Admin has all permissions
    ...Object.values(PERMISSIONS)
  ]
};

// Navigation routes for each role
export const ROLE_ROUTES: Record<UserRole, string[]> = {
  [USER_ROLES.CUSTOMER]: [
    '/dashboard',
    '/orders',
    '/orders/new',
    '/tailors',
    '/tailors/search',
    '/measurements',
    '/family',
    '/profile'
  ],
  
  [USER_ROLES.TAILOR]: [
    '/dashboard',
    '/orders',
    '/portfolio',
    '/calendar',
    '/earnings',
    '/profile',
    '/settings'
  ],
  
  [USER_ROLES.ADMIN]: [
    '/admin/dashboard',
    '/admin/users',
    '/admin/orders',
    '/admin/disputes', 
    '/admin/analytics',
    '/admin/settings',
    '/admin/audit-logs'
  ]
};

// Default landing page after login for each role
export const ROLE_DEFAULT_ROUTES: Record<UserRole, string> = {
  [USER_ROLES.CUSTOMER]: '/dashboard',
  [USER_ROLES.TAILOR]: '/dashboard', 
  [USER_ROLES.ADMIN]: '/admin/dashboard'
};

// Role hierarchy for permission checking (higher number = more permissions)
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  [USER_ROLES.CUSTOMER]: 1,
  [USER_ROLES.TAILOR]: 2,
  [USER_ROLES.ADMIN]: 10
};

// Roles that can be selected during registration
export const REGISTERABLE_ROLES: UserRole[] = [
  USER_ROLES.CUSTOMER,
  USER_ROLES.TAILOR
];

// Routes that require specific roles
export const ROLE_ROUTE_MAPPING: Record<string, UserRole[]> = {
  // Customer-only routes
  '/orders/new': [USER_ROLES.CUSTOMER],
  '/tailors': [USER_ROLES.CUSTOMER],
  '/tailors/search': [USER_ROLES.CUSTOMER],
  '/measurements': [USER_ROLES.CUSTOMER],
  '/family': [USER_ROLES.CUSTOMER],
  
  // Tailor-only routes
  '/portfolio': [USER_ROLES.TAILOR],
  '/calendar': [USER_ROLES.TAILOR],
  '/earnings': [USER_ROLES.TAILOR],
  
  // Admin-only routes
  '/admin': [USER_ROLES.ADMIN],
  '/admin/dashboard': [USER_ROLES.ADMIN],
  '/admin/users': [USER_ROLES.ADMIN],
  '/admin/orders': [USER_ROLES.ADMIN],
  '/admin/disputes': [USER_ROLES.ADMIN],
  '/admin/analytics': [USER_ROLES.ADMIN],
  '/admin/settings': [USER_ROLES.ADMIN],
  '/admin/audit-logs': [USER_ROLES.ADMIN],
  
  // Shared routes (all authenticated users)
  '/dashboard': [USER_ROLES.CUSTOMER, USER_ROLES.TAILOR, USER_ROLES.ADMIN],
  '/orders': [USER_ROLES.CUSTOMER, USER_ROLES.TAILOR, USER_ROLES.ADMIN],
  '/profile': [USER_ROLES.CUSTOMER, USER_ROLES.TAILOR, USER_ROLES.ADMIN],
  '/settings': [USER_ROLES.CUSTOMER, USER_ROLES.TAILOR, USER_ROLES.ADMIN]
};