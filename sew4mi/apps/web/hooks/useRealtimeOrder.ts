/**
 * useRealtimeOrder Hook
 * Provides real-time updates for individual orders using Supabase subscriptions
 * Story 2.3 & 3.4: Real-time order tracking with milestone updates
 */

import { useEffect, useState } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { OrderWithProgress } from '@sew4mi/shared/types/order-creation';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UseRealtimeOrderOptions {
  orderId: string;
  onOrderUpdate?: (order: Partial<OrderWithProgress>) => void;
  onMilestoneUpdate?: (milestoneId: string) => void;
  onStatusChange?: (newStatus: string) => void;
  enabled?: boolean;
}

export interface UseRealtimeOrderReturn {
  isConnected: boolean;
  error: Error | null;
}

/**
 * Hook to subscribe to real-time order updates
 * @param options - Configuration options for the subscription
 * @returns Connection status and error state
 * 
 * @example
 * ```tsx
 * const { isConnected } = useRealtimeOrder({
 *   orderId: '123',
 *   onOrderUpdate: (order) => setOrder(prev => ({ ...prev, ...order })),
 *   onStatusChange: (status) => console.log('New status:', status)
 * });
 * ```
 */
export function useRealtimeOrder({
  orderId,
  onOrderUpdate,
  onMilestoneUpdate,
  onStatusChange,
  enabled = true
}: UseRealtimeOrderOptions): UseRealtimeOrderReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !orderId) {
      return;
    }

    const supabase = createClientSupabaseClient();
    let channel: RealtimeChannel;

    const setupSubscriptions = async () => {
      try {
        // Create a channel for this order
        channel = supabase.channel(`order:${orderId}`);

        // Subscribe to order updates
        channel
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'orders',
              filter: `id=eq.${orderId}`
            },
            (payload) => {
              console.log('Order updated:', payload);
              
              if (payload.new) {
                const updatedOrder = payload.new as any;
                
                // Trigger status change callback if status changed
                if (onStatusChange && payload.old && 
                    (payload.old as any).status !== updatedOrder.status) {
                  onStatusChange(updatedOrder.status);
                }

                // Trigger general update callback
                if (onOrderUpdate) {
                  onOrderUpdate({
                    status: updatedOrder.status,
                    currentStatus: updatedOrder.status,
                    estimatedCompletionDate: updatedOrder.delivery_date,
                    actualCompletionDate: updatedOrder.completed_at,
                    // Add other fields as needed
                  });
                }
              }
            }
          )
          // Subscribe to milestone updates
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'order_milestones',
              filter: `order_id=eq.${orderId}`
            },
            (payload) => {
              console.log('Order milestone updated:', payload);
              
              if (onMilestoneUpdate && payload.new) {
                onMilestoneUpdate((payload.new as any).id);
              }

              // Trigger order update to refresh milestone data
              if (onOrderUpdate) {
                // Signal that milestones have changed
                onOrderUpdate({});
              }
            }
          )
          .subscribe((status) => {
            console.log('Realtime subscription status:', status);
            
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              setError(null);
            } else if (status === 'CLOSED') {
              setIsConnected(false);
            } else if (status === 'CHANNEL_ERROR') {
              setError(new Error('Failed to connect to real-time updates'));
              setIsConnected(false);
            }
          });

      } catch (err) {
        console.error('Error setting up real-time subscriptions:', err);
        setError(err as Error);
        setIsConnected(false);
      }
    };

    setupSubscriptions();

    // Cleanup on unmount
    return () => {
      if (channel) {
        console.log('Cleaning up real-time order subscription');
        supabase.removeChannel(channel);
        setIsConnected(false);
      }
    };
  }, [orderId, enabled, onOrderUpdate, onMilestoneUpdate, onStatusChange]);

  return {
    isConnected,
    error
  };
}

