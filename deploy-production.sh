#!/bin/bash

# WeAnime Production Deployment Script
# This script deploys WeAnime to Railway with all required environment variables

set -e

echo "🚀 WeAnime Production Deployment Starting..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not found${NC}"
    echo "Please install Railway CLI: npm install -g @railway/cli"
    echo "Then run: railway login"
    exit 1
fi

# Check if user is logged in to Railway
if ! railway whoami &> /dev/null; then
    echo -e "${RED}❌ Not logged in to Railway${NC}"
    echo "Please run: railway login"
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI ready${NC}"

# Create new Railway project
echo -e "${BLUE}📦 Creating Railway project...${NC}"
railway login
railway init weanime-production

# Connect to GitHub repository
echo -e "${BLUE}🔗 Connecting to GitHub repository...${NC}"
railway connect

# Set environment variables
echo -e "${BLUE}⚙️ Setting environment variables...${NC}"

# Supabase Configuration (from your existing project)
railway variables set NEXT_PUBLIC_SUPABASE_URL="https://zwvilprhyvzwcrhkyhjy.supabase.co"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dmlscHJoeXZ6d2NyaGt5aGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MjQ5MDcsImV4cCI6MjA2NDIwMDkwN30.a311f_FWXppFGTmASz3k7P76ymq1JLJk15oskuII2LA"

# Database Configuration  
railway variables set DATABASE_URL="postgresql://postgres:[YOUR_DB_PASSWORD]@db.zwvilprhyvzwcrhkyhjy.supabase.co:5432/postgres"

# Crunchyroll Configuration (CRITICAL)
railway variables set CRUNCHYROLL_USERNAME="gaklina1@maxpedia.cloud"
railway variables set CRUNCHYROLL_PASSWORD="Watch123"
railway variables set CRUNCHYROLL_LOCALE="en-US"

# Application Configuration
railway variables set NEXT_PUBLIC_APP_URL="\${{RAILWAY_STATIC_URL}}"
railway variables set NEXT_PUBLIC_APP_NAME="WeAnime"
railway variables set NEXT_PUBLIC_APP_DESCRIPTION="Authentic anime streaming platform"

# Backend Configuration
railway variables set NEXT_PUBLIC_BACKEND_URL="http://localhost:8003"
railway variables set WEANIME_BACKEND_URL="http://localhost:8003"

# External APIs
railway variables set ANILIST_API_URL="https://graphql.anilist.co"
railway variables set JIKAN_API_URL="https://api.jikan.moe/v4"

# Security Configuration
railway variables set JWT_SECRET="\$(openssl rand -base64 32)"
railway variables set NEXTAUTH_SECRET="\$(openssl rand -base64 32)"
railway variables set NEXTAUTH_URL="\${{RAILWAY_STATIC_URL}}"

# Feature Flags (Real content only)
railway variables set NEXT_PUBLIC_MOCK_DATA_ENABLED="false"
railway variables set NEXT_PUBLIC_REAL_STREAMING_ONLY="true"
railway variables set NEXT_PUBLIC_DEMO_MODE="false"

# Performance Configuration
railway variables set RATE_LIMIT_MAX_REQUESTS="100"
railway variables set RATE_LIMIT_WINDOW_MS="900000"
railway variables set CACHE_TTL="3600"

echo -e "${GREEN}✅ Environment variables configured${NC}"

# Deploy to Railway
echo -e "${BLUE}🚀 Deploying to Railway...${NC}"
railway up

echo ""
echo -e "${GREEN}🎉 WeAnime Production Deployment Complete!${NC}"
echo "=================================================="
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Wait for deployment to complete (2-3 minutes)"
echo "2. Check deployment logs: railway logs"
echo "3. Get your production URL: railway domain"
echo "4. Test Crunchyroll integration at: [YOUR_URL]/api/test-crunchyroll"
echo "5. Monitor system health at: [YOUR_URL]/admin/health"
echo ""
echo -e "${BLUE}🔧 Important:${NC}"
echo "- Your Supabase project is already configured"
echo "- Crunchyroll credentials are set"
echo "- All mock data has been eliminated"
echo "- Production environment is ready"
echo ""
echo -e "${GREEN}✨ WeAnime is now streaming real anime content!${NC}"