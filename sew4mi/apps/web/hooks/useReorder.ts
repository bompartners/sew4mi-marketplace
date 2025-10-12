/**
 * Hook for Story 4.3: Reorder Management
 */

import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReorderRequest, ReorderPreview, ReorderModifications } from '@sew4mi/shared/types';

export function useReorder() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<ReorderPreview | null>(null);

  // Preview reorder mutation
  const previewMutation = useMutation({
    mutationFn: async ({ orderId, modifications }: { orderId: string; modifications?: ReorderModifications }) => {
      const response = await fetch(`/api/orders/${orderId}/reorder-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modifications }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to preview reorder');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setPreview(data);
    },
  });

  // Create reorder mutation
  const createReorderMutation = useMutation({
    mutationFn: async (request: ReorderRequest) => {
      const response = await fetch('/api/orders/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create reorder');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate orders query to show new order
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Clear preview
      setPreview(null);
    },
  });

  // Helper functions
  const previewReorder = useCallback(
    async (orderId: string, modifications?: ReorderModifications) => {
      return previewMutation.mutateAsync({ orderId, modifications });
    },
    [previewMutation]
  );

  const createReorder = useCallback(
    async (orderId: string, modifications?: ReorderModifications) => {
      return createReorderMutation.mutateAsync({ orderId, modifications });
    },
    [createReorderMutation]
  );

  const clearPreview = useCallback(() => {
    setPreview(null);
  }, []);

  return {
    // Preview data
    preview,
    clearPreview,

    // Actions
    previewReorder,
    createReorder,

    // Loading states
    isPreviewing: previewMutation.isPending,
    isCreating: createReorderMutation.isPending,
    isLoading: previewMutation.isPending || createReorderMutation.isPending,

    // Errors
    previewError: previewMutation.error,
    createError: createReorderMutation.error,
  };
}
