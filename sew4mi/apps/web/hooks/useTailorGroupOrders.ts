/**
 * useTailorGroupOrders Hook
 * Manages tailor group order data fetching and mutations
 */

import { useState, useEffect, useCallback } from 'react';
import { EnhancedGroupOrder } from '@sew4mi/shared/types/group-order';

export interface UseTailorGroupOrdersOptions {
  autoFetch?: boolean;
  status?: string;
  eventType?: string;
}

export function useTailorGroupOrders(options: UseTailorGroupOrdersOptions = {}) {
  const { autoFetch = true, status, eventType } = options;

  const [groupOrders, setGroupOrders] = useState<EnhancedGroupOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch group orders from API
   */
  const fetchGroupOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build query params
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (eventType) params.append('eventType', eventType);

      const response = await fetch(`/api/tailors/group-orders?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch group orders');
      }

      const data = await response.json();
      setGroupOrders(data.groupOrders || []);
      
      return data.groupOrders;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [status, eventType]);

  /**
   * Fetch single group order details
   */
  const fetchGroupOrder = useCallback(async (groupOrderId: string) => {
    try {
      const response = await fetch(`/api/tailors/group-orders/${groupOrderId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch group order');
      }

      const data = await response.json();
      return data.groupOrder;
    } catch (err) {
      throw err as Error;
    }
  }, []);

  /**
   * Refresh data
   */
  const refresh = useCallback(() => {
    return fetchGroupOrders();
  }, [fetchGroupOrders]);

  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch) {
      fetchGroupOrders();
    }
  }, [autoFetch, fetchGroupOrders]);

  return {
    groupOrders,
    isLoading,
    error,
    fetchGroupOrders,
    fetchGroupOrder,
    refresh
  };
}

