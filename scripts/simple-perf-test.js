#!/usr/bin/env node

/**
 * Simple Performance Testing Script
 * Tests basic load times and response codes
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

const BASE_URL = 'http://localhost:3000';
const ROUTES_TO_TEST = [
  '/',
  '/browse',
  '/trending',
  '/seasonal',
  '/auth/login',
  '/auth/signup',
  '/api/health'
];

class SimplePerformanceTester {
  constructor() {
    this.results = [];
  }

  async runTests() {
    console.log('🚀 Starting Simple Performance Tests...\n');
    
    for (const route of ROUTES_TO_TEST) {
      console.log(`📊 Testing route: ${route}`);
      const result = await this.testRoute(route);
      this.results.push(result);
      
      if (result.error) {
        console.log(`  ❌ Error: ${result.error}`);
      } else {
        console.log(`  ✓ Status: ${result.statusCode}`);
        console.log(`  ✓ Response time: ${result.responseTime}ms`);
        console.log(`  ✓ Content length: ${result.contentLength || 'N/A'} bytes`);
      }
      console.log('');
    }
    
    this.generateReport();
  }

  async testRoute(route) {
    const url = `${BASE_URL}${route}`;
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const client = urlObj.protocol === 'https:' ? https : http;
      
      const req = client.get(url, (res) => {
        const responseTime = Date.now() - startTime;
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            route,
            url,
            statusCode: res.statusCode,
            responseTime,
            contentLength: data.length,
            headers: res.headers,
            timestamp: new Date().toISOString()
          });
        });
      });
      
      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        resolve({
          route,
          url,
          error: error.message,
          responseTime,
          timestamp: new Date().toISOString()
        });
      });
      
      req.setTimeout(10000, () => {
        req.destroy();
        const responseTime = Date.now() - startTime;
        resolve({
          route,
          url,
          error: 'Request timeout',
          responseTime,
          timestamp: new Date().toISOString()
        });
      });
    });
  }

  generateReport() {
    console.log('📋 Performance Test Report');
    console.log('=' .repeat(50));
    
    const successfulTests = this.results.filter(r => !r.error);
    const failedTests = this.results.filter(r => r.error);
    
    if (successfulTests.length > 0) {
      const avgResponseTime = successfulTests.reduce((sum, r) => sum + r.responseTime, 0) / successfulTests.length;
      const maxResponseTime = Math.max(...successfulTests.map(r => r.responseTime));
      const minResponseTime = Math.min(...successfulTests.map(r => r.responseTime));
      
      console.log(`\n✅ Successful Tests: ${successfulTests.length}/${this.results.length}`);
      console.log(`📊 Average Response Time: ${Math.round(avgResponseTime)}ms`);
      console.log(`⚡ Fastest Response: ${minResponseTime}ms`);
      console.log(`🐌 Slowest Response: ${maxResponseTime}ms`);
      
      // Performance recommendations
      console.log('\n🎯 Recommendations:');
      if (avgResponseTime > 2000) {
        console.log('  ⚠️  Average response time is over 2 seconds. Consider optimization.');
      } else if (avgResponseTime > 1000) {
        console.log('  ⚠️  Average response time is over 1 second. Room for improvement.');
      } else {
        console.log('  ✅ Response times look good!');
      }
      
      if (maxResponseTime > 5000) {
        console.log('  ⚠️  Some routes are very slow (>5s). Investigate bottlenecks.');
      }
    }
    
    if (failedTests.length > 0) {
      console.log(`\n❌ Failed Tests: ${failedTests.length}`);
      failedTests.forEach(test => {
        console.log(`  - ${test.route}: ${test.error}`);
      });
    }
    
    console.log('\n📄 Detailed Results:');
    this.results.forEach(result => {
      console.log(`\n${result.route}:`);
      if (result.error) {
        console.log(`  Error: ${result.error}`);
      } else {
        console.log(`  Status: ${result.statusCode}`);
        console.log(`  Time: ${result.responseTime}ms`);
        console.log(`  Size: ${result.contentLength} bytes`);
      }
    });
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SimplePerformanceTester();
  tester.runTests().catch(console.error);
}

module.exports = SimplePerformanceTester;
