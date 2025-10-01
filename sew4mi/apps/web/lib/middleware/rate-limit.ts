/**
 * Rate Limiting Middleware
 * Implements token bucket algorithm for API rate limiting
 */

import { NextRequest, NextResponse } from 'next/server';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * In-memory rate limit store (use Redis in production)
 */
class RateLimitStore {
  private store: Map<string, RateLimitEntry> = new Map();

  /**
   * Get rate limit entry for key
   */
  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    
    // Clean up expired entries
    if (entry && Date.now() > entry.resetTime) {
      this.store.delete(key);
      return undefined;
    }
    
    return entry;
  }

  /**
   * Set rate limit entry
   */
  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  /**
   * Increment counter for key
   */
  increment(key: string, windowMs: number): RateLimitEntry {
    const existing = this.get(key);
    
    if (existing) {
      existing.count++;
      this.set(key, existing);
      return existing;
    }
    
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: Date.now() + windowMs
    };
    
    this.set(key, newEntry);
    return newEntry;
  }

  /**
   * Reset counter for key
   */
  reset(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

const rateLimitStore = new RateLimitStore();

// Periodic cleanup of expired entries
if (typeof window === 'undefined') {
  setInterval(() => rateLimitStore.cleanup(), 60000); // Every minute
}

/**
 * Rate limit middleware factory
 */
export function createRateLimiter(config: RateLimitConfig) {
  const {
    maxRequests,
    windowMs,
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false
  } = config;

  return async (
    request: NextRequest,
    handler: (request: NextRequest) => Promise<NextResponse>
  ): Promise<NextResponse> => {
    // Get identifier (IP address or user ID)
    const identifier = getIdentifier(request);
    const key = `rate_limit:${identifier}`;

    // Get current count
    const entry = rateLimitStore.get(key);
    
    // Check if limit exceeded
    if (entry && entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - Date.now()) / 1000);
      
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message,
          retryAfter
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': entry.resetTime.toString()
          }
        }
      );
    }

    // Execute handler
    const response = await handler(request);

    // Increment counter (unless skipping)
    const shouldSkip =
      (skipSuccessfulRequests && response.status < 400) ||
      (skipFailedRequests && response.status >= 400);

    if (!shouldSkip) {
      const newEntry = rateLimitStore.increment(key, windowMs);
      
      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', maxRequests.toString());
      response.headers.set(
        'X-RateLimit-Remaining',
        Math.max(0, maxRequests - newEntry.count).toString()
      );
      response.headers.set('X-RateLimit-Reset', newEntry.resetTime.toString());
    }

    return response;
  };
}

/**
 * Get identifier from request (IP or user ID)
 */
function getIdentifier(request: NextRequest): string {
  // Try to get user ID from auth token
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    // Parse user ID from token (simplified)
    const userId = parseUserIdFromToken(authHeader);
    if (userId) return userId;
  }

  // Fallback to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  
  return ip;
}

/**
 * Parse user ID from auth token
 */
function parseUserIdFromToken(authHeader: string): string | null {
  // This is a simplified implementation
  // In production, properly decode and verify JWT
  try {
    const token = authHeader.replace('Bearer ', '');
    // TODO: Properly decode JWT and extract user ID
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Pre-configured rate limiters
 */

// General API rate limit: 100 requests per 15 minutes
export const generalRateLimit = createRateLimiter({
  maxRequests: 100,
  windowMs: 15 * 60 * 1000
});

// Bulk operations: 10 requests per minute
export const bulkOperationRateLimit = createRateLimiter({
  maxRequests: 10,
  windowMs: 60 * 1000,
  message: 'Too many bulk operations. Please wait before trying again.'
});

// Messaging: 20 messages per hour
export const messagingRateLimit = createRateLimiter({
  maxRequests: 20,
  windowMs: 60 * 60 * 1000,
  message: 'Message rate limit exceeded. Please wait before sending more messages.'
});

// Image uploads: 50 uploads per hour
export const uploadRateLimit = createRateLimiter({
  maxRequests: 50,
  windowMs: 60 * 60 * 1000,
  message: 'Upload rate limit exceeded. Please wait before uploading more images.'
});

/**
 * Apply rate limiting to route handler
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  limiter: ReturnType<typeof createRateLimiter>
) {
  return async (request: NextRequest, context?: any) => {
    return limiter(request, handler);
  };
}

