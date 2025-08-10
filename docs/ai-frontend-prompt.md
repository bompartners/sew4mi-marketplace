# AI Frontend Generation Prompt for Sew4Mi Marketplace

## Master Prompt for AI-Driven Frontend Development

This comprehensive prompt is designed for use with AI frontend generation tools like Vercel v0, Lovable.ai, or similar platforms to create the Sew4Mi custom clothing marketplace interface.

---

## COMPLETE GENERATION PROMPT

```prompt
# High-Level Goal

Create a mobile-first, trust-building custom clothing marketplace interface for Sew4Mi that connects Ghana's emerging professionals with verified expert tailors through a progressive escrow payment system. The interface must work reliably on 3G networks, integrate deeply with WhatsApp, and celebrate Ghanaian cultural aesthetics while maintaining modern usability standards.

# Project Context & Technical Foundation

**Tech Stack:**
- Framework: Next.js 14 with TypeScript
- Styling: Tailwind CSS with custom design tokens
- Database & Auth: Supabase (PostgreSQL + Auth)
- Payments: Hubtel API integration (Mobile Money + Cards)
- Messaging: WhatsApp Business Cloud API
- Hosting: Vercel with Edge Functions
- State Management: Zustand for client state
- Forms: React Hook Form with Zod validation
- UI Components: Custom component library (no external UI libraries)

**Target Market:** Ghana's 400,000+ professionals needing reliable custom clothing
**Primary Device:** Mobile phones on 3G/4G networks (85% of users)
**Languages:** English, Twi, Ga

# Detailed Step-by-Step Implementation Instructions

## STEP 1: Create the Homepage with Trust-First Design

1. Create a new file: `app/page.tsx`
2. Build a hero section with:
   - Headline: "Your Payment Protected Until Delivery"
   - Subheadline: "Connect with Ghana's verified expert tailors"
   - Visual escrow process (3 steps with icons: Order → Create → Deliver)
   - CTA buttons: "Find Tailors" (primary) and "How It Works" (secondary)
3. Add trust indicators bar:
   - "2,000+ Successful Orders"
   - "80% On-Time Delivery"
   - "20+ Verified Tailors"
4. Create featured tailors carousel:
   - Display 3 tailor cards with photo, name, specialty, rating
   - Auto-rotate every 5 seconds with pause on hover
   - Include "View All Tailors" link
5. Add floating WhatsApp button (position: fixed, bottom-right)
6. Implement mobile-first responsive design with single column on mobile

## STEP 2: Build the Tailor Discovery & Profile Pages

1. Create `app/tailors/page.tsx` for browse page:
   - Search bar with placeholder "Search by name or specialty..."
   - Filter sidebar (mobile: slide-out panel):
     * Location dropdown (Accra, Kumasi, Takoradi, etc.)
     * Specialty checkboxes (Traditional, Corporate, Casual, Wedding)
     * Price range slider
     * Rating filter (4+ stars)
   - Results grid (mobile: 1 column, tablet: 2, desktop: 3)
   - Each card shows: photo, name, rating, specialties, starting price

2. Create `app/tailors/[id]/page.tsx` for profile:
   - Header with verification badge "✓ Verified Expert"
   - Portfolio gallery (minimum 5 images) with lightbox
   - Reviews section with rating breakdown
   - Availability calendar showing busy/available days
   - Two CTAs: "Start Order" and "Chat on WhatsApp"

## STEP 3: Implement Order Creation Wizard

1. Create `app/orders/new/page.tsx` with step wizard:
   - Progress indicator showing 5 steps
   - Step 1: Garment Type (visual grid selector)
   - Step 2: Measurements (with "Use Voice on WhatsApp" option)
   - Step 3: Requirements (fabric choice, special instructions)
   - Step 4: Timeline (standard vs express with price difference)
   - Step 5: Payment (show escrow breakdown: 25%-50%-25%)

2. Add family member selector in Step 2:
   - Display saved profiles as cards with avatars
   - "Add New Member" card with plus icon
   - Quick edit option for existing measurements

3. Include trust messaging throughout:
   - "Your payment is protected by Sew4Mi escrow"
   - Show payment milestone visualization

## STEP 4: Create Order Tracking Dashboard

1. Create `app/dashboard/orders/[id]/page.tsx`:
   - Visual timeline with 5 milestones:
     * Order Placed (25% paid)
     * Design Approved
     * Fitting Ready (50% payment)
     * Final Touches
     * Ready for Delivery (25% payment)
   - Photo cards for each completed milestone
   - Estimated delivery countdown timer
   - Quick actions: "Message Tailor", "Report Issue"

2. Add payment status cards:
   - Show locked/available/completed state for each payment
   - Include payment method and transaction reference

## STEP 5: Integrate WhatsApp Features

1. Create WhatsApp integration components:
   - `components/WhatsAppButton.tsx` with green brand color (#25D366)
   - `components/VoiceMeasurement.tsx` with recording interface
   - `components/ShareToFamily.tsx` for group coordination

2. Implement deep linking:
   - Generate WhatsApp links with pre-filled messages
   - Include order context in message templates

## STEP 6: Build Responsive Navigation

1. Create `components/Navigation.tsx`:
   - Mobile: Hamburger menu with slide-out drawer
   - Desktop: Horizontal nav with dropdowns
   - Include language selector (EN/Twi/Ga)
   - Show user avatar and notification badge when logged in

2. Add role-based menu items:
   - Customer: My Orders, Family Profiles, Payment History
   - Tailor: Business Dashboard, Order Management, Earnings
   - Admin: Operations Dashboard, Quality Control, Disputes

## STEP 7: Create Admin Portal Dashboard

1. Create `app/admin/page.tsx` for operations dashboard:
   - Top metrics grid with 4 key indicators:
     * Active Orders (with status breakdown)
     * Payment Success Rate (percentage with trend)
     * Users Online (customers + tailors)
     * Pending Disputes (with SLA countdown)
   - Real-time alert feed (left sidebar):
     * Color-coded by priority (red: urgent, yellow: warning)
     * Show dispute age, failed payments, quality issues
   - Quick action buttons (right sidebar):
     * "Broadcast Announcement"
     * "Process Manual Refund"
     * "Pause Tailor Account"
   - Activity log table (bottom):
     * Recent admin actions with timestamp
     * Filterable by admin user

2. Implement WebSocket for real-time updates:
   ```typescript
   useEffect(() => {
     const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL);
     ws.onmessage = (event) => {
       const data = JSON.parse(event.data);
       updateMetrics(data);
     };
     return () => ws.close();
   }, []);
   ```

## STEP 8: Build Admin Dispute Resolution Center

1. Create `app/admin/disputes/page.tsx`:
   - Dispute queue table with columns:
     * ID, Customer, Tailor, Amount, Age, Priority
     * Color rows based on SLA (red >24hrs, yellow 12-24hrs)
     * Checkbox for bulk actions
   - Implement sorting and filtering:
     * Sort by age, amount, priority
     * Filter by status, category, date range

2. Create `app/admin/disputes/[id]/page.tsx` for detail view:
   - Evidence panel with image gallery
   - Full message thread between parties
   - Order timeline visualization
   - Resolution form:
     ```typescript
     <form onSubmit={resolveDispute}>
       <select name="resolution">
         <option>Full refund</option>
         <option>Partial refund</option>
         <option>No refund - favor tailor</option>
       </select>
       <input type="number" name="refundAmount" />
       <textarea name="resolution_notes" />
       <button type="submit">Resolve & Notify</button>
     </form>
     ```

## STEP 9: Implement Admin Quality Control

1. Create `app/admin/quality/page.tsx`:
   - Tailor performance matrix table:
     * Columns: Name, Rating, Orders, Completion %, Disputes
     * Visual indicators (red/yellow/green) for thresholds
     * Action buttons: "Review", "Coach", "Suspend"
   
2. Create `app/admin/applications/page.tsx` for verifications:
   - Application cards in grid layout:
     * Portfolio thumbnail preview (5 images)
     * Applicant details and experience
     * Quick approve/reject buttons
   - Bulk action toolbar for similar applications

## STEP 10: Add Admin Financial Management

1. Create `app/admin/finance/page.tsx`:
   - Revenue charts using Chart.js:
     ```typescript
     <Line 
       data={{
         labels: last30Days,
         datasets: [{
           label: 'Daily Revenue (GHS)',
           data: revenueData,
           borderColor: '#1B4F72'
         }]
       }}
     />
     ```
   - Payout management table:
     * Pending payouts to tailors
     * Batch process checkboxes
     * Export to CSV button
   
2. Add reconciliation section:
   - Hubtel transaction matching interface
   - Escrow balance tracker
   - Missing payment investigation tools

# Code Examples, Data Structures & Constraints

## Admin-Specific Data Structures:
```typescript
interface Dispute {
  id: string;
  orderId: string;
  customerId: string;
  tailorId: string;
  category: 'quality' | 'delivery' | 'payment' | 'communication';
  status: 'open' | 'investigating' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  amount: number;
  createdAt: Date;
  slaDeadline: Date;
  evidence: {
    photos: string[];
    messages: Message[];
    documents: string[];
  };
  resolution?: {
    type: 'full_refund' | 'partial_refund' | 'no_refund';
    amount?: number;
    notes: string;
    resolvedBy: string;
    resolvedAt: Date;
  };
}

interface AdminMetrics {
  activeOrders: {
    total: number;
    byStatus: Record<string, number>;
  };
  paymentSuccess: {
    rate: number;
    trend: 'up' | 'down' | 'stable';
  };
  usersOnline: {
    customers: number;
    tailors: number;
  };
  pendingDisputes: {
    count: number;
    overdue: number;
  };
  revenue: {
    today: number;
    week: number;
    month: number;
  };
}
```

## Customer Data Structure Example:
```typescript
interface Order {
  id: string;
  customerId: string;
  tailorId: string;
  garmentType: 'traditional' | 'corporate' | 'casual' | 'wedding';
  measurements: {
    chest?: number;
    waist?: number;
    length?: number;
    // ... other measurements
  };
  timeline: 'standard' | 'express';
  status: 'pending' | 'in_progress' | 'fitting' | 'completed';
  payments: {
    initial: PaymentMilestone;
    fitting: PaymentMilestone;
    delivery: PaymentMilestone;
  };
  createdAt: Date;
  estimatedDelivery: Date;
}

interface PaymentMilestone {
  amount: number;
  status: 'locked' | 'available' | 'processing' | 'completed';
  paidAt?: Date;
  method?: 'mtn_momo' | 'vodafone_cash' | 'card';
}
```

## Styling Constraints:
```css
/* Use these Tailwind classes consistently */
/* Primary button: */
className="bg-[#1B4F72] hover:bg-[#164058] text-white px-6 py-3 rounded-lg font-semibold"

/* Trust badge: */
className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm"

/* Card shadow for elevated elements: */
className="shadow-md hover:shadow-lg transition-shadow"

/* Mobile-first spacing: */
className="p-4 md:p-6 lg:p-8"

/* Admin-specific styles: */
/* Alert priority colors: */
className="border-l-4 border-red-500" // High priority
className="border-l-4 border-yellow-500" // Medium priority
className="border-l-4 border-green-500" // Low priority

/* Admin metrics cards: */
className="bg-white rounded-lg shadow p-6 border-t-4 border-[#1B4F72]"

/* Admin action buttons: */
className="px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2"
```

## API Integration Pattern:
```typescript
// Always use this pattern for Hubtel payments
const initiatePayment = async (amount: number, method: string) => {
  try {
    const response = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, method, currency: 'GHS' })
    });
    
    if (!response.ok) {
      throw new Error('Payment initiation failed');
    }
    
    const data = await response.json();
    // Redirect to Hubtel checkout or show mobile money prompt
    return data;
  } catch (error) {
    // Show user-friendly error message
    console.error('Payment error:', error);
  }
};
```

## CRITICAL CONSTRAINTS - DO NOT:
- Use external UI component libraries (build custom components)
- Implement complex animations that affect performance on 3G
- Use placeholder text as labels (always use proper labels)
- Create forms without proper validation and error messages
- Forget to add loading states for all async operations
- Skip accessibility attributes (ARIA labels, alt text, etc.)
- Use colors that don't meet WCAG AA contrast requirements

## Admin Portal Security Requirements:
```typescript
// Admin authentication middleware
export const requireAdmin = async (req: Request) => {
  const session = await getSession(req);
  if (!session?.user?.role || !['admin', 'super_admin'].includes(session.user.role)) {
    throw new Error('Unauthorized');
  }
  
  // Log admin access
  await logAdminAccess({
    userId: session.user.id,
    action: req.url,
    timestamp: new Date()
  });
  
  return session.user;
};

// Implement rate limiting for admin actions
const rateLimiter = new Map();
export const checkRateLimit = (userId: string, action: string) => {
  const key = `${userId}:${action}`;
  const attempts = rateLimiter.get(key) || 0;
  if (attempts > 10) {
    throw new Error('Rate limit exceeded');
  }
  rateLimiter.set(key, attempts + 1);
};
```

# Strict Scope Definition

## Files to Create:

### Customer Interface:
- app/page.tsx (Homepage)
- app/layout.tsx (Root layout with navigation)
- app/tailors/page.tsx (Browse tailors)
- app/tailors/[id]/page.tsx (Tailor profile)
- app/orders/new/page.tsx (Order wizard)
- app/dashboard/page.tsx (Customer dashboard)
- app/dashboard/orders/[id]/page.tsx (Order tracking)

### Admin Portal:
- app/admin/page.tsx (Operations dashboard)
- app/admin/disputes/page.tsx (Dispute queue)
- app/admin/disputes/[id]/page.tsx (Dispute detail)
- app/admin/quality/page.tsx (Quality control)
- app/admin/applications/page.tsx (Tailor verification)
- app/admin/finance/page.tsx (Financial management)
- app/admin/analytics/page.tsx (Platform analytics)

### Shared Components:
- components/Navigation.tsx
- components/TailorCard.tsx
- components/OrderTimeline.tsx
- components/PaymentMilestone.tsx
- components/WhatsAppButton.tsx
- components/TrustBadge.tsx
- components/admin/MetricsWidget.tsx
- components/admin/AlertCard.tsx
- components/admin/DisputeTable.tsx

### Libraries & Config:
- lib/supabase.ts (Supabase client setup)
- lib/hubtel.ts (Payment integration)
- lib/websocket.ts (Real-time updates)
- lib/admin-auth.ts (Admin authentication)
- styles/globals.css (Tailwind setup)

## Files NOT to Create:
- Do not implement the complete WhatsApp bot logic (backend concern)
- Do not create payment processing backend (API routes only)
- Do not build email notification systems (backend service)
- Do not implement voice processing pipeline (backend ML service)

## Mobile-First Implementation Order:
1. Start with mobile layout (320px minimum width)
2. Add tablet enhancements (768px+)
3. Finally add desktop optimizations (1024px+)

## Performance Requirements:
- All images must use Next.js Image component with lazy loading
- Implement skeleton screens for loading states
- Use dynamic imports for below-fold components
- Add Service Worker for offline capability (PWA)

Remember: This is a trust-first marketplace for Ghana. Every design decision should reinforce payment security, celebrate local culture, and work reliably on mobile devices with limited bandwidth.
```

---

## How to Use This Prompt

### For Vercel v0:
1. Copy the entire prompt above
2. Paste into v0's interface
3. Specify you want a Next.js application
4. Request mobile-responsive preview

### For Lovable.ai:
1. Start with the high-level goal section
2. Provide the technical context
3. Feed the step-by-step instructions incrementally
4. Request component-by-component generation

### For Claude/ChatGPT with Code:
1. Provide the full prompt
2. Request file-by-file generation
3. Ask for responsive CSS variations
4. Validate accessibility compliance

## Key Success Metrics

The generated interface should:
- Load in under 3 seconds on 3G networks
- Display trust indicators prominently
- Work seamlessly on mobile devices
- Integrate WhatsApp CTAs throughout
- Follow the specified color palette
- Meet WCAG AA accessibility standards

## Iteration Guidelines

After initial generation:
1. Test on real mobile devices
2. Validate with Ghana users
3. Optimize image loading
4. Add offline functionality
5. Implement error states
6. Add loading skeletons

## Important Notes

⚠️ **Critical Reminder:** All AI-generated code requires careful human review, testing, and refinement before production use. Pay special attention to:
- Payment integration security
- Data validation and sanitization
- Error handling for poor network conditions
- Accessibility for screen readers
- Cross-browser compatibility

---

This prompt provides comprehensive guidance for AI-assisted frontend development while maintaining focus on Sew4Mi's unique requirements as a trust-first marketplace serving Ghana's custom clothing industry.