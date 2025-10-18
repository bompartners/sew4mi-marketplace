# 🧪 UI Wizard Test - Quick Checklist

**Print this page and check boxes as you test!**

---

## Pre-Flight Check
- [ ] Dev server running: `pnpm dev`
- [ ] Database migration applied
- [ ] Logged in as customer
- [ ] Browser DevTools open (Network + Console tabs)

---

## 🎬 START TEST: Navigate to `/orders/new`

---

## Step 1: Tailor Selection 👔
- [ ] Tailors display
- [ ] Can select a tailor
- [ ] "Next" button enabled after selection
- [ ] Progress shows 1/6

---

## Step 2: Garment Type 👕
- [ ] Garment types display
- [ ] Can select garment
- [ ] Base price shown
- [ ] "Previous" works
- [ ] "Next" enabled
- [ ] Progress shows 2/6

---

## Step 3: Specifications (fabric_choice) 🎨✅
**CRITICAL TEST**

- [ ] Fabric options visible:
  - [ ] "I'll provide my own fabric"
  - [ ] "Tailor will source fabric"
- [ ] Can select fabric option
- [ ] Special instructions box works
- [ ] Character counter shows
- [ ] Progress shows 3/6

**Selected:** Tailor will source ☐  |  Customer provides ☐

**Console Check:**
```
state.fabricChoice = "TAILOR_SOURCED" or "CUSTOMER_PROVIDED"
```
- [ ] ✅ fabric_choice in state

---

## Step 4: Measurements 📏
- [ ] Profiles display (or create option)
- [ ] Can select profile
- [ ] Progress shows 4/6

---

## Step 5: Timeline (urgency_level) ⏰✅
**CRITICAL TEST**

- [ ] Urgency options visible:
  - [ ] Standard
  - [ ] Urgent
  - [ ] Express/Rush
- [ ] Can select urgency
- [ ] Date picker works
- [ ] Future dates only
- [ ] Progress shows 5/6

**Selected:** Standard ☐  |  Urgent ☐  |  Express ☐

**Console Check:**
```
state.urgencyLevel = "STANDARD", "URGENT", or "EXPRESS"
```
- [ ] ✅ urgency_level in state

**Network Check:**
- [ ] POST `/api/orders/calculate-pricing` fired
- [ ] Response received

---

## Step 6: Summary 📝
- [ ] All details display correctly:
  - [ ] Tailor name
  - [ ] Garment type
  - [ ] **Fabric choice** ✅
  - [ ] **Special instructions**
  - [ ] **Urgency level** ✅
  - [ ] Delivery date
- [ ] Pricing breakdown shown:
  - [ ] Base price
  - [ ] Fabric cost (if applicable)
  - [ ] Urgency surcharge (if applicable)
  - [ ] Total amount
- [ ] Escrow breakdown:
  - [ ] Deposit: 25%
  - [ ] Fitting: 50%
  - [ ] Final: 25%
- [ ] Math checks out: deposit + fitting + final = total
- [ ] "Create Order" button enabled
- [ ] Progress shows 6/6 (100%)

---

## Step 7: Create Order 🚀
**THE MOMENT OF TRUTH**

**Before Clicking:**
- [ ] DevTools Network tab filtered to "Fetch/XHR"
- [ ] Console tab visible

**Click "Create Order"**

**Network Request Check:**
- [ ] POST `/api/orders/create` appears
- [ ] Request Status: 201 Created ✅

**Request Payload Contains:**
- [ ] customerId
- [ ] tailorId
- [ ] measurementProfileId
- [ ] garmentType
- [ ] **fabricChoice** ✅✅✅
- [ ] **urgencyLevel** ✅✅✅
- [ ] specialInstructions
- [ ] totalAmount
- [ ] estimatedDelivery

**Response Check:**
- [ ] success: true
- [ ] orderId present
- [ ] orderNumber present (ORD-...)

**UI Check:**
- [ ] Loading spinner shown
- [ ] Success message appears
- [ ] Order number displayed
- [ ] Auto-redirect happens

**Console Check:**
- [ ] No errors
- [ ] No PGRST204 errors ✅

---

## Step 8: Order Details Page
- [ ] Redirected to `/customer/orders/[id]` or order detail page
- [ ] Order details display
- [ ] Fabric choice visible
- [ ] Urgency level visible
- [ ] Special instructions visible
- [ ] Payment milestones visible (3 stages)

---

## Database Verification 🗄️

**Run this SQL:**
```sql
SELECT order_number, fabric_choice, urgency_level, total_amount
FROM orders ORDER BY created_at DESC LIMIT 1;
```

**Results:**
- [ ] order_number: ________________
- [ ] fabric_choice: ________________  (Should NOT be NULL) ✅
- [ ] urgency_level: ________________  (Should NOT be NULL) ✅
- [ ] total_amount: ________________

**Check Milestones:**
```sql
SELECT stage, amount, status FROM order_milestones
WHERE order_id = (SELECT id FROM orders ORDER BY created_at DESC LIMIT 1);
```

- [ ] DEPOSIT milestone exists
- [ ] FITTING milestone exists
- [ ] FINAL milestone exists
- [ ] Total of 3 milestones

---

## Additional Tests

### Test 2: Customer-Provided Fabric
- [ ] Repeat wizard
- [ ] Select "I'll provide my own fabric"
- [ ] Order creates successfully
- [ ] DB: fabric_choice = "CUSTOMER_PROVIDED"

### Test 3: Express Urgency
- [ ] Repeat wizard
- [ ] Select "Express" urgency
- [ ] Pricing shows surcharge
- [ ] Order creates successfully
- [ ] DB: urgency_level = "EXPRESS"

### Test 4: Validation
- [ ] Try clicking Next without selections → Error shown
- [ ] Try past delivery date → Error shown
- [ ] Type 501 characters in instructions → Prevented or error

---

## ✅ Final Checklist

**All Critical Tests:**
- [ ] fabric_choice appears in Network request payload
- [ ] urgency_level appears in Network request payload
- [ ] Order creates with 201 status
- [ ] No PGRST204 errors
- [ ] fabric_choice in database NOT NULL
- [ ] urgency_level in database NOT NULL
- [ ] 3 milestones created

---

## 📊 Test Result

**Overall Status:** 
- ✅ PASS - All tests passed
- ⚠️ PARTIAL - Some issues found
- ❌ FAIL - Critical failures

**Issues Found:**
1. ___________________________________
2. ___________________________________
3. ___________________________________

**Notes:**
_________________________________________
_________________________________________
_________________________________________

---

**Date:** _______________
**Tester:** _______________
**Order Number Created:** _______________

---

## 🎯 If All Pass:
✅ Migration successful!
✅ Order creation flow working!
✅ Story 4.5 unblocked!

## 🐛 If Failures:
1. Document exact error
2. Check console logs
3. Verify migration applied
4. Review `UI_WIZARD_TEST_GUIDE.md` for troubleshooting

