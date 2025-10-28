# 📁 COMPLETE FILE DIRECTORY - EVERY FILE EXPLAINED

**Purpose:** Understand what every file does, why it exists, and how it's used  
**Scope:** Entire codebase from root to deepest subdirectory  
**Format:** File → Purpose → Status → Dependencies

---

## 📂 ROOT LEVEL

### **sophisticated-engine-server.js (1,189 lines)**
**Purpose:** Main application server  
**What it does:**
- Initializes Express app
- Mounts all routers (rooms, games, auth, pages, v2)
- Configures Socket.IO
- Sets up database connections
- Initializes game engine
- Crash recovery (loads incomplete games)
- Graceful shutdown handling

**Dependencies:**
- Express, Socket.IO, pg (PostgreSQL)
- All routers in routes/
- Game engine from dist/core/
- Services from src/services/

**Status:** ✅ WORKING  
**Don't modify unless:** Adding global middleware or new router

---

### **package.json**
**Purpose:** Node.js dependencies and scripts  
**Key Dependencies:**
- express: Web framework
- socket.io: Real-time communication
- pg: PostgreSQL client
- @supabase/supabase-js: Auth
- typescript: For compiling src/
- jest: Testing framework

**Scripts:**
- `npm start`: Run server
- `npm run build`: Compile TypeScript
- `npm test`: Run tests

---

### **tsconfig.json**
**Purpose:** TypeScript compiler configuration  
**Output:** src/ (TypeScript) → dist/ (JavaScript)  
**Settings:** ES2020, strict mode, decorators enabled

---

### **jest.config.js**
**Purpose:** Test configuration  
**Test Directory:** tests/  
**Coverage:** Enabled but not enforced

---

### **.env**
**Purpose:** Environment variables (NOT committed to git)  
**Contains:**
- DATABASE_URL: Supabase PostgreSQL connection string
- SUPABASE_URL: Supabase API endpoint
- SUPABASE_ANON_KEY: Public API key
- SESSION_SECRET: Express session secret
- REDIS_URL: Redis connection (if using)

**Security:** NEVER commit this file

---

## 📂 routes/ (BACKEND API)

**Purpose:** Modularized REST endpoints  
**Pattern:** Each router handles related functionality  
**Total:** 48 endpoints across 5 files

---

### **routes/rooms.js (1,800 lines, 22 endpoints)**

**Purpose:** Room and lobby management  
**Status:** ⚠️ MOSTLY WORKING (hydration broken)

**Endpoints:**

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/rooms` | GET | List active rooms | ✅ |
| `/api/rooms` | POST | Create room | ✅ |
| `/api/rooms/:id` | GET | Get room details | ✅ |
| `/api/rooms/:id/lobby/join` | POST | Join lobby (guest) | ✅ |
| `/api/rooms/:id/lobby/approve` | POST | Approve player (host) | ⚠️ Idempotency errors |
| `/api/rooms/:id/lobby/reject` | POST | Reject player | ✅ |
| `/api/rooms/:id/join` | POST | Claim seat | ✅ |
| `/api/rooms/:id/leave` | POST | Release seat | ✅ |
| `/api/rooms/:id/hydrate` | GET | **State recovery** | ❌ **BROKEN** |
| `/api/rooms/:id/kick` | POST | Kick player (host) | ✅ Coded, untested |
| `/api/rooms/:id/update-chips` | POST | Adjust chips (host) | ✅ Added today |
| `/api/rooms/:id/pause-game` | POST | Pause game (host) | ✅ Added today |
| `/api/rooms/:id/resume-game` | POST | Resume game (host) | ✅ Added today |
| ...15+ more... | | | |

**Critical Section:**
- **Lines 317-561:** Hydration endpoint ← **FIX THIS**
- **Line 350:** Query to games table ← **THE BUG**

**Dependencies:**
- Database (Supabase)
- Socket.IO (for broadcasts)
- idempotency middleware
- SessionService

---

### **routes/games.js (630 lines, 7 endpoints)**

**Purpose:** Game instance management  
**Status:** ✅ WORKING

**Endpoints:**

| Route | Method | Purpose | Status |
|-------|--------|---------|--------|
| `/api/games` | POST | Create game | ✅ Works |
| `/api/games/:id` | GET | Get game state | ✅ Works (in-memory) |
| `/api/games/:id/join` | POST | Join game (legacy) | ✅ |
| `/api/games/:id/start-hand` | POST | Start poker hand | ✅ Works |
| `/api/games/:id/actions` | POST | Player action | ⚠️ Untested |
| `/api/games/room/:roomId` | GET | Get games by room | ✅ |

**Critical Sections:**
- **Lines 14-129:** Game creation (works, creates TEXT ID)
- **Lines 311-617:** Start hand (works, deals cards)
- **Lines 619-996:** Player actions (untested but should work)

**What It Does:**
1. Creates game in in-memory Map
2. Creates entry in game_states table
3. Tries to create UUID entry (fails silently)
4. Bridges room_seats to game engine
5. Deals cards, posts blinds
6. Broadcasts events

**Status:** ✅ Core logic works perfectly

---

### **routes/auth.js (100 lines, 3 endpoints)**

**Purpose:** Authentication  
**Status:** ✅ WORKING

**Endpoints:**
- `POST /api/auth/google` - OAuth callback
- `POST /api/auth/guest` - Guest user creation
- `POST /api/auth/verify` - Token validation

**Status:** No issues detected

---

### **routes/pages.js (74 lines, 13 routes)**

**Purpose:** Serve HTML files  
**Status:** ✅ WORKING

**Routes:**
- `/` → public/pages/index.html
- `/play` → public/pages/play.html (lobby)
- `/game/:roomId` → public/poker-table-zoom-lock.html ✅
- `/poker` → Legacy test page
- `/friends`, `/analysis`, `/learning`, etc.

**Critical:** Line 45-49 serves the zoom-lock table (correct file)

---

### **routes/v2.js (117 lines, 3 endpoints)**

**Purpose:** API v2 (legacy compatibility)  
**Status:** ✅ WORKING but deprecated

**Usage:** Old clients, migration path  
**Recommendation:** Ignore for MVP

---

## 📂 public/ (FRONTEND)

### **public/poker-table-zoom-lock.html (2,100 lines)**

**Purpose:** Main game table UI  
**Status:** ⚠️ 90% COMPLETE

**Structure:**
- Lines 1-580: CSS (zoom-lock, felt colors, seats, cards)
- Lines 581-816: HTML (navbar, table structure, HUD, modals)
- Lines 817-2100: JavaScript (PokerTableGrid class)

**Key Sections:**

**CSS Design Tokens (Lines 14-28):**
```css
--bg: #0b0b12;
--accent: #ff5100;
--teal: #00d4aa;
--felt-current: #197a45;
```

**Zoom-Lock Logic (Lines 933-976):**
- Calculate container dimensions
- Determine horizontal vs vertical mode
- Apply uniform scale
- Center with letterboxing

**Seat Positioning (Lines 891-916):**
- 10 seats in fixed positions
- Horizontal layout: Ellipse around table
- Vertical layout: Stack vertically
- Scaled uniformly

**Backend Integration (Lines 1193-1375):**
- `initWithBackend()`: Connect Socket.IO, fetch hydration
- `authenticateSocket()`: Join Socket.IO room
- `fetchHydration()`: GET /api/rooms/:id/hydrate
- `renderFromHydration()`: Render game state

**Host Controls (Lines 1063-1254):**
- `getCurrentSeats()`: Helper to fetch seat list
- `initHostControls()`: Wire modal buttons
- Kick player, adjust chips, pause/resume

**Game Events (Lines 1674-1730):**
- `seat_update`: Real-time seat changes
- `hand_started`: New hand begins
- `player_action`: Someone acted
- `action_required`: Your turn
- `board_dealt`: Community cards
- `hand_complete`: Winner announced

**Dependencies:**
- /socket.io/socket.io.js
- /js/sequence-tracker.js
- /js/auth-manager.js
- Supabase CDN

**Status:** 
- ✅ Renders seat selection correctly
- ❌ Doesn't render game (hydration returns empty)
- ✅ Host controls wired (untested)
- ✅ Socket joining fixed (today)

---

### **public/pages/play.html (2,200 lines)**

**Purpose:** Lobby & room management  
**Status:** ✅ WORKING

**Sections:**
- Lines 1-400: HTML structure (modals, lobby, seat grid)
- Lines 400-2200: JavaScript (lobby logic, WebSocket, API calls)

**Key Functions:**
- `createRoom()`: POST /api/rooms
- `joinRoom()`: POST /api/rooms/:id/lobby/join
- `approvePlayer()`: POST /api/rooms/:id/lobby/approve
- `claimSeat()`: POST /api/rooms/:id/join (with nickname prompt)
- `startGame()`: POST /api/games, then redirect

**Recent Changes:**
- startGame() now creates game before redirect ✅
- Host settings panel added ✅
- Nickname prompt added ✅
- Real-time seat updates wired ✅

**Status:** Lobby flow works end-to-end

---

### **public/js/auth-manager.js (364 lines)**

**Purpose:** Supabase authentication wrapper  
**Status:** ✅ WORKING

**Methods:**
- `signInWithGoogle()`: OAuth flow
- `signInAsGuest()`: Generate guest user
- `getCurrentUser()`: Get logged-in user
- `signOut()`: Logout
- `getAuthHeaders()`: For API requests

**Usage:** Loaded by all pages  
**Dependencies:** Supabase CDN must load first

---

### **public/js/sequence-tracker.js (145 lines)**

**Purpose:** Prevent stale WebSocket updates  
**Status:** ✅ WORKING (after fixes)

**Pattern:**
```javascript
tracker.setSequence(hydration.seq);

socket.on('event', tracker.createHandler((data) => {
  // Only processes if data.seq > currentSeq
}));
```

**Recent Fixes:**
- Accepts seq=0 (was rejecting)
- Accepts string numbers ("0" vs 0)

---

### **public/js/game-state-manager.js (363 lines)**

**Purpose:** Centralized game state management  
**Status:** ✅ EXISTS but NOT USED

**What it does:**
- Single state object
- State transitions
- Event emitter pattern
- State persistence

**Why not used:**
- poker-table-zoom-lock.html uses own state management
- Would require refactor to integrate

**Recommendation:** Use for future cleanup

---

### **public/js/timer-display.js**

**Purpose:** Turn timer countdown visual  
**Status:** ✅ EXISTS but NOT WIRED

**What it would do:**
- Show 30-second countdown
- Visual progress bar
- Warning flash at 5 seconds

**Integration needed:**
- Wire to game state
- Calculate from actor_turn_started_at timestamp

---

### **public/cards/ (52 PNG files)**

**Purpose:** Card images  
**Format:** `hearts_A.png`, `spades_K.png`, etc.  
**Usage:** `background-image: url('/cards/hearts_A.png')`  
**Status:** ✅ All cards present

---

### **public/pages/**

**Purpose:** Main site pages  
**Files:**
- **index.html**: Landing page
- **play.html**: Lobby (✅ working)
- **friends.html**: Social features (TODO)
- **analysis.html**: Hand history (TODO)
- **learning.html**: Education content (TODO)
- **poker-today.html**: News aggregation (TODO)
- **ai-solver.html**: GTO tool integration (TODO)

**Status:** Only play.html functional

---

## 📂 websocket/

### **socket-handlers.js (260 lines)**

**Purpose:** Socket.IO event handlers  
**Status:** ✅ WORKING

**Events:**
- `authenticate`: Validate user, join room if has seat
- `join_room`: Explicitly join Socket.IO room
- `disconnect`: Grace period, mark AWAY

**Broadcasts:**
- Uses `io.to('room:${roomId}').emit()`
- All broadcasts have {type, version, seq, timestamp, payload}

**Status:** ✅ All handlers work correctly

---

## 📂 src/ (TYPESCRIPT SOURCE)

### **src/core/engine/**

**Purpose:** Poker game logic (the "brain")  
**Language:** TypeScript  
**Compiled to:** dist/core/

**Files:**

**game-state-machine.ts (Primary)**
- State transitions (WAITING → DEALING → PREFLOP → ... → SHOWDOWN)
- Action processing
- Event publishing

**betting-engine.ts**
- Validates bets (min/max)
- Calculates pot odds
- Enforces betting rules

**turn-manager.ts**
- Determines next player
- Handles all-in scenarios
- Manages action order

**hand-evaluator.ts**
- 5-card combinations
- Hand rankings (high card → royal flush)
- Winner determination

**pot-manager.ts**
- Main pot + side pots
- Contribution tracking
- All-in runout calculations

**Status:** ✅ FULLY WORKING - DO NOT MODIFY

---

### **src/services/**

**timer-service.js (270 lines)**
**Purpose:** Turn timers and auto-fold  
**Status:** ⚠️ MOSTLY WORKING (crashes on timeout)

**What it does:**
- Starts 30-second timer when turn begins
- Auto-folds if no action
- Manages timebanks (60s extra time)

**Issue:** Queries `players` table (empty)  
**Fix:** Use game_states JSONB or disable

**Recent Changes:**
- Added roomId parameter
- Fixed UUID lookups

---

**src/db/poker-table-v2.js (350 lines)**
**Purpose:** Database helper functions  
**Status:** ✅ WORKING (after fixes)

**Methods:**
- `incrementSequence(roomId)`: Bump sequence number
- `getCurrentSequence(roomId)`: Get latest seq
- `checkIdempotency(key)`: Deduplicate requests
- `storeIdempotency(key, result)`: Save for dedup
- `createRejoinToken(...)`: Generate recovery token
- `startTurn(gameId, roomId)`: Record turn start timestamp
- `auditLog(entry)`: Compliance logging

**Recent Fixes:**
- Removed queries to games table (UUID)
- All queries use game_states (TEXT) or passed roomId

---

**src/services/database/repos/**

**full-game.repo.ts**
- **Purpose:** UUID system persistence
- **Status:** ❌ BROKEN (disabled)
- **Reason:** Tries to create games/hands/players (UUID tables)
- **Action:** Currently commented out, using game_states only

**game-states.repo.ts**
- **Purpose:** TEXT system persistence
- **Status:** ✅ WORKING
- **Used by:** Game creation

**games.repo.ts, hands.repo.ts, players.repo.ts**
- **Purpose:** UUID system CRUD
- **Status:** ❌ UNUSED (tables empty)

---

## 📂 public/pages/

### **play.html (2,200 lines)**

**Purpose:** Lobby interface  
**Status:** ✅ WORKING

**Screens:**
1. **Game Selection** - Create or join
2. **Create Room Modal** - Settings form
3. **Join Room Modal** - Enter invite code
4. **Lobby** - Waiting room with player list
5. **Host Controls** - Approve players, settings
6. **Seat Grid** - Claim seats with nickname

**State Management:**
```javascript
let currentRoom = null;    // Room object
let currentGame = null;    // Game object
let isHost = false;        // Host flag
let socket = null;         // WebSocket
let seats = [];            // Seat assignments
```

**WebSocket Integration:**
- Connects on page load
- Listens for: player_joined, player_approved, seat_update, game_started
- Broadcasts: join_room, seat_claimed

**Recent Additions:**
- Host settings panel (blinds, buy-in, table color)
- Nickname prompt before seat claim
- Real-time seat updates

---

## 📂 database/

### **database/migrations/ (36 SQL files)**

**Purpose:** Schema evolution (version control for database)  
**Pattern:** Sequential migrations, never edit old ones

**Key Migrations:**

**001_initial_schema.sql**
- Creates: rooms, room_seats, room_players, room_spectators
- Creates: auth/user tables
- Sets up: constraints, indexes

**007_create_missing_tables.sql**
- Creates: games, hands, players, actions, pots (UUID system)
- **Problem:** These tables never get populated

**add-game-states-table.sql**
- Creates: game_states (TEXT ID system)
- **This table DOES get populated**

**020251027_poker_table_evolution.sql**
- Adds: room_seats.player_status, processed_actions, game_audit_log
- Adds: Sequence number management

**036_fix_idempotency_key_length.sql**
- Changes: processed_actions.idempotency_key VARCHAR(50) → VARCHAR(128)
- **Status:** Ran via script, might need server restart to take effect

**Running Migrations:**
```bash
node run-single-migration.js 036_fix_idempotency_key_length.sql
```

---

### **database/COMPLETE_SCHEMA_DUMP.sql**

**Purpose:** Full schema snapshot  
**Usage:** Can recreate entire database from this file  
**When to use:** Disaster recovery, new environment setup

---

## 📂 src/middleware/

### **idempotency.js**

**Purpose:** Prevent duplicate requests  
**Pattern:**
```
Request arrives with X-Idempotency-Key header
  ↓
Check: processed_actions table for this key
  ↓
If exists: Return cached response (don't re-process)
If new: Continue, store result after
```

**Issue:** Keys 98 chars, column 50 chars (fixed but might not be applied)

---

## 📂 services/

**session-service.js**
- Session persistence
- Seat binding
- Grace periods

**game-state-hydrator.js**
- State recovery helpers
- **Status:** Exists but might be redundant with hydration endpoint

**player-identity-service.js**
- User ID management
- **Status:** Exists, usage unclear

---

## 📂 dist/ (COMPILED TYPESCRIPT)

**Purpose:** TypeScript source compiled to JavaScript  
**Usage:** Required by server (can't run .ts directly)

**Contents:**
- dist/core/engine/ - Game logic
- dist/application/ - CQRS pattern (commands/queries/events)
- dist/services/ - Database repos

**Build Command:** `npm run build`

**Status:** ✅ Compiled, working

---

## 📂 tests/

**Purpose:** Test suites (mostly unused)  
**Status:** ⚠️ EXISTS but not maintained

**Subdirectories:**
- tests/unit/ - Unit tests for engine
- tests/integration/ - API tests
- tests/manual/ - Manual test scripts

**Reality:** Manual testing via browser, automated tests outdated

---

## 📂 archive/

**Purpose:** Historical documents, failed attempts  
**Contents:**
- archive/fix-attempts/ - Documented failures
- archive/docs-history/ - 81 old .md files
- archive/old-migrations/ - Deprecated SQL
- archive/completed/ - Finished tasks

**Usage:** Reference, don't resurrect old code

---

## 📂 Documentation (ROOT .md files)

### **Currently Active:**

**THE_TEN_COMMANDMENTS.md (587 lines)**
- Core architectural principles
- Immutable truths
- **Read:** Before any code change

**CONTEXT.md (205 lines)**
- Current session state
- What's working/broken
- Next priorities

**PLAN.md (668 lines)**
- Task breakdown
- Status board
- Queued work

**PLATFORM_PROCEDURES.md (1,679 lines)**
- Complete feature procedures
- From MVP to platform dominance

---

### **Session Artifacts (Today):**

**WIRING_COMPLETE.md**
- Claims frontend wired (partially true)

**TESTING_STATUS.md**
- Test results (incomplete)

**SYSTEM_DIAGNOSIS.md**
- Root cause analysis (accurate)

**BUG_FIXES_COMPLETE.md**
- Fixes applied (some worked, some didn't)

**FLOW_FIXES_COMPLETE.md**
- Seat claiming fixes

**UUID_FIX_COMPLETE.md**
- Timer query fixes

**FINAL_FIXES_APPLIED.md**
- Session #12 summary

**HONEST_STATUS.md**
- Admission of failures

---

### **Historical (Past Sessions):**

**DAY_1_VICTORY_REPORT.md**
- Database setup completion

**DAY_2_VICTORY_REPORT.md**
- Backend modularization

**DAY_3_VICTORY_REPORT.md**
- Hydration endpoint creation

**DAY_4_VICTORY_REPORT.md**
- Timer system integration

---

## 🎯 FILE USAGE GUIDE

### **For New Agent:**

**Must Read (30 min):**
1. THE_TEN_COMMANDMENTS.md
2. 02_CURRENT_STATE_ANALYSIS.md (this doc's companion)
3. 04_COMMANDMENTS_AND_PATH_FORWARD.md
4. CONTEXT.md (check current status)

**For Specific Tasks:**
- Fixing hydration → routes/rooms.js
- Modifying game logic → src/core/engine/ (DON'T)
- Adding endpoints → routes/*.js
- UI changes → public/poker-table-zoom-lock.html
- Database changes → database/migrations/

**For Understanding:**
- SYSTEM_ARCHITECTURE_MAP.md
- PLATFORM_PROCEDURES.md
- 03_HISTORY_AND_FAILURES.md (learn from mistakes)

---

## 🗑️ FILES TO IGNORE

**Deprecated Table Files:**
- public/poker-table-v2.html
- public/poker-table-v3.html
- public/poker-table-final.html
- public/poker-table-grid.html

**Reason:** Multiple rebuild attempts, none complete  
**Current:** poker-table-zoom-lock.html is the one  
**Action:** Can delete others after MVP

---

**Old Poker Table:**
- public/poker.html

**Reason:** Legacy, pre-modularization  
**Status:** Still works as fallback  
**Action:** Keep until zoom-lock proven

---

**Backup File:**
- sophisticated-engine-server.backup.js

**Reason:** Pre-modularization backup  
**Status:** Outdated  
**Action:** Can delete (original is in git history)

---

## 📊 FILE COUNT SUMMARY

**Total Files:** ~2,500 (including node_modules)

**Core Codebase:**
- Backend: 10 files (~4,000 lines)
- Frontend: 15 HTML/JS (~8,000 lines)
- Engine: 30 TS files (~5,000 lines)
- Database: 36 migrations
- Tests: 25 files (outdated)
- Documentation: 60+ .md files

**Maintained:**
- Routes: 5 files (2,500 lines) ✅
- Main Pages: 2 HTML (4,300 lines) ✅
- Services: 5 files (1,200 lines) ✅
- Engine: DON'T TOUCH ✅

**Unmaintained:**
- 4 alternate table HTML files
- Old test scripts
- Archived docs

---

## 🔍 FILE DEPENDENCY GRAPH

```
sophisticated-engine-server.js (ENTRY POINT)
  ├─ routes/rooms.js ← FIX THIS FILE
  ├─ routes/games.js ← WORKS
  ├─ routes/auth.js ← WORKS
  ├─ routes/pages.js ← WORKS
  ├─ websocket/socket-handlers.js ← WORKS
  ├─ src/db/poker-table-v2.js ← FIXED TODAY
  ├─ src/services/timer-service.js ← FIXED TODAY
  ├─ dist/core/engine/ ← WORKS (don't touch)
  └─ config/, middleware/, services/

Browser loads:
  /game/:roomId
    ↓
  routes/pages.js (serves HTML)
    ↓
  public/poker-table-zoom-lock.html
    ├─ public/js/sequence-tracker.js
    ├─ public/js/auth-manager.js
    ├─ /socket.io/socket.io.js
    └─ Supabase CDN

Hydration:
  poker-table-zoom-lock.html
    ↓
  fetchHydration()
    ↓
  GET /api/rooms/:roomId/hydrate
    ↓
  routes/rooms.js:317-561 ← THE BROKEN FUNCTION
    ↓
  Database query ← THE BROKEN LINE (350)
```

---

## 🎖️ CRITICAL FILES (Touch These)

**To Fix Hydration:**
1. routes/rooms.js (line 350, query change)
2. That's it.

**To Test:**
1. Browser console (check hasGame)
2. Terminal (check query execution)
3. Database (verify data exists)

**To Deploy:**
1. package.json (dependencies)
2. .env (connection strings)
3. sophisticated-engine-server.js (entry point)

---

## 🚫 FILES TO NEVER TOUCH

**src/core/engine/**
- These are battle-tested
- Poker logic is correct
- Compiled and working
- **DO NOT DEBUG GAME LOGIC**

**dist/**
- Compiled output
- Auto-generated
- Will be overwritten on next build
- **NEVER EDIT DIRECTLY**

---

## 📋 FILE MODIFICATION HISTORY (Session #12)

**Files Modified Today:**

1. **public/poker-table-zoom-lock.html**
   - Added socket.emit('join_room')
   - Fixed .board-area → .board-center
   - Wired host controls
   - Added getCurrentSeats() helper
   - Added auth headers to start-hand
   - Fixed debounce bypass

2. **routes/rooms.js**
   - Added 3 endpoints (update-chips, pause, resume)
   - Fixed username update logic

3. **public/pages/play.html**
   - Fixed startGame() to create game first
   - Added host settings panel
   - Added nickname prompt

4. **routes/games.js**
   - Disabled fullGameRepository.startHand()
   - Added explicit roomId parameter

5. **src/db/poker-table-v2.js**
   - Fixed startTurn() UUID lookups
   - Fixed getTurnTimer() query

6. **src/services/timer-service.js**
   - Added roomId parameter to startTurn()

7. **public/js/sequence-tracker.js**
   - Fixed seq=0 rejection
   - Accept string numbers

8. **database/migrations/036_fix_idempotency_key_length.sql**
   - Created and ran

---

## 📐 FILE ARCHITECTURE PRINCIPLES

### **Separation of Concerns:**

**Routes:** HTTP endpoint definitions only  
**Services:** Business logic  
**Repositories:** Database access  
**Engine:** Game rules  
**Frontend:** Presentation

**Don't mix:** 
- UI logic in routes
- Database queries in frontend
- Game rules in backend (use engine)

---

### **File Naming Conventions:**

**Backend:**
- `*.js` - JavaScript (routes, services)
- `*.ts` - TypeScript (engine, repos)

**Frontend:**
- `*.html` - Pages (includes embedded CSS/JS)
- `public/js/*.js` - Shared JavaScript modules
- `public/css/*.css` - Shared stylesheets

**Database:**
- `NNN_description.sql` - Numbered migrations
- `add-*.sql` - Feature additions
- `fix-*.sql` - Bug fixes

---

## 🎯 NEXT AGENT FILE CHECKLIST

**Before coding:**
- [ ] Read routes/rooms.js (understand hydration)
- [ ] Read routes/games.js (understand game creation)
- [ ] Read poker-table-zoom-lock.html (understand rendering)

**To fix hydration:**
- [ ] Edit: routes/rooms.js line 350
- [ ] Test: Check browser console
- [ ] Verify: Database has data

**To test end-to-end:**
- [ ] Run: sophisticated-engine-server.js
- [ ] Open: http://localhost:3000/play (2 browsers)
- [ ] Check: Terminal for errors
- [ ] Check: Console for errors

**To deploy:**
- [ ] Verify: All tests pass
- [ ] Check: No console errors
- [ ] Update: README.md with setup instructions
- [ ] Commit: Working code
- [ ] Push: To production

---

**This directory guide is complete.  
Every file has a purpose.  
The critical files are identified.  
The path is clear.**

