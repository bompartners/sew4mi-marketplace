import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST as postSaveSearch } from '@/app/api/search/save/route';
import { GET as getSavedSearches } from '@/app/api/search/saved/route';
import { PUT as putSavedSearch, DELETE as deleteSavedSearch } from '@/app/api/search/saved/[id]/route';
import { GET as checkMatches } from '@/app/api/search/saved/[id]/check/route';
import { createClient } from '@/lib/supabase';
import { savedSearchService } from '@/lib/services/saved-search.service';
import { SavedSearchInput, SavedSearchUpdate, SavedSearch, SavedSearchMatch } from '@sew4mi/shared';

// Mock dependencies
vi.mock('@/lib/supabase');
vi.mock('@/lib/services/saved-search.service', () => ({
  savedSearchService: {
    saveSearch: vi.fn(),
    getSavedSearches: vi.fn(),
    getSavedSearchById: vi.fn(),
    updateSavedSearch: vi.fn(),
    deleteSavedSearch: vi.fn(),
    checkSavedSearchMatches: vi.fn(),
  },
}));

describe('Saved Search API Endpoints', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
    };

    (createClient as any).mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/search/save', () => {
    it('should save a new search for authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const input: SavedSearchInput = {
        name: 'Wedding Tailors',
        filters: {
          query: 'wedding',
          city: 'Accra',
          occasions: ['Wedding'],
        },
        alertEnabled: true,
        alertFrequency: 'weekly',
      };

      const savedSearch: SavedSearch = {
        id: 'search-1',
        customerId: 'user-123',
        ...input,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastNotifiedAt: null,
      };

      (savedSearchService.saveSearch as any).mockResolvedValue(savedSearch);

      const request = new NextRequest('http://localhost:3000/api/search/save', {
        method: 'POST',
        body: JSON.stringify(input),
      });

      const response = await postSaveSearch(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(savedSearch);
      expect(savedSearchService.saveSearch).toHaveBeenCalledWith('user-123', input);
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const input: SavedSearchInput = {
        name: 'Test Search',
        filters: {},
        alertEnabled: false,
        alertFrequency: 'daily',
      };

      const request = new NextRequest('http://localhost:3000/api/search/save', {
        method: 'POST',
        body: JSON.stringify(input),
      });

      const response = await postSaveSearch(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
      expect(savedSearchService.saveSearch).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid input', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const invalidInput = {
        // Missing required fields
        filters: {},
      };

      const request = new NextRequest('http://localhost:3000/api/search/save', {
        method: 'POST',
        body: JSON.stringify(invalidInput),
      });

      const response = await postSaveSearch(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
      expect(data.details).toBeDefined();
    });

    it('should handle service errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const input: SavedSearchInput = {
        name: 'Test Search',
        filters: {},
        alertEnabled: false,
        alertFrequency: 'weekly',
      };

      (savedSearchService.saveSearch as any).mockRejectedValue(
        new Error('Maximum saved searches reached')
      );

      const request = new NextRequest('http://localhost:3000/api/search/save', {
        method: 'POST',
        body: JSON.stringify(input),
      });

      const response = await postSaveSearch(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Maximum saved searches reached');
    });
  });

  describe('GET /api/search/saved', () => {
    it('should return saved searches for authenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const savedSearches: SavedSearch[] = [
        {
          id: 'search-1',
          customerId: 'user-123',
          name: 'Test Search 1',
          filters: {},
          alertEnabled: true,
          alertFrequency: 'weekly',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          lastNotifiedAt: null,
        },
        {
          id: 'search-2',
          customerId: 'user-123',
          name: 'Test Search 2',
          filters: {},
          alertEnabled: false,
          alertFrequency: 'daily',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
          lastNotifiedAt: null,
        },
      ];

      (savedSearchService.getSavedSearches as any).mockResolvedValue(savedSearches);

      const request = new NextRequest('http://localhost:3000/api/search/saved');
      const response = await getSavedSearches(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(savedSearches);
      expect(savedSearchService.getSavedSearches).toHaveBeenCalledWith('user-123');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const request = new NextRequest('http://localhost:3000/api/search/saved');
      const response = await getSavedSearches(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should handle service errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      (savedSearchService.getSavedSearches as any).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/search/saved');
      const response = await getSavedSearches(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('PUT /api/search/saved/[id]', () => {
    it('should update a saved search', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const update: SavedSearchUpdate = {
        name: 'Updated Name',
        alertEnabled: false,
        alertFrequency: 'instant',
      };

      const updatedSearch: SavedSearch = {
        id: 'search-1',
        customerId: 'user-123',
        name: 'Updated Name',
        filters: {},
        alertEnabled: false,
        alertFrequency: 'instant',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        lastNotifiedAt: null,
      };

      (savedSearchService.updateSavedSearch as any).mockResolvedValue(updatedSearch);

      const request = new NextRequest('http://localhost:3000/api/search/saved/search-1', {
        method: 'PUT',
        body: JSON.stringify(update),
      });

      const params = Promise.resolve({ id: 'search-1' });
      const response = await putSavedSearch(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(updatedSearch);
      expect(savedSearchService.updateSavedSearch).toHaveBeenCalledWith(
        'search-1',
        'user-123',
        update
      );
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const update: SavedSearchUpdate = {
        name: 'Updated Name',
      };

      const request = new NextRequest('http://localhost:3000/api/search/saved/search-1', {
        method: 'PUT',
        body: JSON.stringify(update),
      });

      const params = Promise.resolve({ id: 'search-1' });
      const response = await putSavedSearch(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 400 for invalid input', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const invalidUpdate = {
        alertFrequency: 'invalid-frequency',
      };

      const request = new NextRequest('http://localhost:3000/api/search/saved/search-1', {
        method: 'PUT',
        body: JSON.stringify(invalidUpdate),
      });

      const params = Promise.resolve({ id: 'search-1' });
      const response = await putSavedSearch(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
      expect(data.details).toBeDefined();
    });

    it('should handle service errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const update: SavedSearchUpdate = {
        name: 'Updated Name',
      };

      (savedSearchService.updateSavedSearch as any).mockRejectedValue(
        new Error('Saved search not found')
      );

      const request = new NextRequest('http://localhost:3000/api/search/saved/search-1', {
        method: 'PUT',
        body: JSON.stringify(update),
      });

      const params = Promise.resolve({ id: 'search-1' });
      const response = await putSavedSearch(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Saved search not found');
    });
  });

  describe('DELETE /api/search/saved/[id]', () => {
    it('should delete a saved search', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      (savedSearchService.deleteSavedSearch as any).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/search/saved/search-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: 'search-1' });
      const response = await deleteSavedSearch(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(savedSearchService.deleteSavedSearch).toHaveBeenCalledWith('search-1', 'user-123');
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const request = new NextRequest('http://localhost:3000/api/search/saved/search-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: 'search-1' });
      const response = await deleteSavedSearch(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 404 when search not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      (savedSearchService.deleteSavedSearch as any).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/search/saved/search-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: 'search-1' });
      const response = await deleteSavedSearch(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Saved search not found');
    });

    it('should handle service errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      (savedSearchService.deleteSavedSearch as any).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/search/saved/search-1', {
        method: 'DELETE',
      });

      const params = Promise.resolve({ id: 'search-1' });
      const response = await deleteSavedSearch(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('GET /api/search/saved/[id]/check', () => {
    it('should check for new matches', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const savedSearch: SavedSearch = {
        id: 'search-1',
        customerId: 'user-123',
        name: 'Test Search',
        filters: {},
        alertEnabled: true,
        alertFrequency: 'weekly',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastNotifiedAt: '2024-01-05T00:00:00Z',
      };

      const matches: SavedSearchMatch[] = [
        {
          tailorId: 'tailor-1',
          tailorName: 'Test Tailor',
          matchedAt: '2024-01-06T00:00:00Z',
        },
      ];

      (savedSearchService.getSavedSearchById as any).mockResolvedValue(savedSearch);
      (savedSearchService.checkSavedSearchMatches as any).mockResolvedValue(matches);

      const request = new NextRequest('http://localhost:3000/api/search/saved/search-1/check');
      const params = Promise.resolve({ id: 'search-1' });
      const response = await checkMatches(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.savedSearchId).toBe('search-1');
      expect(data.matchCount).toBe(1);
      expect(data.matches).toEqual(matches);
      expect(savedSearchService.checkSavedSearchMatches).toHaveBeenCalledWith(
        'search-1',
        undefined
      );
    });

    it('should check matches with since parameter', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const savedSearch: SavedSearch = {
        id: 'search-1',
        customerId: 'user-123',
        name: 'Test Search',
        filters: {},
        alertEnabled: true,
        alertFrequency: 'weekly',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastNotifiedAt: null,
      };

      const matches: SavedSearchMatch[] = [];

      (savedSearchService.getSavedSearchById as any).mockResolvedValue(savedSearch);
      (savedSearchService.checkSavedSearchMatches as any).mockResolvedValue(matches);

      const since = '2024-01-05T00:00:00Z';
      const request = new NextRequest(
        `http://localhost:3000/api/search/saved/search-1/check?since=${since}`
      );
      const params = Promise.resolve({ id: 'search-1' });
      const response = await checkMatches(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.matchCount).toBe(0);
      expect(data.matches).toEqual(matches);
      expect(savedSearchService.checkSavedSearchMatches).toHaveBeenCalledWith(
        'search-1',
        new Date(since)
      );
    });

    it('should return 401 for unauthenticated user', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
      });

      const request = new NextRequest('http://localhost:3000/api/search/saved/search-1/check');
      const params = Promise.resolve({ id: 'search-1' });
      const response = await checkMatches(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Authentication required');
    });

    it('should return 404 when search not found', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      (savedSearchService.getSavedSearchById as any).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/search/saved/search-1/check');
      const params = Promise.resolve({ id: 'search-1' });
      const response = await checkMatches(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Saved search not found');
    });

    it('should handle service errors', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
      });

      const savedSearch: SavedSearch = {
        id: 'search-1',
        customerId: 'user-123',
        name: 'Test Search',
        filters: {},
        alertEnabled: true,
        alertFrequency: 'weekly',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastNotifiedAt: null,
      };

      (savedSearchService.getSavedSearchById as any).mockResolvedValue(savedSearch);
      (savedSearchService.checkSavedSearchMatches as any).mockRejectedValue(
        new Error('Database error')
      );

      const request = new NextRequest('http://localhost:3000/api/search/saved/search-1/check');
      const params = Promise.resolve({ id: 'search-1' });
      const response = await checkMatches(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});