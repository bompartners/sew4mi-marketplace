import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MapView } from '@/components/features/tailors/MapView';
import { TailorSearchItem } from '@sew4mi/shared';

// Mock Google Maps
const mockMap = {
  setZoom: vi.fn(),
  setCenter: vi.fn(),
  panTo: vi.fn(),
  fitBounds: vi.fn(),
  getZoom: vi.fn(() => 10),
  addListener: vi.fn(() => ({ remove: vi.fn() })),
};

const mockMarker = {
  setMap: vi.fn(),
  addListener: vi.fn(),
};

const mockInfoWindow = {
  open: vi.fn(),
  close: vi.fn(),
  setContent: vi.fn(),
};

const mockBounds = {
  extend: vi.fn(),
};

// Mock Google Maps API
Object.defineProperty(window, 'google', {
  value: {
    maps: {
      Map: vi.fn(() => mockMap),
      Marker: vi.fn(() => mockMarker),
      InfoWindow: vi.fn(() => mockInfoWindow),
      LatLngBounds: vi.fn(() => mockBounds),
      SymbolPath: {
        CIRCLE: 0,
      },
      event: {
        removeListener: vi.fn(),
      },
    },
  },
  writable: true,
});

// Mock environment variable
Object.defineProperty(process.env, 'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', {
  value: 'test-api-key',
  writable: true,
});

describe('MapView', () => {
  const mockTailors: TailorSearchItem[] = [
    {
      id: 'tailor-1',
      userId: 'user-1',
      businessName: 'Kente Masters',
      bio: 'Expert in traditional Kente weaving',
      profilePhoto: '/images/tailor1.jpg',
      yearsOfExperience: 10,
      specializations: ['Kente Weaving', 'Traditional Wear'],
      portfolioImages: ['/portfolio1.jpg', '/portfolio2.jpg'],
      location: { lat: 5.6037, lng: -0.1870 },
      locationName: 'Accra Central',
      city: 'Accra',
      region: 'Greater Accra',
      deliveryRadiusKm: 25,
      verificationStatus: 'VERIFIED',
      rating: 4.8,
      totalReviews: 124,
      completedOrders: 89,
      completionRate: 0.95,
      averageResponseHours: 2,
      averageDeliveryDays: 7,
      onTimeDeliveryRate: 0.92,
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
    {
      id: 'tailor-2',
      userId: 'user-2',
      businessName: 'Modern Designs',
      bio: 'Contemporary fashion designer',
      profilePhoto: '/images/tailor2.jpg',
      yearsOfExperience: 5,
      specializations: ['Wedding Dresses', 'Evening Gowns'],
      portfolioImages: ['/portfolio3.jpg'],
      location: { lat: 5.5560, lng: -0.1969 },
      locationName: 'Osu',
      city: 'Accra',
      region: 'Greater Accra',
      deliveryRadiusKm: 20,
      verificationStatus: 'VERIFIED',
      rating: 4.5,
      totalReviews: 67,
      completedOrders: 45,
      completionRate: 0.88,
      averageResponseHours: 4,
      averageDeliveryDays: 10,
      onTimeDeliveryRate: 0.85,
      capacity: 3,
      vacationMode: false,
      acceptsRushOrders: false,
      rushOrderFeePercentage: 0,
    },
  ] as TailorSearchItem[];

  const mockUserLocation = { lat: 5.6037, lng: -0.1870 };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset global mock functions
    delete (window as any).tailorMapActions;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render map container', () => {
      render(<MapView tailors={mockTailors} />);
      
      const mapContainer = screen.getByRole('generic');
      expect(mapContainer).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<MapView tailors={mockTailors} />);
      
      expect(screen.getByText('Loading map...')).toBeInTheDocument();
    });

    it('should show fallback when Google Maps API key is not configured', () => {
      // Temporarily remove the API key
      const originalApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      render(<MapView tailors={mockTailors} />);
      
      expect(screen.getByText('Map View')).toBeInTheDocument();
      expect(screen.getByText('Map functionality requires Google Maps API configuration')).toBeInTheDocument();
      
      // Restore API key
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalApiKey;
    });
  });

  describe('Tailor Display', () => {
    it('should display tailor information in fallback mode', () => {
      // Remove API key to trigger fallback
      const originalApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      render(<MapView tailors={mockTailors} />);
      
      expect(screen.getByText('Kente Masters')).toBeInTheDocument();
      expect(screen.getByText('Accra')).toBeInTheDocument();
      
      // Restore API key
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalApiKey;
    });

    it('should limit displayed tailors in fallback mode', () => {
      // Remove API key to trigger fallback
      const originalApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      
      const manyTailors = Array.from({ length: 5 }, (_, i) => ({
        ...mockTailors[0],
        id: `tailor-${i}`,
        businessName: `Tailor ${i}`,
      }));
      
      render(<MapView tailors={manyTailors} />);
      
      // Should show only first 3 tailors
      expect(screen.getByText('Tailor 0')).toBeInTheDocument();
      expect(screen.getByText('Tailor 1')).toBeInTheDocument();
      expect(screen.getByText('Tailor 2')).toBeInTheDocument();
      expect(screen.getByText('+2 more tailors')).toBeInTheDocument();
      
      // Restore API key
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = originalApiKey;
    });
  });

  describe('Props Handling', () => {
    it('should handle empty tailors array', () => {
      render(<MapView tailors={[]} />);
      
      const mapContainer = screen.getByRole('generic');
      expect(mapContainer).toBeInTheDocument();
    });

    it('should apply custom height', () => {
      render(<MapView tailors={mockTailors} height={800} />);
      
      const mapContainer = screen.getByRole('generic').firstChild as HTMLElement;
      expect(mapContainer).toHaveStyle({ height: '800px' });
    });

    it('should apply custom className', () => {
      render(<MapView tailors={mockTailors} className="custom-class" />);
      
      const wrapper = screen.getByRole('generic');
      expect(wrapper).toHaveClass('custom-class');
    });
  });

  describe('User Location', () => {
    it('should handle user location', () => {
      render(<MapView tailors={mockTailors} userLocation={mockUserLocation} />);
      
      // Map should be rendered (even in loading state)
      const mapContainer = screen.getByRole('generic');
      expect(mapContainer).toBeInTheDocument();
    });
  });

  describe('Tailor Selection', () => {
    it('should handle tailor selection callback', () => {
      const onTailorSelect = vi.fn();
      
      render(
        <MapView 
          tailors={mockTailors} 
          onTailorSelect={onTailorSelect}
        />
      );
      
      // Should render without errors
      const mapContainer = screen.getByRole('generic');
      expect(mapContainer).toBeInTheDocument();
    });

    it('should handle marker click callback', () => {
      const onMarkerClick = vi.fn();
      
      render(
        <MapView 
          tailors={mockTailors} 
          onMarkerClick={onMarkerClick}
        />
      );
      
      // Should render without errors
      const mapContainer = screen.getByRole('generic');
      expect(mapContainer).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing location data gracefully', () => {
      const tailorsWithoutLocation = mockTailors.map(tailor => ({
        ...tailor,
        location: null,
      }));
      
      render(<MapView tailors={tailorsWithoutLocation} />);
      
      const mapContainer = screen.getByRole('generic');
      expect(mapContainer).toBeInTheDocument();
    });

    it('should show error state when Google Maps fails to load', async () => {
      // Mock a failing Google Maps load
      delete (window as any).google;
      
      render(<MapView tailors={mockTailors} />);
      
      // Should eventually show error state
      await waitFor(() => {
        expect(screen.getByText('Map functionality requires Google Maps API configuration')).toBeInTheDocument();
      });
    });
  });

  describe('Integration', () => {
    it('should set up global tailor actions', () => {
      render(<MapView tailors={mockTailors} />);
      
      // Global actions should be set up
      expect((window as any).tailorMapActions).toBeDefined();
    });

    it('should clean up global tailor actions on unmount', () => {
      const { unmount } = render(<MapView tailors={mockTailors} />);
      
      expect((window as any).tailorMapActions).toBeDefined();
      
      unmount();
      
      expect((window as any).tailorMapActions).toBeUndefined();
    });
  });
});