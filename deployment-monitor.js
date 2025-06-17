#!/usr/bin/env node

/**
 * WeAnime Production Deployment Monitor
 * Uses multiple MCP servers for comprehensive monitoring
 */

const https = require('https');
const fs = require('fs');

// Configuration
const CONFIG = {
  supabaseUrl: 'https://zwvilprhyvzwcrhkyhjy.supabase.co',
  crunchyrollCredentials: {
    email: 'gaklina1@maxpedia.cloud',
    password: 'Watch123'
  },
  healthEndpoints: [
    '/api/health',
    '/api/health-check', 
    '/api/system-health'
  ],
  monitoringInterval: 30000, // 30 seconds
  maxRetries: 3
};

class DeploymentMonitor {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.isHealthy = false;
    this.lastCheck = null;
    this.errors = [];
  }

  async checkHealth() {
    console.log(`🔍 Checking health of ${this.baseUrl}...`);
    
    for (const endpoint of CONFIG.healthEndpoints) {
      try {
        const response = await this.makeRequest(endpoint);
        if (response.statusCode === 200) {
          console.log(`✅ ${endpoint} - HEALTHY`);
          this.isHealthy = true;
        } else {
          console.log(`⚠️  ${endpoint} - Status: ${response.statusCode}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint} - ERROR: ${error.message}`);
        this.errors.push({ endpoint, error: error.message, timestamp: new Date() });
      }
    }
    
    this.lastCheck = new Date();
  }

  async testCrunchyrollIntegration() {
    console.log('🎬 Testing Crunchyroll integration...');
    
    try {
      const response = await this.makeRequest('/api/test-crunchyroll');
      if (response.statusCode === 200) {
        console.log('✅ Crunchyroll integration - WORKING');
        return true;
      } else {
        console.log(`⚠️  Crunchyroll integration - Status: ${response.statusCode}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Crunchyroll integration - ERROR: ${error.message}`);
      return false;
    }
  }

  async testSupabaseConnection() {
    console.log('🗄️  Testing Supabase connection...');
    
    try {
      const response = await this.makeRequest('/api/auth/login', 'POST', {
        email: 'test@example.com',
        password: 'testpassword'
      });
      
      // We expect this to fail with 401, but connection should work
      if (response.statusCode === 401 || response.statusCode === 400) {
        console.log('✅ Supabase connection - WORKING');
        return true;
      }
    } catch (error) {
      console.log(`❌ Supabase connection - ERROR: ${error.message}`);
      return false;
    }
  }

  makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.baseUrl);
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WeAnime-Monitor/1.0'
        }
      };

      if (data) {
        const postData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(postData);
      }

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      });

      req.on('error', reject);
      
      if (data) {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      isHealthy: this.isHealthy,
      lastCheck: this.lastCheck,
      errorCount: this.errors.length,
      recentErrors: this.errors.slice(-5)
    };

    console.log('\n📊 DEPLOYMENT HEALTH REPORT');
    console.log('================================');
    console.log(`URL: ${report.baseUrl}`);
    console.log(`Status: ${report.isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY'}`);
    console.log(`Last Check: ${report.lastCheck}`);
    console.log(`Error Count: ${report.errorCount}`);
    
    if (report.recentErrors.length > 0) {
      console.log('\nRecent Errors:');
      report.recentErrors.forEach(error => {
        console.log(`  - ${error.endpoint}: ${error.error} (${error.timestamp})`);
      });
    }

    // Save report to file
    fs.writeFileSync('deployment-report.json', JSON.stringify(report, null, 2));
    
    return report;
  }
}

// Main execution
async function main() {
  const deploymentUrl = process.argv[2];
  
  if (!deploymentUrl) {
    console.log('Usage: node deployment-monitor.js <deployment-url>');
    console.log('Example: node deployment-monitor.js https://weanime-production.railway.app');
    process.exit(1);
  }

  console.log('🚀 WeAnime Production Deployment Monitor');
  console.log('=========================================');
  console.log(`Monitoring: ${deploymentUrl}`);
  
  const monitor = new DeploymentMonitor(deploymentUrl);
  
  // Initial comprehensive check
  await monitor.checkHealth();
  await monitor.testCrunchyrollIntegration();
  await monitor.testSupabaseConnection();
  
  // Generate initial report
  monitor.generateReport();
  
  // Start continuous monitoring
  console.log(`\n🔄 Starting continuous monitoring (every ${CONFIG.monitoringInterval/1000}s)...`);
  
  setInterval(async () => {
    await monitor.checkHealth();
    monitor.generateReport();
  }, CONFIG.monitoringInterval);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = DeploymentMonitor;