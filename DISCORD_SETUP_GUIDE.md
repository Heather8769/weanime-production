# 🎮 Discord Webhook Setup for WeAnime

## Step-by-Step Instructions

### 1. Go to Your Discord Server
1. **Open Discord** (desktop app or web)
2. **Navigate** to the server where you want alerts
3. **Select the channel** for error alerts (e.g., #alerts, #errors, #dev)

### 2. Create Webhook
1. **Right-click** on the channel name
2. **Select**: "Edit Channel"
3. **Go to**: "Integrations" tab
4. **Click**: "Webhooks"
5. **Click**: "New Webhook"

### 3. Configure Webhook
1. **Name**: `WeAnime Error Monitor`
2. **Avatar**: (optional) Upload a custom icon
3. **Channel**: Confirm it's the right channel
4. **Copy Webhook URL** (it looks like):
   ```
   https://discord.com/api/webhooks/000000000000000000/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```

### 4. Add to Environment File
1. **Open**: `.env.local` in your WeAnime project
2. **Add this line** (replace with your actual URL):
   ```bash
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/000000000000000000/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
   ```
3. **Save the file**

### 5. Restart Development Server
```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

### 6. Test Your Discord Webhook
1. **Visit**: http://localhost:3000/admin/webhooks
2. **Click**: "Test Critical Error" button
3. **Check your Discord channel** for the test message!

## What You'll See in Discord

### Critical Error Alert:
```
🚨 **WeAnime CRITICAL ERROR**

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

### Warning Alert:
```
⚠️ **WeAnime WARNING**

🟡 WARNING
High API response time detected

Component: AnimeSearch
Response Time: 2.5s (threshold: 1s)

WeAnime Error Monitor
```

## Troubleshooting

### If webhook doesn't work:
1. **Check URL**: Make sure it starts with `https://discord.com/api/webhooks/`
2. **Check permissions**: Ensure you have "Manage Webhooks" permission in the channel
3. **Check environment**: Restart the development server after adding the URL
4. **Check console**: Look for error messages in the browser console

### If you can't create webhooks:
- You might not have "Manage Webhooks" permission
- Ask a server admin to create the webhook for you
- Or create your own Discord server for testing

### If webhook gets deleted:
- Discord webhooks can be deleted by server admins
- You'll need to create a new one and update the URL

## Advanced Configuration

### Custom Webhook Settings:
- **Rate Limiting**: Discord allows 30 requests per minute per webhook
- **Message Limits**: 2000 characters per message
- **Embed Limits**: 10 embeds per message, 6000 characters total

### Multiple Channels:
You can create multiple webhooks for different alert types:
```bash
# In .env.local
DISCORD_WEBHOOK_URL_ERRORS=https://discord.com/api/webhooks/.../...
DISCORD_WEBHOOK_URL_WARNINGS=https://discord.com/api/webhooks/.../...
DISCORD_WEBHOOK_URL_INFO=https://discord.com/api/webhooks/.../...
```

## Ready to Test Both Platforms?
Once both Slack and Discord are configured, we'll test the complete system!
