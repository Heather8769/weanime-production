'use client';

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { searchAnime, getAnimeByGenre, getTrendingAnime, getPopularAnime } from '../anilist';

interface SearchFilters {
  genres: string[];
  year: string;
  status: string;
  format: string;
  sort: string;
  minScore: number;
  maxScore: number;
  minEpisodes: number;
  maxEpisodes: number;
}

interface UseAdvancedSearchProps {
  searchTerm: string;
  filters: SearchFilters;
  enabled?: boolean;
}

// Advanced search with filtering and sorting
export function useAdvancedSearch({ 
  searchTerm, 
  filters, 
  enabled = true 
}: UseAdvancedSearchProps) {
  return useInfiniteQuery({
    queryKey: ['advanced-search', searchTerm, filters],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      let results;
      
      // If we have a search term, use search API
      if (searchTerm.trim()) {
        results = await searchAnime(searchTerm, pageParam, 20);
      }
      // If we have genre filters, use genre API
      else if (filters.genres.length > 0) {
        // For multiple genres, we'll use the first one for now
        // In a real implementation, you'd need a more sophisticated approach
        results = await getAnimeByGenre(filters.genres[0], pageParam, 20);
      }
      // If we have other filters but no search term, use trending/popular
      else if (hasActiveFilters(filters)) {
        if (filters.sort === 'TRENDING_DESC') {
          results = await getTrendingAnime(pageParam, 20);
        } else {
          results = await getPopularAnime(pageParam, 20);
        }
      }
      // Default to trending
      else {
        results = await getTrendingAnime(pageParam, 20);
      }

      // Apply client-side filtering
      const filteredAnime = applyClientFilters(results.anime, filters);

      return {
        anime: filteredAnime,
        pageInfo: results.pageInfo,
        currentPage: pageParam
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pageInfo.hasNextPage && lastPage.currentPage) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: enabled && (searchTerm.length > 0 || hasActiveFilters(filters))
  });
}

// Check if any filters are active
function hasActiveFilters(filters: SearchFilters): boolean {
  return (
    filters.genres.length > 0 ||
    filters.year !== '' ||
    filters.status !== '' ||
    filters.format !== '' ||
    filters.sort !== 'POPULARITY_DESC' ||
    filters.minScore > 0 ||
    filters.maxScore < 100 ||
    filters.minEpisodes > 0 ||
    filters.maxEpisodes < 999
  );
}

// Apply client-side filters to results
function applyClientFilters(anime: any[], filters: SearchFilters): any[] {
  return anime.filter(item => {
    // Year filter
    if (filters.year && item.year !== parseInt(filters.year)) {
      return false;
    }

    // Status filter (mock implementation)
    if (filters.status) {
      // In a real implementation, you'd map AniList status to your filter values
      // For now, we'll do a simple mock
      const statusMap: Record<string, string[]> = {
        'RELEASING': ['RELEASING'],
        'FINISHED': ['FINISHED'],
        'NOT_YET_RELEASED': ['NOT_YET_RELEASED'],
        'CANCELLED': ['CANCELLED'],
        'HIATUS': ['HIATUS']
      };
      
      if (statusMap[filters.status] && !statusMap[filters.status].includes(item.status)) {
        return false;
      }
    }

    // Format filter (mock implementation)
    if (filters.format) {
      // This would need to be mapped from AniList format data
      // For now, we'll skip this filter
    }

    // Score filter
    if (item.rating) {
      const score = item.rating * 10; // Convert to 0-100 scale
      if (score < filters.minScore || score > filters.maxScore) {
        return false;
      }
    }

    // Episode count filter
    if (item.episodes) {
      if (item.episodes < filters.minEpisodes || item.episodes > filters.maxEpisodes) {
        return false;
      }
    }

    // Genre filter (additional filtering for multiple genres)
    if (filters.genres.length > 1 && item.genres) {
      const hasAllGenres = filters.genres.every(genre => 
        item.genres.includes(genre)
      );
      if (!hasAllGenres) {
        return false;
      }
    }

    return true;
  });
}

// Hook for search suggestions
export function useSearchSuggestions(query: string) {
  return useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      if (query.length < 2) return { suggestions: [] };
      
      // Get quick results for suggestions
      const results = await searchAnime(query, 1, 5);
      return {
        suggestions: results.anime.map(anime => ({
          id: anime.id,
          title: anime.title,
          image: anime.image,
          year: anime.year,
          rating: anime.rating
        }))
      };
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: query.length >= 2
  });
}

// Hook for genre-based recommendations
export function useGenreRecommendations(genres: string[], excludeIds: string[] = []) {
  return useInfiniteQuery({
    queryKey: ['genre-recommendations', genres, excludeIds],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      if (genres.length === 0) {
        return { anime: [], pageInfo: { hasNextPage: false } };
      }

      // Get anime for the first genre (in a real app, you'd combine multiple genres)
      const results = await getAnimeByGenre(genres[0], pageParam, 12);
      
      // Filter out excluded IDs
      const filteredAnime = results.anime.filter(anime => 
        !excludeIds.includes(anime.id)
      );

      return {
        anime: filteredAnime,
        pageInfo: results.pageInfo,
        currentPage: pageParam
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pageInfo.hasNextPage && lastPage.currentPage) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    enabled: genres.length > 0
  });
}

// Hook for similar anime recommendations
export function useSimilarAnime(animeId: string, genres: string[] = []) {
  return useInfiniteQuery({
    queryKey: ['similar-anime', animeId, genres],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      // In a real implementation, you'd have a dedicated similar anime endpoint
      // For now, we'll use genre-based recommendations
      if (genres.length > 0) {
        const results = await getAnimeByGenre(genres[0], pageParam, 8);
        
        // Filter out the current anime
        const filteredAnime = results.anime.filter(anime => anime.id !== animeId);
        
        return {
          anime: filteredAnime,
          pageInfo: results.pageInfo,
          currentPage: pageParam
        };
      }
      
      // Fallback to popular anime
      const results = await getPopularAnime(pageParam, 8);
      return {
        anime: results.anime.filter(anime => anime.id !== animeId),
        pageInfo: results.pageInfo,
        currentPage: pageParam
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pageInfo.hasNextPage && lastPage.currentPage) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 15, // 15 minutes
    enabled: !!animeId
  });
}

// Hook for trending searches and analytics
export function useTrendingSearches() {
  return useQuery({
    queryKey: ['trending-searches'],
    queryFn: async () => {
      // In a real implementation, this would come from your analytics backend
      // For now, we'll return mock data
      return {
        searches: [
          { term: 'Attack on Titan', count: 1250, trend: 'up' },
          { term: 'Demon Slayer', count: 980, trend: 'up' },
          { term: 'Jujutsu Kaisen', count: 875, trend: 'stable' },
          { term: 'One Piece', count: 720, trend: 'down' },
          { term: 'Chainsaw Man', count: 650, trend: 'up' },
          { term: 'Spy x Family', count: 580, trend: 'up' }
        ]
      };
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

// Hook for personalized recommendations based on user history
export function usePersonalizedRecommendations(userId: string, userGenres: string[] = []) {
  return useInfiniteQuery({
    queryKey: ['personalized-recommendations', userId, userGenres],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      if (!userId) {
        return { anime: [], pageInfo: { hasNextPage: false } };
      }

      // If user has preferred genres, use them
      if (userGenres.length > 0) {
        const results = await getAnimeByGenre(userGenres[0], pageParam, 12);
        return {
          anime: results.anime,
          pageInfo: results.pageInfo,
          currentPage: pageParam
        };
      }

      // Fallback to trending
      const results = await getTrendingAnime(pageParam, 12);
      return {
        anime: results.anime,
        pageInfo: results.pageInfo,
        currentPage: pageParam
      };
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.pageInfo.hasNextPage && lastPage.currentPage) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
    staleTime: 1000 * 60 * 20, // 20 minutes
    enabled: !!userId
  });
}