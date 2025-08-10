# Hubtel Payment Gateway Setup Guide

**Owner:** Finance Lead  
**Estimated Time:** 3-4 hours + 5-7 days verification  
**Difficulty:** Medium (requires legal documents)  
**Prerequisites:** Business registration documents, bank account, authorized signatory

---

## OVERVIEW

Hubtel aggregates all major Ghanaian mobile money providers (MTN, Vodafone, AirtelTigo) plus card payments, making it the single integration point for Sew4Mi's payment processing.

### What You'll Create
- Hubtel merchant account
- Production API credentials  
- Webhook endpoints configuration
- Test environment access

---

## DOCUMENT PREPARATION (Before Starting)

### Required Legal Documents
Gather these documents before beginning registration:

#### Business Registration
- [ ] **Certificate of Incorporation** (original or certified copy)
- [ ] **Business Registration Certificate** (Registrar General's Department)
- [ ] **Tax Identification Number (TIN)** certificate
- [ ] **Business Operating Permit** (if applicable)

#### Banking Information  
- [ ] **Business bank account statement** (last 3 months)
- [ ] **Bank account opening documents**
- [ ] **Authorized signatory list** from bank

#### Authorized Signatory Documents
- [ ] **Ghana Card or Passport** (authorized signatory)
- [ ] **Proof of address** (utility bill, bank statement)
- [ ] **Board resolution** authorizing the signatory (if applicable)

#### Business Information
- [ ] **Business address proof** (utility bill, lease agreement)
- [ ] **Contact information** (phone, email, website)
- [ ] **Nature of business description**

**📋 Document Checklist:**
- [ ] All documents are current (within 6 months)
- [ ] All documents are clear, readable scans/photos
- [ ] All pages of multi-page documents included
- [ ] Documents match business name exactly

---

## STEP-BY-STEP SETUP PROCESS

### Phase 1: Account Registration (Day 1 - 1 hour)

#### 1.1 Create Hubtel Account
1. **Go to:** https://hubtel.com
2. **Click:** "Get Started" or "Merchant Services"
3. **Select:** "Business Account"
4. **Fill business details:**
   - Business Name: "Sew4Mi Marketplace Ltd"
   - Business Type: "E-commerce/Online Marketplace"
   - Industry: "Fashion & Clothing"
   - Business Email: [company email]
   - Business Phone: [+233 company phone]

#### 1.2 Primary Contact Information
1. **Contact Person:** [Your name and title]
2. **Mobile Number:** [Your Ghana number]
3. **Email Address:** [Your work email]
4. **Role:** Account Administrator

#### 1.3 Account Verification Email
1. **Check email** for verification link
2. **Click verification link**
3. **Set strong password** (8+ chars, mixed case, numbers, symbols)
4. **Enable 2FA** (highly recommended)

**📋 Phase 1 Checklist:**
- [ ] Hubtel account created
- [ ] Email verified
- [ ] Strong password set
- [ ] 2FA enabled
- [ ] Basic business info entered

---

### Phase 2: Business Information & KYC (Day 1-2 - 2 hours)

#### 2.1 Complete Business Profile
1. **Login to Hubtel Dashboard**
2. **Navigate to:** Account > Business Profile
3. **Complete all required fields:**
   - Business Registration Number
   - Date of Incorporation  
   - Business Address (registered address)
   - Operational Address (if different)
   - Number of Employees
   - Expected Monthly Transaction Volume: GHS 100,000
   - Average Transaction Size: GHS 200

#### 2.2 Business Category & Services
1. **Primary Category:** E-commerce
2. **Sub-category:** Fashion & Apparel
3. **Services Offered:** "Custom clothing marketplace connecting customers with tailors"
4. **Target Customers:** "Ghanaian professionals and event-goers"
5. **Geographic Coverage:** "Greater Accra, Kumasi, Tamale"

#### 2.3 Document Upload
Upload all prepared documents:

1. **Certificate of Incorporation:**
   - Click "Upload" > Select file
   - Ensure all pages are clear
   - File size < 5MB per document

2. **TIN Certificate:**
   - Upload clear scan
   - Verify TIN matches business registration

3. **Bank Account Details:**
   - Account name must match business registration
   - Include bank statement (last 3 months)
   - Add account number and sort code

4. **Authorized Signatory Documents:**
   - Upload Ghana Card/Passport
   - Include authorization letter if not business owner
   - Add proof of address

#### 2.4 Banking Integration
1. **Bank Name:** [Your business bank]
2. **Account Name:** "Sew4Mi Marketplace Ltd"
3. **Account Number:** [Business account number]
4. **Branch:** [Bank branch name]
5. **SWIFT Code:** [If available]

**📋 Phase 2 Checklist:**
- [ ] Business profile completed 100%
- [ ] All documents uploaded clearly
- [ ] Banking details verified
- [ ] Document validation passed
- [ ] KYC submission confirmed

---

### Phase 3: Service Configuration (Day 2 - 1 hour)

#### 3.1 Payment Methods Setup
Select and configure payment options:

1. **Mobile Money:**
   - [x] MTN Mobile Money (required - largest market share)
   - [x] Vodafone Cash (required - second largest)
   - [x] AirtelTigo Money (recommended)

2. **Card Payments:**
   - [x] Visa (required)
   - [x] Mastercard (required)
   - [ ] American Express (optional)

3. **Bank Transfer:**
   - [x] Direct bank transfer (for large orders)

#### 3.2 Transaction Limits & Fees
Review and configure:

1. **Minimum Transaction:** GHS 5.00
2. **Maximum Transaction:** GHS 5,000.00 per transaction
3. **Daily Limit:** GHS 50,000.00
4. **Monthly Limit:** GHS 500,000.00

**Fee Structure (as of 2025):**
- MTN Mobile Money: 1.95% + GHS 0.20
- Vodafone Cash: 1.95% + GHS 0.20
- Card Payments: 2.95% + GHS 0.50
- Bank Transfer: GHS 2.00 flat fee

#### 3.3 Settlement Configuration
1. **Settlement Account:** [Your business bank account]
2. **Settlement Frequency:** Daily (recommended for cash flow)
3. **Settlement Time:** T+1 (next business day)
4. **Minimum Settlement Amount:** GHS 10.00

**📋 Phase 3 Checklist:**
- [ ] Payment methods configured
- [ ] Transaction limits set appropriately  
- [ ] Fee structure reviewed and accepted
- [ ] Settlement preferences configured

---

### Phase 4: Integration Setup (Day 3 - 30 minutes)

#### 4.1 Webhook Configuration
Set up webhooks for payment confirmations:

1. **Navigate to:** Developer > Webhooks
2. **Add Webhook URLs:**
   - Success URL: `https://api.sew4mi.com/webhooks/payment/success`
   - Failure URL: `https://api.sew4mi.com/webhooks/payment/failure`
   - Pending URL: `https://api.sew4mi.com/webhooks/payment/pending`

3. **Select Events:**
   - [x] Payment Successful
   - [x] Payment Failed
   - [x] Payment Pending
   - [x] Refund Processed

#### 4.2 API Key Generation (After Approval)
This step only becomes available after KYC approval:

1. **Navigate to:** Developer > API Keys
2. **Generate Keys:**
   - **Client ID:** [Will be provided]
   - **Client Secret:** [Will be provided]
   - **Merchant Account ID:** [Will be provided]

3. **Download Test Credentials** for development

**📋 Phase 4 Checklist:**
- [ ] Webhook URLs configured
- [ ] Event subscriptions selected
- [ ] Ready for API key generation (post-approval)

---

## KYC REVIEW PROCESS (Days 3-10)

### What Happens During Review

#### Automatic Validation (24-48 hours)
- Document format verification
- Business name matching across documents
- TIN validation against GRA database
- Bank account verification

#### Manual Review (3-5 days)  
- Business legitimacy assessment
- Risk evaluation
- Compliance checks
- Final approval decision

#### Possible Outcomes
1. **Approved:** Account activated, API keys generated
2. **Pending:** Additional documents requested
3. **Rejected:** Account application denied with reasons

### During Review Period

#### Do's:
- [ ] **Check email daily** for updates
- [ ] **Respond quickly** to document requests
- [ ] **Keep contact information current**
- [ ] **Prepare additional documents** if requested

#### Don'ts:
- ❌ **Don't create duplicate accounts**
- ❌ **Don't modify business information unnecessarily**
- ❌ **Don't contact support excessively**

---

## POST-APPROVAL SETUP (Day of Approval)

### Phase 5: Production Credentials (30 minutes)

#### 5.1 Collect API Credentials
Once approved, immediately collect:

1. **Login to Dashboard**
2. **Navigate to:** Developer > API Keys
3. **Generate Production Keys:**
   ```
   Client ID: [Record this]
   Client Secret: [Record this - shown only once]
   Merchant Account ID: [Record this]
   ```

4. **Generate Test Keys:**
   ```
   Test Client ID: [For development]
   Test Client Secret: [For development]
   Test Merchant Account ID: [For development]
   ```

#### 5.2 Webhook Secret Generation
1. **Navigate to:** Developer > Webhooks
2. **Generate Webhook Secret:** [For validating webhook authenticity]
3. **Test Webhook:** Send test payload to verify connectivity

#### 5.3 Final Configuration
1. **Review all settings** one final time
2. **Download API documentation**
3. **Note support contact information**
4. **Schedule integration handoff meeting**

**📋 Phase 5 Checklist:**
- [ ] Production API credentials collected
- [ ] Test credentials collected  
- [ ] Webhook secret generated
- [ ] Test payment processed successfully
- [ ] Ready for development integration

---

## CREDENTIAL HANDOFF

### Secure Credential Storage

**Development Environment Variables:**
```bash
# Hubtel Production Credentials
HUBTEL_CLIENT_ID=your_production_client_id
HUBTEL_CLIENT_SECRET=your_production_client_secret  
HUBTEL_MERCHANT_ACCOUNT_ID=your_merchant_account_id
HUBTEL_WEBHOOK_SECRET=your_webhook_secret

# Hubtel Test Credentials (for development)
HUBTEL_TEST_CLIENT_ID=your_test_client_id
HUBTEL_TEST_CLIENT_SECRET=your_test_client_secret
HUBTEL_TEST_MERCHANT_ACCOUNT_ID=your_test_merchant_account_id
HUBTEL_TEST_WEBHOOK_SECRET=your_test_webhook_secret

# Environment Configuration
HUBTEL_ENVIRONMENT=sandbox # or 'production'
```

### Security Requirements
1. **Never commit** credentials to version control
2. **Store in secure environment variables** only
3. **Rotate credentials** every 90 days
4. **Use test credentials** for all development
5. **Monitor transaction logs** regularly

---

## TESTING & VALIDATION

### Test Transaction Checklist
Before going live, complete these tests:

#### Mobile Money Tests
- [ ] MTN Mobile Money payment (small amount)
- [ ] Vodafone Cash payment (small amount)
- [ ] Failed payment handling
- [ ] Webhook receipt confirmation

#### Card Payment Tests  
- [ ] Successful card payment
- [ ] Failed card payment (insufficient funds)
- [ ] 3D Secure authentication
- [ ] Webhook receipt confirmation

#### Refund Tests
- [ ] Process partial refund
- [ ] Process full refund
- [ ] Webhook refund confirmation
- [ ] Settlement account credit

---

## TROUBLESHOOTING

### Common KYC Issues

#### Document Rejection
- **Issue:** Unclear or expired documents
- **Solution:** Re-upload clear, current documents
- **Timeline:** 24-48 hours for re-review

#### Bank Account Mismatch
- **Issue:** Account name doesn't match business registration
- **Solution:** Provide bank authorization letter
- **Timeline:** 2-3 days additional review

#### Missing Documents
- **Issue:** Required documents not provided
- **Solution:** Upload missing documents immediately
- **Timeline:** Restart review process

### Technical Issues

#### Webhook Not Receiving Data
- **Check:** URL is publicly accessible (not localhost)
- **Check:** HTTPS is enabled (required)
- **Check:** Webhook secret validation

#### API Authentication Failing
- **Check:** Client ID and Secret are correct
- **Check:** Environment (test vs production) matches credentials
- **Check:** Request headers include proper authentication

---

## ONGOING MANAGEMENT

### Monthly Tasks
- [ ] **Review transaction reports** for reconciliation
- [ ] **Monitor settlement deposits** to bank account
- [ ] **Check chargeback reports** if any
- [ ] **Review fee statements**

### Quarterly Tasks  
- [ ] **Rotate API credentials** (security best practice)
- [ ] **Review transaction limits** (adjust if needed)
- [ ] **Update contact information** if changed
- [ ] **Review compliance requirements**

### Annual Tasks
- [ ] **Renew business documents** (TIN, permits)
- [ ] **Update financial projections** with Hubtel
- [ ] **Review service agreement** terms
- [ ] **Conduct security audit** of integration

---

## SUCCESS CRITERIA

### KYC Approval ✅
- [ ] Account status: "Approved"
- [ ] All payment methods activated
- [ ] Settlement account configured
- [ ] API credentials generated

### Integration Ready ✅
- [ ] Test transactions successful
- [ ] Webhooks functioning properly
- [ ] Error handling tested
- [ ] Production credentials secured

### Operational Ready ✅
- [ ] Team trained on dashboard usage
- [ ] Monitoring procedures established
- [ ] Support contact established
- [ ] Reconciliation process defined

---

## SUPPORT & CONTACTS

### Hubtel Support
- **Email:** merchants@hubtel.com
- **Phone:** +233 30 818 1818
- **WhatsApp:** +233 55 818 1818
- **Hours:** 8:00 AM - 8:00 PM (Mon-Sat)

### Escalation Process
1. **First Contact:** Email merchants@hubtel.com
2. **Urgent Issues:** Call +233 30 818 1818
3. **Account Manager:** [Will be assigned post-approval]

### Documentation
- **API Documentation:** https://developers.hubtel.com
- **Dashboard Guide:** Available in Hubtel Dashboard
- **Integration Examples:** GitHub repository provided

---

**Estimated Timeline:** 7-10 business days from start to production ready  
**Critical Success Factor:** Complete, accurate documentation submission  
**Next Steps:** Hand off credentials to development team for integration

**Questions?** Contact Project Manager for immediate assistance.