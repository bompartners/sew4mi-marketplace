import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SaveSearchDialog } from '@/components/features/tailors/SaveSearchDialog';
import { TailorSearchFilters } from '@sew4mi/shared';

// Mock the useSavedSearches hook
const mockCreateSavedSearch = vi.fn();
vi.mock('@/hooks/useSavedSearches', () => ({
  useSavedSearches: () => ({
    createSavedSearch: mockCreateSavedSearch,
  }),
}));

describe('SaveSearchDialog', () => {
  const mockFilters: TailorSearchFilters = {
    query: 'wedding',
    city: 'Accra',
    occasions: ['Wedding'],
    minRating: 4,
  };

  const mockOnClose = vi.fn();
  const mockOnSaved = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render dialog when open', () => {
      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Save Search')).toBeInTheDocument();
      expect(screen.getByText(/Save your search criteria and get notified/)).toBeInTheDocument();
    });

    it('should not render dialog when closed', () => {
      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={false}
          onClose={mockOnClose}
        />
      );

      expect(screen.queryByText('Save Search')).not.toBeInTheDocument();
    });

    it('should render search name input', () => {
      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      const nameInput = screen.getByLabelText(/Search Name/);
      expect(nameInput).toBeInTheDocument();
      expect(nameInput).toHaveAttribute('placeholder', 'e.g., Wedding Tailors in Accra');
      expect(nameInput).toHaveAttribute('maxLength', '100');
    });

    it('should render enable alerts checkbox', () => {
      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Enable Alerts')).toBeInTheDocument();
      expect(screen.getByText('Get notified about new matching tailors')).toBeInTheDocument();
    });

    it('should render alert frequency selector when alerts enabled', () => {
      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Alert Frequency')).toBeInTheDocument();
      expect(screen.getByText('Weekly (Mondays, 8:00 AM)')).toBeInTheDocument();
    });

    it('should render info card', () => {
      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('How it works:')).toBeInTheDocument();
      expect(screen.getByText(/Your search filters will be saved securely/)).toBeInTheDocument();
      expect(screen.getByText(/You'll receive notifications via WhatsApp, SMS, and Email/)).toBeInTheDocument();
      expect(screen.getByText(/Maximum 10 saved searches per account/)).toBeInTheDocument();
    });
  });

  describe('Form Interactions', () => {
    it('should update search name when input changes', () => {
      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      const nameInput = screen.getByLabelText(/Search Name/) as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'My Custom Search' } });

      expect(nameInput.value).toBe('My Custom Search');
    });

    it('should toggle alerts when checkbox is clicked', () => {
      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      // Initially enabled (default)
      expect(screen.getByText('Alert Frequency')).toBeInTheDocument();

      // Find and click the checkbox
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      // Should hide frequency selector when disabled
      expect(screen.queryByText('Alert Frequency')).not.toBeInTheDocument();
    });

    it('should change alert frequency when option is selected', async () => {
      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      // Click the select trigger
      const selectTrigger = screen.getByRole('combobox');
      fireEvent.click(selectTrigger);

      // Select instant option
      await waitFor(() => {
        const instantOption = screen.getByText('Instant (every 15 minutes)');
        fireEvent.click(instantOption);
      });

      await waitFor(() => {
        expect(screen.getByText(/Receive alerts within 15 minutes/)).toBeInTheDocument();
      });
    });
  });

  describe('Save Functionality', () => {
    it('should save search with valid data', async () => {
      mockCreateSavedSearch.mockResolvedValue({
        id: 'search-1',
        customerId: 'customer-1',
        name: 'My Search',
        filters: mockFilters,
        alertEnabled: true,
        alertFrequency: 'weekly',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastNotifiedAt: null,
      });

      const alertSpy = vi.spyOn(window, 'alert');

      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
          onSaved={mockOnSaved}
        />
      );

      const nameInput = screen.getByLabelText(/Search Name/);
      fireEvent.change(nameInput, { target: { value: 'My Search' } });

      const saveButton = screen.getByRole('button', { name: /Save Search/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCreateSavedSearch).toHaveBeenCalledWith({
          name: 'My Search',
          filters: mockFilters,
          alertEnabled: true,
          alertFrequency: 'weekly',
        });
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Search saved successfully! You can manage your saved searches from your dashboard.'
        );
        expect(mockOnClose).toHaveBeenCalled();
        expect(mockOnSaved).toHaveBeenCalled();
      });
    });

    it('should show alert when name is empty', async () => {
      const alertSpy = vi.spyOn(window, 'alert');

      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: /Save Search/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Please enter a name for your saved search.');
        expect(mockCreateSavedSearch).not.toHaveBeenCalled();
      });
    });

    it('should disable save button when name is empty', () => {
      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      const saveButton = screen.getByRole('button', { name: /Save Search/i });
      expect(saveButton).toBeDisabled();

      const nameInput = screen.getByLabelText(/Search Name/);
      fireEvent.change(nameInput, { target: { value: 'Test' } });

      expect(saveButton).not.toBeDisabled();
    });

    it('should show loading state while saving', async () => {
      mockCreateSavedSearch.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      const nameInput = screen.getByLabelText(/Search Name/);
      fireEvent.change(nameInput, { target: { value: 'My Search' } });

      const saveButton = screen.getByRole('button', { name: /Save Search/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
        const spinner = document.querySelector('.animate-spin');
        expect(spinner).toBeInTheDocument();
      });
    });

    it('should handle save errors', async () => {
      mockCreateSavedSearch.mockRejectedValue(new Error('Maximum saved searches reached'));
      const alertSpy = vi.spyOn(window, 'alert');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      const nameInput = screen.getByLabelText(/Search Name/);
      fireEvent.change(nameInput, { target: { value: 'My Search' } });

      const saveButton = screen.getByRole('button', { name: /Save Search/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to save search:', expect.any(Error));
        expect(alertSpy).toHaveBeenCalledWith('Maximum saved searches reached');
      });

      consoleSpy.mockRestore();
    });

    it('should reset form after successful save', async () => {
      mockCreateSavedSearch.mockResolvedValue({
        id: 'search-1',
        customerId: 'customer-1',
        name: 'My Search',
        filters: mockFilters,
        alertEnabled: true,
        alertFrequency: 'weekly',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastNotifiedAt: null,
      });

      const { rerender } = render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      const nameInput = screen.getByLabelText(/Search Name/) as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'My Search' } });

      const saveButton = screen.getByRole('button', { name: /Save Search/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });

      // Reopen dialog
      rerender(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      const newNameInput = screen.getByLabelText(/Search Name/) as HTMLInputElement;
      expect(newNameInput.value).toBe('');
    });

    it('should save with alerts disabled', async () => {
      mockCreateSavedSearch.mockResolvedValue({
        id: 'search-1',
        customerId: 'customer-1',
        name: 'My Search',
        filters: mockFilters,
        alertEnabled: false,
        alertFrequency: 'weekly',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        lastNotifiedAt: null,
      });

      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      // Disable alerts
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      const nameInput = screen.getByLabelText(/Search Name/);
      fireEvent.change(nameInput, { target: { value: 'My Search' } });

      const saveButton = screen.getByRole('button', { name: /Save Search/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(mockCreateSavedSearch).toHaveBeenCalledWith({
          name: 'My Search',
          filters: mockFilters,
          alertEnabled: false,
          alertFrequency: 'weekly',
        });
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should close dialog when cancel button is clicked', () => {
      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close dialog when X button is clicked', () => {
      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      // Dialog close button (typically rendered by the Dialog component)
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should disable cancel button while saving', async () => {
      mockCreateSavedSearch.mockImplementation(() =>
        new Promise(resolve => setTimeout(resolve, 100))
      );

      render(
        <SaveSearchDialog
          filters={mockFilters}
          open={true}
          onClose={mockOnClose}
        />
      );

      const nameInput = screen.getByLabelText(/Search Name/);
      fireEvent.change(nameInput, { target: { value: 'My Search' } });

      const saveButton = screen.getByRole('button', { name: /Save Search/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        const cancelButton = screen.getByRole('button', { name: /Cancel/i });
        expect(cancelButton).toBeDisabled();
      });
    });
  });
});