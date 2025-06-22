/** @type {import('next').NextConfig} */
const nextConfig = {
  // Revolutionary: Use edge runtime for everything
  experimental: {
    runtime: 'edge', // Force edge runtime globally
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },

  // Edge-optimized configuration
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,

  // Webpack configuration for edge compatibility
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Edge-compatible module resolution
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': require('path').resolve(__dirname, 'src'),
    }

    // Remove Node.js specific modules for edge
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    }

    return config
  },

  // Image optimization for edge
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  // Headers remain the same
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.google.com *.jsdelivr.net; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: blob: *.anilist.co *.crunchyroll.com *.myanimelist.net *.googleapis.com *.ytimg.com *.kitsu.app *.kitsu.io; media-src 'self' blob: *.googleapis.com commondatastorage.googleapis.com *.crunchyroll.com; frame-src 'self' *.youtube.com *.googleapis.com; connect-src 'self' *.supabase.co *.anilist.co *.jikan.moe localhost:8000 localhost:8003 localhost:8081 *.jsdelivr.net *.consumet.org *.vercel.app api.consumet.org aniwatch-api.vercel.app *.kitsu.io api.jikan.moe *.googleapis.com commondatastorage.googleapis.com *.crunchyroll.com;",
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig