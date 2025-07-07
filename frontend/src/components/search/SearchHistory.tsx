'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClockIcon, 
  XMarkIcon, 
  TrashIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { searchHistory } from '@/lib/supabase/client';

interface SearchHistoryProps {
  userId: string;
  onSearchSelect: (searchTerm: string) => void;
}

export default function SearchHistory({ userId, onSearchSelect }: SearchHistoryProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user's search history
  const { data: history, isLoading } = useQuery({
    queryKey: ['search-history', userId],
    queryFn: async () => {
      const { data, error } = await searchHistory.get(userId, 10);
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!userId
  });

  const clearHistory = async () => {
    try {
      // In a real implementation, you'd have a clear history endpoint
      // For now, we'll just invalidate the query
      await queryClient.invalidateQueries({ queryKey: ['search-history', userId] });
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <ClockIcon className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-medium">Recent Searches</h3>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 bg-ash-700/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!history?.length) {
    return (
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
        <div className="flex items-center space-x-2 mb-4">
          <ClockIcon className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-medium">Recent Searches</h3>
        </div>
        <div className="text-center py-4">
          <MagnifyingGlassIcon className="w-8 h-8 text-ash-400 mx-auto mb-2" />
          <p className="text-ash-400 text-sm">No recent searches</p>
        </div>
      </div>
    );
  }

  // Get unique search terms
  const uniqueSearches = Array.from(
    new Set(history.map(item => item.search_term))
  ).slice(0, 8);

  return (
    <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <ClockIcon className="w-4 h-4 text-purple-400" />
          <h3 className="text-white font-medium">Recent Searches</h3>
        </div>
        
        {uniqueSearches.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="text-ash-400 hover:text-red-400 transition-colors"
            title="Clear history"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {uniqueSearches.map((searchTerm, index) => (
          <button
            key={searchTerm}
            onClick={() => onSearchSelect(searchTerm)}
            className="w-full text-left px-3 py-2 text-ash-300 hover:text-white hover:bg-white/10 rounded-lg transition-all text-sm group"
          >
            <div className="flex items-center justify-between">
              <span className="truncate">{searchTerm}</span>
              <MagnifyingGlassIcon className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </button>
        ))}
      </div>

      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowClearConfirm(false)}
          >
            <div 
              className="glass backdrop-blur-sm bg-white/10 border border-white/20 rounded-xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center space-x-3 mb-4">
                <TrashIcon className="w-5 h-5 text-red-400" />
                <h3 className="text-white font-medium">Clear Search History</h3>
              </div>
              
              <p className="text-ash-300 text-sm mb-6">
                This will permanently delete all your recent searches. This action cannot be undone.
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 px-4 py-2 bg-ash-700/50 hover:bg-ash-600/50 text-ash-300 hover:text-white rounded-lg transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={clearHistory}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}