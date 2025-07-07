'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRelatedAnime } from '@/lib/hooks/useAnimeDetail';

interface AnimeRecommendationsProps {
  animeId: string;
}

export default function AnimeRecommendations({ animeId }: AnimeRecommendationsProps) {
  const { relations, recommendations } = useRelatedAnime(animeId);

  return (
    <div className="space-y-6">
      {/* Related Anime */}
      {relations.length > 0 && (
        <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Related Anime</h3>
          <div className="space-y-3">
            {relations.slice(0, 6).map((relation, index) => (
              <motion.div
                key={relation.node.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
              >
                <Link 
                  href={`/anime/${relation.node.id}`}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors group"
                >
                  <div className="relative w-12 h-16 flex-shrink-0 rounded overflow-hidden">
                    <Image
                      src={relation.node.coverImage.medium}
                      alt={relation.node.title.romaji}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-anime.jpg';
                      }}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-medium text-white text-sm truncate group-hover:text-purple-300 transition-colors">
                          {relation.node.title.english || relation.node.title.romaji}
                        </h4>
                        <p className="text-xs text-ash-400 capitalize">
                          {relation.relationType.toLowerCase().replace('_', ' ')}
                        </p>
                        <p className="text-xs text-ash-500 capitalize">
                          {relation.node.format.toLowerCase()}
                        </p>
                      </div>
                      
                      {relation.node.meanScore && (
                        <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                          <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs text-ash-400">
                            {(relation.node.meanScore / 10).toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Recommendations</h3>
          <div className="space-y-3">
            {recommendations.slice(0, 8).map((rec, index) => {
              const anime = rec.node.mediaRecommendation;
              
              return (
                <motion.div
                  key={anime.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Link 
                    href={`/anime/${anime.id}`}
                    className="flex items-center space-x-3 p-3 rounded-lg hover:bg-white/10 transition-colors group"
                  >
                    <div className="relative w-12 h-16 flex-shrink-0 rounded overflow-hidden">
                      <Image
                        src={anime.coverImage.medium}
                        alt={anime.title.romaji}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = '/placeholder-anime.jpg';
                        }}
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-white text-sm truncate group-hover:text-purple-300 transition-colors">
                            {anime.title.english || anime.title.romaji}
                          </h4>
                          <p className="text-xs text-ash-500 capitalize">
                            {anime.format.toLowerCase()}
                          </p>
                          {anime.popularity && (
                            <p className="text-xs text-ash-400">
                              #{anime.popularity.toLocaleString()} popularity
                            </p>
                          )}
                        </div>
                        
                        {anime.meanScore && (
                          <div className="flex items-center space-x-1 flex-shrink-0 ml-2">
                            <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            <span className="text-xs text-ash-400">
                              {(anime.meanScore / 10).toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10">
            <button className="w-full text-center text-sm text-purple-400 hover:text-purple-300 transition-colors">
              View More Recommendations
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Stats</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ash-400">Format</span>
            <span className="text-white">TV Series</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ash-400">Status</span>
            <span className="text-white">Finished Airing</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ash-400">Source</span>
            <span className="text-white">Manga</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ash-400">Season</span>
            <span className="text-white">Fall 2023</span>
          </div>
        </div>
      </div>

      {/* Share */}
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Share</h3>
        <div className="flex space-x-3">
          <button className="flex-1 flex items-center justify-center space-x-2 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
            </svg>
            <span>Twitter</span>
          </button>
          
          <button className="flex-1 flex items-center justify-center space-x-2 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            <span>Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  );
}