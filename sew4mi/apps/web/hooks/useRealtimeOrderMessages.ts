/**
 * useRealtimeOrderMessages Hook
 * Provides real-time chat messages for orders using Supabase subscriptions
 * Story 3.4: Real-time order messaging between customer and tailor
 */

import { useEffect, useState, useCallback } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { OrderMessage } from '@sew4mi/shared/types/order-creation';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UseRealtimeOrderMessagesOptions {
  orderId: string;
  userId: string;
  onNewMessage?: (message: OrderMessage) => void;
  onMessageRead?: (messageId: string, userId: string) => void;
  onTypingIndicator?: (userId: string, isTyping: boolean) => void;
  enabled?: boolean;
}

export interface UseRealtimeOrderMessagesReturn {
  isConnected: boolean;
  error: Error | null;
  sendTypingIndicator: (isTyping: boolean) => void;
}

/**
 * Hook to subscribe to real-time order messages
 * @param options - Configuration options for the subscription
 * @returns Connection status, error state, and helper functions
 * 
 * @example
 * ```tsx
 * const { isConnected, sendTypingIndicator } = useRealtimeOrderMessages({
 *   orderId: '123',
 *   userId: 'user-id',
 *   onNewMessage: (msg) => setMessages(prev => [...prev, msg]),
 *   onMessageRead: (msgId) => markAsRead(msgId)
 * });
 * ```
 */
export function useRealtimeOrderMessages({
  orderId,
  userId,
  onNewMessage,
  onMessageRead,
  onTypingIndicator,
  enabled = true
}: UseRealtimeOrderMessagesOptions): UseRealtimeOrderMessagesReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  /**
   * Send typing indicator to other participants
   */
  const sendTypingIndicator = useCallback((isTyping: boolean) => {
    if (channel && isConnected) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId,
          isTyping,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [channel, isConnected, userId]);

  useEffect(() => {
    if (!enabled || !orderId || !userId) {
      return;
    }

    const supabase = createClientSupabaseClient();
    let messageChannel: RealtimeChannel;

    const setupSubscriptions = async () => {
      try {
        // Create a channel for this order's messages
        messageChannel = supabase.channel(`order_messages:${orderId}`);
        setChannel(messageChannel);

        messageChannel
          // Subscribe to new messages
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'order_messages',
              filter: `order_id=eq.${orderId}`
            },
            (payload) => {
              console.log('New message received:', payload);
              
              if (payload.new && onNewMessage) {
                const newMessage = payload.new as any;
                
                // Transform to OrderMessage type
                const message: OrderMessage = {
                  id: newMessage.id,
                  orderId: newMessage.order_id,
                  senderId: newMessage.sender_id,
                  senderType: newMessage.sender_type,
                  senderName: newMessage.sender_name,
                  message: newMessage.message,
                  messageType: newMessage.message_type,
                  mediaUrl: newMessage.media_url,
                  isInternal: newMessage.is_internal,
                  readBy: newMessage.read_by || [],
                  sentAt: new Date(newMessage.sent_at),
                  readAt: newMessage.read_at ? new Date(newMessage.read_at) : undefined,
                  deliveredAt: newMessage.delivered_at ? new Date(newMessage.delivered_at) : undefined
                };

                onNewMessage(message);
              }
            }
          )
          // Subscribe to message read updates
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'order_messages',
              filter: `order_id=eq.${orderId}`
            },
            (payload) => {
              console.log('Message updated:', payload);
              
              if (payload.new && onMessageRead) {
                const updatedMessage = payload.new as any;
                const oldMessage = payload.old as any;
                
                // Check if read_by array changed
                if (JSON.stringify(updatedMessage.read_by) !== JSON.stringify(oldMessage.read_by)) {
                  const newReaders = (updatedMessage.read_by || []).filter(
                    (id: string) => !(oldMessage.read_by || []).includes(id)
                  );
                  
                  newReaders.forEach((readerId: string) => {
                    onMessageRead(updatedMessage.id, readerId);
                  });
                }
              }
            }
          )
          // Subscribe to typing indicators (broadcast events)
          .on(
            'broadcast',
            { event: 'typing' },
            (payload) => {
              console.log('Typing indicator received:', payload);
              
              if (onTypingIndicator && payload.payload) {
                const { userId: typingUserId, isTyping } = payload.payload;
                
                // Don't show typing indicator for current user
                if (typingUserId !== userId) {
                  onTypingIndicator(typingUserId, isTyping);
                }
              }
            }
          )
          .subscribe((status) => {
            console.log('Realtime messages subscription status:', status);
            
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              setError(null);
            } else if (status === 'CLOSED') {
              setIsConnected(false);
            } else if (status === 'CHANNEL_ERROR') {
              setError(new Error('Failed to connect to real-time chat'));
              setIsConnected(false);
            }
          });

      } catch (err) {
        console.error('Error setting up real-time message subscriptions:', err);
        setError(err as Error);
        setIsConnected(false);
      }
    };

    setupSubscriptions();

    // Cleanup on unmount
    return () => {
      if (messageChannel) {
        console.log('Cleaning up real-time message subscription');
        supabase.removeChannel(messageChannel);
        setChannel(null);
        setIsConnected(false);
      }
    };
  }, [orderId, userId, enabled, onNewMessage, onMessageRead, onTypingIndicator]);

  return {
    isConnected,
    error,
    sendTypingIndicator
  };
}

