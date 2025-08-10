# Sew4Mi External Services Setup Tracker

## 🎯 CRITICAL PATH: All services must be complete before development can begin

### Overall Progress: 0/6 Services Ready (0%)

---

## 📋 SERVICE STATUS OVERVIEW

| Service | Owner | Status | Priority | Est. Days | Target Date |
|---------|--------|--------|----------|-----------|-------------|
| 🟥 WhatsApp Business | Business Admin | ⭕ Not Started | HIGH | 3 days | Aug 15 |
| 🟥 Hubtel Payments | Finance Lead | ⭕ Not Started | CRITICAL | 7 days | Aug 13 |
| 🟥 OpenAI Whisper | Tech Lead | ⭕ Not Started | HIGH | 1 day | Aug 9 |
| 🟥 Google Maps API | Tech Lead | ⭕ Not Started | MEDIUM | 1 day | Aug 9 |
| 🟥 Resend Email | DevOps Lead | ⭕ Not Started | MEDIUM | 2 days | Aug 10 |
| 🟥 GitHub/Vercel Setup | DevOps Lead | ⭕ Not Started | HIGH | 1 day | Aug 9 |

---

## 🚨 CRITICAL ACTIONS NEEDED TODAY

### Immediate (Within 4 Hours)
- [ ] **Assign owners** for each service setup
- [ ] **Start WhatsApp Business** account creation (longest lead time)
- [ ] **Begin Hubtel** merchant application (requires legal docs)
- [ ] **Create OpenAI** account and generate API key

### By End of Day
- [ ] **Budget approvals** obtained ($320/month operational cost)
- [ ] **Legal documents** gathered for Hubtel KYC
- [ ] **Company credit card** ready for service subscriptions
- [ ] **DNS access** confirmed for email configuration

---

## 📊 DETAILED PROGRESS TRACKING

### 1. WhatsApp Business API Setup
**Owner:** Business Admin | **Priority:** HIGH | **Status:** 🟥 Not Started

| Step | Status | Notes | Due Date |
|------|--------|-------|----------|
| Create Meta Business Account | ⭕ Not Started | Requires company email | Aug 8 |
| Create WhatsApp Business App | ⭕ Not Started | Need phone number verification | Aug 9 |
| Configure webhook URL | ⭕ Not Started | https://api.sew4mi.com/webhooks/whatsapp | Aug 10 |
| Submit message templates | ⭕ Not Started | 5 templates needed | Aug 11 |
| Complete verification | ⭕ Not Started | Meta review 2-3 days | Aug 15 |

**Required Info to Collect:**
- [ ] Phone Number ID: ________________
- [ ] Business ID: ________________  
- [ ] Access Token: ________________
- [ ] Webhook Verify Token: ________________

**Blockers/Risks:**
- Meta verification can take up to 5 days
- Need business verification documents
- Phone number must be dedicated to WhatsApp Business

---

### 2. Hubtel Payment Integration
**Owner:** Finance Lead | **Priority:** CRITICAL | **Status:** 🟥 Not Started

| Step | Status | Notes | Due Date |
|------|--------|-------|----------|
| Register Hubtel account | ⭕ Not Started | https://hubtel.com | Aug 8 |
| Upload KYC documents | ⭕ Not Started | Certificate, TIN, Bank details | Aug 9 |
| Complete verification | ⭕ Not Started | 5-7 business days | Aug 13 |
| Get production credentials | ⭕ Not Started | Client ID, Secret, Merchant ID | Aug 14 |
| Configure webhooks | ⭕ Not Started | Success/failure URLs | Aug 15 |

**Required Documents:**
- [ ] Certificate of incorporation
- [ ] Tax identification number (TIN)
- [ ] Bank account details
- [ ] Authorized signatory ID

**Required Info to Collect:**
- [ ] Client ID: ________________
- [ ] Client Secret: ________________
- [ ] Merchant Account ID: ________________
- [ ] Webhook Secret: ________________

**Blockers/Risks:**
- KYC verification is manual process
- Required legal documents must be current
- Bank account must be business account

---

### 3. OpenAI Whisper API
**Owner:** Tech Lead | **Priority:** HIGH | **Status:** 🟥 Not Started

| Step | Status | Notes | Due Date |
|------|--------|-------|----------|
| Create OpenAI account | ⭕ Not Started | platform.openai.com | Aug 8 |
| Add payment method | ⭕ Not Started | Company credit card | Aug 8 |
| Generate API key | ⭕ Not Started | Whisper API scope only | Aug 8 |
| Set usage limits | ⭕ Not Started | $100/month initial | Aug 8 |
| Test with audio | ⭕ Not Started | Ghanaian accent sample | Aug 9 |

**Required Info to Collect:**
- [ ] Organization ID: ________________
- [ ] API Key: ________________
- [ ] Project ID: ________________

**Budget:** ~$0.006 per minute of audio (~$100/month estimated)

---

### 4. Google Cloud Services
**Owner:** Tech Lead | **Priority:** MEDIUM | **Status:** 🟥 Not Started

| Step | Status | Notes | Due Date |
|------|--------|-------|----------|
| Create GCP project | ⭕ Not Started | "sew4mi-production" | Aug 8 |
| Enable APIs | ⭕ Not Started | Maps, Geocoding, Distance, Places | Aug 8 |
| Create API key | ⭕ Not Started | Domain restrictions | Aug 8 |
| Set quotas | ⭕ Not Started | 1000/day each | Aug 8 |
| Enable billing | ⭕ Not Started | $300 free credit | Aug 9 |

**Required Info to Collect:**
- [ ] Project ID: ________________
- [ ] API Key: ________________
- [ ] Billing Account ID: ________________

**Budget:** $200/month after free credit

---

### 5. Resend Email Service
**Owner:** DevOps Lead | **Priority:** MEDIUM | **Status:** 🟥 Not Started

| Step | Status | Notes | Due Date |
|------|--------|-------|----------|
| Create Resend account | ⭕ Not Started | resend.com | Aug 8 |
| Add domain | ⭕ Not Started | sew4mi.com | Aug 8 |
| Configure DNS records | ⭕ Not Started | SPF, DKIM, DMARC | Aug 9 |
| Verify domain | ⭕ Not Started | 24 hour propagation | Aug 10 |
| Generate API key | ⭕ Not Started | Production key | Aug 10 |

**Required Info to Collect:**
- [ ] API Key: ________________
- [ ] Domain Verification Status: ________________
- [ ] Deliverability Score: ________________

**Budget:** $20/month for 10,000 emails

---

## 🔒 CREDENTIAL MANAGEMENT

### Secure Storage Locations
- **Development:** `.env.local` (never commit)
- **Staging:** Vercel Environment Variables
- **Production:** Vercel Environment Variables
- **CI/CD:** GitHub Secrets

### Environment Variables Template
```bash
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ID=
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=

# Hubtel Payments
HUBTEL_CLIENT_ID=
HUBTEL_CLIENT_SECRET=
HUBTEL_MERCHANT_ACCOUNT_ID=
HUBTEL_WEBHOOK_SECRET=

# OpenAI
OPENAI_API_KEY=
OPENAI_ORGANIZATION_ID=

# Google Maps
GOOGLE_MAPS_API_KEY=

# Resend Email
RESEND_API_KEY=
```

---

## 🚨 ESCALATION PROCEDURES

### Daily Standups
**Time:** 9:00 AM GMT daily  
**Duration:** 15 minutes  
**Focus:** Blocker removal and progress updates

### Escalation Matrix
| Issue Level | Contact | Response Time |
|-------------|---------|---------------|
| Blocked > 24hrs | Project Manager | 2 hours |
| Service Rejected | Business Stakeholder | 4 hours |
| Budget Issue | Finance Director | Same day |
| Technical Issue | Tech Lead | 1 hour |

### Risk Mitigation
- **WhatsApp Delay:** Use email/SMS for MVP launch
- **Payment Delay:** Implement cash-on-delivery temporarily
- **DNS Issues:** Use subdomain initially
- **Budget Delays:** Start with free tiers where available

---

## 📈 SUCCESS METRICS

### Completion Targets
- **Week 1:** All accounts created (6/6)
- **Week 2:** All credentials obtained (6/6) 
- **Week 3:** All integrations tested (6/6)
- **Week 4:** Development begins

### Quality Gates
- [ ] All services showing GREEN on health dashboard
- [ ] Integration tests passing
- [ ] Fallback strategies documented
- [ ] Team trained on credential management

---

## 📞 SUPPORT CONTACTS

| Service | Support Method | SLA | Notes |
|---------|---------------|-----|--------|
| WhatsApp | Meta Business Support | 24-48hrs | Use business.facebook.com |
| Hubtel | Email: merchants@hubtel.com | 24hrs | Phone: +233 30 818 1818 |
| OpenAI | help.openai.com | 24-72hrs | Priority support available |
| Google Cloud | Cloud Console Support | 4-24hrs | Based on support plan |
| Resend | support@resend.com | 12-24hrs | Community forum available |

---

**Last Updated:** August 8, 2025  
**Next Review:** Daily at 9:00 AM GMT  
**Owner:** [Project Manager Name]