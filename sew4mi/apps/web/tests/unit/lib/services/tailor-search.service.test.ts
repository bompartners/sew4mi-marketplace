import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TailorSearchService } from '@/lib/services/tailor-search.service';
// import { TailorSearchRepository } from '@/lib/repositories/tailor-search.repository'; // Removed unused import
import {
  TailorSearchFilters,
  TailorSearchResult,
  AutocompleteResult,
  SEARCH_CONFIG,
} from '@sew4mi/shared';

// Mock the repository
vi.mock('@/lib/repositories/tailor-search.repository');
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('TailorSearchService', () => {
  let searchService: TailorSearchService;
  let mockRepository: {
    searchTailors: ReturnType<typeof vi.fn>;
    getAutocomplete: ReturnType<typeof vi.fn>;
    getFeaturedTailors: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRepository = {
      searchTailors: vi.fn(),
      getAutocomplete: vi.fn(),
      getFeaturedTailors: vi.fn(),
    };
    searchService = new TailorSearchService();
    (searchService as any).searchRepository = mockRepository;
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('searchTailors', () => {
    it('should successfully search tailors with basic filters', async () => {
      const filters: TailorSearchFilters = {
        query: 'kente',
        city: 'Accra',
        minRating: 4.0,
      };

      const mockResult: TailorSearchResult = {
        tailors: [
          {
            id: '123',
            businessName: 'Kente Masters',
            city: 'Accra',
            rating: 4.5,
            specializations: ['Kente Weaving'],
          } as any,
        ],
        hasMore: false,
        total: 1,
        searchMeta: {
          query: 'kente',
          appliedFilters: ['query', 'city', 'minRating'],
          searchTime: 100,
        },
      };

      mockRepository.searchTailors.mockResolvedValue(mockResult);

      const result = await searchService.searchTailors(filters, 'user-123', 'session-456');

      expect(result).toEqual(mockResult);
      expect(mockRepository.searchTailors).toHaveBeenCalledWith(filters, 'user-123');
    });

    it('should validate search filters and throw error for invalid data', async () => {
      const invalidFilters: any = {
        minRating: 10, // Invalid: rating > 5
        maxPrice: -100, // Invalid: negative price
      };

      await expect(
        searchService.searchTailors(invalidFilters)
      ).rejects.toThrow('minRating must be between 0 and 5');
    });

    it('should enforce maximum limit', async () => {
      const filters: TailorSearchFilters = {
        limit: SEARCH_CONFIG.MAX_LIMIT + 1,
      };

      await expect(
        searchService.searchTailors(filters)
      ).rejects.toThrow(`Limit cannot exceed ${SEARCH_CONFIG.MAX_LIMIT}`);
    });

    it('should cache search results', async () => {
      const filters: TailorSearchFilters = { city: 'Kumasi' };
      const mockResult: TailorSearchResult = {
        tailors: [],
        hasMore: false,
        total: 0,
      };

      mockRepository.searchTailors.mockResolvedValue(mockResult);

      // First call
      await searchService.searchTailors(filters);
      // Second call should use cache
      await searchService.searchTailors(filters);

      expect(mockRepository.searchTailors).toHaveBeenCalledTimes(1);
    });

    it('should validate price range consistency', async () => {
      const filters: TailorSearchFilters = {
        minPrice: 500,
        maxPrice: 100, // Invalid: min > max
      };

      await expect(
        searchService.searchTailors(filters)
      ).rejects.toThrow('minPrice cannot be greater than maxPrice');
    });

    it('should validate search radius', async () => {
      const filters: TailorSearchFilters = {
        location: {
          lat: 5.6037,
          lng: -0.1870,
          radius: SEARCH_CONFIG.MAX_RADIUS_KM + 1,
        },
      };

      await expect(
        searchService.searchTailors(filters)
      ).rejects.toThrow(`Search radius cannot exceed ${SEARCH_CONFIG.MAX_RADIUS_KM}km`);
    });
  });

  describe('getAutocomplete', () => {
    it('should return autocomplete suggestions', async () => {
      const mockResult: AutocompleteResult = {
        suggestions: [
          {
            id: 'tailor_kente',
            text: 'Kente Masters',
            type: 'tailor',
          },
        ],
        categories: {
          tailors: [],
          specializations: [],
          locations: [],
        },
      };

      mockRepository.getAutocomplete.mockResolvedValue(mockResult);

      const result = await searchService.getAutocomplete('kente');

      expect(result).toEqual(mockResult);
      expect(mockRepository.getAutocomplete).toHaveBeenCalledWith('kente', 10);
    });

    it('should return empty results for short queries', async () => {
      const result = await searchService.getAutocomplete('k');

      expect(result.suggestions).toEqual([]);
      expect(mockRepository.getAutocomplete).not.toHaveBeenCalled();
    });

    it('should cache autocomplete results', async () => {
      const mockResult: AutocompleteResult = {
        suggestions: [],
        categories: { tailors: [], specializations: [], locations: [] },
      };

      mockRepository.getAutocomplete.mockResolvedValue(mockResult);

      // First call
      await searchService.getAutocomplete('kente');
      // Second call should use cache
      await searchService.getAutocomplete('kente');

      expect(mockRepository.getAutocomplete).toHaveBeenCalledTimes(1);
    });

    it('should handle autocomplete errors gracefully', async () => {
      mockRepository.getAutocomplete.mockRejectedValue(new Error('Database error'));

      const result = await searchService.getAutocomplete('kente');

      expect(result.suggestions).toEqual([]);
      expect(result.categories.tailors).toEqual([]);
    });
  });

  describe('getFeaturedTailors', () => {
    it('should return featured tailors', async () => {
      const mockFeatured = [
        {
          id: '123',
          businessName: 'Featured Tailor',
          featuredReason: 'HIGH_RATING' as const,
        } as any,
      ];

      mockRepository.getFeaturedTailors.mockResolvedValue(mockFeatured);

      const result = await searchService.getFeaturedTailors();

      expect(result).toEqual(mockFeatured);
      expect(mockRepository.getFeaturedTailors).toHaveBeenCalledWith({});
    });

    it('should apply filters to featured tailors', async () => {
      const filters = {
        city: 'Accra',
        specializations: ['Kente Weaving'],
        limit: 3,
      };

      mockRepository.getFeaturedTailors.mockResolvedValue([]);

      await searchService.getFeaturedTailors(filters);

      expect(mockRepository.getFeaturedTailors).toHaveBeenCalledWith(filters);
    });

    it('should handle featured tailors errors gracefully', async () => {
      mockRepository.getFeaturedTailors.mockRejectedValue(new Error('Database error'));

      const result = await searchService.getFeaturedTailors();

      expect(result).toEqual([]);
    });
  });

  describe('service functionality', () => {
    it('should handle service operations without errors', () => {
      // Test that basic service operations work
      expect(searchService).toBeDefined();
      expect(typeof searchService.searchTailors).toBe('function');
      expect(typeof searchService.getAutocomplete).toBe('function');
      expect(typeof searchService.getFeaturedTailors).toBe('function');
    });
  });
});