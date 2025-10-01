/**
 * CoordinationChecklist Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CoordinationChecklist } from '@/components/features/tailors/CoordinationChecklist';

describe('CoordinationChecklist', () => {
  it('renders with standard checklist items', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    expect(screen.getByText('Coordination Completion Checklist')).toBeInTheDocument();
    expect(screen.getByText('Fabric Consistency')).toBeInTheDocument();
    expect(screen.getByText('Color Coordination')).toBeInTheDocument();
    expect(screen.getByText('Stitching Quality')).toBeInTheDocument();
  });

  it('groups checklist items by category', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    expect(screen.getByText('Fabric Coordination')).toBeInTheDocument();
    expect(screen.getByText('Quality Control')).toBeInTheDocument();
    expect(screen.getByText('Final Finishing')).toBeInTheDocument();
  });

  it('shows completion percentage', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    // Initially 0%
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText(/0 of 12 items completed/i)).toBeInTheDocument();
  });

  it('updates completion percentage when items are checked', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Should update to ~8% (1/12)
    expect(screen.getByText(/1 of 12 items completed/i)).toBeInTheDocument();
  });

  it('allows adding notes to completed items', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);
    
    // Notes textarea should appear
    const notesTextarea = screen.getAllByPlaceholderText(/Add notes or observations/i)[0];
    expect(notesTextarea).toBeInTheDocument();
  });

  it('warns when not ready for approval', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    expect(screen.getByText(/Complete all checklist items before marking/i)).toBeInTheDocument();
  });

  it('shows ready for approval when all items checked', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    // Check all checkboxes
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => fireEvent.click(checkbox));
    
    expect(screen.getByText('Ready for Final Approval')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mark Group Order Complete/i })).toBeInTheDocument();
  });

  it('displays photo comparison tip', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    expect(screen.getByText('Photo Comparison Tip')).toBeInTheDocument();
    expect(screen.getByText(/Lay all 8 garments side by side/i)).toBeInTheDocument();
  });

  it('shows quality standards reminder', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    expect(screen.getByText('Quality Standards Reminder')).toBeInTheDocument();
    expect(screen.getByText(/garments should look coordinated/i)).toBeInTheDocument();
  });

  it('allows entering overall notes', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    const overallNotes = screen.getByPlaceholderText(/Document any special considerations/i);
    fireEvent.change(overallNotes, { target: { value: 'All items meet quality standards' } });
    
    expect(overallNotes).toHaveValue('All items meet quality standards');
  });

  it('calls onSubmit when approved for completion', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
        onSubmit={onSubmit}
      />
    );
    
    // Check all items
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => fireEvent.click(checkbox));
    
    // Submit
    const submitButton = screen.getByRole('button', { name: /Mark Group Order Complete/i });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          groupOrderId: 'group-1',
          approvedForCompletion: true
        })
      );
    });
  });

  it('shows submitting state', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
        isSubmitting={true}
        onSubmit={vi.fn()}
      />
    );
    
    // Check all items first
    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => fireEvent.click(checkbox));
    
    expect(screen.getByText('Submitting...')).toBeInTheDocument();
  });

  it('has save progress button', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    expect(screen.getByRole('button', { name: /Save Progress/i })).toBeInTheDocument();
  });

  it('displays cultural appropriateness check', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    expect(screen.getByText('Cultural Appropriateness')).toBeInTheDocument();
    expect(screen.getByText(/Confirm design respects cultural traditions/i)).toBeInTheDocument();
  });

  it('includes packaging and labeling check', () => {
    render(
      <CoordinationChecklist
        groupOrderId="group-1"
        totalItems={8}
      />
    );
    
    expect(screen.getByText('Packaging & Labeling')).toBeInTheDocument();
    expect(screen.getByText(/labeled and packaged for the correct family member/i)).toBeInTheDocument();
  });
});

