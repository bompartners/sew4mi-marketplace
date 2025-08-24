import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/tailors/search/route';
import { TailorSearchService } from '@/lib/services/tailor-search.service';
import { createClient } from '@/lib/supabase/server';

// Mock dependencies
vi.mock('@/lib/services/tailor-search.service');
vi.mock('@/lib/supabase/server');

describe('/api/tailors/search', () => {
  let mockSearchService: jest.Mocked<TailorSearchService>;
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock search service
    mockSearchService = {
      searchTailors: vi.fn(),
    } as any;
    
    // Mock supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
    };

    (createClient as any).mockReturnValue(mockSupabase);
    (TailorSearchService as any).mockImplementation(() => mockSearchService);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('GET', () => {
    it('should successfully search tailors with valid parameters', async () => {
      // Mock authenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      // Mock search result
      const mockResult = {
        tailors: [
          {
            id: 'tailor-1',
            businessName: 'Test Tailor',
            city: 'Accra',
            rating: 4.5,
          },
        ],
        hasMore: false,
        total: 1,
        searchMeta: {
          query: 'kente',
          appliedFilters: ['query', 'city'],
          searchTime: 50,
        },
      };

      mockSearchService.searchTailors.mockResolvedValue(mockResult);

      // Create request with search parameters
      const url = 'http://localhost:3000/api/tailors/search?query=kente&city=Accra&minRating=4.0';
      const request = new NextRequest(url);

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockResult);
      expect(mockSearchService.searchTailors).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'kente',
          city: 'Accra',
          minRating: 4.0,
        }),
        'user-123',
        expect.any(String)
      );
    });

    it('should handle unauthenticated users', async () => {
      // Mock unauthenticated user
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const mockResult = {
        tailors: [],
        hasMore: false,
        total: 0,
      };

      mockSearchService.searchTailors.mockResolvedValue(mockResult);

      const url = 'http://localhost:3000/api/tailors/search?query=tailor';
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockSearchService.searchTailors).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'tailor' }),
        undefined,
        expect.any(String)
      );
    });

    it('should parse array parameters correctly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      mockSearchService.searchTailors.mockResolvedValue({
        tailors: [],
        hasMore: false,
        total: 0,
      });

      const url = 'http://localhost:3000/api/tailors/search?specializations=Kente Weaving,Wedding Dresses&verified=true';
      const request = new NextRequest(url);

      await GET(request);

      expect(mockSearchService.searchTailors).toHaveBeenCalledWith(
        expect.objectContaining({
          specializations: ['Kente Weaving', 'Wedding Dresses'],
          verified: true,
        }),
        undefined,
        expect.any(String)
      );
    });

    it('should parse location parameters correctly', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      mockSearchService.searchTailors.mockResolvedValue({
        tailors: [],
        hasMore: false,
        total: 0,
      });

      const url = 'http://localhost:3000/api/tailors/search?lat=5.6037&lng=-0.1870&radius=25';
      const request = new NextRequest(url);

      await GET(request);

      expect(mockSearchService.searchTailors).toHaveBeenCalledWith(
        expect.objectContaining({
          location: {
            lat: 5.6037,
            lng: -0.1870,
            radius: 25,
          },
        }),
        undefined,
        expect.any(String)
      );
    });

    it('should return 400 for invalid parameters', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      // Invalid rating value
      const url = 'http://localhost:3000/api/tailors/search?minRating=10';
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid search parameters');
    });

    it('should handle search service errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      mockSearchService.searchTailors.mockRejectedValue(new Error('Database connection failed'));

      const url = 'http://localhost:3000/api/tailors/search?query=test';
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Database connection failed');
    });

    it('should apply rate limiting', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const url = 'http://localhost:3000/api/tailors/search?query=test';

      // Make 101 requests rapidly to exceed rate limit
      const requests = Array.from({ length: 101 }, () => new NextRequest(url));
      
      let rateLimitedCount = 0;
      
      for (const request of requests) {
        const response = await GET(request);
        if (response.status === 429) {
          rateLimitedCount++;
        }
      }

      expect(rateLimitedCount).toBeGreaterThan(0);
    });

    it('should set appropriate cache headers', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      mockSearchService.searchTailors.mockResolvedValue({
        tailors: [],
        hasMore: false,
        total: 0,
      });

      const url = 'http://localhost:3000/api/tailors/search?query=test';
      const request = new NextRequest(url);

      const response = await GET(request);

      expect(response.headers.get('Cache-Control')).toContain('public');
      expect(response.headers.get('Cache-Control')).toContain('s-maxage=300');
      expect(response.headers.get('X-Session-ID')).toBeDefined();
    });

    it('should generate session ID when not provided', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      mockSearchService.searchTailors.mockResolvedValue({
        tailors: [],
        hasMore: false,
        total: 0,
      });

      const url = 'http://localhost:3000/api/tailors/search?query=test';
      const request = new NextRequest(url);

      await GET(request);

      expect(mockSearchService.searchTailors).toHaveBeenCalledWith(
        expect.any(Object),
        undefined,
        expect.stringMatching(/^session-\d+-[a-z0-9]+$/)
      );
    });

    it('should use provided session ID from header', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      mockSearchService.searchTailors.mockResolvedValue({
        tailors: [],
        hasMore: false,
        total: 0,
      });

      const url = 'http://localhost:3000/api/tailors/search?query=test';
      const request = new NextRequest(url, {
        headers: {
          'x-session-id': 'custom-session-123',
        },
      });

      await GET(request);

      expect(mockSearchService.searchTailors).toHaveBeenCalledWith(
        expect.any(Object),
        undefined,
        'custom-session-123'
      );
    });
  });
});