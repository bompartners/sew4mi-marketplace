/**
 * Unit tests for PhotoModal component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoModal, type ModalPhoto } from '@/components/features/orders/PhotoModal';
import { MilestoneStage } from '@sew4mi/shared';

// Mock the getMilestoneDisplayInfo function
vi.mock('@sew4mi/shared/utils', () => ({
  getMilestoneDisplayInfo: vi.fn((stage: MilestoneStage) => ({
    name: stage === MilestoneStage.FABRIC_SELECTED ? 'Fabric Selected' : 'Test Milestone',
    description: 'Test description',
    icon: '🧵',
    color: '#10B981'
  }))
}));

// Mock fetch for download functionality
global.fetch = vi.fn();
global.URL.createObjectURL = vi.fn(() => 'blob:test-url');
global.URL.revokeObjectURL = vi.fn();

describe('PhotoModal', () => {
  const mockPhoto: ModalPhoto = {
    id: 'photo-123',
    milestone: MilestoneStage.FABRIC_SELECTED,
    photoUrl: 'https://example.com/photo.jpg',
    cdnUrl: 'https://cdn.example.com/photo.jpg',
    notes: 'Beautiful fabric selection for the dress',
    verifiedAt: new Date('2024-01-15T10:00:00Z'),
    verifiedBy: 'tailor-123',
    approvalStatus: 'APPROVED'
  };

  const defaultProps = {
    photo: mockPhoto,
    isOpen: true,
    onClose: vi.fn(),
    onPrevious: vi.fn(),
    onNext: vi.fn(),
    hasPrevious: true,
    hasNext: true,
    allowDownload: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.body.appendChild and removeChild for download tests
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  afterEach(() => {
    // Clean up any open modals
    document.body.style.overflow = 'unset';
  });

  describe('Basic Rendering', () => {
    it('should render modal when open', () => {
      render(<PhotoModal {...defaultProps} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Fabric Selected')).toBeInTheDocument();
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
    });

    it('should not render modal when closed', () => {
      render(<PhotoModal {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display photo with correct src', () => {
      render(<PhotoModal {...defaultProps} />);
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('src', 'https://cdn.example.com/photo.jpg');
      expect(image).toHaveAttribute('alt', expect.stringContaining('Fabric Selected'));
    });

    it('should show photo notes when available', () => {
      render(<PhotoModal {...defaultProps} />);
      
      expect(screen.getByText('"Beautiful fabric selection for the dress"')).toBeInTheDocument();
    });

    it('should not show notes section when notes are empty', () => {
      const photoWithoutNotes = { ...mockPhoto, notes: undefined };
      render(<PhotoModal {...defaultProps} photo={photoWithoutNotes} />);
      
      expect(screen.queryByText('"')).not.toBeInTheDocument();
    });
  });

  describe('Navigation Controls', () => {
    it('should show navigation buttons when hasPrevious and hasNext are true', () => {
      render(<PhotoModal {...defaultProps} />);
      
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText('Previous')).not.toBeDisabled();
      expect(screen.getByText('Next')).not.toBeDisabled();
    });

    it('should disable previous button when hasPrevious is false', () => {
      render(<PhotoModal {...defaultProps} hasPrevious={false} />);
      
      expect(screen.getByText('Previous')).toBeDisabled();
    });

    it('should disable next button when hasNext is false', () => {
      render(<PhotoModal {...defaultProps} hasNext={false} />);
      
      expect(screen.getByText('Next')).toBeDisabled();
    });

    it('should call onPrevious when previous button is clicked', async () => {
      const user = userEvent.setup();
      render(<PhotoModal {...defaultProps} />);
      
      await user.click(screen.getByText('Previous'));
      expect(defaultProps.onPrevious).toHaveBeenCalledOnce();
    });

    it('should call onNext when next button is clicked', async () => {
      const user = userEvent.setup();
      render(<PhotoModal {...defaultProps} />);
      
      await user.click(screen.getByText('Next'));
      expect(defaultProps.onNext).toHaveBeenCalledOnce();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate to previous photo with left arrow key', () => {
      render(<PhotoModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      expect(defaultProps.onPrevious).toHaveBeenCalledOnce();
    });

    it('should navigate to next photo with right arrow key', () => {
      render(<PhotoModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      expect(defaultProps.onNext).toHaveBeenCalledOnce();
    });

    it('should close modal with escape key', () => {
      render(<PhotoModal {...defaultProps} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(defaultProps.onClose).toHaveBeenCalledOnce();
    });

    it('should not navigate when hasPrevious is false and left arrow is pressed', () => {
      render(<PhotoModal {...defaultProps} hasPrevious={false} />);
      
      fireEvent.keyDown(document, { key: 'ArrowLeft' });
      expect(defaultProps.onPrevious).not.toHaveBeenCalled();
    });

    it('should not navigate when hasNext is false and right arrow is pressed', () => {
      render(<PhotoModal {...defaultProps} hasNext={false} />);
      
      fireEvent.keyDown(document, { key: 'ArrowRight' });
      expect(defaultProps.onNext).not.toHaveBeenCalled();
    });
  });

  describe('Zoom Controls', () => {
    it('should display initial zoom level as 100%', () => {
      render(<PhotoModal {...defaultProps} />);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should zoom in when zoom in button is clicked', async () => {
      const user = userEvent.setup();
      render(<PhotoModal {...defaultProps} />);
      
      const zoomInButton = screen.getByTitle('Zoom in (+)');
      await user.click(zoomInButton);
      
      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('should zoom out when zoom out button is clicked', async () => {
      const user = userEvent.setup();
      render(<PhotoModal {...defaultProps} />);
      
      // First zoom in, then zoom out
      const zoomInButton = screen.getByTitle('Zoom in (+)');
      await user.click(zoomInButton);
      
      const zoomOutButton = screen.getByTitle('Zoom out (-)');
      await user.click(zoomOutButton);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should reset zoom when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<PhotoModal {...defaultProps} />);
      
      // Zoom in multiple times
      const zoomInButton = screen.getByTitle('Zoom in (+)');
      await user.click(zoomInButton);
      await user.click(zoomInButton);
      
      // Reset zoom
      const resetButton = screen.getByText('200%');
      await user.click(resetButton);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should disable zoom out button at minimum zoom', () => {
      render(<PhotoModal {...defaultProps} />);
      
      const zoomOutButton = screen.getByTitle('Zoom out (-)');
      // At 100%, should be able to zoom out further
      expect(zoomOutButton).not.toBeDisabled();
    });

    it('should support keyboard zoom controls', () => {
      render(<PhotoModal {...defaultProps} />);
      
      // Zoom in with +
      fireEvent.keyDown(document, { key: '+' });
      expect(screen.getByText('150%')).toBeInTheDocument();
      
      // Zoom out with -
      fireEvent.keyDown(document, { key: '-' });
      expect(screen.getByText('100%')).toBeInTheDocument();
      
      // Reset with 0
      fireEvent.keyDown(document, { key: '+' });
      fireEvent.keyDown(document, { key: '0' });
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('Download Functionality', () => {
    beforeEach(() => {
      (fetch as any).mockResolvedValue({
        ok: true,
        blob: () => Promise.resolve(new Blob(['fake image data'], { type: 'image/jpeg' }))
      });
    });

    it('should not show download button when allowDownload is false', () => {
      render(<PhotoModal {...defaultProps} allowDownload={false} />);
      
      expect(screen.queryByTitle('Download image')).not.toBeInTheDocument();
    });

    it('should show download button when allowDownload is true', () => {
      render(<PhotoModal {...defaultProps} allowDownload={true} />);
      
      expect(screen.getByTitle('Download image')).toBeInTheDocument();
    });

    it('should trigger download when download button is clicked', async () => {
      const user = userEvent.setup();
      render(<PhotoModal {...defaultProps} allowDownload={true} />);
      
      const downloadButton = screen.getByTitle('Download image');
      await user.click(downloadButton);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('https://cdn.example.com/photo.jpg');
      });
      
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
    });

    it('should handle download errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      (fetch as any).mockRejectedValue(new Error('Network error'));
      
      const user = userEvent.setup();
      render(<PhotoModal {...defaultProps} allowDownload={true} />);
      
      const downloadButton = screen.getByTitle('Download image');
      await user.click(downloadButton);
      
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to download image:', expect.any(Error));
      });
      
      consoleSpy.mockRestore();
    });
  });

  describe('Image Loading States', () => {
    it('should show loading spinner initially', () => {
      render(<PhotoModal {...defaultProps} />);
      
      // Before image loads, should show loading spinner
      const image = screen.getByRole('img');
      expect(image).toHaveClass('invisible');
    });

    it('should hide loading spinner when image loads', () => {
      render(<PhotoModal {...defaultProps} />);
      
      const image = screen.getByRole('img');
      fireEvent.load(image);
      
      expect(image).not.toHaveClass('invisible');
    });

    it('should show error state when image fails to load', () => {
      render(<PhotoModal {...defaultProps} />);
      
      const image = screen.getByRole('img');
      fireEvent.error(image);
      
      expect(screen.getByText('Failed to load image')).toBeInTheDocument();
      expect(screen.getByText('Please check your connection and try again')).toBeInTheDocument();
    });
  });

  describe('Mouse Interactions', () => {
    it('should enable dragging when zoomed in', async () => {
      const user = userEvent.setup();
      render(<PhotoModal {...defaultProps} />);
      
      // Zoom in first
      const zoomInButton = screen.getByTitle('Zoom in (+)');
      await user.click(zoomInButton);
      
      const image = screen.getByRole('img');
      expect(image).toHaveClass('cursor-grab');
    });

    it('should show default cursor when not zoomed', () => {
      render(<PhotoModal {...defaultProps} />);
      
      const image = screen.getByRole('img');
      expect(image).toHaveClass('cursor-default');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<PhotoModal {...defaultProps} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-describedby', 'photo-modal-description');
    });

    it('should have descriptive alt text for image', () => {
      render(<PhotoModal {...defaultProps} />);
      
      const image = screen.getByRole('img');
      expect(image).toHaveAttribute('alt', expect.stringContaining('Fabric Selected'));
      expect(image).toHaveAttribute('alt', expect.stringContaining('1/15/2024'));
    });

    it('should have proper button titles for screen readers', () => {
      render(<PhotoModal {...defaultProps} allowDownload={true} />);
      
      expect(screen.getByTitle('Zoom in (+)')).toBeInTheDocument();
      expect(screen.getByTitle('Zoom out (-)')).toBeInTheDocument();
      expect(screen.getByTitle('Reset view (0)')).toBeInTheDocument();
      expect(screen.getByTitle('Download image')).toBeInTheDocument();
      expect(screen.getByTitle('Open in new tab')).toBeInTheDocument();
      expect(screen.getByTitle('Close (Esc)')).toBeInTheDocument();
    });
  });

  describe('Body Scroll Lock', () => {
    it('should prevent body scroll when modal is open', () => {
      render(<PhotoModal {...defaultProps} />);
      
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('should restore body scroll when modal is closed', () => {
      const { rerender } = render(<PhotoModal {...defaultProps} />);
      
      rerender(<PhotoModal {...defaultProps} isOpen={false} />);
      
      expect(document.body.style.overflow).toBe('unset');
    });
  });

  describe('Photo Changes', () => {
    it('should reset zoom and position when photo changes', () => {
      const { rerender } = render(<PhotoModal {...defaultProps} />);
      
      // Zoom in
      const zoomInButton = screen.getByTitle('Zoom in (+)');
      fireEvent.click(zoomInButton);
      expect(screen.getByText('150%')).toBeInTheDocument();
      
      // Change photo
      const newPhoto = { ...mockPhoto, id: 'new-photo-id' };
      rerender(<PhotoModal {...defaultProps} photo={newPhoto} />);
      
      // Zoom should be reset
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });
});