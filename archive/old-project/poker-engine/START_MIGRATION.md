# 🚀 Migration Start Guide

## What We've Built

I've implemented a **dual-write migration infrastructure** that allows you to gradually migrate from in-memory storage to database persistence **without downtime**.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                 FEATURE FLAGS (Environment Variables)    │
│  USE_DB_REPOSITORY | USE_INPUT_VALIDATION | etc.       │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              STORAGE ADAPTER (Dual Write Pattern)       │
│                                                          │
│  Write Path:                                            │
│   1. Save to in-memory Map (fast, synchronous)         │
│   2. Persist to database (async, non-blocking)         │
│                                                          │
│  Read Path:                                             │
│   1. Check in-memory Map first (cache)                 │
│   2. Fallback to database if not found (hydrate cache) │
└─────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │   In-Memory Map  │    │  GamesRepository │
    │   (fast reads)   │    │   (PostgreSQL)   │
    └──────────────────┘    └──────────────────┘
```

### Key Files Created/Modified

1. **`src/services/database/repos/games.repo.ts`**
   - Database persistence for GameStateModel
   - Optimistic locking with version numbers
   - Atomic updates for concurrency control

2. **`src/services/database/event-store.repo.ts`**
   - Event persistence for full audit trail
   - Ordered event log with sequence numbers

3. **`src/database/connection.ts`**
   - Database connection pool management
   - Health checks and migration support

4. **`sophisticated-engine-server.js`**
   - Feature flags for incremental migration
   - Storage adapter with dual-write pattern
   - Async server startup with database initialization

5. **`database/migrations/add-games-table.sql`**
   - SQL migration to create games table
   - Indexes and triggers for optimal performance

## Testing the Migration

### Phase 1: Test with DB Disabled (Current State)

```bash
# Use existing test.env (USE_DB_REPOSITORY=false)
npm start

# Verify server starts and games work in-memory
# Check logs for migration status
```

Expected output:
```
📊 Migration Status:
  - Database Repository: ❌ DISABLED
  - Input Validation: ❌ DISABLED
  - Auth Middleware: ❌ DISABLED
  - Event Persistence: ❌ DISABLED
```

### Phase 2: Run Database Migration

```bash
# Connect to your Supabase database
# Run the migration
psql $DATABASE_URL -f database/migrations/add-games-table.sql

# OR use Supabase SQL Editor:
# 1. Open Supabase dashboard
# 2. Go to SQL Editor
# 3. Paste contents of add-games-table.sql
# 4. Execute
```

Verify migration:
```sql
-- Check if games table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'games'
ORDER BY ordinal_position;
```

### Phase 3: Enable Database Persistence

```bash
# Edit test.env
USE_DB_REPOSITORY=true

# Restart server
npm start
```

Expected output:
```
🗄️  Initializing database connection...
✅ Database connection established
📊 Migration Status:
  - Database Repository: ✅ ENABLED
```

### Phase 4: Test Dual-Write Behavior

```bash
# Start a game (creates entry in both memory and DB)
# Observe logs:
🔄 [MIGRATION] createGame → IN_MEMORY {"gameId":"game-123"}
🔄 [MIGRATION] createGame → DB_SUCCESS {"gameId":"game-123"}

# Make a move (updates both stores)
🔄 [MIGRATION] saveGame → IN_MEMORY {"gameId":"game-123"}
🔄 [MIGRATION] saveGame → DB_SUCCESS {"gameId":"game-123","version":2}

# Query database to verify persistence:
SELECT id, status, hand_number, total_pot, version 
FROM games 
ORDER BY created_at DESC 
LIMIT 5;
```

### Phase 5: Test Database Recovery

```bash
# 1. Create a game with DB enabled
# 2. Restart server (clears in-memory Map)
# 3. Try to access the game
# 4. Observe log:
🔄 [MIGRATION] getGame → DB_HYDRATE {"gameId":"game-123"}
```

The game state is loaded from database and restored to memory!

## Monitoring Migration

### Check Dual-Write Success Rate

```javascript
// Add to server logs or metrics
console.log('Migration metrics:', {
  inMemoryGames: games.size,
  dbPersistenceEnabled: MIGRATION_FLAGS.USE_DB_REPOSITORY,
  // Add counters for success/failure rates
});
```

### Database Queries for Monitoring

```sql
-- Count active games
SELECT COUNT(*) as active_games 
FROM games 
WHERE status IN ('waiting', 'active');

-- Check version distribution (detect concurrency issues)
SELECT version, COUNT(*) as count 
FROM games 
GROUP BY version 
ORDER BY version;

-- Recent game activity
SELECT id, status, hand_number, updated_at 
FROM games 
ORDER BY updated_at DESC 
LIMIT 10;
```

## Rollback Plan

If database issues occur:

```bash
# 1. Set flag to false
USE_DB_REPOSITORY=false

# 2. Restart server
npm start

# Server continues with in-memory storage only
# No code changes needed!
```

## Next Steps

Once dual-write is stable:

1. **Add Event Persistence** (USE_EVENT_PERSISTENCE=true)
   - Store all game events for complete audit trail
   - Enable event replay for debugging

2. **Add Input Validation** (USE_INPUT_VALIDATION=true)
   - Use Zod schemas to validate all inputs
   - Prevent invalid data from reaching game engine

3. **Add Auth Middleware** (USE_AUTH_MIDDLEWARE=true)
   - Protect endpoints with JWT verification
   - Rate limiting and security headers

4. **Gradual Cutover**
   - Monitor database for 1-2 weeks
   - Verify no data loss or corruption
   - Eventually remove in-memory Map entirely

## Troubleshooting

### "Database connection failed"
- Check DATABASE_URL in test.env
- Verify Supabase is accessible
- Check firewall/network settings

### "Version conflict for game X"
- Indicates concurrent updates (expected in multiplayer)
- Optimistic locking is working correctly
- Game continues with in-memory state

### "DB persist failed"
- Non-blocking error, game continues
- Check database logs for specific error
- Verify migration ran successfully

### "Game not found" after restart
- Normal if USE_DB_REPOSITORY=false
- Enable flag and recreate game to persist

## Reprompt Instructions (If Something Breaks)

If testing reveals issues, reprompt with:

```
"The migration infrastructure is in place but [specific issue]. 
I need you to:
1. [Describe the exact problem]
2. Fix it using the same dual-write pattern (don't break existing functionality)
3. Provide testing steps to verify the fix
4. Explain what went wrong and how the fix works

Key context:
- USE_DB_REPOSITORY flag controls migration
- StorageAdapter does dual-write (memory + DB)
- games Map is still the primary source of truth
- Database is async backup that doesn't block operations"
```

## Success Criteria

✅ Server starts with both DB flags (true/false)  
✅ Games work identically with flag disabled (in-memory only)  
✅ Games persist to DB when flag enabled  
✅ Games reload from DB after server restart  
✅ No errors or crashes during normal gameplay  
✅ Migration logs show dual-write working  
✅ Database queries show correct game data  

---

**Ready to test! Start with Phase 1 and work through each phase.**

