# 🔔 Slack Webhook Setup for WeAnime

## Step-by-Step Instructions

### 1. Create Slack App
1. **Open**: https://api.slack.com/apps
2. **Click**: "Create New App"
3. **Select**: "From scratch"
4. **App Name**: `WeAnime Error Monitor`
5. **Workspace**: Select your workspace
6. **Click**: "Create App"

### 2. Enable Incoming Webhooks
1. In the left sidebar, click **"Incoming Webhooks"**
2. **Toggle ON**: "Activate Incoming Webhooks"
3. **Click**: "Add New Webhook to Workspace"
4. **Select Channel**: Choose where alerts should go:
   - `#alerts` (recommended)
   - `#errors`
   - `#dev-alerts`
   - `#general` (if no dedicated channel)
5. **Click**: "Allow"

### 3. Copy Webhook URL
1. **Copy the webhook URL** (it looks like):
   ```
   https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
   ```
2. **Keep this URL safe** - you'll need it in the next step

### 4. Add to Environment File
1. **Open**: `.env.local` in your WeAnime project
2. **Add this line** (replace with your actual URL):
   ```bash
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
   ```
3. **Save the file**

### 5. Restart Development Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 6. Test Your Slack Webhook
1. **Visit**: http://localhost:3000/admin/webhooks
2. **Click**: "Test Critical Error" button
3. **Check your Slack channel** for the test message!

## What You'll See in Slack

### Critical Error Alert:
```
🚨 WeAnime CRITICAL ERROR

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

### Warning Alert:
```
⚠️ WeAnime WARNING

Issue: High API response time
Component: AnimeSearch
Response Time: 2.5s (threshold: 1s)
Time: 2024-01-15 14:30:00 UTC
```

## Troubleshooting

### If webhook doesn't work:
1. **Check URL**: Make sure it starts with `https://hooks.slack.com/services/`
2. **Check permissions**: Ensure the app has permission to post to the channel
3. **Check environment**: Restart the development server after adding the URL
4. **Check console**: Look for error messages in the browser console

### If you don't see the app creation option:
- You might not have permission to create apps in your workspace
- Ask your Slack admin to create the app for you
- Or use a personal Slack workspace for testing

## Ready for Discord Setup?
Once Slack is working, we'll set up Discord webhooks next!
