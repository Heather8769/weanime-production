#!/usr/bin/env node

// Quick Webhook Test Script for WeAnime
// Run with: node test-webhooks-quick.js

const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

console.log('🔔 WeAnime Webhook Quick Test');
console.log('============================');

// Check configuration
console.log('\n📋 Configuration Check:');
console.log(`Slack:   ${SLACK_WEBHOOK_URL ? '✅ Configured' : '❌ Not configured'}`);
console.log(`Discord: ${DISCORD_WEBHOOK_URL ? '✅ Configured' : '❌ Not configured'}`);

if (!SLACK_WEBHOOK_URL && !DISCORD_WEBHOOK_URL) {
  console.log('\n⚠️  No webhooks configured. Please add webhook URLs to .env.local');
  console.log('\nExample:');
  console.log('SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...');
  console.log('DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...');
  process.exit(1);
}

// Function to send webhook
function sendWebhook(url, payload) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'WeAnime-Webhook-Test/1.0'
      }
    };

    const req = (urlObj.protocol === 'https:' ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve({ status: res.statusCode, data });
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// Test Slack webhook
async function testSlack() {
  if (!SLACK_WEBHOOK_URL) return false;

  console.log('\n🔵 Testing Slack webhook...');
  
  const payload = {
    text: "🎉 WeAnime Webhook Test - Slack Integration Working!",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*🎉 SUCCESS!*\n\nYour Slack webhook is working perfectly!\n\n*App:* WeAnime\n*Test Time:* " + new Date().toISOString() + "\n*Status:* All systems operational"
        }
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: {
              type: "plain_text",
              text: "🔍 View Dashboard"
            },
            url: "http://localhost:3000/admin/monitoring",
            style: "primary"
          }
        ]
      }
    ]
  };

  try {
    await sendWebhook(SLACK_WEBHOOK_URL, payload);
    console.log('  ✅ Slack webhook test successful!');
    return true;
  } catch (error) {
    console.log('  ❌ Slack webhook test failed:', error.message);
    return false;
  }
}

// Test Discord webhook
async function testDiscord() {
  if (!DISCORD_WEBHOOK_URL) return false;

  console.log('\n🟣 Testing Discord webhook...');
  
  const payload = {
    content: "🎉 **WeAnime Webhook Test - Discord Integration Working!**",
    embeds: [
      {
        title: "🎉 SUCCESS!",
        description: "Your Discord webhook is working perfectly!",
        color: 3447003, // Blue color
        fields: [
          {
            name: "App",
            value: "WeAnime",
            inline: true
          },
          {
            name: "Test Time",
            value: new Date().toISOString(),
            inline: true
          },
          {
            name: "Status",
            value: "All systems operational",
            inline: false
          }
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "WeAnime Error Monitor"
        }
      }
    ]
  };

  try {
    await sendWebhook(DISCORD_WEBHOOK_URL, payload);
    console.log('  ✅ Discord webhook test successful!');
    return true;
  } catch (error) {
    console.log('  ❌ Discord webhook test failed:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  const results = {
    slack: await testSlack(),
    discord: await testDiscord()
  };

  console.log('\n📊 Test Results:');
  console.log(`Slack:   ${results.slack ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Discord: ${results.discord ? '✅ PASS' : '❌ FAIL'}`);

  if (results.slack || results.discord) {
    console.log('\n🎉 Webhook test completed successfully!');
    console.log('Check your Slack/Discord channels for test messages.');
    console.log('\n📝 Next steps:');
    console.log('1. Visit http://localhost:3000/admin/webhooks to test more alert types');
    console.log('2. Trigger a real error to test the integration');
    console.log('3. Configure alert rules and thresholds');
  } else {
    console.log('\n⚠️  No webhooks are working. Please check your configuration.');
  }

  process.exit(results.slack || results.discord ? 0 : 1);
}

// Run the tests
runTests().catch(console.error);
