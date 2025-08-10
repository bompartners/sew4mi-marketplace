# Core Workflows

## Customer Order Creation Workflow

```mermaid
sequenceDiagram
    participant C as Customer
    participant W as Web App
    participant API as API Gateway
    participant OME as Order Engine
    participant DB as Database
    participant PS as Payment Service
    participant TS as Tailor Service
    participant NS as Notification Service
    participant WA as WhatsApp

    C->>W: Browse tailors & select
    W->>API: GraphQL: searchTailors()
    API->>DB: Query with filters
    DB-->>W: Tailor results
    
    C->>W: Create order with measurements
    W->>API: POST /orders
    API->>OME: CreateOrder command
    
    OME->>DB: Validate tailor availability
    OME->>DB: Create order (DRAFT)
    OME->>OME: Calculate escrow amounts
    OME->>DB: Update order (PENDING_DEPOSIT)
    
    OME->>PS: Initiate deposit payment
    PS->>PS: Generate payment request
    PS-->>C: Mobile money prompt
    
    C->>PS: Approve payment
    PS->>API: Webhook: Payment success
    API->>OME: Payment confirmed
    
    OME->>DB: Update order (DEPOSIT_PAID)
    OME->>TS: Notify tailor
    OME->>NS: Trigger notifications
    
    NS->>WA: Send WhatsApp confirmation
    NS->>C: Send email confirmation
    WA-->>C: Order confirmed message
```

## WhatsApp Voice Measurement Collection

```mermaid
sequenceDiagram
    participant C as Customer
    participant WA as WhatsApp
    participant WH as Webhook Handler
    participant VP as Voice Processor
    participant AI as OpenAI Whisper
    participant ML as Measurement Logic
    participant DB as Database
    participant NS as Notification Service

    C->>WA: Send voice message
    WA->>WH: Incoming message webhook
    
    WH->>WH: Verify webhook signature
    WH->>WA: Download voice file
    WA-->>WH: Audio file (m4a)
    
    WH->>VP: Process voice message
    VP->>AI: Transcribe audio
    AI-->>VP: Text transcription
    
    VP->>ML: Extract measurements
    Note over ML: Parse numbers and units<br/>Handle local language terms
    
    ML->>DB: Save measurement profile
    DB-->>ML: Profile saved
    
    ML->>NS: Send confirmation
    NS->>WA: Send measurement summary
    WA-->>C: "Measurements saved:<br/>Chest: 40 inches..."
    
    alt Invalid measurements
        ML->>NS: Request clarification
        NS->>WA: Send error message
        WA-->>C: "Please repeat chest measurement"
    end
```

## Order Milestone & Escrow Progression

```mermaid
sequenceDiagram
    participant T as Tailor
    participant W as Web App
    participant API as API Gateway
    participant OME as Order Engine
    participant DB as Database
    participant MS as Media Storage
    participant PS as Payment Service
    participant C as Customer

    T->>W: Upload milestone photo
    W->>MS: Store photo
    MS-->>W: Photo URL
    
    W->>API: POST /orders/{id}/milestones
    API->>OME: Add milestone
    
    OME->>DB: Save milestone record
    OME->>OME: Check milestone type
    
    alt Fitting milestone
        OME->>DB: Update status (READY_FOR_FITTING)
        OME->>C: Notify: Fitting ready
        
        C->>W: Approve fitting
        W->>API: Approve fitting
        API->>OME: Process approval
        
        OME->>PS: Release fitting payment
        PS->>T: Transfer 50% payment
        PS-->>OME: Payment confirmed
        
        OME->>DB: Update escrow (FITTING)
    else Completion milestone
        OME->>DB: Update status (READY_FOR_DELIVERY)
        OME->>C: Notify: Ready for pickup
        
        C->>W: Confirm delivery
        W->>API: Confirm delivery
        API->>OME: Process delivery
        
        OME->>PS: Release final payment
        PS->>T: Transfer 25% payment
        PS-->>OME: Payment confirmed
        
        OME->>DB: Update status (DELIVERED)
        OME->>DB: Update escrow (RELEASED)
    end
```

## Family Group Order Coordination

```mermaid
sequenceDiagram
    participant O as Organizer
    participant FM as Family Members
    participant WA as WhatsApp
    participant WH as Webhook Handler
    participant OME as Order Engine
    participant DB as Database
    participant API as API Gateway

    O->>WA: Create group order request
    WA->>WH: Process message
    WH->>OME: Create group order
    
    OME->>DB: Create GroupOrder
    OME->>WA: Send group invite link
    WA-->>FM: "Join family order for wedding"
    
    loop For each family member
        FM->>WA: Send measurements
        WA->>WH: Process member data
        WH->>OME: Add to group order
        OME->>DB: Create linked order
    end
    
    OME->>OME: Calculate group totals
    OME->>WA: Send summary to group
    WA-->>O: "5 orders ready, Total: GHS 2,500"
    
    O->>WA: Approve group order
    WA->>WH: Process approval
    WH->>OME: Initiate group payments
    
    par Payment collection
        OME->>FM: Request individual deposits
    and
        OME->>O: Track payment status
    end
    
    OME->>DB: Update group order status
    OME->>WA: Notify group of progress
```

## Dispute Resolution Workflow

```mermaid
sequenceDiagram
    participant C as Customer
    participant W as Web App
    participant API as API Gateway
    participant OME as Order Engine
    participant DB as Database
    participant AS as Admin Service
    participant A as Admin
    participant PS as Payment Service

    C->>W: Report issue with order
    W->>API: POST /orders/{id}/dispute
    API->>OME: Create dispute
    
    OME->>DB: Update order (DISPUTED)
    OME->>DB: Freeze escrow funds
    OME->>AS: Notify admin team
    
    AS-->>A: Alert: New dispute
    A->>AS: Review order details
    AS->>DB: Fetch order history
    DB-->>AS: Complete timeline
    
    A->>AS: Request evidence
    AS->>C: Request photos/details
    AS->>T: Request response
    
    C->>W: Upload evidence
    T->>W: Provide explanation
    
    A->>AS: Make decision
    
    alt Favor customer
        AS->>OME: Refund customer
        OME->>PS: Process refund
        PS->>C: Return payment
        OME->>DB: Update order (REFUNDED)
    else Favor tailor
        AS->>OME: Release payment
        OME->>PS: Release escrow
        PS->>T: Transfer funds
        OME->>DB: Update order (RESOLVED)
    else Partial resolution
        AS->>OME: Partial refund
        OME->>PS: Split payment
        PS->>C: Partial refund
        PS->>T: Partial payment
        OME->>DB: Update order (RESOLVED)
    end
    
    AS->>C: Notify resolution
    AS->>T: Notify resolution
```
