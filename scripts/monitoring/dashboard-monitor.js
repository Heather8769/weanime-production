#!/usr/bin/env node

/**
 * WeAnime Production Monitoring Dashboard
 * Real-time monitoring with automated alerts and performance tracking
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  app: {
    name: 'WeAnime',
    url: process.env.MONITORING_URL || 'https://weanime.app',
    apiKey: process.env.MONITORING_API_KEY || '',
  },
  monitoring: {
    interval: 60000, // 1 minute
    healthCheckInterval: 30000, // 30 seconds
    performanceInterval: 300000, // 5 minutes
    alertCooldown: 900000, // 15 minutes
  },
  thresholds: {
    responseTime: 3000, // 3 seconds
    errorRate: 0.05, // 5%
    cpuUsage: 80, // 80%
    memoryUsage: 80, // 80%
    diskUsage: 80, // 80%
  },
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
    channel: '#weanime-alerts',
  },
  storage: {
    metricsFile: '/tmp/weanime-metrics.json',
    alertsFile: '/tmp/weanime-alerts.json',
  }
};

class MonitoringDashboard {
  constructor() {
    this.metrics = this.loadMetrics();
    this.alerts = this.loadAlerts();
    this.isRunning = false;
  }

  // Load stored metrics
  loadMetrics() {
    try {
      if (fs.existsSync(CONFIG.storage.metricsFile)) {
        const data = fs.readFileSync(CONFIG.storage.metricsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading metrics:', error.message);
    }
    
    return {
      lastUpdated: new Date().toISOString(),
      health: {
        status: 'unknown',
        uptime: 0,
        lastCheck: null,
      },
      performance: {
        responseTime: [],
        errorRate: [],
        throughput: [],
      },
      system: {
        cpu: [],
        memory: [],
        disk: [],
      },
      errors: [],
    };
  }

  // Save metrics to file
  saveMetrics() {
    try {
      this.metrics.lastUpdated = new Date().toISOString();
      fs.writeFileSync(CONFIG.storage.metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('Error saving metrics:', error.message);
    }
  }

  // Load alerts history
  loadAlerts() {
    try {
      if (fs.existsSync(CONFIG.storage.alertsFile)) {
        const data = fs.readFileSync(CONFIG.storage.alertsFile, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading alerts:', error.message);
    }
    
    return {
      active: [],
      history: [],
      lastCooldown: {},
    };
  }

  // Save alerts to file
  saveAlerts() {
    try {
      fs.writeFileSync(CONFIG.storage.alertsFile, JSON.stringify(this.alerts, null, 2));
    } catch (error) {
      console.error('Error saving alerts:', error.message);
    }
  }

  // Make HTTP request
  async makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const req = https.get(url, {
        timeout: 10000,
        ...options
      }, (res) => {
        const responseTime = Date.now() - startTime;
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data,
            responseTime: responseTime,
          });
        });
      });
      
      req.on('error', (error) => {
        const responseTime = Date.now() - startTime;
        reject({
          error: error.message,
          responseTime: responseTime,
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        const responseTime = Date.now() - startTime;
        reject({
          error: 'Request timeout',
          responseTime: responseTime,
        });
      });
    });
  }

  // Health check
  async performHealthCheck() {
    const timestamp = new Date().toISOString();
    
    try {
      console.log('🔍 Performing health check...');
      
      const response = await this.makeRequest(`${CONFIG.app.url}/api/health`);
      
      if (response.statusCode === 200) {
        let healthData;
        try {
          healthData = JSON.parse(response.data);
        } catch (parseError) {
          healthData = { status: 'unknown' };
        }
        
        this.metrics.health = {
          status: 'healthy',
          uptime: healthData.uptime || 0,
          lastCheck: timestamp,
          responseTime: response.responseTime,
          database: healthData.database || { status: 'unknown' },
          services: healthData.services || {},
        };
        
        // Clear any active health alerts
        this.resolveAlert('health_check');
        
        console.log(`✅ Health check passed (${response.responseTime}ms)`);
      } else {
        throw new Error(`HTTP ${response.statusCode}`);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error.error || error.message);
      
      this.metrics.health = {
        status: 'unhealthy',
        uptime: 0,
        lastCheck: timestamp,
        error: error.error || error.message,
        responseTime: error.responseTime || null,
      };
      
      // Trigger health alert
      this.triggerAlert('health_check', 'CRITICAL', 'Health check failed', error.error || error.message);
    }
    
    this.saveMetrics();
  }

  // Performance monitoring
  async performPerformanceCheck() {
    const timestamp = new Date().toISOString();
    
    try {
      console.log('📊 Performing performance check...');
      
      // Test multiple endpoints
      const endpoints = [
        '/',
        '/api/health',
        '/browse',
        '/trending',
      ];
      
      const results = await Promise.allSettled(
        endpoints.map(endpoint => this.makeRequest(`${CONFIG.app.url}${endpoint}`))
      );
      
      let totalResponseTime = 0;
      let successCount = 0;
      let errorCount = 0;
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          totalResponseTime += result.value.responseTime;
          if (result.value.statusCode >= 200 && result.value.statusCode < 400) {
            successCount++;
          } else {
            errorCount++;
          }
        } else {
          errorCount++;
        }
      });
      
      const avgResponseTime = totalResponseTime / results.length;
      const errorRate = errorCount / results.length;
      
      // Store performance metrics
      this.addMetric('performance.responseTime', {
        timestamp,
        value: avgResponseTime,
        endpoint: 'average'
      });
      
      this.addMetric('performance.errorRate', {
        timestamp,
        value: errorRate
      });
      
      // Check thresholds
      if (avgResponseTime > CONFIG.thresholds.responseTime) {
        this.triggerAlert(
          'performance_response_time',
          'WARNING',
          'High response time detected',
          `Average response time: ${avgResponseTime.toFixed(2)}ms (threshold: ${CONFIG.thresholds.responseTime}ms)`
        );
      } else {
        this.resolveAlert('performance_response_time');
      }
      
      if (errorRate > CONFIG.thresholds.errorRate) {
        this.triggerAlert(
          'performance_error_rate',
          'CRITICAL',
          'High error rate detected',
          `Error rate: ${(errorRate * 100).toFixed(2)}% (threshold: ${CONFIG.thresholds.errorRate * 100}%)`
        );
      } else {
        this.resolveAlert('performance_error_rate');
      }
      
      console.log(`📈 Performance check completed - Avg: ${avgResponseTime.toFixed(2)}ms, Errors: ${(errorRate * 100).toFixed(2)}%`);
      
    } catch (error) {
      console.error('❌ Performance check failed:', error.message);
    }
    
    this.saveMetrics();
  }

  // Add metric to time series
  addMetric(path, data) {
    const keys = path.split('.');
    let current = this.metrics;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    const finalKey = keys[keys.length - 1];
    if (!Array.isArray(current[finalKey])) {
      current[finalKey] = [];
    }
    
    current[finalKey].push(data);
    
    // Keep only last 100 entries
    if (current[finalKey].length > 100) {
      current[finalKey] = current[finalKey].slice(-100);
    }
  }

  // Trigger alert
  triggerAlert(type, severity, title, message) {
    const now = Date.now();
    const lastAlert = this.alerts.lastCooldown[type] || 0;
    
    // Check cooldown period
    if (now - lastAlert < CONFIG.monitoring.alertCooldown) {
      console.log(`⏰ Alert ${type} in cooldown period`);
      return;
    }
    
    const alert = {
      id: `${type}_${now}`,
      type,
      severity,
      title,
      message,
      timestamp: new Date().toISOString(),
      resolved: false,
    };
    
    // Add to active alerts
    this.alerts.active.push(alert);
    this.alerts.history.push(alert);
    this.alerts.lastCooldown[type] = now;
    
    console.log(`🚨 Alert triggered: ${severity} - ${title}`);
    
    // Send Slack notification
    this.sendSlackAlert(alert);
    
    this.saveAlerts();
  }

  // Resolve alert
  resolveAlert(type) {
    const activeAlert = this.alerts.active.find(alert => alert.type === type && !alert.resolved);
    
    if (activeAlert) {
      activeAlert.resolved = true;
      activeAlert.resolvedAt = new Date().toISOString();
      
      // Remove from active alerts
      this.alerts.active = this.alerts.active.filter(alert => alert.id !== activeAlert.id);
      
      console.log(`✅ Alert resolved: ${activeAlert.title}`);
      
      // Send resolution notification
      this.sendSlackAlert({
        ...activeAlert,
        title: `RESOLVED: ${activeAlert.title}`,
        severity: 'SUCCESS',
      });
      
      this.saveAlerts();
    }
  }

  // Send Slack alert
  async sendSlackAlert(alert) {
    if (!CONFIG.slack.webhookUrl) {
      console.log('📢 Slack webhook not configured, skipping notification');
      return;
    }
    
    const color = {
      'SUCCESS': 'good',
      'WARNING': 'warning',
      'CRITICAL': 'danger',
    }[alert.severity] || 'warning';
    
    const payload = {
      channel: CONFIG.slack.channel,
      username: 'WeAnime Monitor',
      icon_emoji: ':warning:',
      attachments: [{
        color: color,
        title: `${CONFIG.app.name} - ${alert.title}`,
        text: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity,
            short: true,
          },
          {
            title: 'Time',
            value: new Date(alert.timestamp).toLocaleString(),
            short: true,
          },
        ],
        footer: 'WeAnime Monitoring',
        ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
      }],
    };
    
    try {
      const data = JSON.stringify(payload);
      const url = new URL(CONFIG.slack.webhookUrl);
      
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': data.length,
        },
      };
      
      const req = https.request(options, (res) => {
        console.log(`📤 Slack notification sent (${res.statusCode})`);
      });
      
      req.on('error', (error) => {
        console.error('❌ Failed to send Slack notification:', error.message);
      });
      
      req.write(data);
      req.end();
      
    } catch (error) {
      console.error('❌ Error sending Slack alert:', error.message);
    }
  }

  // Generate status report
  generateStatusReport() {
    const now = new Date();
    const uptime = this.metrics.health.status === 'healthy' ? '✅ Healthy' : '❌ Unhealthy';
    const activeAlerts = this.alerts.active.length;
    
    console.log('\n' + '='.repeat(60));
    console.log(`📊 WeAnime Status Report - ${now.toLocaleString()}`);
    console.log('='.repeat(60));
    console.log(`Status: ${uptime}`);
    console.log(`Active Alerts: ${activeAlerts}`);
    
    if (this.metrics.health.responseTime) {
      console.log(`Response Time: ${this.metrics.health.responseTime}ms`);
    }
    
    if (this.alerts.active.length > 0) {
      console.log('\n🚨 Active Alerts:');
      this.alerts.active.forEach(alert => {
        console.log(`  - ${alert.severity}: ${alert.title}`);
      });
    }
    
    console.log('='.repeat(60) + '\n');
  }

  // Start monitoring
  start() {
    if (this.isRunning) {
      console.log('⚠️ Monitoring is already running');
      return;
    }
    
    console.log('🚀 Starting WeAnime monitoring dashboard...');
    this.isRunning = true;
    
    // Initial checks
    this.performHealthCheck();
    this.performPerformanceCheck();
    
    // Set up intervals
    this.healthInterval = setInterval(() => {
      this.performHealthCheck();
    }, CONFIG.monitoring.healthCheckInterval);
    
    this.performanceInterval = setInterval(() => {
      this.performPerformanceCheck();
    }, CONFIG.monitoring.performanceInterval);
    
    this.reportInterval = setInterval(() => {
      this.generateStatusReport();
    }, CONFIG.monitoring.interval);
    
    console.log('📡 Monitoring dashboard started successfully');
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      this.stop();
    });
    
    process.on('SIGTERM', () => {
      this.stop();
    });
  }

  // Stop monitoring
  stop() {
    if (!this.isRunning) {
      return;
    }
    
    console.log('🛑 Stopping WeAnime monitoring dashboard...');
    this.isRunning = false;
    
    clearInterval(this.healthInterval);
    clearInterval(this.performanceInterval);
    clearInterval(this.reportInterval);
    
    this.saveMetrics();
    this.saveAlerts();
    
    console.log('✅ Monitoring dashboard stopped');
    process.exit(0);
  }
}

// CLI interface
if (require.main === module) {
  const command = process.argv[2];
  const dashboard = new MonitoringDashboard();
  
  switch (command) {
    case 'start':
      dashboard.start();
      break;
    
    case 'status':
      dashboard.generateStatusReport();
      break;
    
    case 'health':
      dashboard.performHealthCheck().then(() => {
        console.log('Health check completed');
      });
      break;
    
    case 'performance':
      dashboard.performPerformanceCheck().then(() => {
        console.log('Performance check completed');
      });
      break;
    
    default:
      console.log('WeAnime Monitoring Dashboard');
      console.log('');
      console.log('Usage:');
      console.log('  node dashboard-monitor.js start      - Start continuous monitoring');
      console.log('  node dashboard-monitor.js status     - Show current status');
      console.log('  node dashboard-monitor.js health     - Run health check');
      console.log('  node dashboard-monitor.js performance - Run performance check');
      break;
  }
}

module.exports = MonitoringDashboard;