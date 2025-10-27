# 🚀 DEPLOY NOW - COPY/PASTE COMMANDS

**All code changes pushed to GitHub. Follow these exact steps:**

---

## STEP 1: Railway Setup (Web Dashboard)

**Go to:** https://railway.app/new

**Click:** "Deploy from GitHub repo"

**Select:** `WaleedaRaza/pokerswound` (your repo)

**Configure:**
- Branch: `main`
- Root Directory: `/` (leave blank)
- Build Command: Auto-detected (`npm run build`)
- Start Command: Auto-detected (`npm start`)

**Click:** "Deploy"

---

## STEP 2: Add Environment Variables

**In Railway Dashboard → Variables Tab:**

**Click:** "RAW Editor"

**Paste This (Update values):**
```
DATABASE_URL=postgresql://postgres.xxx:[PASSWORD]@xxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-key>
JWT_SECRET=<run command below>
SESSION_SECRET=<run command below>
NODE_ENV=production
PORT=3000
```

**Generate Secrets (run in terminal):**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy first output → JWT_SECRET  
Run again, copy → SESSION_SECRET

**Click:** "Save"

Railway will automatically redeploy with new environment variables.

---

## STEP 3: Wait for Deployment (2-3 minutes)

**Watch Deployment Logs:**
- Railway Dashboard → Deployments tab
- Click latest deployment
- Watch logs for:
  - ✅ "Database connected successfully"
  - ✅ "Server running on port 3000"
  - ✅ "WebSocket server ready"

**If errors:** Check logs, fix environment variables, redeploy

---

## STEP 4: Test Railway URL

**Railway provides temporary URL:** `https://<your-project>.up.railway.app`

**Test:**
```bash
# Open in browser:
https://<your-project>.up.railway.app/play

# Should show: Play lobby page
```

**Create room, join, start game, REFRESH →** Should work ✅

---

## STEP 5: Connect Custom Domain

**In Railway:**
1. Settings → Domains
2. Click "Add Custom Domain"
3. Enter: `pokergeek.ai`
4. Click "Add Domain"
5. Repeat for: `www.pokergeek.ai`

**Railway shows CNAME target:** `<project>.up.railway.app`

---

## STEP 6: Update DNS

**In Your DNS Provider (Namecheap/Cloudflare/etc.):**

**Add these records:**

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

**Save changes.**

**Wait:** 5-15 minutes for DNS propagation

---

## STEP 7: Verify Domain

**Check DNS propagation:**
```bash
nslookup pokergeek.ai
# Should show Railway IP
```

**Test HTTPS:**
```
https://pokergeek.ai/play
# Should load (green lock icon)
```

---

## STEP 8: FINAL TEST

### **The Moment of Truth:**

1. Go to: https://pokergeek.ai/play
2. Create room (as host)
3. Share invite link
4. Friend joins (different browser/device)
5. Host approves
6. Both claim seats
7. Host starts game
8. **Both players press F5** 
9. **Verify:** Game continues, state preserved

**If this works: 🎉 MVP LAUNCHED**

---

## 🚨 TROUBLESHOOTING

### **"Site can't be reached"**
- DNS not propagated yet (wait 15 more min)
- CNAME record wrong (check DNS provider)
- Railway deployment failed (check logs)

### **"500 Internal Server Error"**
- Check Railway logs
- DATABASE_URL probably wrong
- Fix environment variables, redeploy

### **"Refresh still doesn't work"**
```bash
# Open browser console (F12)
# Look for errors

# Check:
1. "🌊 Fetching hydration data..." appears?
2. Network tab shows /hydrate request?
3. What's the response?
```

Contact Octavian (next session) with:
- Railway logs
- Browser console errors
- Network tab screenshot

---

## 📊 DEPLOYMENT CHECKLIST

Before announcing launch:
- [ ] Railway deployment successful
- [ ] pokergeek.ai resolves to site
- [ ] SSL certificate active (https)
- [ ] Can create room
- [ ] Can join room from different device
- [ ] Can start game
- [ ] Cards dealt correctly
- [ ] **Refresh preserves state** ← CRITICAL
- [ ] Actions work (fold/call/raise)
- [ ] Hand completes, winner shown
- [ ] Next hand starts
- [ ] No errors in console
- [ ] No errors in Railway logs

---

## 🎯 SUCCESS DEFINITION

**MVP is live when:**

Two friends can:
1. Create room on pokergeek.ai
2. Join via invite link
3. Play full poker hand
4. Either player refreshes anytime
5. Game continues seamlessly
6. Play 10 hands without issues

**At this point: LAUNCH SUCCESSFUL** 🎉

---

## NEXT STEPS AFTER SUCCESSFUL DEPLOYMENT

1. **Monitor for 24 hours**
   - Watch Railway logs
   - Fix any production bugs
   - User feedback

2. **Invite Beta Users**
   - Friends, poker community
   - Get real usage data
   - Iterate based on feedback

3. **Build Phase 2 Features**
   - Friends system
   - User profiles
   - Hand history
   - See PLATFORM_PROCEDURES.md for details

---

**All deployment instructions provided. Ready to go live.** ⚔️

