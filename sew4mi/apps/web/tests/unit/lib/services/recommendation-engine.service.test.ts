import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { RecommendationEngineService } from '@/lib/services/recommendation-engine.service';
import { orderAnalyticsRepository } from '@/lib/repositories/order-analytics.repository';
import { createServerSupabaseClient } from '@/lib/supabase';
import type { OrderAnalytics, RecommendationType } from '@sew4mi/shared/types';

// Mock dependencies
vi.mock('@/lib/repositories/order-analytics.repository');
vi.mock('@/lib/supabase');

describe('RecommendationEngineService', () => {
  let recommendationService: RecommendationEngineService;
  let mockSupabase: any;

  const mockUserId = 'user-123';

  const mockAnalytics: OrderAnalytics = {
    userId: mockUserId,
    garmentTypeFrequency: {
      'Custom Suit': 5,
      'Dress Shirt': 3,
      'Trousers': 2,
    },
    fabricPreferences: {
      wool: 4,
      cotton: 3,
      linen: 2,
    },
    colorPreferences: {
      navy: 3,
      gray: 2,
      black: 2,
    },
    avgOrderValue: 500,
    preferredTailors: ['tailor-1', 'tailor-2'],
    seasonalPatterns: {
      winter: ['Custom Suit', 'Trousers'],
      summer: ['Dress Shirt', 'Linen Trousers'],
      spring: ['Casual Shirt'],
      fall: ['Custom Suit'],
    },
    lastUpdated: new Date().toISOString(),
  };

  const mockTailor = {
    id: 'tailor-new-1',
    business_name: 'Premium Tailors',
    verification_status: 'VERIFIED',
    is_accepting_orders: true,
    specializations: ['Custom Suit', 'Formal Wear'],
    rating: 4.8,
    base_price: 480,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    recommendationService = new RecommendationEngineService();

    // Setup mock Supabase
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      overlaps: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn(),
    };

    (createServerSupabaseClient as Mock).mockResolvedValue(mockSupabase);
  });

  describe('getRecommendations', () => {
    it('should return recommendations for user with order history', async () => {
      // Arrange
      vi.mocked(orderAnalyticsRepository.getUserAnalytics).mockResolvedValue(mockAnalytics);
      vi.mocked(orderAnalyticsRepository.areAnalyticsStale).mockResolvedValue(false);
      mockSupabase.limit.mockResolvedValue({ data: [mockTailor], error: null });

      // Act
      const result = await recommendationService.getRecommendations(mockUserId);

      // Assert
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.analytics).toEqual(mockAnalytics);
    });

    it('should recompute stale analytics', async () => {
      // Arrange
      vi.mocked(orderAnalyticsRepository.getUserAnalytics).mockResolvedValue(mockAnalytics);
      vi.mocked(orderAnalyticsRepository.areAnalyticsStale).mockResolvedValue(true);
      vi.mocked(orderAnalyticsRepository.computeAnalytics).mockResolvedValue(mockAnalytics);
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      // Act
      await recommendationService.getRecommendations(mockUserId);

      // Assert
      expect(orderAnalyticsRepository.computeAnalytics).toHaveBeenCalledWith(mockUserId);
    });

    it('should compute analytics when none exist', async () => {
      // Arrange
      vi.mocked(orderAnalyticsRepository.getUserAnalytics).mockResolvedValue(null);
      vi.mocked(orderAnalyticsRepository.computeAnalytics).mockResolvedValue(mockAnalytics);
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      // Act
      await recommendationService.getRecommendations(mockUserId);

      // Assert
      expect(orderAnalyticsRepository.computeAnalytics).toHaveBeenCalledWith(mockUserId);
    });

    it('should filter recommendations by type', async () => {
      // Arrange
      vi.mocked(orderAnalyticsRepository.getUserAnalytics).mockResolvedValue(mockAnalytics);
      vi.mocked(orderAnalyticsRepository.areAnalyticsStale).mockResolvedValue(false);
      mockSupabase.limit.mockResolvedValue({ data: [mockTailor], error: null });

      // Act
      const result = await recommendationService.getRecommendations(mockUserId, { type: 'tailor' as RecommendationType });

      // Assert
      expect(result.recommendations.every(r => r.type === 'tailor')).toBe(true);
    });

    it('should limit number of recommendations', async () => {
      // Arrange
      vi.mocked(orderAnalyticsRepository.getUserAnalytics).mockResolvedValue(mockAnalytics);
      vi.mocked(orderAnalyticsRepository.areAnalyticsStale).mockResolvedValue(false);
      mockSupabase.limit.mockResolvedValue({ data: Array(20).fill(mockTailor), error: null });

      // Act
      const result = await recommendationService.getRecommendations(mockUserId, { limit: 5 });

      // Assert
      expect(result.recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should sort recommendations by score descending', async () => {
      // Arrange
      vi.mocked(orderAnalyticsRepository.getUserAnalytics).mockResolvedValue(mockAnalytics);
      vi.mocked(orderAnalyticsRepository.areAnalyticsStale).mockResolvedValue(false);
      mockSupabase.limit.mockResolvedValue({ data: [mockTailor], error: null });

      // Act
      const result = await recommendationService.getRecommendations(mockUserId);

      // Assert
      const scores = result.recommendations.map(r => r.score);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
    });
  });

  describe('calculateGarmentScore', () => {
    it('should calculate score based on frequency (40%)', () => {
      // Arrange
      const garmentType = 'Custom Suit'; // Frequency: 5 (max in mockAnalytics)

      // Act
      const score = (recommendationService as any).calculateGarmentScore(garmentType, mockAnalytics);

      // Assert
      // Type match: 40% (max frequency)
      expect(score).toBeGreaterThanOrEqual(40);
    });

    it('should add seasonal relevance bonus (30%)', () => {
      // Arrange
      const currentMonth = new Date().getMonth() + 1;
      let currentSeason = 'winter';
      if (currentMonth >= 12 || currentMonth <= 2) currentSeason = 'winter';
      else if (currentMonth >= 3 && currentMonth <= 5) currentSeason = 'spring';
      else if (currentMonth >= 6 && currentMonth <= 8) currentSeason = 'summer';
      else currentSeason = 'fall';

      const seasonalGarment = mockAnalytics.seasonalPatterns[currentSeason]?.[0] || 'Custom Suit';

      // Act
      const score = (recommendationService as any).calculateGarmentScore(seasonalGarment, mockAnalytics);

      // Assert
      // Should include seasonal bonus of 30 points
      expect(score).toBeGreaterThanOrEqual(30);
    });

    it('should return lower score for infrequent garments', () => {
      // Arrange
      const infrequentGarment = 'Trousers'; // Frequency: 2 (lowest in mockAnalytics)

      // Act
      const score = (recommendationService as any).calculateGarmentScore(infrequentGarment, mockAnalytics);

      // Assert
      expect(score).toBeLessThan(100);
    });
  });

  describe('calculateTailorScore', () => {
    it('should calculate score based on specialization match (40%)', () => {
      // Arrange
      const tailorWithMatch = {
        ...mockTailor,
        specializations: ['Custom Suit', 'Dress Shirt'], // Matches user's top 2 garments
      };

      // Act
      const score = (recommendationService as any).calculateTailorScore(tailorWithMatch, mockAnalytics);

      // Assert
      // Should have high specialization match score
      expect(score).toBeGreaterThanOrEqual(40);
    });

    it('should add rating bonus (30%)', () => {
      // Arrange
      const highRatedTailor = {
        ...mockTailor,
        rating: 5.0,
        specializations: [],
      };

      // Act
      const score = (recommendationService as any).calculateTailorScore(highRatedTailor, mockAnalytics);

      // Assert
      // Should include full rating bonus (30 points)
      expect(score).toBeGreaterThanOrEqual(30);
    });

    it('should add price range match bonus (20%)', () => {
      // Arrange
      const affordableTailor = {
        ...mockTailor,
        base_price: 500, // Exactly at avgOrderValue
        specializations: [],
        rating: 0,
      };

      // Act
      const score = (recommendationService as any).calculateTailorScore(affordableTailor, mockAnalytics);

      // Assert
      // Should include price match bonus (20 points)
      expect(score).toBeGreaterThanOrEqual(20);
    });

    it('should not add price bonus when out of range', () => {
      // Arrange
      const expensiveTailor = {
        ...mockTailor,
        base_price: 1000, // Far from avgOrderValue (500)
        specializations: [],
        rating: 0,
      };

      // Act
      const score = (recommendationService as any).calculateTailorScore(expensiveTailor, mockAnalytics);

      // Assert
      // Should not include price match bonus
      expect(score).toBeLessThan(20);
    });
  });

  describe('calculateFabricScore', () => {
    it('should calculate score based on fabric preference (40%)', () => {
      // Arrange
      const preferredFabric = 'wool'; // Highest preference in mockAnalytics

      // Act
      const score = (recommendationService as any).calculateFabricScore(preferredFabric, mockAnalytics);

      // Assert
      expect(score).toBeGreaterThanOrEqual(40);
    });

    it('should add seasonal relevance bonus (30%)', () => {
      // Arrange - mock current season
      const service = recommendationService as any;
      const currentSeason = service.getCurrentSeason();
      const seasonalFabrics = service.getSeasonalFabrics(currentSeason);
      const seasonalFabric = seasonalFabrics[0];

      // Act
      const score = service.calculateFabricScore(seasonalFabric, mockAnalytics);

      // Assert
      // Should include seasonal bonus
      expect(score).toBeGreaterThanOrEqual(30);
    });
  });

  describe('getPopularGarmentRecommendations', () => {
    it('should return popular garments for new users', async () => {
      // Arrange
      const newUserAnalytics: OrderAnalytics = {
        ...mockAnalytics,
        garmentTypeFrequency: {}, // No order history
      };
      vi.mocked(orderAnalyticsRepository.getUserAnalytics).mockResolvedValue(newUserAnalytics);
      vi.mocked(orderAnalyticsRepository.areAnalyticsStale).mockResolvedValue(false);
      mockSupabase.limit.mockResolvedValue({ data: [], error: null });

      // Act
      const result = await recommendationService.getRecommendations(mockUserId);

      // Assert
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.metadata?.isPopular)).toBe(true);
    });

    it('should limit popular recommendations to requested limit', async () => {
      // Act
      const result = await (recommendationService as any).getPopularGarmentRecommendations(3);

      // Assert
      expect(result.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getComplementaryGarments', () => {
    it('should recommend complementary items for Custom Suit', () => {
      // Arrange
      const garmentFrequency = {
        'Custom Suit': 5,
      };

      // Act
      const result = (recommendationService as any).getComplementaryGarments(garmentFrequency);

      // Assert
      expect(result).toContain('Dress Shirt');
      expect(result).toContain('Tie');
      expect(result).toContain('Waistcoat');
    });

    it('should not include duplicates', () => {
      // Arrange
      const garmentFrequency = {
        'Custom Suit': 5,
        'Trousers': 3,
      };

      // Act
      const result = (recommendationService as any).getComplementaryGarments(garmentFrequency);

      // Assert
      const uniqueItems = Array.from(new Set(result));
      expect(result.length).toBe(uniqueItems.length);
    });
  });

  describe('getCurrentSeason', () => {
    it('should return correct season for current date', () => {
      // Act
      const season = (recommendationService as any).getCurrentSeason();

      // Assert
      expect(['spring', 'summer', 'fall', 'winter']).toContain(season);
    });
  });

  describe('getSeasonalFabrics', () => {
    it('should return summer fabrics for summer season', () => {
      // Act
      const fabrics = (recommendationService as any).getSeasonalFabrics('summer');

      // Assert
      expect(fabrics).toContain('Linen');
      expect(fabrics).toContain('Cotton');
    });

    it('should return winter fabrics for winter season', () => {
      // Act
      const fabrics = (recommendationService as any).getSeasonalFabrics('winter');

      // Assert
      expect(fabrics).toContain('Wool');
      expect(fabrics).toContain('Velvet');
    });

    it('should return spring fabrics as default for unknown season', () => {
      // Act
      const fabrics = (recommendationService as any).getSeasonalFabrics('unknown');

      // Assert
      expect(fabrics).toEqual(['Cotton', 'Linen', 'Light Wool']);
    });
  });

  describe('getTailorRecommendations', () => {
    it('should recommend tailors matching user garment preferences', async () => {
      // Arrange
      const tailors = [mockTailor];
      mockSupabase.limit.mockResolvedValue({ data: tailors, error: null });

      // Act
      const result = await (recommendationService as any).getTailorRecommendations(
        mockUserId,
        mockAnalytics,
        5
      );

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('tailor');
      expect(mockSupabase.overlaps).toHaveBeenCalledWith('specializations', expect.any(Array));
    });

    it('should exclude user preferred tailors from recommendations', async () => {
      // Arrange
      mockSupabase.limit.mockResolvedValue({ data: [mockTailor], error: null });

      // Act
      await (recommendationService as any).getTailorRecommendations(mockUserId, mockAnalytics, 5);

      // Assert
      expect(mockSupabase.not).toHaveBeenCalled(); // Note: Actual SQL uses NOT IN clause
    });

    it('should return empty array when no garment history', async () => {
      // Arrange
      const noHistoryAnalytics: OrderAnalytics = {
        ...mockAnalytics,
        garmentTypeFrequency: {},
      };

      // Act
      const result = await (recommendationService as any).getTailorRecommendations(
        mockUserId,
        noHistoryAnalytics,
        5
      );

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      // Arrange
      mockSupabase.limit.mockResolvedValue({ data: null, error: new Error('DB error') });

      // Act
      const result = await (recommendationService as any).getTailorRecommendations(
        mockUserId,
        mockAnalytics,
        5
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('getFabricRecommendations', () => {
    it('should recommend seasonal fabrics not in user preferences', async () => {
      // Act
      const result = await (recommendationService as any).getFabricRecommendations(
        mockUserId,
        mockAnalytics,
        5
      );

      // Assert
      expect(result.length).toBeGreaterThan(0);
      expect(result.every(r => r.type === 'fabric')).toBe(true);
    });

    it('should skip fabrics user already frequently orders', async () => {
      // Act
      const result = await (recommendationService as any).getFabricRecommendations(
        mockUserId,
        mockAnalytics,
        10
      );

      // Assert
      // Should not recommend 'wool' (user's top fabric preference)
      const fabricIds = result.map(r => r.itemId);
      expect(fabricIds.filter(f => f === 'wool').length).toBe(0);
    });
  });

  describe('trackEngagement', () => {
    it('should log engagement without errors', async () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      // Act
      await recommendationService.trackEngagement(mockUserId, 'rec-123', 'clicked');

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Recommendation engagement:',
        expect.objectContaining({
          userId: mockUserId,
          recommendationId: 'rec-123',
          action: 'clicked',
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('refreshUserAnalytics', () => {
    it('should recompute analytics for user', async () => {
      // Arrange
      vi.mocked(orderAnalyticsRepository.computeAnalytics).mockResolvedValue(mockAnalytics);

      // Act
      const result = await recommendationService.refreshUserAnalytics(mockUserId);

      // Assert
      expect(orderAnalyticsRepository.computeAnalytics).toHaveBeenCalledWith(mockUserId);
      expect(result).toEqual(mockAnalytics);
    });
  });
});
