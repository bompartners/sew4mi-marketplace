/**
 * useFabricAllocation Hook
 * Manages fabric allocation calculations and updates
 */

import { useState, useCallback } from 'react';
import { FabricQuantityCalculation } from '@sew4mi/shared/types/group-order';

export function useFabricAllocation(groupOrderId: string) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch fabric allocation
   */
  const fetchAllocation = useCallback(async () => {
    try {
      const response = await fetch(`/api/tailors/group-orders/${groupOrderId}/fabric-allocation`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch fabric allocation');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      throw err as Error;
    }
  }, [groupOrderId]);

  /**
   * Save fabric allocation
   */
  const saveAllocation = useCallback(async (calculation: FabricQuantityCalculation) => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/tailors/group-orders/${groupOrderId}/fabric-allocation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(calculation)
      });

      if (!response.ok) {
        throw new Error('Failed to save fabric allocation');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [groupOrderId]);

  return {
    isSaving,
    error,
    fetchAllocation,
    saveAllocation
  };
}

