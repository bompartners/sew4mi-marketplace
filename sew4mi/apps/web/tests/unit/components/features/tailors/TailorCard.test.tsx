import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TailorCard } from '@/components/features/tailors/TailorCard';
import { TailorSearchItem } from '@sew4mi/shared';

// Mock child components
vi.mock('@/components/features/tailors/FavoriteButton', () => ({
  FavoriteButton: ({ tailor, variant, size }: any) => (
    <button data-testid={`favorite-button-${tailor.id}`} className={`variant-${variant} size-${size}`}>
      Favorite {tailor.businessName}
    </button>
  ),
}));

// Mock window.open
const mockWindowOpen = vi.fn();
const originalWindowOpen = window.open;

// Sample test data
const mockTailor: TailorSearchItem = {
  id: 'tailor-1',
  businessName: 'Kente Designs Ltd',
  specializations: ['Traditional Wear', 'Suits', 'Dresses', 'Casual Wear'],
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
  profilePhoto: 'https://example.com/profile.jpg',
  portfolioImages: [
    'https://example.com/portfolio1.jpg',
    'https://example.com/portfolio2.jpg',
    'https://example.com/portfolio3.jpg',
    'https://example.com/portfolio4.jpg'
  ],
  bio: 'Expert in traditional Ghanaian wear with modern touches. Over 8 years of experience.',
  yearsOfExperience: 8,
  rushOrderFeePercentage: 25,
  user: {
    whatsappNumber: '+233501234567'
  },
  isFavorite: false
};

const defaultProps = {
  tailor: mockTailor,
  showDistance: false,
  isSelected: false,
  onSelect: vi.fn(),
  onFavoriteToggle: vi.fn(),
};

describe('TailorCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.open = mockWindowOpen;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.open = originalWindowOpen;
  });

  describe('Basic Rendering', () => {
    it('should render tailor information correctly', () => {
      render(<TailorCard {...defaultProps} />);

      expect(screen.getByText('Kente Designs Ltd')).toBeInTheDocument();
      expect(screen.getByText('4.8')).toBeInTheDocument();
      expect(screen.getByText('(25)')).toBeInTheDocument();
      expect(screen.getByText('Accra')).toBeInTheDocument();
      expect(screen.getByText('150 orders')).toBeInTheDocument();
      expect(screen.getByText('95% on-time')).toBeInTheDocument();
      expect(screen.getByText('From ₵50')).toBeInTheDocument();
    });

    it('should render profile photo when available', () => {
      render(<TailorCard {...defaultProps} />);

      const profileImage = screen.getByAltText('Kente Designs Ltd');
      expect(profileImage).toBeInTheDocument();
      expect(profileImage).toHaveAttribute('src', 'https://example.com/profile.jpg');
    });

    it('should render placeholder when no profile photo', () => {
      const tailorWithoutPhoto = { ...mockTailor, profilePhoto: null };
      render(<TailorCard {...defaultProps} tailor={tailorWithoutPhoto} />);

      // Should show business name in placeholder
      expect(screen.getByText('Kente Designs Ltd')).toBeInTheDocument();
      // Should not have img tag
      expect(screen.queryByAltText('Kente Designs Ltd')).not.toBeInTheDocument();
    });

    it('should display specializations with limit', () => {
      render(<TailorCard {...defaultProps} />);

      // Should show first 3 specializations
      expect(screen.getByText('Traditional Wear')).toBeInTheDocument();
      expect(screen.getByText('Suits')).toBeInTheDocument();
      expect(screen.getByText('Dresses')).toBeInTheDocument();
      
      // Should show "+1" for remaining
      expect(screen.getByText('+1')).toBeInTheDocument();
      expect(screen.queryByText('Casual Wear')).not.toBeInTheDocument();
    });

    it('should show verification badge for verified tailors', () => {
      render(<TailorCard {...defaultProps} />);

      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('should not show verification badge for unverified tailors', () => {
      const unverifiedTailor = { ...mockTailor, verificationStatus: 'PENDING' as const };
      render(<TailorCard {...defaultProps} tailor={unverifiedTailor} />);

      expect(screen.queryByText('Verified')).not.toBeInTheDocument();
    });
  });

  describe('Distance Display', () => {
    it('should show distance when showDistance is true', () => {
      render(<TailorCard {...defaultProps} showDistance={true} />);

      expect(screen.getByText('2.5 km')).toBeInTheDocument();
    });

    it('should not show distance when showDistance is false', () => {
      render(<TailorCard {...defaultProps} showDistance={false} />);

      expect(screen.queryByText('2.5 km')).not.toBeInTheDocument();
    });
  });

  describe('Selection State', () => {
    it('should apply selected styling when isSelected is true', () => {
      render(<TailorCard {...defaultProps} isSelected={true} />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i }).closest('[role="button"]');
      expect(card).toHaveClass('ring-2', 'ring-blue-500');
    });

    it('should not apply selected styling when isSelected is false', () => {
      render(<TailorCard {...defaultProps} isSelected={false} />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i }).closest('[role="button"]');
      expect(card).not.toHaveClass('ring-2', 'ring-blue-500');
    });

    it('should call onSelect when card is clicked', () => {
      const onSelect = vi.fn();
      render(<TailorCard {...defaultProps} onSelect={onSelect} />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i });
      fireEvent.click(card);

      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Response Time Badge', () => {
    it('should show fast response badge for quick responders', () => {
      const fastTailor = { ...mockTailor, averageResponseHours: 1 };
      render(<TailorCard {...defaultProps} tailor={fastTailor} />);

      expect(screen.getByText('Fast Response')).toBeInTheDocument();
    });

    it('should not show fast response badge for slow responders', () => {
      const slowTailor = { ...mockTailor, averageResponseHours: 5 };
      render(<TailorCard {...defaultProps} tailor={slowTailor} />);

      expect(screen.queryByText('Fast Response')).not.toBeInTheDocument();
    });
  });

  describe('Bio Display', () => {
    it('should display bio when available', () => {
      render(<TailorCard {...defaultProps} />);

      expect(screen.getByText(/Expert in traditional Ghanaian wear/)).toBeInTheDocument();
    });

    it('should not display bio section when bio is empty', () => {
      const tailorWithoutBio = { ...mockTailor, bio: null };
      render(<TailorCard {...defaultProps} tailor={tailorWithoutBio} />);

      expect(screen.queryByText(/Expert in traditional/)).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render profile and contact buttons', () => {
      render(<TailorCard {...defaultProps} />);

      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    it('should handle profile button click', () => {
      render(<TailorCard {...defaultProps} />);

      const profileButton = screen.getByText('Profile');
      fireEvent.click(profileButton);

      expect(mockWindowOpen).toHaveBeenCalledWith('/tailors/tailor-1', '_blank');
    });

    it('should handle contact button click with WhatsApp', () => {
      render(<TailorCard {...defaultProps} />);

      const contactButton = screen.getByText('Contact');
      fireEvent.click(contactButton);

      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/233501234567'),
        '_blank'
      );
      expect(mockWindowOpen).toHaveBeenCalledWith(
        expect.stringContaining('I found your profile on Sew4Mi'),
        '_blank'
      );
    });

    it('should handle contact button click without WhatsApp', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const tailorWithoutWhatsApp = { 
        ...mockTailor, 
        user: { whatsappNumber: null } 
      };
      
      render(<TailorCard {...defaultProps} tailor={tailorWithoutWhatsApp} />);

      const contactButton = screen.getByText('Contact');
      fireEvent.click(contactButton);

      expect(consoleSpy).toHaveBeenCalledWith('Contact tailor:', 'tailor-1');
      expect(mockWindowOpen).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should prevent event propagation for action buttons', () => {
      const onSelect = vi.fn();
      render(<TailorCard {...defaultProps} onSelect={onSelect} />);

      const profileButton = screen.getByText('Profile');
      fireEvent.click(profileButton);

      // onSelect should not be called when clicking action buttons
      expect(onSelect).not.toHaveBeenCalled();
    });
  });

  describe('Favorite Button Integration', () => {
    it('should render favorite button with correct props', () => {
      render(<TailorCard {...defaultProps} />);

      const favoriteButton = screen.getByTestId('favorite-button-tailor-1');
      expect(favoriteButton).toBeInTheDocument();
      expect(favoriteButton).toHaveClass('variant-ghost', 'size-sm');
    });
  });

  describe('Hover Effects', () => {
    it('should show additional info on hover', async () => {
      render(<TailorCard {...defaultProps} />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i });
      
      fireEvent.mouseEnter(card);

      // Wait for hover animation
      await waitFor(() => {
        expect(screen.getByText('8 years exp.')).toBeInTheDocument();
      });

      expect(screen.getByText('Rush orders: +25%')).toBeInTheDocument();
    });

    it('should show portfolio images on hover', async () => {
      render(<TailorCard {...defaultProps} />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i });
      
      fireEvent.mouseEnter(card);

      await waitFor(() => {
        expect(screen.getByText('Portfolio:')).toBeInTheDocument();
        expect(screen.getByText('+1')).toBeInTheDocument(); // Shows +1 for additional images
      });

      // Should show first 3 portfolio images
      const portfolioImages = screen.getAllByAltText(/Portfolio \d/);
      expect(portfolioImages).toHaveLength(3);
    });

    it('should handle missing portfolio images gracefully', async () => {
      const tailorWithoutPortfolio = { ...mockTailor, portfolioImages: [] };
      render(<TailorCard {...defaultProps} tailor={tailorWithoutPortfolio} />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i });
      fireEvent.mouseEnter(card);

      await waitFor(() => {
        expect(screen.queryByText('Portfolio:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Years of Experience Display', () => {
    it('should show years of experience when available', async () => {
      render(<TailorCard {...defaultProps} />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i });
      fireEvent.mouseEnter(card);

      await waitFor(() => {
        expect(screen.getByText('8 years exp.')).toBeInTheDocument();
      });
    });

    it('should show "New tailor" when years of experience is missing', async () => {
      const newTailor = { ...mockTailor, yearsOfExperience: 0 };
      render(<TailorCard {...defaultProps} tailor={newTailor} />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i });
      fireEvent.mouseEnter(card);

      await waitFor(() => {
        expect(screen.getByText('New tailor')).toBeInTheDocument();
      });
    });
  });

  describe('Rush Order Fee Display', () => {
    it('should show rush order fee when greater than 0', async () => {
      render(<TailorCard {...defaultProps} />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i });
      fireEvent.mouseEnter(card);

      await waitFor(() => {
        expect(screen.getByText('Rush orders: +25%')).toBeInTheDocument();
      });
    });

    it('should not show rush order fee when 0', async () => {
      const tailorWithoutRushFee = { ...mockTailor, rushOrderFeePercentage: 0 };
      render(<TailorCard {...defaultProps} tailor={tailorWithoutRushFee} />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i });
      fireEvent.mouseEnter(card);

      await waitFor(() => {
        expect(screen.queryByText(/Rush orders:/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TailorCard {...defaultProps} />);

      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
      
      // Action buttons should be properly labeled
      const profileButton = screen.getByText('Profile');
      const contactButton = screen.getByText('Contact');
      
      expect(profileButton).toBeInTheDocument();
      expect(contactButton).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      const onSelect = vi.fn();
      render(<TailorCard {...defaultProps} onSelect={onSelect} />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i });
      
      // Should be focusable
      card.focus();
      expect(document.activeElement).toBe(card);

      // Should respond to Enter key
      fireEvent.keyDown(card, { key: 'Enter' });
      expect(onSelect).toHaveBeenCalledTimes(1);

      // Should respond to Space key
      fireEvent.keyDown(card, { key: ' ' });
      expect(onSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required fields gracefully', () => {
      const incompleteTailor = {
        ...mockTailor,
        businessName: undefined,
        rating: undefined,
        totalReviews: undefined,
      } as any;

      expect(() => {
        render(<TailorCard {...defaultProps} tailor={incompleteTailor} />);
      }).not.toThrow();
    });

    it('should handle broken image URLs gracefully', () => {
      const tailorWithBrokenImage = {
        ...mockTailor,
        profilePhoto: 'https://broken-url.com/image.jpg'
      };

      render(<TailorCard {...defaultProps} tailor={tailorWithBrokenImage} />);

      const image = screen.getByAltText('Kente Designs Ltd');
      fireEvent.error(image);

      // Should still render the card
      expect(screen.getByText('Kente Designs Ltd')).toBeInTheDocument();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className when provided', () => {
      render(<TailorCard {...defaultProps} className="custom-card-class" />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i }).closest('[role="button"]');
      expect(card).toHaveClass('custom-card-class');
    });

    it('should maintain default styling without custom className', () => {
      render(<TailorCard {...defaultProps} />);

      const card = screen.getByRole('button', { name: /kente designs ltd/i }).closest('[role="button"]');
      expect(card).toHaveClass('group', 'cursor-pointer', 'transition-all');
    });
  });
});