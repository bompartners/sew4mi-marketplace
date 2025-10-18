# UI Wizard Testing Guide - Order Creation Flow

## 🎯 Test Objective
Verify the order creation wizard works end-to-end with the newly added `fabric_choice`, `urgency_level`, and `color_choice` database columns.

---

## 📋 Pre-Test Checklist

Before starting the UI test, ensure:
- [ ] Migration applied successfully (fabric_choice, urgency_level columns exist)
- [ ] Development server running (`pnpm dev` in sew4mi/apps/web)
- [ ] At least one active tailor exists in database
- [ ] You have customer account credentials
- [ ] Browser DevTools open (for monitoring network requests)

---

## 🚀 Test Execution Steps

### Step 0: Login & Navigation

1. **Open Browser**
   ```
   http://localhost:3000
   ```

2. **Login as Customer**
   - Click "Login" or navigate to `/login`
   - Enter customer credentials
   - ✅ Verify: Successful login, redirected to dashboard

3. **Navigate to Order Creation**
   - Click "Create New Order" button
   - OR navigate directly to: `http://localhost:3000/orders/new`
   - ✅ Verify: Order Creation Wizard loads

---

### Step 1: Tailor Selection 👔

**What to See:**
- Card showing "Create Your Order"
- Progress bar showing "Step 1 of 6"
- Title: "Select Tailor"
- Description: "Choose your preferred tailor"
- List or grid of available tailors

**Actions:**
1. Browse available tailors
2. Click on a tailor card to select
3. ✅ Verify: Tailor card highlights or shows selected state
4. ✅ Verify: "Next" button becomes enabled
5. Click "Next"

**What to Check:**
- [ ] Tailors display correctly with names, ratings, photos
- [ ] Selection works (card highlights)
- [ ] Can only select one tailor at a time
- [ ] "Next" button disabled until selection made
- [ ] Progress updates to Step 2

**Console Check:**
```javascript
// Open DevTools Console and verify:
// state.tailorId should be populated
```

---

### Step 2: Garment Type Selection 👕

**What to See:**
- Progress: "Step 2 of 6"
- Title: "Garment Type"
- Description: "Choose what you want made"
- Grid of garment options (Suit, Dress, Shirt, etc.)

**Actions:**
1. Browse garment types
2. Click on a garment type (e.g., "Traditional Suit")
3. ✅ Verify: Garment card highlights
4. ✅ Verify: Base price displays (e.g., "GHS 450.00")
5. ✅ Verify: Estimated days shown
6. Click "Next"

**What to Check:**
- [ ] Garment types display with images
- [ ] Price and timeline info visible
- [ ] Selection works correctly
- [ ] "Previous" button works
- [ ] Progress updates to Step 3

---

### Step 3: Specifications (CRITICAL - Tests fabric_choice) 🎨

**What to See:**
- Progress: "Step 3 of 6"  
- Title: "Specifications"
- Description: "Fabric and special requirements"
- **Fabric Choice Options** (Radio buttons or cards):
  - "I'll provide my own fabric" (CUSTOMER_PROVIDED)
  - "Tailor will source fabric" (TAILOR_SOURCED)
- Text area for special instructions

**Actions:**
1. Select fabric option: "Tailor will source fabric"
2. ✅ Verify: Selection highlights
3. Type special instructions: "Navy blue fabric preferred, formal style"
4. ✅ Verify: Character count shows (e.g., "45/500 characters")
5. Click "Next"

**What to Check:**
- [ ] Fabric choice options clearly labeled
- [ ] Both options selectable
- [ ] Special instructions text area functional
- [ ] Character limit enforced (max 500)
- [ ] **Network Tab**: Check state.fabricChoice = "TAILOR_SOURCED"
- [ ] Progress updates to Step 4

**Critical Test - fabric_choice Column:**
```javascript
// In Console, check state:
// state.fabricChoice should be: "TAILOR_SOURCED" or "CUSTOMER_PROVIDED"
```

---

### Step 4: Measurements Selection 📏

**What to See:**
- Progress: "Step 4 of 6"
- Title: "Measurements"
- Description: "Select your measurement profile"
- List of measurement profiles (or prompt to create one)

**Actions:**
1. If profiles exist: Select a profile
2. If no profiles: Click "Create New Profile" (may be mocked)
3. ✅ Verify: Profile selected shows checkmark
4. ✅ Verify: Required measurements validated
5. Click "Next"

**What to Check:**
- [ ] Measurement profiles list correctly
- [ ] Can select a profile
- [ ] Profile details visible (nickname, measurements)
- [ ] Validation for required measurements
- [ ] Progress updates to Step 5

**Note:** Measurement validation may be skipped in current implementation

---

### Step 5: Timeline (CRITICAL - Tests urgency_level) ⏰

**What to See:**
- Progress: "Step 5 of 6"
- Title: "Timeline"
- Description: "Delivery date and urgency"
- **Urgency Level Options** (Radio buttons or cards):
  - "Standard" (STANDARD)
  - "Urgent" (URGENT)  
  - "Express/Rush" (EXPRESS)
- Date picker for delivery date

**Actions:**
1. Select urgency: "Standard"
2. ✅ Verify: Urgency option highlights
3. ✅ Verify: Estimated delivery time updates (e.g., "3-4 weeks")
4. Click date picker
5. Select delivery date (e.g., 30 days from now)
6. ✅ Verify: Date displays correctly
7. ✅ Verify: Date validation (must be future date)
8. Click "Next"

**What to Check:**
- [ ] All urgency options visible and selectable
- [ ] Urgency affects estimated timeline
- [ ] Date picker works correctly
- [ ] Cannot select past dates
- [ ] Cannot select dates > 6 months out
- [ ] **Network Tab**: Check state.urgencyLevel = "STANDARD"
- [ ] Progress updates to Step 6

**Critical Test - urgency_level Column:**
```javascript
// In Console, verify:
// state.urgencyLevel should be: "STANDARD", "URGENT", or "EXPRESS"
```

**Expected Behavior:**
- Pricing calculation happens in background
- Watch Network tab for: `POST /api/orders/calculate-pricing`

---

### Step 6: Summary & Confirmation 📝

**What to See:**
- Progress: "Step 6 of 6" (100%)
- Title: "Summary"
- Description: "Review and confirm order"
- Complete order summary showing:
  - Tailor name
  - Garment type
  - **Fabric choice** ✅
  - **Special instructions** ✅
  - Measurements profile
  - **Urgency level** ✅
  - Delivery date
  - **Pricing breakdown**:
    - Base price
    - Fabric cost (if tailor sourced)
    - Urgency surcharge (if express)
    - Total amount
  - **Escrow breakdown**:
    - Deposit: 25%
    - Fitting: 50%
    - Final: 25%

**Actions:**
1. Review all order details
2. ✅ Verify: All selections from previous steps display
3. ✅ Verify: Fabric choice shows correctly
4. ✅ Verify: Urgency level shows correctly
5. ✅ Verify: Pricing calculations correct
6. ✅ Verify: Escrow breakdown = 100% of total
7. Click "Create Order" button

**What to Check:**
- [ ] All order details accurate
- [ ] Fabric choice displayed: "Tailor will source" or "Customer provided"
- [ ] Urgency level displayed: "Standard", "Urgent", or "Express"
- [ ] Pricing math correct (base + fabric + urgency = total)
- [ ] Escrow: deposit + fitting + final = total amount
- [ ] "Create Order" button enabled

---

### Step 7: Order Creation (The Critical Moment) 🎉

**After clicking "Create Order":**

1. **Watch Network Tab:**
   ```
   POST /api/orders/create
   ```

2. **Request Payload Check:**
   ```json
   {
     "customerId": "uuid",
     "tailorId": "uuid",
     "measurementProfileId": "uuid",
     "garmentType": "Traditional Suit",
     "fabricChoice": "TAILOR_SOURCED",     // ✅ Check this
     "urgencyLevel": "STANDARD",            // ✅ Check this
     "specialInstructions": "Navy blue...",
     "totalAmount": 450.00,
     "estimatedDelivery": "2025-11-15T..."
   }
   ```

3. **Expected Response (Success):**
   ```json
   {
     "success": true,
     "orderId": "uuid-here",
     "orderNumber": "ORD-1729180800-ABC123"
   }
   ```

4. **What to See:**
   - ✅ Loading spinner appears briefly
   - ✅ Success message: "Order created successfully!"
   - ✅ Order number displayed
   - ✅ Auto-redirect to order details page

**What to Check:**
- [ ] Network request shows 201 Created status
- [ ] Request includes fabricChoice field ✅
- [ ] Request includes urgencyLevel field ✅  
- [ ] Response has orderId and orderNumber
- [ ] No console errors
- [ ] No PGRST204 errors
- [ ] Redirect to `/customer/orders/[orderId]` works

---

### Step 8: Verification in Order Details Page

**After Redirect:**

**What to See:**
- Order details page
- Order status: "PENDING_DEPOSIT" or "AWAITING_PAYMENT"
- Complete order information

**Actions:**
1. Verify order details display
2. ✅ Check fabric choice shows in details
3. ✅ Check urgency level shows in details
4. ✅ Check special instructions display
5. ✅ Check escrow milestones show (3 stages)

**What to Check:**
- [ ] All order info accurate
- [ ] Fabric sourcing visible
- [ ] Delivery urgency visible
- [ ] Payment milestones show
- [ ] Order timeline visible

---

## 🔍 Database Verification

After successful order creation, verify in database:

```sql
-- Get the order you just created
SELECT 
  order_number,
  garment_type,
  fabric_choice,          -- ✅ Should be "TAILOR_SOURCED"
  urgency_level,          -- ✅ Should be "STANDARD"
  special_instructions,
  total_amount,
  deposit_amount,
  status,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
| Column | Expected Value |
|--------|---------------|
| fabric_choice | TAILOR_SOURCED |
| urgency_level | STANDARD |
| special_instructions | Navy blue fabric preferred... |
| status | PENDING_DEPOSIT |

```sql
-- Check milestones created
SELECT stage, amount, status
FROM order_milestones
WHERE order_id = (SELECT id FROM orders ORDER BY created_at DESC LIMIT 1);
```

**Expected: 3 Rows**
| stage | amount | status |
|-------|--------|--------|
| DEPOSIT | 112.50 | PENDING |
| FITTING | 225.00 | PENDING |
| FINAL | 112.50 | PENDING |

---

## 🧪 Additional Test Scenarios

### Test 2: Customer-Provided Fabric

Repeat the wizard with:
- **Step 3**: Select "I'll provide my own fabric"
- ✅ Verify: fabricChoice = "CUSTOMER_PROVIDED"
- ✅ Verify: Pricing excludes fabric cost

### Test 3: Express Urgency

Repeat the wizard with:
- **Step 5**: Select "Express" or "Rush"
- ✅ Verify: urgencyLevel = "EXPRESS"
- ✅ Verify: Pricing includes urgency surcharge (+25%)

### Test 4: Validation Tests

**Test Empty Fields:**
- Try clicking "Next" without selections
- ✅ Verify: Error messages display
- ✅ Verify: Cannot proceed

**Test Invalid Dates:**
- Try selecting yesterday's date
- ✅ Verify: Error: "Delivery date must be in the future"

**Test Character Limit:**
- Type 501 characters in special instructions
- ✅ Verify: Input stopped at 500 or error shown

---

## 📊 Test Results Checklist

| Test Step | Pass/Fail | Notes |
|-----------|-----------|-------|
| Login & Navigation | ⬜ | |
| Tailor Selection | ⬜ | |
| Garment Type Selection | ⬜ | |
| **Specifications (fabric_choice)** | ⬜ | **CRITICAL** |
| Measurements Selection | ⬜ | |
| **Timeline (urgency_level)** | ⬜ | **CRITICAL** |
| Summary Display | ⬜ | |
| Order Creation API Call | ⬜ | |
| Network Request has fabric_choice | ⬜ | **CRITICAL** |
| Network Request has urgency_level | ⬜ | **CRITICAL** |
| 201 Response Received | ⬜ | |
| No PGRST204 Errors | ⬜ | **CRITICAL** |
| Redirect to Order Page | ⬜ | |
| DB: fabric_choice populated | ⬜ | **CRITICAL** |
| DB: urgency_level populated | ⬜ | **CRITICAL** |
| DB: 3 milestones created | ⬜ | |
| Customer-Provided Fabric Test | ⬜ | |
| Express Urgency Test | ⬜ | |
| Validation Tests | ⬜ | |

---

## 🐛 Common Issues & Solutions

### Issue 1: Wizard Won't Load
**Symptoms:** Blank page or loading forever

**Solutions:**
1. Check auth: Are you logged in?
2. Check console for errors
3. Verify dev server running
4. Clear localStorage: `localStorage.clear()`

### Issue 2: "Next" Button Stays Disabled
**Symptoms:** Can't proceed past a step

**Solutions:**
1. Check validation errors (red text)
2. Ensure all required fields filled
3. Open console, check `state.errors`

### Issue 3: PGRST204 Error on Submit
**Symptoms:** "Could not find the 'fabric_choice' column"

**Solutions:**
```bash
# Reapply migration
psql $DATABASE_URL -f sew4mi/supabase/migrations/20251017120000_add_missing_order_columns.sql
```

### Issue 4: Order Creates but Fields NULL
**Symptoms:** Order in DB but fabric_choice or urgency_level is NULL

**Root Cause:** State not passed correctly to API

**Debug:**
```javascript
// Before clicking "Create Order", check console:
console.log('State before submit:', {
  fabricChoice: state.fabricChoice,
  urgencyLevel: state.urgencyLevel
});
```

---

## 📹 Browser DevTools Monitoring

### Console Tab
Watch for:
- ✅ "Creating order with data: {...}"
- ✅ State updates on each step
- ❌ Any error messages
- ❌ Validation failures

### Network Tab
Watch for:
1. `POST /api/orders/calculate-pricing` (Step 5 → 6)
2. `POST /api/orders/create` (Step 6 → Success)

**Filter:** XHR/Fetch

### Application Tab
- **Local Storage**: Check for draft save/clear
- **Session Storage**: Auth tokens present

---

## ✅ Success Criteria

All must pass:
- [ ] Complete wizard from start to finish
- [ ] Order created successfully (201 response)
- [ ] fabric_choice in request payload
- [ ] urgency_level in request payload
- [ ] No PGRST204 errors
- [ ] fabric_choice in database NOT NULL
- [ ] urgency_level in database NOT NULL
- [ ] Redirect to order details works
- [ ] 3 escrow milestones created

---

## 📝 Test Notes Template

**Date:** _____________  
**Tester:** _____________  
**Browser:** _____________  
**Customer Account:** _____________

**Order Created:**
- Order Number: _____________
- Fabric Choice: _____________
- Urgency Level: _____________
- Total Amount: _____________

**Issues Found:**
1. _____________
2. _____________

**Overall Result:** ✅ PASS / ❌ FAIL

---

**Next Step After Testing:**
Report results and update Story 4.5 test completion status!

