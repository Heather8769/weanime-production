#!/usr/bin/env node

// WeAnime Webhook Testing Script
// Run with: node scripts/test-webhooks.js

const https = require('https');
const http = require('http');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Test message templates
const testMessages = {
  slack: {
    critical: {
      text: "🚨 WeAnime Critical Error Test",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*🔴 CRITICAL ERROR TEST*\n\n*Error:* Database connection timeout\n*Component:* VideoPlayer\n*URL:* /watch/test-anime-123\n*User:* test@example.com\n*Time:* " + new Date().toISOString()
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*Stack Trace:*\n```\nError: Connection timeout\n  at Database.connect (db.js:45)\n  at VideoPlayer.loadEpisode (player.js:123)\n```"
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
              url: "https://your-domain.com/admin/monitoring",
              style: "danger"
            },
            {
              type: "button",
              text: {
                type: "plain_text",
                text: "📊 View Metrics"
              },
              url: "https://your-domain.com/admin/analytics"
            }
          ]
        }
      ]
    },
    warning: {
      text: "⚠️ WeAnime Warning Test",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*🟡 WARNING TEST*\n\n*Issue:* High API response time\n*Component:* AnimeSearch\n*Response Time:* 2.5s (threshold: 1s)\n*Time:* " + new Date().toISOString()
          }
        }
      ]
    },
    info: {
      text: "ℹ️ WeAnime Info Test",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "*🔵 INFO TEST*\n\n*Event:* New deployment completed\n*Version:* v1.2.3\n*Environment:* Production\n*Time:* " + new Date().toISOString()
          }
        }
      ]
    }
  },
  discord: {
    critical: {
      content: "🚨 **WeAnime Critical Error Test**",
      embeds: [
        {
          title: "🔴 CRITICAL ERROR",
          description: "Database connection timeout detected",
          color: 15158332, // Red color
          fields: [
            {
              name: "Component",
              value: "VideoPlayer",
              inline: true
            },
            {
              name: "URL",
              value: "/watch/test-anime-123",
              inline: true
            },
            {
              name: "User",
              value: "test@example.com",
              inline: true
            },
            {
              name: "Error Details",
              value: "```\nError: Connection timeout\n  at Database.connect (db.js:45)\n  at VideoPlayer.loadEpisode (player.js:123)\n```",
              inline: false
            }
          ],
          timestamp: new Date().toISOString(),
          footer: {
            text: "WeAnime Error Monitor"
          }
        }
      ]
    },
    warning: {
      content: "⚠️ **WeAnime Warning Test**",
      embeds: [
        {
          title: "🟡 WARNING",
          description: "High API response time detected",
          color: 16776960, // Yellow color
          fields: [
            {
              name: "Component",
              value: "AnimeSearch",
              inline: true
            },
            {
              name: "Response Time",
              value: "2.5s (threshold: 1s)",
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    },
    info: {
      content: "ℹ️ **WeAnime Info Test**",
      embeds: [
        {
          title: "🔵 INFO",
          description: "New deployment completed",
          color: 3447003, // Blue color
          fields: [
            {
              name: "Version",
              value: "v1.2.3",
              inline: true
            },
            {
              name: "Environment",
              value: "Production",
              inline: true
            }
          ],
          timestamp: new Date().toISOString()
        }
      ]
    }
  }
};

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

// Test functions
async function testSlackWebhook() {
  if (!SLACK_WEBHOOK_URL) {
    console.log('❌ SLACK_WEBHOOK_URL not configured');
    return false;
  }

  console.log('🔵 Testing Slack webhook...');
  
  try {
    // Test critical error
    console.log('  📤 Sending critical error test...');
    await sendWebhook(SLACK_WEBHOOK_URL, testMessages.slack.critical);
    console.log('  ✅ Critical error test sent successfully');

    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test warning
    console.log('  📤 Sending warning test...');
    await sendWebhook(SLACK_WEBHOOK_URL, testMessages.slack.warning);
    console.log('  ✅ Warning test sent successfully');

    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test info
    console.log('  📤 Sending info test...');
    await sendWebhook(SLACK_WEBHOOK_URL, testMessages.slack.info);
    console.log('  ✅ Info test sent successfully');

    console.log('✅ Slack webhook tests completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Slack webhook test failed:', error.message);
    return false;
  }
}

async function testDiscordWebhook() {
  if (!DISCORD_WEBHOOK_URL) {
    console.log('❌ DISCORD_WEBHOOK_URL not configured');
    return false;
  }

  console.log('🟣 Testing Discord webhook...');
  
  try {
    // Test critical error
    console.log('  📤 Sending critical error test...');
    await sendWebhook(DISCORD_WEBHOOK_URL, testMessages.discord.critical);
    console.log('  ✅ Critical error test sent successfully');

    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test warning
    console.log('  📤 Sending warning test...');
    await sendWebhook(DISCORD_WEBHOOK_URL, testMessages.discord.warning);
    console.log('  ✅ Warning test sent successfully');

    // Wait a bit between messages
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test info
    console.log('  📤 Sending info test...');
    await sendWebhook(DISCORD_WEBHOOK_URL, testMessages.discord.info);
    console.log('  ✅ Info test sent successfully');

    console.log('✅ Discord webhook tests completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ Discord webhook test failed:', error.message);
    return false;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 WeAnime Webhook Testing Started\n');
  console.log('=' .repeat(50));

  const results = {
    slack: false,
    discord: false
  };

  // Test Slack
  results.slack = await testSlackWebhook();
  console.log('');

  // Test Discord
  results.discord = await testDiscordWebhook();
  console.log('');

  // Summary
  console.log('=' .repeat(50));
  console.log('📊 Test Results Summary:');
  console.log(`  Slack:   ${results.slack ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  Discord: ${results.discord ? '✅ PASS' : '❌ FAIL'}`);

  if (results.slack || results.discord) {
    console.log('\n🎉 At least one webhook is working! Check your channels for test messages.');
  } else {
    console.log('\n⚠️  No webhooks are configured. Please set up SLACK_WEBHOOK_URL and/or DISCORD_WEBHOOK_URL in your .env.local file.');
  }

  console.log('\n📝 Next steps:');
  console.log('  1. Check your Slack/Discord channels for test messages');
  console.log('  2. Verify the message formatting looks correct');
  console.log('  3. Test the dashboard links in the messages');
  console.log('  4. Configure alert rules in your production environment');

  process.exit(results.slack || results.discord ? 0 : 1);
}

// Run tests if called directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = {
  testSlackWebhook,
  testDiscordWebhook,
  sendWebhook
};
