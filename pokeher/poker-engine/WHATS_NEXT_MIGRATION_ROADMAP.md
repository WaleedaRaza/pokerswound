# 🗺️ Migration Roadmap - What's Next

**Current Status:** ✅ Phase 1 Complete - Infrastructure Ready  
**Next Phase:** 🧪 Phase 2 - Testing & Validation  
**Date:** October 22, 2025

---

## 📍 Where We Are Now

### ✅ Completed (Phase 1 - Infrastructure):
- [x] Feature flags implemented and working
- [x] Database schema created (`game_states`, `game_events`)
- [x] Dual-write StorageAdapter implemented
- [x] GameStatesRepository built and integrated
- [x] EventStoreRepository built and integrated
- [x] Server startup with async database initialization
- [x] Optimistic locking for concurrency
- [x] Comprehensive documentation

### 🎯 Current State:
```
📊 Migration Status:
  - Database Repository: ✅ ENABLED
  - Event Persistence: ✅ ENABLED
  - Input Validation: ❌ DISABLED
  - Auth Middleware: ❌ DISABLED
```

**Database:**
- `game_states`: 0 rows (ready)
- `game_events`: 0 rows (ready)
- All indexes created
- Foreign keys active

---

## 🚀 Phase 2: Testing & Validation (NEXT - Days 1-3)

### Day 1: End-to-End Game Testing

#### Test 1: Complete Game Flow ⏰ 30 minutes
**Goal:** Verify dual-write pattern works in production

**Steps:**
1. **Start server** (if not running)
   ```bash
   cd pokeher/poker-engine
   npm start
   ```

2. **Open browser** → `http://localhost:3000/poker`

3. **Play a complete game:**
   - Create room
   - Join with 2+ players
   - Play from PREFLOP → SHOWDOWN
   - Complete the hand

4. **Check logs for dual-write:**
   ```
   Expected logs:
   🔄 [MIGRATION] createGame → IN_MEMORY {"gameId":"..."}
   🔄 [MIGRATION] createGame → DB_SUCCESS {"gameId":"..."}
   🔄 [MIGRATION] saveGame → IN_MEMORY {"gameId":"..."}
   🔄 [MIGRATION] saveGame → DB_SUCCESS {"gameId":"...","version":2}
   ```

5. **Verify database:**
   ```sql
   -- In Supabase SQL Editor:
   SELECT * FROM game_states ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM game_events ORDER BY created_at DESC LIMIT 20;
   ```

**Success Criteria:**
- ✅ Game completes without errors
- ✅ Dual-write logs appear
- ✅ Database has 1+ rows in `game_states`
- ✅ Database has 10+ rows in `game_events`

---

#### Test 2: Database Persistence Verification ⏰ 15 minutes
**Goal:** Confirm data is correctly stored

**Steps:**
1. **Query game state:**
   ```sql
   SELECT 
     id,
     room_id,
     status,
     hand_number,
     total_pot,
     version,
     jsonb_pretty(current_state) as state
   FROM game_states
   LIMIT 1;
   ```

2. **Verify structure:**
   - ✅ `room_id` is linked (not NULL if from room)
   - ✅ `current_state` JSONB has all fields
   - ✅ `version` > 1 (increments on updates)
   - ✅ `status` reflects game state

3. **Query events:**
   ```sql
   SELECT 
     game_id,
     event_type,
     sequence,
     jsonb_pretty(event_data) as data
   FROM game_events
   WHERE game_id = 'YOUR_GAME_ID'
   ORDER BY sequence;
   ```

4. **Verify event sequence:**
   - ✅ Events are sequential (1, 2, 3, ...)
   - ✅ No gaps in sequence
   - ✅ Event types make sense (GameCreated, PlayerAction, etc.)

**Success Criteria:**
- ✅ Complete game snapshot in JSONB
- ✅ Sequential events with no gaps
- ✅ All player actions recorded

---

#### Test 3: Crash Recovery ⏰ 20 minutes
**Goal:** Verify games survive server restarts

**Steps:**
1. **Start a game** (don't finish it)
2. **Note the game ID** from logs
3. **Stop server** (Ctrl+C)
4. **Restart server:** `npm start`
5. **Look for recovery logs:**
   ```
   Expected:
   🔄 Checking for incomplete games to recover...
   🔍 Found X incomplete games
   🔄 [MIGRATION] getGame → DB_HYDRATE {"gameId":"..."}
   ```
6. **Try to resume game** (if UI supports it)

**Success Criteria:**
- ✅ Server finds incomplete games
- ✅ Game state loads from database
- ✅ Game can continue from last state

---

### Day 2: Performance & Edge Cases

#### Test 4: Concurrent Updates ⏰ 30 minutes
**Goal:** Verify optimistic locking works

**Steps:**
1. Open developer tools
2. Simulate rapid actions (or multiple players)
3. Check for version conflict warnings:
   ```
   Expected (rare):
   ⚠️ [MIGRATION] Version conflict for game game-xyz
   ```
4. Verify game continues without data loss

**Success Criteria:**
- ✅ No crashes on concurrent updates
- ✅ Version conflicts detected (if they occur)
- ✅ Game state remains consistent

---

#### Test 5: Database Failure Handling ⏰ 20 minutes
**Goal:** Verify game continues if DB fails

**Steps:**
1. **Simulate DB failure:**
   - Edit `.env`: set invalid `DATABASE_URL`
   - OR pause Supabase instance
2. **Restart server**
3. **Try to play game**
4. **Check logs:**
   ```
   Expected:
   ❌ [MIGRATION] DB persist failed: connection timeout
   🔄 [MIGRATION] saveGame → IN_MEMORY (fallback)
   ```

**Success Criteria:**
- ✅ Game continues to work (memory-only)
- ✅ No crashes or hangs
- ✅ Clear error logs
- ✅ Server stays responsive

---

#### Test 6: Event Replay ⏰ 45 minutes
**Goal:** Reconstruct game state from events

**Steps:**
1. **Play a complete game**
2. **Get all events:**
   ```sql
   SELECT event_type, event_data, sequence
   FROM game_events
   WHERE game_id = 'YOUR_GAME_ID'
   ORDER BY sequence;
   ```

3. **Create replay script:**
   ```javascript
   // test-event-replay.js
   const { EventReplayer } = require('./dist/application/services/EventReplayer');
   const { GameStateModel } = require('./dist/core/models/game-state');
   
   async function replayGame(gameId) {
     const events = await loadEventsFromDB(gameId);
     const replayer = new EventReplayer(stateMachine);
     const reconstructedState = await replayer.replay(events);
     
     // Compare with snapshot
     const snapshotState = await gamesRepository.findById(gameId);
     
     console.log('Match:', JSON.stringify(reconstructedState) === JSON.stringify(snapshotState));
   }
   ```

4. **Run replay**
5. **Compare:** Replayed state vs Database snapshot

**Success Criteria:**
- ✅ All events load successfully
- ✅ State reconstructs without errors
- ✅ Reconstructed state matches snapshot

---

### Day 3: Monitoring & Metrics

#### Test 7: Performance Benchmarking ⏰ 30 minutes
**Goal:** Measure dual-write overhead

**Steps:**
1. **Baseline test** (DB enabled):
   - Play 10 complete hands
   - Note average action response time
   
2. **Comparison test** (DB disabled):
   - Set `USE_DB_REPOSITORY=false`
   - Play 10 complete hands
   - Note average action response time

3. **Calculate overhead:**
   ```
   Overhead = (DB_enabled_time - DB_disabled_time) / DB_disabled_time * 100
   ```

**Success Criteria:**
- ✅ Overhead < 20% (acceptable)
- ✅ No noticeable lag in UI
- ✅ Database queries under 50ms average

---

#### Test 8: Database Growth Analysis ⏰ 15 minutes
**Goal:** Understand storage requirements

**Steps:**
1. **Play 10 complete games**
2. **Query database size:**
   ```sql
   SELECT 
     table_name,
     pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size,
     (SELECT COUNT(*) FROM game_states) as game_states_count,
     (SELECT COUNT(*) FROM game_events) as game_events_count
   FROM information_schema.tables
   WHERE table_name IN ('game_states', 'game_events');
   ```

3. **Calculate averages:**
   - Average game size
   - Average events per game
   - Storage per 1000 games

**Success Criteria:**
- ✅ Reasonable storage usage
- ✅ Predictable growth rate
- ✅ Indexes effective

---

## 🔧 Phase 3: Input Validation (Days 4-7)

### Goal: Enable `USE_INPUT_VALIDATION=true`

**Tasks:**
1. **Create Zod schemas** for all input types ⏰ 4 hours
   ```typescript
   // src/validation/game-schemas.ts
   import { z } from 'zod';
   
   export const PlayerActionSchema = z.object({
     gameId: z.string().uuid(),
     playerId: z.string().uuid(),
     action: z.enum(['FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN']),
     amount: z.number().int().min(0).optional()
   });
   
   export const CreateGameSchema = z.object({
     roomId: z.string().uuid(),
     hostUserId: z.string(),
     configuration: z.object({
       smallBlind: z.number().int().min(1),
       bigBlind: z.number().int().min(2),
       maxPlayers: z.number().int().min(2).max(10),
       // ... more fields
     })
   });
   ```

2. **Create validation middleware** ⏰ 2 hours
   ```javascript
   // src/middleware/validate.js
   function validateRequest(schema) {
     return (req, res, next) => {
       try {
         const validated = schema.parse(req.body);
         req.validated = validated;
         next();
       } catch (error) {
         res.status(400).json({
           error: 'Validation failed',
           details: error.errors
         });
       }
     };
   }
   ```

3. **Apply to all endpoints** ⏰ 3 hours
   ```javascript
   app.post('/api/game/:gameId/action',
     validateRequest(PlayerActionSchema),
     async (req, res) => {
       const { playerId, action, amount } = req.validated;
       // ... process action
     }
   );
   ```

4. **Test validation** ⏰ 2 hours
   - Test valid inputs (should pass)
   - Test invalid inputs (should reject)
   - Check error messages are helpful

**Success Criteria:**
- ✅ All inputs validated before processing
- ✅ Clear error messages for invalid data
- ✅ No performance impact
- ✅ Type safety improved

---

## 🔐 Phase 4: Auth Middleware (Days 8-12)

### Goal: Enable `USE_AUTH_MIDDLEWARE=true`

**Tasks:**
1. **JWT verification middleware** ⏰ 3 hours
   ```javascript
   async function authenticateJWT(req, res, next) {
     const token = req.headers.authorization?.replace('Bearer ', '');
     
     if (!token) {
       return res.status(401).json({ error: 'No token provided' });
     }
     
     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       req.user = decoded;
       next();
     } catch (error) {
       res.status(401).json({ error: 'Invalid token' });
     }
   }
   ```

2. **Apply to protected routes** ⏰ 2 hours
   ```javascript
   app.post('/api/rooms',
     authenticateJWT,  // ← Add middleware
     validateRequest(CreateRoomSchema),
     async (req, res) => {
       const userId = req.user.id;  // ← From JWT
       // ... create room
     }
   );
   ```

3. **Token refresh logic** ⏰ 4 hours
   - Implement refresh token endpoint
   - Add token expiry handling
   - Test refresh flow

4. **Session management** ⏰ 5 hours
   - Store active sessions in `user_sessions` table
   - Handle logout (revoke tokens)
   - Implement "remember me" feature

**Success Criteria:**
- ✅ All protected routes require auth
- ✅ Invalid tokens rejected
- ✅ Token refresh works
- ✅ Sessions tracked in database

---

## 📈 Phase 5: Rate Limiting (Days 13-15)

### Goal: Prevent abuse and ensure fair usage

**Tasks:**
1. **Install rate limiting library** ⏰ 1 hour
   ```bash
   npm install express-rate-limit
   ```

2. **Configure rate limiters** ⏰ 2 hours
   ```javascript
   const rateLimit = require('express-rate-limit');
   
   const gameActionLimiter = rateLimit({
     windowMs: 1000,  // 1 second
     max: 5,  // 5 actions per second max
     message: 'Too many actions, please slow down'
   });
   
   const apiLimiter = rateLimit({
     windowMs: 60000,  // 1 minute
     max: 100,  // 100 requests per minute
     message: 'Too many requests, please try again later'
   });
   ```

3. **Apply to endpoints** ⏰ 2 hours
   ```javascript
   app.post('/api/game/:gameId/action',
     gameActionLimiter,  // ← Add rate limiting
     authenticateJWT,
     validateRequest(PlayerActionSchema),
     async (req, res) => {
       // ... process action
     }
   );
   ```

4. **Test rate limiting** ⏰ 2 hours
   - Send rapid requests
   - Verify 429 responses
   - Check legitimate use not affected

**Success Criteria:**
- ✅ Rapid requests rejected with 429
- ✅ Normal gameplay not affected
- ✅ Rate limits configurable per endpoint

---

## 🏗️ Phase 6: Route Modularization (Days 16-25)

### Goal: Extract routes from monolithic server

**Current State:**
```javascript
// sophisticated-engine-server.js (2,500 lines)
app.get('/api/rooms', ...);
app.post('/api/rooms', ...);
app.get('/api/games/:id', ...);
// ... 50+ routes inline
```

**Target State:**
```javascript
// sophisticated-engine-server.js (500 lines)
const roomsRouter = require('./routes/rooms');
const gamesRouter = require('./routes/games');
const actionsRouter = require('./routes/actions');

app.use('/api/rooms', roomsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/actions', actionsRouter);
```

**Tasks:**
1. **Create route modules** ⏰ 8 hours
   - `routes/rooms.js` (room CRUD)
   - `routes/games.js` (game management)
   - `routes/actions.js` (player actions)
   - `routes/seats.js` (seat management)

2. **Create controller layer** ⏰ 10 hours
   - `controllers/RoomsController.js`
   - `controllers/GamesController.js`
   - Separate business logic from routing

3. **Move business logic to services** ⏰ 12 hours
   - `services/RoomService.js`
   - `services/GameService.js`
   - Clean separation of concerns

4. **Update tests** ⏰ 10 hours
   - Unit tests for controllers
   - Integration tests for routes
   - E2E tests for complete flows

**Success Criteria:**
- ✅ Main server file < 500 lines
- ✅ Routes organized by domain
- ✅ Business logic in service layer
- ✅ All tests passing

---

## 🎨 Phase 7: Frontend Migration (Days 26-60)

### Goal: Replace vanilla JS with modern framework

**Current State:**
- Vanilla JavaScript
- jQuery-like DOM manipulation
- Mixed concerns (logic + UI)
- No state management

**Target State:**
- React/Vue/Svelte
- Component-based architecture
- Centralized state management
- Type-safe with TypeScript

**Tasks:**
1. **Choose framework** ⏰ 2 hours (React recommended)
2. **Setup build pipeline** ⏰ 4 hours (Vite)
3. **Component architecture** ⏰ 16 hours
   - `<Lobby />` component
   - `<GameTable />` component
   - `<PlayerHand />` component
   - `<ActionButtons />` component

4. **State management** ⏰ 12 hours
   - Redux/Zustand/Context
   - WebSocket integration
   - Optimistic updates

5. **Migrate pages** ⏰ 40+ hours
   - `index.html` → `<HomePage />`
   - `poker.html` → `<GamePage />`
   - `play.html` → `<LobbyPage />`
   - etc.

**Success Criteria:**
- ✅ Modern UI framework
- ✅ Component reusability
- ✅ Improved performance
- ✅ Better developer experience

---

## 📊 Summary Timeline

| Phase | Description | Duration | Status |
|-------|-------------|----------|--------|
| **Phase 1** | Infrastructure Setup | Complete | ✅ DONE |
| **Phase 2** | Testing & Validation | 3 days | 🔜 NEXT |
| **Phase 3** | Input Validation | 4 days | 📋 Planned |
| **Phase 4** | Auth Middleware | 5 days | 📋 Planned |
| **Phase 5** | Rate Limiting | 3 days | 📋 Planned |
| **Phase 6** | Route Modularization | 10 days | 📋 Planned |
| **Phase 7** | Frontend Migration | 35 days | 📋 Planned |

**Total Estimated Time:** ~60 days (part-time)

---

## 🎯 Immediate Action Items

### Right Now (Next 30 Minutes):

1. **✅ Verify server is running:**
   ```bash
   curl http://localhost:3000
   ```

2. **🧪 Play a test game:**
   - Open http://localhost:3000/poker
   - Complete one full hand
   - Watch console for migration logs

3. **📊 Check database:**
   ```sql
   SELECT COUNT(*) FROM game_states;
   SELECT COUNT(*) FROM game_events;
   ```

4. **📝 Document results:**
   - Did dual-write work?
   - Any errors in logs?
   - Data in database?

### This Week:

- [ ] Complete all Day 1 tests
- [ ] Complete all Day 2 tests  
- [ ] Complete all Day 3 tests
- [ ] Write test report
- [ ] Plan Phase 3 implementation

### This Month:

- [ ] Phase 2 complete (Testing)
- [ ] Phase 3 complete (Validation)
- [ ] Phase 4 complete (Auth)
- [ ] Phase 5 complete (Rate Limiting)
- [ ] Start Phase 6 (Routes)

---

## 🚨 Blockers & Risks

### Potential Issues:

1. **Performance degradation**
   - **Risk:** Dual-write adds latency
   - **Mitigation:** Async DB writes, monitoring, caching

2. **Database connection failures**
   - **Risk:** Supabase downtime breaks games
   - **Mitigation:** Fallback to memory, retry logic

3. **Concurrency conflicts**
   - **Risk:** Version conflicts on high traffic
   - **Mitigation:** Optimistic locking, retry logic

4. **Event replay bugs**
   - **Risk:** Replayed state doesn't match snapshot
   - **Mitigation:** Comprehensive tests, event versioning

---

## 📞 Support Resources

**Documentation:**
- `COMPLETE_MIGRATION_STATUS.md` - Full status report
- `MIGRATION_PROGRESS_REPORT.md` - Detailed progress
- `TECHNICAL_DEBT_AUDIT.md` - Architecture analysis
- `START_MIGRATION.md` - Testing guide

**Code References:**
- `sophisticated-engine-server.js` (lines 55-214) - StorageAdapter
- `src/services/database/repos/game-states.repo.ts` - Game persistence
- `src/services/database/event-store.repo.ts` - Event sourcing

**Database Schema:**
- `database/migrations/add-game-states-table.sql`
- `database/migrations/add-game-events-table.sql`

---

## 🎉 Success Metrics

**Phase 2 Success (Testing):**
- [ ] 10+ games played without errors
- [ ] 100% dual-write success rate
- [ ] Crash recovery working
- [ ] Event replay successful
- [ ] Performance acceptable (<20% overhead)

**Overall Migration Success:**
- [ ] Zero downtime deployment
- [ ] All features working
- [ ] Database fully integrated
- [ ] Event sourcing operational
- [ ] Documentation complete
- [ ] Team trained

---

**🎯 Your Next Step: Test the migration with a real game!**

Visit http://localhost:3000/poker and play a complete hand, then check the database! 🚀

