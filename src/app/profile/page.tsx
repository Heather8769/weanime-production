'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/lib/auth-context'
import { useWatchlistStore } from '@/lib/watchlist-store'
import { useWatchStore, getWatchStatistics } from '@/lib/watch-store'
import { Button } from '@/components/ui/button'
import { WatchHistory } from '@/components/watch-history'
import { cn } from '@/lib/utils'

interface UserStats {
  totalAnime: number
  episodesWatched: number
  hoursWatched: number
  averageRating: number
  favoriteGenres: string[]
  completionRate: number
  currentStreak: number
}

export default function ProfilePage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('overview')
  const [userStats, setUserStats] = useState<UserStats | null>(null)
  
  const { loadWatchlist, getWatchlistStats } = useWatchlistStore()
  const { watchProgress, loadProgress } = useWatchStore()

  useEffect(() => {
    if (user) {
      loadWatchlist()
      loadProgress()
    }
  }, [user, loadWatchlist, loadProgress])

  useEffect(() => {
    if (user) {
      // Calculate user statistics
      const watchlistStats = getWatchlistStats()
      const watchStats = getWatchStatistics()
      
      const stats: UserStats = {
        totalAnime: watchlistStats.totalAnime,
        episodesWatched: watchStats.episodesWatched,
        hoursWatched: Math.round(watchStats.totalWatchTime / 3600), // Convert seconds to hours
        averageRating: watchlistStats.averageRating,
        favoriteGenres: [], // Would need to calculate from anime data
        completionRate: watchStats.episodesWatched > 0 ? (watchStats.episodesWatched / watchStats.animeWatched) * 100 : 0,
        currentStreak: 0, // Would need to calculate from watch dates
      }
      
      setUserStats(stats)
    }
  }, [user, getWatchlistStats, watchProgress])

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">Sign in Required</h1>
          <p className="text-muted-foreground mb-6">
            You need to sign in to view your profile.
          </p>
          <Button asChild>
            <a href="/auth/login">Sign In</a>
          </Button>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'activity', label: 'Activity', icon: '📈' },
    { key: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg p-8">
        <div className="flex items-center gap-6">
          {/* Avatar */}
          <div className="w-24 h-24 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-3xl font-bold">
            {user.email?.[0]?.toUpperCase()}
          </div>
          
          {/* User Info */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">{user.email}</h1>
            <p className="text-muted-foreground">
              Member since {new Date(user.created_at || '').toLocaleDateString()}
            </p>
            
            {userStats && (
              <div className="flex items-center gap-6 mt-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{userStats.totalAnime}</div>
                  <div className="text-sm text-muted-foreground">Anime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{userStats.episodesWatched}</div>
                  <div className="text-sm text-muted-foreground">Episodes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{userStats.hoursWatched}</div>
                  <div className="text-sm text-muted-foreground">Hours</div>
                </div>
                {userStats.averageRating > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-500">{userStats.averageRating.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">Avg Rating</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-8">
        {activeTab === 'overview' && (
          <OverviewTab userStats={userStats} />
        )}
        
        {activeTab === 'activity' && (
          <ActivityTab />
        )}
        
        {activeTab === 'settings' && (
          <SettingsTab />
        )}
      </div>
    </div>
  )
}

function OverviewTab({ userStats }: { userStats: UserStats | null }) {
  const { getWatchlistByStatus, getFavorites } = useWatchlistStore()

  if (!userStats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border rounded-lg p-6 space-y-4">
            <div className="h-6 bg-muted rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded w-2/3 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  const watching = getWatchlistByStatus('watching')
  const completed = getWatchlistByStatus('completed')
  const favorites = getFavorites()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Quick Stats */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Quick Stats</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Completion Rate</span>
            <span className="font-medium">{userStats.completionRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Currently Watching</span>
            <span className="font-medium">{watching.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Completed</span>
            <span className="font-medium">{completed.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Favorites</span>
            <span className="font-medium">{favorites.length}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <WatchHistory limit={5} showTitle={false} />
      </div>

      {/* Achievements */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Achievements</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl mb-2">🏆</div>
            <div className="text-sm font-medium">First Watch</div>
            <div className="text-xs text-muted-foreground">Watch your first episode</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl mb-2">📚</div>
            <div className="text-sm font-medium">Collector</div>
            <div className="text-xs text-muted-foreground">Add 10 anime to watchlist</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl mb-2">⭐</div>
            <div className="text-sm font-medium">Critic</div>
            <div className="text-xs text-muted-foreground">Rate 5 anime</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl mb-2">🎯</div>
            <div className="text-sm font-medium">Completionist</div>
            <div className="text-xs text-muted-foreground">Complete 10 anime</div>
          </div>
        </div>
      </div>

      {/* Favorite Genres */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Favorite Genres</h3>
        <div className="space-y-2">
          {['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy'].map((genre, index) => (
            <div key={genre} className="flex items-center justify-between">
              <span className="text-sm">{genre}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${Math.max(20, 100 - index * 15)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-8">
                  {Math.max(20, 100 - index * 15)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ActivityTab() {
  return (
    <div className="space-y-8">
      <WatchHistory limit={20} />
      
      {/* Activity Chart Placeholder */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Watch Activity</h3>
        <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
          <p className="text-muted-foreground">Activity chart coming soon</p>
        </div>
      </div>
    </div>
  )
}

function SettingsTab() {
  const { user } = useAuth()
  
  return (
    <div className="max-w-2xl space-y-8">
      {/* Profile Settings */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Profile Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              disabled
              className="w-full px-3 py-2 border border-border rounded-lg bg-muted"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Display Name</label>
            <input
              type="text"
              placeholder="Enter display name"
              className="w-full px-3 py-2 border border-border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Bio</label>
            <textarea
              placeholder="Tell us about yourself"
              className="w-full px-3 py-2 border border-border rounded-lg h-24 resize-none"
            />
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Privacy Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Public Profile</div>
              <div className="text-sm text-muted-foreground">Allow others to view your profile</div>
            </div>
            <input type="checkbox" className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Show Watch Activity</div>
              <div className="text-sm text-muted-foreground">Display your watch history publicly</div>
            </div>
            <input type="checkbox" className="toggle" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Show Ratings</div>
              <div className="text-sm text-muted-foreground">Make your ratings visible to others</div>
            </div>
            <input type="checkbox" className="toggle" />
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-card border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Notifications</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">New Episodes</div>
              <div className="text-sm text-muted-foreground">Notify when new episodes are available</div>
            </div>
            <input type="checkbox" className="toggle" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Recommendations</div>
              <div className="text-sm text-muted-foreground">Get personalized anime recommendations</div>
            </div>
            <input type="checkbox" className="toggle" defaultChecked />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button>Save Changes</Button>
      </div>
    </div>
  )
}
