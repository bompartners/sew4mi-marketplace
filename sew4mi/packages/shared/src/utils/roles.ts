import { 
  UserRole, 
  USER_ROLES, 
  Permission, 
  ROLE_PERMISSIONS, 
  ROLE_HIERARCHY,
  ROLE_ROUTE_MAPPING
} from '../constants/roles';

/**
 * Check if a user has a specific permission
 */
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

/**
 * Get all permissions for a user role
 */
export function getRolePermissions(userRole: UserRole): Permission[] {
  return ROLE_PERMISSIONS[userRole] || [];
}

/**
 * Check if a role can access a specific route
 */
export function canAccessRoute(userRole: UserRole, route: string): boolean {
  // Check exact route match first
  if (ROLE_ROUTE_MAPPING[route]) {
    return ROLE_ROUTE_MAPPING[route].includes(userRole);
  }

  // Check for partial matches (e.g., /admin/users/123 should match /admin)
  const routeKeys = Object.keys(ROLE_ROUTE_MAPPING).sort((a, b) => b.length - a.length);
  
  for (const routePattern of routeKeys) {
    if (route.startsWith(routePattern)) {
      return ROLE_ROUTE_MAPPING[routePattern].includes(userRole);
    }
  }

  // Default to allowing access if route is not explicitly restricted
  return true;
}

/**
 * Check if one role has higher privileges than another
 */
export function hasHigherPrivileges(userRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_HIERARCHY[userRole] > ROLE_HIERARCHY[targetRole];
}

/**
 * Check if a user can manage another user (based on role hierarchy)
 */
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  return hasHigherPrivileges(managerRole, targetRole);
}

/**
 * Validate if a role value is valid
 */
export function isValidRole(role: string): role is UserRole {
  return Object.values(USER_ROLES).includes(role as UserRole);
}

/**
 * Convert string to UserRole with validation
 */
export function parseUserRole(role: string): UserRole | null {
  if (!role || typeof role !== 'string') {
    return null;
  }
  const upperRole = role.toUpperCase() as UserRole;
  return isValidRole(upperRole) ? upperRole : null;
}

/**
 * Get all available roles
 */
export function getAllRoles(): UserRole[] {
  return Object.values(USER_ROLES);
}

/**
 * Check if a role is an admin role
 */
export function isAdmin(userRole: UserRole): boolean {
  return userRole === USER_ROLES.ADMIN;
}

/**
 * Check if a role is a tailor role
 */
export function isTailor(userRole: UserRole): boolean {
  return userRole === USER_ROLES.TAILOR;
}

/**
 * Check if a role is a customer role
 */
export function isCustomer(userRole: UserRole): boolean {
  return userRole === USER_ROLES.CUSTOMER;
}

/**
 * Get unauthorized routes for a specific role
 */
export function getUnauthorizedRoutes(userRole: UserRole): string[] {
  return Object.entries(ROLE_ROUTE_MAPPING)
    .filter(([, allowedRoles]) => !allowedRoles.includes(userRole))
    .map(([route]) => route);
}

/**
 * Get authorized routes for a specific role
 */
export function getAuthorizedRoutes(userRole: UserRole): string[] {
  return Object.entries(ROLE_ROUTE_MAPPING)
    .filter(([, allowedRoles]) => allowedRoles.includes(userRole))
    .map(([route]) => route);
}

/**
 * Check if a role can perform an action on a resource
 * This is a generic function that can be extended for specific business logic
 */
export function canPerformAction(
  userRole: UserRole, 
  _action: string, 
  _resourceType?: string,
  resourceOwnerId?: string,
  currentUserId?: string
): boolean {
  // Admin can do everything
  if (isAdmin(userRole)) {
    return true;
  }

  // Users can always perform actions on their own resources
  if (resourceOwnerId && currentUserId && resourceOwnerId === currentUserId) {
    return true;
  }

  // Add more specific business logic here as needed
  // This is a placeholder for future expansion
  return false;
}

/**
 * Role-based filtering utility
 * Filter items based on user role and ownership
 */
export function filterByRole<T extends { ownerId?: string; createdBy?: string }>(
  items: T[],
  userRole: UserRole,
  currentUserId: string
): T[] {
  if (isAdmin(userRole)) {
    return items; // Admin sees all
  }

  // Filter to only show items owned by the current user
  return items.filter(item => 
    item.ownerId === currentUserId || 
    item.createdBy === currentUserId
  );
}

/**
 * Get role-specific error message for unauthorized access
 */
export function getUnauthorizedMessage(userRole: UserRole, attemptedAction: string): string {
  switch (userRole) {
    case USER_ROLES.CUSTOMER:
      return `This feature is not available for customers. ${attemptedAction} requires tailor or admin privileges.`;
    
    case USER_ROLES.TAILOR:
      return `This feature is not available for tailors. ${attemptedAction} requires admin privileges.`;
    
    case USER_ROLES.ADMIN:
      return `Access denied. Please contact system administrator.`;
    
    default:
      return `You don't have permission to perform this action.`;
  }
}

/**
 * Role transition validation
 * Check if a user can be transitioned from one role to another
 */
export function canTransitionRole(
  fromRole: UserRole, 
  toRole: UserRole, 
  performerRole: UserRole
): boolean {
  // Only admins can change roles
  if (!isAdmin(performerRole)) {
    return false;
  }

  // Can't transition to/from admin unless performer is admin
  if (fromRole === USER_ROLES.ADMIN || toRole === USER_ROLES.ADMIN) {
    return isAdmin(performerRole);
  }

  // Allow customer <-> tailor transitions by admin
  return true;
}