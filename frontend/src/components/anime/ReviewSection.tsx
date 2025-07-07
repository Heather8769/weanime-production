'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';

interface Review {
  node: {
    id: number;
    rating?: number;
    ratingAmount?: number;
    summary?: string;
    body?: string;
    user: {
      id: number;
      name: string;
      avatar: {
        medium: string;
      };
    };
    createdAt: number;
  };
}

interface ReviewSectionProps {
  animeId: string;
  reviews: Review[];
}

export default function ReviewSection({ animeId, reviews }: ReviewSectionProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatRating = (rating?: number) => {
    if (!rating) return null;
    return `${rating}/100`;
  };

  const truncateText = (text: string, maxLength: number = 300) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="space-y-6">
      {/* Reviews Header */}
      <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-white">User Reviews</h3>
          <button className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors">
            Write Review
          </button>
        </div>
        
        {/* Review Stats */}
        <div className="flex items-center space-x-6 text-sm text-ash-300">
          <span>{reviews.length} reviews</span>
          {reviews.length > 0 && (
            <>
              <span>•</span>
              <span>
                Average: {(
                  reviews.reduce((sum, review) => sum + (review.node.rating || 0), 0) / reviews.length
                ).toFixed(1)}/100
              </span>
            </>
          )}
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.slice(0, 10).map((review, index) => (
            <motion.div
              key={review.node.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
              {/* Review Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="relative w-10 h-10">
                    <Image
                      src={review.node.user.avatar.medium}
                      alt={review.node.user.name}
                      fill
                      className="object-cover rounded-full"
                      onError={(e) => {
                        e.currentTarget.src = '/placeholder-avatar.jpg';
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm">
                      {review.node.user.name}
                    </h4>
                    <p className="text-xs text-ash-400">
                      {formatDate(review.node.createdAt)}
                    </p>
                  </div>
                </div>
                
                {review.node.rating && (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-white font-medium text-sm">
                        {formatRating(review.node.rating)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Review Content */}
              <div className="space-y-3">
                {review.node.summary && (
                  <h5 className="font-medium text-white">
                    {review.node.summary}
                  </h5>
                )}
                
                {review.node.body && (
                  <div 
                    className="text-ash-300 text-sm leading-relaxed prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: truncateText(
                        review.node.body
                          .replace(/<br>/g, '<br/>')
                          .replace(/\n/g, '<br/>')
                      )
                    }}
                  />
                )}
              </div>

              {/* Review Actions */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                <div className="flex items-center space-x-4">
                  <button className="flex items-center space-x-1 text-ash-400 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                    <span className="text-sm">Helpful</span>
                  </button>
                  
                  <button className="flex items-center space-x-1 text-ash-400 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="text-sm">Reply</span>
                  </button>
                </div>
                
                <button className="text-ash-400 hover:text-white transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
              </div>
              </div>
            </motion.div>
          ))}
          
          {reviews.length > 10 && (
            <div className="text-center">
              <button className="px-6 py-2 glass backdrop-blur-[14px] bg-white/10 border border-white/20 text-ash-200 hover:text-white hover:bg-white/20 rounded-lg transition-all">
                Load More Reviews
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-ash-700 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-ash-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h4 className="text-lg font-medium text-white mb-2">No Reviews Yet</h4>
          <p className="text-ash-400 mb-4">Be the first to share your thoughts about this anime!</p>
          <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors">
            Write First Review
          </button>
        </div>
      )}
    </div>
  );
}