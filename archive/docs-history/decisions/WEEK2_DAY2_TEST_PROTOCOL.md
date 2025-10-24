# ⚔️ WEEK 2 DAY 2 - TEST PROTOCOL

**Mission:** Verify room recovery and session persistence  
**Status:** 🧪 **TESTING PHASE**  
**Commander:** Test all scenarios and report results

---

## 🎯 WHAT WE BUILT

### **Frontend Changes:**
- ✅ URL parsing (both `/game/:roomId` and `?room=code`)
- ✅ Room recovery function (`attemptRoomRecovery`)
- ✅ Seat restoration (`restorePlayerSeat`)
- ✅ Socket reconnection (`reconnectSocket`)
- ✅ Game state check (`checkActiveGame`)

### **Backend Changes:**
- ✅ New endpoint: `GET /api/rooms/:roomId/game`
- ✅ Returns active game state for room recovery

---

## 🧪 TEST SCENARIOS

### **Test 1: Host Refreshes in Lobby** 🔥 CRITICAL
```
1. Window 1: Sign in with Google
2. Create a room
3. Note the URL (should be /game/:roomId)
4. Wait for auto-join to lobby
5. Press F5 (refresh)

✅ EXPECTED:
- Page reloads
- Console shows: "🔗 [RECOVERY] Room ID detected in path"
- Console shows: "⚔️ [RECOVERY] Attempting room recovery..."
- Lobby screen appears
- Room code still displayed
- Notification: "Reconnected to room!"

❌ FAILURE SIGNS:
- Redirected to lobby list
- Room code missing
- "Room not found" error
```

---

### **Test 2: Guest Refreshes After Approved** 🔥 CRITICAL
```
1. Window 1: Host creates room
2. Window 2: Guest joins via code
3. Host approves guest
4. Guest refreshes (F5)

✅ EXPECTED:
- Guest reconnects to lobby
- Guest still shows as "approved"
- Console shows recovery logs
- Socket reconnects automatically

❌ FAILURE SIGNS:
- Guest kicked back to lobby list
- Status reset to "pending"
- Must rejoin manually
```

---

### **Test 3: Player Refreshes After Claiming Seat** 🔥 CRITICAL
```
1. Player joins lobby
2. Player clicks "Claim Seat"
3. Seat turns blue with name
4. Player refreshes (F5)

✅ EXPECTED:
- Player reconnects to room
- Seat still claimed (blue with name)
- Chips still shown
- Console shows: "🪑 [RECOVERY] Checking for player seat..."
- Console shows: "✅ [RECOVERY] Seat found"
- Notification: "You are in seat X with Y chips"

❌ FAILURE SIGNS:
- Seat appears empty
- Must reclaim seat manually
- Chips reset or missing
```

---

### **Test 4: Mid-Game Refresh** 🔥 CRITICAL
```
1. Two players claim seats
2. Host starts game
3. Cards dealt
4. One player refreshes (F5)

✅ EXPECTED:
- Player reconnects
- Game state restored
- Cards still visible
- Current turn indicator correct
- Console shows: "🎮 [RECOVERY] Active game found"
- Console shows: "✅ [RECOVERY] Seat found"
- Notification: "Restored game state!"

❌ FAILURE SIGNS:
- Game state lost
- Cards disappear
- Turn order broken
- Must restart game
```

---

### **Test 5: URL Direct Access**
```
1. Host creates room
2. Note the full URL: http://localhost:3000/game/:roomId
3. Copy URL
4. Open new tab/window
5. Paste URL and navigate

✅ EXPECTED:
- Room loads immediately
- No need to enter code
- Can join lobby directly
- Socket connects automatically

❌ FAILURE SIGNS:
- "Room not found" error
- Redirected to lobby list
- URL doesn't work
```

---

### **Test 6: Socket Disconnect Recovery**
```
1. Player in active game
2. Disable network briefly (airplane mode or disconnect WiFi)
3. Wait 3-5 seconds
4. Re-enable network

✅ EXPECTED:
- Console shows: "⚠️ [SOCKET] Disconnected"
- Socket auto-reconnects (5 attempts, 1s delay)
- Console shows: "✅ [RECOVERY] Socket connected!"
- Game continues where it left off

❌ FAILURE SIGNS:
- Connection never restores
- Must refresh manually
- Game state lost
```

---

## 📊 CONSOLE LOGS TO CHECK

### **Successful Recovery Looks Like:**
```
🎬 [Play Page] DOMContentLoaded - initializing...
✅ [Play Page] Auth state checked, user: {id: "...", ...}
🔗 [RECOVERY] Room ID detected in path: abc123-def456
⚔️ [RECOVERY] Attempting room recovery... {roomId: "...", userId: "..."}
🔄 [RECOVERY] Fetching room state... abc123-def456
✅ [RECOVERY] Room found: {id: "...", invite_code: "..."}
🪑 [RECOVERY] Checking for player seat...
✅ [RECOVERY] Seat found: {seat_index: 0, chips: 500, user_id: "..."}
🔌 [RECOVERY] Reconnecting socket...
✅ [RECOVERY] Socket connected!
🎮 [RECOVERY] Checking for active game...
🎮 [RECOVERY] Active game found: {id: "...", state: {...}}
🎉 [RECOVERY] Room recovery complete!
```

### **Failed Recovery Looks Like:**
```
🎬 [Play Page] DOMContentLoaded - initializing...
✅ [Play Page] Auth state checked, user: {id: "...", ...}
🔗 [RECOVERY] Room ID detected in path: abc123-def456
⚔️ [RECOVERY] Attempting room recovery...
❌ [RECOVERY] Room recovery failed: Room not found
```

---

## 🎯 SUCCESS CRITERIA

**ALL of these must be true:**

**URL Recovery:**
- ✅ `/game/:roomId` URLs load correctly
- ✅ Room state restored from database
- ✅ No manual re-entry needed

**Seat Persistence:**
- ✅ Claimed seats survive refresh
- ✅ Chip counts maintained
- ✅ Seat positions correct

**Socket Reconnection:**
- ✅ Auto-connects on page load
- ✅ Real-time updates resume
- ✅ No duplicate connections
- ✅ Graceful reconnection on disconnect

**Game State:**
- ✅ Active games survive refresh
- ✅ Cards/pot/turn restored
- ✅ Players can continue playing

**UX:**
- ✅ Refresh feels seamless
- ✅ Clear notifications
- ✅ No confusing errors
- ✅ Players can refresh safely

---

## 🚨 KNOWN LIMITATIONS

1. **No game state persistence yet** - We query `game_states` but may not have full state
2. **Cards may not restore** - Card data might not be in database yet
3. **Turn order may break** - Need to verify turn tracking survives refresh
4. **Multiple tabs** - Opening same room in 2 tabs may cause issues

**These are acceptable for Day 2.** We'll refine in Days 3-5.

---

## 📋 TESTING CHECKLIST

Run ALL tests and check off:

- [ ] Test 1: Host refreshes in lobby
- [ ] Test 2: Guest refreshes after approved
- [ ] Test 3: Player refreshes after claiming seat
- [ ] Test 4: Mid-game refresh
- [ ] Test 5: URL direct access
- [ ] Test 6: Socket disconnect recovery

**REPORT RESULTS:**
- Which tests passed? ✅
- Which tests failed? ❌
- What errors appeared?
- Console logs for failures?

---

## ⚔️ NEXT ACTIONS

**If ALL tests pass:**
- ✅ Mark Day 2 complete
- 🎯 Move to Day 3 (Room Management UI)
- 🎉 Celebrate major infrastructure win

**If SOME tests fail:**
- 🔧 Debug failed scenarios
- 📝 Document issues
- 🔨 Fix and retest

**If MOST tests fail:**
- 🔍 Check server logs for errors
- 🔍 Check browser console for errors
- 🤔 May need to adjust approach

---

**COMMANDER: COMMENCE TESTING!** ⚔️

**HARD REFRESH (Ctrl+Shift+R) AND RUN THE TESTS!**

