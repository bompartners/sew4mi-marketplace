# Epic 2: Payment & Trust Infrastructure

**Goal:** Implement the progressive escrow payment system that protects both customers and tailors, establishing Sew4Mi as Ghana's most trusted custom clothing marketplace.

## Story 2.1: Hubtel Payment Gateway Integration

As a developer,  
I want to integrate Hubtel's payment API,  
so that we can process mobile money and card payments securely.

**Acceptance Criteria:**
1. Hubtel SDK integrated with proper API credentials management
2. Payment initialization endpoint accepts amount and payment method
3. Webhook endpoint receives and verifies payment status callbacks
4. Support for MTN Mobile Money, Vodafone Cash, and AirtelTigo Money
5. Payment status tracking in database with transaction references
6. Retry logic for failed payment verifications
7. Test mode configuration for development environment

## Story 2.2: Progressive Escrow System

As a customer,  
I want to pay in three milestones (25%-50%-25%),  
so that my money is protected until I receive quality garments.

**Acceptance Criteria:**
1. Order payment structure defined with three milestone amounts
2. Initial 25% payment triggers order confirmation to tailor
3. 50% payment released upon fitting photo approval by customer
4. Final 25% payment released upon delivery confirmation
5. Funds held in escrow status until milestone completion
6. Clear payment timeline displayed to both parties
7. Automatic payment reminder notifications at each milestone

## Story 2.3: Milestone Verification System

As a platform moderator,  
I want to verify milestone completions with photo evidence,  
so that payments are released only for legitimate progress.

**Acceptance Criteria:**
1. Photo upload required at each milestone (design, fitting, completion)
2. Customer approval interface for reviewing milestone photos
3. 48-hour auto-approval if customer doesn't respond
4. Dispute flag option if customer rejects milestone
5. Photo storage in Supabase with CDN delivery
6. Image compression to optimize for Ghana bandwidth
7. Audit trail of all milestone approvals and rejections

## Story 2.4: Dispute Resolution Framework

As a customer or tailor,  
I want a fair dispute resolution process,  
so that conflicts are resolved quickly and transparently.

**Acceptance Criteria:**
1. Dispute creation form with category selection and description
2. Evidence upload capability (photos, messages, documents)
3. Admin dashboard showing all active disputes with priority levels
4. 48-hour SLA timer for initial admin response
5. Three-way messaging between customer, tailor, and mediator
6. Resolution options: full refund, partial refund, or order completion
7. Dispute history tracked for pattern identification

## Story 2.5: Payment Dashboard and Reporting

As an expert tailor,  
I want to track my earnings and payment history,  
so that I can manage my business finances effectively.

**Acceptance Criteria:**
1. Dashboard showing pending, completed, and disputed payments
2. Monthly earnings summary with commission calculations
3. Payment history with filtering by date range and status
4. Export functionality for CSV download
5. Automatic commission deduction (20% platform fee)
6. Tax invoice generation for completed orders
7. Mobile-responsive design for on-the-go access
