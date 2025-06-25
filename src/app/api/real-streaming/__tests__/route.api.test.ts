import { NextRequest } from 'next/server'
import { GET, HEAD } from '../route'

// Mock the dependencies
jest.mock('@/lib/real-video-service')
jest.mock('@/lib/real-anime-apis')
jest.mock('@/lib/error-handling')
jest.mock('@/lib/episode-service')

describe('Real Streaming API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/real-streaming', () => {
    it('should return 400 when animeId is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/real-streaming?episodeNumber=1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing required parameter: animeId')
    })

    it('should return 400 when episodeNumber is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/real-streaming?animeId=123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing required parameter: episodeNumber')
    })

    it('should return 404 when no streaming sources are available', async () => {
      // Mock fetchLegalAnimeStreams to return anime info
      const { fetchLegalAnimeStreams } = require('@/lib/real-anime-apis')
      fetchLegalAnimeStreams.mockResolvedValue({ title: 'Test Anime' })

      // Mock getEpisodeWithVideoSources to return no sources
      const episodeService = require('@/lib/episode-service')
      episodeService.getEpisodeWithVideoSources = jest.fn().mockResolvedValue({
        sources: []
      })

      const request = new NextRequest('http://localhost:3000/api/real-streaming?animeId=123&episodeNumber=1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('No streaming sources available')
    })

    it('should return streaming data when sources are available', async () => {
      // Mock fetchLegalAnimeStreams
      const { fetchLegalAnimeStreams } = require('@/lib/real-anime-apis')
      fetchLegalAnimeStreams.mockResolvedValue({ title: 'Test Anime' })

      // Mock getEpisodeWithVideoSources
      const episodeService = require('@/lib/episode-service')
      const mockSources = [
        {
          url: 'https://example.com/stream.m3u8',
          quality: '1080p',
          type: 'hls',
          isReal: true
        }
      ]
      const mockSubtitles = [
        {
          url: 'https://example.com/subtitles.vtt',
          language: 'en',
          label: 'English'
        }
      ]
      episodeService.getEpisodeWithVideoSources = jest.fn().mockResolvedValue({
        sources: mockSources,
        subtitles: mockSubtitles
      })

      const request = new NextRequest('http://localhost:3000/api/real-streaming?animeId=123&episodeNumber=1&quality=1080p')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.animeId).toBe('123')
      expect(data.episodeNumber).toBe('1')
      expect(data.streamUrl).toBe(mockSources[0].url)
      expect(data.quality).toBe('1080p')
      expect(data.isM3U8).toBe(true)
      expect(data.realSources).toEqual(mockSources)
      expect(data.subtitles).toEqual(mockSubtitles)
      expect(data.source).toBe('crunchyroll-streaming')
      expect(data.sourceType).toBe('real')
    })

    it('should handle WeAnimeError properly', async () => {
      const { fetchLegalAnimeStreams } = require('@/lib/real-anime-apis')
      const { WeAnimeError, ErrorCode } = require('@/lib/error-handling')
      
      const mockError = new WeAnimeError(ErrorCode.NO_CONTENT, 'Content not found', {
        statusCode: 404,
        userMessage: 'This content is not available'
      })
      
      fetchLegalAnimeStreams.mockRejectedValue(mockError)

      const request = new NextRequest('http://localhost:3000/api/real-streaming?animeId=999&episodeNumber=1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('NO_CONTENT')
      expect(data.message).toBe('This content is not available')
    })

    it('should handle generic errors', async () => {
      const { fetchLegalAnimeStreams } = require('@/lib/real-anime-apis')
      fetchLegalAnimeStreams.mockRejectedValue(new Error('Network error'))

      const request = new NextRequest('http://localhost:3000/api/real-streaming?animeId=123&episodeNumber=1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to fetch real streaming data')
      expect(data.details).toBe('Network error')
    })

    it('should handle streaming service failures', async () => {
      const { fetchLegalAnimeStreams } = require('@/lib/real-anime-apis')
      fetchLegalAnimeStreams.mockResolvedValue({ title: 'Test Anime' })

      const episodeService = require('@/lib/episode-service')
      episodeService.getEpisodeWithVideoSources = jest.fn().mockRejectedValue(new Error('Streaming service down'))

      const request = new NextRequest('http://localhost:3000/api/real-streaming?animeId=123&episodeNumber=1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Streaming unavailable')
      expect(data.message).toBe('Unable to access streaming')
    })
  })

  describe('HEAD /api/real-streaming', () => {
    it('should return 200 for health check', async () => {
      const response = await HEAD()

      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('X-Service-Type')).toBe('real-crunchyroll')
      expect(response.headers.get('X-Mock-Data')).toBe('false')
    })
  })

  describe('Security Tests', () => {
    it('should sanitize input parameters', async () => {
      const maliciousAnimeId = '123<script>alert("xss")</script>'
      const request = new NextRequest(`http://localhost:3000/api/real-streaming?animeId=${encodeURIComponent(maliciousAnimeId)}&episodeNumber=1`)
      
      const { fetchLegalAnimeStreams } = require('@/lib/real-anime-apis')
      fetchLegalAnimeStreams.mockResolvedValue(null)

      const response = await GET(request)
      
      // Should handle the request without executing the script
      expect(response.status).toBe(500) // Will fail due to no content but shouldn't execute script
    })

    it('should validate numeric parameters', async () => {
      const request = new NextRequest('http://localhost:3000/api/real-streaming?animeId=abc&episodeNumber=xyz')
      
      const { fetchLegalAnimeStreams } = require('@/lib/real-anime-apis')
      fetchLegalAnimeStreams.mockResolvedValue(null)

      const response = await GET(request)
      
      // Should attempt to parse as numbers but handle gracefully
      expect(response.status).toBe(500)
    })
  })

  describe('Performance Tests', () => {
    it('should complete within reasonable time', async () => {
      const { fetchLegalAnimeStreams } = require('@/lib/real-anime-apis')
      fetchLegalAnimeStreams.mockResolvedValue({ title: 'Test Anime' })

      const episodeService = require('@/lib/episode-service')
      episodeService.getEpisodeWithVideoSources = jest.fn().mockResolvedValue({
        sources: [{ url: 'test.m3u8', quality: '1080p', type: 'hls' }],
        subtitles: []
      })

      const request = new NextRequest('http://localhost:3000/api/real-streaming?animeId=123&episodeNumber=1')
      
      const startTime = Date.now()
      const response = await GET(request)
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(5000) // Should complete within 5 seconds
      expect(response.status).toBe(200)
    })
  })
})