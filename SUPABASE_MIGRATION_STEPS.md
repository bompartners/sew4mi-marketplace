# Supabase Migration Steps for Advanced Search Filters

## How to Apply the Migration in Supabase SQL Editor

The migration has been split into 8 parts that should be run sequentially. Each part is independent and can be verified before proceeding to the next.

### Step 1: Extend Tailor Profiles Table
Run PART 1 from the migration file to add new columns to the tailor_profiles table:
```sql
-- Run everything from "PART 1: EXTEND TAILOR_PROFILES TABLE"
-- This adds occasions, style_categories, fabric_specialties, etc.
```

**Verify:**
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'tailor_profiles'
AND column_name IN ('occasions', 'style_categories', 'fabric_specialties');
```

### Step 2: Create Alert Frequency Type
Run PART 2 to create the enum type:
```sql
-- Run the DO block from "PART 2: CREATE ALERT FREQUENCY TYPE"
```

**Verify:**
```sql
SELECT typname FROM pg_type WHERE typname = 'alert_frequency';
```

### Step 3: Create Saved Searches Table
Run PART 3 to create the saved_searches table:
```sql
-- Run everything from "PART 3: CREATE SAVED SEARCHES TABLE"
```

**Verify:**
```sql
SELECT * FROM saved_searches LIMIT 1;
```

### Step 4: Create Alert Execution Log Table
Run PART 4 to create the logging table:
```sql
-- Run everything from "PART 4: CREATE ALERT EXECUTION LOG TABLE"
```

**Verify:**
```sql
SELECT * FROM alert_execution_log LIMIT 1;
```

### Step 5: Set Up Row Level Security
Run PART 5 to enable RLS policies:
```sql
-- Run everything from "PART 5: ROW LEVEL SECURITY POLICIES"
```

**Verify:**
```sql
SELECT polname FROM pg_policies WHERE tablename = 'saved_searches';
```

### Step 6: Create Update Trigger
Run PART 6 to set up the updated_at trigger:
```sql
-- Run everything from "PART 6: CREATE TRIGGER FOR UPDATED_AT"
```

**Verify:**
```sql
SELECT tgname FROM pg_trigger WHERE tgname = 'saved_search_updated';
```

### Step 7: Create Search Matching Function
Run PART 7 to create the core search matching logic:
```sql
-- Run everything from "PART 7: CREATE SEARCH MATCHING FUNCTION"
```

**Verify:**
```sql
SELECT proname FROM pg_proc WHERE proname = 'check_saved_search_matches';
```

### Step 8: Create Alert Processing Functions
Run PART 8 to create the three alert processing functions:
```sql
-- Run everything from "PART 8: CREATE ALERT PROCESSING FUNCTIONS"
```

**Verify:**
```sql
SELECT proname FROM pg_proc
WHERE proname IN ('check_instant_search_alerts', 'check_daily_search_alerts', 'check_weekly_search_alerts');
```

## Testing the Migration

After all parts are successfully applied:

### 1. Test creating a saved search:
```sql
INSERT INTO saved_searches (
  customer_id,
  name,
  filters,
  alert_frequency
) VALUES (
  auth.uid(), -- Use a valid user ID if testing without auth
  'Test Search',
  '{"occasions": ["Wedding"], "styleCategories": ["traditional"]}',
  'daily'
);
```

### 2. Test the alert functions:
```sql
-- These should return 0 if no searches need alerts
SELECT check_instant_search_alerts();
SELECT check_daily_search_alerts();
SELECT check_weekly_search_alerts();
```

### 3. Check execution log:
```sql
SELECT * FROM alert_execution_log ORDER BY started_at DESC LIMIT 5;
```

## Troubleshooting

### If you get "formattedError" errors:
1. Make sure you're running each part separately
2. Check that all variable declarations are included
3. Ensure the error_details column allows NULL values

### If types already exist:
The migration handles this gracefully with RAISE NOTICE messages. These are informational and not errors.

### If functions fail to create:
1. Check that all dependent tables exist first
2. Verify that the alert_frequency type was created
3. Make sure you have appropriate permissions

## Alternative: Use Supabase CLI

If you continue to have issues with the SQL editor, use the Supabase CLI instead:

```bash
cd sew4mi
npx supabase migration up
```

This will apply all migrations in the correct order automatically.

## Notes for Production

1. **pg_cron Extension**: In production, enable pg_cron from the Supabase Dashboard under Database > Extensions before running the cron job migration.

2. **Performance**: The GIN indexes on array columns will improve search performance but may slow down writes slightly. This is an acceptable trade-off for a search-heavy feature.

3. **Monitoring**: Set up alerts on the `alert_execution_log` table to monitor for excessive errors.

4. **Rate Limiting**: The functions process all eligible searches in a loop. For production with many users, consider adding batch limits.