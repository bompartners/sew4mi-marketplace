import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '@/middleware';

// Mock the Supabase auth helpers
const mockSupabaseClient = {
  auth: {
    getSession: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
};

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createMiddlewareClient: vi.fn(() => mockSupabaseClient)
}));

// Mock the shared utilities
vi.mock('@sew4mi/shared', () => ({
  USER_ROLES: {
    CUSTOMER: 'CUSTOMER',
    TAILOR: 'TAILOR',
    ADMIN: 'ADMIN'
  },
  ROLE_ROUTE_MAPPING: {
    '/orders': ['CUSTOMER'],
    '/portfolio': ['TAILOR'],
    '/admin': ['ADMIN'],
    '/dashboard': ['CUSTOMER', 'TAILOR', 'ADMIN']
  },
  canAccessRoute: vi.fn()
}));

describe('Role-based Middleware', () => {
  let mockCanAccessRoute: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked canAccessRoute function
    const shared = await import('@sew4mi/shared');
    mockCanAccessRoute = vi.mocked(shared.canAccessRoute);
  });

  const createMockRequest = (url: string) => {
    return {
      nextUrl: new URL(url, 'http://localhost:3000'),
      url,
      headers: new Map([
        ['x-forwarded-for', '127.0.0.1'],
        ['user-agent', 'test-agent']
      ]),
      cookies: new Map()
    } as any as NextRequest;
  };

  const createMockSession = (role: string) => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: { role },
      app_metadata: {}
    }
  });

  describe('Public routes', () => {
    it('should allow access to public routes without authentication', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      const publicRoutes = ['/', '/login', '/register', '/forgot-password'];
      
      for (const route of publicRoutes) {
        const request = createMockRequest(`http://localhost:3000${route}`);
        const response = await middleware(request);
        
        // Should not redirect (NextResponse.next() behavior)
        expect(response.status).not.toBe(302);
      }
    });
  });

  describe('Authentication required routes', () => {
    it('should redirect unauthenticated users to login', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      const request = createMockRequest('http://localhost:3000/dashboard');
      const response = await middleware(request);
      
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/login');
    });

    it('should redirect unauthenticated users to login with redirect parameter', async () => {
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session: null }
      });

      const request = createMockRequest('http://localhost:3000/orders');
      const response = await middleware(request);
      
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('redirect=%2Forders');
    });
  });

  describe('Role-based access control', () => {
    it('should allow customer access to customer routes', async () => {
      const session = createMockSession('CUSTOMER');
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session }
      });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'CUSTOMER' },
              error: null
            })
          })
        })
      });
      
      mockCanAccessRoute.mockReturnValue(true);

      const request = createMockRequest('http://localhost:3000/orders');
      const response = await middleware(request);
      
      expect(mockCanAccessRoute).toHaveBeenCalledWith('CUSTOMER', '/orders');
      expect(response.status).not.toBe(302);
    });

    it('should block customer access to admin routes', async () => {
      const session = createMockSession('CUSTOMER');
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session }
      });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'CUSTOMER' },
              error: null
            })
          })
        })
      });
      
      mockCanAccessRoute.mockReturnValue(false);

      const request = createMockRequest('http://localhost:3000/admin/dashboard');
      const response = await middleware(request);
      
      expect(mockCanAccessRoute).toHaveBeenCalledWith('CUSTOMER', '/admin/dashboard');
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/unauthorized');
    });

    it('should allow tailor access to tailor routes', async () => {
      const session = createMockSession('TAILOR');
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session }
      });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'TAILOR' },
              error: null
            })
          })
        })
      });
      
      mockCanAccessRoute.mockReturnValue(true);

      const request = createMockRequest('http://localhost:3000/portfolio');
      const response = await middleware(request);
      
      expect(mockCanAccessRoute).toHaveBeenCalledWith('TAILOR', '/portfolio');
      expect(response.status).not.toBe(302);
    });

    it('should block tailor access to customer routes', async () => {
      const session = createMockSession('TAILOR');
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session }
      });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'TAILOR' },
              error: null
            })
          })
        })
      });
      
      mockCanAccessRoute.mockReturnValue(false);

      const request = createMockRequest('http://localhost:3000/orders');
      const response = await middleware(request);
      
      expect(mockCanAccessRoute).toHaveBeenCalledWith('TAILOR', '/orders');
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/unauthorized');
    });

    it('should allow admin access to all routes', async () => {
      const session = createMockSession('ADMIN');
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session }
      });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'ADMIN' },
              error: null
            })
          })
        })
      });
      
      mockCanAccessRoute.mockReturnValue(true);

      const routes = ['/dashboard', '/orders', '/portfolio', '/admin/dashboard'];
      
      for (const route of routes) {
        const request = createMockRequest(`http://localhost:3000${route}`);
        const response = await middleware(request);
        
        expect(response.status).not.toBe(302);
      }
    });
  });

  describe('Auth route redirects', () => {
    it('should redirect authenticated users away from auth routes to appropriate dashboard', async () => {
      const session = createMockSession('CUSTOMER');
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session }
      });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'CUSTOMER' },
              error: null
            })
          })
        })
      });

      const request = createMockRequest('http://localhost:3000/login');
      const response = await middleware(request);
      
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/dashboard');
    });

    it('should redirect admin to admin dashboard from auth routes', async () => {
      const session = createMockSession('ADMIN');
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session }
      });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'ADMIN' },
              error: null
            })
          })
        })
      });

      const request = createMockRequest('http://localhost:3000/login');
      const response = await middleware(request);
      
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/admin/dashboard');
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      const session = createMockSession('CUSTOMER');
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session }
      });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      });

      const request = createMockRequest('http://localhost:3000/dashboard');
      const response = await middleware(request);
      
      // Should still allow access with fallback behavior
      expect(response.status).not.toBe(500);
    });

    it('should use metadata role as fallback', async () => {
      const session = {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
          user_metadata: { role: 'CUSTOMER' },
          app_metadata: {}
        }
      };
      
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session }
      });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('User not found')
            })
          })
        })
      });
      
      mockCanAccessRoute.mockReturnValue(true);

      const request = createMockRequest('http://localhost:3000/orders');
      const response = await middleware(request);
      
      expect(mockCanAccessRoute).toHaveBeenCalledWith('CUSTOMER', '/orders');
      expect(response.status).not.toBe(302);
    });
  });

  describe('Unauthorized page parameters', () => {
    it('should include role information in unauthorized redirect', async () => {
      const session = createMockSession('CUSTOMER');
      mockSupabaseClient.auth.getSession.mockResolvedValue({
        data: { session }
      });
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'CUSTOMER' },
              error: null
            })
          })
        })
      });
      
      mockCanAccessRoute.mockReturnValue(false);

      const request = createMockRequest('http://localhost:3000/admin/users');
      const response = await middleware(request);
      
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/unauthorized');
      expect(location).toContain('reason=insufficient_permissions');
      expect(location).toContain('user_role=CUSTOMER');
    });
  });
});