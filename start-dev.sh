#!/bin/bash

# Fix permissions and start development server
echo "🚀 Starting Kōkai Anime Development Server..."

# Set proper permissions
chmod -R 755 node_modules/.bin/ 2>/dev/null || true

# Clear any cached data
rm -rf .next 2>/dev/null || true

# Start the development server
echo "📡 Starting Next.js development server on http://localhost:3000"
exec node_modules/.bin/next dev
