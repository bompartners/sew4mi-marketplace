# Redis / Vercel KV Configuration Guide

## Overview

The Sew4Mi application uses caching for recommendations, analytics, and loyalty data to improve performance. In production, you can use either:
- **Vercel KV** (recommended for Vercel deployments - managed, no configuration needed)
- **Redis** (self-hosted or managed service like Upstash, Railway, etc.)

In development, the app automatically falls back to in-memory caching.

---

## Option 1: Vercel KV (Recommended for Vercel)

Vercel KV is a managed Redis-compatible service, ideal for applications deployed on Vercel.

### Prerequisites

- Vercel account with a deployed project
- Vercel CLI installed (optional): `npm i -g vercel`

### Setup Steps

#### 1. Enable Vercel KV

**Via Vercel Dashboard:**

1. Go to https://vercel.com/dashboard
2. Select your project
3. Navigate to **Storage** tab
4. Click **Create Database**
5. Select **KV (Key-Value)** database type
6. Choose a name (e.g., `sew4mi-cache`)
7. Select your region (choose closest to your users - e.g., `fra1` for Europe, `iad1` for US)
8. Click **Create**

**Via Vercel CLI:**

```bash
cd sew4mi
vercel env pull .env.production.local
vercel kv create sew4mi-cache
```

#### 2. Get Connection Credentials

After creation, Vercel automatically adds these environment variables to your project:

```bash
KV_REST_API_URL=https://your-kv-instance.kv.vercel-storage.com
KV_REST_API_TOKEN=your-token-here
KV_REST_API_READ_ONLY_TOKEN=your-read-only-token-here
```

#### 3. Verify Configuration

```bash
# Pull environment variables locally
vercel env pull .env.local

# Check variables
cat .env.local | grep KV
```

#### 4. Test Connection

Create a test script to verify KV connection:

```typescript
// test-kv.ts
import { kv } from '@vercel/kv';

async function testKV() {
  try {
    // Set a test value
    await kv.set('test-key', 'Hello from Sew4Mi!', { ex: 60 });

    // Get the value
    const value = await kv.get('test-key');
    console.log('✅ Vercel KV connected successfully:', value);

    // Delete the test key
    await kv.del('test-key');
  } catch (error) {
    console.error('❌ Vercel KV connection failed:', error);
  }
}

testKV();
```

Run test:
```bash
npx tsx test-kv.ts
```

#### 5. Deploy

```bash
vercel --prod
```

Vercel will automatically inject the KV credentials into your production environment.

---

## Option 2: Self-Hosted Redis

Use this option if you're deploying to a non-Vercel platform or want more control.

### Option 2A: Upstash Redis (Serverless, Recommended)

Upstash provides serverless Redis with pay-per-request pricing.

#### Setup Steps

1. **Create Account:**
   - Go to https://upstash.com
   - Sign up for free account

2. **Create Database:**
   - Click **Create Database**
   - Name: `sew4mi-cache`
   - Region: Choose closest to your app (e.g., `eu-west-1`)
   - Type: Select **Regional** (cheaper) or **Global** (better latency)
   - Click **Create**

3. **Get Connection String:**
   - Copy the **REST URL** and **REST Token** from the dashboard
   - Or copy the **Redis URL** for direct connection

4. **Add to Environment Variables:**

```bash
# .env.production
REDIS_URL=https://your-region.upstash.io
REDIS_TOKEN=your-token-here

# Or use REST API
KV_REST_API_URL=https://your-region-rest.upstash.io
KV_REST_API_TOKEN=your-rest-token-here
```

5. **Test Connection:**

```typescript
// test-redis.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

async function testRedis() {
  try {
    await redis.set('test-key', 'Hello from Sew4Mi!', 'EX', 60);
    const value = await redis.get('test-key');
    console.log('✅ Redis connected successfully:', value);
    await redis.del('test-key');
    await redis.quit();
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
  }
}

testRedis();
```

#### Pricing (Upstash Free Tier)
- 10,000 commands/day
- 256MB storage
- Great for development and small production deployments

---

### Option 2B: Railway Redis

Railway provides easy Redis deployment with automatic scaling.

#### Setup Steps

1. **Create Account:**
   - Go to https://railway.app
   - Sign up with GitHub

2. **Create Project:**
   - Click **New Project**
   - Select **Deploy Redis**

3. **Get Connection Details:**
   - Copy **REDIS_URL** from the Variables tab

4. **Add to Environment:**

```bash
# .env.production
REDIS_URL=redis://default:password@redis.railway.internal:6379
```

#### Pricing (Railway)
- $5/month base + usage
- First $5 free credit

---

### Option 2C: Traditional Redis (Docker/VPS)

For self-managed Redis deployment.

#### Docker Setup

```bash
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass your-strong-password

volumes:
  redis_data:
```

Start Redis:
```bash
docker-compose up -d
```

#### Environment Variables

```bash
# .env.production
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-strong-password

# Or use URL
REDIS_URL=redis://:your-strong-password@localhost:6379
```

---

## Application Configuration

The application automatically detects which caching backend to use:

### Priority Order

1. **Vercel KV** (if `KV_REST_API_URL` and `KV_REST_API_TOKEN` are set)
2. **Redis** (if `REDIS_URL` is set)
3. **In-Memory Cache** (fallback for development)

### Configuration File

Location: `sew4mi/apps/web/lib/services/cache.service.ts`

```typescript
export function createCacheService(): CacheService {
  // Production: Use Vercel KV if available
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    return new VercelKVCacheService();
  }

  // Production: Use Redis if URL is provided
  if (process.env.REDIS_URL) {
    return new RedisCacheService(process.env.REDIS_URL);
  }

  // Development: Use in-memory cache
  return new InMemoryCacheService();
}
```

---

## Environment Variables Reference

### Vercel KV

```bash
KV_REST_API_URL=https://your-instance.kv.vercel-storage.com
KV_REST_API_TOKEN=your-token-here
KV_REST_API_READ_ONLY_TOKEN=your-read-only-token-here (optional)
```

### Redis (URL Format)

```bash
REDIS_URL=redis://[username]:[password]@[host]:[port]
```

Examples:
```bash
# Upstash
REDIS_URL=rediss://default:xxxxx@us1-brave-elk-12345.upstash.io:6379

# Railway
REDIS_URL=redis://default:xxxxx@containers-us-west-xxx.railway.app:6379

# Local Docker
REDIS_URL=redis://:your-password@localhost:6379
```

### Redis (Individual Fields)

```bash
REDIS_HOST=your-redis-host.com
REDIS_PORT=6379
REDIS_PASSWORD=your-password
```

---

## Cache Keys Used

The application uses these cache key patterns:

| Pattern | Purpose | TTL | Example |
|---------|---------|-----|---------|
| `recommendations:{userId}:{type}:{limit}` | User recommendations | 5 min | `recommendations:abc-123:garment:10` |
| `analytics:{userId}` | User order analytics | 10 min | `analytics:abc-123` |
| `loyalty:account:{userId}` | Loyalty account | 2 min | `loyalty:account:abc-123` |
| `tailor:profile:{tailorId}` | Tailor profile | 30 min | `tailor:profile:xyz-789` |

---

## Monitoring & Management

### View Cache Contents

**Vercel KV:**
```bash
# Install Vercel CLI
npm i -g vercel

# Connect to KV
vercel kv get recommendations:user-123:garment:10

# List all keys
vercel kv keys "recommendations:*"
```

**Redis CLI:**
```bash
# Connect to Redis
redis-cli -u $REDIS_URL

# View all keys
KEYS *

# Get specific key
GET recommendations:user-123:garment:10

# View key TTL
TTL recommendations:user-123:garment:10

# Delete key
DEL recommendations:user-123:garment:10

# Flush all cache (use carefully!)
FLUSHALL
```

### Cache Statistics

**Via Application API:**

Create an admin endpoint:

```typescript
// app/api/admin/cache-stats/route.ts
import { NextResponse } from 'next/server';
import { createCacheService } from '@/lib/services/cache.service';

export async function GET() {
  const cache = createCacheService();

  // Get statistics (implementation depends on cache type)
  const stats = {
    type: process.env.KV_REST_API_URL ? 'Vercel KV' : process.env.REDIS_URL ? 'Redis' : 'In-Memory',
    status: 'connected',
  };

  return NextResponse.json(stats);
}
```

---

## Performance Tuning

### Cache Hit Rate Optimization

**Target: > 80% hit rate**

Monitor hit rates and adjust TTLs:

```typescript
// Short TTL (2 min) for frequently changing data
CACHE_TTL.LOYALTY_ACCOUNT = 2 * 60;

// Medium TTL (5 min) for moderate change frequency
CACHE_TTL.RECOMMENDATIONS = 5 * 60;

// Long TTL (30 min) for rarely changing data
CACHE_TTL.TAILOR_PROFILE = 30 * 60;
```

### Memory Management

**Vercel KV Limits:**
- Free tier: 256 MB
- Pro tier: 512 MB - 10 GB

**Redis Maxmemory Policy:**

```bash
# Set eviction policy (Upstash dashboard or redis.conf)
maxmemory-policy allkeys-lru  # Evict least recently used keys
```

**Monitor memory usage:**

```bash
# Redis CLI
redis-cli -u $REDIS_URL INFO memory
```

---

## Troubleshooting

### Connection Errors

**Problem: "Connection refused"**

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solutions:**
1. Check if Redis is running: `redis-cli ping` (should return `PONG`)
2. Verify `REDIS_URL` in environment variables
3. Check firewall rules allow connection to Redis port
4. For Docker: Ensure Redis container is running: `docker ps`

---

**Problem: "Authentication failed"**

```
Error: ERR invalid password
```

**Solutions:**
1. Verify `REDIS_PASSWORD` is correct
2. Check password format in URL: `redis://:password@host:port`
3. Try URL encoding special characters in password

---

**Problem: "Timeout"**

```
Error: Connection timeout
```

**Solutions:**
1. Increase timeout in Redis client configuration
2. Check network latency between app and Redis
3. Verify Redis host is accessible

---

### Performance Issues

**Problem: High cache miss rate**

**Solutions:**
1. Check TTL values aren't too short
2. Verify cache invalidation isn't too aggressive
3. Monitor cache key patterns for correctness

**Problem: Slow cache operations**

**Solutions:**
1. Check Redis memory usage (might be swapping to disk)
2. Verify network latency to Redis instance
3. Consider upgrading to faster Redis tier
4. Enable connection pooling

---

### Debugging

**Enable debug logging:**

```bash
# .env.local
DEBUG=cache:*
```

**Add to cache.service.ts:**

```typescript
if (process.env.DEBUG?.includes('cache')) {
  console.log('[Cache] Operation:', operation, 'Key:', key);
}
```

---

## Security Best Practices

### 1. Use Strong Passwords

```bash
# Generate secure password
openssl rand -base64 32
```

### 2. Enable TLS/SSL

```bash
# Use rediss:// (with double 's') for encrypted connections
REDIS_URL=rediss://default:password@host:port
```

### 3. Restrict Network Access

- Use firewall rules to allow only app servers
- Use VPC/private networking when possible
- Don't expose Redis to public internet

### 4. Rotate Credentials

- Rotate passwords every 90 days
- Use separate credentials for dev/staging/production
- Never commit credentials to git

### 5. Monitor Access

- Enable Redis audit logging
- Set up alerts for unusual access patterns
- Monitor for failed authentication attempts

---

## Production Checklist

Before deploying to production:

- [ ] Redis/Vercel KV credentials configured
- [ ] Connection tested successfully
- [ ] TTL values tuned for your use case
- [ ] Monitoring/alerts set up
- [ ] Backup strategy defined (for self-hosted Redis)
- [ ] Security hardening applied
- [ ] Load testing performed
- [ ] Fallback behavior tested (cache unavailable)
- [ ] Documentation updated with your setup

---

## Cost Optimization

### Vercel KV Pricing

| Tier | Price | Storage | Commands/Day |
|------|-------|---------|--------------|
| Hobby (Free) | $0 | 256 MB | Unlimited |
| Pro | $10/month | 512 MB | Unlimited |
| Enterprise | Custom | Custom | Unlimited |

**Recommendation:** Start with Hobby tier, upgrade as needed.

### Upstash Redis Pricing

| Tier | Price | Commands | Storage |
|------|-------|----------|---------|
| Free | $0 | 10K/day | 256 MB |
| Pay-as-you-go | $0.20 per 100K | Unlimited | $0.25/GB |

**Recommendation:** Free tier for dev/small apps, pay-as-you-go for production.

### Cost Reduction Tips

1. **Optimize TTLs:** Longer TTLs = fewer database queries but stale data
2. **Batch Operations:** Use pipelines for multiple commands
3. **Compression:** Compress large cached values
4. **Lazy Loading:** Only cache what's frequently accessed
5. **Monitor Usage:** Track command count and optimize hot paths

---

## Support & Resources

### Vercel KV
- Documentation: https://vercel.com/docs/storage/vercel-kv
- Dashboard: https://vercel.com/dashboard/stores
- Support: https://vercel.com/support

### Upstash
- Documentation: https://docs.upstash.com/redis
- Console: https://console.upstash.com
- Discord: https://discord.gg/upstash

### Redis
- Documentation: https://redis.io/docs
- Command Reference: https://redis.io/commands
- Best Practices: https://redis.io/docs/manual/patterns

---

## Next Steps

After configuration:

1. ✅ Verify cache is working: Check application logs for cache HIT/MISS
2. ✅ Run load tests: Ensure performance meets requirements
3. ✅ Set up monitoring: Track cache hit rates and latency
4. ✅ Document your setup: Add specifics to team wiki
5. ✅ Deploy to production: Follow deployment checklist

**Configuration complete! Your caching layer is ready for production.** 🚀
