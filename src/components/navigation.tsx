'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'
import { UserMenu } from '@/components/user-menu'
import { EnhancedSearchBar } from '@/components/enhanced-search-bar'

export function Navigation() {
  const { user, loading } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 nav-3d">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Enhanced Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 anime-gradient rounded-xl flex items-center justify-center glow-effect-hover group-hover:scale-105 transition-transform duration-200">
              <span className="text-white font-bold text-xl">K</span>
            </div>
            <span className="font-bold text-2xl hero-text">Kōkai</span>
          </Link>

          {/* Enhanced Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2">
            <Link href="/browse" className="glass-card px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200">
              Browse
            </Link>
            <Link href="/trending" className="glass-card px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200">
              Trending
            </Link>
            <Link href="/seasonal" className="glass-card px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200">
              Seasonal
            </Link>
            {user && (
              <Link href="/watchlist" className="glass-card px-4 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-200">
                Watchlist
              </Link>
            )}
          </div>

          {/* Search Bar */}
          <div className="hidden md:block w-80 mx-8">
            <EnhancedSearchBar />
          </div>

          {/* Enhanced Auth Section */}
          <div className="flex items-center space-x-3">
            {loading ? (
              <div className="w-8 h-8 animate-pulse glass-card rounded-full shimmer" />
            ) : user ? (
              <UserMenu user={user} />
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" className="glass-card text-white hover:bg-white/10" asChild>
                  <Link href="/auth/login">Login</Link>
                </Button>
                <Button className="anime-gradient hover:opacity-90 glow-effect-hover" asChild>
                  <Link href="/auth/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Enhanced Mobile Menu Button */}
          <button
            className="md:hidden glass-card p-3 rounded-lg hover:bg-white/10 transition-all duration-300"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <div className="w-6 h-6 flex flex-col justify-center space-y-1">
              <div className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <div className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`} />
              <div className={`w-full h-0.5 bg-white transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
        </div>

        {/* Enhanced Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10 glass-card">
            <div className="flex flex-col space-y-3">
              <EnhancedSearchBar />
              <Link href="/browse" className="glass-card px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300">
                Browse
              </Link>
              <Link href="/trending" className="glass-card px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300">
                Trending
              </Link>
              <Link href="/seasonal" className="glass-card px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300">
                Seasonal
              </Link>
              {user && (
                <Link href="/watchlist" className="glass-card px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-all duration-300">
                  Watchlist
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
