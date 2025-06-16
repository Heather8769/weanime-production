#!/bin/bash

# Start Crunchyroll Bridge Service on Port 8081
# This script handles building and running the Rust-based Crunchyroll Bridge microservice

set -e

echo "🦀 Starting Crunchyroll Bridge Service..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}❌ Error: Rust/Cargo is not installed${NC}"
    echo -e "${BLUE}💡 Install Rust from: https://rustup.rs/${NC}"
    exit 1
fi

# Check for required environment variables
if [ -z "$CRUNCHYROLL_USERNAME" ] || [ -z "$CRUNCHYROLL_PASSWORD" ]; then
    echo -e "${YELLOW}⚠️  Warning: CRUNCHYROLL_USERNAME and CRUNCHYROLL_PASSWORD environment variables not set${NC}"
    echo -e "${BLUE}💡 Set them in your .env file or environment${NC}"
fi

# Navigate to Crunchyroll Bridge directory
BRIDGE_DIR="$(dirname "$0")/../services/crunchyroll-bridge"
cd "$BRIDGE_DIR"

echo -e "${BLUE}📦 Building Crunchyroll Bridge...${NC}"

# Build the project (release mode for production)
if [ "$NODE_ENV" = "production" ]; then
    echo -e "${BLUE}🏗️  Building in release mode...${NC}"
    cargo build --release
    BINARY_PATH="./target/release/crunchyroll-bridge"
else
    echo -e "${BLUE}🏗️  Building in debug mode...${NC}"
    cargo build
    BINARY_PATH="./target/debug/crunchyroll-bridge"
fi

# Check if build was successful
if [ ! -f "$BINARY_PATH" ]; then
    echo -e "${RED}❌ Build failed - binary not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# Set environment variables for the bridge service
export PORT="${CRUNCHYROLL_BRIDGE_PORT:-8081}"
export HOST="${CRUNCHYROLL_BRIDGE_HOST:-0.0.0.0}"
export RUST_LOG="${RUST_LOG:-info}"

echo -e "${BLUE}🚀 Starting Crunchyroll Bridge on http://${HOST}:${PORT}${NC}"
echo -e "${BLUE}📊 Logs level: ${RUST_LOG}${NC}"

# Start the service
exec "$BINARY_PATH"