# ⚠️ WEEK 2 PAUSED: AUTH EMERGENCY

**Date:** October 23, 2025  
**Status:** 🚨 **CRITICAL BUG** - Auth system broken  
**Progress:** Week 2 Day 1 complete, but auth regression discovered

---

## 🚨 WHAT HAPPENED

**During Week 2 Day 1 testing**, user tried to create a room and discovered:
1. ❌ Login/logout broken (can't sign out)
2. ❌ Profile button unclickable  
3. ❌ JWT tokens not being sent with API requests
4. ❌ `/api/auth/sync-user` requiring auth DURING login (chicken-egg problem)

**Root Cause:** Week 1 Day 4 added `authenticateToken` to ALL endpoints including the sync endpoint that's part of the login flow itself.

---

## 🔧 FIXES APPLIED

### ✅ Fix 1: Remove auth from sync endpoint
```javascript
// This endpoint is called DURING login, so it CAN'T require auth
app.post('/api/auth/sync-user', async (req, res) => { // REMOVED authenticateToken
```

### ✅ Fix 2: Add JWT helper methods
Added to `auth-manager.js`:
```javascript
async getAccessToken() {
  const session = await this.supabase.auth.getSession();
  return session?.access_token || null;
}

async getAuthHeaders() {
  const token = await this.getAccessToken();
  return {
    'Content-Type': 'application/json',
    'Authorization': token ? `Bearer ${token}` : undefined
  };
}
```

### ✅ Fix 3: Update room creation to send token
Updated `play.html`:
```javascript
const headers = await window.authManager.getAuthHeaders();
const response = await fetch('/api/rooms', {
  method: 'POST',
  headers: headers, // Now includes Authorization header
  body: ...
});
```

### 🔧 Fix 4: Still TODO - Update ALL other fetch calls
Need to add `getAuthHeaders()` to:
- Join room
- Leave room  
- Lobby operations
- All other protected endpoints

### 🔧 Fix 5: Still TODO - Fix logout
- Check Supabase signOut flow
- Ensure localStorage clears
- Verify auth state updates

### 🔧 Fix 6: Still TODO - Fix profile button
- Check event listeners
- Ensure button is registered after DOM loads

---

## 📋 IMMEDIATE ACTION PLAN

1. **Restart server** (applying sync-user fix)
2. **Test login flow** (should work now without 401 spam)
3. **Test room creation** (should work with JWT token)
4. **Fix remaining fetch calls** (add getAuthHeaders to all)
5. **Fix logout** (debug Supabase signOut)
6. **Fix profile button** (check event listeners)
7. **Resume Week 2**

---

## 💡 LESSON LEARNED

**Don't blindly add auth middleware to everything.**

Some endpoints MUST remain public:
- `/api/auth/register` - Can't require auth to register!
- `/api/auth/login` - Can't require auth to login!
- `/api/auth/sync-user` - Called DURING login process

**Better approach:**
- Add auth to endpoints that modify user data
- Leave auth-related endpoints public (they handle their own auth)
- Document which endpoints are public vs protected

---

## 🎖️ WEEK 2 STATUS

```
✅ Day 1: URL-Based Tracking (COMPLETE)
⏸️  Day 2-5: PAUSED (fixing auth regression)
```

**Resume Week 2 after auth is stable.**

---

**FIXING IN PROGRESS...** ⚔️

