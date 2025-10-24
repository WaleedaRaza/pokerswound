# 🔌 Socket.IO Broadcast Fix

**Issue:** Host doesn't see new players join the lobby in real-time  
**Date:** October 24, 2025  
**Status:** ✅ Fixed

---

## 🐛 Problem

### User Report:
> "Interestingly, the second player joins the lobby on their screen, but the host doesn't see them in their lobby"

### Root Cause:
The lobby endpoints in `routes/rooms.js` were missing Socket.IO broadcast logic. When a player joined, approved, or was rejected:
- ✅ Database was updated correctly
- ✅ HTTP response sent to requester
- ❌ **NO Socket.IO event broadcasted to other clients**

Result: Other clients (especially the host) had to manually refresh to see lobby changes.

---

## 🔧 Solution

Added Socket.IO broadcasts to 3 lobby endpoints:

### 1. POST /api/rooms/:roomId/lobby/join
**Before:**
```javascript
res.json({ ok: true, status });
// No broadcast - other clients unaware of new player!
```

**After:**
```javascript
// Broadcast to all clients in the room
const io = req.app.locals.io;
if (io) {
  io.to(`room:${req.params.roomId}`).emit('player_joined', {
    userId: user_id,
    username,
    status,
    approved_at: approvedAt
  });
  console.log(`📡 Broadcast player_joined to room:${req.params.roomId}`);
}

res.json({ ok: true, status });
```

**Frontend Listener (already existed):**
```javascript
socket.on('player_joined', (data) => {
  console.log('👋 [SOCKET] Player joined:', data);
  loadLobbyPlayers();  // Refresh lobby UI
});
```

---

### 2. POST /api/rooms/:roomId/lobby/approve
**Before:**
```javascript
console.log(`✅ Host approved player ${target_user_id}`);
res.json({ ok: true });
// No broadcast!
```

**After:**
```javascript
console.log(`✅ Host approved player ${target_user_id}`);

// Broadcast to all clients in the room
const io = req.app.locals.io;
if (io) {
  io.to(`room:${req.params.roomId}`).emit('player_approved', {
    userId: target_user_id,
    approved_at: new Date().toISOString()
  });
  console.log(`📡 Broadcast player_approved to room:${req.params.roomId}`);
}

res.json({ ok: true });
```

**Frontend Listener (already existed):**
```javascript
socket.on('player_approved', (data) => {
  console.log('✅ [SOCKET] Player approved:', data);
  const me = window.currentUser;
  if (me && data.userId === me.id) {
    showNotification('You have been approved!', 'success');
  }
  loadLobbyPlayers();  // Refresh lobby UI
});
```

---

### 3. POST /api/rooms/:roomId/lobby/reject
**Before:**
```javascript
console.log(`❌ Host rejected player ${target_user_id}`);
res.json({ ok: true });
// No broadcast!
```

**After:**
```javascript
console.log(`❌ Host rejected player ${target_user_id}`);

// Broadcast to all clients in the room
const io = req.app.locals.io;
if (io) {
  io.to(`room:${req.params.roomId}`).emit('player_rejected', {
    userId: target_user_id
  });
  console.log(`📡 Broadcast player_rejected to room:${req.params.roomId}`);
}

res.json({ ok: true });
```

---

## 🎯 Key Learnings

### 1. **Event Name Consistency**
Initially used `lobby_updated` but frontend was listening for `player_joined`. Always check existing frontend listeners before emitting new events.

### 2. **Property Name Consistency**
Frontend expected `data.userId` (camelCase), not `data.user_id` (snake_case). Ensure consistency between backend and frontend.

### 3. **Room Namespacing**
Used `room:${roomId}` as the Socket.IO room name, matching the existing pattern from `socket.emit('join-room', ...)`.

### 4. **Dependency Injection**
Socket.IO instance accessed via `req.app.locals.io`, which was set during server initialization in `sophisticated-engine-server.js`.

---

## ✅ Verification

### Expected Behavior After Fix:
1. **Host creates room** → sees lobby
2. **Guest joins lobby** → immediately appears in host's lobby UI (no refresh needed)
3. **Host approves guest** → both see updated status in real-time
4. **Host rejects guest** → guest is removed from both UIs in real-time

### Console Logs to Confirm:
```
📡 Broadcast player_joined to room:{roomId}
📡 Broadcast player_approved to room:{roomId}
📡 Broadcast player_rejected to room:{roomId}
```

---

## 📋 Files Modified

- **`routes/rooms.js`**:
  - Line 282-292: Added `player_joined` broadcast to lobby join
  - Line 359-367: Added `player_approved` broadcast to lobby approve
  - Line 410-417: Added `player_rejected` broadcast to lobby reject

---

## 🚀 Next Steps

1. Test lobby join flow with 2+ users
2. Verify host sees players appear in real-time
3. Test approve/reject flow
4. Move on to game start testing

---

**Status:** ✅ **READY FOR TESTING**

The host should now see all lobby changes in real-time without needing to refresh!

