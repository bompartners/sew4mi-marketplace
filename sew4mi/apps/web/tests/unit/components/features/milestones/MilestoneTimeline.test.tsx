/**
 * Unit tests for MilestoneTimeline component
 * @file MilestoneTimeline.test.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MilestoneTimeline } from '@/components/features/milestones/MilestoneTimeline';
import { OrderMilestone, MilestoneType } from '@sew4mi/shared';

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => (
    <img src={src} alt={alt} {...props} />
  )
}));

// Mock data
const createMockMilestone = (
  milestone: MilestoneType,
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING',
  verifiedAt?: Date,
  withPhoto: boolean = true
): OrderMilestone => ({
  id: `milestone-${milestone}`,
  orderId: 'order-123',
  milestone,
  photoUrl: withPhoto && verifiedAt ? 'https://example.com/photo.jpg' : '',
  notes: 'Test notes for milestone',
  verifiedAt: verifiedAt || null,
  verifiedBy: verifiedAt ? 'tailor-123' : '',
  approvalStatus,
  customerReviewedAt: approvalStatus !== 'PENDING' ? new Date('2024-08-21T10:00:00Z') : null,
  autoApprovalDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
  rejectionReason: approvalStatus === 'REJECTED' ? 'Quality needs improvement' : null
});

describe('MilestoneTimeline Component', () => {
  const defaultProps = {
    milestones: [],
    orderId: 'order-123',
    userRole: 'customer' as const
  };

  it('renders timeline with project title', () => {
    render(<MilestoneTimeline {...defaultProps} />);

    expect(screen.getByText('Project Timeline')).toBeInTheDocument();
  });

  it('displays all milestones in correct chronological order', () => {
    render(<MilestoneTimeline {...defaultProps} />);

    const milestoneLabels = [
      'Fabric Selection',
      'Cutting Started',
      'Initial Assembly',
      'Fitting Ready',
      'Adjustments Complete',
      'Final Pressing',
      'Ready for Delivery'
    ];

    milestoneLabels.forEach((label, index) => {
      const element = screen.getByText(label);
      expect(element).toBeInTheDocument();
    });
  });

  it('shows completed milestone with approved badge and check icon', () => {
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'APPROVED', new Date('2024-08-20T10:00:00Z'))
    ];

    render(<MilestoneTimeline {...defaultProps} milestones={milestones} />);

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText(/Submitted: 8\/20\/2024/)).toBeInTheDocument();
    expect(screen.getByText(/Reviewed: 8\/21\/2024/)).toBeInTheDocument();
  });

  it('shows pending milestone with pending approval badge', () => {
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'PENDING', new Date('2024-08-20T10:00:00Z'))
    ];

    render(<MilestoneTimeline {...defaultProps} milestones={milestones} />);

    expect(screen.getByText('Pending Approval')).toBeInTheDocument();
    expect(screen.getByText(/Submitted: 8\/20\/2024/)).toBeInTheDocument();
  });

  it('shows rejected milestone with rejection reason', () => {
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'REJECTED', new Date('2024-08-20T10:00:00Z'))
    ];

    render(<MilestoneTimeline {...defaultProps} milestones={milestones} />);

    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Quality needs improvement')).toBeInTheDocument();
  });

  it('displays photo verification requirement for applicable milestones', () => {
    render(<MilestoneTimeline {...defaultProps} />);

    // Most milestones require photos except FABRIC_SELECTED
    expect(screen.getAllByText('Photo verification required')).toHaveLength(6);
  });

  it('shows view photo button when photo is available', () => {
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'PENDING', new Date('2024-08-20T10:00:00Z'), true)
    ];

    render(<MilestoneTimeline {...defaultProps} milestones={milestones} />);

    expect(screen.getByText('View Photo')).toBeInTheDocument();
  });

  it('shows review & approve button for customer on pending milestones', () => {
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'PENDING', new Date('2024-08-20T10:00:00Z'))
    ];

    render(
      <MilestoneTimeline 
        {...defaultProps} 
        milestones={milestones}
        userRole="customer"
      />
    );

    expect(screen.getByText('Review & Approve')).toBeInTheDocument();
  });

  it('does not show review button for tailor users', () => {
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'PENDING', new Date('2024-08-20T10:00:00Z'))
    ];

    render(
      <MilestoneTimeline 
        {...defaultProps} 
        milestones={milestones}
        userRole="tailor"
      />
    );

    expect(screen.queryByText('Review & Approve')).not.toBeInTheDocument();
  });

  it('opens photo preview dialog when view photo is clicked', async () => {
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'PENDING', new Date('2024-08-20T10:00:00Z'), true)
    ];

    render(<MilestoneTimeline {...defaultProps} milestones={milestones} />);

    const viewPhotoButton = screen.getByText('View Photo');
    fireEvent.click(viewPhotoButton);

    await waitFor(() => {
      expect(screen.getByText('Cutting Started Photo')).toBeInTheDocument();
    });
  });

  it('calls onViewPhotos callback when view photo is clicked', () => {
    const onViewPhotos = vi.fn();
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'PENDING', new Date('2024-08-20T10:00:00Z'), true)
    ];

    render(
      <MilestoneTimeline 
        {...defaultProps} 
        milestones={milestones}
        onViewPhotos={onViewPhotos}
      />
    );

    const viewPhotoButton = screen.getByText('View Photo');
    fireEvent.click(viewPhotoButton);

    expect(onViewPhotos).toHaveBeenCalledWith(milestones[0]);
  });

  it('calls onViewApproval callback when review button is clicked', () => {
    const onViewApproval = vi.fn();
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'PENDING', new Date('2024-08-20T10:00:00Z'))
    ];

    render(
      <MilestoneTimeline 
        {...defaultProps} 
        milestones={milestones}
        userRole="customer"
        onViewApproval={onViewApproval}
      />
    );

    const reviewButton = screen.getByText('Review & Approve');
    fireEvent.click(reviewButton);

    expect(onViewApproval).toHaveBeenCalledWith(milestones[0]);
  });

  it('displays milestone notes when available', () => {
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'APPROVED', new Date('2024-08-20T10:00:00Z'))
    ];

    render(<MilestoneTimeline {...defaultProps} milestones={milestones} />);

    expect(screen.getByText('Test notes for milestone')).toBeInTheDocument();
  });

  it('shows countdown timer for pending milestones with auto-approval', () => {
    const futureDeadline = new Date(Date.now() + 5 * 60 * 60 * 1000); // 5 hours from now
    const milestones = [
      {
        ...createMockMilestone('CUTTING_STARTED', 'PENDING', new Date('2024-08-20T10:00:00Z')),
        autoApprovalDeadline: futureDeadline
      }
    ];

    render(<MilestoneTimeline {...defaultProps} milestones={milestones} />);

    expect(screen.getByText('Auto-approves in:')).toBeInTheDocument();
  });

  it('applies correct status colors for different milestone states', () => {
    const milestones = [
      createMockMilestone('FABRIC_SELECTED', 'APPROVED', new Date()),
      createMockMilestone('CUTTING_STARTED', 'PENDING', new Date()),
      createMockMilestone('INITIAL_ASSEMBLY', 'REJECTED', new Date())
    ];

    render(<MilestoneTimeline {...defaultProps} milestones={milestones} />);

    // Check for approved (green), pending (yellow), and rejected (red) styling
    expect(screen.getByText('Approved')).toHaveClass('bg-green-500');
    expect(screen.getByText('Pending Approval')).toHaveClass('bg-yellow-500');
    expect(screen.getByText('Rejected')).toHaveClass('bg-red-500');
  });

  it('handles not started milestones correctly', () => {
    render(<MilestoneTimeline {...defaultProps} />);

    // Most milestones should show "Not Started" status
    expect(screen.getAllByText('Not Started')).toHaveLength(7);
  });

  it('closes photo preview dialog when close is triggered', async () => {
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'PENDING', new Date('2024-08-20T10:00:00Z'), true)
    ];

    render(<MilestoneTimeline {...defaultProps} milestones={milestones} />);

    // Open dialog
    const viewPhotoButton = screen.getByText('View Photo');
    fireEvent.click(viewPhotoButton);

    await waitFor(() => {
      expect(screen.getByText('Cutting Started Photo')).toBeInTheDocument();
    });

    // Close dialog (simulate clicking outside or escape)
    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByText('Cutting Started Photo')).not.toBeInTheDocument();
    });
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <MilestoneTimeline {...defaultProps} className="custom-timeline" />
    );

    expect(container.firstChild).toHaveClass('custom-timeline');
  });

  it('displays timeline with visual line connector', () => {
    render(<MilestoneTimeline {...defaultProps} />);

    // Check that timeline structure exists
    const timelineElements = screen.getAllByText(/[1-7]/);
    expect(timelineElements.length).toBeGreaterThan(0);
  });

  it('shows urgent styling for milestones nearing auto-approval', () => {
    const urgentDeadline = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const milestones = [
      {
        ...createMockMilestone('CUTTING_STARTED', 'PENDING', new Date()),
        autoApprovalDeadline: urgentDeadline
      }
    ];

    render(<MilestoneTimeline {...defaultProps} milestones={milestones} />);

    // Should show urgent countdown in red
    const countdownElement = screen.getByText(/Auto-approves in:/);
    expect(countdownElement.nextSibling).toHaveClass('text-red-600');
  });
});