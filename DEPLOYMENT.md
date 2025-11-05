# 🚀 PokerGeek.ai - Deployment Guide

**Last Updated:** November 5, 2025

---

## 📋 Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Production database created (PostgreSQL/Supabase)
- [ ] Google OAuth app configured for production domain
- [ ] All environment variables ready
- [ ] SSL certificate obtained (for HTTPS)
- [ ] Domain name configured

### 2. Database Migrations
- [ ] Run `migrations/02_identity_social_system_FIXED.sql`
- [ ] Run `migrations/03_sync_profile_stats.sql`
- [ ] Run `migrations/04_room_limits_privacy.sql`
- [ ] Verify all migrations successful
- [ ] Grant permissions to `service_role`

### 3. Code Preparation
- [ ] All tests passing
- [ ] No console errors in browser
- [ ] Build assets if needed
- [ ] Remove debug logs (or gate behind `NODE_ENV`)
- [ ] Update OAuth redirect URIs in Google Console

---

## 🗄️ Database Setup (Supabase)

### Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Name: `pokergeek-prod`
4. Database password: [Use strong password]
5. Region: Choose closest to your users
6. Click "Create Project"

### Step 2: Run Migrations
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `migrations/02_identity_social_system_FIXED.sql`
3. Click "Run" → Verify success
4. Repeat for migration 03 and 04

### Step 3: Configure Permissions
```sql
-- Grant all permissions to service_role
GRANT ALL ON user_profiles TO service_role;
GRANT ALL ON rooms TO service_role;
GRANT ALL ON game_states TO service_role;
GRANT ALL ON player_statistics TO service_role;
GRANT ALL ON friendships TO service_role;
GRANT ALL ON friend_requests TO service_role;
GRANT ALL ON notifications TO service_role;
GRANT ALL ON username_changes TO service_role;
GRANT ALL ON hand_history TO service_role;
```

### Step 4: Get API Keys
1. Supabase Dashboard → Settings → API
2. Copy `URL` → This is your `SUPABASE_URL`
3. Copy `anon public` key → This is `SUPABASE_ANON_KEY`
4. Copy `service_role` key → This is `SUPABASE_SERVICE_ROLE_KEY`

---

## 🔐 Google OAuth Setup

### Step 1: Create OAuth App
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "PokerGeek Production"
3. Navigate to: APIs & Services → Credentials
4. Click "Create Credentials" → OAuth 2.0 Client ID
5. Application type: Web application
6. Name: "PokerGeek Web"

### Step 2: Configure Authorized URLs
**Authorized JavaScript origins:**
```
https://yourdomain.com
https://www.yourdomain.com
```

**Authorized redirect URIs:**
```
https://yourdomain.com/auth/callback
https://yourproject.supabase.co/auth/v1/callback
```

### Step 3: Get Client Credentials
1. Copy `Client ID`
2. Copy `Client Secret`
3. Add to Supabase: Auth → Providers → Google
   - Enable Google provider
   - Paste Client ID and Secret
   - Save

---

## ⚙️ Environment Variables

Create `.env` file in production server:

```env
# Database
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
SUPABASE_URL=https://[PROJECT].supabase.co
SUPABASE_ANON_KEY=your_anon_key_from_step_4
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_step_4

# Auth
JWT_SECRET=[GENERATE_STRONG_SECRET_MIN_32_CHARS]

# Server
PORT=3000
NODE_ENV=production
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🖥️ Server Deployment

### Option 1: Heroku

1. **Install Heroku CLI**
```bash
npm install -g heroku
heroku login
```

2. **Create Heroku App**
```bash
heroku create pokergeek-prod
```

3. **Set Environment Variables**
```bash
heroku config:set DATABASE_URL="your_database_url"
heroku config:set SUPABASE_URL="your_supabase_url"
heroku config:set SUPABASE_ANON_KEY="your_anon_key"
heroku config:set SUPABASE_SERVICE_ROLE_KEY="your_service_key"
heroku config:set JWT_SECRET="your_jwt_secret"
heroku config:set NODE_ENV=production
```

4. **Deploy**
```bash
git push heroku main
```

5. **Open App**
```bash
heroku open
```

### Option 2: DigitalOcean/AWS/GCP

1. **Provision Server**
   - Ubuntu 22.04 LTS
   - Min 2GB RAM, 1 CPU
   - Open ports: 80 (HTTP), 443 (HTTPS), 3000 (Node.js)

2. **Install Dependencies**
```bash
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (reverse proxy)
apt install -y nginx

# Install Certbot (SSL)
apt install -y certbot python3-certbot-nginx
```

3. **Clone and Setup**
```bash
cd /var/www
git clone your-repo pokergeek
cd pokergeek
npm install --production

# Create .env file
nano .env
# Paste your environment variables
```

4. **Start with PM2**
```bash
pm2 start sophisticated-engine-server.js --name pokergeek
pm2 save
pm2 startup
```

5. **Configure Nginx**
```bash
nano /etc/nginx/sites-available/pokergeek
```

Paste this config:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # WebSocket support for Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site:
```bash
ln -s /etc/nginx/sites-available/pokergeek /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

6. **Get SSL Certificate**
```bash
certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

7. **Verify Running**
```bash
pm2 status
pm2 logs pokergeek
```

---

## 🧪 Post-Deployment Testing

### 1. Smoke Tests
- [ ] Visit homepage → Loads without errors
- [ ] Click "Play Now" → Redirects to play page
- [ ] Click "Sign in with Google" → OAuth flow works
- [ ] Create room → Room created successfully
- [ ] Join room → Can join and see lobby
- [ ] Start game → Cards dealt properly
- [ ] Make bet → Action processes correctly
- [ ] Complete hand → Winner declared
- [ ] Check profile → Stats updated

### 2. Performance Tests
- [ ] Page load time < 3 seconds
- [ ] Socket.IO connection < 1 second
- [ ] API responses < 500ms
- [ ] No memory leaks (monitor PM2)
- [ ] Database queries optimized

### 3. Security Tests
- [ ] HTTPS enforced
- [ ] JWT tokens expire correctly
- [ ] SQL injection protected
- [ ] XSS protected
- [ ] CORS configured
- [ ] Rate limiting enabled (if implemented)

---

## 📊 Monitoring

### PM2 Monitoring
```bash
pm2 monit         # Live monitoring
pm2 logs          # View logs
pm2 status        # Check status
```

### Database Monitoring
- Supabase Dashboard → Database → Query Performance
- Watch for slow queries (> 1 second)
- Monitor table sizes

### Error Logging (Optional)
Set up Sentry:
```bash
npm install @sentry/node
```

In `sophisticated-engine-server.js`:
```javascript
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'your-sentry-dsn' });
```

---

## 🔄 Updates & Maintenance

### Deploy New Version
```bash
# On server
cd /var/www/pokergeek
git pull origin main
npm install --production
pm2 restart pokergeek
```

### Rollback
```bash
git reset --hard HEAD~1
pm2 restart pokergeek
```

### Database Backups
```bash
# Supabase auto-backs up daily
# For manual backup:
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

---

## 🚨 Troubleshooting

### Issue: "Cannot connect to database"
**Solution:**
1. Check `DATABASE_URL` is correct
2. Verify Supabase project is running
3. Check firewall allows outbound connections
4. Test connection: `psql $DATABASE_URL`

### Issue: "OAuth redirect_uri mismatch"
**Solution:**
1. Google Console → Credentials → Edit OAuth client
2. Add exact redirect URI from error message
3. Wait 5 minutes for changes to propagate

### Issue: "Socket.IO not connecting"
**Solution:**
1. Verify Nginx config has WebSocket proxy
2. Check CORS settings in server
3. Verify no firewall blocking WebSocket
4. Test: `curl -I http://yourdomain.com/socket.io/`

### Issue: "High memory usage"
**Solution:**
1. Check for memory leaks: `pm2 monit`
2. Increase server RAM
3. Optimize game state storage
4. Implement game state cleanup for inactive rooms

---

## ✅ Production Checklist

### Before Launch
- [ ] All migrations run successfully
- [ ] Environment variables set correctly
- [ ] OAuth working (test login)
- [ ] SSL certificate active
- [ ] Database permissions granted
- [ ] PM2 process running
- [ ] Nginx configured and running
- [ ] Logs show no errors
- [ ] Test with real devices (desktop, mobile)
- [ ] Friends system working
- [ ] Game invites working
- [ ] Stats updating correctly

### After Launch
- [ ] Monitor logs for 1 hour
- [ ] Test all user flows
- [ ] Check database for errors
- [ ] Monitor server resources
- [ ] Set up alerts (disk space, CPU, memory)
- [ ] Document any issues
- [ ] Plan first maintenance window

---

## 📞 Emergency Contacts

**Database Issues:** Supabase Support  
**Domain/DNS Issues:** Your DNS provider  
**Server Issues:** Your hosting provider  
**Code Issues:** Your development team

---

## 🎉 You're Ready!

Your PokerGeek.ai platform is now live. Monitor closely for the first 24 hours and be ready to respond to any issues.

**Good luck! 🚀🎰**

