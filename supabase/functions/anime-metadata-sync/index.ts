// Supabase Edge Function: Anime Metadata Sync
// Automatically syncs anime metadata from AniList, MyAnimeList, and other sources

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnimeMetadata {
  mal_id?: number;
  anilist_id?: number;
  title_english?: string;
  title_japanese?: string;
  title_romaji?: string;
  synopsis?: string;
  episodes?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  season?: string;
  season_year?: number;
  genres?: string[];
  studios?: string[];
  rating?: string;
  score?: number;
  popularity?: number;
  cover_image_url?: string;
  banner_image_url?: string;
  trailer_url?: string;
  source_material?: string;
  duration_minutes?: number;
  age_rating?: string;
}

class AnimeMetadataSync {
  private supabase;

  constructor() {
    this.supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
  }

  async syncFromAniList(anilistId: number): Promise<AnimeMetadata | null> {
    const query = `
      query ($id: Int) {
        Media (id: $id, type: ANIME) {
          id
          idMal
          title {
            english
            native
            romaji
          }
          description
          episodes
          status
          startDate {
            year
            month
            day
          }
          endDate {
            year
            month
            day
          }
          season
          seasonYear
          genres
          studios {
            nodes {
              name
            }
          }
          averageScore
          popularity
          coverImage {
            large
          }
          bannerImage
          trailer {
            id
            site
            thumbnail
          }
          source
          duration
          isAdult
        }
      }
    `;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables: { id: anilistId }
        })
      });

      const data = await response.json();
      const media = data.data?.Media;

      if (!media) return null;

      return {
        anilist_id: media.id,
        mal_id: media.idMal,
        title_english: media.title.english,
        title_japanese: media.title.native,
        title_romaji: media.title.romaji,
        synopsis: media.description?.replace(/<[^>]*>/g, ''), // Strip HTML
        episodes: media.episodes,
        status: media.status,
        start_date: this.formatDate(media.startDate),
        end_date: this.formatDate(media.endDate),
        season: media.season,
        season_year: media.seasonYear,
        genres: media.genres,
        studios: media.studios.nodes.map((studio: any) => studio.name),
        score: media.averageScore ? media.averageScore / 10 : null,
        popularity: media.popularity,
        cover_image_url: media.coverImage.large,
        banner_image_url: media.bannerImage,
        trailer_url: media.trailer ? `https://www.youtube.com/watch?v=${media.trailer.id}` : null,
        source_material: media.source,
        duration_minutes: media.duration,
        age_rating: media.isAdult ? 'R18+' : 'General'
      };
    } catch (error) {
      console.error('Error fetching from AniList:', error);
      return null;
    }
  }

  async syncFromMyAnimeList(malId: number): Promise<Partial<AnimeMetadata> | null> {
    try {
      const response = await fetch(`https://api.jikan.moe/v4/anime/${malId}`, {
        headers: {
          'User-Agent': 'WeAnime/1.0 (Educational Project)'
        }
      });

      if (!response.ok) return null;

      const data = await response.json();
      const anime = data.data;

      return {
        mal_id: anime.mal_id,
        title_english: anime.title_english,
        title_japanese: anime.title,
        synopsis: anime.synopsis,
        episodes: anime.episodes,
        status: this.mapJikanStatus(anime.status),
        start_date: anime.aired?.from ? new Date(anime.aired.from).toISOString().split('T')[0] : null,
        end_date: anime.aired?.to ? new Date(anime.aired.to).toISOString().split('T')[0] : null,
        season: anime.season?.toUpperCase(),
        season_year: anime.year,
        genres: anime.genres?.map((g: any) => g.name) || [],
        studios: anime.studios?.map((s: any) => s.name) || [],
        score: anime.score,
        popularity: anime.members,
        cover_image_url: anime.images?.jpg?.large_image_url,
        trailer_url: anime.trailer?.url,
        source_material: anime.source,
        duration_minutes: anime.duration ? Math.floor(anime.duration / 60) : null,
        age_rating: anime.rating
      };
    } catch (error) {
      console.error('Error fetching from MyAnimeList:', error);
      return null;
    }
  }

  private formatDate(dateObj: any): string | null {
    if (!dateObj || !dateObj.year) return null;
    const year = dateObj.year;
    const month = String(dateObj.month || 1).padStart(2, '0');
    const day = String(dateObj.day || 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private mapJikanStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'Finished Airing': 'FINISHED',
      'Currently Airing': 'RELEASING',
      'Not yet aired': 'NOT_YET_RELEASED'
    };
    return statusMap[status] || 'FINISHED';
  }

  async upsertAnimeMetadata(metadata: AnimeMetadata): Promise<any> {
    const { data, error } = await this.supabase
      .from('anime_metadata')
      .upsert({
        ...metadata,
        last_synced_at: new Date().toISOString()
      }, {
        onConflict: 'anilist_id',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error upserting anime metadata:', error);
      throw error;
    }

    return data;
  }

  async syncMultipleAnime(animeIds: number[], source: 'anilist' | 'mal' = 'anilist'): Promise<void> {
    const batchSize = 5; // Respect rate limits
    
    for (let i = 0; i < animeIds.length; i += batchSize) {
      const batch = animeIds.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (id) => {
        try {
          let metadata: AnimeMetadata | null = null;
          
          if (source === 'anilist') {
            metadata = await this.syncFromAniList(id);
          } else {
            metadata = await this.syncFromMyAnimeList(id);
          }

          if (metadata) {
            await this.upsertAnimeMetadata(metadata);
            console.log(`Synced anime ${id} from ${source}`);
          }
        } catch (error) {
          console.error(`Error syncing anime ${id}:`, error);
        }
      }));

      // Rate limiting delay
      if (i + batchSize < animeIds.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  async getTrendingAnimeIds(): Promise<number[]> {
    // Get trending anime IDs from AniList
    const query = `
      query {
        Page(page: 1, perPage: 50) {
          media(type: ANIME, sort: TRENDING_DESC, status_not: NOT_YET_RELEASED) {
            id
          }
        }
      }
    `;

    try {
      const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ query })
      });

      const data = await response.json();
      return data.data?.Page?.media?.map((anime: any) => anime.id) || [];
    } catch (error) {
      console.error('Error fetching trending anime:', error);
      return [];
    }
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, animeId, animeIds, source = 'anilist' } = await req.json();
    const syncService = new AnimeMetadataSync();

    switch (action) {
      case 'sync_single':
        if (!animeId) {
          return new Response(
            JSON.stringify({ error: 'animeId is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        let metadata: AnimeMetadata | null = null;
        if (source === 'anilist') {
          metadata = await syncService.syncFromAniList(animeId);
        } else {
          metadata = await syncService.syncFromMyAnimeList(animeId);
        }

        if (metadata) {
          await syncService.upsertAnimeMetadata(metadata);
          return new Response(
            JSON.stringify({ success: true, metadata }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({ error: 'Anime not found' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

      case 'sync_multiple':
        if (!animeIds || !Array.isArray(animeIds)) {
          return new Response(
            JSON.stringify({ error: 'animeIds array is required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await syncService.syncMultipleAnime(animeIds, source);
        return new Response(
          JSON.stringify({ success: true, count: animeIds.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'sync_trending':
        const trendingIds = await syncService.getTrendingAnimeIds();
        await syncService.syncMultipleAnime(trendingIds, 'anilist');
        return new Response(
          JSON.stringify({ success: true, count: trendingIds.length }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in anime-metadata-sync function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});