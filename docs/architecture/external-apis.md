# External APIs

## WhatsApp Business Cloud API
- **Purpose:** Enable conversational commerce, automated notifications, voice message collection, and family group coordination
- **Documentation:** https://developers.facebook.com/docs/whatsapp/cloud-api
- **Base URL(s):** https://graph.facebook.com/v18.0/
- **Authentication:** Bearer token with Facebook App credentials
- **Rate Limits:** 80 messages/second for customer-initiated, 1000 messages/second for business-initiated

**Key Endpoints Used:**
- `POST /{phone_number_id}/messages` - Send text/voice messages to customers
- `POST /{phone_number_id}/messages` - Send template messages for order updates
- `GET /{media_id}` - Retrieve voice messages for processing
- `POST /webhook` - Receive incoming messages and status updates

**Integration Notes:** Webhook verification required, media URLs expire after 5 minutes, template messages must be pre-approved by Meta

## MTN Mobile Money API
- **Purpose:** Process customer payments through Ghana's largest mobile money provider
- **Documentation:** https://developer.mtn.com/products/momo-api
- **Base URL(s):** https://api.mtn.com/collection/v2/
- **Authentication:** OAuth 2.0 with API key and secret
- **Rate Limits:** 100 requests/second per API key

**Key Endpoints Used:**
- `POST /requesttopay` - Initiate payment request to customer
- `GET /requesttopay/{referenceId}` - Check payment status
- `POST /refund` - Process refunds for disputed orders
- `GET /account/balance` - Check merchant account balance

**Integration Notes:** Sandbox environment available for testing, callbacks required for payment confirmation, minimum transaction amount GHS 0.01

## Vodafone Cash API
- **Purpose:** Alternative mobile money provider for customer payments
- **Documentation:** [Request from Vodafone Ghana developer portal]
- **Base URL(s):** https://api.vodafone.com.gh/cash/v1/
- **Authentication:** API key with HMAC signature
- **Rate Limits:** 50 requests/second

**Key Endpoints Used:**
- `POST /payment/initiate` - Start payment transaction
- `GET /payment/status/{transactionId}` - Query transaction status
- `POST /payment/reverse` - Reverse failed transactions

**Integration Notes:** Requires merchant account verification, IP whitelisting required, test environment credentials needed from Vodafone

## OpenAI Whisper API
- **Purpose:** Transcribe voice messages in English, Twi, and Ga for measurement extraction
- **Documentation:** https://platform.openai.com/docs/guides/speech-to-text
- **Base URL(s):** https://api.openai.com/v1/
- **Authentication:** Bearer token with OpenAI API key
- **Rate Limits:** 50 requests/minute, 500,000 tokens/minute

**Key Endpoints Used:**
- `POST /audio/transcriptions` - Convert voice messages to text
- `POST /audio/translations` - Translate non-English audio to English

**Integration Notes:** Supports mp3, mp4, m4a formats up to 25MB, automatic language detection, may need fallback to Google Speech-to-Text for Ghanaian languages

## Google Maps API
- **Purpose:** Geocoding for tailor addresses and distance calculations for location-based search
- **Documentation:** https://developers.google.com/maps/documentation
- **Base URL(s):** https://maps.googleapis.com/maps/api/
- **Authentication:** API key with domain restrictions
- **Rate Limits:** 50 QPS for geocoding, 1000 elements/second for distance matrix

**Key Endpoints Used:**
- `GET /geocode/json` - Convert addresses to coordinates
- `GET /distancematrix/json` - Calculate distances between customers and tailors
- `GET /place/autocomplete/json` - Address autocomplete for registration

**Integration Notes:** Enable billing for production use, restrict API key by domain, cache geocoding results to reduce costs

## Resend Email API
- **Purpose:** Transactional email delivery for order confirmations and account notifications
- **Documentation:** https://resend.com/docs
- **Base URL(s):** https://api.resend.com/
- **Authentication:** Bearer token with API key
- **Rate Limits:** 100 emails/second

**Key Endpoints Used:**
- `POST /emails` - Send transactional emails
- `GET /emails/{id}` - Check email delivery status

**Integration Notes:** Domain verification required, webhook for delivery events, templates can be managed via API
