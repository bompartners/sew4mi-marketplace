# Vercel Documentation

Vercel's Frontend Cloud provides the infrastructure and developer experience to build, scale, and secure a faster, more personalized web. It's the deployment platform for the Sew4Mi Next.js application.

## Core Concepts for Sew4Mi

### Deployment
- **Git Integration**: Automatic deployments from GitHub repository
- **Preview Deployments**: Every pull request gets a unique preview URL
- **Production Deployment**: Automatic production deployments from main branch

### Environment Variables
- **Environment-specific config**: Different values for development, preview, and production
- **Secret management**: Secure storage of API keys and sensitive data
- **System variables**: Access to Vercel-provided environment information

## Key Integration Patterns

### Next.js Configuration

```javascript
// next.config.js
module.exports = {
  // Vercel automatically optimizes for serverless
  experimental: {
    serverMinification: false,
  },
  images: {
    domains: ['vercel.com'],
  },
}
```

### Environment Configuration

```bash
# .env.local (local development)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url

# Vercel-specific variables
VERCEL_URL=your-app.vercel.app
VERCEL_ENV=production
```

### Serverless Functions

```typescript
// api/webhook.ts
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // Process webhook data
  return NextResponse.json({ success: true })
}

export const runtime = 'edge' // Optional: Use Edge Runtime
```

### Build Configuration

```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev --filter=web",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["fra1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

## Environment Variables for Sew4Mi

### System Variables (Provided by Vercel)
```bash
VERCEL=1                           # Indicates running on Vercel
VERCEL_ENV=production              # Environment (production, preview, development)
VERCEL_URL=sew4mi.vercel.app      # Deployment URL
VERCEL_REGION=fra1                # Deployment region
VERCEL_GIT_COMMIT_SHA=abc123      # Git commit hash
VERCEL_GIT_COMMIT_MESSAGE="feat: add auth"
```

### Custom Variables (Set in Dashboard)
```bash
# Database
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# External Services
WHATSAPP_API_KEY=...
HUBTEL_CLIENT_ID=...
HUBTEL_CLIENT_SECRET=...

# App Configuration
NEXT_PUBLIC_APP_URL=https://sew4mi.vercel.app
```

## Performance Optimization

### Edge Functions
```typescript
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  // Runs at the edge for faster response times
  return NextResponse.json({ message: 'Hello from the edge!' })
}
```

### Image Optimization
```typescript
import Image from 'next/image'

export default function TailorProfile() {
  return (
    <Image
      src="/tailor-photo.jpg"
      alt="Tailor profile"
      width={400}
      height={400}
      priority // Loads image with high priority
    />
  )
}
```

### Analytics Integration
```javascript
// vercel.json
{
  "analytics": {
    "id": "your-analytics-id"
  },
  "speedInsights": {
    "id": "your-speed-insights-id"
  }
}
```

## Deployment Workflow

### Automatic Deployments
1. **Push to GitHub**: Code changes trigger deployment
2. **Build Process**: Vercel runs build command (`pnpm build`)
3. **Preview URL**: Each PR gets unique preview URL
4. **Production**: Merges to main deploy to production

### Manual Deployment
```bash
# Using Vercel CLI
npm i -g vercel
vercel --prod

# Deploy specific project
vercel --cwd apps/web --prod
```

## Ghana Market Considerations

### Regional Optimization
- **Frankfurt Region (fra1)**: Closest to Ghana for better latency
- **Edge Functions**: Global distribution for faster responses
- **CDN**: Static assets served from global edge network

### Mobile Optimization
- **Lighthouse Scores**: Target >90 for mobile performance
- **Bundle Size**: Keep JavaScript bundles under 200KB
- **Progressive Enhancement**: Works without JavaScript

## Monitoring and Analytics

### Built-in Monitoring
```bash
# Function logs
vercel logs

# Performance monitoring
vercel insights

# Real User Monitoring (RUM)
vercel speed-insights
```

### Custom Monitoring
```typescript
// Monitor API performance
export async function POST(request: NextRequest) {
  const start = Date.now()
  
  try {
    // Your API logic
    return NextResponse.json({ success: true })
  } finally {
    const duration = Date.now() - start
    console.log(`API call took ${duration}ms`)
  }
}
```

## Security Configuration

### Headers
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}
```

### Environment Variables Security
- **Never commit secrets**: Use Vercel dashboard for sensitive data
- **Preview environments**: Separate secrets for preview deployments
- **System variables**: Access deployment context safely

## Troubleshooting

### Common Issues
- **Build failures**: Check build logs in Vercel dashboard
- **Environment variables**: Verify all required vars are set
- **Function timeouts**: Optimize or increase timeout limits
- **Domain configuration**: Ensure DNS records are correct

### Development Tips
- Use `vercel dev` for local development with edge runtime
- Test with preview deployments before production
- Monitor function execution time and memory usage
- Use Vercel CLI for debugging deployment issues

## Best Practices

1. **Environment Management**: Keep secrets in Vercel dashboard
2. **Performance**: Use Edge Runtime for better performance
3. **Monitoring**: Set up alerts for errors and performance
4. **Security**: Implement proper headers and CSP policies
5. **Regional Deployment**: Choose regions closest to users