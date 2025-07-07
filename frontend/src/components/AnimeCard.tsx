'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface AnimeCardProps {
  anime: {
    id: string;
    title: string;
    image: string;
    rating: number;
    year: number;
    genres: string[];
    episodes: number;
    status: 'SUB' | 'DUB' | 'BOTH';
    quality: '1080p' | '720p' | '480p';
  };
  index: number;
}

export default function AnimeCard({ anime, index }: AnimeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  return (
    <Link href={`/anime/${anime.id}`}>
      <div
        className="relative group cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
        {/* Card Container */}
        <div className="relative overflow-hidden rounded-lg aspect-[3/4] bg-ash-800">
          {/* Anime Poster */}
          <div className="relative w-full h-full">
            <img
              src={anime.image}
              alt={anime.title}
              className={`w-full h-full object-cover transition-all duration-300 ${
                isHovered ? 'scale-110' : 'scale-100'
              } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
            />
            
            {/* Loading Skeleton */}
            {!imageLoaded && (
              <div className="absolute inset-0 bg-ash-700 animate-pulse" />
            )}
          </div>

          {/* Badges */}
          <div className="absolute top-2 left-2 flex flex-col space-y-1">
            <div className="flex space-x-1">
              {anime.status === 'BOTH' ? (
                <>
                  <span className="px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded">
                    SUB
                  </span>
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                    DUB
                  </span>
                </>
              ) : (
                <span className={`px-2 py-1 text-white text-xs font-bold rounded ${
                  anime.status === 'SUB' ? 'bg-blue-500' : 'bg-green-500'
                }`}>
                  {anime.status}
                </span>
              )}
            </div>
            <span className="px-2 py-1 bg-purple-500 text-white text-xs font-bold rounded">
              {anime.quality}
            </span>
          </div>

          {/* Rating Badge */}
          <div className="absolute top-2 right-2">
            <div className="flex items-center space-x-1 glass backdrop-blur-[8px] bg-black/30 px-2 py-1 rounded">
              <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-white text-xs font-bold">
                {anime.rating.toFixed(1)}
              </span>
            </div>
          </div>

          {/* Hover Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`} />

          {/* Hover Content */}
          <div className={`absolute bottom-0 left-0 right-0 p-4 text-white transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
          }`}>
            <h3 className="font-bold text-sm mb-2 line-clamp-2">
              {anime.title}
            </h3>
            <div className="flex items-center justify-between text-xs text-ash-300 mb-2">
              <span>{anime.year}</span>
              <span>{anime.episodes} Episodes</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {anime.genres.slice(0, 2).map((genre, i) => (
                <span
                  key={i}
                  className="px-2 py-1 glass backdrop-blur-[8px] bg-white/10 rounded-full text-xs"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          {/* Play Button */}
          <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
            isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-[8px] rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        </motion.div>
      </div>
    </Link>
  );
}