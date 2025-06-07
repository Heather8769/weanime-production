#!/bin/bash

# WeAnime Deployment Script
# This script handles the deployment process for the WeAnime application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="weanime"
DOCKER_IMAGE_NAME="weanime"
DOCKER_TAG="latest"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed. Please install Node.js 20.19.2 or later."
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2)
    REQUIRED_VERSION="20.19.2"
    
    if ! printf '%s\n%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V -C; then
        log_warning "Node.js version $NODE_VERSION detected. Recommended version is $REQUIRED_VERSION or later."
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed. Please install npm."
        exit 1
    fi
    
    # Check if Docker is installed (for Docker deployment)
    if ! command -v docker &> /dev/null; then
        log_warning "Docker is not installed. Docker deployment will not be available."
    fi
    
    log_success "Dependencies check completed."
}

install_dependencies() {
    log_info "Installing dependencies..."
    npm ci
    log_success "Dependencies installed successfully."
}

run_tests() {
    log_info "Running tests..."
    npm run lint
    npm run type-check
    
    if command -v npm run test &> /dev/null; then
        npm run test -- --watchAll=false --coverage
    else
        log_warning "Tests not configured. Skipping test execution."
    fi
    
    log_success "Tests completed successfully."
}

build_application() {
    log_info "Building application..."
    npm run build
    log_success "Application built successfully."
}

deploy_vercel() {
    log_info "Deploying to Vercel..."
    
    if ! command -v vercel &> /dev/null; then
        log_error "Vercel CLI is not installed. Please install it with: npm i -g vercel"
        exit 1
    fi
    
    vercel --prod
    log_success "Deployed to Vercel successfully."
}

deploy_railway() {
    log_info "Deploying to Railway..."
    
    if ! command -v railway &> /dev/null; then
        log_error "Railway CLI is not installed. Please install it from: https://railway.app/cli"
        exit 1
    fi
    
    railway up
    log_success "Deployed to Railway successfully."
}

deploy_docker() {
    log_info "Building Docker image..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker."
        exit 1
    fi
    
    # Build Docker image
    docker build -t $DOCKER_IMAGE_NAME:$DOCKER_TAG .
    
    log_success "Docker image built successfully."
    
    # Optional: Push to registry
    if [ "$PUSH_TO_REGISTRY" = "true" ]; then
        log_info "Pushing to Docker registry..."
        docker push $DOCKER_IMAGE_NAME:$DOCKER_TAG
        log_success "Docker image pushed to registry."
    fi
}

deploy_local() {
    log_info "Starting local deployment..."
    npm run start
}

show_help() {
    echo "WeAnime Deployment Script"
    echo ""
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  --vercel      Deploy to Vercel"
    echo "  --railway     Deploy to Railway"
    echo "  --docker      Build Docker image"
    echo "  --local       Start local server"
    echo "  --test-only   Run tests only"
    echo "  --build-only  Build application only"
    echo "  --help        Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  PUSH_TO_REGISTRY=true    Push Docker image to registry"
    echo "  SKIP_TESTS=true          Skip running tests"
    echo ""
}

# Main deployment function
main() {
    log_info "Starting WeAnime deployment process..."
    
    # Check dependencies
    check_dependencies
    
    # Install dependencies
    install_dependencies
    
    # Run tests (unless skipped)
    if [ "$SKIP_TESTS" != "true" ]; then
        run_tests
    else
        log_warning "Skipping tests as requested."
    fi
    
    # Build application (unless it's test-only)
    if [ "$1" != "--test-only" ]; then
        build_application
    fi
    
    # Deploy based on the argument
    case $1 in
        --vercel)
            deploy_vercel
            ;;
        --railway)
            deploy_railway
            ;;
        --docker)
            deploy_docker
            ;;
        --local)
            deploy_local
            ;;
        --test-only)
            log_success "Tests completed. Skipping deployment."
            ;;
        --build-only)
            log_success "Build completed. Skipping deployment."
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            log_error "Invalid option. Use --help for usage information."
            exit 1
            ;;
    esac
    
    log_success "Deployment process completed successfully!"
}

# Check if script is being run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi
