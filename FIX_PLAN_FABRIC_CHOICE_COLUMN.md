# Fix Plan: Missing `fabric_choice` Column in Orders Table

## Error Summary
```
PGRST204: Could not find the 'fabric_choice' column of 'orders' in the schema cache
```

## Root Cause Analysis

### Current State
1. **Database Schema (Actual)**: The `orders` table in `20240811120000_initial_schema.sql` does NOT have a `fabric_choice` column
2. **Documentation**: The `database-schema.md` documentation DOES include `fabric_choice VARCHAR(255)` 
3. **Code References**: The application code is trying to insert/read `fabric_choice`:
   - `sew4mi/apps/web/app/api/orders/create/route.ts` (line 123)
   - `sew4mi/apps/web/lib/repositories/order-analytics.repository.ts` (line 106)

### The Problem
The documentation reflects a planned schema that was never migrated to the actual database. The code was written against the documented schema, but the migration file doesn't include these columns.

## Missing Columns Identified

Based on code usage and documentation comparison, these columns are missing from the `orders` table:

1. ✗ `fabric_choice` VARCHAR(255) - Referenced in create route and analytics
2. ✗ `urgency_level` - Referenced in create route (line 125)
3. ✗ `color_choice` - Referenced in analytics repository (line 110)

## Verification

### Actual Schema (Migration File)
```sql
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.users(id),
  tailor_id UUID NOT NULL REFERENCES public.tailor_profiles(id),
  measurement_profile_id UUID REFERENCES public.measurement_profiles(id),
  status order_status NOT NULL DEFAULT 'DRAFT',
  garment_type TEXT NOT NULL,
  style_preferences JSONB DEFAULT '{}'::jsonb,
  fabric_details JSONB DEFAULT '{}'::jsonb,  -- ⚠️ Fabric info stored here?
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
  ... other columns ...
);
```

### Expected Schema (Documentation)
```sql
CREATE TABLE orders (
    fabric_choice VARCHAR(255),        -- MISSING
    urgency_level VARCHAR(50),         -- MISSING (inferred)
    color_choice VARCHAR(100),         -- MISSING (inferred)
    ...
);
```

## Recommended Fix Approach

### Option 1: Create Migration to Add Missing Columns (RECOMMENDED)
**Pros:**
- Aligns database with code expectations
- Provides explicit columns for common order attributes
- Easier querying and analytics
- Clear data structure

**Cons:**
- Requires database migration
- Need to handle existing data

### Option 2: Use Existing JSONB Columns
**Pros:**
- No migration needed
- Schema already supports flexible attributes

**Cons:**
- Code needs significant refactoring
- Less efficient querying
- Type safety concerns

## Recommended Solution: Option 1

Create a new migration to add the missing columns to the `orders` table.

### Migration File Details

**File:** `sew4mi/supabase/migrations/20251017120000_add_missing_order_columns.sql`

```sql
-- Add missing columns to orders table for Story 4.5 implementation
-- These columns were documented but never added to the schema

-- Add fabric_choice column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS fabric_choice VARCHAR(255);

-- Add urgency_level column
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
CREATE INDEX IF NOT EXISTS idx_orders_fabric_choice ON public.orders(fabric_choice);
CREATE INDEX IF NOT EXISTS idx_orders_urgency_level ON public.orders(urgency_level);
CREATE INDEX IF NOT EXISTS idx_orders_color_choice ON public.orders(color_choice);
```

### Code Changes Required

1. **No code changes needed** - The application code is already written to use these columns
2. **Test the API endpoints** after applying migration
3. **Verify analytics queries** work correctly

### Rollback Plan

If issues occur, rollback migration:

```sql
-- Rollback: Remove added columns
ALTER TABLE public.orders DROP COLUMN IF EXISTS fabric_choice;
ALTER TABLE public.orders DROP COLUMN IF EXISTS urgency_level;
ALTER TABLE public.orders DROP COLUMN IF EXISTS color_choice;

-- Drop indexes
DROP INDEX IF EXISTS idx_orders_fabric_choice;
DROP INDEX IF EXISTS idx_orders_urgency_level;
DROP INDEX IF EXISTS idx_orders_color_choice;
```

## Implementation Steps

### Step 1: Create Migration File
```bash
# Create the migration file
touch sew4mi/supabase/migrations/20251017120000_add_missing_order_columns.sql
```

### Step 2: Apply Migration
```bash
# If using Supabase CLI locally
cd sew4mi
supabase db reset

# Or apply specific migration
supabase migration up
```

### Step 3: Verify Migration
```sql
-- Check columns exist
SELECT column_name, data_type, character_maximum_length 
FROM information_schema.columns 
WHERE table_name = 'orders' 
  AND column_name IN ('fabric_choice', 'urgency_level', 'color_choice');

-- Check indexes exist
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'orders' 
  AND indexname LIKE '%fabric%' 
   OR indexname LIKE '%urgency%' 
   OR indexname LIKE '%color%';
```

### Step 4: Test API Endpoints
```bash
# Test order creation with fabric_choice
curl -X POST http://localhost:3000/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "...",
    "tailorId": "...",
    "garmentType": "suit",
    "fabricChoice": "cotton",
    "urgencyLevel": "standard",
    "totalAmount": 500
  }'
```

### Step 5: Test Analytics Repository
```bash
# Run unit tests for order-analytics.repository.ts
cd sew4mi/apps/web
pnpm test lib/repositories/order-analytics.repository.test.ts
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Breaking existing orders data | Low | Medium | Using `ALTER TABLE ADD COLUMN IF NOT EXISTS` with nullable columns |
| Query performance degradation | Low | Low | Adding indexes alongside columns |
| Type mismatches | Low | Medium | Using CHECK constraints for urgency_level |
| Migration failure in production | Low | High | Test in development first; have rollback ready |

## Success Criteria

✅ Migration applies successfully without errors  
✅ All three columns exist in the orders table  
✅ API endpoint `/api/orders/create` successfully inserts data  
✅ Analytics repository queries run without PGRST204 errors  
✅ Existing orders remain intact (NULL values in new columns)  
✅ New orders can be created with fabric_choice, urgency_level, color_choice  

## Alternative Considerations

### Why Not Use fabric_details JSONB?
The `fabric_details` JSONB column exists, but:
- Code explicitly expects `fabric_choice` as a direct column
- Direct columns are faster for filtering and analytics
- Type safety is better with explicit columns
- The JSONB field can store additional fabric metadata

### Data Migration for Existing Orders
If existing orders have fabric info in `fabric_details` JSONB:
```sql
-- Optional: Migrate existing data from JSONB to new column
UPDATE public.orders 
SET fabric_choice = fabric_details->>'fabric_choice'
WHERE fabric_details ? 'fabric_choice' 
  AND fabric_choice IS NULL;
```

## Timeline Estimate

- Create migration file: 5 minutes
- Test locally: 10 minutes  
- Apply to staging: 5 minutes
- Verify and test: 15 minutes
- Deploy to production: 10 minutes

**Total: ~45 minutes**

## Next Steps

1. ✅ **IMMEDIATE**: Create the migration file
2. ✅ **IMMEDIATE**: Apply migration locally and test
3. ⏳ **BEFORE PRODUCTION**: Test order creation flow end-to-end
4. ⏳ **BEFORE PRODUCTION**: Run full test suite
5. ⏳ **PRODUCTION**: Apply migration during low-traffic window
6. ⏳ **POST-DEPLOY**: Monitor error logs for PGRST204 errors

---

## ✅ MIGRATION COMPLETED

**Date Applied**: 2025-10-17  
**Status**: ✅ COMPLETE - Migration applied successfully  
**Result**: All three columns added to orders table with indexes  

### Applied Changes
- ✅ `fabric_choice VARCHAR(255)` added to orders table
- ✅ `urgency_level VARCHAR(50)` added with CHECK constraint  
- ✅ `color_choice VARCHAR(100)` added to orders table
- ✅ Three indexes created for analytics performance
- ✅ Column comments added for documentation

### Verification Passed
```sql
column_name   | data_type         | character_maximum_length 
--------------|-------------------|-------------------------
color_choice  | character varying | 100
fabric_choice | character varying | 255
urgency_level | character varying | 50
```

**Original Error**: RESOLVED  
**Priority**: HIGH - Blocking Story 4.5 functionality ✅ UNBLOCKED  
**Actual Effort**: ~15 minutes

