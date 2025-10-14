# Story 4.4: Saved Searches Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Saved Searches feature (Story 4.4) to production, including database migrations and background job configuration.

## Prerequisites

- [ ] Supabase project with admin access
- [ ] Database connection credentials
- [ ] pg_cron extension enabled (for background jobs)
- [ ] Supabase CLI installed locally

## Deployment Steps

### 1. Database Migration Deployment

#### Option A: Using Supabase Dashboard (Recommended)

1. **Login to Supabase Dashboard**
   - Navigate to your project at https://app.supabase.com
   - Go to SQL Editor

2. **Run Main Migration**
   ```sql
   -- Copy contents of: supabase/migrations/20241113120000_saved_searches_feature.sql
   -- Paste and execute in SQL Editor
   ```

3. **Verify Tables Created**
   ```sql
   -- Check tables exist
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('saved_searches', 'saved_search_alerts');

   -- Check indexes
   SELECT indexname FROM pg_indexes
   WHERE tablename IN ('saved_searches', 'saved_search_alerts');
   ```

#### Option B: Using Supabase CLI

1. **Login to Supabase**
   ```bash
   npx supabase login
   ```

2. **Link to your project**
   ```bash
   npx supabase link --project-ref your-project-ref
   ```

3. **Run migrations**
   ```bash
   npx supabase db push
   ```

4. **Verify deployment**
   ```bash
   npx supabase db diff
   ```

### 2. Enable pg_cron Extension

**IMPORTANT**: pg_cron requires superuser privileges and must be enabled by Supabase support for hosted projects.

#### For Supabase Hosted Projects

1. **Request pg_cron activation**
   - Go to Supabase Dashboard → Settings → Database
   - Click on "Extensions"
   - Search for "pg_cron"
   - Click "Enable" (may require support ticket)

2. **Alternative: Contact Support**
   - Email: support@supabase.com
   - Subject: "Enable pg_cron extension for project [your-project-ref]"
   - Include project URL and use case

#### For Self-Hosted Supabase

1. **Connect as superuser**
   ```sql
   -- Connect to your database as postgres user
   psql -U postgres -d your_database
   ```

2. **Enable extension**
   ```sql
   CREATE EXTENSION IF NOT EXISTS pg_cron;
   GRANT USAGE ON SCHEMA cron TO postgres;

   -- Verify installation
   SELECT * FROM pg_extension WHERE extname = 'pg_cron';
   ```

### 3. Deploy Background Jobs

Once pg_cron is enabled, deploy the background jobs:

1. **Run pg_cron migration**
   ```sql
   -- Copy contents of: supabase/migrations/20241113120001_saved_searches_pg_cron.sql
   -- Execute in SQL Editor
   ```

2. **Verify jobs are scheduled**
   ```sql
   -- List all scheduled jobs
   SELECT jobid, jobname, schedule, active
   FROM cron.job
   WHERE jobname LIKE '%saved-search%';
   ```

   Expected output:
   ```
   jobid | jobname                           | schedule      | active
   ------|-----------------------------------|---------------|--------
   1     | process-instant-saved-searches   | */15 * * * *  | true
   2     | process-daily-saved-searches     | 0 7 * * *     | true
   3     | process-weekly-saved-searches    | 0 7 * * 1     | true
   4     | process-monthly-saved-searches   | 0 7 1 * *     | true
   5     | send-saved-search-notifications  | */5 * * * *   | true
   6     | cleanup-old-saved-search-alerts  | 0 2 * * *     | true
   7     | collect-saved-search-stats       | 0 3 * * *     | true
   ```

3. **Test job execution**
   ```sql
   -- Manually run a job to test
   SELECT cron.run_job('collect-saved-search-stats');

   -- Check execution results
   SELECT * FROM cron.job_run_details
   WHERE jobname = 'collect-saved-search-stats'
   ORDER BY start_time DESC
   LIMIT 1;
   ```

### 4. Configure Environment Variables

Add these to your production environment:

```bash
# .env.production
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DATABASE_URL=your_database_connection_string

# Feature flags
NEXT_PUBLIC_ENABLE_SAVED_SEARCHES=true
NEXT_PUBLIC_MAX_SAVED_SEARCHES=10
```

### 5. Notification Service Integration

The background jobs create notification records. To send actual notifications:

1. **Update notification sender job**
   ```sql
   -- Modify the send-saved-search-notifications job to call your notification API
   -- This example shows webhook integration

   SELECT cron.unschedule('send-saved-search-notifications');

   SELECT cron.schedule(
     'send-saved-search-notifications',
     '*/5 * * * *',
     $$
     SELECT net.http_post(
       url := 'https://your-api.com/api/notifications/saved-searches',
       headers := '{"Authorization": "Bearer your-api-key"}'::jsonb,
       body := jsonb_build_object('action', 'process_pending')
     );
     $$
   );
   ```

2. **Or use Edge Functions**
   ```typescript
   // supabase/functions/process-saved-search-notifications/index.ts
   import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
   import { createClient } from '@supabase/supabase-js'

   serve(async (req) => {
     const supabase = createClient(
       Deno.env.get('SUPABASE_URL')!,
       Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
     )

     // Process pending notifications
     const { data: alerts } = await supabase
       .from('saved_search_alerts')
       .select('*')
       .eq('notification_status', 'pending')
       .limit(50)

     // Send notifications via Twilio/SendGrid
     // ... notification logic ...

     return new Response(JSON.stringify({ processed: alerts?.length || 0 }))
   })
   ```

### 6. Monitoring & Maintenance

#### Monitor Job Execution

```sql
-- View recent job runs
SELECT
  jobname,
  status,
  return_message,
  start_time,
  end_time,
  EXTRACT(EPOCH FROM (end_time - start_time)) AS duration_seconds
FROM cron.job_run_details
WHERE jobname LIKE '%saved-search%'
  AND start_time > NOW() - INTERVAL '24 hours'
ORDER BY start_time DESC;

-- Check for failed jobs
SELECT * FROM cron.job_run_details
WHERE jobname LIKE '%saved-search%'
  AND status = 'failed'
  AND start_time > NOW() - INTERVAL '7 days';
```

#### Performance Metrics

```sql
-- Saved search statistics
SELECT
  COUNT(*) as total_searches,
  COUNT(*) FILTER (WHERE alert_enabled = true) as active_alerts,
  COUNT(DISTINCT customer_id) as unique_users,
  AVG(match_count) as avg_matches_per_search
FROM public.saved_searches;

-- Alert processing metrics
SELECT
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (WHERE notification_status = 'pending') as pending,
  COUNT(*) FILTER (WHERE notification_status = 'sent') as sent,
  COUNT(*) FILTER (WHERE notification_status = 'failed') as failed
FROM public.saved_search_alerts
WHERE matched_at > NOW() - INTERVAL '7 days';
```

#### Troubleshooting

1. **Jobs not running**
   ```sql
   -- Check if jobs are active
   SELECT * FROM cron.job WHERE active = false;

   -- Reactivate a job
   UPDATE cron.job SET active = true WHERE jobname = 'job-name';
   ```

2. **Clear stuck notifications**
   ```sql
   -- Reset failed notifications for retry
   UPDATE public.saved_search_alerts
   SET notification_status = 'pending'
   WHERE notification_status = 'failed'
     AND notified_at < NOW() - INTERVAL '1 hour';
   ```

3. **Debug job execution**
   ```sql
   -- Enable verbose logging
   SET cron.log_statement = 'all';
   SET cron.log_run = 'on';

   -- Check PostgreSQL logs for details
   ```

### 7. Rollback Procedures

If issues occur, use these rollback procedures:

#### Disable Background Jobs
```sql
-- Disable all saved search jobs
UPDATE cron.job
SET active = false
WHERE jobname LIKE '%saved-search%';

-- Or remove completely
SELECT cron.unschedule(jobname)
FROM cron.job
WHERE jobname LIKE '%saved-search%';
```

#### Remove Feature Tables
```sql
-- CAUTION: This will delete all saved search data
DROP TABLE IF EXISTS public.saved_search_alerts CASCADE;
DROP TABLE IF EXISTS public.saved_searches CASCADE;
DROP VIEW IF EXISTS public.saved_search_matches CASCADE;
DROP FUNCTION IF EXISTS check_saved_search_matches CASCADE;
DROP FUNCTION IF EXISTS process_saved_search_notifications CASCADE;
DROP FUNCTION IF EXISTS get_saved_searches_with_stats CASCADE;
```

### 8. Post-Deployment Validation

Run these checks after deployment:

```bash
# 1. Test API endpoints
curl -X GET https://your-app.com/api/search/saved \
  -H "Authorization: Bearer your-token"

# 2. Create a test saved search
curl -X POST https://your-app.com/api/search/save \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Search",
    "filters": {"city": "Accra"},
    "alertEnabled": true,
    "alertFrequency": "instant"
  }'

# 3. Run tests
pnpm test saved-search
pnpm test:e2e saved-search-workflow.spec.ts
```

### 9. Production Checklist

- [ ] Main migration executed successfully
- [ ] All tables and indexes created
- [ ] RLS policies active and tested
- [ ] pg_cron extension enabled
- [ ] Background jobs scheduled and active
- [ ] Job execution verified (manual run)
- [ ] Environment variables configured
- [ ] Notification integration tested
- [ ] Monitoring queries saved
- [ ] Rollback plan documented
- [ ] Feature flag enabled
- [ ] API endpoints responding
- [ ] E2E tests passing

## Notification Channels Setup

### Email (SendGrid)
```typescript
// lib/services/notifications/email.service.ts
async function sendSavedSearchEmail(
  to: string,
  searchName: string,
  matches: SavedSearchMatch[]
) {
  const msg = {
    to,
    from: 'notifications@sew4mi.com',
    subject: `New tailors match your search: ${searchName}`,
    html: generateEmailTemplate(matches)
  };

  await sgMail.send(msg);
}
```

### SMS/WhatsApp (Twilio)
```typescript
// lib/services/notifications/sms.service.ts
async function sendSavedSearchSMS(
  to: string,
  searchName: string,
  matchCount: number
) {
  await twilioClient.messages.create({
    body: `Sew4Mi: ${matchCount} new tailors match your saved search "${searchName}". View now: https://sew4mi.com/saved-searches`,
    to: GhanaPhoneUtils.formatGhanaNumber(to),
    from: process.env.TWILIO_PHONE_NUMBER
  });
}
```

### Push Notifications (Web Push)
```typescript
// lib/services/notifications/push.service.ts
async function sendSavedSearchPush(
  subscription: PushSubscription,
  searchName: string,
  matchCount: number
) {
  await webpush.sendNotification(
    subscription,
    JSON.stringify({
      title: 'New Tailor Matches!',
      body: `${matchCount} tailors match "${searchName}"`,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      data: { url: '/saved-searches' }
    })
  );
}
```

## Support & Troubleshooting

### Common Issues

1. **pg_cron not available**
   - Solution: Contact Supabase support for hosted projects
   - Alternative: Use Vercel Cron or external scheduler

2. **Jobs not executing**
   - Check: pg_cron extension enabled
   - Check: Jobs are active in cron.job table
   - Check: Database timezone settings

3. **Notifications not sending**
   - Check: Service role key configured
   - Check: Notification service credentials
   - Check: Alert records in pending status

4. **Performance issues**
   - Add indexes if queries are slow
   - Limit batch sizes in jobs
   - Adjust job frequencies

### Contact Information

- **Supabase Support**: support@supabase.com
- **GitHub Issues**: https://github.com/sew4mi/marketplace/issues
- **Documentation**: https://docs.sew4mi.com

## Appendix: Time Zones

The cron jobs use GMT/UTC. Ghana is GMT+0 (no DST), so:
- 7:00 GMT = 7:00 AM Ghana time
- 2:00 GMT = 2:00 AM Ghana time

Adjust schedules if deploying in different time zones.

## Version History

| Version | Date       | Changes                          |
|---------|------------|----------------------------------|
| 1.0.0   | 2024-11-13 | Initial saved searches feature  |
| 1.0.1   | TBD        | Add notification batching       |
| 1.1.0   | TBD        | Add search analytics            |

---

**Last Updated**: November 13, 2024
**Story**: 4.4 - Advanced Search and Filtering
**Status**: Ready for Deployment