'use client';

import { useState, useEffect, useCallback } from 'react';
import { AutocompleteResult } from '@sew4mi/shared';

interface UseAutocompleteResult {
  suggestions: AutocompleteResult;
  isLoading: boolean;
  error: string | null;
}

// In-memory cache for autocomplete results
const cache = new Map<string, { data: AutocompleteResult; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useAutocomplete(query: string, limit?: number): UseAutocompleteResult {
  const [suggestions, setSuggestions] = useState<AutocompleteResult>({
    suggestions: [],
    categories: { tailors: [], specializations: [], locations: [] },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = useCallback(async (searchQuery: string, searchLimit?: number) => {
    if (!searchQuery || searchQuery.length < 2) {
      setSuggestions({
        suggestions: [],
        categories: { tailors: [], specializations: [], locations: [] },
      });
      return;
    }

    // Check cache
    const cacheKey = `${searchQuery}_${searchLimit || 10}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      setSuggestions(cached.data);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        query: searchQuery,
      });

      if (searchLimit) {
        params.append('limit', searchLimit.toString());
      }

      const response = await fetch(`/api/tailors/autocomplete?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result: AutocompleteResult = await response.json();

      // Cache the result
      cache.set(cacheKey, {
        data: result,
        expires: Date.now() + CACHE_TTL,
      });

      // Clean up old cache entries
      for (const [key, value] of cache.entries()) {
        if (value.expires <= Date.now()) {
          cache.delete(key);
        }
      }

      setSuggestions(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch suggestions';
      setError(errorMessage);
      console.error('Autocomplete error:', err);
      
      // Set empty results on error
      setSuggestions({
        suggestions: [],
        categories: { tailors: [], specializations: [], locations: [] },
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchSuggestions(query, limit);
    }, 150); // Debounce

    return () => clearTimeout(timeoutId);
  }, [query, limit, fetchSuggestions]);

  return {
    suggestions,
    isLoading,
    error,
  };
}