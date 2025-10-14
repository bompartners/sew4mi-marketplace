-- Migration for Story 4.4: Setup pg_cron for Search Alerts
-- Configures scheduled jobs to check for new tailors matching saved searches

-- ==============================================
-- ENABLE PG_CRON EXTENSION
-- ==============================================

-- Enable pg_cron extension for scheduled jobs
-- Note: pg_cron must be enabled in Supabase dashboard for production
-- For local development, this extension may not be available
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        BEGIN
            CREATE EXTENSION pg_cron;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'pg_cron extension not available - search alerts will need manual triggering';
        END;
    END IF;
END $$;

-- ==============================================
-- SCHEDULE SEARCH ALERT JOBS
-- ==============================================

-- Only schedule jobs if pg_cron is available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Schedule instant alerts check (every 15 minutes)
        -- This provides near-real-time notifications for users who want immediate updates
        PERFORM cron.schedule(
          'check-instant-search-alerts',
          '*/15 * * * *',  -- Every 15 minutes
          'SELECT check_instant_search_alerts();'
        );

        -- Schedule daily alerts check (8:00 AM Ghana time = 8:00 AM UTC)
        -- Runs once per day to notify users with daily alert preferences
        PERFORM cron.schedule(
          'check-daily-search-alerts',
          '0 8 * * *',  -- Daily at 8:00 AM UTC (Ghana time)
          'SELECT check_daily_search_alerts();'
        );

        -- Schedule weekly alerts check (Mondays at 8:00 AM Ghana time = 8:00 AM UTC)
        -- Runs once per week on Mondays for users with weekly alert preferences
        PERFORM cron.schedule(
          'check-weekly-search-alerts',
          '0 8 * * 1',  -- Mondays at 8:00 AM UTC (Ghana time)
          'SELECT check_weekly_search_alerts();'
        );

        RAISE NOTICE 'Search alert cron jobs scheduled successfully';
    ELSE
        RAISE NOTICE 'pg_cron extension not available - search alerts will need to be triggered manually';
    END IF;
END $$;

-- ==============================================
-- VERIFY SCHEDULED JOBS
-- ==============================================

-- Add comment if schema exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
        COMMENT ON SCHEMA cron IS 'pg_cron scheduled jobs for search alerts and background tasks';
    END IF;
END $$;

-- Query to view all scheduled jobs (for admin verification):
-- SELECT * FROM cron.job WHERE jobname LIKE '%search-alerts%';

-- Query to view job execution history:
-- SELECT * FROM cron.job_run_details WHERE jobid IN (
--   SELECT jobid FROM cron.job WHERE jobname LIKE '%search-alerts%'
-- ) ORDER BY start_time DESC LIMIT 10;

-- Note: For production, ensure pg_cron is enabled in Supabase dashboard:
-- 1. Go to Database > Extensions in Supabase Dashboard
-- 2. Enable pg_cron extension
-- 3. Run this migration again to schedule the jobs
