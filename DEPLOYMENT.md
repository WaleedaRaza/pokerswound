# 🚀 DEPLOYMENT GUIDE - Railway & Domain Setup

**Purpose:** Deploy PokerGeek.AI to production  
**Platform:** Railway.app  
**Database:** Supabase PostgreSQL  
**Domain:** pokergeek.ai

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### **Code Ready:**
- [x] Zoom-lock table wired to backend
- [x] Hydration system implemented
- [x] Refresh bug fixed
- [x] All routes configured
- [x] WebSocket handlers ready
- [ ] Test locally (verify before deploy)

### **Environment Variables Ready:**
```bash
# Database (Supabase)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# JWT Auth
JWT_SECRET=<generate-new-for-production>

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...upstash.io
UPSTASH_REDIS_REST_TOKEN=...

# Server
NODE_ENV=production
PORT=3000

# Session
SESSION_SECRET=<generate-new-for-production>

# CORS (production domain)
ALLOWED_ORIGINS=https://pokergeek.ai,https://www.pokergeek.ai
```

---

## 🚂 RAILWAY DEPLOYMENT STEPS

### **Step 1: Install Railway CLI**
```bash
npm install -g @railway/cli
railway login
```

### **Step 2: Initialize Railway Project**
```bash
# In project directory
railway init

# Select:
# - Create new project
# - Name: PokerGeek-AI-Production
# - Environment: production
```

### **Step 3: Link to Git Repository**
```bash
railway link

# Or manual setup:
# - Go to railway.app/dashboard
# - New Project → Deploy from GitHub
# - Select repository: PokerGeek.AI
# - Branch: main
```

### **Step 4: Add Environment Variables**
```bash
# Via CLI:
railway variables set DATABASE_URL="postgresql://..."
railway variables set SUPABASE_URL="https://..."
railway variables set JWT_SECRET="<new-secret>"
railway variables set SESSION_SECRET="<new-secret>"

# Or via Dashboard:
# - railway.app → Project → Variables tab
# - Paste all environment variables
```

### **Step 5: Configure Build Settings**
Railway automatically detects:
- `package.json` → Node.js app
- `npm run build` → TypeScript compilation
- `npm start` → Starts server

**Verify in railway.json:**
- Build command: `npm install && npm run build`
- Start command: `node sophisticated-engine-server.js`

### **Step 6: Deploy**
```bash
railway up

# Or automatic via GitHub:
# - Push to main branch
# - Railway auto-deploys
```

### **Step 7: Monitor Deployment**
```bash
railway logs

# Watch for:
# ✅ Database connected successfully
# ✅ Server running on port 3000
# ✅ WebSocket server ready
# ✅ Routes loaded
```

---

## 🌐 DOMAIN CONFIGURATION

### **Step 1: Add Custom Domain in Railway**
```bash
railway domain

# Or via Dashboard:
# - Settings → Domains
# - Add Custom Domain: pokergeek.ai
# - Add: www.pokergeek.ai
```

### **Step 2: DNS Configuration**
Railway provides:
- **CNAME target:** `<project>.up.railway.app`

**In your DNS provider (Namecheap/Cloudflare/etc.):**
```
Type: CNAME
Name: @
Value: <your-project>.up.railway.app
TTL: Automatic

Type: CNAME  
Name: www
Value: <your-project>.up.railway.app
TTL: Automatic
```

### **Step 3: SSL Certificate**
Railway auto-provisions Let's Encrypt SSL:
- Wait 5-10 minutes after DNS propagation
- Verify: https://pokergeek.ai (should show green lock)

---

## 🔒 PRODUCTION SECURITY CHECKLIST

### **Before Going Live:**
- [ ] Change all secrets (JWT_SECRET, SESSION_SECRET)
- [ ] Enable CORS only for production domain
- [ ] Set NODE_ENV=production
- [ ] Enable helmet.js security headers (already in server)
- [ ] Rate limiting enabled (already in server)
- [ ] Database connection pooling configured
- [ ] WebSocket connection limits set

### **Supabase Security:**
- [ ] Row Level Security (RLS) enabled on critical tables
- [ ] Service role key NEVER exposed to frontend
- [ ] Anon key has limited permissions
- [ ] Database backups enabled (automatic in Supabase)

---

## 📊 POST-DEPLOYMENT VERIFICATION

### **Health Checks:**
```bash
# Basic connectivity
curl https://pokergeek.ai/

# API health
curl https://pokergeek.ai/api/rooms

# WebSocket health (in browser console)
const socket = io('https://pokergeek.ai');
socket.on('connect', () => console.log('✅ WebSocket connected'));
```

### **Feature Tests:**
1. **Room Creation:**
   - Go to https://pokergeek.ai/play
   - Create room
   - Verify invite code generated

2. **Player Join:**
   - Share invite link
   - Friend joins
   - Host approves
   - Verify shows in lobby

3. **Game Start:**
   - Claim seats (2+ players)
   - Host starts game
   - Verify redirects to /game/:roomId

4. **Refresh Test:**
   - Mid-game, press F5
   - Verify: Same cards, same pot, same state
   - Verify: Can continue playing

5. **Actions:**
   - Fold, call, raise
   - Verify: Broadcasts to all players
   - Verify: UI updates in real-time

---

## 🔧 PRODUCTION MONITORING

### **Railway Dashboard:**
- Metrics: CPU, Memory, Network
- Logs: Real-time application logs
- Deployments: History and rollback

### **Alerts to Set Up:**
```bash
# Railway CLI:
railway notifications enable

# Set up alerts for:
# - Deployment failures
# - High error rates  
# - Memory/CPU spikes
# - Database connection failures
```

### **Supabase Dashboard:**
- Database: Monitor query performance
- Storage: Check disk usage
- API: Monitor request rates

---

## 🔄 ROLLBACK PROCEDURE

### **If Deployment Fails:**
```bash
# Railway auto-rollback on failure
# Or manual rollback:
railway rollback

# Or via Dashboard:
# - Deployments tab
# - Click previous successful deployment
# - Click "Redeploy"
```

### **If Code Bug in Production:**
```bash
# Quick fix option:
git revert <bad-commit>
git push origin main
# Railway auto-deploys revert

# Or rollback deployment (see above)
```

---

## 🎯 SCALING CONFIGURATION

### **Current Setup (Single Instance):**
- Railway: 1 instance
- Good for: 100-500 concurrent users
- Cost: ~$20/month

### **When to Scale (>500 Users):**

**Add Redis (Upstash):**
```bash
# Railway Dashboard:
# - Add Redis plugin
# - Copy connection URL
# - Add to environment variables
```

**Enable Horizontal Scaling:**
```javascript
// In sophisticated-engine-server.js (future)
// 1. Add Redis session store
// 2. Add Socket.IO Redis adapter
// 3. Railway: Increase instances (Settings → Replicas)
```

---

## 📝 PRODUCTION URLS

**After Deployment:**
- Main site: https://pokergeek.ai
- Play lobby: https://pokergeek.ai/play
- Game table: https://pokergeek.ai/game/:roomId
- API: https://pokergeek.ai/api/*

**Testing:**
- Staging: https://staging.pokergeek.ai (optional)

---

## 🛠️ MAINTENANCE

### **Regular Tasks:**

**Daily:**
- Check Railway logs for errors
- Monitor Supabase query performance
- Review user feedback

**Weekly:**
- Database backups verification (auto in Supabase)
- Dependency updates check
- Performance metrics review

**Monthly:**
- Cost optimization
- Feature usage analysis
- Security audit

---

## 🚨 TROUBLESHOOTING

### **"Cannot connect to database"**
- Check: DATABASE_URL correct in Railway variables
- Check: Supabase allows Railway IP (should be open for Postgres)
- Fix: Update connection string

### **"WebSocket not connecting"**
- Check: CORS allowed origins include production domain
- Check: Railway HTTPS/WSS configured (auto)
- Fix: Update ALLOWED_ORIGINS environment variable

### **"Refresh doesn't work in production"**
- Check: Hydration endpoint accessible (test with curl)
- Check: Browser console for errors
- Fix: Verify routing correct, test locally first

### **"Users seeing 500 errors"**
- Check: Railway logs (`railway logs --tail 100`)
- Check: Database connection pool not exhausted
- Fix: Increase pool size or add connection retry logic

---

## 🎖️ DEPLOYMENT COMPLETE CHECKLIST

Before announcing launch:
- [ ] Domain resolves to Railway (pokergeek.ai)
- [ ] SSL certificate active (https works)
- [ ] Can create room
- [ ] Can join room
- [ ] Can start game
- [ ] Refresh works mid-game
- [ ] Actions broadcast correctly
- [ ] No console errors
- [ ] Mobile works (test on phone)
- [ ] 2-player test game completes successfully
- [ ] 10-player test (stress test)

---

**Ready to deploy when Commander gives signal.** ⚔️

