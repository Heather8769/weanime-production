#!/bin/bash

# Simple WeAnime Backend Startup Script

echo "🎌 Starting WeAnime Backend (Simple Mode)..."

# Check if we're in the right directory
if [ ! -d "weanime-backend" ]; then
    echo "❌ Error: weanime-backend directory not found!"
    echo "Make sure you're running this script from the WeAnime root directory."
    exit 1
fi

# Navigate to backend directory
cd weanime-backend

echo "📦 Installing dependencies..."
pip3 install --user fastapi uvicorn beautifulsoup4 requests httpx

echo "🚀 Starting backend server..."
echo "Backend will be available at: http://localhost:8001"
echo "Press Ctrl+C to stop the server"
echo ""

python3 -c "
import uvicorn
import sys
import os

# Add current directory to Python path
sys.path.insert(0, os.getcwd())

# Import and run the app
try:
    from main import app
    uvicorn.run(app, host='0.0.0.0', port=8001, reload=True)
except ImportError as e:
    print(f'Error importing main.py: {e}')
    sys.exit(1)
except Exception as e:
    print(f'Error starting server: {e}')
    sys.exit(1)
"
