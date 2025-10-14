'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  SavedSearch,
  SavedSearchInput,
  SavedSearchUpdate,
  SavedSearchMatch,
} from '@sew4mi/shared';

interface UseSavedSearchesResult {
  savedSearches: SavedSearch[];
  isLoading: boolean;
  error: string | null;
  createSavedSearch: (input: SavedSearchInput) => Promise<SavedSearch>;
  updateSavedSearch: (id: string, update: SavedSearchUpdate) => Promise<SavedSearch>;
  deleteSavedSearch: (id: string) => Promise<void>;
  checkMatches: (id: string, since?: Date) => Promise<SavedSearchMatch[]>;
  getSavedSearchById: (id: string) => SavedSearch | undefined;
  refetch: () => void;
}

export function useSavedSearches(): UseSavedSearchesResult {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's saved searches
  const fetchSavedSearches = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/search/saved');

      if (!response.ok) {
        if (response.status === 401) {
          // User not logged in - this is expected behavior
          setSavedSearches([]);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setSavedSearches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch saved searches:', err);
      setError(err instanceof Error ? err.message : 'Failed to load saved searches');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load saved searches on mount
  useEffect(() => {
    fetchSavedSearches();
  }, [fetchSavedSearches]);

  // Create a new saved search
  const createSavedSearch = useCallback(async (input: SavedSearchInput): Promise<SavedSearch> => {
    try {
      const response = await fetch('/api/search/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save search' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const savedSearch = await response.json();

      // Add to local state optimistically
      setSavedSearches(prev => [...prev, savedSearch]);

      return savedSearch;
    } catch (err) {
      console.error('Failed to create saved search:', err);
      throw err;
    }
  }, []);

  // Update an existing saved search
  const updateSavedSearch = useCallback(async (
    id: string,
    update: SavedSearchUpdate
  ): Promise<SavedSearch> => {
    try {
      const response = await fetch(`/api/search/saved/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(update),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update search' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const updatedSearch = await response.json();

      // Update local state
      setSavedSearches(prev =>
        prev.map(search => (search.id === id ? updatedSearch : search))
      );

      return updatedSearch;
    } catch (err) {
      console.error('Failed to update saved search:', err);
      throw err;
    }
  }, []);

  // Delete a saved search
  const deleteSavedSearch = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/search/saved/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Remove from local state
      setSavedSearches(prev => prev.filter(search => search.id !== id));
    } catch (err) {
      console.error('Failed to delete saved search:', err);
      throw err;
    }
  }, []);

  // Check for new matches for a saved search
  const checkMatches = useCallback(async (
    id: string,
    since?: Date
  ): Promise<SavedSearchMatch[]> => {
    try {
      const params = new URLSearchParams();
      if (since) {
        params.set('since', since.toISOString());
      }

      const response = await fetch(
        `/api/search/saved/${id}/check${params.toString() ? `?${params.toString()}` : ''}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data.matches || [];
    } catch (err) {
      console.error('Failed to check matches:', err);
      throw err;
    }
  }, []);

  // Get a saved search by ID
  const getSavedSearchById = useCallback((id: string): SavedSearch | undefined => {
    return savedSearches.find(search => search.id === id);
  }, [savedSearches]);

  // Refetch saved searches
  const refetch = useCallback(() => {
    fetchSavedSearches();
  }, [fetchSavedSearches]);

  return {
    savedSearches,
    isLoading,
    error,
    createSavedSearch,
    updateSavedSearch,
    deleteSavedSearch,
    checkMatches,
    getSavedSearchById,
    refetch,
  };
}
