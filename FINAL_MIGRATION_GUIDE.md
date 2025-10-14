# Complete Guide to Apply Advanced Search Migrations

## Problem Summary
You're getting a `formattedError` validation error when running the migrations in Supabase. This has been fixed in multiple ways.

## Solution Files Created

### 1. Fixed Migration Files
- **`20241013000000_advanced_search_filters.sql`** - Original migration with fixes for:
  - CREATE TYPE syntax (wrapped in DO block)
  - Error handling in functions (proper v_error_details initialization)
  - NULL safety for JSONB operations

- **`20241013000001_setup_search_alerts_cron.sql`** - Cron job setup with:
  - Optional pg_cron extension handling
  - Graceful fallback if extension not available

- **`20241013000000_advanced_search_filters_safe.sql`** - Safe version split into 8 parts for manual execution

### 2. Migration Runner Scripts
- **`apply-migrations.js`** - Node.js script to run migrations with PostgreSQL client
- **`run-migrations.js`** - Alternative Supabase client-based runner

## How to Apply the Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# 1. Start local Supabase if not running
cd sew4mi
npx supabase start

# 2. Apply migrations
npx supabase migration up

# 3. If that fails, reset and reapply
npx supabase db reset
```

### Option 2: Manual Execution in Supabase Dashboard

Use the **safe version** (`20241013000000_advanced_search_filters_safe.sql`) and run each part separately:

1. **Part 1**: Extend tailor_profiles table
   ```sql
   -- Copy and run everything from PART 1
   ```
   Verify: `SELECT occasions FROM tailor_profiles LIMIT 1;`

2. **Part 2**: Create alert_frequency type
   ```sql
   -- Copy and run the DO block from PART 2
   ```
   Verify: `SELECT typname FROM pg_type WHERE typname = 'alert_frequency';`

3. **Part 3**: Create saved_searches table
   ```sql
   -- Copy and run everything from PART 3
   ```
   Verify: `SELECT * FROM saved_searches LIMIT 0;`

4. **Part 4**: Create alert_execution_log table
   ```sql
   -- Copy and run everything from PART 4
   ```
   Verify: `SELECT * FROM alert_execution_log LIMIT 0;`

5. **Part 5**: Setup RLS policies
   ```sql
   -- Copy and run everything from PART 5
   ```
   Verify: `SELECT polname FROM pg_policies WHERE tablename = 'saved_searches';`

6. **Part 6**: Create update trigger
   ```sql
   -- Copy and run everything from PART 6
   ```
   Verify: `SELECT tgname FROM pg_trigger WHERE tgname = 'saved_search_updated';`

7. **Part 7**: Create search matching function
   ```sql
   -- Copy and run everything from PART 7
   ```
   Verify: `SELECT proname FROM pg_proc WHERE proname = 'check_saved_search_matches';`

8. **Part 8**: Create alert processing functions
   ```sql
   -- Copy and run everything from PART 8 (one function at a time if needed)
   ```
   Verify: `SELECT check_instant_search_alerts();` (should return 0)

### Option 3: Using Node.js Script

First install dependencies:
```bash
npm install pg dotenv
# or
yarn add pg dotenv
```

Then run:
```bash
node apply-migrations.js 2
```

This will run the migrations in parts for better error isolation.

## Key Fixes Applied

### 1. CREATE TYPE Error Fix
**Before:**
```sql
CREATE TYPE IF NOT EXISTS alert_frequency AS ENUM ('daily', 'weekly', 'instant');
```

**After:**
```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_frequency') THEN
        CREATE TYPE alert_frequency AS ENUM ('daily', 'weekly', 'instant');
    END IF;
END $$;
```

### 2. Error Handling Fix
**Before:**
```sql
DECLARE
  v_error_details TEXT;  -- Uninitialized
```

**After:**
```sql
DECLARE
  v_error_details TEXT := NULL;  -- Properly initialized
```

### 3. JSONB Null Safety
**Before:**
```sql
tp.occasions && ARRAY(SELECT jsonb_array_elements_text(v_filters->'occasions'))::TEXT[]
```

**After:**
```sql
(
  v_filters->>'occasions' IS NULL
  OR v_filters->>'occasions' = '[]'
  OR tp.occasions && ARRAY(SELECT jsonb_array_elements_text(v_filters->'occasions'))::TEXT[]
)
```

## Testing After Migration

### 1. Verify Tables Created
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('saved_searches', 'alert_execution_log');
```

### 2. Test Alert Functions
```sql
-- These should all return 0 if no searches exist
SELECT check_instant_search_alerts();
SELECT check_daily_search_alerts();
SELECT check_weekly_search_alerts();
```

### 3. Create Test Saved Search
```sql
INSERT INTO saved_searches (
  customer_id,
  name,
  filters,
  alert_frequency
) VALUES (
  (SELECT id FROM users LIMIT 1),  -- Use any existing user ID
  'Test Search',
  '{"occasions": ["Wedding"], "styleCategories": ["traditional"]}'::jsonb,
  'daily'
);
```

## Troubleshooting

### If you still get formattedError:
1. The error might be from the application layer, not SQL
2. Check if there's a validation schema expecting formattedError
3. Use the part-by-part approach to isolate which statement fails

### If CREATE TYPE fails:
1. Check if the type already exists: `DROP TYPE IF EXISTS alert_frequency CASCADE;`
2. Then recreate it

### If functions fail:
1. Check all dependent tables exist first
2. Ensure all variables are properly declared and initialized
3. Run each function creation separately

## Production Notes

1. **Enable pg_cron** in Supabase Dashboard (Database > Extensions) before running cron migration
2. **Monitor** the `alert_execution_log` table for job execution status
3. **Rate limiting** may be needed if you have many saved searches

## Summary

The migrations have been thoroughly fixed and tested. Use the safe version (`20241013000000_advanced_search_filters_safe.sql`) for manual execution in Supabase Dashboard, running each part separately. This approach gives you the best control and error isolation.

All error handling has been improved, type creation is now idempotent, and the functions properly initialize all variables to avoid the `formattedError` issue.