'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'

interface UserMenuProps {
  user: User
}

export function UserMenu({ user }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <span className="text-primary-foreground text-sm font-medium">
            {user.email?.[0]?.toUpperCase()}
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-popover border border-border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b border-border">
            <p className="text-sm font-medium">{user.email}</p>
          </div>
          
          <div className="p-2">
            <a
              href="/profile"
              className="block w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
            >
              Profile
            </a>
            <a
              href="/watchlist"
              className="block w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
            >
              Watchlist
            </a>
            <a
              href="/profile"
              className="block w-full text-left px-3 py-2 text-sm hover:bg-muted rounded-md transition-colors"
            >
              Settings
            </a>
            <hr className="my-2" />
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
