'use client';

import { motion } from 'framer-motion';
import { useState, useRef } from 'react';
import AnimeCard from './AnimeCard';

interface AnimeCarouselProps {
  title: string;
  animeList: Array<{
    id: string;
    title: string;
    image: string;
    rating: number;
    year: number;
    genres: string[];
    episodes: number;
    status: 'SUB' | 'DUB' | 'BOTH';
    quality: '1080p' | '720p' | '480p';
  }>;
  isLoading?: boolean;
}

export default function AnimeCarousel({ title, animeList, isLoading }: AnimeCarouselProps) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = scrollRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      
      scrollRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1);
    }
  };

  return (
    <section className="py-8">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
      <div className="container mx-auto px-4">
        {/* Section Title */}
        <div className="flex items-center justify-between mb-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              {title}
            </h2>
          </motion.div>
          <button className="text-ash-400 hover:text-white transition-colors text-sm">
            View All
          </button>
        </div>

        {/* Carousel Container */}
        <div className="relative group">
          {/* Left Arrow */}
          <button
            onClick={() => scroll('left')}
            className={`absolute left-0 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 ${
              canScrollLeft ? 'opacity-100' : 'opacity-0'
            }`}
            disabled={!canScrollLeft}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Right Arrow */}
          <button
            onClick={() => scroll('right')}
            className={`absolute right-0 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-all duration-300 ${
              canScrollRight ? 'opacity-100' : 'opacity-0'
            }`}
            disabled={!canScrollRight}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Anime Cards */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex space-x-4 overflow-x-auto scrollbar-hide pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {animeList.map((anime, index) => (
              <div key={anime.id} className="flex-shrink-0 w-48">
                <AnimeCard anime={anime} index={index} />
              </div>
            ))}
          </div>
        </div>
      </div>
      </motion.div>
    </section>
  );
}