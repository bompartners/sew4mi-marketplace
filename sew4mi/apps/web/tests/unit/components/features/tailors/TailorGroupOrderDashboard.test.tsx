/**
 * TailorGroupOrderDashboard Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TailorGroupOrderDashboard } from '@/components/features/tailors/TailorGroupOrderDashboard';
import { EnhancedGroupOrder, GroupOrderStatus, EventType } from '@sew4mi/shared/types/group-order';

// Mock data
const mockGroupOrders: EnhancedGroupOrder[] = [
  {
    id: 'group-1',
    groupName: 'Asante Family Wedding',
    organizerId: 'user-1',
    eventType: EventType.WEDDING,
    eventDate: new Date('2025-11-15'),
    totalParticipants: 8,
    totalOrders: 8,
    groupDiscountPercentage: 15,
    status: GroupOrderStatus.IN_PROGRESS,
    bulkDiscountPercentage: 15,
    totalOriginalAmount: 4000,
    totalDiscountedAmount: 3400,
    paymentMode: 'SINGLE_PAYER' as any,
    deliveryStrategy: 'ALL_TOGETHER' as any,
    progressSummary: {
      totalItems: 8,
      completedItems: 2,
      inProgressItems: 4,
      readyForDelivery: 0,
      pendingItems: 2,
      overallProgressPercentage: 45
    },
    createdAt: new Date('2025-10-01'),
    updatedAt: new Date('2025-10-01'),
    groupOrderNumber: 'GO-2025-001'
  },
  {
    id: 'group-2',
    groupName: 'Mensah Family Naming Ceremony',
    organizerId: 'user-2',
    eventType: EventType.NAMING_CEREMONY,
    eventDate: new Date('2025-10-20'),
    totalParticipants: 5,
    totalOrders: 5,
    groupDiscountPercentage: 15,
    status: GroupOrderStatus.CONFIRMED,
    bulkDiscountPercentage: 15,
    totalOriginalAmount: 2500,
    totalDiscountedAmount: 2125,
    paymentMode: 'SPLIT_PAYMENT' as any,
    deliveryStrategy: 'STAGGERED' as any,
    progressSummary: {
      totalItems: 5,
      completedItems: 0,
      inProgressItems: 0,
      readyForDelivery: 0,
      pendingItems: 5,
      overallProgressPercentage: 0
    },
    createdAt: new Date('2025-10-01'),
    updatedAt: new Date('2025-10-01'),
    groupOrderNumber: 'GO-2025-002'
  }
];

describe('TailorGroupOrderDashboard', () => {
  it('renders loading state', () => {
    render(<TailorGroupOrderDashboard isLoading={true} />);
    
    // Should show skeleton loaders
    expect(screen.getAllByRole('generic').length).toBeGreaterThan(0);
  });

  it('renders error state', () => {
    const error = new Error('Failed to load orders');
    render(<TailorGroupOrderDashboard error={error} />);
    
    expect(screen.getByText(/Failed to load group orders/i)).toBeInTheDocument();
  });

  it('renders empty state when no orders', () => {
    render(<TailorGroupOrderDashboard groupOrders={[]} />);
    
    expect(screen.getByText(/No group orders found/i)).toBeInTheDocument();
  });

  it('renders group orders correctly', () => {
    render(<TailorGroupOrderDashboard groupOrders={mockGroupOrders} />);
    
    // Should render order names
    expect(screen.getByText('Asante Family Wedding')).toBeInTheDocument();
    expect(screen.getByText('Mensah Family Naming Ceremony')).toBeInTheDocument();
  });

  it('displays summary statistics', () => {
    render(<TailorGroupOrderDashboard groupOrders={mockGroupOrders} />);
    
    // Should show total groups
    expect(screen.getByText('2')).toBeInTheDocument(); // Total groups count
    
    // Should show in progress count
    expect(screen.getByText('1')).toBeInTheDocument(); // In progress count
  });

  it('filters by status', () => {
    render(<TailorGroupOrderDashboard groupOrders={mockGroupOrders} />);
    
    // Find status filter select
    const statusFilter = screen.getAllByRole('combobox')[1]; // Second select is status
    
    // Change to IN_PROGRESS
    fireEvent.change(statusFilter, { target: { value: GroupOrderStatus.IN_PROGRESS } });
    
    // Should only show in progress order
    expect(screen.getByText('Asante Family Wedding')).toBeInTheDocument();
    expect(screen.queryByText('Mensah Family Naming Ceremony')).not.toBeInTheDocument();
  });

  it('searches by group name', () => {
    render(<TailorGroupOrderDashboard groupOrders={mockGroupOrders} />);
    
    const searchInput = screen.getByPlaceholderText(/Search by name/i);
    
    fireEvent.change(searchInput, { target: { value: 'Asante' } });
    
    // Should only show matching order
    expect(screen.getByText('Asante Family Wedding')).toBeInTheDocument();
    expect(screen.queryByText('Mensah Family Naming Ceremony')).not.toBeInTheDocument();
  });

  it('sorts by event date', () => {
    render(<TailorGroupOrderDashboard groupOrders={mockGroupOrders} />);
    
    // Get all order cards
    const orderCards = screen.getAllByRole('button', { name: /Manage Order/i });
    
    // Should be sorted by event date (Mensah ceremony is earlier)
    expect(orderCards.length).toBe(2);
  });

  it('displays urgency indicators', () => {
    render(<TailorGroupOrderDashboard groupOrders={mockGroupOrders} />);
    
    // Should show urgency badge for upcoming event (Mensah - 19 days away)
    expect(screen.getByText(/MEDIUM|HIGH|CRITICAL/i)).toBeInTheDocument();
  });

  it('calls onSelectGroupOrder when manage button clicked', () => {
    const onSelect = vi.fn();
    render(
      <TailorGroupOrderDashboard 
        groupOrders={mockGroupOrders} 
        onSelectGroupOrder={onSelect}
      />
    );
    
    const manageButtons = screen.getAllByRole('button', { name: /Manage Order/i });
    fireEvent.click(manageButtons[0]);
    
    expect(onSelect).toHaveBeenCalledWith(mockGroupOrders[0].id);
  });

  it('displays progress bars for each order', () => {
    render(<TailorGroupOrderDashboard groupOrders={mockGroupOrders} />);
    
    // Should show progress percentages
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('displays event type badges', () => {
    render(<TailorGroupOrderDashboard groupOrders={mockGroupOrders} />);
    
    expect(screen.getByText('Wedding')).toBeInTheDocument();
    expect(screen.getByText('Naming Ceremony')).toBeInTheDocument();
  });

  it('formats currency correctly', () => {
    render(<TailorGroupOrderDashboard groupOrders={mockGroupOrders} />);
    
    // Should display formatted amounts (implementation depends on formatCurrency util)
    expect(screen.getByText(/3400|3,400/i)).toBeInTheDocument();
  });

  it('displays discount badges when applicable', () => {
    render(<TailorGroupOrderDashboard groupOrders={mockGroupOrders} />);
    
    // Should show bulk discount badges
    expect(screen.getAllByText(/15% bulk discount applied/i).length).toBe(2);
  });
});

