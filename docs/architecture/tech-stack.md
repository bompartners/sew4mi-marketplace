# Tech Stack

**Technology Stack Table:**

| Category | Technology | Version | Purpose | Rationale |
|----------|------------|---------|---------|-----------|
| Frontend Language | TypeScript | 5.3+ | Type-safe frontend development | Prevents runtime errors, better IDE support, crucial for AI-driven development |
| Frontend Framework | Next.js | 14.2+ | React framework with SSR/SSG | Optimal for SEO, performance on 3G, built-in PWA support |
| UI Component Library | Shadcn/ui + Tailwind | Latest | Customizable components with utility CSS | Lightweight, mobile-optimized, easy to customize for Ghana aesthetics |
| State Management | Zustand + React Query | 4.5+ / 5.0+ | Client state and server cache | Lightweight alternative to Redux, excellent cache management |
| Backend Language | TypeScript | 5.3+ | Type-safe backend development | Shared types with frontend, prevents API contract issues |
| Backend Framework | Next.js API Routes | 14.2+ | Serverless API endpoints | Unified codebase, automatic scaling, Vercel optimization |
| API Style | REST + GraphQL (hybrid) | - | REST for CRUD, GraphQL for complex queries | REST for mobile money webhooks, GraphQL for complex order queries |
| Database | PostgreSQL (Supabase) | 15+ | Primary data store | ACID compliance for payments, complex relationships, PostGIS for location |
| Database Replicas | Supabase Read Replicas | Latest | Analytics and reporting queries | Separate analytics workload from transactional operations |
| Cache | Vercel KV (Redis) | Latest | Session and API caching | Edge caching for performance, rate limiting for WhatsApp |
| CDN | Cloudflare | Latest | User-generated content delivery | Global CDN for portfolio images and milestone photos |
| File Storage | Supabase Storage | Latest | Images and documents | Integrated with auth, CDN distribution, automatic image optimization |
| Authentication | Supabase Auth | Latest | User authentication | Built-in MFA, social logins, phone auth for Ghana market |
| Frontend Testing | Vitest + Testing Library | Latest | Unit and integration tests | Fast, ESM support, React Testing Library for components |
| Backend Testing | Vitest | Latest | API and service tests | Unified testing framework, fast execution |
| E2E Testing | Playwright | Latest | End-to-end testing | Cross-browser support, mobile testing capabilities |
| Build Tool | Vite | 5.0+ | Frontend bundling | Lightning fast HMR, optimized builds |
| Bundler | Turbopack | Latest | Monorepo builds | Vercel's rust-based bundler, incremental computation |
| IaC Tool | Terraform | 1.6+ | Infrastructure as code | Manage Supabase, Vercel, and external services |
| CI/CD | GitHub Actions + Vercel | Latest | Automated deployment | Native Vercel integration, preview deployments |
| Monitoring | Sentry + Vercel Analytics | Latest | Error and performance tracking | Real user monitoring, error tracking with Ghana context |
| Logging | Axiom | Latest | Centralized logging | Structured logs, WhatsApp conversation tracking |
| CSS Framework | Tailwind CSS | 3.4+ | Utility-first CSS | Mobile-first, small bundle size, excellent with Shadcn |
