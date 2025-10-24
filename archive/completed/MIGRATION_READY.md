# ✅ Migration Complete - Ready to Test!

## What Was Changed

### 1. Database Migration File ✅
**Created:** `database/migrations/add-game-states-table.sql`  
**Deleted:** `database/migrations/add-games-table.sql`

**Changes:**
- ✅ Renamed table: `games` → `game_states`
- ✅ Added `room_id UUID REFERENCES rooms(id)` column
- ✅ Updated all indexes and triggers
- ✅ Added comments and documentation queries

### 2. TypeScript Repository ✅
**Created:** `src/services/database/repos/game-states.repo.ts`  
**Deleted:** `src/services/database/repos/games.repo.ts`

**Changes:**
- ✅ Renamed class: `GamesRepository` → `GameStatesRepository`
- ✅ Updated all SQL queries: `games` → `game_states`
- ✅ Added `roomId` parameter to `create()` method
- ✅ Added new method: `findByRoomId()`
- ✅ Updated `listActiveGames()` to return `roomId`

### 3. Server Integration ✅
**Modified:** `sophisticated-engine-server.js`

**Changes:**
- ✅ Import: `GamesRepository` → `GameStatesRepository`
- ✅ Variable: `gamesRepository` → `gameStatesRepository`
- ✅ StorageAdapter: Updated all methods to use new repository
- ✅ Added `roomId` parameter to `createGame()` method

### 4. TypeScript Build ✅
**Status:** Successfully compiled!
- ✅ `dist/services/database/repos/game-states.repo.js` created
- ⚠️ 3 pre-existing type errors in excluded files (ignored)

---

## Testing Steps

### Phase 1: Test Server Startup (DB Disabled)

```bash
cd pokeher/poker-engine
npm start
```

**Expected Output:**
```
🚀 SOPHISTICATED POKER ENGINE running on port 3000
📊 Migration Status:
  - Database Repository: ❌ DISABLED
  ...
✅ All systems operational!
```

**Test:** Open `http://localhost:3000/poker` - game should work

---

### Phase 2: Run Database Migration

**Option A: Via Supabase SQL Editor (RECOMMENDED)**
```sql
-- Copy/paste contents of:
-- pokeher/poker-engine/database/migrations/add-game-states-table.sql

-- Then verify:
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'game_states'
ORDER BY ordinal_position;
```

**Option B: Via psql Command Line**
```bash
# From pokeher/poker-engine directory
psql $DATABASE_URL -f database/migrations/add-game-states-table.sql

# Verify
psql $DATABASE_URL -c "SELECT COUNT(*) FROM game_states;"
```

---

### Phase 3: Enable Database Persistence

**Edit `test.env`:**
```bash
USE_DB_REPOSITORY=true
```

**Restart Server:**
```bash
npm start
```

**Expected Output:**
```
🗄️ Initializing database connection...
✅ Database connection established
✅ GameStatesRepository initialized (database persistence active)
📊 Migration Status:
  - Database Repository: ✅ ENABLED
```

---

### Phase 4: Test Dual-Write

**Start a game and watch console logs:**

```javascript
// Expected log sequence:
🔄 [MIGRATION] createGame → IN_MEMORY {"gameId":"game-123","roomId":null}
🔄 [MIGRATION] createGame → DB_SUCCESS {"gameId":"game-123","roomId":null}

// On each action:
🔄 [MIGRATION] saveGame → IN_MEMORY {"gameId":"game-123"}
🔄 [MIGRATION] saveGame → DB_SUCCESS {"gameId":"game-123","version":2}
```

**Query database to verify:**
```sql
SELECT id, room_id, status, hand_number, total_pot, version, created_at
FROM game_states
ORDER BY created_at DESC
LIMIT 5;
```

---

### Phase 5: Test Database Recovery

**Test that games persist after restart:**

```bash
# 1. Create a game (with DB enabled)
# Note the game ID from logs

# 2. Stop server (Ctrl+C)

# 3. Restart server
npm start

# 4. Try to access the game
# Server should load it from database:
🔄 [MIGRATION] getGame → DB_HYDRATE {"gameId":"game-123"}
```

---

## Connecting Games to Rooms (Future)

When you're ready to link games to the lobby system:

```javascript
// In sophisticated-engine-server.js
// Add new endpoint: POST /api/rooms/:roomId/start-game

app.post('/api/rooms/:roomId/start-game', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostUserId } = req.body;
    
    // Load room from database
    const room = await db.query('SELECT * FROM rooms WHERE id = $1', [roomId]);
    const seats = await db.query('SELECT * FROM room_seats WHERE room_id = $1', [roomId]);
    
    // Create game ID
    const gameId = `game-${roomId}`;
    
    // Create GameStateModel from room configuration
    const gameState = new GameStateModel({
      id: gameId,
      configuration: {
        smallBlind: room.small_blind,
        bigBlind: room.big_blind,
        maxPlayers: room.max_players,
        ...
      }
    });
    
    // Add players from seats
    seats.forEach(seat => {
      gameState.addPlayer(new PlayerModel({
        uuid: seat.user_id,
        stack: seat.chips_in_play,
        seatIndex: seat.seat_index
      }));
    });
    
    // Dual write with room linkage
    await StorageAdapter.createGame(
      gameId, 
      gameState, 
      hostUserId,
      roomId  // ⭐ NEW: Pass room ID
    );
    
    // Update room reference
    await db.query(
      'UPDATE rooms SET current_game_id = $1, status = $2 WHERE id = $3',
      [gameId, 'active', roomId]
    );
    
    res.json({ 
      success: true, 
      gameId, 
      roomId,
      message: 'Game started from room' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Rollback Plan

If something goes wrong:

### 1. Disable Database Immediately
```bash
# Edit test.env
USE_DB_REPOSITORY=false

# Restart server
npm start
```
Server continues with in-memory storage - no data loss!

### 2. Drop New Table (if needed)
```sql
DROP TABLE IF EXISTS game_states CASCADE;
```

### 3. Revert Code (if needed)
```bash
git checkout sophisticated-engine-server.js
git checkout src/services/database/repos/game-states.repo.ts
npm run build
npm start
```

---

## Success Criteria

✅ **Server starts** with both flags (true/false)  
✅ **Games work identically** with flag disabled (in-memory only)  
✅ **Games persist to DB** when flag enabled  
✅ **Games reload from DB** after server restart  
✅ **No errors or crashes** during normal gameplay  
✅ **Migration logs show dual-write** working  
✅ **Database queries** show correct game data  
✅ **Room-game linking** works (future feature)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   LOBBY SYSTEM (Existing)               │
│  tables: rooms, room_seats, room_players               │
│  status: ✅ WORKING (no changes)                       │
└─────────────────────────────────────────────────────────┘
                          │
                          │ room_id (FK link)
                          ▼
┌─────────────────────────────────────────────────────────┐
│               GAME STATE PERSISTENCE (NEW)              │
│  table: game_states                                     │
│  columns: id, room_id, host_user_id, current_state,    │
│           version, hand_number, dealer_position, ...    │
│  status: ✅ READY TO TEST                              │
└─────────────────────────────────────────────────────────┘
                          │
                          │ in-memory + database
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 GAME ENGINE (Existing)                  │
│  storage: games = new Map()                             │
│  engine: GameStateMachine, BettingEngine, ...           │
│  status: ✅ WORKING (dual-write added)                 │
└─────────────────────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ **Test Phase 1** - Server starts
2. ⏳ **Run Migration** - Create table in Supabase
3. ⏳ **Test Phase 3** - Enable persistence
4. ⏳ **Test Phase 4** - Verify dual-write
5. ⏳ **Test Phase 5** - Verify recovery
6. 🔮 **Future: Link to Rooms** - Connect lobby to games

**You're ready to test! Start with Phase 1.** 🚀

