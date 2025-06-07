#!/bin/bash

# WeAnime Backend Startup Script

echo "🎌 Starting WeAnime Backend..."

# Check if we're in the right directory
if [ ! -d "weanime-backend" ]; then
    echo "❌ Error: weanime-backend directory not found!"
    echo "Make sure you're running this script from the WeAnime root directory."
    exit 1
fi

# Navigate to backend directory
cd weanime-backend

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed!"
    echo "Please install Python 3 and try again."
    exit 1
fi

# Check if pip is installed
if ! command -v pip &> /dev/null && ! command -v pip3 &> /dev/null; then
    echo "❌ Error: pip is not installed!"
    echo "Please install pip and try again."
    exit 1
fi

# Use pip3 if available, otherwise use pip
PIP_CMD="pip"
if command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
fi

# Install requirements if they don't exist
echo "📦 Installing Python dependencies..."
$PIP_CMD install -r requirements.txt

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
playwright install

# Check if uvicorn is available
if ! command -v uvicorn &> /dev/null; then
    echo "❌ Error: uvicorn is not installed!"
    echo "Installing uvicorn..."
    $PIP_CMD install uvicorn
fi

# Start the backend server
echo "🚀 Starting FastAPI backend server..."
echo "Backend will be available at: http://localhost:8001"
echo "API documentation: http://localhost:8001/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Try to start with Python 3 first, then fallback to python
if command -v python3 &> /dev/null; then
    python3 -m uvicorn main:app --reload --port 8001 --host 0.0.0.0
else
    python -m uvicorn main:app --reload --port 8001 --host 0.0.0.0
fi
