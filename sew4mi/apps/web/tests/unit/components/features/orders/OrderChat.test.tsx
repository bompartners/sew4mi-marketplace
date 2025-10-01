/**
 * Unit tests for OrderChat component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OrderChat } from '@/components/features/orders/OrderChat';
import { OrderParticipantRole, OrderMessageType } from '@sew4mi/shared/types/order-creation';

// Mock WebSocket constants
const WEBSOCKET_OPEN = 1;

// Mock WebSocket
const mockWebSocket = {
  send: vi.fn(),
  close: vi.fn(),
  readyState: WEBSOCKET_OPEN,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};

// Mock fetch
global.fetch = vi.fn();

// Mock WebSocket constructor
Object.defineProperty(global, 'WebSocket', {
  value: vi.fn(() => mockWebSocket),
  writable: true
});

// Mock WebSocket constants
Object.defineProperty(global.WebSocket, 'OPEN', { value: WEBSOCKET_OPEN });

// Mock scroll area
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...props }: any) => (
    <div data-testid="scroll-area" {...props}>
      {children}
    </div>
  )
}));

describe('OrderChat', () => {
  const defaultProps = {
    orderId: 'order-123',
    userId: 'user-123',
    userRole: OrderParticipantRole.CUSTOMER,
    tailor: {
      id: 'tailor-123',
      name: 'John Doe',
      phoneNumber: '+233241234567',
      isOnline: true
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful fetch responses
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        messages: [
          {
            id: 'msg-1',
            orderId: 'order-123',
            senderId: 'tailor-123',
            senderRole: OrderParticipantRole.TAILOR,
            content: 'Hello! I\'ve started working on your dress.',
            type: OrderMessageType.TEXT,
            timestamp: new Date('2024-01-15T10:30:00Z'),
            readBy: ['tailor-123']
          }
        ]
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render chat header with tailor info', async () => {
      render(<OrderChat {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('Online now')).toBeInTheDocument();
      });
    });

    it('should show collapsed state when isCollapsed is true', () => {
      render(<OrderChat {...defaultProps} isCollapsed={true} />);
      
      expect(screen.getByText('Chat with Tailor')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      render(<OrderChat {...defaultProps} />);
      
      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });

    it('should load and display messages', async () => {
      render(<OrderChat {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Hello! I\'ve started working on your dress.')).toBeInTheDocument();
      });
      
      expect(global.fetch).toHaveBeenCalledWith('/api/orders/order-123/messages');
    });
  });

  describe('Message Loading', () => {
    it('should handle loading error gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      
      render(<OrderChat {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Failed to load chat messages')).toBeInTheDocument();
      });
    });

    it('should mark messages as read when chat loads', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            messages: [{
              id: 'msg-1',
              orderId: 'order-123',
              senderId: 'tailor-123',
              content: 'Test message',
              readBy: ['tailor-123'] // Not read by current user
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({})
        });
      
      render(<OrderChat {...defaultProps} />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/orders/order-123/messages/mark-read',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });
  });

  describe('WebSocket Connection', () => {
    it('should establish WebSocket connection', async () => {
      render(<OrderChat {...defaultProps} />);
      
      await waitFor(() => {
        expect(WebSocket).toHaveBeenCalledWith(
          expect.stringContaining('/orders/order-123/chat?userId=user-123')
        );
      });
    });

    it('should handle WebSocket message events', async () => {
      render(<OrderChat {...defaultProps} />);
      
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
            type: 'message',
            message: {
              id: 'msg-2',
              content: 'New message',
              senderId: 'tailor-123',
              timestamp: new Date()
            }
          })
        });
      }
      
      await waitFor(() => {
        expect(screen.getByText('New message')).toBeInTheDocument();
      });
    });
  });

  describe('Message Sending', () => {
    it('should send text message', async () => {
      const user = userEvent.setup();
      render(<OrderChat {...defaultProps} />);
      
      // Wait for component to load
      await waitFor(() => {
        expect(screen.queryByText('Loading messages...')).not.toBeInTheDocument();
      });
      
      const input = screen.getByPlaceholderText('Type your message...');
      const sendButton = screen.getByRole('button', { name: /send/i });
      
      await user.type(input, 'Hello tailor!');
      await user.click(sendButton);
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('Hello tailor!')
      );
    });

    it('should handle send message API call', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg-2', content: 'Hello tailor!' })
      });
      
      render(<OrderChat {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading messages...')).not.toBeInTheDocument();
      });
      
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Hello tailor!');
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/orders/order-123/messages',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('Hello tailor!')
          })
        );
      });
    });

    it('should call onMessageSent callback', async () => {
      const user = userEvent.setup();
      const onMessageSent = vi.fn();
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg-2', content: 'Test message' })
      });
      
      render(<OrderChat {...defaultProps} onMessageSent={onMessageSent} />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading messages...')).not.toBeInTheDocument();
      });
      
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'Test message');
      fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
      
      await waitFor(() => {
        expect(onMessageSent).toHaveBeenCalledWith({
          id: 'msg-2',
          content: 'Test message'
        });
      });
    });
  });

  describe('External Actions', () => {
    it('should handle WhatsApp redirect', async () => {
      const user = userEvent.setup();
      const onWhatsAppRedirect = vi.fn();
      const mockOpen = vi.fn();
      Object.defineProperty(window, 'open', { value: mockOpen });
      
      render(<OrderChat {...defaultProps} onWhatsAppRedirect={onWhatsAppRedirect} />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const whatsappButton = screen.getByTitle('Continue on WhatsApp');
      await user.click(whatsappButton);
      
      expect(mockOpen).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/233241234567'),
        '_blank'
      );
      expect(onWhatsAppRedirect).toHaveBeenCalled();
    });

    it('should handle call tailor', async () => {
      const user = userEvent.setup();
      const onCallTailor = vi.fn();
      const mockOpen = vi.fn();
      Object.defineProperty(window, 'open', { value: mockOpen });
      
      render(<OrderChat {...defaultProps} onCallTailor={onCallTailor} />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const callButton = screen.getByTitle('Call tailor');
      await user.click(callButton);
      
      expect(mockOpen).toHaveBeenCalledWith('tel:+233241234567', '_self');
      expect(onCallTailor).toHaveBeenCalled();
    });

    it('should handle collapse toggle', async () => {
      const user = userEvent.setup();
      const onToggleCollapse = vi.fn();
      
      render(<OrderChat {...defaultProps} onToggleCollapse={onToggleCollapse} />);
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });
      
      const collapseButton = screen.getByTitle('Collapse chat');
      await user.click(collapseButton);
      
      expect(onToggleCollapse).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should display connection error', async () => {
      render(<OrderChat {...defaultProps} />);
      
      await waitFor(() => {
        expect(WebSocket).toHaveBeenCalled();
      });
      
      // Simulate WebSocket error
      const onError = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )?.[1];
      
      if (onError) {
        onError(new Error('Connection failed'));
      }
      
      await waitFor(() => {
        expect(screen.getByText('Connection error occurred')).toBeInTheDocument();
      });
    });

    it('should show disconnected state', async () => {
      render(<OrderChat {...defaultProps} />);
      
      await waitFor(() => {
        expect(WebSocket).toHaveBeenCalled();
      });
      
      // Simulate WebSocket close
      const onClose = mockWebSocket.addEventListener.mock.calls.find(
        call => call[0] === 'close'
      )?.[1];
      
      if (onClose) {
        onClose();
      }
      
      await waitFor(() => {
        expect(screen.getByText(/reconnecting/i)).toBeInTheDocument();
      });
    });
  });

  describe('Configuration', () => {
    it('should respect max message length', async () => {
      const user = userEvent.setup();
      
      render(<OrderChat 
        {...defaultProps} 
        config={{ maxMessageLength: 10 }} 
      />);
      
      await waitFor(() => {
        expect(screen.queryByText('Loading messages...')).not.toBeInTheDocument();
      });
      
      const input = screen.getByPlaceholderText('Type your message...');
      await user.type(input, 'This is a very long message that exceeds the limit');
      
      expect(input.value).toHaveLength(10);
    });

    it('should disable features based on config', () => {
      render(<OrderChat 
        {...defaultProps} 
        config={{ 
          allowFileAttachments: false,
          allowVoiceMessages: false 
        }} 
      />);
      
      expect(screen.queryByTitle('Attach file')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Record voice message')).not.toBeInTheDocument();
    });
  });
});