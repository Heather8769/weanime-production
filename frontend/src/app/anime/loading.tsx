export default function AnimeLoading() {
  return (
    <div className="min-h-screen bg-ash-900">
      {/* Hero Section Skeleton */}
      <div className="relative h-[500px] bg-gradient-to-t from-ash-900 via-ash-800/50 to-ash-700">
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 h-full flex items-end pb-8">
          <div className="flex items-end space-x-6">
            {/* Cover Image Skeleton */}
            <div className="w-48 h-72 bg-ash-700 rounded-lg animate-pulse" />
            
            {/* Info Skeleton */}
            <div className="flex-1 space-y-4">
              <div className="h-12 bg-ash-700 rounded animate-pulse w-2/3" />
              <div className="h-6 bg-ash-700 rounded animate-pulse w-1/2" />
              <div className="h-4 bg-ash-700 rounded animate-pulse w-1/3" />
              
              {/* Action Buttons Skeleton */}
              <div className="flex space-x-4 pt-4">
                <div className="h-12 w-32 bg-ash-700 rounded-lg animate-pulse" />
                <div className="h-12 w-32 bg-ash-700 rounded-lg animate-pulse" />
                <div className="h-12 w-12 bg-ash-700 rounded-lg animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content Skeleton */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Skeleton */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs Skeleton */}
            <div className="flex space-x-6 border-b border-white/10">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 w-24 bg-ash-700 rounded animate-pulse" />
              ))}
            </div>
            
            {/* Content Skeleton */}
            <div className="space-y-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-4 bg-ash-700 rounded animate-pulse" />
              ))}
            </div>
          </div>
          
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1 space-y-6">
            <div className="glass backdrop-blur-[14px] bg-white/10 border border-white/20 rounded-lg p-6">
              <div className="h-6 bg-ash-700 rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-4 bg-ash-700 rounded animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}