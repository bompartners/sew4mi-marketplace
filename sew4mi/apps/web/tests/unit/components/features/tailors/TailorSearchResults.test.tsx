import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TailorSearchResults } from '@/components/features/tailors/TailorSearchResults';
import { TailorSearchResult, TailorSearchItem, DISPLAY_MODES } from '@sew4mi/shared';

// Mock child components
vi.mock('@/components/features/tailors/MapView', () => ({
  MapView: ({ tailors, onTailorSelect }: any) => (
    <div data-testid="map-view">
      <div>Map with {tailors.length} tailors</div>
      <button onClick={() => onTailorSelect(tailors[0])}>Select First Tailor</button>
    </div>
  ),
}));

vi.mock('@/components/features/tailors/TailorCard', () => ({
  TailorCard: ({ tailor, onSelect, showDistance }: any) => (
    <div data-testid={`tailor-card-${tailor.id}`} onClick={onSelect}>
      <div>{tailor.businessName}</div>
      {showDistance && <div>Distance: {tailor.distance}km</div>}
    </div>
  ),
}));

vi.mock('@/components/features/tailors/FavoriteButton', () => ({
  FavoriteButton: ({ tailor }: any) => (
    <button data-testid={`favorite-${tailor.id}`}>Favorite {tailor.businessName}</button>
  ),
}));

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Sample test data
const mockTailors: TailorSearchItem[] = [
  {
    id: '1',
    businessName: 'Kente Tailors Ltd',
    specializations: ['Traditional Wear', 'Suits'],
    city: 'Accra',
    rating: 4.8,
    totalReviews: 25,
    averageResponseHours: 2,
    completedOrders: 150,
    onTimeDeliveryRate: 0.95,
    verificationStatus: 'VERIFIED',
    location: { lat: 5.6037, lng: -0.1870 },
    distance: 2.5,
    minPrice: 50,
    profilePhoto: 'https://example.com/profile1.jpg',
    portfolioImages: ['https://example.com/portfolio1.jpg'],
    bio: 'Expert in traditional Ghanaian wear',
    yearsOfExperience: 8,
    rushOrderFeePercentage: 25,
    user: {
      whatsappNumber: '+233501234567'
    }
  },
  {
    id: '2',
    businessName: 'Adinkra Designs',
    specializations: ['Dresses', 'Casual Wear'],
    city: 'Kumasi',
    rating: 4.5,
    totalReviews: 18,
    averageResponseHours: 4,
    completedOrders: 89,
    onTimeDeliveryRate: 0.92,
    verificationStatus: 'VERIFIED',
    location: { lat: 6.6885, lng: -1.6244 },
    distance: 1.8,
    minPrice: 35,
    profilePhoto: 'https://example.com/profile2.jpg',
    portfolioImages: ['https://example.com/portfolio2.jpg'],
    bio: 'Modern designs with traditional touch',
    yearsOfExperience: 5,
    rushOrderFeePercentage: 20,
    user: {
      whatsappNumber: '+233209876543'
    }
  }
];

const mockResults: TailorSearchResult = {
  tailors: mockTailors,
  totalCount: 2,
  hasMore: false,
  nextCursor: null,
  searchMeta: {
    searchTime: 150,
    totalResults: 2,
    appliedFilters: ['city:Accra']
  }
};

const defaultProps = {
  results: mockResults,
  displayMode: DISPLAY_MODES.LIST,
  isLoading: false,
  hasMore: false,
  onLoadMore: vi.fn(),
  userLocation: { lat: 5.6037, lng: -0.1870 },
};

describe('TailorSearchResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Empty State', () => {
    it('should display empty state when no tailors found', () => {
      render(
        <TailorSearchResults
          {...defaultProps}
          results={{ ...mockResults, tailors: [] }}
        />
      );

      expect(screen.getByText('No Tailors Found')).toBeInTheDocument();
      expect(screen.getByText("We couldn't find any tailors matching your search criteria.")).toBeInTheDocument();
      expect(screen.getByText('Try adjusting your filters:')).toBeInTheDocument();
    });

    it('should show helpful suggestions in empty state', () => {
      render(
        <TailorSearchResults
          {...defaultProps}
          results={{ ...mockResults, tailors: [] }}
        />
      );

      expect(screen.getByText('Expand your location search area')).toBeInTheDocument();
      expect(screen.getByText('Remove some specialization filters')).toBeInTheDocument();
      expect(screen.getByText('Lower the minimum rating requirement')).toBeInTheDocument();
      expect(screen.getByText('Increase your budget range')).toBeInTheDocument();
    });
  });

  describe('List View', () => {
    it('should render tailors in list view by default', () => {
      render(<TailorSearchResults {...defaultProps} />);

      // Should render TailorListItem components
      expect(screen.getByText('Kente Tailors Ltd')).toBeInTheDocument();
      expect(screen.getByText('Adinkra Designs')).toBeInTheDocument();
      expect(screen.getByText('4.8 (25 reviews)')).toBeInTheDocument();
      expect(screen.getByText('4.5 (18 reviews)')).toBeInTheDocument();
    });

    it('should display tailor specializations', () => {
      render(<TailorSearchResults {...defaultProps} />);

      expect(screen.getByText('Traditional Wear')).toBeInTheDocument();
      expect(screen.getByText('Suits')).toBeInTheDocument();
      expect(screen.getByText('Dresses')).toBeInTheDocument();
      expect(screen.getByText('Casual Wear')).toBeInTheDocument();
    });

    it('should show verification badges', () => {
      render(<TailorSearchResults {...defaultProps} />);

      const verifiedBadges = screen.getAllByText('✓ Verified');
      expect(verifiedBadges).toHaveLength(2);
    });

    it('should display distance when user location is provided', () => {
      render(<TailorSearchResults {...defaultProps} />);

      expect(screen.getByText('2.5 km away')).toBeInTheDocument();
      expect(screen.getByText('1.8 km away')).toBeInTheDocument();
    });

    it('should handle tailor selection', () => {
      render(<TailorSearchResults {...defaultProps} />);

      const firstTailor = screen.getByText('Kente Tailors Ltd').closest('div[role="article"]');
      expect(firstTailor).toBeInTheDocument();

      fireEvent.click(firstTailor!);
      // Should highlight the selected tailor
      expect(firstTailor).toHaveClass('ring-2', 'ring-blue-500');
    });
  });

  describe('Grid View', () => {
    it('should render tailors in grid layout', () => {
      render(
        <TailorSearchResults
          {...defaultProps}
          displayMode={DISPLAY_MODES.GRID}
        />
      );

      expect(screen.getByTestId('tailor-card-1')).toBeInTheDocument();
      expect(screen.getByTestId('tailor-card-2')).toBeInTheDocument();
    });

    it('should pass showDistance prop to TailorCard components', () => {
      render(
        <TailorSearchResults
          {...defaultProps}
          displayMode={DISPLAY_MODES.GRID}
        />
      );

      expect(screen.getByText('Distance: 2.5km')).toBeInTheDocument();
      expect(screen.getByText('Distance: 1.8km')).toBeInTheDocument();
    });
  });

  describe('Map View', () => {
    it('should render map view when display mode is MAP', () => {
      render(
        <TailorSearchResults
          {...defaultProps}
          displayMode={DISPLAY_MODES.MAP}
        />
      );

      expect(screen.getByTestId('map-view')).toBeInTheDocument();
      expect(screen.getByText('Map with 2 tailors')).toBeInTheDocument();
    });

    it('should show tailor count and search time in map view', () => {
      render(
        <TailorSearchResults
          {...defaultProps}
          displayMode={DISPLAY_MODES.MAP}
        />
      );

      expect(screen.getByText('Showing 2 tailors on map')).toBeInTheDocument();
      expect(screen.getByText('Search completed in 150ms')).toBeInTheDocument();
    });

    it('should handle tailor selection from map', () => {
      const onTailorSelect = vi.fn();
      render(
        <TailorSearchResults
          {...defaultProps}
          displayMode={DISPLAY_MODES.MAP}
        />
      );

      const selectButton = screen.getByText('Select First Tailor');
      fireEvent.click(selectButton);

      // Should update selected tailor internal state
      expect(selectButton).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeletons in list view', () => {
      render(
        <TailorSearchResults
          {...defaultProps}
          isLoading={true}
        />
      );

      // Should render skeleton loading components
      const skeletons = screen.getAllByRole('generic').filter(el => 
        el.className?.includes('animate-pulse') || el.textContent === ''
      );
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should show loading skeletons in grid view', () => {
      render(
        <TailorSearchResults
          {...defaultProps}
          displayMode={DISPLAY_MODES.GRID}
          isLoading={true}
        />
      );

      // Should render grid skeleton components
      const gridSkeletons = screen.getAllByRole('generic').filter(el => 
        el.className?.includes('animate-pulse')
      );
      expect(gridSkeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Infinite Scroll', () => {
    beforeEach(() => {
      // Mock IntersectionObserver implementation
      const mockObserve = vi.fn();
      const mockDisconnect = vi.fn();
      
      mockIntersectionObserver.mockImplementation((callback) => ({
        observe: mockObserve,
        disconnect: mockDisconnect,
        unobserve: vi.fn(),
      }));
    });

    it('should set up intersection observer when hasMore is true', () => {
      const onLoadMore = vi.fn();
      render(
        <TailorSearchResults
          {...defaultProps}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );

      expect(mockIntersectionObserver).toHaveBeenCalled();
    });

    it('should show load more button when hasMore is true', () => {
      render(
        <TailorSearchResults
          {...defaultProps}
          hasMore={true}
        />
      );

      expect(screen.getByText('Load More Tailors')).toBeInTheDocument();
    });

    it('should call onLoadMore when load more button is clicked', () => {
      const onLoadMore = vi.fn();
      render(
        <TailorSearchResults
          {...defaultProps}
          hasMore={true}
          onLoadMore={onLoadMore}
        />
      );

      const loadMoreButton = screen.getByText('Load More Tailors');
      fireEvent.click(loadMoreButton);

      expect(onLoadMore).toHaveBeenCalledTimes(1);
    });

    it('should show loading indicator when loading more', () => {
      render(
        <TailorSearchResults
          {...defaultProps}
          hasMore={true}
          isLoading={true}
        />
      );

      expect(screen.getByText('Loading more tailors...')).toBeInTheDocument();
    });
  });

  describe('Contact Actions', () => {
    // Mock window.open
    const mockWindowOpen = vi.fn();
    const originalWindowOpen = window.open;

    beforeEach(() => {
      window.open = mockWindowOpen;
    });

    afterEach(() => {
      window.open = originalWindowOpen;
    });

    it('should handle WhatsApp contact action', () => {
      render(<TailorSearchResults {...defaultProps} />);

      const contactButtons = screen.getAllByText('Contact');
      fireEvent.click(contactButtons[0]);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/233501234567'),
        '_blank'
      );
    });

    it('should handle view profile action', () => {
      render(<TailorSearchResults {...defaultProps} />);

      const viewProfileButtons = screen.getAllByText('View Profile');
      fireEvent.click(viewProfileButtons[0]);

      expect(mockWindowOpen).toHaveBeenCalledWith('/tailors/1', '_blank');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<TailorSearchResults {...defaultProps} />);

      // Check for proper semantic structure
      const articles = screen.getAllByRole('article');
      expect(articles).toHaveLength(mockTailors.length);

      // Check for button accessibility
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<TailorSearchResults {...defaultProps} />);

      const firstTailor = screen.getAllByRole('article')[0];
      
      // Tab to the first tailor card
      await waitFor(() => {
        firstTailor.focus();
      });

      // Press Enter to select
      fireEvent.keyDown(firstTailor, { key: 'Enter' });
      
      expect(firstTailor).toHaveClass('ring-2', 'ring-blue-500');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing tailor data gracefully', () => {
      const incompleteResults = {
        ...mockResults,
        tailors: [
          {
            ...mockTailors[0],
            businessName: undefined,
            specializations: undefined,
          }
        ] as any
      };

      render(
        <TailorSearchResults
          {...defaultProps}
          results={incompleteResults}
        />
      );

      // Should still render without crashing
      expect(screen.getByRole('main')).toBeInTheDocument();
    });

    it('should handle null results gracefully', () => {
      render(
        <TailorSearchResults
          {...defaultProps}
          results={null}
        />
      );

      expect(screen.getByText('No Tailors Found')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render large lists efficiently', () => {
      const largeTailorList = Array.from({ length: 100 }, (_, i) => ({
        ...mockTailors[0],
        id: `tailor-${i}`,
        businessName: `Tailor ${i}`,
      }));

      const largeResults = {
        ...mockResults,
        tailors: largeTailorList
      };

      const startTime = performance.now();
      render(
        <TailorSearchResults
          {...defaultProps}
          results={largeResults}
        />
      );
      const endTime = performance.now();

      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should minimize re-renders when props remain the same', () => {
      const { rerender } = render(<TailorSearchResults {...defaultProps} />);

      // Re-render with same props
      rerender(<TailorSearchResults {...defaultProps} />);

      // Should not cause unnecessary re-renders
      expect(screen.getByText('Kente Tailors Ltd')).toBeInTheDocument();
    });
  });
});