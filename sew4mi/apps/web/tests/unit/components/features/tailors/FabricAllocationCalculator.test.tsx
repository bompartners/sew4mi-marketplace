/**
 * FabricAllocationCalculator Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FabricAllocationCalculator } from '@/components/features/tailors/FabricAllocationCalculator';
import { FabricAllocation } from '@sew4mi/shared/types/group-order';

const mockAllocations: FabricAllocation[] = [
  {
    id: 'alloc-1',
    groupOrderId: 'group-1',
    groupOrderItemId: 'item-1',
    orderId: 'order-1',
    garmentType: "Men's Kaftan",
    yardsAllocated: 3.5,
    allocatedYardage: 3.5,
    fabricLot: 'LOT-001'
  },
  {
    id: 'alloc-2',
    groupOrderId: 'group-1',
    groupOrderItemId: 'item-2',
    orderId: 'order-2',
    garmentType: "Women's Dress",
    yardsAllocated: 4.0,
    allocatedYardage: 4.0,
    fabricLot: 'LOT-001'
  }
];

describe('FabricAllocationCalculator', () => {
  it('renders with initial allocations', () => {
    render(<FabricAllocationCalculator allocations={mockAllocations} />);
    
    expect(screen.getByText('Fabric Allocation Calculator')).toBeInTheDocument();
    expect(screen.getByText("Men's Kaftan")).toBeInTheDocument();
    expect(screen.getByText("Women's Dress")).toBeInTheDocument();
  });

  it('calculates total yards needed correctly', () => {
    render(<FabricAllocationCalculator allocations={mockAllocations} />);
    
    // 3.5 + 4.0 = 7.5
    expect(screen.getByText('7.50 yds')).toBeInTheDocument();
  });

  it('calculates buffer amount correctly with default 10%', () => {
    render(<FabricAllocationCalculator allocations={mockAllocations} />);
    
    // 7.5 * 10% = 0.75
    expect(screen.getByText('0.75 yds')).toBeInTheDocument();
  });

  it('calculates recommended purchase quantity correctly', () => {
    render(<FabricAllocationCalculator allocations={mockAllocations} />);
    
    // 7.5 + 0.75 = 8.25
    expect(screen.getByText('8.25 yds')).toBeInTheDocument();
  });

  it('updates buffer percentage when changed', () => {
    render(<FabricAllocationCalculator allocations={mockAllocations} initialBufferPercentage={10} />);
    
    const bufferInput = screen.getByLabelText(/Buffer Percentage/i);
    fireEvent.change(bufferInput, { target: { value: '15' } });
    
    // 7.5 * 15% = 1.125
    expect(screen.getByText('1.12 yds')).toBeInTheDocument();
    // 7.5 + 1.125 = 8.625
    expect(screen.getByText('8.62 yds')).toBeInTheDocument();
  });

  it('allows updating individual allocation yardage', () => {
    render(<FabricAllocationCalculator allocations={mockAllocations} />);
    
    const allocationInputs = screen.getAllByRole('spinbutton');
    const firstItemYardage = allocationInputs.find(input => 
      (input as HTMLInputElement).value === '3.5'
    );
    
    if (firstItemYardage) {
      fireEvent.change(firstItemYardage, { target: { value: '4.0' } });
      
      // Total should update: 4.0 + 4.0 = 8.0
      expect(screen.getByText('8.00 yds')).toBeInTheDocument();
    }
  });

  it('displays appropriate fabric sourcing recommendation for small orders', () => {
    const smallAllocations: FabricAllocation[] = [
      { ...mockAllocations[0], yardsAllocated: 2.0, allocatedYardage: 2.0 }
    ];
    
    render(<FabricAllocationCalculator allocations={smallAllocations} />);
    
    expect(screen.getByText('Local Fabric Store')).toBeInTheDocument();
    expect(screen.getByText(/Makola Market/i)).toBeInTheDocument();
  });

  it('displays appropriate fabric sourcing recommendation for medium orders', () => {
    const mediumAllocations: FabricAllocation[] = [
      { ...mockAllocations[0], yardsAllocated: 25.0, allocatedYardage: 25.0 }
    ];
    
    render(<FabricAllocationCalculator allocations={mediumAllocations} />);
    
    expect(screen.getByText('Wholesale Fabric Supplier')).toBeInTheDocument();
  });

  it('displays appropriate fabric sourcing recommendation for large orders', () => {
    const largeAllocations: FabricAllocation[] = [
      { ...mockAllocations[0], yardsAllocated: 60.0, allocatedYardage: 60.0 }
    ];
    
    render(<FabricAllocationCalculator allocations={largeAllocations} />);
    
    expect(screen.getByText('Direct Textile Importer')).toBeInTheDocument();
  });

  it('shows Ghana-specific fabric allocation tips', () => {
    render(<FabricAllocationCalculator allocations={mockAllocations} />);
    
    expect(screen.getByText(/Kente fabric/i)).toBeInTheDocument();
    expect(screen.getByText(/same lot/i)).toBeInTheDocument();
  });

  it('calls onSave when save button clicked', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    
    render(
      <FabricAllocationCalculator 
        allocations={mockAllocations} 
        onSave={onSave}
      />
    );
    
    const saveButton = screen.getByRole('button', { name: /Save Fabric Allocation/i });
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          totalYardsNeeded: 7.5,
          bufferPercentage: 10,
          individualAllocations: expect.any(Array)
        })
      );
    });
  });

  it('disables save button when saving', () => {
    render(
      <FabricAllocationCalculator 
        allocations={mockAllocations} 
        isSaving={true}
        onSave={vi.fn()}
      />
    );
    
    const saveButton = screen.getByRole('button', { name: /Saving.../i });
    expect(saveButton).toBeDisabled();
  });

  it('displays percentage breakdown for each allocation', () => {
    render(<FabricAllocationCalculator allocations={mockAllocations} />);
    
    // 3.5 / 7.5 = 46.7%
    expect(screen.getByText('46.7%')).toBeInTheDocument();
    // 4.0 / 7.5 = 53.3%
    expect(screen.getByText('53.3%')).toBeInTheDocument();
  });
});

