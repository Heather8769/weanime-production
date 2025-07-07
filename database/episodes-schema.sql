-- Episode Management & Video Streaming Database Schema
-- Extensions to the existing WeAnime database for episode and video functionality

-- Episodes table
CREATE TABLE public.episodes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    anime_id BIGINT NOT NULL,
    episode_number INTEGER NOT NULL,
    season_number INTEGER DEFAULT 1,
    title VARCHAR(500),
    description TEXT,
    air_date DATE,
    duration_seconds INTEGER,
    thumbnail_url TEXT,
    preview_url TEXT,
    intro_start_seconds INTEGER,
    intro_end_seconds INTEGER,
    outro_start_seconds INTEGER,
    is_special BOOLEAN DEFAULT false,
    is_filler BOOLEAN DEFAULT false,
    view_count BIGINT DEFAULT 0,
    rating_average DECIMAL(3,2),
    rating_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(anime_id, episode_number, season_number)
);

-- Video sources table
CREATE TABLE public.video_sources (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    quality VARCHAR(10) NOT NULL, -- '480p', '720p', '1080p', '4K'
    format VARCHAR(10) NOT NULL, -- 'mp4', 'hls', 'dash'
    url TEXT NOT NULL,
    file_size BIGINT, -- bytes
    bitrate INTEGER, -- kbps
    codec VARCHAR(50),
    language VARCHAR(10) DEFAULT 'ja',
    audio_type VARCHAR(10) DEFAULT 'sub', -- 'sub', 'dub'
    cdn_provider VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Subtitle tracks table
CREATE TABLE public.subtitle_tracks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    language VARCHAR(10) NOT NULL,
    label VARCHAR(100) NOT NULL,
    url TEXT NOT NULL,
    format VARCHAR(10) DEFAULT 'vtt', -- 'vtt', 'srt', 'ass'
    is_default BOOLEAN DEFAULT false,
    is_forced BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Watch sessions table (detailed tracking)
CREATE TABLE public.watch_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    session_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    session_end TIMESTAMP WITH TIME ZONE,
    watched_duration INTEGER DEFAULT 0, -- seconds actually watched
    total_duration INTEGER, -- episode duration
    progress_percentage DECIMAL(5,2) DEFAULT 0,
    last_position INTEGER DEFAULT 0, -- last playback position
    quality_watched VARCHAR(10),
    device_type VARCHAR(20),
    ip_address INET,
    user_agent TEXT,
    completed BOOLEAN DEFAULT false,
    pause_count INTEGER DEFAULT 0,
    seek_count INTEGER DEFAULT 0,
    quality_changes INTEGER DEFAULT 0,
    buffer_events INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Player settings table
CREATE TABLE public.player_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    default_quality VARCHAR(10) DEFAULT 'auto',
    auto_play_next BOOLEAN DEFAULT true,
    skip_intro BOOLEAN DEFAULT false,
    skip_outro BOOLEAN DEFAULT false,
    default_subtitle_language VARCHAR(10),
    playback_speed DECIMAL(2,1) DEFAULT 1.0,
    volume DECIMAL(3,2) DEFAULT 1.0,
    theme VARCHAR(20) DEFAULT 'dark',
    keyboard_shortcuts BOOLEAN DEFAULT true,
    picture_in_picture BOOLEAN DEFAULT true,
    notifications BOOLEAN DEFAULT true,
    analytics_consent BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Episode thumbnails table (for progress bar previews)
CREATE TABLE public.episode_thumbnails (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    episode_id UUID REFERENCES public.episodes(id) ON DELETE CASCADE NOT NULL,
    timestamp_seconds INTEGER NOT NULL,
    thumbnail_url TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(episode_id, timestamp_seconds)
);

-- Streaming analytics table
CREATE TABLE public.streaming_analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id UUID REFERENCES public.watch_sessions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'play', 'pause', 'seek', 'quality_change', 'buffer', 'error'
    event_data JSONB,
    timestamp_seconds DECIMAL(10,3),
    buffer_health DECIMAL(5,2), -- percentage
    network_speed INTEGER, -- kbps
    cpu_usage DECIMAL(5,2), -- percentage
    memory_usage BIGINT, -- bytes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_episodes_anime_id ON public.episodes(anime_id);
CREATE INDEX idx_episodes_episode_number ON public.episodes(anime_id, episode_number);
CREATE INDEX idx_episodes_season ON public.episodes(anime_id, season_number);
CREATE INDEX idx_episodes_air_date ON public.episodes(air_date);

CREATE INDEX idx_video_sources_episode_id ON public.video_sources(episode_id);
CREATE INDEX idx_video_sources_quality ON public.video_sources(quality);
CREATE INDEX idx_video_sources_primary ON public.video_sources(episode_id, is_primary);

CREATE INDEX idx_watch_sessions_user_id ON public.watch_sessions(user_id);
CREATE INDEX idx_watch_sessions_episode_id ON public.watch_sessions(episode_id);
CREATE INDEX idx_watch_sessions_progress ON public.watch_sessions(user_id, progress_percentage);
CREATE INDEX idx_watch_sessions_completed ON public.watch_sessions(user_id, completed);
CREATE INDEX idx_watch_sessions_recent ON public.watch_sessions(user_id, session_start DESC);

CREATE INDEX idx_episode_thumbnails_episode_id ON public.episode_thumbnails(episode_id);
CREATE INDEX idx_episode_thumbnails_timestamp ON public.episode_thumbnails(episode_id, timestamp_seconds);

CREATE INDEX idx_streaming_analytics_session_id ON public.streaming_analytics(session_id);
CREATE INDEX idx_streaming_analytics_event_type ON public.streaming_analytics(event_type);
CREATE INDEX idx_streaming_analytics_timestamp ON public.streaming_analytics(created_at);

-- Enable Row Level Security
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtitle_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.episode_thumbnails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Episodes: Public read access
CREATE POLICY "Episodes are viewable by everyone" ON public.episodes
    FOR SELECT USING (true);

-- Video sources: Public read access
CREATE POLICY "Video sources are viewable by everyone" ON public.video_sources
    FOR SELECT USING (true);

-- Subtitle tracks: Public read access
CREATE POLICY "Subtitle tracks are viewable by everyone" ON public.subtitle_tracks
    FOR SELECT USING (true);

-- Watch sessions: Users can only access their own sessions
CREATE POLICY "Users can manage their own watch sessions" ON public.watch_sessions
    FOR ALL USING (auth.uid() = user_id);

-- Player settings: Users can only access their own settings
CREATE POLICY "Users can manage their own player settings" ON public.player_settings
    FOR ALL USING (auth.uid() = user_id);

-- Episode thumbnails: Public read access
CREATE POLICY "Episode thumbnails are viewable by everyone" ON public.episode_thumbnails
    FOR SELECT USING (true);

-- Streaming analytics: Users can only access their own analytics
CREATE POLICY "Users can view their own streaming analytics" ON public.streaming_analytics
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.watch_sessions ws 
            WHERE ws.id = session_id AND ws.user_id = auth.uid()
        )
    );

-- Triggers for updating timestamps
CREATE TRIGGER update_episodes_updated_at BEFORE UPDATE ON public.episodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_watch_sessions_updated_at BEFORE UPDATE ON public.watch_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_player_settings_updated_at BEFORE UPDATE ON public.player_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();