'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TailorSearchItem, CustomerFavorite } from '@sew4mi/shared';

interface UseFavoritesResult {
  favorites: CustomerFavorite[];
  favoriteIds: Set<string>;
  isLoading: boolean;
  error: string | null;
  toggleFavorite: (tailor: TailorSearchItem) => Promise<void>;
  removeFavorite: (tailorId: string) => Promise<void>;
  isFavorite: (tailorId: string) => boolean;
  refetch: () => void;
}

export function useFavorites(): UseFavoritesResult {
  const [favorites, setFavorites] = useState<CustomerFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState<Set<string>>(new Set());

  // Create a Set of favorite tailor IDs for quick lookup
  const favoriteIds = useMemo(() => {
    return new Set(favorites.map(fav => fav.tailorId));
  }, [favorites]);

  // Fetch user's favorites
  const fetchFavorites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/tailors/favorites');
      
      if (!response.ok) {
        if (response.status === 401) {
          // User not logged in - this is expected behavior
          setFavorites([]);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setFavorites(data.favorites || []);
    } catch (err) {
      console.error('Failed to fetch favorites:', err);
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load favorites on mount
  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  // Add a tailor to favorites
  const addToFavorites = useCallback(async (tailor: TailorSearchItem): Promise<void> => {
    try {
      const response = await fetch('/api/tailors/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tailorId: tailor.id,
          notes: `Added ${tailor.businessName} to favorites`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Add to local state optimistically
      const newFavorite: CustomerFavorite = {
        id: data.favorite.id,
        customerId: data.favorite.customerId,
        tailorId: tailor.id,
        notes: data.favorite.notes,
        createdAt: new Date().toISOString(),
        tailor: tailor,
      };

      setFavorites(prev => [...prev, newFavorite]);
    } catch (err) {
      console.error('Failed to add to favorites:', err);
      throw err;
    }
  }, []);

  // Remove a tailor from favorites
  const removeFromFavorites = useCallback(async (tailorId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/tailors/favorites/${tailorId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Remove from local state
      setFavorites(prev => prev.filter(fav => fav.tailorId !== tailorId));
    } catch (err) {
      console.error('Failed to remove from favorites:', err);
      throw err;
    }
  }, []);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (tailor: TailorSearchItem): Promise<void> => {
    if (isToggling.has(tailor.id)) {
      return; // Already toggling this tailor
    }

    try {
      setIsToggling(prev => new Set([...prev, tailor.id]));

      const isFavorited = favoriteIds.has(tailor.id);
      
      if (isFavorited) {
        await removeFromFavorites(tailor.id);
      } else {
        await addToFavorites(tailor);
      }
    } catch (err) {
      // Re-throw for component to handle
      throw err;
    } finally {
      setIsToggling(prev => {
        const newSet = new Set(prev);
        newSet.delete(tailor.id);
        return newSet;
      });
    }
  }, [favoriteIds, addToFavorites, removeFromFavorites, isToggling]);

  // Remove favorite by ID
  const removeFavorite = useCallback(async (tailorId: string): Promise<void> => {
    await removeFromFavorites(tailorId);
  }, [removeFromFavorites]);

  // Check if a tailor is favorited
  const isFavorite = useCallback((tailorId: string): boolean => {
    return favoriteIds.has(tailorId);
  }, [favoriteIds]);

  // Refetch favorites
  const refetch = useCallback(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return {
    favorites,
    favoriteIds,
    isLoading,
    error,
    toggleFavorite,
    removeFavorite,
    isFavorite,
    refetch,
  };
}