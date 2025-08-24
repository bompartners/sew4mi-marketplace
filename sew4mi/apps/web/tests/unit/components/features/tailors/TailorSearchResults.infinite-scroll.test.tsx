import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TailorSearchResults } from '@/components/features/tailors/TailorSearchResults';
import { TailorSearchResult, TailorSearchItem, DISPLAY_MODES } from '@sew4mi/shared';

// Mock the MapView component
vi.mock('@/components/features/tailors/MapView', () => ({
  MapView: ({ tailors, height }: { tailors: TailorSearchItem[]; height?: number }) => (
    <div data-testid="map-view" style={{ height: height || 400 }}>
      <div>Map with {tailors.length} tailors</div>
    </div>
  ),
}));

// Mock the TailorCard component
vi.mock('@/components/features/tailors/TailorCard', () => ({
  TailorCard: ({ tailor }: { tailor: TailorSearchItem }) => (
    <div data-testid={`tailor-card-${tailor.id}`}>
      <h3>{tailor.businessName}</h3>
    </div>
  ),
}));

describe('TailorSearchResults - Infinite Scroll', () => {
  const mockTailor: TailorSearchItem = {
    id: 'tailor-1',
    userId: 'user-1',
    businessName: 'Test Tailor',
    bio: 'Expert tailor',
    profilePhoto: '/photo.jpg',
    yearsOfExperience: 5,
    specializations: ['Kente Weaving'],
    portfolioImages: [],
    location: { lat: 5.6037, lng: -0.1870 },
    locationName: 'Accra',
    city: 'Accra',
    region: 'Greater Accra',
    deliveryRadiusKm: 20,
    verificationStatus: 'VERIFIED' as const,
    rating: 4.5,
    totalReviews: 10,
    completedOrders: 8,
    completionRate: 0.9,
    averageResponseHours: 2,
    averageDeliveryDays: 7,
    onTimeDeliveryRate: 0.9,
    capacity: 3,
    vacationMode: false,
    acceptsRushOrders: true,
    rushOrderFeePercentage: 15,
    user: {
      id: 'user-1',
      fullName: 'Test User',
      phoneNumber: '+233123456789',
      whatsappNumber: '+233123456789',
    },
  };

  const mockResults: TailorSearchResult = {
    tailors: [mockTailor],
    totalCount: 50,
    hasMore: true,
    nextCursor: 'next-cursor',
    searchMeta: {
      searchTime: 150,
      totalResults: 50,
    },
  };

  let mockOnLoadMore: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnLoadMore = vi.fn();
    
    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Intersection Observer', () => {
    it('should set up intersection observer for infinite scroll in grid mode', () => {
      render(
        <TailorSearchResults
          results={mockResults}
          displayMode={DISPLAY_MODES.GRID}
          isLoading={false}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(global.IntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        { threshold: 0.1 }
      );
    });

    it('should not set up observer when loading', () => {
      render(
        <TailorSearchResults
          results={mockResults}
          displayMode={DISPLAY_MODES.GRID}
          isLoading={true}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      // Observer should not be called when loading
      const observerInstance = global.IntersectionObserver as any;
      const mockObserve = observerInstance.mock.results[0]?.value?.observe;
      
      if (mockObserve) {
        expect(mockObserve).not.toHaveBeenCalled();
      }
    });

    it('should not set up observer when no more results', () => {
      render(
        <TailorSearchResults
          results={{ ...mockResults, hasMore: false }}
          displayMode={DISPLAY_MODES.GRID}
          isLoading={false}
          hasMore={false}
          onLoadMore={mockOnLoadMore}
        />
      );

      // Observer should not be called when no more results
      const observerInstance = global.IntersectionObserver as any;
      const mockObserve = observerInstance.mock.results[0]?.value?.observe;
      
      if (mockObserve) {
        expect(mockObserve).not.toHaveBeenCalled();
      }
    });
  });

  describe('Manual Load More Button', () => {
    it('should show load more button in grid mode when hasMore is true', () => {
      render(
        <TailorSearchResults
          results={mockResults}
          displayMode={DISPLAY_MODES.GRID}
          isLoading={false}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      const loadMoreButton = screen.getByText('Load More Tailors');
      expect(loadMoreButton).toBeInTheDocument();
    });

    it('should call onLoadMore when load more button is clicked', async () => {
      render(
        <TailorSearchResults
          results={mockResults}
          displayMode={DISPLAY_MODES.GRID}
          isLoading={false}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      const loadMoreButton = screen.getByText('Load More Tailors');
      fireEvent.click(loadMoreButton);

      expect(mockOnLoadMore).toHaveBeenCalledTimes(1);
    });

    it('should show loading spinner when loading more', () => {
      render(
        <TailorSearchResults
          results={mockResults}
          displayMode={DISPLAY_MODES.GRID}
          isLoading={true}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.getByText('Loading more tailors...')).toBeInTheDocument();
    });

    it('should not show load more button when hasMore is false', () => {
      render(
        <TailorSearchResults
          results={{ ...mockResults, hasMore: false }}
          displayMode={DISPLAY_MODES.GRID}
          isLoading={false}
          hasMore={false}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.queryByText('Load More Tailors')).not.toBeInTheDocument();
    });
  });

  describe('Loading Skeletons', () => {
    it('should show loading skeletons in grid mode', () => {
      render(
        <TailorSearchResults
          results={mockResults}
          displayMode={DISPLAY_MODES.GRID}
          isLoading={true}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      // Loading skeletons should be rendered during loading
      expect(screen.getByText('Loading more tailors...')).toBeInTheDocument();
      
      // Check that skeleton elements are present
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('should show loading skeletons in list mode', () => {
      render(
        <TailorSearchResults
          results={mockResults}
          displayMode={DISPLAY_MODES.LIST}
          isLoading={true}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.getByText('Loading more tailors...')).toBeInTheDocument();
    });
  });

  describe('Multiple Display Modes', () => {
    it('should support infinite scroll in map mode', () => {
      render(
        <TailorSearchResults
          results={mockResults}
          displayMode={DISPLAY_MODES.MAP}
          isLoading={false}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.getByTestId('map-view')).toBeInTheDocument();
      expect(screen.getByText('Load More Tailors')).toBeInTheDocument();
    });

    it('should support infinite scroll in list mode', () => {
      render(
        <TailorSearchResults
          results={mockResults}
          displayMode={DISPLAY_MODES.LIST}
          isLoading={false}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.getByText('Test Tailor')).toBeInTheDocument();
      expect(screen.getByText('Load More Tailors')).toBeInTheDocument();
    });

    it('should support infinite scroll in grid mode', () => {
      render(
        <TailorSearchResults
          results={mockResults}
          displayMode={DISPLAY_MODES.GRID}
          isLoading={false}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.getByTestId('tailor-card-tailor-1')).toBeInTheDocument();
      expect(screen.getByText('Load More Tailors')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should cleanup intersection observer on unmount', () => {
      const mockDisconnect = vi.fn();
      
      global.IntersectionObserver = vi.fn().mockImplementation(() => ({
        observe: vi.fn(),
        unobserve: vi.fn(),
        disconnect: mockDisconnect,
      }));

      const { unmount } = render(
        <TailorSearchResults
          results={mockResults}
          displayMode={DISPLAY_MODES.GRID}
          isLoading={false}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });

    it('should handle empty results gracefully', () => {
      const emptyResults: TailorSearchResult = {
        tailors: [],
        totalCount: 0,
        hasMore: false,
        nextCursor: null,
        searchMeta: {
          searchTime: 50,
          totalResults: 0,
        },
      };

      render(
        <TailorSearchResults
          results={emptyResults}
          displayMode={DISPLAY_MODES.GRID}
          isLoading={false}
          hasMore={false}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.getByText('No Tailors Found')).toBeInTheDocument();
      expect(screen.queryByText('Load More Tailors')).not.toBeInTheDocument();
    });
  });

  describe('Search Meta Information', () => {
    it('should display search time in map mode', () => {
      render(
        <TailorSearchResults
          results={mockResults}
          displayMode={DISPLAY_MODES.MAP}
          isLoading={false}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.getByText('Search completed in 150ms')).toBeInTheDocument();
      expect(screen.getByText('Showing 1 tailor on map')).toBeInTheDocument();
    });

    it('should handle plural correctly for tailor count', () => {
      const multipleResults = {
        ...mockResults,
        tailors: [mockTailor, { ...mockTailor, id: 'tailor-2', businessName: 'Second Tailor' }],
      };

      render(
        <TailorSearchResults
          results={multipleResults}
          displayMode={DISPLAY_MODES.MAP}
          isLoading={false}
          hasMore={true}
          onLoadMore={mockOnLoadMore}
        />
      );

      expect(screen.getByText('Showing 2 tailors on map')).toBeInTheDocument();
    });
  });
});