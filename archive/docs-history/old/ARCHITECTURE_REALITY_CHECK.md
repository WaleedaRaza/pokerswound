# 🏗️ Architecture Reality Check

## Current System: **Two Separate Architectures**

### ✅ Architecture 1: Database-Backed Lobby System (WORKING)

**Purpose:** Room/Lobby management for multiplayer  
**Storage:** Supabase PostgreSQL  
**Status:** ✅ Fully operational

**Tables Used:**
```sql
rooms (id UUID, name, small_blind, big_blind, status, invite_code, host_user_id)
  ├─ room_seats (room_id, user_id, seat_index, chips_in_play, status)
  ├─ room_players (room_id, user_id, status, joined_at)
  └─ room_spectators (room_id, user_id, joined_at)
```

**Routes:** (`sophisticated-engine-server.js`)
- `GET /api/rooms` (line 1177) - List all active rooms
- `GET /api/rooms/:id` - Get room details + seats
- `POST /api/rooms` - Create new room
- `POST /api/rooms/:id/seats` - Claim a seat

**Flow:**
```
User → Lobby → Browse Rooms → Join Room → Claim Seat → Ready to Play
```

### ✅ Architecture 2: In-Memory Game Engine (WORKING)

**Purpose:** Actual poker game logic  
**Storage:** In-memory JavaScript `Map`  
**Status:** ✅ Fully operational, NO persistence

**Data Structures:**
```javascript
games = new Map();  // gameId → GameStateModel
  - GameStateModel (TypeScript class)
  - players: Map<UUID, PlayerModel>
  - handState: { handNumber, dealerPosition, communityCards, deck }
  - pot: { mainPot, sidePots, totalPot }
  - bettingRound: { currentBet, minRaise, lastAggressor }
  - actionHistory: Action[]
```

**Game Engine Components:**
- `GameStateMachine` - State transitions
- `BettingEngine` - Action validation
- `RoundManager` - Street progression
- `TurnManager` - Turn order
- `HandEvaluator` - Winner determination

**Flow:**
```
Room Ready → Create GameStateModel → In-Memory Processing → WebSocket Updates
```

**Problem:** Server restart = all games lost!

---

## 🚨 The Table Conflict

### Existing Supabase `games` Table (UNUSED)

```sql
-- From your Schemasnapshot.txt (lines 240-257)
CREATE TABLE public.games (
  id uuid DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL,              -- ⚠️ Links to rooms table
  game_type VARCHAR DEFAULT 'TEXAS_HOLDEM',
  small_blind INT NOT NULL,
  big_blind INT NOT NULL,
  status VARCHAR DEFAULT 'WAITING',
  current_hand_id uuid,               -- ⚠️ Links to hands table
  dealer_seat INT,
  shuffle_seed VARCHAR,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Issues:**
- ❌ **Not used** by `sophisticated-engine-server.js`
- ❌ Designed for a **different architecture** (normalized relational)
- ❌ Expects separate `hands`, `players`, `actions` tables
- ❌ Does NOT store complete game state
- ❌ UUID-based, not compatible with current game IDs

### Our New `games` Table (MIGRATION CONFLICT!)

```sql
-- From add-games-table.sql
CREATE TABLE IF NOT EXISTS games (
  id TEXT PRIMARY KEY,                -- ⚠️ TEXT, not UUID
  host_user_id TEXT NOT NULL,
  status TEXT,
  current_state JSONB NOT NULL,       -- ⚠️ Complete game state
  hand_number INT,
  dealer_position INT,
  total_pot INT,
  version INT DEFAULT 1,              -- ⚠️ Optimistic locking
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**This table:**
- ✅ Designed for in-memory `GameStateModel` persistence
- ✅ JSONB for complete state snapshot
- ✅ Optimistic locking for concurrency
- ❌ **CONFLICTS** with existing `games` table!
- ❌ No `room_id` link (disconnected from lobby system)

---

## 📊 Current Data Flow

### Lobby → Game Transition (How It Works Now)

```
1. User creates room (INSERT INTO rooms)
2. Players join + claim seats (INSERT INTO room_seats)
3. Host clicks "Start Game"
4. Frontend calls some endpoint (unclear which)
5. ??? Magic happens ???
6. GameStateModel created in-memory
7. Game proceeds via WebSocket events
8. NO database persistence
```

**Missing Piece:** Where does `room_id` → `gameId` mapping happen?

### What Tables Are Actually Used?

**✅ ACTIVE (Lobby System):**
- `rooms` - Room configuration
- `room_seats` - Seat management
- `user_profiles` / `profiles` - User data (chips, username)
- `chips_transactions` - Chip movement tracking
- `audit_log` - Activity logging

**❓ UNCLEAR (Need to verify):**
- `games` (old table) - Possibly dead code
- `hands` - Might be analytics only
- `players` - Might be analytics only
- `actions` - Might be analytics only
- `pots` - Might be analytics only

**❌ NOT USED (Analytics/Future):**
- `hand_fingerprints`, `hand_embeddings` - AI/ML features
- `gto_solutions` - Solver integration
- `player_behavior_patterns` - Analytics
- `ai_analysis_jobs` - Background jobs
- All moderation/social tables

---

## 🎯 The Real Migration Strategy

### Option 1: Rename Our New Table (RECOMMENDED)

**Create:** `game_states` table instead of `games`

```sql
CREATE TABLE game_states (
  id TEXT PRIMARY KEY,              -- Matches current gameId format
  room_id UUID,                     -- ⚠️ ADD THIS - link to rooms!
  host_user_id TEXT NOT NULL,
  current_state JSONB NOT NULL,     -- Complete GameStateModel
  version INT DEFAULT 1,
  ...
);
```

**Benefits:**
- ✅ No conflict with existing `games` table
- ✅ Can link game state to rooms
- ✅ Preserves old table (if needed for analytics)
- ✅ Clear semantic difference

### Option 2: Drop Old `games` Table

**Replace it entirely with our new design**

```sql
-- Check if old games table has any data
SELECT COUNT(*) FROM games;

-- If empty, drop it
DROP TABLE games CASCADE;

-- Then run our migration
CREATE TABLE games (...);
```

**Risks:**
- ❌ Might break foreign key constraints
- ❌ Might be used by other code we haven't found
- ❌ Harder to roll back

### Option 3: Hybrid Approach

**Use existing `games` table + add JSONB column**

```sql
ALTER TABLE games 
  ADD COLUMN current_state JSONB,
  ADD COLUMN version INT DEFAULT 1;

-- Keep room_id linkage
-- Keep UUID id (convert game IDs to UUID)
```

**Tradeoffs:**
- ✅ Preserves existing structure
- ✅ Keeps room relationship
- ❌ Our game IDs are TEXT, not UUID
- ❌ More complex migration

---

## 🔍 What We Need to Verify

### 1. Game Creation Flow

**Question:** How does a room become a game?

```javascript
// Find this logic:
// sophisticated-engine-server.js - WHERE IS IT?

// Hypothesis:
app.post('/api/rooms/:roomId/start', async (req, res) => {
  const room = await getRoomDetails(roomId);
  
  // Create in-memory game
  const gameId = `game-${roomId}`;
  const gameState = new GameStateModel({
    id: gameId,
    configuration: {
      smallBlind: room.small_blind,
      bigBlind: room.big_blind,
      maxPlayers: room.max_players
    }
  });
  
  // Add players from room_seats
  const seats = await getSeats(roomId);
  seats.forEach(seat => {
    gameState.addPlayer(new PlayerModel({
      uuid: seat.user_id,
      stack: seat.chips_in_play,
      seatIndex: seat.seat_index
    }));
  });
  
  games.set(gameId, gameState);
  
  // ??? Do we INSERT INTO games table? ???
  // ??? Do we UPDATE rooms SET current_game_id? ???
});
```

### 2. Active Game Endpoints

**Search for:**
- Where do clients send player actions?
- How are games fetched after creation?
- What endpoints use the `games` Map?

### 3. Reconnection Logic

**Question:** How do players rejoin after disconnect?

```javascript
// Check for:
- rejoin_tokens table usage
- Socket.IO reconnection handlers
- Game state recovery logic
```

---

## 🚀 Immediate Action Plan

### Step 1: Find Missing Routes
```bash
# Search for game-related endpoints
grep -n "app\.(post|get|put)" sophisticated-engine-server.js | grep -i game

# Search for games Map usage
grep -n "games\.set\|games\.get" sophisticated-engine-server.js

# Search for GameStateModel instantiation
grep -n "new GameStateModel" sophisticated-engine-server.js
```

### Step 2: Audit Database Usage
```bash
# Find all db.query calls
grep -n "db\.query\|getDb()" sophisticated-engine-server.js

# Check what tables are actually queried
grep -o "FROM [a-z_]*" sophisticated-engine-server.js | sort | uniq
```

### Step 3: Decide on Table Strategy

**Before migrating, we must answer:**
1. Is the old `games` table used anywhere?
2. Should we link game state to rooms?
3. Do we need `room_id` in our new table?
4. Should we rename to `game_states`?

### Step 4: Test Current System

```bash
# Start server
npm start

# Open browser console
# Navigate to http://localhost:3000/poker

# Monitor network tab:
# - Which endpoints are called?
# - What game IDs are generated?
# - How are games stored/retrieved?
```

---

## 💡 Recommended Path Forward

### Phase 1: Map the Territory (NOW)
1. Find all game creation logic
2. Find all game retrieval logic
3. Understand room → game transition
4. Check if old `games` table has data

### Phase 2: Fix Table Conflict
**Recommended:** Rename our table to `game_states`
```sql
CREATE TABLE game_states (
  id TEXT PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),  -- ADD THIS LINK
  host_user_id TEXT NOT NULL,
  current_state JSONB NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Phase 3: Connect the Systems
```javascript
// When creating game from room:
async function createGameFromRoom(roomId) {
  const room = await getRoomById(roomId);
  const seats = await getSeats(roomId);
  
  const gameState = new GameStateModel({...});
  const gameId = `game-${roomId}`;
  
  // Dual write: in-memory + database
  games.set(gameId, gameState);
  
  if (MIGRATION_FLAGS.USE_DB_REPOSITORY) {
    await gamesRepository.create(gameId, gameState.toSnapshot(), room.host_user_id);
  }
  
  // Update room with game reference
  await db.query(
    'UPDATE rooms SET current_game_id = $1, status = $2 WHERE id = $3',
    [gameId, 'active', roomId]
  );
  
  return { gameId, gameState };
}
```

---

## 🎯 Your Question Answered

> "where routes lie in our codebase, how these are invoked"

**Routes Location:** `sophisticated-engine-server.js` lines ~1000-2400
- `/api/rooms` - Lobby system (USES DATABASE)
- `/api/v2/game/:gameId` - CQRS endpoints (USES IN-MEMORY)
- Rest endpoints - Mixed (some DB, most in-memory)

**Invocation Flow:**
1. Frontend → `fetch('/api/rooms')` → Database query → Returns room list
2. Frontend → `socket.emit('join_room')` → WebSocket handler → Room state
3. Frontend → ??? (MISSING) → Game creation → In-memory Map
4. Frontend → `socket.emit('player_action')` → Game engine → In-memory update

**What Needs Migration:**
- ✅ Game state persistence (in progress)
- ⚠️ Link game state to rooms (MUST ADD)
- ❌ Event persistence (not started)
- ❌ Action history (not started)
- ❌ Hand history (not started)

**Won't Break:**
- ✅ Room/lobby system (separate tables)
- ✅ User profiles/chips (separate tables)
- ✅ In-memory game engine (adding optional persistence)

