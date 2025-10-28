# 🔍 COMPLETE SYSTEM DIAGNOSIS - OCTOBER 28, 2025

## 🎯 GOAL
Get from lobby → fully working table with DB persistence, no refresh bugs

---

## 📊 CURRENT STATE OF ALL MOVING PARTS

### **1. AUTH SYSTEM** 🔐
**Location:** `public/js/auth-manager.js`, `public/js/nav-shared.js`

**Flow:**
```
User logs in (Google/Guest)
  ↓
auth-manager creates user object
  ↓
Stores in: window.currentUser + sessionStorage
  ↓
⚠️ ISSUE: sessionStorage needs userId stored BEFORE redirect
```

**Status:** ✅ FIXED (just now)
- play.html now stores userId in sessionStorage
- zoom-lock checks 3 sources: window.currentUser, sessionStorage, authManager

---

### **2. DATABASE** 🗄️
**Type:** Supabase PostgreSQL (remote)
**Tables:** 40+
**Connection:** PokerTableV2DB pool

**Critical Tables:**
- `rooms` - Room settings
- `room_players` - Lobby waiting list  
- `room_seats` - Seat assignments
- `games` - Game instances
- `game_states` - Current state JSONB + seq
- `hands` - Hand history
- `players` - Player state + hole_cards
- `processed_actions` - Idempotency (VARCHAR(64))

**⚠️ ISSUE FOUND:**
```
Failed to store idempotency: error: value too long for type character varying(50)
length: 98
```

**Problem:** Somewhere a table has VARCHAR(50) but our keys are 98 chars!

**Status:** 🔧 PARTIALLY FIXED
- Created hash function to make short keys
- But old code still generating 98-char keys
- Need to verify all endpoints use makeIdempotencyKey()

---

### **3. SEQUENCE SYSTEM** 🔢
**Location:** `public/js/sequence-tracker.js`, `src/db/poker-table-v2.js`

**Purpose:** Prevent stale updates after refresh

**Flow:**
```
Action → DB write → seq++ → Broadcast {seq, ...}
Client → Receives broadcast → Checks seq > currentSeq
```

**⚠️ ISSUE:** Lobby uses timestamps (1761660133107) vs game uses integers (1,2,3)

**Status:** ✅ FIXED
- sequence-tracker now handles large jumps (timestamps)
- incrementSequence returns timestamp if no game_states record

---

### **4. LOBBY SYSTEM** 🎰
**Location:** `public/pages/play.html`, `routes/rooms.js`

**Flow:**
```
1. POST /api/rooms → Create room
2. POST /api/rooms/:id/lobby/join → Guest joins
3. POST /api/rooms/:id/lobby/approve → Host approves
4. POST /api/rooms/:id/join → Claim seats
5. POST /api/games → Start game
```

**⚠️ CURRENT ISSUE:**
```
Failed to store idempotency: value too long for type character varying(50)
```

**Status:** 🔴 BROKEN
- Approvals failing due to idempotency key length
- makeIdempotencyKey() function exists but might not be used everywhere

---

### **5. GAME ENGINE** 🎮
**Location:** `/dist/core/` (TypeScript compiled)

**Components:**
- GameStateMachine
- BettingEngine
- TurnManager  
- HandEvaluator

**Status:** ✅ WORKING - Don't touch

---

### **6. ROUTING SYSTEM** 🛣️
**Location:** `routes/pages.js`, `sophisticated-engine-server.js`

**Routes:**
```
/play → play.html (lobby)
/game/:roomId → poker-table-zoom-lock.html ✅ FIXED
/game → poker.html (old, fallback)
```

**Status:** ✅ FIXED
- Removed duplicate routes from main server
- Route order corrected
- `/game/:roomId` now serves zoom-lock table

---

### **7. ZOOM-LOCK TABLE UI** 🎨
**Location:** `public/poker-table-zoom-lock.html`

**Initialization:**
```
DOMContentLoaded
  ↓
new PokerTableGrid()
  ↓
init()
  ├─ setupZoomLock() - Scale calculations
  ├─ applySeatPositions() - Position seats
  └─ initWithBackend() - Connect to server
      ├─ Get userId (3 sources)
      ├─ Extract roomId from URL
      ├─ Connect Socket.IO
      └─ fetchHydration() → Render
```

**Status:** ✅ MOSTLY WORKING
- Auth persistence fixed
- Seat positioning has debug logging
- Missing: hydration might be empty (no players seated?)

---

### **8. WEBSOCKET SYSTEM** 🔌
**Location:** `websocket/socket-handlers.js`, Socket.IO

**Events:**
- `player_joined` - Someone joined lobby
- `player_approved` - Host approved
- `game_started` - Game begins (redirect)
- `hand_started` - Cards dealt
- `player_action` - Someone acted
- `action_required` - Your turn

**Status:** ✅ WORKING

---

## 🚨 CRITICAL BLOCKERS IDENTIFIED

### **BLOCKER #1: Idempotency Key Length** 🔴
**Error:**
```
value too long for type character varying(50)
length: 98
```

**Root Cause:** Database has VARCHAR(50) somewhere, we're sending 98-char keys

**Files to check:**
- All endpoints in routes/ that use withIdempotency
- Verify ALL use makeIdempotencyKey() not raw template strings

---

### **BLOCKER #2: Database Connection Terminated** 🔴
**Error:**
```
error: {:shutdown, :db_termination}
```

**Root Cause:** Supabase closed connection (timeout/pooling limit)

**Impact:** ALL database operations fail after this

**Fix Needed:**
- Add connection retry logic
- Handle DB errors gracefully (don't crash)
- Pool configuration tuning

---

### **BLOCKER #3: No Seat Claiming Flow** 🟡
**Missing:** Players approved but never claim seats

**Need to verify:**
- Does play.html have seat claiming UI?
- Does it call POST /api/rooms/:id/join?
- Are seats stored in room_seats table?

---

## 🎯 IMMEDIATE ACTION PLAN

### **Priority 1: Fix Idempotency Keys (15 min)**
**Task:** Find WHERE the 98-char keys are coming from

**Steps:**
1. Search all `fetch()` calls in play.html
2. Find ones NOT using makeIdempotencyKey()
3. Replace with hash function

---

### **Priority 2: Add DB Reconnection (10 min)**
**Task:** Handle Supabase connection drops

**File:** `sophisticated-engine-server.js` or pool config

**Add:**
```javascript
pool.on('error', (err) => {
  console.error('DB pool error:', err);
  // Don't crash, just log
});
```

---

### **Priority 3: Verify Complete Flow (20 min)**
**Task:** Test each step with logging

**Procedure:**
1. Create room ✅
2. Join lobby ✅  
3. Approve player ❌ (idempotency error)
4. Claim seats ❓ (not tested yet)
5. Start game ❓
6. See table ✅ (route works)
7. Hydration loads ❓

---

## 🔧 WHAT TO FIX NEXT

**I need to:**
1. Find ALL fetch() calls using old idempotency format
2. Check if seat claiming flow exists in play.html
3. Add DB error handling to prevent crashes

**Then test:**
- Complete lobby → approve → seats → start → table flow
- Verify hydration returns actual game data
- Test refresh

---

**Should I:**
A) **Search all idempotency keys** and fix to use hash function?
B) **Map complete seat claiming flow** to verify it exists?
C) **Test what we have now** and see exact error points?

**What's your call, Commander?** ⚔️

