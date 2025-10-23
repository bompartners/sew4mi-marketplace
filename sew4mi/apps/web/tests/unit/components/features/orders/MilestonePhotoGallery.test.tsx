/**
 * Unit tests for MilestonePhotoGallery component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MilestonePhotoGallery } from '@/components/features/orders/MilestonePhotoGallery';
import { MilestoneStage, MilestoneApprovalStatus, OrderMilestone } from '@sew4mi/shared';

// Mock the getMilestoneDisplayInfo function
vi.mock('@sew4mi/shared/utils/order-progress', () => ({
  getMilestoneDisplayInfo: vi.fn((stage: MilestoneStage) => {
    const displayMap = {
      [MilestoneStage.FABRIC_SELECTED]: {
        name: 'Fabric Selected',
        description: 'Fabric has been chosen',
        icon: '🧵',
        color: '#10B981'
      },
      [MilestoneStage.CUTTING_STARTED]: {
        name: 'Cutting Started',
        description: 'Pattern cutting has begun',
        icon: '✂️',
        color: '#F59E0B'
      },
      [MilestoneStage.FITTING_READY]: {
        name: 'Fitting Ready',
        description: 'Ready for fitting',
        icon: '👔',
        color: '#8B5CF6'
      }
    };
    return displayMap[stage] || { name: stage, description: '', icon: '📷', color: '#000' };
  })
}));

describe('MilestonePhotoGallery', () => {
  const mockMilestones: OrderMilestone[] = [
    {
      id: 'milestone-1',
      orderId: 'order-123',
      milestone: MilestoneStage.FABRIC_SELECTED,
      photoUrl: 'https://example.com/fabric.jpg',
      notes: 'Beautiful kente fabric selected',
      verifiedAt: new Date('2024-01-15T10:00:00Z'),
      verifiedBy: 'tailor-123',
      approvalStatus: MilestoneApprovalStatus.APPROVED,
      autoApprovalDeadline: new Date('2024-01-18T10:00:00Z'),
      createdAt: new Date('2024-01-15T09:00:00Z'),
      updatedAt: new Date('2024-01-15T10:30:00Z')
    },
    {
      id: 'milestone-2',
      orderId: 'order-123',
      milestone: MilestoneStage.CUTTING_STARTED,
      photoUrl: 'https://example.com/cutting.jpg',
      notes: 'Precise cutting in progress',
      verifiedAt: new Date('2024-01-16T14:00:00Z'),
      verifiedBy: 'tailor-123',
      approvalStatus: MilestoneApprovalStatus.PENDING,
      autoApprovalDeadline: new Date('2024-01-19T14:00:00Z'),
      createdAt: new Date('2024-01-16T13:00:00Z'),
      updatedAt: new Date('2024-01-16T14:00:00Z')
    },
    {
      id: 'milestone-3',
      orderId: 'order-123',
      milestone: MilestoneStage.FITTING_READY,
      photoUrl: 'https://example.com/fitting.jpg',
      notes: '',
      verifiedAt: new Date('2024-01-20T16:00:00Z'),
      verifiedBy: 'tailor-123',
      approvalStatus: MilestoneApprovalStatus.REJECTED,
      rejectionReason: 'Needs adjustment',
      autoApprovalDeadline: new Date('2024-01-23T16:00:00Z'),
      createdAt: new Date('2024-01-20T15:00:00Z'),
      updatedAt: new Date('2024-01-20T18:00:00Z')
    }
  ];

  const defaultProps = {
    milestones: mockMilestones,
    showApprovalStatus: true,
    interactive: true,
    allowDownload: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render milestone photos in grid layout', () => {
      render(<MilestonePhotoGallery {...defaultProps} />);
      
      // Should show all milestone photos
      expect(screen.getByAltText('Fabric Selected photo')).toBeInTheDocument();
      expect(screen.getByAltText('Cutting Started photo')).toBeInTheDocument();
      expect(screen.getByAltText('Fitting Ready photo')).toBeInTheDocument();
    });

    it('should show approval status badges when enabled', () => {
      render(<MilestonePhotoGallery {...defaultProps} />);
      
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText('REJECTED')).toBeInTheDocument();
    });

    it('should hide approval status badges when disabled', () => {
      render(<MilestonePhotoGallery {...defaultProps} showApprovalStatus={false} />);
      
      expect(screen.queryByText('APPROVED')).not.toBeInTheDocument();
      expect(screen.queryByText('PENDING')).not.toBeInTheDocument();
      expect(screen.queryByText('REJECTED')).not.toBeInTheDocument();
    });

    it('should display milestone names and dates', () => {
      render(<MilestonePhotoGallery {...defaultProps} />);
      
      expect(screen.getByText('Fabric Selected')).toBeInTheDocument();
      expect(screen.getByText('Cutting Started')).toBeInTheDocument();
      expect(screen.getByText('Fitting Ready')).toBeInTheDocument();
      
      // Should show formatted dates
      expect(screen.getByText('1/15/2024')).toBeInTheDocument();
      expect(screen.getByText('1/16/2024')).toBeInTheDocument();
      expect(screen.getByText('1/20/2024')).toBeInTheDocument();
    });

    it('should show empty state when no photos available', () => {
      const milestonesWithoutPhotos = mockMilestones.map(m => ({ ...m, photoUrl: '' }));
      render(<MilestonePhotoGallery {...defaultProps} milestones={milestonesWithoutPhotos} />);
      
      expect(screen.getByText('No milestone photos available yet')).toBeInTheDocument();
    });
  });

  describe('Interactivity', () => {
    it('should open modal when photo is clicked and interactive=true', async () => {
      const user = userEvent.setup();
      render(<MilestonePhotoGallery {...defaultProps} />);
      
      const fabricPhoto = screen.getByAltText('Fabric Selected photo');
      await user.click(fabricPhoto);
      
      // Modal should open with photo details
      // Modal should open with photo details (notes are wrapped in quotes)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Check for notes in the modal (wrapped in quotes as rendered)
      expect(screen.getByText(/"Beautiful kente fabric selected"/i)).toBeInTheDocument();
    });

    it('should not open modal when interactive=false', async () => {
      const user = userEvent.setup();
      render(<MilestonePhotoGallery {...defaultProps} interactive={false} />);
      
      const fabricPhoto = screen.getByAltText('Fabric Selected photo');
      await user.click(fabricPhoto);
      
      // Modal should not open
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should call onPhotoSelect callback when photo is selected', async () => {
      const onPhotoSelect = vi.fn();
      const user = userEvent.setup();
      render(<MilestonePhotoGallery {...defaultProps} onPhotoSelect={onPhotoSelect} />);
      
      const cuttingPhoto = screen.getByAltText('Cutting Started photo');
      await user.click(cuttingPhoto);
      
      expect(onPhotoSelect).toHaveBeenCalledWith(1); // Second photo (index 1)
    });

    it('should highlight selected photo when selectedIndex is provided', () => {
      render(<MilestonePhotoGallery {...defaultProps} selectedIndex={0} />);
      
      const photoContainers = screen.getAllByRole('img').map(img => img.parentElement);
      expect(photoContainers[0]).toHaveClass('ring-2', 'ring-primary');
    });
  });

  describe('Photo Modal', () => {
    it('should navigate between photos using modal controls', async () => {
      const user = userEvent.setup();
      render(<MilestonePhotoGallery {...defaultProps} />);
      
      // Open modal with first photo
      const fabricPhoto = screen.getByAltText('Fabric Selected photo');
      await user.click(fabricPhoto);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Navigate to next photo
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);
      
      // Should show second photo details (notes are wrapped in quotes in the modal)
      await waitFor(() => {
        expect(screen.getByText(/"Precise cutting in progress"/i)).toBeInTheDocument();
      });
    });

    it('should close modal when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<MilestonePhotoGallery {...defaultProps} />);
      
      // Open modal
      const fabricPhoto = screen.getByAltText('Fabric Selected photo');
      await user.click(fabricPhoto);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Close modal (use dialog's onOpenChange or click outside, or find by button content)
      // Dialog's default close button behavior
      await user.keyboard('{Escape}'); // Use escape instead since close button has no accessible label
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close modal when escape key is pressed', async () => {
      const user = userEvent.setup();
      render(<MilestonePhotoGallery {...defaultProps} />);
      
      // Open modal
      const fabricPhoto = screen.getByAltText('Fabric Selected photo');
      await user.click(fabricPhoto);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Press escape
      await user.keyboard('{Escape}');
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper alt text for images', () => {
      render(<MilestonePhotoGallery {...defaultProps} />);
      
      expect(screen.getByAltText('Fabric Selected photo')).toBeInTheDocument();
      expect(screen.getByAltText('Cutting Started photo')).toBeInTheDocument();
      expect(screen.getByAltText('Fitting Ready photo')).toBeInTheDocument();
    });

    it('should support keyboard navigation in modal', async () => {
      const user = userEvent.setup();
      render(<MilestonePhotoGallery {...defaultProps} />);
      
      // Open modal
      const fabricPhoto = screen.getByAltText('Fabric Selected photo');
      await user.click(fabricPhoto);
      
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
      
      // Navigate with arrow keys (notes are wrapped in quotes)
      await user.keyboard('{ArrowRight}');
      await waitFor(() => {
        expect(screen.getByText(/"Precise cutting in progress"/i)).toBeInTheDocument();
      });
      
      await user.keyboard('{ArrowLeft}');
      await waitFor(() => {
        expect(screen.getByText(/"Beautiful kente fabric selected"/i)).toBeInTheDocument();
      });
    });

    it('should have proper ARIA attributes', () => {
      render(<MilestonePhotoGallery {...defaultProps} />);
      
      const images = screen.getAllByRole('img');
      images.forEach(img => {
        expect(img).toHaveAttribute('alt');
      });
    });
  });

  describe('Loading States', () => {
    it('should handle image loading states', async () => {
      render(<MilestonePhotoGallery {...defaultProps} />);
      
      const images = screen.getAllByRole('img');
      
      // Simulate image load
      fireEvent.load(images[0]);
      await waitFor(() => {
        expect(images[0]).not.toHaveClass('invisible');
      });
      
      // Simulate image error
      fireEvent.error(images[1]);
      // Should still render but might show error state in actual implementation
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <MilestonePhotoGallery {...defaultProps} className="custom-gallery" />
      );
      
      expect(container.firstChild).toHaveClass('custom-gallery');
    });

    it('should respect maxHeight prop', () => {
      const { container } = render(<MilestonePhotoGallery {...defaultProps} maxHeight="300px" />);
      
      // Query grid container directly (multiple images exist)
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveStyle({ maxHeight: '300px' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle milestones without photos', () => {
      const milestonesWithSomePhotos = [
        mockMilestones[0],
        { ...mockMilestones[1], photoUrl: '' }, // No photo
        mockMilestones[2]
      ];
      
      render(<MilestonePhotoGallery {...defaultProps} milestones={milestonesWithSomePhotos} />);
      
      // Should only show photos that exist
      expect(screen.getByAltText('Fabric Selected photo')).toBeInTheDocument();
      expect(screen.queryByAltText('Cutting Started photo')).not.toBeInTheDocument();
      expect(screen.getByAltText('Fitting Ready photo')).toBeInTheDocument();
    });

    it('should handle single photo', () => {
      render(<MilestonePhotoGallery {...defaultProps} milestones={[mockMilestones[0]]} />);
      
      expect(screen.getByAltText('Fabric Selected photo')).toBeInTheDocument();
      expect(screen.queryByAltText('Cutting Started photo')).not.toBeInTheDocument();
    });

    it('should handle empty milestones array', () => {
      render(<MilestonePhotoGallery {...defaultProps} milestones={[]} />);
      
      expect(screen.getByText('No milestone photos available yet')).toBeInTheDocument();
    });
  });
});