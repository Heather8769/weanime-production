#!/bin/bash

# Multi-Port WeAnime Application Starter
# Runs WeAnime on both port 3000 and 8000, plus Crunchyroll Bridge on 8081

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${PURPLE}🚀 WeAnime Multi-Port Deployment${NC}"
echo -e "${BLUE}📋 Starting services on multiple ports...${NC}"

# Function to kill background processes on exit
cleanup() {
    echo -e "\n${YELLOW}🛑 Shutting down services...${NC}"
    if [ ! -z "$PID_3000" ]; then
        kill $PID_3000 2>/dev/null || true
        echo -e "${BLUE}✅ Service on port 3000 stopped${NC}"
    fi
    if [ ! -z "$PID_8000" ]; then
        kill $PID_8000 2>/dev/null || true
        echo -e "${BLUE}✅ Service on port 8000 stopped${NC}"
    fi
    if [ ! -z "$PID_8081" ]; then
        kill $PID_8081 2>/dev/null || true
        echo -e "${BLUE}✅ Crunchyroll Bridge on port 8081 stopped${NC}"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Check if Node.js and npm are available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ Error: npm is not installed${NC}"
    exit 1
fi

# Check if Rust/Cargo is available for Crunchyroll Bridge
if ! command -v cargo &> /dev/null; then
    echo -e "${YELLOW}⚠️  Warning: Rust/Cargo not installed - Crunchyroll Bridge will not start${NC}"
    echo -e "${BLUE}💡 Install Rust from: https://rustup.rs/${NC}"
    RUST_AVAILABLE=false
else
    RUST_AVAILABLE=true
fi

# Navigate to project root
PROJECT_ROOT="$(dirname "$0")/.."
cd "$PROJECT_ROOT"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
fi

# Build the application for production
echo -e "${BLUE}🏗️  Building WeAnime application...${NC}"
npm run build

# Start WeAnime on port 3000
echo -e "${GREEN}🌐 Starting WeAnime on port 3000...${NC}"
PORT=3000 npm start &
PID_3000=$!

# Wait a moment for first service to start
sleep 2

# Start WeAnime on port 8000
echo -e "${GREEN}🌐 Starting WeAnime on port 8000...${NC}"
PORT=8000 npm start &
PID_8000=$!

# Wait a moment for second service to start
sleep 2

# Start Crunchyroll Bridge on port 8081 if Rust is available
if [ "$RUST_AVAILABLE" = true ]; then
    echo -e "${GREEN}🦀 Starting Crunchyroll Bridge on port 8081...${NC}"
    ./scripts/start-crunchyroll-bridge.sh &
    PID_8081=$!
    sleep 3
else
    echo -e "${YELLOW}⚠️  Skipping Crunchyroll Bridge (Rust not available)${NC}"
fi

# Display status
echo -e "\n${PURPLE}═══════════════════════════════════════${NC}"
echo -e "${GREEN}🎉 WeAnime Multi-Port Deployment Complete!${NC}"
echo -e "${PURPLE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}📱 WeAnime Main App (Port 3000): ${GREEN}http://localhost:3000${NC}"
echo -e "${BLUE}📱 WeAnime Secondary (Port 8000): ${GREEN}http://localhost:8000${NC}"
if [ "$RUST_AVAILABLE" = true ]; then
    echo -e "${BLUE}🦀 Crunchyroll Bridge (Port 8081): ${GREEN}http://localhost:8081/health${NC}"
fi
echo -e "${PURPLE}═══════════════════════════════════════${NC}"
echo -e "${YELLOW}💡 Press Ctrl+C to stop all services${NC}"
echo -e "${BLUE}📊 Monitoring logs...${NC}\n"

# Monitor processes and restart if they crash
while true; do
    # Check port 3000
    if ! kill -0 $PID_3000 2>/dev/null; then
        echo -e "${RED}❌ Service on port 3000 crashed, restarting...${NC}"
        PORT=3000 npm start &
        PID_3000=$!
    fi
    
    # Check port 8000
    if ! kill -0 $PID_8000 2>/dev/null; then
        echo -e "${RED}❌ Service on port 8000 crashed, restarting...${NC}"
        PORT=8000 npm start &
        PID_8000=$!
    fi
    
    # Check port 8081 (if running)
    if [ "$RUST_AVAILABLE" = true ] && [ ! -z "$PID_8081" ] && ! kill -0 $PID_8081 2>/dev/null; then
        echo -e "${RED}❌ Crunchyroll Bridge crashed, restarting...${NC}"
        ./scripts/start-crunchyroll-bridge.sh &
        PID_8081=$!
    fi
    
    sleep 10
done