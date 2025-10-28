# 🧪 TESTING INSTRUCTIONS - MVP VERIFICATION

**Purpose:** Step-by-step testing procedure  
**Status:** Ready to test  
**Date:** October 27, 2025

---

## 🎯 SETUP

### **1. Start Server**
```bash
node sophisticated-engine-server.js
```

**Expected Output:**
```
✅ Server running on port 3000
✅ Socket.IO handlers registered
✅ Database connected
```

---

## 🧪 TEST SUITE

### **TEST 1: Authentication Flow** ⏱️ 2 min

**Procedure:**
1. Open `http://localhost:3000/play`
2. Click "Play as Guest"

**Expected:**
- ✅ No console errors
- ✅ `window.authManager` defined
- ✅ `window.currentUser` populated
- ✅ `sessionStorage.getItem('userId')` returns ID

**Check Console For:**
```javascript
window.currentUser
window.authManager
sessionStorage.getItem('userId')
```

---

### **TEST 2: Room Creation** ⏱️ 3 min

**Procedure:**
1. Click "Create Room"
2. Fill form (name, blinds)
3. Submit

**Expected:**
- ✅ Room created
- ✅ Invite code shown
- ✅ Lobby page displays
- ✅ You're auto-approved (host)

**Check Console For:**
```
✅ Room created: {roomId, inviteCode}
👑 Host auto-joined
```

---

### **TEST 3: Player Join & Approval** ⏱️ 5 min

**Procedure:**
1. Copy invite code from Test 2
2. Open incognito window (or second browser)
3. Go to `http://localhost:3000/play`
4. Click "Play as Guest"
5. Click "Join Room"
6. Enter invite code
7. Submit

**Expected (Guest):**
- ✅ "Waiting for approval" message
- ✅ No errors

**Expected (Host):**
- ✅ See join request in lobby
- ✅ See "Approve" button

**Host Action:**
- Click "Approve"

**Expected:**
- ✅ Guest sees "Approved! Claim a seat"
- ✅ Both see updated lobby

---

### **TEST 4: Seat Claiming** ⏱️ 3 min

**Procedure:**
1. Both players click "Claim Seat"
2. Select different seats

**Expected:**
- ✅ Seats claimed successfully
- ✅ Both players see each other's seats
- ✅ Host sees "Start Game" button enabled

**Check Database:**
```sql
SELECT seat_index, user_id, status 
FROM room_seats 
WHERE room_id = '<roomId>';
```

Should show 2 rows with status='SEATED'

---

### **TEST 5: Game Start & Redirect** ⏱️ 2 min

**Procedure:**
1. Host clicks "Start Game"

**Expected:**
- ✅ Both players redirect to `/game/:roomId`
- ✅ See zoom-lock table (not poker.html)
- ✅ Cards are dealt
- ✅ Dealer button visible
- ✅ Pot shows blinds posted

**Check Console For:**
```
🔌 Initializing with backend...
🎮 Connecting room: <roomId>, user: <userId>
✅ Socket connected
✅ Authenticated
🌊 Fetching hydration...
✅ Hydration received (seq: X)
🎨 Rendering from hydration...
```

**Check Network Tab:**
- ✅ GET /api/rooms/:roomId/hydrate → 200 OK
- ✅ Response has {seq, room, game, hand, seats, me}

---

### **TEST 6: REFRESH BUG FIX** ⏱️ 3 min

**CRITICAL TEST**

**Procedure:**
1. Mid-game, press F5 (refresh)

**Expected:**
- ✅ Page reloads
- ✅ Console shows "🌊 Fetching hydration..."
- ✅ **SAME CARDS appear** (your hole cards)
- ✅ **SAME POT amount**
- ✅ **SAME SEATS** (all players)
- ✅ Dealer button in same position
- ✅ Turn indicator correct
- ✅ Can continue playing

**Check Console:**
```
🌊 Fetching hydration...
✅ Hydration received (seq: X)
🎨 Rendering from hydration...
```

**Test Variations:**
- [ ] Refresh when it's your turn → Buttons enabled
- [ ] Refresh when it's not your turn → Buttons disabled
- [ ] Refresh on FLOP → See flop cards
- [ ] Refresh on TURN → See turn card
- [ ] Rapid refresh 5 times → No errors

---

### **TEST 7: Player Actions** ⏱️ 5 min

**Procedure:**
1. When it's your turn, click FOLD

**Expected:**
- ✅ Console: "🎯 Sending: FOLD 0"
- ✅ Console: "✅ Action sent"
- ✅ Other player sees your fold
- ✅ Turn moves to next player
- ✅ Buttons disabled after fold

**Test Each Action:**
- [ ] FOLD → Works
- [ ] CALL → Works (with correct amount)
- [ ] RAISE → Works (with custom amount)

**Check Network Tab:**
- ✅ POST /api/games/:id/actions
- ✅ Header: X-Idempotency-Key
- ✅ Body: {player_id, action, amount}
- ✅ Response: 200 OK

---

### **TEST 8: Hand Completion** ⏱️ 3 min

**Procedure:**
1. Play hand to completion (all fold or showdown)

**Expected:**
- ✅ Winner announced (toast notification)
- ✅ Chips updated for all players
- ✅ Board cleared after delay
- ✅ Console: "🏆 Hand complete"

---

### **TEST 9: Multi-Player Sync** ⏱️ 5 min

**Procedure:**
1. Player A takes action
2. Check Player B's screen

**Expected:**
- ✅ Player B sees action immediately
- ✅ Pot updates on both screens
- ✅ Turn indicator moves
- ✅ No delay > 500ms

---

### **TEST 10: Edge Cases** ⏱️ 10 min

**10.1: Disconnect/Reconnect**
1. Disconnect internet mid-game
2. Wait 5 seconds
3. Reconnect

**Expected:**
- ✅ Toast: "Connection lost"
- ✅ Toast: "Reconnected"
- ✅ Game continues

**10.2: Invalid Room**
1. Navigate to `/game/fake-room-id`

**Expected:**
- ✅ Hydration fails (404)
- ✅ Redirect to /play after 2 seconds

**10.3: No Auth**
1. Clear sessionStorage
2. Navigate to `/game/:roomId`

**Expected:**
- ✅ Alert: "Please sign in first"
- ✅ Redirect to /

---

## ✅ ACCEPTANCE CRITERIA

**MVP is COMPLETE when all these pass:**

- [ ] Authentication works (guest + Google)
- [ ] Room creation works
- [ ] Player join + approval works
- [ ] Seat claiming works  
- [ ] Game starts, redirects to zoom-lock
- [ ] Cards dealt correctly
- [ ] **REFRESH WORKS** (preserves state)
- [ ] Actions (fold/call/raise) work
- [ ] Actions broadcast to other players
- [ ] Turn indicator shows correctly
- [ ] Hand completes, winner shown
- [ ] Next hand starts
- [ ] 10 refreshes = 10 successful recoveries
- [ ] No console errors during normal play
- [ ] Works in Chrome, Firefox

---

## 🚨 COMMON ISSUES & FIXES

### **Issue: "No user ID found"**
**Fix:** Check `window.authManager.getCurrentUser()` returns user

### **Issue: Hydration 404**
**Fix:** Verify room exists in database
```sql
SELECT * FROM rooms WHERE id = '<roomId>';
```

### **Issue: Cards don't show**
**Fix:** Check hydration response has `me.hole_cards`
```javascript
console.log(hydration.me?.hole_cards);
```

### **Issue: Actions don't work**
**Fix:** Check gameId is set
```javascript
console.log('gameId:', window.pokerTable.gameId);
```

### **Issue: Sequence number errors**
**Fix:** Check seq is increasing
```javascript
console.log('Current seq:', window.pokerTable.sequenceTracker.currentSeq);
```

---

## 📊 TESTING CHECKLIST

Copy this for manual testing:

```
[ ] Server starts without errors
[ ] /play page loads
[ ] Can play as guest
[ ] Can create room
[ ] Second player can join
[ ] Host can approve
[ ] Both can claim seats
[ ] Host can start game
[ ] Redirect to /game/:roomId works
[ ] Zoom-lock table appears
[ ] Cards are dealt
[ ] Can see dealer button
[ ] Can see pot amount
[ ] Can see turn indicator
[ ] Can fold/call/raise
[ ] Actions broadcast to other player
[ ] REFRESH preserves state ← CRITICAL
[ ] Can continue after refresh
[ ] Hand completes correctly
[ ] Winner announced
[ ] Next hand starts
```

---

**Octavian - Testing Guide Complete** ⚔️

