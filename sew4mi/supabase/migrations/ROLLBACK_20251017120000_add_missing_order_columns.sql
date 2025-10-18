-- Rollback Migration: Remove added order columns
-- Date: 2025-10-17
-- Purpose: Rollback the addition of fabric_choice, urgency_level, and color_choice columns
-- Use only if migration 20251017120000_add_missing_order_columns.sql needs to be reverted

-- Drop indexes first
DROP INDEX IF EXISTS public.idx_orders_fabric_choice;
DROP INDEX IF EXISTS public.idx_orders_urgency_level;
DROP INDEX IF EXISTS public.idx_orders_color_choice;

-- Remove columns
ALTER TABLE public.orders DROP COLUMN IF EXISTS fabric_choice;
ALTER TABLE public.orders DROP COLUMN IF EXISTS urgency_level;
ALTER TABLE public.orders DROP COLUMN IF EXISTS color_choice;

