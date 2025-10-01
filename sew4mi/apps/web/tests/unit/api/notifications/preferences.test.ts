import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../../../app/api/notifications/preferences/route';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  upsert: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  single: vi.fn()
};

// Mock the createRouteHandlerClient
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => mockSupabaseClient)
}));

// Mock the cookies
vi.mock('next/headers', () => ({
  cookies: vi.fn()
}));

describe('/api/notifications/preferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: 'user-123',
    email: 'user@test.com'
  };

  const mockPreferences = {
    user_id: 'user-123',
    sms: true,
    email: true,
    whatsapp: true,
    order_status_updates: true,
    milestone_updates: true,
    payment_reminders: true,
    delivery_notifications: true,
    in_app_notifications: true,
    push_notifications: false
  };

  describe('GET /api/notifications/preferences', () => {
    it('should return user preferences when they exist', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: mockPreferences,
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        userId: 'user-123',
        sms: true,
        email: true,
        whatsapp: true,
        orderStatusUpdates: true,
        milestoneUpdates: true,
        paymentReminders: true,
        deliveryNotifications: true,
        inAppNotifications: true,
        pushNotifications: false
      });
    });

    it('should return default preferences when none exist', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116' } // No rows found
      });

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        userId: 'user-123',
        sms: true,
        email: true,
        whatsapp: true,
        orderStatusUpdates: true,
        milestoneUpdates: true,
        paymentReminders: true,
        deliveryNotifications: true,
        inAppNotifications: true,
        pushNotifications: false
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.errors).toContain('Authentication required');
    });

    it('should handle database errors gracefully', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: new Error('Database error')
      });

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences');

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.errors).toContain('Failed to fetch preferences');
    });
  });

  describe('POST /api/notifications/preferences', () => {
    it('should update preferences successfully', async () => {
      const updatedPreferences = {
        ...mockPreferences,
        push_notifications: true
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedPreferences,
        error: null
      });

      const preferencesData = {
        sms: true,
        email: true,
        whatsapp: true,
        orderStatusUpdates: true,
        milestoneUpdates: true,
        paymentReminders: true,
        deliveryNotifications: true,
        inAppNotifications: true,
        pushNotifications: true
      };

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'POST',
        body: JSON.stringify(preferencesData)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.pushNotifications).toBe(true);
      expect(mockSupabaseClient.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-123',
          push_notifications: true
        }),
        { onConflict: 'user_id' }
      );
    });

    it('should validate request body', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const invalidPreferences = {
        sms: 'invalid', // Should be boolean
        email: true
      };

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'POST',
        body: JSON.stringify(invalidPreferences)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.errors).toBeDefined();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'POST',
        body: JSON.stringify({})
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.errors).toContain('Authentication required');
    });

    it('should handle database update failures', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: new Error('Update failed')
      });

      const preferencesData = {
        sms: true,
        email: true,
        whatsapp: true,
        orderStatusUpdates: true,
        milestoneUpdates: true,
        paymentReminders: true,
        deliveryNotifications: true,
        inAppNotifications: true,
        pushNotifications: true
      };

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'POST',
        body: JSON.stringify(preferencesData)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.errors).toContain('Failed to update preferences');
    });

    it('should handle all preference types correctly', async () => {
      const updatedPreferences = {
        user_id: 'user-123',
        sms: false,
        email: false,
        whatsapp: true,
        order_status_updates: false,
        milestone_updates: true,
        payment_reminders: false,
        delivery_notifications: true,
        in_app_notifications: false,
        push_notifications: true
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: updatedPreferences,
        error: null
      });

      const preferencesData = {
        sms: false,
        email: false,
        whatsapp: true,
        orderStatusUpdates: false,
        milestoneUpdates: true,
        paymentReminders: false,
        deliveryNotifications: true,
        inAppNotifications: false,
        pushNotifications: true
      };

      const request = new NextRequest('http://localhost:3000/api/notifications/preferences', {
        method: 'POST',
        body: JSON.stringify(preferencesData)
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toMatchObject({
        userId: 'user-123',
        sms: false,
        email: false,
        whatsapp: true,
        orderStatusUpdates: false,
        milestoneUpdates: true,
        paymentReminders: false,
        deliveryNotifications: true,
        inAppNotifications: false,
        pushNotifications: true
      });
    });
  });
});