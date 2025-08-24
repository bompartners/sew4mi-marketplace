import { describe, it, expect } from 'vitest';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessRoute,
  hasHigherPrivileges,
  canManageUser,
  isValidRole,
  parseUserRole,
  isAdmin,
  isTailor,
  isCustomer,
  getUnauthorizedRoutes,
  getUnauthorizedMessage,
  canTransitionRole
} from '@sew4mi/shared';
import { USER_ROLES, PERMISSIONS } from '@sew4mi/shared';

describe('Role Utilities', () => {
  describe('hasPermission', () => {
    it('should return true when user has the permission', () => {
      expect(hasPermission(USER_ROLES.ADMIN, PERMISSIONS.VIEW_ALL_USERS)).toBe(true);
      expect(hasPermission(USER_ROLES.CUSTOMER, PERMISSIONS.BROWSE_TAILORS)).toBe(true);
      expect(hasPermission(USER_ROLES.TAILOR, PERMISSIONS.MANAGE_PORTFOLIO)).toBe(true);
    });

    it('should return false when user does not have the permission', () => {
      expect(hasPermission(USER_ROLES.CUSTOMER, PERMISSIONS.VIEW_ALL_USERS)).toBe(false);
      expect(hasPermission(USER_ROLES.TAILOR, PERMISSIONS.EDIT_USER_ROLES)).toBe(false);
      expect(hasPermission(USER_ROLES.CUSTOMER, PERMISSIONS.MANAGE_PORTFOLIO)).toBe(false);
    });

    it('should return true for admin on all permissions', () => {
      expect(hasPermission(USER_ROLES.ADMIN, PERMISSIONS.BROWSE_TAILORS)).toBe(true);
      expect(hasPermission(USER_ROLES.ADMIN, PERMISSIONS.MANAGE_PORTFOLIO)).toBe(true);
      expect(hasPermission(USER_ROLES.ADMIN, PERMISSIONS.VIEW_EARNINGS)).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', () => {
      expect(hasAnyPermission(USER_ROLES.CUSTOMER, [
        PERMISSIONS.VIEW_ALL_USERS, // Customer doesn't have this
        PERMISSIONS.BROWSE_TAILORS   // Customer has this
      ])).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      expect(hasAnyPermission(USER_ROLES.CUSTOMER, [
        PERMISSIONS.VIEW_ALL_USERS,
        PERMISSIONS.EDIT_USER_ROLES,
        PERMISSIONS.MANAGE_DISPUTES
      ])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all permissions', () => {
      expect(hasAllPermissions(USER_ROLES.CUSTOMER, [
        PERMISSIONS.BROWSE_TAILORS,
        PERMISSIONS.PLACE_ORDERS,
        PERMISSIONS.VIEW_OWN_ORDERS
      ])).toBe(true);
    });

    it('should return false when user is missing any permission', () => {
      expect(hasAllPermissions(USER_ROLES.CUSTOMER, [
        PERMISSIONS.BROWSE_TAILORS,   // Customer has this
        PERMISSIONS.VIEW_ALL_USERS    // Customer doesn't have this
      ])).toBe(false);
    });
  });

  describe('canAccessRoute', () => {
    it('should allow admin to access admin routes', () => {
      expect(canAccessRoute(USER_ROLES.ADMIN, '/admin/dashboard')).toBe(true);
      expect(canAccessRoute(USER_ROLES.ADMIN, '/admin/users')).toBe(true);
    });

    it('should prevent non-admin from accessing admin routes', () => {
      expect(canAccessRoute(USER_ROLES.CUSTOMER, '/admin/dashboard')).toBe(false);
      expect(canAccessRoute(USER_ROLES.TAILOR, '/admin/users')).toBe(false);
    });

    it('should allow customer to access customer routes', () => {
      expect(canAccessRoute(USER_ROLES.CUSTOMER, '/orders')).toBe(true);
      expect(canAccessRoute(USER_ROLES.CUSTOMER, '/measurements')).toBe(true);
    });

    it('should prevent tailor from accessing customer-only routes', () => {
      expect(canAccessRoute(USER_ROLES.TAILOR, '/orders')).toBe(false);
      expect(canAccessRoute(USER_ROLES.TAILOR, '/measurements')).toBe(false);
    });

    it('should allow tailor to access tailor routes', () => {
      expect(canAccessRoute(USER_ROLES.TAILOR, '/portfolio')).toBe(true);
      expect(canAccessRoute(USER_ROLES.TAILOR, '/earnings')).toBe(true);
    });

    it('should allow shared routes for all roles', () => {
      expect(canAccessRoute(USER_ROLES.CUSTOMER, '/dashboard')).toBe(true);
      expect(canAccessRoute(USER_ROLES.TAILOR, '/dashboard')).toBe(true);
      expect(canAccessRoute(USER_ROLES.ADMIN, '/dashboard')).toBe(true);
      
      expect(canAccessRoute(USER_ROLES.CUSTOMER, '/profile')).toBe(true);
      expect(canAccessRoute(USER_ROLES.TAILOR, '/profile')).toBe(true);
      expect(canAccessRoute(USER_ROLES.ADMIN, '/profile')).toBe(true);
    });

    it('should allow undefined routes by default', () => {
      expect(canAccessRoute(USER_ROLES.CUSTOMER, '/some-undefined-route')).toBe(true);
      expect(canAccessRoute(USER_ROLES.TAILOR, '/another-route')).toBe(true);
    });
  });

  describe('hasHigherPrivileges', () => {
    it('should return true for admin over other roles', () => {
      expect(hasHigherPrivileges(USER_ROLES.ADMIN, USER_ROLES.CUSTOMER)).toBe(true);
      expect(hasHigherPrivileges(USER_ROLES.ADMIN, USER_ROLES.TAILOR)).toBe(true);
    });

    it('should return true for tailor over customer', () => {
      expect(hasHigherPrivileges(USER_ROLES.TAILOR, USER_ROLES.CUSTOMER)).toBe(true);
    });

    it('should return false for lower privilege roles', () => {
      expect(hasHigherPrivileges(USER_ROLES.CUSTOMER, USER_ROLES.ADMIN)).toBe(false);
      expect(hasHigherPrivileges(USER_ROLES.CUSTOMER, USER_ROLES.TAILOR)).toBe(false);
      expect(hasHigherPrivileges(USER_ROLES.TAILOR, USER_ROLES.ADMIN)).toBe(false);
    });

    it('should return false for same roles', () => {
      expect(hasHigherPrivileges(USER_ROLES.ADMIN, USER_ROLES.ADMIN)).toBe(false);
      expect(hasHigherPrivileges(USER_ROLES.CUSTOMER, USER_ROLES.CUSTOMER)).toBe(false);
    });
  });

  describe('canManageUser', () => {
    it('should allow admin to manage any user', () => {
      expect(canManageUser(USER_ROLES.ADMIN, USER_ROLES.CUSTOMER)).toBe(true);
      expect(canManageUser(USER_ROLES.ADMIN, USER_ROLES.TAILOR)).toBe(true);
    });

    it('should not allow non-admin to manage users', () => {
      expect(canManageUser(USER_ROLES.CUSTOMER, USER_ROLES.ADMIN)).toBe(false);
      expect(canManageUser(USER_ROLES.TAILOR, USER_ROLES.ADMIN)).toBe(false);
      expect(canManageUser(USER_ROLES.CUSTOMER, USER_ROLES.TAILOR)).toBe(false);
    });
  });

  describe('isValidRole', () => {
    it('should return true for valid roles', () => {
      expect(isValidRole('CUSTOMER')).toBe(true);
      expect(isValidRole('TAILOR')).toBe(true);
      expect(isValidRole('ADMIN')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('INVALID')).toBe(false);
      expect(isValidRole('customer')).toBe(false); // lowercase
      expect(isValidRole('')).toBe(false);
      expect(isValidRole(null as any)).toBe(false);
    });
  });

  describe('parseUserRole', () => {
    it('should parse valid roles correctly', () => {
      expect(parseUserRole('CUSTOMER')).toBe(USER_ROLES.CUSTOMER);
      expect(parseUserRole('customer')).toBe(USER_ROLES.CUSTOMER);
      expect(parseUserRole('Customer')).toBe(USER_ROLES.CUSTOMER);
      expect(parseUserRole('TAILOR')).toBe(USER_ROLES.TAILOR);
      expect(parseUserRole('tailor')).toBe(USER_ROLES.TAILOR);
      expect(parseUserRole('ADMIN')).toBe(USER_ROLES.ADMIN);
      expect(parseUserRole('admin')).toBe(USER_ROLES.ADMIN);
    });

    it('should return null for invalid roles', () => {
      expect(parseUserRole('INVALID')).toBe(null);
      expect(parseUserRole('')).toBe(null);
      expect(parseUserRole(null as any)).toBe(null);
    });
  });

  describe('Role type checkers', () => {
    describe('isAdmin', () => {
      it('should return true only for admin role', () => {
        expect(isAdmin(USER_ROLES.ADMIN)).toBe(true);
        expect(isAdmin(USER_ROLES.CUSTOMER)).toBe(false);
        expect(isAdmin(USER_ROLES.TAILOR)).toBe(false);
      });
    });

    describe('isTailor', () => {
      it('should return true only for tailor role', () => {
        expect(isTailor(USER_ROLES.TAILOR)).toBe(true);
        expect(isTailor(USER_ROLES.ADMIN)).toBe(false);
        expect(isTailor(USER_ROLES.CUSTOMER)).toBe(false);
      });
    });

    describe('isCustomer', () => {
      it('should return true only for customer role', () => {
        expect(isCustomer(USER_ROLES.CUSTOMER)).toBe(true);
        expect(isCustomer(USER_ROLES.ADMIN)).toBe(false);
        expect(isCustomer(USER_ROLES.TAILOR)).toBe(false);
      });
    });
  });

  describe('getUnauthorizedRoutes', () => {
    it('should return correct unauthorized routes for customer', () => {
      const unauthorizedRoutes = getUnauthorizedRoutes(USER_ROLES.CUSTOMER);
      expect(unauthorizedRoutes).toContain('/admin/dashboard');
      expect(unauthorizedRoutes).toContain('/portfolio');
      expect(unauthorizedRoutes).toContain('/earnings');
      expect(unauthorizedRoutes).not.toContain('/orders');
      expect(unauthorizedRoutes).not.toContain('/dashboard');
    });

    it('should return correct unauthorized routes for tailor', () => {
      const unauthorizedRoutes = getUnauthorizedRoutes(USER_ROLES.TAILOR);
      expect(unauthorizedRoutes).toContain('/admin/dashboard');
      expect(unauthorizedRoutes).toContain('/orders'); // Customer route
      expect(unauthorizedRoutes).toContain('/measurements');
      expect(unauthorizedRoutes).not.toContain('/portfolio');
      expect(unauthorizedRoutes).not.toContain('/dashboard');
    });

    it('should return correct unauthorized routes for admin', () => {
      const unauthorizedRoutes = getUnauthorizedRoutes(USER_ROLES.ADMIN);
      // Admin doesn't have access to customer/tailor-only routes
      expect(unauthorizedRoutes).toContain('/orders');
      expect(unauthorizedRoutes).toContain('/portfolio');
      expect(unauthorizedRoutes).toContain('/earnings');
      expect(unauthorizedRoutes).not.toContain('/admin/dashboard');
      expect(unauthorizedRoutes).not.toContain('/dashboard');
    });
  });

  describe('getUnauthorizedMessage', () => {
    it('should return appropriate message for customer', () => {
      const message = getUnauthorizedMessage(USER_ROLES.CUSTOMER, 'access admin panel');
      expect(message).toContain('customers');
      expect(message).toContain('admin');
    });

    it('should return appropriate message for tailor', () => {
      const message = getUnauthorizedMessage(USER_ROLES.TAILOR, 'delete users');
      expect(message).toContain('tailors');
      expect(message).toContain('admin');
    });

    it('should return appropriate message for admin', () => {
      const message = getUnauthorizedMessage(USER_ROLES.ADMIN, 'perform action');
      expect(message).toContain('Access denied');
    });
  });

  describe('canTransitionRole', () => {
    it('should allow admin to transition any role', () => {
      expect(canTransitionRole(USER_ROLES.CUSTOMER, USER_ROLES.TAILOR, USER_ROLES.ADMIN)).toBe(true);
      expect(canTransitionRole(USER_ROLES.TAILOR, USER_ROLES.CUSTOMER, USER_ROLES.ADMIN)).toBe(true);
      expect(canTransitionRole(USER_ROLES.CUSTOMER, USER_ROLES.ADMIN, USER_ROLES.ADMIN)).toBe(true);
    });

    it('should not allow non-admin to transition roles', () => {
      expect(canTransitionRole(USER_ROLES.CUSTOMER, USER_ROLES.TAILOR, USER_ROLES.CUSTOMER)).toBe(false);
      expect(canTransitionRole(USER_ROLES.CUSTOMER, USER_ROLES.TAILOR, USER_ROLES.TAILOR)).toBe(false);
    });

    it('should handle admin role transitions properly', () => {
      expect(canTransitionRole(USER_ROLES.ADMIN, USER_ROLES.CUSTOMER, USER_ROLES.ADMIN)).toBe(true);
      expect(canTransitionRole(USER_ROLES.CUSTOMER, USER_ROLES.ADMIN, USER_ROLES.ADMIN)).toBe(true);
    });
  });
});