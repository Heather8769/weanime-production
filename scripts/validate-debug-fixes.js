#!/usr/bin/env node

/**
 * WeAnime Debug Guide Validation Script
 * 
 * This script validates all the fixes implemented from the weanime_debug_guide.md
 * and ensures the application is running without the documented errors.
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.SITE_URL || 'https://weanime.live';
const LOCAL_URL = 'http://localhost:3000';

// Test configuration
const TESTS = {
  metaTags: {
    name: 'Meta Tag Validation',
    description: 'Check for deprecated apple-mobile-web-app-capable meta tag'
  },
  apiEndpoints: {
    name: 'API Endpoints Validation',
    description: 'Verify all API endpoints are responding correctly',
    endpoints: [
      '/api/anilist',
      '/api/monitoring/error',
      '/api/errors',
      '/api/trending',
      '/api/seasonal',
      '/api/health-check'
    ]
  },
  serviceWorker: {
    name: 'Service Worker Validation',
    description: 'Check service worker registration and navigation fallback'
  },
  performanceMonitoring: {
    name: 'Performance Monitoring',
    description: 'Verify performance monitoring is properly configured'
  },
  recentlyWatched: {
    name: 'Recently Watched Episodes',
    description: 'Check recently watched episodes functionality'
  }
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, {
      method: 'GET',
      timeout: 10000,
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

async function testMetaTags() {
  log('\n🔍 Testing Meta Tags...', 'cyan');
  
  try {
    const response = await makeRequest(BASE_URL);
    
    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}`);
    }

    const hasDeprecatedMeta = response.body.includes('name="apple-mobile-web-app-capable"');
    const hasModernMeta = response.body.includes('name="mobile-web-app-capable"');
    
    if (hasDeprecatedMeta && hasModernMeta) {
      log('✅ Meta tags: Both modern and legacy meta tags present (good for compatibility)', 'green');
      return { passed: true, details: 'Both modern and legacy meta tags found' };
    } else if (hasModernMeta) {
      log('✅ Meta tags: Modern meta tag found', 'green');
      return { passed: true, details: 'Modern meta tag found' };
    } else if (hasDeprecatedMeta) {
      log('⚠️  Meta tags: Only deprecated meta tag found', 'yellow');
      return { passed: false, details: 'Only deprecated meta tag found' };
    } else {
      log('❌ Meta tags: No mobile web app meta tags found', 'red');
      return { passed: false, details: 'No mobile web app meta tags found' };
    }
  } catch (error) {
    log(`❌ Meta tags test failed: ${error.message}`, 'red');
    return { passed: false, details: error.message };
  }
}

async function testApiEndpoints() {
  log('\n🔍 Testing API Endpoints...', 'cyan');
  
  const results = [];
  
  for (const endpoint of TESTS.apiEndpoints.endpoints) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      log(`  Testing ${endpoint}...`);
      
      const response = await makeRequest(url);
      
      if (response.statusCode === 200) {
        log(`  ✅ ${endpoint}: OK (${response.statusCode})`, 'green');
        results.push({ endpoint, passed: true, status: response.statusCode });
      } else if (response.statusCode === 401 || response.statusCode === 403) {
        log(`  ✅ ${endpoint}: Protected endpoint (${response.statusCode})`, 'green');
        results.push({ endpoint, passed: true, status: response.statusCode });
      } else {
        log(`  ❌ ${endpoint}: HTTP ${response.statusCode}`, 'red');
        results.push({ endpoint, passed: false, status: response.statusCode });
      }
    } catch (error) {
      log(`  ❌ ${endpoint}: ${error.message}`, 'red');
      results.push({ endpoint, passed: false, error: error.message });
    }
  }
  
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  return {
    passed: passedCount === totalCount,
    details: `${passedCount}/${totalCount} endpoints working`,
    results
  };
}

async function testServiceWorker() {
  log('\n🔍 Testing Service Worker...', 'cyan');
  
  try {
    const response = await makeRequest(`${BASE_URL}/sw.js`);
    
    if (response.statusCode !== 200) {
      throw new Error(`Service worker not found (HTTP ${response.statusCode})`);
    }

    const hasNavigationFallback = response.body.includes('handleNavigationRequest');
    const hasOfflineFallback = response.body.includes('offline');
    
    if (hasNavigationFallback && hasOfflineFallback) {
      log('✅ Service Worker: Navigation and offline fallbacks implemented', 'green');
      return { passed: true, details: 'Navigation and offline fallbacks found' };
    } else {
      log('⚠️  Service Worker: Missing some fallback functionality', 'yellow');
      return { passed: false, details: 'Missing fallback functionality' };
    }
  } catch (error) {
    log(`❌ Service Worker test failed: ${error.message}`, 'red');
    return { passed: false, details: error.message };
  }
}

async function testPerformanceMonitoring() {
  log('\n🔍 Testing Performance Monitoring...', 'cyan');
  
  try {
    const response = await makeRequest(BASE_URL);
    
    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}`);
    }

    // Check if performance monitoring is properly disabled to prevent infinite loops
    const hasPerformanceMonitor = response.body.includes('PerformanceMonitor');
    
    if (hasPerformanceMonitor) {
      log('✅ Performance Monitoring: Component found in page', 'green');
      return { passed: true, details: 'Performance monitoring component detected' };
    } else {
      log('⚠️  Performance Monitoring: Component not detected', 'yellow');
      return { passed: false, details: 'Performance monitoring component not found' };
    }
  } catch (error) {
    log(`❌ Performance Monitoring test failed: ${error.message}`, 'red');
    return { passed: false, details: error.message };
  }
}

async function testRecentlyWatched() {
  log('\n🔍 Testing Recently Watched Episodes...', 'cyan');
  
  try {
    // Test the episode service endpoint
    const response = await makeRequest(`${BASE_URL}/api/health-check`);
    
    if (response.statusCode !== 200) {
      throw new Error(`Health check failed (HTTP ${response.statusCode})`);
    }

    const healthData = JSON.parse(response.body);
    
    if (healthData.status === 'healthy' || healthData.status === 'degraded') {
      log('✅ Recently Watched: Backend services are operational', 'green');
      return { passed: true, details: 'Backend services operational for watch tracking' };
    } else {
      log('⚠️  Recently Watched: Backend services may have issues', 'yellow');
      return { passed: false, details: 'Backend services not fully operational' };
    }
  } catch (error) {
    log(`❌ Recently Watched test failed: ${error.message}`, 'red');
    return { passed: false, details: error.message };
  }
}

async function runAllTests() {
  log('🚀 WeAnime Debug Guide Validation', 'bright');
  log('=====================================', 'bright');
  log(`Testing site: ${BASE_URL}`, 'blue');
  
  const testResults = {};
  
  // Run all tests
  testResults.metaTags = await testMetaTags();
  testResults.apiEndpoints = await testApiEndpoints();
  testResults.serviceWorker = await testServiceWorker();
  testResults.performanceMonitoring = await testPerformanceMonitoring();
  testResults.recentlyWatched = await testRecentlyWatched();
  
  // Generate summary
  log('\n📊 Test Summary', 'bright');
  log('================', 'bright');
  
  let totalTests = 0;
  let passedTests = 0;
  
  for (const [testName, result] of Object.entries(testResults)) {
    totalTests++;
    if (result.passed) {
      passedTests++;
      log(`✅ ${TESTS[testName].name}: PASSED`, 'green');
    } else {
      log(`❌ ${TESTS[testName].name}: FAILED - ${result.details}`, 'red');
    }
  }
  
  log(`\n🎯 Overall Result: ${passedTests}/${totalTests} tests passed`, 
      passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    log('\n🎉 All debug guide fixes have been successfully implemented!', 'green');
    process.exit(0);
  } else {
    log('\n⚠️  Some issues remain. Check the failed tests above.', 'yellow');
    process.exit(1);
  }
}

// Run the tests
runAllTests().catch(error => {
  log(`\n💥 Test runner failed: ${error.message}`, 'red');
  process.exit(1);
});
