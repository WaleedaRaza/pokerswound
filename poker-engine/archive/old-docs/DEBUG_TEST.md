# 🔍 COMPREHENSIVE DEBUG TEST

## Step-by-Step Debugging

### **Step 1: Check Socket Connection**

Open **both** browser consoles (F12 → Console) and paste this:

```javascript
// Check socket status
console.log('=== SOCKET STATUS ===');
console.log('socket exists:', !!socket);
console.log('socket.connected:', socket ? socket.connected : 'N/A');
console.log('socket.id:', socket ? socket.id : 'N/A');
console.log('room:', room);
console.log('currentGame:', currentGame);
console.log('currentUser:', currentUser);
```

**Expected output:**
- Host: `socket.connected: true`, `room: {id: "...", ...}`, `currentGame: {gameId: "..."}`
- Guest: Same as host

**If socket.connected is false, run:**
```javascript
connectSocket();
```

---

### **Step 2: Test Room Membership**

In **server console** (where node is running), you should see:
```
🔌 Socket XXX joining room:ROOMID
✅ Socket XXX joined room:ROOMID
```

**If you don't see this, the socket didn't join the room!**

---

### **Step 3: Manual Test - Send Action**

**In Host browser console:**
```javascript
// Get your player ID
const gameState = await (await fetch(`${API_BASE}/games/${currentGame.gameId}`)).json();
console.log('Game state:', gameState);
const myPlayer = gameState.players.find(p => p.userId === currentUser.id);
console.log('My player:', myPlayer);
```

**Then perform an action:**
```javascript
performAction('CALL', myPlayer.id);
```

---

### **Step 4: Check Guest Receives Update**

**In Guest browser console**, immediately after host's action, check:
```javascript
// This should log automatically when update is received
// Look for: "🔄 Game state update received:"
```

**If you see `🔄 Game state update received` but `Match? false`:**
- The gameId mismatch issue!

**If you DON'T see `🔄 Game state update received` at all:**
- WebSocket broadcast not reaching guest

---

### **Step 5: Force Broadcast Test**

**In server console** (while server is running), look for:
```
📡 Broadcasting to room:ROOMID: {...}
   Sockets in room:ROOMID: 2
```

**If "Sockets in room" shows 0 or 1:**
- Guest never joined the room!

---

### **Step 6: Manual Re-Join**

**In Guest browser console:**
```javascript
if (socket && socket.connected) {
    console.log('Manually joining room:', room.id);
    socket.emit('join_room', room.id);
}
```

**Then in Host browser:**
```javascript
// Perform action again
performAction('CALL', myPlayer.id);
```

---

## 🎯 COMMON ISSUES & FIXES

### Issue 1: Guest `currentGame` is null
**Symptom:** `Match? false` or `currentGame: null`
**Fix:**
```javascript
// In guest browser:
currentGame = { gameId: 'sophisticated_XXXX_X' }; // Copy from host's currentGame.gameId
```

### Issue 2: Socket not connecting
**Symptom:** `socket.connected: false`
**Fix:**
```javascript
socket = io('http://localhost:3002', { transports: ['websocket'] });
socket.on('connect', () => {
    console.log('✅ Connected!');
    socket.emit('join_room', room.id);
});
```

### Issue 3: Socket not in room
**Symptom:** Server shows "Sockets in room: 1" when should be 2
**Fix:** Both browsers need to emit `join_room`:
```javascript
socket.emit('join_room', room.id);
```

### Issue 4: Player userId mismatch
**Symptom:** "You are not in this game"
**Fix:**
```javascript
// Check player userIds:
const gameState = await (await fetch(`${API_BASE}/games/${currentGame.gameId}`)).json();
console.log('Player userIds:', gameState.players.map(p => ({name: p.name, userId: p.userId})));
console.log('My userId:', currentUser.id);
// They should match!
```

---

## 🔥 NUCLEAR OPTION - FULL RESET

If nothing works:

1. **Stop server** (Ctrl+C in server console)
2. **Close ALL browser windows**
3. **Restart server:**
   ```bash
   cd poker-engine
   $env:PORT=3002; $env:DATABASE_URL='postgresql://...'; node sophisticated-engine-server.js
   ```
4. **Open Host browser** → Create new game
5. **Open Guest browser (incognito)** → Join via invite
6. **In BOTH browser consoles:**
   ```javascript
   console.log('Socket check:', {
       connected: socket?.connected,
       room: room?.id,
       game: currentGame?.gameId,
       user: currentUser?.id
   });
   ```

All 4 values should be defined!

---

## 📊 EXPECTED FLOW

### When Host Makes Action:

**Host Browser:**
```
🎯 performAction called: action="CALL", playerId="player_XXX"
📤 Sending action to server: {...}
✅ Action result: {...}
🔄 Refreshing game state after action...
```

**Server Console:**
```
✅ Processed sophisticated action: player_XXX CALL
🔍 Broadcasting update - roomId: XXX, io exists: true
📡 Broadcasting to room:XXX: {...}
   Sockets in room:XXX: 2    👈 MUST BE 2!
```

**Guest Browser:**
```
🔄 Game state update received: {...}
  currentGame: {gameId: "sophisticated_XXX"}
  payload.gameId: "sophisticated_XXX"
  Match? true                  👈 MUST BE TRUE!
✅ Fetching updated game state...
```

If ANY of these don't happen, we found the issue!

