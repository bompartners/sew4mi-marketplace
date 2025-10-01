/**
 * Unit tests for TailorMilestoneSubmission component
 * @file TailorMilestoneSubmission.test.tsx
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TailorMilestoneSubmission } from '@/components/features/milestones/TailorMilestoneSubmission';
import { MilestoneStage } from '@sew4mi/shared/types';

// Mock PhotoUpload component
vi.mock('@/components/features/milestones/PhotoUpload', () => ({
  PhotoUpload: ({ onPhotosSelected, maxPhotos }: any) => (
    <div data-testid="photo-upload">
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          onPhotosSelected(files);
        }}
        data-testid="photo-input"
      />
      <div>Max photos: {maxPhotos}</div>
    </div>
  )
}));

describe('TailorMilestoneSubmission Component', () => {
  const defaultProps = {
    orderId: 'order-123',
    currentMilestone: MilestoneStage.CUTTING_STARTED,
    onSubmit: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders milestone submission form with title and description', () => {
    render(<TailorMilestoneSubmission {...defaultProps} />);

    expect(screen.getByText('Fabric Cutting in Progress')).toBeInTheDocument();
    expect(screen.getByText('Document the fabric cutting process')).toBeInTheDocument();
  });

  it('displays milestone instructions', () => {
    render(<TailorMilestoneSubmission {...defaultProps} />);

    expect(screen.getByText('Instructions')).toBeInTheDocument();
    expect(screen.getByText('Take clear photos of the cutting process')).toBeInTheDocument();
    expect(screen.getByText('Show fabric laid out with pattern pieces')).toBeInTheDocument();
  });

  it('shows photo requirements for milestones that need photos', () => {
    render(<TailorMilestoneSubmission {...defaultProps} />);

    expect(screen.getByText('Photo Requirements')).toBeInTheDocument();
    expect(screen.getByText('Clear photo of fabric layout with patterns')).toBeInTheDocument();
    expect(screen.getByText('Cut pieces arranged and labeled')).toBeInTheDocument();
  });

  it('displays photo upload component for milestones requiring photos', () => {
    render(<TailorMilestoneSubmission {...defaultProps} />);

    expect(screen.getByTestId('photo-upload')).toBeInTheDocument();
    expect(screen.getByText('Photos (2 required)')).toBeInTheDocument();
  });

  it('does not show photo upload for milestones that do not require photos', () => {
    render(
      <TailorMilestoneSubmission 
        {...defaultProps}
        currentMilestone={MilestoneStage.FABRIC_SELECTED}
      />
    );

    expect(screen.queryByTestId('photo-upload')).not.toBeInTheDocument();
    expect(screen.queryByText(/Photos/)).not.toBeInTheDocument();
  });

  it('shows progress notes textarea', () => {
    render(<TailorMilestoneSubmission {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(/Describe your progress/);
    expect(textarea).toBeInTheDocument();
    expect(screen.getByText('Progress Notes')).toBeInTheDocument();
  });

  it('validates required photos before submission', async () => {
    const user = userEvent.setup();
    render(<TailorMilestoneSubmission {...defaultProps} />);

    const notesTextarea = screen.getByPlaceholderText(/Describe your progress/);
    await user.type(notesTextarea, 'Some progress notes');

    const submitButton = screen.getByText('Submit Milestone');
    await user.click(submitButton);

    expect(screen.getByText('Please upload at least 2 photos')).toBeInTheDocument();
  });

  it('validates required notes before submission', async () => {
    const user = userEvent.setup();
    render(<TailorMilestoneSubmission {...defaultProps} />);

    const submitButton = screen.getByText('Submit Milestone');
    await user.click(submitButton);

    expect(screen.getByText('Please add notes describing your progress')).toBeInTheDocument();
  });

  it('validates minimum notes length', async () => {
    const user = userEvent.setup();
    render(<TailorMilestoneSubmission {...defaultProps} />);

    const notesTextarea = screen.getByPlaceholderText(/Describe your progress/);
    await user.type(notesTextarea, 'Short');

    const submitButton = screen.getByText('Submit Milestone');
    await user.click(submitButton);

    expect(screen.getByText('Please provide more detailed notes (at least 10 characters)')).toBeInTheDocument();
  });

  it('validates maximum number of photos', async () => {
    const user = userEvent.setup();
    render(<TailorMilestoneSubmission {...defaultProps} />);

    // Create mock files (more than allowed)
    const mockFiles = Array(6).fill(null).map((_, i) => 
      new File(['content'], `photo${i}.jpg`, { type: 'image/jpeg' })
    );

    const photoInput = screen.getByTestId('photo-input');
    
    // Mock file selection
    Object.defineProperty(photoInput, 'files', {
      value: mockFiles,
      writable: false,
    });
    
    fireEvent.change(photoInput);

    const notesTextarea = screen.getByPlaceholderText(/Describe your progress/);
    await user.type(notesTextarea, 'Detailed progress notes');

    const submitButton = screen.getByText('Submit Milestone');
    await user.click(submitButton);

    expect(screen.getByText('Please upload no more than 4 photos')).toBeInTheDocument();
  });

  it('successfully submits milestone with valid data', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    
    render(
      <TailorMilestoneSubmission 
        {...defaultProps}
        onSubmit={mockOnSubmit}
      />
    );

    // Add photos
    const mockFiles = [
      new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' }),
      new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' })
    ];

    const photoInput = screen.getByTestId('photo-input');
    Object.defineProperty(photoInput, 'files', {
      value: mockFiles,
      writable: false,
    });
    fireEvent.change(photoInput);

    // Add notes
    const notesTextarea = screen.getByPlaceholderText(/Describe your progress/);
    await user.type(notesTextarea, 'Detailed progress notes describing the work completed');

    // Submit
    const submitButton = screen.getByText('Submit Milestone');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        photos: mockFiles,
        notes: 'Detailed progress notes describing the work completed',
        milestone: 'CUTTING_STARTED'
      });
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn(() => new Promise<void>(resolve => setTimeout(resolve, 1000)));
    
    render(
      <TailorMilestoneSubmission 
        {...defaultProps}
        onSubmit={mockOnSubmit}
      />
    );

    // Add valid data
    const notesTextarea = screen.getByPlaceholderText(/Describe your progress/);
    await user.type(notesTextarea, 'Valid notes');

    const mockFiles = [
      new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' }),
      new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' })
    ];

    const photoInput = screen.getByTestId('photo-input');
    Object.defineProperty(photoInput, 'files', {
      value: mockFiles,
      writable: false,
    });
    fireEvent.change(photoInput);

    // Submit
    const submitButton = screen.getByText('Submit Milestone');
    await user.click(submitButton);

    expect(screen.getByText('Submitting...')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('displays submitted status when milestone is already submitted', () => {
    const submittedDate = new Date('2024-08-20T10:00:00Z');
    
    render(
      <TailorMilestoneSubmission 
        {...defaultProps}
        isSubmitted={true}
        submittedAt={submittedDate}
        approvalStatus="PENDING"
      />
    );

    expect(screen.getByText(/Milestone submitted on 8\/20\/2024/)).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
    expect(screen.queryByText('Submit Milestone')).not.toBeInTheDocument();
  });

  it('displays approved status correctly', () => {
    render(
      <TailorMilestoneSubmission 
        {...defaultProps}
        isSubmitted={true}
        submittedAt={new Date()}
        approvalStatus="APPROVED"
      />
    );

    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Approved by customer!')).toBeInTheDocument();
  });

  it('shows rejection feedback and allows resubmission', () => {
    render(
      <TailorMilestoneSubmission 
        {...defaultProps}
        isSubmitted={true}
        submittedAt={new Date()}
        approvalStatus="REJECTED"
        rejectionReason="Photos are unclear, please retake"
      />
    );

    expect(screen.getByText('Rejected')).toBeInTheDocument();
    expect(screen.getByText('Photos are unclear, please retake')).toBeInTheDocument();
    expect(screen.getByText('Resubmit Milestone')).toBeInTheDocument();
  });

  it('shows auto-approval notice for pending milestones', () => {
    render(
      <TailorMilestoneSubmission 
        {...defaultProps}
        isSubmitted={true}
        submittedAt={new Date()}
        approvalStatus="PENDING"
      />
    );

    expect(screen.getByText('Awaiting Customer Approval')).toBeInTheDocument();
    expect(screen.getByText(/automatically approved if the customer doesn't respond/)).toBeInTheDocument();
  });

  it('displays correct progress percentage for different states', () => {
    const { rerender } = render(
      <TailorMilestoneSubmission {...defaultProps} />
    );

    expect(screen.getByText('0%')).toBeInTheDocument();

    rerender(
      <TailorMilestoneSubmission 
        {...defaultProps}
        isSubmitted={true}
        approvalStatus="PENDING"
      />
    );

    expect(screen.getByText('75%')).toBeInTheDocument();

    rerender(
      <TailorMilestoneSubmission 
        {...defaultProps}
        isSubmitted={true}
        approvalStatus="APPROVED"
      />
    );

    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('handles submission errors gracefully', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Submission failed'));
    
    render(
      <TailorMilestoneSubmission 
        {...defaultProps}
        onSubmit={mockOnSubmit}
      />
    );

    // Add valid data
    const notesTextarea = screen.getByPlaceholderText(/Describe your progress/);
    await user.type(notesTextarea, 'Valid notes');

    const mockFiles = [
      new File(['content1'], 'photo1.jpg', { type: 'image/jpeg' }),
      new File(['content2'], 'photo2.jpg', { type: 'image/jpeg' })
    ];

    const photoInput = screen.getByTestId('photo-input');
    Object.defineProperty(photoInput, 'files', {
      value: mockFiles,
      writable: false,
    });
    fireEvent.change(photoInput);

    // Submit
    const submitButton = screen.getByText('Submit Milestone');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to submit milestone. Please try again.')).toBeInTheDocument();
    });
  });

  it('applies custom className when provided', () => {
    const { container } = render(
      <TailorMilestoneSubmission 
        {...defaultProps}
        className="custom-submission"
      />
    );

    expect(container.firstChild).toHaveClass('custom-submission');
  });

  it('resets form after successful submission', async () => {
    const user = userEvent.setup();
    const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
    
    render(
      <TailorMilestoneSubmission 
        {...defaultProps}
        onSubmit={mockOnSubmit}
      />
    );

    // Add data
    const notesTextarea = screen.getByPlaceholderText(/Describe your progress/);
    await user.type(notesTextarea, 'Test notes');

    // Submit
    const submitButton = screen.getByText('Submit Milestone');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Form should be reset
    expect(notesTextarea).toHaveValue('');
  });
});