# 🎯 FINAL SETUP STEPS - DO THIS NOW!

## Step 1: Add Credentials to .env (1 minute)

Open `poker-engine/.env` and add these lines after `DATABASE_URL`:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://curkkakmkiyrimqsafps.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1cmtrYWtta2l5cmltcXNhZnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDI5NTYsImV4cCI6MjA3NTY3ODk1Nn0.68l4EDYgeK2oWJ_p69MaHkbjn8T52BqetWpcnxCU1gU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1cmtrYWtta2l5cmltcXNhZnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDEwMjk1NiwiZXhwIjoyMDc1Njc4OTU2fQ.n1Ej86ZpBLK1nD05WK3zDO29Nlx8UUfwAaYVC9Kj2nk

# Google OAuth
GOOGLE_CLIENT_ID=137608353263-8jkhaurg1j9gkvns7bu7noeoda75chft.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

**Or just copy from `ENV_ADDITIONS.txt`**

---

## Step 2: Run SQL in Supabase (2 minutes)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `curkkakmkiyrimqsafps`
3. Click **SQL Editor** in the left sidebar
4. Click **"New Query"**
5. Copy the contents of `supabase-schema.sql` 
6. Paste into the editor
7. Click **"Run"** (or press Ctrl+Enter)
8. You should see: **"Success. No rows returned"**

---

## Step 3: Start the Server (30 seconds)

```bash
cd poker-engine
node sophisticated-engine-server.js
```

---

## Step 4: Test Authentication (1 minute)

1. Open browser to: `http://localhost:3000/public/supabase-auth.html`
2. Click **"Continue with Google"**
3. Sign in with your Google account
4. You should see your user info!

---

## 🎉 What You Get

### ✅ Google OAuth Sign-In
- One-click sign in with Google
- No password to remember
- Secure authentication

### ✅ Session Persistence
- Stay logged in across page refreshes
- Automatic token refresh
- No more getting kicked out

### ✅ User Profiles
- Automatic profile creation
- Username, display name, avatar
- Poker stats tracking

### ✅ Database Integration
- All users stored in Supabase
- Row-level security
- Real-time updates

---

## 🔧 Files Created

- `src/lib/supabase-client.ts` - Supabase client & auth functions
- `public/supabase-auth.html` - Auth UI with Google sign-in
- `supabase-schema.sql` - Database schema
- `ENV_ADDITIONS.txt` - Environment variables to add

---

## 🚀 Next Steps After Testing

Once you confirm auth works:

1. **Integrate with Game**
   - Add auth check to poker-test.html
   - Require login to play
   - Show username in game

2. **WebSocket Auth**
   - Verify user token on WebSocket connect
   - Link user to game sessions
   - Persist game state per user

3. **Friend System**
   - Add friends table
   - Friend requests
   - Online status

---

## ⚠️ Troubleshooting

### "Invalid redirect URI"
**Fix**: In Google Cloud Console, make sure redirect URI is exactly:
```
https://curkkakmkiyrimqsafps.supabase.co/auth/v1/callback
```

### "Profiles table doesn't exist"
**Fix**: Run the SQL script in Supabase SQL Editor

### "Can't sign in"
**Fix**: Check browser console for errors. Make sure .env has all credentials.

---

## 📞 Ready to Test?

1. ✅ Add credentials to .env
2. ✅ Run SQL in Supabase
3. ✅ Start server
4. ✅ Open http://localhost:3000/public/supabase-auth.html
5. ✅ Click "Continue with Google"

**Tell me when you've tested it!** 🚀
