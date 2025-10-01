'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { TailorSearchFilters, TailorSearchResult } from '@sew4mi/shared';
import { useSearchAnalytics } from './useSearchAnalytics';
import { useSearchPerformance } from './useSearchPerformance';

interface UseTailorSearchResult {
  results: TailorSearchResult | null;
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function useTailorSearch(filters: TailorSearchFilters): UseTailorSearchResult {
  const [results, setResults] = useState<TailorSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Analytics and performance hooks
  const { trackSearch } = useSearchAnalytics();
  const { 
    startSearch, 
    endSearch, 
    endRender,
    getCachedResult, 
    setCachedResult,
    optimizeImageLoading 
  } = useSearchPerformance({
    logMetrics: process.env.NODE_ENV === 'development',
  });

  // Generate cache key from filters
  const cacheKey = useMemo(() => {
    const { cursor, ...filterWithoutCursor } = filters;
    return JSON.stringify(filterWithoutCursor);
  }, [filters]);

  // Search function
  const search = useCallback(async (searchFilters: TailorSearchFilters, isLoadMore = false) => {
    try {
      // Start performance tracking
      startSearch();
      
      if (!isLoadMore) {
        setIsLoading(true);
        
        // Check cache for non-paginated requests
        const cached = getCachedResult(searchFilters);
        if (cached) {
          setResults(cached);
          endSearch();
          endRender();
          return;
        }
      } else {
        setIsLoadingMore(true);
      }
      
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        
        if (key === 'specializations' && Array.isArray(value)) {
          if (value.length > 0) {
            params.append(key, value.join(','));
          }
        } else if (key === 'location' && typeof value === 'object') {
          params.append('lat', value.lat.toString());
          params.append('lng', value.lng.toString());
          if (value.radius) {
            params.append('radius', value.radius.toString());
          }
        } else if (typeof value === 'boolean') {
          params.append(key, value.toString());
        } else if (typeof value === 'number' || typeof value === 'string') {
          params.append(key, value.toString());
        }
      });

      // Add session ID for analytics
      const sessionId = typeof window !== 'undefined' 
        ? sessionStorage.getItem('search_session_id') || generateSessionId()
        : generateSessionId();
      
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('search_session_id', sessionId);
      }

      const response = await fetch(`/api/tailors/search?${params.toString()}`, {
        headers: {
          'x-session-id': sessionId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const newResults: TailorSearchResult = await response.json();
      
      // End search timing
      endSearch();

      // Optimize image URLs for better performance
      const optimizedResults = {
        ...newResults,
        tailors: optimizeImageLoading(newResults.tailors),
      };

      setResults(prevResults => {
        const finalResults = !isLoadMore || !prevResults ? 
          optimizedResults : 
          {
            ...optimizedResults,
            tailors: [...prevResults.tailors, ...optimizedResults.tailors],
          };

        // Cache non-paginated results
        if (!isLoadMore) {
          setCachedResult(searchFilters, finalResults);
        }

        // Track search analytics
        const responseTime = performance.now() - (performance.now() - 100); // Approximate
        trackSearch(searchFilters, finalResults, responseTime);

        // End render timing
        setTimeout(() => endRender(), 0);

        return finalResults;
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [startSearch, endSearch, endRender, getCachedResult, setCachedResult, optimizeImageLoading, trackSearch]);

  // Effect to trigger search when filters change
  useEffect(() => {
    // Don't search on initial mount with empty filters
    const hasSearchableFilters = filters.query || 
                                 filters.city || 
                                 filters.region ||
                                 filters.specializations?.length ||
                                 filters.minRating ||
                                 filters.minPrice ||
                                 filters.maxPrice ||
                                 filters.location;

    if (hasSearchableFilters) {
      search(filters);
    } else {
      // Clear results if no searchable filters
      setResults(null);
      setError(null);
    }
  }, [cacheKey, search]); // Use cacheKey instead of filters to avoid cursor changes triggering search

  // Load more function
  const loadMore = useCallback(() => {
    if (!results || !results.hasMore || isLoading || isLoadingMore) return;

    const loadMoreFilters = {
      ...filters,
      cursor: results.nextCursor,
    };

    search(loadMoreFilters, true);
  }, [results, isLoading, isLoadingMore, filters, search]);

  // Refetch function
  const refetch = useCallback(() => {
    if (filters.query || filters.city || filters.specializations?.length || filters.location) {
      search({ ...filters, cursor: undefined });
    }
  }, [filters, search]);

  return {
    results,
    isLoading: isLoading && !isLoadingMore,
    error,
    hasMore: results?.hasMore || false,
    loadMore,
    refetch,
  };
}

// Generate a unique session ID for analytics
function generateSessionId(): string {
  return `search_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}