/**
 * Unit tests for MilestoneProgress component
 * @file MilestoneProgress.test.tsx
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MilestoneProgress } from '@/components/features/milestones/MilestoneProgress';
import { OrderMilestone, MilestoneType } from '@sew4mi/shared';

// Mock data
const createMockMilestone = (
  milestone: MilestoneType,
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' = 'PENDING',
  verifiedAt?: Date
): OrderMilestone => ({
  id: `milestone-${milestone}`,
  orderId: 'order-123',
  milestone,
  photoUrl: verifiedAt ? 'https://example.com/photo.jpg' : '',
  notes: 'Test notes',
  verifiedAt: verifiedAt || null,
  verifiedBy: verifiedAt ? 'tailor-123' : '',
  approvalStatus,
  customerReviewedAt: approvalStatus !== 'PENDING' ? new Date() : null,
  autoApprovalDeadline: new Date(Date.now() + 48 * 60 * 60 * 1000),
  rejectionReason: approvalStatus === 'REJECTED' ? 'Needs improvement' : null
});

describe('MilestoneProgress Component', () => {
  it('renders progress tracking card with title', () => {
    const milestones: OrderMilestone[] = [];
    
    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="CUTTING_STARTED"
      />
    );

    expect(screen.getByText('Progress Tracking')).toBeInTheDocument();
    expect(screen.getByText('0 of 7 Complete')).toBeInTheDocument();
  });

  it('displays correct progress percentage with completed milestones', () => {
    const milestones = [
      createMockMilestone('FABRIC_SELECTED', 'APPROVED', new Date()),
      createMockMilestone('CUTTING_STARTED', 'APPROVED', new Date()),
      createMockMilestone('INITIAL_ASSEMBLY', 'PENDING', new Date())
    ];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="INITIAL_ASSEMBLY"
      />
    );

    expect(screen.getByText('2 of 7 Complete')).toBeInTheDocument();
    expect(screen.getByText('29%')).toBeInTheDocument(); // 2/7 = 28.57% rounded to 29%
  });

  it('highlights current milestone correctly', () => {
    const milestones = [
      createMockMilestone('FABRIC_SELECTED', 'APPROVED', new Date())
    ];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="CUTTING_STARTED"
      />
    );

    expect(screen.getByText('Current Stage')).toBeInTheDocument();
    expect(screen.getByText('Cutting Started')).toBeInTheDocument();
  });

  it('shows completed milestone with check icon', () => {
    const milestones = [
      createMockMilestone('FABRIC_SELECTED', 'APPROVED', new Date())
    ];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="CUTTING_STARTED"
      />
    );

    const completedBadge = screen.getByText('Approved');
    expect(completedBadge).toBeInTheDocument();
    expect(completedBadge).toHaveClass('bg-green-500');
  });

  it('shows pending milestone with awaiting approval badge', () => {
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'PENDING', new Date())
    ];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="CUTTING_STARTED"
      />
    );

    const pendingBadge = screen.getByText('Awaiting Approval');
    expect(pendingBadge).toBeInTheDocument();
    expect(pendingBadge).toHaveClass('bg-yellow-500');
  });

  it('shows rejected milestone with rejected badge', () => {
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'REJECTED', new Date())
    ];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="CUTTING_STARTED"
      />
    );

    const rejectedBadge = screen.getByText('Rejected');
    expect(rejectedBadge).toBeInTheDocument();
    expect(rejectedBadge).toHaveClass('bg-red-500', 'text-red-foreground');
  });

  it('displays milestone submission dates when available', () => {
    const submissionDate = new Date('2024-08-20T10:00:00Z');
    const milestones = [
      createMockMilestone('CUTTING_STARTED', 'APPROVED', submissionDate)
    ];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="CUTTING_STARTED"
      />
    );

    expect(screen.getByText(/Submitted:/)).toBeInTheDocument();
  });

  it('shows next step information when not at final milestone', () => {
    const milestones: OrderMilestone[] = [];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="CUTTING_STARTED"
      />
    );

    expect(screen.getByText('Next Step')).toBeInTheDocument();
    expect(screen.getByText('Tailor has begun cutting the fabric')).toBeInTheDocument();
  });

  it('does not show next step at final milestone', () => {
    const milestones: OrderMilestone[] = [];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="READY_FOR_DELIVERY"
        totalMilestones={7}
      />
    );

    expect(screen.queryByText('Next Step')).not.toBeInTheDocument();
  });

  it('handles custom total milestones count', () => {
    const milestones = [
      createMockMilestone('FABRIC_SELECTED', 'APPROVED', new Date())
    ];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="CUTTING_STARTED"
        totalMilestones={5}
      />
    );

    expect(screen.getByText('1 of 5 Complete')).toBeInTheDocument();
    expect(screen.getByText('20%')).toBeInTheDocument(); // 1/5 = 20%
  });

  it('applies custom className when provided', () => {
    const milestones: OrderMilestone[] = [];
    
    const { container } = render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="CUTTING_STARTED"
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('displays all milestone types in correct order', () => {
    const milestones: OrderMilestone[] = [];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="CUTTING_STARTED"
      />
    );

    // Check that all milestone labels are present in order
    const milestoneLabels = [
      'Fabric Selection',
      'Cutting Started',
      'Initial Assembly',
      'Fitting Ready',
      'Adjustments Complete',
      'Final Pressing',
      'Ready for Delivery'
    ];

    milestoneLabels.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('shows correct step numbers for non-completed milestones', () => {
    const milestones: OrderMilestone[] = [];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="CUTTING_STARTED"
      />
    );

    // First milestone should show step number 1
    const stepIndicators = screen.getAllByText(/[1-7]/);
    expect(stepIndicators.length).toBeGreaterThan(0);
  });

  it('handles empty milestones array correctly', () => {
    const milestones: OrderMilestone[] = [];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="FABRIC_SELECTED"
      />
    );

    expect(screen.getByText('0 of 7 Complete')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('Current Stage')).toBeInTheDocument();
  });

  it('shows proper styling for current milestone with ring indicator', () => {
    const milestones: OrderMilestone[] = [];

    render(
      <MilestoneProgress
        milestones={milestones}
        currentMilestone="CUTTING_STARTED"
      />
    );

    // Current milestone should have special styling
    const currentMilestoneCard = screen.getByText('Cutting Started').closest('.border-primary');
    expect(currentMilestoneCard).toBeInTheDocument();
  });
});