/**
 * GroupOrderMessaging Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GroupOrderMessaging } from '@/components/features/tailors/GroupOrderMessaging';

const mockParticipants = [
  {
    id: 'user-1',
    name: 'John Organizer',
    phone: '+233241234567',
    role: 'organizer' as const
  },
  {
    id: 'user-2',
    name: 'Jane Participant',
    phone: '+233241234568',
    role: 'participant' as const
  }
];

describe('GroupOrderMessaging', () => {
  it('renders with participants', () => {
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
      />
    );
    
    expect(screen.getByText('Group Order Messaging')).toBeInTheDocument();
    expect(screen.getByText('2 participants')).toBeInTheDocument();
  });

  it('shows broadcast and individual tabs', () => {
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
      />
    );
    
    expect(screen.getByRole('tab', { name: /Broadcast Message/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Individual Message/i })).toBeInTheDocument();
  });

  it('shows participant count in broadcast mode', () => {
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
      />
    );
    
    expect(screen.getByText(/message will be sent to all 2 participants/i)).toBeInTheDocument();
  });

  it('shows recipient selector in individual mode', () => {
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
      />
    );
    
    const individualTab = screen.getByRole('tab', { name: /Individual Message/i });
    fireEvent.click(individualTab);
    
    expect(screen.getByLabelText(/Select Recipient/i)).toBeInTheDocument();
  });

  it('displays message templates', () => {
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
      />
    );
    
    expect(screen.getByText('Quick Templates')).toBeInTheDocument();
    expect(screen.getByText('Fabric Confirmation')).toBeInTheDocument();
    expect(screen.getByText('Progress Update')).toBeInTheDocument();
  });

  it('populates message content when template is selected', () => {
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
      />
    );
    
    const fabricTemplate = screen.getByRole('button', { name: /Fabric Confirmation/i });
    fireEvent.click(fabricTemplate);
    
    const textarea = screen.getByPlaceholderText(/Type your message here/i);
    expect((textarea as HTMLTextAreaElement).value).toContain('fabric');
  });

  it('allows switching between WhatsApp and SMS', () => {
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
      />
    );
    
    const whatsappButton = screen.getByRole('button', { name: /WhatsApp/i });
    const smsButton = screen.getByRole('button', { name: /SMS/i });
    
    expect(whatsappButton).toBeInTheDocument();
    expect(smsButton).toBeInTheDocument();
  });

  it('shows character count for message', () => {
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
      />
    );
    
    const textarea = screen.getByPlaceholderText(/Type your message here/i);
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    
    expect(screen.getByText(/5 characters/i)).toBeInTheDocument();
  });

  it('warns about SMS message count for long messages', () => {
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
      />
    );
    
    // Switch to SMS
    const smsButton = screen.getByRole('button', { name: /SMS/i });
    fireEvent.click(smsButton);
    
    // Type long message (>160 characters)
    const textarea = screen.getByPlaceholderText(/Type your message here/i);
    const longMessage = 'A'.repeat(200);
    fireEvent.change(textarea, { target: { value: longMessage } });
    
    expect(screen.getByText(/2 SMS messages/i)).toBeInTheDocument();
  });

  it('disables send button when message is empty', () => {
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
        onSendMessage={vi.fn()}
      />
    );
    
    const sendButton = screen.getByRole('button', { name: /Send via/i });
    expect(sendButton).toBeDisabled();
  });

  it('requires recipient selection for individual messages', () => {
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
        onSendMessage={vi.fn()}
      />
    );
    
    // Switch to individual tab
    const individualTab = screen.getByRole('tab', { name: /Individual Message/i });
    fireEvent.click(individualTab);
    
    // Add message
    const textarea = screen.getByPlaceholderText(/Type your message here/i);
    fireEvent.change(textarea, { target: { value: 'Hello' } });
    
    // Should be disabled without recipient
    const sendButton = screen.getByRole('button', { name: /Send via/i });
    expect(sendButton).toBeDisabled();
  });

  it('calls onSendMessage with correct data for broadcast', async () => {
    const onSendMessage = vi.fn().mockResolvedValue(undefined);
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
        onSendMessage={onSendMessage}
      />
    );
    
    // Type message
    const textarea = screen.getByPlaceholderText(/Type your message here/i);
    fireEvent.change(textarea, { target: { value: 'Hello everyone' } });
    
    // Send
    const sendButton = screen.getByRole('button', { name: /Send via WhatsApp/i });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(onSendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          groupOrderId: 'group-1',
          recipientType: 'broadcast',
          content: 'Hello everyone',
          channel: 'whatsapp'
        })
      );
    });
  });

  it('shows message history when provided', () => {
    const messages = [
      {
        id: 'msg-1',
        senderId: 'tailor-1',
        senderName: 'Tailor Name',
        recipientType: 'broadcast' as const,
        content: 'Test message',
        timestamp: new Date(),
        delivered: true,
        read: false,
        channel: 'whatsapp' as const
      }
    ];
    
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
        messages={messages}
      />
    );
    
    expect(screen.getByText('Message History')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('shows empty state when no messages', () => {
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
        messages={[]}
      />
    );
    
    expect(screen.getByText('No messages yet')).toBeInTheDocument();
  });

  it('displays message delivery status', () => {
    const messages = [
      {
        id: 'msg-1',
        senderId: 'tailor-1',
        senderName: 'Tailor Name',
        recipientType: 'broadcast' as const,
        content: 'Test message',
        timestamp: new Date(),
        delivered: true,
        read: true,
        channel: 'whatsapp' as const
      }
    ];
    
    render(
      <GroupOrderMessaging
        groupOrderId="group-1"
        participants={mockParticipants}
        messages={messages}
      />
    );
    
    expect(screen.getByText('Read')).toBeInTheDocument();
  });
});

