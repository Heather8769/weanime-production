'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface SearchFilters {
  search: string
  genre: string
  year: number | null
  season: string
  format: string
  status: string
  sort: string
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void
  isLoading?: boolean
  initialFilters?: SearchFilters
}

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror',
  'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance',
  'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
]

const SEASONS = [
  { value: '', label: 'Any Season' },
  { value: 'WINTER', label: 'Winter' },
  { value: 'SPRING', label: 'Spring' },
  { value: 'SUMMER', label: 'Summer' },
  { value: 'FALL', label: 'Fall' },
]

const FORMATS = [
  { value: '', label: 'Any Format' },
  { value: 'TV', label: 'TV Series' },
  { value: 'TV_SHORT', label: 'TV Short' },
  { value: 'MOVIE', label: 'Movie' },
  { value: 'SPECIAL', label: 'Special' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
]

const STATUSES = [
  { value: '', label: 'Any Status' },
  { value: 'RELEASING', label: 'Currently Airing' },
  { value: 'FINISHED', label: 'Completed' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'HIATUS', label: 'On Hiatus' },
]

const SORT_OPTIONS = [
  { value: 'POPULARITY_DESC', label: 'Most Popular' },
  { value: 'SCORE_DESC', label: 'Highest Rated' },
  { value: 'TRENDING_DESC', label: 'Trending' },
  { value: 'START_DATE_DESC', label: 'Newest' },
  { value: 'TITLE_ROMAJI', label: 'A-Z' },
  { value: 'EPISODES_DESC', label: 'Most Episodes' },
]

export function AdvancedSearch({ onSearch, isLoading, initialFilters }: AdvancedSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>(
    initialFilters || {
      search: '',
      genre: '',
      year: null,
      season: '',
      format: '',
      status: '',
      sort: 'POPULARITY_DESC',
    }
  )

  // Update filters when initialFilters change
  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters)
    }
  }, [initialFilters])

  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(filters)
  }

  const handleReset = () => {
    const resetFilters = {
      search: '',
      genre: '',
      year: null,
      season: '',
      format: '',
      status: '',
      sort: 'POPULARITY_DESC',
    }
    setFilters(resetFilters)
    onSearch(resetFilters)
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 30 }, (_, i) => currentYear - i)

  return (
    <div className="bg-card border rounded-lg p-6 space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Search Input */}
        <div className="space-y-2">
          <label htmlFor="search" className="text-sm font-medium">
            Search Anime
          </label>
          <input
            id="search"
            type="text"
            placeholder="Enter anime title..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        {/* Quick Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label htmlFor="sort" className="text-sm font-medium">
              Sort By
            </label>
            <select
              id="sort"
              value={filters.sort}
              onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="genre" className="text-sm font-medium">
              Genre
            </label>
            <select
              id="genre"
              value={filters.genre}
              onChange={(e) => setFilters({ ...filters, genre: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Any Genre</option>
              {GENRES.map((genre) => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="year" className="text-sm font-medium">
              Year
            </label>
            <select
              id="year"
              value={filters.year || ''}
              onChange={(e) => setFilters({ ...filters, year: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Any Year</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="status" className="text-sm font-medium">
              Status
            </label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Filters
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <label htmlFor="season" className="text-sm font-medium">
                Season
              </label>
              <select
                id="season"
                value={filters.season}
                onChange={(e) => setFilters({ ...filters, season: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {SEASONS.map((season) => (
                  <option key={season.value} value={season.value}>
                    {season.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="format" className="text-sm font-medium">
                Format
              </label>
              <select
                id="format"
                value={filters.format}
                onChange={(e) => setFilters({ ...filters, format: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {FORMATS.map((format) => (
                  <option key={format.value} value={format.value}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-4">
          <Button type="submit" disabled={isLoading} className="flex-1 md:flex-none">
            {isLoading ? 'Searching...' : 'Search'}
          </Button>
          <Button type="button" variant="outline" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </form>
    </div>
  )
}
