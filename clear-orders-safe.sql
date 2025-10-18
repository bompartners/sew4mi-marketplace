-- ============================================================================
-- SAFE Clear Orders Script with Cascade Deletes
-- This uses the database's CASCADE constraints to automatically handle related data
-- ============================================================================

-- Display current counts
SELECT '📊 Current Order Counts:' as info;
SELECT COUNT(*) as total_orders FROM orders;
SELECT COUNT(*) as draft_orders FROM orders WHERE status = 'DRAFT';
SELECT COUNT(*) as completed_orders FROM orders WHERE status IN ('COMPLETED', 'DELIVERED');

-- ============================================================================
-- OPTION 1: Delete ONLY test/draft orders (SAFER)
-- ============================================================================
-- Uncomment these lines to delete only draft orders:
-- 
-- DELETE FROM orders WHERE status = 'DRAFT';
-- SELECT '✅ Deleted draft orders only' as result;

-- ============================================================================
-- OPTION 2: Delete ALL orders (DESTRUCTIVE - Cannot be undone!)
-- ============================================================================
-- Uncomment these lines to delete ALL orders:
--
-- DELETE FROM orders;
-- SELECT '✅ All orders deleted!' as result;

-- ============================================================================
-- OPTION 3: Delete orders from specific date range
-- ============================================================================
-- Uncomment and modify these lines to delete orders from a date range:
--
-- DELETE FROM orders 
-- WHERE created_at >= '2024-01-01' 
--   AND created_at < '2025-01-01';
-- SELECT '✅ Deleted orders from date range' as result;

-- ============================================================================
-- OPTION 4: Delete orders for specific customer (for testing)
-- ============================================================================
-- Uncomment and modify to delete orders for a test customer:
--
-- DELETE FROM orders 
-- WHERE customer_id = '30000000-0000-0000-0000-000000000001';
-- SELECT '✅ Deleted orders for test customer' as result;

-- ============================================================================
-- Verify deletions
-- ============================================================================
SELECT '📊 After Deletion:' as info;
SELECT COUNT(*) as remaining_orders FROM orders;

