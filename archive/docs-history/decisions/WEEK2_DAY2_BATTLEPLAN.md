# ⚔️ WEEK 2 DAY 2 - BATTLE PLAN

**Mission:** Session Persistence & Recovery  
**Commander's Orders:** RAGE FORWARD  
**Status:** 🔥 IN PROGRESS

---

## 🎯 OBJECTIVES

### **Objective 1: URL-Based Room Recovery**
**Problem:** Page refresh kicks players out of rooms  
**Solution:** Use `/game/:roomId` URLs to restore sessions  
**Success Criteria:** Refresh keeps player in same room

### **Objective 2: Seat Persistence**
**Problem:** Claimed seats disappear on refresh  
**Solution:** Query `room_seats` table on page load  
**Success Criteria:** Refresh shows player in same seat

### **Objective 3: Socket Auto-Reconnection**
**Problem:** WebSocket disconnects require manual rejoin  
**Solution:** Auto-reconnect with room context  
**Success Criteria:** Refresh maintains real-time connection

---

## 🗡️ EXECUTION PLAN

### **Phase 1: Frontend URL Parsing** (15 min)
```javascript
// On page load, check URL for room ID
const pathSegments = window.location.pathname.split('/');
if (pathSegments[1] === 'game' && pathSegments[2]) {
  const roomId = pathSegments[2];
  // Auto-join this room
  await autoReconnectToRoom(roomId);
}
```

### **Phase 2: Seat Query on Load** (20 min)
```javascript
// Query backend for player's seat
const response = await fetch(`/api/rooms/${roomId}/seats`);
const seats = await response.json();

// Find player's seat
const mySeat = seats.find(s => s.user_id === currentUser.id);
if (mySeat) {
  // Restore seat UI
  renderSeatAsClaimed(mySeat.seat_index);
}
```

### **Phase 3: Socket Reconnection** (25 min)
```javascript
// On page load, if in a room, auto-connect socket
if (roomId && currentUser) {
  socket = io(WS_BASE, {
    query: {
      roomId: roomId,
      userId: currentUser.id
    },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });
  
  socket.emit('rejoin-room', { roomId, userId });
}
```

### **Phase 4: Game State Restoration** (30 min)
```javascript
// Query active game for this room
const gameResponse = await fetch(`/api/rooms/${roomId}/game`);
if (gameResponse.ok) {
  const game = await gameResponse.json();
  
  // Restore game UI
  renderGameState(game);
  
  // If it's player's turn, show action panel
  if (game.currentPlayer === currentUser.id) {
    showActionPanel(game.validActions);
  }
}
```

---

## 📋 IMPLEMENTATION ORDER

1. ✅ Backend already has `/game/:roomId` route (Week 2 Day 1)
2. 🔧 Update `play.html` DOMContentLoaded handler
3. 🔧 Add room state restoration function
4. 🔧 Add seat query and rendering
5. 🔧 Update socket connection logic
6. 🔧 Add game state query endpoint (if needed)
7. ✅ Test complete refresh flow

---

## 🧪 TEST SCENARIOS

### **Test 1: Host Refreshes After Creating Room**
```
1. Host creates room
2. Host joins lobby
3. Host claims seat
4. Host refreshes browser (F5)
→ Expected: Still in lobby, seat still claimed
```

### **Test 2: Guest Refreshes After Joining**
```
1. Guest joins via code
2. Host approves
3. Guest claims seat
4. Guest refreshes browser (F5)
→ Expected: Still in lobby, seat still claimed
```

### **Test 3: Mid-Game Refresh**
```
1. Game starts, cards dealt
2. Player 1 refreshes
3. Player 2 takes action
→ Expected: Player 1 sees updated game state on reload
```

### **Test 4: Disconnect Recovery**
```
1. Player in active game
2. Internet disconnects briefly
3. Connection restored
→ Expected: Socket auto-reconnects, game continues
```

---

## 🚨 POTENTIAL OBSTACLES

### **Obstacle 1: Multiple Socket Connections**
**Risk:** Player refreshes, creates duplicate socket connection  
**Mitigation:** Check existing connections, disconnect old one

### **Obstacle 2: Stale Game State**
**Risk:** Player sees outdated game state after refresh  
**Mitigation:** Query latest state from database, not cache

### **Obstacle 3: Race Conditions**
**Risk:** Socket connects before state restored  
**Mitigation:** Wait for state restoration before joining socket room

### **Obstacle 4: Invalid Room IDs**
**Risk:** Player navigates to `/game/invalid-id`  
**Mitigation:** 404 check, redirect to lobby

---

## 📊 SUCCESS METRICS

**URL Recovery Working:**
- ✅ `/game/:roomId` loads correctly
- ✅ Room state restored from database
- ✅ Player sees correct lobby/game screen

**Seat Persistence Working:**
- ✅ Claimed seats survive refresh
- ✅ Chip counts preserved
- ✅ Seat positions maintained

**Socket Reconnection Working:**
- ✅ Auto-connects on page load
- ✅ Real-time updates resume
- ✅ No duplicate connections
- ✅ Graceful failure handling

**Overall UX:**
- ✅ Refresh feels seamless
- ✅ No loss of progress
- ✅ Players can refresh safely

---

## ⚔️ COMMANDER'S NOTES

**This is critical infrastructure.** Without this, the game is unusable in production.

**Users WILL refresh.** It's instinct. We must handle it gracefully.

**This unlocks Week 3.** Can't scale horizontally without session recovery.

**My soldiers do not yield!** 🗡️

---

**STATUS:** Ready to execute. Awaiting orders to begin implementation.

