/**
 * Unit tests for Recommendations API Route with caching
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GET } from '@/app/api/recommendations/route';
import { invalidateRecommendationsCache } from '@/lib/utils/cache/recommendations-cache';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/supabase');
vi.mock('@/lib/services/recommendation-engine.service');
vi.mock('@/lib/services/cache.service');

import { createServerSupabaseClient } from '@/lib/supabase';
import { recommendationEngineService } from '@/lib/services/recommendation-engine.service';
import { createCacheService } from '@/lib/services/cache.service';

describe('Recommendations API Route', () => {
  let mockSupabase: any;
  let mockCacheService: any;
  const mockUserId = 'user-test-123';

  const mockRecommendationsResponse = {
    recommendations: [
      {
        id: 'rec-1',
        type: 'garment',
        itemId: 'suit',
        score: 85,
        reason: 'Popular choice based on your history',
        metadata: { garmentType: 'suit' },
      },
    ],
    analytics: {
      userId: mockUserId,
      garmentTypeFrequency: { suit: 5 },
      fabricPreferences: { wool: 3 },
      colorPreferences: { navy: 4 },
      avgOrderValue: 500,
      preferredTailors: ['tailor-1'],
      seasonalPatterns: {},
      lastUpdated: new Date(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase auth
    mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: mockUserId } },
          error: null,
        }),
      },
    };
    vi.mocked(createServerSupabaseClient).mockResolvedValue(mockSupabase);

    // Mock cache service
    mockCacheService = {
      get: vi.fn().mockResolvedValue(null), // Default: cache miss
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(createCacheService).mockReturnValue(mockCacheService);

    // Mock recommendation engine
    vi.mocked(recommendationEngineService.getRecommendations).mockResolvedValue(
      mockRecommendationsResponse
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/recommendations', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/recommendations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return cached recommendations on cache hit', async () => {
      // Mock cache hit
      mockCacheService.get.mockResolvedValue(mockRecommendationsResponse);

      const request = new NextRequest('http://localhost:3000/api/recommendations?type=garment&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cached).toBe(true);
      expect(data.recommendations).toEqual(mockRecommendationsResponse.recommendations);
      expect(response.headers.get('X-Cache')).toBe('HIT');

      // Should not call recommendation engine on cache hit
      expect(recommendationEngineService.getRecommendations).not.toHaveBeenCalled();
    });

    it('should compute and cache recommendations on cache miss', async () => {
      // Mock cache miss (already default in beforeEach)
      const request = new NextRequest('http://localhost:3000/api/recommendations?type=garment&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.cached).toBe(false);
      expect(data.recommendations).toEqual(mockRecommendationsResponse.recommendations);
      expect(response.headers.get('X-Cache')).toBe('MISS');

      // Should call recommendation engine
      expect(recommendationEngineService.getRecommendations).toHaveBeenCalledWith(mockUserId, {
        type: 'garment',
        limit: 10,
      });

      // Should cache the result
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `recommendations:${mockUserId}:garment:10`,
        mockRecommendationsResponse,
        3600 // 1 hour TTL
      );
    });

    it('should generate correct cache key for different parameters', async () => {
      const scenarios = [
        { url: '?type=garment&limit=10', expectedKey: `recommendations:${mockUserId}:garment:10` },
        { url: '?type=tailor&limit=20', expectedKey: `recommendations:${mockUserId}:tailor:20` },
        { url: '?limit=5', expectedKey: `recommendations:${mockUserId}:all:5` },
        { url: '', expectedKey: `recommendations:${mockUserId}:all:10` },
      ];

      for (const scenario of scenarios) {
        vi.clearAllMocks();
        const request = new NextRequest(`http://localhost:3000/api/recommendations${scenario.url}`);
        await GET(request);

        expect(mockCacheService.get).toHaveBeenCalledWith(scenario.expectedKey);
      }
    });

    it('should validate recommendation type parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations?type=invalid');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid type');
    });

    it('should validate limit parameter range', async () => {
      const invalidLimits = [0, 51, -1, 100];

      for (const limit of invalidLimits) {
        const request = new NextRequest(`http://localhost:3000/api/recommendations?limit=${limit}`);
        const response = await GET(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toContain('Limit must be between 1 and 50');
      }
    });

    it('should handle recommendation engine errors gracefully', async () => {
      vi.mocked(recommendationEngineService.getRecommendations).mockRejectedValue(
        new Error('Database connection failed')
      );

      const request = new NextRequest('http://localhost:3000/api/recommendations');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });

    it('should set appropriate cache control headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations');
      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toBe('private, max-age=3600');
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate all cache keys for a user', async () => {
      await invalidateRecommendationsCache(mockUserId);

      // Should delete cache keys for all type and limit combinations
      const expectedCalls = 4 * 4; // 4 types × 4 limits
      expect(mockCacheService.delete).toHaveBeenCalledTimes(expectedCalls);

      // Verify some specific cache key deletions
      expect(mockCacheService.delete).toHaveBeenCalledWith(`recommendations:${mockUserId}:all:10`);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`recommendations:${mockUserId}:garment:10`);
      expect(mockCacheService.delete).toHaveBeenCalledWith(`recommendations:${mockUserId}:tailor:20`);
    });

    it('should handle cache invalidation errors gracefully', async () => {
      mockCacheService.delete.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw
      await expect(invalidateRecommendationsCache(mockUserId)).resolves.not.toThrow();
    });
  });

  describe('Integration with Cache Service', () => {
    it('should work with in-memory cache in development', async () => {
      const request = new NextRequest('http://localhost:3000/api/recommendations?type=garment');

      // First call - cache miss
      const response1 = await GET(request);
      const data1 = await response1.json();
      expect(data1.cached).toBe(false);

      // Mock cache hit for second call
      mockCacheService.get.mockResolvedValue(mockRecommendationsResponse);

      // Second call - cache hit
      const response2 = await GET(request);
      const data2 = await response2.json();
      expect(data2.cached).toBe(true);
    });

    it('should continue working if cache service fails', async () => {
      // Mock cache service failure
      mockCacheService.get.mockRejectedValue(new Error('Cache unavailable'));
      mockCacheService.set.mockRejectedValue(new Error('Cache unavailable'));

      const request = new NextRequest('http://localhost:3000/api/recommendations');
      const response = await GET(request);

      // Should still return recommendations
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.recommendations).toEqual(mockRecommendationsResponse.recommendations);
    });
  });
});
