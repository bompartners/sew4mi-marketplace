-- Verify order exists and get details
SELECT 
    id,
    order_number,
    customer_id,
    tailor_id,
    status
FROM orders 
WHERE id = 'ab0e70f4-5476-4187-a79e-c754a98a412d';

-- Check if order_messages table exists and is accessible
SELECT COUNT(*) as message_count
FROM order_messages
WHERE order_id = 'ab0e70f4-5476-4187-a79e-c754a98a412d';

-- Verify tailor profile exists for this order
SELECT 
    o.id as order_id,
    o.tailor_id,
    tp.user_id as tailor_user_id
FROM orders o
JOIN tailor_profiles tp ON tp.id = o.tailor_id
WHERE o.id = 'ab0e70f4-5476-4187-a79e-c754a98a412d';

