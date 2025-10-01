/**
 * ProductionSchedulePlanner Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductionSchedulePlanner } from '@/components/features/tailors/ProductionSchedulePlanner';
import { ProductionScheduleItem } from '@sew4mi/shared/types/group-order';
import { addDays } from 'date-fns';

const eventDate = addDays(new Date(), 30);

const mockScheduleItems: ProductionScheduleItem[] = [
  {
    orderId: 'order-1',
    familyMemberName: 'John Doe',
    garmentType: "Men's Kaftan",
    priority: 1,
    estimatedStartDate: new Date(),
    estimatedCompletionDate: addDays(new Date(), 3),
    dependencies: []
  },
  {
    orderId: 'order-2',
    familyMemberName: 'Jane Doe',
    garmentType: "Women's Dress",
    priority: 2,
    estimatedStartDate: addDays(new Date(), 4),
    estimatedCompletionDate: addDays(new Date(), 7),
    dependencies: []
  }
];

describe('ProductionSchedulePlanner', () => {
  it('renders with schedule items', () => {
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={mockScheduleItems}
      />
    );
    
    expect(screen.getByText('Production Schedule Planner')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('displays event date and days remaining', () => {
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={mockScheduleItems}
      />
    );
    
    expect(screen.getByText(/Event Date:/i)).toBeInTheDocument();
    expect(screen.getByText(/30 days remaining/i)).toBeInTheDocument();
  });

  it('calculates schedule health correctly', () => {
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={mockScheduleItems}
      />
    );
    
    // Both items complete before event, so 100% on track
    expect(screen.getByText('100% On Track')).toBeInTheDocument();
  });

  it('shows critical health status for late items', () => {
    const lateItems: ProductionScheduleItem[] = [
      {
        ...mockScheduleItems[0],
        estimatedCompletionDate: addDays(eventDate, 5) // After event
      }
    ];
    
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={lateItems}
      />
    );
    
    expect(screen.getByText('0% On Track')).toBeInTheDocument();
  });

  it('detects deadline conflicts', () => {
    const conflictingItems: ProductionScheduleItem[] = [
      {
        ...mockScheduleItems[0],
        estimatedCompletionDate: addDays(eventDate, 2) // After event
      }
    ];
    
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={conflictingItems}
      />
    );
    
    expect(screen.getByText(/Scheduling Conflict/i)).toBeInTheDocument();
    expect(screen.getByText(/After Event Date/i)).toBeInTheDocument();
  });

  it('allows moving items up in priority', () => {
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={mockScheduleItems}
      />
    );
    
    // Second item should have up button enabled
    const upButtons = screen.getAllByRole('button', { name: '' }).filter(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-chevron-up')
    );
    
    expect(upButtons.length).toBeGreaterThan(0);
  });

  it('allows moving items down in priority', () => {
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={mockScheduleItems}
      />
    );
    
    // First item should have down button enabled
    const downButtons = screen.getAllByRole('button', { name: '' }).filter(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-chevron-down')
    );
    
    expect(downButtons.length).toBeGreaterThan(0);
  });

  it('has recalculate dates button', () => {
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={mockScheduleItems}
      />
    );
    
    expect(screen.getByRole('button', { name: /Recalculate Dates/i })).toBeInTheDocument();
  });

  it('displays production timeline visualization', () => {
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={mockScheduleItems}
      />
    );
    
    expect(screen.getByText('Production Timeline')).toBeInTheDocument();
    expect(screen.getByText(/Event Date/i)).toBeInTheDocument();
  });

  it('shows production planning tips', () => {
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={mockScheduleItems}
      />
    );
    
    expect(screen.getByText('Production Planning Tips')).toBeInTheDocument();
    expect(screen.getByText(/similar garment types/i)).toBeInTheDocument();
  });

  it('displays dependency indicators', () => {
    const itemsWithDependencies: ProductionScheduleItem[] = [
      mockScheduleItems[0],
      {
        ...mockScheduleItems[1],
        dependencies: [mockScheduleItems[0].orderId]
      }
    ];
    
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={itemsWithDependencies}
      />
    );
    
    expect(screen.getByText('Has Dependencies')).toBeInTheDocument();
  });

  it('disables save button when conflicts exist', () => {
    const conflictingItems: ProductionScheduleItem[] = [
      {
        ...mockScheduleItems[0],
        estimatedCompletionDate: addDays(eventDate, 2)
      }
    ];
    
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={conflictingItems}
        onSave={vi.fn()}
      />
    );
    
    const saveButton = screen.getByRole('button', { name: /Save Schedule/i });
    expect(saveButton).toBeDisabled();
  });

  it('shows progress indicators for on-time and at-risk items', () => {
    render(
      <ProductionSchedulePlanner
        groupOrderId="group-1"
        eventDate={eventDate}
        scheduleItems={mockScheduleItems}
      />
    );
    
    expect(screen.getByText('2 on time')).toBeInTheDocument();
    expect(screen.getByText('0 at risk')).toBeInTheDocument();
  });
});

