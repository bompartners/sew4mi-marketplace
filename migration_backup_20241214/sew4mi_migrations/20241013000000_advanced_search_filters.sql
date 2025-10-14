-- Migration for Story 4.4: Advanced Search and Filtering
-- Extends tailor_profiles with search attributes and creates saved_searches table

-- ==============================================
-- EXTEND TAILOR_PROFILES TABLE
-- ==============================================

-- Add new search attribute columns to tailor_profiles
ALTER TABLE tailor_profiles
ADD COLUMN IF NOT EXISTS occasions TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS style_categories TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS fabric_specialties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS color_specialties TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS size_ranges TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS languages_spoken TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS min_delivery_days INTEGER,
ADD COLUMN IF NOT EXISTS max_delivery_days INTEGER;

-- Add GIN indexes for array fields (fast containment queries)
CREATE INDEX IF NOT EXISTS idx_tailor_profiles_occasions ON tailor_profiles USING GIN(occasions);
CREATE INDEX IF NOT EXISTS idx_tailor_profiles_styles ON tailor_profiles USING GIN(style_categories);
CREATE INDEX IF NOT EXISTS idx_tailor_profiles_fabrics ON tailor_profiles USING GIN(fabric_specialties);
CREATE INDEX IF NOT EXISTS idx_tailor_profiles_colors ON tailor_profiles USING GIN(color_specialties);
CREATE INDEX IF NOT EXISTS idx_tailor_profiles_sizes ON tailor_profiles USING GIN(size_ranges);
CREATE INDEX IF NOT EXISTS idx_tailor_profiles_languages ON tailor_profiles USING GIN(languages_spoken);

-- Add index for delivery timeframe queries
CREATE INDEX IF NOT EXISTS idx_tailor_profiles_delivery ON tailor_profiles(min_delivery_days, max_delivery_days);

-- Add comments for documentation
COMMENT ON COLUMN tailor_profiles.occasions IS 'Array of supported occasions (Wedding, Funeral, Church Service, etc.)';
COMMENT ON COLUMN tailor_profiles.style_categories IS 'Array of style categories: traditional, contemporary, fusion';
COMMENT ON COLUMN tailor_profiles.fabric_specialties IS 'Array of fabric specialties (Kente, Ankara, Cotton, Silk, etc.)';
COMMENT ON COLUMN tailor_profiles.color_specialties IS 'Array of color expertise';
COMMENT ON COLUMN tailor_profiles.size_ranges IS 'Array of supported size ranges: petite, regular, plus-size, children, tall';
COMMENT ON COLUMN tailor_profiles.languages_spoken IS 'Array of language codes: EN, TWI, GA, EWE, HAUSA, etc.';
COMMENT ON COLUMN tailor_profiles.min_delivery_days IS 'Minimum delivery timeframe in days';
COMMENT ON COLUMN tailor_profiles.max_delivery_days IS 'Maximum delivery timeframe in days';

-- ==============================================
-- SAVED SEARCHES TABLE
-- ==============================================

-- Alert frequency enum
-- Drop and recreate type if it exists to handle idempotent migrations
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'alert_frequency') THEN
        CREATE TYPE alert_frequency AS ENUM ('daily', 'weekly', 'instant');
    END IF;
END $$;

-- Saved searches table for search alerts
CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  filters JSONB NOT NULL,
  alert_enabled BOOLEAN DEFAULT true,
  alert_frequency alert_frequency DEFAULT 'weekly',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_notified_at TIMESTAMPTZ,
  CONSTRAINT unique_customer_search_name UNIQUE(customer_id, name)
);

-- Indexes for saved_searches
CREATE INDEX IF NOT EXISTS idx_saved_searches_customer ON saved_searches(customer_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_alert ON saved_searches(alert_enabled, alert_frequency);
CREATE INDEX IF NOT EXISTS idx_saved_searches_created ON saved_searches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_notified ON saved_searches(last_notified_at);

-- Add comments for documentation
COMMENT ON TABLE saved_searches IS 'User saved searches with optional alert notifications';
COMMENT ON COLUMN saved_searches.name IS 'User-assigned name for the saved search';
COMMENT ON COLUMN saved_searches.filters IS 'JSON object containing all search filter criteria';
COMMENT ON COLUMN saved_searches.alert_enabled IS 'Whether to send notifications for new matches';
COMMENT ON COLUMN saved_searches.alert_frequency IS 'How often to check for new matches: daily, weekly, or instant (every 15 min)';
COMMENT ON COLUMN saved_searches.last_notified_at IS 'Timestamp of last notification sent to prevent duplicates';

-- ==============================================
-- SEARCH ALERT EXECUTION LOG
-- ==============================================

-- Table to track alert check executions
CREATE TABLE IF NOT EXISTS alert_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  frequency alert_frequency NOT NULL,
  searches_checked INTEGER NOT NULL DEFAULT 0,
  notifications_sent INTEGER NOT NULL DEFAULT 0,
  errors_encountered INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_details TEXT
);

CREATE INDEX IF NOT EXISTS idx_alert_execution_frequency ON alert_execution_log(frequency);
CREATE INDEX IF NOT EXISTS idx_alert_execution_started ON alert_execution_log(started_at DESC);

COMMENT ON TABLE alert_execution_log IS 'Audit log for search alert background job executions';

-- ==============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================

-- Enable RLS on saved_searches
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Saved searches policies
CREATE POLICY "Users can view their own saved searches"
  ON saved_searches FOR SELECT
  USING (auth.uid() = customer_id);

CREATE POLICY "Users can create their own saved searches"
  ON saved_searches FOR INSERT
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can update their own saved searches"
  ON saved_searches FOR UPDATE
  USING (auth.uid() = customer_id);

CREATE POLICY "Users can delete their own saved searches"
  ON saved_searches FOR DELETE
  USING (auth.uid() = customer_id);

-- Alert execution log - admin only (no public access)
ALTER TABLE alert_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view alert execution log"
  ON alert_execution_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ==============================================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ==============================================

-- Update saved_searches updated_at timestamp
CREATE OR REPLACE FUNCTION update_saved_search_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_search_updated
  BEFORE UPDATE ON saved_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_search_timestamp();

-- ==============================================
-- DATABASE FUNCTIONS FOR SEARCH ALERTS
-- ==============================================

-- Function to check for new tailors matching a saved search
CREATE OR REPLACE FUNCTION check_saved_search_matches(
  p_saved_search_id UUID,
  p_since TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  tailor_id UUID,
  business_name VARCHAR,
  matched_at TIMESTAMPTZ
) AS $$
DECLARE
  v_filters JSONB;
  v_last_check TIMESTAMPTZ;
  v_query TEXT;
BEGIN
  -- Get the saved search filters and last notification time
  SELECT filters, COALESCE(p_since, last_notified_at, created_at)
  INTO v_filters, v_last_check
  FROM saved_searches
  WHERE id = p_saved_search_id;

  -- Return tailors that match the filters and were created/updated since last check
  RETURN QUERY
  SELECT
    tp.id,
    tp.business_name,
    GREATEST(tp.created_at, tp.updated_at) as matched_at
  FROM tailor_profiles tp
  WHERE
    -- Only include recently added/updated tailors
    GREATEST(tp.created_at, tp.updated_at) > v_last_check
    -- Apply filter criteria
    AND (
      v_filters->>'occasions' IS NULL
      OR tp.occasions && ARRAY(SELECT jsonb_array_elements_text(v_filters->'occasions'))::TEXT[]
    )
    AND (
      v_filters->>'styleCategories' IS NULL
      OR tp.style_categories && ARRAY(SELECT jsonb_array_elements_text(v_filters->'styleCategories'))::TEXT[]
    )
    AND (
      v_filters->>'fabricPreferences' IS NULL
      OR tp.fabric_specialties && ARRAY(SELECT jsonb_array_elements_text(v_filters->'fabricPreferences'))::TEXT[]
    )
    AND (
      v_filters->>'colorPreferences' IS NULL
      OR tp.color_specialties && ARRAY(SELECT jsonb_array_elements_text(v_filters->'colorPreferences'))::TEXT[]
    )
    AND (
      v_filters->>'sizeRanges' IS NULL
      OR tp.size_ranges && ARRAY(SELECT jsonb_array_elements_text(v_filters->'sizeRanges'))::TEXT[]
    )
    AND (
      v_filters->>'languages' IS NULL
      OR tp.languages_spoken && ARRAY(SELECT jsonb_array_elements_text(v_filters->'languages'))::TEXT[]
    )
    AND (
      v_filters->>'deliveryTimeframeMin' IS NULL
      OR tp.min_delivery_days >= (v_filters->>'deliveryTimeframeMin')::INTEGER
    )
    AND (
      v_filters->>'deliveryTimeframeMax' IS NULL
      OR tp.max_delivery_days <= (v_filters->>'deliveryTimeframeMax')::INTEGER
    )
  ORDER BY matched_at DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_saved_search_matches IS 'Checks for new tailors matching a saved search criteria since last notification';

-- Function to process instant alerts (called by pg_cron every 15 minutes)
CREATE OR REPLACE FUNCTION check_instant_search_alerts()
RETURNS INTEGER AS $$
DECLARE
  v_execution_id UUID;
  v_searches_checked INTEGER := 0;
  v_notifications_sent INTEGER := 0;
  v_errors INTEGER := 0;
  v_start_time TIMESTAMPTZ := NOW();
  v_search RECORD;
  v_match_count INTEGER;
  v_error_details TEXT := NULL;
BEGIN
  -- Create execution log entry
  INSERT INTO alert_execution_log (frequency, started_at)
  VALUES ('instant', v_start_time)
  RETURNING id INTO v_execution_id;

  -- Process all instant alert saved searches
  FOR v_search IN
    SELECT * FROM saved_searches
    WHERE alert_enabled = true
    AND alert_frequency = 'instant'
    AND (last_notified_at IS NULL OR last_notified_at < NOW() - INTERVAL '15 minutes')
  LOOP
    BEGIN
      v_searches_checked := v_searches_checked + 1;

      -- Count new matches
      SELECT COUNT(*) INTO v_match_count
      FROM check_saved_search_matches(v_search.id);

      -- If there are matches, notification will be sent by application layer
      IF v_match_count > 0 THEN
        v_notifications_sent := v_notifications_sent + 1;

        -- Update last_notified_at
        UPDATE saved_searches
        SET last_notified_at = NOW()
        WHERE id = v_search.id;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      -- Log error but continue processing
      RAISE NOTICE 'Error processing search %: %', v_search.id, SQLERRM;
      v_error_details := COALESCE(v_error_details || E'\n', '') ||
                        'Search ' || v_search.id::TEXT || ': ' || SQLERRM;
    END;
  END LOOP;

  -- Update execution log
  UPDATE alert_execution_log
  SET
    searches_checked = v_searches_checked,
    notifications_sent = v_notifications_sent,
    errors_encountered = v_errors,
    execution_time_ms = EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000,
    completed_at = NOW(),
    error_details = v_error_details
  WHERE id = v_execution_id;

  RETURN v_notifications_sent;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_instant_search_alerts IS 'Processes instant frequency saved search alerts - called every 15 minutes by pg_cron';

-- Function to process daily alerts (called by pg_cron daily at 8 AM)
CREATE OR REPLACE FUNCTION check_daily_search_alerts()
RETURNS INTEGER AS $$
DECLARE
  v_execution_id UUID;
  v_searches_checked INTEGER := 0;
  v_notifications_sent INTEGER := 0;
  v_errors INTEGER := 0;
  v_start_time TIMESTAMPTZ := NOW();
  v_search RECORD;
  v_match_count INTEGER;
  v_error_details TEXT := NULL;
BEGIN
  -- Create execution log entry
  INSERT INTO alert_execution_log (frequency, started_at)
  VALUES ('daily', v_start_time)
  RETURNING id INTO v_execution_id;

  -- Process all daily alert saved searches
  FOR v_search IN
    SELECT * FROM saved_searches
    WHERE alert_enabled = true
    AND alert_frequency = 'daily'
    AND (last_notified_at IS NULL OR last_notified_at < NOW() - INTERVAL '24 hours')
  LOOP
    BEGIN
      v_searches_checked := v_searches_checked + 1;

      -- Count new matches
      SELECT COUNT(*) INTO v_match_count
      FROM check_saved_search_matches(v_search.id);

      -- If there are matches, notification will be sent by application layer
      IF v_match_count > 0 THEN
        v_notifications_sent := v_notifications_sent + 1;

        -- Update last_notified_at
        UPDATE saved_searches
        SET last_notified_at = NOW()
        WHERE id = v_search.id;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      -- Log error but continue processing
      RAISE NOTICE 'Error processing search %: %', v_search.id, SQLERRM;
      v_error_details := COALESCE(v_error_details || E'\n', '') ||
                        'Search ' || v_search.id::TEXT || ': ' || SQLERRM;
    END;
  END LOOP;

  -- Update execution log
  UPDATE alert_execution_log
  SET
    searches_checked = v_searches_checked,
    notifications_sent = v_notifications_sent,
    errors_encountered = v_errors,
    execution_time_ms = EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000,
    completed_at = NOW(),
    error_details = v_error_details
  WHERE id = v_execution_id;

  RETURN v_notifications_sent;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_daily_search_alerts IS 'Processes daily frequency saved search alerts - called at 8 AM Ghana time by pg_cron';

-- Function to process weekly alerts (called by pg_cron Mondays at 8 AM)
CREATE OR REPLACE FUNCTION check_weekly_search_alerts()
RETURNS INTEGER AS $$
DECLARE
  v_execution_id UUID;
  v_searches_checked INTEGER := 0;
  v_notifications_sent INTEGER := 0;
  v_errors INTEGER := 0;
  v_start_time TIMESTAMPTZ := NOW();
  v_search RECORD;
  v_match_count INTEGER;
  v_error_details TEXT := NULL;
BEGIN
  -- Create execution log entry
  INSERT INTO alert_execution_log (frequency, started_at)
  VALUES ('weekly', v_start_time)
  RETURNING id INTO v_execution_id;

  -- Process all weekly alert saved searches
  FOR v_search IN
    SELECT * FROM saved_searches
    WHERE alert_enabled = true
    AND alert_frequency = 'weekly'
    AND (last_notified_at IS NULL OR last_notified_at < NOW() - INTERVAL '7 days')
  LOOP
    BEGIN
      v_searches_checked := v_searches_checked + 1;

      -- Count new matches
      SELECT COUNT(*) INTO v_match_count
      FROM check_saved_search_matches(v_search.id);

      -- If there are matches, notification will be sent by application layer
      IF v_match_count > 0 THEN
        v_notifications_sent := v_notifications_sent + 1;

        -- Update last_notified_at
        UPDATE saved_searches
        SET last_notified_at = NOW()
        WHERE id = v_search.id;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
      -- Log error but continue processing
      RAISE NOTICE 'Error processing search %: %', v_search.id, SQLERRM;
      v_error_details := COALESCE(v_error_details || E'\n', '') ||
                        'Search ' || v_search.id::TEXT || ': ' || SQLERRM;
    END;
  END LOOP;

  -- Update execution log
  UPDATE alert_execution_log
  SET
    searches_checked = v_searches_checked,
    notifications_sent = v_notifications_sent,
    errors_encountered = v_errors,
    execution_time_ms = EXTRACT(EPOCH FROM (NOW() - v_start_time)) * 1000,
    completed_at = NOW(),
    error_details = v_error_details
  WHERE id = v_execution_id;

  RETURN v_notifications_sent;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_weekly_search_alerts IS 'Processes weekly frequency saved search alerts - called Mondays at 8 AM Ghana time by pg_cron';
