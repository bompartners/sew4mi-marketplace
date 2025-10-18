/**
 * OrderChat component for customer-tailor communication
 * Features real-time messaging, typing indicators, and message status
 * @file OrderChat.tsx
 */

'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { MessageSquare, Phone, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { OrderMessage, OrderParticipantRole, OrderMessageType } from '@sew4mi/shared/types/order-creation';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { sanitizeMessage } from '@/lib/utils/sanitize';
import { useRealtimeOrderMessages } from '@/hooks/useRealtimeOrderMessages';

/**
 * Props for OrderChat component
 */
interface OrderChatProps {
  /** Order ID */
  orderId: string;
  /** Current user ID */
  userId: string;
  /** Current user role */
  userRole: OrderParticipantRole;
  /** Tailor information */
  tailor?: {
    id: string;
    name: string;
    avatar?: string;
    phoneNumber?: string;
    isOnline?: boolean;
  };
  /** Chat configuration */
  config?: {
    allowVoiceMessages?: boolean;
    allowFileAttachments?: boolean;
    maxMessageLength?: number;
    enableTypingIndicators?: boolean;
  };
  /** Event handlers */
  onMessageSent?: (message: OrderMessage) => void;
  onWhatsAppRedirect?: () => void;
  onCallTailor?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Whether chat is collapsed */
  isCollapsed?: boolean;
  /** Collapse handler */
  onToggleCollapse?: () => void;
}

/**
 * Chat header component
 */
interface ChatHeaderProps {
  tailor?: OrderChatProps['tailor'];
  onWhatsAppRedirect?: () => void;
  onCallTailor?: () => void;
  onToggleCollapse?: () => void;
  isCollapsed?: boolean;
}

function ChatHeader({ tailor, onWhatsAppRedirect, onCallTailor, onToggleCollapse, isCollapsed }: ChatHeaderProps) {
  const handleWhatsApp = useCallback(() => {
    if (tailor?.phoneNumber) {
      const message = encodeURIComponent('Hello, I\'d like to discuss my order with you.');
      const whatsappUrl = `https://wa.me/${tailor.phoneNumber.replace(/\+/g, '')}?text=${message}`;
      window.open(whatsappUrl, '_blank');
      onWhatsAppRedirect?.();
    }
  }, [tailor?.phoneNumber, onWhatsAppRedirect]);

  const handleCall = useCallback(() => {
    if (tailor?.phoneNumber) {
      window.open(`tel:${tailor.phoneNumber}`, '_self');
      onCallTailor?.();
    }
  }, [tailor?.phoneNumber, onCallTailor]);

  return (
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={tailor?.avatar} alt={tailor?.name || 'Tailor'} />
            <AvatarFallback>
              {tailor?.name ? tailor.name.substring(0, 2).toUpperCase() : 'T'}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">
              {tailor?.name || 'Your Tailor'}
            </CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <div className={cn(
                'w-2 h-2 rounded-full',
                tailor?.isOnline ? 'bg-green-500' : 'bg-gray-300'
              )} />
              <span className="text-xs text-gray-600">
                {tailor?.isOnline ? 'Online now' : 'Last seen recently'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {tailor?.phoneNumber && (
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCall}
                className="h-8 w-8 p-0"
                title="Call tailor"
              >
                <Phone className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                onClick={handleWhatsApp}
                className="h-8 w-8 p-0 text-green-600"
                title="Continue on WhatsApp"
              >
                <MessageSquare className="h-4 w-4" />
              </Button>
            </>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleCollapse}
            className="h-8 w-8 p-0"
            title={isCollapsed ? 'Expand chat' : 'Collapse chat'}
          >
            {isCollapsed ? <MessageSquare className="h-4 w-4" /> : <X className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}

/**
 * OrderChat Component
 * Provides real-time messaging interface for order communication
 */
export function OrderChat({
  orderId,
  userId,
  userRole,
  tailor,
  config = {
    allowVoiceMessages: true,
    allowFileAttachments: true,
    maxMessageLength: 1000,
    enableTypingIndicators: true
  },
  onMessageSent,
  onWhatsAppRedirect,
  onCallTailor,
  className,
  isCollapsed = false,
  onToggleCollapse
}: OrderChatProps) {
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Memoize callbacks to prevent infinite loops
  const handleNewMessage = useCallback((message: any) => {
    console.log('New message received via Realtime:', message);
    
    // Transform snake_case to camelCase for frontend
    const transformedMessage: OrderMessage = {
      id: message.id,
      orderId: message.order_id || message.orderId,
      senderId: message.sender_id || message.senderId,
      senderType: message.sender_type || message.senderType,
      senderName: message.sender_name || message.senderName,
      message: message.message,
      messageType: message.message_type || message.messageType,
      mediaUrl: message.media_url || message.mediaUrl,
      isInternal: message.is_internal || message.isInternal,
      sentAt: message.sent_at || message.sentAt,
      readBy: message.read_by || message.readBy,
      readAt: message.read_at || message.readAt,
      metadata: message.metadata
    };
    
    setMessages(prev => [...prev, transformedMessage]);
    if (transformedMessage.senderId !== userId) {
      setUnreadCount(prev => prev + 1);
    }
  }, [userId]);

  const handleMessageRead = useCallback((messageId: string, readerId: string) => {
    console.log('Message read:', messageId, 'by:', readerId);
    setMessages(prev => prev.map(msg =>
      msg.id === messageId
        ? { ...msg, readBy: [...(msg.readBy || []), readerId] }
        : msg
    ));
  }, []);

  // Use Supabase Realtime for chat messages instead of WebSocket
  const { isConnected, sendTypingIndicator } = useRealtimeOrderMessages({
    orderId,
    userId,
    onNewMessage: handleNewMessage,
    onMessageRead: handleMessageRead,
    enabled: true
  });

  /**
   * Mark messages as read
   */
  const markMessagesAsRead = useCallback(async () => {
    try {
      await fetch(`/api/orders/${orderId}/messages/mark-read`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [orderId, userId]);

  /**
   * Load initial messages
   */
  const loadMessages = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/orders/${orderId}/messages`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Order not found');
        } else if (response.status === 401) {
          throw new Error('Please log in to view messages');
        } else if (response.status === 403) {
          throw new Error('You do not have access to this order');
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
      
      // Mark messages as read (don't add to dependencies to avoid loops)
      const hasUnread = data.messages?.some((msg: OrderMessage) => !msg.readBy?.includes(userId));
      if (hasUnread) {
        // Call mark as read without creating dependency
        fetch(`/api/orders/${orderId}/messages/mark-read`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        }).then(() => setUnreadCount(0))
          .catch(err => console.error('Failed to mark messages as read:', err));
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      const errorMessage = error instanceof Error 
        ? `Failed to load chat messages: ${error.message}`
        : 'Failed to load chat messages';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [orderId, userId]);

  /**
   * Send message
   */
  const handleSendMessage = useCallback(async (content: string, type: OrderMessageType = OrderMessageType.TEXT) => {
    if (!content.trim() || !isConnected) return;

    try {
      // For media messages (images, voice), don't sanitize URLs
      const isMediaMessage = type === OrderMessageType.IMAGE || type === OrderMessageType.VOICE;
      const sanitizedContent = isMediaMessage ? content.trim() : sanitizeMessage(content.trim());

      if (!sanitizedContent) {
        setError('Message content is invalid');
        return;
      }

      // For media messages, put URL in mediaUrl field and use a descriptive message
      const message: any = {
        orderId,
        senderId: userId,
        senderType: userRole,
        senderName: 'User', // You might want to pass this as a prop
        message: isMediaMessage ? (type === OrderMessageType.IMAGE ? 'Image' : 'Voice message') : sanitizedContent,
        messageType: type,
        isInternal: false,
        readBy: [userId]
      };

      // Add mediaUrl for media messages
      if (isMediaMessage) {
        message.mediaUrl = sanitizedContent;
      }

      // Send via API for persistence (Realtime will handle updates)
      const response = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to send messages');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to send messages');
        } else {
          throw new Error(`Failed to send message: ${response.status}`);
        }
      }

      const data = await response.json();
      const savedMessage = data.message;
      onMessageSent?.(savedMessage);

    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = error instanceof Error 
        ? error.message
        : 'Failed to send message. Please try again.';
      setError(errorMessage);
    }
  }, [orderId, userId, userRole, isConnected, onMessageSent]);

  // Initialize chat
  useEffect(() => {
    loadMessages();
    // Real-time updates are now handled by useRealtimeOrderMessages hook
  }, [loadMessages]);

  // Mark messages as read when chat becomes visible
  useEffect(() => {
    if (!isCollapsed && unreadCount > 0) {
      markMessagesAsRead();
    }
  }, [isCollapsed, unreadCount, markMessagesAsRead]);

  if (isCollapsed) {
    return (
      <Card className={cn('w-80 h-12', className)}>
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Chat with Tailor</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 text-xs">
                {unreadCount}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={onToggleCollapse}
            className="h-6 w-6 p-0"
          >
            <MessageSquare className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full max-w-2xl h-[600px] flex flex-col', className)}>
      <ChatHeader
        tailor={tailor}
        onWhatsAppRedirect={onWhatsAppRedirect}
        onCallTailor={onCallTailor}
        onToggleCollapse={onToggleCollapse}
        isCollapsed={isCollapsed}
      />

      <Separator />

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {error && (
          <Alert className="m-3 mb-0">
            <AlertDescription className="text-sm">{error}</AlertDescription>
          </Alert>
        )}

        <MessageList
          messages={useMemo(() => messages, [messages.length, messages[messages.length - 1]?.id])}
          currentUserId={userId}
          isLoading={isLoading}
          isConnected={isConnected}
          className="flex-1"
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          isConnected={isConnected}
          maxLength={config.maxMessageLength}
          allowAttachments={config.allowFileAttachments}
          allowVoiceMessages={config.allowVoiceMessages}
          enableTypingIndicators={config.enableTypingIndicators}
          orderId={orderId}
          userId={userId}
          className="border-t"
        />
      </CardContent>
    </Card>
  );
}

export default OrderChat;