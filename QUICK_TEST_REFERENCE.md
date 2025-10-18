# Order Creation Flow Testing - Quick Reference

## 🚀 Quick Start (3 Steps)

### Step 1: Setup Test Data
```bash
# Run SQL script to create test users and verify migration
psql $DATABASE_URL -f setup-test-data.sql
```

### Step 2: Get Your Test IDs
The SQL script will output commands like:
```bash
export CUSTOMER_ID="uuid-here"
export TAILOR_ID="uuid-here"
```

Copy and run these in your terminal.

### Step 3: Run Automated Tests
```bash
# Get your auth token (in browser console on localhost:3000)
# const { data } = await supabase.auth.getSession()
# console.log(data.session.access_token)

export AUTH_TOKEN="your-token-here"

# Run the test suite
node test-order-creation.js
```

---

## 📝 Manual API Test (cURL)

```bash
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -d '{
    "customerId": "'$CUSTOMER_ID'",
    "tailorId": "'$TAILOR_ID'",
    "measurementProfileId": "00000000-0000-0000-0000-000000000001",
    "garmentType": "Traditional Suit",
    "fabricChoice": "TAILOR_SOURCED",
    "specialInstructions": "Navy blue fabric",
    "totalAmount": 450.00,
    "estimatedDelivery": "2025-11-15T00:00:00.000Z",
    "urgencyLevel": "STANDARD"
  }'
```

**Success Response**:
```json
{
  "success": true,
  "orderId": "uuid",
  "orderNumber": "ORD-..."
}
```

---

## 🔍 Verify in Database

```sql
-- Check last created order
SELECT 
  order_number,
  fabric_choice,      -- ✅ Should be "TAILOR_SOURCED"
  urgency_level,      -- ✅ Should be "STANDARD"
  garment_type,
  total_amount,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 1;

-- Check milestones created
SELECT stage, amount, status
FROM order_milestones
WHERE order_id = (SELECT id FROM orders ORDER BY created_at DESC LIMIT 1);
```

Expected: 3 rows (DEPOSIT, FITTING, FINAL)

---

## ✅ What We're Testing

### New Columns (Added by Migration)
1. ✅ `fabric_choice` - Customer's fabric sourcing preference
2. ✅ `urgency_level` - Order urgency (STANDARD/EXPRESS)
3. ✅ `color_choice` - Primary color (optional, used by analytics)

### Test Scenarios
1. ✅ Valid order creation with all fields
2. ❌ Missing required fields (fabricChoice)
3. ❌ Invalid enum values (urgencyLevel)
4. ❌ Past delivery dates
5. ✅ Customer-provided fabric option
6. ✅ Rush orders

---

## 🐛 Common Issues

### Issue: "Could not find the 'fabric_choice' column"
**Fix**: Migration not applied
```bash
psql $DATABASE_URL -f sew4mi/supabase/migrations/20251017120000_add_missing_order_columns.sql
```

### Issue: "Selected tailor is not available"
**Fix**: Tailor has vacation_mode = true
```sql
UPDATE tailor_profiles SET vacation_mode = false WHERE user_id = 'YOUR_TAILOR_ID';
```

### Issue: 401 Unauthorized
**Fix**: Get fresh auth token
```javascript
// In browser console on your app
const { data } = await supabase.auth.getSession()
console.log(data.session.access_token)
```

---

## 📊 Test Checklist

- [ ] Migration applied and verified
- [ ] Test customer exists
- [ ] Test tailor exists (vacation_mode = false)
- [ ] Auth token obtained
- [ ] Automated test suite runs
- [ ] At least 1 successful order created
- [ ] Order appears in database with fabric_choice populated
- [ ] Order appears in database with urgency_level populated
- [ ] 3 milestones created for order
- [ ] No PGRST204 errors

---

## 📚 Full Documentation

See `ORDER_CREATION_TEST_GUIDE.md` for:
- Detailed test scenarios
- UI flow testing steps
- Troubleshooting guide
- Database verification queries

---

## 🎯 Success Criteria

✅ POST /api/orders/create returns 201  
✅ Response includes orderId and orderNumber  
✅ fabric_choice column populated in database  
✅ urgency_level column populated in database  
✅ 3 escrow milestones created  
✅ No PGRST204 errors occur  

---

**Quick Links**:
- API Route: `sew4mi/apps/web/app/api/orders/create/route.ts` (Line 123)
- Hook: `sew4mi/apps/web/hooks/useOrderCreation.ts`
- Schema: `sew4mi/packages/shared/src/schemas/order-creation.schema.ts`
- Migration: `sew4mi/supabase/migrations/20251017120000_add_missing_order_columns.sql`

**Status**: Ready for Testing  
**Priority**: HIGH - Unblocks Story 4.5

