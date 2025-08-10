# Security and Performance

## Security Requirements

**Frontend Security:**
- CSP Headers: `default-src 'self'; script-src 'self' 'unsafe-inline' https://vercel.live; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com;`
- XSS Prevention: Input sanitization with DOMPurify, React's built-in escaping, CSP headers
- Secure Storage: JWT tokens in httpOnly cookies, sensitive data encrypted in localStorage with Web Crypto API

**Backend Security:**
- Input Validation: Zod schemas for all API inputs, SQL injection prevention via Supabase parameterized queries
- Rate Limiting: 100 requests/minute per IP for API endpoints, 10 requests/minute for auth endpoints, 1000 messages/hour for WhatsApp webhooks
- CORS Policy: `https://sew4mi.com, https://*.sew4mi.com, http://localhost:3000` for development

**Authentication Security:**
- Token Storage: JWT in httpOnly cookies with SameSite=strict, 1-hour access tokens with 7-day refresh tokens
- Session Management: Supabase Auth with automatic token refresh, server-side session validation
- Password Policy: Minimum 8 characters, uppercase, lowercase, number, special character required

## Performance Optimization

**Frontend Performance:**
- Bundle Size Target: Initial JS payload <200KB gzipped, total page weight <1MB
- Loading Strategy: Critical CSS inline, non-critical CSS lazy-loaded, route-based code splitting
- Caching Strategy: Service worker for offline functionality, React Query for API response caching, Vercel edge caching for static assets

**Backend Performance:**
- Response Time Target: <500ms for API endpoints within Ghana, <200ms for cached responses
- Database Optimization: Indexed foreign keys, query optimization with EXPLAIN ANALYZE, read replicas for analytics
- Caching Strategy: Redis for session data, Vercel KV for rate limiting, PostgreSQL query result caching
