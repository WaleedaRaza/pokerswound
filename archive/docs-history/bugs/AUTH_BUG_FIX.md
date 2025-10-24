# 🚨 CRITICAL AUTH BUG FOUND

## The Problem

**Multiple interconnected auth issues:**

1. **`/api/auth/sync-user` requires auth DURING login**
   - Endpoint has `authenticateToken` middleware
   - But it's called when user logs in (before they have a token!)
   - Result: Infinite loop of 401 errors

2. **JWT tokens not sent with API requests**
   - Frontend doesn't include `Authorization: Bearer <token>` header
   - All protected endpoints return 401

3. **Logout not working**
   - Need to investigate Supabase signOut flow
   - localStorage not clearing properly

4. **Profile button unclickable**
   - Need to check event handlers on landing page

---

## The Fix (In Progress)

### ✅ Step 1: Remove auth from sync endpoint
```javascript
// BEFORE (BROKEN):
app.post('/api/auth/sync-user', authenticateToken, async (req, res) => {

// AFTER (FIXED):
app.post('/api/auth/sync-user', async (req, res) => {
```

### ✅ Step 2: Add JWT token helper methods
Added to `auth-manager.js`:
- `getAccessToken()` - Get JWT from Supabase session
- `getAuthHeaders()` - Get headers with Authorization

### 🔧 Step 3: Update all fetch calls
Need to update EVERY API call in `play.html` to use `getAuthHeaders()`

### 🔧 Step 4: Fix logout flow
Need to ensure Supabase.signOut() is called properly

### 🔧 Step 5: Fix profile button
Check event handlers and ensure they're registered after DOM loads

---

## Root Cause Analysis

**Week 1 Day 4:** We added `authenticateToken` to 12 endpoints including `/api/auth/sync-user`

**The Problem:** We didn't consider the LOGIN flow:
1. User clicks "Sign in with Google"
2. Google redirects back
3. Frontend calls `/api/auth/sync-user` to register user in DB
4. **But sync endpoint requires auth token!**
5. User doesn't have token yet because they're still logging in!
6. Result: 401 error, user never gets synced, login fails

**The Lesson:** Auth middleware is good, but some endpoints MUST be public (like the sync endpoint that's part of the login process itself).

---

## Next Steps

1. Remove `authenticateToken` from `/api/auth/sync-user` ✅
2. Restart server
3. Test login flow
4. Fix remaining fetch calls
5. Test logout
6. Fix profile button

---

**Status:** Fixing now...

