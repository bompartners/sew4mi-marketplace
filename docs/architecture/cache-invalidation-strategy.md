# Cache Invalidation Strategy

## Overview

This document outlines the caching and cache invalidation strategy for the Sew4Mi marketplace, specifically for Story 4.3 (Reorder, Favorites, Loyalty, and Recommendations).

## Caching Infrastructure

### Production: Redis / Vercel KV
- **Provider**: Redis (self-hosted) or Vercel KV (managed)
- **Location**: `lib/services/cache.service.ts`
- **Fallback**: In-memory cache for development

### Development: In-Memory Cache
- **Implementation**: Map-based in-memory store
- **Automatic cleanup**: Expires old entries periodically
- **Statistics**: Available via `getCacheStats()`

## Cached Entities

### 1. Recommendations (`recommendations:*`)

**Cache Key Pattern:**
```
recommendations:{userId}:{type}:{limit}
```

**TTL:** 5 minutes (300 seconds)

**Stored Data:**
- Garment recommendations with scores
- Tailor recommendations with scores
- Fabric recommendations with scores

**Invalidation Triggers:**
- New order completed
- Order updated (garment type, fabric, etc.)
- User preferences changed

**Invalidation Implementation:**
```typescript
// In order completion API/webhook
import { invalidateRecommendationsCache } from '@/app/api/recommendations/route';

await invalidateRecommendationsCache(order.customerId);
```

### 2. Order Analytics (`analytics:*`)

**Cache Key Pattern:**
```
analytics:{userId}
```

**TTL:** 10 minutes (600 seconds)

**Stored Data:**
- Total orders count
- Garment type frequency
- Tailor collaboration history
- Fabric preferences
- Color preferences
- Average order value

**Invalidation Triggers:**
- New order completed
- Order status changed to COMPLETED

**Invalidation Strategy:**
- Delete on new completed order
- Recalculate on next request (lazy computation)

### 3. Loyalty Account (`loyalty:account:*`)

**Cache Key Pattern:**
```
loyalty:account:{userId}
```

**TTL:** 2 minutes (120 seconds)

**Stored Data:**
- Current points balance
- Tier level
- Lifetime points
- Available rewards

**Invalidation Triggers:**
- Points earned (order completion)
- Points redeemed
- Tier upgrade
- Reward claimed

**Invalidation Strategy:**
- Invalidate immediately on points transaction
- Short TTL for real-time balance updates

### 4. Tailor Profiles (`tailor:profile:*`)

**Cache Key Pattern:**
```
tailor:profile:{tailorId}
```

**TTL:** 30 minutes (1800 seconds)

**Stored Data:**
- Tailor details
- Pricing information
- Portfolio images
- Reviews and ratings

**Invalidation Triggers:**
- Tailor updates profile
- New review added
- Portfolio image uploaded

## Cache Invalidation Patterns

### Pattern 1: Immediate Invalidation

Use for critical real-time data (loyalty points, order status).

```typescript
import { deleteCache, CACHE_KEYS } from '@/lib/utils/cache';

// Single key invalidation
await deleteCache(CACHE_KEYS.LOYALTY_ACCOUNT(userId));
```

### Pattern 2: Batch Invalidation

Use for related entities (all recommendation variations for a user).

```typescript
import { deleteCachePattern } from '@/lib/utils/cache';

// Pattern-based invalidation
await deleteCachePattern(`recommendations:${userId}:*`);
```

### Pattern 3: Lazy Invalidation

Use for non-critical data with acceptable staleness.

```typescript
// Let TTL expire naturally
// Recalculate on next request
const recommendations = await withCache(
  CACHE_KEYS.RECOMMENDATIONS(userId),
  CACHE_TTL.RECOMMENDATIONS,
  () => generateRecommendations(userId)
);
```

### Pattern 4: Write-Through Cache

Use for frequently accessed data with updates.

```typescript
// Update database and cache simultaneously
await db.updateLoyaltyPoints(userId, points);
await setCache(
  CACHE_KEYS.LOYALTY_ACCOUNT(userId),
  updatedAccount,
  CACHE_TTL.LOYALTY_ACCOUNT
);
```

## Invalidation Hooks

### Order Completion Hook

```typescript
// In /api/orders/[id]/complete
export async function POST(request: NextRequest) {
  // ... complete order logic

  // Invalidate caches
  await Promise.all([
    // Recommendations (user might have new preferences)
    deleteCachePattern(`recommendations:${order.customerId}:*`),

    // Analytics (order count and patterns changed)
    deleteCache(CACHE_KEYS.ANALYTICS(order.customerId)),

    // Loyalty (points earned)
    deleteCache(CACHE_KEYS.LOYALTY_ACCOUNT(order.customerId)),
  ]);

  return NextResponse.json({ success: true });
}
```

### Loyalty Points Transaction Hook

```typescript
// In loyalty.service.ts
async awardPoints(userId: string, points: number) {
  // ... database transaction

  // Immediate cache invalidation
  await deleteCache(CACHE_KEYS.LOYALTY_ACCOUNT(userId));

  return updatedAccount;
}
```

### Tailor Profile Update Hook

```typescript
// In /api/tailors/[id]/profile
export async function PATCH(request: NextRequest) {
  // ... update profile logic

  // Invalidate tailor profile cache
  await deleteCache(CACHE_KEYS.TAILOR_PROFILE(tailorId));

  // Invalidate recommendations that might include this tailor
  // Pattern: recommendations:*:tailor:*
  await deleteCachePattern('recommendations:*:tailor:*');

  return NextResponse.json({ success: true });
}
```

## Cache Headers and Client-Side Caching

### API Response Headers

```typescript
// Cache HIT
{
  'X-Cache': 'HIT',
  'Cache-Control': 'private, max-age=300',
  'Age': '120', // Seconds since cached
}

// Cache MISS
{
  'X-Cache': 'MISS',
  'Cache-Control': 'private, max-age=300',
}
```

### React Query Configuration

```typescript
// Already configured in providers.tsx
new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});
```

### Manual Cache Invalidation (Client-Side)

```typescript
import { useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const queryClient = useQueryClient();

  const handleOrderComplete = async () => {
    // ... complete order

    // Invalidate React Query caches
    await queryClient.invalidateQueries({ queryKey: ['recommendations'] });
    await queryClient.invalidateQueries({ queryKey: ['loyalty'] });
    await queryClient.invalidateQueries({ queryKey: ['analytics'] });
  };
}
```

## Cache Monitoring

### Development

```typescript
import { getCacheStats } from '@/lib/utils/cache';

// Get cache statistics
const stats = getCacheStats();
console.log('Cache size:', stats.size);
console.log('Cached keys:', stats.keys);
```

### Production

**Metrics to Track:**
- Cache hit rate (target: > 80%)
- Average response time (cached vs uncached)
- Cache memory usage
- Invalidation frequency

**Monitoring Tools:**
```typescript
// Example: New Relic custom metrics
newrelic.recordMetric('Cache/HitRate', hitRate);
newrelic.recordMetric('Cache/Size', cacheSize);

// Example: Datadog APM
statsd.gauge('cache.hit_rate', hitRate);
statsd.increment('cache.invalidation', 1, ['type:recommendations']);
```

## Cache Warming Strategies

### Precompute on Order Completion

```typescript
// After order completion, precompute recommendations
async function onOrderCompleted(order: Order) {
  // Invalidate old cache
  await deleteCachePattern(`recommendations:${order.customerId}:*`);

  // Warm cache with new recommendations (background job)
  setTimeout(async () => {
    await recommendationService.getRecommendations(order.customerId);
  }, 5000); // 5-second delay to let DB sync
}
```

### Background Jobs

```typescript
// Cron job to warm popular caches
// Run every hour for active users
export async function warmRecommendationsCache() {
  const activeUsers = await getActiveUsers(); // Users with recent activity

  for (const user of activeUsers) {
    try {
      await recommendationService.getRecommendations(user.id);
    } catch (error) {
      console.error(`Failed to warm cache for user ${user.id}:`, error);
    }
  }
}
```

## Cache Eviction Policies

### LRU (Least Recently Used)
- **Implementation**: Automatic in Redis
- **Configuration**: Set maxmemory-policy to allkeys-lru
- **Benefit**: Removes least accessed keys when memory limit reached

### TTL-Based Expiration
- **Implementation**: Automatic via SETEX command
- **Configuration**: Per-key TTL in seconds
- **Benefit**: Ensures data freshness without manual invalidation

## Cache Failure Handling

### Graceful Degradation

```typescript
async function getRecommendations(userId: string) {
  try {
    // Try cache first
    const cached = await getCached(CACHE_KEYS.RECOMMENDATIONS(userId));
    if (cached) return cached;
  } catch (error) {
    console.error('Cache read failed:', error);
    // Continue to database fallback
  }

  // Fallback to database
  const fresh = await generateRecommendations(userId);

  try {
    // Try to cache result
    await setCache(
      CACHE_KEYS.RECOMMENDATIONS(userId),
      fresh,
      CACHE_TTL.RECOMMENDATIONS
    );
  } catch (error) {
    console.error('Cache write failed:', error);
    // Don't throw - return fresh data anyway
  }

  return fresh;
}
```

### Circuit Breaker Pattern

```typescript
let cacheFailureCount = 0;
const MAX_FAILURES = 5;
const CIRCUIT_RESET_TIME = 60000; // 1 minute

async function getCachedWithCircuitBreaker<T>(key: string): Promise<T | null> {
  if (cacheFailureCount >= MAX_FAILURES) {
    console.warn('Cache circuit breaker OPEN - bypassing cache');
    return null;
  }

  try {
    const result = await getCached<T>(key);
    cacheFailureCount = Math.max(0, cacheFailureCount - 1); // Recover
    return result;
  } catch (error) {
    cacheFailureCount++;
    if (cacheFailureCount === MAX_FAILURES) {
      setTimeout(() => {
        cacheFailureCount = 0; // Reset circuit breaker
      }, CIRCUIT_RESET_TIME);
    }
    return null;
  }
}
```

## Testing Cache Invalidation

### Unit Tests

```typescript
describe('Cache Invalidation', () => {
  it('should invalidate recommendations after order completion', async () => {
    const userId = 'user-123';
    const cacheKey = CACHE_KEYS.RECOMMENDATIONS(userId);

    // Set cache
    await setCache(cacheKey, mockRecommendations, 300);

    // Verify cached
    expect(await getCached(cacheKey)).toBeTruthy();

    // Complete order (triggers invalidation)
    await completeOrder(mockOrder);

    // Verify invalidated
    expect(await getCached(cacheKey)).toBeNull();
  });
});
```

### Integration Tests

```typescript
describe('Recommendations API with Caching', () => {
  it('should return cached recommendations on second request', async () => {
    const response1 = await fetch('/api/recommendations');
    const data1 = await response1.json();
    expect(response1.headers.get('X-Cache')).toBe('MISS');

    const response2 = await fetch('/api/recommendations');
    const data2 = await response2.json();
    expect(response2.headers.get('X-Cache')).toBe('HIT');
    expect(data2).toEqual(data1);
  });
});
```

## Best Practices

1. **Cache Early, Invalidate Precisely**
   - Cache aggressively for read-heavy operations
   - Invalidate only affected keys, not entire cache

2. **Use Appropriate TTLs**
   - Short TTL (1-5 min): Real-time data (loyalty points)
   - Medium TTL (10-30 min): Semi-static data (recommendations)
   - Long TTL (1+ hour): Static data (tailor profiles)

3. **Monitor Cache Performance**
   - Track hit rates, miss rates, and latency
   - Alert on sudden drops in hit rate

4. **Handle Cache Failures Gracefully**
   - Always have database fallback
   - Don't let cache failures break the app

5. **Document Cache Keys**
   - Use consistent naming patterns
   - Centralize key generation in CACHE_KEYS

6. **Test Invalidation Logic**
   - Unit test invalidation hooks
   - Integration test end-to-end flows

## Troubleshooting

### Problem: Low Cache Hit Rate

**Diagnosis:**
```bash
# Check Redis stats
redis-cli INFO stats
```

**Solutions:**
- Increase TTL for stable data
- Implement cache warming
- Check for frequent invalidation

### Problem: Stale Data

**Diagnosis:**
- Check invalidation hooks are firing
- Verify TTL settings

**Solutions:**
- Shorten TTL
- Add explicit invalidation on updates
- Implement webhook-based invalidation

### Problem: Cache Memory Issues

**Diagnosis:**
```bash
# Check Redis memory usage
redis-cli INFO memory
```

**Solutions:**
- Implement LRU eviction policy
- Reduce TTL for large objects
- Compress cached data
- Increase Redis memory limit

## References

- Cache Service: `lib/services/cache.service.ts`
- Cache Utilities: `lib/utils/cache.ts`
- Recommendations API: `app/api/recommendations/route.ts`
- React Query Config: `app/providers.tsx`
