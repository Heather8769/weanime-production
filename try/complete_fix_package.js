// =============================================================================
// 📁 FILE: next.config.js (REPLACE YOUR EXISTING FILE)
// =============================================================================
/** @type {import('next').NextConfig} */
const nextConfig = {
  // CRITICAL: Enable serverless target for Netlify
  target: 'serverless',
  
  // Memory and performance optimizations
  experimental: {
    outputFileTracingRoot: process.cwd(),
    optimizeCss: true,
    isrMemoryCacheSize: 0, // Disable to save memory
  },
  
  // Essential settings
  trailingSlash: true,
  
  // Image optimization - disable if causing issues
  images: {
    unoptimized: true,
    domains: ['crunchyroll.com', 'img1.ak.crunchyroll.com'],
  },
  
  // Webpack optimization to reduce memory usage
  webpack: (config, { isServer, dev }) => {
    if (isServer && !dev) {
      // Critical: Reduce server bundle size
      config.optimization.splitChunks = false;
      config.optimization.minimize = true;
    }
    
    // Memory optimization
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
    
    return config;
  },
  
  // Runtime config
  serverRuntimeConfig: {
    maxMemory: '1024mb',
  },
  
  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
  },
}

module.exports = nextConfig;

// =============================================================================
// 📁 FILE: netlify.toml (REPLACE YOUR EXISTING FILE)
// =============================================================================
/*
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

# CRITICAL: Function configuration to fix instability
[functions]
  "___netlify-server-handler" = { 
    timeout = 30, 
    memory = 1024,
    node_bundler = "esbuild"
  }

# Optimized redirects
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
  force = true

[[redirects]]
  from = "/*"
  to = "/.netlify/functions/___netlify-server-handler"
  status = 200

# Performance headers
[[headers]]
  for = "/_next/static/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/api/*"
  [headers.values]
    Cache-Control = "public, max-age=300"
*/

// =============================================================================
// 📁 FILE: components/ErrorBoundary.js (NEW FILE - CREATE THIS)
// =============================================================================
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Route Error:', error, errorInfo);
    
    // Log critical errors
    if (typeof window !== 'undefined') {
      console.log('🔍 Error Details:', {
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        timestamp: new Date().toISOString()
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          margin: '20px'
        }}>
          <h2>🚨 Route Error Detected</h2>
          <p>There was an issue loading this page.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Reload Page
          </button>
          <button 
            onClick={() => window.location.href = '/'}
            style={{
              padding: '10px 20px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              marginLeft: '10px'
            }}
          >
            🏠 Go Home
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// =============================================================================
// 📁 FILE: pages/_app.js (UPDATE YOUR EXISTING FILE)
// =============================================================================
import ErrorBoundary from '../components/ErrorBoundary'; // Add this import
// ... your other imports

export default function App({ Component, pageProps }) {
  // Performance monitoring
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      // Log page load performance
      window.addEventListener('load', () => {
        const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
        console.log(`📊 Page loaded in ${loadTime}ms`);
      });
      
      // Monitor memory usage
      if (window.performance && window.performance.memory) {
        console.log('💾 Memory usage:', {
          used: Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB',
          total: Math.round(window.performance.memory.totalJSHeapSize / 1024 / 1024) + 'MB'
        });
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <Component {...pageProps} />
    </ErrorBoundary>
  );
}

// =============================================================================
// 📁 FILE: utils/performance.js (NEW FILE - CREATE THIS)
// =============================================================================
export const performanceUtils = {
  // Monitor function execution time
  measureTime: (fn, name) => {
    return async (...args) => {
      const start = performance.now();
      try {
        const result = await fn(...args);
        const end = performance.now();
        console.log(`⚡ [${name}] took ${Math.round(end - start)}ms`);
        return result;
      } catch (error) {
        const end = performance.now();
        console.error(`❌ [${name}] failed after ${Math.round(end - start)}ms:`, error);
        throw error;
      }
    };
  },
  
  // Log memory usage (server-side)
  logMemory: (label) => {
    if (typeof process !== 'undefined') {
      const usage = process.memoryUsage();
      console.log(`💾 [${label}] Memory:`, {
        rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
        heap: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      });
    }
  },
  
  // Check if function is running out of memory
  checkMemoryLimit: () => {
    if (typeof process !== 'undefined') {
      const usage = process.memoryUsage();
      const memoryUsedMB = usage.rss / 1024 / 1024;
      
      if (memoryUsedMB > 900) { // Alert at 900MB (close to 1024MB limit)
        console.warn(`🚨 HIGH MEMORY USAGE: ${Math.round(memoryUsedMB)}MB`);
        return true;
      }
    }
    return false;
  }
};

// =============================================================================
// 📁 FILE: pages/api/health.js (NEW FILE - CREATE THIS)
// =============================================================================
import { performanceUtils } from '../../utils/performance';

export default function handler(req, res) {
  performanceUtils.logMemory('Health Check');
  
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    memory: typeof process !== 'undefined' ? {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
      heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
    } : null,
    uptime: typeof process !== 'undefined' ? Math.round(process.uptime()) + 's' : null,
    deployment: 'serverless-optimized'
  };
  
  res.status(200).json(healthData);
}

// =============================================================================
// 📁 FILE: package.json (UPDATE YOUR SCRIPTS SECTION)
// =============================================================================
/*
Add these scripts to your existing package.json:

{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    
    // CRITICAL: New deployment scripts
    "build:optimized": "next build",
    "deploy": "npm run build:optimized && netlify deploy --prod",
    "deploy:test": "npm run build:optimized && netlify deploy",
    
    // Testing scripts
    "test:local": "npm run build && npm run start",
    "test:memory": "node --max-old-space-size=1024 node_modules/.bin/next build",
    
    // Health check
    "health": "curl -s http://localhost:3000/api/health | jq ."
  }
}
*/

// =============================================================================
// 📁 FILE: .env.local (CREATE IF NOT EXISTS)
// =============================================================================
/*
# Performance settings
NODE_OPTIONS="--max-old-space-size=1024"

# API URLs (replace with your actual URLs)
NEXT_PUBLIC_API_URL=https://api.crunchyroll.com
NEXT_PUBLIC_CDN_URL=https://cdn.crunchyroll.com

# Development
NEXT_PUBLIC_ENV=development
*/

// =============================================================================
// 📁 FILE: netlify/functions/test-function.js (NEW FILE - CREATE THIS DIRECTORY)
// =============================================================================
// Simple test function to verify function deployment
exports.handler = async (event, context) => {
  console.log('✅ Test function called:', event.path);
  
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Function working correctly',
      path: event.path,
      timestamp: new Date().toISOString(),
      context: {
        functionName: context.functionName,
        remainingTimeInMillis: context.getRemainingTimeInMillis()
      }
    })
  };
};

// =============================================================================
// FALLBACK CONFIGURATION (IF SERVERLESS STILL FAILS)
// =============================================================================

// Alternative next.config.js for static export
/*
const staticConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  exportPathMap: async function () {
    return {
      '/': { page: '/' },
      '/browse': { page: '/browse' },
      '/trending': { page: '/trending' },
    };
  },
};

module.exports = staticConfig;
*/

// Alternative netlify.toml for static
/*
[build]
  command = "npm run build && npm run export"
  publish = "out"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
*/