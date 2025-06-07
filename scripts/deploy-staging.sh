#!/bin/bash

# WeAnime Staging Deployment Script
# This script deploys the application to staging environment for final testing

set -e  # Exit on any error

echo "🚀 WeAnime Staging Deployment Started"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    # Check Node.js version (requires Node 18+)
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or higher is required (current: $(node -v))"
        exit 1
    fi
    
    print_success "All dependencies are available"
}

# Check environment configuration
check_environment() {
    print_status "Checking environment configuration..."
    
    if [ ! -f ".env.local" ]; then
        print_warning ".env.local file not found"
        print_status "Creating .env.local from template..."
        
        if [ -f ".env.production.template" ]; then
            cp .env.production.template .env.local
            print_warning "Please update .env.local with your actual values before proceeding"
            exit 1
        else
            print_error "No environment template found"
            exit 1
        fi
    fi
    
    # Check required environment variables
    source .env.local
    
    REQUIRED_VARS=(
        "NEXT_PUBLIC_SUPABASE_URL"
        "NEXT_PUBLIC_SUPABASE_ANON_KEY"
        "NEXT_PUBLIC_APP_URL"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    print_success "Environment configuration is valid"
}

# Run tests
run_tests() {
    print_status "Running tests..."
    
    # Type checking
    print_status "Running TypeScript type checking..."
    if npm run type-check; then
        print_success "Type checking passed"
    else
        print_error "Type checking failed"
        exit 1
    fi
    
    # Linting
    print_status "Running ESLint..."
    if npm run lint; then
        print_success "Linting passed"
    else
        print_warning "Linting issues found, but continuing..."
    fi
    
    # Unit tests (if available)
    if npm run test -- --passWithNoTests --watchAll=false; then
        print_success "Tests passed"
    else
        print_warning "Some tests failed, but continuing..."
    fi
}

# Build the application
build_application() {
    print_status "Building application..."
    
    # Clean previous build
    if [ -d ".next" ]; then
        rm -rf .next
        print_status "Cleaned previous build"
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    npm ci
    
    # Build
    print_status "Building for production..."
    if npm run build; then
        print_success "Build completed successfully"
    else
        print_error "Build failed"
        exit 1
    fi
}

# Test webhooks
test_webhooks() {
    print_status "Testing webhook integrations..."
    
    if node scripts/test-webhooks.js; then
        print_success "Webhook tests passed"
    else
        print_warning "Webhook tests failed - alerts may not work properly"
    fi
}

# Deploy to Vercel (staging)
deploy_vercel_staging() {
    print_status "Deploying to Vercel staging..."
    
    if ! command -v vercel &> /dev/null; then
        print_status "Installing Vercel CLI..."
        npm install -g vercel
    fi
    
    # Deploy to staging
    print_status "Deploying to staging environment..."
    vercel --prod=false --confirm
    
    print_success "Deployed to Vercel staging"
}

# Deploy to Netlify (staging)
deploy_netlify_staging() {
    print_status "Deploying to Netlify staging..."
    
    if ! command -v netlify &> /dev/null; then
        print_status "Installing Netlify CLI..."
        npm install -g netlify-cli
    fi
    
    # Deploy to staging
    print_status "Deploying to staging environment..."
    netlify deploy --build --context=deploy-preview
    
    print_success "Deployed to Netlify staging"
}

# Health check
health_check() {
    local url=$1
    print_status "Running health check on $url..."
    
    # Wait for deployment to be ready
    sleep 10
    
    # Check if the site is responding
    if curl -f -s "$url/api/health" > /dev/null; then
        print_success "Health check passed"
        return 0
    else
        print_error "Health check failed"
        return 1
    fi
}

# Performance test
performance_test() {
    local url=$1
    print_status "Running basic performance test..."
    
    # Simple performance check using curl
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$url")
    
    if (( $(echo "$RESPONSE_TIME < 3.0" | bc -l) )); then
        print_success "Performance test passed (${RESPONSE_TIME}s)"
    else
        print_warning "Performance test warning: slow response time (${RESPONSE_TIME}s)"
    fi
}

# Main deployment function
main() {
    echo "Starting staging deployment process..."
    echo ""
    
    # Pre-deployment checks
    check_dependencies
    check_environment
    
    # Build and test
    run_tests
    build_application
    test_webhooks
    
    # Choose deployment platform
    echo ""
    print_status "Choose deployment platform:"
    echo "1) Vercel"
    echo "2) Netlify"
    echo "3) Skip deployment (build only)"
    read -p "Enter choice (1-3): " choice
    
    case $choice in
        1)
            deploy_vercel_staging
            STAGING_URL=$(vercel ls | grep "weanime" | head -1 | awk '{print $2}')
            ;;
        2)
            deploy_netlify_staging
            STAGING_URL="https://deploy-preview--your-site.netlify.app"
            ;;
        3)
            print_status "Skipping deployment"
            exit 0
            ;;
        *)
            print_error "Invalid choice"
            exit 1
            ;;
    esac
    
    # Post-deployment tests
    if [ ! -z "$STAGING_URL" ]; then
        health_check "$STAGING_URL"
        performance_test "$STAGING_URL"
        
        echo ""
        print_success "Staging deployment completed successfully!"
        echo ""
        echo "🔗 Staging URL: $STAGING_URL"
        echo "📊 Monitoring: $STAGING_URL/admin/monitoring"
        echo "🧪 Test the following:"
        echo "   - Homepage loads correctly"
        echo "   - Video player functionality"
        echo "   - Search and browse features"
        echo "   - Error logging (check monitoring dashboard)"
        echo "   - PWA installation prompt"
        echo "   - Mobile responsiveness"
        echo ""
        echo "📋 Next steps:"
        echo "   1. Perform manual testing on staging"
        echo "   2. Verify error alerts are working"
        echo "   3. Test PWA installation"
        echo "   4. Check performance metrics"
        echo "   5. If all tests pass, proceed to production deployment"
    fi
}

# Run main function
main "$@"
