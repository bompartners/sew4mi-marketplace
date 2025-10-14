import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSavedSearches } from '@/hooks/useSavedSearches';
import { SavedSearch, SavedSearchInput, SavedSearchUpdate, SavedSearchMatch } from '@sew4mi/shared';

// Mock fetch
global.fetch = vi.fn();

describe('useSavedSearches', () => {
  const mockSavedSearches: SavedSearch[] = [
    {
      id: 'search-1',
      customerId: 'customer-1',
      name: 'Wedding Tailors in Accra',
      filters: {
        query: 'wedding',
        city: 'Accra',
        occasions: ['Wedding'],
        minRating: 4,
      },
      alertEnabled: true,
      alertFrequency: 'weekly',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastNotifiedAt: null,
    },
    {
      id: 'search-2',
      customerId: 'customer-1',
      name: 'Kente Specialists',
      filters: {
        fabricPreferences: ['Kente'],
        styleCategories: ['traditional'],
      },
      alertEnabled: false,
      alertFrequency: 'daily',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      lastNotifiedAt: '2024-01-03T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Load', () => {
    it('should fetch saved searches on mount', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      const { result } = renderHook(() => useSavedSearches());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.savedSearches).toEqual([]);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.savedSearches).toEqual(mockSavedSearches);
      expect(result.current.error).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith('/api/search/saved');
    });

    it('should handle empty saved searches', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.savedSearches).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle 401 unauthorized gracefully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.savedSearches).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should handle fetch errors', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch saved searches:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Create Saved Search', () => {
    it('should create a new saved search', async () => {
      // Initial load
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newSearch: SavedSearchInput = {
        name: 'New Search',
        filters: {
          query: 'test',
          city: 'Kumasi',
        },
        alertEnabled: true,
        alertFrequency: 'instant',
      };

      const createdSearch: SavedSearch = {
        id: 'search-3',
        customerId: 'customer-1',
        ...newSearch,
        createdAt: '2024-01-03T00:00:00Z',
        updatedAt: '2024-01-03T00:00:00Z',
        lastNotifiedAt: null,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => createdSearch,
      });

      let savedSearch: SavedSearch | undefined;
      await act(async () => {
        savedSearch = await result.current.createSavedSearch(newSearch);
      });

      expect(savedSearch).toEqual(createdSearch);
      expect(result.current.savedSearches).toContainEqual(createdSearch);
      expect(global.fetch).toHaveBeenCalledWith('/api/search/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSearch),
      });
    });

    it('should handle create errors', async () => {
      // Initial load
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newSearch: SavedSearchInput = {
        name: 'New Search',
        filters: {},
        alertEnabled: false,
        alertFrequency: 'weekly',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Maximum saved searches reached' }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        act(async () => {
          await result.current.createSavedSearch(newSearch);
        })
      ).rejects.toThrow('Maximum saved searches reached');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to create saved search:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Update Saved Search', () => {
    it('should update an existing saved search', async () => {
      // Initial load
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const update: SavedSearchUpdate = {
        name: 'Updated Name',
        alertEnabled: false,
        alertFrequency: 'instant',
      };

      const updatedSearch: SavedSearch = {
        ...mockSavedSearches[0],
        ...update,
        updatedAt: '2024-01-04T00:00:00Z',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedSearch,
      });

      let returnedSearch: SavedSearch | undefined;
      await act(async () => {
        returnedSearch = await result.current.updateSavedSearch('search-1', update);
      });

      expect(returnedSearch).toEqual(updatedSearch);
      expect(result.current.savedSearches.find(s => s.id === 'search-1')).toEqual(updatedSearch);
      expect(global.fetch).toHaveBeenCalledWith('/api/search/saved/search-1', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });
    });

    it('should handle update errors', async () => {
      // Initial load
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const update: SavedSearchUpdate = {
        name: 'Updated Name',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Saved search not found' }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        act(async () => {
          await result.current.updateSavedSearch('search-1', update);
        })
      ).rejects.toThrow('Saved search not found');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to update saved search:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Delete Saved Search', () => {
    it('should delete a saved search', async () => {
      // Initial load
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.savedSearches).toHaveLength(2);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
      });

      await act(async () => {
        await result.current.deleteSavedSearch('search-1');
      });

      expect(result.current.savedSearches).toHaveLength(1);
      expect(result.current.savedSearches.find(s => s.id === 'search-1')).toBeUndefined();
      expect(global.fetch).toHaveBeenCalledWith('/api/search/saved/search-1', {
        method: 'DELETE',
      });
    });

    it('should handle delete errors', async () => {
      // Initial load
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        act(async () => {
          await result.current.deleteSavedSearch('search-1');
        })
      ).rejects.toThrow('HTTP 500');

      // Search should not be removed on error
      expect(result.current.savedSearches).toHaveLength(2);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to delete saved search:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Check Matches', () => {
    it('should check for new matches', async () => {
      // Initial load
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const mockMatches: SavedSearchMatch[] = [
        {
          tailorId: 'tailor-1',
          tailorName: 'Test Tailor',
          matchedAt: '2024-01-04T00:00:00Z',
        },
      ];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ matches: mockMatches }),
      });

      let matches: SavedSearchMatch[] | undefined;
      await act(async () => {
        matches = await result.current.checkMatches('search-1');
      });

      expect(matches).toEqual(mockMatches);
      expect(global.fetch).toHaveBeenCalledWith('/api/search/saved/search-1/check');
    });

    it('should check matches with since parameter', async () => {
      // Initial load
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const since = new Date('2024-01-03T00:00:00Z');
      const mockMatches: SavedSearchMatch[] = [];

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ matches: mockMatches }),
      });

      let matches: SavedSearchMatch[] | undefined;
      await act(async () => {
        matches = await result.current.checkMatches('search-1', since);
      });

      expect(matches).toEqual(mockMatches);
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/search/saved/search-1/check?since=${since.toISOString()}`
      );
    });

    it('should handle check matches errors', async () => {
      // Initial load
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(
        act(async () => {
          await result.current.checkMatches('search-1');
        })
      ).rejects.toThrow('HTTP 404');

      expect(consoleSpy).toHaveBeenCalledWith('Failed to check matches:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Get Saved Search By ID', () => {
    it('should return a saved search by ID', async () => {
      // Initial load
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const search = result.current.getSavedSearchById('search-1');
      expect(search).toEqual(mockSavedSearches[0]);
    });

    it('should return undefined for non-existent ID', async () => {
      // Initial load
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const search = result.current.getSavedSearchById('non-existent');
      expect(search).toBeUndefined();
    });
  });

  describe('Refetch', () => {
    it('should refetch saved searches', async () => {
      // Initial load
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches.slice(0, 1),
      });

      const { result } = renderHook(() => useSavedSearches());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.savedSearches).toHaveLength(1);

      // Refetch with more data
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSavedSearches,
      });

      await act(async () => {
        result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.savedSearches).toHaveLength(2);
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});