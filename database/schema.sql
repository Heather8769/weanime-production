-- WeAnime Supabase Database Schema
-- This file contains the complete database structure for the WeAnime platform

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
CREATE TYPE anime_status AS ENUM ('SUB', 'DUB', 'BOTH');
CREATE TYPE quality_type AS ENUM ('480p', '720p', '1080p', '4K');
CREATE TYPE watch_status AS ENUM ('watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped');

-- Users table (extends Supabase auth.users)
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100),
    bio TEXT,
    avatar_url TEXT,
    role user_role DEFAULT 'user',
    preferences JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Anime cache table (for caching AniList data)
CREATE TABLE public.anime_cache (
    id BIGINT PRIMARY KEY, -- AniList ID
    title_romaji VARCHAR(500) NOT NULL,
    title_english VARCHAR(500),
    title_native VARCHAR(500),
    description TEXT,
    cover_image_large TEXT,
    cover_image_medium TEXT,
    banner_image TEXT,
    average_score INTEGER,
    season_year INTEGER,
    genres TEXT[] DEFAULT '{}',
    episodes INTEGER,
    status VARCHAR(50),
    format VARCHAR(50),
    trailer_id VARCHAR(100),
    trailer_site VARCHAR(50),
    studios TEXT[] DEFAULT '{}',
    is_adult BOOLEAN DEFAULT false,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User bookmarks/favorites
CREATE TABLE public.user_bookmarks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    anime_id BIGINT NOT NULL, -- AniList ID
    anime_title VARCHAR(500) NOT NULL, -- Cached for quick access
    anime_cover_image TEXT,
    watch_status watch_status DEFAULT 'plan_to_watch',
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    progress INTEGER DEFAULT 0, -- Episodes watched
    total_episodes INTEGER,
    notes TEXT,
    is_favorite BOOLEAN DEFAULT false,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, anime_id)
);

-- User watch history
CREATE TABLE public.watch_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    anime_id BIGINT NOT NULL,
    episode_number INTEGER NOT NULL,
    progress_seconds INTEGER DEFAULT 0, -- Playback position
    duration_seconds INTEGER, -- Total episode duration
    completed BOOLEAN DEFAULT false,
    watched_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, anime_id, episode_number)
);

-- Comments system
CREATE TABLE public.comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    anime_id BIGINT NOT NULL,
    episode_number INTEGER, -- NULL for general anime comments
    content TEXT NOT NULL,
    is_spoiler BOOLEAN DEFAULT false,
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE, -- For replies
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comment votes
CREATE TABLE public.comment_votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE NOT NULL,
    is_upvote BOOLEAN NOT NULL, -- true for upvote, false for downvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, comment_id)
);

-- User search history (for improving recommendations)
CREATE TABLE public.search_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    search_term VARCHAR(500) NOT NULL,
    results_count INTEGER,
    clicked_anime_id BIGINT, -- Which anime they clicked on
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Admin tables for content management
CREATE TABLE public.featured_anime (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    anime_id BIGINT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    banner_image TEXT,
    trailer_url TEXT,
    is_active BOOLEAN DEFAULT true,
    start_date DATE,
    end_date DATE,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User notifications
CREATE TABLE public.notifications (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'general', -- 'general', 'new_episode', 'comment_reply', etc.
    anime_id BIGINT, -- Related anime if applicable
    is_read BOOLEAN DEFAULT false,
    action_url TEXT, -- Link to relevant page
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_user_bookmarks_user_id ON public.user_bookmarks(user_id);
CREATE INDEX idx_user_bookmarks_anime_id ON public.user_bookmarks(anime_id);
CREATE INDEX idx_user_bookmarks_watch_status ON public.user_bookmarks(watch_status);
CREATE INDEX idx_user_bookmarks_is_favorite ON public.user_bookmarks(is_favorite);

CREATE INDEX idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX idx_watch_history_anime_id ON public.watch_history(anime_id);
CREATE INDEX idx_watch_history_watched_at ON public.watch_history(watched_at);

CREATE INDEX idx_comments_anime_id ON public.comments(anime_id);
CREATE INDEX idx_comments_episode_number ON public.comments(episode_number);
CREATE INDEX idx_comments_user_id ON public.comments(user_id);
CREATE INDEX idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX idx_comments_created_at ON public.comments(created_at);

CREATE INDEX idx_anime_cache_title_romaji ON public.anime_cache(title_romaji);
CREATE INDEX idx_anime_cache_genres ON public.anime_cache USING GIN(genres);
CREATE INDEX idx_anime_cache_season_year ON public.anime_cache(season_year);
CREATE INDEX idx_anime_cache_average_score ON public.anime_cache(average_score);

CREATE INDEX idx_search_history_user_id ON public.search_history(user_id);
CREATE INDEX idx_search_history_search_term ON public.search_history(search_term);
CREATE INDEX idx_search_history_searched_at ON public.search_history(searched_at);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at);

-- Row Level Security (RLS) Policies

-- User profiles: Users can only see and edit their own profile
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Public read access for usernames and display names (for comments, etc.)
CREATE POLICY "Public profiles are viewable by everyone" ON public.user_profiles
    FOR SELECT USING (true);

-- User bookmarks: Users can only access their own bookmarks
ALTER TABLE public.user_bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bookmarks" ON public.user_bookmarks
    FOR ALL USING (auth.uid() = user_id);

-- Watch history: Users can only access their own history
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own watch history" ON public.watch_history
    FOR ALL USING (auth.uid() = user_id);

-- Comments: Users can read all comments, manage their own
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments are viewable by everyone" ON public.comments
    FOR SELECT USING (NOT is_deleted);

CREATE POLICY "Users can insert their own comments" ON public.comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON public.comments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON public.comments
    FOR DELETE USING (auth.uid() = user_id);

-- Comment votes: Users can manage their own votes
ALTER TABLE public.comment_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own comment votes" ON public.comment_votes
    FOR ALL USING (auth.uid() = user_id);

-- Search history: Users can only access their own history
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own search history" ON public.search_history
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Notifications: Users can only access their own notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Anime cache: Public read access, admin write access
ALTER TABLE public.anime_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anime cache is viewable by everyone" ON public.anime_cache
    FOR SELECT USING (true);

-- Featured anime: Public read access, admin write access
ALTER TABLE public.featured_anime ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Featured anime is viewable by everyone" ON public.featured_anime
    FOR SELECT USING (is_active = true);

-- Functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updating timestamps
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_anime_cache_updated_at BEFORE UPDATE ON public.anime_cache
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_bookmarks_updated_at BEFORE UPDATE ON public.user_bookmarks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_featured_anime_updated_at BEFORE UPDATE ON public.featured_anime
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, username, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'username', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update comment vote counts
CREATE OR REPLACE FUNCTION update_comment_votes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        IF NEW.is_upvote THEN
            UPDATE public.comments SET upvotes = upvotes + 1 WHERE id = NEW.comment_id;
        ELSE
            UPDATE public.comments SET downvotes = downvotes + 1 WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.is_upvote AND NOT NEW.is_upvote THEN
            UPDATE public.comments SET upvotes = upvotes - 1, downvotes = downvotes + 1 WHERE id = NEW.comment_id;
        ELSIF NOT OLD.is_upvote AND NEW.is_upvote THEN
            UPDATE public.comments SET upvotes = upvotes + 1, downvotes = downvotes - 1 WHERE id = NEW.comment_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.is_upvote THEN
            UPDATE public.comments SET upvotes = upvotes - 1 WHERE id = OLD.comment_id;
        ELSE
            UPDATE public.comments SET downvotes = downvotes - 1 WHERE id = OLD.comment_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment vote updates
CREATE TRIGGER comment_vote_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.comment_votes
    FOR EACH ROW EXECUTE FUNCTION update_comment_votes();