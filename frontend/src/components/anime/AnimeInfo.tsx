'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimeDetail, getMainCharacters, getSupportingCharacters, getMainStaff } from '@/lib/anilist-extended';
import CharacterGrid from './CharacterGrid';
import StaffList from './StaffList';
import ReviewSection from './ReviewSection';

interface AnimeInfoProps {
  anime: AnimeDetail;
}

export default function AnimeInfo({ anime }: AnimeInfoProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'episodes', label: 'Episodes' },
    { id: 'characters', label: 'Characters' },
    { id: 'staff', label: 'Staff' },
    { id: 'reviews', label: 'Reviews' },
  ];

  const mainCharacters = getMainCharacters(anime.characters);
  const supportingCharacters = getSupportingCharacters(anime.characters);
  const mainStaff = getMainStaff(anime.staff);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-white/10">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-ash-400 hover:text-ash-200 hover:border-ash-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Synopsis */}
            <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Synopsis</h3>
              {anime.description ? (
                <div 
                  className="text-ash-300 leading-relaxed prose prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ 
                    __html: anime.description
                      .replace(/<br>/g, '<br/>')
                      .replace(/\n/g, '<br/>')
                  }}
                />
              ) : (
                <p className="text-ash-400 italic">No synopsis available.</p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-4">
                <div className="text-ash-400 text-sm mb-1">Score</div>
                <div className="text-white text-lg font-semibold">
                  {anime.averageScore ? `${(anime.averageScore / 10).toFixed(1)}/10` : 'N/A'}
                </div>
              </div>
              
              <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-4">
                <div className="text-ash-400 text-sm mb-1">Popularity</div>
                <div className="text-white text-lg font-semibold">
                  #{anime.popularity?.toLocaleString() || 'N/A'}
                </div>
              </div>
              
              <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-4">
                <div className="text-ash-400 text-sm mb-1">Favorites</div>
                <div className="text-white text-lg font-semibold">
                  {anime.favourites?.toLocaleString() || 'N/A'}
                </div>
              </div>
              
              <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-4">
                <div className="text-ash-400 text-sm mb-1">Format</div>
                <div className="text-white text-lg font-semibold capitalize">
                  {anime.format.toLowerCase().replace('_', ' ')}
                </div>
              </div>
            </div>

            {/* Main Characters Preview */}
            {mainCharacters.length > 0 && (
              <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">Main Characters</h3>
                  <button 
                    onClick={() => setActiveTab('characters')}
                    className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                  >
                    View All
                  </button>
                </div>
                <CharacterGrid characters={mainCharacters.slice(0, 6)} />
              </div>
            )}

            {/* Tags */}
            {anime.tags && anime.tags.length > 0 && (
              <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {anime.tags
                    .filter(tag => !tag.isMediaSpoiler && tag.rank && tag.rank >= 60)
                    .slice(0, 12)
                    .map((tag) => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs text-ash-200 hover:bg-white/20 transition-colors cursor-default"
                        title={tag.description}
                      >
                        {tag.name} ({tag.rank}%)
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'episodes' && (
          <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Episodes</h3>
            <p className="text-ash-300">Episode listings will be implemented here.</p>
            <div className="mt-4 text-ash-400 text-sm">
              Total Episodes: {anime.episodes || 'Unknown'}
            </div>
          </div>
        )}

        {activeTab === 'characters' && (
          <div className="space-y-6">
            {mainCharacters.length > 0 && (
              <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Main Characters</h3>
                <CharacterGrid characters={mainCharacters} />
              </div>
            )}
            
            {supportingCharacters.length > 0 && (
              <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-white mb-4">Supporting Characters</h3>
                <CharacterGrid characters={supportingCharacters} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Staff</h3>
            <StaffList staff={mainStaff} />
          </div>
        )}

        {activeTab === 'reviews' && (
          <ReviewSection animeId={anime.id.toString()} reviews={anime.reviews.edges} />
        )}
      </motion.div>
    </div>
  );
}