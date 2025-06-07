# 🧪 WeAnime Localhost Testing Guide

## 🚀 **Quick Start**

### **1. Run Automated Tests**
```bash
# Make script executable
chmod +x scripts/test-localhost.sh

# Run comprehensive localhost tests
./scripts/test-localhost.sh
```

### **2. Manual Testing Checklist**
After automated tests pass, perform these manual tests:

## 📋 **MANUAL TESTING CHECKLIST**

### ✅ **Homepage Testing** (`http://localhost:3000`)
- [ ] Page loads without errors
- [ ] Navigation menu displays correctly
- [ ] Hero section renders properly
- [ ] Trending anime section loads
- [ ] Seasonal anime section loads
- [ ] Footer displays correctly
- [ ] Dark theme is applied
- [ ] Glassmorphism effects visible
- [ ] Animations work smoothly

### ✅ **Navigation Testing**
- [ ] Browse page (`/browse`) loads
- [ ] Trending page (`/trending`) loads
- [ ] Seasonal page (`/seasonal`) loads
- [ ] Watchlist page (`/watchlist`) loads
- [ ] Profile page (`/profile`) loads
- [ ] All navigation links work
- [ ] Mobile menu works (resize window)

### ✅ **Video Player Testing** (`/watch/[id]`)
```bash
# Test URLs (replace with actual anime IDs)
http://localhost:3000/watch/1
http://localhost:3000/watch/21
http://localhost:3000/watch/20
```

**Test Checklist:**
- [ ] Video player component loads
- [ ] Player controls are visible
- [ ] Play/pause button works
- [ ] Volume control works
- [ ] Fullscreen toggle works
- [ ] Progress bar displays
- [ ] Quality selector appears
- [ ] Speed control works
- [ ] Error handling displays if video fails
- [ ] Loading states show properly

### ✅ **Search Functionality**
- [ ] Search input appears in navigation
- [ ] Search suggestions work (if implemented)
- [ ] Search results page loads
- [ ] Results display correctly
- [ ] No results state handles gracefully

### ✅ **Error Logging System**
1. **Access Monitoring Dashboard**:
   ```
   http://localhost:3000/admin/monitoring
   ```

2. **Test Error Logging**:
   - [ ] Dashboard loads without errors
   - [ ] Error statistics display
   - [ ] Error log list appears
   - [ ] Filters work (level, component, etc.)
   - [ ] Export functionality works
   - [ ] Clear logs functionality works

3. **Trigger Test Errors**:
   ```javascript
   // Open browser console and run:
   window.__WEANIME_ERROR_LOGGER__.logError({
     message: 'Test error from console',
     component: 'ManualTest',
     action: 'console_test'
   });
   ```
   - [ ] Error appears in monitoring dashboard
   - [ ] Error details are complete
   - [ ] Timestamp is correct

### ✅ **PWA Testing**
1. **Manifest Testing**:
   ```
   http://localhost:3000/manifest.json
   ```
   - [ ] Manifest loads correctly
   - [ ] App name and description correct
   - [ ] Icons are defined
   - [ ] Theme colors set

2. **Service Worker Testing**:
   ```
   http://localhost:3000/sw.js
   ```
   - [ ] Service worker loads
   - [ ] No console errors
   - [ ] Registration successful (check DevTools > Application > Service Workers)

3. **Installation Testing**:
   - [ ] Install prompt appears (may need to wait)
   - [ ] Installation works on mobile (use DevTools device emulation)
   - [ ] App icon appears correctly

### ✅ **Mobile Responsiveness**
**Test in DevTools Device Emulation:**

1. **Mobile Devices** (375px width):
   - [ ] Navigation collapses to hamburger menu
   - [ ] Content stacks vertically
   - [ ] Touch targets are adequate (44px minimum)
   - [ ] Text is readable
   - [ ] Images scale properly

2. **Tablet Devices** (768px width):
   - [ ] Layout adapts appropriately
   - [ ] Navigation remains functional
   - [ ] Content grid adjusts

3. **Desktop** (1200px+ width):
   - [ ] Full layout displays
   - [ ] All features accessible
   - [ ] Optimal use of screen space

### ✅ **Performance Testing**
1. **DevTools Performance Tab**:
   - [ ] Page load time < 3 seconds
   - [ ] No memory leaks detected
   - [ ] Smooth animations (60fps)
   - [ ] No layout thrashing

2. **Lighthouse Audit** (DevTools > Lighthouse):
   - [ ] Performance score > 80
   - [ ] Accessibility score > 90
   - [ ] Best Practices score > 90
   - [ ] SEO score > 80
   - [ ] PWA score > 80

### ✅ **API Testing**
Test API endpoints manually:

```bash
# Health check
curl http://localhost:3000/api/health

# Error monitoring
curl -X POST http://localhost:3000/api/monitoring/error \
  -H "Content-Type: application/json" \
  -d '{"id":"test","level":"info","message":"API test","context":{"component":"Test"}}'

# Backend health (if backend is running)
curl http://localhost:3000/api/backend/health
```

### ✅ **Browser Compatibility**
Test in multiple browsers:
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if on macOS)
- [ ] Edge

### ✅ **Console Error Check**
- [ ] No JavaScript errors in console
- [ ] No 404 errors for resources
- [ ] No CORS errors
- [ ] No TypeScript errors
- [ ] Warnings are minimal and expected

## 🔧 **Troubleshooting Common Issues**

### **Port 3000 Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
npm run dev -- -p 3001
```

### **Environment Variables Not Loading**
```bash
# Check if .env.local exists and has correct values
cat .env.local

# Restart development server
npm run dev
```

### **Build Errors**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### **Supabase Connection Issues**
1. Check Supabase project status
2. Verify API keys in `.env.local`
3. Check network connectivity
4. Review browser console for specific errors

### **Video Player Not Working**
1. Check if backend is running (if required)
2. Verify video source URLs
3. Check browser console for errors
4. Test with different anime IDs

## 📊 **Test Results Documentation**

### **Create Test Report**
Document your findings:

```markdown
# Localhost Test Results - [Date]

## ✅ Passed Tests
- [List all tests that passed]

## ⚠️ Issues Found
- [List any issues with details]

## 🔧 Fixes Applied
- [List any fixes made during testing]

## 📝 Notes
- [Additional observations]

## 🚀 Ready for Staging?
- [ ] Yes - All critical tests passed
- [ ] No - Issues need to be resolved first
```

## 🎯 **Success Criteria**

### **Minimum Requirements for Staging**
- [ ] All pages load without errors
- [ ] Navigation works correctly
- [ ] Error logging system functional
- [ ] PWA manifest and service worker load
- [ ] Mobile responsiveness acceptable
- [ ] No critical console errors
- [ ] Performance within acceptable range

### **Optimal Requirements**
- [ ] Video player fully functional
- [ ] All API endpoints responding
- [ ] Lighthouse scores > 80
- [ ] Error monitoring dashboard working
- [ ] PWA installation working
- [ ] Webhook alerts functional (if configured)

## 🚀 **Next Steps After Localhost Testing**

1. **If All Tests Pass**:
   - Proceed to staging deployment
   - Run `./scripts/deploy-staging.sh`

2. **If Issues Found**:
   - Document all issues
   - Fix critical problems
   - Re-run localhost tests
   - Repeat until all tests pass

3. **Before Staging**:
   - Commit all changes
   - Update version numbers
   - Prepare staging environment variables

---

**Happy Testing! 🧪✨**

Remember: Thorough localhost testing saves time and prevents issues in staging and production!
