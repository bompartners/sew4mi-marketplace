/**
 * OrderChat component for customer-tailor communication
 * Features real-time messaging, typing indicators, and message status
 * @file OrderChat.tsx
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  /**
   * Load initial messages
   */
  const loadMessages = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch(`/api/orders/${orderId}/messages`);
      
      if (!response.ok) {
        throw new Error('Failed to load messages');
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
      
      // Mark messages as read
      if (data.messages?.some((msg: OrderMessage) => !msg.readBy?.includes(userId))) {
        await markMessagesAsRead();
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      setError('Failed to load chat messages');
    } finally {
      setIsLoading(false);
    }
  }, [orderId, userId]);

  /**
   * Mark messages as read
   */
  const markMessagesAsRead = useCallback(async () => {
    try {
      await fetch(`/api/orders/${orderId}/messages/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  }, [orderId, userId]);

  /**
   * Connect to WebSocket for real-time messaging
   */
  const connectWebSocket = useCallback(() => {
    try {
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'}/orders/${orderId}/chat?userId=${userId}`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttempts.current = 0;
        console.log('Connected to chat WebSocket');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'message':
              setMessages(prev => [...prev, data.message]);
              if (data.message.senderId !== userId) {
                setUnreadCount(prev => prev + 1);
              }
              break;
            case 'typing':
              // Handle typing indicators in MessageList component
              break;
            case 'message_read':
              setMessages(prev => prev.map(msg => 
                msg.id === data.messageId 
                  ? { ...msg, readBy: [...(msg.readBy || []), data.userId] }
                  : msg
              ));
              break;
            default:
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < 5) {
          const delay = Math.pow(2, reconnectAttempts.current) * 1000;
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connectWebSocket();
          }, delay);
        } else {
          setError('Connection lost. Please refresh to reconnect.');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setError('Connection error occurred');
      };

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setError('Failed to connect to chat');
    }
  }, [orderId, userId]);

  /**
   * Send message
   */
  const handleSendMessage = useCallback(async (content: string, type: OrderMessageType = OrderMessageType.TEXT) => {
    if (!content.trim() || !isConnected) return;

    try {
      // Sanitize message content to prevent XSS attacks
      const sanitizedContent = sanitizeMessage(content.trim());

      if (!sanitizedContent) {
        setError('Message content is invalid');
        return;
      }

      const message: Partial<OrderMessage> = {
        orderId,
        senderId: userId,
        senderType: userRole,
        senderName: 'User', // You might want to pass this as a prop
        message: sanitizedContent,
        messageType: type,
        isInternal: false,
        readBy: [userId]
      };

      // Send via WebSocket for real-time delivery
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'send_message',
          data: message
        }));
      }

      // Also send to API for persistence
      const response = await fetch(`/api/orders/${orderId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const savedMessage = await response.json();
      onMessageSent?.(savedMessage);

    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to send message. Please try again.');
    }
  }, [orderId, userId, userRole, isConnected, onMessageSent]);

  // Initialize chat
  useEffect(() => {
    loadMessages();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [loadMessages, connectWebSocket]);

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
    <Card className={cn('w-80 h-96 flex flex-col', className)}>
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
          messages={messages}
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