-- Add dispute analytics RPC function
-- This function provides comprehensive analytics for the admin dispute dashboard

CREATE OR REPLACE FUNCTION get_dispute_analytics(
    p_start_date DATE DEFAULT (CURRENT_DATE - INTERVAL '30 days')::DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_disputes BIGINT,
    open_disputes BIGINT,
    resolved_disputes BIGINT,
    avg_resolution_time_hours NUMERIC,
    resolution_rate NUMERIC,
    category_breakdown JSONB,
    priority_breakdown JSONB,
    sla_performance JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH dispute_stats AS (
        SELECT
            d.*,
            EXTRACT(EPOCH FROM (d.resolved_at - d.created_at)) / 3600.0 as resolution_time_hours,
            CASE
                WHEN d.resolved_at IS NOT NULL AND d.resolved_at <= d.sla_deadline THEN TRUE
                ELSE FALSE
            END as sla_met
        FROM disputes d
        WHERE d.created_at::DATE BETWEEN p_start_date AND p_end_date
    ),
    aggregated_stats AS (
        SELECT
            COUNT(*) as total_disputes,
            COUNT(*) FILTER (WHERE status IN ('OPEN', 'IN_PROGRESS')) as open_disputes,
            COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED')) as resolved_disputes,
            AVG(resolution_time_hours) FILTER (WHERE resolution_time_hours IS NOT NULL) as avg_resolution_time_hours,
            CASE
                WHEN COUNT(*) > 0 THEN
                    COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'CLOSED'))::NUMERIC / COUNT(*)::NUMERIC * 100
                ELSE 0
            END as resolution_rate,

            -- Category breakdown with proper grouping
            (
                SELECT jsonb_object_agg(category, count)
                FROM (
                    SELECT
                        COALESCE(category, 'UNKNOWN') as category,
                        COUNT(*) as count
                    FROM dispute_stats
                    GROUP BY category
                ) category_counts
            ) as category_breakdown,

            -- Priority breakdown with proper grouping
            (
                SELECT jsonb_object_agg(priority, count)
                FROM (
                    SELECT
                        COALESCE(priority, 'MEDIUM') as priority,
                        COUNT(*) as count
                    FROM dispute_stats
                    GROUP BY priority
                ) priority_counts
            ) as priority_breakdown,

            -- SLA performance
            jsonb_build_object(
                'total_with_sla', COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL),
                'sla_met_count', COUNT(*) FILTER (WHERE sla_met = TRUE),
                'sla_missed_count', COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL AND sla_met = FALSE),
                'sla_performance_rate',
                    CASE
                        WHEN COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL) > 0
                        THEN
                            ROUND(
                                COUNT(*) FILTER (WHERE sla_met = TRUE)::NUMERIC /
                                COUNT(*) FILTER (WHERE sla_deadline IS NOT NULL)::NUMERIC * 100,
                                2
                            )
                        ELSE 0
                    END
            ) as sla_performance
        FROM dispute_stats
    )
    SELECT * FROM aggregated_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (admin access will be checked in API)
GRANT EXECUTE ON FUNCTION get_dispute_analytics(DATE, DATE) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION get_dispute_analytics IS 'Returns comprehensive dispute analytics for admin dashboard including totals, resolution metrics, category/priority breakdowns, and SLA performance';
