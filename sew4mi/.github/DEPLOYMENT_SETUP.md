# CI/CD Deployment Setup

This document outlines the required secrets and configuration for the Sew4Mi CI/CD pipeline.

## Required GitHub Secrets

Configure these secrets in your GitHub repository settings (`Settings` → `Secrets and variables` → `Actions`):

### Vercel Deployment Secrets

| Secret Name | Description | How to Get |
|------------|-------------|------------|
| `VERCEL_TOKEN` | Vercel API token for deployments | 1. Go to [Vercel Dashboard](https://vercel.com/account/tokens)<br>2. Click "Create Token"<br>3. Name: "GitHub Actions"<br>4. Scope: Full Account<br>5. Copy the generated token |
| `VERCEL_ORG_ID` | Your Vercel organization/team ID | 1. Run `vercel link` in your project<br>2. Check `.vercel/project.json`<br>3. Copy the `orgId` value |
| `VERCEL_PROJECT_ID` | Your Vercel project ID | 1. Run `vercel link` in your project<br>2. Check `.vercel/project.json`<br>3. Copy the `projectId` value |

### Optional Security & Monitoring Secrets

| Secret Name | Description | Required | How to Get |
|------------|-------------|----------|------------|
| `CODECOV_TOKEN` | Code coverage reporting | No | 1. Sign up at [Codecov.io](https://codecov.io)<br>2. Connect your repository<br>3. Copy the upload token |
| `TURBO_TOKEN` | Turbo Remote Cache token | No | 1. Sign up at [Turbo](https://turbo.build)<br>2. Create a team<br>3. Generate API token |
| `TURBO_TEAM` | Turbo team name | No | Your Turbo team slug |

## Setup Instructions

### 1. Vercel Project Setup

```bash
# In your project root
cd sew4mi
npx vercel link

# This creates .vercel/project.json with your IDs
cat .vercel/project.json
```

### 2. Configure GitHub Secrets

1. Go to your GitHub repository
2. Navigate to `Settings` → `Secrets and variables` → `Actions`
3. Click `New repository secret`
4. Add each secret from the table above

### 3. Environment Variables

Create these files with your environment variables:

#### `apps/web/.env.local` (Development)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
NEXT_TELEMETRY_DISABLED=1
```

#### Vercel Environment Variables (Production)

Configure in Vercel Dashboard → Project Settings → Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `DATABASE_URL`
- `NEXT_TELEMETRY_DISABLED=1`

## CI/CD Pipeline Overview

### Triggered Events

- **Push to `main`/`master`**: Runs full pipeline + production deployment
- **Push to `develop`**: Runs full pipeline (no deployment)
- **Pull Requests**: Runs validation + preview deployment

### Pipeline Stages

1. **Validate & Test**
   - Environment validation
   - Code linting & formatting
   - Type checking
   - Unit tests with coverage

2. **Build Applications**
   - Build all packages
   - Upload build artifacts

3. **E2E Tests**
   - Install Playwright browsers
   - Run end-to-end tests
   - Upload test reports

4. **Security Audit**
   - npm/pnpm audit
   - Trivy vulnerability scanning
   - Upload security reports

5. **Deploy** (Production only)
   - Deploy to Vercel production
   - Create GitHub release

## Troubleshooting

### Common Issues

#### ❌ Vercel deployment fails with "Project not found"
- **Cause**: Incorrect `VERCEL_PROJECT_ID` or `VERCEL_ORG_ID`
- **Solution**: Re-run `vercel link` and update secrets

#### ❌ Tests fail on CI but pass locally
- **Cause**: Environment differences or missing env vars
- **Solution**: Check environment validation step logs

#### ❌ Build artifacts not found in E2E tests
- **Cause**: Build stage failed or artifacts not uploaded properly
- **Solution**: Check build stage logs and artifact paths

### Getting Help

1. Check the Actions tab for detailed logs
2. Review this documentation
3. Verify all secrets are configured correctly
4. Ensure environment variables match between local and production

## Security Best Practices

- ✅ All secrets stored in GitHub Secrets (encrypted)
- ✅ Environment variables validated before builds
- ✅ Dependency vulnerability scanning enabled
- ✅ Code security scanning with Trivy
- ✅ Minimal artifact retention (1 day for builds)
- ✅ Separate environments for preview/production

## Monitoring & Alerts

The pipeline includes:
- Build status notifications
- Security vulnerability alerts
- Dependency update notifications via Dependabot
- Test coverage reporting (if Codecov configured)

Configure GitHub repository notifications in `Settings` → `Notifications` to stay informed of CI/CD events.