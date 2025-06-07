# 🚀 WeAnime Localhost Quick Start Guide

## ⚡ **Super Quick Test (2 minutes)**

### **1. Run Automated Tests**
```bash
# Navigate to project directory
cd Desktop/weanime

# Run comprehensive localhost tests
./scripts/test-localhost.sh
```

### **2. Access Test Dashboard**
Once the server starts, visit:
```
http://localhost:3000/test
```

### **3. Quick Manual Verification**
- ✅ Homepage loads: `http://localhost:3000`
- ✅ Monitoring works: `http://localhost:3000/admin/monitoring`
- ✅ PWA manifest: `http://localhost:3000/manifest.json`

## 🔧 **If You Need to Set Up Environment First**

### **1. Create Environment File**
```bash
# Copy template
cp .env.production.template .env.local

# Edit with your values (minimum required)
nano .env.local
```

**Minimum required values:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Run Tests**
```bash
./scripts/test-localhost.sh
```

## 📊 **Test Dashboard Features**

Visit `http://localhost:3000/test` for:

### **Automated Tests**
- ✅ Environment variables check
- ✅ Database connection test
- ✅ Error logging system test
- ✅ Performance test
- ✅ Security configuration test
- ✅ PWA components test

### **Manual Testing Tools**
- 📋 Interactive checklist
- 🔗 Quick links to all pages
- 🚨 Error trigger buttons
- 📱 Mobile testing reminders

### **Error Testing**
- Trigger test errors to verify logging
- Check monitoring dashboard
- Verify error alerts (if webhooks configured)

## 🎯 **What to Look For**

### **✅ Success Indicators**
- All automated tests show "PASS"
- Homepage loads without errors
- Navigation works smoothly
- Monitoring dashboard accessible
- No console errors
- PWA components load correctly

### **❌ Common Issues & Fixes**

#### **Port 3000 in use**
```bash
# Kill existing process
lsof -ti:3000 | xargs kill -9
```

#### **Environment variables missing**
```bash
# Check what's missing
cat .env.local
# Update with correct Supabase values
```

#### **Build errors**
```bash
# Clean and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### **Supabase connection fails**
- Check Supabase project is active
- Verify API keys are correct
- Check internet connection

## 🚀 **Ready for Staging?**

### **Checklist Before Staging**
- [ ] All automated tests pass
- [ ] Manual tests completed
- [ ] No critical console errors
- [ ] Performance acceptable
- [ ] Error logging works
- [ ] PWA components functional

### **Next Steps**
```bash
# If all tests pass, deploy to staging
./scripts/deploy-staging.sh
```

## 📞 **Need Help?**

### **Common Commands**
```bash
# Start development server manually
npm run dev

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build

# Test webhooks (if configured)
node scripts/test-webhooks.js
```

### **Useful URLs**
- **Test Dashboard**: `http://localhost:3000/test`
- **Monitoring**: `http://localhost:3000/admin/monitoring`
- **API Health**: `http://localhost:3000/api/health`
- **System Test**: `http://localhost:3000/api/test/system`

### **Debug Mode**
```bash
# Run with debug output
DEBUG=* npm run dev

# Check specific component
curl http://localhost:3000/api/health
```

---

## 🎉 **That's It!**

The localhost testing should take **less than 5 minutes** and will give you confidence that everything is working before deploying to staging and production.

**Happy Testing! 🧪✨**
