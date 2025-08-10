# Data Models

## User
**Purpose:** Core user entity representing customers, tailors, and admins in the system

**Key Attributes:**
- id: UUID - Unique identifier from Supabase Auth
- email: string - Primary email address
- phone: string - Ghana phone number for WhatsApp/Mobile Money
- fullName: string - User's complete name
- role: UserRole - Enum: CUSTOMER, TAILOR, ADMIN
- createdAt: timestamp - Account creation date
- preferredLanguage: Language - Enum: EN, TWI, GA
- whatsappOptIn: boolean - WhatsApp communication preference

**TypeScript Interface:**
```typescript
interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  role: 'CUSTOMER' | 'TAILOR' | 'ADMIN';
  createdAt: Date;
  preferredLanguage: 'EN' | 'TWI' | 'GA';
  whatsappOptIn: boolean;
}
```

**Relationships:**
- Has many MeasurementProfiles (as customer)
- Has one TailorProfile (if role = TAILOR)
- Has many Orders (as customer)
- Has many Reviews (as reviewer)

## TailorProfile
**Purpose:** Extended profile for verified expert tailors with portfolio and business information

**Key Attributes:**
- id: UUID - Unique identifier
- userId: UUID - Reference to User
- businessName: string - Tailor's business name
- specializations: string[] - Array of expertise areas
- yearsExperience: number - Years in business
- location: GeoPoint - GPS coordinates for location-based search
- city: string - City name for filtering
- verificationStatus: VerificationStatus - PENDING, VERIFIED, SUSPENDED
- portfolioImages: string[] - URLs to portfolio work
- capacity: number - Orders per month capability
- averageDeliveryDays: number - Typical order completion time
- rating: decimal - Average rating (0-5)
- totalOrders: number - Completed orders count

**TypeScript Interface:**
```typescript
interface TailorProfile {
  id: string;
  userId: string;
  businessName: string;
  specializations: string[];
  yearsExperience: number;
  location: { lat: number; lng: number };
  city: string;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'SUSPENDED';
  portfolioImages: string[];
  capacity: number;
  averageDeliveryDays: number;
  rating: number;
  totalOrders: number;
}
```

**Relationships:**
- Belongs to User
- Has many Orders (as tailor)
- Has many Reviews (as reviewee)

## MeasurementProfile
**Purpose:** Saved measurement sets for customers and family members

**Key Attributes:**
- id: UUID - Unique identifier
- userId: UUID - Owner of the profile
- nickname: string - Family member identifier
- gender: Gender - MALE, FEMALE
- measurements: JSON - Structured measurement data
- voiceNoteUrl: string? - Optional voice measurement recording
- lastUpdated: timestamp - Last modification date
- isActive: boolean - Soft delete flag

**TypeScript Interface:**
```typescript
interface MeasurementProfile {
  id: string;
  userId: string;
  nickname: string;
  gender: 'MALE' | 'FEMALE';
  measurements: {
    chest?: number;
    waist?: number;
    hips?: number;
    shoulderWidth?: number;
    sleeveLength?: number;
    inseam?: number;
    outseam?: number;
    neckSize?: number;
    // Extended measurements
    [key: string]: number | undefined;
  };
  voiceNoteUrl?: string;
  lastUpdated: Date;
  isActive: boolean;
}
```

**Relationships:**
- Belongs to User
- Used by many Orders

## Order
**Purpose:** Core transaction entity managing the custom clothing order lifecycle

**Key Attributes:**
- id: UUID - Unique identifier
- orderNumber: string - Human-readable order ID
- customerId: UUID - Customer placing order
- tailorId: UUID - Assigned tailor
- measurementProfileId: UUID - Used measurements
- garmentType: string - Type of clothing
- fabricChoice: string - Selected fabric
- specialInstructions: string - Custom requirements
- status: OrderStatus - DRAFT, PENDING_DEPOSIT, IN_PROGRESS, etc.
- escrowStage: EscrowStage - DEPOSIT, FITTING, FINAL
- totalAmount: decimal - Order total in GHS
- depositPaid: decimal - 25% initial payment
- fittingPaid: decimal - 50% fitting payment
- finalPaid: decimal - 25% final payment
- estimatedDelivery: date - Promised delivery date
- actualDelivery: date? - Actual delivery date
- createdAt: timestamp - Order creation
- groupOrderId: UUID? - Link to family group order

**TypeScript Interface:**
```typescript
interface Order {
  id: string;
  orderNumber: string;
  customerId: string;
  tailorId: string;
  measurementProfileId: string;
  garmentType: string;
  fabricChoice: string;
  specialInstructions: string;
  status: 'DRAFT' | 'PENDING_DEPOSIT' | 'DEPOSIT_PAID' | 'IN_PROGRESS' | 
          'READY_FOR_FITTING' | 'FITTING_APPROVED' | 'COMPLETING' | 
          'READY_FOR_DELIVERY' | 'DELIVERED' | 'DISPUTED' | 'CANCELLED';
  escrowStage: 'DEPOSIT' | 'FITTING' | 'FINAL' | 'RELEASED';
  totalAmount: number;
  depositPaid: number;
  fittingPaid: number;
  finalPaid: number;
  estimatedDelivery: Date;
  actualDelivery?: Date;
  createdAt: Date;
  groupOrderId?: string;
}
```

**Relationships:**
- Belongs to User (customer)
- Belongs to TailorProfile
- Uses MeasurementProfile
- Has many OrderMilestones
- Has many PaymentTransactions
- Has one Review
- Belongs to GroupOrder (optional)

## OrderMilestone
**Purpose:** Track progress milestones with photo verification

**Key Attributes:**
- id: UUID - Unique identifier
- orderId: UUID - Associated order
- milestone: MilestoneType - FABRIC_SELECTED, CUTTING_STARTED, etc.
- photoUrl: string - Verification photo
- notes: string - Milestone notes
- verifiedAt: timestamp - Completion time
- verifiedBy: UUID - User who verified

**TypeScript Interface:**
```typescript
interface OrderMilestone {
  id: string;
  orderId: string;
  milestone: 'FABRIC_SELECTED' | 'CUTTING_STARTED' | 'INITIAL_ASSEMBLY' | 
             'FITTING_READY' | 'ADJUSTMENTS_COMPLETE' | 'FINAL_PRESSING' | 
             'READY_FOR_DELIVERY';
  photoUrl: string;
  notes: string;
  verifiedAt: Date;
  verifiedBy: string;
}
```

**Relationships:**
- Belongs to Order

## PaymentTransaction
**Purpose:** Track all payment movements for escrow system

**Key Attributes:**
- id: UUID - Unique identifier
- orderId: UUID - Associated order
- type: TransactionType - DEPOSIT, FITTING_PAYMENT, FINAL_PAYMENT, REFUND
- amount: decimal - Transaction amount in GHS
- provider: PaymentProvider - MTN_MOMO, VODAFONE_CASH
- providerTransactionId: string - External reference
- status: TransactionStatus - PENDING, SUCCESS, FAILED
- createdAt: timestamp - Transaction time

**TypeScript Interface:**
```typescript
interface PaymentTransaction {
  id: string;
  orderId: string;
  type: 'DEPOSIT' | 'FITTING_PAYMENT' | 'FINAL_PAYMENT' | 'REFUND';
  amount: number;
  provider: 'MTN_MOMO' | 'VODAFONE_CASH';
  providerTransactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: Date;
}
```

**Relationships:**
- Belongs to Order

## GroupOrder
**Purpose:** Coordinate family/group orders for events

**Key Attributes:**
- id: UUID - Unique identifier
- organizerId: UUID - Primary coordinator
- eventName: string - Wedding, funeral, etc.
- eventDate: date - Event date
- sharedFabric: boolean - Using same fabric
- totalOrders: number - Number of individual orders
- whatsappGroupId: string? - WhatsApp group chat ID

**TypeScript Interface:**
```typescript
interface GroupOrder {
  id: string;
  organizerId: string;
  eventName: string;
  eventDate: Date;
  sharedFabric: boolean;
  totalOrders: number;
  whatsappGroupId?: string;
}
```

**Relationships:**
- Has many Orders
- Belongs to User (organizer)
