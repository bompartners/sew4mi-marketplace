/**
 * Unit tests for OrderProgressTimeline component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderProgressTimeline } from '@/components/features/orders/OrderProgressTimeline';
import { MilestoneStage, MilestoneApprovalStatus, OrderMilestone } from '@sew4mi/shared';
import { OrderStatus, OrderWithProgress } from '@sew4mi/shared/types/order-creation';

// Mock the progress utilities
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
  }),
  calculateOrderProgress: vi.fn(() => 60) // Mock 60% progress
}));

// Mock the MilestonePhotoGallery component
vi.mock('@/components/features/orders/MilestonePhotoGallery', () => ({
  MilestonePhotoGallery: ({ onPhotoSelect }: { onPhotoSelect?: (index: number) => void }) => (
    <div data-testid="milestone-photo-gallery">
      <button onClick={() => onPhotoSelect?.(0)}>Photo 1</button>
      <button onClick={() => onPhotoSelect?.(1)}>Photo 2</button>
    </div>
  )
}));

describe('OrderProgressTimeline', () => {
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
      rejectionReason: 'Needs adjustment in sleeve length',
      autoApprovalDeadline: new Date('2024-01-23T16:00:00Z'),
      createdAt: new Date('2024-01-20T15:00:00Z'),
      updatedAt: new Date('2024-01-20T18:00:00Z')
    }
  ];

  const mockOrder: OrderWithProgress = {
    id: 'order-123',
    milestones: mockMilestones,
    progressPercentage: 60,
    nextMilestone: MilestoneStage.INITIAL_ASSEMBLY,
    estimatedDaysRemaining: 5,
    chatMessages: [],
    currentStatus: OrderStatus.IN_PRODUCTION,
    estimatedCompletion: new Date('2024-01-25T16:00:00Z')
  };

  const defaultProps = {
    order: mockOrder,
    showPhotos: true,
    showMessaging: true,
    enableRealTime: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render order progress timeline', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      expect(screen.getByText('Order Progress')).toBeInTheDocument();
      expect(screen.getByText('IN PRODUCTION')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });

    it('should render milestone timeline', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      expect(screen.getByText('Milestone Timeline')).toBeInTheDocument();
      expect(screen.getByText('Fabric Selected')).toBeInTheDocument();
      expect(screen.getByText('Cutting Started')).toBeInTheDocument();
      expect(screen.getByText('Fitting Ready')).toBeInTheDocument();
    });

    it('should display milestone descriptions', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      expect(screen.getByText('Fabric has been chosen')).toBeInTheDocument();
      expect(screen.getByText('Pattern cutting has begun')).toBeInTheDocument();
      expect(screen.getByText('Ready for fitting')).toBeInTheDocument();
    });

    it('should show approval status badges', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      expect(screen.getByText('APPROVED')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      // REJECTED status only shows for rejected milestones with rejection reasons
      expect(screen.getByText('Needs Revision')).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('should display progress statistics', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      expect(screen.getByText('1 milestones')).toBeInTheDocument(); // Completed count
      expect(screen.getByText('5 days')).toBeInTheDocument(); // Days remaining
      expect(screen.getByText('60%')).toBeInTheDocument(); // Progress percentage
    });

    it('should show estimated completion date', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      expect(screen.getByText('Jan 25')).toBeInTheDocument();
    });

    it('should handle zero days remaining', () => {
      const orderWithZeroDays = { ...mockOrder, estimatedDaysRemaining: 0 };
      render(<OrderProgressTimeline {...defaultProps} order={orderWithZeroDays} />);
      
      expect(screen.getByText('Due today')).toBeInTheDocument();
    });

    it('should handle single day remaining', () => {
      const orderWithOneDay = { ...mockOrder, estimatedDaysRemaining: 1 };
      render(<OrderProgressTimeline {...defaultProps} order={orderWithOneDay} />);
      
      expect(screen.getByText('1 day')).toBeInTheDocument();
    });
  });

  describe('Milestone Details', () => {
    it('should display milestone notes when available', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      expect(screen.getByText('"Beautiful kente fabric selected"')).toBeInTheDocument();
      expect(screen.getByText('"Precise cutting in progress"')).toBeInTheDocument();
    });

    it('should show rejection reasons for rejected milestones', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      expect(screen.getByText('Needs Revision')).toBeInTheDocument();
      expect(screen.getByText('Needs adjustment in sleeve length')).toBeInTheDocument();
    });

    it('should display verification dates', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      // Should show formatted dates - check for date elements with flexible matching
      expect(screen.getByText(/Completed Jan 15/)).toBeInTheDocument();
      expect(screen.getByText(/Started Jan 16/)).toBeInTheDocument();
    });
  });

  describe('Photo Integration', () => {
    it('should show photo gallery when photos are available and showPhotos=true', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      expect(screen.getByTestId('milestone-photo-gallery')).toBeInTheDocument();
      expect(screen.getByText('Milestone Photos')).toBeInTheDocument();
    });

    it('should hide photo gallery when showPhotos=false', () => {
      render(<OrderProgressTimeline {...defaultProps} showPhotos={false} />);
      
      expect(screen.queryByTestId('milestone-photo-gallery')).not.toBeInTheDocument();
      expect(screen.queryByText('Milestone Photos')).not.toBeInTheDocument();
    });

    it('should call onPhotoSelect when photo is selected', async () => {
      const onPhotoSelect = vi.fn();
      const user = userEvent.setup();
      render(<OrderProgressTimeline {...defaultProps} onPhotoSelect={onPhotoSelect} />);
      
      await user.click(screen.getByText('Photo 1'));
      expect(onPhotoSelect).toHaveBeenCalledWith(0);
    });

    it('should show View Photo buttons for milestones with photos', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      const viewPhotoButtons = screen.getAllByText('View Photo');
      expect(viewPhotoButtons).toHaveLength(3); // All milestones have photos
    });
  });

  describe('Messaging Integration', () => {
    it('should show Message Tailor button when showMessaging=true', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      expect(screen.getByText('Message Tailor')).toBeInTheDocument();
    });

    it('should hide Message Tailor button when showMessaging=false', () => {
      render(<OrderProgressTimeline {...defaultProps} showMessaging={false} />);
      
      expect(screen.queryByText('Message Tailor')).not.toBeInTheDocument();
    });

    it('should call onMessageTailor when Message Tailor button is clicked', async () => {
      const onMessageTailor = vi.fn();
      const user = userEvent.setup();
      render(<OrderProgressTimeline {...defaultProps} onMessageTailor={onMessageTailor} />);
      
      await user.click(screen.getByText('Message Tailor'));
      expect(onMessageTailor).toHaveBeenCalledOnce();
    });
  });

  describe('Status Styling', () => {
    it('should apply completed styling to approved milestones', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      const fabricMilestone = screen.getByText('Fabric Selected').closest('div');
      expect(fabricMilestone?.querySelector('.text-green-700')).toBeInTheDocument();
    });

    it('should apply active styling to pending milestones', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      const cuttingMilestone = screen.getByText('Cutting Started').closest('div');
      expect(cuttingMilestone?.querySelector('.text-yellow-700')).toBeInTheDocument();
    });

    it('should apply different colors for different order statuses', () => {
      const completedOrder = { ...mockOrder, currentStatus: OrderStatus.COMPLETED };
      render(<OrderProgressTimeline {...defaultProps} order={completedOrder} />);
      
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    });
  });

  describe('Timeline Structure', () => {
    it('should sort milestones by verification date', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      // Should appear in chronological order
      const milestoneElements = screen.getAllByText(/Fabric Selected|Cutting Started|Fitting Ready/);
      expect(milestoneElements[0]).toHaveTextContent('Fabric Selected');
      expect(milestoneElements[1]).toHaveTextContent('Cutting Started');
      expect(milestoneElements[2]).toHaveTextContent('Fitting Ready');
    });

    it('should show timeline connections between milestones', () => {
      const { container } = render(<OrderProgressTimeline {...defaultProps} />);
      
      // Should have timeline lines connecting milestones
      const timelineLines = container.querySelectorAll('.absolute.left-6');
      expect(timelineLines.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper headings structure', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: 'Order Progress' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Milestone Timeline' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Milestone Photos' })).toBeInTheDocument();
    });

    it('should have proper ARIA labels for milestone icons', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      expect(screen.getByLabelText('Fabric Selected')).toBeInTheDocument();
      expect(screen.getByLabelText('Cutting Started')).toBeInTheDocument();
      expect(screen.getByLabelText('Fitting Ready')).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<OrderProgressTimeline {...defaultProps} />);
      
      const messageButton = screen.getByText('Message Tailor');
      expect(messageButton).toBeInTheDocument();
      
      messageButton.focus();
      expect(messageButton).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle order with no milestones', () => {
      const emptyOrder = { ...mockOrder, milestones: [] };
      render(<OrderProgressTimeline {...defaultProps} order={emptyOrder} />);
      
      expect(screen.getByText('Order Progress')).toBeInTheDocument();
      expect(screen.getByText('0 milestones')).toBeInTheDocument();
    });

    it('should handle order with no estimated completion', () => {
      const orderNoEstimate = { ...mockOrder, estimatedCompletion: undefined };
      render(<OrderProgressTimeline {...defaultProps} order={orderNoEstimate} />);
      
      expect(screen.getByText('Order Progress')).toBeInTheDocument();
      expect(screen.queryByText('Est. Completion')).not.toBeInTheDocument();
    });

    it('should handle milestones without photos', () => {
      const milestonesNoPhotos = mockMilestones.map(m => ({ ...m, photoUrl: '' }));
      const orderNoPhotos = { ...mockOrder, milestones: milestonesNoPhotos };
      render(<OrderProgressTimeline {...defaultProps} order={orderNoPhotos} />);
      
      expect(screen.queryByText('Milestone Photos')).not.toBeInTheDocument();
      expect(screen.queryByText('View Photo')).not.toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <OrderProgressTimeline {...defaultProps} className="custom-timeline" />
      );
      
      expect(container.firstChild).toHaveClass('custom-timeline');
    });
  });
});