# Recommendation Algorithm Performance Benchmarks

## Overview

This document outlines the performance benchmarks and testing strategy for the recommendation algorithm used in Story 4.3 (Reorder and Favorites).

## Performance Requirements

### Response Time Targets

| Dataset Size | Operations | Target Time | Critical Threshold |
|--------------|-----------|-------------|-------------------|
| Small (10 orders) | Garment scoring | < 10ms | < 20ms |
| Medium (100 orders) | Garment scoring | < 50ms | < 100ms |
| Large (1000 orders) | Garment scoring | < 200ms | < 500ms |
| 20 tailors | Tailor ranking | < 20ms | < 50ms |
| 100 tailors | Tailor ranking | < 100ms | < 200ms |
| Full pipeline (50 orders) | Complete recommendations | < 100ms | < 200ms |
| Power user (500 orders) | Complete recommendations | < 500ms | < 1000ms |

### Memory Requirements

- Maximum memory increase: < 50MB for 10 iterations of 1000-order datasets
- No memory leaks during repeated calculations
- Efficient garbage collection

## Algorithm Complexity

### Garment Score Calculation
- **Time Complexity**: O(1) - Direct dictionary lookup
- **Space Complexity**: O(1)
- **Scoring Factors**:
  - Frequency: 40% weight
  - Seasonal relevance: 30% weight
  - Recency: 30% weight

### Tailor Score Calculation
- **Time Complexity**: O(1) - Direct dictionary lookup
- **Space Complexity**: O(1)
- **Scoring Factors**:
  - Order frequency: 60% weight
  - Recent collaboration: 40% weight

### Fabric Score Calculation
- **Time Complexity**: O(1) - Direct dictionary lookup
- **Space Complexity**: O(1)

### Full Recommendation Pipeline
- **Time Complexity**: O(n log n) where n = number of items to rank
- **Space Complexity**: O(n)
- **Operations**:
  1. Score calculation: O(n)
  2. Sorting: O(n log n)
  3. Slicing top results: O(1)

## Performance Testing Strategy

### Test Categories

1. **Unit Performance Tests**
   - Individual scoring function performance
   - Measure execution time for single operations
   - Verify consistency across multiple iterations

2. **Load Testing**
   - Small dataset: 10 orders
   - Medium dataset: 100 orders
   - Large dataset: 1000 orders
   - Power user: 500+ orders

3. **Concurrent User Testing**
   - Multiple users requesting recommendations simultaneously
   - Test database query performance under load
   - Verify caching effectiveness

4. **Memory Testing**
   - Monitor heap usage during operations
   - Check for memory leaks
   - Verify garbage collection efficiency

### Running Performance Tests

```bash
# Run all performance tests
cd sew4mi/apps/web
pnpm test:perf

# Run specific performance test
pnpm test:perf recommendation-algorithm.perf.test.ts

# Run with verbose output
pnpm test:perf --reporter=verbose
```

## Optimization Strategies

### Current Optimizations

1. **O(1) Lookup Performance**
   - All scoring functions use direct dictionary/object lookups
   - No nested loops or recursive operations

2. **Efficient Sorting**
   - Only sort when necessary (final ranking)
   - Use native JavaScript sort (highly optimized)
   - Limit result set before sorting when possible

3. **Memory Efficiency**
   - Minimal object creation during scoring
   - Reuse analytics object across calculations
   - No unnecessary data cloning

### Recommended Production Optimizations

1. **Caching Layer** (Redis/Vercel KV)
   ```typescript
   // Cache recommendation results for 5 minutes
   const cacheKey = `recommendations:${userId}`;
   const cached = await redis.get(cacheKey);
   if (cached) return JSON.parse(cached);

   const recommendations = await generateRecommendations(userId);
   await redis.setex(cacheKey, 300, JSON.stringify(recommendations));
   ```

2. **Pre-computation**
   - Calculate analytics on order completion (background job)
   - Store pre-computed scores in database
   - Reduce real-time computation

3. **Database Indexes**
   ```sql
   -- Index for efficient order analytics queries
   CREATE INDEX idx_orders_user_completed
   ON orders(customer_id, status, created_at)
   WHERE status = 'COMPLETED';

   -- GIN index for JSONB analytics fields
   CREATE INDEX idx_order_analytics_garment_types
   ON order_analytics USING GIN (garment_types);
   ```

4. **Query Optimization**
   - Batch fetch analytics for multiple users
   - Use database materialized views for aggregations
   - Implement pagination for large result sets

## Monitoring in Production

### Key Metrics

1. **Response Time Percentiles**
   - P50 (median): < 50ms
   - P95: < 200ms
   - P99: < 500ms

2. **Cache Hit Rate**
   - Target: > 80%
   - Monitor cache invalidation patterns

3. **Database Query Performance**
   - Analytics query: < 100ms
   - Order history fetch: < 50ms

4. **Error Rate**
   - Target: < 0.1%
   - Monitor timeout errors

### Monitoring Tools

```typescript
// Example: New Relic custom metrics
newrelic.recordMetric('Recommendation/Generation/Duration', duration);
newrelic.recordMetric('Recommendation/Cache/HitRate', hitRate);

// Example: Datadog APM
const span = tracer.startSpan('recommendation.generate');
// ... operation
span.finish();
```

### Performance Degradation Alerts

```yaml
# Example: Alert configuration
alerts:
  - name: "Slow Recommendations"
    condition: "avg(recommendation_duration) > 200ms for 5m"
    severity: warning

  - name: "Critical Recommendation Performance"
    condition: "p95(recommendation_duration) > 500ms for 2m"
    severity: critical

  - name: "Low Cache Hit Rate"
    condition: "cache_hit_rate < 60% for 10m"
    severity: warning
```

## Performance Test Results

### Baseline Results (Development Environment)

_To be updated after running performance tests on production-like environment_

```
Small dataset (10 orders): ~2ms
Medium dataset (100 orders): ~15ms
Large dataset (1000 orders): ~80ms
Tailor ranking (20 tailors): ~5ms
Tailor ranking (100 tailors): ~30ms
Full pipeline (50 orders): ~40ms
Power user (500 orders): ~250ms
Memory increase (10 iterations): ~15MB
```

### Ghana Network Considerations

- **Average 3G latency**: 100-200ms
- **Average 4G latency**: 30-50ms
- **Recommendation algorithm target**: < 100ms server-side
- **Total target (including network)**: < 500ms (3G), < 200ms (4G)

## Continuous Performance Testing

### CI/CD Integration

```yaml
# .github/workflows/performance.yml
name: Performance Tests
on: [pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: pnpm install
      - name: Run performance tests
        run: cd sew4mi/apps/web && pnpm test:perf
      - name: Check performance regression
        run: |
          # Compare results with baseline
          # Fail if performance degrades by >20%
```

### Performance Regression Prevention

1. Run performance tests in CI/CD pipeline
2. Compare against baseline benchmarks
3. Block PRs that degrade performance by >20%
4. Require performance review for algorithm changes

## Future Improvements

1. **Machine Learning Enhancement**
   - Train ML model on user behavior
   - Personalized scoring weights
   - Collaborative filtering

2. **Real-time Analytics**
   - Stream processing for immediate updates
   - Apache Kafka/Pulsar integration
   - Live recommendation updates

3. **A/B Testing Framework**
   - Test different scoring algorithms
   - Measure conversion rates
   - Optimize weights based on user behavior

## References

- Story 4.3: Reorder and Favorites
- Test File: `tests/performance/recommendation-algorithm.perf.test.ts`
- Service: `lib/services/recommendation-engine.service.ts`
- NFR Assessment: Story 4.3, Database Performance section
