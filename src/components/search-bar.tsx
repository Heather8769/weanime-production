'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchAnime, getAnimeTitle } from '@/hooks/use-anime'
import { cn } from '@/lib/utils'

export function SearchBar() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const { data, isLoading } = useSearchAnime(
    { search: query },
  )

  const searchResults = (data?.pages[0] as any)?.Page.media.slice(0, 8) || []

  useEffect(() => {
    if (query.length > 0) {
      setIsOpen(true)
      setSelectedIndex(-1)
    } else {
      setIsOpen(false)
    }
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/browse?search=${encodeURIComponent(query.trim())}`)
      setIsOpen(false)
      inputRef.current?.blur()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || searchResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < searchResults.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          const selectedAnime = searchResults[selectedIndex]
          router.push(`/anime/${selectedAnime.id}`)
          setIsOpen(false)
          inputRef.current?.blur()
        } else {
          handleSubmit(e)
        }
        break
      case 'Escape':
        setIsOpen(false)
        inputRef.current?.blur()
        break
    }
  }

  const handleResultClick = (animeId: number) => {
    router.push(`/anime/${animeId}`)
    setIsOpen(false)
    setQuery('')
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search anime..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="w-full px-4 py-3 pl-12 glass-card border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 text-white placeholder-white/60 transition-colors duration-200"
        />
      </form>

      <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
        <svg
          className="w-5 h-5 text-white/60"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      </div>

      {/* Search Results Dropdown */}
      <AnimatePresence>
        {isOpen && query.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-3 glass-modal border border-white/20 rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto"
          >
            {isLoading && (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-2" />
                <p className="text-white/70 text-sm">Searching...</p>
              </div>
            )}

            {!isLoading && searchResults.length === 0 && query.length > 2 && (
              <div className="p-6 text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-white/70 text-sm">No anime found for "{query}"</p>
                <p className="text-white/50 text-xs mt-1">Try a different search term</p>
              </div>
            )}

            {!isLoading && searchResults.length > 0 && (
              <>
                {searchResults.map((anime: any, index: number) => (
                  <motion.button
                    key={anime.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleResultClick(anime.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-colors duration-150 text-left group",
                      selectedIndex === index && "bg-white/10"
                    )}
                  >
                    <div className="relative w-12 h-16 flex-shrink-0">
                      <Image
                        src={anime.coverImage.medium}
                        alt={getAnimeTitle(anime)}
                        fill
                        className="object-cover rounded-lg"
                        sizes="48px"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1 text-white group-hover:text-primary transition-colors">
                        {getAnimeTitle(anime)}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
                        <span>{anime.format}</span>
                        {anime.startDate?.year && (
                          <span>• {anime.startDate.year}</span>
                        )}
                        {anime.averageScore && (
                          <span>• ★ {anime.averageScore / 10}</span>
                        )}
                      </div>
                      {anime.genres.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {anime.genres.slice(0, 2).map((genre: string) => (
                            <span
                              key={genre}
                              className="text-xs glass-card px-1.5 py-0.5 rounded border border-white/10 text-white/70"
                            >
                              {genre}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.button>
                ))}

                <div className="border-t border-white/10 p-3">
                  <Link
                    href={`/browse?search=${encodeURIComponent(query)}`}
                    className="block text-center text-sm text-primary hover:text-primary/80 transition-colors glass-card px-4 py-2 rounded-lg border border-white/10"
                    onClick={() => setIsOpen(false)}
                  >
                    View all results for "{query}"
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
