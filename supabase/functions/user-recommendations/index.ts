// Supabase Edge Function: User Recommendations
// AI-powered anime recommendations based on user preferences and behavior

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecommendationInput {
  userId: string;
  limit?: number;
  excludeWatched?: boolean;
  genres?: string[];
  minScore?: number;
  maxEpisodes?: number;
  status?: string[];
}

interface AnimeRecommendation {
  anime_id: number;
  title_english: string;
  cover_image_url: string;
  score: number;
  genres: string[];
  episodes: number;
  status: string;
  recommendation_score: number;
  reason: string;
  similarity_users?: number;
}

class RecommendationEngine {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async getUserPreferences(userId: string) {
    // Get user's favorite genres and ratings
    const { data: watchlist } = await this.supabase
      .from('watchlist')
      .select(`
        anime_id,
        rating,
        status,
        anime_metadata (
          genres,
          score,
          episodes,
          status
        )
      `)
      .eq('user_id', userId)
      .not('anime_metadata', 'is', null);

    if (!watchlist || watchlist.length === 0) {
      return {
        favoriteGenres: [],
        averageRating: 7,
        preferredEpisodeCount: null,
        completionRate: 0
      };
    }

    // Calculate genre preferences
    const genreCount: { [key: string]: number } = {};
    const genreRatings: { [key: string]: number[] } = {};
    let totalRatings = 0;
    let ratingSum = 0;
    let episodeCounts: number[] = [];
    let completedShows = 0;

    watchlist.forEach((item: any) => {
      if (item.anime_metadata?.genres) {
        item.anime_metadata.genres.forEach((genre: string) => {
          genreCount[genre] = (genreCount[genre] || 0) + 1;
          if (item.rating) {
            if (!genreRatings[genre]) genreRatings[genre] = [];
            genreRatings[genre].push(item.rating);
          }
        });
      }

      if (item.rating) {
        totalRatings++;
        ratingSum += item.rating;
      }

      if (item.anime_metadata?.episodes) {
        episodeCounts.push(item.anime_metadata.episodes);
      }

      if (item.status === 'completed') {
        completedShows++;
      }
    });

    // Sort genres by frequency and average rating
    const favoriteGenres = Object.entries(genreCount)
      .map(([genre, count]) => ({
        genre,
        count,
        avgRating: genreRatings[genre] 
          ? genreRatings[genre].reduce((a, b) => a + b, 0) / genreRatings[genre].length 
          : 0
      }))
      .sort((a, b) => (b.count * b.avgRating) - (a.count * a.avgRating))
      .slice(0, 10)
      .map(item => item.genre);

    return {
      favoriteGenres,
      averageRating: totalRatings > 0 ? ratingSum / totalRatings : 7,
      preferredEpisodeCount: episodeCounts.length > 0 
        ? episodeCounts.reduce((a, b) => a + b, 0) / episodeCounts.length 
        : null,
      completionRate: watchlist.length > 0 ? completedShows / watchlist.length : 0
    };
  }

  async getCollaborativeRecommendations(userId: string, limit: number = 10): Promise<AnimeRecommendation[]> {
    // Find users with similar taste
    const { data: similarUsers } = await this.supabase.rpc('get_similar_users', {
      target_user_id: userId,
      limit_users: 20
    });

    if (!similarUsers || similarUsers.length === 0) {
      return [];
    }

    // Get anime that similar users enjoyed but target user hasn't watched
    const { data: recommendations } = await this.supabase
      .from('watchlist')
      .select(`
        anime_id,
        rating,
        anime_metadata (
          id,
          title_english,
          cover_image_url,
          score,
          genres,
          episodes,
          status
        )
      `)
      .in('user_id', similarUsers.map((u: any) => u.user_id))
      .gte('rating', 7)
      .eq('status', 'completed')
      .not('anime_id', 'in', `(
        SELECT anime_id FROM watchlist WHERE user_id = '${userId}'
      )`);

    if (!recommendations) return [];

    // Score recommendations based on similar users' ratings
    const animeScores: { [key: number]: { total: number; count: number; users: Set<string> } } = {};
    
    recommendations.forEach((rec: any) => {
      const animeId = rec.anime_id;
      if (!animeScores[animeId]) {
        animeScores[animeId] = { total: 0, count: 0, users: new Set() };
      }
      animeScores[animeId].total += rec.rating;
      animeScores[animeId].count += 1;
      animeScores[animeId].users.add(rec.user_id);
    });

    // Convert to recommendations array
    const collaborativeRecs: AnimeRecommendation[] = [];
    
    for (const [animeIdStr, scores] of Object.entries(animeScores)) {
      const animeId = parseInt(animeIdStr);
      const animeData = recommendations.find((r: any) => r.anime_id === animeId)?.anime_metadata;
      
      if (animeData && scores.count >= 2) { // At least 2 similar users liked it
        const avgRating = scores.total / scores.count;
        const recommendation_score = (avgRating / 10) * 100 * (scores.users.size / similarUsers.length);
        
        collaborativeRecs.push({
          anime_id: animeId,
          title_english: animeData.title_english || 'Unknown Title',
          cover_image_url: animeData.cover_image_url || '',
          score: animeData.score || 0,
          genres: animeData.genres || [],
          episodes: animeData.episodes || 0,
          status: animeData.status || '',
          recommendation_score,
          reason: `Recommended by ${scores.users.size} users with similar taste (avg rating: ${avgRating.toFixed(1)})`,
          similarity_users: scores.users.size
        });
      }
    }

    return collaborativeRecs
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, limit);
  }

  async getContentBasedRecommendations(userId: string, limit: number = 10): Promise<AnimeRecommendation[]> {
    const userPrefs = await this.getUserPreferences(userId);

    if (userPrefs.favoriteGenres.length === 0) {
      return [];
    }

    // Get anime that match user's genre preferences
    const { data: recommendations } = await this.supabase
      .from('anime_metadata')
      .select('*')
      .overlaps('genres', userPrefs.favoriteGenres)
      .gte('score', Math.max(userPrefs.averageRating - 1, 6))
      .in('status', ['FINISHED', 'RELEASING'])
      .not('id', 'in', `(
        SELECT anime_id FROM watchlist WHERE user_id = '${userId}'
      )`)
      .order('score', { ascending: false })
      .limit(limit * 3); // Get more to filter and rank

    if (!recommendations) return [];

    // Score based on genre overlap and other factors
    const contentRecs: AnimeRecommendation[] = recommendations.map((anime: any) => {
      let recommendation_score = 0;

      // Genre matching score (0-40 points)
      const genreOverlap = anime.genres.filter((g: string) => userPrefs.favoriteGenres.includes(g)).length;
      const genreScore = (genreOverlap / Math.min(anime.genres.length, userPrefs.favoriteGenres.length)) * 40;
      recommendation_score += genreScore;

      // Rating score (0-30 points)
      const ratingScore = (anime.score / 10) * 30;
      recommendation_score += ratingScore;

      // Episode count preference (0-15 points)
      if (userPrefs.preferredEpisodeCount) {
        const episodeDiff = Math.abs(anime.episodes - userPrefs.preferredEpisodeCount);
        const episodeScore = Math.max(0, 15 - (episodeDiff / 5));
        recommendation_score += episodeScore;
      } else {
        recommendation_score += 10; // Neutral score if no preference
      }

      // Popularity bonus (0-15 points)
      const popularityScore = Math.min(15, (anime.popularity || 0) / 1000);
      recommendation_score += popularityScore;

      // Generate reason
      const matchedGenres = anime.genres.filter((g: string) => userPrefs.favoriteGenres.includes(g));
      const reason = `Matches your favorite genres: ${matchedGenres.join(', ')} (Score: ${anime.score}/10)`;

      return {
        anime_id: anime.id,
        title_english: anime.title_english || 'Unknown Title',
        cover_image_url: anime.cover_image_url || '',
        score: anime.score || 0,
        genres: anime.genres || [],
        episodes: anime.episodes || 0,
        status: anime.status || '',
        recommendation_score: Math.round(recommendation_score),
        reason
      };
    });

    return contentRecs
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, limit);
  }

  async getTrendingRecommendations(limit: number = 10): Promise<AnimeRecommendation[]> {
    // Get currently trending anime
    const { data: trending } = await this.supabase
      .from('trending_anime')
      .select('*')
      .limit(limit);

    if (!trending) return [];

    return trending.map((anime: any) => ({
      anime_id: anime.id,
      title_english: anime.title_english || 'Unknown Title',
      cover_image_url: anime.cover_image_url || '',
      score: anime.score || 0,
      genres: [], // Would need to join with anime_metadata for genres
      episodes: 0,
      status: '',
      recommendation_score: anime.active_watchers * 10 + (anime.average_rating || 0) * 5,
      reason: `Currently trending - ${anime.active_watchers} active watchers this week`
    }));
  }

  async getHybridRecommendations(input: RecommendationInput): Promise<AnimeRecommendation[]> {
    const { userId, limit = 20 } = input;

    // Get recommendations from different algorithms
    const [collaborative, contentBased, trending] = await Promise.all([
      this.getCollaborativeRecommendations(userId, Math.ceil(limit * 0.5)),
      this.getContentBasedRecommendations(userId, Math.ceil(limit * 0.4)),
      this.getTrendingRecommendations(Math.ceil(limit * 0.1))
    ]);

    // Combine and deduplicate
    const allRecs = [...collaborative, ...contentBased, ...trending];
    const uniqueRecs = new Map<number, AnimeRecommendation>();

    allRecs.forEach(rec => {
      if (!uniqueRecs.has(rec.anime_id) || 
          uniqueRecs.get(rec.anime_id)!.recommendation_score < rec.recommendation_score) {
        uniqueRecs.set(rec.anime_id, rec);
      }
    });

    // Apply filters if specified
    let filteredRecs = Array.from(uniqueRecs.values());

    if (input.genres && input.genres.length > 0) {
      filteredRecs = filteredRecs.filter(rec => 
        rec.genres.some(genre => input.genres!.includes(genre))
      );
    }

    if (input.minScore) {
      filteredRecs = filteredRecs.filter(rec => rec.score >= input.minScore!);
    }

    if (input.maxEpisodes) {
      filteredRecs = filteredRecs.filter(rec => rec.episodes <= input.maxEpisodes!);
    }

    if (input.status && input.status.length > 0) {
      filteredRecs = filteredRecs.filter(rec => input.status!.includes(rec.status));
    }

    return filteredRecs
      .sort((a, b) => b.recommendation_score - a.recommendation_score)
      .slice(0, limit);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const input: RecommendationInput = await req.json();
    
    if (!input.userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const engine = new RecommendationEngine();
    const recommendations = await engine.getHybridRecommendations(input);

    return new Response(
      JSON.stringify({ 
        recommendations,
        count: recommendations.length,
        generated_at: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in user-recommendations function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});