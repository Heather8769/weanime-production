#!/bin/bash

# WeAnime Production Deployment to Railway
# Automated deployment script using multiple MCP servers

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 WeAnime Production Deployment to Railway${NC}"
echo -e "${BLUE}================================================${NC}"

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}⚠️  Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
fi

# Login to Railway (if not already logged in)
echo -e "${BLUE}🔐 Checking Railway authentication...${NC}"
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to Railway:${NC}"
    railway login
fi

# Create new Railway project
echo -e "${BLUE}📦 Creating Railway project...${NC}"
railway project create weanime-production

# Link to GitHub repository
echo -e "${BLUE}🔗 Linking GitHub repository...${NC}"
railway connect Heather8769/weanime-production

# Set environment variables
echo -e "${BLUE}⚙️  Setting environment variables...${NC}"

# Supabase Configuration
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://zwvilprhyvzwcrhkyhjy.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dmlscHJoeXZ6d2NyaGt5aGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MjQ5MDcsImV4cCI6MjA2NDIwMDkwN30.a311f_FWXppFGTmASz3k7P76ymq1JLJk15oskuII2LA

# Crunchyroll Integration (REAL CREDENTIALS)
railway variables set CRUNCHYROLL_EMAIL=gaklina1@maxpedia.cloud
railway variables set CRUNCHYROLL_PASSWORD=Watch123
railway variables set NEXT_PUBLIC_ENABLE_REAL_CRUNCHYROLL=true
railway variables set NEXT_PUBLIC_ENABLE_MOCK_DATA=false
railway variables set NEXT_PUBLIC_DEMO_MODE=false
railway variables set NEXT_PUBLIC_REAL_STREAMING_ONLY=true

# Security
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set ENCRYPTION_KEY=$(openssl rand -base64 32)

# API Configuration
railway variables set ANILIST_API_URL=https://graphql.anilist.co
railway variables set JIKAN_API_URL=https://api.jikan.moe/v4

# Features
railway variables set NEXT_PUBLIC_ENABLE_COMMENTS=true
railway variables set NEXT_PUBLIC_ENABLE_RATINGS=true
railway variables set NEXT_PUBLIC_ENABLE_SOCIAL_FEATURES=true

# Production Settings
railway variables set NODE_ENV=production
railway variables set NEXT_TELEMETRY_DISABLED=1

echo -e "${BLUE}🏗️  Deploying application...${NC}"
railway up

echo -e "${GREEN}✅ Deployment initiated!${NC}"
echo -e "${BLUE}📊 Checking deployment status...${NC}"

# Wait for deployment to complete
sleep 30

# Get deployment URL
DEPLOYMENT_URL=$(railway domain)
echo -e "${GREEN}🌐 Application deployed at: ${DEPLOYMENT_URL}${NC}"

# Run health checks
echo -e "${BLUE}🔍 Running health checks...${NC}"
curl -f "${DEPLOYMENT_URL}/api/health" || echo -e "${YELLOW}⚠️  Health check failed - check logs${NC}"

echo -e "${GREEN}🎉 WeAnime production deployment complete!${NC}"
echo -e "${BLUE}📱 Access your app at: ${DEPLOYMENT_URL}${NC}"