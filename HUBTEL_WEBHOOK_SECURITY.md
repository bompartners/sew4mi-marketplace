# Hubtel Webhook Security Implementation

**Last Updated:** October 21, 2025  
**Security Method:** IP Whitelisting (as confirmed by Hubtel Support)  
**Status:** ✅ Implemented

---

## Overview

Hubtel uses **IP whitelisting** to secure webhook callbacks instead of HMAC signature verification. This document explains the implementation and configuration.

## Official Hubtel Guidance

> **From Hubtel Support:**  
> "Your best approach will be to whitelist Hubtel's callback IP addresses to ensure that only requests originating from those IPs are processed and logged."

## Security Implementation

### 1. IP Whitelisting Mechanism

Our webhook endpoint (`/api/webhooks/hubtel`) verifies that incoming requests originate from Hubtel's callback servers by:

1. **Extracting client IP** from request headers (handles proxy scenarios)
2. **Comparing against whitelist** of approved Hubtel IPs
3. **Rejecting unauthorized requests** with 403 Forbidden
4. **Logging all verification attempts** for security audit

### 2. Implementation Files

#### **Utility: IP Whitelist Verification**
**File:** `sew4mi/apps/web/lib/utils/ip-whitelist.ts`

```typescript
// Key functions:
- getClientIp() - Extracts client IP from various proxy headers
- isIpWhitelisted() - Checks if IP is in whitelist (supports CIDR)
- verifyHubtelWebhookIp() - Main verification function
- logIpVerification() - Security audit logging
```

#### **Webhook Endpoint**
**File:** `sew4mi/apps/web/app/api/webhooks/hubtel/route.ts`

```typescript
// Verification flow:
1. Extract client IP from request
2. Check against HUBTEL_CALLBACK_IPS whitelist
3. Reject if not whitelisted (403 Forbidden)
4. Process payment callback if verified
5. Log all attempts for security monitoring
```

## Configuration

### Environment Variables

```bash
# Required for API calls
HUBTEL_CLIENT_ID=your-client-id
HUBTEL_CLIENT_SECRET=your-client-secret
HUBTEL_MERCHANT_ACCOUNT_ID=your-merchant-account-id

# Required for webhook security
HUBTEL_CALLBACK_IPS=ip1,ip2,ip3  # Comma-separated list
HUBTEL_CALLBACK_URL=https://yourdomain.com/api/webhooks/hubtel

# Environment selection
HUBTEL_ENVIRONMENT=sandbox  # or 'production'
```

### Getting Hubtel Callback IPs

**Email Template to Hubtel Support:**

```
Subject: Request for Webhook Callback IP Addresses

Dear Hubtel Support Team,

We are implementing webhook security for the Direct Receive Money API 
and need the callback IP addresses for whitelisting.

Please provide:
1. Production callback IP addresses
2. Sandbox/Test callback IP addresses  
3. Whether these IPs are static or change periodically
4. IPv4 and/or IPv6 addresses
5. CIDR ranges if applicable

Business: [Your Business Name]
Webhook URL: https://yourdomain.com/api/webhooks/hubtel

Thank you,
[Your Name]
```

**Contact Methods:**
- Email: merchants@hubtel.com
- Phone: +233 30 818 1818
- WhatsApp: +233 55 818 1818

## IP Whitelist Configuration

### Single IP Address

```bash
# Single IP
HUBTEL_CALLBACK_IPS=192.168.1.100
```

### Multiple IP Addresses

```bash
# Comma-separated list (no spaces)
HUBTEL_CALLBACK_IPS=192.168.1.100,192.168.1.101,192.168.1.102
```

### CIDR Range Support

```bash
# CIDR notation for IP range
HUBTEL_CALLBACK_IPS=192.168.1.0/24,10.0.0.0/16
```

### Mixed Format

```bash
# Combination of single IPs and CIDR ranges
HUBTEL_CALLBACK_IPS=192.168.1.100,10.0.0.0/16,172.16.0.50
```

## Deployment Configuration

### Local Development

```bash
# .env.local
HUBTEL_CALLBACK_IPS=  # Leave empty for development (logs warning)
HUBTEL_ENVIRONMENT=sandbox
```

**Behavior:** If `HUBTEL_CALLBACK_IPS` is not set, the system:
- Logs a security warning
- Allows all IPs through (development mode)
- Should NEVER be deployed to production without IPs

### Vercel Production

1. **Navigate to:** Vercel Dashboard → Project → Settings → Environment Variables
2. **Add Variable:**
   - **Name:** `HUBTEL_CALLBACK_IPS`
   - **Value:** `ip1,ip2,ip3` (actual IPs from Hubtel)
   - **Environment:** Production
3. **Redeploy** after adding

### Vercel Preview/Staging

```bash
# Use test/sandbox IPs
HUBTEL_CALLBACK_IPS=test_ip1,test_ip2
HUBTEL_ENVIRONMENT=sandbox
```

## Security Features

### 1. Proxy Header Support

Handles various proxy configurations:
- `x-forwarded-for` (Standard)
- `x-real-ip` (Nginx)
- `cf-connecting-ip` (Cloudflare)
- `x-vercel-forwarded-for` (Vercel)
- `x-client-ip` (Alternative)

### 2. CIDR Range Matching

Supports IP ranges for flexibility:
```typescript
// Example: Allow entire subnet
HUBTEL_CALLBACK_IPS=192.168.1.0/24
// Matches: 192.168.1.1 through 192.168.1.254
```

### 3. IPv6 Support

Automatically normalizes IPv6-wrapped IPv4 addresses:
```typescript
// Converts ::ffff:192.168.1.100 → 192.168.1.100
```

### 4. Security Logging

All webhook attempts are logged:

**Successful Verification:**
```json
{
  "timestamp": "2025-10-21T10:30:00Z",
  "clientIp": "192.168.1.100",
  "isValid": true,
  "message": "IP verified successfully",
  "transactionId": "abc123..."
}
```

**Failed Verification (Security Alert):**
```json
{
  "timestamp": "2025-10-21T10:30:00Z",
  "clientIp": "1.2.3.4",
  "isValid": false,
  "message": "IP 1.2.3.4 not in whitelist",
  "transactionId": "N/A"
}
```

## Testing

### Test Webhook Locally

```bash
# Using curl (replace with actual Hubtel IP for testing)
curl -X POST http://localhost:3000/api/webhooks/hubtel \
  -H "Content-Type: application/json" \
  -H "x-forwarded-for: YOUR_HUBTEL_IP" \
  -d '{
    "ResponseCode": "0000",
    "Message": "success",
    "Data": {
      "TransactionId": "test123",
      "Status": "Paid",
      "Amount": 10.00
    }
  }'
```

### Test IP Verification

```typescript
// Test in unit test
import { isIpWhitelisted } from '@/lib/utils/ip-whitelist';

// Test exact match
expect(isIpWhitelisted('192.168.1.100', ['192.168.1.100'])).toBe(true);

// Test CIDR range
expect(isIpWhitelisted('192.168.1.50', ['192.168.1.0/24'])).toBe(true);

// Test unauthorized
expect(isIpWhitelisted('1.2.3.4', ['192.168.1.100'])).toBe(false);
```

## Monitoring & Alerts

### Security Monitoring Checklist

- [ ] Monitor logs for failed IP verification attempts
- [ ] Set up alerts for repeated unauthorized attempts
- [ ] Review security logs weekly
- [ ] Track Hubtel IP changes (if any)
- [ ] Document IP updates in change log

### Recommended Alerts

1. **Multiple Failed Attempts**
   - Trigger: >5 failed verifications from same IP in 5 minutes
   - Action: Investigate potential attack

2. **Unauthorized IP Patterns**
   - Trigger: Failed attempts with valid webhook payload structure
   - Action: Verify Hubtel hasn't changed IPs

3. **Production Without IPs**
   - Trigger: `HUBTEL_CALLBACK_IPS` not configured in production
   - Action: Immediate configuration required

## Troubleshooting

### Issue: Webhooks Rejected (403 Forbidden)

**Possible Causes:**
1. Hubtel changed callback IPs (not updated in config)
2. Incorrect IP format in `HUBTEL_CALLBACK_IPS`
3. Proxy not forwarding correct IP headers

**Solutions:**
```bash
# 1. Check logs for actual IP attempting connection
# Look for: "IP X.X.X.X not in whitelist"

# 2. Verify IP format (no spaces, proper CIDR)
HUBTEL_CALLBACK_IPS=ip1,ip2  # ✅ Correct
HUBTEL_CALLBACK_IPS=ip1, ip2  # ❌ Wrong (has space)

# 3. Temporarily log all IPs for debugging
# Add to webhook route:
console.log('Detected IPs:', {
  forwarded: request.headers.get('x-forwarded-for'),
  real: request.headers.get('x-real-ip'),
  cloudflare: request.headers.get('cf-connecting-ip')
});
```

### Issue: Warning "IP whitelist not configured"

**Cause:** `HUBTEL_CALLBACK_IPS` environment variable not set

**Solution:**
```bash
# Development: Expected, safe to ignore
# Production: MUST be configured immediately

# Set the variable:
HUBTEL_CALLBACK_IPS=actual,hubtel,ips
```

### Issue: All IPs Being Accepted

**Cause:** `HUBTEL_CALLBACK_IPS` is empty or not set

**Risk Level:** 🚨 **CRITICAL** in production

**Solution:**
1. Get IPs from Hubtel support immediately
2. Deploy updated configuration
3. Monitor for suspicious webhook activity in the meantime

## Migration Notes

### What Changed

**Before (Incorrect Implementation):**
- Used HMAC-SHA256 signature verification
- Required `HUBTEL_WEBHOOK_SECRET` variable
- Called `hubtelService.verifyWebhookSignature()`

**After (Current Implementation):**
- Uses IP whitelisting (confirmed by Hubtel)
- Requires `HUBTEL_CALLBACK_IPS` variable
- Calls `verifyHubtelWebhookIp()`

### Removed Code

The following code was removed as it's not used by Hubtel:

```typescript
// ❌ Removed: Signature verification (not used by Hubtel)
verifyWebhookSignature(payload: string, signature: string): boolean
HUBTEL_WEBHOOK_SECRET environment variable
```

## Best Practices

1. **Always Configure in Production**
   - Never deploy without `HUBTEL_CALLBACK_IPS` set
   - Treat as security-critical configuration

2. **Keep IPs Updated**
   - Subscribe to Hubtel updates/notifications
   - Test after Hubtel infrastructure changes
   - Document IP changes in changelog

3. **Monitor Continuously**
   - Set up automated alerts
   - Review security logs regularly
   - Track failed verification patterns

4. **Test Thoroughly**
   - Test with correct IPs (should succeed)
   - Test with wrong IPs (should fail with 403)
   - Test with no IPs configured (should warn)

5. **Document Changes**
   - Log when IPs are updated
   - Note reason for changes
   - Keep history of IP configurations

## Additional Security Layers

While IP whitelisting is the primary security mechanism, consider these additional layers:

### 1. Rate Limiting

```typescript
// Limit webhook requests per IP
const rateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute per IP
});
```

### 2. Idempotency

Already implemented:
- Prevents duplicate webhook processing
- Uses in-memory cache with 5-minute TTL
- Tracks by `transactionId + status`

### 3. Transaction Verification

Always verify via Status Check API:
```typescript
// After processing webhook, confirm with Hubtel API
const verified = await hubtelService.getTransactionStatus(transactionId);
if (verified.status !== webhookStatus) {
  // Security alert: status mismatch
}
```

## References

- **Hubtel Developer Portal:** https://developers.hubtel.com/
- **Direct Receive Money API:** https://developers.hubtel.com/docs/direct-receive-money
- **Support Contact:** merchants@hubtel.com, +233 30 818 1818

---

**Document Version:** 1.0  
**Last Reviewed:** October 21, 2025  
**Next Review:** Quarterly or when Hubtel updates infrastructure

