# 📁 PROJECT FILE TREE

## **Root Level**
```
PokerGeek.AI/
├── sophisticated-engine-server.js (1,189 lines) - MAIN SERVER
├── package.json
├── tsconfig.json
├── jest.config.js
├── .env
│
├── routes/ (MODULARIZED BACKEND)
│   ├── games.js (630 lines, 7 endpoints) - Game actions, start hand
│   ├── rooms.js (1,800 lines, 22 endpoints) - Room/lobby/hydration ← NEEDS FIX
│   ├── auth.js (100 lines, 3 endpoints) - Authentication
│   ├── pages.js (74 lines, 13 routes) - HTML serving
│   └── v2.js (117 lines, 3 endpoints) - Legacy API
│
├── websocket/
│   └── socket-handlers.js (260 lines) - Socket.IO events
│
├── public/ (FRONTEND)
│   ├── poker-table-zoom-lock.html (2,100 lines) - MAIN TABLE UI ← FIXED
│   ├── pages/
│   │   └── play.html (2,200 lines) - Lobby UI
│   ├── js/
│   │   ├── auth-manager.js - Supabase auth
│   │   ├── sequence-tracker.js - Prevents stale updates ← FIXED
│   │   ├── game-state-manager.js - State management
│   │   └── timer-display.js - Turn timers
│   ├── cards/ (52 PNG files)
│   └── css/ (styles)
│
├── src/ (TYPESCRIPT ENGINE)
│   ├── core/
│   │   └── engine/
│   │       ├── game-state-machine.ts - Main game logic
│   │       ├── betting-engine.ts - Betting rules
│   │       ├── hand-evaluator.ts - Winner determination
│   │       └── turn-manager.ts - Turn order
│   ├── services/
│   │   ├── timer-service.js (270 lines) - Auto-fold timers ← FIXED
│   │   └── database/
│   │       └── repos/
│   │           ├── full-game.repo.ts - UUID system (BROKEN)
│   │           └── game-states.repo.ts - TEXT system (WORKING)
│   ├── db/
│   │   └── poker-table-v2.js (350 lines) - DB helpers ← FIXED
│   └── middleware/
│       └── idempotency.js - Deduplication
│
├── database/
│   └── migrations/ (36 SQL files)
│       ├── 001_initial_schema.sql
│       ├── 007_create_missing_tables.sql - Creates games/hands (UUID)
│       ├── add-game-states-table.sql - Creates game_states (TEXT)
│       └── 036_fix_idempotency_key_length.sql ← RAN
│
├── dist/ (COMPILED TYPESCRIPT)
│   └── core/, application/, services/
│
└── Documentation/
    ├── THE_TEN_COMMANDMENTS.md (587 lines) - Core principles
    ├── CONTEXT.md (205 lines) - Current status
    ├── PLAN.md (668 lines) - Task list
    └── [50+ other .md files]
```

---

## **🔑 CRITICAL FILES FOR GAME START**

### **Backend:**
1. **`routes/rooms.js`** line 317-561
   - `GET /:roomId/hydrate` endpoint
   - **BROKEN:** Queries `games` table (UUID, empty)
   - **NEEDS:** Query `game_states` table (TEXT, has data)

2. **`routes/games.js`** line 311-617
   - `POST /:id/start-hand` endpoint
   - **WORKS:** Deals cards, posts blinds
   - **Problem:** Hydration can't see the result

3. **`src/db/poker-table-v2.js`** lines 178-214
   - Timer management
   - **FIXED:** No longer queries UUID `games` table

4. **`src/services/timer-service.js`** line 24-90
   - Turn timers, auto-fold
   - **FIXED:** Passes roomId to avoid lookups

### **Frontend:**
5. **`public/poker-table-zoom-lock.html`**
   - Line 1330-1375: fetchHydration() - Calls hydrate endpoint
   - Line 1377-1550: renderFromHydration() - Renders cards/pot/players
   - Line 1674-1730: setupGameEventHandlers() - Socket listeners
   - **STATUS:** Fixed socket joining, host controls wired

6. **`public/js/sequence-tracker.js`**
   - Prevents stale WebSocket updates
   - **FIXED:** Accepts seq=0 and string numbers

---

## **🗄️ DATABASE TABLES (Supabase PostgreSQL)**

### **Working Tables (TEXT ID system):**
- **`game_states`** (id TEXT) - Has all active games ✅
- **`room_seats`** - Has player seats ✅
- **`user_profiles`** - Has usernames ✅
- **`rooms`** - Has room configs ✅

### **Broken Tables (UUID system):**
- **`games`** (id UUID) - EMPTY, never gets entries ❌
- **`hands`** (game_id UUID FK) - EMPTY, can't insert without games ❌
- **`players`** (game_id UUID FK) - EMPTY ❌

### **Conflict:**
Hydration queries UUID tables (empty) instead of TEXT tables (full).

---

## **📊 DATA FLOW (Current)**

```
1. CREATE GAME
   POST /api/games
   ↓
   In-memory: games.set("sophisticated_...", gameState) ✅
   Database: INSERT INTO game_states (id, current_state) ✅
   Database: INSERT INTO games (TRIES, FAILS ON DUPLICATE) ❌
   Result: gameUuid = null

2. START HAND
   POST /api/games/:id/start-hand
   ↓
   Deals cards ✅
   Posts blinds ✅
   Stores in: gameState.players[X].holeCards ✅
   Broadcasts: hand_started ✅

3. HYDRATION (BROKEN)
   GET /api/rooms/:id/hydrate
   ↓
   Query: SELECT FROM games WHERE room_id = ... ❌
   Result: 0 rows (table empty)
   Returns: hasGame: false, hasHand: false
   ↓
   Frontend: Shows seat selection, no cards

4. WHAT SHOULD HAPPEN
   GET /api/rooms/:id/hydrate
   ↓
   Query: SELECT FROM game_states WHERE room_id = ... ✅
   Extract: current_state JSONB
   Get players from: current_state.players
   Get hole cards from: players.find(p => p.userId === reqUser).holeCards
   Returns: hasGame: true, hasHand: true, me.hole_cards: ["C4", "CQ"]
   ↓
   Frontend: Renders cards, pot, game active
```

---

## **🎯 THE ONE FIX NEEDED**

**File:** `routes/rooms.js`  
**Lines:** 349-423  
**Change:** Query `game_states` instead of `games`, extract from JSONB

**Result:** Hydration will find the game, return cards, frontend will render.

---

**This file tree saved to: `project-tree.txt`**

