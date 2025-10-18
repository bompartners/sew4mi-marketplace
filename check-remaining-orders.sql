-- Check what orders remain
SELECT 
  id,
  order_number,
  customer_id,
  garment_type,
  status,
  total_amount,
  created_at,
  delivery_date
FROM orders
ORDER BY created_at DESC;

-- Check which customer owns these orders
SELECT DISTINCT
  o.customer_id,
  u.email,
  u.full_name,
  u.role,
  COUNT(o.id) as order_count
FROM orders o
LEFT JOIN users u ON o.customer_id = u.id
GROUP BY o.customer_id, u.email, u.full_name, u.role;

