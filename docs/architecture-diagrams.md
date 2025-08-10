# Sew4Mi Architecture Diagrams

## Table of Contents
1. [System Context Diagram](#system-context-diagram)
2. [Detailed Component Architecture](#detailed-component-architecture)
3. [Data Flow Diagrams](#data-flow-diagrams)
4. [Deployment Architecture](#deployment-architecture)
5. [Security Architecture](#security-architecture)
6. [WhatsApp Integration Architecture](#whatsapp-integration-architecture)
7. [Mobile Money Payment Flow](#mobile-money-payment-flow)
8. [Real-time Communication Architecture](#real-time-communication-architecture)

## System Context Diagram

```mermaid
C4Context
    title System Context Diagram - Sew4Mi Marketplace

    Person_Ext(customer, "Customer", "Ghana professional needing custom clothing")
    Person_Ext(tailor, "Expert Tailor", "Verified craftsperson creating custom garments")
    Person_Ext(admin, "Admin", "Platform administrator managing disputes")
    Person_Ext(family, "Family Members", "Coordinating group orders for events")

    System(sew4mi, "Sew4Mi Marketplace", "Trust-first custom clothing platform with progressive escrow")

    System_Ext(whatsapp, "WhatsApp Business", "Conversational commerce and voice measurements")
    System_Ext(mtn, "MTN Mobile Money", "Ghana's primary mobile payment provider")
    System_Ext(vodafone, "Vodafone Cash", "Alternative mobile payment provider")
    System_Ext(openai, "OpenAI Whisper", "Voice transcription for measurements")
    System_Ext(gmaps, "Google Maps", "Location services for tailor discovery")
    System_Ext(email, "Email Service", "Transactional email notifications")

    Rel(customer, sew4mi, "Browse tailors, create orders, track progress")
    Rel(tailor, sew4mi, "Manage orders, upload milestones, receive payments")
    Rel(admin, sew4mi, "Resolve disputes, verify tailors, monitor system")
    Rel(family, sew4mi, "Coordinate group orders via WhatsApp")

    Rel(sew4mi, whatsapp, "Send notifications, process voice messages")
    Rel(sew4mi, mtn, "Process mobile money payments")
    Rel(sew4mi, vodafone, "Alternative payment processing")
    Rel(sew4mi, openai, "Transcribe voice measurements")
    Rel(sew4mi, gmaps, "Geocode addresses, calculate distances")
    Rel(sew4mi, email, "Send confirmations and alerts")

    Rel(customer, whatsapp, "Send voice measurements, receive updates")
    Rel(family, whatsapp, "Coordinate in group chats")
    
    UpdateRelStyle(customer, sew4mi, $offsetY="-40", $offsetX="-50")
    UpdateRelStyle(tailor, sew4mi, $offsetY="-20", $offsetX="50")
```

## Detailed Component Architecture

```mermaid
C4Container
    title Container Diagram - Sew4Mi Internal Architecture

    Person(customer, "Customer", "Mobile user on 3G network")
    Person(tailor, "Tailor", "Expert craftsperson")

    Container_Boundary(frontend, "Frontend - Vercel Edge Network") {
        Container(webapp, "Next.js PWA", "React, TypeScript", "Progressive web app with offline support")
        Container(admin, "Admin Dashboard", "Next.js, React", "Internal admin tools")
        Container(sw, "Service Worker", "JavaScript", "Offline functionality and caching")
    }

    Container_Boundary(api, "API Layer - Vercel Edge Functions") {
        Container(restapi, "REST API", "TypeScript, Edge Functions", "CRUD operations and webhooks")
        Container(graphql, "GraphQL API", "TypeScript, Edge Functions", "Complex queries and real-time")
        Container(webhooks, "Webhook Handlers", "TypeScript, Edge Functions", "WhatsApp and payment callbacks")
    }

    Container_Boundary(services, "Business Services") {
        Container(orderengine, "Order Engine", "TypeScript, XState", "Order lifecycle management")
        Container(paymentservice, "Payment Service", "TypeScript", "Escrow and mobile money")
        Container(whatsappservice, "WhatsApp Service", "TypeScript", "Message processing and AI")
        Container(notifications, "Notification Service", "TypeScript", "Multi-channel messaging")
    }

    Container_Boundary(data, "Data Layer - Supabase") {
        ContainerDb(database, "PostgreSQL", "Supabase", "Primary data store with PostGIS")
        Container(auth, "Supabase Auth", "JWT, RLS", "Authentication and authorization")
        Container(storage, "Supabase Storage", "CDN", "Image and file storage")
        Container(realtime, "Supabase Realtime", "WebSockets", "Live order updates")
        ContainerDb(cache, "Vercel KV", "Redis", "Session and rate limiting")
    }

    System_Ext(whatsapp, "WhatsApp Business API")
    System_Ext(mobilemoney, "Mobile Money Providers")
    System_Ext(ai, "OpenAI Whisper API")

    Rel(customer, webapp, "Browse, order, track")
    Rel(tailor, webapp, "Manage orders, upload photos")
    Rel(webapp, sw, "Cache assets, offline queue")

    Rel(webapp, restapi, "API calls")
    Rel(webapp, graphql, "Complex queries")
    Rel(admin, restapi, "Admin operations")

    Rel(restapi, orderengine, "Order operations")
    Rel(graphql, orderengine, "Order queries")
    Rel(webhooks, paymentservice, "Payment updates")
    Rel(webhooks, whatsappservice, "Message processing")

    Rel(orderengine, database, "CRUD operations")
    Rel(paymentservice, database, "Transaction logs")
    Rel(whatsappservice, ai, "Voice transcription")
    Rel(notifications, whatsapp, "Send messages")

    Rel(paymentservice, mobilemoney, "Process payments")
    Rel(whatsappservice, whatsapp, "Webhook callbacks")

    Rel(webapp, realtime, "Live updates")
    Rel(restapi, auth, "User authentication")
    Rel(webapp, storage, "File uploads")
    Rel(restapi, cache, "Rate limiting")

    UpdateRelStyle(customer, webapp, $offsetY="-50")
    UpdateRelStyle(tailor, webapp, $offsetY="-30", $offsetX="70")
```

## Data Flow Diagrams

### Order Creation Data Flow

```mermaid
sequenceDiagram
    participant C as Customer
    participant W as WebApp
    participant A as API Gateway
    participant O as Order Engine
    participant D as Database
    participant P as Payment Service
    participant N as Notification Service
    participant WA as WhatsApp
    participant MM as Mobile Money

    Note over C,MM: Customer Order Creation Flow

    C->>+W: Select tailor & create order
    W->>+A: POST /api/orders/create
    A->>A: Validate JWT & input
    A->>+O: CreateOrder command

    O->>+D: Check tailor availability
    D-->>-O: Availability confirmed
    O->>+D: Create order record
    D-->>-O: Order created (PENDING_DEPOSIT)

    O->>O: Calculate escrow (25-50-25%)
    O->>+P: Initiate deposit payment
    P->>P: Generate payment request
    P-->>-O: Payment URL & reference

    O-->>-A: Order created with payment info
    A-->>-W: 201 Created + payment URL
    W-->>-C: Order created, redirecting to payment

    C->>+MM: Complete mobile money payment
    MM->>+A: Webhook: Payment confirmed
    A->>+O: Process payment confirmation
    
    O->>+D: Update order (DEPOSIT_PAID)
    D-->>-O: Order updated
    O->>+N: Trigger notifications

    par Parallel Notifications
        N->>WA: Send WhatsApp confirmation
        N->>C: Send email confirmation
        N->>Tailor: Notify new order
    end

    O-->>-A: Payment processed
    A-->>-MM: 200 OK
    MM-->>-C: Payment successful

    Note over C,MM: Order successfully created with deposit paid
```

### WhatsApp Voice Processing Data Flow

```mermaid
flowchart TD
    A[Customer sends voice message via WhatsApp] --> B[WhatsApp Business API]
    B --> C[Webhook Handler receives message]
    C --> D{Message type?}
    
    D -->|Voice| E[Download audio file]
    D -->|Text| F[Process text directly]
    
    E --> G[OpenAI Whisper transcription]
    G --> H[Extract measurements using NLP]
    F --> H
    
    H --> I{Valid measurements?}
    
    I -->|Yes| J[Save to measurement profile]
    I -->|No| K[Request clarification]
    
    J --> L[Send confirmation via WhatsApp]
    K --> M[Send error message via WhatsApp]
    
    L --> N[Update user profile]
    M --> O[Wait for new message]
    
    O --> C
    
    subgraph "Voice Processing Pipeline"
        E
        G
        H
    end
    
    subgraph "Data Validation"
        I
        J
        K
    end
    
    subgraph "Response Generation"
        L
        M
    end
```

## Deployment Architecture

### Production Deployment Diagram

```mermaid
graph TB
    subgraph "User Access Layer"
        U1[Ghana Customers<br/>Mobile 3G/4G]
        U2[Expert Tailors<br/>Mobile/Desktop]
        U3[Admin Users<br/>Desktop]
    end
    
    subgraph "CDN & Edge - Vercel Global Network"
        CDN[Vercel Edge CDN<br/>100+ Locations]
        EDGE[Edge Functions<br/>Europe Region (Closest to Ghana)]
    end
    
    subgraph "Application Layer - Vercel"
        WEB[Next.js Application<br/>Static + Server Components]
        API[API Routes<br/>Serverless Functions]
        ADMIN[Admin Dashboard<br/>Separate Deployment]
    end
    
    subgraph "Database Layer - Supabase EU"
        DB[(PostgreSQL<br/>with PostGIS)]
        AUTH[Supabase Auth<br/>JWT + RLS]
        STORAGE[Supabase Storage<br/>CDN Distribution]
        RT[Realtime Engine<br/>WebSocket Connections]
    end
    
    subgraph "External Services"
        WA[WhatsApp Business API<br/>Meta Infrastructure]
        MTN[MTN Mobile Money API<br/>Ghana]
        VOD[Vodafone Cash API<br/>Ghana]
        AI[OpenAI Whisper API<br/>Global]
        MAPS[Google Maps API<br/>Global]
    end
    
    subgraph "Monitoring & Logging"
        SENTRY[Sentry<br/>Error Tracking]
        AXIOM[Axiom<br/>Structured Logging]
        VERCEL_A[Vercel Analytics<br/>Performance Monitoring]
    end
    
    U1 --> CDN
    U2 --> CDN
    U3 --> CDN
    
    CDN --> EDGE
    EDGE --> WEB
    EDGE --> API
    WEB --> ADMIN
    
    API --> DB
    API --> AUTH
    API --> STORAGE
    WEB --> RT
    
    API --> WA
    API --> MTN
    API --> VOD
    API --> AI
    API --> MAPS
    
    WEB --> SENTRY
    API --> SENTRY
    API --> AXIOM
    WEB --> VERCEL_A
    
    classDef userLayer fill:#e1f5fe
    classDef edgeLayer fill:#f3e5f5
    classDef appLayer fill:#e8f5e8
    classDef dataLayer fill:#fff3e0
    classDef externalLayer fill:#ffebee
    classDef monitoringLayer fill:#f5f5f5
    
    class U1,U2,U3 userLayer
    class CDN,EDGE edgeLayer
    class WEB,API,ADMIN appLayer
    class DB,AUTH,STORAGE,RT dataLayer
    class WA,MTN,VOD,AI,MAPS externalLayer
    class SENTRY,AXIOM,VERCEL_A monitoringLayer
```

### CI/CD Pipeline Architecture

```mermaid
flowchart LR
    DEV[Developer Commits] --> GIT[GitHub Repository]
    GIT --> PR[Pull Request Created]
    
    PR --> CHECKS{GitHub Actions<br/>Quality Gates}
    
    CHECKS --> LINT[ESLint + Prettier]
    CHECKS --> TYPE[TypeScript Check]
    CHECKS --> TEST[Test Suite]
    CHECKS --> BUILD[Build Verification]
    
    LINT --> PREVIEW_CHECK{All Checks Pass?}
    TYPE --> PREVIEW_CHECK
    TEST --> PREVIEW_CHECK
    BUILD --> PREVIEW_CHECK
    
    PREVIEW_CHECK -->|No| FAIL[❌ PR Blocked]
    PREVIEW_CHECK -->|Yes| PREVIEW[Vercel Preview Deploy]
    
    PREVIEW --> REVIEW[Code Review + Manual Testing]
    REVIEW --> MERGE[Merge to Main]
    
    MERGE --> PROD_CHECKS{Production Checks}
    PROD_CHECKS --> E2E[E2E Tests]
    PROD_CHECKS --> SECURITY[Security Scan]
    PROD_CHECKS --> PERF[Performance Test]
    
    E2E --> PROD_DEPLOY{Ready for Production?}
    SECURITY --> PROD_DEPLOY
    PERF --> PROD_DEPLOY
    
    PROD_DEPLOY -->|No| ROLLBACK[❌ Auto Rollback]
    PROD_DEPLOY -->|Yes| PRODUCTION[🚀 Production Deploy]
    
    PRODUCTION --> VERIFY[Health Checks]
    VERIFY --> NOTIFY[Slack Notification]
    
    subgraph "Quality Gates"
        LINT
        TYPE
        TEST
        BUILD
    end
    
    subgraph "Production Gates"
        E2E
        SECURITY
        PERF
    end
    
    subgraph "Environments"
        PREVIEW
        PRODUCTION
    end
```

## Security Architecture

### Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant U as User (Mobile)
    participant W as Web App
    participant A as API Gateway
    participant SA as Supabase Auth
    participant DB as Database
    participant RLS as Row Level Security

    Note over U,RLS: Authentication Flow

    U->>+W: Login with phone/email
    W->>+SA: authenticate(credentials)
    SA->>SA: Verify credentials
    SA-->>-W: JWT access token + refresh token
    W->>W: Store tokens securely
    W-->>-U: Login successful

    Note over U,RLS: Authorized API Request

    U->>+W: Make API request
    W->>W: Get JWT from secure storage
    W->>+A: API request + Authorization header
    
    A->>+SA: Verify JWT token
    SA-->>-A: User data + role
    
    A->>A: Check role permissions
    A->>+DB: Database query with user context
    
    DB->>+RLS: Apply row level security
    RLS->>RLS: Filter data by user permissions
    RLS-->>-DB: Filtered results
    
    DB-->>-A: Authorized data only
    A-->>-W: API response
    W-->>-U: Updated UI

    Note over U,RLS: Security Layers
    Note right of SA: JWT validation
    Note right of A: Role-based access
    Note right of RLS: Data-level security
```

### Data Security & Privacy

```mermaid
flowchart TD
    subgraph "Data Classification"
        PII[Personal Data<br/>Names, Phone, Email]
        FINANCIAL[Financial Data<br/>Payment Info, Amounts]
        BUSINESS[Business Data<br/>Orders, Measurements]
        PUBLIC[Public Data<br/>Tailor Portfolios]
    end
    
    subgraph "Security Controls"
        ENCRYPT[Encryption at Rest<br/>AES-256]
        TLS[TLS 1.3 in Transit<br/>All API Calls]
        RLS[Row Level Security<br/>Database Access]
        JWT[JWT Authentication<br/>1hr Access, 7d Refresh]
    end
    
    subgraph "Privacy Controls"
        GDPR[GDPR Compliance<br/>Data Subject Rights]
        RETENTION[Data Retention<br/>Automated Cleanup]
        CONSENT[User Consent<br/>WhatsApp Opt-in]
        AUDIT[Audit Logging<br/>All Data Access]
    end
    
    subgraph "Access Controls"
        MFA[Multi-Factor Auth<br/>Admin Accounts]
        RBAC[Role-Based Access<br/>Customer/Tailor/Admin]
        API_KEYS[API Key Management<br/>External Services]
        RATE_LIMIT[Rate Limiting<br/>DDoS Protection]
    end
    
    PII --> ENCRYPT
    FINANCIAL --> ENCRYPT
    BUSINESS --> ENCRYPT
    PUBLIC --> TLS
    
    ENCRYPT --> RLS
    TLS --> JWT
    
    RLS --> GDPR
    JWT --> RETENTION
    
    GDPR --> MFA
    RETENTION --> RBAC
    CONSENT --> API_KEYS
    AUDIT --> RATE_LIMIT
    
    classDef dataClass fill:#ffcdd2
    classDef securityClass fill:#c8e6c9
    classDef privacyClass fill:#bbdefb
    classDef accessClass fill:#fff9c4
    
    class PII,FINANCIAL,BUSINESS,PUBLIC dataClass
    class ENCRYPT,TLS,RLS,JWT securityClass
    class GDPR,RETENTION,CONSENT,AUDIT privacyClass
    class MFA,RBAC,API_KEYS,RATE_LIMIT accessClass
```

## WhatsApp Integration Architecture

### WhatsApp Business API Integration

```mermaid
graph TB
    subgraph "User Layer"
        C[Customer with WhatsApp]
        F[Family Group Chat]
    end
    
    subgraph "WhatsApp Platform"
        WBA[WhatsApp Business API]
        META[Meta Servers]
    end
    
    subgraph "Sew4Mi Integration"
        WH[Webhook Handler<br/>Vercel Edge Function]
        VP[Voice Processor<br/>Audio → Text → Data]
        ML[Message Logic<br/>Intent Recognition]
        DB[(Message History<br/>PostgreSQL)]
    end
    
    subgraph "AI Services"
        WHISPER[OpenAI Whisper<br/>Speech-to-Text]
        NLP[Custom NLP<br/>Measurement Extraction]
    end
    
    subgraph "Business Services"
        ORDER[Order Service<br/>State Management]
        MEASURE[Measurement Service<br/>Profile Management]
        NOTIFY[Notification Templates<br/>Multi-language]
    end
    
    C -->|Voice/Text Messages| WBA
    F -->|Group Coordination| WBA
    WBA -->|Webhook| WH
    
    WH -->|Audio File| VP
    VP -->|Audio| WHISPER
    WHISPER -->|Transcript| NLP
    NLP -->|Structured Data| MEASURE
    
    WH -->|Text Message| ML
    ML -->|Intent| ORDER
    ML -->|Intent| MEASURE
    
    WH -->|Store| DB
    ORDER -->|Update Status| NOTIFY
    MEASURE -->|Confirm Saved| NOTIFY
    
    NOTIFY -->|Response Message| WBA
    WBA -->|Delivery| C
    WBA -->|Group Update| F
    
    subgraph "Message Types"
        VOICE[Voice Measurements<br/>"My chest is 40 inches"]
        TEXT[Text Orders<br/>"I want a shirt"]
        PHOTO[Photo Sharing<br/>Fabric selections]
        STATUS[Status Updates<br/>Order progress]
    end
    
    VP -.->|Handles| VOICE
    ML -.->|Handles| TEXT
    WH -.->|Handles| PHOTO
    NOTIFY -.->|Sends| STATUS
```

### WhatsApp Message Flow States

```mermaid
stateDiagram-v2
    [*] --> ReceiveMessage : WhatsApp webhook
    
    ReceiveMessage --> ValidateSignature : Verify Meta signature
    ValidateSignature --> MessageType : Signature valid
    ValidateSignature --> Reject : Invalid signature
    
    MessageType --> TextMessage : Text content
    MessageType --> VoiceMessage : Audio file
    MessageType --> ImageMessage : Photo/document
    MessageType --> StatusMessage : Read/delivery receipt
    
    TextMessage --> ParseIntent : Extract user intent
    VoiceMessage --> DownloadAudio : Get audio file
    ImageMessage --> ProcessImage : Handle photo
    StatusMessage --> UpdateStatus : Track message status
    
    DownloadAudio --> TranscribeAudio : OpenAI Whisper
    TranscribeAudio --> ExtractMeasurements : NLP processing
    
    ParseIntent --> OrderIntent : Order-related
    ParseIntent --> MeasurementIntent : Measurement-related  
    ParseIntent --> StatusIntent : Status inquiry
    ParseIntent --> UnknownIntent : Unrecognized
    
    ExtractMeasurements --> ValidateMeasurements : Check data quality
    ValidateMeasurements --> SaveMeasurements : Valid data
    ValidateMeasurements --> RequestClarification : Invalid/incomplete
    
    OrderIntent --> ProcessOrder : Handle order request
    MeasurementIntent --> SaveMeasurements : Store measurement data
    StatusIntent --> GetOrderStatus : Query current status
    UnknownIntent --> SendHelp : Provide assistance
    
    ProcessOrder --> SendConfirmation : Order processed
    SaveMeasurements --> SendConfirmation : Data saved
    GetOrderStatus --> SendStatus : Status response
    RequestClarification --> SendClarification : Ask for more info
    SendHelp --> SendHelpMenu : Show options
    
    SendConfirmation --> [*]
    SendStatus --> [*]
    SendClarification --> [*]
    SendHelpMenu --> [*]
    Reject --> [*]
    UpdateStatus --> [*]
    ProcessImage --> [*]
    
    note right of ValidateSignature : Security checkpoint
    note right of ExtractMeasurements : AI-powered processing
    note right of ValidateMeasurements : Data quality control
```

## Mobile Money Payment Flow

### Payment Processing Architecture

```mermaid
sequenceDiagram
    participant C as Customer
    participant W as Sew4Mi Web App
    participant P as Payment Service
    participant MTN as MTN MoMo API
    participant VOD as Vodafone Cash API
    participant WH as Payment Webhook
    participant DB as Database
    participant N as Notifications

    Note over C,N: Mobile Money Payment Flow

    C->>+W: Click "Pay Deposit" button
    W->>+P: initiate_payment(order_id, amount, provider)
    
    P->>P: Generate unique transaction_id
    P->>+DB: Store transaction (PENDING)
    DB-->>-P: Transaction saved
    
    alt MTN Mobile Money
        P->>+MTN: POST /requesttopay
        MTN-->>-P: Request accepted + reference_id
        P-->>W: Payment initiated + MTN reference
    else Vodafone Cash  
        P->>+VOD: POST /payment/initiate
        VOD-->>-P: Request accepted + transaction_id
        P-->>W: Payment initiated + Vodafone reference
    end
    
    W-->>-C: Payment request sent to your phone
    
    Note over C: Customer receives mobile money prompt on phone
    
    C->>C: Enter mobile money PIN
    
    alt MTN Callback
        MTN->>+WH: POST /webhooks/payment/mtn
        WH->>WH: Verify webhook signature
        WH->>+P: process_callback(mtn_data)
        P->>+DB: Update transaction (SUCCESS/FAILED)
    else Vodafone Callback
        VOD->>+WH: POST /webhooks/payment/vodafone  
        WH->>WH: Verify webhook signature
        WH->>+P: process_callback(vodafone_data)
        P->>+DB: Update transaction (SUCCESS/FAILED)
    end
    
    DB-->>-P: Transaction updated
    P->>P: Update order escrow stage
    P->>+N: trigger_notifications(order_updated)
    
    par Parallel Notifications
        N->>C: WhatsApp: "Payment received! ✅"
        N->>Tailor: WhatsApp: "New order - start work!"  
        N->>C: Email confirmation
    end
    
    P-->>-WH: Callback processed
    WH-->>MTN: 200 OK
    WH-->>VOD: 200 OK
    
    Note over C,N: Payment complete, order moves to next escrow stage
```

### Payment Provider Failover

```mermaid
flowchart TD
    START[Payment Initiated] --> SELECT{Provider Selection}
    
    SELECT -->|Primary| MTN[Try MTN MoMo]
    SELECT -->|Fallback| VOD[Try Vodafone Cash]
    SELECT -->|User Choice| BOTH[Both Available]
    
    MTN --> MTN_RESULT{MTN Response}
    VOD --> VOD_RESULT{Vodafone Response}
    BOTH --> USER_SELECT[User Selects Provider]
    
    USER_SELECT --> MTN
    USER_SELECT --> VOD
    
    MTN_RESULT -->|Success| MTN_PROCESS[Process MTN Payment]
    MTN_RESULT -->|Failure| MTN_RETRY[Retry MTN]
    MTN_RESULT -->|Error| FALLBACK_VOD[Try Vodafone]
    
    VOD_RESULT -->|Success| VOD_PROCESS[Process Vodafone Payment]
    VOD_RESULT -->|Failure| VOD_RETRY[Retry Vodafone]
    VOD_RESULT -->|Error| FALLBACK_MTN[Try MTN]
    
    MTN_RETRY --> MTN_RETRY_RESULT{Retry Result}
    VOD_RETRY --> VOD_RETRY_RESULT{Retry Result}
    
    MTN_RETRY_RESULT -->|Success| MTN_PROCESS
    MTN_RETRY_RESULT -->|Failure| FALLBACK_VOD
    
    VOD_RETRY_RESULT -->|Success| VOD_PROCESS
    VOD_RETRY_RESULT -->|Failure| FALLBACK_MTN
    
    FALLBACK_VOD --> VOD
    FALLBACK_MTN --> MTN
    
    MTN_PROCESS --> SUCCESS[✅ Payment Successful]
    VOD_PROCESS --> SUCCESS
    
    SUCCESS --> UPDATE_ORDER[Update Order Status]
    UPDATE_ORDER --> NOTIFY[Notify All Parties]
    NOTIFY --> END[Complete]
    
    subgraph "Error Handling"
        ERROR[❌ All Providers Failed]
        ERROR --> MANUAL[Flag for Manual Review]
        MANUAL --> SUPPORT[Customer Support Contact]
    end
    
    MTN_RETRY_RESULT -->|Final Failure| ERROR
    VOD_RETRY_RESULT -->|Final Failure| ERROR
    
    classDef successClass fill:#c8e6c9
    classDef errorClass fill:#ffcdd2
    classDef processClass fill:#bbdefb
    classDef retryClass fill:#fff9c4
    
    class SUCCESS,UPDATE_ORDER,NOTIFY,END successClass
    class ERROR,MANUAL,SUPPORT errorClass
    class MTN_PROCESS,VOD_PROCESS processClass
    class MTN_RETRY,VOD_RETRY,FALLBACK_VOD,FALLBACK_MTN retryClass
```

## Real-time Communication Architecture

### Supabase Realtime Integration

```mermaid
graph TB
    subgraph "Client Side - React Components"
        ORDER_PAGE[Order Details Page]
        DASHBOARD[Tailor Dashboard]
        ADMIN_PANEL[Admin Panel]
    end
    
    subgraph "Supabase Realtime Engine"
        RT_SERVER[Realtime Server<br/>WebSocket Manager]
        RT_AUTH[Realtime Auth<br/>JWT Validation]
        RT_RLS[Realtime RLS<br/>Row Level Security]
    end
    
    subgraph "Database Events"
        DB_TRIGGER[Database Triggers<br/>INSERT/UPDATE/DELETE]
        CHANGE_LOG[Change Log<br/>WAL Processing]
    end
    
    subgraph "Business Logic"
        ORDER_SERVICE[Order Service<br/>State Transitions]
        PAYMENT_SERVICE[Payment Service<br/>Transaction Updates]
        MILESTONE_SERVICE[Milestone Service<br/>Progress Updates]
    end
    
    ORDER_PAGE -->|Subscribe to Order Updates| RT_SERVER
    DASHBOARD -->|Subscribe to Tailor Orders| RT_SERVER
    ADMIN_PANEL -->|Subscribe to All Orders| RT_SERVER
    
    RT_SERVER -->|Validate Connection| RT_AUTH
    RT_AUTH -->|Apply Security| RT_RLS
    
    ORDER_SERVICE -->|Update Order Status| DB_TRIGGER
    PAYMENT_SERVICE -->|Payment Confirmed| DB_TRIGGER
    MILESTONE_SERVICE -->|Photo Uploaded| DB_TRIGGER
    
    DB_TRIGGER -->|Database Change| CHANGE_LOG
    CHANGE_LOG -->|Broadcast Change| RT_SERVER
    
    RT_RLS -->|Filtered Update| ORDER_PAGE
    RT_RLS -->|Filtered Update| DASHBOARD
    RT_RLS -->|Admin Access| ADMIN_PANEL
    
    subgraph "Subscription Types"
        SUB_ORDER[Order Status Changes<br/>ORDER_ID filter]
        SUB_TAILOR[Tailor's Orders<br/>TAILOR_ID filter]
        SUB_CUSTOMER[Customer's Orders<br/>CUSTOMER_ID filter]
        SUB_ADMIN[All System Events<br/>Admin role required]
    end
    
    RT_RLS -.->|Applies Filter| SUB_ORDER
    RT_RLS -.->|Applies Filter| SUB_TAILOR
    RT_RLS -.->|Applies Filter| SUB_CUSTOMER
    RT_RLS -.->|Admin Access| SUB_ADMIN
```

### WebSocket Connection Management

```mermaid
stateDiagram-v2
    [*] --> Disconnected : Initial State
    
    Disconnected --> Connecting : User opens app
    Connecting --> Connected : WebSocket established
    Connecting --> ConnectionFailed : Connection timeout
    
    Connected --> Authenticating : Send JWT token
    Authenticating --> Authenticated : Token valid
    Authenticating --> AuthFailed : Token invalid/expired
    
    Authenticated --> Subscribing : Subscribe to channels
    Subscribing --> ActiveSubscription : Subscriptions confirmed
    
    ActiveSubscription --> ReceivingUpdates : Real-time data flow
    ReceivingUpdates --> ProcessingUpdate : Handle incoming message
    ProcessingUpdate --> ReceivingUpdates : Update processed
    
    ReceivingUpdates --> NetworkDisconnected : Connection lost
    NetworkDisconnected --> Reconnecting : Auto-reconnect attempt
    Reconnecting --> Connected : Reconnection successful
    Reconnecting --> ConnectionFailed : Reconnection failed
    
    AuthFailed --> RefreshingToken : Attempt token refresh
    RefreshingToken --> Authenticating : New token obtained
    RefreshingToken --> Disconnected : Refresh failed - logout
    
    ConnectionFailed --> RetryDelay : Wait before retry
    RetryDelay --> Connecting : Retry connection
    
    ActiveSubscription --> Unsubscribing : User navigates away
    Unsubscribing --> Connected : Unsubscribed from channels
    Connected --> Disconnected : Close connection
    
    note right of Reconnecting : Exponential backoff
    note right of ProcessingUpdate : Update UI optimistically
    note right of RefreshingToken : Silent refresh
```

---

## Usage Guidelines

### For Developers
- Use these diagrams as reference during implementation
- Update diagrams when architecture changes
- Include diagram references in code comments for complex flows

### For Product Teams
- Reference user flows for feature planning
- Use system context for stakeholder presentations
- Security diagrams help with compliance discussions

### For DevOps Teams
- Deployment diagrams guide infrastructure setup
- CI/CD pipeline diagrams document automation
- Monitoring diagrams show observability strategy

---

*This document provides visual representations of the Sew4Mi architecture to complement the main architecture document. Keep both documents synchronized as the system evolves.*