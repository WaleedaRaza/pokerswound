# ✅ AUTH HEADERS FIX - ALL API CALLS UPDATED

**Date:** October 24, 2025  
**Issue:** "Failed to join lobby" errors  
**Root Cause:** Frontend not sending JWT tokens with API requests

---

## 🚨 THE PROBLEM

After fixing JWT verification, a NEW issue appeared:
- **Frontend** was making API calls to protected endpoints
- **But** wasn't sending JWT tokens in headers
- **Result:** All requests rejected with 401 "Access token required"

### Affected Endpoints:
All of these require authentication but weren't getting tokens:
1. POST `/api/rooms/:roomId/lobby/join` - Join lobby
2. POST `/api/rooms/:roomId/lobby/approve` - Approve player
3. POST `/api/rooms/:roomId/join` - Claim seat
4. POST `/api/rooms/:roomId/lobby/reject` - Reject player (if exists)
5. POST `/api/rooms/:roomId/leave` - Leave room (if exists)

---

## ✅ FIXES APPLIED

### Fix 1: joinLobbyAPI() ✅
```javascript
// BEFORE (broken):
const response = await fetch(`/api/rooms/${roomId}/lobby/join`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }, // ❌ No auth token!
  body: JSON.stringify({ user_id, username })
});

// AFTER (fixed):
const headers = await window.authManager.getAuthHeaders(); // ✅ Get token
const response = await fetch(`/api/rooms/${roomId}/lobby/join`, {
  method: 'POST',
  headers: headers, // ✅ Includes Authorization: Bearer <token>
  body: JSON.stringify({ user_id, username })
});
```

### Fix 2: approvePlayer() ✅
```javascript
// Added auth headers
const headers = await window.authManager.getAuthHeaders();
const response = await fetch(`/api/rooms/${roomId}/lobby/approve`, {
  method: 'POST',
  headers: headers, // ✅ Now includes JWT token
  ...
});
```

### Fix 3: claimSeat() ✅
```javascript
// Added auth headers
const headers = await window.authManager.getAuthHeaders();
const response = await fetch(`/api/rooms/${roomId}/join`, {
  method: 'POST',
  headers: headers, // ✅ Now includes JWT token
  ...
});
```

### Fix 4: createRoomFromModal() ✅
*(Already fixed in previous commit)*
```javascript
const headers = await window.authManager.getAuthHeaders();
const response = await fetch('/api/rooms', {
  method: 'POST',
  headers: headers,
  ...
});
```

---

## 🔄 HOW IT WORKS NOW

### Complete Auth Flow:

1. **User Logs In**
   - Google OAuth or Guest
   - Supabase returns JWT token
   - Token stored in session

2. **Frontend Makes API Call**
   ```javascript
   const headers = await window.authManager.getAuthHeaders();
   // Returns: { 
   //   'Content-Type': 'application/json',
   //   'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
   // }
   ```

3. **Backend Receives Request**
   ```javascript
   async function authenticateToken(req, res, next) {
     const token = req.headers['authorization']?.split(' ')[1];
     
     // Verify with Supabase
     const { data: { user }, error } = await supabase.auth.getUser(token);
     
     if (user && !error) {
       req.user = { id: user.id, email: user.email };
       next(); // ✅ Allow request
     } else {
       res.status(403).json({ error: 'Invalid token' }); // ❌ Reject
     }
   }
   ```

4. **Request Succeeds**
   - User joins lobby
   - Host can approve players
   - Players can claim seats

---

## 🧪 TESTING CHECKLIST

### Test 1: Host Creates Room & Joins Lobby
1. Sign in with Google
2. Create room (should work - already tested ✅)
3. **Wait for auto-join lobby**
4. **Expected:**
   - ✅ "Lobby" screen appears
   - ✅ No "Failed to join lobby" error
   - ✅ Host sees own name in lobby

**Server Logs to Look For:**
```
🔒 AUTH CHECK: POST /api/rooms
✅ AUTH PASSED (Supabase): /api/rooms | User: your.email@gmail.com
🔒 AUTH CHECK: POST /api/rooms/:roomId/lobby/join
✅ AUTH PASSED (Supabase): /api/rooms/:roomId/lobby/join | User: your.email@gmail.com
👋 Player <user_id> joined room lobby
```

### Test 2: Guest Joins Room via Code
1. **As Guest:** Sign in as guest
2. Click "Join Game"
3. Enter room code
4. Click "Join"
5. **Expected:**
   - ✅ "Waiting for approval" screen appears
   - ✅ No "Failed to join lobby" error

**Server Logs:**
```
🔒 AUTH CHECK: POST /api/rooms/:roomId/lobby/join
✅ AUTH PASSED (Supabase): /api/rooms/:roomId/lobby/join | User: <guest_id>
👋 Player <guest_id> requesting to join room lobby
```

### Test 3: Host Approves Guest
1. **As Host:** See guest in "Pending Approvals"
2. Click "Approve"
3. **Expected:**
   - ✅ Guest moved to "Approved Players"
   - ✅ Guest notified of approval

**Server Logs:**
```
🔒 AUTH CHECK: POST /api/rooms/:roomId/lobby/approve
✅ AUTH PASSED (Supabase): /api/rooms/:roomId/lobby/approve | User: <host_email>
```

### Test 4: Player Claims Seat
1. **As Approved Player:** Click "Claim Seat"
2. **Expected:**
   - ✅ Seat turns blue with player name
   - ✅ "Seat claimed!" notification

**Server Logs:**
```
🔒 AUTH CHECK: POST /api/rooms/:roomId/join
✅ AUTH PASSED (Supabase): /api/rooms/:roomId/join | User: <user_email>
```

---

## 📊 SUCCESS INDICATORS

### In Browser Console:
```
✅ Joined lobby successfully
🔔 [Play Page] Auth state changed: {id: "...", email: "..."}
```

### In Server Logs:
```
✅ AUTH PASSED (Supabase): <endpoint> | User: <email/id>
👋 Player <user_id> joined room lobby
```

### In UI:
- No "Failed to join lobby" errors
- Lobby screen shows players
- Host can approve guests
- Players can claim seats

---

## 🚨 IF STILL FAILING

### Debug Checklist:
1. **Check Browser Console:**
   - Look for: `🔐 [Room Creation] Token present: true`
   - Any fetch errors?

2. **Check Server Logs:**
   - Look for: `✅ AUTH PASSED` (good)
   - Or: `❌ AUTH REJECTED` (bad - why?)

3. **Verify Login:**
   - Profile button visible in navbar?
   - What's `window.authManager.getUser()`?

4. **Token Expiry:**
   - Supabase tokens expire after 1 hour
   - Try logging out and back in

---

**STATUS:** Server restarted. Hard refresh browser (Ctrl+Shift+R) and test! ⚔️

