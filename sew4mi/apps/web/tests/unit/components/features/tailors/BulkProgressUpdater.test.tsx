/**
 * BulkProgressUpdater Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BulkProgressUpdater } from '@/components/features/tailors/BulkProgressUpdater';
import { GroupOrderItem } from '@sew4mi/shared/types/group-order';
import { OrderStatus } from '@sew4mi/shared/types';

const mockItems: GroupOrderItem[] = [
  {
    id: 'item-1',
    groupOrderId: 'group-1',
    orderId: 'order-1',
    familyMemberName: 'John Doe',
    garmentType: "Men's Kaftan",
    status: OrderStatus.IN_PROGRESS,
    progressPercentage: 50,
    individualAmount: 200,
    discountedAmount: 170,
    paymentResponsibility: 'user-1',
    familyMemberProfileId: 'profile-1'
  },
  {
    id: 'item-2',
    groupOrderId: 'group-1',
    orderId: 'order-2',
    familyMemberName: 'Jane Doe',
    garmentType: "Women's Dress",
    status: OrderStatus.IN_PROGRESS,
    progressPercentage: 50,
    individualAmount: 250,
    discountedAmount: 212,
    paymentResponsibility: 'user-2',
    familyMemberProfileId: 'profile-2'
  }
];

describe('BulkProgressUpdater', () => {
  it('renders with group order items', () => {
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
      />
    );
    
    expect(screen.getByText('Bulk Progress Updater')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('shows selected item count', () => {
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
      />
    );
    
    expect(screen.getByText('0 Selected')).toBeInTheDocument();
    expect(screen.getByText(/of 2 total items/i)).toBeInTheDocument();
  });

  it('allows selecting individual items', () => {
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
      />
    );
    
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    expect(screen.getByText('1 Selected')).toBeInTheDocument();
  });

  it('allows selecting all items at same stage', () => {
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
      />
    );
    
    const inProgressButton = screen.getByRole('button', { name: /IN PROGRESS/i });
    fireEvent.click(inProgressButton);
    
    expect(screen.getByText('2 Selected')).toBeInTheDocument();
  });

  it('displays progress bar for each item', () => {
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
      />
    );
    
    // Both items at 50%
    const progressTexts = screen.getAllByText('50%');
    expect(progressTexts.length).toBeGreaterThan(0);
  });

  it('shows update form when items are selected', () => {
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
      />
    );
    
    // Select an item
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Update form should appear
    expect(screen.getByLabelText(/New Status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Progress Notes/i)).toBeInTheDocument();
  });

  it('requires progress notes before updating', () => {
    const onUpdate = vi.fn();
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
        onUpdate={onUpdate}
      />
    );
    
    // Select an item
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Try to update without notes
    const updateButton = screen.getByRole('button', { name: /Update 1 Item/i });
    expect(updateButton).toBeDisabled();
  });

  it('enables update button when notes are provided', () => {
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
        onUpdate={vi.fn()}
      />
    );
    
    // Select an item
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Add notes
    const notesTextarea = screen.getByPlaceholderText(/Describe the progress update/i);
    fireEvent.change(notesTextarea, { target: { value: 'Completed stitching' } });
    
    const updateButton = screen.getByRole('button', { name: /Update 1 Item/i });
    expect(updateButton).not.toBeDisabled();
  });

  it('calls onUpdate with correct data', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
        onUpdate={onUpdate}
      />
    );
    
    // Select an item
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Fill in form
    const statusSelect = screen.getByLabelText(/New Status/i);
    fireEvent.change(statusSelect, { target: { value: OrderStatus.AWAITING_FITTING } });
    
    const notesTextarea = screen.getByPlaceholderText(/Describe the progress update/i);
    fireEvent.change(notesTextarea, { target: { value: 'Ready for fitting' } });
    
    const updateButton = screen.getByRole('button', { name: /Update 1 Item/i });
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          groupOrderId: 'group-1',
          selectedItemIds: [mockItems[0].id],
          newStatus: OrderStatus.AWAITING_FITTING,
          progressNotes: 'Ready for fitting',
          notifyCustomers: true
        })
      );
    });
  });

  it('shows notification toggle', () => {
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
      />
    );
    
    // Select an item
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    expect(screen.getByText(/Send notification to all affected customers/i)).toBeInTheDocument();
  });

  it('displays bulk update best practices', () => {
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
      />
    );
    
    expect(screen.getByText('Bulk Update Best Practices')).toBeInTheDocument();
    expect(screen.getByText(/Upload progress photos/i)).toBeInTheDocument();
  });

  it('shows confirmation alert before updating', () => {
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
      />
    );
    
    // Select items
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    fireEvent.click(checkboxes[1]);
    
    expect(screen.getByText(/You are about to update 2 item/i)).toBeInTheDocument();
  });

  it('allows clearing selection', () => {
    render(
      <BulkProgressUpdater
        groupOrderId="group-1"
        items={mockItems}
      />
    );
    
    // Select an item
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    expect(screen.getByText('1 Selected')).toBeInTheDocument();
    
    // Clear selection
    const clearButton = screen.getByRole('button', { name: /Clear Selection/i });
    fireEvent.click(clearButton);
    
    expect(screen.getByText('0 Selected')).toBeInTheDocument();
  });
});

