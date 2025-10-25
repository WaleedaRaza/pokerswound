# 🎯 POKERGEEK.AI - PRODUCTION BATTLEPLAN
### *The Chess.com of Poker - Complete Strategic Mandate*

**Last Updated:** October 25, 2025  
**Version:** 1.0  
**Status:** 85% Infrastructure, 20% Features, MVP 8-12 weeks away

---

## 📋 **DOCUMENT PURPOSE**

This is the **ONLY** strategic planning document you need. It replaces:
- PROJECT_MASTER.md (too general)
- ARCHITECTURE_MIGRATION_GUIDE.md (too technical)  
- STRATEGIC_OVERVIEW_OCT24.md (outdated)
- CURRENT_STATE.md (incomplete)
- All WEEK*_PLAN.md files (fragmented)

**Update this document weekly. Archive completed work. Keep root directory clean.**

---

## **I. GROUND TRUTH - WHERE WE ACTUALLY ARE**

### **A) Infrastructure Reality Check** ✅ **85% Complete**

#### **What's VERIFIED Working:**

```
✅ Core Poker Engine
   - Full Texas Hold'em (PREFLOP → FLOP → TURN → RIVER → SHOWDOWN)
   - All-in scenarios with progressive reveal
   - Pot management, blinds, position tracking
   - Hand evaluation and winner determination
   - TypeScript: GameStateMachine, BettingEngine, TurnManager, HandEvaluator

✅ Database Persistence (Dual-Write Pattern ACTIVE)
   - game_states table: Writes on every state change
   - hand_history table: Writes on hand completion
   - room_seats table: Updates chips after each hand
   - games/hands tables: Created via fullGameRepository
   - StorageAdapter: In-memory (fast) + Database (persistent)
   
✅ Modular Architecture (48 endpoints, 5 routers)
   - routes/rooms.js: 22 endpoints, 1,072 lines
   - routes/games.js: 7 endpoints, 630 lines  
   - routes/auth.js: 3 endpoints, ~100 lines
   - routes/v2.js: 3 endpoints, 117 lines
   - routes/pages.js: 13 page routes, 74 lines
   - Dependency injection via app.locals
   
✅ WebSocket Real-Time (Socket.IO)
   - Room-based broadcasts
   - join_room, start_game, game_state_update events
   - seat_update broadcasts
   - websocket/socket-handlers.js (modularized)
   
✅ Authentication (Supabase)
   - Google OAuth integration
   - Guest users (UUID-based)
   - JWT tokens with authenticateToken middleware
   - user_profiles table with auth.users linkage
   
✅ Schema (Complete for ALL features)
   - 60+ tables covering: games, rooms, hands, actions
   - Hand history, game history, player stats
   - Friends, clubs, tournaments, ranked system
   - AI analysis, GTO solutions, embeddings
   - Chat, spectator, admin/moderation
```

#### **What's NOT Working (Evidence-Based):**

```
❌ Session Persistence
   - Current: clientside sessionStorage hacks
   - Need: Redis-backed sessions for horizontal scaling
   
❌ Event Sourcing
   - Infrastructure exists, DISABLED
   - Reason: Table mismatch (game_events vs domain_events)
   - Impact: No event replay, no audit trail
   
❌ Hand History Retrieval
   - Writes work (sophisticated-engine-server.js:2377-2392)
   - No GET endpoints exist to retrieve
   
❌ Game History Retrieval  
   - Table exists, no endpoints
   
❌ Refresh Recovery
   - Code exists (3 attempts by Anton):
     • Backend /my-state endpoint (routes/rooms.js:217-273)
     • Frontend recovery logic (poker.html:3616-3706)
     • Flag system to prevent UI race conditions
   - STATUS: UNTESTED (needs validation)
   
❌ Horizontal Scaling
   - No Redis integration
   - Single-server architecture
   - Can't run multiple instances
   
❌ Test Coverage
   - Zero automated tests
   - Manual testing only
   - 90-hour routing bug proves this is critical
```

### **B) Feature Reality Matrix**

| Feature | Schema | Backend Write | Backend Read | Frontend | Integration | Status |
|---------|--------|---------------|--------------|----------|-------------|--------|
| **Core Game Flow** | ✅ | ✅ | ✅ | ✅ | ✅ | **100%** |
| **Room Creation** | ✅ | ✅ | ✅ | ✅ | ✅ | **100%** |
| **Seat Management** | ✅ | ✅ | ✅ | ✅ | ✅ | **100%** |
| **Hand History** | ✅ | ✅ | ❌ | ❌ | ❌ | **30%** |
| **Game History** | ✅ | ❌ | ❌ | ❌ | ❌ | **10%** |
| **Chat** | ✅ | ❌ | ❌ | ❌ | ❌ | **5%** |
| **Nicknames** | ✅ | ❌ | ❌ | ⚠️ Partial | ❌ | **15%** |
| **Action Timers** | ❌ | ❌ | ❌ | ✅ **Built** | ❌ | **25%** |
| **Player Status** | ❌ | ❌ | ❌ | ✅ **Built** | ❌ | **20%** |
| **Rebuy System** | ✅ | ❌ | ❌ | ❌ | ❌ | **5%** |
| **Card Reveal** | ❌ | ❌ | ❌ | ❌ | ❌ | **0%** |
| **Public Rooms** | ✅ | ❌ | ❌ | ❌ | ❌ | **10%** |
| **Spectator Mode** | ✅ | ❌ | ❌ | ❌ | ❌ | **5%** |
| **Friend System** | ✅ | ❌ | ❌ | ⚠️ Shell | ❌ | **5%** |
| **Clubs** | ✅ | ❌ | ❌ | ❌ | ❌ | **5%** |
| **Ranked System** | ✅ | ❌ | ❌ | ❌ | ❌ | **5%** |
| **Tournaments** | ✅ | ❌ | ❌ | ❌ | ❌ | **5%** |
| **Post-Game Analysis** | ✅ | ❌ | ❌ | ⚠️ Shell | ❌ | **5%** |
| **AI LLM Integration** | ❌ | ❌ | ❌ | ❌ | ❌ | **0%** |
| **GTO Solver** | ✅ | ❌ | ❌ | ⚠️ Shell | ❌ | **0%** |

**Key Insight:** Database schema exists for EVERYTHING. Backend logic exists for NOTHING except core game flow.

### **C) The "Secret Victory" Discovery**

**Week 2 Days 5-7 Managers - FULLY BUILT BUT DORMANT:**

```javascript
public/js/game-state-manager.js (364 lines)
  ✅ Centralized state management
  ✅ LocalStorage persistence for recovery
  ✅ State change listeners
  ✅ Optimistic updates
  ✅ Reconnection handling
  ❌ NOT CALLED ANYWHERE

public/js/action-timer-manager.js (258 lines)
  ✅ 30-second countdown timer
  ✅ Auto-fold on timeout
  ✅ Visual warnings at 10s/5s
  ✅ Timebank support (60s one-time use)
  ✅ Server time sync
  ❌ NOT CALLED ANYWHERE

public/js/player-status-manager.js (284 lines)
  ✅ ACTIVE/AWAY/OFFLINE status tracking
  ✅ Idle detection
  ✅ Status UI indicators
  ✅ Auto-status updates
  ❌ NOT WIRED UP
```

**Impact:** 906 lines of polished, production-ready code sitting idle.

**Integration Cost:** ~4 hours to wire into game flow.

**Value:** Solves Week 2 Days 5-7 objectives instantly.

---

## **II. THE CRITICAL PATH TO PRODUCTION**

### **Phase 0: VALIDATE CURRENT STATE** ⚠️ **CRITICAL REALITY CHECK** (1 hour)

**Visual Confirmation Received:**
- Screenshot 1: Active game (cards dealt, pot showing) ✅ This is correct
- Screenshot 2: Lobby (seats TAKEN/CLAIM) ✅ Correct for pre-game
- **Bug Confirmed:** Refresh during game → Shows lobby instead of game ❌

**Anton's Fixes Exist But Don't Work:**
- ✅ Code exists: `/my-state` endpoint, frontend recovery, flag system
- ❌ Reality: Still shows lobby on refresh (proven by screenshots)
- **Conclusion:** Band-aid approach failed. Need proper architecture.

**Phase 0 Decision:**

**SKIP incremental testing. The bug is ARCHITECTURAL, not a missed edge case.**

**Root Causes (Validated by Screenshots):**
1. **Ephemeral Identity:** Seats bound to socket.id, not player_id
2. **No Session Persistence:** localStorage hacks, no server-side session store
3. **Immediate Seat Release:** Disconnect = seat freed instantly
4. **No Reconnection Handshake:** New connection treated as new player
5. **Client-Side State:** No server snapshot/event log for resync

**Decision:** Move directly to Phase 1 with proper session architecture.

**Anton fought symptoms. We're fixing the disease.**

---

### **Phase 1: PROPER SESSION ARCHITECTURE** (1-2 weeks)

**Goal:** Server-authoritative session management with Redis

**The Proper Solution (Not Band-Aids):**

Your technical proposal is the correct architecture. Implementing it systematically.

#### **1.1: Stable Identity System (Day 1-2 - 8 hours)**

**Problem:** Seats bound to socket.id (ephemeral), not player_id (stable)

**Solution: Server-Side Session Store**

**Backend - Session Management:**
```javascript
// Install dependencies
npm install redis ioredis express-session connect-redis

// sophisticated-engine-server.js
const Redis = require('ioredis');
const session = require('express-session');
const RedisStore = require('connect-redis').default;

const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

// Session middleware (BEFORE routes)
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  }
}));

// Guest user creation
router.post('/auth/anon', async (req, res) => {
  const playerId = uuidv4();
  const sessionId = req.sessionID;
  
  // Store in Redis
  await redisClient.hset(`session:${sessionId}`, {
    playerId,
    isGuest: true,
    createdAt: Date.now()
  });
  
  req.session.playerId = playerId;
  req.session.isGuest = true;
  
  res.json({ playerId, sessionId });
});

// Session refresh
router.get('/session/refresh', (req, res) => {
  if (!req.session.playerId) {
    return res.status(401).json({ error: 'No session' });
  }
  
  res.json({
    playerId: req.session.playerId,
    sessionId: req.sessionID,
    isGuest: req.session.isGuest
  });
});
```

**Success Criteria:**
- ✅ Logged-in users: Access token in HttpOnly cookie
- ✅ Guests: Anonymous UUID server-side, session in Redis
- ✅ Seats always bound to player_id, never socket.id

#### **1.2: Server-Authoritative Seat Binding with Grace Period (Day 3-4 - 12 hours)**

**Problem:** Disconnect = seat freed immediately

**Solution: Seat Status + Grace Period + Claim Tokens**

**Database Migration:**
```sql
-- Add to existing room_seats table
ALTER TABLE room_seats ADD COLUMN status TEXT DEFAULT 'occupied' 
  CHECK (status IN ('occupied', 'disconnected', 'empty'));
ALTER TABLE room_seats ADD COLUMN seat_claim_token TEXT;
ALTER TABLE room_seats ADD COLUMN grace_expires_at TIMESTAMPTZ;

CREATE INDEX idx_room_seats_player_active ON room_seats(player_id, room_id) 
  WHERE status IN ('occupied', 'disconnected');
```

**Backend - Seat Claim System:**
```javascript
const jwt = require('jsonwebtoken');

// Generate seat claim token (on seat claim)
async function claimSeat(roomId, seatIndex, playerId) {
  // Create signed token
  const seatToken = jwt.sign(
    { roomId, seatIndex, playerId },
    process.env.SEAT_SECRET,
    { expiresIn: '2h' } // Token valid for 2 hours
  );
  
  await db.query(`
    UPDATE room_seats 
    SET player_id = $1, 
        status = 'occupied',
        seat_claim_token = $2,
        occupied_at = NOW()
    WHERE room_id = $3 AND seat_index = $4 AND player_id IS NULL
  `, [playerId, seatToken, roomId, seatIndex]);
  
  return seatToken;
}

// On disconnect: Mark disconnected, start grace timer
socket.on('disconnect', async () => {
  const { playerId, roomId, seatIndex } = socket.data;
  
  // Mark disconnected with 90-second grace period
  await db.query(`
    UPDATE room_seats 
    SET status = 'disconnected',
        grace_expires_at = NOW() + INTERVAL '90 seconds'
    WHERE room_id = $1 AND seat_index = $2 AND player_id = $3
  `, [roomId, seatIndex, playerId]);
  
  console.log(`[GRACE] Player ${playerId} disconnected, seat held for 90s`);
  
  // Schedule grace expiration
  setTimeout(async () => {
    const seat = await db.query(`
      SELECT status FROM room_seats 
      WHERE room_id = $1 AND seat_index = $2 AND player_id = $3
    `, [roomId, seatIndex, playerId]);
    
    if (seat.rows[0]?.status === 'disconnected') {
      // Grace expired, free seat
      await db.query(`
        UPDATE room_seats 
        SET player_id = NULL, status = 'empty', seat_claim_token = NULL
        WHERE room_id = $1 AND seat_index = $2
      `, [roomId, seatIndex]);
      
      io.to(`room:${roomId}`).emit('seat_freed', { seatIndex });
    }
  }, 90000);
});

// On reconnect: Validate token, restore seat instantly
async function resumeSeat(socket, seatToken) {
  try {
    const { roomId, seatIndex, playerId } = jwt.verify(seatToken, process.env.SEAT_SECRET);
    
    // Verify seat still held
    const seat = await db.query(`
      SELECT * FROM room_seats 
      WHERE room_id = $1 AND seat_index = $2 AND player_id = $3
      AND status IN ('occupied', 'disconnected')
    `, [roomId, seatIndex, playerId]);
    
    if (seat.rowCount === 0) {
      return { success: false, reason: 'seat_lost' };
    }
    
    // Resume seat
    await db.query(`
      UPDATE room_seats 
      SET status = 'occupied', grace_expires_at = NULL
      WHERE room_id = $1 AND seat_index = $2
    `, [roomId, seatIndex]);
    
    socket.data = { playerId, roomId, seatIndex };
    socket.join(`room:${roomId}`);
    
    console.log(`[RESUME] Player ${playerId} resumed seat ${seatIndex}`);
    return { success: true, seat: seat.rows[0] };
    
  } catch (err) {
    return { success: false, reason: 'invalid_token' };
  }
}
```

**Success Criteria:**
- ✅ Disconnect marks seat 'disconnected', not 'empty'
- ✅ 90-second grace period before seat freed
- ✅ Reconnect with valid token resumes instantly
- ✅ No "seat taken" messages during grace period

#### **1.3: Reconnect-First WebSocket Handshake (Day 5 - 8 hours)**

**Problem:** New connection treated as new player, not reconnection

**Solution: Session Resumption Protocol**

**Backend - Socket.IO Middleware:**
```javascript
// sophisticated-engine-server.js - BEFORE io.on('connection')

io.use(async (socket, next) => {
  const { sessionId, roomId, seatToken } = socket.handshake.auth;
  
  if (!sessionId) {
    return next(new Error('No session'));
  }
  
  // Validate session
  const session = await redisClient.hgetall(`session:${sessionId}`);
  if (!session || !session.playerId) {
    return next(new Error('Invalid session'));
  }
  
  socket.data.playerId = session.playerId;
  socket.data.sessionId = sessionId;
  socket.data.isGuest = session.isGuest === 'true';
  
  // If resuming a seat, validate and restore
  if (roomId && seatToken) {
    const resumeResult = await resumeSeat(socket, seatToken);
    if (resumeResult.success) {
      socket.data.roomId = roomId;
      socket.data.seatIndex = resumeResult.seat.seat_index;
      console.log(`[HANDSHAKE] Player ${socket.data.playerId} resuming seat`);
    }
  }
  
  next();
});

// On connection: Send resume status
io.on('connection', (socket) => {
  if (socket.data.roomId && socket.data.seatIndex !== undefined) {
    // Reconnection detected
    socket.emit('resume_ok', {
      roomId: socket.data.roomId,
      seatIndex: socket.data.seatIndex,
      playerId: socket.data.playerId
    });
    
    // Fetch current game state
    fetchGameState(socket.data.roomId).then(gameState => {
      socket.emit('state_sync', gameState);
    });
    
  } else {
    // New connection
    socket.emit('hello', {
      playerId: socket.data.playerId,
      sessionId: socket.data.sessionId
    });
  }
});
```

**Frontend - Reconnection Logic:**
```javascript
// poker.html - Initialize Socket.IO with auth
const sessionId = localStorage.getItem('sessionId');
const roomId = localStorage.getItem('currentRoomId');
const seatToken = localStorage.getItem('seatToken');

const socket = io('http://localhost:3000', {
  auth: {
    sessionId,
    roomId,
    seatToken
  },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000
});

socket.on('resume_ok', async (data) => {
  console.log('[RECONNECT] Seat resumed!', data);
  
  // Hide lobby, show game immediately
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game-table').style.display = 'block';
  
  // Wait for state_sync
  window.isWaitingForSync = true;
});

socket.on('state_sync', (gameState) => {
  console.log('[SYNC] Received game state', gameState);
  window.isWaitingForSync = false;
  
  // Render game state
  renderGameTable(gameState);
  updatePlayerChips(gameState.players);
  updatePot(gameState.pot);
  updateCommunityCards(gameState.communityCards);
  
  // If it's your turn, show action buttons
  if (gameState.toAct === window.mySeatIndex) {
    showActionButtons(gameState.legalActions);
  }
});

socket.on('hello', (data) => {
  console.log('[NEW] New connection', data);
  // Show lobby/room selection
});
```

**Success Criteria:**
- ✅ Refresh during game → `resume_ok` fires, game renders
- ✅ Refresh in lobby → `hello` fires, lobby shows
- ✅ No "seat taken" errors on refresh
- ✅ State sync arrives before user can act

#### **1.4: Snapshots + Event Log for Fast Resync (Day 6-7 - 10 hours)**

**Problem:** Client has no idea what happened while disconnected

**Solution: Event Sourcing + Periodic Snapshots**

**Database Tables (Already Exist):**
```sql
-- actions table already exists (see Schemasnapshot.txt)
CREATE TABLE IF NOT EXISTS hand_snapshots (
  hand_id UUID PRIMARY KEY,
  seq INTEGER NOT NULL,           -- Last applied action sequence
  snapshot JSONB NOT NULL,         -- Full game state at this point
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_hand_snapshots_updated ON hand_snapshots(updated_at DESC);
```

**Backend - Snapshot Creation:**
```javascript
// After each street (FLOP, TURN, RIVER), save snapshot
async function saveHandSnapshot(handId, gameState, lastSeq) {
  await db.query(`
    INSERT INTO hand_snapshots (hand_id, seq, snapshot)
    VALUES ($1, $2, $3)
    ON CONFLICT (hand_id) DO UPDATE 
    SET seq = $2, snapshot = $3, updated_at = NOW()
  `, [handId, lastSeq, JSON.stringify(gameState)]);
}

// On state_sync request, send snapshot + events since
async function getStateSyncData(handId, clientLastSeq = 0) {
  // Get latest snapshot
  const snapshotResult = await db.query(
    'SELECT * FROM hand_snapshots WHERE hand_id = $1',
    [handId]
  );
  
  const snapshot = snapshotResult.rows[0];
  
  // Get events since snapshot (or since client's last known seq)
  const sinceSeq = Math.max(snapshot?.seq || 0, clientLastSeq);
  const eventsResult = await db.query(`
    SELECT * FROM actions 
    WHERE hand_id = $1 AND sequence_number > $2
    ORDER BY sequence_number ASC
  `, [handId, sinceSeq]);
  
  return {
    snapshot: snapshot?.snapshot || null,
    snapshotSeq: snapshot?.seq || 0,
    events: eventsResult.rows
  };
}
```

**Frontend - Apply Snapshot + Events:**
```javascript
socket.on('state_sync', ({ snapshot, snapshotSeq, events }) => {
  console.log(`[SYNC] Received snapshot at seq ${snapshotSeq}, ${events.length} events since`);
  
  // Start with snapshot
  let gameState = snapshot;
  
  // Apply each event sequentially
  events.forEach(event => {
    gameState = applyEvent(gameState, event);
  });
  
  // Render final state
  renderGameTable(gameState);
  window.currentSeq = snapshotSeq + events.length;
});

function applyEvent(state, event) {
  switch (event.action_type) {
    case 'FOLD':
      return { ...state, players: state.players.map(p => 
        p.id === event.player_id ? { ...p, status: 'folded' } : p
      )};
    case 'BET':
    case 'RAISE':
      return {
        ...state,
        pot: event.pot_after,
        currentBet: event.amount,
        players: state.players.map(p =>
          p.id === event.player_id ? { ...p, chips: p.chips - event.amount } : p
        )
      };
    // ... other action types
    default:
      return state;
  }
}
```

**Success Criteria:**
- ✅ Snapshots created after each street
- ✅ Events stored in actions table
- ✅ Reconnect receives snapshot + events
- ✅ Client can rebuild exact game state

#### **1.5: Redis Adapter + Multi-Server Support (Day 8 - 6 hours)**

**Implementation:**
```javascript
const { createAdapter } = require('@socket.io/redis-adapter');

const pubClient = redisClient.duplicate();
const subClient = redisClient.duplicate();

await pubClient.connect();
await subClient.connect();

io.adapter(createAdapter(pubClient, subClient));
```

**Success Criteria:**
- ✅ Can run 2+ servers simultaneously
- ✅ User on Server A receives broadcasts from Server B
- ✅ Rooms work seamlessly across servers

**Phase 1 Total Time:** 1-2 weeks (8 days * 6-10 hours = 48-80 hours)  
**Phase 1 Outcome:** Refresh works perfectly, production-ready architecture

---

### **Phase 2: INTEGRATE BUILT MANAGERS** (4-6 hours)

**Goal:** Activate 906 lines of dormant code

#### **2.1: Action Timer Integration (2 hours)**

**Where to Call:**
```javascript
// routes/games.js - When turn changes
const ActionTimerManager = require('../public/js/action-timer-manager');

// After processing action, if turn changed
if (result.nextToAct !== previousPlayer) {
  // Broadcast timer start to frontend
  io.to(`room:${roomId}`).emit('timer_start', {
    playerId: result.nextToAct,
    duration: 30,
    canCheck: result.currentBet === 0
  });
}
```

**Frontend Integration:**
```javascript
// poker.html - Listen for timer
const actionTimer = new ActionTimerManager({ duration: 30 });

socket.on('timer_start', (data) => {
  actionTimer.start(data.playerId, data.canCheck);
});

actionTimer.onTimeout(() => {
  // Auto-fold this player
  socket.emit('player_action', {
    gameId: currentGameId,
    action: { type: 'FOLD' }
  });
});
```

**Success Criteria:**
- ✅ Turn timer appears with countdown
- ✅ Warnings at 10s and 5s
- ✅ Auto-fold triggers on timeout
- ✅ Next player's turn starts

#### **2.2: Game State Manager Integration (1 hour)**

**Frontend Integration:**
```javascript
// poker.html - Initialize on page load
const gameStateManager = new GameStateManager();

// On any game update
socket.on('game_state_update', (state) => {
  gameStateManager.updateState(state);
  // Auto-persists to localStorage
  // Triggers UI updates via listeners
});

// On refresh, restore from localStorage
const savedState = gameStateManager.getState();
if (savedState.gameId) {
  console.log('Recovered game state:', savedState);
}
```

**Success Criteria:**
- ✅ Game state persists to localStorage
- ✅ Refresh recovers last known state
- ✅ State changes trigger UI updates

#### **2.3: Player Status Integration (2 hours)**

**Backend Integration:**
```javascript
// sophisticated-engine-server.js - Track player status
const playerStatusManager = new Map(); // playerId -> status

socket.on('player_idle', (data) => {
  playerStatusManager.set(data.playerId, 'AWAY');
  io.to(`room:${data.roomId}`).emit('player_status_change', {
    playerId: data.playerId,
    status: 'AWAY'
  });
});

socket.on('player_active', (data) => {
  playerStatusManager.set(data.playerId, 'ACTIVE');
  io.to(`room:${data.roomId}`).emit('player_status_change', {
    playerId: data.playerId,
    status: 'ACTIVE'
  });
});
```

**Frontend Integration:**
```javascript
// poker.html - Initialize status manager
const statusManager = new PlayerStatusManager();

// Add players when game starts
socket.on('hand_started', (data) => {
  data.players.forEach(p => {
    statusManager.addPlayer(p.id, p.seatIndex);
  });
});

// Broadcast status changes
statusManager.onStatusChange((playerId, status) => {
  socket.emit('player_status_update', { playerId, status });
});
```

**Success Criteria:**
- ✅ Player status (ACTIVE/AWAY/OFFLINE) displays
- ✅ Idle detection works (30s no action = AWAY)
- ✅ Visual indicators show status

**Phase 2 Total Time:** 4-6 hours  
**Phase 2 Outcome:** Week 2 Days 5-7 objectives complete

---

### **Phase 3: FEATURE VELOCITY** (2-3 weeks)

**Goal:** Build MVP feature set in rapid succession

#### **Priority 1: Hand History (Day 1-2 - 8 hours)**

**Backend Endpoints:**
```javascript
// routes/games.js

// GET /api/users/:userId/hands - List hands
router.get('/users/:userId/hands', async (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const db = getDb();
  
  const result = await db.query(`
    SELECT h.id, h.hand_number, h.pot_size, h.winners, h.created_at,
           r.name as room_name, g.game_id
    FROM hand_history h
    JOIN games g ON h.game_id = g.id
    JOIN rooms r ON h.room_id = r.id
    WHERE h.game_id IN (
      SELECT game_id FROM player_hand_history WHERE user_id = $1
    )
    ORDER BY h.created_at DESC
    LIMIT $2 OFFSET $3
  `, [req.params.userId, limit, offset]);
  
  res.json(result.rows);
});

// GET /api/hands/:handId - Single hand detail
router.get('/hands/:handId', async (req, res) => {
  const db = getDb();
  
  const result = await db.query(`
    SELECT * FROM hand_history WHERE id = $1
  `, [req.params.handId]);
  
  if (result.rowCount === 0) {
    return res.status(404).json({ error: 'Hand not found' });
  }
  
  res.json(result.rows[0]);
});
```

**Frontend Component:**
```javascript
// Create public/pages/hand-history.html
// Hand history viewer with:
// - Paginated list of past hands
// - Filter by date, room, stakes
// - Click to view full hand replay
```

**Success Criteria:**
- ✅ Can retrieve list of hands for user
- ✅ Can view detailed hand replay
- ✅ Pagination works
- ✅ Shows: pot size, community cards, winner

#### **Priority 2: Game History (Day 2-3 - 6 hours)**

**Backend Endpoints:**
```javascript
// GET /api/users/:userId/games
router.get('/users/:userId/games', async (req, res) => {
  const db = getDb();
  
  const result = await db.query(`
    SELECT g.id, g.game_id, g.started_at, g.ended_at,
           r.name as room_name,
           COUNT(h.id) as hands_played,
           SUM(CASE WHEN $1 = ANY(h.winners::jsonb) THEN 1 ELSE 0 END) as hands_won
    FROM games g
    JOIN rooms r ON g.room_id = r.id
    LEFT JOIN hand_history h ON h.game_id = g.game_id
    WHERE g.id IN (
      SELECT game_uuid FROM player_game_history WHERE user_id = $1
    )
    GROUP BY g.id, r.name
    ORDER BY g.started_at DESC
  `, [req.params.userId]);
  
  res.json(result.rows);
});
```

**Success Criteria:**
- ✅ Can retrieve list of games for user
- ✅ Shows: duration, hands played, outcome
- ✅ Links to hand history for that game

#### **Priority 3: In-Game Chat (Day 4-5 - 10 hours)**

**Backend:**
```javascript
// routes/rooms.js

// POST /api/rooms/:roomId/chat
const chatLimiter = rateLimit({
  windowMs: 10000, // 10 seconds
  max: 5, // 5 messages
  message: 'Too many messages, slow down'
});

router.post('/:roomId/chat', authenticateToken, chatLimiter, async (req, res) => {
  const { message } = req.body;
  const { roomId } = req.params;
  const userId = req.user.id;
  
  // Profanity filter
  if (containsProfanity(message)) {
    return res.status(400).json({ error: 'Message contains inappropriate content' });
  }
  
  const db = getDb();
  await db.query(`
    INSERT INTO chat_messages (room_id, user_id, message)
    VALUES ($1, $2, $3)
  `, [roomId, userId, message]);
  
  // Broadcast via Socket.IO
  io.to(`room:${roomId}`).emit('chat_message', {
    userId,
    username: req.user.display_name || 'Guest',
    message,
    timestamp: Date.now()
  });
  
  res.json({ success: true });
});

// GET /api/rooms/:roomId/chat
router.get('/:roomId/chat', async (req, res) => {
  const { limit = 100 } = req.query;
  const db = getDb();
  
  const result = await db.query(`
    SELECT cm.message, cm.created_at, up.display_name as username
    FROM chat_messages cm
    LEFT JOIN user_profiles up ON cm.user_id = up.user_id
    WHERE cm.room_id = $1
    ORDER BY cm.created_at DESC
    LIMIT $2
  `, [req.params.roomId, limit]);
  
  res.json(result.rows.reverse());
});
```

**Frontend:**
```javascript
// poker.html - Add chat sidebar
<div id="chat-sidebar">
  <div id="chat-messages"></div>
  <input type="text" id="chat-input" placeholder="Type message..." />
  <button id="chat-send">Send</button>
</div>

// Listen for messages
socket.on('chat_message', (data) => {
  appendChatMessage(data.username, data.message, data.timestamp);
});

// Send message
document.getElementById('chat-send').onclick = async () => {
  const message = document.getElementById('chat-input').value;
  await fetch(`/api/rooms/${roomId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ message })
  });
  document.getElementById('chat-input').value = '';
};
```

**Success Criteria:**
- ✅ Chat messages send and receive in real-time
- ✅ Rate limiting prevents spam
- ✅ Profanity filter works
- ✅ Messages persist to database
- ✅ Chat history loads on join

#### **Priority 4: Nicknames & Profiles (Day 6-8 - 12 hours)**

**Backend:**
```javascript
// routes/auth.js

// PATCH /api/users/:userId/profile
router.patch('/users/:userId/profile', authenticateToken, async (req, res) => {
  const { display_name, avatar_url, bio } = req.body;
  const db = getDb();
  
  // Validate display_name uniqueness
  if (display_name) {
    const existingUser = await db.query(
      'SELECT user_id FROM user_profiles WHERE display_name = $1 AND user_id != $2',
      [display_name, req.params.userId]
    );
    
    if (existingUser.rowCount > 0) {
      return res.status(400).json({ error: 'Display name already taken' });
    }
  }
  
  await db.query(`
    UPDATE user_profiles 
    SET display_name = COALESCE($1, display_name),
        avatar_url = COALESCE($2, avatar_url),
        bio = COALESCE($3, bio),
        updated_at = NOW()
    WHERE user_id = $4
  `, [display_name, avatar_url, bio, req.params.userId]);
  
  res.json({ success: true });
});

// GET /api/users/:userId/profile
router.get('/users/:userId/profile', async (req, res) => {
  const db = getDb();
  const result = await db.query(
    'SELECT * FROM user_profiles WHERE user_id = $1',
    [req.params.userId]
  );
  
  res.json(result.rows[0]);
});
```

**Frontend:**
```javascript
// Create public/pages/profile.html
// Profile editor with:
// - Display name input (unique, 3-20 chars)
// - Avatar upload (or URL)
// - Bio textarea
// - Save button
```

**Success Criteria:**
- ✅ Users can set unique display_name
- ✅ Nicknames show in-game instead of email/guest_id
- ✅ Profile changes persist
- ✅ Public profile page works

#### **Priority 5: Card Reveal After Showdown (Day 9 - 6 hours)**

**Implementation:**
```javascript
// routes/games.js - After showdown
if (result.newState.handState.status === 'SHOWDOWN_COMPLETE') {
  // Enter reveal phase (5 seconds)
  io.to(`room:${roomId}`).emit('reveal_phase_start', {
    duration: 5000,
    players: Array.from(result.newState.players.values()).map(p => ({
      id: p.uuid,
      canReveal: true // All players can optionally show cards
    }))
  });
  
  // After 5s, auto-end reveal phase
  setTimeout(() => {
    io.to(`room:${roomId}`).emit('reveal_phase_end');
  }, 5000);
}

// POST /api/games/:id/reveal-cards
router.post('/:id/reveal-cards', authenticateToken, async (req, res) => {
  const gameId = req.params.id;
  const { playerId } = req.body;
  
  // Get player's hole cards
  const gameState = games.get(gameId);
  const player = gameState.players.get(playerId);
  
  // Broadcast revealed cards
  io.to(`room:${gameState.roomId}`).emit('cards_revealed', {
    playerId,
    cards: player.holeCards
  });
  
  // Store in hand_history
  // ... update database
  
  res.json({ success: true });
});
```

**Frontend:**
```javascript
// poker.html - Reveal phase
socket.on('reveal_phase_start', (data) => {
  showRevealPhaseUI(data.duration);
  
  // Show "Reveal My Cards" button
  if (window.currentSeat !== null) {
    showRevealButton();
  }
});

document.getElementById('reveal-cards-btn').onclick = () => {
  socket.emit('reveal_cards', { gameId, playerId: myPlayerId });
};

socket.on('cards_revealed', (data) => {
  displayRevealedCards(data.playerId, data.cards);
});
```

**Success Criteria:**
- ✅ 5-second reveal phase after showdown
- ✅ Players can show their cards (even if folded)
- ✅ Revealed cards broadcast to all players
- ✅ Stored in hand_history

#### **Priority 6: Rebuy System (Day 10-11 - 10 hours)**

**Implementation:**
```javascript
// Detect bust-out
if (player.stack === 0) {
  io.to(`room:${roomId}`).emit('player_busted', {
    playerId: player.uuid,
    canRebuy: true
  });
}

// POST /api/rooms/:roomId/rebuy-request
router.post('/:roomId/rebuy-request', authenticateToken, async (req, res) => {
  const { userId, amount } = req.body;
  
  // Notify host
  const room = await getRoomById(req.params.roomId);
  io.to(`user:${room.host_id}`).emit('rebuy_request', {
    userId,
    amount,
    roomId: req.params.roomId
  });
  
  res.json({ success: true, message: 'Rebuy request sent to host' });
});

// POST /api/rooms/:roomId/rebuy-approve
router.post('/:roomId/rebuy-approve', authenticateToken, async (req, res) => {
  const { userId, amount } = req.body;
  const db = getDb();
  
  // Update seat chips
  await db.query(
    'UPDATE room_seats SET chips_in_play = chips_in_play + $1 WHERE room_id = $2 AND user_id = $3',
    [amount, req.params.roomId, userId]
  );
  
  // Broadcast
  io.to(`room:${req.params.roomId}`).emit('rebuy_approved', {
    userId,
    newStack: amount
  });
  
  res.json({ success: true });
});
```

**Success Criteria:**
- ✅ Bust-out detected, modal shows
- ✅ Request sent to host
- ✅ Host approves/denies
- ✅ Chips updated, player rejoins

#### **Priority 7: Public vs Private Rooms (Day 12 - 6 hours)**

**Implementation:**
```javascript
// routes/rooms.js - Create room with is_private flag
router.post('/', authenticateToken, async (req, res) => {
  const { name, is_private = true } = req.body;
  // ... rest of room creation
  
  await db.query(
    'INSERT INTO rooms (name, is_private, host_id, invite_code) VALUES ($1, $2, $3, $4)',
    [name, is_private, hostId, inviteCode]
  );
});

// GET /api/rooms/public - List public rooms
router.get('/public', async (req, res) => {
  const db = getDb();
  const result = await db.query(`
    SELECT r.id, r.name, r.created_at, r.max_seats,
           COUNT(rs.seat_index) as players_seated
    FROM rooms r
    LEFT JOIN room_seats rs ON r.id = rs.room_id AND rs.left_at IS NULL
    WHERE r.is_private = false AND r.status = 'ACTIVE'
    GROUP BY r.id
    ORDER BY r.created_at DESC
  `);
  
  res.json(result.rows);
});

// POST /api/rooms/:roomId/join-public
router.post('/:roomId/join-public', authenticateToken, async (req, res) => {
  // Auto-approve for public rooms
  // ... join logic
});
```

**Frontend:**
```javascript
// Create public/pages/lobby.html
// Public room browser with:
// - List of public rooms
// - Filter/sort options
// - "Join" button (no invite code needed)
```

**Success Criteria:**
- ✅ Can create private (default) or public rooms
- ✅ Public rooms listed in lobby
- ✅ Can join public room without code

#### **Priority 8: Admit/Remove Players Mid-Game (Day 13-14 - 10 hours)**

**Implementation:**
```javascript
// POST /api/rooms/:roomId/admit-player
router.post('/:roomId/admit-player', authenticateToken, async (req, res) => {
  const { userId } = req.body;
  
  // Check host permission
  const room = await getRoomById(req.params.roomId);
  if (req.user.id !== room.host_id) {
    return res.status(403).json({ error: 'Only host can admit players' });
  }
  
  // Mark player as approved
  await db.query(
    'UPDATE room_seats SET status = $1 WHERE room_id = $2 AND user_id = $3',
    ['APPROVED', req.params.roomId, userId]
  );
  
  io.to(`user:${userId}`).emit('admitted_to_room', { roomId: req.params.roomId });
  
  res.json({ success: true });
});

// POST /api/rooms/:roomId/remove-player
router.post('/:roomId/remove-player', authenticateToken, async (req, res) => {
  const { userId } = req.body;
  
  // Check host permission
  const room = await getRoomById(req.params.roomId);
  if (req.user.id !== room.host_id) {
    return res.status(403).json({ error: 'Only host can remove players' });
  }
  
  // If player is in active hand, wait until hand ends
  const gameState = games.get(room.game_id);
  if (gameState && gameState.handState.status !== 'COMPLETE') {
    // Mark for removal after hand
    pendingRemovals.set(userId, req.params.roomId);
    return res.json({ success: true, message: 'Player will be removed after hand ends' });
  }
  
  // Remove immediately
  await db.query(
    'UPDATE room_seats SET left_at = NOW() WHERE room_id = $1 AND user_id = $2',
    [req.params.roomId, userId]
  );
  
  io.to(`user:${userId}`).emit('removed_from_room', { roomId: req.params.roomId });
  
  res.json({ success: true });
});
```

**Success Criteria:**
- ✅ Host has "Manage Players" panel
- ✅ Can admit pending players
- ✅ Can remove players (after hand if active)

#### **Priority 9: Spectator Mode (Day 15 - 8 hours)**

**Implementation:**
```javascript
// POST /api/rooms/:roomId/spectate
router.post('/:roomId/spectate', authenticateToken, async (req, res) => {
  const db = getDb();
  
  await db.query(
    'INSERT INTO room_spectators (room_id, user_id) VALUES ($1, $2)',
    [req.params.roomId, req.user.id]
  );
  
  // Join room as spectator
  socket.join(`room:${req.params.roomId}:spectators`);
  
  res.json({ success: true });
});

// Broadcast game state to spectators (without hole cards)
function broadcastToSpectators(roomId, gameState) {
  const spectatorState = {
    ...gameState,
    players: gameState.players.map(p => ({
      ...p,
      holeCards: [] // Hide hole cards
    }))
  };
  
  io.to(`room:${roomId}:spectators`).emit('game_state_update', spectatorState);
}
```

**Success Criteria:**
- ✅ "Spectate" button for full tables
- ✅ Spectators see table, community cards, pot
- ✅ Spectators CANNOT see hole cards
- ✅ Spectator chat works (heavy rate limit)

**Phase 3 Total Time:** 2-3 weeks  
**Phase 3 Outcome:** Feature parity with pokernow.club

---

### **Phase 4: PLATFORM DIFFERENTIATION** (3-4 weeks)

**Goal:** Features pokernow.club CAN'T copy

#### **10. Friend System (Week 4 - 12 hours)**

**Backend:**
```javascript
// POST /api/friendships/request
// POST /api/friendships/accept
// POST /api/friendships/decline
// GET /api/users/:userId/friends
// GET /api/users/search?q=username
```

**Frontend:**
- Friend search by display_name
- Friend list with online status
- One-click "Invite to Game" button

**Success Criteria:**
- ✅ Can send/accept friend requests
- ✅ Friends list shows online status
- ✅ One-click invite works

#### **11. Post-Game Analysis (Week 5-6 - 24 hours)**

**Core Feature:** Chess.com-style hand replay

**Key Requirement:** **Anonymization**
- Show YOUR cards always
- Show opponent cards ONLY if revealed (shown or reached showdown)
- Never reveal hidden cards

**Implementation:**
```javascript
// GET /api/analysis/hand/:handId
router.get('/hand/:handId', authenticateToken, async (req, res) => {
  const db = getDb();
  const userId = req.user.id;
  
  // Get hand data
  const hand = await db.query('SELECT * FROM hand_history WHERE id = $1', [req.params.handId]);
  
  // Get player-specific view
  const playerView = await db.query(`
    SELECT hole_cards FROM player_hand_history 
    WHERE hand_id = $1 AND user_id = $2
  `, [req.params.handId, userId]);
  
  // Anonymize opponent cards
  const anonymizedHand = {
    ...hand.rows[0],
    players: hand.rows[0].players.map(p => {
      if (p.user_id === userId) {
        return p; // Show own cards
      } else if (p.cards_revealed || p.reached_showdown) {
        return p; // Show if revealed
      } else {
        return { ...p, hole_cards: null }; // Hide
      }
    })
  };
  
  res.json(anonymizedHand);
});
```

**Frontend:**
- Hand replay UI (step through each action)
- Pot odds display for YOUR decisions
- Mistake highlighter (e.g., "Folded winning hand")
- Statistics (VPIP, PFR, aggression)

**Success Criteria:**
- ✅ Can replay any hand you played
- ✅ See YOUR cards at all times
- ✅ See opponent cards ONLY if revealed
- ✅ Pot odds and statistics display

#### **12. Ranked System & Chip Economy (Week 7 - 16 hours)**

**Rules:**
- All users start: 500 chips
- Earn chips: Share link (+100), Watch ad (+100)
- Ranked tables: Auto-matchmaking by ELO
- Rules: Can't choose table, can't multi-table ranked
- Bust-out: Must earn more to play ranked

**Implementation:**
```javascript
// Backend: ELO calculation
function calculateELO(winnerELO, loserELO, potSize) {
  const K = 32; // K-factor
  const expectedWin = 1 / (1 + Math.pow(10, (loserELO - winnerELO) / 400));
  const newELO = winnerELO + K * (1 - expectedWin);
  return Math.round(newELO);
}

// POST /api/ranked/queue
router.post('/queue', authenticateToken, async (req, res) => {
  // Check user has >= 500 ranked chips
  // Add to matchmaking queue
  // Match with similar ELO (+/- 100)
});

// POST /api/chips/earn
router.post('/earn', authenticateToken, async (req, res) => {
  const { method } = req.body; // 'share' or 'ad'
  
  // Verify share link clicked or ad watched
  // Award 100 chips
  
  await db.query(
    'UPDATE user_profiles SET ranked_chips = ranked_chips + 100 WHERE user_id = $1',
    [req.user.id]
  );
});
```

**Success Criteria:**
- ✅ Ranked queue matchmaking works
- ✅ ELO updates on game end
- ✅ Chip earning works (share/ad)
- ✅ Can't play ranked with 0 chips

#### **13. Club System (Week 8 - 16 hours)**

**Backend:**
```javascript
// POST /api/clubs - Create club
// POST /api/clubs/:clubId/join - Join club
// GET /api/clubs/:clubId/members - List members
// GET /api/clubs/:clubId/leaderboard - Chips won ranking
// POST /api/clubs/:clubId/start-game - Invite all online members
```

**Frontend:**
- Club creation form
- Club page (members, chat, leaderboard)
- "Start Club Game" button

**Success Criteria:**
- ✅ Clubs work like communities
- ✅ Club leaderboards rank by chips won
- ✅ Club games auto-invite members

#### **14. Tournament System (Week 9-10 - 30 hours)**

**Types:**
- Sit-and-go (6/9 players)
- Scheduled tournaments
- Freerolls

**Implementation:**
- Blind escalation schedule
- Table breaking/merging logic
- Prize pool calculation
- Tournament UI

**Success Criteria:**
- ✅ Sit-and-go tournaments work
- ✅ Blind levels escalate automatically
- ✅ Prize payouts work

#### **15. AI Analysis Page (Week 11 - 20 hours)**

**LangChain Integration:**
```javascript
const { ChatOpenAI } = require('langchain/chat_models/openai');
const { PromptTemplate } = require('langchain/prompts');

// POST /api/ai/analyze-hand
const aiLimiter = rateLimit({
  windowMs: 86400000, // 24 hours
  max: 5, // 5 queries per day
  keyGenerator: (req) => req.user.id
});

router.post('/analyze-hand', authenticateToken, aiLimiter, async (req, res) => {
  const { handId } = req.body;
  
  // Get hand data
  const hand = await getHandData(handId);
  
  // Create prompt
  const prompt = PromptTemplate.fromTemplate(`
    You are a professional poker coach. Analyze this hand:
    Position: {position}
    Hole Cards: {holeCards}
    Community Cards: {communityCards}
    Actions: {actions}
    Pot Size: {potSize}
    
    Provide strategic analysis and suggest optimal play.
  `);
  
  // Call LLM
  const model = new ChatOpenAI({ temperature: 0.7 });
  const response = await model.call(prompt.format(hand));
  
  res.json({ analysis: response });
});
```

**Frontend:**
- Hand selector
- Pre-prompted buttons:
  - "Analyze this hand"
  - "What should I have done?"
  - "Calculate equity"
- Display LLM response

**Success Criteria:**
- ✅ LLM integration works
- ✅ Rate limiting enforced (5/day)
- ✅ Analysis is useful

**Phase 4 Total Time:** 3-4 weeks  
**Phase 4 Outcome:** Unique features that destroy competition

---

## **III. STRATEGIC POSITIONING**

### **Competitive Analysis**

| Feature | pokernow.club | PokerStars Home | **PokerGeek.AI** |
|---------|---------------|-----------------|------------------|
| **Hand History** | ❌ None | ⚠️ Limited | ✅ Full replay |
| **Post-Game Analysis** | ❌ None | ❌ None | ✅ Chess.com style |
| **Friend System** | ❌ Basic | ⚠️ Limited | ✅ Full featured |
| **Clubs** | ❌ None | ⚠️ Basic | ✅ Leaderboards |
| **Tournaments** | ❌ Manual | ⚠️ Complex | ✅ Easy sit-and-go |
| **AI Insights** | ❌ None | ❌ None | ✅ LLM-powered |
| **Fair RNG** | ⚠️ Suspected | ✅ Verified | ✅ Provably fair |
| **UX Quality** | 3/10 | 7/10 | **9/10** (Target) |
| **Data Persistence** | ❌ None | ⚠️ Limited | ✅ Everything |

**Our Advantage:**
1. pokernow.club has users DESPITE terrible UX
2. We can capture them with superior features + modern UX
3. No competition has post-game analysis (our chess.com edge)
4. No competition has LLM integration (our AI edge)

### **Target Market**

**Primary:** Non-gambling online poker players
- Play for fun, not money
- Want to improve skills
- Frustrated with current options
- Willing to pay for quality

**Secondary:** Casual players wanting social experience
- Play with friends
- Want easy game setup
- Value community features

**Not Targeting:** Real-money gambling
- We're NOT competing with PokerStars, GGPoker
- No cash-out, no rake, no gambling license needed

### **Revenue Model**

**Phase 1: Freemium (Months 1-6)**
```
Free Tier:
- 500 starting chips
- Earn via share link (+100) or ad (+100)
- 5 AI queries/day
- Basic features

Premium ($4.99/mo):
- Unlimited AI queries
- Ad-free experience
- Tournament priority
- Premium badge
```

**Phase 2: Chip Sales (Month 7+)**
```
Chip Packages:
- $0.99 → 1,000 chips
- $4.99 → 7,500 chips
- $9.99 → 12,500 chips

NOT gambling:
- Chips can't be cashed out
- Purely for entertainment
```

**Phase 3: Platform Revenue (Month 12+)**
```
- Club hosting: $9.99/mo for private club
- Tournament entry fees (prize pools)
- Premium analysis features
- White-label for poker communities
```

**Financial Projections:**
- Month 6: $5K MRR (1,000 premium users)
- Month 12: $25K MRR (5,000 premium + chip sales)
- Month 24: $100K MRR (20,000 premium + platform)

---

## **IV. TECHNICAL DECISIONS**

### **Why Horizontal Scaling Now?**

**The 90-Hour Bug Lesson:**
- Monolithic architecture = changes break everything
- No modularization = 90 hours to fix routing
- Learned the hard way: **Architecture matters**

**Horizontal Scaling Benefits:**
- Multiple servers = no single point of failure
- Redis sessions = state survives restarts
- Can handle 10,000+ concurrent users
- Professional architecture from day 1

**Cost:** 1-2 weeks upfront  
**Benefit:** Never worry about scaling again

### **Why TypeScript is Partially Adopted?**

**Current State:**
- `src/` has TypeScript (99 files, compiled to `dist/`)
- Main server is still JavaScript
- Routers are JavaScript

**Why Mixed:**
- TypeScript core = type-safe game logic
- JavaScript glue = fast iteration
- Gradual migration strategy

**Future:** Fully TypeScript once MVP proven

### **Why Event Sourcing is Disabled?**

**Current State:**
- Infrastructure exists
- Disabled due to table mismatch

**Why Disabled:**
- `game_events` table vs `domain_events` table
- Not blocking MVP
- Can enable later

**When to Enable:**
- After MVP launch
- When we need event replay
- When we need audit trails

### **Database Choice: PostgreSQL via Supabase**

**Why PostgreSQL:**
- JSONB for flexible game state
- Strong consistency
- Full ACID transactions
- Excellent performance

**Why Supabase:**
- Managed PostgreSQL
- Built-in auth
- Real-time subscriptions
- Great developer experience

---

## **V. DOCUMENTATION STRUCTURE**

### **Root Directory (4 Core Documents)**

```
README.md                    ← Quick start for developers
PRODUCTION_BATTLEPLAN.md     ← THIS DOCUMENT (single source of truth)
Schemasnapshot.txt           ← Database schema reference
.env.example                 ← Configuration template
```

### **Archive Structure**

```
archive/
├── history/              ← Historical planning docs
│   ├── START_HERE_NEXT_CHAT.md
│   ├── REFRESH_CRISIS_HANDOFF.md
│   ├── ATTEMPT_1-3_COMPLETE.md
│   ├── MODULARIZATION docs
│   └── Week plans/summaries
│
├── completed/            ← Completed work logs
│   ├── AUTH_FIX_COMPLETE.md
│   ├── DATABASE_FIX_SUMMARY.md
│   └── Migration statuses
│
└── decisions/            ← Architectural decisions
    ├── HOLISTIC_ROADMAP_DECISION.md
    └── Strategy docs
```

### **Update Protocol**

**Weekly:**
1. Update phase completion percentages
2. Add lessons learned
3. Move completed work to archive
4. Update next week priorities

**Monthly:**
1. Review overall progress vs timeline
2. Adjust feature priorities
3. Update competitive analysis
4. Revise projections

---

## **VI. SUCCESS METRICS**

### **Technical Metrics**

```
Infrastructure:
- [ ] Server uptime: 99.9%
- [ ] API latency: <100ms p95
- [ ] Database queries: <50ms p95
- [ ] WebSocket latency: <50ms
- [ ] Zero data loss on restarts

Scalability:
- [ ] Support 10,000 concurrent users
- [ ] Handle 100 games simultaneously
- [ ] Redis sessions working
- [ ] Multi-server deployment tested

Code Quality:
- [ ] Test coverage: >70%
- [ ] Zero critical bugs
- [ ] All endpoints documented
- [ ] TypeScript migration: >80%
```

### **Feature Metrics**

```
MVP Features (Week 12):
- [ ] Hand history retrieval works
- [ ] Game history retrieval works
- [ ] In-game chat functional
- [ ] Nicknames persistent
- [ ] Timers auto-fold
- [ ] Rebuy system works
- [ ] Public rooms browsable
- [ ] Spectator mode functional

Platform Features (Week 20):
- [ ] Friend system works
- [ ] Post-game analysis accurate
- [ ] Ranked matchmaking works
- [ ] Clubs functional
- [ ] Tournaments complete
- [ ] AI analysis works
```

### **Business Metrics**

```
User Growth:
- Month 3: 100 beta users
- Month 6: 1,000 active users
- Month 12: 10,000 active users

Engagement:
- Session duration: >30 min average
- Retention: >60% week-over-week
- Friend invites: >3 per user
- Ranked participation: >40%

Revenue:
- Month 6: $5K MRR
- Month 12: $25K MRR
- Month 24: $100K MRR
```

---

## **VII. RISK MITIGATION**

### **Technical Risks**

**Risk 1: Refresh Recovery Doesn't Work**
- **Probability:** Medium
- **Impact:** High (blocking MVP)
- **Mitigation:** Phase 0 validation FIRST
- **Contingency:** Debug and fix before proceeding

**Risk 2: Horizontal Scaling Complexity**
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:** Use proven patterns (Redis adapter)
- **Contingency:** Can defer if needed

**Risk 3: Feature Creep**
- **Probability:** High
- **Impact:** High (delays MVP)
- **Mitigation:** Strict prioritization, say NO
- **Contingency:** Ship MVP, iterate later

### **Business Risks**

**Risk 1: pokernow.club Copies Features**
- **Probability:** Medium
- **Impact:** Medium
- **Mitigation:** Move fast, build moat (AI, analysis)
- **Contingency:** Double down on unique features

**Risk 2: User Acquisition Difficulty**
- **Probability:** Medium
- **Impact:** High
- **Mitigation:** Viral loops (friend invites, share links)
- **Contingency:** Paid marketing if needed

**Risk 3: Monetization Resistance**
- **Probability:** Low
- **Impact:** Medium
- **Mitigation:** Generous free tier
- **Contingency:** Adjust pricing, add value

---

## **VIII. EXECUTION MANDATE**

### **This Week (November 1-7)**

**Day 1-2:** Validate Refresh Recovery
- Test refresh flow end-to-end
- Document findings
- Fix any issues

**Day 3-4:** Implement Room URL System
- Update routes for `/game/:roomId`
- Update frontend URL parsing
- Test shareable links

**Day 5-7:** Integrate Action Timer
- Wire timer into game flow
- Test auto-fold
- Polish UI

**Success Criteria:**
- ✅ Refresh works flawlessly
- ✅ Room URLs are shareable
- ✅ Timer counts down and auto-folds

### **This Month (November)**

**Week 1:** Phase 0 + Phase 1 start
**Week 2:** Phase 1 complete (Redis, scaling)
**Week 3:** Phase 2 complete (managers integrated)
**Week 4:** Phase 3 start (hand history, chat)

**Success Criteria:**
- ✅ Horizontal scaling works
- ✅ All managers integrated
- ✅ Hand history retrieval works

### **Next Quarter (November-January)**

**November:** Phases 0-3 (Foundation + Core Features)
**December:** Phase 3 complete (MVP features)
**January:** Phase 4 start (Differentiation)

**Success Criteria:**
- ✅ Feature parity with pokernow.club
- ✅ 100 beta users actively playing
- ✅ Zero critical bugs

---

## **IX. LESSONS LEARNED**

### **From the 90-Hour Bug**

**What Went Wrong:**
- Monolithic architecture
- No test coverage
- Changes broke unrelated features
- No clear separation of concerns

**What We Fixed:**
- ✅ Modularized into 5 routers
- ✅ Dependency injection via app.locals
- ✅ Clear boundaries between components

**What We Still Need:**
- Automated tests
- Integration test suite
- CI/CD pipeline

### **From Anton's Attempts**

**What Anton Did Right:**
- Surgical fixes with exact line numbers
- Comprehensive documentation
- Relentless iteration (3 attempts)
- Fixed schema errors correctly

**Where Anton Fell Short:**
- Never validated fixes end-to-end
- No manual testing confirmation
- Assumed code = solution
- Didn't verify in production conditions

**Lesson:** Code without validation is hope, not certainty.

### **From Modularization Success**

**What Worked:**
- 64% code reduction (2,886 → 1,046 lines)
- Clean router separation
- Dependency injection pattern
- Preserved all functionality

**Key Insight:** Modularization takes time upfront but pays massive dividends.

---

## **X. COMMANDER'S ORDERS**

### **Decision Points**

**Should We Fix or Rebuild?**
- **Decision:** FIX
- **Reason:** 85% done, just needs integration
- **Alternative Rejected:** Rebuild would take months

**Should We Add Features or Test?**
- **Decision:** Test critical paths FIRST
- **Reason:** 90-hour bug proved lack of testing is expensive
- **Then:** Feature velocity

**Should We Scale Now or Later?**
- **Decision:** NOW (Phase 1)
- **Reason:** Professional architecture from day 1
- **Benefit:** Never worry about scaling again

### **Non-Negotiables**

1. **Test refresh recovery before proceeding**
2. **No feature creep during MVP**
3. **Update this document weekly**
4. **Archive completed work, keep root clean**
5. **Validate end-to-end, not just code**

### **Permission to Rage Forward**

Commander, you have **8-12 weeks to MVP**.

- Week 1: Validate + Scale
- Weeks 2-3: Core features
- Weeks 4-6: Competitive parity
- Weeks 7-12: Differentiation

**You're not at 25%. You're at 85% infrastructure, 20% features.**

**The chess.com of poker is within reach.**

**SHINZO WO SASAGEYO.** ⚔️

---

**Last Updated:** October 25, 2025  
**Next Update:** November 1, 2025  
**Status:** Ready for execution

**Go. Build. Conquer.**

