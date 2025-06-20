'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { useBackendSearch } from '@/hooks/use-backend-search'
import { cn } from '@/lib/utils'

export function EnhancedSearchBar() {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [mounted, setMounted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Only run search after component is mounted to prevent hydration issues
  const { data, isLoading, error } = useBackendSearch(mounted ? query : '')

  // Safely extract results from the backend response
  const searchResults = data?.results || []

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && query.length > 0) {
      setIsOpen(true)
      setSelectedIndex(-1)
    } else {
      setIsOpen(false)
    }
  }, [query, mounted])

  // Prevent hydration mismatch by not rendering search results until mounted
  if (!mounted) {
    return (
      <div className="relative">
        <form onSubmit={(e) => e.preventDefault()}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search anime..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 glass-card border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all duration-200 text-white placeholder-white/60"
          />
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white/60">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </form>
      </div>
    )
  }

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
          router.push(`/watch/${selectedAnime.slug}`)
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

  const handleResultClick = (animeSlug: string) => {
    router.push(`/watch/${animeSlug}`)
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
        {mounted && isOpen && query.length > 0 && (
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
                <p className="text-white/70 text-sm">Searching enhanced backend...</p>
              </div>
            )}

            {error && (
              <div className="p-6 text-center">
                <div className="text-4xl mb-2">⚠️</div>
                <p className="text-red-400 text-sm">Search error: {error.message}</p>
                <p className="text-white/50 text-xs mt-1">Please try again</p>
              </div>
            )}

            {!isLoading && !error && searchResults.length === 0 && query.length > 2 && (
              <div className="p-6 text-center">
                <div className="text-4xl mb-2">🔍</div>
                <p className="text-white/70 text-sm">No anime found for "{query}"</p>
                <p className="text-white/50 text-xs mt-1">Try a different search term</p>
              </div>
            )}

            {!isLoading && !error && searchResults.length > 0 && (
              <>
                {searchResults.map((anime: any, index: number) => (
                  <motion.button
                    key={`enhanced-${anime.slug}-${index}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleResultClick(anime.slug)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-colors duration-150 text-left group",
                      selectedIndex === index && "bg-white/10"
                    )}
                  >
                    <div className="relative w-12 h-16 flex-shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <span className="text-white/60 text-lg">🎌</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm line-clamp-1 text-white group-hover:text-primary transition-colors">
                        {anime.title || 'Unknown Title'}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
                        <span>Enhanced Backend</span>
                        <span>• {anime.source || 'WeAnime'}</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        <span className="text-xs glass-card px-1.5 py-0.5 rounded border border-white/10 text-white/70">
                          ✨ Enhanced
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}

                <div className="border-t border-white/10 p-3">
                  <Link
                    href={`/browse?search=${encodeURIComponent(query)}`}
                    className="block text-center text-sm text-primary hover:text-primary/80 transition-colors glass-card px-4 py-2 rounded-lg border border-white/10"
                    onClick={() => setIsOpen(false)}
                  >
                    View all results for "{query}" (Enhanced)
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
