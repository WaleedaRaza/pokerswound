# 🚨 CRITICAL: Table Name Conflict

## The Problem

Your Supabase database **already has** a `games` table:

```sql
-- Existing in Supabase (from Schemasnapshot.txt)
CREATE TABLE public.games (
  id uuid PRIMARY KEY,
  room_id uuid NOT NULL,              -- Links to rooms
  game_type VARCHAR DEFAULT 'TEXAS_HOLDEM',
  small_blind INT,
  big_blind INT,
  status VARCHAR DEFAULT 'WAITING',
  current_hand_id uuid,
  dealer_seat INT,
  created_at TIMESTAMPTZ
);
```

Our migration tries to create **a different** `games` table:

```sql
-- From add-games-table.sql (our new code)
CREATE TABLE games (
  id TEXT PRIMARY KEY,                -- TEXT not UUID!
  host_user_id TEXT,
  status TEXT,
  current_state JSONB NOT NULL,       -- Complete state snapshot
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ
);
```

**Result:** Migration will **FAIL** with error:
```
ERROR: relation "games" already exists
```

---

## The Good News

✅ **The old `games` table appears UNUSED**

Evidence:
- `sophisticated-engine-server.js` uses **in-memory Map**, not database
- No `SELECT FROM games` queries found in codebase
- No `INSERT INTO games` found in codebase
- Games are created/managed entirely in memory
- Only `rooms` and `room_seats` tables are actively used

---

## Decision Required: 3 Options

### Option 1: Rename Our Table to `game_states` ⭐ RECOMMENDED

**Migration:**
```sql
-- Rename our new table
CREATE TABLE game_states (
  id TEXT PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),  -- ADD: Link to room system
  host_user_id TEXT NOT NULL,
  current_state JSONB NOT NULL,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Code Changes:**
```typescript
// src/services/database/repos/games.repo.ts
// Rename file to: game-states.repo.ts

export class GameStatesRepository {  // was: GamesRepository
  async create(gameId: string, roomId: string | null, ...) {
    const query = `
      INSERT INTO game_states (...)  -- was: games
      VALUES (...)
    `;
  }
}
```

```javascript
// sophisticated-engine-server.js
const { GameStatesRepository } = require('./dist/services/database/repos/game-states.repo');
let gameStatesRepository = null;

if (MIGRATION_FLAGS.USE_DB_REPOSITORY) {
  gameStatesRepository = new GameStatesRepository(db);
}
```

**Benefits:**
- ✅ No conflict with existing table
- ✅ Clear semantic meaning
- ✅ Can link game state to rooms
- ✅ Preserves old table (if ever needed)
- ✅ Easy rollback

**Drawbacks:**
- Need to rename files/classes
- 10 minutes of refactoring

---

### Option 2: Drop Old Table and Use `games`

**Migration:**
```sql
-- Check if old table has data
SELECT COUNT(*) FROM games;

-- If empty, drop it
DROP TABLE IF EXISTS games CASCADE;

-- Then create our new table
CREATE TABLE games (
  id TEXT PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),
  ...
);
```

**Benefits:**
- ✅ Keeps original naming
- ✅ Single `games` table

**Risks:**
- ⚠️ Might break foreign key constraints (`hands.game_id`, `actions.game_id`)
- ⚠️ Might be used by analytics/reporting we haven't found
- ⚠️ Harder to rollback if something breaks
- ⚠️ Need to verify no data exists first

---

### Option 3: Keep Both Tables (Bridge Pattern)

**Use old `games` table as metadata, new column for state**

```sql
-- Add columns to existing games table
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS current_state JSONB,
  ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

-- Update primary key type (RISKY)
-- OR: Add mapping table
CREATE TABLE game_state_mappings (
  uuid_game_id UUID PRIMARY KEY REFERENCES games(id),
  text_game_id TEXT NOT NULL UNIQUE
);
```

**Benefits:**
- ✅ Preserves existing structure
- ✅ Maintains room linkage
- ✅ Backward compatible

**Drawbacks:**
- ❌ Complex migration
- ❌ ID type mismatch (UUID vs TEXT)
- ❌ Mixed responsibilities in one table
- ❌ Technical debt

---

## Recommended Action Plan

### ⭐ Go with Option 1: `game_states` Table

**Step 1: Rename Migration File**
```bash
cd pokeher/poker-engine/database/migrations
mv add-games-table.sql add-game-states-table.sql
```

**Step 2: Update Migration SQL**
```sql
-- Change everywhere: games → game_states
CREATE TABLE game_states (...);
CREATE INDEX idx_game_states_host_user_id ON game_states(host_user_id);
COMMENT ON TABLE game_states IS '...';
```

**Step 3: Add Room Link**
```sql
CREATE TABLE game_states (
  id TEXT PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),  -- ⚠️ ADD THIS
  host_user_id TEXT NOT NULL,
  current_state JSONB NOT NULL,
  ...
);
```

**Step 4: Rename TypeScript Files**
```bash
cd src/services/database/repos
mv games.repo.ts game-states.repo.ts

# Update class name inside file:
# GamesRepository → GameStatesRepository
```

**Step 5: Update Server Code**
```javascript
// sophisticated-engine-server.js (line 85)
const { GameStatesRepository } = require('./dist/services/database/repos/game-states.repo');
let gameStatesRepository = null;

// Update StorageAdapter methods to use gameStatesRepository
```

**Step 6: Rebuild**
```bash
npm run build
```

---

## Connecting Game State to Rooms

**Critical Addition:** Link game state back to rooms!

```javascript
// When creating game from room:
async function createGameFromRoom(roomId, hostUserId) {
  const room = await getRoomDetails(roomId);
  const seats = await getRoomSeats(roomId);
  
  // Create game ID linked to room
  const gameId = `game-${roomId}`;  // or generate UUID
  
  // Create in-memory game state
  const gameState = new GameStateModel({
    id: gameId,
    configuration: {
      smallBlind: room.small_blind,
      bigBlind: room.big_blind,
      maxPlayers: room.max_players,
      ...
    }
  });
  
  // Add players from room seats
  seats.forEach(seat => {
    if (seat.status === 'SEATED') {
      gameState.addPlayer(new PlayerModel({
        uuid: seat.user_id,
        stack: seat.chips_in_play,
        seatIndex: seat.seat_index,
        name: `Player ${seat.seat_index}`  // TODO: Get from profiles
      }));
    }
  });
  
  // Dual write: in-memory + database
  games.set(gameId, gameState);
  
  if (MIGRATION_FLAGS.USE_DB_REPOSITORY && gameStatesRepository) {
    await gameStatesRepository.create(
      gameId,
      roomId,              // ⚠️ Pass room ID
      gameState.toSnapshot(),
      hostUserId
    );
  }
  
  // Update room reference
  await db.query(
    'UPDATE rooms SET current_game_id = $1, status = $2 WHERE id = $3',
    [gameId, 'active', roomId]
  );
  
  return { gameId, gameState };
}
```

---

## Testing Before Migration

### 1. Check Old Table Has No Data

```sql
-- Connect to Supabase
SELECT COUNT(*) as count FROM games;
SELECT * FROM games LIMIT 5;
```

**If count > 0:** DO NOT DROP! Use Option 1 (`game_states`)

### 2. Verify Foreign Keys

```sql
-- Find tables that reference games
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND ccu.table_name='games';
```

**Expected results:**
- `hands.game_id` → `games.id`
- `actions.game_id` → `games.id`
- `players.game_id` → `games.id`

**If these exist:** Use Option 1 (`game_states`) to avoid breaking constraints

### 3. Search Codebase for `games` Table Usage

```bash
# Look for direct SQL queries
grep -r "FROM games" pokeher/poker-engine/
grep -r "INSERT INTO games" pokeher/poker-engine/
grep -r "UPDATE games" pokeher/poker-engine/

# Look for ORM/query builder references
grep -r "\.games\(" pokeher/poker-engine/
```

---

## My Strong Recommendation

**Use Option 1: `game_states` table**

Reasons:
1. ✅ **Zero risk** - doesn't touch existing schema
2. ✅ **Clear semantics** - "game state" vs "game metadata"
3. ✅ **10 minutes of work** - just rename files/classes
4. ✅ **Easy rollback** - can delete table if needed
5. ✅ **Future-proof** - keeps options open

**The old `games` table might be:**
- Used by analytics scripts we haven't seen
- Referenced by Supabase RLS policies
- Part of a future feature
- Holding test data

**Better safe than sorry!**

---

## Next Steps

**If you agree with Option 1:**

1. I'll rename the migration file
2. Update SQL to use `game_states`
3. Add `room_id` column
4. Rename TypeScript files/classes
5. Update server code
6. Rebuild and test

**OR if you want Option 2:**

1. First, run this query in Supabase:
   ```sql
   SELECT COUNT(*) FROM games;
   ```
2. Share the result
3. Then I'll proceed with drop/recreate

**What's your call?** 🎯

