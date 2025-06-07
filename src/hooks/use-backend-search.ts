import { useQuery } from '@tanstack/react-query'
import type { BackendSearchResponse } from '@/lib/backend-proxy'

export function useBackendSearch(query: string) {
  return useQuery({
    queryKey: ['backend-search', query],
    queryFn: async (): Promise<BackendSearchResponse> => {
      if (!query || query.length < 2) {
        return { results: [] }
      }
      
      const response = await fetch(`/api/backend/search?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.details || errorData.error || 'Search failed')
      }
      
      const data = await response.json()
      return data.success ? data.data : { results: [] }
    },
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on client errors (4xx)
      if (error.message.includes('400')) return false
      return failureCount < 2
    },
  })
}

export function useBackendSearchSuggestions(query: string) {
  return useQuery({
    queryKey: ['backend-search-suggestions', query],
    queryFn: async () => {
      if (!query || query.length < 1) {
        return []
      }
      
      const response = await fetch(`/api/backend/search?q=${encodeURIComponent(query)}`)
      
      if (!response.ok) {
        return []
      }
      
      const data = await response.json()
      return data.success ? data.data.results.slice(0, 5) : []
    },
    enabled: query.length >= 1,
    staleTime: 2 * 60 * 1000, // 2 minutes
    retry: false, // Don't retry for suggestions
  })
}
