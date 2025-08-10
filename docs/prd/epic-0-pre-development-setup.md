**Epic 0: Pre-Development Setup & External Services**

**Goal:** Complete all external service registrations, API credential acquisition, and foundational tooling setup before development begins, ensuring zero integration blockers and consistent development environments across the team.

### Story 0.1: External Service Account Setup & API Credential Management

As a platform administrator,
I want to set up all required external service accounts and securely manage API credentials,       
so that developers have necessary access for third-party integrations without delays.

**Acceptance Criteria:**

**USER/ADMIN RESPONSIBILITIES (Manual Actions Required):**

1. WhatsApp Business Setup (Owner: Business Admin)
    - [ ] Create Meta Business Account at business.facebook.com
    - [ ] Create WhatsApp Business App in Meta Developer Console
    - [ ] Configure webhook URL: https://api.sew4mi.com/webhooks/whatsapp
    - [ ] Submit 5 initial message templates for approval:
    * Order confirmation template
    * Payment reminder template
    * Delivery notification template
    * Welcome message template
    * Dispute notification template
    - [ ] Document Phone Number ID: ________________
    - [ ] Document Business ID: ________________
    - [ ] Document Access Token: ________________
    - **Timeline: 2-3 days for Meta verification**
    - **Contact: Meta Business Support if issues**

2. Payment Provider Setup (Owner: Finance/Business Admin)
    - [ ] Register for Hubtel account at https://hubtel.com
    - [ ] Complete business KYC verification with:
    * Certificate of incorporation
    * Tax identification number
    * Bank account details
    - [ ] Obtain production credentials:
    * Client ID: ________________
    * Client Secret: ________________
    * Merchant Account ID: ________________
    - [ ] Request sandbox environment access
    - [ ] Configure callback URLs:
    * Success: https://api.sew4mi.com/webhooks/payment/success
    * Failure: https://api.sew4mi.com/webhooks/payment/failure
    - **Timeline: 5-7 business days for verification**
    - **Contact: Hubtel merchant support**

3. AI/ML Services Setup (Owner: Technical Lead)
    - [ ] Create OpenAI account at platform.openai.com
    - [ ] Add payment method (company card)
    - [ ] Set initial monthly limit: $100
    - [ ] Generate API key with Whisper API scope only
    - [ ] Document Organization ID: ________________
    - [ ] Document API Key: ________________
    - [ ] Test with sample audio file (Ghanaian accent)
    - **Timeline: Immediate**
    - **Budget: ~$0.006 per minute of audio**

4. Google Cloud Services (Owner: Technical Lead)
    - [ ] Create Google Cloud Project: "sew4mi-production"
    - [ ] Enable APIs:
    * [ ] Maps JavaScript API
    * [ ] Geocoding API
    * [ ] Distance Matrix API
    * [ ] Places API
    - [ ] Create API key with restrictions:
    * HTTP referrers: *.sew4mi.com, localhost:3000
    - [ ] Set quotas:
    * Geocoding: 1000/day
    * Distance Matrix: 1000/day
    - [ ] Enable billing (use $300 free credit)
    - [ ] Document API Key: ________________
    - **Timeline: Immediate**
    - **Monthly budget: $200 after free credit**

5. Email Service Configuration (Owner: DevOps/Technical Lead)
    - [ ] Create Resend account at resend.com
    - [ ] Add domain: sew4mi.com
    - [ ] Configure DNS records:
    * [ ] SPF record added
    * [ ] DKIM record added
    * [ ] DMARC record added
    - [ ] Verify domain ownership
    - [ ] Generate API key
    - [ ] Document API Key: ________________
    - [ ] Test deliverability score (aim for >90)
    - **Timeline: 24 hours for DNS propagation**
    - **Monthly budget: $20 for 10,000 emails**

**DEVELOPER RESPONSIBILITIES (Automated Setup):**

6. Credential Management Implementation
    - [ ] Create `.env.example` with all variables
    - [ ] Configure Vercel environment variables
    - [ ] Set up GitHub Secrets for CI/CD
    - [ ] Create validation script: `npm run validate:env`
    - [ ] Document rotation schedule (90 days)

7. Integration Verification
    - [ ] Create health check dashboard at /api/health
    - [ ] Write integration tests for each service
    - [ ] Verify webhook endpoints publicly accessible
    - [ ] Test complete payment flow in sandbox
    - [ ] Document fallback strategies

8. Security Measures
    - [ ] Enable secret scanning in GitHub
    - [ ] Configure rate limiting for API calls
    - [ ] Set up audit logging for API usage
    - [ ] Create incident response runbook
    - [ ] Test credential rotation procedure

**Definition of Done:**
- [ ] All external accounts created and verified
- [ ] All API credentials stored in Vercel
- [ ] Health check showing all services GREEN
- [ ] Integration tests passing (npm run test:integration)
- [ ] Service outage runbook documented
- [ ] Team briefed on credential management

**Blockers & Risks:**
- WhatsApp Business verification can take up to 5 days
- Hubtel KYC requires legal documents
- DNS propagation may delay email service
- Google Maps API requires billing setup

### Story 0.2: Development Environment Standardization

As a development team lead,
I want standardized development environments across all developers,
so that we eliminate "works on my machine" issues and accelerate onboarding.

**Acceptance Criteria:**

1. Development Container Configuration
    - [ ] Create `.devcontainer/devcontainer.json`
    - [ ] Include: Node.js 20 LTS, pnpm 8.x, PostgreSQL 15
    - [ ] Pre-install VS Code extensions:
    * ESLint
    * Prettier
    * Tailwind CSS IntelliSense
    * GitLens
    * Thunder Client (API testing)
    - [ ] Configure Git hooks and aliases

2. Local Environment Setup Scripts
    - [ ] Create `scripts/setup-local.sh` (Mac/Linux)
    - [ ] Create `scripts/setup-local.ps1` (Windows)
    - [ ] Auto-install all dependencies
    - [ ] Configure local Supabase instance
    - [ ] Set up test database with migrations

3. Seed Data & Fixtures
    - [ ] 20 verified expert tailors (various specializations)
    - [ ] 50 customers with Ghana phone numbers
    - [ ] 100 orders in various states
    - [ ] 10 active disputes for testing
    - [ ] 5 group orders with family members

4. Development Tools
    - [ ] Prettier config with team rules
    - [ ] ESLint with custom ruleset
    - [ ] Husky for Git hooks
    - [ ] Commitlint for conventional commits
    - [ ] lint-staged for pre-commit checks

**Definition of Done:**
- [ ] New dev onboarded in <30 minutes
- [ ] Setup script works on all OS platforms
- [ ] Seed data covers all test scenarios
- [ ] No environment-related bugs in first sprint