# Order Creation Flow - Test Guide

## Test Completion Status: 🟡 IN PROGRESS

**Migration Applied**: ✅ fabric_choice, urgency_level, color_choice columns added  
**API Endpoint**: `/api/orders/create`  
**Database**: Supabase orders table  

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Test Scenarios](#test-scenarios)
3. [API Testing](#api-testing)
4. [UI Flow Testing](#ui-flow-testing)
5. [Database Verification](#database-verification)
6. [Common Issues](#common-issues)

---

## Prerequisites

### 1. Environment Setup
```bash
# Ensure you're in the web app directory
cd sew4mi/apps/web

# Install dependencies if needed
pnpm install

# Start the development server
pnpm dev
```

### 2. Database Requirements
- ✅ Migration `20251017120000_add_missing_order_columns.sql` applied
- ✅ At least one active tailor in `tailor_profiles` table
- ✅ At least one customer user in `users` table
- ⚠️ Measurement profiles (currently mocked, validation skipped)

### 3. Authentication
You need to be authenticated as a customer to create orders. Get your auth token from:
- Browser DevTools > Application > Local Storage > `supabase.auth.token`
- Or use Supabase dashboard to get a test token

---

## Test Scenarios

### Scenario 1: Happy Path - Complete Order Creation ✅

**Objective**: Create a valid order with all required fields

**Test Data**:
```json
{
  "customerId": "YOUR_USER_ID",
  "tailorId": "ACTIVE_TAILOR_ID",
  "measurementProfileId": "ANY_UUID",
  "garmentType": "Traditional Suit",
  "fabricChoice": "TAILOR_SOURCED",
  "specialInstructions": "Please use navy blue fabric",
  "totalAmount": 450.00,
  "estimatedDelivery": "2025-11-15",
  "urgencyLevel": "STANDARD"
}
```

**Expected Result**:
- ✅ Status: 201 Created
- ✅ Response contains `orderId` and `orderNumber`
- ✅ Order appears in database with all fields populated
- ✅ Three escrow milestones created

---

### Scenario 2: Validation Tests

#### 2.1: Missing Required Fields ❌
```json
{
  "customerId": "YOUR_USER_ID",
  "tailorId": "ACTIVE_TAILOR_ID"
  // Missing: garmentType, fabricChoice, etc.
}
```
**Expected**: 400 Bad Request with validation errors

#### 2.2: Invalid Fabric Choice ❌
```json
{
  "fabricChoice": "INVALID_OPTION"
}
```
**Expected**: 400 Bad Request - "Invalid fabric choice"

#### 2.3: Invalid Urgency Level ❌
```json
{
  "urgencyLevel": "SUPER_RUSH"
}
```
**Expected**: 400 Bad Request - "Invalid urgency level"

#### 2.4: Past Delivery Date ❌
```json
{
  "estimatedDelivery": "2020-01-01"
}
```
**Expected**: 400 Bad Request - "Delivery date must be in the future"

#### 2.5: Invalid Amount ❌
```json
{
  "totalAmount": 10.00
}
```
**Expected**: 400 Bad Request - "Minimum order amount is GHS 30"

---

### Scenario 3: Authorization Tests

#### 3.1: No Authentication ❌
Make request without auth token
**Expected**: 401 Unauthorized

#### 3.2: Customer ID Mismatch ❌
```json
{
  "customerId": "DIFFERENT_USER_ID"
}
```
**Expected**: 403 Forbidden - "Unauthorized - customer ID mismatch"

#### 3.3: Inactive Tailor ❌
```json
{
  "tailorId": "TAILOR_WITH_VACATION_MODE"
}
```
**Expected**: 400 Bad Request - "Selected tailor is not available"

---

### Scenario 4: Edge Cases

#### 4.1: Long Special Instructions ✅
```json
{
  "specialInstructions": "A".repeat(500)
}
```
**Expected**: Success (max 500 chars)

#### 4.2: Too Long Special Instructions ❌
```json
{
  "specialInstructions": "A".repeat(501)
}
```
**Expected**: 400 Bad Request

#### 4.3: Boundary Amount Values ✅
```json
{
  "totalAmount": 30.00  // Minimum
}
```
**Expected**: Success

```json
{
  "totalAmount": 5000.00  // Maximum
}
```
**Expected**: Success

---

## API Testing

### Method 1: Using cURL

#### 1. Get Test User IDs
```bash
# Get a customer ID
psql $DATABASE_URL -c "SELECT id, email FROM users WHERE role='CUSTOMER' LIMIT 1;"

# Get an active tailor ID  
psql $DATABASE_URL -c "SELECT user_id, business_name FROM tailor_profiles WHERE vacation_mode=false LIMIT 1;"
```

#### 2. Test Order Creation
```bash
# Set your variables
CUSTOMER_ID="paste-customer-uuid-here"
TAILOR_ID="paste-tailor-uuid-here"
AUTH_TOKEN="paste-your-auth-token-here"

# Create order
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "customerId": "'$CUSTOMER_ID'",
    "tailorId": "'$TAILOR_ID'",
    "measurementProfileId": "00000000-0000-0000-0000-000000000001",
    "garmentType": "Traditional Suit",
    "fabricChoice": "TAILOR_SOURCED",
    "specialInstructions": "Navy blue preferred",
    "totalAmount": 450.00,
    "estimatedDelivery": "2025-11-15T00:00:00.000Z",
    "urgencyLevel": "STANDARD"
  }'
```

**Success Response**:
```json
{
  "success": true,
  "orderId": "uuid-here",
  "orderNumber": "ORD-1729180800000-ABC123"
}
```

---

### Method 2: Using Thunder Client / Postman

**Create a new request**:

**URL**: `http://localhost:3000/api/orders/create`  
**Method**: POST  
**Headers**:
```
Content-Type: application/json
Authorization: Bearer YOUR_TOKEN
```

**Body**: See test data in scenarios above

---

### Method 3: Automated Test Script

Create `test-order-creation.js`:

```javascript
const fetch = require('node-fetch');

const API_URL = 'http://localhost:3000/api/orders/create';
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const CUSTOMER_ID = process.env.CUSTOMER_ID;
const TAILOR_ID = process.env.TAILOR_ID;

async function testOrderCreation() {
  const testData = {
    customerId: CUSTOMER_ID,
    tailorId: TAILOR_ID,
    measurementProfileId: '00000000-0000-0000-0000-000000000001',
    garmentType: 'Traditional Suit',
    fabricChoice: 'TAILOR_SOURCED',
    specialInstructions: 'Test order - please ignore',
    totalAmount: 450.00,
    estimatedDelivery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    urgencyLevel: 'STANDARD'
  };

  console.log('Testing order creation...');
  console.log('Request data:', JSON.stringify(testData, null, 2));

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();

    console.log('\nResponse Status:', response.status);
    console.log('Response Data:', JSON.stringify(result, null, 2));

    if (response.ok) {
      console.log('\n✅ SUCCESS: Order created!');
      console.log('Order ID:', result.orderId);
      console.log('Order Number:', result.orderNumber);
      return result;
    } else {
      console.log('\n❌ FAILED: Order creation failed');
      console.log('Errors:', result.errors);
      return null;
    }
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    return null;
  }
}

// Run test
testOrderCreation();
```

**Run**:
```bash
AUTH_TOKEN="your-token" \
CUSTOMER_ID="customer-uuid" \
TAILOR_ID="tailor-uuid" \
node test-order-creation.js
```

---

## UI Flow Testing

### 1. Navigate to Order Creation
```
http://localhost:3000/orders/new
```

### 2. Complete the Wizard

**Step 1: Tailor Selection**
- ✅ Select a tailor from the list
- ✅ Verify tailor details display correctly
- ✅ Click "Next"

**Step 2: Garment Type**
- ✅ Choose a garment type (e.g., "Traditional Suit")
- ✅ Verify garment details and base price show
- ✅ Click "Next"

**Step 3: Specifications**
- ✅ Select fabric choice: "I'll provide fabric" or "Tailor sources"
- ✅ Enter special instructions (optional)
- ✅ Verify fabric_choice is captured
- ✅ Click "Next"

**Step 4: Measurements**
- ✅ Select a measurement profile
- ✅ Verify required measurements are present
- ✅ Click "Next"

**Step 5: Timeline**
- ✅ Select urgency level: Standard/Urgent/Rush
- ✅ Choose estimated delivery date
- ✅ Verify urgency_level is captured
- ✅ Click "Calculate Price"

**Step 6: Summary & Confirmation**
- ✅ Review order details
- ✅ Verify pricing breakdown (25% deposit, 50% fitting, 25% final)
- ✅ Click "Place Order"

### 3. Verify Success
- ✅ Success message displays
- ✅ Order number shown
- ✅ Redirect to order details page

---

## Database Verification

### Check Order Was Created
```sql
SELECT 
  id,
  order_number,
  customer_id,
  tailor_id,
  garment_type,
  fabric_choice,      -- ✅ New column
  urgency_level,      -- ✅ New column
  special_instructions,
  status,
  total_amount,
  deposit_amount,
  fitting_payment_amount,
  final_payment_amount,
  delivery_date,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 5;
```

### Check Milestones Created
```sql
SELECT 
  om.id,
  om.order_id,
  o.order_number,
  om.stage,
  om.amount,
  om.status,
  om.required_action
FROM order_milestones om
JOIN orders o ON om.order_id = o.id
WHERE o.order_number = 'YOUR_ORDER_NUMBER';
```

**Expected**: 3 milestones (DEPOSIT, FITTING, FINAL)

### Verify Column Values
```sql
-- Check fabric_choice is populated
SELECT 
  order_number,
  fabric_choice,
  CASE 
    WHEN fabric_choice IS NOT NULL THEN '✅ Populated'
    ELSE '❌ NULL'
  END as fabric_status
FROM orders
WHERE order_number = 'YOUR_ORDER_NUMBER';

-- Check urgency_level is populated
SELECT 
  order_number,
  urgency_level,
  CASE 
    WHEN urgency_level IS NOT NULL THEN '✅ Populated'
    ELSE '❌ NULL'
  END as urgency_status
FROM orders
WHERE order_number = 'YOUR_ORDER_NUMBER';
```

---

## Common Issues

### Issue 1: PGRST204 Error Still Occurring
**Symptom**: "Could not find the 'fabric_choice' column"

**Solution**:
```bash
# Verify migration was applied
psql $DATABASE_URL -c "\d orders" | grep fabric_choice

# If not present, reapply migration
psql $DATABASE_URL < sew4mi/supabase/migrations/20251017120000_add_missing_order_columns.sql
```

---

### Issue 2: Tailor Not Found
**Symptom**: "Selected tailor is not available"

**Causes**:
1. Tailor has `vacation_mode = true`
2. Wrong tailor ID format
3. Tailor doesn't exist

**Solution**:
```sql
-- Find active tailors
SELECT user_id, business_name, vacation_mode 
FROM tailor_profiles 
WHERE vacation_mode = false;

-- Or create a test tailor
INSERT INTO users (id, email, full_name, role)
VALUES (gen_random_uuid(), 'test-tailor@example.com', 'Test Tailor', 'TAILOR')
RETURNING id;

-- Use returned ID to create profile
INSERT INTO tailor_profiles (user_id, business_name, vacation_mode)
VALUES ('RETURNED_ID', 'Test Tailor Shop', false);
```

---

### Issue 3: Authentication Failed
**Symptom**: 401 Unauthorized

**Solution**:
```javascript
// Get fresh auth token in browser console
const { data } = await supabase.auth.getSession();
console.log('Token:', data.session.access_token);
```

---

### Issue 4: Validation Errors
**Symptom**: 400 Bad Request with Zod validation errors

**Common Fixes**:
- Ensure all UUIDs are valid format
- Check date is ISO 8601 format: `2025-11-15T00:00:00.000Z`
- Verify enum values match exactly: `TAILOR_SOURCED`, not `tailor_sourced`
- Amount is a number, not string

---

### Issue 5: Escrow Calculation Mismatch
**Symptom**: "Invalid amount calculation"

**Explanation**: Due to rounding, deposit + fitting + final may not exactly equal total

**Solution**: The API handles this with 0.01 tolerance. If it still fails:
```javascript
// Ensure amounts are rounded to 2 decimals
totalAmount: Math.round(450.00 * 100) / 100
```

---

## Test Results Template

| Scenario | Expected | Actual | Status | Notes |
|----------|----------|--------|--------|-------|
| Happy Path | 201 Created | | ⬜ | |
| Missing Fields | 400 Error | | ⬜ | |
| Invalid Fabric Choice | 400 Error | | ⬜ | |
| Invalid Urgency | 400 Error | | ⬜ | |
| Past Delivery Date | 400 Error | | ⬜ | |
| No Auth | 401 Error | | ⬜ | |
| Customer ID Mismatch | 403 Error | | ⬜ | |
| Inactive Tailor | 400 Error | | ⬜ | |
| Long Instructions (500 chars) | Success | | ⬜ | |
| Too Long Instructions (501) | 400 Error | | ⬜ | |
| Minimum Amount (30) | Success | | ⬜ | |
| Maximum Amount (5000) | Success | | ⬜ | |
| Below Minimum (29) | 400 Error | | ⬜ | |
| Above Maximum (5001) | 400 Error | | ⬜ | |
| Database: fabric_choice populated | Not NULL | | ⬜ | |
| Database: urgency_level populated | Not NULL | | ⬜ | |
| Database: 3 milestones created | 3 rows | | ⬜ | |

---

## Quick Test Commands

```bash
# 1. Get test data
export CUSTOMER_ID=$(psql $DATABASE_URL -t -c "SELECT id FROM users WHERE role='CUSTOMER' LIMIT 1" | xargs)
export TAILOR_ID=$(psql $DATABASE_URL -t -c "SELECT user_id FROM tailor_profiles WHERE vacation_mode=false LIMIT 1" | xargs)

echo "Customer ID: $CUSTOMER_ID"
echo "Tailor ID: $TAILOR_ID"

# 2. Verify migration
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='orders' AND column_name IN ('fabric_choice', 'urgency_level');"

# 3. Check recent orders
psql $DATABASE_URL -c "SELECT order_number, fabric_choice, urgency_level, created_at FROM orders ORDER BY created_at DESC LIMIT 3;"
```

---

## Next Steps After Testing

- [ ] Document any issues found
- [ ] Update Story 4.5 test results
- [ ] Test order analytics with new columns
- [ ] Verify customer reviews can access order data
- [ ] Test end-to-end: Create order → Complete order → Leave review

---

**Test Date**: 2025-10-17  
**Tester**: _________________  
**Result**: 🟡 IN PROGRESS / ✅ PASS / ❌ FAIL

