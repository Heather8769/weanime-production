-- WeAnime Error Logging System Database Setup
-- Run this migration in your Supabase SQL Editor

-- =============================================================================
-- ERROR LOGS TABLE
-- =============================================================================

-- Create error_logs table for comprehensive error tracking
CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('error', 'warn', 'info', 'debug')),
    message TEXT NOT NULL,
    stack TEXT,
    context JSONB NOT NULL DEFAULT '{}',
    performance JSONB,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for filtering by error level
CREATE INDEX IF NOT EXISTS idx_error_logs_level ON error_logs(level);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at DESC);

-- Index for filtering resolved/unresolved errors
CREATE INDEX IF NOT EXISTS idx_error_logs_resolved ON error_logs(resolved);

-- Index for component-based filtering (using JSONB path)
CREATE INDEX IF NOT EXISTS idx_error_logs_component ON error_logs USING GIN ((context->'component'));

-- Index for user-based filtering (using JSONB path)
CREATE INDEX IF NOT EXISTS idx_error_logs_user ON error_logs USING GIN ((context->'userId'));

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_error_logs_level_created_at ON error_logs(level, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS on error_logs table
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow system to insert error logs (no authentication required)
CREATE POLICY "Allow system error logging" ON error_logs
    FOR INSERT 
    WITH CHECK (true);

-- Policy: Allow admin users to view all error logs
CREATE POLICY "Admin can view all error logs" ON error_logs
    FOR SELECT 
    USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'email' IN (
            'admin@kokai-anime.com',
            'support@kokai-anime.com'
        )
    );

-- Policy: Allow admin users to update error logs (mark as resolved)
CREATE POLICY "Admin can update error logs" ON error_logs
    FOR UPDATE 
    USING (
        auth.jwt() ->> 'role' = 'admin' OR
        auth.jwt() ->> 'email' IN (
            'admin@kokai-anime.com',
            'support@kokai-anime.com'
        )
    );

-- =============================================================================
-- FUNCTIONS FOR ERROR LOG MANAGEMENT
-- =============================================================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_error_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row updates
CREATE TRIGGER trigger_update_error_logs_updated_at
    BEFORE UPDATE ON error_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_error_logs_updated_at();

-- Function to get error statistics
CREATE OR REPLACE FUNCTION get_error_stats(
    time_range_hours INTEGER DEFAULT 24
)
RETURNS TABLE (
    total_errors BIGINT,
    error_count BIGINT,
    warn_count BIGINT,
    info_count BIGINT,
    debug_count BIGINT,
    unresolved_errors BIGINT,
    top_components JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE level = 'error') as errors,
            COUNT(*) FILTER (WHERE level = 'warn') as warnings,
            COUNT(*) FILTER (WHERE level = 'info') as infos,
            COUNT(*) FILTER (WHERE level = 'debug') as debugs,
            COUNT(*) FILTER (WHERE level = 'error' AND resolved = false) as unresolved
        FROM error_logs 
        WHERE created_at >= NOW() - INTERVAL '1 hour' * time_range_hours
    ),
    components AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'component', context->>'component',
                'count', count
            ) ORDER BY count DESC
        ) as top_comps
        FROM (
            SELECT 
                context->>'component' as component,
                COUNT(*) as count
            FROM error_logs 
            WHERE created_at >= NOW() - INTERVAL '1 hour' * time_range_hours
                AND context->>'component' IS NOT NULL
            GROUP BY context->>'component'
            ORDER BY COUNT(*) DESC
            LIMIT 10
        ) t
    )
    SELECT 
        stats.total,
        stats.errors,
        stats.warnings,
        stats.infos,
        stats.debugs,
        stats.unresolved,
        COALESCE(components.top_comps, '[]'::jsonb)
    FROM stats, components;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old error logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM error_logs 
    WHERE created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- SAMPLE DATA (OPTIONAL - FOR TESTING)
-- =============================================================================

-- Insert sample error log for testing (remove in production)
INSERT INTO error_logs (
    id,
    level,
    message,
    context,
    tags
) VALUES (
    'test_error_' || extract(epoch from now()),
    'info',
    'Error logging system initialized successfully',
    jsonb_build_object(
        'component', 'Database',
        'action', 'initialization',
        'metadata', jsonb_build_object('version', '1.0.0')
    ),
    ARRAY['system', 'initialization']
) ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- SCHEDULED CLEANUP (OPTIONAL)
-- =============================================================================

-- Create a scheduled job to clean up old logs (requires pg_cron extension)
-- Uncomment the following lines if you have pg_cron enabled:

-- SELECT cron.schedule(
--     'cleanup-error-logs',
--     '0 2 * * *', -- Run daily at 2 AM
--     'SELECT cleanup_old_error_logs();'
-- );

-- =============================================================================
-- GRANTS AND PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT ON error_logs TO authenticated;
GRANT INSERT ON error_logs TO anon, authenticated;

-- Grant admin permissions (adjust role name as needed)
-- GRANT ALL ON error_logs TO admin_role;

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
WHERE table_name = 'error_logs'
ORDER BY ordinal_position;

-- Verify indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'error_logs';

-- Test error statistics function
SELECT * FROM get_error_stats(24);

-- =============================================================================
-- NOTES
-- =============================================================================

/*
1. This migration creates a comprehensive error logging system
2. RLS policies ensure only authorized users can view error logs
3. Indexes optimize common query patterns
4. Functions provide useful analytics and maintenance capabilities
5. The cleanup function helps manage storage by removing old logs

To apply this migration:
1. Copy this SQL to your Supabase SQL Editor
2. Run the migration
3. Verify the table and functions were created successfully
4. Update your application's environment variables with Supabase credentials

For production use:
- Remove the sample data insertion
- Adjust RLS policies based on your authentication system
- Consider enabling pg_cron for automatic cleanup
- Monitor table size and adjust retention period as needed
*/
