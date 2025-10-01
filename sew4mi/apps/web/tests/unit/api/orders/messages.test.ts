import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../../../../app/api/orders/[id]/messages/route';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => mockSupabaseClient),
  select: vi.fn(() => mockSupabaseClient),
  insert: vi.fn(() => mockSupabaseClient),
  upsert: vi.fn(() => mockSupabaseClient),
  eq: vi.fn(() => mockSupabaseClient),
  order: vi.fn(() => mockSupabaseClient),
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

describe('/api/orders/[id]/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockUser = {
    id: 'customer-123',
    email: 'customer@test.com'
  };

  const mockOrder = {
    id: 'order-123',
    customer_id: 'customer-123',
    tailor_id: 'tailor-123'
  };

  const mockOrderWithDetails = {
    ...mockOrder,
    customer: {
      first_name: 'John',
      last_name: 'Doe'
    },
    tailor: {
      first_name: 'Jane',
      last_name: 'Smith'
    }
  };

  const mockMessages = [
    {
      id: 'msg-1',
      order_id: 'order-123',
      sender_id: 'customer-123',
      sender_type: 'CUSTOMER',
      sender_name: 'John Doe',
      message: 'Hello, how is my order progressing?',
      message_type: 'TEXT',
      media_url: null,
      is_internal: false,
      read_by: ['customer-123'],
      sent_at: '2025-08-15T10:00:00Z',
      read_at: null,
      delivered_at: '2025-08-15T10:00:01Z'
    },
    {
      id: 'msg-2',
      order_id: 'order-123',
      sender_id: 'tailor-123',
      sender_type: 'TAILOR',
      sender_name: 'Jane Smith',
      message: 'Your order is going well! I will have fitting ready tomorrow.',
      message_type: 'TEXT',
      media_url: null,
      is_internal: false,
      read_by: ['tailor-123', 'customer-123'],
      sent_at: '2025-08-15T11:00:00Z',
      read_at: '2025-08-15T11:30:00Z',
      delivered_at: '2025-08-15T11:00:01Z'
    }
  ];

  describe('GET /api/orders/[id]/messages', () => {
    it('should return messages for authorized customer', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: mockOrder,
        error: null
      });

      mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select
        .mockReturnValueOnce(mockSupabaseClient) // For order query
        .mockReturnValueOnce(mockSupabaseClient); // For messages query

      mockSupabaseClient.eq
        .mockReturnValueOnce(mockSupabaseClient) // For order ID
        .mockReturnValueOnce(mockSupabaseClient) // For order ID in messages
        .mockResolvedValueOnce({ data: mockMessages, error: null }); // Messages query result

      const request = new NextRequest('http://localhost:3000/api/orders/order-123/messages');
      const params = Promise.resolve({ id: 'order-123' });

      const response = await GET(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData).toHaveLength(2);
      expect(responseData[0]).toMatchObject({
        id: 'msg-1',
        sender_type: 'CUSTOMER',
        message: 'Hello, how is my order progressing?'
      });
    });

    it('should mark unread messages as read for current user', async () => {
      const messagesWithUnread = [
        {
          ...mockMessages[1],
          read_by: ['tailor-123'], // Customer hasn't read this message
          read_at: null
        }
      ];

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: mockOrder,
        error: null
      });

      mockSupabaseClient.order.mockReturnValue(mockSupabaseClient);
      mockSupabaseClient.select
        .mockReturnValueOnce(mockSupabaseClient)
        .mockReturnValueOnce(mockSupabaseClient);

      mockSupabaseClient.eq
        .mockReturnValueOnce(mockSupabaseClient)
        .mockReturnValueOnce(mockSupabaseClient)
        .mockResolvedValueOnce({ data: messagesWithUnread, error: null });

      mockSupabaseClient.upsert.mockResolvedValue({ error: null });

      const request = new NextRequest('http://localhost:3000/api/orders/order-123/messages');
      const params = Promise.resolve({ id: 'order-123' });

      const response = await GET(request, { params });

      expect(response.status).toBe(200);
      expect(mockSupabaseClient.upsert).toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated')
      });

      const request = new NextRequest('http://localhost:3000/api/orders/order-123/messages');
      const params = Promise.resolve({ id: 'order-123' });

      const response = await GET(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.errors).toContain('Authentication required');
    });

    it('should return 403 when user is not authorized to access order', async () => {
      const unauthorizedUser = { id: 'other-user-123', email: 'other@test.com' };
      
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: unauthorizedUser },
        error: null
      });

      mockSupabaseClient.single.mockResolvedValue({
        data: mockOrder,
        error: null
      });

      const request = new NextRequest('http://localhost:3000/api/orders/order-123/messages');
      const params = Promise.resolve({ id: 'order-123' });

      const response = await GET(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(403);
      expect(responseData.errors).toContain('Unauthorized access to order');
    });
  });

  describe('POST /api/orders/[id]/messages', () => {
    it('should create new message from customer', async () => {
      const newMessage = {
        id: 'msg-new',
        sent_at: '2025-08-16T10:00:00Z',
        delivered_at: '2025-08-16T10:00:01Z'
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockOrderWithDetails, error: null })
        .mockResolvedValueOnce({ data: newMessage, error: null });

      const messageData = {
        message: 'When will the fitting be ready?',
        messageType: 'TEXT'
      };

      const request = new NextRequest('http://localhost:3000/api/orders/order-123/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      });
      const params = Promise.resolve({ id: 'order-123' });

      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData).toMatchObject({
        messageId: 'msg-new',
        sentAt: expect.any(String),
        deliveredAt: expect.any(String)
      });
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('should create message with media URL', async () => {
      const newMessage = {
        id: 'msg-image',
        sent_at: '2025-08-16T10:00:00Z',
        delivered_at: '2025-08-16T10:00:01Z'
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockOrderWithDetails, error: null })
        .mockResolvedValueOnce({ data: newMessage, error: null });

      const messageData = {
        message: 'Here is the reference image',
        messageType: 'IMAGE',
        mediaUrl: 'https://example.com/image.jpg'
      };

      const request = new NextRequest('http://localhost:3000/api/orders/order-123/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      });
      const params = Promise.resolve({ id: 'order-123' });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          media_url: 'https://example.com/image.jpg',
          message_type: 'IMAGE'
        })
      );
    });

    it('should return 400 for invalid message data', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const invalidMessageData = {
        message: '', // Empty message
        messageType: 'INVALID_TYPE'
      };

      const request = new NextRequest('http://localhost:3000/api/orders/order-123/messages', {
        method: 'POST',
        body: JSON.stringify(invalidMessageData)
      });
      const params = Promise.resolve({ id: 'order-123' });

      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.errors).toBeDefined();
    });

    it('should return 500 when message creation fails', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockOrderWithDetails, error: null })
        .mockResolvedValueOnce({ 
          data: null, 
          error: new Error('Database error') 
        });

      const messageData = {
        message: 'Test message',
        messageType: 'TEXT'
      };

      const request = new NextRequest('http://localhost:3000/api/orders/order-123/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      });
      const params = Promise.resolve({ id: 'order-123' });

      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.errors).toContain('Failed to send message');
    });

    it('should set correct sender information for tailor user', async () => {
      const tailorUser = { id: 'tailor-123', email: 'tailor@test.com' };
      const newMessage = {
        id: 'msg-tailor',
        sent_at: '2025-08-16T10:00:00Z',
        delivered_at: '2025-08-16T10:00:01Z'
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: tailorUser },
        error: null
      });

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockOrderWithDetails, error: null })
        .mockResolvedValueOnce({ data: newMessage, error: null });

      const messageData = {
        message: 'Your fitting is ready!',
        messageType: 'TEXT'
      };

      const request = new NextRequest('http://localhost:3000/api/orders/order-123/messages', {
        method: 'POST',
        body: JSON.stringify(messageData)
      });
      const params = Promise.resolve({ id: 'order-123' });

      const response = await POST(request, { params });

      expect(response.status).toBe(201);
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          sender_type: 'TAILOR',
          sender_name: 'Jane Smith'
        })
      );
    });
  });
});