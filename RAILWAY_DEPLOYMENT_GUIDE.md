# 🚂 Railway Deployment Guide

This guide walks you through deploying WeAnime to Railway staging and production environments.

## 📋 Prerequisites

- Railway account (Pro plan recommended)
- GitHub repository with WeAnime code
- Railway CLI installed
- Node.js 20.19.2 or later

## 🚀 Quick Deployment

### Option 1: Automated Script (Recommended)

```bash
# Deploy to staging
./deploy-railway.sh staging

# Deploy to production (when ready)
./deploy-railway.sh production
```

### Option 2: Manual Deployment

#### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

#### Step 2: Login to Railway

```bash
railway login
```

#### Step 3: Link to Project

```bash
# Link to existing staging project
railway link ebac8f71-9a82-45ab-86a2-02e9351a0ef7
```

#### Step 4: Set Environment Variables

```bash
# Required environment variables
railway variables set NEXT_PUBLIC_ENABLE_REAL_CRUNCHYROLL=true
railway variables set NEXT_PUBLIC_ENABLE_MOCK_DATA=false
railway variables set NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING=true
railway variables set NEXT_PUBLIC_ENABLE_ERROR_COLLECTION=true
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://zwvilprhyvzwcrhkyhjy.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dmlscHJoeXZ6d2NyaGt5aGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MjQ5MDcsImV4cCI6MjA2NDIwMDkwN30.a311f_FWXppFGTmASz3k7P76ymq1JLJk15oskuII2LA
```

#### Step 5: Deploy

```bash
railway up
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_ENABLE_REAL_CRUNCHYROLL` | Enable real Crunchyroll integration | Yes |
| `NEXT_PUBLIC_ENABLE_MOCK_DATA` | Enable mock data (set to false) | Yes |
| `NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING` | Enable performance monitoring | Yes |
| `NEXT_PUBLIC_ENABLE_ERROR_COLLECTION` | Enable error collection | Yes |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | Yes |

## 🌐 URLs

After successful deployment, your application will be available at:

- **Staging**: `https://weanime-staging-production.up.railway.app`

## 📊 Monitoring

### Health Checks

Your deployed application includes health check endpoints:

- **Frontend Health**: `https://your-app.railway.app/api/health-check`
- **Performance Dashboard**: `https://your-app.railway.app/admin/performance`

### Useful Railway Commands

```bash
# View deployment logs
railway logs

# Check deployment status
railway status

# Open application in browser
railway open

# View environment variables
railway variables
```

## 🔍 Troubleshooting

### Common Issues

#### Build Failures

1. **TypeScript Errors**
   ```bash
   # Run type check locally
   npm run type-check
   ```

2. **Lint Errors**
   ```bash
   # Fix lint issues
   npm run lint:fix
   ```

#### Runtime Issues

1. **Environment Variables Not Set**
   - Check Railway dashboard > Variables
   - Ensure all required variables are set

2. **Supabase Connection Issues**
   - Verify Supabase URL and key
   - Check Supabase project status

### Getting Help

1. **Railway Logs**
   ```bash
   railway logs --tail
   ```

2. **Support**
   - Railway Discord community
   - GitHub issues

---

**Happy Deploying!** 🚀
