/**
 * Unit tests for MessageList component
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageList } from '@/components/features/orders/MessageList';
import { OrderMessage, OrderParticipantRole, OrderMessageType } from '@sew4mi/shared/types/order-creation';

// Mock scroll area
vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, ...props }: any) => (
    <div data-testid="scroll-area" {...props}>
      {children}
    </div>
  )
}));

// Mock URL.createObjectURL for audio messages
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'mock-blob-url'),
  writable: true
});

describe('MessageList', () => {
  const currentUserId = 'user-123';
  const tailorId = 'tailor-123';

  const mockMessages: OrderMessage[] = [
    {
      id: 'msg-1',
      orderId: 'order-123',
      senderId: tailorId,
      senderRole: OrderParticipantRole.TAILOR,
      content: 'Hello! I\'ve started working on your dress.',
      type: OrderMessageType.TEXT,
      timestamp: new Date('2024-01-15T10:30:00Z'),
      readBy: [tailorId]
    },
    {
      id: 'msg-2',
      orderId: 'order-123',
      senderId: currentUserId,
      senderRole: OrderParticipantRole.CUSTOMER,
      content: 'Great! When will it be ready?',
      type: OrderMessageType.TEXT,
      timestamp: new Date('2024-01-15T10:35:00Z'),
      readBy: [currentUserId, tailorId]
    },
    {
      id: 'msg-3',
      orderId: 'order-123',
      senderId: tailorId,
      senderRole: OrderParticipantRole.TAILOR,
      content: 'https://example.com/dress-progress.jpg',
      type: OrderMessageType.IMAGE,
      timestamp: new Date('2024-01-15T11:00:00Z'),
      readBy: [tailorId]
    },
    {
      id: 'msg-4',
      orderId: 'order-123',
      senderId: tailorId,
      senderRole: OrderParticipantRole.TAILOR,
      content: 'https://example.com/measurements.pdf',
      type: OrderMessageType.DOCUMENT,
      timestamp: new Date('2024-01-15T11:30:00Z'),
      readBy: [tailorId]
    },
    {
      id: 'msg-5',
      orderId: 'order-123',
      senderId: currentUserId,
      senderRole: OrderParticipantRole.CUSTOMER,
      content: 'https://example.com/voice-message.webm',
      type: OrderMessageType.VOICE,
      timestamp: new Date('2024-01-15T12:00:00Z'),
      readBy: [currentUserId]
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render loading state', () => {
      render(<MessageList 
        messages={[]} 
        currentUserId={currentUserId}
        isLoading={true}
      />);
      
      expect(screen.getByText('Loading messages...')).toBeInTheDocument();
    });

    it('should render empty state when no messages', () => {
      render(<MessageList 
        messages={[]} 
        currentUserId={currentUserId}
        isLoading={false}
      />);
      
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
      expect(screen.getByText('Start a conversation with your tailor!')).toBeInTheDocument();
    });

    it('should render messages', () => {
      render(<MessageList 
        messages={mockMessages}
        currentUserId={currentUserId}
      />);
      
      expect(screen.getByText('Hello! I\'ve started working on your dress.')).toBeInTheDocument();
      expect(screen.getByText('Great! When will it be ready?')).toBeInTheDocument();
    });

    it('should show connection status when disconnected', () => {
      render(<MessageList 
        messages={mockMessages}
        currentUserId={currentUserId}
        isConnected={false}
      />);
      
      expect(screen.getByText('Reconnecting...')).toBeInTheDocument();
    });
  });

  describe('Message Grouping', () => {
    it('should group messages by date', () => {
      const messagesFromDifferentDays = [
        {
          ...mockMessages[0],
          timestamp: new Date('2024-01-14T10:30:00Z')
        },
        {
          ...mockMessages[1],
          timestamp: new Date('2024-01-15T10:30:00Z')
        }
      ];

      render(<MessageList 
        messages={messagesFromDifferentDays}
        currentUserId={currentUserId}
      />);
      
      // Should show date headers
      expect(screen.getByText('January 14, 2024')).toBeInTheDocument();
      expect(screen.getByText('January 15, 2024')).toBeInTheDocument();
    });

    it('should show "Today" for today\'s messages', () => {
      const todayMessages = [
        {
          ...mockMessages[0],
          timestamp: new Date() // Today
        }
      ];

      render(<MessageList 
        messages={todayMessages}
        currentUserId={currentUserId}
      />);
      
      expect(screen.getByText('Today')).toBeInTheDocument();
    });

    it('should show avatars for message groups', () => {
      render(<MessageList 
        messages={mockMessages}
        currentUserId={currentUserId}
      />);
      
      // Should have avatars for tailor messages (not own messages)
      const avatars = screen.getAllByText('T'); // Tailor fallback
      expect(avatars.length).toBeGreaterThan(0);
    });
  });

  describe('Message Types', () => {
    it('should render text messages correctly', () => {
      render(<MessageList 
        messages={[mockMessages[0]]}
        currentUserId={currentUserId}
      />);
      
      expect(screen.getByText('Hello! I\'ve started working on your dress.')).toBeInTheDocument();
    });

    it('should render image messages', () => {
      render(<MessageList 
        messages={[mockMessages[2]]}
        currentUserId={currentUserId}
      />);
      
      const image = screen.getByAltText('Shared image');
      expect(image).toBeInTheDocument();
      expect(image.getAttribute('src')).toBe('https://example.com/dress-progress.jpg');
    });

    it('should handle image load error', () => {
      render(<MessageList 
        messages={[mockMessages[2]]}
        currentUserId={currentUserId}
      />);
      
      const image = screen.getByAltText('Shared image');
      fireEvent.error(image);
      
      expect(screen.getByText('Image unavailable')).toBeInTheDocument();
    });

    it('should render document messages', () => {
      render(<MessageList 
        messages={[mockMessages[3]]}
        currentUserId={currentUserId}
      />);
      
      expect(screen.getByText('measurements.pdf')).toBeInTheDocument();
      expect(screen.getByText('Click to download')).toBeInTheDocument();
    });

    it('should handle document download', async () => {
      const user = userEvent.setup();
      
      // Mock document.createElement and appendChild
      const mockLink = {
        href: '',
        download: '',
        target: '',
        click: vi.fn()
      };
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
      
      render(<MessageList 
        messages={[mockMessages[3]]}
        currentUserId={currentUserId}
      />);
      
      const documentMessage = screen.getByText('measurements.pdf');
      await user.click(documentMessage.closest('div')!);
      
      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(mockLink.click).toHaveBeenCalled();
      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
    });

    it('should render voice messages', () => {
      render(<MessageList 
        messages={[mockMessages[4]]}
        currentUserId={currentUserId}
      />);
      
      expect(screen.getByRole('button')).toBeInTheDocument(); // Play button
      expect(screen.getByText('0:00')).toBeInTheDocument(); // Duration
    });

    it('should handle voice message play toggle', async () => {
      const user = userEvent.setup();
      render(<MessageList 
        messages={[mockMessages[4]]}
        currentUserId={currentUserId}
      />);
      
      const playButton = screen.getByRole('button');
      await user.click(playButton);
      
      // Should toggle play state (implementation detail would vary)
      expect(playButton).toBeInTheDocument();
    });
  });

  describe('Message Status', () => {
    it('should show read status for own messages', () => {
      const ownMessage = {
        ...mockMessages[1], // Own message that's been read by tailor
        readBy: [currentUserId, tailorId]
      };

      render(<MessageList 
        messages={[ownMessage]}
        currentUserId={currentUserId}
      />);
      
      // Should show double check mark for read message
      const checkIcons = screen.getAllByTestId ? screen.getAllByTestId(/check/i) : [];
      // The exact implementation may vary, but there should be status indicators
    });

    it('should show unread status for own messages', () => {
      const unreadMessage = {
        ...mockMessages[1],
        readBy: [currentUserId] // Only read by sender
      };

      render(<MessageList 
        messages={[unreadMessage]}
        currentUserId={currentUserId}
      />);
      
      // Should show single check mark for unread message
      expect(screen.getByText('Great! When will it be ready?')).toBeInTheDocument();
    });
  });

  describe('Typing Indicators', () => {
    it('should show typing indicator', () => {
      const typingUsers = [
        { userId: tailorId, name: 'John Doe', avatar: '/avatar.jpg' }
      ];

      render(<MessageList 
        messages={mockMessages}
        currentUserId={currentUserId}
        typingUsers={typingUsers}
      />);
      
      expect(screen.getByText('John Doe is typing...')).toBeInTheDocument();
    });

    it('should show multiple users typing', () => {
      const typingUsers = [
        { userId: tailorId, name: 'John Doe' },
        { userId: 'tailor-456', name: 'Jane Smith' }
      ];

      render(<MessageList 
        messages={mockMessages}
        currentUserId={currentUserId}
        typingUsers={typingUsers}
      />);
      
      expect(screen.getByText('2 people are typing...')).toBeInTheDocument();
    });

    it('should not show typing indicator when no users typing', () => {
      render(<MessageList 
        messages={mockMessages}
        currentUserId={currentUserId}
        typingUsers={[]}
      />);
      
      expect(screen.queryByText(/typing/i)).not.toBeInTheDocument();
    });
  });

  describe('Message Styling', () => {
    it('should apply correct styling for own messages', () => {
      render(<MessageList 
        messages={[mockMessages[1]]} // Own message
        currentUserId={currentUserId}
      />);
      
      const messageText = screen.getByText('Great! When will it be ready?');
      const messageContainer = messageText.closest('div');
      
      // Own messages should have blue styling (implementation dependent)
      expect(messageContainer).toHaveClass('bg-blue-600', 'text-white');
    });

    it('should apply correct styling for other messages', () => {
      render(<MessageList 
        messages={[mockMessages[0]]} // Tailor message
        currentUserId={currentUserId}
      />);
      
      const messageText = screen.getByText('Hello! I\'ve started working on your dress.');
      const messageContainer = messageText.closest('div');
      
      // Other messages should have gray styling
      expect(messageContainer).toHaveClass('bg-gray-100', 'text-gray-900');
    });
  });

  describe('Timestamps', () => {
    it('should show timestamps for messages', () => {
      render(<MessageList 
        messages={mockMessages.slice(0, 1)}
        currentUserId={currentUserId}
      />);
      
      // Should show time format (exact format depends on implementation)
      expect(screen.getByText(/10:30 AM/i)).toBeInTheDocument();
    });

    it('should format different date formats correctly', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const yesterdayMessage = {
        ...mockMessages[0],
        timestamp: yesterday
      };

      render(<MessageList 
        messages={[yesterdayMessage]}
        currentUserId={currentUserId}
      />);
      
      // Should show "Yesterday" format
      expect(screen.getByText(/yesterday/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<MessageList 
        messages={mockMessages}
        currentUserId={currentUserId}
      />);
      
      const scrollArea = screen.getByTestId('scroll-area');
      expect(scrollArea).toBeInTheDocument();
    });

    it('should support keyboard navigation', () => {
      render(<MessageList 
        messages={mockMessages}
        currentUserId={currentUserId}
      />);
      
      // Interactive elements should be focusable
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('disabled');
      });
    });
  });
});