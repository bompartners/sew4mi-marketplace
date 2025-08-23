# Sew4Mi Marketplace

## Overview

Sew4Mi is a digital marketplace connecting customers with skilled Ghanaian tailors. The platform enables custom garment orders, family coordination, progressive escrow payments, and WhatsApp-based communication - all designed specifically for the Ghanaian market.

## Features

- 🪡 **Expert Tailors**: Connect with verified skilled tailors across Ghana
- 👨‍👩‍👧‍👦 **Family Orders**: Coordinate group orders for family events and celebrations
- 💳 **Secure Payments**: Progressive escrow system with mobile money integration
- 📱 **WhatsApp Integration**: Place orders easily through WhatsApp with voice messages
- 🎨 **Ghana-Inspired Design**: UI elements inspired by Kente patterns and Adinkra symbols
- 📱 **Mobile-First**: Optimized for 2G/3G connections and mobile devices

## Technology Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **UI Components**: Shadcn/ui with custom Ghana-inspired theme
- **State Management**: Zustand + React Query
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Testing**: Vitest, React Testing Library, Playwright
- **Deployment**: Vercel
- **Monorepo**: Turbo + pnpm workspaces

## Project Structure

```
sew4mi/
├── apps/
│   ├── web/                    # Main customer application
│   └── admin/                  # Admin dashboard (future)
├── packages/
│   ├── ui/                     # Shared UI components
│   ├── shared/                 # Shared types and utilities
│   └── config/                 # Shared configuration
├── docs/                       # Documentation
├── tests/                      # E2E tests
└── scripts/                    # Build and utility scripts
```

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd sew4mi
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in the required environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL`

4. **Validate environment**

   ```bash
   pnpm check-env
   ```

5. **Start development server**

   ```bash
   pnpm dev
   ```

6. **Open the application**
   Visit [http://localhost:3000](http://localhost:3000)

## Available Scripts

### Development

- `pnpm dev` - Start development server
- `pnpm build` - Build all packages
- `pnpm build:web` - Build web application only
- `pnpm start` - Start production server

### Testing

- `pnpm test` - Run unit tests
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage
- `pnpm test:e2e` - Run E2E tests with Playwright

### Code Quality

- `pnpm lint` - Run ESLint across all packages
- `pnpm format` - Format code with Prettier
- `pnpm type-check` - Run TypeScript type checking

### Utilities

- `pnpm clean` - Clean build artifacts and dependencies
- `pnpm check-env` - Validate environment variables

## Development Guidelines

### Code Standards

- TypeScript strict mode enabled
- ESLint + Prettier for code formatting
- Conventional commits for commit messages
- 80% test coverage requirement

### Component Development

- Use functional components with hooks
- Follow Shadcn/ui patterns for new components
- Include JSDoc comments for public APIs
- Write tests for all components

### Styling Guidelines

- Use Tailwind CSS utility classes
- Follow Ghana-inspired color palette:
  - Kente colors: gold (#FFD700), red (#CE1126), green (#006B3F)
  - Adinkra colors: brown (#8B4513), cream (#FFFDD0)
- Mobile-first responsive design
- Support for dark mode

## Testing Strategy

### Unit Tests

- Location: `apps/web/tests/unit/`
- Framework: Vitest + React Testing Library
- Coverage: 80% statements, 70% branches

### Integration Tests

- Location: `apps/web/tests/integration/`
- Focus: API endpoints, complex workflows

### E2E Tests

- Location: `tests/e2e/`
- Framework: Playwright
- Browsers: Chrome, Firefox, Safari (desktop + mobile)

## Deployment

### Development

The application is automatically deployed to Vercel on every push to the `develop` branch.

### Production

Production deployments are triggered from the `main` branch after manual approval.

### Environment Setup

1. Connect repository to Vercel
2. Configure environment variables
3. Set build command: `pnpm build:web`
4. Set output directory: `apps/web/.next`

## Architecture

### Monorepo Benefits

- **Code Reuse**: Shared components and utilities
- **Consistency**: Same tooling across all applications
- **Performance**: Turbo caching and parallel builds
- **Deployment**: Coordinated releases

### Key Design Decisions

- Next.js App Router for better performance
- Progressive Web App capabilities
- Offline-first approach for poor network conditions
- Mobile money integration for Ghanaian market

## API Documentation

See [docs/api/README.md](./docs/api/README.md) for detailed API documentation.

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Quick Contribution Steps

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit: `git commit -m 'feat: add amazing feature'`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

## Performance

### Bundle Size Targets

- Initial JS bundle: <200KB
- CSS bundle: <50KB
- First Contentful Paint: <2s on 3G
- Lighthouse Score: >90

### Optimization Features

- Image optimization with Next.js
- Code splitting by routes
- Critical CSS extraction
- Service worker for offline support

## Security

- Environment variables for sensitive data
- CSP headers for XSS protection
- Regular dependency updates
- Automated security scanning

## Monitoring

- **Performance**: Vercel Analytics + Web Vitals
- **Errors**: Sentry (configured but not enabled)
- **Uptime**: Vercel monitoring
- **CI/CD**: GitHub Actions

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- 📧 Email: support@sew4mi.com
- 📚 Documentation: [docs/](./docs/)
- 🐛 Issues: [GitHub Issues](../../issues)
- 💬 Discussions: [GitHub Discussions](../../discussions)

## Acknowledgments

- Ghanaian tailoring community for inspiration
- Next.js team for the excellent framework
- Vercel for hosting and deployment
- Supabase for backend infrastructure
