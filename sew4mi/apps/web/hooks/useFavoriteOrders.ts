/**
 * Hook for Story 4.3: Favorite Orders Management
 */

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { FavoriteOrder, FavoritesListResponse, AddToFavoritesRequest } from '@sew4mi/shared/types';

export function useFavoriteOrders() {
  const queryClient = useQueryClient();

  // Fetch user's favorite orders
  const {
    data: favorites,
    isLoading,
    error,
    refetch,
  } = useQuery<FavoritesListResponse>({
    queryKey: ['favorite-orders'],
    queryFn: async () => {
      const response = await fetch('/api/favorites');
      if (!response.ok) {
        throw new Error('Failed to fetch favorites');
      }
      return response.json();
    },
  });

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    mutationFn: async (request: AddToFavoritesRequest) => {
      const response = await fetch('/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add to favorites');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-orders'] });
    },
  });

  // Update nickname mutation
  const updateNicknameMutation = useMutation({
    mutationFn: async ({ favoriteId, nickname }: { favoriteId: string; nickname: string }) => {
      const response = await fetch(`/api/favorites/${favoriteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update nickname');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-orders'] });
    },
  });

  // Share favorite mutation
  const shareFavoriteMutation = useMutation({
    mutationFn: async ({ favoriteId, profileIds }: { favoriteId: string; profileIds: string[] }) => {
      const response = await fetch(`/api/favorites/${favoriteId}/share`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to share favorite');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-orders'] });
    },
  });

  // Remove favorite mutation
  const removeFavoriteMutation = useMutation({
    mutationFn: async (favoriteId: string) => {
      const response = await fetch(`/api/favorites/${favoriteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove favorite');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite-orders'] });
    },
  });

  // Helper functions
  const addToFavorites = useCallback(
    async (orderId: string, nickname: string) => {
      return addToFavoritesMutation.mutateAsync({ orderId, nickname });
    },
    [addToFavoritesMutation]
  );

  const updateNickname = useCallback(
    async (favoriteId: string, nickname: string) => {
      return updateNicknameMutation.mutateAsync({ favoriteId, nickname });
    },
    [updateNicknameMutation]
  );

  const shareFavorite = useCallback(
    async (favoriteId: string, profileIds: string[]) => {
      return shareFavoriteMutation.mutateAsync({ favoriteId, profileIds });
    },
    [shareFavoriteMutation]
  );

  const removeFavorite = useCallback(
    async (favoriteId: string) => {
      return removeFavoriteMutation.mutateAsync(favoriteId);
    },
    [removeFavoriteMutation]
  );

  return {
    favorites: favorites?.favorites || [],
    orders: favorites?.orders || {},
    isLoading,
    error,
    refetch,
    addToFavorites,
    updateNickname,
    shareFavorite,
    removeFavorite,
    isAdding: addToFavoritesMutation.isPending,
    isUpdating: updateNicknameMutation.isPending,
    isSharing: shareFavoriteMutation.isPending,
    isRemoving: removeFavoriteMutation.isPending,
  };
}
