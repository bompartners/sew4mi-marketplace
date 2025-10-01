/**
 * useProductionSchedule Hook
 * Manages production schedule data and updates
 */

import { useState, useCallback } from 'react';
import { ProductionScheduleItem } from '@sew4mi/shared/types/group-order';

export function useProductionSchedule(groupOrderId: string) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch production schedule
   */
  const fetchSchedule = useCallback(async () => {
    try {
      const response = await fetch(`/api/tailors/group-orders/${groupOrderId}/production-schedule`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch production schedule');
      }

      const data = await response.json();
      return data.schedule;
    } catch (err) {
      throw err as Error;
    }
  }, [groupOrderId]);

  /**
   * Save production schedule
   */
  const saveSchedule = useCallback(async (items: ProductionScheduleItem[]) => {
    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/tailors/group-orders/${groupOrderId}/production-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ items })
      });

      if (!response.ok) {
        throw new Error('Failed to save production schedule');
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
    fetchSchedule,
    saveSchedule
  };
}

