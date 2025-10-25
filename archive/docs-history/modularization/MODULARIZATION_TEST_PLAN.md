# 🧪 MODULARIZATION TEST PLAN

**Purpose:** Verify that ALL functionality remains intact after modularization  
**Status:** Ready to execute  
**Expected Duration:** 15-20 minutes

---

## 🎯 TEST OBJECTIVES

1. ✅ Verify server starts without errors
2. ✅ Verify all routers are mounted
3. ✅ Test core game flow (create → join → play)
4. ✅ Test room management (create → invite → manage)
5. ✅ Test authentication (login → sync → persist)
6. ✅ Test seat persistence (claim → refresh → restore)
7. ✅ Test Socket.IO (join → broadcast → receive)

---

## 📋 TEST CHECKLIST

### Phase 1: Server Startup ✅
- [x] Server starts without syntax errors
- [x] All 5 routers mounted
- [x] Socket.IO initialized
- [x] Database connected
- [x] Event persistence active
- [x] No schema errors on user sync

**How to verify:**
```bash
node sophisticated-engine-server.js
```

**Expected output:**
```
✅ All routers mounted (45 endpoints)
✅ Socket.IO initialized
✅ Database connected
✅ Server listening on port 3000
```

---

### Phase 2: Authentication Flow 🔄
**Test 2.1: Google Sign-In**
- [ ] Navigate to `http://localhost:3000`
- [ ] Click "Sign in with Google"
- [ ] Verify user is authenticated
- [ ] Verify profile button appears (no "Access token required" error)
- [ ] Verify user sync to backend succeeds (check console logs)

**Expected behavior:**
- ✅ Login successful
- ✅ User synced to `user_profiles` table
- ✅ No `email` column errors
- ✅ Profile button clickable

**Test 2.2: Guest Sign-In**
- [ ] Navigate to `http://localhost:3000`
- [ ] Click "Continue as Guest"
- [ ] Verify guest ID generated
- [ ] Verify guest can access play page

**Expected behavior:**
- ✅ Guest ID created
- ✅ Guest username assigned
- ✅ Guest can navigate to `/play`

**Test 2.3: State Persistence**
- [ ] Sign in (Google or Guest)
- [ ] Refresh the page
- [ ] Verify user remains signed in
- [ ] Verify profile button persists

**Expected behavior:**
- ✅ Auth state persists across refresh
- ✅ No "Access token required" errors

---

### Phase 3: Room Management 🏠
**Test 3.1: Create Room**
- [ ] Sign in to `/play`
- [ ] Click "Create Room"
- [ ] Set room name, max players
- [ ] Click "Create"
- [ ] Verify room created
- [ ] Verify room code displayed
- [ ] Verify user is in lobby

**Expected behavior:**
- ✅ Room created successfully
- ✅ Room code generated
- ✅ Host is in lobby

**Test 3.2: Join Room**
- [ ] Open a second browser (or incognito)
- [ ] Sign in as guest
- [ ] Enter room code
- [ ] Click "Join Lobby"
- [ ] Verify guest is in pending state

**Expected behavior:**
- ✅ Guest can join lobby
- ✅ Host sees guest in pending list
- ✅ No "Access token required" errors

**Test 3.3: Approve Player**
- [ ] As host, click "Approve" for guest
- [ ] Verify guest is approved
- [ ] Verify both players see each other

**Expected behavior:**
- ✅ Guest approved
- ✅ Both players see updated lobby

**Test 3.4: Room Limits**
- [ ] Try to create 6th room (if you have 5 active)
- [ ] Verify warning appears

**Expected behavior:**
- ✅ 5-room limit enforced
- ✅ Warning displayed to user

---

### Phase 4: Game Flow 🎮
**Test 4.1: Start Game**
- [ ] As host, click "Start Game"
- [ ] Verify both players redirected to poker table
- [ ] Verify seats are available
- [ ] Verify "Claim Seat" buttons visible

**Expected behavior:**
- ✅ Game created
- ✅ Both players see table
- ✅ Seats rendered correctly

**Test 4.2: Claim Seats**
- [ ] Host claims seat 1
- [ ] Guest claims seat 2
- [ ] Verify both seats marked as "taken"
- [ ] Verify "Start Hand" button appears

**Expected behavior:**
- ✅ Both seats claimed
- ✅ Visual indication of occupied seats
- ✅ Start Hand button enabled

**Test 4.3: Start Hand**
- [ ] Click "Start Hand"
- [ ] Verify cards dealt
- [ ] Verify community cards appear
- [ ] Verify action buttons (Fold, Check, Bet, Raise) appear

**Expected behavior:**
- ✅ Cards dealt to players
- ✅ Community cards displayed
- ✅ Action buttons functional

**Test 4.4: Player Actions**
- [ ] Player 1 clicks "Check"
- [ ] Player 2 clicks "Bet" (enter amount)
- [ ] Player 1 clicks "Call"
- [ ] Continue until showdown

**Expected behavior:**
- ✅ Actions processed correctly
- ✅ Pot updated
- ✅ Betting rounds advance (Preflop → Flop → Turn → River)
- ✅ Showdown declares winner

---

### Phase 5: Seat Persistence 💺
**Test 5.1: Refresh While Seated**
- [ ] Claim a seat (e.g., Seat 1)
- [ ] Refresh the page (`F5` or `Ctrl+R`)
- [ ] Verify you are still in Seat 1
- [ ] Verify seat is visually highlighted as "YOUR SEAT"

**Expected behavior:**
- ✅ Seat persists after refresh
- ✅ Gold border on your seat
- ✅ "YOUR SEAT" label displayed
- ✅ Other seats show "Seat X (Taken)"

**Test 5.2: Prevent Duplicate Claims**
- [ ] Already seated in Seat 1
- [ ] Try to claim Seat 2
- [ ] Verify error or prevention

**Expected behavior:**
- ✅ Cannot claim second seat
- ✅ Warning displayed

---

### Phase 6: Socket.IO Real-Time 🔌
**Test 6.1: Seat Broadcasting**
- [ ] Player 1 claims a seat
- [ ] Verify Player 2 sees seat update immediately (no refresh)

**Expected behavior:**
- ✅ Seat status broadcasts to all players
- ✅ Real-time UI update

**Test 6.2: Action Broadcasting**
- [ ] Player 1 makes an action (Check/Bet)
- [ ] Verify Player 2 sees the action immediately

**Expected behavior:**
- ✅ Actions broadcast to all players
- ✅ Game state syncs in real-time

**Test 6.3: Disconnect & Reconnect**
- [ ] Close browser tab (disconnect)
- [ ] Reopen same room URL
- [ ] Verify game state restored

**Expected behavior:**
- ✅ Reconnect to game
- ✅ Game state restored from database
- ✅ Seat persistence maintained

---

### Phase 7: Edge Cases & Error Handling ⚠️
**Test 7.1: Invalid Room Code**
- [ ] Enter non-existent room code
- [ ] Verify error message

**Expected behavior:**
- ✅ "Room not found" error
- ✅ No server crash

**Test 7.2: Join Full Room**
- [ ] Try to join a room at max capacity
- [ ] Verify rejection

**Expected behavior:**
- ✅ "Room is full" error
- ✅ No server crash

**Test 7.3: Invalid Actions**
- [ ] Try to bet more chips than you have
- [ ] Verify error handling

**Expected behavior:**
- ✅ "Insufficient chips" error
- ✅ Action rejected gracefully

**Test 7.4: Multiple Refreshes**
- [ ] Refresh page 5-10 times rapidly
- [ ] Verify no duplicate entries
- [ ] Verify seat persistence

**Expected behavior:**
- ✅ No duplicate seats created
- ✅ Seat remains consistent

---

## 🚨 CRITICAL PATHS (MUST PASS)

These tests **MUST** pass before proceeding:

1. ✅ Server starts without errors
2. ✅ User can sign in (Google or Guest)
3. ✅ User can create a room
4. ✅ Second user can join room
5. ✅ Game can be started
6. ✅ Seats can be claimed
7. ✅ Hand can be dealt
8. ✅ Actions can be processed
9. ✅ Seat persists after refresh
10. ✅ No "Access token required" errors

---

## 📊 TEST RESULTS TEMPLATE

Copy this to track your results:

```markdown
## Test Execution Results

**Date:** [Date]
**Tester:** [Your Name]
**Server Version:** Modularized (1,046 lines)

### Phase 1: Server Startup
- [ ] Pass ✅ / [ ] Fail ❌
- Notes: 

### Phase 2: Authentication
- [ ] Pass ✅ / [ ] Fail ❌
- Notes:

### Phase 3: Room Management
- [ ] Pass ✅ / [ ] Fail ❌
- Notes:

### Phase 4: Game Flow
- [ ] Pass ✅ / [ ] Fail ❌
- Notes:

### Phase 5: Seat Persistence
- [ ] Pass ✅ / [ ] Fail ❌
- Notes:

### Phase 6: Socket.IO
- [ ] Pass ✅ / [ ] Fail ❌
- Notes:

### Phase 7: Edge Cases
- [ ] Pass ✅ / [ ] Fail ❌
- Notes:

---

**Overall Status:** [ ] PASS ✅ / [ ] FAIL ❌

**Blockers Found:**
1. 
2. 

**Ready for Week 4?** [ ] Yes / [ ] No
```

---

## 🐛 IF YOU FIND BUGS

1. **Note the exact error message**
2. **Note which test failed**
3. **Check server console logs**
4. **Check browser console logs**
5. **Report back with details**

We'll fix any issues immediately before moving to Week 4.

---

## ✅ SUCCESS CRITERIA

**All tests pass** = Ready for Week 4 features  
**Any critical path fails** = Fix immediately  
**Edge cases fail** = Note but not blocking

---

**Let's verify the modularization is flawless.** 🚀

