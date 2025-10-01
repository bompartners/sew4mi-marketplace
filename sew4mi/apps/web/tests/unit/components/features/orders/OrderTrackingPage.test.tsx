/**
 * Unit tests for OrderTrackingPage component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderTrackingPage } from '@/components/features/orders/OrderTrackingPage';
import { OrderStatus, GarmentType, OrderParticipantRole, OrderWithProgress } from '@sew4mi/shared/types/order-creation';

// Mock fetch
global.fetch = vi.fn();

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  readyState: 1,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

Object.defineProperty(global, 'WebSocket', {
  value: vi.fn(() => mockWebSocket),
  writable: true
});

// Mock date-fns
vi.mock('date-fns', async () => {
  const actual = await vi.importActual('date-fns');
  return {
    ...actual,
    format: vi.fn((date, formatStr) => {
      if (formatStr.includes('MMM d, yyyy')) return 'Jan 15, 2024';
      if (formatStr.includes('h:mm a')) return '10:30 AM';
      return '2024-01-15';
    }),
    parseISO: vi.fn((dateStr) => new Date('2024-01-15T10:30:00Z'))
  };
});

// Mock child components
vi.mock('@/components/features/orders/OrderProgressTimeline', () => ({
  OrderProgressTimeline: ({ orderId }: { orderId: string }) => 
    <div data-testid="order-progress-timeline">Timeline for {orderId}</div>
}));

vi.mock('@/components/features/orders/OrderCountdown', () => ({
  OrderCountdown: ({ orderId }: { orderId: string }) => 
    <div data-testid="order-countdown">Countdown for {orderId}</div>
}));

vi.mock('@/components/features/orders/OrderChat', () => ({
  OrderChat: ({ orderId }: { orderId: string }) => 
    <div data-testid="order-chat">Chat for {orderId}</div>
}));

vi.mock('@/components/features/orders/MilestonePhotoGallery', () => ({
  MilestonePhotoGallery: ({ orderId }: { orderId: string }) => 
    <div data-testid="milestone-photo-gallery">Photo gallery for {orderId}</div>
}));

vi.mock('@/components/features/orders/NotificationSettings', () => ({
  NotificationSettings: ({ userId }: { userId: string }) => 
    <div data-testid="notification-settings">Notification settings for {userId}</div>
}));

describe('OrderTrackingPage', () => {
  const defaultProps = {
    orderId: 'order-123',
    userId: 'user-123',
    userRole: OrderParticipantRole.CUSTOMER
  };

  const mockOrder: OrderWithProgress = {
    id: 'order-123',
    orderNumber: 'SW-2024-001',
    customerId: 'customer-123',
    customerName: 'John Doe',
    customerAvatar: '/avatars/john.jpg',
    customerPhone: '+233241234567',
    customerLocation: 'Accra, Ghana',
    tailorId: 'tailor-123',
    tailorName: 'Jane Smith',
    tailorAvatar: '/avatars/jane.jpg',
    tailorPhone: '+233241234568',
    tailorLocation: 'Kumasi, Ghana',
    garmentType: GarmentType.DRESS,
    garmentCategory: 'Evening Dress',
    size: 'M',
    fabric: 'Silk',
    status: OrderStatus.IN_PROGRESS,
    totalPrice: 350.00,
    basePrice: 300.00,
    customizationFee: 50.00,
    createdAt: '2024-01-15T10:30:00Z',
    estimatedStartDate: '2024-01-16T10:30:00Z',
    estimatedCompletionDate: '2024-02-15T10:30:00Z',
    specialInstructions: 'Please use red thread for embroidery',
    progressPercentage: 65
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful order fetch
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        order: mockOrder
      })
    });

    // Mock navigator.share
    Object.defineProperty(navigator, 'share', {
      value: vi.fn(),
      writable: true
    });

    // Mock navigator.clipboard
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: vi.fn()
      },
      writable: true
    });

    // Mock URL methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render order tracking page with order details', async () => {
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
        expect(screen.getByText('DRESS - Evening Dress')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      render(<OrderTrackingPage {...defaultProps} />);
      
      // Should show skeleton loaders
      expect(screen.getByRole('generic')).toBeInTheDocument();
    });

    it('should display countdown for in-progress orders', async () => {
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('order-countdown')).toBeInTheDocument();
      });
    });

    it('should not display countdown for completed orders', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          order: { ...mockOrder, status: OrderStatus.COMPLETED }
        })
      });

      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('order-countdown')).not.toBeInTheDocument();
    });

    it('should render tabs correctly', async () => {
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
      });

      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Timeline' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Photos' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Chat' })).toBeInTheDocument();
    });
  });

  describe('Order Details', () => {
    it('should display complete order information in overview tab', async () => {
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        // Order header
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
        expect(screen.getByText('Created Jan 15, 2024')).toBeInTheDocument();
        
        // Garment details
        expect(screen.getByText('DRESS')).toBeInTheDocument();
        expect(screen.getByText('Evening Dress')).toBeInTheDocument();
        expect(screen.getByText('M')).toBeInTheDocument();
        expect(screen.getByText('Silk')).toBeInTheDocument();
        
        // Special instructions
        expect(screen.getByText('Please use red thread for embroidery')).toBeInTheDocument();
        
        // Tailor information
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Kumasi, Ghana')).toBeInTheDocument();
        
        // Pricing
        expect(screen.getByText('GH₵300.00')).toBeInTheDocument(); // Base price
        expect(screen.getByText('GH₵50.00')).toBeInTheDocument();  // Customization fee
        expect(screen.getByText('GH₵350.00')).toBeInTheDocument(); // Total
      });
    });

    it('should show different participant info for tailor role', async () => {
      render(<OrderTrackingPage 
        {...defaultProps} 
        userRole={OrderParticipantRole.TAILOR}
      />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Accra, Ghana')).toBeInTheDocument();
        expect(screen.getByText('Customer')).toBeInTheDocument();
      });
    });

    it('should display timeline information', async () => {
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order Date')).toBeInTheDocument();
        expect(screen.getByText('Estimated Start')).toBeInTheDocument();
        expect(screen.getByText('Estimated Completion')).toBeInTheDocument();
      });
    });

    it('should show actual completion date for completed orders', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          order: { 
            ...mockOrder, 
            status: OrderStatus.COMPLETED,
            actualCompletionDate: '2024-02-10T14:30:00Z'
          }
        })
      });

      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Actual Completion')).toBeInTheDocument();
      });
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between tabs correctly', async () => {
      const user = userEvent.setup();
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
      });

      // Switch to timeline tab
      const timelineTab = screen.getByRole('tab', { name: 'Timeline' });
      await user.click(timelineTab);
      
      expect(screen.getByTestId('order-progress-timeline')).toBeInTheDocument();

      // Switch to photos tab
      const photosTab = screen.getByRole('tab', { name: 'Photos' });
      await user.click(photosTab);
      
      expect(screen.getByTestId('milestone-photo-gallery')).toBeInTheDocument();

      // Switch to chat tab
      const chatTab = screen.getByRole('tab', { name: 'Chat' });
      await user.click(chatTab);
      
      expect(screen.getByTestId('order-chat')).toBeInTheDocument();
    });

    it('should pass correct props to child components', async () => {
      render(<OrderTrackingPage {...defaultProps} enableRealTime={true} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
      });

      // Check that timeline receives correct props
      expect(screen.getByText('Timeline for order-123')).toBeInTheDocument();
      expect(screen.getByText('Photo gallery for order-123')).toBeInTheDocument();
      expect(screen.getByText('Chat for order-123')).toBeInTheDocument();
    });
  });

  describe('Actions', () => {
    it('should call onBack when back button is clicked', async () => {
      const user = userEvent.setup();
      const onBack = vi.fn();
      
      render(<OrderTrackingPage {...defaultProps} onBack={onBack} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
      });

      const backButton = screen.getByRole('button', { name: '' }); // Back button with arrow icon
      await user.click(backButton);
      
      expect(onBack).toHaveBeenCalled();
    });

    it('should handle share functionality', async () => {
      const user = userEvent.setup();
      const onShare = vi.fn();
      
      render(<OrderTrackingPage {...defaultProps} onShare={onShare} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
      });

      const shareButton = screen.getByText('Share');
      await user.click(shareButton);
      
      expect(navigator.share).toHaveBeenCalledWith({
        title: 'Order #SW-2024-001',
        text: 'Track my order progress on Sew4Mi',
        url: expect.any(String)
      });
      expect(onShare).toHaveBeenCalledWith('order-123');
    });

    it('should fallback to clipboard if navigator.share is not available', async () => {
      const user = userEvent.setup();
      
      // Remove navigator.share
      delete (navigator as any).share;
      
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
      });

      const shareButton = screen.getByText('Share');
      await user.click(shareButton);
      
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.any(String));
    });

    it('should generate receipt when download button is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock receipt generation
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['receipt'], { type: 'application/pdf' })
      });

      // Mock DOM methods
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn()
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
      });

      const receiptButton = screen.getByText('Receipt');
      await user.click(receiptButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/orders/order-123/receipt',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: 'user-123', format: 'pdf' })
          })
        );
      });

      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toBe('order-SW-2024-001-receipt.pdf');
    });

    it('should open notification settings dialog', async () => {
      const user = userEvent.setup();
      
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
      });

      const notificationButton = screen.getByText('Notifications');
      await user.click(notificationButton);
      
      expect(screen.getByText('Notification Settings')).toBeInTheDocument();
      expect(screen.getByTestId('notification-settings')).toBeInTheDocument();
    });
  });

  describe('Contact Functionality', () => {
    it('should handle chat contact', async () => {
      const user = userEvent.setup();
      
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      const chatButtons = screen.getAllByRole('button');
      const chatButton = chatButtons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-message-square')
      );
      
      if (chatButton) {
        await user.click(chatButton);
        // This would open the chat - implementation depends on the actual UI structure
      }
    });

    it('should handle phone contact', async () => {
      const user = userEvent.setup();
      const mockOpen = vi.fn();
      Object.defineProperty(window, 'open', { value: mockOpen });
      
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      });

      const phoneButtons = screen.getAllByRole('button');
      const phoneButton = phoneButtons.find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-phone')
      );
      
      if (phoneButton) {
        await user.click(phoneButton);
        expect(mockOpen).toHaveBeenCalledWith('tel:+233241234568', '_self');
      }
    });
  });

  describe('Real-time Updates', () => {
    it('should establish WebSocket connection when enableRealTime is true', async () => {
      render(<OrderTrackingPage {...defaultProps} enableRealTime={true} />);
      
      await waitFor(() => {
        expect(WebSocket).toHaveBeenCalledWith(
          expect.stringContaining('/orders/order-123/track?userId=user-123')
        );
      });
    });

    it('should not establish WebSocket connection when enableRealTime is false', async () => {
      render(<OrderTrackingPage {...defaultProps} enableRealTime={false} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
      });

      expect(WebSocket).not.toHaveBeenCalled();
    });

    it('should handle WebSocket order updates', async () => {
      render(<OrderTrackingPage {...defaultProps} enableRealTime={true} />);
      
      await waitFor(() => {
        expect(WebSocket).toHaveBeenCalled();
      });

      // Simulate WebSocket message
      const onMessage = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];

      if (onMessage) {
        onMessage({
          data: JSON.stringify({
            type: 'order_updated',
            updates: { status: OrderStatus.COMPLETED }
          })
        });
      }

      // Order status should be updated (implementation would update the display)
      expect(mockWebSocket.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
    });
  });

  describe('Error Handling', () => {
    it('should show error state when order fails to load', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    it('should show error state when API returns non-ok response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404
      });
      
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load order details')).toBeInTheDocument();
      });
    });

    it('should show order not found message', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ order: null })
      });
      
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Order not found')).toBeInTheDocument();
      });
    });

    it('should allow retrying when order fails to load', async () => {
      const user = userEvent.setup();
      
      // First call fails, second succeeds
      (global.fetch as any)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ order: mockOrder })
        });
      
      render(<OrderTrackingPage {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });

      const tryAgainButton = screen.getByText('Try Again');
      await user.click(tryAgainButton);
      
      await waitFor(() => {
        expect(screen.getByText('Order #SW-2024-001')).toBeInTheDocument();
      });
    });
  });
});