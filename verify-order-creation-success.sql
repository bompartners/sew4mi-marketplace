-- Final Verification Queries for Order Creation Flow
-- Run these to confirm everything is working correctly

-- 1. Check that new columns exist
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
  AND column_name IN ('fabric_choice', 'urgency_level', 'color_choice')
ORDER BY column_name;

-- Expected: 3 rows showing all columns exist

-- 2. Check the constraint is correct
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
  AND conname LIKE '%urgency%';

-- Expected: CHECK (urgency_level IN ('STANDARD', 'EXPRESS', 'URGENT'))

-- 3. View recent test orders with new columns
SELECT 
  order_number,
  garment_type,
  fabric_choice,        -- ✅ Should NOT be NULL
  urgency_level,        -- ✅ Should NOT be NULL
  color_choice,         -- May be NULL
  status,
  total_amount,
  deposit_amount,
  fitting_payment_amount,
  final_payment_amount,
  measurement_profile_id,  -- Expected to be NULL (mock data)
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 5;

-- Expected: Recent orders showing fabric_choice and urgency_level populated

-- 4. Check order milestones were created
SELECT 
  o.order_number,
  om.stage,
  om.amount,
  om.status,
  om.required_action
FROM orders o
JOIN order_milestones om ON o.id = om.order_id
WHERE o.created_at > NOW() - INTERVAL '1 hour'
ORDER BY o.created_at DESC, om.created_at;

-- Expected: 3 milestones per order (DEPOSIT, FITTING, FINAL)

-- 5. Summary statistics
SELECT 
  COUNT(*) as total_orders,
  COUNT(fabric_choice) as orders_with_fabric_choice,
  COUNT(urgency_level) as orders_with_urgency_level,
  COUNT(CASE WHEN fabric_choice IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as fabric_choice_percentage,
  COUNT(CASE WHEN urgency_level IS NOT NULL THEN 1 END) * 100.0 / COUNT(*) as urgency_level_percentage
FROM orders
WHERE created_at > NOW() - INTERVAL '1 day';

-- Expected: High percentage of new orders with fabric_choice and urgency_level

-- 6. Verify no constraint violations possible
-- This should FAIL if constraint is working correctly:
-- INSERT INTO orders (order_number, customer_id, tailor_id, garment_type, urgency_level, status, total_amount, deposit_amount)
-- VALUES ('TEST-FAIL', 'some-uuid', 'some-uuid', 'test', 'invalid_value', 'SUBMITTED', 100, 25);
-- Expected: ERROR - check constraint violation

-- 7. Check indexes were created
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'orders'
  AND (indexname LIKE '%fabric%' OR indexname LIKE '%urgency%' OR indexname LIKE '%color%')
ORDER BY indexname;

-- Expected: 3 indexes (fabric_choice, urgency_level, color_choice)

-- ✅ All checks passing = Order creation flow fully functional!

