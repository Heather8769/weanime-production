-- WeAnime Production Database Setup
-- Complete schema for all enhanced features
-- Run this script in your Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  is_premium BOOLEAN DEFAULT FALSE,
  premium_until TIMESTAMPTZ,
  total_watch_time INTEGER DEFAULT 0,
  favorite_genres TEXT[],
  language_preference TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  notification_settings JSONB DEFAULT '{"email": true, "push": true, "discord": false}',
  privacy_settings JSONB DEFAULT '{"profile_public": true, "watchlist_public": false}',
  created_ip INET,
  last_login_ip INET,
  login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anime metadata table
CREATE TABLE IF NOT EXISTS anime_metadata (
  id SERIAL PRIMARY KEY,
  mal_id INTEGER UNIQUE,
  anilist_id INTEGER UNIQUE,
  title_english TEXT,
  title_romaji TEXT,
  title_native TEXT,
  description TEXT,
  episodes INTEGER,
  status TEXT CHECK (status IN ('FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS')),
  start_date DATE,
  end_date DATE,
  season TEXT,
  season_year INTEGER,
  genres TEXT[],
  studios TEXT[],
  average_score DECIMAL(4,2),
  popularity INTEGER,
  cover_image_url TEXT,
  banner_image_url TEXT,
  trailer_url TEXT,
  source TEXT,
  duration INTEGER,
  is_adult BOOLEAN DEFAULT FALSE,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Episodes table
CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anime_id INTEGER NOT NULL REFERENCES anime_metadata(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title_english TEXT,
  title_romaji TEXT,
  title_native TEXT,
  description TEXT,
  air_date DATE,
  duration INTEGER,
  thumbnail_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(anime_id, episode_number)
);

-- Comments table with moderation
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id INTEGER NOT NULL REFERENCES anime_metadata(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 10),
  spoiler BOOLEAN DEFAULT FALSE,
  likes INTEGER DEFAULT 0,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  auto_response_sent BOOLEAN DEFAULT FALSE,
  auto_response_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id INTEGER NOT NULL REFERENCES anime_metadata(id) ON DELETE CASCADE,
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 10),
  story_rating INTEGER CHECK (story_rating BETWEEN 1 AND 10),
  animation_rating INTEGER CHECK (animation_rating BETWEEN 1 AND 10),
  sound_rating INTEGER CHECK (sound_rating BETWEEN 1 AND 10),
  character_rating INTEGER CHECK (character_rating BETWEEN 1 AND 10),
  enjoyment_rating INTEGER CHECK (enjoyment_rating BETWEEN 1 AND 10),
  review_text TEXT,
  contains_spoilers BOOLEAN DEFAULT FALSE,
  helpful_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  moderation_status TEXT DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

-- Watchlist table
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id INTEGER NOT NULL REFERENCES anime_metadata(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'plan_to_watch' CHECK (status IN ('watching', 'completed', 'dropped', 'plan_to_watch', 'on_hold')),
  progress INTEGER DEFAULT 0,
  rating INTEGER CHECK (rating BETWEEN 1 AND 10),
  start_date DATE,
  finish_date DATE,
  notes TEXT,
  favorite BOOLEAN DEFAULT FALSE,
  rewatching BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

-- Watch progress table
CREATE TABLE IF NOT EXISTS watch_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id INTEGER NOT NULL REFERENCES anime_metadata(id) ON DELETE CASCADE,
  episode_id UUID NOT NULL REFERENCES episodes(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  progress_seconds INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_watched TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, episode_id)
);

-- Feedback table with enhanced fields
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'general', 'performance')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  user_email TEXT,
  metadata JSONB,
  votes_up INTEGER DEFAULT 0,
  votes_down INTEGER DEFAULT 0,
  auto_response_sent BOOLEAN DEFAULT FALSE,
  auto_response_text TEXT,
  response_time_hours DECIMAL(10,2),
  response_time_calculated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security audit logs table
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Moderation actions table
CREATE TABLE IF NOT EXISTS moderation_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL,
  moderator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'edited', 'flagged', 'auto-moderated')),
  reason TEXT,
  original_content TEXT,
  moderated_content TEXT,
  is_automated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Error logs table
CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_agent TEXT,
  url TEXT,
  severity TEXT DEFAULT 'error' CHECK (severity IN ('info', 'warn', 'error', 'critical')),
  context JSONB,
  resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video performance logs table
CREATE TABLE IF NOT EXISTS video_performance_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anime_id INTEGER REFERENCES anime_metadata(id) ON DELETE SET NULL,
  episode_number INTEGER,
  event_type TEXT NOT NULL CHECK (event_type IN ('start', 'buffer', 'error', 'quality_change', 'seek', 'pause', 'resume', 'complete')),
  load_time DECIMAL(10,3),
  buffer_duration DECIMAL(10,3),
  video_quality TEXT,
  connection_speed DECIMAL(10,2),
  error_message TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User analytics table
CREATE TABLE IF NOT EXISTS user_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL,
  event_data JSONB,
  page_url TEXT,
  referrer TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Anime update stats table
CREATE TABLE IF NOT EXISTS anime_update_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_checked INTEGER DEFAULT 0,
  new_anime INTEGER DEFAULT 0,
  new_episodes INTEGER DEFAULT 0,
  metadata_updates INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feedback alerts table
CREATE TABLE IF NOT EXISTS feedback_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('critical_bug', 'high_volume', 'negative_sentiment', 'escalation_needed')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  feedback_ids UUID[],
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(15,6) NOT NULL,
  metric_unit TEXT,
  tags JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_anime_metadata_mal_id ON anime_metadata(mal_id);
CREATE INDEX IF NOT EXISTS idx_anime_metadata_anilist_id ON anime_metadata(anilist_id);
CREATE INDEX IF NOT EXISTS idx_anime_metadata_status ON anime_metadata(status);
CREATE INDEX IF NOT EXISTS idx_anime_metadata_genres ON anime_metadata USING GIN(genres);

CREATE INDEX IF NOT EXISTS idx_episodes_anime_id ON episodes(anime_id);
CREATE INDEX IF NOT EXISTS idx_episodes_episode_number ON episodes(episode_number);
CREATE INDEX IF NOT EXISTS idx_episodes_air_date ON episodes(air_date);

CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_anime_id ON comments(anime_id);
CREATE INDEX IF NOT EXISTS idx_comments_moderation_status ON comments(moderation_status);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_anime_id ON reviews(anime_id);
CREATE INDEX IF NOT EXISTS idx_reviews_overall_rating ON reviews(overall_rating);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_anime_id ON watchlist(anime_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_status ON watchlist(status);

CREATE INDEX IF NOT EXISTS idx_watch_progress_user_id ON watch_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_anime_id ON watch_progress(anime_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_last_watched ON watch_progress(last_watched);

CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_priority ON feedback(priority);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_action ON security_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON security_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_ip_address ON security_audit_logs(ip_address);

CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_video_performance_logs_anime_id ON video_performance_logs(anime_id);
CREATE INDEX IF NOT EXISTS idx_video_performance_logs_event_type ON video_performance_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_video_performance_logs_created_at ON video_performance_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_event_type ON user_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_user_analytics_created_at ON user_analytics(created_at);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_comments_anime_status ON comments(anime_id, moderation_status);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_status ON watchlist(user_id, status);
CREATE INDEX IF NOT EXISTS idx_feedback_type_priority ON feedback(type, priority);
CREATE INDEX IF NOT EXISTS idx_error_logs_type_severity ON error_logs(error_type, severity);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_performance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;

-- User profiles policies
CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Comments policies
CREATE POLICY "Users can view approved comments" ON comments
  FOR SELECT USING (moderation_status = 'approved');

CREATE POLICY "Users can insert their own comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING (auth.uid() = user_id);

-- Reviews policies
CREATE POLICY "Users can view approved reviews" ON reviews
  FOR SELECT USING (moderation_status = 'approved');

CREATE POLICY "Users can insert their own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

-- Watchlist policies
CREATE POLICY "Users can manage their own watchlist" ON watchlist
  FOR ALL USING (auth.uid() = user_id);

-- Watch progress policies
CREATE POLICY "Users can manage their own watch progress" ON watch_progress
  FOR ALL USING (auth.uid() = user_id);

-- Feedback policies
CREATE POLICY "Users can view all feedback" ON feedback
  FOR SELECT USING (true);

CREATE POLICY "Users can insert feedback" ON feedback
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own feedback" ON feedback
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

-- Admin-only policies for sensitive tables
CREATE POLICY "Only admins can view security logs" ON security_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (display_name ILIKE '%admin%' OR email ILIKE '%admin%')
    )
  );

CREATE POLICY "Only admins can view moderation actions" ON moderation_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (display_name ILIKE '%admin%' OR email ILIKE '%admin%')
    )
  );

-- Error logs - users can view their own, admins can view all
CREATE POLICY "Users can view their own error logs" ON error_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all error logs" ON error_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND (display_name ILIKE '%admin%' OR email ILIKE '%admin%')
    )
  );

-- Video performance logs - users can view their own
CREATE POLICY "Users can view their own video logs" ON video_performance_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own video logs" ON video_performance_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User analytics - users can view their own
CREATE POLICY "Users can view their own analytics" ON user_analytics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics" ON user_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anime_metadata_updated_at BEFORE UPDATE ON anime_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON episodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watchlist_updated_at BEFORE UPDATE ON watchlist
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watch_progress_updated_at BEFORE UPDATE ON watch_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at BEFORE UPDATE ON feedback
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for trending anime
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_anime AS
SELECT
    am.id,
    am.title_english,
    am.title_romaji,
    am.cover_image_url,
    am.average_score,
    COUNT(DISTINCT w.user_id) as watchlist_count,
    COUNT(DISTINCT c.user_id) as comment_count,
    COUNT(DISTINCT r.user_id) as review_count,
    AVG(r.overall_rating) as user_rating,
    (
        COUNT(DISTINCT w.user_id) * 0.4 +
        COUNT(DISTINCT c.user_id) * 0.3 +
        COUNT(DISTINCT r.user_id) * 0.3
    ) as trending_score
FROM anime_metadata am
LEFT JOIN watchlist w ON am.id = w.anime_id AND w.created_at > NOW() - INTERVAL '7 days'
LEFT JOIN comments c ON am.id = c.anime_id AND c.created_at > NOW() - INTERVAL '7 days'
LEFT JOIN reviews r ON am.id = r.anime_id AND r.created_at > NOW() - INTERVAL '7 days'
WHERE am.status IN ('RELEASING', 'FINISHED')
GROUP BY am.id, am.title_english, am.title_romaji, am.cover_image_url, am.average_score
HAVING COUNT(DISTINCT w.user_id) > 0 OR COUNT(DISTINCT c.user_id) > 0 OR COUNT(DISTINCT r.user_id) > 0
ORDER BY trending_score DESC
LIMIT 50;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_anime_id ON trending_anime(id);

-- Create function to refresh trending anime view
CREATE OR REPLACE FUNCTION refresh_trending_anime()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY trending_anime;
END;
$$ LANGUAGE plpgsql;

-- Insert sample admin user profile (optional - for testing)
-- Note: This will only work if you have a user with this ID in auth.users
-- INSERT INTO user_profiles (id, email, display_name)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'admin@weanime.com', 'Admin User')
-- ON CONFLICT (id) DO NOTHING;

-- Create database comments for documentation
COMMENT ON TABLE anime_metadata IS 'Comprehensive anime metadata from multiple sources (AniList, MAL)';
COMMENT ON TABLE episodes IS 'Individual episode information and video data';
COMMENT ON TABLE comments IS 'User comments on anime with moderation support';
COMMENT ON TABLE reviews IS 'Detailed user reviews and ratings for anime';
COMMENT ON TABLE watchlist IS 'User watchlists with status tracking';
COMMENT ON TABLE watch_progress IS 'Episode watch progress tracking';
COMMENT ON TABLE feedback IS 'User feedback and bug reports with monitoring';
COMMENT ON TABLE security_audit_logs IS 'Security event logging and monitoring';
COMMENT ON TABLE moderation_actions IS 'Content moderation action history';
COMMENT ON TABLE error_logs IS 'Application error tracking and monitoring';
COMMENT ON TABLE video_performance_logs IS 'Video playback performance metrics';
COMMENT ON TABLE user_analytics IS 'User behavior analytics and tracking';
COMMENT ON MATERIALIZED VIEW trending_anime IS 'Trending anime based on recent user activity';

-- Database setup complete!
-- Remember to:
-- 1. Set up your environment variables (SUPABASE_URL, SUPABASE_ANON_KEY, etc.)
-- 2. Configure authentication providers in Supabase dashboard
-- 3. Set up storage buckets for images/videos if needed
-- 4. Schedule the refresh_trending_anime() function to run periodically
-- 5. Configure backup and monitoring in Supabase dashboard
