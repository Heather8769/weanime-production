#!/bin/bash

# WeAnime Railway Deployment Script
# This script deploys WeAnime to Railway staging/production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STAGING_PROJECT_ID="ebac8f71-9a82-45ab-86a2-02e9351a0ef7"
STAGING_PROJECT_NAME="weanime-staging"

echo -e "${BLUE}🚂 WeAnime Railway Deployment${NC}"
echo "=================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI is not installed${NC}"
    echo -e "${YELLOW}📦 Installing Railway CLI...${NC}"
    npm install -g @railway/cli
fi

# Check if user is logged in
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}🔐 Please login to Railway:${NC}"
    railway login
fi

# Determine deployment environment
ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" = "staging" ]; then
    echo -e "${BLUE}🎯 Deploying to STAGING environment${NC}"
    PROJECT_ID=$STAGING_PROJECT_ID
    PROJECT_NAME=$STAGING_PROJECT_NAME
elif [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${RED}🚀 Deploying to PRODUCTION environment${NC}"
    echo -e "${YELLOW}⚠️  Production deployment not configured yet${NC}"
    exit 1
else
    echo -e "${RED}❌ Invalid environment: $ENVIRONMENT${NC}"
    echo "Usage: $0 [staging|production]"
    exit 1
fi

echo -e "${BLUE}📋 Deployment Details:${NC}"
echo "  Environment: $ENVIRONMENT"
echo "  Project ID: $PROJECT_ID"
echo "  Project Name: $PROJECT_NAME"
echo ""

# Pre-deployment checks
echo -e "${YELLOW}🔍 Running pre-deployment checks...${NC}"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ package.json not found. Are you in the WeAnime root directory?${NC}"
    exit 1
fi

# Check if required files exist
REQUIRED_FILES=("next.config.js" "tailwind.config.js" "tsconfig.json" "src/app")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -e "$file" ]; then
        echo -e "${RED}❌ Required file/directory not found: $file${NC}"
        exit 1
    fi
done

# Type check
echo -e "${YELLOW}🔧 Running TypeScript type check...${NC}"
npm run type-check

# Lint check
echo -e "${YELLOW}🧹 Running ESLint...${NC}"
npm run lint

echo -e "${GREEN}✅ Pre-deployment checks passed${NC}"

# Link to Railway project
echo -e "${YELLOW}🔗 Linking to Railway project...${NC}"
railway link $PROJECT_ID

# Set environment variables
echo -e "${YELLOW}⚙️  Setting environment variables...${NC}"
railway variables set NEXT_PUBLIC_ENABLE_REAL_CRUNCHYROLL=true
railway variables set NEXT_PUBLIC_ENABLE_MOCK_DATA=false
railway variables set NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
railway variables set NEXT_PUBLIC_ENABLE_ERROR_COLLECTION=true
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://zwvilprhyvzwcrhkyhjy.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dmlscHJoeXZ6d2NyaGt5aGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MjQ5MDcsImV4cCI6MjA2NDIwMDkwN30.a311f_FWXppFGTmASz3k7P76ymq1JLJk15oskuII2LA

# Deploy to Railway
echo -e "${BLUE}🚀 Deploying to Railway...${NC}"
railway up

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo "  Environment: $ENVIRONMENT"
echo "  Project: $PROJECT_NAME"
echo "  Status: Deployed"
echo ""
echo -e "${YELLOW}🌐 Your application will be available at:${NC}"
echo "  https://$PROJECT_NAME-production.up.railway.app"
echo ""
echo -e "${BLUE}🔧 Useful commands:${NC}"
echo "  railway logs    - View deployment logs"
echo "  railway status  - Check deployment status"
echo "  railway open    - Open in browser"
echo ""
echo -e "${GREEN}🎉 WeAnime deployment complete!${NC}"
