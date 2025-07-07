'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  XMarkIcon, 
  ChevronDownIcon,
  StarIcon,
  CalendarIcon,
  PlayIcon,
  FilmIcon
} from '@heroicons/react/24/outline';

interface SearchFiltersProps {
  filters: {
    genres: string[];
    year: string;
    status: string;
    format: string;
    sort: string;
    minScore: number;
    maxScore: number;
    minEpisodes: number;
    maxEpisodes: number;
  };
  onFiltersChange: (filters: any) => void;
  onClear: () => void;
}

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror',
  'Mystery', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural',
  'Thriller', 'Mecha', 'Music', 'Psychological', 'School', 'Military',
  'Historical', 'Parody', 'Samurai', 'Vampire', 'Harem', 'Ecchi',
  'Josei', 'Seinen', 'Shoujo', 'Shounen', 'Kids', 'Demons'
];

const YEARS = Array.from({ length: 30 }, (_, i) => (new Date().getFullYear() - i).toString());

const STATUS_OPTIONS = [
  { value: '', label: 'Any Status' },
  { value: 'RELEASING', label: 'Currently Airing' },
  { value: 'FINISHED', label: 'Completed' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'HIATUS', label: 'On Hiatus' }
];

const FORMAT_OPTIONS = [
  { value: '', label: 'Any Format' },
  { value: 'TV', label: 'TV Series' },
  { value: 'MOVIE', label: 'Movie' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'SPECIAL', label: 'Special' },
  { value: 'MUSIC', label: 'Music Video' }
];

const SORT_OPTIONS = [
  { value: 'POPULARITY_DESC', label: 'Most Popular' },
  { value: 'SCORE_DESC', label: 'Highest Rated' },
  { value: 'TRENDING_DESC', label: 'Trending' },
  { value: 'START_DATE_DESC', label: 'Newest' },
  { value: 'START_DATE', label: 'Oldest' },
  { value: 'TITLE_ROMAJI', label: 'A-Z' },
  { value: 'TITLE_ROMAJI_DESC', label: 'Z-A' },
  { value: 'EPISODES_DESC', label: 'Most Episodes' },
  { value: 'EPISODES', label: 'Least Episodes' }
];

export default function SearchFilters({ filters, onFiltersChange, onClear }: SearchFiltersProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    genres: true,
    details: false,
    episodes: false,
    score: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleGenreToggle = (genre: string) => {
    const newGenres = filters.genres.includes(genre)
      ? filters.genres.filter(g => g !== genre)
      : [...filters.genres, genre];
    onFiltersChange({ genres: newGenres });
  };

  const handleRangeChange = (field: string, value: number) => {
    onFiltersChange({ [field]: value });
  };

  const FilterSection = ({ 
    title, 
    icon: Icon, 
    sectionKey, 
    children 
  }: { 
    title: string; 
    icon: any; 
    sectionKey: string; 
    children: React.ReactNode; 
  }) => (
    <div className="border-b border-white/10 last:border-b-0">
      <button
        onClick={() => toggleSection(sectionKey)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center space-x-2">
          <Icon className="w-4 h-4 text-purple-400" />
          <span className="text-white font-medium">{title}</span>
        </div>
        <ChevronDownIcon 
          className={`w-4 h-4 text-ash-400 transition-transform ${
            expandedSections[sectionKey] ? 'rotate-180' : ''
          }`} 
        />
      </button>
      
      {expandedSections[sectionKey] && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Sort */}
      <div>
        <label className="block text-white font-medium mb-2">Sort By</label>
        <select
          value={filters.sort}
          onChange={(e) => onFiltersChange({ sort: e.target.value })}
          className="w-full px-4 py-2 bg-ash-800/50 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          {SORT_OPTIONS.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Expandable Sections */}
      <div className="glass backdrop-blur-[14px] bg-white/5 border border-white/10 rounded-lg overflow-hidden">
        {/* Genres */}
        <FilterSection title="Genres" icon={PlayIcon} sectionKey="genres">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GENRES.map(genre => (
              <button
                key={genre}
                onClick={() => handleGenreToggle(genre)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  filters.genres.includes(genre)
                    ? 'bg-purple-500 text-white'
                    : 'bg-ash-800/50 text-ash-300 hover:text-white hover:bg-ash-700/50'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
          
          {filters.genres.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-ash-400 text-sm">
                  {filters.genres.length} genre{filters.genres.length !== 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={() => onFiltersChange({ genres: [] })}
                  className="text-ash-400 hover:text-white text-sm transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </FilterSection>

        {/* Details */}
        <FilterSection title="Details" icon={CalendarIcon} sectionKey="details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Year */}
            <div>
              <label className="block text-ash-300 text-sm mb-2">Year</label>
              <select
                value={filters.year}
                onChange={(e) => onFiltersChange({ year: e.target.value })}
                className="w-full px-3 py-2 bg-ash-800/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Any Year</option>
                {YEARS.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-ash-300 text-sm mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => onFiltersChange({ status: e.target.value })}
                className="w-full px-3 py-2 bg-ash-800/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {STATUS_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Format */}
            <div className="sm:col-span-2">
              <label className="block text-ash-300 text-sm mb-2">Format</label>
              <select
                value={filters.format}
                onChange={(e) => onFiltersChange({ format: e.target.value })}
                className="w-full px-3 py-2 bg-ash-800/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {FORMAT_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </FilterSection>

        {/* Score Range */}
        <FilterSection title="Score Range" icon={StarIcon} sectionKey="score">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-ash-300 text-sm">Minimum Score</label>
                <span className="text-white text-sm">{filters.minScore / 10}/10</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.minScore}
                onChange={(e) => handleRangeChange('minScore', parseInt(e.target.value))}
                className="w-full h-2 bg-ash-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-ash-300 text-sm">Maximum Score</label>
                <span className="text-white text-sm">{filters.maxScore / 10}/10</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.maxScore}
                onChange={(e) => handleRangeChange('maxScore', parseInt(e.target.value))}
                className="w-full h-2 bg-ash-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
        </FilterSection>

        {/* Episode Count */}
        <FilterSection title="Episode Count" icon={FilmIcon} sectionKey="episodes">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-ash-300 text-sm">Minimum Episodes</label>
                <span className="text-white text-sm">
                  {filters.minEpisodes === 0 ? 'Any' : filters.minEpisodes}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="200"
                step="1"
                value={filters.minEpisodes}
                onChange={(e) => handleRangeChange('minEpisodes', parseInt(e.target.value))}
                className="w-full h-2 bg-ash-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-ash-300 text-sm">Maximum Episodes</label>
                <span className="text-white text-sm">
                  {filters.maxEpisodes === 999 ? 'Any' : filters.maxEpisodes}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="999"
                step="1"
                value={filters.maxEpisodes}
                onChange={(e) => handleRangeChange('maxEpisodes', parseInt(e.target.value))}
                className="w-full h-2 bg-ash-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>

            {/* Quick Episode Filters */}
            <div className="pt-3 border-t border-white/10">
              <label className="block text-ash-300 text-sm mb-2">Quick Filters</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Short (≤12)', min: 0, max: 12 },
                  { label: 'Standard (13-26)', min: 13, max: 26 },
                  { label: 'Long (27-50)', min: 27, max: 50 },
                  { label: 'Very Long (50+)', min: 51, max: 999 }
                ].map(preset => (
                  <button
                    key={preset.label}
                    onClick={() => onFiltersChange({ 
                      minEpisodes: preset.min, 
                      maxEpisodes: preset.max 
                    })}
                    className="px-3 py-2 bg-ash-800/50 hover:bg-ash-700/50 text-ash-300 hover:text-white rounded-lg transition-all text-sm"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FilterSection>
      </div>

      {/* Clear All Button */}
      <button
        onClick={onClear}
        className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg transition-all"
      >
        <XMarkIcon className="w-4 h-4" />
        <span>Clear All Filters</span>
      </button>
    </div>
  );
}