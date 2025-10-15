# 🧪 Testing Guide - Google Auth & Room Creation

## Quick Start

### 1. **Start the Server**
```bash
cd poker-engine
node sophisticated-engine-server.js
```

You should see:
```
✅ Supabase auth initialized
🚀 SOPHISTICATED POKER ENGINE running on port 3000
```

---

### 2. **Open the App**
Navigate to: `http://localhost:3000/public/poker-test.html`

---

### 3. **Sign In with Google**

1. Click the **"🔐 Sign in with Google"** button
2. Authenticate with your Gmail account
3. You'll be redirected back to the app
4. Your username should appear in the top-right corner

**Expected Result:** ✅ User authenticated, sign-in button disappears

---

### 4. **Create a Room**

1. Click **"Create New Game"**
2. Fill in the game settings:
   - Game Name: "Test Game"
   - Small Blind: 1
   - Big Blind: 2
   - Min Buy-in: 100
   - Max Buy-in: 1000
   - Max Players: 9
3. Click **"Create Game"**

**Expected Result:** 
- ✅ Room created successfully
- ✅ You see a room code (e.g., "ABC123")
- ✅ You're automatically joined to the lobby

---

### 5. **Join the Lobby**

After creating the room, you should automatically:
- See the lobby screen
- See yourself as the host
- See "Start Game" button (as host)

**Expected Result:** ✅ Lobby loaded, no errors

---

### 6. **Start the Game**

1. Click **"Start Game"** (as host)
2. Game should initialize
3. Cards should be dealt
4. You should see the poker table

**Expected Result:** ✅ Game starts, table visible

---

## Common Issues & Solutions

### ❌ "Session expired, please login again"
**Cause:** Not authenticated with Google
**Solution:** Click "Sign in with Google" button

---

### ❌ "Failed to join lobby"
**Cause:** Invalid user ID (old guest user)
**Solution:** 
1. Clear browser cache
2. Refresh page
3. Sign in with Google again

---

### ❌ "Foreign key constraint violation"
**Cause:** Database migration not run
**Solution:**
```bash
cd poker-engine
node run-single-migration.js 015_final_cleanup.sql
```

---

### ❌ "Supabase auth not initialized"
**Cause:** Missing environment variables
**Solution:** Check `.env` file has:
```
SUPABASE_URL=https://curkkakmkiyrimqsafps.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Database Verification

Check database state:
```bash
cd poker-engine
node check-db-state.js
```

**Expected Output:**
```
👥 AUTH USERS:
  7d3c1161-... | waleedraza1211@gmail.com

👤 USER PROFILES:
  7d3c1161-... | waleedraza1211 | waleedraza1211

🏠 ROOMS:
  [Your rooms with valid host_user_id]

🔗 FOREIGN KEY CONSTRAINTS:
  [All pointing to auth.users, no public.users references]

✅ No orphaned data
```

---

## Testing Checklist

- [ ] Server starts without errors
- [ ] Supabase auth initialized
- [ ] Can sign in with Google
- [ ] Username appears after sign-in
- [ ] Can create a room
- [ ] Room code is generated
- [ ] Can join lobby as host
- [ ] Can see lobby screen
- [ ] Can start game
- [ ] Cards are dealt
- [ ] No console errors

---

## Success Criteria

✅ **Authentication Working:**
- Google OAuth flow completes
- User ID from `auth.users` is used
- No fake guest users

✅ **Room Creation Working:**
- Rooms created with valid `host_user_id`
- No foreign key violations
- Room code generated

✅ **Lobby Working:**
- Can join lobby with authenticated user
- User profile created in `user_profiles`
- No "invalid user ID" errors

✅ **Database Clean:**
- `public.users` table removed
- All foreign keys point to `auth.users`
- No orphaned data

---

## Next Steps After Testing

Once everything works:

1. **Test with a friend:**
   - Share room code
   - Friend signs in with Google
   - Friend joins your room
   - Start a game together

2. **Deploy to production:**
   - See `DEPLOYMENT.md` for instructions
   - Deploy frontend to Vercel
   - Deploy backend to Railway
   - Update Supabase redirect URLs

3. **Add more features:**
   - Friend system
   - Invite via email
   - Game history
   - Player stats

---

**Status: Ready for testing! 🚀**

If you encounter any issues not listed here, check:
- Browser console for errors
- Server logs for backend errors
- Database state with `check-db-state.js`

