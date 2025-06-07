# 🎮 Discord Webhook Setup for WeAnime

## Quick Setup Steps

### 1. Create Discord Webhook
1. Go to your **Discord server**
2. **Right-click** on the channel for alerts
3. Select **"Edit Channel"** → **"Integrations"** → **"Webhooks"**
4. Click **"New Webhook"**
5. **Name**: `WeAnime Error Monitor`
6. **Copy the webhook URL** (starts with `https://discord.com/api/webhooks/...`)

### 2. Add to Environment
```bash
# Add this line to your .env.local file:
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/000000000000000000/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 3. Test the Webhook
```bash
# Run the test script
node scripts/test-webhooks.js
```

## What You'll Receive

### Critical Error Alert Example:
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

### Warning Alert Example:
```
⚠️ **WeAnime Warning**

🟡 WARNING
High API response time detected

Component: AnimeSearch
Response Time: 2.5s (threshold: 1s)
```

## Ready to Continue?
Once you've added the Discord webhook URL to `.env.local`, let me know and I'll test it!
