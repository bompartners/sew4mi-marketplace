'use client';

import { useCallback, useEffect, useRef } from 'react';
import { TailorSearchFilters, TailorSearchResult } from '@sew4mi/shared';

interface SearchAnalyticsData {
  sessionId: string;
  query: string;
  filters: Partial<TailorSearchFilters>;
  resultsCount: number;
  responseTime: number;
  userAction: 'search' | 'filter_applied' | 'tailor_clicked' | 'contact_initiated' | 'favorite_added';
  metadata?: Record<string, any>;
}

interface UseSearchAnalyticsOptions {
  enabled?: boolean;
  debounceMs?: number;
}

export function useSearchAnalytics(options: UseSearchAnalyticsOptions = {}) {
  const { enabled = true, debounceMs = 1000 } = options;
  const analyticsQueue = useRef<SearchAnalyticsData[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout>();
  const sessionIdRef = useRef<string>();

  // Get or create session ID
  const getSessionId = useCallback(() => {
    if (sessionIdRef.current) {
      return sessionIdRef.current;
    }

    if (typeof window !== 'undefined') {
      let sessionId = sessionStorage.getItem('search_session_id');
      if (!sessionId) {
        sessionId = `search_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('search_session_id', sessionId);
      }
      sessionIdRef.current = sessionId;
      return sessionId;
    }

    return 'server_session';
  }, []);

  // Flush analytics data to server
  const flushAnalytics = useCallback(async () => {
    if (!enabled || analyticsQueue.current.length === 0) return;

    const data = [...analyticsQueue.current];
    analyticsQueue.current = [];

    try {
      await fetch('/api/analytics/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: data }),
      });
    } catch (error) {
      console.warn('Failed to send analytics:', error);
      // Re-queue failed events (up to a limit)
      if (analyticsQueue.current.length < 100) {
        analyticsQueue.current.push(...data.slice(-50)); // Keep last 50 events
      }
    }
  }, [enabled]);

  // Queue analytics event
  const trackEvent = useCallback((event: Omit<SearchAnalyticsData, 'sessionId'>) => {
    if (!enabled) return;

    const sessionId = getSessionId();
    analyticsQueue.current.push({
      ...event,
      sessionId,
    });

    // Debounced flush
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    flushTimeoutRef.current = setTimeout(flushAnalytics, debounceMs);
  }, [enabled, getSessionId, flushAnalytics, debounceMs]);

  // Track search performed
  const trackSearch = useCallback((
    filters: TailorSearchFilters,
    results: TailorSearchResult | null,
    responseTime: number
  ) => {
    trackEvent({
      query: filters.query || '',
      filters: {
        city: filters.city,
        region: filters.region,
        specializations: filters.specializations,
        minRating: filters.minRating,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        location: filters.location,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      },
      resultsCount: results?.tailors.length || 0,
      responseTime,
      userAction: 'search',
      metadata: {
        hasLocation: !!filters.location,
        totalResults: results?.totalCount || 0,
        hasMore: results?.hasMore || false,
      },
    });
  }, [trackEvent]);

  // Track filter application
  const trackFilter = useCallback((
    filterType: string,
    filterValue: any,
    resultsCount: number
  ) => {
    trackEvent({
      query: '',
      filters: { [filterType]: filterValue },
      resultsCount,
      responseTime: 0,
      userAction: 'filter_applied',
      metadata: {
        filterType,
        filterValue: typeof filterValue === 'object' ? JSON.stringify(filterValue) : filterValue,
      },
    });
  }, [trackEvent]);

  // Track tailor interaction
  const trackTailorClick = useCallback((tailorId: string, resultPosition?: number) => {
    trackEvent({
      query: '',
      filters: {},
      resultsCount: 0,
      responseTime: 0,
      userAction: 'tailor_clicked',
      metadata: {
        tailorId,
        resultPosition,
        timestamp: Date.now(),
      },
    });
  }, [trackEvent]);

  // Track contact initiation
  const trackContact = useCallback((tailorId: string, contactMethod: 'whatsapp' | 'phone' | 'profile') => {
    trackEvent({
      query: '',
      filters: {},
      resultsCount: 0,
      responseTime: 0,
      userAction: 'contact_initiated',
      metadata: {
        tailorId,
        contactMethod,
        timestamp: Date.now(),
      },
    });
  }, [trackEvent]);

  // Track favorite action
  const trackFavorite = useCallback((tailorId: string, action: 'added' | 'removed') => {
    trackEvent({
      query: '',
      filters: {},
      resultsCount: 0,
      responseTime: 0,
      userAction: 'favorite_added',
      metadata: {
        tailorId,
        action,
        timestamp: Date.now(),
      },
    });
  }, [trackEvent]);

  // Flush on component unmount
  useEffect(() => {
    return () => {
      if (flushTimeoutRef.current) {
        clearTimeout(flushTimeoutRef.current);
      }
      flushAnalytics();
    };
  }, [flushAnalytics]);

  // Periodic flush (every 30 seconds)
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      if (analyticsQueue.current.length > 0) {
        flushAnalytics();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [enabled, flushAnalytics]);

  // Flush on page visibility change (when user leaves tab)
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.hidden && analyticsQueue.current.length > 0) {
        // Use sendBeacon for reliable delivery when page is closing
        try {
          const data = JSON.stringify({ events: analyticsQueue.current });
          navigator.sendBeacon('/api/analytics/search', data);
          analyticsQueue.current = [];
        } catch (error) {
          console.warn('Failed to send analytics via beacon:', error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled]);

  return {
    trackSearch,
    trackFilter,
    trackTailorClick,
    trackContact,
    trackFavorite,
    flushAnalytics,
    getSessionId,
  };
}