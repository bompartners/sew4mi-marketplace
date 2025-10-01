// Component test for DisputeCreationForm
// Story 2.4: Test dispute creation form functionality

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DisputeCreationForm } from '@/components/features/disputes/DisputeCreationForm';

// Mock the evidence upload component
vi.mock('@/components/features/disputes/DisputeEvidenceUpload', () => ({
  DisputeEvidenceUpload: ({ onUploadComplete, onUploadError }: any) => (
    <div data-testid="evidence-upload">
      <button onClick={() => onUploadComplete(['file1.jpg', 'file2.pdf'])}>
        Upload Evidence
      </button>
      <button onClick={() => onUploadError('Upload failed')}>
        Trigger Error
      </button>
    </div>
  )
}));

describe('DisputeCreationForm', () => {
  const mockProps = {
    orderId: 'order-123',
    milestoneId: 'milestone-123',
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
    orderDetails: {
      customerName: 'John Doe',
      tailorName: 'Jane Tailor',
      orderAmount: 250,
      status: 'IN_PROGRESS'
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders form with order details', () => {
    render(<DisputeCreationForm {...mockProps} />);

    expect(screen.getByText('Create Dispute')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Tailor')).toBeInTheDocument();
    expect(screen.getByText('GH₵ 250')).toBeInTheDocument();
    expect(screen.getByText('IN_PROGRESS')).toBeInTheDocument();
  });

  it('renders form without order details', () => {
    const propsWithoutDetails = { ...mockProps, orderDetails: undefined };
    render(<DisputeCreationForm {...propsWithoutDetails} />);

    expect(screen.getByText('Create Dispute')).toBeInTheDocument();
    expect(screen.queryByText('Order Details')).not.toBeInTheDocument();
  });

  it('validates required fields', async () => {
    const user = userEvent.setup();
    render(<DisputeCreationForm {...mockProps} />);

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /create dispute/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Please select a dispute category')).toBeInTheDocument();
    });

    expect(mockProps.onSubmit).not.toHaveBeenCalled();
  });

  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    mockProps.onSubmit.mockResolvedValue(undefined);
    
    render(<DisputeCreationForm {...mockProps} />);

    // Fill in title
    const titleInput = screen.getByLabelText(/dispute title/i);
    await user.type(titleInput, 'Poor stitching quality');

    // Fill in description
    const descriptionTextarea = screen.getByLabelText(/detailed description/i);
    await user.type(descriptionTextarea, 'The garment has poor stitching quality with loose threads everywhere');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /create dispute/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockProps.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-123',
          milestoneId: 'milestone-123',
          title: 'Poor stitching quality',
          description: 'The garment has poor stitching quality with loose threads everywhere'
        }),
        []
      );
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<DisputeCreationForm {...mockProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockProps.onCancel).toHaveBeenCalled();
  });

  it('disables form when loading', () => {
    const loadingProps = { ...mockProps, isLoading: true };
    render(<DisputeCreationForm {...loadingProps} />);

    const submitButton = screen.getByRole('button', { name: /create dispute/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});