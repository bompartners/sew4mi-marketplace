import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FeaturedTailors } from '@/components/features/tailors/FeaturedTailors';
import { FeaturedTailor } from '@sew4mi/shared';

// Mock the TailorCard component
vi.mock('@/components/features/tailors/TailorCard', () => ({
  TailorCard: ({ tailor }: { tailor: any }) => (
    <div data-testid={`tailor-card-${tailor.id}`}>
      <h3>{tailor.businessName}</h3>
    </div>
  ),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('FeaturedTailors', () => {
  const mockFeaturedTailors: FeaturedTailor[] = [
    {
      id: 'featured-1',
      featuredReason: 'HIGH_RATING',
      featuredUntil: '2024-12-31',
      promotionalBadge: 'Top Rated',
            tailor: {
        id: 'tailor-1',
        userId: 'user-1',
        businessName: 'Elite Kente Masters',
        bio: 'Expert in traditional Kente weaving',
        profilePhoto: '/photos/tailor1.jpg',
        yearsOfExperience: 10,
        specializations: ['Kente Weaving', 'Traditional Wear'],
        portfolioImages: [],
        location: { lat: 5.6037, lng: -0.1870 },
        locationName: 'Accra Central',
        city: 'Accra',
        region: 'Greater Accra',
        deliveryRadiusKm: 25,
        verificationStatus: 'VERIFIED' as const,
        rating: 4.9,
        totalReviews: 150,
        completedOrders: 120,
        completionRate: 0.98,
        averageResponseHours: 1,
        averageDeliveryDays: 5,
        onTimeDeliveryRate: 0.95,
        capacity: 5,
        vacationMode: false,
        acceptsRushOrders: true,
        rushOrderFeePercentage: 20,
        user: {
          id: 'user-1',
          fullName: 'John Doe',
          phoneNumber: '+233201234567',
          whatsappNumber: '+233201234567',
        },
      },
    },
    {
      id: 'featured-2',
      featuredReason: 'FAST_RESPONSE',
      featuredUntil: '2024-12-31',
      promotionalBadge: 'Quick Response',
            tailor: {
        id: 'tailor-2',
        userId: 'user-2',
        businessName: 'Modern Designs Studio',
        bio: 'Contemporary fashion designer',
        profilePhoto: '/photos/tailor2.jpg',
        yearsOfExperience: 5,
        specializations: ['Wedding Dresses', 'Evening Gowns'],
        portfolioImages: [],
        location: { lat: 5.5560, lng: -0.1969 },
        locationName: 'Osu',
        city: 'Accra',
        region: 'Greater Accra',
        deliveryRadiusKm: 20,
        verificationStatus: 'VERIFIED' as const,
        rating: 4.7,
        totalReviews: 80,
        completedOrders: 65,
        completionRate: 0.92,
        averageResponseHours: 0.5,
        averageDeliveryDays: 8,
        onTimeDeliveryRate: 0.88,
        capacity: 3,
        vacationMode: false,
        acceptsRushOrders: false,
        rushOrderFeePercentage: 0,
        user: {
          id: 'user-2',
          fullName: 'Jane Smith',
          phoneNumber: '+233209876543',
          whatsappNumber: '+233209876543',
        },
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Loading State', () => {
    it('should show loading skeletons while fetching', async () => {
      // Mock delayed response
      mockFetch.mockImplementation(() => new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ featuredTailors: mockFeaturedTailors })
        }), 100)
      ));

      render(<FeaturedTailors />);

      // Should show loading state (skeleton elements have animate-pulse class)
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
      
      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Featured Tailors')).toBeInTheDocument();
        expect(screen.getByTestId('tailor-card-tailor-1')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Successful Data Loading', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ featuredTailors: mockFeaturedTailors }),
      });
    });

    it('should render featured tailors', async () => {
      render(<FeaturedTailors />);

      await waitFor(() => {
        expect(screen.getByText('Featured Tailors')).toBeInTheDocument();
        expect(screen.getByTestId('tailor-card-tailor-1')).toBeInTheDocument();
        expect(screen.getByTestId('tailor-card-tailor-2')).toBeInTheDocument();
      });
    });

    it('should show correct featured badges', async () => {
      render(<FeaturedTailors />);

      await waitFor(() => {
        expect(screen.getByText('Top Rated')).toBeInTheDocument();
        expect(screen.getByText('Fast Response')).toBeInTheDocument();
      });
    });

    it('should show view all button when showViewAll is true', async () => {
      render(<FeaturedTailors showViewAll={true} />);

      await waitFor(() => {
        expect(screen.getByText('View All')).toBeInTheDocument();
      });
    });

    it('should hide view all button when showViewAll is false', async () => {
      render(<FeaturedTailors showViewAll={false} />);

      await waitFor(() => {
        expect(screen.queryByText('View All')).not.toBeInTheDocument();
      });
    });
  });

  describe('Featured Reason Icons', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ featuredTailors: mockFeaturedTailors }),
      });
    });

    it('should show correct icons for different featured reasons', async () => {
      render(<FeaturedTailors />);

      await waitFor(() => {
        // Check for HIGH_RATING (Top Rated)
        const topRatedBadge = screen.getByText('Top Rated').closest('.bg-yellow-500');
        expect(topRatedBadge).toBeInTheDocument();

        // Check for FAST_RESPONSE (Fast Response)  
        const fastResponseBadge = screen.getByText('Fast Response').closest('.bg-blue-500');
        expect(fastResponseBadge).toBeInTheDocument();
      });
    });
  });

  describe('Carousel Functionality', () => {
    beforeEach(() => {
      // Create more tailors to enable carousel
      const manyTailors = Array.from({ length: 10 }, (_, i) => ({
        ...mockFeaturedTailors[0],
        id: `featured-${i}`,
      }));

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ featuredTailors: manyTailors }),
      });
    });

    it('should show carousel controls when there are multiple slides', async () => {
      render(<FeaturedTailors />);

      await waitFor(() => {
        // Should show navigation arrows on mobile/tablet view
        const leftArrows = document.querySelectorAll('[aria-label*="previous"], [class*="ChevronLeft"]');
        const rightArrows = document.querySelectorAll('[aria-label*="next"], [class*="ChevronRight"]');
        
        // Carousel controls should be present in DOM (may be hidden by CSS)
        expect(leftArrows.length + rightArrows.length).toBeGreaterThan(0);
      });
    });

    it('should show carousel indicators', async () => {
      render(<FeaturedTailors />);

      await waitFor(() => {
        // Look for carousel dot indicators
        const indicators = document.querySelectorAll('button[class*="rounded-full"]');
        expect(indicators.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<FeaturedTailors />);

      await waitFor(() => {
        expect(screen.getByText('Featured Tailors')).toBeInTheDocument();
        expect(screen.getByText('Unable to load featured tailors at the moment')).toBeInTheDocument();
      });
    });

    it('should show error state when API returns error status', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<FeaturedTailors />);

      await waitFor(() => {
        expect(screen.getByText('Unable to load featured tailors at the moment')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no featured tailors', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ featuredTailors: [] }),
      });

      render(<FeaturedTailors />);

      await waitFor(() => {
        expect(screen.getByText('No Featured Tailors')).toBeInTheDocument();
        expect(screen.getByText('Check back soon for featured expert tailors in your area')).toBeInTheDocument();
      });
    });
  });

  describe('Props Handling', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ featuredTailors: mockFeaturedTailors }),
      });
    });

    it('should respect limit prop', async () => {
      mockFetch.mockImplementation((url) => {
        expect(url).toContain('limit=3');
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ featuredTailors: mockFeaturedTailors.slice(0, 1) }),
        });
      });

      render(<FeaturedTailors limit={3} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/tailors/featured?limit=3');
      });
    });

    it('should apply custom className', async () => {
      const { container } = render(<FeaturedTailors className="custom-class" />);

      await waitFor(() => {
        const component = container.querySelector('.custom-class');
        expect(component).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Behavior', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ featuredTailors: mockFeaturedTailors }),
      });
    });

    it('should have responsive grid layout classes', async () => {
      render(<FeaturedTailors />);

      await waitFor(() => {
        // Check for responsive grid classes
        const gridContainer = document.querySelector('.grid');
        expect(gridContainer).toHaveClass('grid-cols-1');
        expect(gridContainer).toHaveClass('md:grid-cols-2');
        expect(gridContainer).toHaveClass('lg:grid-cols-3');
      });
    });
  });
});