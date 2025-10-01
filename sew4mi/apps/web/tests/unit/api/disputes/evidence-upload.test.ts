// Unit tests for evidence upload API endpoint
// Story 2.4: Test evidence upload functionality

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/disputes/evidence/upload/route';

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn()
      }))
    })),
    insert: vi.fn()
  })),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(),
      getPublicUrl: vi.fn()
    }))
  }
};

// Mock storage service
const mockUploadToSupabaseStorage = vi.fn();

// Mock modules
vi.mock('@/lib/supabase', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

vi.mock('@/lib/services/storage.service', () => ({
  uploadToSupabaseStorage: mockUploadToSupabaseStorage
}));

// Test data
const validUser = {
  id: 'user-123',
  email: 'test@example.com'
};

const validDispute = {
  id: 'dispute-456',
  created_by: 'user-123',
  order_id: 'order-789',
  orders: {
    customer_id: 'user-123',
    tailor_id: 'tailor-456'
  }
};

const validFileData = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCeABVB';

const validRequestBody = {
  fileName: 'evidence.jpg',
  fileType: 'image/jpeg',
  fileData: validFileData,
  disputeId: 'dispute-456'
};

describe('Evidence Upload API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/disputes/evidence/upload', () => {
    it('should successfully upload evidence file', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: validUser },
        error: null
      });

      // Mock dispute verification
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: validDispute,
              error: null
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      // Mock successful storage upload
      mockUploadToSupabaseStorage.mockResolvedValue({
        success: true,
        publicUrl: 'https://example.com/evidence.jpg',
        path: 'dispute-evidence/dispute-456/123456_evidence.jpg'
      });

      // Mock database operations
      const mockInsert = vi.fn().mockResolvedValue({ error: null });
      (mockSupabase.from as any).mockImplementation((table: string) => {
        if (table === 'dispute_evidence' || table === 'dispute_activities') {
          return { insert: mockInsert };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: validDispute,
                error: null
              })
            })
          })
        };
      });

      // Create request
      const request = new NextRequest('http://localhost/api/disputes/evidence/upload', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      // Call API
      const response = await POST(request);
      const data = await response.json();

      // Assertions
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.url).toBe('https://example.com/evidence.jpg');
      expect(data.fileName).toContain('evidence.jpg');
      expect(data.fileSize).toBeGreaterThan(0);
      expect(data.uploadedAt).toBeDefined();

      // Verify storage upload was called
      expect(mockUploadToSupabaseStorage).toHaveBeenCalledWith({
        bucket: 'dispute-evidence',
        path: expect.stringContaining('evidence.jpg'),
        buffer: expect.any(Buffer),
        contentType: 'image/jpeg',
        options: {
          cacheControl: '3600',
          upsert: false
        }
      });

      // Verify database operations
      expect(mockInsert).toHaveBeenCalledTimes(2); // evidence + activity
    });

    it('should reject unauthorized requests', async () => {
      // Mock unauthenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Unauthorized')
      });

      const request = new NextRequest('http://localhost/api/disputes/evidence/upload', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject invalid file types', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: validUser },
        error: null
      });

      const invalidRequestBody = {
        ...validRequestBody,
        fileType: 'application/exe' // Invalid file type
      };

      const request = new NextRequest('http://localhost/api/disputes/evidence/upload', {
        method: 'POST',
        body: JSON.stringify(invalidRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid request data');
    });

    it('should reject files that are too large', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: validUser },
        error: null
      });

      // Create a large base64 string (simulating >10MB file)
      const largeFileData = 'data:image/jpeg;base64,' + 'A'.repeat(15 * 1024 * 1024); // >10MB in base64

      const largeFileRequestBody = {
        ...validRequestBody,
        fileData: largeFileData
      };

      const request = new NextRequest('http://localhost/api/disputes/evidence/upload', {
        method: 'POST',
        body: JSON.stringify(largeFileRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('File too large');
    });

    it('should reject access to disputes user is not involved in', async () => {
      // Mock authenticated user (different from dispute creator)
      const otherUser = { id: 'other-user', email: 'other@example.com' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: otherUser },
        error: null
      });

      // Mock dispute where user is not involved
      const otherDispute = {
        ...validDispute,
        created_by: 'someone-else',
        orders: {
          customer_id: 'someone-else',
          tailor_id: 'another-person'
        }
      };

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: otherDispute,
              error: null
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      const request = new NextRequest('http://localhost/api/disputes/evidence/upload', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden - not your dispute');
    });

    it('should handle dispute not found', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: validUser },
        error: null
      });

      // Mock dispute not found
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Not found')
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      const request = new NextRequest('http://localhost/api/disputes/evidence/upload', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Dispute not found');
    });

    it('should handle storage upload failures', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: validUser },
        error: null
      });

      // Mock dispute verification
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: validDispute,
              error: null
            })
          })
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      });

      // Mock storage upload failure
      mockUploadToSupabaseStorage.mockRejectedValue(new Error('Storage error'));

      const request = new NextRequest('http://localhost/api/disputes/evidence/upload', {
        method: 'POST',
        body: JSON.stringify(validRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toBe('Failed to upload file to storage');
    });

    it('should handle temporary dispute uploads', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: validUser },
        error: null
      });

      // Mock successful storage upload
      mockUploadToSupabaseStorage.mockResolvedValue({
        success: true,
        publicUrl: 'https://example.com/temp-evidence.jpg',
        path: 'temp-evidence/user-123/123456_evidence.jpg'
      });

      const tempRequestBody = {
        ...validRequestBody,
        disputeId: 'temp' // Temporary dispute ID
      };

      const request = new NextRequest('http://localhost/api/disputes/evidence/upload', {
        method: 'POST',
        body: JSON.stringify(tempRequestBody)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.url).toBe('https://example.com/temp-evidence.jpg');

      // Verify storage upload path for temp files
      expect(mockUploadToSupabaseStorage).toHaveBeenCalledWith({
        bucket: 'dispute-evidence',
        path: expect.stringContaining('temp-evidence/user-123/'),
        buffer: expect.any(Buffer),
        contentType: 'image/jpeg',
        options: {
          cacheControl: '3600',
          upsert: false
        }
      });
    });

    it('should apply rate limiting correctly', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: validUser },
        error: null
      });

      // Make multiple requests rapidly (simulate hitting rate limit)
      const requests = Array.from({ length: 12 }, () => 
        new NextRequest('http://localhost/api/disputes/evidence/upload', {
          method: 'POST',
          body: JSON.stringify({ ...validRequestBody, disputeId: 'temp' })
        })
      );

      // First 10 should work, 11th and 12th should be rate limited
      const responses = await Promise.all(requests.map(req => POST(req)));
      
      // Check that later requests are rate limited
      const rateLimitedResponses = responses.slice(10); // 11th and 12th requests
      for (const response of rateLimitedResponses) {
        expect(response.status).toBe(429);
        const data = await response.json();
        expect(data.error).toContain('Too many upload requests');
      }
    });
  });
});