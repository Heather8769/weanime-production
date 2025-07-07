'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

interface HeroSectionProps {
  featuredAnime?: any;
  isLoading?: boolean;
}

export default function HeroSection({ featuredAnime, isLoading }: HeroSectionProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Default/fallback featured anime data
  const defaultFeaturedAnime = {
    title: "Attack on Titan",
    subtitle: "Shingeki no Kyojin",
    description: "When man-eating Titans first appeared 100 years ago, humans found safety behind massive walls that stopped the giants in their tracks. But the safety they have had for so long is threatened when a colossal Titan smashes through the barriers.",
    rating: "9.0",
    year: "2013",
    genres: ["Action", "Drama", "Fantasy"],
    backgroundImage: "https://s4.anilist.co/file/anilistcdn/media/anime/banner/16498-8jpFCOcDmneX.jpg",
    trailerUrl: "/placeholder-video.mp4" // Placeholder for demo
  };

  // Use provided featuredAnime or fallback to default
  const currentAnime = featuredAnime || defaultFeaturedAnime;
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="relative h-screen w-full overflow-hidden bg-ash-900">
        <div className="absolute inset-0 bg-gradient-to-r from-ash-900/90 via-ash-900/60 to-ash-900/30" />
        <div className="relative z-10 h-full flex items-center justify-center">
          <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
            <p className="text-white mt-4 text-center">Loading featured anime...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Video/Image */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${featuredAnime.backgroundImage})`,
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-ash-900/90 via-ash-900/60 to-ash-900/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-ash-900/90 via-transparent to-transparent" />
      </div>

      {/* Hero Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="space-y-6">
              {/* Title */}
              <div>
                <motion.h1
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <h1 className="text-5xl md:text-7xl font-bold text-white mb-2">
                    {featuredAnime.title}
                  </h1>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                >
                  <p className="text-xl text-ash-300 font-medium">
                    {featuredAnime.subtitle}
                  </p>
                </motion.p>
              </div>

              {/* Meta Information */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <div className="flex items-center space-x-4 text-ash-200">
                <div className="flex items-center space-x-1">
                  <svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="font-bold">{featuredAnime.rating}</span>
                </div>
                <span>•</span>
                <span>{featuredAnime.year}</span>
                <span>•</span>
                <div className="flex space-x-2">
                  {featuredAnime.genres.map((genre: string, index: number) => (
                    <span key={index} className="px-2 py-1 glass backdrop-blur-[8px] bg-white/10 rounded-full text-xs">
                      {genre}
                    </span>
                  ))}
                </div>
                </div>
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                <p className="text-ash-200 text-lg leading-relaxed max-w-xl">
                  {featuredAnime.description}
                </p>
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <div className="flex space-x-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <button className="flex items-center space-x-2 bg-white text-ash-900 px-8 py-3 rounded-lg font-bold hover:bg-ash-100 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    <span>Watch Now</span>
                  </button>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <button className="flex items-center space-x-2 glass backdrop-blur-[14px] bg-white/10 border border-white/20 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/20 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Add to List</span>
                  </button>
                </motion.button>
                </div>
              </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
      >
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10">
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <div className="w-1 h-3 bg-white/60 rounded-full mt-2" />
          </div>
        </motion.div>
        </div>
      </motion.div>
    </div>
  );
}