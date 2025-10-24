# 🔧 AUTH JWT VERIFICATION FIX

**Date:** October 24, 2025  
**Issue:** "Invalid or expired token" error when creating rooms  
**Root Cause:** Middleware was verifying Supabase JWTs with wrong secret

---

## 🔍 THE PROBLEM

### What Was Happening:
1. **Frontend:** Sends Supabase JWT token (signed by Supabase)
   ```javascript
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

2. **Backend Middleware:** Tries to verify with local `JWT_SECRET`
   ```javascript
   jwt.verify(token, JWT_SECRET, ...)  // ❌ WRONG SECRET!
   ```

3. **Result:** Token verification fails → "Invalid or expired token"

### Why It Failed:
- Supabase JWTs are signed with **Supabase's JWT secret** (in Supabase project settings)
- Our middleware was using **local JWT_SECRET** (defined in our .env)
- These are **different secrets** → verification fails

---

## ✅ THE FIX

### Updated Auth Middleware:
```javascript
async function authenticateToken(req, res, next) {
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  // ✅ NEW: Try Supabase verification first
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (user && !error) {
      console.log(`✅ AUTH PASSED (Supabase): ${req.path} | User: ${user.email}`);
      req.user = {
        id: user.id,
        email: user.email,
        sub: user.id
      };
      return next();
    }
  } catch (supabaseError) {
    console.log('⚠️ Supabase verification failed, trying local JWT...');
  }
  
  // Fallback: Local JWT verification (for legacy users)
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.log(`✅ AUTH PASSED (Local JWT): ${req.path}`);
    req.user = user;
    next();
  });
}
```

### What Changed:
1. **Made function `async`** (was synchronous)
2. **Added Supabase verification** using `supabase.auth.getUser(token)`
   - This calls Supabase API to verify the token
   - Works with any Supabase-issued JWT (Google OAuth, Anonymous, Email/Password)
3. **Kept fallback** to local JWT verification (for backwards compatibility)
4. **Better logging** to distinguish between Supabase and local JWT auth

---

## 🧪 TESTING

### Test 1: Google Login + Create Room
1. Sign in with Google
2. Navigate to /play
3. Click "Create Game"
4. Fill in details, click Create

**Expected:**
- ✅ Room created successfully
- **Server logs:**
  ```
  🔒 AUTH CHECK: POST /api/rooms
  ✅ AUTH PASSED (Supabase): /api/rooms | User: your.email@gmail.com
  ```

### Test 2: Anonymous Guest + Create Room
1. Sign in as Guest
2. Try to create room

**Expected:**
- ❌ UI blocks with: "Guest users cannot create rooms. Please sign in with Google."
- (Auth never gets called because UI blocks it)

### Test 3: Anonymous Guest + Join Room
1. Sign in as Guest
2. Join existing room

**Expected:**
- ✅ Successfully joins
- Anonymous users have Supabase JWT too, so auth should pass

---

## 📋 WHAT TO LOOK FOR

### In Browser Console:
```
🔐 [Room Creation] Headers: {Authorization: "Bearer eyJ...", ...}
🔐 [Room Creation] Token present: true
```

### In Server Logs:
```
🔒 AUTH CHECK: POST /api/rooms
✅ AUTH PASSED (Supabase): /api/rooms | User: waleedraza1211@gmail.com
Room created: {...}
```

### Success Indicators:
- ✅ "AUTH PASSED (Supabase)" in logs
- ✅ User email/ID shown in logs
- ✅ Room created without errors
- ✅ No "Invalid token" errors

---

## 🚨 IF IT STILL FAILS

### Possible Issues:

1. **Token Expired:**
   - Supabase tokens expire after 1 hour by default
   - Try logging out and back in

2. **Supabase Client Not Initialized:**
   - Check server logs for "Supabase credentials not found"
   - Verify SUPABASE_URL and SUPABASE_ANON_KEY in .env

3. **Network Issues:**
   - Auth verification calls Supabase API
   - Check internet connection

4. **Wrong Token Format:**
   - Token should be: `Bearer <actual-token>`
   - Check browser console for header format

---

**STATUS:** Server restarted with fix. Test now! ⚔️

