# Order Creation Wizard - Visual Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORDER CREATION WIZARD                         │
│                     6 Steps to Success                           │
└─────────────────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════════════════════╗
║  STEP 1: Tailor Selection 👔                          [1/6] 17%  ║
╠═══════════════════════════════════════════════════════════════════╣
║  Choose your preferred tailor                                     ║
║                                                                   ║
║  [Tailor Card 1]  [Tailor Card 2]  [Tailor Card 3]              ║
║  • Business Name  • Business Name  • Business Name               ║
║  • Rating         • Rating         • Rating                      ║
║  • Location       • Location       • Location                    ║
║                                                                   ║
║  State Updates: tailorId = "uuid"                                ║
╚═══════════════════════════════════════════════════════════════════╝
                              ↓
╔═══════════════════════════════════════════════════════════════════╗
║  STEP 2: Garment Type 👕                              [2/6] 33%  ║
╠═══════════════════════════════════════════════════════════════════╣
║  Choose what you want made                                        ║
║                                                                   ║
║  [Suit]     [Dress]    [Shirt]    [Traditional]                 ║
║  GHS 450    GHS 350    GHS 150    GHS 500                        ║
║  3-4 weeks  2-3 weeks  1-2 weeks  3-4 weeks                      ║
║                                                                   ║
║  State Updates: garmentType = { id, name, basePrice, ... }       ║
╚═══════════════════════════════════════════════════════════════════╝
                              ↓
╔═══════════════════════════════════════════════════════════════════╗
║  STEP 3: Specifications 🎨                            [3/6] 50%  ║
║  ★★★ TESTS fabric_choice COLUMN ★★★                              ║
╠═══════════════════════════════════════════════════════════════════╣
║  Fabric and special requirements                                  ║
║                                                                   ║
║  Fabric Sourcing:                                                ║
║  ◯ I'll provide my own fabric      [CUSTOMER_PROVIDED]           ║
║  ◉ Tailor will source fabric       [TAILOR_SOURCED]  ← Selected  ║
║                                                                   ║
║  Special Instructions:                                           ║
║  ┌───────────────────────────────────────────┐                  ║
║  │ Navy blue fabric preferred, formal style  │                  ║
║  │                                            │                  ║
║  └───────────────────────────────────────────┘                  ║
║  45/500 characters                                               ║
║                                                                   ║
║  State Updates:                                                  ║
║  • fabricChoice = "TAILOR_SOURCED" ✅✅✅                         ║
║  • specialInstructions = "Navy blue..."                          ║
╚═══════════════════════════════════════════════════════════════════╝
                              ↓
╔═══════════════════════════════════════════════════════════════════╗
║  STEP 4: Measurements 📏                              [4/6] 67%  ║
╠═══════════════════════════════════════════════════════════════════╣
║  Select your measurement profile                                  ║
║                                                                   ║
║  ◉ My Profile (Male)                                             ║
║    Chest: 102cm | Waist: 86cm | Inseam: 81cm                    ║
║                                                                   ║
║  ◯ Formal Profile (Male)                                         ║
║    Chest: 104cm | Waist: 88cm | Inseam: 82cm                    ║
║                                                                   ║
║  [+ Create New Profile]                                          ║
║                                                                   ║
║  State Updates: measurementProfile = { id, nickname, ... }       ║
╚═══════════════════════════════════════════════════════════════════╝
                              ↓
╔═══════════════════════════════════════════════════════════════════╗
║  STEP 5: Timeline ⏰                                  [5/6] 83%  ║
║  ★★★ TESTS urgency_level COLUMN ★★★                              ║
╠═══════════════════════════════════════════════════════════════════╣
║  Delivery date and urgency                                        ║
║                                                                   ║
║  Delivery Urgency:                                               ║
║  ◉ Standard (3-4 weeks)          [STANDARD]      No extra cost   ║
║  ◯ Urgent (2 weeks)              [URGENT]        +15% GHS 67.50  ║
║  ◯ Express/Rush (1 week)         [EXPRESS]       +25% GHS 112.50 ║
║                                                                   ║
║  Estimated Delivery Date:                                        ║
║  ┌──────────────────────────┐                                    ║
║  │ 📅 November 15, 2025      │                                   ║
║  └──────────────────────────┘                                    ║
║                                                                   ║
║  State Updates:                                                  ║
║  • urgencyLevel = "STANDARD" ✅✅✅                                ║
║  • estimatedDelivery = Date(2025-11-15)                          ║
║                                                                   ║
║  → Triggers: POST /api/orders/calculate-pricing                  ║
╚═══════════════════════════════════════════════════════════════════╝
                              ↓
                    [Price Calculation]
                              ↓
╔═══════════════════════════════════════════════════════════════════╗
║  STEP 6: Summary & Confirmation 📝                   [6/6] 100%  ║
╠═══════════════════════════════════════════════════════════════════╣
║  Review and confirm order                                         ║
║                                                                   ║
║  ┌─────────────────────────────────────────────────────────────┐ ║
║  │ ORDER SUMMARY                                                │ ║
║  ├─────────────────────────────────────────────────────────────┤ ║
║  │ Tailor:              Test Tailor Shop ⭐ 4.5                 │ ║
║  │ Garment Type:        Traditional Suit                        │ ║
║  │ Fabric:              Tailor will source ✅                    │ ║
║  │ Special Instructions: Navy blue fabric preferred...          │ ║
║  │ Measurements:        My Profile (Male)                       │ ║
║  │ Urgency:             Standard (3-4 weeks) ✅                  │ ║
║  │ Delivery Date:       November 15, 2025                       │ ║
║  ├─────────────────────────────────────────────────────────────┤ ║
║  │ PRICING BREAKDOWN                                            │ ║
║  │ Base Price:          GHS 450.00                              │ ║
║  │ Fabric Cost:         GHS 135.00  (Tailor sourced)            │ ║
║  │ Urgency Surcharge:   GHS   0.00  (Standard)                  │ ║
║  │ ──────────────────────────────────                           │ ║
║  │ Total Amount:        GHS 585.00                              │ ║
║  ├─────────────────────────────────────────────────────────────┤ ║
║  │ ESCROW PAYMENT PLAN                                          │ ║
║  │ 💰 Deposit (25%):    GHS 146.25  Pay now to start            │ ║
║  │ 👔 Fitting (50%):    GHS 292.50  After first fitting         │ ║
║  │ ✅ Final (25%):      GHS 146.25  On delivery                 │ ║
║  └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║  [< Previous]                             [Create Order →] 🟢    ║
╚═══════════════════════════════════════════════════════════════════╝
                              ↓
                     [Click Create Order]
                              ↓
╔═══════════════════════════════════════════════════════════════════╗
║  API CALL: POST /api/orders/create                                ║
╠═══════════════════════════════════════════════════════════════════╣
║  Request Payload:                                                 ║
║  {                                                                ║
║    "customerId": "uuid",                                          ║
║    "tailorId": "uuid",                                            ║
║    "measurementProfileId": "uuid",                                ║
║    "garmentType": "Traditional Suit",                             ║
║    "fabricChoice": "TAILOR_SOURCED",         ✅✅✅               ║
║    "urgencyLevel": "STANDARD",               ✅✅✅               ║
║    "specialInstructions": "Navy blue...",                         ║
║    "totalAmount": 585.00,                                         ║
║    "estimatedDelivery": "2025-11-15T00:00:00.000Z"               ║
║  }                                                                ║
║                                                                   ║
║  Expected Response: 201 Created                                   ║
║  {                                                                ║
║    "success": true,                                               ║
║    "orderId": "uuid",                                             ║
║    "orderNumber": "ORD-1729180800-ABC123"                         ║
║  }                                                                ║
╚═══════════════════════════════════════════════════════════════════╝
                              ↓
                    [Success! No PGRST204]
                              ↓
╔═══════════════════════════════════════════════════════════════════╗
║  SUCCESS SCREEN ✅                                                 ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║     🎉 Order Created Successfully!                                ║
║                                                                   ║
║     Order Number: ORD-1729180800-ABC123                           ║
║                                                                   ║
║     Your order has been placed with Test Tailor Shop.            ║
║     Please proceed to payment to start your order.                ║
║                                                                   ║
║     [View Order Details →]                                        ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
                              ↓
                   [Auto-redirect in 3 seconds]
                              ↓
╔═══════════════════════════════════════════════════════════════════╗
║  ORDER DETAILS PAGE                                               ║
╠═══════════════════════════════════════════════════════════════════╣
║  Order #ORD-1729180800-ABC123                                     ║
║  Status: PENDING_DEPOSIT                                          ║
║                                                                   ║
║  Order Details:                                                   ║
║  • Garment: Traditional Suit                                      ║
║  • Fabric: Tailor will source ✅                                  ║
║  • Urgency: Standard ✅                                           ║
║  • Special Instructions: Navy blue fabric...                      ║
║                                                                   ║
║  Payment Milestones:                                              ║
║  ⭕ Deposit     GHS 146.25   PENDING                              ║
║  ⚪ Fitting     GHS 292.50   PENDING                              ║
║  ⚪ Final       GHS 146.25   PENDING                              ║
║                                                                   ║
║  [Pay Deposit Now] [Contact Tailor] [View Timeline]              ║
╚═══════════════════════════════════════════════════════════════════╝
                              ↓
╔═══════════════════════════════════════════════════════════════════╗
║  DATABASE VERIFICATION                                            ║
╠═══════════════════════════════════════════════════════════════════╣
║  SELECT * FROM orders WHERE order_number = 'ORD-...'              ║
║                                                                   ║
║  ✅ fabric_choice:  "TAILOR_SOURCED"         (NOT NULL)           ║
║  ✅ urgency_level:  "STANDARD"               (NOT NULL)           ║
║  ✅ total_amount:   585.00                                        ║
║  ✅ status:         "PENDING_DEPOSIT"                             ║
║                                                                   ║
║  SELECT * FROM order_milestones WHERE order_id = '...'            ║
║                                                                   ║
║  ✅ DEPOSIT   | 146.25 | PENDING                                  ║
║  ✅ FITTING   | 292.50 | PENDING                                  ║
║  ✅ FINAL     | 146.25 | PENDING                                  ║
║                                                                   ║
║  🎉 TEST PASSED! All columns populated correctly!                 ║
╚═══════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════

CRITICAL TEST POINTS:

✅ Step 3: fabricChoice state updates
✅ Step 5: urgencyLevel state updates
✅ Step 6: All data displayed in summary
✅ API Request: Both fields in payload
✅ Response: 201 Created (no PGRST204)
✅ Database: fabric_choice NOT NULL
✅ Database: urgency_level NOT NULL
✅ Database: 3 milestones created

═══════════════════════════════════════════════════════════════════

NAVIGATION MAP:

/orders/new
  ├─ Login redirect (if not authenticated)
  └─ OrderCreationWizard
      ├─ TailorSelection
      ├─ GarmentTypeSelection
      ├─ GarmentSpecifications        ← fabric_choice
      ├─ MeasurementSelection
      ├─ TimelineSelection             ← urgency_level
      ├─ OrderSummary
      └─ POST /api/orders/create
          ├─ Success → /customer/orders/[id]
          └─ Error → Display error message

═══════════════════════════════════════════════════════════════════
```

