#!/usr/bin/env node

/**
 * Performance Testing Script for Anime Streaming App
 * Tests Core Web Vitals, load times, and bundle analysis
 */

const puppeteer = require('puppeteer');
const lighthouse = require('lighthouse');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';
const ROUTES_TO_TEST = [
  '/',
  '/browse',
  '/trending',
  '/seasonal',
  '/auth/login',
  '/auth/signup'
];

class PerformanceTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      routes: {},
      summary: {}
    };
  }

  async runTests() {
    console.log('🚀 Starting Performance Tests...\n');
    
    try {
      // Test each route
      for (const route of ROUTES_TO_TEST) {
        console.log(`📊 Testing route: ${route}`);
        await this.testRoute(route);
      }

      // Generate summary
      this.generateSummary();
      
      // Save results
      await this.saveResults();
      
      console.log('\n✅ Performance testing completed!');
      console.log(`📄 Results saved to: performance-results.json`);
      
    } catch (error) {
      console.error('❌ Performance testing failed:', error);
    }
  }

  async testRoute(route) {
    const url = `${BASE_URL}${route}`;
    
    try {
      // Basic load test
      const loadTest = await this.testPageLoad(url);
      
      // Lighthouse audit (Core Web Vitals)
      const lighthouseTest = await this.runLighthouse(url);
      
      this.results.routes[route] = {
        url,
        loadTest,
        lighthouse: lighthouseTest,
        timestamp: new Date().toISOString()
      };
      
      console.log(`  ✓ Load time: ${loadTest.loadTime}ms`);
      console.log(`  ✓ Performance score: ${lighthouseTest.performance}/100`);
      
    } catch (error) {
      console.error(`  ❌ Failed to test ${route}:`, error.message);
      this.results.routes[route] = {
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  async testPageLoad(url) {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    try {
      const page = await browser.newPage();
      
      // Enable performance monitoring
      await page.setCacheEnabled(false);
      
      const startTime = Date.now();
      
      // Navigate and wait for load
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      const loadTime = Date.now() - startTime;
      
      // Get performance metrics
      const metrics = await page.metrics();
      
      // Get Core Web Vitals
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {};
          
          // LCP (Largest Contentful Paint)
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              vitals.lcp = entries[entries.length - 1].startTime;
            }
          }).observe({ entryTypes: ['largest-contentful-paint'] });
          
          // FID (First Input Delay) - simulated
          vitals.fid = 0; // Would need real user interaction
          
          // CLS (Cumulative Layout Shift)
          new PerformanceObserver((list) => {
            let cls = 0;
            for (const entry of list.getEntries()) {
              if (!entry.hadRecentInput) {
                cls += entry.value;
              }
            }
            vitals.cls = cls;
          }).observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve(vitals), 2000);
        });
      });
      
      return {
        loadTime,
        metrics: {
          domContentLoaded: metrics.DOMContentLoaded * 1000,
          firstMeaningfulPaint: metrics.FirstMeaningfulPaint * 1000,
          jsHeapUsedSize: Math.round(metrics.JSHeapUsedSize / 1024 / 1024 * 100) / 100, // MB
          jsHeapTotalSize: Math.round(metrics.JSHeapTotalSize / 1024 / 1024 * 100) / 100, // MB
        },
        webVitals
      };
      
    } finally {
      await browser.close();
    }
  }

  async runLighthouse(url) {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const { lhr } = await lighthouse(url, {
        port: new URL(browser.wsEndpoint()).port,
        output: 'json',
        logLevel: 'error',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo']
      });
      
      await browser.close();
      
      return {
        performance: Math.round(lhr.categories.performance.score * 100),
        accessibility: Math.round(lhr.categories.accessibility.score * 100),
        bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
        seo: Math.round(lhr.categories.seo.score * 100),
        metrics: {
          firstContentfulPaint: lhr.audits['first-contentful-paint'].numericValue,
          largestContentfulPaint: lhr.audits['largest-contentful-paint'].numericValue,
          cumulativeLayoutShift: lhr.audits['cumulative-layout-shift'].numericValue,
          totalBlockingTime: lhr.audits['total-blocking-time'].numericValue,
          speedIndex: lhr.audits['speed-index'].numericValue
        }
      };
      
    } catch (error) {
      console.warn(`  ⚠️  Lighthouse test failed for ${url}: ${error.message}`);
      return {
        performance: 0,
        accessibility: 0,
        bestPractices: 0,
        seo: 0,
        error: error.message
      };
    }
  }

  generateSummary() {
    const routes = Object.values(this.results.routes).filter(r => !r.error);
    
    if (routes.length === 0) {
      this.results.summary = { error: 'No successful tests' };
      return;
    }
    
    const avgLoadTime = routes.reduce((sum, r) => sum + r.loadTest.loadTime, 0) / routes.length;
    const avgPerformance = routes.reduce((sum, r) => sum + r.lighthouse.performance, 0) / routes.length;
    const avgAccessibility = routes.reduce((sum, r) => sum + r.lighthouse.accessibility, 0) / routes.length;
    
    this.results.summary = {
      totalRoutesTested: routes.length,
      averageLoadTime: Math.round(avgLoadTime),
      averagePerformanceScore: Math.round(avgPerformance),
      averageAccessibilityScore: Math.round(avgAccessibility),
      recommendations: this.generateRecommendations(routes)
    };
  }

  generateRecommendations(routes) {
    const recommendations = [];
    
    const avgLoadTime = routes.reduce((sum, r) => sum + r.loadTest.loadTime, 0) / routes.length;
    const avgPerformance = routes.reduce((sum, r) => sum + r.lighthouse.performance, 0) / routes.length;
    
    if (avgLoadTime > 3000) {
      recommendations.push('⚠️  Average load time is over 3 seconds. Consider code splitting and lazy loading.');
    }
    
    if (avgPerformance < 90) {
      recommendations.push('⚠️  Performance score below 90. Optimize images, reduce bundle size, and implement caching.');
    }
    
    // Check for memory usage
    const highMemoryRoutes = routes.filter(r => r.loadTest.metrics.jsHeapUsedSize > 50);
    if (highMemoryRoutes.length > 0) {
      recommendations.push('⚠️  High memory usage detected. Review component efficiency and memory leaks.');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ Performance looks good! No major issues detected.');
    }
    
    return recommendations;
  }

  async saveResults() {
    const resultsPath = path.join(process.cwd(), 'performance-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(this.results, null, 2));
    
    // Also create a readable report
    const reportPath = path.join(process.cwd(), 'performance-report.md');
    const report = this.generateMarkdownReport();
    fs.writeFileSync(reportPath, report);
  }

  generateMarkdownReport() {
    const { summary, routes } = this.results;
    
    let report = `# Performance Test Report\n\n`;
    report += `**Generated:** ${this.results.timestamp}\n\n`;
    
    if (summary.error) {
      report += `## ❌ Error\n\n${summary.error}\n\n`;
      return report;
    }
    
    report += `## 📊 Summary\n\n`;
    report += `- **Routes Tested:** ${summary.totalRoutesTested}\n`;
    report += `- **Average Load Time:** ${summary.averageLoadTime}ms\n`;
    report += `- **Average Performance Score:** ${summary.averagePerformanceScore}/100\n`;
    report += `- **Average Accessibility Score:** ${summary.averageAccessibilityScore}/100\n\n`;
    
    report += `## 🎯 Recommendations\n\n`;
    summary.recommendations.forEach(rec => {
      report += `${rec}\n\n`;
    });
    
    report += `## 📋 Detailed Results\n\n`;
    
    Object.entries(routes).forEach(([route, data]) => {
      if (data.error) {
        report += `### ❌ ${route}\n\n**Error:** ${data.error}\n\n`;
        return;
      }
      
      report += `### ${route}\n\n`;
      report += `- **Load Time:** ${data.loadTest.loadTime}ms\n`;
      report += `- **Performance Score:** ${data.lighthouse.performance}/100\n`;
      report += `- **Accessibility Score:** ${data.lighthouse.accessibility}/100\n`;
      report += `- **Memory Usage:** ${data.loadTest.metrics.jsHeapUsedSize}MB\n\n`;
    });
    
    return report;
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new PerformanceTester();
  tester.runTests().catch(console.error);
}

module.exports = PerformanceTester;
