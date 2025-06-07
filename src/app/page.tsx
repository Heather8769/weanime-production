import { HeroSection } from '@/components/hero-section'
import { TrendingSection } from '@/components/trending-section'
import { PopularSection } from '@/components/popular-section'
import { WatchHistory } from '@/components/watch-history'

export default function HomePage() {
  return (
    <div className="space-y-8">
      <HeroSection />
      <div className="container mx-auto px-4 space-y-12">
        <WatchHistory limit={6} />
        <TrendingSection />
        <PopularSection />
      </div>
    </div>
  )
}
