# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sew4Mi is a digital marketplace connecting customers with skilled Ghanaian tailors. Built as a modern JAMstack application with Next.js frontend and serverless backend, optimized for Ghana's mobile-first market with offline capabilities and WhatsApp integration.

## Repository Structure

This is a **monorepo** using Turbo + pnpm workspaces:

```
sew4mi/
├── apps/
│   ├── web/           # Main Next.js customer application  
│   └── admin/         # Admin dashboard (future)
├── packages/
│   ├── ui/            # Shared UI components (Shadcn/ui)
│   ├── shared/        # Shared types, schemas, constants
│   └── config/        # ESLint, TypeScript configs
├── tests/             # E2E Playwright tests
└── scripts/           # Build and utility scripts
```

## Development Commands

### Setup
```bash
pnpm install              # Install all dependencies
pnpm check-env           # Validate environment variables
```

### Development
```bash
pnpm dev                 # Start development server (all apps)
pnpm dev --filter=web    # Start only web app

# Windows users: If you encounter EPERM errors with .next/trace file, use:
NEXT_TELEMETRY_DISABLED=1 pnpm dev --filter=web
```

### Building
```bash
pnpm build               # Build all packages
pnpm build:web          # Build web application only
```

### Testing
```bash
pnpm test               # Run all unit tests (Vitest)
pnpm test:watch         # Run tests in watch mode
pnpm test:coverage      # Run tests with coverage report
pnpm test:e2e          # Run E2E tests (Playwright)
```

### Code Quality
```bash
pnpm lint               # ESLint across all packages
pnpm format             # Format with Prettier
```

### Single Test Execution
```bash
cd apps/web
pnpm test example.test.ts                    # Run specific unit test
cd ../../
pnpm exec playwright test example.spec.ts   # Run specific E2E test
```

## Technology Stack

- **Frontend**: Next.js 14 App Router, React 19, TypeScript
- **Styling**: Tailwind CSS with Ghana-inspired theme (Kente/Adinkra colors)
- **UI Components**: Shadcn/ui with custom components in `packages/ui`
- **State**: Zustand + React Query
- **Database**: PostgreSQL via Supabase
- **Auth**: Supabase Auth
- **Testing**: Vitest (unit), Playwright (E2E)
- **Monorepo**: Turbo + pnpm workspaces
- **Deployment**: Vercel

## Architecture Principles

### Mobile-First Design
- Optimized for 2G/3G connections
- Progressive Web App with offline support
- Service worker for caching (`apps/web/public/sw.js`)

### Ghana Market Optimization  
- WhatsApp Business API integration for orders
- Mobile money payment integration (Hubtel)
- Kente colors: gold (#FFD700), red (#CE1126), green (#006B3F)
- Adinkra colors: brown (#8B4513), cream (#FFFDD0)

### Code Organization
- Shared types in `packages/shared/src/types`
- UI components follow Shadcn/ui patterns
- Functional components with hooks
- TypeScript strict mode enabled

## Environment Variables

Required for development:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key  
DATABASE_URL=your_database_url
```

## Testing Strategy

### Unit Tests
- Location: `apps/web/tests/unit/`
- Coverage thresholds: 60% statements, 50% branches
- Use React Testing Library for component tests

### E2E Tests
- Location: `tests/e2e/`
- Runs on Chrome, Firefox, Safari (desktop + mobile)
- Auto-starts dev server on localhost:3000

## Workspace Dependencies

When adding dependencies:
- **App-specific**: Add to respective app's package.json
- **Shared across apps**: Add to workspace package (`packages/shared`, `packages/ui`)
- **Dev tools**: Add to root package.json

Use workspace protocol for internal dependencies:
```json
"@sew4mi/shared": "workspace:*"
```

## Performance Targets

- Initial JS bundle: <200KB
- First Contentful Paint: <2s on 3G  
- Lighthouse Score: >90
- 80% test coverage requirement

## Troubleshooting

### Windows Development Issues

**EPERM Error on .next/trace File:**
If you encounter file permission errors when starting the development server:

1. **Quick Fix:** Use telemetry disabled flag:
   ```bash
   NEXT_TELEMETRY_DISABLED=1 pnpm dev --filter=web
   ```

2. **Permanent Fix:** The `.env.local` file in `apps/web` contains `NEXT_TELEMETRY_DISABLED=1`

3. **Manual Cleanup:** If issues persist:
   ```bash
   cd sew4mi/apps/web
   cmd /c "rd /s /q .next"  # Force remove .next directory
   pnpm dev  # Restart development server
   ```

**Root Cause:** Next.js tracing functionality creates file locks on Windows that prevent proper cleanup of the `.next/trace` file during development.