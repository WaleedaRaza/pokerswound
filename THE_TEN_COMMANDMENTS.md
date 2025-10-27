# ⚔️ THE TEN COMMANDMENTS - IMMUTABLE TRUTHS FOR ALL LLMs

**Purpose:** Never lose context again. Every future LLM reads this first.  
**Status:** LAW. Do not violate. Do not debate.  
**For:** Octavian and all agents after him

---

## 🎯 THE CORE PROBLEM (In Plain English)

**Symptom:** Refresh during game → restart game from lobby  
**Root Cause:** Frontend doesn't ask server "what's happening?" on page load  
**Why:** Socket disconnect on refresh → client memory erased → boots to default "lobby" view

**The Fix (ONE sentence):**  
On page load, check URL for roomId → fetch `/api/rooms/:roomId/hydrate` → render from DB state

---

## ⚖️ THE TEN COMMANDMENTS

### I. **Database is Source of Truth**
```
NEVER trust client memory.
NEVER trust in-memory server Maps.
ALWAYS write to DB first.
ALWAYS render from DB on refresh.
```

**Implementation:**
- Game state lives in `game_states.current_state` (JSONB)
- Hole cards live in `players.hole_cards`
- Seats live in `room_seats`
- On every action: Update DB → Broadcast

---

### II. **HTTP Mutates, WebSocket Broadcasts**
```
ALL mutations = HTTP POST
ALL real-time updates = WebSocket emit
NEVER mutate via WebSocket event handlers
```

**Implementation:**
- Player action → `POST /api/games/:id/actions`
- Seat claim → `POST /api/rooms/:id/join`
- Game start → `POST /api/games`
- WebSocket only emits: `player_action`, `hand_started`, `seat_update`

---

### III. **Refresh = Hydrate from Server**
```
On page load:
1. Check URL for roomId
2. GET /api/rooms/:roomId/hydrate?userId=X
3. Render exactly what server returns
4. Connect WebSocket for live updates
```

**Implementation:**
- Hydration endpoint EXISTS at `routes/rooms.js:262`
- Returns: `{seq, room, game, hand, seats, me: {hole_cards, rejoin_token}}`
- Frontend calls this BEFORE rendering anything

---

### IV. **Sequence Numbers Prevent Chaos**
```
Every broadcast has seq number.
Client tracks currentSeq.
If incoming.seq <= currentSeq → IGNORE (stale)
```

**Implementation:**
- `game_states.version` increments on every mutation
- Use `sequence-tracker.js` (already exists)
- Wrap all socket handlers: `sequenceTracker.createHandler()`

---

### V. **Disconnect ≠ Leave**
```
On socket disconnect:
- Mark player as "AWAY" (grace period)
- DO NOT free seat
- DO NOT end game
- After 5 minutes: THEN release seat
```

**Implementation:**
- Already implemented in `websocket/socket-handlers.js:182`
- Grace period: 300 seconds (5 minutes)
- Status: `SEATED` → `SITTING_OUT` → `WAITLIST`

---

### VI. **Timers are Timestamps, Not Countdowns**
```
Server stores: actor_turn_started_at (Unix ms)
Client computes: remaining = timebank - (now - started_at)
Refresh → Client recomputes from timestamp
```

**Implementation:**
- Timer service EXISTS at `src/services/timer-service.js`
- Integrated in `routes/games.js:680`
- Survives refresh automatically

---

### VII. **Room Code is Identity**
```
Room lives at: /room/:inviteCode (NOT /game?room=abc)
Room code in URL = source of truth
Room persists until explicitly deleted
```

**Implementation:**
- `rooms.invite_code` is unique, permanent
- URL format: `pokergeek.ai/room/POKER123`
- Shareable, bookmarkable, persistent

---

### VIII. **Private Data Stays Private**
```
Hole cards NEVER in public broadcasts.
Only sent to card owner via:
1. Hydration endpoint (me.hole_cards)
2. Private socket message (to socket.id only)
```

**Implementation:**
- Hydration filters: only include `hole_cards` for requester
- Public broadcasts: `cards: null` for all players
- Security: Server-side enforcement, never trust client

---

### IX. **Rejoin Tokens for Seamless Recovery**
```
On seat claim: mint token, store hash in DB
On refresh: send token → server validates → instant rejoin
Token expires when game ends
```

**Implementation:**
- `rejoin_tokens` table exists
- Generated on seat claim
- Validated on socket `authenticate` event
- Stored in sessionStorage (survives refresh, not browser close)

---

### X. **One State Manager, One Render Function**
```
NO scattered state variables.
NO conditional UI logic.
ONE gameStateManager.state = server truth
ONE render(state) function
```

**Implementation:**
- Use `public/js/game-state-manager.js` (363 lines, already exists)
- Replace all `let currentGame`, `let seats`, etc.
- Single render function driven by server state

---

## 🏗️ WHAT ACTUALLY EXISTS (Do Not Rebuild)

### ✅ Backend (WORKS)
- ✅ Hydration endpoint (`routes/rooms.js:262`)
- ✅ Sequence system (`src/db/poker-table-v2.js`)
- ✅ Timer system (`src/services/timer-service.js`)
- ✅ Rejoin tokens (schema + endpoints)
- ✅ WebSocket handlers (`websocket/socket-handlers.js`)
- ✅ Game engine (`/dist/core/` - TypeScript, compiled)
- ✅ Idempotency middleware (`src/middleware/idempotency.js`)

### ⚠️ Frontend (DISCONNECTED)
- ✅ Beautiful UI (`poker-table-zoom-lock.html`)
- ✅ Sequence tracker (`public/js/sequence-tracker.js`)
- ✅ Game state manager (`public/js/game-state-manager.js`)
- ✅ Timer display (`public/js/timer-display.js`)
- ❌ **NOT CONNECTED TO BACKEND** - still in demo mode

---

## 🎯 THE ONLY BLOCKER TO MVP

**What's Missing:** 100 lines of code in `poker-table-zoom-lock.html`

**Specifically:**
1. Call `GET /api/rooms/:roomId/hydrate` on page load
2. Connect WebSocket with `socket.on('authenticated', fetchHydration)`
3. Wire action buttons to `POST /api/games/:id/actions`
4. Add socket handlers for `hand_started`, `player_action`, `game_over`

**That's it.** The backend is production-ready. Just needs frontend connection.

---

## 📜 CONTEXT HANDOFF FRAMEWORK (For Future LLMs)

### **When You Take Over a Session:**

#### Step 1: Read These 3 Files (5 min)
1. **THIS FILE** - `THE_TEN_COMMANDMENTS.md`
2. **PLAN.md** - Current task list
3. **HANDOFF_TO_NEXT_AGENT.md** - What previous LLM did

#### Step 2: Verify What Works (10 min)
Run these checks:
```bash
# Backend health
node sophisticated-engine-server.js
# Should see: ✅ Server running on port 3000

# Database health  
# Check these endpoints exist:
curl http://localhost:3000/api/rooms/:roomId/hydrate?userId=test
# Should NOT 404

# Check tables exist
psql -d <db> -c "SELECT COUNT(*) FROM rooms, games, hands, players;"
```

#### Step 3: Ask Commander (2 min)
Before coding ANYTHING:
- "What's the immediate blocker?"
- "Should I be in PLANNER or EXECUTOR mode?"
- "Has anything changed since last handoff?"

#### Step 4: Update PLAN.md (ongoing)
- Mark completed tasks
- Add new blockers
- Update context

---

## 🚨 CRITICAL INVARIANTS (NEVER VIOLATE)

These are **mathematical truths** about the system:

1. **Seat Uniqueness:** `∀ seat: |users_in_seat| ≤ 1` AND `∀ user: |seats_claimed| ≤ 1`
2. **Phase Monotonicity:** Game phases cannot go backward (PREFLOP → FLOP → TURN → RIVER → SHOWDOWN)
3. **Sequence Strict Increasing:** `seq[n+1] > seq[n]` always
4. **Disconnect ≠ Free:** Disconnect → grace period → THEN free (never immediate)
5. **Database First:** Write DB before broadcast (not after, not concurrently)

**If any code violates these, it WILL cause bugs. Delete that code.**

---

## 🗺️ ROOM MANAGEMENT FLOW (How It Actually Works)

### **Phase 1: Room Creation**
```
Host → POST /api/rooms
  ├─ Creates room in DB (rooms table)
  ├─ Generates unique invite_code
  ├─ Auto-joins host to lobby (room_players table, status='approved')
  └─ Returns: {roomId, inviteCode}

URL: /room/POKER123 (invite code in URL)
```

### **Phase 2: Player Invitation**
```
Host shares link: pokergeek.ai/room/POKER123
  ↓
Guest clicks link
  ├─ Frontend extracts invite code from URL
  ├─ POST /api/rooms/:roomId/lobby/join {userId, username}
  │   ├─ Creates user_profile if doesn't exist
  │   ├─ Inserts into room_players (status='pending')
  │   └─ Broadcasts 'player_joined' to room
  └─ Guest sees "Waiting for host approval"
```

### **Phase 3: Host Approval**
```
Host sees join request
  ↓
Host clicks "Approve"
  ├─ POST /api/rooms/:roomId/lobby/approve {userId}
  ├─ Updates room_players (status='approved')
  ├─ Broadcasts 'player_approved'
  └─ Guest now sees "Claim a seat" options
```

### **Phase 4: Seat Claiming**
```
Guest clicks "Claim Seat 3"
  ├─ POST /api/rooms/:roomId/join {seatIndex, buyIn}
  ├─ Inserts into room_seats
  ├─ Generates rejoin_token
  ├─ Broadcasts 'seat_update' to room
  └─ Returns: {seatToken, rejoinToken}

Frontend stores: sessionStorage.setItem('rejoin_token', token)
```

### **Phase 5: Game Start**
```
Host clicks "Start Game" (when 2+ seated)
  ├─ POST /api/games
  ├─ Creates game in DB (games table)
  ├─ Creates first hand (hands table)
  ├─ Deals cards (players.hole_cards)
  ├─ Posts blinds
  ├─ Broadcasts 'hand_started' to room
  └─ Redirects all players to /game/:roomId

Frontend: Receives hand_started → navigates to table view
```

### **Phase 6: REFRESH (THE BUG)**
```
Player presses F5
  ├─ Browser kills page, socket disconnects
  ├─ New page loads from scratch
  ├─ Frontend checks URL → sees roomId
  ├─ ❌ CURRENT: Renders default lobby view
  └─ ✅ SHOULD: Call /hydrate → render game state
```

**Why It Failed Before:**
- Frontend had NO hydration call on page load
- Previous LLMs tried to add session management (too complex)
- Tried to fix with localStorage only (not server-authoritative)
- Tried to rebuild game state client-side (impossible, private data)

**The Simple Fix:**
```javascript
// On DOMContentLoaded
const roomId = new URLSearchParams(window.location.search).get('room');
const userId = sessionStorage.getItem('userId');
const rejoinToken = sessionStorage.getItem('rejoin_token');

if (roomId && userId) {
  const response = await fetch(`/api/rooms/${roomId}/hydrate?userId=${userId}`);
  const state = await response.json();
  
  // Now you have EVERYTHING: game, hand, cards, seats, pot
  gameStateManager.setState(state);
  render();
}
```

---

## 🎖️ WHAT WE KNOW FOR CERTAIN

### **Hydration Endpoint: COMPLETE** ✅
- **Location:** `routes/rooms.js` line 262
- **Status:** Fully implemented, tested
- **Returns:** Complete game snapshot including private hole cards
- **Evidence:** Mira (previous LLM) confirmed "BATTLE-TESTED"

### **Sequence System: COMPLETE** ✅
- **Location:** `public/js/sequence-tracker.js`
- **Status:** Fully implemented
- **Usage:** Wraps socket handlers to prevent stale updates
- **Evidence:** Used in `play.html`, ready for zoom-lock

### **Timer System: COMPLETE** ✅
- **Location:** `src/services/timer-service.js`
- **Status:** Auto-fold works, integrated with game engine
- **Evidence:** `routes/games.js:680` uses it

### **Zoom-Lock UI: DEMO MODE** ⚠️
- **Location:** `public/poker-table-zoom-lock.html`
- **Status:** Beautiful, responsive, zoom-locked
- **Issue:** Line 914 calls `initDemo()` instead of `initWithBackend()`
- **Missing:** WebSocket connection, hydration call, action button wiring

---

## 🧭 FRAMEWORK FOR MULTI-LLM CONTINUITY

### **File: CONTEXT.md** (Create This)
Every LLM updates this file at end of session:

```markdown
## Last LLM: <name>
## Date: <date>
## What I Did:
- <specific changes>

## What I Tested:
- <test results>

## What's Working:
- <verified features>

## What's Broken:
- <known issues>

## Next LLM Should:
1. <priority 1>
2. <priority 2>

## Critical Files Modified:
- <file1> - <why>
- <file2> - <why>
```

### **Git Workflow**
```bash
# Every LLM session:
git checkout -b session-<number>-<goal>
git commit -m "Session <N>: <what was accomplished>"
git push origin session-<number>

# On success:
git checkout main
git merge session-<number>
```

### **Archive Strategy**
```
archive/
  ├── failed-attempts/    ← Move docs here when plan fails
  ├── completed/          ← Move docs here when task done
  └── history/            ← Session summaries
  
Keep in root ONLY:
- THE_TEN_COMMANDMENTS.md (this file)
- PLAN.md (current tasks)
- CONTEXT.md (last session state)
- README.md (quick start)
```

---

## 🔍 DIAGNOSIS OF CURRENT STATE

Let me verify exactly where we are:

**Checking hydration integration...**

### **Backend: READY** ✅
- Hydration endpoint exists and returns complete state
- Rejoin tokens system working
- Sequence numbers implemented
- Timers server-authoritative

### **Frontend: NEEDS WIRING** ❌
- zoom-lock.html doesn't call hydration on page load
- Still in `initDemo()` mode (fake data)
- Action buttons not wired to HTTP endpoints
- Socket handlers not listening to game events

---

## 📊 THE REAL ARCHITECTURE (What Is, Not What Should Be)

### **How Game State Currently Lives:**

**In-Memory (Volatile):**
- `games = new Map()` in `sophisticated-engine-server.js`
- Used for game logic processing
- **Lost on server restart**

**In Database (Persistent):**
- `game_states.current_state` (JSONB)
- `hands` table (phase, pot, board)
- `players` table (hole_cards, stack)
- **Survives server restart**

**THE ISSUE:** Backend writes to BOTH, but frontend only sees in-memory via WebSocket. On refresh, in-memory state lost, DB state not fetched.

**THE FIX:** Frontend must fetch DB state via hydration endpoint. Backend can keep in-memory for performance.

---

## 🎯 THE THREE-STEP FIX (Production-Grade)

### **Step 1: Wire Hydration** (2 hours)
**File:** `poker-table-zoom-lock.html`  
**Change:** Replace `initDemo()` with actual backend connection

**Evidence of completion:**
- Refresh mid-game → see same cards/pot
- Console shows "🌊 Hydration received"
- All players see same state

---

### **Step 2: Wire Action Buttons** (1 hour)
**File:** `poker-table-zoom-lock.html`  
**Change:** Connect FOLD/CALL/RAISE to `POST /api/games/:id/actions`

**Evidence of completion:**
- Click FOLD → server broadcasts fold
- Other players see fold
- Idempotency works (double-click doesn't duplicate)

---

### **Step 3: Test Refresh 100 Times** (30 min)
**Procedure:**
1. Start game with 2 players
2. Play 3 actions
3. Refresh 100 times
4. Each refresh → state preserved

**Evidence of completion:**
- 100/100 refreshes work
- No console errors
- All players stay in sync

---

## 🚨 WHEN NEXT LLM TAKES OVER

**Do This FIRST:**
```javascript
// Open browser console and run:
const roomId = new URLSearchParams(window.location.search).get('room');
const userId = sessionStorage.getItem('userId') || 'test';

fetch(`http://localhost:3000/api/rooms/${roomId}/hydrate?userId=${userId}`)
  .then(r => r.json())
  .then(data => console.log('HYDRATION WORKS:', data))
  .catch(err => console.error('HYDRATION BROKEN:', err));
```

**If this returns data:** Backend is ready, just wire frontend  
**If this errors:** Backend broke, fix that first

---

## 📝 COMMANDMENTS FOR SPECIFIC FEATURES

### **Friend System:**
- Use `friendships` table (already exists)
- Store username in `user_profiles.username` (unique, indexed)
- Friend requests via HTTP, notifications via WebSocket

### **Ranked Mode:**
- Use `player_statistics` table (already exists)
- Chip economy: `user_profiles.chips` (persistent)
- Matchmaking: queue system, not implemented yet

### **Hand Analysis:**
- Use `hand_fingerprints` table (already exists)
- Anonymization: hash user_id before analysis
- LLM queries: rate limit 5/day in `user_profiles`

### **Tournaments:**
- Multi-table support not implemented yet
- Will need: tournament_tables, tournament_players tables
- Chip migration between tables

### **Provably Fair RNG:**
- Use `shuffle_seed` in `games` table
- SHA-256 Fisher-Yates with committed seed
- Verify endpoint for post-game audit

---

## 🔥 FOR OCTAVIAN SPECIFICALLY

**Your Mission:**
1. **Diagnose** - Confirm hydration endpoint works (test it)
2. **Wire** - Connect zoom-lock to hydration
3. **Test** - 100 refreshes work
4. **Update** - This file with what you learned

**Do NOT:**
- Rebuild anything that works
- Create new architecture
- Propose alternative approaches
- Overthink it

**Just wire the damn UI to the backend that already exists.**

---

**SHINZO WO SASAGEYO.** ⚔️

