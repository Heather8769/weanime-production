import { WeAnimeBackend, WeAnimeBackendError } from '../weanime-backend'

// Mock fetch for testing
global.fetch = jest.fn()

describe('WeAnimeBackend', () => {
  let backend: WeAnimeBackend
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>

  beforeEach(() => {
    backend = new WeAnimeBackend()
    mockFetch.mockClear()
  })

  describe('searchAnime', () => {
    it('should return search results', async () => {
      const mockResults = [
        { title: 'Jujutsu Kaisen', slug: 'jujutsu-kaisen', image: 'test.jpg' }
      ]

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ results: mockResults })
      } as Response)

      const results = await backend.searchAnime('jujutsu')
      
      expect(results).toEqual(mockResults)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/search?q=jujutsu',
        expect.any(Object)
      )
    })

    it('should throw error for empty query', async () => {
      await expect(backend.searchAnime('')).rejects.toThrow(WeAnimeBackendError)
      await expect(backend.searchAnime('  ')).rejects.toThrow(WeAnimeBackendError)
    })

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await expect(backend.searchAnime('test')).rejects.toThrow(WeAnimeBackendError)
    })
  })

  describe('getStreamUrl', () => {
    it('should return stream URL', async () => {
      const mockStreamUrl = 'https://example.com/stream.m3u8'
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stream_url: mockStreamUrl })
      } as Response)

      const url = await backend.getStreamUrl('jujutsu-kaisen', 1)
      
      expect(url).toBe(mockStreamUrl)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/api/watch?anime_slug=jujutsu-kaisen&episode_number=1',
        expect.any(Object)
      )
    })

    it('should validate parameters', async () => {
      await expect(backend.getStreamUrl('', 1)).rejects.toThrow(WeAnimeBackendError)
      await expect(backend.getStreamUrl('test', 0)).rejects.toThrow(WeAnimeBackendError)
      await expect(backend.getStreamUrl('test', -1)).rejects.toThrow(WeAnimeBackendError)
    })

    it('should handle missing stream URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ stream_url: null })
      } as Response)

      await expect(backend.getStreamUrl('test', 1)).rejects.toThrow(WeAnimeBackendError)
    })
  })

  describe('isValidStreamUrl', () => {
    it('should validate URLs correctly', () => {
      expect(WeAnimeBackend.isValidStreamUrl('https://example.com/video.mp4')).toBe(true)
      expect(WeAnimeBackend.isValidStreamUrl('http://localhost:8080/stream')).toBe(true)
      expect(WeAnimeBackend.isValidStreamUrl('invalid-url')).toBe(false)
      expect(WeAnimeBackend.isValidStreamUrl('ftp://example.com/file')).toBe(false)
      expect(WeAnimeBackend.isValidStreamUrl('')).toBe(false)
    })
  })

  describe('healthCheck', () => {
    it('should return true for healthy backend', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: 'OK' })
      } as Response)

      const isHealthy = await backend.healthCheck()
      expect(isHealthy).toBe(true)
    })

    it('should return false for unhealthy backend', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'))

      const isHealthy = await backend.healthCheck()
      expect(isHealthy).toBe(false)
    })
  })
})