-- ============================================================================
-- Clear All Orders and Related Data
-- WARNING: This will DELETE all orders and cannot be undone!
-- ============================================================================

-- Start transaction for safety
BEGIN;

-- Display order counts before deletion
SELECT 'BEFORE DELETION:' as info;
SELECT 
  'Orders: ' || COUNT(*) as count 
FROM orders;

SELECT 
  'Order Milestones: ' || COUNT(*) as count 
FROM order_milestones;

SELECT 
  'Reviews: ' || COUNT(*) as count 
FROM reviews WHERE order_id IS NOT NULL;

-- ============================================================================
-- Option 1: Delete ALL orders and related data
-- ============================================================================

-- Delete reviews related to orders
DELETE FROM review_votes 
WHERE review_id IN (SELECT id FROM reviews WHERE order_id IS NOT NULL);

DELETE FROM review_responses 
WHERE review_id IN (SELECT id FROM reviews WHERE order_id IS NOT NULL);

DELETE FROM review_photos 
WHERE review_id IN (SELECT id FROM reviews WHERE order_id IS NOT NULL);

DELETE FROM reviews 
WHERE order_id IS NOT NULL;

-- Delete order-related data (should cascade if constraints are set up)
DELETE FROM order_messages;

DELETE FROM order_milestones;

DELETE FROM milestone_approvals;

DELETE FROM group_order_items;

DELETE FROM group_order_messages;

DELETE FROM group_orders;

-- Delete favorites and saved orders
DELETE FROM favorite_orders;

DELETE FROM order_analytics;

-- Delete the orders themselves
DELETE FROM orders;

-- Display counts after deletion
SELECT 'AFTER DELETION:' as info;
SELECT 
  'Orders: ' || COUNT(*) as count 
FROM orders;

SELECT 
  'Order Milestones: ' || COUNT(*) as count 
FROM order_milestones;

SELECT 
  'Reviews: ' || COUNT(*) as count 
FROM reviews WHERE order_id IS NOT NULL;

-- Commit the transaction
COMMIT;

-- ============================================================================
-- Display success message
-- ============================================================================
SELECT '✅ All orders and related data have been deleted!' as result;

-- ============================================================================
-- ALTERNATIVE: If you only want to delete DRAFT/TEST orders, use this instead:
-- ============================================================================
-- ROLLBACK;  -- Undo the above deletions
-- BEGIN;
-- 
-- -- Delete only draft orders
-- DELETE FROM order_milestones 
-- WHERE order_id IN (SELECT id FROM orders WHERE status = 'DRAFT');
-- 
-- DELETE FROM orders 
-- WHERE status = 'DRAFT';
-- 
-- COMMIT;
-- ============================================================================

