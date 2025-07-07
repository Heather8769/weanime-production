'use client';

import { useParams } from 'next/navigation';
import { useAnimeDetail } from '@/lib/hooks/useAnimeDetail';
import { useAuth } from '@/lib/hooks/useAuth';
import AnimeHeader from '@/components/anime/AnimeHeader';
import AnimeInfo from '@/components/anime/AnimeInfo';
import AnimeRecommendations from '@/components/anime/AnimeRecommendations';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ErrorMessage from '@/components/ui/ErrorMessage';

export default function AnimeDetailPage() {
  const params = useParams();
  const animeId = params.id as string;
  const { user } = useAuth();
  
  const { 
    data: anime, 
    isLoading, 
    error 
  } = useAnimeDetail(animeId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ash-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-ash-900 flex items-center justify-center">
        <ErrorMessage 
          title="Anime Not Found"
          message="The anime you're looking for could not be found."
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ash-900">
      {/* Hero Section */}
      <AnimeHeader anime={anime} />
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Information */}
          <div className="lg:col-span-2">
            <AnimeInfo anime={anime} />
          </div>
          
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <AnimeRecommendations animeId={animeId} />
          </div>
        </div>
      </div>
    </div>
  );
}