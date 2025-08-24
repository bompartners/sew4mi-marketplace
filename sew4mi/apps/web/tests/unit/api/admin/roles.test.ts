import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/admin/users/role/route';

// Mock Supabase with proper chaining
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(),
  rpc: vi.fn()
};

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabaseClient)
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

// Mock shared utilities with proper schema
vi.mock('@sew4mi/shared', () => ({
  USER_ROLES: {
    CUSTOMER: 'CUSTOMER',
    TAILOR: 'TAILOR',
    ADMIN: 'ADMIN'
  },
  hasPermission: vi.fn(),
  canManageUser: vi.fn(),
  adminRoleChangeSchema: {
    safeParse: vi.fn()
  },
  PERMISSIONS: {
    EDIT_USER_ROLES: 'edit_user_roles'
  }
}));

describe('Admin Role Change API - Fixed', () => {
  const mockUser = {
    id: 'admin-user-id',
    email: 'admin@example.com'
  };

  const createMockRequest = (body: any) => {
    return {
      json: vi.fn().mockResolvedValue(body),
      nextUrl: { origin: 'http://localhost:3000' },
      headers: new Map([
        ['content-type', 'application/json']
      ])
    } as any as NextRequest;
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Default successful auth
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Import and mock shared functions
    const shared = await import('@sew4mi/shared');
    const hasPermission = vi.mocked(shared.hasPermission);
    const canManageUser = vi.mocked(shared.canManageUser);
    const adminRoleChangeSchema = vi.mocked(shared.adminRoleChangeSchema);
    
    hasPermission.mockReturnValue(true);
    canManageUser.mockReturnValue(true);

    // Default successful schema validation
    adminRoleChangeSchema.safeParse.mockReturnValue({
      success: true,
      data: {
        userId: 'target-user-id',
        newRole: 'TAILOR',
        reason: 'Test role change'
      }
    });

    // Default successful database responses
    mockSupabaseClient.from.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { role: 'ADMIN', email: 'admin@example.com', full_name: 'Admin User' },
            error: null
          })
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: {},
            error: null
          })
        })
      })
    });

    mockSupabaseClient.rpc.mockResolvedValue({
      data: { success: true },
      error: null
    });
  });

  it('should return 401 for unauthenticated requests', async () => {
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    });

    const request = createMockRequest({
      userId: 'target-user-id',
      newRole: 'TAILOR'
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Authentication required');
  });

  it('should return 400 for invalid request data', async () => {
    const sharedModule = await import('@sew4mi/shared');
    const adminRoleChangeSchema = vi.mocked(sharedModule.adminRoleChangeSchema);
    adminRoleChangeSchema.safeParse.mockReturnValue({
      success: false,
      error: {
        issues: [{ message: 'Invalid user ID' }]
      }
    });

    const request = createMockRequest({
      userId: 'invalid-id',
      newRole: 'INVALID_ROLE'
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid request data');
  });

  it('should successfully change user role', async () => {
    // Mock successful database responses for a complete flow
    let callCount = 0;
    mockSupabaseClient.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockImplementation(() => {
            callCount++;
            if (callCount === 1) {
              // Admin user lookup
              return Promise.resolve({
                data: { role: 'ADMIN' },
                error: null
              });
            } else {
              // Target user lookup
              return Promise.resolve({
                data: { role: 'CUSTOMER', email: 'user@example.com', full_name: 'Test User' },
                error: null
              });
            }
          })
        })
      })
    }));

    mockSupabaseClient.rpc.mockResolvedValue({
      data: { success: true },
      error: null
    });

    const request = createMockRequest({
      userId: 'target-user-id',
      newRole: 'TAILOR',
      reason: 'Promotion to tailor'
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toContain('CUSTOMER to TAILOR');
  });
});