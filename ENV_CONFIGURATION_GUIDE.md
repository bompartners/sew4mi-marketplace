# Environment Configuration Guide

## Required Environment Variables for Order Workflow

After implementing the order workflow fixes, the following environment variables are **REQUIRED** for the system to function properly:

### 1. WhatsApp/Twilio Configuration (Critical)
```env
# Twilio Account Credentials (Get from https://console.twilio.com)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886  # Sandbox for development

# For Production: WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=  # Facebook Graph API token
WHATSAPP_PHONE_NUMBER_ID=  # Your WhatsApp business phone ID
WHATSAPP_VERIFY_TOKEN=  # Your webhook verification token
WHATSAPP_BUSINESS_ACCOUNT_ID=  # Business account ID
```

### 2. Notification Settings
```env
# Enable/disable notification channels
NOTIFICATION_ENABLED=true  # Master switch for all notifications
WHATSAPP_ENABLED=true  # Enable WhatsApp messaging
SMS_FALLBACK_ENABLED=true  # Fallback to SMS if WhatsApp fails
```

### 3. Webhook Configuration
```env
# Your application's public URL (needed for callbacks)
WEBHOOK_BASE_URL=https://your-domain.com  # No trailing slash

# Secret for webhook signature verification
WEBHOOK_SIGNATURE_SECRET=your-secure-random-string-here
```

### 4. Hubtel Payment Gateway
```env
# Hubtel API Credentials
HUBTEL_CLIENT_ID=your-client-id
HUBTEL_CLIENT_SECRET=your-client-secret
HUBTEL_MERCHANT_ACCOUNT_ID=your-merchant-id
HUBTEL_CALLBACK_IPS=ip1,ip2,ip3  # Comma-separated Hubtel callback IP addresses
HUBTEL_ENVIRONMENT=sandbox  # Use 'production' for live
HUBTEL_CALLBACK_URL=https://your-domain.com/api/webhooks/hubtel
```

## Configuration Status Check

### ✅ Already Configured in Code:
1. **Notification Service** - Uses environment variables with fallbacks
2. **WhatsApp Service** - Auto-detects Twilio vs Facebook API based on config
3. **Webhook Handlers** - Ready to process payment confirmations
4. **Order Status Service** - State machine fully implemented

### ⚠️ Needs Configuration:
1. **Twilio Credentials** - Sign up at https://console.twilio.com
2. **Webhook URLs** - Update with your production domain
3. **Hubtel API Keys** - Get from Hubtel merchant dashboard
4. **Notification Flags** - Set based on your requirements

## Setup Steps

### 1. Development Setup
```bash
# Create .env.local file in sew4mi/apps/web/
cp .env.example .env.local

# Edit with your credentials
nano .env.local
```

### 2. Twilio WhatsApp Sandbox Setup
1. Go to https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn
2. Follow instructions to activate sandbox
3. Save the sandbox number (usually: whatsapp:+14155238886)
4. Join sandbox by sending "join [your-sandbox-word]" to the number

### 3. Test Configuration
```bash
# Check if environment variables are loaded
node -e "console.log(process.env.TWILIO_ACCOUNT_SID ? '✅ Twilio configured' : '❌ Twilio not configured')"

# Test notification service
curl -X POST http://localhost:3000/api/test/notifications \
  -H "Content-Type: application/json" \
  -d '{"phone": "+233241234567", "message": "Test message"}'
```

### 4. Production Checklist
- [ ] Replace sandbox WhatsApp number with production number
- [ ] Set HUBTEL_ENVIRONMENT=production
- [ ] Update WEBHOOK_BASE_URL with production domain
- [ ] Generate secure WEBHOOK_SIGNATURE_SECRET
- [ ] Enable SSL for webhook endpoints
- [ ] Set up monitoring for failed notifications

## Environment Variable Sources in Code

### Files Using These Variables:
1. **`lib/services/twilio.service.ts`**
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
   - `TWILIO_WHATSAPP_NUMBER`

2. **`lib/services/whatsapp-integration.service.ts`**
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_VERIFY_TOKEN`
   - `WHATSAPP_BUSINESS_ACCOUNT_ID`
   - `WEBHOOK_BASE_URL`

3. **`lib/config/env.ts`**
   - `HUBTEL_CLIENT_ID`
   - `HUBTEL_CLIENT_SECRET`
   - `HUBTEL_MERCHANT_ACCOUNT_ID`
   - `HUBTEL_CALLBACK_IPS` (optional but recommended for security)
   - `HUBTEL_ENVIRONMENT`
   - `HUBTEL_CALLBACK_URL`

## Fallback Behavior

The system has built-in fallbacks:
- **WhatsApp fails** → Falls back to SMS (if enabled)
- **SMS fails** → Logs error, continues operation
- **All notifications fail** → Order still processes, errors logged

## Security Notes

1. **Never commit `.env.local` to git**
2. **Use different credentials for dev/staging/production**
3. **Configure Hubtel callback IP whitelist for production**
4. **Monitor failed notification logs**
5. **Set up rate limiting for webhook endpoints**

## Verification Commands

```bash
# Check if all required env vars are set
npm run check:env

# Test Twilio connection
npm run test:twilio

# Test webhook signature verification
npm run test:webhook

# Send test notification
npm run test:notification -- --phone="+233241234567"
```

## Troubleshooting

### Common Issues:
1. **"Twilio credentials missing"** - Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
2. **"WhatsApp message failed"** - Verify phone number format (+233...)
3. **"Webhook signature invalid"** - Check WEBHOOK_SIGNATURE_SECRET matches
4. **"Notification not sent"** - Check NOTIFICATION_ENABLED=true

### Debug Mode:
```env
DEBUG=true
LOG_LEVEL=debug
```

This will log all notification attempts and webhook processing details.
