/**
 * useRealtimeGroupOrder Hook
 * Provides real-time updates for group orders using Supabase subscriptions
 */

import { useEffect, useState } from 'react';
import { createClientSupabaseClient } from '@/lib/supabase/client';
import { EnhancedGroupOrder } from '@sew4mi/shared/types/group-order';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface UseRealtimeGroupOrderOptions {
  groupOrderId: string;
  onUpdate?: (groupOrder: EnhancedGroupOrder) => void;
  onItemUpdate?: (itemId: string) => void;
  onNewMessage?: (messageId: string) => void;
}

export function useRealtimeGroupOrder({
  groupOrderId,
  onUpdate,
  onItemUpdate,
  onNewMessage
}: UseRealtimeGroupOrderOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const supabase = createClientSupabaseClient();
    let channel: RealtimeChannel;

    const setupSubscriptions = async () => {
      try {
        // Create a channel for this group order
        channel = supabase.channel(`group_order:${groupOrderId}`);

        // Subscribe to group order updates
        channel
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'group_orders',
              filter: `id=eq.${groupOrderId}`
            },
            (payload) => {
              console.log('Group order updated:', payload);
              if (onUpdate) {
                // Fetch full group order data
                fetchGroupOrder();
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'group_order_items',
              filter: `group_order_id=eq.${groupOrderId}`
            },
            (payload) => {
              console.log('Group order item updated:', payload);
              if (onItemUpdate && payload.new) {
                onItemUpdate((payload.new as any).id);
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'group_order_messages',
              filter: `group_order_id=eq.${groupOrderId}`
            },
            (payload) => {
              console.log('New message received:', payload);
              if (onNewMessage && payload.new) {
                onNewMessage((payload.new as any).id);
              }
            }
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
              setError(null);
            } else if (status === 'CLOSED') {
              setIsConnected(false);
            } else if (status === 'CHANNEL_ERROR') {
              setError(new Error('Subscription error'));
              setIsConnected(false);
            }
          });

        // Fetch initial data
        await fetchGroupOrder();
      } catch (err) {
        setError(err as Error);
      }
    };

    const fetchGroupOrder = async () => {
      if (!onUpdate) return;

      const { data, error } = await supabase
        .from('group_orders')
        .select(`
          *,
          group_order_items (*)
        `)
        .eq('id', groupOrderId)
        .single();

      if (error) {
        console.error('Error fetching group order:', error);
        return;
      }

      if (data) {
        // Transform to EnhancedGroupOrder format
        const items = data.group_order_items || [];
        const totalItems = items.length;
        const completedItems = items.filter((i: any) => i.status === 'COMPLETED').length;
        const inProgressItems = items.filter((i: any) =>
          ['IN_PROGRESS', 'AWAITING_FITTING', 'AWAITING_FINAL_PAYMENT'].includes(i.status)
        ).length;
        const pendingItems = items.filter((i: any) =>
          ['PENDING', 'AWAITING_DEPOSIT', 'DEPOSIT_RECEIVED'].includes(i.status)
        ).length;
        const readyForDelivery = items.filter((i: any) => i.status === 'READY_FOR_DELIVERY').length;

        const overallProgressPercentage = totalItems > 0
          ? items.reduce((sum: number, item: any) => sum + (item.progress_percentage || 0), 0) / totalItems
          : 0;

        const enhanced = {
          ...data,
          items,
          progressSummary: {
            totalItems,
            completedItems,
            inProgressItems,
            readyForDelivery,
            pendingItems,
            overallProgressPercentage,
            nextGroupMilestone: completedItems === totalItems ? 'All Complete' : 'In Progress'
          }
        };

        onUpdate(enhanced as EnhancedGroupOrder);
      }
    };

    setupSubscriptions();

    // Cleanup on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [groupOrderId, onUpdate, onItemUpdate, onNewMessage]);

  return {
    isConnected,
    error
  };
}

