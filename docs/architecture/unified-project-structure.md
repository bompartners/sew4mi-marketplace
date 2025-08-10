# Unified Project Structure

```plaintext
sew4mi/
├── .github/                        # CI/CD workflows
│   └── workflows/
│       ├── ci.yaml                 # Continuous integration
│       ├── deploy-preview.yaml     # Preview deployments
│       └── deploy-production.yaml  # Production deployment
├── apps/                           # Application packages
│   ├── web/                        # Frontend application
│   │   ├── src/
│   │   │   ├── app/                # Next.js app router
│   │   │   │   ├── (auth)/         # Auth routes group
│   │   │   │   ├── (customer)/     # Customer routes
│   │   │   │   ├── (tailor)/       # Tailor routes
│   │   │   │   ├── admin/          # Admin routes
│   │   │   │   ├── api/            # API routes
│   │   │   │   └── layout.tsx      # Root layout
│   │   │   ├── components/         # UI components
│   │   │   │   ├── ui/             # Shadcn/ui components
│   │   │   │   ├── common/         # Shared components
│   │   │   │   ├── features/       # Feature components
│   │   │   │   └── patterns/       # Design patterns
│   │   │   ├── hooks/              # Custom React hooks
│   │   │   ├── lib/                # Utilities and clients
│   │   │   │   ├── api/            # API clients
│   │   │   │   ├── supabase/       # Supabase configuration
│   │   │   │   └── utils/          # Helper functions
│   │   │   ├── services/           # Business logic services
│   │   │   ├── stores/             # Zustand state stores
│   │   │   └── styles/             # Global styles
│   │   ├── public/                 # Static assets
│   │   │   ├── images/
│   │   │   ├── fonts/
│   │   │   └── manifest.json       # PWA manifest
│   │   ├── tests/                  # Frontend tests
│   │   │   ├── unit/
│   │   │   ├── integration/
│   │   │   └── e2e/
│   │   ├── next.config.js          # Next.js configuration
│   │   ├── tailwind.config.ts      # Tailwind configuration
│   │   ├── tsconfig.json           # TypeScript config
│   │   └── package.json
│   └── api/                        # Backend services
│       ├── src/
│       │   ├── functions/          # Edge functions
│       │   │   ├── orders/         # Order endpoints
│       │   │   ├── payments/       # Payment endpoints
│       │   │   ├── webhooks/       # Webhook handlers
│       │   │   └── graphql/        # GraphQL endpoint
│       │   ├── services/           # Business logic
│       │   │   ├── order.service.ts
│       │   │   ├── payment.service.ts
│       │   │   ├── whatsapp.service.ts
│       │   │   └── notification.service.ts
│       │   ├── repositories/       # Data access layer
│       │   │   ├── order.repository.ts
│       │   │   ├── user.repository.ts
│       │   │   └── tailor.repository.ts
│       │   ├── middleware/         # Express middleware
│       │   │   ├── auth.ts
│       │   │   ├── rateLimit.ts
│       │   │   └── error.ts
│       │   ├── state-machines/     # Business state logic
│       │   │   └── order.machine.ts
│       │   ├── utils/              # Backend utilities
│       │   └── graphql/            # GraphQL schemas
│       │       ├── schema.graphql
│       │       └── resolvers/
│       ├── tests/                  # Backend tests
│       │   ├── unit/
│       │   └── integration/
│       └── package.json
├── packages/                       # Shared packages
│   ├── shared/                     # Shared types/utilities
│   │   ├── src/
│   │   │   ├── types/              # TypeScript interfaces
│   │   │   │   ├── models.ts       # Data models
│   │   │   │   ├── api.ts          # API types
│   │   │   │   └── database.ts     # Database types
│   │   │   ├── constants/          # Shared constants
│   │   │   │   ├── status.ts       # Order statuses
│   │   │   │   └── errors.ts       # Error codes
│   │   │   ├── schemas/            # Zod validation schemas
│   │   │   │   ├── order.schema.ts
│   │   │   │   └── user.schema.ts
│   │   │   └── utils/              # Shared utilities
│   │   │       ├── date.ts
│   │   │       ├── currency.ts
│   │   │       └── phone.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── ui/                         # Shared UI components
│   │   ├── src/
│   │   │   ├── GhanaPhoneInput.tsx
│   │   │   ├── MobileMoneyLogo.tsx
│   │   │   └── CediFormatter.tsx
│   │   └── package.json
│   └── config/                     # Shared configuration
│       ├── eslint/
│       │   └── index.js            # ESLint config
│       ├── typescript/
│       │   └── base.json           # Base TS config
│       └── jest/
│           └── jest.config.base.js
├── infrastructure/                 # IaC definitions
│   ├── terraform/
│   │   ├── modules/
│   │   │   ├── supabase/
│   │   │   ├── vercel/
│   │   │   └── monitoring/
│   │   ├── environments/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   └── main.tf
│   └── docker/
│       └── Dockerfile.dev          # Development container
├── scripts/                        # Build/deploy scripts
│   ├── setup.sh                    # Initial setup
│   ├── seed-db.ts                  # Database seeding
│   ├── generate-types.ts           # Type generation
│   └── check-env.js                # Environment validation
├── docs/                           # Documentation
│   ├── prd.md                      # Product requirements
│   ├── front-end-spec.md           # Frontend specification
│   ├── architecture.md             # This document
│   ├── api/                        # API documentation
│   │   └── openapi.yaml
│   └── deployment/                 # Deployment guides
│       ├── vercel.md
│       └── supabase.md
├── .env.example                    # Environment template
├── .env.local                      # Local environment (gitignored)
├── .gitignore                      # Git ignore rules
├── turbo.json                      # Turborepo configuration
├── package.json                    # Root package.json
├── pnpm-workspace.yaml             # PNPM workspace config
├── README.md                       # Project documentation
└── LICENSE                         # License file
