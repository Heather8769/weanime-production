-- WeAnime Recently Watched Episodes Table
-- Migration 003: Add recent_episodes table as specified in weanime_fix_guide_with_code.md

-- =============================================================================
-- RECENT EPISODES TABLE
-- =============================================================================

-- Create recent_episodes table for tracking recently watched episodes per user
CREATE TABLE IF NOT EXISTS recent_episodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE,
  episode_id TEXT NOT NULL,
  anime_id INTEGER,
  episode_number INTEGER,
  episode_title TEXT,
  anime_title TEXT,
  thumbnail_url TEXT,
  progress_seconds INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recent_episodes_user_id ON recent_episodes(user_id);
CREATE INDEX IF NOT EXISTS idx_recent_episodes_watched_at ON recent_episodes(watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_recent_episodes_user_watched ON recent_episodes(user_id, watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_recent_episodes_anime_id ON recent_episodes(anime_id);

-- Create unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_recent_episodes_user_episode 
ON recent_episodes(user_id, episode_id);

-- Enable Row Level Security
ALTER TABLE recent_episodes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own recent episodes" ON recent_episodes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own recent episodes" ON recent_episodes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recent episodes" ON recent_episodes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recent episodes" ON recent_episodes
  FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_recent_episodes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER trigger_update_recent_episodes_updated_at
  BEFORE UPDATE ON recent_episodes
  FOR EACH ROW
  EXECUTE FUNCTION update_recent_episodes_updated_at();

-- Add comments for documentation
COMMENT ON TABLE recent_episodes IS 'Tracks recently watched episodes per user for continue watching functionality';
COMMENT ON COLUMN recent_episodes.user_id IS 'Reference to the user who watched the episode';
COMMENT ON COLUMN recent_episodes.episode_id IS 'Unique identifier for the episode';
COMMENT ON COLUMN recent_episodes.anime_id IS 'Reference to anime metadata if available';
COMMENT ON COLUMN recent_episodes.episode_number IS 'Episode number within the anime series';
COMMENT ON COLUMN recent_episodes.progress_seconds IS 'Current playback position in seconds';
COMMENT ON COLUMN recent_episodes.duration_seconds IS 'Total episode duration in seconds';
COMMENT ON COLUMN recent_episodes.completed IS 'Whether the episode was fully watched (90%+ completion)';
COMMENT ON COLUMN recent_episodes.watched_at IS 'When the episode was last watched';
