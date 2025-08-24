/**
 * Simple rate limiter to track and prevent excessive API calls
 * Helps avoid hitting Supabase rate limits during development
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  identifier: string;
}

interface RequestLog {
  timestamp: number;
  count: number;
}

class RateLimiter {
  private requests = new Map<string, RequestLog[]>();
  private readonly cleanupInterval = 60000; // 1 minute
  private cleanupTimer?: NodeJS.Timeout;

  constructor() {
    // Periodically clean up old entries
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Check if a request is allowed under the rate limit
   */
  isAllowed(config: RateLimitConfig): boolean {
    const { maxRequests, windowMs, identifier } = config;
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create request log for this identifier
    let logs = this.requests.get(identifier);
    if (!logs) {
      logs = [];
      this.requests.set(identifier, logs);
    }

    // Remove expired entries
    while (logs.length > 0 && logs[0].timestamp < windowStart) {
      logs.shift();
    }

    // Count total requests in current window
    const totalRequests = logs.reduce((sum, log) => sum + log.count, 0);

    if (totalRequests >= maxRequests) {
      console.warn(`🚫 Rate limit exceeded for ${identifier}: ${totalRequests}/${maxRequests} requests in ${windowMs}ms`);
      return false;
    }

    // Add current request
    const lastLog = logs[logs.length - 1];
    if (lastLog && now - lastLog.timestamp < 1000) {
      // Group requests within 1 second
      lastLog.count++;
    } else {
      logs.push({ timestamp: now, count: 1 });
    }

    if (totalRequests > maxRequests * 0.8) {
      console.warn(`⚠️ Approaching rate limit for ${identifier}: ${totalRequests}/${maxRequests} requests`);
    }

    return true;
  }

  /**
   * Get current request count for an identifier
   */
  getCurrentCount(identifier: string, windowMs: number): number {
    const logs = this.requests.get(identifier);
    if (!logs) return 0;

    const windowStart = Date.now() - windowMs;
    return logs
      .filter(log => log.timestamp >= windowStart)
      .reduce((sum, log) => sum + log.count, 0);
  }

  /**
   * Get statistics for debugging
   */
  getStats(): { [key: string]: number } {
    const stats: { [key: string]: number } = {};
    
    this.requests.forEach((logs, identifier) => {
      const recentCount = logs
        .filter(log => Date.now() - log.timestamp < 60000) // Last minute
        .reduce((sum, log) => sum + log.count, 0);
      stats[identifier] = recentCount;
    });

    return stats;
  }

  /**
   * Clear all rate limit data
   */
  clear(): void {
    this.requests.clear();
  }

  /**
   * Clean up old entries
   */
  private cleanup(): void {
    const cutoff = Date.now() - (60 * 60 * 1000); // 1 hour ago
    
    this.requests.forEach((logs, identifier) => {
      const filtered = logs.filter(log => log.timestamp > cutoff);
      if (filtered.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, filtered);
      }
    });
  }

  /**
   * Destroy the rate limiter and clean up timers
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// Export singleton instance
export const rateLimiter = new RateLimiter();

/**
 * Supabase-specific rate limit configurations
 */
export const SUPABASE_LIMITS = {
  // Auth API limits (conservative estimates)
  AUTH: {
    maxRequests: 80, // Conservative: 80 out of 100 per hour
    windowMs: 60 * 60 * 1000, // 1 hour
    identifier: 'supabase_auth'
  },
  
  // Database API limits
  DATABASE: {
    maxRequests: 80, // Conservative: 80 out of 100 per minute
    windowMs: 60 * 1000, // 1 minute
    identifier: 'supabase_db'
  },
  
  // Per-user limits (for development)
  USER_AUTH: {
    maxRequests: 10, // Max 10 auth requests per user per minute
    windowMs: 60 * 1000, // 1 minute
    identifier: 'user_auth'
  }
};

/**
 * Helper function to check Supabase auth rate limits
 */
export function checkAuthRateLimit(userId?: string): boolean {
  const authAllowed = rateLimiter.isAllowed(SUPABASE_LIMITS.AUTH);
  
  if (userId) {
    const userAllowed = rateLimiter.isAllowed({
      ...SUPABASE_LIMITS.USER_AUTH,
      identifier: `user_auth_${userId}`
    });
    return authAllowed && userAllowed;
  }
  
  return authAllowed;
}

/**
 * Helper function to check Supabase database rate limits
 */
export function checkDatabaseRateLimit(): boolean {
  return rateLimiter.isAllowed(SUPABASE_LIMITS.DATABASE);
}

/**
 * Hook to get rate limiting statistics
 */
export function useRateLimitStats() {
  return {
    stats: rateLimiter.getStats(),
    authCount: rateLimiter.getCurrentCount(SUPABASE_LIMITS.AUTH.identifier, SUPABASE_LIMITS.AUTH.windowMs),
    dbCount: rateLimiter.getCurrentCount(SUPABASE_LIMITS.DATABASE.identifier, SUPABASE_LIMITS.DATABASE.windowMs)
  };
}

export default rateLimiter;