# 🎌 WeAnime Setup Guide

Complete setup guide for getting WeAnime running locally and in production.

## 🚀 Quick Start

### 1. Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env.local
   ```

2. **Configure Supabase (Required):**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Create a new project or use existing
   - Get your project URL and keys from Settings > API
   - Update `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

3. **Configure WeAnime Backend:**
   ```env
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

Run the Supabase migrations:
```bash
npm run db:migrate
```

Or manually create tables using the SQL in `supabase/migrations/`.

### 4. Start WeAnime Backend

**Option A: Use included backend**
```bash
cd weanime-backend
pip install -r requirements.txt
playwright install
uvicorn main:app --reload
```

**Option B: Use external backend**
Update `NEXT_PUBLIC_BACKEND_URL` in `.env.local` to point to your backend.

### 5. Start Frontend

```bash
npm run dev
```

Visit http://localhost:3000 to see WeAnime running!

---

## 🔧 Backend Integration

### WeAnime Backend APIs

The WeAnime backend provides:

- **Search**: `/api/search?q=query` - Search for anime
- **Stream**: `/api/watch?anime_slug=slug&episode_number=1` - Get streaming URLs
- **Download**: `/api/download?anime_slug=slug&episode_number=1` - Get download URLs
- **Health**: `/` - Backend health check

### API Integration Flow

```
Frontend -> WeAnime Backend -> animekai.to/hianime.to -> Stream URLs
```

### Fallback Strategy

1. **Primary**: WeAnime Backend (real anime content)
2. **Secondary**: Legal streaming APIs (if configured)
3. **Fallback**: Demo videos (for testing)

---

## 🗄️ Database Schema

### Core Tables

1. **profiles** - User accounts and premium status
2. **watchlist** - User's anime tracking (watching, completed, etc.)
3. **watch_progress** - Episode progress for auto-resume
4. **comments** - User reviews and comments

### Key Features

- **Row Level Security** enabled on all tables
- **Real-time subscriptions** for live updates
- **Auto-timestamping** for all records
- **Progress syncing** between devices

---

## 🔒 Security Features

### Content Security Policy
- Strict CSP headers prevent XSS attacks
- iframe sandboxing for external content
- URL validation for streaming sources

### Input Validation
- Zod schemas for environment variables
- Parameter validation in all API calls
- Type-safe database operations

### Error Handling
- Comprehensive error boundaries
- Secure error logging
- Rate limiting on monitoring endpoints

---

## 🎯 Testing

### Run Tests
```bash
npm test                 # All tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

### Test Coverage
- **Target**: 70% coverage on all metrics
- **Focus**: Critical streaming and auth flows
- **Tools**: Jest + Testing Library

---

## 📈 Monitoring & Health

### Health Endpoints
- `/api/health` - Overall system health
- `/api/monitoring/error` - Error analytics
- `/api/analytics/performance` - Performance metrics

### Service Status
- WeAnime Backend connectivity
- AniList API availability
- Jikan API availability
- Database connection status

---

## 🚀 Deployment

### Environment Variables (Production)

```env
# Production Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-prod-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-key

# Production Backend
NEXT_PUBLIC_BACKEND_URL=https://your-backend-domain.com

# Security
JWT_SECRET=your-secure-jwt-secret-32-chars-minimum
ENCRYPTION_KEY=your-secure-encryption-key-32-chars

# Optional Integrations
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
SENTRY_DSN=https://your-sentry-dsn
```

### Docker Deployment

```bash
npm run docker:build
npm run docker:run
```

### Vercel Deployment

1. Connect your GitHub repository
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

---

## 🐛 Troubleshooting

### Common Issues

1. **"No video sources"**
   - Check WeAnime backend is running
   - Verify `NEXT_PUBLIC_BACKEND_URL` is correct
   - Check network connectivity to backend

2. **"Supabase connection failed"**
   - Verify environment variables are set
   - Check Supabase project is active
   - Ensure service role key has correct permissions

3. **"Backend request failed"**
   - WeAnime backend may be down
   - Check backend logs for errors
   - Verify anime slug format is correct

### Debug Mode

Enable debug logging:
```env
NEXT_PUBLIC_DEBUG=true
NODE_ENV=development
```

### Health Check

Visit `/api/health` to see overall system status and identify failing services.

---

## 📚 Next Steps

1. **Configure Streaming Providers** - Add legal streaming API keys
2. **Set Up Monitoring** - Configure Sentry, Analytics
3. **Customize Design** - Modify themes and styling
4. **Add Features** - Implement social features, recommendations
5. **Scale Backend** - Deploy backend to production environment

---

## 🆘 Support

- **Issues**: Check GitHub issues for known problems
- **Logs**: Check browser console and backend logs
- **Health**: Monitor `/api/health` for service status
- **Database**: Use Supabase dashboard for data inspection

---

## ⚖️ Legal Notice

This project is for educational purposes. Always respect website terms of service and copyright laws. Use legal streaming sources when possible.