# 🧪 MANUAL AUTH TESTING CHECKLIST

## Fixes Applied
✅ Removed `authenticateToken` from `/api/auth/sync-user`  
✅ Added `getAccessToken()` and `getAuthHeaders()` to `auth-manager.js`  
✅ Updated room creation to send JWT token  
✅ Added `getCurrentUser()` helper in `index.html`  
✅ Added auth state change listener to auto-update UI  

---

## Test Procedure

### 1. Test Login
1. Navigate to `http://localhost:3000`
2. Click "Log In / Sign Up"
3. Click "Sign in with Google"
4. **Expected:** Should redirect, login successfully, navbar shows profile button
5. **Check Console:** Should NOT see spam of "❌ AUTH REJECTED: No token for /api/auth/sync-user"

### 2. Test Profile Button
1. After logging in, click profile button (top-right)
2. **Expected:** Dropdown menu appears with:
   - Avatar
   - Username
   - Email
   - Options (Profile, Username, Password, Avatar, Logout)

### 3. Test Logout
1. Click "🚪 Logout" in dropdown
2. Confirm logout
3. **Expected:**
   - Navbar reverts to "Log In / Sign Up" buttons
   - Profile button disappears
   - Page shows logged-out state

### 4. Test Refresh (Auth Persistence)
1. Log in
2. Refresh page (F5)
3. **Expected:**
   - Still logged in
   - Profile button still visible
   - Navbar shows correct username/avatar

### 5. Test Room Creation (Token Sending)
1. Log in
2. Navigate to `/play`
3. Click "Create Game"
4. Fill in details, click Create
5. **Expected:**
   - Room creates successfully
   - NO "Access token required" error
6. **Check Console:**
   - Network tab should show `Authorization: Bearer <token>` header
   - Request should return 200

---

## Expected Console Logs

**On Login:**
```
🔍 AuthManager: Checking auth state...
✅ AuthManager: Found Supabase session
🔄 AuthManager: Syncing user to backend...
✅ AuthManager: User synced to backend
🔔 Auth state changed: {id: "...", username: "...", ...}
```

**On Logout:**
```
🚪 AuthManager: Logging out...
✅ AuthManager: Signed out from Supabase
✅ AuthManager: Cleared localStorage
✅ AuthManager: Logout complete
🔔 Auth state changed: null
```

**On Room Creation:**
```
🔒 AUTH CHECK: POST /api/rooms
✅ User authenticated: <email>
```

---

## Common Issues & Solutions

### Issue: Still seeing "❌ AUTH REJECTED: No token"
**Solution:** Make sure server was restarted after removing `authenticateToken` from sync endpoint

### Issue: Profile button not clickable
**Solution:** Check browser console for JS errors, ensure authManager is loaded

### Issue: Logout doesn't work
**Solution:** Check if `authManager.onAuthStateChange` is properly subscribed

### Issue: Token not being sent
**Solution:** Verify `getAuthHeaders()` is being called before fetch

---

**START TESTING NOW!** ⚔️

