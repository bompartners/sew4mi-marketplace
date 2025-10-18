-- Migration: Add missing columns to orders table
-- Date: 2025-10-17
-- Purpose: Add fabric_choice, urgency_level, and color_choice columns that were documented but missing from initial schema
-- Story: 4.5 - Customer Reviews System (uncovered during implementation)

-- Add fabric_choice column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS fabric_choice VARCHAR(255);

-- Add urgency_level column with constraint
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS urgency_level VARCHAR(50) 
CHECK (urgency_level IN ('standard', 'urgent', 'rush'));

-- Add color_choice column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS color_choice VARCHAR(100);

-- Add comments for documentation
COMMENT ON COLUMN public.orders.fabric_choice IS 'Customer-selected fabric type or description';
COMMENT ON COLUMN public.orders.urgency_level IS 'Order urgency: standard, urgent, or rush';
COMMENT ON COLUMN public.orders.color_choice IS 'Primary color choice for the garment';

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_orders_fabric_choice ON public.orders(fabric_choice) WHERE fabric_choice IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_urgency_level ON public.orders(urgency_level) WHERE urgency_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_color_choice ON public.orders(color_choice) WHERE color_choice IS NOT NULL;

-- Optional: Migrate existing data from fabric_details JSONB if needed
-- Uncomment if you have existing orders with fabric info in JSONB
-- UPDATE public.orders 
-- SET 
--   fabric_choice = fabric_details->>'fabric_choice',
--   color_choice = fabric_details->>'color_choice'
-- WHERE fabric_details IS NOT NULL
--   AND (fabric_details ? 'fabric_choice' OR fabric_details ? 'color_choice')
--   AND fabric_choice IS NULL;

