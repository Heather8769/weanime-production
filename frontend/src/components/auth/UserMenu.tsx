'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/hooks/useAuth';

interface UserMenuProps {
  onOpenAuth: () => void;
}

export default function UserMenu({ onOpenAuth }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { user, profile, signOut, isAuthenticated } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setIsOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={onOpenAuth}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all duration-200"
        >
          Sign In
        </button>
      </motion.div>
    );
  }

  const displayName = profile?.display_name || profile?.username || user?.email?.split('@')[0];
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="relative">
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
            {displayName?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        )}
        <span className="text-white font-medium hidden md:block">
          {displayName}
        </span>
        <svg 
          className={`w-4 h-4 text-ash-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        </button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
          >
            <div className="absolute right-0 top-12 w-64 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg overflow-hidden shadow-xl">
            {/* User Info */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-lg font-bold">
                    {displayName?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-sm text-ash-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <a
                href="#"
                className="block px-4 py-2 text-ash-200 hover:text-white hover:bg-white/10 transition-colors flex items-center space-x-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </a>
              
              <a
                href="#"
                className="block px-4 py-2 text-ash-200 hover:text-white hover:bg-white/10 transition-colors flex items-center space-x-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>My List</span>
              </a>

              <a
                href="#"
                className="block px-4 py-2 text-ash-200 hover:text-white hover:bg-white/10 transition-colors flex items-center space-x-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Watch History</span>
              </a>

              <a
                href="#"
                className="block px-4 py-2 text-ash-200 hover:text-white hover:bg-white/10 transition-colors flex items-center space-x-3"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Settings</span>
              </a>

              <div className="border-t border-white/10 mt-2 pt-2">
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2 text-ash-200 hover:text-white hover:bg-white/10 transition-colors flex items-center space-x-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}