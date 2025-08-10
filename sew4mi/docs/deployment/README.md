# Deployment Guide

## Overview

Sew4Mi is deployed using Vercel for the frontend and Supabase for the backend services.

## Prerequisites

- Vercel account
- GitHub repository
- Environment variables configured

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

Required variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`

## Development Deployment

1. Install dependencies:

```bash
pnpm install
```

2. Start development server:

```bash
pnpm dev
```

3. Run tests:

```bash
pnpm test
```

## Production Deployment

### Vercel Deployment

1. Connect your GitHub repository to Vercel
2. Configure environment variables in Vercel dashboard
3. Set build command: `pnpm build:web`
4. Set output directory: `apps/web/.next`
5. Deploy

### Manual Build

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Start production server
pnpm start
```

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration:

- **Lint**: Code quality checks
- **Test**: Unit and integration tests
- **E2E**: End-to-end testing with Playwright
- **Build**: Production build verification

## Monitoring

- **Vercel Analytics**: Built-in performance monitoring
- **Sentry**: Error tracking (configured but not enabled)
- **Lighthouse CI**: Performance monitoring in CI/CD

## Rollback Strategy

1. Revert the problematic commit
2. Redeploy from the previous stable commit
3. Monitor error rates and performance metrics
