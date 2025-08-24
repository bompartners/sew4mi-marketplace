import { describe, it, expect, beforeEach, afterEach, vi, type MockedObject } from 'vitest';
import { FavoritesService } from '@/lib/services/favorites.service';
import { FavoritesRepository } from '@/lib/repositories/favorites.repository';
import { CustomerFavorite, TailorSearchItem } from '@sew4mi/shared';

// Mock the repository
vi.mock('@/lib/repositories/favorites.repository');

describe('FavoritesService', () => {
  let favoritesService: FavoritesService;
  let mockRepository: MockedObject<FavoritesRepository>;

  const mockCustomerId = 'customer-123';
  const mockTailorId = 'tailor-456';

  beforeEach(() => {
    vi.clearAllMocks();
    favoritesService = new FavoritesService();
    mockRepository = new FavoritesRepository() as MockedObject<FavoritesRepository>;
    (favoritesService as any).favoritesRepository = mockRepository;
  });

  afterEach(() => {
    favoritesService.clearCache();
  });

  describe('addFavorite', () => {
    it('should successfully add a favorite', async () => {
      const mockFavorite: CustomerFavorite = {
        id: 'fav-123',
        customerId: mockCustomerId,
        tailorId: mockTailorId,
        createdAt: new Date().toISOString(),
      };

      mockRepository.addFavorite.mockResolvedValue(mockFavorite);

      const result = await favoritesService.addFavorite(mockCustomerId, mockTailorId);

      expect(result).toEqual(mockFavorite);
      expect(mockRepository.addFavorite).toHaveBeenCalledWith(mockCustomerId, mockTailorId);
    });

    it('should throw error for missing customer ID', async () => {
      await expect(
        favoritesService.addFavorite('', mockTailorId)
      ).rejects.toThrow('Customer ID and Tailor ID are required');
    });

    it('should throw error for missing tailor ID', async () => {
      await expect(
        favoritesService.addFavorite(mockCustomerId, '')
      ).rejects.toThrow('Customer ID and Tailor ID are required');
    });

    it('should clear user cache after adding favorite', async () => {
      const mockFavorite: CustomerFavorite = {
        id: 'fav-123',
        customerId: mockCustomerId,
        tailorId: mockTailorId,
        createdAt: new Date().toISOString(),
      };

      mockRepository.addFavorite.mockResolvedValue(mockFavorite);

      // Set some cache first
      (favoritesService as any).setCache(`favorites:${mockCustomerId}:1:20`, { test: 'data' });

      await favoritesService.addFavorite(mockCustomerId, mockTailorId);

      // Cache should be cleared
      const cached = (favoritesService as any).getFromCache(`favorites:${mockCustomerId}:1:20`);
      expect(cached).toBeNull();
    });
  });

  describe('removeFavorite', () => {
    it('should successfully remove a favorite', async () => {
      mockRepository.removeFavorite.mockResolvedValue();

      await expect(
        favoritesService.removeFavorite(mockCustomerId, mockTailorId)
      ).resolves.not.toThrow();

      expect(mockRepository.removeFavorite).toHaveBeenCalledWith(mockCustomerId, mockTailorId);
    });

    it('should throw error for missing parameters', async () => {
      await expect(
        favoritesService.removeFavorite('', mockTailorId)
      ).rejects.toThrow('Customer ID and Tailor ID are required');
    });

    it('should clear user cache after removing favorite', async () => {
      mockRepository.removeFavorite.mockResolvedValue();

      // Set some cache first
      (favoritesService as any).setCache(`is-favorite:${mockCustomerId}:${mockTailorId}`, true);

      await favoritesService.removeFavorite(mockCustomerId, mockTailorId);

      // Cache should be cleared
      const cached = (favoritesService as any).getFromCache(`is-favorite:${mockCustomerId}:${mockTailorId}`);
      expect(cached).toBeNull();
    });
  });

  describe('toggleFavorite', () => {
    it('should add favorite when not already favorited', async () => {
      const mockFavorite: CustomerFavorite = {
        id: 'fav-123',
        customerId: mockCustomerId,
        tailorId: mockTailorId,
        createdAt: new Date().toISOString(),
      };

      mockRepository.isFavorite.mockResolvedValue(false);
      mockRepository.addFavorite.mockResolvedValue(mockFavorite);

      const result = await favoritesService.toggleFavorite(mockCustomerId, mockTailorId);

      expect(result.isFavorited).toBe(true);
      expect(result.favorite).toEqual(mockFavorite);
      expect(mockRepository.addFavorite).toHaveBeenCalledWith(mockCustomerId, mockTailorId);
    });

    it('should remove favorite when already favorited', async () => {
      mockRepository.isFavorite.mockResolvedValue(true);
      mockRepository.removeFavorite.mockResolvedValue();

      const result = await favoritesService.toggleFavorite(mockCustomerId, mockTailorId);

      expect(result.isFavorited).toBe(false);
      expect(result.favorite).toBeUndefined();
      expect(mockRepository.removeFavorite).toHaveBeenCalledWith(mockCustomerId, mockTailorId);
    });
  });

  describe('getFavorites', () => {
    it('should return paginated favorites', async () => {
      const mockTailors: TailorSearchItem[] = [
        {
          id: mockTailorId,
          businessName: 'Test Tailor',
          city: 'Accra',
          rating: 4.5,
          isFavorite: true,
        } as TailorSearchItem,
      ];

      const mockResult = {
        favorites: mockTailors,
        total: 1,
      };

      mockRepository.getFavorites.mockResolvedValue(mockResult);

      const result = await favoritesService.getFavorites(mockCustomerId, 1, 20);

      expect(result.favorites).toEqual(mockTailors);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
      expect(mockRepository.getFavorites).toHaveBeenCalledWith(mockCustomerId, 20, 0);
    });

    it('should calculate correct total pages', async () => {
      const mockResult = {
        favorites: [],
        total: 25,
      };

      mockRepository.getFavorites.mockResolvedValue(mockResult);

      const result = await favoritesService.getFavorites(mockCustomerId, 1, 10);

      expect(result.totalPages).toBe(3); // Math.ceil(25 / 10)
    });

    it('should cache results', async () => {
      const mockResult = {
        favorites: [],
        total: 0,
      };

      mockRepository.getFavorites.mockResolvedValue(mockResult);

      // First call
      await favoritesService.getFavorites(mockCustomerId, 1, 20);
      // Second call should use cache
      await favoritesService.getFavorites(mockCustomerId, 1, 20);

      expect(mockRepository.getFavorites).toHaveBeenCalledTimes(1);
    });
  });

  describe('isFavorite', () => {
    it('should return true for favorited tailor', async () => {
      mockRepository.isFavorite.mockResolvedValue(true);

      const result = await favoritesService.isFavorite(mockCustomerId, mockTailorId);

      expect(result).toBe(true);
      expect(mockRepository.isFavorite).toHaveBeenCalledWith(mockCustomerId, mockTailorId);
    });

    it('should return false for non-favorited tailor', async () => {
      mockRepository.isFavorite.mockResolvedValue(false);

      const result = await favoritesService.isFavorite(mockCustomerId, mockTailorId);

      expect(result).toBe(false);
    });

    it('should cache favorite status', async () => {
      mockRepository.isFavorite.mockResolvedValue(true);

      // First call
      await favoritesService.isFavorite(mockCustomerId, mockTailorId);
      // Second call should use cache
      await favoritesService.isFavorite(mockCustomerId, mockTailorId);

      expect(mockRepository.isFavorite).toHaveBeenCalledTimes(1);
    });

    it('should return false on error', async () => {
      mockRepository.isFavorite.mockRejectedValue(new Error('Database error'));

      const result = await favoritesService.isFavorite(mockCustomerId, mockTailorId);

      expect(result).toBe(false);
    });
  });

  describe('getFavoriteStatuses', () => {
    it('should return status map for multiple tailors', async () => {
      const tailorIds = ['tailor-1', 'tailor-2', 'tailor-3'];
      const favoritedIds = ['tailor-1', 'tailor-3'];

      mockRepository.getFavoritesByTailorIds.mockResolvedValue(favoritedIds);

      const result = await favoritesService.getFavoriteStatuses(mockCustomerId, tailorIds);

      expect(result).toEqual({
        'tailor-1': true,
        'tailor-2': false,
        'tailor-3': true,
      });
    });

    it('should return empty object for empty input', async () => {
      const result = await favoritesService.getFavoriteStatuses(mockCustomerId, []);

      expect(result).toEqual({});
      expect(mockRepository.getFavoritesByTailorIds).not.toHaveBeenCalled();
    });

    it('should return all false on error', async () => {
      const tailorIds = ['tailor-1', 'tailor-2'];
      mockRepository.getFavoritesByTailorIds.mockRejectedValue(new Error('Database error'));

      const result = await favoritesService.getFavoriteStatuses(mockCustomerId, tailorIds);

      expect(result).toEqual({
        'tailor-1': false,
        'tailor-2': false,
      });
    });
  });

  describe('searchFavorites', () => {
    it('should filter favorites by query', async () => {
      const allFavorites = [
        {
          businessName: 'Kente Master',
          city: 'Accra',
          specializations: ['Kente Weaving'],
        } as TailorSearchItem,
        {
          businessName: 'Dress Designer',
          city: 'Kumasi',
          specializations: ['Wedding Dresses'],
        } as TailorSearchItem,
      ];

      const mockResult = {
        favorites: allFavorites,
        total: 2,
        page: 1,
        totalPages: 1,
      };

      // Mock getFavorites to return all favorites
      (favoritesService as any).getFavorites = vi.fn().mockResolvedValue(mockResult);

      const result = await favoritesService.searchFavorites(mockCustomerId, 'kente', 1, 20);

      expect(result.favorites).toHaveLength(1);
      expect(result.favorites[0].businessName).toBe('Kente Master');
      expect(result.total).toBe(1);
    });
  });

  describe('exportFavorites', () => {
    it('should export favorites data', async () => {
      const mockFavorites = [
        {
          businessName: 'Test Tailor',
          city: 'Accra',
          specializations: ['Kente Weaving'],
          rating: 4.5,
        } as TailorSearchItem,
      ];

      const mockResult = {
        favorites: mockFavorites,
        total: 1,
        page: 1,
        totalPages: 1,
      };

      // Mock getFavorites
      (favoritesService as any).getFavorites = vi.fn().mockResolvedValue(mockResult);

      const result = await favoritesService.exportFavorites(mockCustomerId);

      expect(result.favorites).toHaveLength(1);
      expect(result.favorites[0].tailorName).toBe('Test Tailor');
      expect(result.favorites[0].city).toBe('Accra');
      expect(result.exportDate).toBeDefined();
    });
  });
});