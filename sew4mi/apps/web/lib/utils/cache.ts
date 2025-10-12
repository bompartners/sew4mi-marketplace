/**
 * Caching utilities for Vercel KV or Redis
 * Supports both production (Vercel KV) and development (in-memory) caching
 */

// In-memory cache for development
const devCache = new Map<string, { value: any; expiresAt: number }>();

// Cache configuration
export const CACHE_KEYS = {
  RECOMMENDATIONS: (userId: string) => `recommendations:${userId}`,
  ANALYTICS: (userId: string) => `analytics:${userId}`,
  LOYALTY_ACCOUNT: (userId: string) => `loyalty:account:${userId}`,
  TAILOR_PROFILE: (tailorId: string) => `tailor:profile:${tailorId}`,
} as const;

export const CACHE_TTL = {
  RECOMMENDATIONS: 5 * 60, // 5 minutes
  ANALYTICS: 10 * 60, // 10 minutes
  LOYALTY_ACCOUNT: 2 * 60, // 2 minutes
  TAILOR_PROFILE: 30 * 60, // 30 minutes
} as const;

/**
 * Get value from cache
 * @param key Cache key
 * @returns Cached value or null if not found/expired
 */
export async function getCached<T>(key: string): Promise<T | null> {
  try {
    // Production: Use Vercel KV
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const kv = await import('@vercel/kv').then(m => m.kv);
      return await kv.get<T>(key);
    }

    // Development: Use in-memory cache
    const cached = devCache.get(key);
    if (!cached) return null;

    // Check expiration
    if (Date.now() > cached.expiresAt) {
      devCache.delete(key);
      return null;
    }

    return cached.value as T;
  } catch (error) {
    console.error(`[Cache] Error getting ${key}:`, error);
    return null;
  }
}

/**
 * Set value in cache
 * @param key Cache key
 * @param value Value to cache
 * @param ttlSeconds TTL in seconds
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  try {
    // Production: Use Vercel KV
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const kv = await import('@vercel/kv').then(m => m.kv);
      await kv.set(key, value, { ex: ttlSeconds });
      return;
    }

    // Development: Use in-memory cache
    devCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  } catch (error) {
    console.error(`[Cache] Error setting ${key}:`, error);
  }
}

/**
 * Delete value from cache
 * @param key Cache key
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    // Production: Use Vercel KV
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const kv = await import('@vercel/kv').then(m => m.kv);
      await kv.del(key);
      return;
    }

    // Development: Use in-memory cache
    devCache.delete(key);
  } catch (error) {
    console.error(`[Cache] Error deleting ${key}:`, error);
  }
}

/**
 * Delete multiple keys from cache (pattern matching)
 * @param pattern Key pattern (e.g., "recommendations:*")
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    // Production: Use Vercel KV scan
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const kv = await import('@vercel/kv').then(m => m.kv);
      const keys = await kv.keys(pattern);
      if (keys.length > 0) {
        await kv.del(...keys);
      }
      return;
    }

    // Development: Use in-memory cache
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    for (const key of devCache.keys()) {
      if (regex.test(key)) {
        devCache.delete(key);
      }
    }
  } catch (error) {
    console.error(`[Cache] Error deleting pattern ${pattern}:`, error);
  }
}

/**
 * Cache wrapper for async functions
 * Automatically handles get/set with caching
 *
 * @example
 * const recommendations = await withCache(
 *   CACHE_KEYS.RECOMMENDATIONS(userId),
 *   CACHE_TTL.RECOMMENDATIONS,
 *   () => generateRecommendations(userId)
 * );
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  // Try to get from cache
  const cached = await getCached<T>(key);
  if (cached !== null) {
    console.log(`[Cache] HIT: ${key}`);
    return cached;
  }

  console.log(`[Cache] MISS: ${key}`);

  // Execute function and cache result
  const result = await fn();
  await setCache(key, result, ttlSeconds);

  return result;
}

/**
 * Clear all cache (for development/testing)
 */
export async function clearAllCache(): Promise<void> {
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const kv = await import('@vercel/kv').then(m => m.kv);
      const keys = await kv.keys('*');
      if (keys.length > 0) {
        await kv.del(...keys);
      }
      return;
    }

    devCache.clear();
  } catch (error) {
    console.error('[Cache] Error clearing all cache:', error);
  }
}

/**
 * Get cache statistics (development only)
 */
export function getCacheStats() {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return {
    size: devCache.size,
    keys: Array.from(devCache.keys()),
    hitRate: 0, // TODO: Implement hit rate tracking
  };
}
