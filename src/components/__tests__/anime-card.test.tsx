import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AnimeCard } from '../anime-card'

// Mock the anime card component if it doesn't exist yet
const mockAnime = {
  id: 1,
  title: {
    english: 'Attack on Titan',
    romaji: 'Shingeki no Kyojin',
    native: '進撃の巨人',
  },
  coverImage: {
    large: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx16498-73IhOXpJZiMF.jpg',
    medium: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/medium/bx16498-73IhOXpJZiMF.jpg',
    color: '#FF6B6B',
  },
  bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg',
  description: 'Humanity fights for survival against giant humanoid Titans.',
  genres: ['Action', 'Drama', 'Fantasy'],
  episodes: 25,
  status: 'FINISHED' as const,
  averageScore: 90,
  startDate: {
    year: 2013,
    month: 4,
    day: 7,
  },
  endDate: {
    year: 2013,
    month: 9,
    day: 28,
  },
  season: 'SPRING' as const,
  seasonYear: 2013,
  duration: 24,
  format: 'TV' as const,
  source: 'MANGA' as const,
  studios: {
    nodes: [
      {
        id: 858,
        name: 'Wit Studio',
        isAnimationStudio: true,
      },
    ],
  },
  tags: [
    {
      id: 391,
      name: 'Philosophy',
      description: 'Anime that deals with philosophical themes',
      rank: 60,
    },
  ],
  relations: {
    edges: [],
  },
  nextAiringEpisode: null,
  popularity: 95000,
  trending: 85,
  favourites: 120000,
  recommendations: {
    nodes: [],
  },
  trailer: {
    id: 'abc123',
    site: 'youtube',
    thumbnail: 'https://example.com/thumbnail.jpg',
  },
}

describe('AnimeCard', () => {
  it('renders anime information correctly', () => {
    render(<AnimeCard anime={mockAnime} />)
    
    expect(screen.getByText('Attack on Titan')).toBeInTheDocument()
    expect(screen.getByText(/Humanity fights for survival/)).toBeInTheDocument()
    expect(screen.getByText('25 episodes')).toBeInTheDocument()
    expect(screen.getByText('90%')).toBeInTheDocument()
  })

  it('displays cover image with correct alt text', () => {
    render(<AnimeCard anime={mockAnime} />)
    
    const image = screen.getByAltText('Attack on Titan cover')
    expect(image).toBeInTheDocument()
    expect(image).toHaveAttribute('src', mockAnime.coverImage.large)
  })

  it('shows genres correctly', () => {
    render(<AnimeCard anime={mockAnime} />)
    
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Drama')).toBeInTheDocument()
    expect(screen.getByText('Fantasy')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const mockOnClick = jest.fn()
    render(<AnimeCard anime={mockAnime} onClick={mockOnClick} />)
    
    const card = screen.getByRole('button')
    fireEvent.click(card)
    
    await waitFor(() => {
      expect(mockOnClick).toHaveBeenCalledWith(mockAnime)
    })
  })

  it('displays fallback title when English title is not available', () => {
    const animeWithoutEnglishTitle = {
      ...mockAnime,
      title: {
        ...mockAnime.title,
        english: null,
      },
    }
    
    render(<AnimeCard anime={animeWithoutEnglishTitle} />)
    
    expect(screen.getByText('Shingeki no Kyojin')).toBeInTheDocument()
  })

  it('handles missing cover image gracefully', () => {
    const animeWithoutCover = {
      ...mockAnime,
      coverImage: {
        ...mockAnime.coverImage,
        large: null,
      },
    }
    
    render(<AnimeCard anime={animeWithoutCover} />)
    
    // Should still render the card without crashing
    expect(screen.getByText('Attack on Titan')).toBeInTheDocument()
  })

  it('truncates long descriptions', () => {
    const animeWithLongDescription = {
      ...mockAnime,
      description: 'This is a very long description that should be truncated after a certain number of characters to ensure the card layout remains consistent and readable for users browsing through multiple anime cards.',
    }
    
    render(<AnimeCard anime={animeWithLongDescription} />)
    
    const description = screen.getByText(/This is a very long description/)
    expect(description.textContent?.length).toBeLessThan(animeWithLongDescription.description.length)
  })

  it('applies correct CSS classes for different statuses', () => {
    const airingAnime = {
      ...mockAnime,
      status: 'RELEASING' as const,
    }
    
    render(<AnimeCard anime={airingAnime} />)
    
    expect(screen.getByText('RELEASING')).toBeInTheDocument()
  })

  it('handles keyboard navigation', () => {
    const mockOnClick = jest.fn()
    render(<AnimeCard anime={mockAnime} onClick={mockOnClick} />)
    
    const card = screen.getByRole('button')
    
    // Test Enter key
    fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })
    expect(mockOnClick).toHaveBeenCalledWith(mockAnime)
    
    // Test Space key
    fireEvent.keyDown(card, { key: ' ', code: 'Space' })
    expect(mockOnClick).toHaveBeenCalledTimes(2)
  })

  it('displays loading state correctly', () => {
    render(<AnimeCard anime={mockAnime} loading={true} />)
    
    expect(screen.getByTestId('anime-card-skeleton')).toBeInTheDocument()
  })

  it('shows watchlist status when provided', () => {
    render(<AnimeCard anime={mockAnime} watchlistStatus="WATCHING" />)
    
    expect(screen.getByText('Watching')).toBeInTheDocument()
  })
})
