# Story 4.3: Deployment Checklist

## Overview

This checklist ensures Story 4.3 (Reorder and Favorites) is properly deployed to production with all features, optimizations, and monitoring in place.

---

## Pre-Deployment

### 1. Database Setup

- [x] Main migration applied: `20241011120000_reorder_favorites_loyalty.sql`
- [ ] **GIN indexes applied**: Run `node scripts/apply-gin-indexes.js`
- [ ] Verify tables exist:
  ```sql
  SELECT tablename FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('favorite_orders', 'loyalty_accounts', 'loyalty_transactions', 'loyalty_rewards', 'order_analytics');
  ```
- [ ] Verify GIN indexes exist:
  ```sql
  SELECT indexname FROM pg_indexes
  WHERE tablename = 'order_analytics'
    AND indexname LIKE '%_gin';
  ```
- [ ] Seed loyalty rewards data (included in migration)

### 2. Cache Configuration

**Choose ONE option:**

#### Option A: Vercel KV (Recommended for Vercel)

- [ ] Go to https://vercel.com/dashboard/stores
- [ ] Create KV database: `sew4mi-cache`
- [ ] Credentials automatically injected by Vercel
- [ ] No manual environment variable configuration needed

#### Option B: Redis (Other platforms)

- [ ] **Interactive setup**: Run `node scripts/setup-cache.js`
- [ ] **Manual setup**: Follow `docs/deployment/redis-vercel-kv-setup.md`
- [ ] Set environment variables:
  - [ ] `REDIS_URL` or `KV_REST_API_URL` + `KV_REST_API_TOKEN`
- [ ] Test connection:
  ```bash
  node -e "const Redis = require('ioredis'); const r = new Redis(process.env.REDIS_URL); r.ping().then(console.log);"
  ```

### 3. Twilio Configuration (WhatsApp Notifications)

- [ ] Create Twilio account: https://www.twilio.com
- [ ] Purchase phone number or set up WhatsApp sandbox
- [ ] Set environment variables:
  ```bash
  TWILIO_ACCOUNT_SID=your_account_sid
  TWILIO_AUTH_TOKEN=your_auth_token
  TWILIO_PHONE_NUMBER=your_phone_number
  TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
  WEBHOOK_BASE_URL=https://your-domain.com
  ```
- [ ] Test WhatsApp notification:
  ```bash
  # Join sandbox (development)
  # Send "join [code]" to +1 415 523 8886

  # Test in application
  # Complete an order and verify WhatsApp notification received
  ```

### 4. Environment Variables

Verify all required variables are set:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=✓
NEXT_PUBLIC_SUPABASE_ANON_KEY=✓
SUPABASE_SERVICE_ROLE_KEY=✓

# Cache (one of these)
KV_REST_API_URL=✓ (Vercel KV)
KV_REST_API_TOKEN=✓ (Vercel KV)
# OR
REDIS_URL=✓ (Redis)

# Twilio
TWILIO_ACCOUNT_SID=✓
TWILIO_AUTH_TOKEN=✓
TWILIO_PHONE_NUMBER=✓
TWILIO_WHATSAPP_NUMBER=✓

# Service Worker
NEXT_PUBLIC_ENABLE_SW=true (production)

# Optional
WEBHOOK_BASE_URL=✓ (for Twilio webhooks)
```

Check with:
```bash
# Vercel
vercel env pull

# Other platforms
cat .env.production | grep -E "(SUPABASE|REDIS|KV|TWILIO)"
```

### 5. Code Build & Tests

- [ ] All tests pass:
  ```bash
  cd sew4mi/apps/web
  pnpm test
  pnpm test:e2e
  pnpm test:perf
  ```
- [ ] TypeScript compilation succeeds:
  ```bash
  pnpm typecheck
  ```
- [ ] Build succeeds:
  ```bash
  pnpm build
  ```
- [ ] No console errors in build output

---

## Deployment

### 1. Deploy Application

**Vercel:**
```bash
vercel --prod
```

**Other platforms:**
```bash
# Build
pnpm build

# Deploy (platform-specific)
# Example: Railway, AWS, etc.
```

### 2. Post-Deployment Verification

- [ ] Application loads successfully
- [ ] Service worker registered (check DevTools → Application → Service Workers)
- [ ] Cache is working:
  ```bash
  # Check API response headers
  curl -I https://your-domain.com/api/recommendations
  # Look for: X-Cache: HIT or MISS
  ```

### 3. Smoke Tests

Run these tests to verify core functionality:

#### Favorites
- [ ] Add order to favorites
- [ ] View favorites list
- [ ] Edit favorite nickname
- [ ] Remove favorite
- [ ] Share favorite with family member

#### Loyalty
- [ ] View loyalty dashboard
- [ ] Complete order (verify points awarded)
- [ ] Check WhatsApp notification received
- [ ] Redeem reward
- [ ] View transaction history

#### Reorder
- [ ] Click reorder button on past order
- [ ] Modify garment options
- [ ] Verify pricing calculation
- [ ] Complete reorder

#### Recommendations
- [ ] View recommendations
- [ ] Verify personalized suggestions
- [ ] Check cache hit rate (2nd request should be cached)

#### Offline
- [ ] Disconnect network
- [ ] Verify offline indicator shows
- [ ] Browse cached pages (favorites, loyalty)
- [ ] Reconnect network
- [ ] Verify background sync

---

## Monitoring Setup

### 1. Cache Monitoring

**Vercel KV:**
- [ ] Access Vercel dashboard → Storage → KV
- [ ] Monitor command count
- [ ] Set up alerts for high usage

**Redis:**
- [ ] Monitor memory usage:
  ```bash
  redis-cli -u $REDIS_URL INFO memory
  ```
- [ ] Monitor command stats:
  ```bash
  redis-cli -u $REDIS_URL INFO stats
  ```

### 2. Application Monitoring

Set up monitoring for:

- [ ] **Cache hit rate**: Target > 80%
  ```sql
  -- Query application logs for cache HIT/MISS
  SELECT
    SUM(CASE WHEN cache_status = 'HIT' THEN 1 ELSE 0 END)::float / COUNT(*) * 100 as hit_rate
  FROM api_logs
  WHERE endpoint = '/api/recommendations'
    AND created_at > NOW() - INTERVAL '1 hour';
  ```

- [ ] **API latency**: Target P95 < 200ms
  - Recommendations API
  - Loyalty redemption API
  - Reorder API

- [ ] **WhatsApp notification delivery**: Target > 95%
  - Track successful sends
  - Monitor Twilio logs for failures

- [ ] **Database query performance**:
  ```sql
  -- Check slow queries
  SELECT query, mean_exec_time, calls
  FROM pg_stat_statements
  WHERE query LIKE '%order_analytics%'
  ORDER BY mean_exec_time DESC
  LIMIT 10;
  ```

### 3. Error Tracking

- [ ] Set up error tracking (Sentry, Rollbar, etc.)
- [ ] Monitor error rates for:
  - Cache connection failures
  - Twilio API failures
  - Database query errors
  - Rate limit violations

### 4. Alerts Configuration

Set up alerts for:

- [ ] Cache hit rate drops below 70%
- [ ] API P95 latency exceeds 500ms
- [ ] WhatsApp delivery rate drops below 90%
- [ ] Rate limit violations spike
- [ ] Database query time exceeds 1 second
- [ ] GIN index bloat (index size > 5x table size)

---

## Performance Validation

### 1. Load Testing

Run load tests to validate performance under load:

```bash
# Install k6 or artillery
npm install -g artillery

# Create load test script
cat > load-test.yml << EOF
config:
  target: https://your-domain.com
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: Recommendations
    flow:
      - get:
          url: /api/recommendations
  - name: Loyalty
    flow:
      - get:
          url: /api/loyalty/account
EOF

# Run load test
artillery run load-test.yml
```

**Targets:**
- [ ] Recommendations API: < 100ms average
- [ ] Cache hit rate: > 80%
- [ ] No errors under load
- [ ] Database CPU: < 70%

### 2. Performance Benchmarks

Verify performance meets targets:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Garment lookup (100K records) | < 15ms | __ ms | ☐ |
| Recommendation API (cached) | < 50ms | __ ms | ☐ |
| Recommendation API (uncached) | < 200ms | __ ms | ☐ |
| Image loading (3G) | < 2s | __ s | ☐ |
| Long list rendering (1000 items) | < 50 DOM nodes | __ nodes | ☐ |
| First Contentful Paint | < 2s | __ s | ☐ |

### 3. Cache Warm-up

Pre-populate cache for active users:

```bash
# Run cache warm-up script (create if needed)
node scripts/warm-cache.js

# Or manually
curl https://your-domain.com/api/recommendations?userId=user-1
curl https://your-domain.com/api/recommendations?userId=user-2
# ... repeat for top N users
```

---

## Rollback Plan

In case of issues, follow this rollback procedure:

### 1. Quick Rollback (Application)

**Vercel:**
```bash
# Rollback to previous deployment
vercel rollback
```

**Other platforms:**
- Redeploy previous version
- Or use platform-specific rollback

### 2. Database Rollback

**If GIN indexes cause issues:**

```sql
-- Disable problematic indexes (don't drop immediately)
DROP INDEX CONCURRENTLY idx_order_analytics_garment_type_gin;
DROP INDEX CONCURRENTLY idx_order_analytics_fabric_gin;
DROP INDEX CONCURRENTLY idx_order_analytics_color_gin;
DROP INDEX CONCURRENTLY idx_order_analytics_seasonal_gin;
```

**If migration causes issues:**

```bash
# Restore database backup
# Platform-specific restoration process
```

### 3. Feature Flags (Future Enhancement)

Consider adding feature flags for:
- WhatsApp notifications
- Recommendations caching
- Virtual scrolling
- Offline mode

---

## Post-Deployment

### 1. Documentation

- [ ] Update team wiki with deployment details
- [ ] Document cache configuration chosen
- [ ] Document monitoring dashboard URLs
- [ ] Document rollback procedures

### 2. Team Communication

- [ ] Announce deployment to team
- [ ] Share monitoring dashboard links
- [ ] Document any issues encountered
- [ ] Schedule post-deployment review (1 week)

### 3. User Communication (if applicable)

- [ ] Announce new features to users
- [ ] Update help documentation
- [ ] Monitor user feedback

---

## Maintenance Schedule

### Daily
- [ ] Check error rates
- [ ] Review cache hit rates
- [ ] Monitor API latencies

### Weekly
- [ ] Review performance trends
- [ ] Check database query performance
- [ ] Review WhatsApp delivery rates
- [ ] Analyze user feedback

### Monthly
- [ ] Run comprehensive load tests
- [ ] Review and optimize slow queries
- [ ] Check GIN index bloat
- [ ] Rotate credentials (Twilio, Redis)
- [ ] Run VACUUM ANALYZE on order_analytics

### Quarterly
- [ ] Review caching strategy effectiveness
- [ ] Optimize cache TTLs based on usage patterns
- [ ] Review and update monitoring thresholds
- [ ] Run VACUUM FULL during maintenance window
- [ ] REINDEX order_analytics table

---

## Troubleshooting Guide

### Cache Issues

**Problem: Low cache hit rate (< 70%)**
- Check TTL values
- Verify cache invalidation isn't too aggressive
- Monitor cache key patterns

**Problem: Cache connection failures**
- Verify Redis/Vercel KV credentials
- Check network connectivity
- Verify graceful degradation works (app still functions)

### WhatsApp Issues

**Problem: Notifications not sending**
- Verify Twilio credentials
- Check phone number format (Ghana: +233...)
- Review Twilio dashboard for errors
- Verify webhook URL is accessible

**Problem: High delivery failures**
- Check Twilio account balance
- Verify phone numbers are valid
- Review Twilio error codes

### Performance Issues

**Problem: Slow API responses**
- Check cache is working
- Review database query performance
- Check GIN indexes are being used
- Monitor database CPU/memory

**Problem: Slow page loads**
- Verify service worker is active
- Check image optimization is working
- Review bundle size
- Check virtual scrolling is active for long lists

---

## Success Criteria

✅ **All items checked in Pre-Deployment section**
✅ **All smoke tests pass**
✅ **Performance meets targets**
✅ **Monitoring dashboards configured**
✅ **No critical errors in first 24 hours**
✅ **Cache hit rate > 70% after 1 hour**
✅ **WhatsApp notifications delivering successfully**

---

## References

- Story Document: `docs/stories/4.3.story.md`
- Complete Summary: `STORY_4.3_COMPLETE_SUMMARY.md`
- Cache Setup: `docs/deployment/redis-vercel-kv-setup.md`
- Cache Strategy: `docs/architecture/cache-invalidation-strategy.md`
- GIN Indexes: `docs/database/gin-indexes-optimization.md`
- Performance Benchmarks: `docs/performance/recommendation-algorithm-benchmarks.md`

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Sign-off**: _______________
