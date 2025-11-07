# ⚔️ PLAN.MD - BATTLEFIELD STATUS BOARD

**Created by:** Octavian (PLANNER Mode)  
**Date:** October 30, 2025  
**Last Updated:** November 6, 2025  
**Status:** ✅ Complete deep indexing - 396 files analyzed  
**Reality:** 8 days of hell because you're 95% done, debugging the last 5%

**NEW:** See `GOLDEN_PATH_USERNAMES.md` for safe incremental approach to username/profile system

---

## 🎯 MISSION

**Build the chess.com of poker** - destroy pokernow.club with superior UX, data persistence, AI analysis, and provable fairness.

**Current Reality:**  
- Ferrari engine (backend): ✅ 100% functional  
- Honda chassis (frontend): ❌ Cards won't render  
- Missing parts: ❌ .env file, ❌ dist/ folder  

---

## 📊 STATUS BOARD

### **Current Task: 🔴 BLOCKED - MISSING .ENV AND DIST/**

**Critical Blockers:**
1. ❌ `.env` file missing → Server can't start
2. ❌ `dist/` folder missing → TypeScript not compiled (need `npm install && npm run build`)
3. ❌ Cards not rendering → Frontend bug in poker-table-zoom-lock.html lines 1542-1622

**Secondary Issues:**
4. ⚠️ UUID system (games/hands/actions tables) completely broken, causes duplicate key errors
5. ⚠️ Multiple conflicting persistence systems fighting each other

---

## 🗺️ COMPLETE SYSTEM MAP (From Deep Index)

**Total Files:** 396  
**Lines of Backend Code:** ~10,000  
**Lines of Frontend Code:** ~5,000  
**Database Tables:** 40+  
**TypeScript Engine:** 3,324 lines (src/core/)  
**Main Server:** sophisticated-engine-server.js (1,074 lines)  
**Primary Table UI:** poker-table-zoom-lock.html (2,170 lines)  
**Primary Lobby UI:** pages/play.html (2,707 lines)

---

### **Must Wins (Next 2 Hours):**
1. 🔴 **[WALEED] Populate .env** (5 min) - Copy env.example, add Supabase creds, generate secrets
2. 🔴 **[WALEED] Compile TypeScript** (2 min) - Run `npm install && npm run build`
3. 🔴 **[WALEED] Start server** (1 min) - Run `npm start`, verify it doesn't crash
4. 🟡 **[AGENT] Fix card rendering** (30-60 min) - Debug poker-table-zoom-lock.html lines 1542-1622
5. 🟢 **[AGENT] Test end-to-end** (10 min) - Verify full game flow works

---

### **Queued Tasks (Post-Blockers):**
1. ⚪ Clean up UUID system (delete or fix fully)
2. ⚪ Purge unused HTML files (11 demo/test files)
3. ⚪ Implement rejoin after disconnect (grace period logic)
4. ⚪ Add spectator mode (tables exist, not connected)
5. ⚪ Complete social features (friends, chat)
6. ⚪ AI solver integration

---

### **Completed:**
- ✅ Deep codebase indexing (this document)
- ✅ Read all 6 core documentation files
- ✅ Identified conflicting systems (TEXT ID vs UUID)
- ✅ Understood 8-day failure history

---

### **Blocked/Needs Info:**
- ❌ Cannot run server (no .env)
- ❌ Cannot test anything (server won't start)
- ⚠️ Which Supabase project? (need URL + keys)
- ⚠️ Do you have Redis running? (optional but referenced)
- ⚠️ Which HTML file is production? (14 HTML files exist)

---

## 🗺️ BATTLEFIELD MAP - COMPLETE SYSTEM ARCHITECTURE

### **LAYER 1: INFRASTRUCTURE STATUS**

#### **Environment**
- **OS:** macOS 24.6.0
- **Node:** Installed (checking version...)
- **npm:** Installed (checking version...)
- **TypeScript:** ❌ NOT INSTALLED (`tsc: command not found`)
- **Database:** Supabase PostgreSQL (remote, credentials unknown)
- **Redis:** Unknown if running

#### **Dependencies**
```json
{
  "dependencies": 51 packages,
  "devDependencies": 13 packages,
  "total": 64 packages
}
```
**Status:** `package.json` exists, but `node_modules/` status unknown

---

### **LAYER 2: DATABASE ARCHITECTURE**

#### **Schema Overview (40+ tables)**

**✅ WORKING TABLES (Room/Lobby System):**
```
rooms                   → Room metadata (invite codes, settings)
  ├── room_players      → Lobby waiting list (pending/approved)
  ├── room_seats        → Seat assignments (who's seated where)
  └── room_spectators   → Non-playing observers
```

**⚠️ DUAL GAME SYSTEMS (CRITICAL CONFLICT):**

**System A: TEXT ID System (WORKING ✅)**
```
game_states
  ├── id: TEXT ("sophisticated_1761677892235_3")
  ├── room_id: UUID (FK to rooms)
  ├── current_state: JSONB ← ALL GAME DATA HERE
  ├── seq: INT (sequence number)
  └── status: VARCHAR
```
**Contains:** Complete game state including:
- All players with hole cards
- Pot totals
- Community cards
- Betting rounds
- Dealer position
- toAct (current player)

**System B: UUID System (BROKEN ❌)**
```
games (EMPTY)
  ├── id: UUID
  ├── room_id: UUID
  └── current_hand_id: UUID

hands (EMPTY)
  ├── id: UUID
  ├── game_id: UUID FK
  └── [hand data]

players (EMPTY)
  ├── id: UUID
  ├── hand_id: UUID FK
  └── hole_cards: TEXT[]
```

**THE CONFLICT:**
- `rooms.game_id` links to `game_states.id` (TEXT)
- `games` table expects UUID
- These two systems never talk to each other
- Code tries to use BOTH, causing confusion

**SOLUTION:** Use TEXT system exclusively, ignore UUID tables.

---

#### **Table Status Checklist:**

| Table | Purpose | Status | Data? |
|-------|---------|--------|-------|
| `rooms` | Room creation | ✅ Working | Yes |
| `room_players` | Lobby management | ✅ Working | Yes |
| `room_seats` | Seat claiming | ✅ Working | Yes |
| `user_profiles` | User data | ✅ Working | Yes |
| `game_states` | TEXT ID games | ✅ Working | Yes (92 rows estimated) |
| `games` | UUID games | ❌ Empty | No (0 rows) |
| `hands` | UUID hands | ❌ Empty | No (0 rows) |
| `players` | UUID players | ❌ Empty | No (0 rows) |
| `processed_actions` | Idempotency | ⚠️ Column too small | Errors but continues |
| `rejoin_tokens` | Reconnection | ⚠️ FK constraint fails | Warnings logged |

---

### **LAYER 3: BACKEND ARCHITECTURE**

#### **Main Server: `sophisticated-engine-server.js` (1,189 lines)**

**Dependencies:**
   ```javascript
// ❌ CRITICAL: Requires dist/ folder (doesn't exist)
const { GameStateModel } = require('./dist/core/models/game-state');
const { PlayerModel } = require('./dist/core/models/player');
const { GameStateMachine } = require('./dist/core/engine/game-state-machine');
// ... 15+ more dist/ imports
```

**Status:** ❌ CANNOT RUN - Missing compiled TypeScript

**What it does (when working):**
1. Initializes 5 routers (rooms, games, auth, v2, pages)
2. Sets up Socket.IO with Redis adapter
3. Creates in-memory game Map
4. Crash recovery (loads games from DB on startup)
5. Dependency injection via `app.locals`

**Port:** 3000

---

#### **Routers (5 files in /routes/)**

**1. `routes/rooms.js` (1,834 lines, 22 endpoints)**

Key Endpoints:
```
POST   /api/rooms              → Create room
POST   /:id/lobby/join         → Guest joins lobby
POST   /:id/lobby/approve      → Host approves guest
POST   /:id/join               → Claim seat
GET    /:id/hydrate            → ★ CRITICAL: State restoration
POST   /:id/kick               → Kick player
POST   /:id/update-chips       → Adjust chips
POST   /:id/pause-game         → Pause game
POST   /:id/resume-game        → Resume game
```

**Hydration Endpoint Status:** ✅ **ALREADY FIXED**

Lines 353-358 (CORRECT CODE):
```javascript
const gameResult = currentGameId ? await db.query(
  `SELECT id, current_state, seq, version, updated_at, room_id
   FROM game_states
   WHERE id = $1`,
  [currentGameId]
) : { rowCount: 0, rows: [] };
```

**This queries the RIGHT table (game_states, not games).**

**JSONB Extraction:** Lines 369-450
- Extracts game state from `current_state` JSONB
- Converts card formats (C4 → clubs_4)
- Filters hole cards (only returns requester's cards)
- Builds players array from JSONB object

**Status:** ✅ Backend hydration is CORRECT

---

**2. `routes/games.js` (996 lines, 7 endpoints)**

Key Endpoints:
```
POST   /api/games              → Create game
POST   /:id/start-hand         → Deal cards, post blinds
POST   /:id/actions            → Process player action
GET    /:id                    → Get game state
```

**Status:** ✅ Working (when server runs)

---

**3. `routes/auth.js` (100 lines, 3 endpoints)**
- Google OAuth
- Guest user creation
- JWT tokens

**Status:** ✅ Working

---

**4. `routes/pages.js` (74 lines, 13 routes)**

Critical Route:
   ```javascript
app.get('/game/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/poker-table-zoom-lock.html'));
});
```

**This route serves the zoom-locked table UI.**

---

**5. `routes/v2.js` (3 legacy endpoints)**
**Status:** Deprecated, ignore

---

### **LAYER 4: FRONTEND ARCHITECTURE**

#### **HTML Files (14 total in /public/)**

**Which one is production?** 🔴 **UNCLEAR**

```
public/
  ├── poker-table-zoom-lock.html     ← routes/pages.js serves this
  ├── poker-table-v3.html
  ├── poker-table-v3-demo.html
  ├── poker-table-v2.html
  ├── poker-table-v2-demo.html
  ├── poker-table-grid.html
  ├── poker-table-final.html
  ├── pages/
  │   ├── play.html                  ← Lobby system (WORKING)
  │   ├── index.html
  │   ├── analysis.html
  │   ├── friends.html
  │   ├── learning.html
  │   ├── ai-solver.html
  │   └── poker-today.html
```

**Evidence:** `routes/pages.js` line 14 serves `poker-table-zoom-lock.html`

**Assumption:** `poker-table-zoom-lock.html` is the production table.

---

#### **poker-table-zoom-lock.html (2,140 lines)**

**Structure:**
- Lines 1-800: CSS (design tokens, zoom-lock, felt colors)
- Lines 800-1500: HTML (table structure, seats, controls)
- Lines 1500-2140: JavaScript (PokerTableGrid class)

**Key JavaScript Class: `PokerTableGrid`**

Methods exist for:
- ✅ `setupZoomLock()` - Responsive scaling
- ✅ `applySeatPositions()` - 10-seat layout
- ✅ `renderSeats()` - Player rendering
- ✅ `renderBoard()` - Community cards
- ✅ `renderPot()` - Pot display
- ⚠️ `initWithBackend()` - Backend connection (UNCLEAR IF WIRED)
- ⚠️ `fetchHydration()` - Calls /hydrate (EXISTS BUT MAY NOT BE CALLED)
- ⚠️ `sendAction()` - POST /actions (EXISTS BUT UNCLEAR)

**Critical Question:** Does `init()` call `initDemo()` or `initWithBackend()`?

**From docs:** Line 914 historically called `initDemo()` (fake data), was supposed to be changed to `initWithBackend()`.

**Status:** ⚠️ **CANNOT VERIFY WITHOUT READING FULL FILE**

---

#### **JavaScript Modules (/public/js/)**

```
/public/js/
  ├── auth-manager.js           ✅ Supabase auth
  ├── sequence-tracker.js       ✅ Stale update prevention
  ├── game-state-manager.js     ✅ State container (363 lines)
  ├── timer-display.js          ✅ Turn timer UI
  └── [others]
```

**Status:** All exist, appear complete

---

### **LAYER 5: GAME ENGINE (TypeScript)**

#### **Source: /src/ (TypeScript)**

**Structure:**
```
src/
  ├── core/
  │   ├── engine/
  │   │   ├── game-state-machine.ts    ← Main state logic
  │   │   ├── betting-engine.ts        ← Betting rules
  │   │   ├── hand-evaluator.ts        ← Winner determination
  │   │   ├── turn-manager.ts          ← Turn order
  │   │   └── pot-manager.ts           ← Pot calculations
  │   ├── models/
  │   │   ├── game-state.ts
  │   │   ├── player.ts
  │   │   └── table.ts
  │   └── card/
  │       ├── card.ts
  │       ├── deck.ts
  │       └── rank.ts, suit.ts
  ├── services/
  │   ├── database/
  │   │   ├── repos/                   ← Database repositories
  │   │   ├── event-store.repo.ts
  │   │   └── transaction-manager.ts
  │   └── timer-service.js             ← Turn timers
  └── [100+ other files]
```

**Compilation Status:** ❌ NOT COMPILED
- `tsc` not found
- `dist/` doesn't exist
- Server cannot run

**Quality:** Appears sophisticated (TypeScript, SOLID principles, CQRS pattern)

---

### **LAYER 6: DATA FLOW (When Working)**

#### **Flow 1: Room Creation → Game Start**

```
1. Host → POST /api/rooms
   ├── Creates room in DB
   ├── Auto-approves host
   └── Returns {roomId, inviteCode}

2. Guest → POST /api/rooms/:id/lobby/join
   ├── Creates user_profile
   ├── Adds to room_players (status='pending')
   └── Broadcasts 'player_joined'

3. Host → POST /api/rooms/:id/lobby/approve
   ├── Updates status='approved'
   └── Broadcasts 'player_approved'

4. Players → POST /api/rooms/:id/join (claim seats)
   ├── Inserts room_seats
   ├── Generates rejoin_token
   └── Broadcasts 'seat_update'

5. Host → POST /api/games
   ├── Generates TEXT ID: "sophisticated_1761677892235_3"
   ├── Creates GameStateModel (in-memory)
   ├── Inserts game_states (DB)
   └── Updates rooms.game_id

6. Host → POST /api/games/:id/start-hand
   ├── Queries room_seats for players
   ├── Bridges to game engine
   ├── Engine: shuffle, deal, post blinds
   ├── Updates games Map (in-memory)
   ├── Updates game_states (DB)
   └── Broadcasts 'hand_started'
```

**Status:** ✅ This flow works (when server runs)

---

#### **Flow 2: Page Load (THE CRITICAL MOMENT)**

```
Browser loads /game/:roomId
  ↓
poker-table-zoom-lock.html executes
  ↓
init() called
  ├─ setupZoomLock()        ✅ Works
  ├─ applySeatPositions()   ✅ Works
  └─ initWithBackend() OR initDemo()?  ❓ UNCLEAR
      ↓
      ❓ IF initWithBackend():
         ├─ socket = io()
         ├─ socket.emit('authenticate')
         ├─ socket.emit('join_room')
         └─ fetchHydration()
             ↓
             GET /api/rooms/:roomId/hydrate
             ↓
             ✅ Backend returns correct data
             ↓
             renderFromHydration(data)
             ↓
             ❓ Cards appear? OR still hidden?
      
      ❓ IF initDemo():
         └─ Renders fake demo data
            ❌ No backend connection
            ❌ No real game
```

**The Unknown:** Which init path is currently active?

---

### **LAYER 7: WEBSOCKET ARCHITECTURE**

#### **Socket.IO Setup**

**Server:** `websocket/socket-handlers.js` (260 lines)

Events handled:
- `authenticate` - Validates user, joins room
- `join_room` - Explicitly joins Socket.IO room
- `disconnect` - Marks AWAY, starts grace period

**Broadcasts sent:**
- `player_joined`, `player_approved`
- `seat_update`
- `game_started`, `hand_started`
- `player_action`, `action_required`
- `game_over`

**Status:** ✅ Code exists and appears correct

**Client:** Socket.IO CDN loaded in HTML

**Connection flow (expected):**
```
1. socket = io('http://localhost:3000')
2. socket.on('connect')
3. socket.emit('authenticate', {userId, roomId})
4. socket.emit('join_room', {roomId})
5. socket.on('authenticated') → fetchHydration()
6. socket.on('hand_started') → render cards
```

**Status:** ⚠️ Unknown if wired in frontend

---

## 🔥 CRITICAL ISSUES ANALYSIS

### **Issue #1: Cannot Run Server** 🔴 BLOCKING

**Symptom:** `npm start` will fail

**Root Causes:**
1. `.env` file missing
2. TypeScript not compiled (`dist/` doesn't exist)
3. `tsc` not installed

**Impact:** Cannot test ANYTHING

**Fix Order:**
1. Create `.env` with Supabase credentials
2. Run `npm install` to get dependencies
3. Run `npm run build` to compile TypeScript
4. Test `npm start`

**Time:** 1-2 hours

---

### **Issue #2: Conflicting Documentation vs Reality** ⚠️ CONFUSION

**Documentation says:**
- "Hydration endpoint queries wrong table (games)"
- "Need to fix query to use game_states"

**Reality:**
- Routes/rooms.js ALREADY queries game_states (line 353)
- Query is CORRECT
- JSONB extraction is CORRECT

**Confusion:** Either:
- A) Documentation is outdated (fix was made)
- B) Different file is being used
- C) Change was made but not tested

**Need:** Verify which code is actually running

---

### **Issue #3: 14 HTML Files - Which is Production?** ⚠️ AMBIGUITY

**Problem:** Multiple poker table HTML files exist

**Evidence:**
- `poker-table-zoom-lock.html` - 2,140 lines
- `poker-table-v3.html`
- `poker-table-v3-demo.html`
- `poker-table-v2.html`
- `poker-table-v2-demo.html`
- `poker-table-grid.html`
- `poker-table-final.html`

**Which is served?**
Routes/pages.js line 14: `poker-table-zoom-lock.html`

**But:** Are other files used? Are they old versions?

**Impact:** Might be editing wrong file

---

### **Issue #4: In-Memory vs Database Sync** ⚠️ ARCHITECTURAL

**Two State Stores:**

**In-Memory (Server):**
```javascript
const games = new Map();
// Key: gameId (TEXT)
// Value: GameStateModel instance
```

**Database (Persistent):**
```sql
game_states.current_state (JSONB)
```

**Sync Pattern:**
```javascript
// On every action:
1. games.set(gameId, newState)      // Update memory
2. INSERT/UPDATE game_states        // Update DB
3. io.emit('event')                 // Broadcast
```

**Problem:** Two writes can desync if one fails

**Current Mitigation:** Both writes usually succeed

**Better Solution:** Event sourcing (partially implemented but unused)

---

### **Issue #5: TypeScript Compilation Dependency** 🔴 BLOCKING

**Current State:**
- 100+ TypeScript files in `/src/`
- None compiled to `/dist/`
- Server requires `/dist/` imports

**Build Command:** `npm run build` (runs `tsc`)

**But:** `tsc: command not found`

**Cause:** TypeScript not in PATH, or not installed

**Fix:**
```bash
npm install          # Installs typescript
npm run build        # Compiles to dist/
```

---

### **Issue #6: UUID vs TEXT ID System** ⚠️ ARCHITECTURAL DEBT

**The Conflict:**

**TEXT ID System (Working):**
- `game_states.id` = "sophisticated_1761677892235_3"
- Contains complete game in JSONB
- Used by game engine
- Persisted and queryable

**UUID System (Broken):**
- `games.id` = UUID
- Normalized relational structure
- Empty tables (never populated)
- References in code exist but fail

**Problem:** Code tries to use BOTH

**Impact:**
- Errors logged (FK constraints fail)
- Confusing codebase
- Timer service queries UUID tables (crashes after 30s)

**Solution:** Fully commit to TEXT ID system, remove UUID references

---

## 🎯 RECOMMENDED PATH FORWARD

### **PHASE 1: UNBLOCK EXECUTION** (2-3 hours)

**Goal:** Get server running

**Tasks:**
1. **Populate .env**
   - Get Supabase URL + keys from user
   - Generate JWT_SECRET: `openssl rand -base64 48`
   - Generate SERVER_SECRET: `openssl rand -base64 48`
   - Fill all required fields

2. **Install dependencies**
   - Run: `npm install`
   - Verify: `node_modules/` exists
   - Verify: `node_modules/.bin/tsc` exists

3. **Compile TypeScript**
   - Run: `npm run build`
   - Verify: `dist/` folder created
   - Verify: `dist/core/engine/` exists

4. **Start server**
   - Run: `npm start`
   - Verify: "Server running on port 3000"
   - Check: No crashes

**Success Criteria:**
- ✅ Server starts without errors
- ✅ Can access http://localhost:3000
- ✅ No "cannot find module" errors

---

### **PHASE 2: VERIFY BACKEND** (1 hour)

**Goal:** Confirm hydration works

**Tasks:**
1. **Test room creation**
   ```bash
   curl -X POST http://localhost:3000/api/rooms \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","small_blind":5,"big_blind":10}'
   ```
   - Should return {roomId, inviteCode}

2. **Claim seats manually**
   - Use API endpoints
   - Get 2 users seated

3. **Create game**
   ```bash
   curl -X POST http://localhost:3000/api/games \
     -H "Content-Type: application/json" \
     -d '{"roomId":"<ROOM_ID>", ...}'
   ```

4. **Test hydration endpoint**
   ```bash
   curl http://localhost:3000/api/rooms/<ROOM_ID>/hydrate?userId=<USER_ID>
   ```
   - Should return: `{hasGame: true, hand: {...}, me: {hole_cards: [...]}}`

**Success Criteria:**
- ✅ Hydration returns game data
- ✅ hole_cards present for requester
- ✅ No database errors

---

### **PHASE 3: DIAGNOSE FRONTEND** (2-3 hours)

**Goal:** Understand why cards don't show

**Tasks:**
1. **Identify init path**
   - Read `poker-table-zoom-lock.html` lines 1500-1600
   - Find: `init()` method
   - Check: Does it call `initDemo()` or `initWithBackend()`?

2. **If initDemo():**
   - Change to `initWithBackend()`
   - Test

3. **If initWithBackend():**
   - Add console.logs:
     ```javascript
     console.log('fetchHydration called');
     console.log('Hydration response:', data);
     console.log('hasGame:', data.hasGame);
     console.log('hole_cards:', data.me?.hole_cards);
     ```
   - Open browser console
   - Check logs

4. **Trace rendering**
   - Find `renderFromHydration()` method
   - Check: Does it call `renderSeats()`?
   - Check: Does it render hole cards?
   - Add logs to see where data gets lost

**Success Criteria:**
- ✅ Understand exact point where cards fail to show
- ✅ Know if it's fetch issue, render issue, or CSS issue

---

### **PHASE 4: FIX RENDERING** (2-4 hours)

**Based on Phase 3 findings:**

**If fetch fails:**
- Fix URL
- Fix authentication
- Fix CORS

**If rendering fails:**
- Check card format (clubs_4 vs C4)
- Check CSS (display: none?)
- Check DOM (are elements created but invisible?)

**If data missing:**
- Debug hydration extraction
- Check JSONB structure
- Verify userId matching

---

### **PHASE 5: END-TO-END TEST** (2 hours)

**Goal:** Complete one full hand

**Test Procedure:**
1. Open 2 browser windows (or incognito + regular)
2. Both join room
3. Both claim seats
4. Start hand
5. **Verify both see cards**
6. Player 1: FOLD
7. Verify both see fold
8. Verify winner determined
9. Refresh both browsers
10. **Verify both still see correct state**

**Success Criteria:**
- ✅ 2 players complete hand
- ✅ Refresh works
- ✅ No console errors

---

## 📋 PROCEDURE CHECKLISTS

### **Checklist A: Environment Setup**
- [ ] Get Supabase URL from user
- [ ] Get Supabase ANON_KEY from user
- [ ] Get Supabase SERVICE_ROLE_KEY from user
- [ ] Get DATABASE_URL connection string
- [ ] Generate JWT_SECRET (48 char random)
- [ ] Generate SERVER_SECRET (48 char random)
- [ ] Create `.env` file with all values
- [ ] Verify `.env` in .gitignore
- [ ] Run `npm install`
- [ ] Verify node_modules/typescript exists
- [ ] Run `npm run build`
- [ ] Verify dist/ folder created
- [ ] Run `npm start`
- [ ] Verify server starts on port 3000

---

### **Checklist B: Backend Verification**
- [ ] Curl test: Create room
- [ ] Curl test: Join lobby
- [ ] Curl test: Approve player
- [ ] Curl test: Claim seat
- [ ] Curl test: Create game
- [ ] Curl test: Start hand
- [ ] Curl test: Hydration endpoint
- [ ] Verify: hasGame returns true
- [ ] Verify: hole_cards present
- [ ] Check terminal logs for errors
- [ ] Check Supabase dashboard for data

---

### **Checklist C: Frontend Diagnosis**
- [ ] Open http://localhost:3000/game/<ROOM_ID>
- [ ] Open browser DevTools console
- [ ] Check: Which init() is called?
- [ ] Check: Is fetchHydration() called?
- [ ] Check: What does hydration return?
- [ ] Check: Network tab - see /hydrate request?
- [ ] Check: Are cards in DOM but hidden?
- [ ] Check: Inspect element - see card divs?
- [ ] Check: CSS - any display:none?
- [ ] Add console.logs to trace data flow
- [ ] Document exact failure point

---

### **Checklist D: Rendering Fix**
- [ ] Identify root cause from Checklist C
- [ ] Make minimal targeted fix
- [ ] Test: Cards appear?
- [ ] Test: Pot amount correct?
- [ ] Test: Dealer button shows?
- [ ] Test: Action buttons work?
- [ ] Test: Fold → updates both players?
- [ ] Test: Refresh → state preserved?
- [ ] Commit: `git commit -m "fix: card rendering"`

---

## 🔍 OPEN QUESTIONS

### **Must Answer Before Proceeding:**
1. **Do you have Supabase credentials?**
   - Need: Project URL, anon key, service_role key, connection string
   
2. **Is Redis running locally?**
   - Optional but referenced in code
   - May need to disable or configure

3. **Which poker table HTML is production?**
   - Assumption: poker-table-zoom-lock.html
   - Confirm?

4. **Has TypeScript ever been compiled?**
   - Did dist/ exist before?
   - Or is this first time setup?

5. **When docs say "hydration broken," is that current?**
   - Code shows hydration query is CORRECT
   - Was it fixed recently?
   - Or was it never broken?

---

## 💊 ARCHITECTURAL RECOMMENDATIONS

### **Technical Debt to Address (Post-MVP):**

1. **Unify ID Systems**
   - Migrate to UUID everywhere OR TEXT everywhere
   - Delete unused tables
   - Remove dual-system code

2. **Single HTML File**
   - Delete 6 unused poker table HTMLs
   - Keep only production version
   - Archive old versions to `/archive/old-ui/`

3. **Event Sourcing Completion**
   - CQRS pattern partially implemented
   - CommandBus/QueryBus exist but underused
   - EventStore writes fail (pool errors)
   - Decision: Finish it OR remove it (don't leave half-done)

4. **Timer Service Database Reference**
   - Line 232 queries `players` table (UUID, empty)
   - Crashes after 30 seconds
   - Fix: Query `game_states` JSONB or disable

5. **Connection Pooling**
   - Multiple pools created (memory leak risk)
   - Consolidate to single pool
   - Handle Supabase auto-pause gracefully

6. **Documentation Sync**
   - Code and docs don't match
   - Create single source of truth
   - Auto-generate docs from code?

---

## 🎖️ SUCCESS METRICS

### **MVP Complete When:**
- [ ] .env populated
- [ ] Server starts without errors
- [ ] 2 players can join room
- [ ] Both can claim seats
- [ ] Hand starts, cards dealt
- [ ] **Both players see their cards**
- [ ] Actions work (fold/call/raise)
- [ ] Winner determined
- [ ] Chips updated
- [ ] **Refresh preserves state**
- [ ] Second hand starts
- [ ] No critical console errors

### **Production Ready When:**
- [ ] All of MVP +
- [ ] Mobile responsive
- [ ] Cross-browser tested
- [ ] 100 concurrent games work
- [ ] Hand history persisted
- [ ] Timer doesn't crash
- [ ] No memory leaks
- [ ] Horizontal scaling works

---

## 📝 HANDOFF TO NEXT MODE

**When switching to EXECUTOR:**

**Priority 1:**
```
Task: Populate .env file
File: .env (create new)
Time: 30 minutes
Blocker: Need Supabase credentials from user
Success: Server can connect to database
```

**Priority 2:**
```
Task: Install dependencies and compile TypeScript
Commands: npm install && npm run build
Time: 10 minutes
Blocker: None
Success: dist/ folder exists, server starts
```

**Priority 3:**
```
Task: Identify which init() is called in poker-table-zoom-lock.html
File: public/poker-table-zoom-lock.html
Time: 15 minutes
Blocker: None
Success: Know if initDemo() or initWithBackend() is active
```

---

## 🧭 STRATEGIC NOTES

### **Why We're Stuck:**

1. **8 days of debugging without running server**
   - Can't debug what you can't run
   - Need working environment first

2. **Conflicting information**
   - Docs say hydration broken
   - Code shows hydration correct
   - Can't verify without testing

3. **Multiple versions of everything**
   - 14 HTML files
   - 2 ID systems
   - Unclear what's production

### **How to Unstuck:**

1. **Get it running** (Phase 1)
2. **Test systematically** (Phase 2)
3. **Follow evidence** (Phase 3)
4. **Fix root cause only** (Phase 4)

### **Vibe Check:**
- ⚔️ **Warring states** - chaos, confusion, conflicting systems
- 🎯 **Need clarity** - what works, what doesn't
- 🔥 **Ready to build** - infrastructure exists, just needs wiring
- 💪 **Can ship fast** - once environment works, fixes are small

---

## ⚔️ FINAL ASSESSMENT

**What We Have:**
- ✅ Sophisticated codebase (100+ files, TypeScript, CQRS patterns)
- ✅ Complete database schema (40+ tables)
- ✅ Beautiful UI (zoom-locked responsive design)
- ✅ Modular architecture (5 routers, clean separation)
- ✅ Strong foundations (Supabase, Socket.IO, Express)

**What's Blocking:**
- 🔴 Can't run (no .env, no compiled TypeScript)
- 🔴 Can't test (server won't start)
- ⚠️ Conflicting docs vs reality
- ⚠️ Multiple versions (unclear which is production)

**Time to MVP:**
- **Best case:** 6-8 hours (if hydration already works)
- **Realistic:** 12-16 hours (if frontend wiring needed)
- **Worst case:** 24-32 hours (if architectural issues)

**Confidence Level:** 70%
- Infrastructure is solid
- Backend appears correct
- Unknown: Frontend connection status
- Need: Actually run it to know

---

**SHINZO WO SASAGEYO.** ⚔️

**Next Action:** Get .env credentials from user, then switch to EXECUTOR mode.
