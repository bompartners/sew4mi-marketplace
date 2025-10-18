-- Enable Realtime Replication for Order Tracking
-- Story 2.3 & 3.4: Real-time order updates and messaging

-- Enable replication for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Enable replication for order_milestones table
ALTER PUBLICATION supabase_realtime ADD TABLE order_milestones;

-- Enable replication for order_messages table
ALTER PUBLICATION supabase_realtime ADD TABLE order_messages;

-- Verify replication is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;

