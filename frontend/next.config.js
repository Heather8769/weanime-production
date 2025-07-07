/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['s4.anilist.co'],
  },
  // Removed output: 'export' for proper Netlify SSR deployment
  trailingSlash: true,
};
module.exports = nextConfig;
