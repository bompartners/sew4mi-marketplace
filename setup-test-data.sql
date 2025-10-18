-- Test Data Setup for Order Creation Flow Testing
-- Run this to ensure you have the necessary test data

-- =============================================================================
-- 1. CHECK EXISTING DATA
-- =============================================================================

-- Check for existing customers
SELECT 'Existing Customers:' as info;
SELECT id, email, full_name, role 
FROM users 
WHERE role = 'CUSTOMER' 
LIMIT 5;

-- Check for existing tailors
SELECT 'Existing Tailors:' as info;
SELECT tp.id, tp.user_id, u.full_name, tp.business_name, tp.vacation_mode
FROM tailor_profiles tp
JOIN users u ON tp.user_id = u.id
WHERE tp.vacation_mode = false
LIMIT 5;

-- =============================================================================
-- 2. CREATE TEST DATA (if needed)
-- =============================================================================

-- Create test customer (if none exist)
DO $$
DECLARE
  test_customer_id UUID;
  customer_count INT;
BEGIN
  SELECT COUNT(*) INTO customer_count FROM users WHERE role = 'CUSTOMER';
  
  IF customer_count = 0 THEN
    INSERT INTO users (id, email, full_name, role, phone_number, whatsapp_opted_in)
    VALUES (
      gen_random_uuid(),
      'test-customer@sew4mi.test',
      'Test Customer',
      'CUSTOMER',
      '+233500000001',
      true
    )
    RETURNING id INTO test_customer_id;
    
    RAISE NOTICE 'Created test customer with ID: %', test_customer_id;
  ELSE
    RAISE NOTICE 'Customers already exist, skipping creation';
  END IF;
END $$;

-- Create test tailor (if none exist)
DO $$
DECLARE
  test_tailor_user_id UUID;
  test_tailor_profile_id UUID;
  tailor_count INT;
BEGIN
  SELECT COUNT(*) INTO tailor_count FROM tailor_profiles WHERE vacation_mode = false;
  
  IF tailor_count = 0 THEN
    -- Create tailor user
    INSERT INTO users (id, email, full_name, role, phone_number, whatsapp_opted_in)
    VALUES (
      gen_random_uuid(),
      'test-tailor@sew4mi.test',
      'Test Tailor',
      'TAILOR',
      '+233500000002',
      true
    )
    RETURNING id INTO test_tailor_user_id;
    
    -- Create tailor profile
    INSERT INTO tailor_profiles (
      user_id,
      business_name,
      bio,
      years_of_experience,
      specializations,
      city,
      region,
      verification_status,
      vacation_mode,
      rating,
      total_reviews,
      accepts_rush_orders
    )
    VALUES (
      test_tailor_user_id,
      'Test Tailor Shop',
      'Expert in traditional and modern garments',
      5,
      ARRAY['Traditional Wear', 'Suits', 'Dresses'],
      'Accra',
      'Greater Accra',
      'VERIFIED',
      false,
      4.5,
      0,
      true
    )
    RETURNING id INTO test_tailor_profile_id;
    
    RAISE NOTICE 'Created test tailor with user_id: % and profile_id: %', test_tailor_user_id, test_tailor_profile_id;
  ELSE
    RAISE NOTICE 'Active tailors already exist, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- 3. VERIFY MIGRATION COLUMNS
-- =============================================================================

SELECT 'Migration Verification:' as info;

-- Check if new columns exist
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name IN ('fabric_choice', 'urgency_level', 'color_choice')
ORDER BY column_name;

-- Expected output:
-- color_choice   | character varying | 100  | YES
-- fabric_choice  | character varying | 255  | YES
-- urgency_level  | character varying | 50   | YES

-- =============================================================================
-- 4. EXPORT TEST IDS FOR USE IN SCRIPTS
-- =============================================================================

SELECT 'Test Data IDs (Copy these for your test script):' as info;

-- Get a customer ID
WITH customer_data AS (
  SELECT id, email 
  FROM users 
  WHERE role = 'CUSTOMER' 
  LIMIT 1
)
SELECT 
  'export CUSTOMER_ID="' || id || '"  # ' || email as command
FROM customer_data;

-- Get a tailor user ID
WITH tailor_data AS (
  SELECT u.id, u.email, tp.business_name
  FROM users u
  JOIN tailor_profiles tp ON tp.user_id = u.id
  WHERE tp.vacation_mode = false
  LIMIT 1
)
SELECT 
  'export TAILOR_ID="' || id || '"  # ' || email || ' - ' || business_name as command
FROM tailor_data;

-- =============================================================================
-- 5. CLEANUP TEST ORDERS (Optional - run after testing)
-- =============================================================================

-- Uncomment to clean up test orders created during testing
-- DELETE FROM order_milestones WHERE order_id IN (
--   SELECT id FROM orders WHERE order_number LIKE 'ORD-%' AND created_at > NOW() - INTERVAL '1 hour'
-- );
-- 
-- DELETE FROM orders WHERE order_number LIKE 'ORD-%' AND created_at > NOW() - INTERVAL '1 hour';

-- =============================================================================
-- 6. QUICK TEST QUERIES
-- =============================================================================

-- View recent orders with new columns
SELECT 'Recent Orders (with new columns):' as info;
SELECT 
  order_number,
  garment_type,
  fabric_choice,      -- New column
  urgency_level,      -- New column
  color_choice,       -- New column
  status,
  total_amount,
  created_at
FROM orders
ORDER BY created_at DESC
LIMIT 5;

-- Summary statistics
SELECT 'Database Summary:' as info;
SELECT 
  'Customers' as entity,
  COUNT(*) as count
FROM users WHERE role = 'CUSTOMER'
UNION ALL
SELECT 
  'Tailors' as entity,
  COUNT(*) as count
FROM tailor_profiles
UNION ALL
SELECT 
  'Active Tailors' as entity,
  COUNT(*) as count
FROM tailor_profiles WHERE vacation_mode = false
UNION ALL
SELECT 
  'Total Orders' as entity,
  COUNT(*) as count
FROM orders;

-- Done
SELECT '✅ Test data setup complete!' as status;

