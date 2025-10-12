'use client';

import React, { useEffect, useState } from 'react';
import { useAuthCacheStats } from '@/lib/cache/authCache';
import { useRateLimitStats } from '@/lib/utils/rateLimiter';

/**
 * Debug component to show caching and rate limiting statistics
 * Only shows in development mode
 */
export function CacheStats() {
  const [mounted, setMounted] = useState(false);
  const authStats = useAuthCacheStats();
  const rateLimitStats = useRateLimitStats();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) {
    return null;
  }

  // Check if in development mode (client-side only)
  const isDev = process.env.NODE_ENV === 'development';
  if (!isDev) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50"
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