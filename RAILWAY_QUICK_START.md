# ⚡ RAILWAY DEPLOYMENT - QUICK START

**Status:** Code ready, committed, pushed to GitHub  
**Next:** Deploy to Railway.app

---

## 🚀 DEPLOY NOW (5 Minutes)

### **Option A: Via Railway Dashboard** (Recommended)

1. **Go to:** https://railway.app/dashboard
2. **Click:** "New Project"
3. **Select:** "Deploy from GitHub repo"
4. **Choose:** PokerGeek.AI repository
5. **Branch:** main
6. **Click:** "Deploy Now"

Railway will automatically:
- ✅ Detect Node.js
- ✅ Run `npm install`
- ✅ Run `npm run build` (compiles TypeScript)
- ✅ Start with `node sophisticated-engine-server.js`

### **Option B: Via Railway CLI**

```bash
# Install CLI
npm install -g @railway/cli

# Login
railway login

# Initialize
railway init

# Deploy
railway up
```

---

## 🔧 ENVIRONMENT VARIABLES (REQUIRED)

**In Railway Dashboard → Variables tab, add:**

```bash
# Database (from Supabase)
DATABASE_URL=postgresql://postgres.xxx:password@xxx.supabase.co:5432/postgres

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Secrets (GENERATE NEW FOR PRODUCTION)
JWT_SECRET=<random-64-char-string>
SESSION_SECRET=<random-64-char-string>

# Redis (Optional for MVP, required for scaling)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=<your-token>

# Production
NODE_ENV=production
PORT=3000
```

**Generate Secrets:**
```bash
# In terminal:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output for JWT_SECRET

node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy output for SESSION_SECRET
```

---

## 🌐 CONNECT DOMAIN

### **Step 1: In Railway**
1. **Go to:** Project → Settings → Domains
2. **Click:** "Add Custom Domain"
3. **Enter:** pokergeek.ai
4. **Add:** www.pokergeek.ai (repeat for www)

### **Step 2: In Your DNS Provider**

Railway will show you CNAME target (e.g., `pokergeek-ai-production.up.railway.app`)

**Add these DNS records:**
```
Type: CNAME
Name: @
Target: <your-project>.up.railway.app
TTL: Automatic

Type: CNAME
Name: www  
Target: <your-project>.up.railway.app
TTL: Automatic
```

**Wait:** 5-15 minutes for DNS propagation

**Verify:** https://pokergeek.ai (should load)

---

## ✅ POST-DEPLOYMENT TEST

### **1. Basic Connectivity**
```bash
curl https://pokergeek.ai/
# Should return: HTML page
```

### **2. Create Room**
1. Go to: https://pokergeek.ai/play
2. Sign in (Google or Guest)
3. Click "Create Room"
4. **Verify:** Room created, invite code shown

### **3. Join Room (2nd Browser/Device)**
1. Copy invite link
2. Open in different browser/incognito
3. Join room
4. **Verify:** Appears in host's lobby

### **4. Start Game**
1. Host approves player
2. Both claim seats
3. Host clicks "Start Game"
4. **Verify:** Both redirect to /game/:roomId
5. **Verify:** Cards dealt

### **5. TEST REFRESH** 🔥
1. Mid-game, press F5
2. **Verify:** Same cards appear
3. **Verify:** Same pot amount
4. **Verify:** Can continue playing
5. **SUCCESS:** Refresh bug FIXED ✅

### **6. Full Hand**
1. Play hand to completion
2. **Verify:** Winner announced
3. **Verify:** Next hand starts

---

## 🚨 IF DEPLOYMENT FAILS

### **Check Railway Logs:**
```bash
railway logs --tail 100
```

**Common Issues:**

**"Cannot find module"**
- Fix: Railway needs to run `npm install` first
- Check: Build command in railway.json

**"Database connection failed"**
- Fix: DATABASE_URL variable not set
- Check: Supabase allows connections from Railway

**"Port already in use"**
- Fix: Railway sets PORT automatically
- Check: Server uses `process.env.PORT || 3000`

**"TypeScript errors"**
- Fix: Run `npm run build` locally first
- Check: dist/ folder has compiled files

---

## 🎯 SUCCESS CRITERIA

**Deployment is successful when:**
- ✅ https://pokergeek.ai loads
- ✅ Can create room
- ✅ Can join room from different device
- ✅ Game starts
- ✅ **Refresh works mid-game**
- ✅ Hand completes
- ✅ No errors in Railway logs

**At this point: MVP LAUNCHED** 🎉

---

## 📊 NEXT STEPS AFTER LAUNCH

1. **Monitor:** Railway dashboard for errors
2. **Test:** With real users (friends)
3. **Fix:** Any production-only bugs
4. **Add:** Phase 2 features (friends, profiles, etc.)
5. **Scale:** Add Redis when >100 concurrent users

---

**Railway deployment guide complete. Ready to go live.** ⚔️

