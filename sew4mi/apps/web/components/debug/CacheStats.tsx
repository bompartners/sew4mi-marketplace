'use client';

import React, { useEffect, useState } from 'react';
import { useAuthCacheStats } from '@/lib/cache/authCache';
import { useRateLimitStats } from '@/lib/utils/rateLimiter';

/**
 * Debug component to show caching and rate limiting statistics
 * Only shows in development mode
 *
 * IMPORTANT: Always renders a div (never null) to prevent hydration mismatches.
 * Visibility is controlled via CSS classes instead of conditional rendering.
 */
export function CacheStats() {
  const [mounted, setMounted] = useState(false);
  const authStats = useAuthCacheStats();
  const rateLimitStats = useRateLimitStats();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Check if in development mode (client-side only)
  const isDev = process.env.NODE_ENV === 'development';

  // Always render a div to prevent hydration mismatch
  // Control visibility with CSS classes instead of conditional rendering
  const isVisible = mounted && isDev;

  return (
    <div
      className={`fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50 ${
        isVisible ? 'block' : 'hidden'
      }`}
      aria-hidden={!isVisible}
    >
      <div className="mb-2 font-bold">Cache & Rate Limit Stats</div>

      <div className="space-y-1">
        <div>Auth Cache: {authStats.userCacheSize} users</div>
        <div>Session Cached: {authStats.sessionCached ? '✅' : '❌'}</div>
        <div>Oldest Cache: {Math.round(authStats.oldestCacheAge / 1000)}s</div>

        <div className="mt-2 pt-2 border-t border-gray-600">
          <div>Auth Requests: {rateLimitStats.authCount}/80 per hour</div>
          <div>DB Requests: {rateLimitStats.dbCount}/80 per min</div>
        </div>

        {rateLimitStats.authCount > 60 && (
          <div className="text-red-400 mt-1">⚠️ High auth usage!</div>
        )}

        {rateLimitStats.dbCount > 60 && (
          <div className="text-red-400 mt-1">⚠️ High DB usage!</div>
        )}
      </div>
    </div>
  );
}

export default CacheStats;