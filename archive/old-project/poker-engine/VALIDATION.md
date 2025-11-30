# 🎯 Validation Guide - Full Schema Persistence

## ✅ What Was Implemented

### 1. Direct-to-Table Redirect (FIXED!)
- **Fixed:** Both host and guests redirect to `/poker` and GO STRAIGHT TO TABLE
- **Auto-Join:** Lines 4119-4340 detect `?room=X&gameId=Y` 
- **FORCE SHOW:** Line 4165-4175 uses `setProperty('display', 'block', 'important')` to override CSS `!important`
- **Hides:** Landing page, lobby, all modals with inline `!important` styles
- **Shows:** `.main-container` (line 1602) - the REAL poker table with seats, pot, cards
- **Host:** Line 1436-1438 in `play.html` redirects to `/poker?room=X&gameId=Y`
- **Guests:** Line 549-551 via `game_started` event redirects to `/poker?room=X&gameId=Y`
- **Result:** ✅ DIRECT TO TABLE - No lounge, no lobby, just poker!

### 2. Logging Overhaul  
- **Created:** `src/utils/logger.ts` - Structured logging system
- **Categories:** STARTUP, DATABASE, MIGRATION, GAME, WEBSOCKET, AUTH, API, RECOVERY, PERSIST, EVENT
- **Levels:** DEBUG, INFO, SUCCESS, WARN, ERROR, CRITICAL
- **Integrated:** Throughout `sophisticated-engine-server.js`

### 3. Full Schema Persistence
- **Created:** `src/services/database/repos/full-game.repo.ts`
- **Populates Tables:**
  - ✅ `games` - Game metadata (UUID-based)
  - ✅ `game_states` - Full game snapshots (text ID-based)
  - ✅ `hands` - Individual hand records
  - ✅ `actions` - Every player action with sequence
  - ✅ `hand_history` - Completed hands with community cards & winners
  - ✅ `player_hand_history` - Per-player hand results
  - ✅ `player_statistics` - Aggregated player stats (hands played/won)

### 4. Event Persistence (✅ ENABLED)
- **Fixed:** Changed from `PostgresEventStore` to `EventStoreRepository`
- **Writes to:** `game_events` table (correct schema)
- **EventBus:** Now properly initialized with correct EventStore
- **GameStateMachine:** Integrated with EventBus for automatic event publishing

### 5. Input Validation (✅ ENABLED)
- **Created:** `validateGameAction` middleware
- **Validates:** player_id, action type, amount
- **Applied to:** `POST /api/games/:id/actions`

### 6. Auth Middleware (✅ ENABLED)
- **Created:** `authenticateUser` middleware
- **Uses:** JWT token verification
- **Ready for:** Protected routes (currently optional)

### 7. Integration Points
- **Game Creation:** `POST /api/games` - Creates records in `games` + `game_states` + links to `rooms`
- **Hand Start:** `POST /api/games/:id/start-hand` - Creates record in `hands`
- **Player Action:** `POST /api/games/:id/actions` - Creates record in `actions` + validates input
- **Hand Completion:** Auto-detects and creates records in `hand_history`, `player_hand_history`, `player_statistics`
- **Event Stream:** All game events are persisted to `game_events` table

## 🧪 How to Test

### Step 1: Start the Server
```bash
cd poker-engine
node sophisticated-engine-server.js
```

**Expected Logs:**
```
✅ GameStatesRepository initialized (database persistence active)
✅ FullGameRepository initialized (full schema persistence active)
✅ EventStore initialized
✅ EventBus initialized
✅ GameStateMachine initialized with EventBus
✅ Event handlers registered
✅ GameApplicationService initialized

📊 Migration Status:
  - Database Repository: ✅ ENABLED
  - Input Validation: ✅ ENABLED
  - Auth Middleware: ✅ ENABLED
  - Event Persistence: ✅ ENABLED
```

### Step 2: Create a Room & Start Game
1. Navigate to `http://localhost:3000/play`
2. Sign in with Google
3. Create a room
4. Approve yourself (host is auto-approved)
5. Click "Start Game"

**Expected:**
- ✅ Redirects to `/poker?room={roomId}&gameId={gameId}`
- ✅ **DIRECTLY TO THE TABLE** - No lounge/lobby screens
- ✅ See 9-seat grid, pot display, community cards area
- ✅ See action buttons panel at bottom
- ✅ Host sees admin controls (if host)
- ✅ Backend logs: `[SUCCESS] [GAME] Game created successfully`
- ✅ Backend logs: `[SUCCESS] [PERSIST] Game persisted to full schema`

**Browser Console Must Show:**
```
🎯 AUTO-JOIN: ROOM DETECTED Room: {roomId} Game: {gameId}
🎯 AUTO-JOIN: Hidden landing page
🎯 AUTO-JOIN: Hidden lobby panel
🎯 AUTO-JOIN: ✅ POKER TABLE FORCED VISIBLE  ← KEY LOG!
✅ Seats loaded
🎉 AUTO-JOIN COMPLETE - Poker table fully initialized!
```

**If you see:**
- ❌ "Poker Lounge" screen → Auto-join failed, check console for errors
- ❌ "Create Game" buttons → URL params missing or wrong
- ❌ `.main-container NOT FOUND` → Critical DOM error

### Step 3: Play a Hand
1. You're on `/poker` - should see 9 seat grid, pot, community cards
2. Click "Claim Seat" to sit at table
3. Host clicks "Start Game" button (admin panel)
4. Host clicks "Start Hand" to deal cards
5. Play through a hand (check, call, bet, etc.)

**Expected Logs:**
- `[SUCCESS] [GAME] Hand started`
- `[SUCCESS] [PERSIST] Hand persisted to database`
- `[SUCCESS] [GAME] Action processed` (for each action)
- `[DEBUG] [PERSIST] Action persisted to database` (for each action)
- `[SUCCESS] [PERSIST] Hand completed and persisted` (at showdown)

### Step 4: Check Database

```sql
-- Check games table (UUID primary key)
SELECT id, room_id, status FROM games ORDER BY started_at DESC LIMIT 5;

-- Check game_states table (text primary key)
SELECT id, room_id, status, hand_number, total_pot FROM game_states ORDER BY created_at DESC LIMIT 5;

-- Check hands table
SELECT id, game_id, hand_number, status, current_street FROM hands ORDER BY created_at DESC LIMIT 5;

-- Check actions table
SELECT hand_id, user_id, action_type, amount, street, sequence_number FROM actions ORDER BY created_at DESC LIMIT 10;

-- Check hand_history table
SELECT game_id, hand_number, pot_size, winners FROM hand_history ORDER BY created_at DESC LIMIT 5;

-- Check player_hand_history table
SELECT user_id, hand_number, pot_contribution, pot_winnings, net_hand_result FROM player_hand_history ORDER BY hand_ended_at DESC LIMIT 5;

-- Check player_statistics table
SELECT user_id, total_hands_played, total_hands_won FROM player_statistics;
```

**Expected:** All tables have data populated correctly with foreign key relationships intact.

### Step 5: Test Recovery (Optional)
1. Play a hand
2. Refresh the page (F5)

**Expected:**
- ✅ Game state recovers from database
- ✅ You see the correct hand number, pot, and player stacks
- ✅ Logs show: `[SUCCESS] [RECOVERY] Game recovered successfully`

## 🔥 Common Issues

### Issue: "Failed to initialize repositories"
**Fix:** Ensure `.env` has:
```
USE_DB_REPOSITORY=true
USE_INPUT_VALIDATION=true
USE_AUTH_MIDDLEWARE=true
USE_EVENT_PERSISTENCE=true
```

### Issue: Foreign key violations in database
**Fix:** Run migrations:
```bash
node run-all-migrations.js
```

### Issue: Players see "Poker Lounge" instead of table
**Cause:** Auto-join code (line 4119) requires URL params `?room=X&gameId=Y`
**Fix:** Redirects now include these params (lines 1457, 549 in play.html)
**Check console:** Should see "🎯 AUTO-JOIN: Showing poker table"

### Issue: Logs are too verbose
**Fix:** Set in `.env`:
```
LOG_LEVEL=warn
```

## 📊 Success Criteria

- ✅ Both redirect to `/poker` and auto-join shows table (not lounge)
- ✅ Logs are structured and readable
- ✅ All 4 migration flags enabled and working
- ✅ At least 8 tables populated: `games`, `game_states`, `game_events`, `hands`, `actions`, `hand_history`, `player_hand_history`, `player_statistics`
- ✅ Game state persists across page refreshes
- ✅ Input validation rejects invalid actions
- ✅ No TypeScript compilation errors
- ✅ No runtime errors during gameplay

## 🚀 Next Steps (Not Done Yet)

These are planned for future phases:
- [ ] Modularize API routes into separate files
- [ ] Add input validation middleware (Zod schemas)
- [ ] Add authentication middleware
- [ ] Add rate limiting
- [ ] Populate remaining tables (pots, chips_transactions, player_game_history, etc.)
- [ ] Full event sourcing (replaying from game_events)

