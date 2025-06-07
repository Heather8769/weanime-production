-- Enhanced WeAnime Database Schema with Production Optimizations
-- Migration 002: Advanced Features and Performance Optimization

-- User profiles enhancement with analytics
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  premium_until TIMESTAMP WITH TIME ZONE,
  total_watch_time INTEGER DEFAULT 0,
  favorite_genres TEXT[],
  language_preference TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  notification_settings JSONB DEFAULT '{"email": true, "push": true, "discord": false}',
  privacy_settings JSONB DEFAULT '{"profile_public": true, "watchlist_public": false}',
  created_ip INET,
  last_login_ip INET,
  login_count INTEGER DEFAULT 0;

-- Anime metadata table for comprehensive content management
CREATE TABLE IF NOT EXISTS anime_metadata (
  id SERIAL PRIMARY KEY,
  mal_id INTEGER UNIQUE,
  anilist_id INTEGER UNIQUE,
  kitsu_id INTEGER UNIQUE,
  title_english TEXT,
  title_japanese TEXT,
  title_romaji TEXT,
  synopsis TEXT,
  episodes INTEGER,
  status TEXT CHECK (status IN ('FINISHED', 'RELEASING', 'NOT_YET_RELEASED', 'CANCELLED', 'HIATUS')),
  start_date DATE,
  end_date DATE,
  season TEXT CHECK (season IN ('WINTER', 'SPRING', 'SUMMER', 'FALL')),
  season_year INTEGER,
  genres TEXT[],
  tags TEXT[],
  studios TEXT[],
  rating TEXT,
  score DECIMAL(3,2),
  popularity INTEGER,
  cover_image_url TEXT,
  banner_image_url TEXT,
  trailer_url TEXT,
  source_material TEXT,
  duration_minutes INTEGER,
  age_rating TEXT,
  content_warnings TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Episodes table for detailed episode management
CREATE TABLE IF NOT EXISTS episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anime_id INTEGER REFERENCES anime_metadata(id) ON DELETE CASCADE,
  episode_number INTEGER NOT NULL,
  title_english TEXT,
  title_japanese TEXT,
  synopsis TEXT,
  duration_seconds INTEGER,
  air_date DATE,
  thumbnail_url TEXT,
  video_url TEXT,
  subtitle_tracks JSONB DEFAULT '[]',
  audio_tracks JSONB DEFAULT '[]',
  filler BOOLEAN DEFAULT FALSE,
  recap BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(anime_id, episode_number)
);

-- Enhanced watchlist with detailed tracking
ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  favorite BOOLEAN DEFAULT FALSE,
  private BOOLEAN DEFAULT FALSE,
  notes TEXT,
  rewatch_count INTEGER DEFAULT 0,
  score_story INTEGER CHECK (score_story BETWEEN 1 AND 10),
  score_animation INTEGER CHECK (score_animation BETWEEN 1 AND 10),
  score_sound INTEGER CHECK (score_sound BETWEEN 1 AND 10),
  score_character INTEGER CHECK (score_character BETWEEN 1 AND 10),
  score_enjoyment INTEGER CHECK (score_enjoyment BETWEEN 1 AND 10);

-- Enhanced watch progress with detailed analytics
ALTER TABLE watch_progress ADD COLUMN IF NOT EXISTS
  watch_sessions INTEGER DEFAULT 1,
  total_watch_time INTEGER DEFAULT 0,
  pause_count INTEGER DEFAULT 0,
  rewind_count INTEGER DEFAULT 0,
  forward_count INTEGER DEFAULT 0,
  quality_preference TEXT DEFAULT 'auto',
  subtitle_language TEXT DEFAULT 'en',
  audio_language TEXT DEFAULT 'ja',
  playback_speed DECIMAL(3,2) DEFAULT 1.0,
  device_type TEXT,
  browser_info TEXT,
  location_country TEXT;

-- User reviews and ratings system
CREATE TABLE IF NOT EXISTS reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  anime_id INTEGER REFERENCES anime_metadata(id) ON DELETE CASCADE,
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
  status TEXT CHECK (status IN ('published', 'draft', 'hidden', 'reported')) DEFAULT 'published',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

-- Discussion forums for community engagement
CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_threads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES forum_categories(id) ON DELETE CASCADE,
  anime_id INTEGER REFERENCES anime_metadata(id) ON DELETE SET NULL,
  episode_id UUID REFERENCES episodes(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN DEFAULT FALSE,
  locked BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  reply_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reply_user_id UUID REFERENCES auth.users ON DELETE SET NULL,
  contains_spoilers BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES forum_threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  parent_post_id UUID REFERENCES forum_posts(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  helpful_votes INTEGER DEFAULT 0,
  total_votes INTEGER DEFAULT 0,
  edited_at TIMESTAMP WITH TIME ZONE,
  edited_by UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User notifications system
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('episode_release', 'review_reply', 'forum_mention', 'system_announcement', 'friend_request')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Analytics and metrics tables
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  pages_viewed INTEGER DEFAULT 0,
  videos_watched INTEGER DEFAULT 0,
  total_watch_time INTEGER DEFAULT 0,
  device_type TEXT,
  browser_info JSONB,
  ip_address INET,
  country TEXT,
  city TEXT
);

CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  page_path TEXT NOT NULL,
  anime_id INTEGER REFERENCES anime_metadata(id) ON DELETE SET NULL,
  referrer TEXT,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_anime_metadata_score ON anime_metadata(score DESC);
CREATE INDEX IF NOT EXISTS idx_anime_metadata_popularity ON anime_metadata(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_anime_metadata_season ON anime_metadata(season, season_year);
CREATE INDEX IF NOT EXISTS idx_anime_metadata_genres ON anime_metadata USING GIN(genres);
CREATE INDEX IF NOT EXISTS idx_anime_metadata_status ON anime_metadata(status);

CREATE INDEX IF NOT EXISTS idx_episodes_anime_id ON episodes(anime_id);
CREATE INDEX IF NOT EXISTS idx_episodes_air_date ON episodes(air_date);

CREATE INDEX IF NOT EXISTS idx_watchlist_user_status ON watchlist(user_id, status);
CREATE INDEX IF NOT EXISTS idx_watchlist_anime_id ON watchlist(anime_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_updated ON watchlist(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_watch_progress_user_anime ON watch_progress(user_id, anime_id);
CREATE INDEX IF NOT EXISTS idx_watch_progress_last_watched ON watch_progress(last_watched DESC);

CREATE INDEX IF NOT EXISTS idx_reviews_anime_id ON reviews(anime_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(overall_rating DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_helpful ON reviews(helpful_votes DESC);

CREATE INDEX IF NOT EXISTS idx_forum_threads_category ON forum_threads(category_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_anime ON forum_threads(anime_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_last_reply ON forum_threads(last_reply_at DESC);

CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON forum_posts(thread_id);
CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start ON user_sessions(session_start DESC);

CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_anime_id ON page_views(anime_id);
CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created_at DESC);

-- Enable Row Level Security for all new tables
ALTER TABLE anime_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for anime_metadata (public read)
CREATE POLICY "Anyone can view anime metadata" ON anime_metadata FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can modify anime metadata" ON anime_metadata FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for episodes (public read)
CREATE POLICY "Anyone can view episodes" ON episodes FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can modify episodes" ON episodes FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for reviews
CREATE POLICY "Anyone can view published reviews" ON reviews FOR SELECT USING (status = 'published');
CREATE POLICY "Users can manage their own reviews" ON reviews FOR ALL USING (auth.uid() = user_id);

-- RLS Policies for forum categories (public read)
CREATE POLICY "Anyone can view forum categories" ON forum_categories FOR SELECT USING (true);
CREATE POLICY "Only authenticated users can modify categories" ON forum_categories FOR ALL USING (auth.role() = 'authenticated');

-- RLS Policies for forum threads
CREATE POLICY "Anyone can view forum threads" ON forum_threads FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create threads" ON forum_threads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own threads" ON forum_threads FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for forum posts
CREATE POLICY "Anyone can view forum posts" ON forum_posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON forum_posts FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for user sessions
CREATE POLICY "Users can view their own sessions" ON user_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sessions" ON user_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sessions" ON user_sessions FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for page views
CREATE POLICY "Users can view their own page views" ON page_views FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own page views" ON page_views FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_anime_metadata_updated_at BEFORE UPDATE ON anime_metadata FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON episodes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_forum_threads_updated_at BEFORE UPDATE ON forum_threads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create materialized view for trending anime
CREATE MATERIALIZED VIEW IF NOT EXISTS trending_anime AS
SELECT 
  am.id,
  am.title_english,
  am.cover_image_url,
  am.score,
  am.popularity,
  COUNT(DISTINCT wp.user_id) as active_watchers,
  COUNT(DISTINCT r.user_id) as review_count,
  AVG(r.overall_rating) as average_rating,
  SUM(wp.total_watch_time) as total_watch_time
FROM anime_metadata am
LEFT JOIN watch_progress wp ON am.id = wp.anime_id AND wp.last_watched >= NOW() - INTERVAL '7 days'
LEFT JOIN reviews r ON am.id = r.anime_id AND r.status = 'published'
WHERE am.status IN ('RELEASING', 'FINISHED')
GROUP BY am.id, am.title_english, am.cover_image_url, am.score, am.popularity
ORDER BY active_watchers DESC, average_rating DESC, am.popularity DESC;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_trending_anime_id ON trending_anime(id);

-- Function to refresh trending anime view
CREATE OR REPLACE FUNCTION refresh_trending_anime()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY trending_anime;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user recommendations
CREATE OR REPLACE FUNCTION get_user_recommendations(target_user_id UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  anime_id INTEGER,
  title_english TEXT,
  cover_image_url TEXT,
  score DECIMAL(3,2),
  recommendation_score DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH user_genres AS (
    SELECT UNNEST(genres) as genre, COUNT(*) as count
    FROM anime_metadata am
    JOIN watchlist w ON am.id = w.anime_id
    WHERE w.user_id = target_user_id AND w.status IN ('completed', 'watching')
    GROUP BY genre
    ORDER BY count DESC
    LIMIT 5
  ),
  similar_users AS (
    SELECT DISTINCT w2.user_id, COUNT(*) as shared_anime
    FROM watchlist w1
    JOIN watchlist w2 ON w1.anime_id = w2.anime_id
    WHERE w1.user_id = target_user_id 
      AND w2.user_id != target_user_id
      AND w1.status IN ('completed', 'watching')
      AND w2.status IN ('completed', 'watching')
    GROUP BY w2.user_id
    HAVING COUNT(*) >= 3
    ORDER BY shared_anime DESC
    LIMIT 20
  )
  SELECT DISTINCT
    am.id,
    am.title_english,
    am.cover_image_url,
    am.score,
    (
      (COALESCE(genre_score.score, 0) * 0.4) +
      (COALESCE(am.score, 0) * 0.3) +
      (COALESCE(collaborative_score.score, 0) * 0.3)
    ) as recommendation_score
  FROM anime_metadata am
  LEFT JOIN (
    SELECT am2.id, COUNT(*) * 10 as score
    FROM anime_metadata am2, user_genres ug
    WHERE am2.genres && ARRAY[ug.genre]
    GROUP BY am2.id
  ) genre_score ON am.id = genre_score.id
  LEFT JOIN (
    SELECT w3.anime_id, COUNT(*) * 5 as score
    FROM watchlist w3
    JOIN similar_users su ON w3.user_id = su.user_id
    WHERE w3.status IN ('completed', 'watching')
    GROUP BY w3.anime_id
  ) collaborative_score ON am.id = collaborative_score.anime_id
  WHERE am.id NOT IN (
    SELECT anime_id FROM watchlist WHERE user_id = target_user_id
  )
  AND am.status IN ('RELEASING', 'FINISHED')
  ORDER BY recommendation_score DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Insert default forum categories
INSERT INTO forum_categories (name, description, icon, sort_order) VALUES
('General Discussion', 'General anime discussions and recommendations', '💬', 1),
('Episode Discussions', 'Discuss specific episodes and series', '📺', 2),
('Reviews & Ratings', 'Share your anime reviews and ratings', '⭐', 3),
('Recommendations', 'Get and give anime recommendations', '👍', 4),
('Technical Support', 'Help with the platform and technical issues', '🛠️', 5),
('Community Events', 'Platform events and community activities', '🎉', 6)
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE anime_metadata IS 'Comprehensive anime metadata from multiple sources';
COMMENT ON TABLE episodes IS 'Individual episode information and video data';
COMMENT ON TABLE reviews IS 'User reviews and detailed ratings for anime';
COMMENT ON TABLE forum_categories IS 'Discussion forum categories';
COMMENT ON TABLE forum_threads IS 'Discussion forum threads';
COMMENT ON TABLE forum_posts IS 'Individual posts within forum threads';
COMMENT ON TABLE notifications IS 'User notification system';
COMMENT ON TABLE user_sessions IS 'User session tracking for analytics';
COMMENT ON TABLE page_views IS 'Page view analytics';
COMMENT ON MATERIALIZED VIEW trending_anime IS 'Trending anime based on recent activity';