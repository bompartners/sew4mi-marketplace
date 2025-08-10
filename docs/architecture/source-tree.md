# Source Tree

## Project Structure Overview

The Sew4Mi Marketplace uses a monorepo structure managed with Turborepo, optimizing for code reuse, shared types, and coordinated deployments. This structure supports both the customer-facing marketplace and internal admin tools while maintaining clear separation of concerns.

## Root Directory Structure

```
sew4mi/
├── apps/                          # Application packages
│   ├── web/                       # Main customer & tailor portal
│   └── admin/                     # Internal admin dashboard
├── packages/                      # Shared packages
│   ├── ui/                        # Shared UI components
│   ├── database/                  # Database schema & migrations
│   ├── types/                     # TypeScript type definitions
│   └── utils/                     # Shared utilities
├── docs/                          # Documentation
│   ├── architecture/              # Technical architecture docs
│   ├── prd/                       # Product requirements
│   └── stories/                   # User stories
├── .github/                       # GitHub configuration
│   └── workflows/                 # CI/CD pipelines
├── .bmad-core/                    # BMad configuration
├── turbo.json                     # Turborepo configuration
├── package.json                   # Root package.json
├── pnpm-workspace.yaml            # PNPM workspace config
└── README.md                      # Project documentation
```

## Detailed Application Structure

### Customer & Tailor Web Application (`apps/web/`)

```
apps/web/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/                # Authentication routes
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── forgot-password/
│   │   ├── (customer)/            # Customer portal routes
│   │   │   ├── dashboard/
│   │   │   ├── orders/
│   │   │   │   ├── [id]/
│   │   │   │   └── new/
│   │   │   ├── tailors/
│   │   │   │   ├── [id]/
│   │   │   │   └── search/
│   │   │   ├── measurements/
│   │   │   │   ├── profiles/
│   │   │   │   └── voice/
│   │   │   └── family/
│   │   ├── (tailor)/              # Tailor portal routes
│   │   │   ├── dashboard/
│   │   │   ├── orders/
│   │   │   ├── portfolio/
│   │   │   ├── calendar/
│   │   │   └── earnings/
│   │   ├── api/                   # API routes
│   │   │   ├── auth/
│   │   │   ├── orders/
│   │   │   ├── payments/
│   │   │   ├── webhooks/
│   │   │   │   ├── whatsapp/
│   │   │   │   └── payment/
│   │   │   └── graphql/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/                # React components
│   │   ├── ui/                    # Shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── toast.tsx
│   │   ├── common/                # Shared components
│   │   │   ├── Layout/
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── Footer.tsx
│   │   │   │   └── Navigation.tsx
│   │   │   ├── ErrorBoundary/
│   │   │   ├── LoadingStates/
│   │   │   └── SEO/
│   │   ├── features/              # Feature-specific components
│   │   │   ├── orders/
│   │   │   │   ├── OrderCard.tsx
│   │   │   │   ├── OrderTimeline.tsx
│   │   │   │   ├── EscrowProgress.tsx
│   │   │   │   ├── MilestoneUpload.tsx
│   │   │   │   └── GroupOrderManager.tsx
│   │   │   ├── tailors/
│   │   │   │   ├── TailorProfile.tsx
│   │   │   │   ├── PortfolioGallery.tsx
│   │   │   │   ├── TailorSearch.tsx
│   │   │   │   ├── TailorCard.tsx
│   │   │   │   └── ReviewDisplay.tsx
│   │   │   ├── measurements/
│   │   │   │   ├── MeasurementForm.tsx
│   │   │   │   ├── VoiceRecorder.tsx
│   │   │   │   ├── ProfileSelector.tsx
│   │   │   │   └── FamilyProfiles.tsx
│   │   │   ├── payments/
│   │   │   │   ├── MobileMoneyButton.tsx
│   │   │   │   ├── PaymentStatus.tsx
│   │   │   │   ├── EscrowExplainer.tsx
│   │   │   │   └── TransactionHistory.tsx
│   │   │   └── whatsapp/
│   │   │       ├── WhatsAppOptIn.tsx
│   │   │       ├── VoiceMessagePlayer.tsx
│   │   │       └── GroupCoordinator.tsx
│   │   └── patterns/              # Design patterns
│   │       ├── OptimisticUpdate/
│   │       ├── InfiniteScroll/
│   │       ├── OfflineQueue/
│   │       └── RealtimeSubscription/
│   ├── hooks/                     # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useOrder.ts
│   │   ├── usePayment.ts
│   │   ├── useRealtime.ts
│   │   ├── useOffline.ts
│   │   └── useWhatsApp.ts
│   ├── lib/                       # Library code
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── api/
│   │   │   ├── orders.ts
│   │   │   ├── tailors.ts
│   │   │   └── payments.ts
│   │   ├── utils/
│   │   │   ├── formatting.ts
│   │   │   ├── validation.ts
│   │   │   └── constants.ts
│   │   └── whatsapp/
│   │       ├── client.ts
│   │       ├── webhooks.ts
│   │       └── voice-processor.ts
│   ├── services/                  # Business logic services
│   │   ├── order-engine/
│   │   │   ├── state-machine.ts
│   │   │   ├── escrow.ts
│   │   │   └── milestones.ts
│   │   ├── payment/
│   │   │   ├── mtn-momo.ts
│   │   │   ├── vodafone-cash.ts
│   │   │   └── reconciliation.ts
│   │   ├── notification/
│   │   │   ├── email.ts
│   │   │   ├── sms.ts
│   │   │   └── whatsapp.ts
│   │   └── search/
│   │       ├── tailor-search.ts
│   │       └── recommendations.ts
│   ├── stores/                    # Zustand state stores
│   │   ├── user.store.ts
│   │   ├── order.store.ts
│   │   ├── cart.store.ts
│   │   └── ui.store.ts
│   ├── styles/
│   │   ├── globals.css
│   │   └── tailwind.css
│   └── types/
│       ├── models.ts
│       ├── api.ts
│       └── components.ts
├── public/
│   ├── images/
│   ├── manifest.json              # PWA manifest
│   └── service-worker.js          # PWA service worker
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

### Admin Dashboard (`apps/admin/`)

```
apps/admin/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── dashboard/
│   │   ├── orders/
│   │   ├── tailors/
│   │   │   ├── verification/
│   │   │   └── performance/
│   │   ├── disputes/
│   │   ├── payments/
│   │   │   ├── reconciliation/
│   │   │   └── analytics/
│   │   ├── users/
│   │   └── reports/
│   ├── components/
│   │   ├── charts/
│   │   │   ├── RevenueChart.tsx
│   │   │   ├── OrderMetrics.tsx
│   │   │   └── TailorPerformance.tsx
│   │   ├── tables/
│   │   │   ├── DataTable.tsx
│   │   │   ├── OrdersTable.tsx
│   │   │   └── DisputesTable.tsx
│   │   └── admin/
│   │       ├── DisputeResolver.tsx
│   │       ├── TailorVerifier.tsx
│   │       └── BulkActions.tsx
│   ├── lib/
│   └── types/
├── tests/
├── next.config.js
├── tsconfig.json
└── package.json
```

## Shared Packages Structure

### UI Components Package (`packages/ui/`)

```
packages/ui/
├── src/
│   ├── components/
│   │   ├── Button/
│   │   ├── Card/
│   │   ├── Form/
│   │   └── Modal/
│   ├── hooks/
│   ├── utils/
│   └── index.ts
├── tsconfig.json
└── package.json
```

### Database Package (`packages/database/`)

```
packages/database/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── client.ts
│   ├── seed.ts
│   └── types.ts
├── supabase/
│   ├── migrations/
│   │   ├── 20240101_initial_schema.sql
│   │   ├── 20240102_add_rls_policies.sql
│   │   └── 20240103_add_triggers.sql
│   └── functions/
│       ├── update_tailor_rating.sql
│       └── calculate_escrow.sql
├── tsconfig.json
└── package.json
```

### Types Package (`packages/types/`)

```
packages/types/
├── src/
│   ├── models/
│   │   ├── user.ts
│   │   ├── order.ts
│   │   ├── tailor.ts
│   │   └── payment.ts
│   ├── api/
│   │   ├── requests.ts
│   │   └── responses.ts
│   ├── enums.ts
│   └── index.ts
├── tsconfig.json
└── package.json
```

### Utils Package (`packages/utils/`)

```
packages/utils/
├── src/
│   ├── formatting/
│   │   ├── currency.ts
│   │   ├── dates.ts
│   │   └── phone.ts
│   ├── validation/
│   │   ├── schemas.ts
│   │   └── rules.ts
│   ├── security/
│   │   ├── encryption.ts
│   │   └── sanitization.ts
│   └── index.ts
├── tsconfig.json
└── package.json
```

## Configuration Files

### Root Configuration

```
sew4mi/
├── .env                           # Environment variables
├── .env.example                   # Environment template
├── .gitignore                     # Git ignore rules
├── .eslintrc.json                 # ESLint configuration
├── .prettierrc                    # Prettier configuration
├── turbo.json                     # Turborepo config
├── pnpm-workspace.yaml            # PNPM workspace
├── vercel.json                    # Vercel deployment
└── docker-compose.yml             # Local development
```

### CI/CD Configuration

```
.github/
├── workflows/
│   ├── ci.yml                     # Continuous integration
│   ├── deploy-preview.yml         # Preview deployments
│   ├── deploy-production.yml      # Production deployment
│   └── security-scan.yml          # Security scanning
├── dependabot.yml                 # Dependency updates
└── CODEOWNERS                     # Code ownership
```

## Testing Structure

```
tests/
├── unit/                          # Unit tests
│   ├── components/
│   ├── hooks/
│   ├── services/
│   └── utils/
├── integration/                   # Integration tests
│   ├── api/
│   ├── database/
│   └── external/
├── e2e/                          # End-to-end tests
│   ├── customer-journey.spec.ts
│   ├── tailor-workflow.spec.ts
│   ├── payment-flow.spec.ts
│   └── whatsapp-integration.spec.ts
├── fixtures/                      # Test data
├── mocks/                        # Mock implementations
└── playwright.config.ts          # E2E test config
```

## Infrastructure as Code

```
infrastructure/
├── terraform/
│   ├── environments/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── production/
│   ├── modules/
│   │   ├── supabase/
│   │   ├── vercel/
│   │   └── monitoring/
│   └── main.tf
└── scripts/
    ├── setup.sh
    ├── deploy.sh
    └── backup.sh
```

## Documentation Structure

```
docs/
├── architecture/                  # Technical documentation
│   ├── index.md
│   ├── source-tree.md            # This document
│   ├── tech-stack.md
│   ├── coding-standards.md
│   └── ...
├── prd/                          # Product requirements
│   ├── index.md
│   ├── epic-*.md
│   └── ...
├── api/                          # API documentation
│   ├── rest-api.md
│   └── graphql-schema.md
└── guides/                       # Development guides
    ├── getting-started.md
    ├── deployment.md
    └── troubleshooting.md
```

## File Naming Conventions

### TypeScript/JavaScript Files
- **Components**: PascalCase (e.g., `OrderCard.tsx`)
- **Hooks**: camelCase with 'use' prefix (e.g., `useAuth.ts`)
- **Utilities**: camelCase (e.g., `formatCurrency.ts`)
- **Types**: PascalCase for interfaces/types (e.g., `Order.ts`)
- **API Routes**: kebab-case (e.g., `create-order.ts`)

### Styles
- **CSS Modules**: camelCase (e.g., `orderCard.module.css`)
- **Global Styles**: kebab-case (e.g., `globals.css`)

### Tests
- **Test Files**: Same as source with `.test.ts` or `.spec.ts` suffix
- **E2E Tests**: kebab-case with `.spec.ts` (e.g., `customer-journey.spec.ts`)

## Important Directories

### Development Focus Areas
1. **`apps/web/src/app/api/`** - API endpoints for core functionality
2. **`apps/web/src/services/`** - Business logic implementation
3. **`apps/web/src/components/features/`** - Feature-specific UI components
4. **`packages/database/supabase/`** - Database schema and migrations
5. **`apps/web/src/lib/whatsapp/`** - WhatsApp integration code

### Configuration Priorities
1. **`.env.local`** - Local development environment variables
2. **`turbo.json`** - Build pipeline configuration
3. **`next.config.js`** - Next.js application settings
4. **`tailwind.config.ts`** - Styling configuration

## Build Output Structure

```
dist/                             # Build outputs
├── apps/
│   ├── web/
│   │   └── .next/               # Next.js build
│   └── admin/
│       └── .next/               # Admin build
└── packages/
    └── [built packages]/
```

## Development Tools Integration

### VS Code Workspace
```
.vscode/
├── settings.json                 # Workspace settings
├── extensions.json              # Recommended extensions
├── launch.json                  # Debug configurations
└── tasks.json                   # Build tasks
```

### Git Hooks
```
.husky/
├── pre-commit                   # Linting and formatting
├── pre-push                     # Tests
└── commit-msg                   # Commit message validation
```

## Notes

- The monorepo structure enables code sharing between customer and admin applications
- Turborepo provides efficient caching and parallel builds
- All shared code lives in `packages/` for maximum reusability
- The structure supports both SSR (Next.js) and API routes in a single codebase
- PWA capabilities are built into the main web application
- Testing is colocated with source code for better maintainability