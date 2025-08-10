# Deployment Guide

## Production Setup Checklist

### 1. GitHub Repository Setup ✅

- [x] Main/develop branch structure configured
- [x] Branch protection rules applied
- [x] GitHub Actions CI/CD pipeline
- [x] Automated dependency updates (Dependabot)
- [x] Code ownership rules

### 2. GitHub Secrets Configuration

Update these placeholder secrets in GitHub repository settings:

```bash
# GitHub -> Settings -> Secrets and variables -> Actions

# Vercel Integration
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-vercel-org-id>
VERCEL_PROJECT_ID=<your-vercel-project-id>

# Build Tools
TURBO_TOKEN=<your-turbo-token>      # Optional: Turborepo Remote Caching
TURBO_TEAM=<your-turbo-team>        # Optional: Turborepo Remote Caching

# Code Quality
CODECOV_TOKEN=<your-codecov-token>  # Optional: Code coverage reports
```

### 3. Vercel Environment Variables

Set these in Vercel dashboard (Project Settings -> Environment Variables):

#### Required Production Variables

```bash
# Database
DATABASE_URL=<supabase-connection-string>
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>

# Authentication
JWT_SECRET=<random-256-bit-key>
NEXTAUTH_URL=<your-production-domain>

# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=<whatsapp-phone-number-id>
WHATSAPP_BUSINESS_ID=<whatsapp-business-id>
WHATSAPP_ACCESS_TOKEN=<whatsapp-access-token>
WHATSAPP_WEBHOOK_VERIFY_TOKEN=<webhook-verify-token>

# Payment Providers
HUBTEL_CLIENT_ID=<hubtel-client-id>
HUBTEL_CLIENT_SECRET=<hubtel-client-secret>
HUBTEL_MERCHANT_ACCOUNT_ID=<hubtel-merchant-account-id>

# External Services
GOOGLE_MAPS_API_KEY=<google-maps-api-key>
RESEND_API_KEY=<resend-api-key>
RESEND_FROM_EMAIL=noreply@sew4mi.com

# Monitoring
SENTRY_DSN=<sentry-backend-dsn>
NEXT_PUBLIC_SENTRY_DSN=<sentry-frontend-dsn>

# Analytics
NEXT_PUBLIC_GA_MEASUREMENT_ID=<google-analytics-id>
```

#### Optional Production Variables

```bash
# MTN Mobile Money (if used)
MTN_MOMO_API_KEY=<mtn-momo-api-key>
MTN_MOMO_API_SECRET=<mtn-momo-api-secret>
MTN_MOMO_SUBSCRIPTION_KEY=<mtn-momo-subscription-key>

# AI/ML Services (if used)
OPENAI_API_KEY=<openai-api-key>
OPENAI_ORGANIZATION_ID=<openai-org-id>
```

### 4. Vercel Project Setup

1. **Connect Repository:**

   ```bash
   # Install Vercel CLI
   npm i -g vercel@latest

   # Login and link project
   vercel login
   vercel link
   ```

2. **Configure Build Settings:**
   - Framework Preset: `Next.js`
   - Build Command: `cd .. && npx turbo build --filter=web`
   - Output Directory: `apps/web/.next`
   - Install Command: `pnpm install`

3. **Set Custom Domains:**
   - Primary: `sew4mi.com`
   - Redirect: `www.sew4mi.com` → `sew4mi.com`

### 5. Database Setup (Supabase)

1. **Create Production Database:**
   - New Supabase project
   - Enable Row Level Security (RLS)
   - Run migrations from `packages/database/supabase/migrations/`

2. **Configure Authentication:**
   - Enable email/password auth
   - Enable phone auth for Ghana numbers
   - Set up OAuth providers (Google, Apple)

3. **Set up Storage:**
   - Create buckets: `avatars`, `portfolios`, `milestones`
   - Configure CDN and image optimization

### 6. External Service Configuration

#### WhatsApp Business API

1. Meta Business Account setup
2. WhatsApp Business Account verification
3. Webhook endpoint: `https://sew4mi.com/api/webhooks/whatsapp`

#### Hubtel Payment Gateway

1. Merchant account setup
2. API credentials generation
3. Webhook endpoint: `https://sew4mi.com/api/webhooks/payment`

#### Google Maps Platform

1. Enable Maps JavaScript API
2. Enable Places API
3. Enable Geocoding API
4. Set API key restrictions

### 7. Monitoring & Analytics Setup

#### Sentry (Error Tracking)

1. Create Sentry project
2. Configure both client and server DSNs
3. Set up release tracking

#### Google Analytics

1. Create GA4 property
2. Configure enhanced ecommerce tracking
3. Set up conversion goals

### 8. DNS & SSL Configuration

```bash
# DNS Records (Cloudflare/your provider)
A     sew4mi.com          76.76.19.61    # Vercel IP
CNAME www.sew4mi.com      sew4mi.com
CNAME api.sew4mi.com      sew4mi.com
```

### 9. Final Deployment Steps

1. **Pre-deployment Checklist:**
   - [ ] All environment variables set
   - [ ] Database migrations applied
   - [ ] External services configured
   - [ ] DNS records pointing to Vercel
   - [ ] SSL certificates issued

2. **Deploy to Production:**

   ```bash
   # Push to main branch triggers automatic deployment
   git checkout main
   git merge develop
   git push origin main
   ```

3. **Post-deployment Verification:**
   - [ ] Site loads correctly
   - [ ] Authentication works
   - [ ] Database connections active
   - [ ] External API integrations functional
   - [ ] Monitoring alerts configured

### 10. Staging Environment

Optional but recommended staging setup:

```bash
# Vercel Preview Environment
NEXT_PUBLIC_APP_ENV=staging
DATABASE_URL=<staging-database-url>
# ... other staging-specific variables
```

## Deployment Commands

```bash
# Local development
pnpm dev --filter=web

# Production build test
pnpm build

# Deploy preview
vercel --env preview

# Deploy production
git push origin main  # Triggers automatic deployment
```

## Troubleshooting

### Common Issues

1. **Build Failures:**
   - Check Node.js version (20.x required)
   - Verify all environment variables are set
   - Check Turbo cache configuration

2. **Runtime Errors:**
   - Verify database connection strings
   - Check external API credentials
   - Review Sentry error logs

3. **Performance Issues:**
   - Enable Vercel Analytics
   - Check bundle sizes with `pnpm analyze`
   - Monitor Core Web Vitals

### Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Deployment Guide](https://nextjs.org/docs/deployment)
- [Turborepo Documentation](https://turbo.build/repo/docs)
