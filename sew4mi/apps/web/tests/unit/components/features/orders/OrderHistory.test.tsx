/**
 * Unit tests for OrderHistory component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderHistory } from '@/components/features/orders/OrderHistory';
import { OrderStatus, GarmentType, OrderWithProgress } from '@sew4mi/shared/types/order-creation';

// Mock fetch
global.fetch = vi.fn();

// Mock date-fns
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    format: vi.fn((date, formatStr) => '2024-01-15'),
    parseISO: vi.fn((dateStr) => new Date('2024-01-15T10:30:00Z')),
    isAfter: vi.fn(() => true),
    isBefore: vi.fn(() => true),
    startOfDay: vi.fn((date) => date),
    endOfDay: vi.fn((date) => date)
  };
});

describe('OrderHistory', () => {
  const defaultProps = {
    userId: 'user-123',
    userRole: 'customer' as const
  };

  const mockOrders: OrderWithProgress[] = [
    {
      id: 'order-1',
      orderNumber: 'SW-2024-001',
      customerId: 'customer-123',
      customerName: 'John Doe',
      customerAvatar: '/avatars/john.jpg',
      tailorId: 'tailor-123',
      tailorName: 'Jane Smith',
      tailorAvatar: '/avatars/jane.jpg',
      tailorPhone: '+233241234567',
      garmentType: GarmentType.DRESS,
      garmentCategory: 'Evening Dress',
      size: 'M',
      fabric: 'Silk',
      status: OrderStatus.IN_PROGRESS,
      totalPrice: 350.00,
      basePrice: 300.00,
      customizationFee: 50.00,
      createdAt: '2024-01-15T10:30:00Z',
      estimatedCompletionDate: '2024-02-15T10:30:00Z',
      progressPercentage: 65
    },
    {
      id: 'order-2',
      orderNumber: 'SW-2024-002',
      customerId: 'customer-123',
      customerName: 'John Doe',
      tailorId: 'tailor-456',
      tailorName: 'Mary Johnson',
      tailorAvatar: '/avatars/mary.jpg',
      garmentType: GarmentType.SHIRT,
      garmentCategory: 'Casual Shirt',
      size: 'L',
      fabric: 'Cotton',
      status: OrderStatus.COMPLETED,
      totalPrice: 150.00,
      basePrice: 150.00,
      createdAt: '2024-01-10T14:20:00Z',
      estimatedCompletionDate: '2024-01-25T14:20:00Z',
      actualCompletionDate: '2024-01-24T16:30:00Z',
      progressPercentage: 100
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful API response
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        orders: mockOrders,
        total: mockOrders.length
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render order history with title', async () => {
      render(<OrderHistory {...defaultProps} />);
      
      expect(screen.getByText('Order History')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<OrderHistory {...defaultProps} />);
      
      // Should show skeleton loaders
      expect(screen.getByText('Order History')).toBeInTheDocument();
    });

    it('should display orders after loading', async () => {
      render(<OrderHistory {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
        expect(screen.getByText('#SW-2024-002')).toBeInTheDocument();
      });
    });

    it('should show order details correctly', async () => {
      render(<OrderHistory {...defaultProps} />);
      
      await waitFor(() => {
        // Check first order details
        expect(screen.getByText('Evening Dress')).toBeInTheDocument();
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('GH₵350.00')).toBeInTheDocument();
        
        // Check second order details
        expect(screen.getByText('Casual Shirt')).toBeInTheDocument();
        expect(screen.getByText('Mary Johnson')).toBeInTheDocument();
        expect(screen.getByText('GH₵150.00')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('should filter orders by search query', async () => {
      const user = userEvent.setup();
      render(<OrderHistory {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search orders, garments, or participants...');
      await user.type(searchInput, 'SW-2024-001');
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
        expect(screen.queryByText('#SW-2024-002')).not.toBeInTheDocument();
      });
    });

    it('should search by garment type', async () => {
      const user = userEvent.setup();
      render(<OrderHistory {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search orders, garments, or participants...');
      await user.type(searchInput, 'dress');
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
        expect(screen.queryByText('#SW-2024-002')).not.toBeInTheDocument();
      });
    });

    it('should search by tailor name', async () => {
      const user = userEvent.setup();
      render(<OrderHistory {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search orders, garments, or participants...');
      await user.type(searchInput, 'Jane Smith');
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
        expect(screen.queryByText('#SW-2024-002')).not.toBeInTheDocument();
      });
    });
  });

  describe('Filtering', () => {
    it('should show filter panel when filters button is clicked', async () => {
      const user = userEvent.setup();
      render(<OrderHistory {...defaultProps} showAdvancedFilters={true} />);
      
      const filtersButton = screen.getByText('Filters');
      await user.click(filtersButton);
      
      expect(screen.getByText('Order Status')).toBeInTheDocument();
      expect(screen.getByText('Garment Type')).toBeInTheDocument();
    });

    it('should filter by order status', async () => {
      const user = userEvent.setup();
      render(<OrderHistory {...defaultProps} showAdvancedFilters={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
      
      // Open filters
      const filtersButton = screen.getByText('Filters');
      await user.click(filtersButton);
      
      // Check "COMPLETED" status
      const completedCheckbox = screen.getByLabelText(/completed/i);
      await user.click(completedCheckbox);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-002')).toBeInTheDocument();
        expect(screen.queryByText('#SW-2024-001')).not.toBeInTheDocument();
      });
    });

    it('should filter by garment type', async () => {
      const user = userEvent.setup();
      render(<OrderHistory {...defaultProps} showAdvancedFilters={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
      
      // Open filters
      const filtersButton = screen.getByText('Filters');
      await user.click(filtersButton);
      
      // Select garment type
      const garmentSelect = screen.getByRole('combobox');
      await user.click(garmentSelect);
      await user.click(screen.getByText('DRESS'));
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
        expect(screen.queryByText('#SW-2024-002')).not.toBeInTheDocument();
      });
    });

    it('should clear all filters', async () => {
      const user = userEvent.setup();
      render(<OrderHistory {...defaultProps} showAdvancedFilters={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
      
      // Open filters and apply some
      const filtersButton = screen.getByText('Filters');
      await user.click(filtersButton);
      
      const completedCheckbox = screen.getByLabelText(/completed/i);
      await user.click(completedCheckbox);
      
      await waitFor(() => {
        expect(screen.queryByText('#SW-2024-001')).not.toBeInTheDocument();
      });
      
      // Clear filters
      const clearButton = screen.getByText('Clear All');
      await user.click(clearButton);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
        expect(screen.getByText('#SW-2024-002')).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    it('should show pagination when there are many orders', async () => {
      const manyOrders = Array.from({ length: 25 }, (_, i) => ({
        ...mockOrders[0],
        id: `order-${i}`,
        orderNumber: `SW-2024-${String(i + 1).padStart(3, '0')}`
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orders: manyOrders,
          total: manyOrders.length
        })
      });

      render(<OrderHistory {...defaultProps} pageSize={10} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
      
      // Should show pagination
      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should navigate between pages', async () => {
      const user = userEvent.setup();
      const manyOrders = Array.from({ length: 25 }, (_, i) => ({
        ...mockOrders[0],
        id: `order-${i}`,
        orderNumber: `SW-2024-${String(i + 1).padStart(3, '0')}`
      }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orders: manyOrders,
          total: manyOrders.length
        })
      });

      render(<OrderHistory {...defaultProps} pageSize={10} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
      
      // Click next page
      const nextButton = screen.getByRole('link', { name: /next/i });
      await user.click(nextButton);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-011')).toBeInTheDocument();
        expect(screen.queryByText('#SW-2024-001')).not.toBeInTheDocument();
      });
    });
  });

  describe('Order Actions', () => {
    it('should call onOrderSelect when view details is clicked', async () => {
      const user = userEvent.setup();
      const onOrderSelect = vi.fn();
      
      render(<OrderHistory {...defaultProps} onOrderSelect={onOrderSelect} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
      
      const viewButtons = screen.getAllByText('View Details');
      await user.click(viewButtons[0]);
      
      expect(onOrderSelect).toHaveBeenCalledWith('order-1');
    });

    it('should call onOpenChat when chat button is clicked for in-progress orders', async () => {
      const user = userEvent.setup();
      const onOpenChat = vi.fn();
      
      render(<OrderHistory {...defaultProps} onOpenChat={onOpenChat} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
      
      const chatButtons = screen.getAllByText('Chat');
      await user.click(chatButtons[0]);
      
      expect(onOpenChat).toHaveBeenCalledWith('order-1', 'tailor-123');
    });

    it('should not show chat button for completed orders', async () => {
      render(<OrderHistory {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-002')).toBeInTheDocument();
      });
      
      // The completed order should not have a chat button
      const orderCards = screen.getAllByText(/View Details/);
      expect(orderCards).toHaveLength(2); // Both orders should have view details
      
      const chatButtons = screen.getAllByText('Chat');
      expect(chatButtons).toHaveLength(1); // Only in-progress order should have chat
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no orders exist', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orders: [],
          total: 0
        })
      });

      render(<OrderHistory {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('No orders found')).toBeInTheDocument();
        expect(screen.getByText('You haven\'t placed any orders yet')).toBeInTheDocument();
      });
    });

    it('should show filtered empty state', async () => {
      const user = userEvent.setup();
      render(<OrderHistory {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
      
      // Search for non-existent order
      const searchInput = screen.getByPlaceholderText('Search orders, garments, or participants...');
      await user.type(searchInput, 'nonexistent');
      
      await waitFor(() => {
        expect(screen.getByText('No orders found')).toBeInTheDocument();
        expect(screen.getByText('Try adjusting your search or filters')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error state when API fails', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));
      
      render(<OrderHistory {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('API Error')).toBeInTheDocument();
      });
    });

    it('should show error state when API returns non-ok response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500
      });
      
      render(<OrderHistory {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load order history')).toBeInTheDocument();
      });
    });

    it('should retry loading when try again is clicked', async () => {
      const user = userEvent.setup();
      
      // First call fails
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            orders: mockOrders,
            total: mockOrders.length
          })
        });
      
      render(<OrderHistory {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
      
      const tryAgainButton = screen.getByText('Try Again');
      await user.click(tryAgainButton);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
    });
  });

  describe('Results Summary', () => {
    it('should show correct results summary', async () => {
      render(<OrderHistory {...defaultProps} pageSize={10} />);
      
      await waitFor(() => {
        expect(screen.getByText('Showing 2 of 2 orders')).toBeInTheDocument();
      });
    });

    it('should show filtered results summary', async () => {
      const user = userEvent.setup();
      render(<OrderHistory {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('#SW-2024-001')).toBeInTheDocument();
      });
      
      const searchInput = screen.getByPlaceholderText('Search orders, garments, or participants...');
      await user.type(searchInput, 'SW-2024-001');
      
      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 1 orders for "SW-2024-001"')).toBeInTheDocument();
      });
    });
  });
});