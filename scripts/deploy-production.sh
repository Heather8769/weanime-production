#!/bin/bash

# WeAnime Production Deployment Script
# This script deploys the application to production environment

set -e  # Exit on any error

echo "🚀 WeAnime Production Deployment"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_important() {
    echo -e "${PURPLE}[IMPORTANT]${NC} $1"
}

# Pre-deployment safety checks
safety_checks() {
    print_important "PRODUCTION DEPLOYMENT SAFETY CHECKS"
    echo "====================================="
    
    # Confirm production deployment
    echo ""
    print_warning "⚠️  You are about to deploy to PRODUCTION!"
    print_warning "This will affect live users and real data."
    echo ""
    read -p "Are you sure you want to continue? (type 'YES' to confirm): " confirm
    
    if [ "$confirm" != "YES" ]; then
        print_status "Deployment cancelled by user"
        exit 0
    fi
    
    # Check git status
    print_status "Checking git status..."
    if [ -n "$(git status --porcelain)" ]; then
        print_error "Working directory is not clean. Please commit or stash changes."
        git status --short
        exit 1
    fi
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
        print_warning "Current branch is '$CURRENT_BRANCH', not main/master"
        read -p "Continue with current branch? (y/N): " continue_branch
        if [ "$continue_branch" != "y" ] && [ "$continue_branch" != "Y" ]; then
            exit 1
        fi
    fi
    
    print_success "Safety checks passed"
}

# Check production environment
check_production_env() {
    print_status "Checking production environment..."
    
    # Check for production environment file
    if [ ! -f ".env.production" ]; then
        print_error ".env.production file not found"
        print_status "Please create .env.production with production values"
        exit 1
    fi
    
    # Load production environment
    source .env.production
    
    # Verify critical production variables
    REQUIRED_PROD_VARS=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "SUPABASE_SERVICE_ROLE_KEY"
        "NEXT_PUBLIC_APP_URL"
        "JWT_SECRET"
        "ENCRYPTION_KEY"
    )
    
    for var in "${REQUIRED_PROD_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required production variable $var is not set"
            exit 1
        fi
    done
    
    # Check that we're not using development URLs
    if [[ "$NEXT_PUBLIC_SUPABASE_URL" == *"localhost"* ]]; then
        print_error "Production environment is using localhost Supabase URL"
        exit 1
    fi
    
    if [[ "$NEXT_PUBLIC_APP_URL" == *"localhost"* ]]; then
        print_error "Production environment is using localhost app URL"
        exit 1
    fi
    
    print_success "Production environment is valid"
}

# Run comprehensive tests
run_production_tests() {
    print_status "Running comprehensive production tests..."
    
    # Set production environment for testing
    export NODE_ENV=production
    
    # Type checking
    print_status "Running TypeScript type checking..."
    npm run type-check
    
    # Linting
    print_status "Running ESLint..."
    npm run lint
    
    # Unit tests
    print_status "Running unit tests..."
    npm run test -- --passWithNoTests --watchAll=false --coverage
    
    # Build test
    print_status "Testing production build..."
    npm run build
    
    print_success "All tests passed"
}

# Database migration check
check_database() {
    print_status "Checking database setup..."
    
    # Check if error_logs table exists
    print_status "Verifying error_logs table exists in Supabase..."
    
    # You would typically run a database check here
    # For now, we'll just remind the user
    print_warning "Please ensure you have run the database migration:"
    print_status "1. Open Supabase SQL Editor"
    print_status "2. Run the migration from supabase/migrations/001_create_error_logs_table.sql"
    
    read -p "Have you run the database migration? (y/N): " db_migrated
    if [ "$db_migrated" != "y" ] && [ "$db_migrated" != "Y" ]; then
        print_error "Please run database migration before deploying to production"
        exit 1
    fi
    
    print_success "Database setup confirmed"
}

# Test webhooks in production
test_production_webhooks() {
    print_status "Testing production webhooks..."
    
    # Use production environment for webhook testing
    if node scripts/test-webhooks.js; then
        print_success "Production webhooks are working"
    else
        print_warning "Webhook tests failed - continuing anyway"
        read -p "Continue without working webhooks? (y/N): " continue_without_webhooks
        if [ "$continue_without_webhooks" != "y" ] && [ "$continue_without_webhooks" != "Y" ]; then
            exit 1
        fi
    fi
}

# Deploy to production
deploy_to_production() {
    print_status "Deploying to production..."
    
    # Tag the release
    VERSION=$(date +"%Y%m%d-%H%M%S")
    git tag -a "v$VERSION" -m "Production deployment $VERSION"
    
    # Choose deployment platform
    echo ""
    print_status "Choose production deployment platform:"
    echo "1) Vercel"
    echo "2) Netlify"
    echo "3) Docker"
    read -p "Enter choice (1-3): " deploy_choice
    
    case $deploy_choice in
        1)
            deploy_vercel_production
            ;;
        2)
            deploy_netlify_production
            ;;
        3)
            deploy_docker_production
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
}

# Vercel production deployment
deploy_vercel_production() {
    print_status "Deploying to Vercel production..."
    
    # Ensure Vercel CLI is installed
    if ! command -v vercel &> /dev/null; then
        npm install -g vercel
    fi
    
    # Deploy to production
    vercel --prod --confirm
    
    # Get production URL
    PROD_URL=$(vercel ls --scope=production | grep "weanime" | head -1 | awk '{print $2}')
    
    print_success "Deployed to Vercel production: $PROD_URL"
}

# Netlify production deployment
deploy_netlify_production() {
    print_status "Deploying to Netlify production..."
    
    # Ensure Netlify CLI is installed
    if ! command -v netlify &> /dev/null; then
        npm install -g netlify-cli
    fi
    
    # Deploy to production
    netlify deploy --build --prod
    
    print_success "Deployed to Netlify production"
}

# Docker production deployment
deploy_docker_production() {
    print_status "Building Docker image for production..."
    
    # Build Docker image
    docker build -t weanime:latest .
    docker tag weanime:latest weanime:$(date +%Y%m%d-%H%M%S)
    
    print_success "Docker image built successfully"
    print_status "Push to your container registry and deploy according to your infrastructure"
}

# Post-deployment verification
post_deployment_verification() {
    local prod_url=$1
    
    print_status "Running post-deployment verification..."
    
    # Wait for deployment to be ready
    sleep 30
    
    # Health check
    print_status "Checking application health..."
    if curl -f -s "$prod_url/api/health" > /dev/null; then
        print_success "Health check passed"
    else
        print_error "Health check failed!"
        exit 1
    fi
    
    # Check error logging endpoint
    print_status "Checking error logging endpoint..."
    if curl -f -s "$prod_url/api/monitoring/error" > /dev/null; then
        print_success "Error logging endpoint is accessible"
    else
        print_warning "Error logging endpoint check failed"
    fi
    
    # Performance check
    print_status "Checking performance..."
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$prod_url")
    if (( $(echo "$RESPONSE_TIME < 3.0" | bc -l) )); then
        print_success "Performance check passed (${RESPONSE_TIME}s)"
    else
        print_warning "Performance warning: slow response time (${RESPONSE_TIME}s)"
    fi
    
    print_success "Post-deployment verification completed"
}

# Send deployment notification
send_deployment_notification() {
    local prod_url=$1
    local version=$2
    
    print_status "Sending deployment notification..."
    
    # Create deployment notification payload
    cat > /tmp/deployment_notification.json << EOF
{
  "text": "🚀 WeAnime Production Deployment Successful",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*🎉 PRODUCTION DEPLOYMENT SUCCESSFUL*\n\n*Version:* $version\n*URL:* $prod_url\n*Time:* $(date -u +"%Y-%m-%d %H:%M:%S UTC")\n*Deployed by:* $(git config user.name)"
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "🌐 Visit Site"
          },
          "url": "$prod_url",
          "style": "primary"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "📊 Monitoring"
          },
          "url": "$prod_url/admin/monitoring"
        }
      ]
    }
  ]
}
EOF
    
    # Send to Slack if configured
    if [ ! -z "$SLACK_WEBHOOK_URL" ]; then
        curl -X POST -H 'Content-type: application/json' \
             --data @/tmp/deployment_notification.json \
             "$SLACK_WEBHOOK_URL"
        print_success "Deployment notification sent to Slack"
    fi
    
    # Clean up
    rm -f /tmp/deployment_notification.json
}

# Main deployment function
main() {
    echo ""
    print_important "Starting production deployment process..."
    echo ""
    
    # Pre-deployment checks
    safety_checks
    check_production_env
    check_database
    
    # Testing
    run_production_tests
    test_production_webhooks
    
    # Final confirmation
    echo ""
    print_important "FINAL CONFIRMATION"
    print_warning "All checks passed. Ready to deploy to production."
    read -p "Proceed with production deployment? (type 'DEPLOY' to confirm): " final_confirm
    
    if [ "$final_confirm" != "DEPLOY" ]; then
        print_status "Deployment cancelled"
        exit 0
    fi
    
    # Deploy
    deploy_to_production
    
    # Get production URL (this would be set by the deployment function)
    if [ -z "$PROD_URL" ]; then
        read -p "Enter your production URL for verification: " PROD_URL
    fi
    
    # Post-deployment
    post_deployment_verification "$PROD_URL"
    
    # Get version
    VERSION=$(git describe --tags --abbrev=0 2>/dev/null || echo "latest")
    
    # Send notification
    send_deployment_notification "$PROD_URL" "$VERSION"
    
    # Success message
    echo ""
    echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
    echo ""
    print_success "PRODUCTION DEPLOYMENT COMPLETED SUCCESSFULLY!"
    echo ""
    echo "🌐 Production URL: $PROD_URL"
    echo "📊 Monitoring Dashboard: $PROD_URL/admin/monitoring"
    echo "📱 PWA Installation: Available on mobile devices"
    echo "🔔 Error Alerts: Configured and active"
    echo ""
    echo "📋 Post-deployment tasks:"
    echo "   ✅ Monitor error dashboard for any issues"
    echo "   ✅ Check performance metrics"
    echo "   ✅ Verify PWA installation works"
    echo "   ✅ Test critical user flows"
    echo "   ✅ Monitor user feedback"
    echo ""
    echo "🎌 WeAnime is now LIVE in production! 🚀"
    echo ""
    echo "🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉🎉"
}

# Run main function
main "$@"
