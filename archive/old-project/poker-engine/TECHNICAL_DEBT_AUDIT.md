# 🔍 Technical Debt Audit & Scalability Roadmap

**Generated:** October 21, 2025  
**Last Updated:** October 23, 2025  
**Audit Type:** Comprehensive Migration Assessment  
**Current State:** Foundation Phase - Routing Fixed, Persistence Ready

---

## 📊 PROGRESS UPDATE (Oct 23, 2025)

### ✅ Recent Wins
1. **Routing Flow Fixed** - Clean path from lobby to table (no more loops)
2. **Auto-Join Logic Fixed** - Corrected CSS override syntax
3. **Recovery Disabled** - Deferred to Phase 3 (proper persistent URLs)
4. **Dual-Write Ready** - Infrastructure in place, ready to enable
5. **Documentation Updated** - All MDs reflect current state

### 🚧 Current Blockers
1. **Database persistence not enabled** - Still using in-memory Map
2. **Event logging not enabled** - Events generated but not stored
3. **No input validation** - Endpoints accept invalid data
4. **No auth enforcement** - Endpoints unprotected
5. **No rate limiting** - Vulnerable to abuse

---

## 🎯 Executive Summary

**CRITICAL FINDING:** You have **two architectures running in parallel**:
1. **Legacy Monolith** (`sophisticated-engine-server.js` - 2,524 lines of JavaScript)
2. **Modern TypeScript Architecture** (`src/` - 99 files, partially compiled to `dist/`)

**The Issue:** The modern architecture is built but **not fully integrated**. The server imports TypeScript components but still has massive inline logic, in-memory state, and no proper persistence layer connection.

**Migration Status:** ~45% complete (up from 40%)
- ✅ Core engine ported to TypeScript (GameStateMachine, BettingEngine, HandEvaluator)
- ✅ CQRS/Event Sourcing infrastructure built (CommandBus, QueryBus, EventBus)
- ✅ Repository pattern implemented (ready to use)
- ✅ Dual-write pattern implemented (StorageAdapter)
- ✅ Feature flags system in place
- ✅ Routing flow cleaned up (Oct 23)
- ❌ Server still monolithic with inline REST endpoints
- ❌ Game state still in-memory (`Map`) - **READY TO SWITCH**
- ❌ Event persistence disabled by default - **READY TO ENABLE**
- ❌ No proper session management
- ❌ No horizontal scaling capability

---

## 📊 Architecture State Analysis

### Current Dual Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  LEGACY ARCHITECTURE                         │
│  sophisticated-engine-server.js (2,283 lines)               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ • In-memory games Map                              │    │
│  │ • Inline REST endpoints (lines 288-800)           │    │
│  │ • Manual WebSocket handlers (lines 2001-2283)     │    │
│  │ • No session persistence                          │    │
│  │ • No state recovery                               │    │
│  └────────────────────────────────────────────────────┘    │
│                        ↓ imports                            │
│  ┌────────────────────────────────────────────────────┐    │
│  │ GameStateMachine, BettingEngine, PlayerModel       │    │
│  │ (from dist/ - compiled TypeScript)                 │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              MODERN ARCHITECTURE (BUILT BUT UNUSED)          │
│  src/ (99 TypeScript files)                                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │ CQRS Layer                                         │    │
│  │ • GameApplicationService                           │    │
│  │ • CommandBus (CreateGame, StartHand, etc.)        │    │
│  │ • QueryBus (GetGameState, GetPlayerStats)         │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ Event Sourcing                                     │    │
│  │ • EventBus (pub/sub with priorities)              │    │
│  │ • PostgresEventStore (NOT CONNECTED)              │    │
│  │ • EventReplayer (crash recovery - NOT USED)       │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ Repository Pattern                                 │    │
│  │ • GamesRepository (atomic updates)                │    │
│  │ • PlayersRepository                               │    │
│  │ • HandsRepository                                 │    │
│  │ • ActionsRepository (NOT PERSISTING)              │    │
│  ├────────────────────────────────────────────────────┤    │
│  │ Services Layer                                     │    │
│  │ • AuthService (JWT-based)                         │    │
│  │ • DisplayService (player names/aliases)           │    │
│  │ • FriendService (NOT IMPLEMENTED)                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ⚠️  STATUS: Compiled but not integrated into main server  │
└─────────────────────────────────────────────────────────────┘
```

### TypeScript Compilation Exclusions

**Critical Issue:** `tsconfig.json` excludes key files that would complete the migration:

```json
"exclude": [
  "src/services/game-service.ts",     // Game orchestration
  "src/services/database",            // All database repos
  "src/api",                          // REST API routes
  "src/websocket",                    // WebSocket server
  "src/index.ts"                      // Main entry point
]
```

**Impact:** These files exist but aren't compiled, forcing the monolith to persist.

---

## 🚨 Critical Technical Debt (Blocks Scaling)

### 1. In-Memory Game State (`Map`)

**Location:** `sophisticated-engine-server.js` line 175-176
```javascript
const games = new Map(); // ❌ All game state in RAM
gameApplicationService = new GameApplicationService({
  gameStateStore: games, // ❌ Passing in-memory Map
});
```

**Impact:**
- ❌ Server restart = all active games lost
- ❌ Cannot scale horizontally (games tied to single server)
- ❌ No crash recovery
- ❌ No audit trail

**Fix Required:**
Replace with Redis/PostgreSQL-backed state store:
```typescript
// Use GamesRepository instead of Map
const gamesRepo = new GamesRepository(dbPool);
gameApplicationService = new GameApplicationService({
  gameStateStore: gamesRepo, // ✅ Persistent storage
});
```

**Effort:** 2-3 days
**Priority:** 🔥 CRITICAL

---

### 2. Event Persistence Disabled

**Location:** `sophisticated-engine-server.js` line 138-143
```javascript
eventBus = new EventBus({
  eventStore: eventStore,
  persistEvents: !!eventStore, // ❌ Only if DB exists
  asyncHandlers: true,
  swallowHandlerErrors: true,
});
```

**Current State:**
- EventStore created but conditionally enabled
- `initializeEventSourcing()` warns if no database
- Events generated but not stored

**Impact:**
- ❌ No hand history
- ❌ Cannot replay games for debugging
- ❌ No crash recovery via event log
- ❌ Cannot implement "watch replay" feature

**Fix Required:**
```typescript
// Always persist events (fail fast if DB unavailable)
if (!eventStore) {
  throw new Error('EventStore required for production');
}
eventBus = new EventBus({
  eventStore: eventStore,
  persistEvents: true, // ✅ Always persist
});
```

**Effort:** 1 day (+ DB migration for `game_events` table)
**Priority:** 🔥 CRITICAL

---

### 3. No Session Management

**Current State:**
- Frontend uses `sessionStorage` hacks (lines 4326-4340 in `poker.html`)
- No server-side session tracking
- Page reload = user might lose connection

**Code Smell:**
```javascript
// poker.html - CLIENT-SIDE session hack
window.addEventListener('beforeunload', () => {
  if (room) sessionStorage.setItem('poker_room', room.id);
  if (currentGame) sessionStorage.setItem('poker_game', currentGame.gameId);
});
```

**Impact:**
- ❌ No user session persistence across servers
- ❌ Cannot implement "resume game" properly
- ❌ No idle timeout handling
- ❌ No session hijacking protection

**Fix Required:**
Implement Redis-backed sessions:
```typescript
import RedisStore from 'connect-redis';
import session from 'express-session';

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: true,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

**Effort:** 2-3 days (+ Redis setup)
**Priority:** 🔥 HIGH

---

### 4. No Database Connection Pooling (Properly Configured)

**Location:** `sophisticated-engine-server.js` lines 101-265

**Current Issues:**
- Single global `dbPool` variable
- Manual reconnection logic
- Error handler that nullifies pool on termination
- No connection health checks

**Code Smell:**
```javascript
dbPool.on('error', async (err) => {
  if (err.message.includes('termination')) {
    await dbPool.end();
    dbPool = null; // ❌ Dangerous - next query will crash
  }
});
```

**Impact:**
- ❌ Supabase auto-pause breaks server
- ❌ No automatic reconnection
- ❌ No connection monitoring
- ❌ Pool exhaustion possible under load

**Fix Required:**
```typescript
// Use connection pool manager
import { Pool } from 'pg';
import { PoolConfig } from 'pg-pool';

const poolConfig: PoolConfig = {
  max: 20, // max clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Reconnection logic
  onPoolError: async (err, client) => {
    console.error('Pool error:', err);
    // Don't nullify pool - let it reconnect
  }
};

const pool = new Pool(poolConfig);

// Health check endpoint
app.get('/health/db', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ db: 'healthy' });
  } catch (err) {
    res.status(503).json({ db: 'unhealthy', error: err.message });
  }
});
```

**Effort:** 1-2 days
**Priority:** 🔥 HIGH

---

### 5. Monolithic Server (2,283 lines)

**Current Structure:**
```
sophisticated-engine-server.js
├── Lines 1-100: Imports and setup
├── Lines 101-287: Database setup
├── Lines 288-800: REST endpoints (inline)
│   ├── POST /api/rooms
│   ├── GET /api/rooms/:id
│   ├── POST /api/rooms/:id/join
│   ├── POST /api/games
│   └── ... (15+ more endpoints)
├── Lines 801-1500: Game engine logic (inline)
├── Lines 1501-2000: Helper functions
└── Lines 2001-2283: WebSocket handlers (inline)
```

**Impact:**
- ❌ Cannot test individual components
- ❌ No code reuse
- ❌ Merge conflicts inevitable with team
- ❌ Cannot deploy microservices
- ❌ Hard to reason about flow

**Fix Required:**
Break into modules:
```
src/
├── server.ts                    # Entry point (50 lines)
├── routes/
│   ├── rooms.routes.ts          # Room endpoints
│   ├── games.routes.ts          # Game endpoints
│   └── websocket.routes.ts      # WS handlers
├── services/
│   ├── RoomService.ts           # Room logic
│   ├── GameService.ts           # Game logic (EXISTS BUT EXCLUDED)
│   └── SessionService.ts        # Session mgmt
├── middleware/
│   ├── auth.middleware.ts       # Auth checks
│   ├── validation.middleware.ts # Input validation
│   └── error.middleware.ts      # Error handling
└── infrastructure/
    ├── database/
    │   └── connection.ts        # Pool management
    └── websocket/
        └── server.ts            # Socket.IO setup
```

**Effort:** 1-2 weeks (careful refactoring)
**Priority:** 🔥 HIGH

---

### 6. No Input Validation

**Evidence:**
```javascript
// No validation on bet amounts, seat indices, etc.
app.post('/api/games/:id/action', async (req, res) => {
  const { player_id, action, amount } = req.body;
  // ❌ No checks:
  // - Is amount positive?
  // - Is player_id valid UUID?
  // - Is action valid enum?
  // - Is player actually in game?
});
```

**Impact:**
- ❌ Can bet negative chips
- ❌ Can submit invalid actions
- ❌ SQL injection risk
- ❌ XSS risk

**Fix Required:**
```typescript
import { z } from 'zod';

const ActionSchema = z.object({
  player_id: z.string().uuid(),
  action: z.enum(['FOLD', 'CALL', 'RAISE', 'CHECK', 'ALL_IN']),
  amount: z.number().int().positive().optional()
});

app.post('/api/games/:id/action', async (req, res) => {
  try {
    const validatedData = ActionSchema.parse(req.body);
    // Continue with validated data
  } catch (err) {
    return res.status(400).json({ error: err.errors });
  }
});
```

**Effort:** 1 week (add validation to all endpoints)
**Priority:** 🔥 CRITICAL (security)

---

### 7. No Rate Limiting

**Current State:** ANY client can spam endpoints

**Impact:**
- ❌ DDoS vulnerability
- ❌ Can spam game creation
- ❌ Can spam actions (cheat by racing)

**Fix Required:**
```typescript
import rateLimit from 'express-rate-limit';

const createRoomLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 rooms per window
  message: 'Too many rooms created'
});

app.post('/api/rooms', createRoomLimiter, async (req, res) => {
  // ...
});

const actionLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 1, // 1 action per second
  keyGenerator: (req) => req.body.player_id // Per-player limit
});

app.post('/api/games/:id/action', actionLimiter, async (req, res) => {
  // ...
});
```

**Effort:** 2 days
**Priority:** 🔥 CRITICAL (security)

---

## ⚠️ High Priority Debt (Degrades UX)

### 8. No Error Boundaries

**Current Pattern:**
```javascript
// No try/catch, no error handling
async function createRoom() {
  const response = await fetch('/api/rooms', {...}); // ❌ Can throw
  const data = await response.json(); // ❌ Can throw
  displayRoom(data); // ❌ Assumes success
}
```

**Impact:**
- UI hangs on errors
- No user feedback
- Console errors but no recovery

**Fix Required:**
```javascript
async function createRoom() {
  try {
    const response = await fetch('/api/rooms', {...});
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    displayRoom(data);
  } catch (error) {
    console.error('Failed to create room:', error);
    showNotification('Failed to create room. Please try again.', 'error');
    // Revert UI state
  }
}
```

**Effort:** 1 week (add to all frontend calls)
**Priority:** 🔥 HIGH

---

### 9. Hardcoded API URLs

**Code Smell:**
```javascript
// poker.html line 1242
const API_BASE = 'http://localhost:3000/api'; // ❌ Hardcoded
```

**Impact:**
- Won't work in production
- Can't use staging environment
- Forces specific port

**Fix Required:**
```javascript
// Use environment-aware URL
const API_BASE = window.location.origin + '/api';
// OR use environment variable injection
const API_BASE = import.meta.env.VITE_API_URL || '/api';
```

**Effort:** 1 day
**Priority:** 🔥 HIGH

---

### 10. Mixed Authentication Strategies

**Current Complexity:**
- Supabase OAuth (Google)
- Supabase anonymous auth
- Local UUID fallback
- JWT tokens (in TypeScript layer, unused)
- No auth middleware on server endpoints

**Code Confusion:**
```javascript
// auth-manager.js - Fallback generates local UUID
if (supabaseError) {
  const fallbackId = crypto.randomUUID(); // ❌ Not in DB
  return { id: fallbackId, isGuest: true };
}
```

**Impact:**
- ❌ Guest users not in database
- ❌ No auth on server endpoints (anyone can call them)
- ❌ Multiple auth flows confuse developers

**Fix Required:**
1. **Pick one strategy:** Supabase Auth (recommended)
2. **Remove local UUID fallback** - fail fast if auth unavailable
3. **Add auth middleware to all endpoints:**
```typescript
const authenticateUser = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const { data: user, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  req.user = user;
  next();
};

// Apply to all routes
app.use('/api/*', authenticateUser);
```

**Effort:** 2-3 days
**Priority:** 🔥 CRITICAL (security)

---

## 📈 Scalability Blockers

### 11. No Horizontal Scaling Capability

**Current Constraints:**
- Game state in server RAM
- WebSocket connections tied to single server
- No load balancer support
- No sticky sessions

**Why You Can't Scale:**
```
Client A connects → Server 1 (has game state)
Client B connects → Server 2 (no game state) ❌
```

**Fix Required (Multi-Stage):**

**Stage 1: Externalize State (1 week)**
```typescript
// Move game state to Redis
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

class RedisGameStore {
  async get(gameId: string): Promise<GameState | null> {
    const data = await redis.get(`game:${gameId}`);
    return data ? JSON.parse(data) : null;
  }
  
  async set(gameId: string, state: GameState): Promise<void> {
    await redis.set(`game:${gameId}`, JSON.stringify(state), 'EX', 3600);
  }
}
```

**Stage 2: Sticky Sessions (2 days)**
```typescript
// Use Redis session store
import session from 'express-session';
import RedisStore from 'connect-redis';

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET,
  cookie: { secure: true }
}));
```

**Stage 3: WebSocket Scaling (3 days)**
```typescript
// Use Redis adapter for Socket.IO
import { createAdapter } from '@socket.io/redis-adapter';

const pubClient = new Redis(process.env.REDIS_URL);
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

**Total Effort:** 2 weeks
**Priority:** 🔥 CRITICAL (for growth)

---

### 12. No Monitoring/Observability

**Current State:**
- Console.log everywhere
- No metrics collection
- No error tracking
- No performance monitoring

**Missing:**
- Request duration tracking
- Error rate monitoring
- Active games count
- Database query performance
- WebSocket connection count

**Fix Required:**
```typescript
// Add Prometheus metrics
import client from 'prom-client';

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status']
});

const activeGames = new client.Gauge({
  name: 'poker_active_games',
  help: 'Number of active poker games'
});

// Add Sentry for error tracking
import * as Sentry from '@sentry/node';
Sentry.init({ dsn: process.env.SENTRY_DSN });

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

**Effort:** 1 week
**Priority:** 🔥 HIGH (for production)

---

## 🔄 Migration Completion Roadmap

### Phase 1: Foundation (Week 1-2) - CRITICAL

**Goal:** Get basic production infrastructure in place

✅ **Day 1-2: Database Persistence**
- [ ] Connect `GamesRepository` to replace in-memory Map
- [ ] Enable event persistence (`persistEvents: true`)
- [ ] Add database health checks
- [ ] Test crash recovery via EventReplayer

✅ **Day 3-4: Session Management**
- [ ] Set up Redis
- [ ] Implement Redis session store
- [ ] Add session middleware to all routes
- [ ] Test session persistence across page reloads

✅ **Day 5-7: Security Hardening**
- [ ] Add input validation (Zod schemas)
- [ ] Add rate limiting to all endpoints
- [ ] Add auth middleware (enforce Supabase tokens)
- [ ] Remove local UUID fallback
- [ ] Add CORS restrictions

✅ **Day 8-10: Error Handling**
- [ ] Add try/catch to all endpoints
- [ ] Add error middleware
- [ ] Add frontend error boundaries
- [ ] Add user-friendly error messages
- [ ] Set up Sentry error tracking

---

### Phase 2: Modularization (Week 3-4) - HIGH

**Goal:** Break monolith into maintainable modules

✅ **Day 11-14: Extract Routes**
- [ ] Move REST endpoints to `src/routes/`
- [ ] Move WebSocket handlers to `src/websocket/`
- [ ] Create service layer (`RoomService`, `GameService`)
- [ ] Update `tsconfig.json` to include all files
- [ ] Full TypeScript compilation

✅ **Day 15-18: Testing Infrastructure**
- [ ] Set up Jest properly
- [ ] Add unit tests for core engine
- [ ] Add integration tests for API endpoints
- [ ] Add E2E tests for game flow
- [ ] Achieve >70% code coverage

✅ **Day 19-21: Documentation**
- [ ] Document all API endpoints (OpenAPI/Swagger)
- [ ] Add inline code comments
- [ ] Create architecture diagrams
- [ ] Write deployment guide

---

### Phase 3: Scaling (Week 5-6) - HIGH

**Goal:** Enable horizontal scaling

✅ **Day 22-25: Redis Integration**
- [ ] Move game state to Redis
- [ ] Implement Redis adapter for Socket.IO
- [ ] Add Redis pub/sub for cross-server events
- [ ] Test multi-server deployment

✅ **Day 26-28: Load Balancer Setup**
- [ ] Configure nginx/HAProxy
- [ ] Add sticky sessions
- [ ] Test failover scenarios
- [ ] Add health check endpoints

✅ **Day 29-31: Monitoring**
- [ ] Set up Prometheus + Grafana
- [ ] Add custom metrics
- [ ] Set up alerts
- [ ] Create dashboards

---

### Phase 4: Polish (Week 7-8) - MEDIUM

**Goal:** Production-ready UX

✅ **Day 32-35: Frontend Cleanup**
- [ ] Remove hardcoded URLs
- [ ] Add loading states
- [ ] Add animations
- [ ] Fix navbar on all pages
- [ ] Unify `poker.html` and `play.html` UI patterns

✅ **Day 36-38: Features**
- [ ] Profile username editing
- [ ] Public games lobby
- [ ] "Next Hand" button
- [ ] Hand history viewer
- [ ] Rebuy chips

✅ **Day 39-42: Deployment**
- [ ] Set up CI/CD pipeline
- [ ] Deploy to staging
- [ ] Load testing
- [ ] Deploy to production

---

## 🎯 Priority Matrix

### DO IMMEDIATELY (This Week)
1. **Database persistence** - Replace in-memory Map
2. **Enable event logging** - Turn on `persistEvents: true`
3. **Input validation** - Add Zod schemas
4. **Auth middleware** - Protect all endpoints
5. **Rate limiting** - Prevent abuse

### DO NEXT (Next 2 Weeks)
6. **Extract routes** - Modularize monolith
7. **Session management** - Redis sessions
8. **Error handling** - Try/catch everywhere
9. **Testing** - Unit + integration tests
10. **Monitoring** - Prometheus + Sentry

### DO SOON (Next Month)
11. **Redis state store** - Horizontal scaling
12. **Load balancer** - Multi-server support
13. **Frontend polish** - UX improvements
14. **Documentation** - API docs + guides

### DO LATER (Next Quarter)
15. **Microservices** - Split into separate services
16. **GraphQL** - Replace REST API
17. **Mobile app** - Flutter/React Native
18. **Advanced features** - Tournaments, AI, etc.

---

## 💰 Estimated Effort

| Phase | Effort | Engineer-Weeks | Priority |
|-------|--------|---------------|----------|
| **Phase 1: Foundation** | 10 days | 2 weeks | 🔥 CRITICAL |
| **Phase 2: Modularization** | 11 days | 2.2 weeks | 🔥 HIGH |
| **Phase 3: Scaling** | 10 days | 2 weeks | 🔥 HIGH |
| **Phase 4: Polish** | 11 days | 2.2 weeks | ⚠️ MEDIUM |
| **TOTAL** | 42 days | **~8-10 weeks** | - |

**With 1 engineer:** 10 weeks  
**With 2 engineers:** 5-6 weeks  
**With 3 engineers:** 4 weeks (parallelizable tasks)

---

## 🚦 Risk Assessment

### High Risk (Blocks Launch)
- ❌ In-memory state (data loss on restart)
- ❌ No auth on endpoints (security breach)
- ❌ No input validation (exploitable)
- ❌ No rate limiting (DDoS vulnerability)
- ❌ No error handling (poor UX)

### Medium Risk (Degrades Quality)
- ⚠️ Monolithic server (hard to maintain)
- ⚠️ No monitoring (blind to issues)
- ⚠️ No tests (breaks easily)
- ⚠️ Mixed auth strategies (confusing)

### Low Risk (Technical Debt)
- ⚠️ Hardcoded URLs
- ⚠️ No animations
- ⚠️ Duplicate UI code
- ⚠️ No documentation

---

## 🎬 Recommended Action Plan

### This Week (Days 1-7)
**STOP ADDING FEATURES. Fix the foundation.**

**Monday-Tuesday:**
1. Enable database persistence
2. Connect `GamesRepository`
3. Test game state survives server restart

**Wednesday-Thursday:**
4. Add input validation (Zod)
5. Add auth middleware
6. Add rate limiting

**Friday:**
7. Add error handling to critical endpoints
8. Set up basic monitoring (Sentry)

**Weekend (optional):**
9. Write unit tests for core engine
10. Document current architecture

### Next Week (Days 8-14)
**Focus on modularization and testing**

1. Extract routes from monolith
2. Break into service modules
3. Add integration tests
4. Set up CI/CD pipeline

### Weeks 3-4
**Focus on scaling infrastructure**

1. Set up Redis
2. Externalize game state
3. Test multi-server deployment
4. Add monitoring dashboards

### Weeks 5-8
**Polish and launch**

1. Fix UX issues
2. Add missing features
3. Load testing
4. Production deployment

---

## ✅ Success Criteria

**After Phase 1 (Foundation):**
- [ ] Server restart doesn't lose games
- [ ] All endpoints have auth
- [ ] All inputs validated
- [ ] Rate limiting works
- [ ] Errors caught and logged

**After Phase 2 (Modularization):**
- [ ] Server < 500 lines
- [ ] Routes in separate files
- [ ] >70% test coverage
- [ ] TypeScript compilation clean

**After Phase 3 (Scaling):**
- [ ] Can run 2+ servers
- [ ] Load balancer works
- [ ] Failover tested
- [ ] Monitoring dashboards live

**After Phase 4 (Polish):**
- [ ] UX bugs fixed
- [ ] Features complete
- [ ] Documentation done
- [ ] Production deployed

---

## 📝 Notes

**Don't Rewrite Everything:** The TypeScript architecture is solid. You just need to:
1. **Connect it** (use repositories instead of Map)
2. **Enable it** (turn on event persistence)
3. **Finish it** (remove tsconfig exclusions)
4. **Migrate to it** (replace monolith endpoints)

**Quick Wins:** Start with foundation (Days 1-7). You'll see immediate stability improvements.

**Long-Term:** Once Phase 1-2 done, you can safely scale and add features.

---

**Document Version:** 1.0  
**Next Review:** After Phase 1 completion  
**Maintained By:** Engineering Team

