# Turbo Documentation

Turbo is a high-performance build system for JavaScript and TypeScript codebases. It's used in Sew4Mi to orchestrate the monorepo build pipeline, providing fast incremental builds and intelligent caching.

## Core Concepts for Sew4Mi

### Monorepo Build Orchestration
- **Task pipelines**: Define dependencies between build tasks
- **Incremental builds**: Only rebuild what has changed
- **Remote caching**: Share build artifacts across team and CI
- **Parallel execution**: Run independent tasks simultaneously

### Performance Optimization
- **Selective execution**: Skip unnecessary rebuilds with smart caching
- **Task scheduling**: Optimize task execution order
- **Output hashing**: Cache based on input content, not timestamps
- **Workspace filtering**: Target specific packages for development

## Key Integration Patterns

### Turbo Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
      "env": [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NODE_ENV"
      ]
    },
    "build:web": {
      "dependsOn": ["@sew4mi/shared#build", "@sew4mi/ui#build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true,
      "env": [
        "NEXT_PUBLIC_SUPABASE_URL", 
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "PORT"
      ]
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "typecheck": {
      "dependsOn": ["^build"],
      "outputs": []
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputs": ["src/**/*.tsx", "src/**/*.ts", "test/**/*.ts", "test/**/*.tsx"]
    },
    "test:e2e": {
      "dependsOn": ["build:web"],
      "outputs": ["test-results/**", "playwright-report/**"],
      "cache": false
    },
    "clean": {
      "cache": false
    }
  }
}
```

### Package.json Scripts Integration

```json
// Root package.json
{
  "name": "sew4mi",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "dev:web": "turbo run dev --filter=web",
    "build": "turbo run build",
    "build:web": "turbo run build --filter=web",
    "test": "turbo run test",
    "test:e2e": "turbo run test:e2e",
    "test:coverage": "turbo run test -- --coverage",
    "lint": "turbo run lint",
    "lint:fix": "turbo run lint -- --fix",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write \"**/*.{ts,tsx,md,json,css}\"",
    "format:check": "prettier --check \"**/*.{ts,tsx,md,json,css}\"",
    "clean": "turbo run clean && rm -rf node_modules",
    "reset": "pnpm clean && pnpm install"
  },
  "devDependencies": {
    "turbo": "^2.3.3",
    "prettier": "^3.4.2"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.15.9"
}
```

### Development Workflow Optimization

```bash
# Development commands optimized with Turbo

# Start all development servers
pnpm dev

# Start only web application with its dependencies
pnpm dev --filter=web

# Start web app and watch shared packages for changes
pnpm dev --filter=web --filter=@sew4mi/shared --filter=@sew4mi/ui

# Build everything
pnpm build

# Build only web application and its dependencies
pnpm build --filter=web

# Build from a specific package (builds dependencies first)
pnpm build --filter=@sew4mi/shared...

# Run tests for changed packages only
pnpm test --filter='[HEAD^1]'

# Run linting on all packages
pnpm lint

# Run typecheck for specific workspace
pnpm typecheck --filter=web
```

### Selective Package Targeting

```bash
# Target specific packages
pnpm build --filter=web                    # Only web app
pnpm build --filter=@sew4mi/ui             # Only UI package
pnpm build --filter='@sew4mi/*'            # All Sew4Mi packages

# Dependency-based targeting  
pnpm build --filter=web...                 # Web and its dependencies
pnpm build --filter=...@sew4mi/shared      # Shared package and dependents

# Directory-based targeting
pnpm build --filter='./apps/*'             # All apps
pnpm build --filter='./packages/*'         # All packages

# Changed files targeting (great for CI)
pnpm build --filter='[HEAD^1]'             # Changed since last commit
pnpm test --filter='[origin/main]'         # Changed since main branch
```

### Build Performance Configuration

```json
// turbo.json - Performance optimizations
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"],
      "env": ["NODE_ENV", "NEXT_PUBLIC_*"],
      "inputsGlob": ["src/**", "public/**", "package.json", "next.config.js"]
    },
    "build:production": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"],
      "env": [
        "NODE_ENV", 
        "NEXT_PUBLIC_SUPABASE_URL", 
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "VERCEL_URL"
      ]
    },
    "lint": {
      "dependsOn": ["^build"],
      "outputs": [],
      "inputsGlob": ["src/**/*.{ts,tsx}", "*.{js,ts}", ".eslintrc.js"]
    },
    "test:unit": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"],
      "inputsGlob": [
        "src/**/*.{ts,tsx}",
        "tests/**/*.{ts,tsx}",
        "vitest.config.ts",
        "package.json"
      ]
    }
  },
  "globalEnv": [
    "NODE_ENV",
    "CI",
    "VERCEL",
    "VERCEL_ENV"
  ]
}
```

### Remote Caching Setup

```bash
# Enable Vercel Remote Caching (recommended for Sew4Mi)
npx turbo login
npx turbo link

# Or use custom remote cache (if using different provider)
export TURBO_TOKEN="your-team-token"
export TURBO_TEAM="sew4mi"

# Run with remote caching
pnpm build --cache-dir=.turbo

# Verify cache hits
pnpm build --dry-run
```

### CI/CD Integration

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout
        uses: actions/checkout@v3
        with:
          fetch-depth: 2
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Setup Turbo cache
        uses: actions/cache@v3
        with:
          path: .turbo
          key: ${{ runner.os }}-turbo-${{ github.sha }}
          restore-keys: |
            ${{ runner.os }}-turbo-
      
      # Build only what changed
      - name: Build changed packages
        run: pnpm build --filter='[HEAD^1]'
        env:
          TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
          TURBO_TEAM: ${{ secrets.TURBO_TEAM }}
      
      # Test only what changed
      - name: Test changed packages
        run: pnpm test --filter='[HEAD^1]'
      
      # Lint only what changed
      - name: Lint changed packages
        run: pnpm lint --filter='[HEAD^1]'
      
      # Type check everything (fast due to caching)
      - name: Type check
        run: pnpm typecheck
      
      # E2E tests only if web app changed
      - name: E2E tests
        if: contains(github.event.commits[0].modified, 'apps/web/')
        run: pnpm test:e2e --filter=web
```

### Development Server Configuration

```json
// apps/web/package.json - Development scripts
{
  "name": "web",
  "scripts": {
    "dev": "next dev",
    "dev:turbo": "next dev --turbo",
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "test:watch": "vitest watch",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "@sew4mi/shared": "workspace:*",
    "@sew4mi/ui": "workspace:*"
  }
}
```

### Workspace Dependencies

```json
// packages/shared/package.json
{
  "name": "@sew4mi/shared",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@sew4mi/config": "workspace:*",
    "typescript": "^5"
  }
}

// packages/ui/package.json  
{
  "name": "@sew4mi/ui",
  "version": "0.1.0", 
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@radix-ui/react-dialog": "^1.1.15",
    "@radix-ui/react-dropdown-menu": "^2.1.16",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "react": "19.1.0",
    "tailwind-merge": "^2.6.0"
  },
  "devDependencies": {
    "@sew4mi/config": "workspace:*",
    "@types/react": "^19",
    "typescript": "^5"
  },
  "peerDependencies": {
    "react": "^19.0.0"
  }
}
```

## Ghana Market Optimizations

### Build Performance for Lower-End Development Machines

```json
// turbo.json - Optimized for Ghana development environment
{
  "pipeline": {
    "dev": {
      "cache": false,
      "persistent": true,
      "env": ["NEXT_PUBLIC_*", "PORT"],
      // Reduce memory usage
      "options": {
        "env": {
          "NODE_OPTIONS": "--max-old-space-size=2048"
        }
      }
    },
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"],
      // Optimize for slower networks
      "options": {
        "env": {
          "NEXT_TELEMETRY_DISABLED": "1",
          "NODE_OPTIONS": "--max-old-space-size=4096"
        }
      }
    }
  }
}
```

### Efficient Development Workflow

```bash
# Quick development setup for Ghana developers
pnpm dev:fast() {
  # Start only essential services
  pnpm dev --filter=web --filter=@sew4mi/shared
}

pnpm build:quick() {
  # Build only changed packages
  pnpm build --filter='[HEAD^1]'
}

pnpm test:quick() {
  # Test only changed files  
  pnpm test --filter='[HEAD^1]' --changed
}
```

### Deployment Optimization

```json
// turbo.json - Production builds
{
  "pipeline": {
    "build:production": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"],
      "env": [
        "NODE_ENV",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "NEXT_PUBLIC_APP_URL",
        "VERCEL_URL"
      ]
    },
    "deploy": {
      "dependsOn": ["build:production", "test", "lint"],
      "outputs": [],
      "cache": false
    }
  }
}
```

### Monitoring and Analytics

```bash
# Turbo performance analysis
pnpm build --dry-run --graph=build-graph.png

# Cache performance
pnpm build --summarize

# Build timing analysis  
time pnpm build --filter=web

# Memory usage monitoring
NODE_OPTIONS="--max-old-space-size=4096" pnpm build
```

### Environment-Specific Configuration

```json
// turbo.json - Multiple environments
{
  "extends": ["//turbo.json"],
  "pipeline": {
    "build:staging": {
      "dependsOn": ["^build"],
      "outputs": [".next/**"],
      "env": [
        "NODE_ENV",
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "STAGING"
      ]
    },
    "build:production": {
      "dependsOn": ["^build"],
      "outputs": [".next/**"],
      "env": [
        "NODE_ENV", 
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "PRODUCTION"
      ]
    }
  }
}
```

## Troubleshooting Common Issues

### Build Performance Issues

```bash
# Clear Turbo cache
rm -rf .turbo

# Verbose logging
pnpm build --verbose

# Debug cache misses
TURBO_LOG_LEVEL=debug pnpm build

# Profile build performance
pnpm build --profile
```

### Workspace Dependency Issues

```bash
# Reset workspace
pnpm clean && pnpm install

# Check dependency graph
pnpm list --depth=0

# Verify workspace links
ls -la node_modules/@sew4mi/
```

### Memory Issues

```json
// package.json - Increase Node.js memory
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' turbo run build",
    "dev": "NODE_OPTIONS='--max-old-space-size=2048' turbo run dev"
  }
}
```

## Best Practices for Sew4Mi

1. **Task Dependencies**: Define clear dependencies between build tasks
2. **Output Specification**: Specify exact outputs for better caching
3. **Selective Builds**: Use filters to build only what's needed
4. **Remote Caching**: Enable remote caching for team collaboration
5. **Environment Variables**: Declare all env vars that affect builds
6. **Pipeline Optimization**: Order tasks for maximum parallelization
7. **Cache Invalidation**: Use appropriate inputs for cache keys
8. **Resource Management**: Optimize memory usage for Ghana's development environment

This configuration ensures efficient monorepo management for Sew4Mi with optimizations for both development speed and build performance in Ghana's development environment.