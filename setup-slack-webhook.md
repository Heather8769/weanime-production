# 🔔 Slack Webhook Setup for WeAnime

## Quick Setup Steps

### 1. Create Slack App
1. Go to: https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. **App Name**: `WeAnime Error Monitor`
4. **Select your workspace**

### 2. Enable Incoming Webhooks
1. In your app settings, go to **"Incoming Webhooks"**
2. Toggle **"Activate Incoming Webhooks"** to **ON**
3. Click **"Add New Webhook to Workspace"**
4. **Select channel** for alerts (e.g., `#alerts`, `#errors`, `#dev-alerts`)
5. **Copy the webhook URL** (starts with `https://hooks.slack.com/services/...`)

### 3. Add to Environment
```bash
# Add this line to your .env.local file:
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
```

### 4. Test the Webhook
```bash
# Run the test script
node scripts/test-webhooks.js
```

## What You'll Receive

### Critical Error Alert Example:
```
🚨 WeAnime Critical Error

Error: Database connection timeout
Component: VideoPlayer  
URL: /watch/anime-123
User: user@example.com
Time: 2024-01-15 14:30:00 UTC

Stack Trace:
```
Error: Connection timeout
  at Database.connect (db.js:45)
  at VideoPlayer.loadEpisode (player.js:123)
```

[🔍 View Dashboard] [📊 View Metrics]
```

### Warning Alert Example:
```
⚠️ WeAnime Warning

Issue: High API response time
Component: AnimeSearch
Response Time: 2.5s (threshold: 1s)
Time: 2024-01-15 14:30:00 UTC
```

## Ready to Continue?
Once you've added the Slack webhook URL to `.env.local`, let me know and I'll test it!
