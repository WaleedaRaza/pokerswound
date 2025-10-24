# 🚀 Migration Completion Checklist

**Last Updated:** October 23, 2025  
**Status:** Phase 1 In Progress - Foundation  
**Estimated Time:** 10 weeks (1 engineer) | 5 weeks (2 engineers)

---

## 📊 PROGRESS UPDATE (Oct 23, 2025)

### ✅ Completed (Foundation Setup)
- [x] **Dual-write infrastructure** - `StorageAdapter` pattern implemented
- [x] **Database repositories** - `GamesRepository`, `EventStoreRepository` built
- [x] **Feature flags** - `MIGRATION_FLAGS` system in place
- [x] **Database migrations** - `add-games-table.sql`, `add-game-states-table.sql` created
- [x] **TypeScript compilation** - Database layer compiling successfully
- [x] **Routing cleanup** - Fixed `/play` → `/game` flow (no more loops)
- [x] **Auto-join fix** - Corrected CSS override syntax in `poker.html`
- [x] **Recovery disabled** - Deferred localStorage recovery to Phase 3

### 🚧 In Progress (This Week)
- [ ] **Enable database persistence** - Set `USE_DB_REPOSITORY=true`
- [ ] **Enable event logging** - Set `USE_EVENT_PERSISTENCE=true`
- [ ] **Test dual-write** - Verify games persist across restarts
- [ ] **Monitor stability** - 48-hour observation period

### 🎯 Next Up (Week 1 Completion)
- [ ] Input validation (Zod schemas)
- [ ] Auth middleware enforcement
- [ ] Rate limiting
- [ ] Error handling improvements

---

## 🎯 Quick Start: Week 1 Critical Path

### Day 1: Database Persistence (Monday)

**Goal:** Stop using in-memory Map, start persisting game state

```bash
# 1. Update tsconfig.json - REMOVE these exclusions:
# Delete lines 36-40:
#   "src/services/game-service.ts",
#   "src/services/database",
#   "src/api",
#   "src/websocket",
#   "src/index.ts"

# 2. Rebuild TypeScript
npm run build

# 3. Test repositories work
node -e "const { GamesRepository } = require('./dist/services/database/repos/games.repo'); console.log('✅ Repo loaded')"
```

**Code Changes:**

**File:** `sophisticated-engine-server.js` (~line 175-178)

**BEFORE:**
```javascript
const games = new Map(); // ❌ In-memory

gameApplicationService = new GameApplicationService({
  stateMachine: stateMachine,
  gameStateStore: games, // ❌ Passing Map
  playerStatsStore: new Map()
});
```

**AFTER:**
```javascript
const { GamesRepository } = require('./dist/services/database/repos/games.repo');

// Initialize repository
const gamesRepo = new GamesRepository(getDb());

gameApplicationService = new GameApplicationService({
  stateMachine: stateMachine,
  gameStateStore: gamesRepo, // ✅ Persistent storage
  playerStatsStore: new Map()
});
```

**Testing:**
1. Start server: `node sophisticated-engine-server.js`
2. Create game via API
3. Restart server
4. Verify game still exists in database

---

### Day 2: Enable Event Logging (Tuesday)

**Goal:** Start persisting all game events for audit trail

**File:** `sophisticated-engine-server.js` (~line 138-143)

**BEFORE:**
```javascript
eventBus = new EventBus({
  eventStore: eventStore,
  persistEvents: !!eventStore, // ❌ Conditional
  asyncHandlers: true,
  swallowHandlerErrors: true,
});
```

**AFTER:**
```javascript
// Fail fast if no database
if (!eventStore) {
  console.error('❌ EventStore required for production');
  process.exit(1);
}

eventBus = new EventBus({
  eventStore: eventStore,
  persistEvents: true, // ✅ Always persist
  asyncHandlers: true,
  swallowHandlerErrors: false, // ✅ Don't hide errors in dev
});
```

**Database Migration Required:**

```sql
-- Run this migration if game_events table doesn't exist
CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB NOT NULL,
  sequence_number INTEGER NOT NULL,
  aggregate_type VARCHAR(50) DEFAULT 'Game',
  aggregate_id VARCHAR(100),
  user_id UUID,
  version INTEGER DEFAULT 1,
  metadata JSONB,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(game_id, sequence_number)
);

CREATE INDEX idx_game_events_game_id ON game_events(game_id);
CREATE INDEX idx_game_events_timestamp ON game_events(timestamp);
CREATE INDEX idx_game_events_aggregate ON game_events(aggregate_type, aggregate_id);
```

**Testing:**
1. Start server
2. Create game and perform actions
3. Query: `SELECT * FROM game_events ORDER BY timestamp DESC LIMIT 10;`
4. Verify events are being logged

---

### Day 3: Input Validation (Wednesday)

**Goal:** Validate all API inputs with Zod schemas

**Install Dependency:**
```bash
npm install zod
```

**File:** `sophisticated-engine-server.js` (add at top)

```javascript
const { z } = require('zod');

// Define validation schemas
const CreateRoomSchema = z.object({
  small_blind: z.number().int().positive(),
  big_blind: z.number().int().positive(),
  max_players: z.number().int().min(2).max(10).optional(),
  is_private: z.boolean().optional()
});

const JoinRoomSchema = z.object({
  user_id: z.string().uuid(),
  seat_index: z.number().int().min(0).max(9),
  buy_in_amount: z.number().int().positive()
});

const PlayerActionSchema = z.object({
  player_id: z.string().uuid(),
  action: z.enum(['FOLD', 'CALL', 'RAISE', 'CHECK', 'BET', 'ALL_IN']),
  amount: z.number().int().positive().optional()
});

// Validation middleware
function validateBody(schema) {
  return (req, res, next) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
  };
}
```

**Update Endpoints:**

**BEFORE:**
```javascript
app.post('/api/rooms', async (req, res) => {
  const { small_blind, big_blind } = req.body; // ❌ No validation
  // ...
});
```

**AFTER:**
```javascript
app.post('/api/rooms', validateBody(CreateRoomSchema), async (req, res) => {
  const { small_blind, big_blind } = req.validatedBody; // ✅ Validated
  // ...
});

app.post('/api/rooms/:id/join', validateBody(JoinRoomSchema), async (req, res) => {
  const { user_id, seat_index, buy_in_amount } = req.validatedBody;
  // ...
});

app.post('/api/games/:id/action', validateBody(PlayerActionSchema), async (req, res) => {
  const { player_id, action, amount } = req.validatedBody;
  // ...
});
```

**Apply to ALL endpoints** (15+ total).

---

### Day 4: Auth Middleware (Thursday)

**Goal:** Require authentication on all endpoints

**File:** `sophisticated-engine-server.js` (add after Supabase init)

```javascript
// Auth middleware (already exists around line 94-119)
// Make it stricter:

async function authenticateUser(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please provide a valid Bearer token'
      });
    }
    
    const token = authHeader.substring(7);
    
    if (!supabase) {
      console.error('❌ Auth service not initialized');
      return res.status(503).json({ 
        error: 'Auth service unavailable',
        message: 'Server configuration error'
      });
    }
    
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      console.warn('⚠️ Invalid token attempt:', error?.message);
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Please login again'
      });
    }
    
    // Attach user to request
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    console.error('❌ Auth error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      message: 'Internal server error'
    });
  }
}

// Apply to all API routes
app.use('/api/*', authenticateUser);
```

**Frontend Update:**

**File:** `public/js/auth-manager.js` (add method)

```javascript
getAuthHeaders() {
  const session = this.supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('No auth token available');
  }
  
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
}
```

**Update ALL fetch calls:**

**BEFORE:**
```javascript
const response = await fetch('/api/rooms', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ small_blind: 10, big_blind: 20 })
});
```

**AFTER:**
```javascript
const response = await fetch('/api/rooms', {
  method: 'POST',
  headers: window.authManager.getAuthHeaders(),
  body: JSON.stringify({ small_blind: 10, big_blind: 20 })
});
```

---

### Day 5: Rate Limiting (Friday)

**Goal:** Prevent abuse and DDoS

**Install Dependency:**
```bash
npm install express-rate-limit
```

**File:** `sophisticated-engine-server.js`

```javascript
const rateLimit = require('express-rate-limit');

// Global rate limiter (100 requests per 15 minutes)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for resource creation (5 per 15 minutes)
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many rooms created, please wait' }
});

// Action limiter (1 per second per player)
const actionLimiter = rateLimit({
  windowMs: 1000,
  max: 1,
  keyGenerator: (req) => req.body.player_id || req.ip,
  message: { error: 'Action too fast, please wait' }
});

// Apply limiters
app.use('/api/', globalLimiter);
app.post('/api/rooms', createLimiter);
app.post('/api/games', createLimiter);
app.post('/api/games/:id/action', actionLimiter);
```

---

## 📋 Week 1 Checklist

- [ ] Day 1: Database persistence working
- [ ] Day 2: Event logging enabled
- [ ] Day 3: Input validation on all endpoints
- [ ] Day 4: Auth middleware enforced
- [ ] Day 5: Rate limiting active
- [ ] All tests passing
- [ ] Server restart doesn't lose data
- [ ] Documentation updated

---

## 🔄 Week 2-4: Modularization

### Extract Routes Module

**Create:** `src/routes/rooms.routes.ts`

```typescript
import { Router } from 'express';
import { RoomController } from '../controllers/room.controller';
import { validateBody } from '../middleware/validation.middleware';
import { authenticateUser } from '../middleware/auth.middleware';
import { CreateRoomSchema, JoinRoomSchema } from '../schemas/room.schemas';

export function createRoomRoutes(controller: RoomController): Router {
  const router = Router();
  
  // All routes require auth
  router.use(authenticateUser);
  
  // POST /api/rooms - Create room
  router.post('/', validateBody(CreateRoomSchema), async (req, res) => {
    try {
      const room = await controller.createRoom(req.userId, req.validatedBody);
      res.status(201).json(room);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // GET /api/rooms/:id - Get room details
  router.get('/:id', async (req, res) => {
    try {
      const room = await controller.getRoom(req.params.id);
      res.json(room);
    } catch (error) {
      res.status(404).json({ error: 'Room not found' });
    }
  });
  
  // POST /api/rooms/:id/join - Join room
  router.post('/:id/join', validateBody(JoinRoomSchema), async (req, res) => {
    try {
      const result = await controller.joinRoom(
        req.params.id,
        req.userId,
        req.validatedBody
      );
      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });
  
  return router;
}
```

**Repeat for:**
- `games.routes.ts`
- `users.routes.ts`
- `friends.routes.ts` (when implementing)

---

## 🚀 Week 5-6: Scaling Infrastructure

### Redis Setup

**Install Dependencies:**
```bash
npm install redis ioredis connect-redis express-session @socket.io/redis-adapter
```

**Create:** `src/infrastructure/redis/connection.ts`

```typescript
import Redis from 'ioredis';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3
    });
    
    redisClient.on('error', (err) => {
      console.error('❌ Redis connection error:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });
  }
  
  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
```

### Session Store

**File:** `sophisticated-engine-server.js`

```javascript
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const { getRedisClient } = require('./dist/infrastructure/redis/connection');

const redisClient = getRedisClient();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'your-secret-key-here',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));
```

### Socket.IO Redis Adapter

```javascript
const { createAdapter } = require('@socket.io/redis-adapter');

const pubClient = getRedisClient();
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));

console.log('✅ Socket.IO Redis adapter enabled (multi-server ready)');
```

---

## 🎯 Week 7-8: Polish & Deploy

### CI/CD Pipeline

**Create:** `.github/workflows/deploy.yml`

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
        run: |
          # Your deployment script
          ./scripts/deploy.sh
```

### Health Check Endpoints

```javascript
// Database health
app.get('/health/db', async (req, res) => {
  try {
    await getDb().query('SELECT 1');
    res.json({ status: 'healthy' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// Redis health
app.get('/health/redis', async (req, res) => {
  try {
    await getRedisClient().ping();
    res.json({ status: 'healthy' });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
  }
});

// Overall health
app.get('/health', async (req, res) => {
  const checks = await Promise.allSettled([
    getDb().query('SELECT 1'),
    getRedisClient().ping()
  ]);
  
  const healthy = checks.every(c => c.status === 'fulfilled');
  
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    checks: {
      database: checks[0].status,
      redis: checks[1].status
    }
  });
});
```

---

## ✅ Final Verification

### Production Readiness Checklist

**Infrastructure:**
- [ ] Database persistence working
- [ ] Event logging enabled
- [ ] Redis sessions configured
- [ ] Multi-server support via Redis adapter
- [ ] Health check endpoints responding

**Security:**
- [ ] All endpoints require authentication
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] HTTPS enforced in production

**Monitoring:**
- [ ] Error tracking (Sentry) configured
- [ ] Metrics collection (Prometheus) setup
- [ ] Log aggregation working
- [ ] Alerting configured

**Testing:**
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Load testing completed
- [ ] Failover tested

**Documentation:**
- [ ] API documentation complete
- [ ] Deployment guide written
- [ ] Architecture diagrams updated
- [ ] Runbook created

---

## 🆘 Troubleshooting

### Server Won't Start After Changes

```bash
# Check TypeScript compilation
npm run build

# Check for syntax errors
node -c sophisticated-engine-server.js

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Check Redis connection
redis-cli ping
```

### Events Not Being Logged

```sql
-- Check if table exists
\dt game_events

-- Check if events are being written
SELECT COUNT(*) FROM game_events;

-- Check recent events
SELECT * FROM game_events ORDER BY timestamp DESC LIMIT 5;
```

### Performance Issues

```bash
# Check database pool
curl http://localhost:3000/health/db

# Check Redis
curl http://localhost:3000/health/redis

# Check active connections
netstat -an | grep 3000 | wc -l

# Check memory usage
ps aux | grep node
```

---

## 📞 Support

**Questions?** Review:
- `TECHNICAL_DEBT_AUDIT.md` - Full analysis
- `DEVELOPMENT_ROADMAP.md` - Feature roadmap
- `CONTRIBUTING.md` - Contribution guidelines

**Stuck?** Create an issue with:
- What you're trying to do
- What error you're seeing
- What you've tried already

---

**Document Version:** 1.0  
**Last Updated:** October 21, 2025  
**Maintained By:** Engineering Team

