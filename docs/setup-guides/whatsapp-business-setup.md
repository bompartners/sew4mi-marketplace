# WhatsApp Business API Setup Guide

**Owner:** Business Admin  
**Estimated Time:** 4-6 hours over 3 days  
**Difficulty:** Medium  
**Prerequisites:** Business phone number, company verification documents

---

## OVERVIEW

WhatsApp Business API enables automated customer notifications, voice message collection for measurements, and family group coordination - critical features for Sew4Mi's customer experience.

### What You'll Create
- Meta Business Account
- WhatsApp Business App
- 5 approved message templates
- API credentials for development team

---

## STEP-BY-STEP PROCESS

### Phase 1: Meta Business Account Creation (Day 1 - 2 hours)

#### 1.1 Create Meta Business Account
1. **Go to:** https://business.facebook.com
2. **Click:** "Create Account" 
3. **Enter:**
   - Business Name: "Sew4Mi Marketplace"
   - Your Name: [Your name]
   - Work Email: [Company email]
4. **Verify email** and complete business profile
5. **Upload:** Business verification documents:
   - Certificate of incorporation
   - Tax identification number
   - Proof of business address

#### 1.2 Add Business Information
1. **Business Category:** E-commerce/Marketplace
2. **Business Description:** "Ghana's trusted custom clothing marketplace connecting customers with expert tailors"
3. **Website:** https://sew4mi.com (when ready)
4. **Business Hours:** 8:00 AM - 6:00 PM GMT (Mon-Sat)
5. **Address:** [Your business address in Ghana]

#### 1.3 Payment Method Setup
1. **Add company credit card** for potential future charges
2. **Set spending limit:** $50/month initially
3. **Enable automatic billing**

**📋 Phase 1 Checklist:**
- [ ] Meta Business Account created and verified
- [ ] Business information completed
- [ ] Payment method added
- [ ] Verification documents uploaded
- [ ] Account status: Active

---

### Phase 2: WhatsApp Business App Creation (Day 1-2 - 1 hour)

#### 2.1 Access Meta Developer Console
1. **Go to:** https://developers.facebook.com
2. **Login** with your Meta Business Account
3. **Click:** "My Apps" > "Create App"
4. **Select:** "Business" app type
5. **App Name:** "Sew4Mi Customer Communications"

#### 2.2 Configure WhatsApp Product
1. **In your app, click:** "Add Product"
2. **Select:** "WhatsApp" > "Set Up"
3. **Business Account:** Select your Meta Business Account
4. **Phone Number:** Add your dedicated business number
   - Format: +233XXXXXXXXX (Ghana format)
   - Must be dedicated to WhatsApp Business only
   - Cannot be used on personal WhatsApp

#### 2.3 Phone Number Verification
1. **Choose verification method:** SMS or Voice call
2. **Enter 6-digit code** received
3. **Confirm verification successful**
4. **Note your Phone Number ID** (needed for API calls)

**📋 Phase 2 Checklist:**
- [ ] Developer app created
- [ ] WhatsApp product added
- [ ] Business phone number verified
- [ ] Phone Number ID documented: ________________

---

### Phase 3: Message Templates Creation (Day 2 - 2 hours)

WhatsApp requires pre-approved templates for business-initiated messages. Create these 5 templates:

#### 3.1 Order Confirmation Template
1. **Navigate to:** WhatsApp Manager > Message Templates
2. **Click:** "Create Template"
3. **Template Name:** `order_confirmation`
4. **Category:** TRANSACTIONAL
5. **Language:** English (US)
6. **Template Content:**
```
Hello {{1}}! 👋

Your Sew4Mi order #{{2}} has been confirmed with expert tailor {{3}}.

📋 Order Details:
• Garment: {{4}}
• Total: GHS {{5}}
• Delivery: {{6}}

💰 Escrow Protection:
Your payment is secured. We'll release funds to the tailor only after you approve each milestone.

❓ Questions? Reply to this message or contact support.

Thank you for choosing Sew4Mi! 🇬🇭✨
```

#### 3.2 Payment Reminder Template
**Template Name:** `payment_reminder`  
**Category:** UTILITY  
**Content:**
```
Hi {{1}}! 💛

Your order #{{2}} is ready for the next payment milestone.

💰 Payment Due: GHS {{3}} ({{4}} milestone)
📅 Due Date: {{5}}

Tap here to pay securely: {{6}}

Your funds remain protected in escrow until you're satisfied with the work.

Need help? Just reply to this message.
```

#### 3.3 Delivery Notification Template  
**Template Name:** `delivery_ready`  
**Category:** TRANSACTIONAL  
**Content:**
```
Great news {{1}}! 🎉

Your custom {{2}} is ready for delivery!

📍 Pickup Location: {{3}}
📅 Available: {{4}}
👤 Contact: {{5}}

Please inspect your garment before final payment release.

Reply with "APPROVE" if you're satisfied, or "ISSUE" if there are concerns.

Congratulations on your new custom clothing! ✨
```

#### 3.4 Welcome Message Template
**Template Name:** `welcome_new_customer`  
**Category:** UTILITY  
**Content:**
```
Akwaaba {{1}}! Welcome to Sew4Mi! 🇬🇭

Ghana's most trusted custom clothing marketplace is ready to serve you.

✨ What makes us different:
• Expert verified tailors
• Escrow payment protection  
• Voice measurements in local languages
• Family order coordination

Ready to get started? Here are your options:
1. Browse expert tailors
2. Create your measurement profile
3. Place your first order

How can we help you today?
```

#### 3.5 Dispute Notification Template
**Template Name:** `dispute_opened`  
**Category:** UTILITY
**Content:**
```
Hi {{1}},

We've received your concern about order #{{2}} and take this seriously.

🔍 Our team will review within 24 hours
📞 Mediator: {{3}}
📧 Case #: {{4}}

We're committed to fair resolution for both customers and tailors.

You'll receive updates as we investigate. Thank you for your patience.

- Sew4Mi Support Team
```

#### 3.6 Template Submission Process
1. **For each template:**
   - Fill in all required fields
   - Add sample variable values for review
   - Click "Submit for Review"
2. **Wait for approval** (typically 24-48 hours)
3. **Check approval status** regularly
4. **Resubmit with modifications** if rejected

**📋 Phase 3 Checklist:**
- [ ] Order confirmation template created and submitted
- [ ] Payment reminder template created and submitted  
- [ ] Delivery notification template created and submitted
- [ ] Welcome message template created and submitted
- [ ] Dispute notification template created and submitted
- [ ] All templates approved (may take 2-3 days)

---

### Phase 4: Webhook Configuration (Day 3 - 1 hour)

#### 4.1 Set Webhook URL
1. **In WhatsApp Product settings, go to:** Configuration
2. **Webhook URL:** `https://api.sew4mi.com/webhooks/whatsapp`
3. **Verify Token:** Generate random string (save this!)
4. **Example:** `sew4mi_wh_verify_2025_secure_token`

#### 4.2 Subscribe to Webhook Events
Enable these webhook fields:
- [ ] `messages` (incoming customer messages)
- [ ] `message_deliveries` (delivery confirmations)
- [ ] `message_reads` (read receipts)
- [ ] `message_reactions` (customer reactions)

#### 4.3 Test Webhook Connection
1. **Click:** "Verify and Save"
2. **Confirm:** Webhook verification successful
3. **Send test message** to your business number
4. **Verify:** Webhook receives the message

**📋 Phase 4 Checklist:**
- [ ] Webhook URL configured
- [ ] Verify token generated and saved
- [ ] Webhook events subscribed
- [ ] Connection tested successfully
- [ ] Webhook verify token documented: ________________

---

## CREDENTIAL COLLECTION

After completing all phases, collect these credentials for the development team:

### Required API Credentials
```
WHATSAPP_PHONE_NUMBER_ID=1234567890123456
WHATSAPP_BUSINESS_ACCOUNT_ID=1234567890123456  
WHATSAPP_ACCESS_TOKEN=EAAF...
WHATSAPP_WEBHOOK_VERIFY_TOKEN=sew4mi_wh_verify_2025_secure_token
```

### Where to Find Each Credential

#### Phone Number ID
1. **WhatsApp Manager** > API Setup
2. **Copy** the number under "From Phone Number ID"

#### Business Account ID  
1. **WhatsApp Manager** > Settings  
2. **Business Info** > Business Account ID

#### Access Token
1. **Developer Console** > Your App > WhatsApp Product
2. **Temporary Token** (for testing) or **Permanent Token** (for production)
3. **⚠️ Important:** Token expires in 24 hours for testing

#### Webhook Verify Token
- This is the custom token you created in Phase 4

---

## TROUBLESHOOTING

### Common Issues & Solutions

#### Business Verification Rejected
- **Cause:** Incomplete or unclear documentation
- **Solution:** Upload higher quality images, ensure all text is readable
- **Timeline:** Resubmit within 24 hours

#### Phone Number Verification Failed
- **Cause:** Number already in use or incorrect format
- **Solution:** Use different number in correct +233XXXXXXXXX format
- **Timeline:** Immediate retry possible

#### Message Templates Rejected
- **Common reasons:**
  - Too promotional (avoid marketing language)
  - Missing required variables
  - Unclear business purpose
- **Solution:** Follow WhatsApp template guidelines exactly

#### Webhook Not Receiving Messages
- **Check:** URL is publicly accessible (not localhost)
- **Check:** Verify token matches exactly
- **Check:** HTTPS is enabled (required)

---

## SUCCESS CRITERIA

### Phase 1 Complete ✅
- [ ] Meta Business Account active and verified
- [ ] Business information complete
- [ ] Payment method configured

### Phase 2 Complete ✅  
- [ ] WhatsApp Business App created
- [ ] Phone number verified
- [ ] Phone Number ID obtained

### Phase 3 Complete ✅
- [ ] All 5 message templates approved
- [ ] Templates ready for production use

### Phase 4 Complete ✅
- [ ] Webhook configured and tested
- [ ] All credentials collected
- [ ] Ready for developer integration

---

## HANDOFF TO DEVELOPMENT TEAM

### Deliverables Checklist
- [ ] All API credentials documented securely
- [ ] Template names and IDs provided  
- [ ] Webhook configuration confirmed
- [ ] Test phone number for development
- [ ] Contact info for ongoing support

### Next Steps
1. **Provide credentials** to Tech Lead via secure channel
2. **Schedule integration meeting** with development team  
3. **Maintain access** for template updates and account management
4. **Monitor** message delivery rates during development

---

**Estimated Total Time:** 6-8 hours over 3 days  
**Critical Path:** Templates approval (2-3 days)  
**Success Metric:** Development team can send/receive WhatsApp messages

**Questions?** Contact Project Manager immediately for assistance.