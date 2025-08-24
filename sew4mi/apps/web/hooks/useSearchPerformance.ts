'use client';

import { useCallback, useRef, useEffect, useMemo } from 'react';
import { TailorSearchFilters, TailorSearchItem } from '@sew4mi/shared';

interface PerformanceMetrics {
  searchStartTime: number;
  searchEndTime: number;
  responseTime: number;
  renderStartTime: number;
  renderEndTime: number;
  renderTime: number;
  totalTime: number;
}

interface UseSearchPerformanceOptions {
  enabled?: boolean;
  logMetrics?: boolean;
  reportThreshold?: number; // Report slow searches (ms)
}

export function useSearchPerformance(options: UseSearchPerformanceOptions = {}) {
  const { enabled = true, logMetrics = false, reportThreshold = 2000 } = options;
  const metricsRef = useRef<Partial<PerformanceMetrics>>({});
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const requestCacheRef = useRef<Map<string, { data: any; timestamp: number }>>(new Map());

  // Generate cache key for search filters
  const getCacheKey = useCallback((filters: TailorSearchFilters): string => {
    const { cursor, ...cacheableFilters } = filters;
    return JSON.stringify(cacheableFilters);
  }, []);

  // Check if request can use cache
  const getCachedResult = useCallback((filters: TailorSearchFilters, maxAge: number = 300000) => {
    if (!enabled) return null;

    const key = getCacheKey(filters);
    const cached = requestCacheRef.current.get(key);
    
    if (cached && Date.now() - cached.timestamp < maxAge) {
      return cached.data;
    }
    
    return null;
  }, [enabled, getCacheKey]);

  // Cache search result
  const setCachedResult = useCallback((filters: TailorSearchFilters, data: any) => {
    if (!enabled) return;

    const key = getCacheKey(filters);
    requestCacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Cleanup old cache entries (keep last 50)
    if (requestCacheRef.current.size > 50) {
      const entries = Array.from(requestCacheRef.current.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      requestCacheRef.current = new Map(entries.slice(0, 50));
    }
  }, [enabled, getCacheKey]);

  // Start search timer
  const startSearch = useCallback(() => {
    if (!enabled) return;
    
    metricsRef.current = {
      searchStartTime: performance.now(),
    };
  }, [enabled]);

  // End search timer and start render timer
  const endSearch = useCallback(() => {
    if (!enabled || !metricsRef.current.searchStartTime) return;
    
    const searchEndTime = performance.now();
    metricsRef.current.searchEndTime = searchEndTime;
    metricsRef.current.responseTime = searchEndTime - metricsRef.current.searchStartTime;
    metricsRef.current.renderStartTime = searchEndTime;
  }, [enabled]);

  // End render timer and calculate total metrics
  const endRender = useCallback(() => {
    if (!enabled || !metricsRef.current.renderStartTime) return;
    
    const renderEndTime = performance.now();
    metricsRef.current.renderEndTime = renderEndTime;
    metricsRef.current.renderTime = renderEndTime - metricsRef.current.renderStartTime;
    metricsRef.current.totalTime = renderEndTime - (metricsRef.current.searchStartTime || 0);

    const metrics = metricsRef.current as PerformanceMetrics;

    // Log metrics if enabled
    if (logMetrics) {
      console.log('Search Performance:', {
        responseTime: `${metrics.responseTime.toFixed(1)}ms`,
        renderTime: `${metrics.renderTime.toFixed(1)}ms`,
        totalTime: `${metrics.totalTime.toFixed(1)}ms`,
      });
    }

    // Report slow searches
    if (metrics.totalTime > reportThreshold) {
      console.warn(`Slow search detected: ${metrics.totalTime.toFixed(1)}ms`, metrics);
      
      // Could send to analytics service
      if (typeof window !== 'undefined') {
        try {
          fetch('/api/analytics/performance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'slow_search',
              metrics,
              userAgent: navigator.userAgent,
              timestamp: Date.now(),
            }),
          }).catch(() => {}); // Ignore errors
        } catch (error) {
          // Ignore errors
        }
      }
    }

    return metrics;
  }, [enabled, logMetrics, reportThreshold]);

  // Debounced search function to reduce API calls
  const debouncedSearch = useCallback(<T>(
    searchFn: () => Promise<T>,
    delay: number = 300
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(async () => {
        try {
          const result = await searchFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }, []);

  // Memoized filter for optimizing re-renders
  const memoizeResults = useCallback(<T>(
    results: T[],
    filterFn: (item: T) => boolean,
    deps: any[]
  ): T[] => {
    return useMemo(() => {
      if (!enabled) return results;
      return results.filter(filterFn);
    }, [results, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Virtual scrolling helper for large result sets
  const getVisibleItems = useCallback(<T>(
    items: T[],
    containerHeight: number,
    itemHeight: number,
    scrollTop: number,
    overscan: number = 5
  ) => {
    if (!enabled) return { visibleItems: items, startIndex: 0, endIndex: items.length };

    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(items.length, startIndex + visibleCount + overscan * 2);

    return {
      visibleItems: items.slice(startIndex, endIndex),
      startIndex,
      endIndex,
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight,
    };
  }, [enabled]);

  // Optimize image loading for tailor cards
  const optimizeImageLoading = useCallback((tailors: TailorSearchItem[]) => {
    if (!enabled || typeof window === 'undefined') return tailors;

    return tailors.map(tailor => ({
      ...tailor,
      profilePhoto: tailor.profilePhoto ? `${tailor.profilePhoto}?w=200&h=200&q=75` : null,
      portfolioImages: tailor.portfolioImages?.map(img => `${img}?w=150&h=150&q=70`) || [],
    }));
  }, [enabled]);

  // Preload critical images
  const preloadImages = useCallback((imageUrls: string[], priority: 'high' | 'low' = 'low') => {
    if (!enabled || typeof window === 'undefined') return;

    imageUrls.slice(0, 5).forEach(url => { // Limit preloading
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = url;
      if (priority === 'high') {
        link.setAttribute('fetchpriority', 'high');
      }
      document.head.appendChild(link);
      
      // Cleanup after 30 seconds
      setTimeout(() => {
        try {
          document.head.removeChild(link);
        } catch (error) {
          // Ignore if already removed
        }
      }, 30000);
    });
  }, [enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Performance monitoring
  const getMetrics = useCallback(() => {
    return metricsRef.current as PerformanceMetrics;
  }, []);

  return {
    // Timing functions
    startSearch,
    endSearch,
    endRender,
    getMetrics,

    // Caching
    getCachedResult,
    setCachedResult,

    // Optimization helpers
    debouncedSearch,
    memoizeResults,
    getVisibleItems,
    optimizeImageLoading,
    preloadImages,
  };
}