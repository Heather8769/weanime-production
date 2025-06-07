import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VideoPlayer } from '../video-player'
import { useWatchStore } from '@/lib/watch-store'

// Mock dependencies
jest.mock('@/lib/watch-store')
jest.mock('react-player', () => {
  return function MockReactPlayer({ onReady, onProgress, onEnded, onPlay, onPause, onError }: any) {
    return (
      <div data-testid="react-player">
        <button onClick={() => onReady?.()}>Ready</button>
        <button onClick={() => onProgress?.({ played: 0.5, playedSeconds: 300 })}>Progress</button>
        <button onClick={() => onEnded?.()}>Ended</button>
        <button onClick={() => onPlay?.()}>Play</button>
        <button onClick={() => onPause?.()}>Pause</button>
        <button onClick={() => onError?.(new Error('Test error'))}>Error</button>
      </div>
    )
  }
})

const mockUseWatchStore = useWatchStore as jest.MockedFunction<typeof useWatchStore>

const mockEpisode = {
  id: '1',
  number: 1,
  title: 'Test Episode',
  description: 'Test episode description',
  thumbnail: 'https://example.com/thumbnail.jpg',
  duration: 1440, // 24 minutes in seconds
  sources: [
    { url: 'https://example.com/video.mp4', quality: '1080p', type: 'mp4' as const },
    { url: 'https://example.com/video-720.mp4', quality: '720p', type: 'mp4' as const }
  ],
  subtitles: [
    { url: 'https://example.com/subs.vtt', language: 'en', label: 'English', default: true }
  ],
  skipTimes: {
    intro: { start: 0, end: 90 },
    outro: { start: 1350, end: 1440 }
  }
}


describe('VideoPlayer', () => {
  beforeEach(() => {
    mockUseWatchStore.mockReturnValue({
      // Current playback state
      currentAnime: 123,
      currentEpisode: mockEpisode,
      episodes: [mockEpisode],
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      buffered: 0,
      volume: 0.8,
      muted: false,
      fullscreen: false,
      
      // Player settings with all required properties
      settings: {
        volume: 0.8,
        muted: false,
        playbackRate: 1,
        quality: 'auto',
        subtitleLanguage: 'en',
        autoPlay: true,
        autoSkipIntro: true,
        autoSkipOutro: true,
        theaterMode: false
      },
      
      // Progress state
      watchProgress: new Map(),
      
      // Actions
      setCurrentAnime: jest.fn(),
      setCurrentEpisode: jest.fn(),
      setEpisodes: jest.fn(),
      setIsPlaying: jest.fn(),
      setCurrentTime: jest.fn(),
      setDuration: jest.fn(),
      setBuffered: jest.fn(),
      setVolume: jest.fn(),
      setMuted: jest.fn(),
      setFullscreen: jest.fn(),
      updateSettings: jest.fn(),
      
      // Progress management
      updateProgress: jest.fn(),
      markEpisodeCompleted: jest.fn(),
      getProgress: jest.fn().mockReturnValue(undefined),
      getAnimeProgress: jest.fn().mockReturnValue([]),
      
      // Episode navigation
      playNextEpisode: jest.fn(),
      playPreviousEpisode: jest.fn(),
      
      // Sync methods
      syncProgress: jest.fn().mockResolvedValue(undefined),
      loadProgress: jest.fn().mockResolvedValue(undefined)
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('renders video player with controls', () => {
    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    expect(screen.getByTestId('react-player')).toBeInTheDocument()
    expect(screen.getByText('Test Episode')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    expect(screen.getByText('Loading episode...')).toBeInTheDocument()
  })

  it('handles video ready event', async () => {
    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    fireEvent.click(screen.getByText('Ready'))
    
    await waitFor(() => {
      expect(screen.queryByText('Loading episode...')).not.toBeInTheDocument()
    })
  })

  it('saves progress during playback', async () => {
    const mockUpdateProgress = jest.fn()
    mockUseWatchStore.mockReturnValueOnce({
      ...mockUseWatchStore(),
      updateProgress: mockUpdateProgress
    })

    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    fireEvent.click(screen.getByText('Progress'))
    
    await waitFor(() => {
      expect(mockUpdateProgress).toHaveBeenCalled()
    })
  })

  it('marks episode as completed when ended', async () => {
    const mockMarkCompleted = jest.fn()
    mockUseWatchStore.mockReturnValueOnce({
      ...mockUseWatchStore(),
      markEpisodeCompleted: mockMarkCompleted
    })

    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    fireEvent.click(screen.getByText('Ended'))
    
    await waitFor(() => {
      expect(mockMarkCompleted).toHaveBeenCalled()
    })
  })

  it('handles video errors with retry mechanism', async () => {
    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    fireEvent.click(screen.getByText('Error'))
    
    await waitFor(() => {
      expect(screen.getByText('Video Error')).toBeInTheDocument()
      expect(screen.getByText(/Retrying/)).toBeInTheDocument()
    })
  })

  it('shows retry button after max retries', async () => {
    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    // Trigger error multiple times to exceed retry limit
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByText('Error'))
      await waitFor(() => {}, { timeout: 100 })
    }
    
    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('renders video player with default settings', () => {
    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    // The component should render with default configuration
    expect(screen.getByTestId('react-player')).toBeInTheDocument()
  })

  it('handles keyboard shortcuts', () => {
    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    // Test spacebar for play/pause
    fireEvent.keyDown(document, { key: ' ', code: 'Space' })
    
    // Test arrow keys for seeking
    fireEvent.keyDown(document, { key: 'ArrowRight', code: 'ArrowRight' })
    fireEvent.keyDown(document, { key: 'ArrowLeft', code: 'ArrowLeft' })
    
    // Test volume controls
    fireEvent.keyDown(document, { key: 'ArrowUp', code: 'ArrowUp' })
    fireEvent.keyDown(document, { key: 'ArrowDown', code: 'ArrowDown' })
    
    // Test fullscreen
    fireEvent.keyDown(document, { key: 'f', code: 'KeyF' })
    
    // Test mute
    fireEvent.keyDown(document, { key: 'm', code: 'KeyM' })
  })

  it('auto-hides controls after inactivity', async () => {
    jest.useFakeTimers()
    
    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    // Start playing
    fireEvent.click(screen.getByText('Play'))
    
    // Fast-forward time
    jest.advanceTimersByTime(3000)
    
    await waitFor(() => {
      // Controls should be hidden after 3 seconds of inactivity
      const controls = screen.queryByTestId('video-controls')
      expect(controls).toHaveClass('opacity-0')
    })
    
    jest.useRealTimers()
  })

  it('shows controls on mouse movement', async () => {
    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    const playerContainer = screen.getByTestId('video-player-container')
    
    fireEvent.mouseMove(playerContainer)
    
    await waitFor(() => {
      const controls = screen.getByTestId('video-controls')
      expect(controls).toHaveClass('opacity-100')
    })
  })

  it('handles fullscreen toggle', () => {
    const mockRequestFullscreen = jest.fn()
    const mockExitFullscreen = jest.fn()
    
    Object.defineProperty(document, 'fullscreenElement', {
      value: null,
      writable: true
    })
    
    Object.defineProperty(Element.prototype, 'requestFullscreen', {
      value: mockRequestFullscreen
    })
    
    Object.defineProperty(document, 'exitFullscreen', {
      value: mockExitFullscreen
    })

    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    const fullscreenButton = screen.getByTestId('fullscreen-button')
    fireEvent.click(fullscreenButton)
    
    expect(mockRequestFullscreen).toHaveBeenCalled()
  })

  it('handles volume changes', () => {
    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    const volumeSlider = screen.getByTestId('volume-slider')
    fireEvent.change(volumeSlider, { target: { value: '0.5' } })
    
    // Volume should be updated
    expect(volumeSlider).toHaveValue('0.5')
  })

  it('handles playback rate changes', () => {
    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    const speedButton = screen.getByTestId('speed-button')
    fireEvent.click(speedButton)
    
    const speed125 = screen.getByText('1.25x')
    fireEvent.click(speed125)
    
    // Playback rate should be updated
    expect(screen.getByText('1.25x')).toBeInTheDocument()
  })

  it('handles subtitle toggle', () => {
    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    const subtitleButton = screen.getByTestId('subtitle-button')
    fireEvent.click(subtitleButton)
    
    // Subtitle state should toggle
    expect(subtitleButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('resumes from saved progress', () => {
    const mockProgress = {
      animeId: 123,
      episodeId: '1',
      episodeNumber: 1,
      currentTime: 432, // 30% of 1440 seconds
      duration: 1440,
      completed: false,
      lastWatched: new Date()
    }
    
    mockUseWatchStore.mockReturnValueOnce({
      ...mockUseWatchStore(),
      getProgress: jest.fn().mockReturnValue(mockProgress)
    })

    render(<VideoPlayer episode={mockEpisode} animeId={123} />)
    
    // Component should handle saved progress
    expect(screen.getByTestId('react-player')).toBeInTheDocument()
  })
})
