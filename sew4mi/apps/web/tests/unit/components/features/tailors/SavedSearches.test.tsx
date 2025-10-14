import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SavedSearches } from '@/components/features/tailors/SavedSearches';
import { SavedSearch, TailorSearchFilters } from '@sew4mi/shared';
import { formatDistanceToNow } from 'date-fns';

// Mock the useSavedSearches hook
const mockDeleteSavedSearch = vi.fn();
const mockCheckMatches = vi.fn();
const mockRefetch = vi.fn();
const mockUseSavedSearches = {
  savedSearches: [] as SavedSearch[],
  isLoading: false,
  error: null as string | null,
  deleteSavedSearch: mockDeleteSavedSearch,
  checkMatches: mockCheckMatches,
  refetch: mockRefetch,
};

vi.mock('@/hooks/useSavedSearches', () => ({
  useSavedSearches: () => mockUseSavedSearches,
}));

// Mock the SavedSearchAlert component
vi.mock('@/components/features/tailors/SavedSearchAlert', () => ({
  SavedSearchAlert: ({ search, onClose }: any) => (
    <div data-testid="saved-search-alert">
      <div>Edit: {search.name}</div>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

// Mock formatDistanceToNow
vi.mock('date-fns', () => ({
  formatDistanceToNow: vi.fn((date, options) => '2 days ago'),
}));

describe('SavedSearches', () => {
  const mockSavedSearches: SavedSearch[] = [
    {
      id: 'search-1',
      customerId: 'customer-1',
      name: 'Wedding Tailors in Accra',
      filters: {
        query: 'wedding',
        city: 'Accra',
        occasions: ['Wedding', 'Engagement'],
        minRating: 4,
      },
      alertEnabled: true,
      alertFrequency: 'weekly',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      lastNotifiedAt: '2024-01-05T00:00:00Z',
    },
    {
      id: 'search-2',
      customerId: 'customer-1',
      name: 'Kente Specialists',
      filters: {
        fabricPreferences: ['Kente'],
        styleCategories: ['traditional'],
        deliveryTimeframeMin: 7,
        deliveryTimeframeMax: 14,
      },
      alertEnabled: false,
      alertFrequency: 'daily',
      createdAt: '2024-01-02T00:00:00Z',
      updatedAt: '2024-01-02T00:00:00Z',
      lastNotifiedAt: null,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock data
    mockUseSavedSearches.savedSearches = [];
    mockUseSavedSearches.isLoading = false;
    mockUseSavedSearches.error = null;
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      mockUseSavedSearches.isLoading = true;

      render(<SavedSearches />);

      expect(screen.getByText('Loading saved searches...')).toBeInTheDocument();
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('should show error message when there is an error', () => {
      mockUseSavedSearches.error = 'Failed to load searches';

      render(<SavedSearches />);

      expect(screen.getByText('Error Loading Searches')).toBeInTheDocument();
      expect(screen.getByText('Failed to load searches')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('should call refetch when Try Again is clicked', () => {
      mockUseSavedSearches.error = 'Failed to load searches';

      render(<SavedSearches />);

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);

      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no saved searches', () => {
      mockUseSavedSearches.savedSearches = [];

      render(<SavedSearches />);

      expect(screen.getByText('No Saved Searches')).toBeInTheDocument();
      expect(screen.getByText(/Save your search criteria to get notified/)).toBeInTheDocument();

      // Should show heart icon
      const heartIcon = document.querySelector('svg');
      expect(heartIcon).toBeInTheDocument();
    });
  });

  describe('Saved Searches List', () => {
    it('should render list of saved searches', () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;

      render(<SavedSearches />);

      expect(screen.getByText('Wedding Tailors in Accra')).toBeInTheDocument();
      expect(screen.getByText('Kente Specialists')).toBeInTheDocument();
    });

    it('should show alert status badges', () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;

      render(<SavedSearches />);

      expect(screen.getByText('Weekly')).toBeInTheDocument(); // First search
      expect(screen.getByText('Off')).toBeInTheDocument(); // Second search (disabled)
    });

    it('should render filter summary', () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;

      render(<SavedSearches />);

      // First search summary
      expect(screen.getByText(/"wedding" • Accra • ★ 4\+ • 2 occasions/)).toBeInTheDocument();

      // Second search summary
      expect(screen.getByText(/2 fabrics • 1 styles • 7-14 days/)).toBeInTheDocument();
    });

    it('should show creation and notification timestamps', () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;

      render(<SavedSearches />);

      expect(screen.getByText(/Created 2 days ago/)).toBeInTheDocument();
      expect(screen.getByText(/Notified 2 days ago/)).toBeInTheDocument();
    });
  });

  describe('Load Search Action', () => {
    it('should call onLoadSearch when search button is clicked', () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;
      const onLoadSearch = vi.fn();

      render(<SavedSearches onLoadSearch={onLoadSearch} />);

      const searchButtons = screen.getAllByTitle('Load search');
      fireEvent.click(searchButtons[0]);

      expect(onLoadSearch).toHaveBeenCalledWith(mockSavedSearches[0].filters);
    });
  });

  describe('Check Matches Action', () => {
    it('should check for new matches when check button is clicked', async () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;
      mockCheckMatches.mockResolvedValue([
        { tailorId: 'tailor-1', tailorName: 'Test Tailor', matchedAt: '2024-01-06T00:00:00Z' }
      ]);

      // Mock window.alert
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<SavedSearches />);

      const checkButtons = screen.getAllByTitle('Check for new matches');
      fireEvent.click(checkButtons[0]);

      await waitFor(() => {
        expect(mockCheckMatches).toHaveBeenCalledWith(
          'search-1',
          new Date('2024-01-05T00:00:00Z')
        );
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Found 1 new matching tailors!');
      });

      alertSpy.mockRestore();
    });

    it('should show no matches message when no new matches', async () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;
      mockCheckMatches.mockResolvedValue([]);

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<SavedSearches />);

      const checkButtons = screen.getAllByTitle('Check for new matches');
      fireEvent.click(checkButtons[1]); // Check second search (no lastNotifiedAt)

      await waitFor(() => {
        expect(mockCheckMatches).toHaveBeenCalledWith('search-2', undefined);
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('No new matches found.');
      });

      alertSpy.mockRestore();
    });

    it('should show loading spinner while checking matches', async () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;
      mockCheckMatches.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<SavedSearches />);

      const checkButtons = screen.getAllByTitle('Check for new matches');
      fireEvent.click(checkButtons[0]);

      await waitFor(() => {
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('should handle check matches errors', async () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;
      mockCheckMatches.mockRejectedValue(new Error('Network error'));

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<SavedSearches />);

      const checkButtons = screen.getAllByTitle('Check for new matches');
      fireEvent.click(checkButtons[0]);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to check matches:', expect.any(Error));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to check for new matches. Please try again.');
      });

      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });

    it('should display match count badge after checking', async () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;
      mockCheckMatches.mockResolvedValue([
        { tailorId: 'tailor-1', tailorName: 'Test Tailor', matchedAt: '2024-01-06T00:00:00Z' },
        { tailorId: 'tailor-2', tailorName: 'Test Tailor 2', matchedAt: '2024-01-06T00:00:00Z' }
      ]);

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(<SavedSearches />);

      const checkButtons = screen.getAllByTitle('Check for new matches');
      fireEvent.click(checkButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('2 new')).toBeInTheDocument();
      });

      alertSpy.mockRestore();
    });
  });

  describe('Edit Action', () => {
    it('should open edit dialog when edit button is clicked', () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;

      render(<SavedSearches />);

      const editButtons = screen.getAllByTitle('Edit alert settings');
      fireEvent.click(editButtons[0]);

      expect(screen.getByTestId('saved-search-alert')).toBeInTheDocument();
      expect(screen.getByText('Edit: Wedding Tailors in Accra')).toBeInTheDocument();
    });

    it('should close edit dialog and refetch when close is clicked', () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;

      render(<SavedSearches />);

      const editButtons = screen.getAllByTitle('Edit alert settings');
      fireEvent.click(editButtons[0]);

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('saved-search-alert')).not.toBeInTheDocument();
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe('Delete Action', () => {
    it('should open delete confirmation dialog when delete button is clicked', () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;

      render(<SavedSearches />);

      const deleteButtons = screen.getAllByTitle('Delete search');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Delete Saved Search?')).toBeInTheDocument();
      expect(screen.getByText(/This will permanently delete this saved search/)).toBeInTheDocument();
    });

    it('should delete search when confirmed', async () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;
      mockDeleteSavedSearch.mockResolvedValue(undefined);

      render(<SavedSearches />);

      const deleteButtons = screen.getAllByTitle('Delete search');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockDeleteSavedSearch).toHaveBeenCalledWith('search-1');
      });
    });

    it('should close dialog when cancel is clicked', () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;

      render(<SavedSearches />);

      const deleteButtons = screen.getAllByTitle('Delete search');
      fireEvent.click(deleteButtons[0]);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Delete Saved Search?')).not.toBeInTheDocument();
      expect(mockDeleteSavedSearch).not.toHaveBeenCalled();
    });

    it('should handle delete errors', async () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;
      mockDeleteSavedSearch.mockRejectedValue(new Error('Failed to delete'));

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<SavedSearches />);

      const deleteButtons = screen.getAllByTitle('Delete search');
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByText('Delete');
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete saved search:', expect.any(Error));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to delete search. Please try again.');
      });

      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      mockUseSavedSearches.savedSearches = mockSavedSearches;

      const { container } = render(<SavedSearches className="custom-class" />);

      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('custom-class');
    });
  });
});