-- Migration: Fix urgency_level constraint to match TypeScript enum values
-- Date: 2025-10-18
-- Purpose: Update constraint to accept uppercase values (STANDARD, EXPRESS, URGENT)

-- Drop the old constraint
ALTER TABLE public.orders 
DROP CONSTRAINT IF EXISTS orders_urgency_level_check;

-- Add new constraint with correct uppercase values matching TypeScript enum
ALTER TABLE public.orders 
ADD CONSTRAINT orders_urgency_level_check 
CHECK (urgency_level IN ('STANDARD', 'EXPRESS', 'URGENT'));

-- Update comment to reflect actual values
COMMENT ON COLUMN public.orders.urgency_level IS 'Order urgency: STANDARD, URGENT, or EXPRESS (uppercase)';

