'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import dynamic from 'next/dynamic';
import { ServiceWorkerRegistration } from '@/components/common/ServiceWorkerRegistration';

// Dynamically import CacheStats to avoid SSR issues
const CacheStats = dynamic(
  () => import('@/components/debug/CacheStats').then(mod => ({ default: mod.CacheStats })),
  { ssr: false }
);

/**
 * React Query configuration optimized for Sew4Mi marketplace
 * - Aggressive caching for dashboard data (5 min)
 * - Background refetching disabled by default (manual control)
 * - Retry logic for Ghana's mobile network conditions
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes to reduce API calls
            staleTime: 5 * 60 * 1000,
            // Keep unused data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,
            // Don't refetch on window focus (prevent unnecessary API calls)
            refetchOnWindowFocus: false,
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
            // Retry failed requests (important for Ghana mobile networks)
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Register service worker for offline support */}
        <ServiceWorkerRegistration />
        {children}
        {/* Development debugging component - only shows in dev mode */}
        <CacheStats />
      </AuthProvider>
    </QueryClientProvider>
  );
}
