-- Migration: Tailor Search System and Favorites
-- Story: 3.2 - Tailor Discovery and Search
-- Date: 2024-08-27

-- Create customer_favorites table
CREATE TABLE IF NOT EXISTS customer_favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tailor_id UUID NOT NULL REFERENCES tailor_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_customer_favorite UNIQUE(customer_id, tailor_id)
);

-- Create indexes for customer_favorites
CREATE INDEX IF NOT EXISTS idx_customer_favorites_customer ON customer_favorites(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_tailor ON customer_favorites(tailor_id);
CREATE INDEX IF NOT EXISTS idx_customer_favorites_created_at ON customer_favorites(created_at);

-- Add search optimization indexes to tailor_profiles
-- Note: Full-text search will use function-based search rather than index on expression
-- because to_tsvector is not immutable due to configuration dependency

-- Composite indexes for common search patterns
CREATE INDEX IF NOT EXISTS idx_tailor_profiles_city_rating ON tailor_profiles(city, rating DESC)
WHERE verification_status = 'VERIFIED';

CREATE INDEX IF NOT EXISTS idx_tailor_profiles_verified_rating ON tailor_profiles(verification_status, rating DESC)
WHERE verification_status = 'VERIFIED';

CREATE INDEX IF NOT EXISTS idx_tailor_profiles_location_verified ON tailor_profiles(city, region, verification_status)
WHERE verification_status = 'VERIFIED';

-- Index for response time sorting
CREATE INDEX IF NOT EXISTS idx_tailor_profiles_response_time ON tailor_profiles(response_time_hours ASC)
WHERE verification_status = 'VERIFIED' AND response_time_hours IS NOT NULL;

-- Index for completion rate and activity
CREATE INDEX IF NOT EXISTS idx_tailor_profiles_activity ON tailor_profiles(completion_rate DESC, updated_at DESC)
WHERE verification_status = 'VERIFIED';

-- Spatial index for location-based searches (if using PostGIS in future)
-- CREATE INDEX IF NOT EXISTS idx_tailor_profiles_location_gis ON tailor_profiles USING GIST(location)
-- WHERE verification_status = 'VERIFIED' AND location IS NOT NULL;

-- Create search analytics table for tracking search performance
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id TEXT NOT NULL,
    query TEXT,
    filters JSONB,
    results_count INTEGER NOT NULL DEFAULT 0,
    search_time_ms INTEGER NOT NULL DEFAULT 0,
    clicked_results TEXT[], -- Array of tailor IDs that were clicked
    converted_results TEXT[], -- Array of tailor IDs that led to orders
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_created_at ON search_analytics(created_at);
-- Note: Full-text search index on query not possible due to immutability constraints

-- Create featured_tailors table for admin-curated featured tailors
CREATE TABLE IF NOT EXISTS featured_tailors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tailor_id UUID NOT NULL REFERENCES tailor_profiles(id) ON DELETE CASCADE,
    featured_reason TEXT NOT NULL CHECK (featured_reason IN ('HIGH_RATING', 'FAST_RESPONSE', 'NEW_TALENT', 'POPULAR', 'ADMIN_PICK')),
    promotional_badge TEXT,
    featured_until TIMESTAMPTZ,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_featured_tailor UNIQUE(tailor_id)
);

-- Indexes for featured tailors
CREATE INDEX IF NOT EXISTS idx_featured_tailors_active ON featured_tailors(is_active, sort_order)
WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_featured_tailors_until ON featured_tailors(featured_until)
WHERE featured_until IS NOT NULL;

-- Add RLS policies for customer_favorites
ALTER TABLE customer_favorites ENABLE ROW LEVEL SECURITY;

-- Customers can manage their own favorites
CREATE POLICY "Customers can manage own favorites" ON customer_favorites
    FOR ALL USING (auth.uid() = customer_id);

-- Everyone can read favorites (for public favorite counts, etc.)
CREATE POLICY "Anyone can read favorites" ON customer_favorites
    FOR SELECT USING (TRUE);

-- Add RLS policies for search_analytics
ALTER TABLE search_analytics ENABLE ROW LEVEL SECURITY;

-- Users can read their own analytics
CREATE POLICY "Users can read own search analytics" ON search_analytics
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() IS NULL);

-- Service role can insert analytics
CREATE POLICY "Service can insert search analytics" ON search_analytics
    FOR INSERT WITH CHECK (TRUE);

-- Add RLS policies for featured_tailors
ALTER TABLE featured_tailors ENABLE ROW LEVEL SECURITY;

-- Everyone can read active featured tailors
CREATE POLICY "Anyone can read active featured tailors" ON featured_tailors
    FOR SELECT USING (is_active = TRUE);

-- Only admins can manage featured tailors
CREATE POLICY "Admins can manage featured tailors" ON featured_tailors
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id = auth.uid() 
            AND role = 'ADMIN'
        )
    );

-- Create function to update featured_tailors.updated_at
CREATE OR REPLACE FUNCTION update_featured_tailors_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for featured_tailors updated_at
CREATE TRIGGER trigger_featured_tailors_updated_at
    BEFORE UPDATE ON featured_tailors
    FOR EACH ROW
    EXECUTE FUNCTION update_featured_tailors_updated_at();

-- Create function to calculate tailor search score
CREATE OR REPLACE FUNCTION calculate_search_score(
    p_tailor_id UUID,
    p_query TEXT DEFAULT NULL,
    p_user_location_lat DOUBLE PRECISION DEFAULT NULL,
    p_user_location_lng DOUBLE PRECISION DEFAULT NULL
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    v_score DOUBLE PRECISION := 0;
    v_rating_score DOUBLE PRECISION := 0;
    v_review_score DOUBLE PRECISION := 0;
    v_response_score DOUBLE PRECISION := 0;
    v_completion_score DOUBLE PRECISION := 0;
    v_text_score DOUBLE PRECISION := 0;
    v_distance_score DOUBLE PRECISION := 0;
    v_tailor RECORD;
BEGIN
    -- Get tailor data
    SELECT * INTO v_tailor
    FROM tailor_profiles
    WHERE id = p_tailor_id AND verification_status = 'VERIFIED';
    
    IF NOT FOUND THEN
        RETURN 0;
    END IF;
    
    -- Rating score (0-40 points, weighted by review count)
    v_rating_score := (v_tailor.rating / 5.0) * 40 * LEAST(v_tailor.total_reviews / 10.0, 1.0);
    
    -- Review count score (0-10 points)
    v_review_score := LEAST(v_tailor.total_reviews / 50.0, 1.0) * 10;
    
    -- Response time score (0-20 points, faster = better)
    IF v_tailor.response_time_hours IS NOT NULL THEN
        v_response_score := GREATEST(0, (24 - v_tailor.response_time_hours) / 24.0) * 20;
    END IF;
    
    -- Completion rate score (0-15 points)
    v_completion_score := v_tailor.completion_rate * 15;
    
    -- Text relevance score (0-10 points)
    IF p_query IS NOT NULL AND p_query != '' THEN
        SELECT ts_rank(
            to_tsvector('english', business_name || ' ' || array_to_string(specializations, ' ')),
            plainto_tsquery('english', p_query)
        ) * 10 INTO v_text_score
        FROM tailor_profiles
        WHERE id = p_tailor_id;
    END IF;
    
    -- Distance score (0-5 points, closer = better)
    IF p_user_location_lat IS NOT NULL AND p_user_location_lng IS NOT NULL 
       AND v_tailor.location IS NOT NULL THEN
        -- Simple distance calculation (in a real app, use PostGIS)
        v_distance_score := GREATEST(0, 1.0 - (
            SQRT(
                POW((v_tailor.location->>'lat')::DOUBLE PRECISION - p_user_location_lat, 2) +
                POW((v_tailor.location->>'lng')::DOUBLE PRECISION - p_user_location_lng, 2)
            ) / 10.0
        )) * 5;
    END IF;
    
    -- Calculate total score
    v_score := v_rating_score + v_review_score + v_response_score + 
               v_completion_score + v_text_score + v_distance_score;
    
    RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Create function to get search suggestions
CREATE OR REPLACE FUNCTION get_search_suggestions(
    p_query TEXT,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    suggestion TEXT,
    type TEXT,
    meta JSONB
) AS $$
BEGIN
    -- Return tailor name suggestions
    RETURN QUERY
    SELECT 
        tp.business_name as suggestion,
        'tailor'::TEXT as type,
        jsonb_build_object(
            'city', tp.city,
            'rating', tp.rating,
            'imageUrl', tp.portfolio_url
        ) as meta
    FROM tailor_profiles tp
    WHERE tp.verification_status = 'VERIFIED'
      AND tp.business_name ILIKE '%' || p_query || '%'
    ORDER BY tp.rating DESC, tp.total_reviews DESC
    LIMIT p_limit / 3;
    
    -- Return specialization suggestions
    RETURN QUERY
    SELECT DISTINCT 
        unnest(tp.specializations) as suggestion,
        'specialization'::TEXT as type,
        jsonb_build_object('count', COUNT(*)) as meta
    FROM tailor_profiles tp
    WHERE tp.verification_status = 'VERIFIED'
      AND EXISTS (
          SELECT 1 FROM unnest(tp.specializations) spec
          WHERE spec ILIKE '%' || p_query || '%'
      )
    GROUP BY unnest(tp.specializations)
    ORDER BY COUNT(*) DESC
    LIMIT p_limit / 3;
    
    -- Return location suggestions
    RETURN QUERY
    SELECT DISTINCT 
        tp.city as suggestion,
        'location'::TEXT as type,
        jsonb_build_object('count', COUNT(*)) as meta
    FROM tailor_profiles tp
    WHERE tp.verification_status = 'VERIFIED'
      AND tp.city IS NOT NULL
      AND tp.city ILIKE '%' || p_query || '%'
    GROUP BY tp.city
    ORDER BY COUNT(*) DESC
    LIMIT p_limit / 3;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE customer_favorites IS 'Stores customer favorite tailors for quick access';
COMMENT ON TABLE search_analytics IS 'Tracks search queries and performance for optimization';
COMMENT ON TABLE featured_tailors IS 'Admin-curated featured tailors for homepage and discovery';

COMMENT ON FUNCTION calculate_search_score IS 'Calculates relevance score for tailor search results';
COMMENT ON FUNCTION get_search_suggestions IS 'Returns autocomplete suggestions for search queries';