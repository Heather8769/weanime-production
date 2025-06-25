-- WeAnime Performance Metrics Database Setup
-- Run this migration in your Supabase SQL Editor

-- =============================================================================
-- PERFORMANCE METRICS TABLE
-- =============================================================================

-- Create performance_metrics table for tracking application performance
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    value NUMERIC NOT NULL,
    timestamp BIGINT NOT NULL,
    url TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    additional_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for filtering by metric name
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(name);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

-- Index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);

-- Index for user-based filtering
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);

-- Index for URL-based filtering
CREATE INDEX IF NOT EXISTS idx_performance_metrics_url ON performance_metrics(url);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_created_at ON performance_metrics(name, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on performance_metrics table
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Allow system to insert performance metrics (no authentication required)
CREATE POLICY "Allow system performance logging" ON performance_metrics
    FOR INSERT 
    WITH CHECK (true);

-- Policy: Allow admin users to view all performance metrics
CREATE POLICY "Admin can view all performance metrics" ON performance_metrics
    FOR SELECT 
    USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'email' IN (
            'admin@kokai-anime.com',
            'support@kokai-anime.com'
        )
    );

-- Policy: Allow users to view their own performance metrics
CREATE POLICY "Users can view own performance metrics" ON performance_metrics
    FOR SELECT 
    USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS FOR PERFORMANCE METRICS MANAGEMENT
-- =============================================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_performance_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row updates
CREATE TRIGGER trigger_update_performance_metrics_updated_at
    BEFORE UPDATE ON performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_performance_metrics_updated_at();

-- Function to get performance statistics
CREATE OR REPLACE FUNCTION get_performance_stats(
    metric_name TEXT DEFAULT NULL,
    time_range_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_metrics BIGINT,
    avg_value NUMERIC,
    min_value NUMERIC,
    max_value NUMERIC,
    p50_value NUMERIC,
    p95_value NUMERIC,
    p99_value NUMERIC,
    metric_counts JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH filtered_metrics AS (
        SELECT 
            name,
            value
        FROM performance_metrics 
        WHERE created_at >= NOW() - INTERVAL '1 hour' * time_range_hours
            AND (metric_name IS NULL OR name = metric_name)
    ),
    stats AS (
        SELECT 
            COUNT(*) as total,
            AVG(value) as avg_val,
            MIN(value) as min_val,
            MAX(value) as max_val,
            PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value) as p50_val,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_val,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY value) as p99_val
        FROM filtered_metrics
    ),
    metric_counts AS (
        SELECT jsonb_object_agg(name, count) as counts
        FROM (
            SELECT 
                name,
                COUNT(*) as count
            FROM filtered_metrics
            GROUP BY name
            ORDER BY COUNT(*) DESC
        ) t
    )
    SELECT 
        stats.total,
        stats.avg_val,
        stats.min_val,
        stats.max_val,
        stats.p50_val,
        stats.p95_val,
        stats.p99_val,
        COALESCE(metric_counts.counts, '{}'::jsonb)
    FROM stats, metric_counts;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old performance metrics (keep last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_performance_metrics()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM performance_metrics 
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- GRANTS AND PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON performance_metrics TO authenticated;
GRANT INSERT ON performance_metrics TO anon, authenticated;

-- =============================================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =============================================================================

-- Insert sample performance metrics for testing (remove in production)
INSERT INTO performance_metrics (
    name,
    value,
    timestamp,
    url,
    additional_data
) VALUES 
(
    'page_load',
    1250.5,
    extract(epoch from now()) * 1000,
    '/anime/watch',
    jsonb_build_object(
        'browser', 'Chrome',
        'device', 'desktop',
        'version', '1.0.0'
    )
),
(
    'api_response',
    89.2,
    extract(epoch from now()) * 1000,
    '/api/anilist/search',
    jsonb_build_object(
        'endpoint', 'search',
        'cache_hit', false
    )
),
(
    'video_startup',
    2100.0,
    extract(epoch from now()) * 1000,
    '/anime/watch/123',
    jsonb_build_object(
        'quality', '1080p',
        'codec', 'h264'
    )
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify table creation
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'performance_metrics'
ORDER BY ordinal_position;

-- Verify indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'performance_metrics';

-- Test performance statistics function
SELECT * FROM get_performance_stats();

-- =============================================================================
-- NOTES
-- =============================================================================

/*
1. This migration creates a comprehensive performance metrics system
2. RLS policies ensure only authorized users can view performance data
3. Indexes optimize common query patterns for performance analytics
4. Functions provide useful analytics and maintenance capabilities
5. The cleanup function helps manage storage by removing old metrics

To apply this migration:
1. Copy this SQL to your Supabase SQL Editor
2. Run the migration
3. Verify the table and functions were created successfully
4. Update your application to use the performance metrics API

For production use:
- Remove the sample data insertion
- Adjust RLS policies based on your authentication system
- Consider enabling automatic cleanup scheduling
- Monitor table size and adjust retention period as needed
*/
