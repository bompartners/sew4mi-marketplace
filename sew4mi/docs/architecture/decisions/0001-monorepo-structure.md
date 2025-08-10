# ADR 0001: Monorepo Structure with Turbo

## Status

Accepted

## Context

We need to decide on the project structure for the Sew4Mi marketplace. The application will have multiple components:

- Customer-facing web application
- Admin dashboard (future)
- Shared components and utilities
- Shared type definitions

## Decision

We will use a monorepo structure managed by Turbo with pnpm workspaces.

```
sew4mi/
├── apps/
│   ├── web/                # Main customer application
│   └── admin/             # Admin dashboard (future)
├── packages/
│   ├── ui/                # Shared UI components
│   ├── shared/            # Shared types and utilities
│   └── config/            # Shared configuration
└── docs/                  # Documentation
```

## Rationale

1. **Code Reuse**: Shared components and types can be easily reused across applications
2. **Consistent Development**: All applications use the same tooling and standards
3. **Atomic Changes**: Changes can be made across multiple packages in a single commit
4. **Better CI/CD**: Build caching and parallel execution with Turbo
5. **Simplified Dependency Management**: Single lock file for all packages

## Consequences

### Positive

- Faster builds with Turbo's caching
- Easier code sharing between applications
- Consistent tooling and configuration
- Simplified deployment pipeline

### Negative

- Slightly more complex initial setup
- Developers need to understand monorepo concepts
- All applications share the same Node.js version

## Alternatives Considered

1. **Multi-repo**: Separate repositories for each application
   - Rejected due to code duplication and coordination overhead
2. **Single application**: Everything in one Next.js app
   - Rejected due to future scalability concerns with admin dashboard
