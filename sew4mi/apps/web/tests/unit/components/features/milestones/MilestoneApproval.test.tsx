/**
 * Unit tests for MilestoneApproval component
 * @file MilestoneApproval.test.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MilestoneApproval } from '@/components/features/milestones/MilestoneApproval';
import { 
  OrderMilestone, 
  MilestoneStage, 
  MilestoneApprovalStatus,
  MilestoneApprovalAction 
} from '@sew4mi/shared/types';

// Mock fetch globally
global.fetch = vi.fn();

// Mock ResizeObserver (required by some components)
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock matchMedia (required by some components)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

describe('MilestoneApproval', () => {
  const mockOnApprovalComplete = vi.fn();
  const mockOnApprovalError = vi.fn();
  const mockOnDisputeCreated = vi.fn();

  // Sample milestone data
  const baseMilestone: OrderMilestone = {
    id: 'milestone-123',
    orderId: 'order-456',
    milestone: MilestoneStage.FITTING_READY,
    photoUrl: 'https://example.com/photo.jpg',
    notes: 'Fitting is ready for customer review',
    verifiedAt: new Date('2024-08-22T10:00:00Z'),
    verifiedBy: 'tailor-789',
    approvalStatus: MilestoneApprovalStatus.PENDING,
    autoApprovalDeadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    createdAt: new Date('2024-08-22T10:00:00Z'),
    updatedAt: new Date('2024-08-22T10:00:00Z')
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful fetch response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        approvalStatus: MilestoneApprovalStatus.APPROVED,
        reviewedAt: new Date().toISOString()
      })
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Component Rendering', () => {
    it('renders milestone information correctly', () => {
      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      expect(screen.getByText('Fitting Ready')).toBeInTheDocument();
      expect(screen.getByText('PENDING')).toBeInTheDocument();
      expect(screen.getByText('Fitting is ready for customer review')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fitting Ready photo' })).toHaveAttribute('src', 'https://example.com/photo.jpg');
    });

    it('displays auto-approval countdown for pending milestones', () => {
      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      expect(screen.getByText(/remaining/)).toBeInTheDocument();
    });

    it('shows approval interface for pending milestones', () => {
      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      expect(screen.getByText('Review Milestone')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /create dispute/i })).toBeInTheDocument();
    });

    it('displays approved status for approved milestones', () => {
      const approvedMilestone = {
        ...baseMilestone,
        approvalStatus: MilestoneApprovalStatus.APPROVED,
        customerReviewedAt: new Date('2024-08-22T11:00:00Z')
      };

      render(
        <MilestoneApproval 
          milestone={approvedMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      expect(screen.getByText('APPROVED')).toBeInTheDocument();
      expect(screen.getByText(/Milestone approved successfully/)).toBeInTheDocument();
      expect(screen.queryByText('Review Milestone')).not.toBeInTheDocument();
    });

    it('displays rejection reason for rejected milestones', () => {
      const rejectedMilestone = {
        ...baseMilestone,
        approvalStatus: MilestoneApprovalStatus.REJECTED,
        rejectionReason: 'Quality does not meet requirements',
        customerReviewedAt: new Date('2024-08-22T11:00:00Z')
      };

      render(
        <MilestoneApproval 
          milestone={rejectedMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      expect(screen.getByText('REJECTED')).toBeInTheDocument();
      expect(screen.getByText('Quality does not meet requirements')).toBeInTheDocument();
    });
  });

  describe('Milestone Approval', () => {
    it('handles milestone approval successfully', async () => {
      const user = userEvent.setup();
      
      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onApprovalComplete={mockOnApprovalComplete}
          onApprovalError={mockOnApprovalError}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      await user.click(approveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/milestones/milestone-123/approve',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: MilestoneApprovalAction.APPROVED,
              comment: undefined
            })
          })
        );
      });

      expect(mockOnApprovalComplete).toHaveBeenCalledWith(
        MilestoneApprovalAction.APPROVED,
        undefined
      );
    });

    it('handles milestone rejection with comment', async () => {
      const user = userEvent.setup();
      
      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onApprovalComplete={mockOnApprovalComplete}
          onApprovalError={mockOnApprovalError}
        />
      );

      // Add a comment
      const commentInput = screen.getByPlaceholderText(/add any comments/i);
      await user.type(commentInput, 'Quality needs improvement');

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      await user.click(rejectButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/milestones/milestone-123/approve',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: MilestoneApprovalAction.REJECTED,
              comment: 'Quality needs improvement'
            })
          })
        );
      });

      expect(mockOnApprovalComplete).toHaveBeenCalledWith(
        MilestoneApprovalAction.REJECTED,
        'Quality needs improvement'
      );
    });

    it('handles approval API errors', async () => {
      const user = userEvent.setup();
      
      // Mock failed response
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Milestone already reviewed' })
      });

      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onApprovalComplete={mockOnApprovalComplete}
          onApprovalError={mockOnApprovalError}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      await user.click(approveButton);

      await waitFor(() => {
        expect(mockOnApprovalError).toHaveBeenCalledWith('Milestone already reviewed');
      });

      expect(screen.getByText(/Failed to process approval/)).toBeInTheDocument();
    });

    it('prevents approval of already reviewed milestones', () => {
      const approvedMilestone = {
        ...baseMilestone,
        approvalStatus: MilestoneApprovalStatus.APPROVED
      };

      render(
        <MilestoneApproval 
          milestone={approvedMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('disables buttons during approval process', async () => {
      const user = userEvent.setup();
      
      // Mock slow response
      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: () => Promise.resolve({ success: true })
        }), 100))
      );

      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      const approveButton = screen.getByRole('button', { name: /approve/i });
      const rejectButton = screen.getByRole('button', { name: /reject/i });

      await user.click(approveButton);

      // Buttons should be disabled during approval
      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
      expect(screen.getByText(/approving.../i)).toBeInTheDocument();
    });
  });

  describe('Dispute Creation', () => {
    it('opens dispute modal when dispute button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onDisputeCreated={mockOnDisputeCreated}
        />
      );

      const disputeButton = screen.getByRole('button', { name: /create dispute/i });
      await user.click(disputeButton);

      expect(screen.getByText('Create Milestone Dispute')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/explain why you're disputing/i)).toBeInTheDocument();
    });

    it('handles dispute creation successfully', async () => {
      const user = userEvent.setup();
      
      // Mock dispute creation response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          disputeId: 'dispute-123'
        })
      });

      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onDisputeCreated={mockOnDisputeCreated}
        />
      );

      // Open dispute modal
      const disputeButton = screen.getByRole('button', { name: /create dispute/i });
      await user.click(disputeButton);

      // Fill in dispute reason
      const reasonInput = screen.getByPlaceholderText(/explain why you're disputing/i);
      await user.type(reasonInput, 'The work quality does not match what was promised');

      // Submit dispute
      const createDisputeButton = screen.getByRole('button', { name: 'Create Dispute' });
      await user.click(createDisputeButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/disputes/milestone',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              milestoneId: 'milestone-123',
              orderId: 'order-456',
              reason: 'The work quality does not match what was promised',
              evidence: undefined
            })
          })
        );
      });

      expect(mockOnDisputeCreated).toHaveBeenCalled();
    });

    it('validates dispute reason length', async () => {
      const user = userEvent.setup();
      
      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onDisputeCreated={mockOnDisputeCreated}
        />
      );

      // Open dispute modal
      const disputeButton = screen.getByRole('button', { name: /create dispute/i });
      await user.click(disputeButton);

      // Submit without reason
      const createDisputeButton = screen.getByRole('button', { name: 'Create Dispute' });
      expect(createDisputeButton).toBeDisabled();

      // Add short reason
      const reasonInput = screen.getByPlaceholderText(/explain why you're disputing/i);
      await user.type(reasonInput, 'Bad');
      expect(createDisputeButton).toBeDisabled();

      // Add valid reason
      await user.clear(reasonInput);
      await user.type(reasonInput, 'This milestone does not meet the quality standards we agreed upon');
      expect(createDisputeButton).toBeEnabled();
    });
  });

  describe('Image Gallery', () => {
    it('opens image zoom modal when photo is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      const photo = screen.getByRole('button', { name: 'Fitting Ready photo' });
      await user.click(photo);

      expect(screen.getByAltText(/enlarged/i)).toBeInTheDocument();
    });

    it('opens image zoom modal when zoom button is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      const zoomButton = screen.getByRole('button', { name: '' }); // Zoom button has no text, just icon
      await user.click(zoomButton);

      expect(screen.getByAltText(/enlarged/i)).toBeInTheDocument();
    });
  });

  describe('Urgency Indicators', () => {
    it('shows warning for milestones near auto-approval deadline', () => {
      const urgentMilestone = {
        ...baseMilestone,
        autoApprovalDeadline: new Date(Date.now() + 3 * 60 * 60 * 1000) // 3 hours from now
      };

      render(
        <MilestoneApproval 
          milestone={urgentMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      expect(screen.getByText(/3h.*remaining/)).toBeInTheDocument();
    });

    it('shows overdue message for milestones past deadline', () => {
      const overdueMilestone = {
        ...baseMilestone,
        autoApprovalDeadline: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      };

      render(
        <MilestoneApproval 
          milestone={overdueMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      expect(screen.getByText(/auto-approval deadline passed/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      expect(screen.getByRole('button', { name: 'Fitting Ready photo' })).toHaveAttribute('alt', 'Fitting Ready photo');
      expect(screen.getByRole('button', { name: /approve/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      
      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      // Tab through interactive elements
      await user.tab();
      expect(screen.getByRole('button', { name: 'Fitting Ready photo' })).toHaveFocus();

      await user.tab();
      // The zoom button gets focus next due to DOM order
      expect(screen.getByRole('button', { name: '' })).toHaveFocus(); // Zoom button has no text

      await user.tab();
      expect(screen.getByRole('textbox')).toHaveFocus();

      await user.tab();
      expect(screen.getByRole('button', { name: /approve/i })).toHaveFocus();
    });
  });

  describe('Component Props', () => {
    it('applies custom className', () => {
      const { container } = render(
        <MilestoneApproval 
          milestone={baseMilestone}
          className="custom-class"
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      expect(container.firstChild).toHaveClass('custom-class');
    });

    it('disables component when disabled prop is true', () => {
      render(
        <MilestoneApproval 
          milestone={baseMilestone}
          disabled={true}
          onApprovalComplete={mockOnApprovalComplete}
        />
      );

      expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });
  });
});