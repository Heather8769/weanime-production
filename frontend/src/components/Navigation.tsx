'use client';

import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useSearchAnime } from '@/lib/hooks/useAnime';
import { useAuth } from '@/lib/hooks/useAuth';
import { searchHistory } from '@/lib/supabase/client';
import AuthModal from './auth/AuthModal';
import UserMenu from './auth/UserMenu';

export default function Navigation() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const { user } = useAuth();
  const router = useRouter();
  
  // Use search hook with debouncing
  const { data: searchResults, isLoading: isSearching } = useSearchAnime(
    searchTerm.trim().length > 2 ? searchTerm : ''
  );

  // Handle search submission
  const handleSearch = async (term: string) => {
    if (term.trim().length > 2) {
      // Log search for analytics (if user is logged in)
      try {
        await searchHistory.add(user?.id || null, term, searchResults?.anime?.length || 0);
      } catch (error) {
        // Silent fail for search logging
        console.log('Search logging failed:', error);
      }
    }
  };

  // Handle clicking on search result
  const handleSearchResultClick = async (anime: any) => {
    try {
      await searchHistory.add(user?.id || null, searchTerm, searchResults?.anime?.length || 0, anime.id);
    } catch (error) {
      console.log('Search click logging failed:', error);
    }
    
    // Navigate to anime detail page
    router.push(`/anime/${anime.id}`);
    setIsSearchOpen(false);
    setSearchTerm('');
  };

  // Handle escape key to close search
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchTerm('');
        setIsSearchFocused(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener('keydown', handleEscape);
      searchInputRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSearchOpen]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isSearchOpen && !searchInputRef.current?.contains(e.target as Node)) {
        setIsSearchOpen(false);
        setIsSearchFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);

  return (
    <motion.nav 
      initial={{ y: -100 }}
      animate={{ y: 0 }}
    >
      <nav className="fixed top-0 left-0 right-0 z-50 glass backdrop-blur-[20px] bg-ash-900/70 border-b border-white/10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="text-2xl font-bold text-white">
              WeAnime
            </div>
          </motion.div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <a href="/" className="text-ash-200 hover:text-white transition-colors">
              Home
            </a>
            <a href="/search" className="text-ash-200 hover:text-white transition-colors">
              Browse
            </a>
            <a href="#" className="text-ash-200 hover:text-white transition-colors">
              My List
            </a>
          </div>

          {/* Search and User Actions */}
          <div className="flex items-center space-x-4">
            {/* Search */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <button 
                  onClick={() => {
                    if (isSearchOpen) {
                      setIsSearchOpen(false);
                    } else {
                      router.push('/search');
                    }
                  }}
                  className="p-2 text-ash-200 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </motion.button>
              
              {isSearchOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className="absolute right-0 top-12 w-96 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg overflow-hidden">
                  {/* Search Input */}
                  <div className="p-4 border-b border-white/10">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search anime..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleSearch(searchTerm);
                        }
                      }}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-ash-400 focus:outline-none focus:border-white/40 transition-colors"
                    />
                  </div>

                  {/* Search Results */}
                  <div className="max-h-96 overflow-y-auto">
                    {isSearching && searchTerm.length > 2 && (
                      <div className="p-4 text-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto"></div>
                        <p className="text-ash-300 mt-2 text-sm">Searching...</p>
                      </div>
                    )}

                    {searchResults?.anime && searchResults.anime.length > 0 && (
                      <div className="py-2">
                        <p className="px-4 py-2 text-xs text-ash-400 font-medium uppercase tracking-wide">
                          Results ({searchResults.anime.length})
                        </p>
                        {searchResults.anime.slice(0, 6).map((anime) => (
                          <button
                            key={anime.id}
                            onClick={() => handleSearchResultClick(anime)}
                            className="w-full px-4 py-3 hover:bg-white/10 transition-colors text-left flex items-center space-x-3"
                          >
                            <img
                              src={anime.image}
                              alt={anime.title}
                              className="w-12 h-16 object-cover rounded"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-anime.jpg';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-white truncate">
                                {anime.title}
                              </p>
                              <div className="flex items-center space-x-2 mt-1">
                                <span className="text-xs text-ash-400">
                                  {anime.year}
                                </span>
                                <span className="text-xs text-ash-400">•</span>
                                <span className="text-xs text-ash-400">
                                  {anime.episodes} eps
                                </span>
                                <span className="text-xs text-ash-400">•</span>
                                <div className="flex items-center space-x-1">
                                  <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  <span className="text-xs text-ash-400">
                                    {anime.rating?.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchTerm.length > 2 && !isSearching && (!searchResults?.anime || searchResults.anime.length === 0) && (
                      <div className="p-4 text-center">
                        <p className="text-ash-400">No anime found for "{searchTerm}"</p>
                        <p className="text-xs text-ash-500 mt-1">Try a different search term</p>
                      </div>
                    )}

                    {searchTerm.length === 0 && isSearchFocused && (
                      <div className="p-4">
                        <p className="text-xs text-ash-400 font-medium uppercase tracking-wide mb-2">
                          Quick Search
                        </p>
                        <div className="space-y-1">
                          {['Attack on Titan', 'Demon Slayer', 'One Piece', 'Naruto'].map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => {
                                router.push(`/search?q=${encodeURIComponent(suggestion)}`);
                                setIsSearchOpen(false);
                              }}
                              className="block w-full text-left px-2 py-1 text-sm text-ash-300 hover:text-white transition-colors"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* User Authentication */}
            <UserMenu onOpenAuth={() => setIsAuthModalOpen(true)} />
          </div>
        </div>
      </div>
      </nav>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </motion.nav>
  );
}