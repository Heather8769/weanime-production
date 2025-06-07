# 🧪 Local Testing Guide - WeAnime Project

## 🚀 Quick Start Testing

### 1. Start the Development Server
```bash
cd /Users/shigeo/Desktop/weanime
npm run dev
```

**Expected Output:**
```
✓ Ready in 2-3s
- Local: http://localhost:3000 (or 3001 if 3000 is busy)
```

### 2. Core Functionality Tests

#### A. Homepage Test 🏠
**URL:** `http://localhost:3001/`
**What to Check:**
- [ ] Page loads without errors
- [ ] Navigation bar appears
- [ ] Hero section displays
- [ ] No console errors in browser DevTools

#### B. API Health Check 🔍
**URL:** `http://localhost:3001/api/health`
**Expected Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-06T...",
  "version": "0.1.0"
}
```

#### C. Authentication Pages 🔐
**URLs to Test:**
- `http://localhost:3001/auth/login`
- `http://localhost:3001/auth/signup`
- `http://localhost:3001/auth/callback`

**What to Check:**
- [ ] Forms render correctly
- [ ] No TypeScript/build errors
- [ ] Supabase connection works

#### D. Core App Pages 📱
**URLs to Test:**
- `http://localhost:3001/browse` - Browse anime
- `http://localhost:3001/trending` - Trending anime
- `http://localhost:3001/seasonal` - Seasonal anime
- `http://localhost:3001/watchlist` - User watchlist
- `http://localhost:3001/profile` - User profile

#### E. Special Pages 🔧
- `http://localhost:3001/offline` - Offline PWA page
- `http://localhost:3001/status` - System status
- `http://localhost:3001/backend-test` - Backend integration test

### 3. PWA Functionality Tests

#### A. Service Worker Test
1. Open DevTools → Application → Service Workers
2. Check if service worker is registered
3. **Expected:** `sw.js` should be active

#### B. Manifest Test
**URL:** `http://localhost:3001/manifest.json`
**Expected Response:**
```json
{
  "name": "Kōkai Anime - Stream, Track, Discover",
  "short_name": "Kōkai Anime",
  "start_url": "/",
  "display": "standalone"
}
```

### 4. Performance Verification

#### A. Build Performance
```bash
npm run build
```
**Expected:**
- ✅ Build completes successfully
- ✅ No TypeScript errors
- ✅ Bundle size reasonable (~250KB for main pages)

#### B. Type Checking
```bash
npm run type-check
```
**Expected:** ✅ No TypeScript errors

#### C. Linting
```bash
npm run lint
```
**Expected:** ✅ No ESLint warnings or errors

### 5. Database Connection Tests

#### A. Supabase Connection
1. Check if environment variables are set:
   ```bash
   cat .env.local
   ```
2. Should contain:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### B. Database API Test
**URL:** `http://localhost:3001/api/anilist`
**Method:** POST
**Test Payload:**
```json
{
  "query": "{ Media(id: 1) { title { english } } }"
}
```

### 6. Video Player Tests

#### A. Video Player Component
1. Navigate to any `/watch/[id]` page
2. **What to Check:**
   - [ ] Video player renders
   - [ ] Controls are functional
   - [ ] No console errors
   - [ ] State management works

#### B. Streaming Service Test
**URL:** `http://localhost:3001/api/anime-streams?animeId=1&episode=1`
**Expected:** JSON response with streaming data

### 7. Error Handling Tests

#### A. 404 Page Test
**URL:** `http://localhost:3001/nonexistent-page`
**Expected:** Custom 404 page loads

#### B. Error Monitoring
**URL:** `http://localhost:3001/api/monitoring/error`
**Method:** POST
**Test:** Send a test error report

### 8. Mobile Responsiveness Test

#### A. Responsive Design
1. Open DevTools → Device Toolbar
2. Test different screen sizes:
   - Mobile (375px)
   - Tablet (768px)
   - Desktop (1200px)

#### B. Touch Interactions
- Test on actual mobile device or browser mobile mode
- Check gesture handling

### 9. Browser Compatibility

#### A. Test in Multiple Browsers
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if on macOS)
- [ ] Edge

### 10. Security Tests

#### A. CSP Headers
1. Open DevTools → Network → Reload page
2. Check Response Headers for security headers:
   - `X-Frame-Options: DENY`
   - `X-Content-Type-Options: nosniff`

#### B. Rate Limiting Test
Try making rapid API requests to test rate limiting

## 🚨 Common Issues & Solutions

### Issue: Port 3000 Already in Use
**Solution:** Server will automatically use port 3001
**Check:** Look for "using available port 3001" message

### Issue: Environment Variables Missing
**Solution:** 
1. Copy `.env.local.example` to `.env.local`
2. Fill in Supabase credentials

### Issue: Build Warnings
**Solution:** Most warnings about missing SMTP config are non-critical

### Issue: Slow Initial Load
**Expected:** First load may take 8-10 seconds (cold start)
**Normal:** Subsequent loads should be under 1 second

## ✅ Success Criteria

Your local environment is working properly if:

1. ✅ **Server Starts:** Dev server runs without crashing
2. ✅ **Pages Load:** All main pages render without errors
3. ✅ **API Works:** Health check returns 200 status
4. ✅ **Build Success:** Production build completes
5. ✅ **No Critical Errors:** No red errors in browser console
6. ✅ **Navigation Works:** Can navigate between pages
7. ✅ **Database Connects:** Supabase connection established

## 🔧 Quick Health Check Script

Run this to verify everything:

```bash
# 1. Check if server is running
curl -f http://localhost:3001/api/health

# 2. Verify build works
npm run build

# 3. Check types
npm run type-check

# 4. Lint code
npm run lint
```

If all these pass, your local environment is ready! 🎉