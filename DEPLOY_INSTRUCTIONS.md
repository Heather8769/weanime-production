# 🚀 WeAnime Production Deployment - Step by Step Guide

## Quick Deploy (5 Minutes)

### Step 1: Open Terminal
Open your terminal and navigate to the WeAnime directory:
```bash
cd /Users/shigeo/Desktop/weanime
```

### Step 2: Create Railway Project
Run this command and follow the prompts:
```bash
railway init
```
- Select: **"heather8769's Projects"** workspace
- Choose: **"Create new project"**
- Name: **"weanime-production"**
- Template: **"Empty Project"**

### Step 3: Connect GitHub Repository
```bash
railway connect
```
- Select: **"Connect to GitHub repository"**
- Choose: **"Heather8769/weanime-production"**

### Step 4: Set Environment Variables
Copy and paste these commands one by one:

```bash
# Supabase Configuration
railway variables set NEXT_PUBLIC_SUPABASE_URL="https://zwvilprhyvzwcrhkyhjy.supabase.co"
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dmlscHJoeXZ6d2NyaGt5aGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MjQ5MDcsImV4cCI6MjA2NDIwMDkwN30.a311f_FWXppFGTmASz3k7P76ymq1JLJk15oskuII2LA"

# Crunchyroll Credentials
railway variables set CRUNCHYROLL_USERNAME="gaklina1@maxpedia.cloud"
railway variables set CRUNCHYROLL_PASSWORD="Watch123"
railway variables set CRUNCHYROLL_LOCALE="en-US"

# Application Settings
railway variables set NEXT_PUBLIC_APP_NAME="WeAnime"
railway variables set NEXT_PUBLIC_MOCK_DATA_ENABLED="false"
railway variables set NEXT_PUBLIC_REAL_STREAMING_ONLY="true"
railway variables set NEXT_PUBLIC_DEMO_MODE="false"

# API URLs
railway variables set ANILIST_API_URL="https://graphql.anilist.co"
railway variables set JIKAN_API_URL="https://api.jikan.moe/v4"

# Security (generates random secrets)
railway variables set NEXTAUTH_SECRET="$(openssl rand -base64 32)"
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set ENCRYPTION_KEY="$(openssl rand -base64 32)"

# Performance
railway variables set RATE_LIMIT_MAX_REQUESTS="100"
railway variables set RATE_LIMIT_WINDOW_MS="900000"
railway variables set CACHE_TTL="3600"
```

### Step 5: Deploy
```bash
railway up
```

### Step 6: Get Your Live URL
```bash
railway domain
```

---

## Alternative: Manual Railway Web Setup

If CLI doesn't work, use Railway's web interface:

### 1. Go to Railway Dashboard
Visit: https://railway.app/dashboard

### 2. Create New Project
- Click **"New Project"**
- Select **"Deploy from GitHub repo"**
- Choose **"Heather8769/weanime-production"**

### 3. Configure Environment Variables
In the Railway dashboard, go to **Variables** tab and add:

```
NEXT_PUBLIC_SUPABASE_URL=https://zwvilprhyvzwcrhkyhjy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dmlscHJoeXZ6d2NyaGt5aGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MjQ5MDcsImV4cCI6MjA2NDIwMDkwN30.a311f_FWXppFGTmASz3k7P76ymq1JLJk15oskuII2LA
CRUNCHYROLL_USERNAME=gaklina1@maxpedia.cloud
CRUNCHYROLL_PASSWORD=Watch123
CRUNCHYROLL_LOCALE=en-US
NEXT_PUBLIC_APP_NAME=WeAnime
NEXT_PUBLIC_MOCK_DATA_ENABLED=false
NEXT_PUBLIC_REAL_STREAMING_ONLY=true
NEXT_PUBLIC_DEMO_MODE=false
ANILIST_API_URL=https://graphql.anilist.co
JIKAN_API_URL=https://api.jikan.moe/v4
```

Generate these secrets in your terminal and add them:
```bash
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "JWT_SECRET=$(openssl rand -base64 32)"  
echo "ENCRYPTION_KEY=$(openssl rand -base64 32)"
```

### 4. Deploy
Railway will automatically deploy when you save the environment variables.

---

## 🧪 Test Your Deployment

Once deployed, test these URLs (replace `[your-domain]` with your Railway URL):

1. **Homepage**: `https://[your-domain]`
2. **Health Check**: `https://[your-domain]/api/health`
3. **Crunchyroll Test**: `https://[your-domain]/api/test-crunchyroll`
4. **Real Anime Search**: `https://[your-domain]/api/real-anime/search?q=naruto`
5. **Admin Dashboard**: `https://[your-domain]/admin/health`

---

## 🚨 Important Notes

- ✅ Your GitHub repo is ready: `https://github.com/Heather8769/weanime-production`
- ✅ Supabase is configured and active
- ✅ Crunchyroll credentials are set
- ✅ All mock data has been eliminated
- ✅ Build process is optimized

**Deployment should take 2-3 minutes once started!**

---

## 🆘 Need Help?

If you encounter any issues:

1. **Check Railway Logs**:
   ```bash
   railway logs
   ```

2. **Verify Environment Variables**:
   ```bash
   railway variables
   ```

3. **Check Build Status**:
   Visit your Railway dashboard to see build progress

4. **Test Locally First**:
   ```bash
   npm run build
   npm start
   ```

Your WeAnime platform is ready to stream real anime content! 🎉