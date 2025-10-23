/**
 * IP Whitelisting Utility
 * Used to verify requests from trusted sources (e.g., Hubtel webhooks)
 */

import { NextRequest } from 'next/server';

/**
 * Hubtel callback IP addresses
 * TODO: Replace with actual IPs from Hubtel support
 * @see https://developers.hubtel.com/
 */
const HUBTEL_CALLBACK_IPS = (process.env.HUBTEL_CALLBACK_IPS || '').split(',').filter(Boolean);

/**
 * Extract client IP address from Next.js request
 * Handles various proxy headers (Vercel, Cloudflare, etc.)
 * 
 * @param request - Next.js request object
 * @returns Client IP address or null if not found
 */
export function getClientIp(request: NextRequest): string | null {
  // Try various headers in order of preference
  const headers = [
    'x-forwarded-for',      // Standard proxy header
    'x-real-ip',            // Nginx proxy
    'cf-connecting-ip',     // Cloudflare
    'x-vercel-forwarded-for', // Vercel
    'x-client-ip',          // Alternative
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for can contain multiple IPs (client, proxy1, proxy2)
      // The first IP is the original client
      const ip = value.split(',')[0].trim();
      if (ip) {
        return ip;
      }
    }
  }

  // Fallback to connection remote address (may not work on serverless)
  return request.ip || null;
}

/**
 * Check if IP address is in whitelist
 * Supports both exact IP matching and CIDR ranges
 * 
 * @param ip - IP address to check
 * @param whitelist - Array of whitelisted IPs or CIDR ranges
 * @returns True if IP is whitelisted
 */
export function isIpWhitelisted(ip: string | null, whitelist: string[]): boolean {
  if (!ip || whitelist.length === 0) {
    return false;
  }

  // Normalize IP (remove IPv6 wrapper if present)
  const normalizedIp = ip.replace(/^::ffff:/, '');

  for (const whitelistedEntry of whitelist) {
    // Check for CIDR notation
    if (whitelistedEntry.includes('/')) {
      if (isIpInCidrRange(normalizedIp, whitelistedEntry)) {
        return true;
      }
    } else {
      // Exact IP match
      if (normalizedIp === whitelistedEntry) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if IP is in CIDR range
 * Simple implementation for IPv4
 * 
 * @param ip - IP address to check
 * @param cidr - CIDR notation (e.g., "192.168.1.0/24")
 * @returns True if IP is in range
 */
function isIpInCidrRange(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = ~(2 ** (32 - parseInt(bits, 10)) - 1);
  
  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(range);
  
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Convert IPv4 address to number
 * 
 * @param ip - IPv4 address
 * @returns Numeric representation
 */
function ipToNumber(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Verify Hubtel webhook request by IP
 * 
 * @param request - Next.js request object
 * @returns Object with verification result and details
 */
export function verifyHubtelWebhookIp(request: NextRequest): {
  isValid: boolean;
  clientIp: string | null;
  message: string;
} {
  const clientIp = getClientIp(request);
  
  if (!clientIp) {
    return {
      isValid: false,
      clientIp: null,
      message: 'Unable to determine client IP address'
    };
  }

  if (HUBTEL_CALLBACK_IPS.length === 0) {
    console.warn('SECURITY WARNING: HUBTEL_CALLBACK_IPS not configured. Webhook IP verification disabled.');
    return {
      isValid: true, // Allow through if not configured (development mode)
      clientIp,
      message: 'IP whitelist not configured - verification skipped'
    };
  }

  const isWhitelisted = isIpWhitelisted(clientIp, HUBTEL_CALLBACK_IPS);

  return {
    isValid: isWhitelisted,
    clientIp,
    message: isWhitelisted 
      ? 'IP verified successfully'
      : `IP ${clientIp} not in whitelist`
  };
}

/**
 * Log IP verification attempt for security audit
 * 
 * @param verification - Verification result
 * @param transactionId - Transaction ID for reference
 */
export function logIpVerification(
  verification: ReturnType<typeof verifyHubtelWebhookIp>,
  transactionId?: string
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    clientIp: verification.clientIp,
    isValid: verification.isValid,
    message: verification.message,
    transactionId: transactionId || 'N/A',
  };

  if (verification.isValid) {
    console.log('Webhook IP verification:', logData);
  } else {
    console.error('SECURITY ALERT - Unauthorized webhook attempt:', logData);
  }
}

