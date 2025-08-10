# Sew4Mi - Digital Marketplace for Ghanaian Tailors

[![CI](https://github.com/sew4mi/sew4mi/workflows/CI/badge.svg)](https://github.com/sew4mi/sew4mi/actions)
[![Security Scan](https://github.com/sew4mi/sew4mi/workflows/Security%20Scan/badge.svg)](https://github.com/sew4mi/sew4mi/actions)
[![Performance](https://github.com/sew4mi/sew4mi/workflows/Performance%20Monitoring/badge.svg)](https://github.com/sew4mi/sew4mi/actions)

A comprehensive digital marketplace connecting customers with skilled Ghanaian tailors, built with Next.js and optimized for Ghana's mobile-first market.

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20.x or higher
- **pnpm** 8.x or higher
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/sew4mi/sew4mi.git
   cd sew4mi
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example sew4mi/apps/web/.env.local
   # Edit .env.local with your actual values
   ```

4. **Start development server**
   ```bash
   pnpm dev
   # Or for web app only:
   pnpm dev:web
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
sew4mi/
├── 📁 .github/                 # GitHub workflows and templates
│   ├── workflows/              # CI/CD, security, performance monitoring
│   └── ISSUE_TEMPLATE/         # Bug reports, feature requests
├── 📁 sew4mi/                  # Main application directory
│   ├── 📁 apps/
│   │   ├── 📁 web/            # Next.js customer application
│   │   └── 📁 admin/          # Admin dashboard (future)
│   ├── 📁 packages/
│   │   ├── 📁 ui/             # Shared UI components (Shadcn/ui)
│   │   ├── 📁 shared/         # Types, schemas, constants
│   │   └── 📁 config/         # ESLint, TypeScript configs
│   ├── 📁 tests/              # E2E Playwright tests
│   └── 📁 scripts/            # Build and utility scripts
├── 📁 docs/                   # Documentation
└── 🔧 Configuration files     # vercel.json, lighthouserc.json
```

## 🛠️ Available Scripts

### Development
```bash
pnpm dev                    # Start all applications
pnpm dev:web               # Start web application only
pnpm build                 # Build all packages
pnpm build:web             # Build web application only
```

### Testing
```bash
pnpm test                  # Run unit tests
pnpm test:watch           # Run tests in watch mode
pnpm test:coverage        # Run tests with coverage
pnpm test:e2e             # Run E2E tests
```

### Code Quality
```bash
pnpm lint                  # ESLint check
pnpm lint:fix             # Fix ESLint issues
pnpm format               # Format with Prettier
pnpm format:check         # Check formatting
```

### Utilities
```bash
pnpm check-env            # Validate environment variables
pnpm clean                # Clean build artifacts
pnpm reset                # Reset node_modules and lockfile
```

## 🌍 Technology Stack

### Frontend
- **Framework**: Next.js 15.x with App Router
- **Language**: TypeScript 5.x (strict mode)
- **Styling**: Tailwind CSS v4 with Ghana-inspired theme
- **UI Components**: Shadcn/ui with custom components
- **State Management**: Zustand + React Query

### Backend & Database
- **Database**: PostgreSQL via Supabase
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage

### DevOps & Deployment
- **Deployment**: Vercel with automatic deployments
- **CI/CD**: GitHub Actions
- **Monitoring**: Vercel Analytics, Lighthouse CI
- **Testing**: Vitest, React Testing Library, Playwright

### Monorepo
- **Tool**: Turbo + pnpm workspaces
- **Package Manager**: pnpm 8.x
- **Build System**: Turbopack for development

## 🎨 Ghana-Inspired Design System

### Color Palette
```css
/* Kente Colors */
--kente-gold: #FFD700
--kente-red: #CE1126
--kente-green: #006B3F

/* Adinkra Colors */
--adinkra-brown: #8B4513
--adinkra-cream: #FFFDD0
```

### Mobile-First Approach
- Optimized for 2G/3G connections
- Progressive Web App (PWA) capabilities
- Offline support with service worker
- WhatsApp integration for seamless communication

## 🔐 Environment Variables

### Required Variables
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_postgresql_connection_string

# WhatsApp Business (optional for development)
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token

# Payment Integration (Hubtel)
HUBTEL_CLIENT_ID=your_hubtel_client_id
HUBTEL_CLIENT_SECRET=your_hubtel_client_secret

# Other Services
OPENAI_API_KEY=your_openai_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
RESEND_API_KEY=your_resend_api_key
```

### Environment Setup
1. Copy `.env.example` to `sew4mi/apps/web/.env.local`
2. Fill in your actual values
3. Run `pnpm check-env` to validate

## 🧪 Testing Strategy

### Test Types
- **Unit Tests**: Component and utility testing with Vitest
- **Integration Tests**: Page and workflow testing
- **E2E Tests**: Full user journey testing with Playwright
- **Performance Tests**: Lighthouse CI with Web Vitals monitoring

### Coverage Requirements
- **Statements**: 80% minimum
- **Branches**: 70% minimum
- **Functions**: 80% minimum

### Running Tests
```bash
# Run all tests
pnpm test

# Run specific test suites
cd sew4mi/apps/web
pnpm test components/Button.test.tsx

# E2E tests with specific browser
pnpm test:e2e --project=chromium
```

## 🚀 Deployment

### Automatic Deployment
- **Production**: Deploys automatically on push to `main`
- **Preview**: Deploys automatically on pull requests
- **Environment**: Vercel with global CDN

### Manual Deployment
```bash
# Deploy to Vercel
vercel --prod

# Deploy specific environment
vercel --target=preview
```

### Performance Targets
- **Initial JS Bundle**: < 200KB
- **First Contentful Paint**: < 2s on 3G
- **Lighthouse Score**: > 90
- **Test Coverage**: > 80%

## 📊 CI/CD Pipeline

### Continuous Integration
- ✅ **Linting**: ESLint + Prettier checks
- ✅ **Testing**: Unit, integration, and E2E tests
- ✅ **Building**: Production build verification
- ✅ **Security**: Dependency audit and secret scanning
- ✅ **Performance**: Lighthouse CI and bundle analysis

### Workflows
- **CI**: Runs on every push and PR
- **Deploy**: Automatic production deployment
- **Preview**: PR preview deployments
- **Security**: Weekly security scans
- **Performance**: Daily performance monitoring
- **Dependencies**: Weekly dependency updates

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `pnpm test`
5. Commit using conventional commits: `git commit -m "feat: add amazing feature"`
6. Push to your fork: `git push origin feature/amazing-feature`
7. Create a Pull Request

### Code Standards
- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with 2-space indentation
- **Linting**: ESLint with Next.js and TypeScript rules
- **Commits**: Conventional Commits specification
- **Testing**: Comprehensive test coverage required

## 📝 Documentation

- **Architecture**: [docs/architecture/](docs/architecture/)
- **API Documentation**: [docs/api/](docs/api/)
- **Deployment Guide**: [DEPLOYMENT.md](sew4mi/DEPLOYMENT.md)
- **Contributing Guide**: [CONTRIBUTING.md](sew4mi/CONTRIBUTING.md)

## 🐛 Issues and Support

- **Bug Reports**: [Create an issue](https://github.com/sew4mi/sew4mi/issues/new?template=bug_report.yml)
- **Feature Requests**: [Request a feature](https://github.com/sew4mi/sew4mi/issues/new?template=feature_request.yml)
- **Security Issues**: Email security@sew4mi.com
- **General Discussion**: [GitHub Discussions](https://github.com/sew4mi/sew4mi/discussions)

## 📈 Performance Monitoring

### Built-in Monitoring
- **Vercel Analytics**: Real-time performance metrics
- **Web Vitals**: Core Web Vitals tracking
- **Lighthouse CI**: Automated performance testing
- **Bundle Analysis**: Bundle size monitoring

### Performance Budgets
- **JavaScript**: 200KB initial bundle
- **Images**: Optimized with next/image
- **Fonts**: Optimized loading with next/font
- **API Routes**: < 200ms average response time

## 🔒 Security

### Security Measures
- **Dependency Scanning**: Automated vulnerability scanning
- **Secret Scanning**: Prevents credential leaks
- **Security Headers**: OWASP recommended headers
- **Environment Isolation**: Separate dev/staging/production
- **Access Control**: Role-based permissions

### Security Best Practices
- Never commit secrets to version control
- Use environment variables for all configuration
- Regular dependency updates via automated PRs
- Security-first code review process

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Project Lead**: [Your Name]
- **Frontend Team**: Next.js & TypeScript specialists
- **Backend Team**: Supabase & PostgreSQL experts
- **DevOps Team**: GitHub Actions & Vercel deployment

## 🗺️ Roadmap

### Phase 1 - Foundation (Current)
- ✅ Project setup and infrastructure
- ✅ Authentication system
- 🔄 Basic marketplace functionality

### Phase 2 - Core Features
- 📋 Order management system
- 💳 Payment integration (Hubtel)
- 📱 WhatsApp Business integration

### Phase 3 - Advanced Features
- 🤖 AI-powered features (sizing, recommendations)
- 📊 Analytics and reporting
- 🌍 Multi-language support

---

**Made with ❤️ for Ghana's vibrant tailoring community**

For detailed setup instructions and troubleshooting, see [CLAUDE.md](CLAUDE.md).