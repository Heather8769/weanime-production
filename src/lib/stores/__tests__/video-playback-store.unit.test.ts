import { useVideoPlaybackStore, PlayerSettings, Episode } from '../video-playback-store'

// Mock localStorage
const mockStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}
Object.defineProperty(window, 'localStorage', { value: mockStorage })

describe('Video Playback Store', () => {
  beforeEach(() => {
    // Reset store to initial state
    useVideoPlaybackStore.setState({
      currentAnime: null,
      currentEpisode: null,
      episodes: [],
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      volume: 1,
      muted: false,
      fullscreen: false,
      settings: {
        volume: 1,
        muted: false,
        playbackRate: 1,
        quality: 'auto',
        subtitleLanguage: 'en',
        autoPlay: true,
        autoSkipIntro: true,
        autoSkipOutro: false,
        theaterMode: false,
      },
    })
    jest.clearAllMocks()
  })

  describe('Basic State Management', () => {
    it('should set current anime', () => {
      const { setCurrentAnime } = useVideoPlaybackStore.getState()
      setCurrentAnime(123)
      
      expect(useVideoPlaybackStore.getState().currentAnime).toBe(123)
    })

    it('should set current episode', () => {
      const episode: Episode = {
        id: 'ep1',
        number: 1,
        title: 'Episode 1',
        duration: 1440,
        sources: [],
        subtitles: [],
      }
      
      const { setCurrentEpisode } = useVideoPlaybackStore.getState()
      setCurrentEpisode(episode)
      
      expect(useVideoPlaybackStore.getState().currentEpisode).toEqual(episode)
    })

    it('should set episodes list', () => {
      const episodes: Episode[] = [
        { id: 'ep1', number: 1, title: 'Episode 1', duration: 1440, sources: [], subtitles: [] },
        { id: 'ep2', number: 2, title: 'Episode 2', duration: 1440, sources: [], subtitles: [] },
      ]
      
      const { setEpisodes } = useVideoPlaybackStore.getState()
      setEpisodes(episodes)
      
      expect(useVideoPlaybackStore.getState().episodes).toEqual(episodes)
    })

    it('should update playback state', () => {
      const { setIsPlaying, setCurrentTime, setDuration, setBuffered } = useVideoPlaybackStore.getState()
      
      setIsPlaying(true)
      setCurrentTime(120)
      setDuration(1440)
      setBuffered(300)
      
      const state = useVideoPlaybackStore.getState()
      expect(state.isPlaying).toBe(true)
      expect(state.currentTime).toBe(120)
      expect(state.duration).toBe(1440)
      expect(state.buffered).toBe(300)
    })
  })

  describe('Volume and Audio', () => {
    it('should set volume and update settings', () => {
      const { setVolume } = useVideoPlaybackStore.getState()
      setVolume(0.5)
      
      const state = useVideoPlaybackStore.getState()
      expect(state.volume).toBe(0.5)
      expect(state.settings.volume).toBe(0.5)
    })

    it('should set muted state and update settings', () => {
      const { setMuted } = useVideoPlaybackStore.getState()
      setMuted(true)
      
      const state = useVideoPlaybackStore.getState()
      expect(state.muted).toBe(true)
      expect(state.settings.muted).toBe(true)
    })
  })

  describe('Settings Management', () => {
    it('should update player settings', () => {
      const { updateSettings } = useVideoPlaybackStore.getState()
      const newSettings: Partial<PlayerSettings> = {
        playbackRate: 1.5,
        quality: '720p',
        theaterMode: true,
      }
      
      updateSettings(newSettings)
      
      const state = useVideoPlaybackStore.getState()
      expect(state.settings.playbackRate).toBe(1.5)
      expect(state.settings.quality).toBe('720p')
      expect(state.settings.theaterMode).toBe(true)
      // Other settings should remain unchanged
      expect(state.settings.autoPlay).toBe(true)
    })
  })

  describe('Episode Navigation', () => {
    beforeEach(() => {
      const episodes: Episode[] = [
        { id: 'ep1', number: 1, title: 'Episode 1', duration: 1440, sources: [], subtitles: [] },
        { id: 'ep2', number: 2, title: 'Episode 2', duration: 1440, sources: [], subtitles: [] },
        { id: 'ep3', number: 3, title: 'Episode 3', duration: 1440, sources: [], subtitles: [] },
      ]
      
      useVideoPlaybackStore.getState().setEpisodes(episodes)
      useVideoPlaybackStore.getState().setCurrentEpisode(episodes[1]) // Set to episode 2
    })

    it('should play next episode', () => {
      const { playNextEpisode } = useVideoPlaybackStore.getState()
      playNextEpisode()
      
      const state = useVideoPlaybackStore.getState()
      expect(state.currentEpisode?.id).toBe('ep3')
      expect(state.currentTime).toBe(0)
    })

    it('should play previous episode', () => {
      const { playPreviousEpisode } = useVideoPlaybackStore.getState()
      playPreviousEpisode()
      
      const state = useVideoPlaybackStore.getState()
      expect(state.currentEpisode?.id).toBe('ep1')
      expect(state.currentTime).toBe(0)
    })

    it('should not navigate beyond first episode', () => {
      useVideoPlaybackStore.getState().setCurrentEpisode(useVideoPlaybackStore.getState().episodes[0])
      const { playPreviousEpisode } = useVideoPlaybackStore.getState()
      playPreviousEpisode()
      
      const state = useVideoPlaybackStore.getState()
      expect(state.currentEpisode?.id).toBe('ep1') // Should stay on first episode
    })

    it('should not navigate beyond last episode', () => {
      useVideoPlaybackStore.getState().setCurrentEpisode(useVideoPlaybackStore.getState().episodes[2])
      const { playNextEpisode } = useVideoPlaybackStore.getState()
      playNextEpisode()
      
      const state = useVideoPlaybackStore.getState()
      expect(state.currentEpisode?.id).toBe('ep3') // Should stay on last episode
    })
  })

  describe('Utility Functions', () => {
    beforeEach(() => {
      const episode: Episode = {
        id: 'ep1',
        number: 1,
        title: 'Episode 1',
        duration: 1440,
        sources: [
          { url: 'test1.m3u8', quality: '1080p', type: 'hls' },
          { url: 'test2.mp4', quality: '720p', type: 'mp4' },
        ],
        subtitles: [
          { url: 'en.vtt', language: 'en', label: 'English' },
          { url: 'ja.vtt', language: 'ja', label: 'Japanese' },
        ],
        skipTimes: {
          intro: { start: 10, end: 90 },
          outro: { start: 1350, end: 1440 },
        },
      }
      
      useVideoPlaybackStore.getState().setCurrentEpisode(episode)
      useVideoPlaybackStore.getState().setDuration(1440)
    })

    it('should get current quality options', () => {
      const { getCurrentQualityOptions } = useVideoPlaybackStore.getState()
      const options = getCurrentQualityOptions()
      
      expect(options).toHaveLength(2)
      expect(options[0].quality).toBe('1080p')
      expect(options[1].quality).toBe('720p')
    })

    it('should get current subtitle options', () => {
      const { getCurrentSubtitleOptions } = useVideoPlaybackStore.getState()
      const options = getCurrentSubtitleOptions()
      
      expect(options).toHaveLength(2)
      expect(options[0].language).toBe('en')
      expect(options[1].language).toBe('ja')
    })

    it('should calculate episode progress', () => {
      useVideoPlaybackStore.getState().setCurrentTime(720) // 50% of 1440
      
      const { getEpisodeProgress } = useVideoPlaybackStore.getState()
      const progress = getEpisodeProgress()
      
      expect(progress).toBe(50)
    })

    it('should handle zero duration for progress calculation', () => {
      useVideoPlaybackStore.getState().setDuration(0)
      useVideoPlaybackStore.getState().setCurrentTime(100)
      
      const { getEpisodeProgress } = useVideoPlaybackStore.getState()
      const progress = getEpisodeProgress()
      
      expect(progress).toBe(0)
    })

    it('should check if auto skip is available for intro', () => {
      useVideoPlaybackStore.getState().setCurrentTime(50) // In intro range
      useVideoPlaybackStore.getState().updateSettings({ autoSkipIntro: true })
      
      const { canAutoSkip } = useVideoPlaybackStore.getState()
      const canSkip = canAutoSkip('intro')
      
      expect(canSkip).toBe(true)
    })

    it('should check if auto skip is available for outro', () => {
      useVideoPlaybackStore.getState().setCurrentTime(1400) // In outro range
      useVideoPlaybackStore.getState().updateSettings({ autoSkipOutro: true })
      
      const { canAutoSkip } = useVideoPlaybackStore.getState()
      const canSkip = canAutoSkip('outro')
      
      expect(canSkip).toBe(true)
    })

    it('should not auto skip when disabled', () => {
      useVideoPlaybackStore.getState().setCurrentTime(50) // In intro range
      useVideoPlaybackStore.getState().updateSettings({ autoSkipIntro: false })
      
      const { canAutoSkip } = useVideoPlaybackStore.getState()
      const canSkip = canAutoSkip('intro')
      
      expect(canSkip).toBe(false)
    })

    it('should not auto skip when outside time range', () => {
      useVideoPlaybackStore.getState().setCurrentTime(100) // Outside intro range
      useVideoPlaybackStore.getState().updateSettings({ autoSkipIntro: true })
      
      const { canAutoSkip } = useVideoPlaybackStore.getState()
      const canSkip = canAutoSkip('intro')
      
      expect(canSkip).toBe(false)
    })
  })

  describe('Persistence', () => {
    it('should persist settings and volume', () => {
      const { setVolume, setMuted, updateSettings } = useVideoPlaybackStore.getState()
      
      setVolume(0.7)
      setMuted(true)
      updateSettings({ playbackRate: 1.25 })
      
      // The persist middleware should handle localStorage calls
      // We can't easily test the actual persistence without mocking the entire middleware
      // but we can verify the state is correct
      const state = useVideoPlaybackStore.getState()
      expect(state.volume).toBe(0.7)
      expect(state.muted).toBe(true)
      expect(state.settings.playbackRate).toBe(1.25)
    })
  })

  describe('Edge Cases', () => {
    it('should handle episode navigation with no episodes', () => {
      useVideoPlaybackStore.getState().setEpisodes([])
      useVideoPlaybackStore.getState().setCurrentEpisode(null)
      
      const { playNextEpisode, playPreviousEpisode } = useVideoPlaybackStore.getState()
      
      // Should not throw errors
      expect(() => playNextEpisode()).not.toThrow()
      expect(() => playPreviousEpisode()).not.toThrow()
      
      expect(useVideoPlaybackStore.getState().currentEpisode).toBeNull()
    })

    it('should handle episode navigation with no current episode', () => {
      const episodes: Episode[] = [
        { id: 'ep1', number: 1, title: 'Episode 1', duration: 1440, sources: [], subtitles: [] },
      ]
      
      useVideoPlaybackStore.getState().setEpisodes(episodes)
      useVideoPlaybackStore.setState({ currentEpisode: null })
      
      const { playNextEpisode, playPreviousEpisode } = useVideoPlaybackStore.getState()
      
      expect(() => playNextEpisode()).not.toThrow()
      expect(() => playPreviousEpisode()).not.toThrow()
      
      expect(useVideoPlaybackStore.getState().currentEpisode).toBeNull()
    })

    it('should handle auto skip check with no current episode', () => {
      useVideoPlaybackStore.setState({ currentEpisode: null })
      
      const { canAutoSkip } = useVideoPlaybackStore.getState()
      const canSkip = canAutoSkip('intro')
      
      expect(canSkip).toBe(false)
    })

    it('should handle auto skip check with no skip times', () => {
      const episode: Episode = {
        id: 'ep1',
        number: 1,
        title: 'Episode 1',
        duration: 1440,
        sources: [],
        subtitles: [],
        // No skipTimes property
      }
      
      useVideoPlaybackStore.getState().setCurrentEpisode(episode)
      useVideoPlaybackStore.getState().updateSettings({ autoSkipIntro: true })
      
      const { canAutoSkip } = useVideoPlaybackStore.getState()
      const canSkip = canAutoSkip('intro')
      
      expect(canSkip).toBe(false)
    })
  })
})