'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAnimeDetail, getCharacterDetail, getStaffDetail, searchAnimeDetailed } from '@/lib/anilist-extended';
import { bookmarks, watchHistory } from '@/lib/supabase/client';
import { useAuth } from './useAuth';

// Anime detail hook
export function useAnimeDetail(id: string) {
  return useQuery({
    queryKey: ['anime', 'detail', id],
    queryFn: () => getAnimeDetail(parseInt(id)),
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
    enabled: !!id && !isNaN(parseInt(id)),
  });
}

// Character detail hook
export function useCharacterDetail(id: string) {
  return useQuery({
    queryKey: ['character', 'detail', id],
    queryFn: () => getCharacterDetail(parseInt(id)),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 4, // 4 hours
    enabled: !!id && !isNaN(parseInt(id)),
  });
}

// Staff detail hook
export function useStaffDetail(id: string) {
  return useQuery({
    queryKey: ['staff', 'detail', id],
    queryFn: () => getStaffDetail(parseInt(id)),
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 4, // 4 hours
    enabled: !!id && !isNaN(parseInt(id)),
  });
}

// Anime search with detailed info
export function useAnimeSearch(params: {
  search?: string;
  genre?: string;
  year?: number;
  season?: string;
  format?: string;
  status?: string;
  sort?: string[];
  page?: number;
  perPage?: number;
}) {
  return useQuery({
    queryKey: ['anime', 'search', params],
    queryFn: () => searchAnimeDetailed(params),
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    enabled: !!(params.search || params.genre || params.year || params.season),
  });
}

// User bookmark for specific anime
export function useAnimeBookmark(animeId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['bookmark', user?.id, animeId],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data } = await bookmarks.get(user.id);
      return data?.find(bookmark => bookmark.anime_id === parseInt(animeId)) || null;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!user?.id && !!animeId,
  });
}

// Watch progress for specific anime
export function useWatchProgress(animeId: string) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['watchProgress', user?.id, animeId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data } = await watchHistory.getForAnime(user.id, parseInt(animeId));
      return data || [];
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
    enabled: !!user?.id && !!animeId,
  });
}

// All user bookmarks
export function useUserBookmarks() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['bookmarks', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data } = await bookmarks.get(user.id);
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!user?.id,
  });
}

// Bookmark mutations
export function useBookmarkMutations(animeId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const addBookmark = useMutation({
    mutationFn: async (animeData: {
      title: string;
      image: string;
      episodes?: number;
      watchStatus?: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped';
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return bookmarks.add(user.id, parseInt(animeId), animeData);
    },
    onSuccess: () => {
      // Invalidate bookmark queries
      queryClient.invalidateQueries({ queryKey: ['bookmark', user?.id, animeId] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
    },
  });
  
  const removeBookmark = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return bookmarks.remove(user.id, parseInt(animeId));
    },
    onSuccess: () => {
      // Invalidate bookmark queries
      queryClient.invalidateQueries({ queryKey: ['bookmark', user?.id, animeId] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
    },
  });
  
  const updateBookmarkStatus = useMutation({
    mutationFn: async (status: 'watching' | 'completed' | 'plan_to_watch' | 'on_hold' | 'dropped') => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return bookmarks.updateStatus(user.id, parseInt(animeId), status);
    },
    onSuccess: () => {
      // Invalidate bookmark queries
      queryClient.invalidateQueries({ queryKey: ['bookmark', user?.id, animeId] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
    },
  });
  
  const updateBookmarkProgress = useMutation({
    mutationFn: async (progress: number) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return bookmarks.updateProgress(user.id, parseInt(animeId), progress);
    },
    onSuccess: () => {
      // Invalidate bookmark queries
      queryClient.invalidateQueries({ queryKey: ['bookmark', user?.id, animeId] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
    },
  });
  
  const setBookmarkRating = useMutation({
    mutationFn: async (rating: number) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return bookmarks.setRating(user.id, parseInt(animeId), rating);
    },
    onSuccess: () => {
      // Invalidate bookmark queries
      queryClient.invalidateQueries({ queryKey: ['bookmark', user?.id, animeId] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
    },
  });
  
  const toggleFavorite = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return bookmarks.toggleFavorite(user.id, parseInt(animeId));
    },
    onSuccess: () => {
      // Invalidate bookmark queries
      queryClient.invalidateQueries({ queryKey: ['bookmark', user?.id, animeId] });
      queryClient.invalidateQueries({ queryKey: ['bookmarks', user?.id] });
    },
  });
  
  return {
    addBookmark,
    removeBookmark,
    updateBookmarkStatus,
    updateBookmarkProgress,
    setBookmarkRating,
    toggleFavorite,
  };
}

// Watch progress mutations
export function useWatchProgressMutations(animeId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const updateProgress = useMutation({
    mutationFn: async (params: {
      episodeNumber: number;
      progressSeconds: number;
      durationSeconds?: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return watchHistory.updateProgress(
        user.id,
        parseInt(animeId),
        params.episodeNumber,
        params.progressSeconds,
        params.durationSeconds
      );
    },
    onSuccess: () => {
      // Invalidate watch progress queries
      queryClient.invalidateQueries({ queryKey: ['watchProgress', user?.id, animeId] });
    },
  });
  
  const addWatchEntry = useMutation({
    mutationFn: async (params: {
      episodeNumber: number;
      progressSeconds?: number;
    }) => {
      if (!user?.id) throw new Error('User not authenticated');
      
      return watchHistory.add(
        user.id,
        parseInt(animeId),
        params.episodeNumber,
        params.progressSeconds
      );
    },
    onSuccess: () => {
      // Invalidate watch progress queries
      queryClient.invalidateQueries({ queryKey: ['watchProgress', user?.id, animeId] });
    },
  });
  
  return {
    updateProgress,
    addWatchEntry,
  };
}

// Related anime hook (recommendations)
export function useRelatedAnime(animeId: string) {
  const { data: anime } = useAnimeDetail(animeId);
  
  return {
    relations: anime?.relations?.edges || [],
    recommendations: anime?.recommendations?.edges?.slice(0, 12) || [],
  };
}

// Anime statistics hook
export function useAnimeStats(animeId: string) {
  const { data: anime } = useAnimeDetail(animeId);
  
  return {
    scoreDistribution: anime?.stats?.scoreDistribution || [],
    statusDistribution: anime?.stats?.statusDistribution || [],
    averageScore: anime?.averageScore,
    meanScore: anime?.meanScore,
    popularity: anime?.popularity,
    favourites: anime?.favourites,
    trending: anime?.trending,
  };
}

// Check if anime is bookmarked
export function useIsBookmarked(animeId: string) {
  const { data: bookmark } = useAnimeBookmark(animeId);
  return !!bookmark;
}

// Get watch status for anime
export function useWatchStatus(animeId: string) {
  const { data: bookmark } = useAnimeBookmark(animeId);
  return bookmark?.watch_status || null;
}

// Get user rating for anime
export function useUserRating(animeId: string) {
  const { data: bookmark } = useAnimeBookmark(animeId);
  return bookmark?.rating || null;
}

// Get continue watching episode
export function useContinueWatching(animeId: string) {
  const { data: progress } = useWatchProgress(animeId);
  
  if (!progress || progress.length === 0) return null;
  
  // Find the latest incomplete episode or the next episode to watch
  const sortedProgress = progress.sort((a, b) => b.episode_number - a.episode_number);
  const lastWatched = sortedProgress[0];
  
  if (!lastWatched.completed) {
    return {
      episodeNumber: lastWatched.episode_number,
      progressSeconds: lastWatched.progress_seconds,
    };
  }
  
  // If last episode was completed, suggest next episode
  return {
    episodeNumber: lastWatched.episode_number + 1,
    progressSeconds: 0,
  };
}