'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { AnimeDetail, formatAirDate, formatDuration, formatScore, getStudioNames } from '@/lib/anilist-extended';
import { useAnimeBookmark, useContinueWatching } from '@/lib/hooks/useAnimeDetail';
import AnimeActions from './AnimeActions';

interface AnimeHeaderProps {
  anime: AnimeDetail;
}

export default function AnimeHeader({ anime }: AnimeHeaderProps) {
  const { data: bookmark } = useAnimeBookmark(anime.id.toString());
  const continueWatching = useContinueWatching(anime.id.toString());

  const studios = getStudioNames(anime.studios);
  const airDate = formatAirDate(anime.startDate, anime.endDate);
  const duration = formatDuration(anime.duration);
  const score = formatScore(anime.averageScore);

  return (
    <div className="relative h-[500px] md:h-[600px] overflow-hidden">
      {/* Background Banner */}
      {anime.bannerImage && (
        <div className="absolute inset-0">
          <Image
            src={anime.bannerImage}
            alt={anime.title.romaji}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ash-900 via-ash-900/60 to-ash-900/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-ash-900/80 via-transparent to-ash-900/40" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex items-end pb-8">
        <div className="flex flex-col md:flex-row items-start md:items-end space-y-6 md:space-y-0 md:space-x-8 w-full">
          {/* Cover Image */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex-shrink-0">
              <div className="w-48 h-72 md:w-56 md:h-80 relative rounded-lg overflow-hidden shadow-2xl">
                <Image
                  src={anime.coverImage.large}
                  alt={anime.title.romaji}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="flex-1 min-w-0">
            {/* Title */}
            <div className="mb-4">
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 leading-tight">
                {anime.title.english || anime.title.romaji}
              </h1>
              {anime.title.english && anime.title.romaji !== anime.title.english && (
                <h2 className="text-lg md:text-xl text-ash-300 font-medium">
                  {anime.title.romaji}
                </h2>
              )}
              {anime.title.native && (
                <h3 className="text-md text-ash-400">
                  {anime.title.native}
                </h3>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-ash-300 mb-4">
              <span className="flex items-center space-x-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>{score}</span>
              </span>
              
              <span>•</span>
              
              <span>{airDate}</span>
              
              {anime.episodes && (
                <>
                  <span>•</span>
                  <span>{anime.episodes} episodes</span>
                </>
              )}
              
              {anime.duration && (
                <>
                  <span>•</span>
                  <span>{duration}</span>
                </>
              )}
              
              <span>•</span>
              
              <span className="capitalize">{anime.status.toLowerCase().replace('_', ' ')}</span>
            </div>

            {/* Studios */}
            {studios.length > 0 && (
              <div className="flex items-center space-x-2 text-sm text-ash-400 mb-4">
                <span>Studio:</span>
                <span className="text-ash-200">{studios.join(', ')}</span>
              </div>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-2 mb-6">
              {anime.genres.slice(0, 6).map((genre) => (
                <span
                  key={genre}
                  className="px-3 py-1 bg-white/10 border border-white/20 rounded-full text-xs text-ash-200"
                >
                  {genre}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <AnimeActions 
              anime={anime} 
              bookmark={bookmark}
              continueWatching={continueWatching}
            />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Trailer Button */}
      {anime.trailer && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          <button className="absolute top-4 right-4 z-20 p-3 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-full hover:bg-white/20 transition-colors">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </button>
        </motion.div>
      )}
    </div>
  );
}