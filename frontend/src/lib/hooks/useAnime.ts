// React hooks for anime data fetching with React Query
import { useQuery } from '@tanstack/react-query';
import { 
  getTrendingAnime, 
  getPopularAnime, 
  getAnimeByGenre, 
  searchAnime, 
  getFeaturedAnime 
} from '../anilist';

// Cache times (in milliseconds)
const CACHE_TIME = 1000 * 60 * 15; // 15 minutes
const STALE_TIME = 1000 * 60 * 5;  // 5 minutes

// Hook for trending anime
export function useTrendingAnime(page = 1, perPage = 20) {
  return useQuery({
    queryKey: ['trending-anime', page, perPage],
    queryFn: () => getTrendingAnime(page, perPage),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 2,
  });
}

// Hook for popular anime
export function usePopularAnime(page = 1, perPage = 20) {
  return useQuery({
    queryKey: ['popular-anime', page, perPage],
    queryFn: () => getPopularAnime(page, perPage),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 2,
  });
}

// Hook for anime by genre
export function useAnimeByGenre(genre: string, page = 1, perPage = 20) {
  return useQuery({
    queryKey: ['anime-by-genre', genre, page, perPage],
    queryFn: () => getAnimeByGenre(genre, page, perPage),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 2,
    enabled: !!genre, // Only run if genre is provided
  });
}

// Hook for searching anime
export function useSearchAnime(searchTerm: string, page = 1, perPage = 20) {
  return useQuery({
    queryKey: ['search-anime', searchTerm, page, perPage],
    queryFn: () => searchAnime(searchTerm, page, perPage),
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    retry: 2,
    enabled: !!searchTerm && searchTerm.length > 2, // Only search if term is long enough
  });
}

// Hook for featured anime
export function useFeaturedAnime() {
  return useQuery({
    queryKey: ['featured-anime'],
    queryFn: getFeaturedAnime,
    staleTime: STALE_TIME * 2, // Featured anime can be cached longer
    gcTime: CACHE_TIME * 2,
    retry: 2,
  });
}

// Hook for action anime specifically
export function useActionAnime(page = 1, perPage = 20) {
  return useAnimeByGenre('Action', page, perPage);
}

// Hook for comedy anime specifically
export function useComedyAnime(page = 1, perPage = 20) {
  return useAnimeByGenre('Comedy', page, perPage);
}

// Hook for multiple genres (for different carousel sections)
export function useMultipleGenres() {
  const trending = useTrendingAnime(1, 12);
  const popular = usePopularAnime(1, 12);
  const action = useActionAnime(1, 12);
  const comedy = useComedyAnime(1, 12);
  const featured = useFeaturedAnime();

  return {
    trending,
    popular,
    action,
    comedy,
    featured,
    isLoading: trending.isLoading || popular.isLoading || action.isLoading || comedy.isLoading || featured.isLoading,
    isError: trending.isError || popular.isError || action.isError || comedy.isError || featured.isError,
  };
}