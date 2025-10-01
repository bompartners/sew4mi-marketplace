/**
 * Optimistic UI Update Utilities
 * Provides utilities for optimistic updates with automatic rollback on failure
 */

import { useState, useCallback } from 'react';

export interface OptimisticUpdate<T> {
  data: T;
  isPending: boolean;
  error: Error | null;
}

export interface OptimisticUpdateOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error, rollbackData: T) => void;
  rollbackDelay?: number; // Delay before auto-rollback in ms
}

/**
 * Hook for managing optimistic updates
 */
export function useOptimisticUpdate<T>(
  initialData: T,
  updateFn: (data: T) => Promise<T>,
  options: OptimisticUpdateOptions<T> = {}
) {
  const [data, setData] = useState<T>(initialData);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [previousData, setPreviousData] = useState<T>(initialData);

  const { onSuccess, onError, rollbackDelay = 5000 } = options;

  const update = useCallback(
    async (optimisticData: T) => {
      // Store current data for potential rollback
      setPreviousData(data);
      
      // Optimistically update UI
      setData(optimisticData);
      setIsPending(true);
      setError(null);

      try {
        // Perform actual update
        const result = await updateFn(optimisticData);
        
        // Update with server response
        setData(result);
        setIsPending(false);
        
        onSuccess?.(result);
        
        return result;
      } catch (err) {
        const error = err as Error;
        setError(error);
        
        // Rollback to previous data
        setTimeout(() => {
          setData(previousData);
          setIsPending(false);
        }, rollbackDelay);
        
        onError?.(error, previousData);
        
        throw error;
      }
    },
    [data, previousData, updateFn, onSuccess, onError, rollbackDelay]
  );

  const reset = useCallback(() => {
    setData(initialData);
    setError(null);
    setIsPending(false);
  }, [initialData]);

  return {
    data,
    isPending,
    error,
    update,
    reset,
    rollback: () => setData(previousData)
  };
}

/**
 * Queue for managing multiple optimistic updates
 */
export class OptimisticUpdateQueue<T> {
  private queue: Array<{
    id: string;
    optimisticData: T;
    actualData?: T;
    updateFn: () => Promise<T>;
    status: 'pending' | 'success' | 'failed';
  }> = [];

  /**
   * Add update to queue
   */
  add(id: string, optimisticData: T, updateFn: () => Promise<T>): void {
    this.queue.push({
      id,
      optimisticData,
      updateFn,
      status: 'pending'
    });
  }

  /**
   * Process all pending updates
   */
  async processAll(): Promise<void> {
    const pending = this.queue.filter(item => item.status === 'pending');
    
    await Promise.allSettled(
      pending.map(async item => {
        try {
          const result = await item.updateFn();
          item.actualData = result;
          item.status = 'success';
        } catch (error) {
          item.status = 'failed';
          throw error;
        }
      })
    );
  }

  /**
   * Get failed updates for retry
   */
  getFailedUpdates(): Array<{ id: string; data: T }> {
    return this.queue
      .filter(item => item.status === 'failed')
      .map(item => ({ id: item.id, data: item.optimisticData }));
  }

  /**
   * Retry failed updates
   */
  async retryFailed(): Promise<void> {
    const failed = this.queue.filter(item => item.status === 'failed');
    
    for (const item of failed) {
      try {
        const result = await item.updateFn();
        item.actualData = result;
        item.status = 'success';
      } catch (error) {
        console.error(`Failed to retry update ${item.id}:`, error);
      }
    }
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue = [];
  }
}

/**
 * Local storage helper for offline updates
 */
export class OfflineUpdateManager {
  private storageKey: string;

  constructor(key: string) {
    this.storageKey = `offline_updates_${key}`;
  }

  /**
   * Store update for later sync
   */
  storeUpdate(update: {
    id: string;
    type: string;
    data: any;
    timestamp: number;
  }): void {
    const updates = this.getStoredUpdates();
    updates.push(update);
    
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(updates));
    } catch (error) {
      console.error('Failed to store offline update:', error);
    }
  }

  /**
   * Get all stored updates
   */
  getStoredUpdates(): Array<{
    id: string;
    type: string;
    data: any;
    timestamp: number;
  }> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve offline updates:', error);
      return [];
    }
  }

  /**
   * Sync stored updates with server
   */
  async syncUpdates(syncFn: (update: any) => Promise<void>): Promise<void> {
    const updates = this.getStoredUpdates();
    
    if (updates.length === 0) return;

    const results = await Promise.allSettled(
      updates.map(update => syncFn(update))
    );

    // Remove successfully synced updates
    const failedUpdates = updates.filter((_, index) => 
      results[index].status === 'rejected'
    );

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(failedUpdates));
    } catch (error) {
      console.error('Failed to update offline updates:', error);
    }
  }

  /**
   * Clear all stored updates
   */
  clear(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('Failed to clear offline updates:', error);
    }
  }

  /**
   * Get count of pending updates
   */
  getPendingCount(): number {
    return this.getStoredUpdates().length;
  }
}

/**
 * Network status hook
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

