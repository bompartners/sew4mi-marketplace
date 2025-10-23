# Hubtel Support Email Draft

## Email Template for Webhook Secret Clarification

---

### **To:** merchants@hubtel.com

### **Subject:** Webhook Signature Verification - Payment API Integration Assistance

---

### **Email Body:**

Dear Hubtel Support Team,

I am integrating the Hubtel Receive Money API (Payment API) into our e-commerce marketplace application and need clarification on webhook signature verification to ensure secure payment callback handling.

**Our Integration Details:**
- **Business Name:** Sew4Mi Marketplace
- **Service:** Receive Money API (Mobile Money + Card Payments)
- **Integration Type:** RESTful API with webhook callbacks
- **Webhook Endpoint:** `https://api.sew4mi.com/api/webhooks/hubtel`

**Specific Questions:**

### 1. **Webhook Secret Location**
Where in the Hubtel Developer Dashboard can I find the webhook secret/signing key used to verify payment callback authenticity?

We've checked:
- Developer Portal (https://developers.hubtel.com/)
- API Keys section
- Webhooks configuration

Please specify:
- Exact menu navigation path (e.g., "Dashboard > API Keys > Webhook Secret")
- Field name (e.g., "Webhook Secret", "Signing Key", "Secret Key")
- Whether this is different from Client ID and Client Secret

### 2. **Webhook Signature Verification**
What is the correct signature verification method for payment webhooks?

Please confirm:
- **Signing Algorithm:** HMAC-SHA256, HMAC-SHA512, or other?
- **Signature Header Name:** What HTTP header contains the signature? (e.g., `x-hubtel-signature`, `x-signature`, `signature`)
- **Signature Format:** Is it hex-encoded, base64, or includes a prefix like `sha256=`?
- **What is Signed:** Raw request body (JSON string) or specific fields?

### 3. **Example Verification Process**
Could you provide:
- Sample webhook payload (JSON)
- Corresponding signature value
- Step-by-step signature calculation example
- Code example (any language) showing verification

### 4. **Test Credentials**
Are webhook secrets different between:
- **Sandbox/Test environment** vs. **Production environment**?
- **SMS API** vs. **Payment API**?

If yes, please specify how to obtain test webhook credentials for development.

### 5. **Documentation**
Could you point me to:
- Official webhook signature verification documentation
- Receive Money API webhook callback specification
- Any GitHub repositories with integration examples

**Our Current Implementation:**

We've implemented HMAC-SHA256 verification as follows:

```javascript
// Expected signature calculation
expectedSignature = HMAC-SHA256(webhookSecret, rawRequestBody)

// Comparison
if (expectedSignature === receivedSignature) {
  // Process webhook
}
```

**Is this approach correct for Hubtel webhooks?**

**Urgency:**
This is blocking our payment integration testing. We would appreciate a response within 1-2 business days.

**Preferred Contact Methods:**
- Email: [your-email@sew4mi.com]
- Phone: [your-phone-number]
- Available Hours: 9:00 AM - 6:00 PM GMT

Thank you for your assistance. We look forward to successfully integrating Hubtel's payment services into our platform.

Best regards,

[Your Name]
[Your Title]
Sew4Mi Marketplace
[Your Email]
[Your Phone Number]

---

## Alternative: WhatsApp Message Template

If you prefer to reach out via WhatsApp (+233 55 818 1818):

---

**Message 1:**

Hello Hubtel Support Team,

I'm integrating the Receive Money API for Sew4Mi Marketplace and need help locating the webhook secret for signature verification.

Could you guide me to where I can find this in the Developer Dashboard?

Business: Sew4Mi Marketplace
Service: Payment API

---

**Message 2 (After initial response):**

Thank you! I also need to confirm:

1. What signature algorithm do you use? (HMAC-SHA256?)
2. What HTTP header contains the signature?
3. Do you have documentation or code examples for webhook verification?

This is blocking our integration testing.

---

## Alternative: Phone Call Script

If calling +233 30 818 1818:

---

**Opening:**
"Hello, I'm calling regarding our Payment API integration for Sew4Mi Marketplace. I need assistance with webhook signature verification."

**Key Points to Cover:**
1. Where to find webhook secret in dashboard
2. Signature algorithm used (HMAC-SHA256?)
3. HTTP header name for signature
4. Request documentation or examples
5. Test credentials for sandbox environment

**Information to Provide:**
- Business Name: Sew4Mi Marketplace
- Integration: Receive Money API
- Webhook endpoint configured
- Need webhook secret location

**Request:**
"Could you email me detailed documentation or examples? My email is [your-email]"

---

## Follow-Up Actions

### If They Respond:
- [ ] Note exact dashboard location
- [ ] Confirm signature algorithm
- [ ] Verify header name
- [ ] Test signature verification
- [ ] Update codebase if needed
- [ ] Document in project

### If No Response in 48 Hours:
- [ ] Send follow-up email
- [ ] Try WhatsApp contact
- [ ] Call phone support
- [ ] Escalate to account manager (if assigned)

### Once Resolved:
- [ ] Update `ENV_CONFIGURATION_GUIDE.md`
- [ ] Update `docs/setup-guides/hubtel-payment-setup.md`
- [ ] Test webhook verification
- [ ] Document actual implementation

---

## Notes

**Important:**
- Be polite and professional
- Provide context (e-commerce marketplace)
- Emphasize security (signature verification)
- Request written documentation
- Ask for test credentials

**Information to Have Ready:**
- Your Hubtel account email
- Business registration details
- Merchant Account ID (if already assigned)
- Current integration status

---

**Created:** October 21, 2025
**Purpose:** Request webhook signature verification details from Hubtel
**Next Step:** Send email and track response

