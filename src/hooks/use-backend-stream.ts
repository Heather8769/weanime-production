import { useQuery, useMutation } from '@tanstack/react-query'
import type { BackendStreamResponse, BackendDownloadResponse } from '@/lib/backend-proxy'

export function useBackendStream(animeSlug: string, episodeNumber: number) {
  return useQuery({
    queryKey: ['backend-stream', animeSlug, episodeNumber],
    queryFn: async (): Promise<BackendStreamResponse> => {
      const response = await fetch(
        `/api/backend/stream?anime_slug=${encodeURIComponent(animeSlug)}&episode_number=${episodeNumber}`
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Stream fetch failed')
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Stream fetch failed')
      }
      
      return data.data
    },
    enabled: !!(animeSlug && episodeNumber && episodeNumber > 0),
    staleTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (error.message.includes('400') || error.message.includes('404')) return false
      return failureCount < 2
    },
  })
}

export function useBackendDownload(animeSlug: string, episodeNumber: number) {
  return useQuery({
    queryKey: ['backend-download', animeSlug, episodeNumber],
    queryFn: async (): Promise<BackendDownloadResponse> => {
      const response = await fetch(
        `/api/backend/download?anime_slug=${encodeURIComponent(animeSlug)}&episode_number=${episodeNumber}`
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Download fetch failed')
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Download fetch failed')
      }
      
      return data.data
    },
    enabled: !!(animeSlug && episodeNumber && episodeNumber > 0),
    staleTime: 15 * 60 * 1000, // 15 minutes
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (error.message.includes('400') || error.message.includes('404')) return false
      return failureCount < 2
    },
  })
}

// Mutation for getting stream URL on demand
export function useGetStreamMutation() {
  return useMutation({
    mutationFn: async ({ animeSlug, episodeNumber }: { animeSlug: string; episodeNumber: number }) => {
      const response = await fetch(
        `/api/backend/stream?anime_slug=${encodeURIComponent(animeSlug)}&episode_number=${episodeNumber}`
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Stream fetch failed')
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Stream fetch failed')
      }
      
      return data.data
    },
  })
}

// Mutation for getting download URL on demand
export function useGetDownloadMutation() {
  return useMutation({
    mutationFn: async ({ animeSlug, episodeNumber }: { animeSlug: string; episodeNumber: number }) => {
      const response = await fetch(
        `/api/backend/download?anime_slug=${encodeURIComponent(animeSlug)}&episode_number=${episodeNumber}`
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Download fetch failed')
      }
      
      const data = await response.json()
      if (!data.success) {
        throw new Error(data.error || 'Download fetch failed')
      }
      
      return data.data
    },
  })
}
