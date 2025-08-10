# Technical Assumptions

## Repository Structure: Monorepo
Initial development will use a monorepo structure for faster iteration and shared code reuse. This allows the frontend, backend API, admin dashboard, and infrastructure code to be managed together with consistent tooling and deployment pipelines.

## Service Architecture
**Microservices within Monorepo** - While maintaining a monorepo structure, the application will be architected as loosely coupled services: Core Marketplace Service, Payment Processing Service, Communication Service (WhatsApp/SMS), and Admin Service. Next.js API routes and Edge Functions provide serverless scalability.

## Testing Requirements
**Full Testing Pyramid** - Given the financial transactions and trust-critical nature of the platform, comprehensive testing is required:
- Unit tests for all business logic (minimum 80% coverage)
- Integration tests for Hubtel payment APIs and WhatsApp messaging
- E2E tests for critical user journeys (order placement, payment flow)
- Manual testing convenience methods for QA in Ghana's variable network conditions

## Additional Technical Assumptions and Requests

- **Frontend Framework:** Next.js with TypeScript (full-stack React framework optimized for Vercel)
- **Backend Framework:** Next.js API routes with Edge Functions for serverless scalability
- **Database & Auth:** Supabase providing PostgreSQL database, real-time subscriptions, and authentication
- **Cloud Provider:** Vercel for hosting with automatic scaling and global edge network
- **CDN:** Vercel's built-in edge network optimized for global content delivery
- **Payment Integration:** Hubtel API for unified payment processing (supports MTN Mobile Money, Vodafone Cash, AirtelTigo Money, Visa/Mastercard, and bank transfers)
- **Messaging:** WhatsApp Business Cloud API with advanced features (Interactive messages, catalogs, voice processing), SMS via Hubtel SMS API as fallback
- **File Storage:** Supabase Storage for photos and documents with CDN delivery
- **Real-time Features:** Supabase Realtime for order status updates and messaging
- **Authentication:** Supabase Auth with JWT tokens, social logins, and mobile OTP support
- **API Design:** Next.js API routes with tRPC for type-safe API calls
- **Monitoring:** Vercel Analytics and Supabase Dashboard for performance monitoring
- **Security:** Supabase Row Level Security (RLS), Vercel SSL certificates, API rate limiting
- **Mobile Strategy:** Progressive Web App (PWA) using Next.js PWA plugin
- **Offline Support:** Service workers with next-pwa for offline functionality
- **Image Optimization:** Vercel's built-in Next.js Image Optimization API
- **Deployment:** Vercel's GitHub integration for automatic deployments with preview environments
- **Escrow Implementation:** Custom escrow logic using Supabase Functions to manage payment milestones with Hubtel
- **Speech Processing:** Ghana-specific speech-to-text with NLP for measurement extraction from voice messages (English, Twi, Ga)
- **WhatsApp Bot Framework:** Conversational AI system with natural language understanding for order creation and customer support
- **Voice Message Pipeline:** Audio processing, transcription, measurement validation, and secure storage system
- **Group Management:** WhatsApp group integration APIs for family coordination and multi-user order management
- **Interactive Messaging:** WhatsApp Business API features including buttons, lists, catalogs, and media sharing
- **Multilingual Support:** Dynamic language detection and response generation for English, Twi, and Ga languages
