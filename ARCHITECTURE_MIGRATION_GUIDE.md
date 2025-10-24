# 🏗️ Architecture Migration Guide - Detailed Technical Context

**Purpose:** Deep architectural context for migrating from monolith to modular, scalable production architecture  
**Companion to:** PROJECT_MASTER.md  
**Last Updated:** October 23, 2025

---

## 📊 CURRENT STATE: DUAL ARCHITECTURE ANALYSIS

### The Reality: Two Systems Running in Parallel

You currently have **TWO complete architectures**:

1. **Working Monolith** (2,746 lines) - What actually runs
2. **Modern TypeScript Architecture** (99 files) - What's partially built but not fully integrated

**Critical Understanding:** The migration is NOT about building from scratch. It's about **completing the integration** of the modern architecture that already exists.

---

## 🎯 ARCHITECTURE 1: The Monolith (Current Production)

### File: `sophisticated-engine-server.js` (2,746 lines)

**What it does:** Everything. This single file handles:
- HTTP server setup (Express)
- Database connection pooling
- REST API endpoints (15+ routes)
- WebSocket handlers (Socket.IO)
- Game state management (in-memory Map)
- Room/lobby logic
- Authentication middleware
- Static file serving

**Structure Breakdown:**
```javascript
Lines 1-100:    Imports & Dependencies
Lines 101-287:  Database Connection Setup
Lines 288-800:  REST API Endpoints (inline)
  - POST /api/rooms (create room)
  - GET /api/rooms/:id (get room)
  - POST /api/rooms/:id/join (join room)
  - POST /api/rooms/:id/seats (claim seat)
  - POST /api/games (create game)
  - GET /api/games/:id (get game state)
  - POST /api/games/:id/action (player action)
  - ... 8 more endpoints

Lines 801-1500: Game Engine Integration
  - Imports compiled TypeScript (GameStateMachine, BettingEngine, etc.)
  - Initializes game state store (Map)
  - Sets up event sourcing infrastructure
  - Initializes CQRS services (CommandBus, QueryBus, EventBus)

Lines 1501-2000: Helper Functions
  - Room management utilities
  - Player management utilities
  - Database query helpers
  - State serialization

Lines 2001-2746: WebSocket Handlers (inline)
  - join_room event
  - leave_room event
  - player_action event
  - chat_message event
  - spectate event
  - ... 10+ more events
```

**Problems:**
1. **Cannot test in isolation** - Everything is coupled
2. **Hard to reason about** - Too much context in one place
3. **Merge conflicts inevitable** - All changes touch same file
4. **90-hour bugs** - Routing changes break authentication, etc.
5. **Cannot scale team** - Only one person can work on server at a time
6. **No microservices possible** - Everything is bundled

**What's Actually Good:**
- ✅ Works reliably
- ✅ Imports modern TypeScript components
- ✅ Has dual-write infrastructure
- ✅ Has feature flags
- ✅ Can be gradually replaced

---

## 🎯 ARCHITECTURE 2: Modern TypeScript (Partially Integrated)

### Directory: `src/` (99 TypeScript files, ~15,000 lines)

**What it is:** A complete CQRS/Event Sourcing/DDD architecture **already built** but not fully wired to the monolith.

### Layer 1: Domain Layer (Core Game Logic)
**Location:** `src/core/`

```typescript
core/
├── card/
│   ├── card.ts              // Card model (rank, suit)
│   ├── deck.ts              // Deck with shuffling
│   ├── rank.ts              // Card rank enum
│   └── suit.ts              // Card suit enum
│
├── engine/
│   ├── game-state-machine.ts    // ✅ Main game flow controller
│   ├── betting-engine.ts         // ✅ Betting logic & validation
│   ├── hand-evaluator.ts         // ✅ Poker hand rankings
│   ├── enhanced-hand-evaluator.ts// ✅ Advanced evaluation
│   ├── pot-manager.ts            // ✅ Pot calculations
│   ├── round-manager.ts          // ✅ Betting round control
│   ├── turn-manager.ts           // ✅ Turn order logic
│   └── action-validator.ts       // ✅ Action validation
│
└── models/
    ├── game-state.ts        // ✅ Complete game state model
    ├── player.ts            // ✅ Player model
    └── table.ts             // ✅ Table configuration
```

**Status:** ✅ **100% Complete and Working**
- Imported by monolith (line 13-19 of sophisticated-engine-server.js)
- Used for ALL game logic
- Battle-tested through hundreds of games

### Layer 2: Application Layer (CQRS/Event Sourcing)
**Location:** `src/application/`

```typescript
application/
├── commands/
│   ├── CommandBus.ts                    // ✅ Command dispatcher
│   ├── CreateGame/
│   │   ├── CreateGameCommand.ts         // ✅ Command DTO
│   │   └── CreateGameHandler.ts         // ✅ Command handler
│   ├── ProcessPlayerAction/
│   │   ├── ProcessPlayerActionCommand.ts // ✅ Command DTO
│   │   └── ProcessPlayerActionHandler.ts // ✅ Handler
│   ├── StartHand/
│   │   ├── StartHandCommand.ts          // ✅ Command DTO
│   │   └── StartHandHandler.ts          // ✅ Handler
│   └── ... (6 more command types)
│
├── queries/
│   ├── QueryBus.ts                      // ✅ Query dispatcher
│   ├── GetGameState/
│   │   ├── GetGameStateQuery.ts         // ✅ Query DTO
│   │   └── GetGameStateHandler.ts       // ✅ Query handler
│   ├── GetPlayerStats/
│   │   ├── GetPlayerStatsQuery.ts       // ✅ Query DTO
│   │   └── GetPlayerStatsHandler.ts     // ✅ Handler
│   └── ... (4 more query types)
│
├── events/
│   ├── EventBus.ts                      // ✅ Event pub/sub system
│   ├── EventHandler.ts                  // ✅ Base handler interface
│   └── handlers/
│       ├── GameEventHandler.ts          // ✅ Game event processor
│       └── WebSocketEventHandler.ts     // ✅ Real-time broadcaster
│
├── services/
│   ├── GameApplicationService.ts        // ✅ Main orchestrator
│   ├── EventReplayer.ts                 // ✅ Crash recovery
│   └── DisplayStateManager.ts           // ✅ UI state manager
│
└── readmodels/
    ├── GameReadModel.ts                 // ⏳ Query optimization (not used)
    ├── PlayerReadModel.ts               // ⏳ Player stats (not used)
    └── RoomReadModel.ts                 // ⏳ Room cache (not used)
```

**Status:** ✅ **90% Complete**
- CommandBus, QueryBus, EventBus fully implemented
- GameApplicationService integrated in monolith (line 30)
- Handlers exist for all game operations
- **Missing:** API endpoints don't call CommandBus (they call game engine directly)

**What this enables:**
- Commands are logged → audit trail
- Events are published → other systems can react
- Queries are optimized → fast reads
- Handlers are testable → unit test each operation

### Layer 3: Infrastructure Layer (Persistence)
**Location:** `src/services/database/` and `src/database/`

```typescript
database/
└── connection.ts            // ✅ PostgreSQL pool management

services/database/
├── repos/
│   ├── game-states.repo.ts        // ✅ Game state CRUD
│   ├── full-game.repo.ts          // ✅ Complete game data
│   ├── games.repo.ts              // ✅ Game metadata
│   ├── hands.repo.ts              // ⏳ Hand history (exists, not used)
│   ├── actions.repo.ts            // ⏳ Action log (exists, not used)
│   ├── players.repo.ts            // ⏳ Player data (exists, not used)
│   └── pots.repo.ts               // ⏳ Pot history (exists, not used)
│
├── event-store.repo.ts      // ✅ Event sourcing persistence
├── concurrency-manager.ts   // ⏳ Optimistic locking (exists, not used)
└── transaction-manager.ts   // ❌ Transaction support (excluded from build)
```

**Status:** ✅ **80% Complete**
- Connection pooling works
- GameStatesRepository fully functional
- EventStoreRepository functional
- Optimistic locking implemented (version field)
- **Missing:** Most repos not called (monolith uses raw SQL)

**Database Schema (Already Created):**

```sql
-- Game State Persistence
game_states (
  id TEXT PRIMARY KEY,
  room_id UUID REFERENCES rooms(id),  -- ⭐ Links to lobby
  host_user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  current_state JSONB NOT NULL,       -- Complete game snapshot
  hand_number INT DEFAULT 0,
  dealer_position INT,
  total_pot INT DEFAULT 0,
  version INT DEFAULT 1,              -- Optimistic locking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
)

Indexes (7 total):
  - idx_game_states_room_id
  - idx_game_states_host_user_id
  - idx_game_states_status (partial, WHERE status != 'completed')
  - idx_game_states_created_at
  - idx_game_states_updated_at
  - idx_game_states_current_state_players (GIN index on JSONB)
  - Primary key on id

-- Event Sourcing
game_events (
  id BIGSERIAL PRIMARY KEY,
  game_id TEXT NOT NULL REFERENCES game_states(id),
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  sequence INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_id TEXT,
  version INT DEFAULT 1,
  UNIQUE(game_id, sequence)
)

Indexes (5 total):
  - idx_game_events_game_id
  - idx_game_events_created_at
  - idx_game_events_event_type
  - idx_game_events_user_id (partial)
  - idx_game_events_data_gin (GIN index on JSONB)

-- Lobby System (Already Working)
rooms (id, name, small_blind, big_blind, status, invite_code, host_user_id, ...)
room_seats (room_id, user_id, seat_index, chips_in_play, status, ...)
room_players (room_id, user_id, status, joined_at, ...)
user_profiles (id, email, display_name, avatar_url, chips, ...)
```

### Layer 4: API Layer (NOT INTEGRATED)
**Location:** `src/api/` and `src/routes/`

```typescript
api/
├── controllers/
│   └── games.controller.ts  // ❌ Excluded from build
│
├── routes/
│   └── games.routes.ts      // ❌ Excluded from build
│
└── middleware/
    └── ... (empty)

routes/
├── auth.ts                  // ✅ Compiled, not used by monolith
├── friends.routes.ts        // ✅ Compiled, partially integrated
├── game-display.routes.ts   // ✅ Compiled, partially integrated
└── user.routes.ts           // ✅ Compiled, partially integrated
```

**Status:** ❌ **10% Complete**
- Route files exist but excluded from TypeScript compilation
- Monolith has inline routes instead
- **This is the main gap** preventing modularization

### Layer 5: WebSocket Layer (NOT INTEGRATED)
**Location:** `src/websocket/`

```typescript
websocket/
└── server.ts                // ❌ Excluded from build
```

**Status:** ❌ **0% Complete**
- WebSocket handlers are inline in monolith (lines 2001-2746)
- Modern WebSocket server exists but not compiled
- **Major refactoring needed** to extract

---

## 🚨 CRITICAL FILES EXCLUDED FROM COMPILATION

### tsconfig.json Exclusions:
```json
"exclude": [
  "src/api/**/*",                          // REST API routes
  "src/websocket/**/*",                    // WebSocket server
  "src/index.ts",                          // Main entry point
  "src/services/game-service.ts",          // Game orchestration
  "src/services/database/supabase.ts",     // Supabase client
  "src/services/database/transaction-manager.ts",
  "src/services/database/repos/base.repo.ts",
  "src/services/database/repos/players.repo.ts",
  "src/config/environment.ts"              // Complex config
]
```

**Why Excluded:** Type errors, circular dependencies, incomplete implementations

**Impact:** These files exist with good logic but aren't compiled to `dist/`, so monolith can't use them

**What Needs to Happen:**
1. Fix type errors in each file
2. Remove circular dependencies
3. Complete incomplete implementations
4. Remove from exclusions one-by-one
5. Recompile and verify no breaks
6. Wire into monolith gradually

---

## 🎯 THE DUAL-WRITE PATTERN (Already Implemented)

### How it Works:
```javascript
// In sophisticated-engine-server.js (lines 108-214)

const StorageAdapter = {
  // When creating a game:
  async createGame(gameId, gameState, hostUserId, roomId = null) {
    // 1. Write to in-memory Map (FAST, synchronous)
    games.set(gameId, gameState);
    logMigration('createGame', 'IN_MEMORY', { gameId, roomId });
    
    // 2. Write to database (SLOW, asynchronous, non-blocking)
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY && gameStatesRepository) {
      try {
        const snapshot = gameState.toSnapshot();
        await gameStatesRepository.create(gameId, snapshot, hostUserId);
        logMigration('createGame', 'DB_SUCCESS', { gameId });
      } catch (error) {
        // Database failure is NON-FATAL
        console.error(`❌ DB persist failed: ${error.message}`);
        // Game continues in memory
      }
    }
  },
  
  // When updating a game:
  async saveGame(gameId, gameState) {
    // 1. Update in-memory Map
    games.set(gameId, gameState);
    logMigration('saveGame', 'IN_MEMORY', { gameId });
    
    // 2. Update database with optimistic locking
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY && gameStatesRepository) {
      try {
        await gameStatesRepository.updateGameStateAtomic(
          gameId,
          gameState.version - 1,  // Expect this version
          { status, current_state, hand_number, dealer_position, total_pot }
        );
        logMigration('saveGame', 'DB_SUCCESS', { gameId, version: gameState.version });
      } catch (error) {
        // Version conflict or DB error
        console.error(`❌ DB update failed: ${error.message}`);
      }
    }
  },
  
  // When reading a game:
  async getGame(gameId) {
    // 1. Try in-memory first (FAST)
    if (games.has(gameId)) {
      logMigration('getGame', 'IN_MEMORY_HIT', { gameId });
      return games.get(gameId);
    }
    
    // 2. Try database (for crash recovery)
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY && gameStatesRepository) {
      try {
        const snapshot = await gameStatesRepository.findById(gameId);
        if (snapshot) {
          // Hydrate from snapshot
          const gameState = GameStateModel.fromSnapshot(snapshot.current_state);
          games.set(gameId, gameState);  // Cache it
          logMigration('getGame', 'DB_HYDRATE', { gameId });
          return gameState;
        }
      } catch (error) {
        console.error(`❌ DB read failed: ${error.message}`);
      }
    }
    
    logMigration('getGame', 'NOT_FOUND', { gameId });
    return null;
  }
};
```

**Benefits:**
- ✅ Fast reads (from memory)
- ✅ Persistent writes (to database)
- ✅ Non-blocking (DB writes don't slow game)
- ✅ Crash recovery (reload from DB)
- ✅ Gradual migration (can disable anytime)
- ✅ Zero downtime (both systems work simultaneously)

**Current Status:** ✅ **Fully Implemented and Working**
- 10 games recovered on last server restart
- Console logs show: `[MIGRATION] createGame → DB_SUCCESS`

---

## 🎯 FEATURE FLAGS SYSTEM (Already Implemented)

### How it Works:
```javascript
// In sophisticated-engine-server.js (lines 55-64)

const MIGRATION_FLAGS = {
  USE_DB_REPOSITORY: process.env.USE_DB_REPOSITORY === 'true',
  USE_EVENT_PERSISTENCE: process.env.USE_EVENT_PERSISTENCE === 'true',
  USE_INPUT_VALIDATION: process.env.USE_INPUT_VALIDATION === 'true',
  USE_AUTH_MIDDLEWARE: process.env.USE_AUTH_MIDDLEWARE === 'true',
  LOG_MIGRATION: process.env.NODE_ENV === 'development'
};
```

### Current Settings (in `.env`):
```bash
USE_DB_REPOSITORY=true          # ✅ Database persistence ENABLED
USE_EVENT_PERSISTENCE=true      # ✅ Event logging ENABLED
USE_INPUT_VALIDATION=true       # ⚠️ Enabled but incomplete coverage
USE_AUTH_MIDDLEWARE=true        # ⚠️ Enabled but incomplete enforcement
```

**What This Enables:**
- Instant rollback (set flag to false, restart)
- A/B testing (50% traffic to new, 50% to old)
- Gradual rollout (enable for specific users)
- Safe experimentation (try new code without risk)

---

## 🎯 EVENT SOURCING INFRASTRUCTURE (Partially Enabled)

### What's Built:
```javascript
// In sophisticated-engine-server.js (lines 124-162)

// EventStore initialized
const eventStore = new EventStoreRepository(getDb());

// EventBus initialized with priorities
const eventBus = new EventBus({
  eventStore: eventStore,
  persistEvents: MIGRATION_FLAGS.USE_EVENT_PERSISTENCE,  // ✅ Enabled
  asyncHandlers: true,
  swallowHandlerErrors: true
});

// Event handlers registered
const gameEventHandler = new GameEventHandler(gameStatesRepository);
const wsEventHandler = new WebSocketEventHandler(io);

eventBus.subscribe('game.*', gameEventHandler);      // All game events
eventBus.subscribe('game.*', wsEventHandler);        // Broadcast to clients

// GameStateMachine integrated with EventBus
const stateMachine = new GameStateMachine(eventBus);
```

**Status:** ✅ **Infrastructure Complete, Partially Wired**

**What Works:**
- EventBus can publish events
- EventStore can persist to `game_events` table
- Handlers can react to events
- GameStateMachine emits events

**What's Missing:**
- Not all game operations emit events (some bypass EventBus)
- Event replay not fully tested
- Hand history viewer not built
- Post-game analysis relies on events

---

## 🎯 HORIZONTAL SCALING REQUIREMENTS

### What You Need to Run Multiple Servers:

#### 1. Redis for Shared State
**Why:** WebSocket connections tied to specific server

**Current:** Single server, in-memory Map  
**Target:** Multiple servers, Redis-backed state

**Implementation:**
```typescript
// Install: npm install ioredis @socket.io/redis-adapter

// src/infrastructure/redis/connection.ts
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// sophisticated-engine-server.js
const { createAdapter } = require('@socket.io/redis-adapter');
io.adapter(createAdapter(redis, redis.duplicate()));
```

**Migration Strategy:**
1. Set up Redis (local dev + production)
2. Store game state in Redis (not just database)
3. Use Redis pub/sub for WebSocket events
4. Test with 2 servers locally
5. Deploy with load balancer

#### 2. Sticky Sessions
**Why:** Same user should hit same server (for connection consistency)

**Implementation:**
```nginx
# nginx.conf
upstream pokegeek_backend {
  ip_hash;  # Sticky sessions based on IP
  server server1:3000;
  server server2:3000;
  server server3:3000;
}
```

#### 3. Session Store in Redis
**Why:** Sessions must be shared across servers

**Current:** No server-side sessions (using localStorage)  
**Target:** Redis-backed sessions

**Implementation:**
```javascript
const session = require('express-session');
const RedisStore = require('connect-redis').default;

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
```

#### 4. Health Checks
**Why:** Load balancer needs to know which servers are healthy

**Already Exists:**
```javascript
app.get('/health', async (req, res) => {
  const db = await testDatabaseConnection();
  const redis = await testRedisConnection();
  res.json({ status: db && redis ? 'healthy' : 'degraded' });
});
```

---

## 🎯 MODULARIZATION STRATEGY

### Goal: Break 2,746-line Monolith into Modules

### Phase 1: Extract Routes (Week 3)
**Move inline routes to TypeScript files**

Before (Monolith):
```javascript
// sophisticated-engine-server.js (lines 288-350)
app.post('/api/rooms', async (req, res) => {
  const { small_blind, big_blind, max_players } = req.body;
  // 50 lines of room creation logic...
});
```

After (Modular):
```typescript
// src/routes/rooms.routes.ts
import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';

export const roomRoutes = Router();

roomRoutes.post('/', async (req, res) => {
  try {
    const room = await RoomController.create(req.body);
    res.status(201).json(room);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// sophisticated-engine-server.js (now just 10 lines)
const { roomRoutes } = require('./dist/routes/rooms.routes');
app.use('/api/rooms', roomRoutes);
```

**Files to Create:**
- `src/routes/rooms.routes.ts` (room CRUD)
- `src/routes/games.routes.ts` (game actions)
- `src/routes/users.routes.ts` (user profiles)
- `src/routes/friends.routes.ts` (friend system)
- `src/routes/chat.routes.ts` (chat messages)

**Result:** Monolith shrinks from 2,746 → 1,800 lines

### Phase 2: Extract Controllers (Week 3)
**Move business logic to controller classes**

Before (Mixed in Routes):
```javascript
app.post('/api/rooms', async (req, res) => {
  // 50 lines of validation, DB queries, error handling...
});
```

After (Clean Separation):
```typescript
// src/controllers/room.controller.ts
export class RoomController {
  constructor(private roomService: RoomService) {}
  
  async create(data: CreateRoomDTO): Promise<Room> {
    const validated = CreateRoomSchema.parse(data);
    return await this.roomService.createRoom(validated);
  }
}

// src/routes/rooms.routes.ts (now just 5 lines)
roomRoutes.post('/', async (req, res) => {
  const room = await roomController.create(req.body);
  res.status(201).json(room);
});
```

**Files to Create:**
- `src/controllers/room.controller.ts`
- `src/controllers/game.controller.ts`
- `src/controllers/user.controller.ts`

**Result:** Monolith shrinks from 1,800 → 1,200 lines

### Phase 3: Extract Services (Week 4)
**Move domain logic to service classes**

Before (Mixed in Controllers):
```typescript
async create(data) {
  // 30 lines of room creation, seat setup, DB queries...
}
```

After (Clean Service):
```typescript
// src/services/room.service.ts
export class RoomService {
  constructor(
    private roomRepo: RoomRepository,
    private seatRepo: SeatRepository
  ) {}
  
  async createRoom(data: CreateRoomDTO): Promise<Room> {
    // All business logic here
    const room = await this.roomRepo.create(data);
    await this.seatRepo.initializeSeats(room.id, data.max_players);
    return room;
  }
}
```

**Files to Create:**
- `src/services/room.service.ts`
- `src/services/game.service.ts` (already exists, excluded from build)
- `src/services/user.service.ts`
- `src/services/friend.service.ts`

**Result:** Monolith shrinks from 1,200 → 800 lines

### Phase 4: Extract WebSocket Handlers (Week 4)
**Move Socket.IO handlers to separate files**

Before (Inline in Monolith):
```javascript
// sophisticated-engine-server.js (lines 2001-2746)
io.on('connection', (socket) => {
  socket.on('join_room', async (data) => {
    // 50 lines of logic...
  });
  
  socket.on('player_action', async (data) => {
    // 60 lines of logic...
  });
  
  // 10 more handlers, 700+ lines total...
});
```

After (Modular):
```typescript
// src/websocket/handlers/room.handler.ts
export class RoomHandler {
  handle(socket: Socket) {
    socket.on('join_room', async (data) => {
      await this.roomService.joinRoom(data);
    });
  }
}

// sophisticated-engine-server.js (now just 20 lines)
const { RoomHandler, GameHandler } = require('./dist/websocket/handlers');

io.on('connection', (socket) => {
  new RoomHandler(roomService).handle(socket);
  new GameHandler(gameService).handle(socket);
});
```

**Files to Create:**
- `src/websocket/handlers/room.handler.ts`
- `src/websocket/handlers/game.handler.ts`
- `src/websocket/handlers/chat.handler.ts`

**Result:** Monolith shrinks from 800 → 300 lines

### Phase 5: Final Server File (Week 5)
**Monolith becomes thin orchestrator**

Final `sophisticated-engine-server.js` (target: <200 lines):
```javascript
// 1. Imports (20 lines)
// 2. Database connection (30 lines)
// 3. Middleware setup (30 lines)
// 4. Route mounting (20 lines)
// 5. WebSocket setup (30 lines)
// 6. Server startup (20 lines)
// 7. Graceful shutdown (20 lines)
// Total: ~170 lines
```

**File becomes:**
- Easy to read (fits on one screen)
- Easy to test (mock each module)
- Easy to understand (just configuration)
- Easy to deploy (minimal logic)

---

## 🎯 TYPESCRIPT MIGRATION COMPLETION

### What Needs to Be Done:

#### Step 1: Fix Excluded Files (One at a Time)
**Process for each file in tsconfig exclusions:**

1. Remove from exclude list
2. Run `npm run build`
3. Note compilation errors
4. Fix errors (type annotations, imports, etc.)
5. Verify build succeeds
6. Test functionality
7. Commit changes

**Order of Attack (Easiest First):**
1. ✅ `src/config/simple-environment.ts` (already works)
2. `src/config/environment.ts` (complex validation, low priority)
3. `src/services/database/repos/base.repo.ts` (base class issues)
4. `src/services/database/repos/players.repo.ts` (depends on base)
5. `src/services/game-service.ts` (circular dependencies)
6. `src/api/**/*` (depends on game-service)
7. `src/websocket/**/*` (depends on game-service)
8. `src/index.ts` (main entry, replace monolith)

#### Step 2: Replace Monolith Entry Point
**When all files compile:**

```bash
# Currently:
npm start  # Runs sophisticated-engine-server.js (monolith)

# Future:
npm start  # Runs dist/index.js (modular TypeScript)
```

**The Transition:**
1. All routes extracted to `src/routes/`
2. All controllers in `src/controllers/`
3. All services in `src/services/`
4. All WebSocket in `src/websocket/`
5. `src/index.ts` imports and wires everything
6. Build to `dist/index.js`
7. Switch `package.json` start script
8. Delete monolith (or archive)

---

## 🎯 IMMEDIATE ACTION ITEMS (Week 1)

### Day 1: Verify Database Persistence
**Objective:** Confirm dual-write actually works

**Steps:**
1. Check feature flags: `USE_DB_REPOSITORY=true` in `.env`
2. Start server: `npm start`
3. Watch console for: `[MIGRATION] createGame → DB_SUCCESS`
4. Create game via `/play` page
5. Query database: `SELECT * FROM game_states;`
6. Verify game exists with correct data
7. Restart server
8. Check console: `✅ Game recovered | gameId=...`
9. Confirm 10+ games recovered

**Success Criteria:**
- Games appear in database
- Games reload after restart
- No errors in console

### Day 2: Add Rate Limiting
**Objective:** Prevent spam/DDoS

**Steps:**
1. Install: `npm install express-rate-limit`
2. Create rate limit middleware (3 types: global, create, action)
3. Apply to routes in monolith
4. Test: spam endpoint, get 429 errors
5. Verify legitimate requests still work

**Success Criteria:**
- Cannot spam room creation
- Cannot spam player actions
- Normal usage unaffected

### Day 3: Complete Input Validation
**Objective:** All endpoints validate input

**Steps:**
1. Verify Zod installed: `npm list zod`
2. Create validation schemas for ALL endpoints
3. Add validation middleware to each route
4. Test: send invalid data, get 400 errors
5. Test: send valid data, works normally

**Success Criteria:**
- Cannot send negative chips
- Cannot send invalid action types
- Cannot send malformed UUIDs
- All endpoints protected

### Day 4: Audit Auth Middleware
**Objective:** All protected endpoints require auth

**Steps:**
1. List ALL API endpoints
2. Determine which need auth (probably all)
3. Apply `authenticateUser` middleware
4. Test: call without token, get 401
5. Test: call with valid token, works

**Success Criteria:**
- Cannot create room without auth
- Cannot join game without auth
- Public endpoints (health check) still work

### Day 5: Fix TypeScript Exclusions (Start)
**Objective:** Begin compiling excluded files

**Steps:**
1. Pick easiest file: `src/services/database/repos/base.repo.ts`
2. Remove from tsconfig exclusions
3. Run `npm run build`
4. Fix type errors one-by-one
5. Verify build succeeds
6. Test functionality
7. Commit

**Success Criteria:**
- One less file in exclusions
- Build still works
- Functionality unchanged

---

## 📊 MIGRATION METRICS (Track Weekly)

### Technical Metrics:
```sql
-- Database usage
SELECT 
  (SELECT COUNT(*) FROM game_states) as total_games,
  (SELECT COUNT(*) FROM game_events) as total_events,
  (SELECT COUNT(*) FROM rooms WHERE status = 'active') as active_rooms;

-- Persistence effectiveness
SELECT 
  COUNT(*) FILTER (WHERE room_id IS NOT NULL) as linked_games,
  COUNT(*) FILTER (WHERE room_id IS NULL) as orphan_games,
  AVG(hand_number) as avg_hands_per_game
FROM game_states;

-- Event sourcing coverage
SELECT 
  event_type,
  COUNT(*) as count,
  MAX(created_at) as last_seen
FROM game_events
GROUP BY event_type
ORDER BY count DESC;
```

### Code Metrics:
```bash
# Monolith size (track weekly, goal: <300 lines)
wc -l sophisticated-engine-server.js

# TypeScript coverage (goal: 100%)
find src -name "*.ts" | wc -l  # Total files
grep -l "exclude" tsconfig.json | wc -l  # Excluded files

# Test coverage (goal: >70%)
npm run test:coverage
```

---

## 🎯 SUCCESS CRITERIA

### Phase 1 Complete (Week 3):
- [ ] Monolith <1,800 lines (from 2,746)
- [ ] All routes in separate files
- [ ] All endpoints validated
- [ ] All endpoints protected
- [ ] Rate limiting active
- [ ] Database persistence at 100%

### Phase 2 Complete (Week 6):
- [ ] Monolith <500 lines (from 2,746)
- [ ] All controllers extracted
- [ ] All services extracted
- [ ] All WebSocket handlers extracted
- [ ] TypeScript compilation clean (no exclusions)
- [ ] Redis integrated

### Phase 3 Complete (Week 8):
- [ ] Monolith deleted (archived)
- [ ] Running from `dist/index.js`
- [ ] Can run 2+ servers
- [ ] Horizontal scaling tested
- [ ] Load balancer configured
- [ ] Monitoring dashboards live

---

**This document provides the deep architectural context for executing PROJECT_MASTER.md. Refer back frequently during migration.**

**Last Updated:** October 23, 2025  
**Status:** Ready for Week 1 execution

