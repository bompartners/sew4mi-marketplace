import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FavoriteButton } from '@/components/features/tailors/FavoriteButton';
import { TailorSearchItem } from '@sew4mi/shared';

// Mock the useFavorites hook
const mockToggleFavorite = vi.fn();
const mockIsFavorite = vi.fn();

vi.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({
    toggleFavorite: mockToggleFavorite,
    isFavorite: mockIsFavorite,
  }),
}));

describe('FavoriteButton', () => {
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
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockToggleFavorite.mockResolvedValue(undefined);
  });

  describe('Rendering', () => {
    it('should render heart icon', () => {
      mockIsFavorite.mockReturnValue(false);
      
      render(<FavoriteButton tailor={mockTailor} />);
      
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      // Should have heart icon
      const heartIcon = button.querySelector('svg');
      expect(heartIcon).toBeInTheDocument();
    });

    it('should show text when showText is true', () => {
      mockIsFavorite.mockReturnValue(false);
      
      render(<FavoriteButton tailor={mockTailor} showText={true} />);
      
      expect(screen.getByText('Save')).toBeInTheDocument();
    });

    it('should show "Saved" text when favorited and showText is true', () => {
      mockIsFavorite.mockReturnValue(true);
      
      render(<FavoriteButton tailor={mockTailor} showText={true} />);
      
      expect(screen.getByText('Saved')).toBeInTheDocument();
    });
  });

  describe('Favorite Status', () => {
    it('should show unfavorited state by default', () => {
      mockIsFavorite.mockReturnValue(false);
      
      render(<FavoriteButton tailor={mockTailor} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Add Test Tailor to favorites');
    });

    it('should show favorited state when isFavorite returns true', () => {
      mockIsFavorite.mockReturnValue(true);
      
      render(<FavoriteButton tailor={mockTailor} />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Remove Test Tailor from favorites');
    });
  });

  describe('Click Handling', () => {
    it('should call toggleFavorite when clicked', async () => {
      mockIsFavorite.mockReturnValue(false);
      
      render(<FavoriteButton tailor={mockTailor} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockToggleFavorite).toHaveBeenCalledWith(mockTailor);
    });

    it('should prevent event propagation when clicked', async () => {
      mockIsFavorite.mockReturnValue(false);
      const parentClickHandler = vi.fn();
      
      render(
        <div onClick={parentClickHandler}>
          <FavoriteButton tailor={mockTailor} />
        </div>
      );
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      expect(mockToggleFavorite).toHaveBeenCalled();
      expect(parentClickHandler).not.toHaveBeenCalled();
    });

    it('should disable button while loading', async () => {
      mockIsFavorite.mockReturnValue(false);
      mockToggleFavorite.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<FavoriteButton tailor={mockTailor} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Button should be disabled while request is in progress
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });

    it('should show loading spinner while toggling', async () => {
      mockIsFavorite.mockReturnValue(false);
      mockToggleFavorite.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<FavoriteButton tailor={mockTailor} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      // Should show loading spinner
      await waitFor(() => {
        const spinner = button.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });
  });

  describe('Variants and Styling', () => {
    it('should apply custom className', () => {
      mockIsFavorite.mockReturnValue(false);
      
      render(<FavoriteButton tailor={mockTailor} className="custom-class" />);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });

    it('should support different variants', () => {
      mockIsFavorite.mockReturnValue(false);
      
      const { rerender } = render(<FavoriteButton tailor={mockTailor} variant="outline" />);
      
      let button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      rerender(<FavoriteButton tailor={mockTailor} variant="default" />);
      button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should support different sizes', () => {
      mockIsFavorite.mockReturnValue(false);
      
      const { rerender } = render(<FavoriteButton tailor={mockTailor} size="lg" />);
      
      let button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      
      rerender(<FavoriteButton tailor={mockTailor} size="sm" />);
      button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });

  describe('Tooltip', () => {
    it('should show tooltip on hover when showText is false', async () => {
      mockIsFavorite.mockReturnValue(false);
      
      render(<FavoriteButton tailor={mockTailor} showText={false} />);
      
      const button = screen.getByRole('button');
      
      // Hover over button
      fireEvent.mouseEnter(button);
      
      await waitFor(() => {
        expect(screen.getByText('Add to favorites')).toBeInTheDocument();
      });
      
      // Mouse leave should hide tooltip
      fireEvent.mouseLeave(button);
      
      await waitFor(() => {
        expect(screen.queryByText('Add to favorites')).not.toBeInTheDocument();
      });
    });

    it('should show different tooltip text based on favorite status', async () => {
      mockIsFavorite.mockReturnValue(true);
      
      render(<FavoriteButton tailor={mockTailor} showText={false} />);
      
      const button = screen.getByRole('button');
      
      fireEvent.mouseEnter(button);
      
      await waitFor(() => {
        expect(screen.getByText('Remove from favorites')).toBeInTheDocument();
      });
    });

    it('should not show tooltip when showText is true', async () => {
      mockIsFavorite.mockReturnValue(false);
      
      render(<FavoriteButton tailor={mockTailor} showText={true} />);
      
      const button = screen.getByRole('button');
      
      fireEvent.mouseEnter(button);
      
      // Wait a bit to ensure tooltip doesn't appear
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(screen.queryByText('Add to favorites')).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle toggle errors gracefully', async () => {
      mockIsFavorite.mockReturnValue(false);
      mockToggleFavorite.mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<FavoriteButton tailor={mockTailor} />);
      
      const button = screen.getByRole('button');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to toggle favorite:', expect.any(Error));
      });
      
      // Button should be re-enabled after error
      await waitFor(() => {
        expect(button).not.toBeDisabled();
      });
      
      consoleSpy.mockRestore();
    });
  });
});