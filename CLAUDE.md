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

### Twilio Configuration (SMS & WhatsApp)

For SMS and WhatsApp messaging functionality:
```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Twilio Sandbox or approved number
WEBHOOK_BASE_URL=https://your-domain.com      # For webhook callbacks
```

## Twilio Setup Guide

Sew4Mi uses Twilio for SMS and WhatsApp messaging to send order updates, milestone notifications, and payment confirmations to customers in Ghana.

### 1. Create Twilio Account

1. Go to [https://www.twilio.com](https://www.twilio.com)
2. Sign up for a free account
3. Complete phone verification
4. Note your Account SID and Auth Token from the dashboard

### 2. SMS Setup

1. **Buy a Phone Number:**
   - Go to Phone Numbers → Manage → Buy a number
   - Choose a number from Ghana (+233) or your preferred country
   - Ensure SMS capability is enabled
   - Cost: ~$1/month

2. **Test SMS:**
   ```bash
   # Use the Twilio Console or API to test
   curl -X POST "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID/Messages.json" \
   --data-urlencode "From=$TWILIO_PHONE_NUMBER" \
   --data-urlencode "Body=Test SMS from Sew4Mi" \
   --data-urlencode "To=+233XXXXXXXXX" \
   -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN
   ```

### 3. WhatsApp Setup

#### Option A: Sandbox (Development/Testing)
**Recommended for development and testing**

1. Go to Messaging → Try it out → Send a WhatsApp message
2. Follow instructions to join the sandbox:
   - Send `join [code-word]` to +1 415 523 8886
   - Example: `join shadow-exact`
3. Test with the sandbox number: `whatsapp:+14155238886`

#### Option B: Production WhatsApp (Business Use)
**Required for production deployment**

1. **Facebook Business Account:**
   - Create a Facebook Business page
   - Set up Facebook Developer account
   - Create WhatsApp Business app

2. **Business Verification:**
   - Submit business documents
   - Phone number verification
   - Wait 1-3 weeks for approval

3. **Template Approval:**
   - Create message templates in Twilio Console
   - Templates must be approved by WhatsApp
   - Include order confirmations, updates, etc.

### 4. Ghana Phone Number Formatting

The Twilio service includes `GhanaPhoneUtils` for proper phone number formatting:

```typescript
import { GhanaPhoneUtils } from '@/lib/services/twilio.service';

// Format for SMS
const smsNumber = GhanaPhoneUtils.formatGhanaNumber('0241234567');
// Returns: "+233241234567"

// Format for WhatsApp
const whatsappNumber = GhanaPhoneUtils.formatForWhatsApp('0241234567');
// Returns: "whatsapp:+233241234567"

// Validate Ghana numbers
const isValid = GhanaPhoneUtils.isValidGhanaNumber('0241234567');
// Returns: true (for MTN, Vodafone, AirtelTigo numbers)
```

### 5. Service Usage Examples

```typescript
import { twilioService, notificationService } from '@/lib/services';

// Send SMS
await twilioService.sendSMS({
  channel: MessageChannel.SMS,
  to: '0241234567',
  body: 'Your order #ORD123 has been confirmed!'
});

// Send WhatsApp
await twilioService.sendWhatsApp({
  channel: MessageChannel.WHATSAPP,
  to: '0241234567',
  body: '🧵 Your custom dress is ready for fitting!',
  mediaUrl: ['https://example.com/progress-photo.jpg']
});

// Send multi-channel notification
await notificationService.sendOrderNotification(
  '0241234567',
  'ORD123',
  'Your order has been confirmed!',
  { sms: true, whatsapp: true, push: true }
);
```

### 6. Webhook Configuration

Webhooks track message delivery status:

1. **Set webhook URLs in Twilio Console:**
   - SMS: `https://your-domain.com/api/webhooks/twilio`
   - WhatsApp: `https://your-domain.com/api/webhooks/twilio/whatsapp`

2. **Webhook Events:**
   - Message sent, delivered, failed
   - Incoming messages and media
   - Delivery receipts and read status

### 7. Cost Optimization

**SMS Pricing (Ghana):**
- Outbound SMS: ~$0.05 per message
- Inbound SMS: ~$0.01 per message

**WhatsApp Pricing:**
- Template messages: ~$0.02-0.05 per message
- Session messages: ~$0.005 per message
- Media messages: Same as text

**Best Practices:**
- Use WhatsApp for media-rich updates (photos, documents)
- Use SMS for critical notifications (payment confirmations)
- Implement fallback: WhatsApp → SMS if delivery fails
- Batch non-urgent notifications

### 8. Production Checklist

- [ ] Twilio account verified and funded
- [ ] Ghana phone number purchased and configured
- [ ] WhatsApp Business account approved (if using production)
- [ ] Message templates approved by WhatsApp
- [ ] Webhook endpoints secured with signature validation
- [ ] Environment variables configured in production
- [ ] Error handling and fallback notifications implemented
- [ ] Rate limiting configured to avoid API limits
- [ ] Message logging for analytics and debugging

### 9. Troubleshooting

**Common Issues:**

1. **Invalid Phone Numbers:**
   ```
   Error: Invalid Ghana phone number format
   Solution: Use GhanaPhoneUtils.formatGhanaNumber() for validation
   ```

2. **WhatsApp Sandbox Not Working:**
   ```
   Error: Failed to send WhatsApp message
   Solution: Ensure you've joined the sandbox with the correct code
   ```

3. **Webhook Signature Validation Failed:**
   ```
   Error: Invalid webhook signature
   Solution: Check TWILIO_AUTH_TOKEN and webhook URL configuration
   ```

4. **Rate Limiting:**
   ```
   Error: Too many requests
   Solution: Implement exponential backoff and respect rate limits
   ```

**Debug Mode:**
```typescript
// Enable detailed logging in development
process.env.NODE_ENV = 'development';
// Twilio service will log all message attempts without sending
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

## Code Duplication Prevention Rules

### 1. Component Reusability
- **NEVER** duplicate UI components - check `packages/ui/` first
- **ALWAYS** extract repeated UI patterns to `packages/ui/src/components/`
- **PREFER** composition over duplication - use compound components
- **CHECK** for existing Shadcn/ui components before creating custom ones
- **EXTRACT** component logic into custom hooks when used in 2+ places

### 2. Shared Types & Schemas
- **CENTRALIZE** all TypeScript types in `packages/shared/src/types/`
- **NEVER** duplicate type definitions across apps
- **USE** Zod schemas in `packages/shared/src/schemas/` for validation
- **SHARE** API response types between frontend and backend
- **EXPORT** database types from a single source of truth

### 3. Service Layer Patterns
- **EXTRACT** business logic to service files in `lib/services/`
- **NEVER** duplicate API calls - use repository pattern
- **CENTRALIZE** third-party integrations (WhatsApp, Hubtel, Supabase)
- **REUSE** error handling patterns through shared utilities
- **CREATE** a single service instance per domain (auth, payment, etc.)

### 4. Repository Pattern
- **USE** repositories in `lib/repositories/` for all data access
- **NEVER** make direct Supabase calls in components or pages
- **SHARE** query builders and filters across similar entities
- **ABSTRACT** pagination, sorting, and filtering logic
- **CENTRALIZE** cache invalidation strategies

### 5. Utility Functions
- **CHECK** `packages/shared/src/utils/` before creating utilities
- **EXTRACT** repeated calculations, formatters, and validators
- **SHARE** date formatting, currency conversion, phone validation
- **CENTRALIZE** Ghana-specific utilities (mobile money, phone formats)
- **NEVER** duplicate regex patterns or validation logic

### 6. Configuration Management
- **CENTRALIZE** app configuration in `packages/config/`
- **SHARE** ESLint, TypeScript, and Prettier configs
- **USE** environment variables through a single config file
- **NEVER** hardcode values that might change between environments
- **EXTRACT** feature flags to a central configuration

### 7. API Route Patterns
- **USE** middleware for repeated logic (auth, validation, CORS)
- **EXTRACT** common API responses to utility functions
- **SHARE** error response formats across all endpoints
- **CENTRALIZE** rate limiting and request validation
- **REUSE** database transaction patterns

### 8. Testing Patterns
- **SHARE** test utilities and mocks in `tests/utils/`
- **EXTRACT** test data factories for consistent test data
- **REUSE** custom render functions for React Testing Library
- **CENTRALIZE** Playwright page objects and selectors
- **NEVER** duplicate test setup or teardown logic

### 9. State Management
- **USE** Zustand stores for global state (in `lib/stores/`)
- **PREFER** React Query for server state over local state
- **SHARE** query keys and mutation functions
- **EXTRACT** complex state logic to custom hooks
- **NEVER** duplicate state synchronization logic

### 10. Styling & Theming
- **USE** Tailwind utility classes over custom CSS
- **CENTRALIZE** theme colors in Tailwind config
- **SHARE** animation classes and transitions
- **EXTRACT** repeated class combinations to component variants
- **NEVER** duplicate color values or spacing

### 11. Constants & Enums
- **DEFINE** all constants in `packages/shared/src/constants/`
- **USE** TypeScript enums for fixed sets of values
- **CENTRALIZE** Ghana-specific constants (regions, payment methods)
- **SHARE** status codes, error messages, and validation messages
- **NEVER** use magic numbers or strings

### 12. Hook Patterns
- **CHECK** existing hooks in `hooks/` before creating new ones
- **EXTRACT** component logic when used in multiple components
- **SHARE** data fetching hooks across similar features
- **CENTRALIZE** subscription and real-time update logic
- **COMPOSE** smaller hooks to build complex functionality

### 13. Error Handling
- **USE** a centralized error boundary component
- **SHARE** error logging and reporting utilities
- **STANDARDIZE** error message formats
- **EXTRACT** retry logic to reusable utilities
- **NEVER** duplicate try-catch patterns

### 14. Form Handling
- **USE** React Hook Form with shared validation schemas
- **EXTRACT** form field components to `packages/ui/`
- **SHARE** form submission handlers for similar forms
- **CENTRALIZE** file upload and image processing logic
- **REUSE** form error display components

### 15. Code Review Checklist
Before creating new code, always check:
1. Does this functionality already exist in `packages/shared/` or `packages/ui/`?
2. Can I extract this to a reusable utility or component?
3. Is there a similar pattern elsewhere in the codebase?
4. Would this benefit other apps in the monorepo?
5. Can I compose existing components instead of creating new ones?

### 16. Monorepo Best Practices
- **PREFER** workspace packages over relative imports
- **USE** `workspace:*` protocol for internal dependencies
- **SHARE** build configurations through `packages/config/`
- **CENTRALIZE** CI/CD scripts in root `scripts/` directory
- **NEVER** duplicate package dependencies across workspaces

### 17. Database & ORM Patterns
- **SHARE** database migrations and seeders
- **CENTRALIZE** Supabase client initialization
- **REUSE** row-level security policies patterns
- **EXTRACT** common query patterns (soft delete, audit trails)
- **NEVER** duplicate database schema definitions

### 18. Performance Patterns
- **SHARE** lazy loading and code splitting strategies
- **CENTRALIZE** image optimization utilities
- **REUSE** caching strategies (SWR, React Query configs)
- **EXTRACT** performance monitoring utilities
- **NEVER** duplicate optimization techniques

### DRY Principle Enforcement
When implementing any feature:
1. **SEARCH** first - look for existing implementations
2. **EXTRACT** second - pull out reusable parts
3. **CENTRALIZE** third - move to appropriate shared location
4. **DOCUMENT** fourth - update this file with new patterns
5. **REVIEW** fifth - ensure no duplication in PR

### Red Flags for Code Duplication
- Copy-pasting code between files
- Similar function names with slight variations
- Repeated import statements across files
- Multiple files with similar structure
- Hardcoded values appearing in multiple places
- Similar test cases with different data
- Repeated API endpoint definitions
- Duplicate validation logic
- Multiple error handling implementations
- Repeated UI patterns without abstraction