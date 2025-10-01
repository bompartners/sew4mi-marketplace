/**
 * Unit tests for milestone photo upload API endpoint
 * @file photo-upload.test.ts
 */

import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/milestones/[id]/photos/upload/route';

// Mock the storage service
vi.mock('@/lib/services/storage.service', () => ({
  createStorageService: vi.fn(() => ({
    uploadMilestonePhoto: vi.fn()
  }))
}));

// Mock the image compression utils
vi.mock('@/lib/utils/image-compression', () => ({
  base64ToBuffer: vi.fn((base64: string) => {
    const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    return Buffer.from(cleanBase64, 'base64');
  }),
  validateImageSize: vi.fn(() => true)
}));

describe('Milestone Photo Upload API', () => {
  let mockStorageService: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Get the mocked storage service
    const { createStorageService } = require('@/lib/services/storage.service');
    mockStorageService = createStorageService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/milestones/[id]/photos/upload', () => {
    const validRequestBody = {
      imageData: 'data:image/jpeg;base64,SGVsbG8gV29ybGQ=',
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      notes: 'Test milestone photo'
    };

    test('should handle successful photo upload', async () => {
      // Mock successful upload
      mockStorageService.uploadMilestonePhoto.mockResolvedValue({
        success: true,
        publicUrl: 'https://example.com/photo.jpg',
        cdnUrl: 'https://cdn.example.com/photo.jpg',
        thumbnailUrl: 'https://cdn.example.com/photo_thumb.jpg',
        path: 'order/milestone/photo.jpg',
        uploadedAt: new Date('2024-08-22T10:00:00Z')
      });

      const request = new NextRequest('http://localhost/api/milestones/test-id/photos/upload', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'test-user-id'
        },
        body: JSON.stringify(validRequestBody)
      });

      const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });
      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData).toEqual({
        success: true,
        photoUrl: 'https://example.com/photo.jpg',
        cdnUrl: 'https://cdn.example.com/photo.jpg',
        thumbnailUrl: 'https://cdn.example.com/photo_thumb.jpg',
        uploadedAt: expect.any(String)
      });
    });

    test('should reject invalid milestone ID format', async () => {
      const request = new NextRequest('http://localhost/api/milestones/invalid-id/photos/upload', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'test-user-id'
        },
        body: JSON.stringify(validRequestBody)
      });

      const params = Promise.resolve({ id: 'invalid-id' });
      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Invalid milestone ID format'
      });
    });

    test('should reject requests without authentication', async () => {
      const request = new NextRequest('http://localhost/api/milestones/test-id/photos/upload', {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
          // No x-user-id header
        },
        body: JSON.stringify(validRequestBody)
      });

      const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });
      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData).toEqual({
        error: 'Authentication required'
      });
    });

    test('should validate request body schema', async () => {
      const invalidRequestBody = {
        imageData: '', // Empty image data
        filename: 'test.jpg',
        mimeType: 'image/jpeg'
      };

      const request = new NextRequest('http://localhost/api/milestones/test-id/photos/upload', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'test-user-id'
        },
        body: JSON.stringify(invalidRequestBody)
      });

      const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });
      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('Validation error');
    });

    test('should reject unsupported image formats', async () => {
      const invalidFormatBody = {
        ...validRequestBody,
        mimeType: 'image/gif'
      };

      const request = new NextRequest('http://localhost/api/milestones/test-id/photos/upload', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'test-user-id'
        },
        body: JSON.stringify(invalidFormatBody)
      });

      const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });
      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toContain('Only JPEG, PNG, and WebP images are allowed');
    });

    test('should handle invalid base64 image data', async () => {
      const { base64ToBuffer } = require('@/lib/utils/image-compression');
      base64ToBuffer.mockImplementation(() => {
        throw new Error('Invalid base64');
      });

      const request = new NextRequest('http://localhost/api/milestones/test-id/photos/upload', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'test-user-id'
        },
        body: JSON.stringify(validRequestBody)
      });

      const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });
      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Invalid image data format'
      });
    });

    test('should handle oversized images', async () => {
      const { validateImageSize } = require('@/lib/utils/image-compression');
      validateImageSize.mockReturnValue(false);

      const request = new NextRequest('http://localhost/api/milestones/test-id/photos/upload', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'test-user-id'
        },
        body: JSON.stringify(validRequestBody)
      });

      const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });
      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Image size exceeds 5MB limit'
      });
    });

    test('should handle storage upload failure', async () => {
      mockStorageService.uploadMilestonePhoto.mockResolvedValue({
        success: false,
        error: 'Storage upload failed',
        publicUrl: '',
        cdnUrl: '',
        thumbnailUrl: '',
        path: '',
        uploadedAt: new Date()
      });

      const request = new NextRequest('http://localhost/api/milestones/test-id/photos/upload', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'test-user-id'
        },
        body: JSON.stringify(validRequestBody)
      });

      const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });
      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: 'Storage upload failed'
      });
    });

    test('should enforce rate limiting', async () => {
      const userId = 'rate-limited-user';
      
      // Create multiple requests rapidly
      const requests = Array.from({ length: 12 }, () => 
        new NextRequest('http://localhost/api/milestones/test-id/photos/upload', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-user-id': userId
          },
          body: JSON.stringify(validRequestBody)
        })
      );

      const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });
      
      // Mock successful uploads for the first 10 requests
      mockStorageService.uploadMilestonePhoto.mockResolvedValue({
        success: true,
        publicUrl: 'https://example.com/photo.jpg',
        cdnUrl: 'https://cdn.example.com/photo.jpg',
        thumbnailUrl: 'https://cdn.example.com/photo_thumb.jpg',
        path: 'order/milestone/photo.jpg',
        uploadedAt: new Date()
      });

      // Execute requests sequentially to trigger rate limiting
      const responses = [];
      for (const request of requests) {
        const response = await POST(request, { params });
        responses.push(response);
      }

      // The 11th and 12th requests should be rate limited
      const rateLimitedResponses = responses.slice(10);
      
      for (const response of rateLimitedResponses) {
        expect(response.status).toBe(429);
        const responseData = await response.json();
        expect(responseData).toEqual({
          error: 'Rate limit exceeded. Please try again later.'
        });
      }
    });
  });

  describe('GET /api/milestones/[id]/photos/upload', () => {
    test('should return upload configuration', async () => {
      const request = new NextRequest('http://localhost/api/milestones/test-id/photos/upload');
      const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });
      
      const response = await GET(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        maxFileSize: 5 * 1024 * 1024,
        supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
        rateLimit: {
          maxAttempts: 10,
          windowMs: 60 * 60 * 1000
        },
        compressionSettings: {
          quality: 80,
          maxWidth: 1200,
          maxHeight: 1200
        }
      });
    });

    test('should reject invalid milestone ID in GET request', async () => {
      const request = new NextRequest('http://localhost/api/milestones/invalid-id/photos/upload');
      const params = Promise.resolve({ id: 'invalid-id' });
      
      const response = await GET(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData).toEqual({
        error: 'Invalid milestone ID format'
      });
    });
  });

  describe('Error Handling', () => {
    const validRequestBody = {
      imageData: 'data:image/jpeg;base64,SGVsbG8gV29ybGQ=',
      filename: 'test.jpg',
      mimeType: 'image/jpeg',
      notes: 'Test milestone photo'
    };

    test('should handle internal server errors gracefully', async () => {
      // Mock storage service to throw an error
      mockStorageService.uploadMilestonePhoto.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost/api/milestones/test-id/photos/upload', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'test-user-id'
        },
        body: JSON.stringify(validRequestBody)
      });

      const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });
      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: 'Internal server error'
      });
    });

    test('should handle malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost/api/milestones/test-id/photos/upload', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-user-id': 'test-user-id'
        },
        body: 'invalid json'
      });

      const params = Promise.resolve({ id: '123e4567-e89b-12d3-a456-426614174000' });
      const response = await POST(request, { params });
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData).toEqual({
        error: 'Internal server error'
      });
    });
  });
});