/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@supabase/supabase-js'],

  // Enable TypeScript checking for production quality
  typescript: {
    ignoreBuildErrors: false,
  },
  // Enable ESLint during build for production quality
  eslint: {
    ignoreDuringBuilds: false,
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
    turbo: {
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's4.anilist.co',
        port: '',
        pathname: '/file/anilistcdn/**',
      },
      {
        protocol: 'https',
        hostname: 'img1.ak.crunchyroll.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.myanimelist.net',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'commondatastorage.googleapis.com',
        port: '',
        pathname: '/gtv-videos-bucket/**',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'archive.org',
        port: '',
        pathname: '/**',
      },

    ],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN', // Changed from DENY to allow iframe embeds within same origin
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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' *.googleapis.com *.google.com *.jsdelivr.net; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: blob: *.anilist.co *.crunchyroll.com *.myanimelist.net *.googleapis.com *.ytimg.com picsum.photos *.kitsu.app *.kitsu.io *.archive.org; media-src 'self' blob: *.googleapis.com commondatastorage.googleapis.com *.consumet.org *.vercel.app *.archive.org archive.org *.sample-videos.com sample-videos.com *.blender.org download.blender.org *.learningcontainer.com learningcontainer.com *.file-examples.com file-examples.com; frame-src 'self' *.youtube.com *.googleapis.com; connect-src 'self' *.supabase.co *.anilist.co *.jikan.moe localhost:8000 localhost:8003 *.jsdelivr.net *.consumet.org *.vercel.app api.consumet.org aniwatch-api.vercel.app *.kitsu.io api.jikan.moe *.googleapis.com commondatastorage.googleapis.com *.archive.org archive.org *.sample-videos.com sample-videos.com *.blender.org download.blender.org *.learningcontainer.com learningcontainer.com *.file-examples.com file-examples.com;",
          },
        ],
      },
    ]
  },

  // Output configuration for Docker
  output: 'standalone',

  // Compression
  compress: true,

  // Power by header
  poweredByHeader: false,

  // React strict mode
  reactStrictMode: true,



  // Trailing slash
  trailingSlash: false,
}

module.exports = nextConfig
