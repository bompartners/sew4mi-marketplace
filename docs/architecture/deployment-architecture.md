# Deployment Architecture

## Deployment Strategy

**Frontend Deployment:**
- **Platform:** Vercel Edge Network
- **Build Command:** `pnpm build:web`
- **Output Directory:** `apps/web/.next`
- **CDN/Edge:** Automatic global CDN with 100+ edge locations

**Backend Deployment:**
- **Platform:** Vercel Serverless Functions
- **Build Command:** `pnpm build:api`
- **Deployment Method:** Automatic via GitHub integration

## CI/CD Pipeline

```yaml