# 🔔 WeAnime Webhook Setup Guide

## 🚀 Quick Setup Instructions

### **Option 1: Slack Webhook (Recommended)**

1. **Go to Slack API**: https://api.slack.com/apps
2. **Create New App** → "From scratch"
3. **App Name**: "WeAnime Error Monitor"
4. **Select your workspace**
5. **Go to "Incoming Webhooks"** → Toggle ON
6. **Add New Webhook to Workspace**
7. **Select channel** (e.g., #alerts, #errors, #dev-alerts)
8. **Copy the webhook URL**

### **Option 2: Discord Webhook**

1. **Go to your Discord server**
2. **Right-click on channel** → "Edit Channel"
3. **Go to "Integrations"** → "Webhooks"
4. **Create Webhook**
5. **Name**: "WeAnime Error Monitor"
6. **Copy webhook URL**

### **Option 3: Test with RequestBin (For Testing)**

1. **Go to**: https://requestbin.com/
2. **Create a RequestBin**
3. **Copy the URL** (for testing purposes)

## 🔧 Add to Environment Variables

Add your webhook URL to `.env.local`:

```bash
# Webhook Configuration (choose one or both)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/DISCORD/WEBHOOK

# Or for testing
TEST_WEBHOOK_URL=https://your-requestbin-url.com
```

## 🧪 Test Your Webhooks

After adding the webhook URL, test it:

```bash
# Test the webhook system
node scripts/test-webhooks.js

# Or test via API
curl -X POST http://localhost:3001/api/test/system \
  -H "Content-Type: application/json" \
  -d '{"testType":"error"}'
```

## 📱 What You'll Receive

### **Slack Alert Example:**
```
🚨 Critical Error in WeAnime

Error: Database connection timeout
Component: VideoPlayer
URL: /watch/anime-123
User: user@example.com
Time: 2024-01-15 14:30:00 UTC

[View Dashboard] [View Metrics]
```

### **Discord Alert Example:**
```
🚨 **WeAnime Critical Error**

🔴 CRITICAL ERROR
Database connection timeout detected

Component: VideoPlayer
URL: /watch/anime-123
User: user@example.com

Error Details:
```
Error: Connection timeout
  at Database.connect (db.js:45)
  at VideoPlayer.loadEpisode (player.js:123)
```

WeAnime Error Monitor
```

## ⚡ Quick Start (Copy & Paste)

**For Slack:**
```bash
echo 'SLACK_WEBHOOK_URL=YOUR_SLACK_WEBHOOK_URL_HERE' >> .env.local
```

**For Discord:**
```bash
echo 'DISCORD_WEBHOOK_URL=YOUR_DISCORD_WEBHOOK_URL_HERE' >> .env.local
```

**Test immediately:**
```bash
node scripts/test-webhooks.js
```

## 🎯 Ready to Continue?

Once you've added a webhook URL to `.env.local`, we can:
1. ✅ Test the webhook alerts
2. ✅ Deploy to staging
3. ✅ Deploy to production

**Just let me know when you've added a webhook URL and I'll continue with the deployment!**
