# 🏗️ PRODUCTION ARCHITECTURE - DB AS SINGLE SOURCE OF TRUTH

## ⚠️ CRITICAL PRINCIPLE

**THE DATABASE IS THE ONLY SOURCE OF TRUTH. PERIOD.**

- In-memory state (`games` Map) = **CACHE ONLY**
- On any state change: **DB FIRST, THEN BROADCAST**
- On reconnect/refresh: **FETCH FROM DB, NEVER GUESS**
- On conflict: **DB WINS ALWAYS**

---

## 🎭 USER ROLES & STATE MANAGEMENT

### Role Hierarchy
```
HOST (owner of room)
  ↓
PLAYER (seated, playing)
  ↓
SPECTATOR (watching, not playing)
  ↓
GUEST (viewing lobby, not approved)
```

### State Transitions
```
GUEST → (request join) → PENDING → (host approves) → APPROVED
APPROVED → (choose seat) → PLAYER
APPROVED → (watch) → SPECTATOR
PLAYER → (leave seat, keep watching) → SPECTATOR
SPECTATOR → (choose seat) → PLAYER
```

---

## 📊 DATABASE SCHEMA (SOURCE OF TRUTH)

### Current Tables
```sql
-- ✅ EXISTS
room_players (lobby members, awaiting approval)
room_seats (seated players)
room_spectators (watching without playing)
rejoin_tokens (reconnection auth)
games (active games)
game_states (current game snapshot + seq)
hands (current hand state)
players (player-hand state with hole cards)
actions (hand actions log)
```

### Missing Columns (MUST ADD)
```sql
-- Table nicknames
ALTER TABLE room_seats 
ADD COLUMN display_name VARCHAR(50);

-- Spectator nicknames
ALTER TABLE room_spectators
ADD COLUMN display_name VARCHAR(50);

-- Connection tracking
ALTER TABLE room_seats
ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE room_spectators
ADD COLUMN last_seen_at TIMESTAMPTZ DEFAULT NOW();
```

---

## 🔐 TOKEN & SESSION ARCHITECTURE

### 1. **Auth Tokens** (Supabase JWT)
- **Who has:** Authenticated users
- **Purpose:** Prove identity
- **Lifetime:** Per Supabase config
- **Storage:** HTTP-only cookie OR localStorage

### 2. **Rejoin Tokens** (Room-specific)
- **Who has:** Players + Spectators
- **Purpose:** Rejoin room without re-approval
- **Lifetime:** Until hand ends OR 5 min
- **Storage:** localStorage `rejoinToken_${roomId}`
- **DB:** `rejoin_tokens` table

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS rejoin_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id),
    user_id UUID NOT NULL,
    role VARCHAR(20) NOT NULL, -- 'player', 'spectator', 'host'
    seat_index INTEGER, -- NULL for spectators
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. **Session Tracking**
Every connection tracked in DB:
```sql
-- Update last_seen_at on heartbeat
UPDATE room_seats 
SET last_seen_at = NOW() 
WHERE room_id = $1 AND user_id = $2;
```

---

## 🚪 INGRESS REQUEST FLOW (JOIN ROOM)

### Step 1: Request to Join
```
Client → POST /api/rooms/:roomId/join
Body: { userId, displayName }

Server:
1. Check if room exists
2. Check if room is full
3. Check if user already in room
4. Insert into room_players with status='pending'
5. Emit WS: player_join_requested { userId, displayName }
6. Return: { status: 'pending', waitingForApproval: true }
```

### Step 2: Host Approves/Rejects
```
Host → POST /api/rooms/:roomId/approve
Body: { userId, approved: true/false }

Server:
1. Check if requester is host
2. Update room_players.status = 'approved' OR 'rejected'
3. If approved: Generate rejoin_token
4. Emit WS: player_approved { userId, displayName }
5. Return: { approved: true, rejoinToken }
```

### Step 3: Choose Role (Player or Spectator)
```
User → POST /api/rooms/:roomId/seat
Body: { seatIndex, displayName }

Server:
1. Verify user is approved
2. Check seat is empty
3. Insert into room_seats
4. Generate player rejoin_token
5. Emit WS: player_seated { seatIndex, userId, displayName }

OR

User → POST /api/rooms/:roomId/spectate
Body: { displayName }

Server:
1. Verify user is approved
2. Insert into room_spectators
3. Generate spectator rejoin_token
4. Emit WS: spectator_joined { userId, displayName }
```

---

## 🔄 RECONNECTION FLOW (REFRESH/DISCONNECT)

### For Players
```
1. Page refresh/reload
2. Check localStorage for rejoinToken_${roomId}
3. Socket connects
4. Emit: authenticate { rejoinToken }
5. Server validates token → DB lookup
6. If valid: Fetch hydration → GET /api/rooms/:roomId/hydrate?userId=X
7. Render full state (seat, cards, board, pot)
8. Subscribe to WS updates
9. Update last_seen_at
```

### For Spectators
```
Same flow, but:
- No seat_index
- No hole_cards
- Render spectator view (can see all actions, not hole cards)
```

### For Host
```
Same as player, PLUS:
- Show host controls
- Can approve/reject join requests
- Can kick players
- Can adjust settings
```

---

## 📡 WEBSOCKET EVENT ARCHITECTURE

### Connection Events
```javascript
// Client connects
socket.on('connect')
→ emit: authenticate { rejoinToken OR userId }

// Server validates
socket.on('authenticate')
→ Validate token/userId
→ Join room: socket.join(`room:${roomId}`)
→ Emit back: authenticated { role, userId, seatIndex }
→ Update last_seen_at in DB
```

### Game Events (DB → WS Broadcast)
```javascript
// RULE: DB write FIRST, THEN broadcast

// Example: Player action
POST /api/games/:id/actions { action: 'RAISE', amount: 250 }

Server:
1. Validate action
2. Update DB: INSERT INTO actions (...)
3. Update DB: UPDATE hands SET current_bet = ...
4. Update DB: UPDATE game_states SET seq = seq + 1, current_state = ...
5. Broadcast WS: player_action { seq, userId, action, amount, ... }
6. Return HTTP: { success: true, seq }

Client:
1. Receives WS: player_action
2. Checks seq > currentSeq
3. If yes: Update UI
4. If no: Ignore (stale)
```

### Spectator-Specific Events
```javascript
// Spectators receive SAME events as players
// Except: No hole_cards in their view

WS Events for spectators:
- hand_started (no hole cards for others)
- player_action (all actions visible)
- street_advanced (board cards visible)
- hand_complete (winners + hand ranks visible)
- pot_distributed (amounts visible)
```

---

## 🌊 HYDRATION ENDPOINTS

### For Players
```
GET /api/rooms/:roomId/hydrate?userId=X&role=player

Response:
{
  seq: 142,
  timestamp: 1234567890,
  room: { id, code, host_id, ... },
  game: { id, status, current_hand_id, ... },
  hand: { id, phase, board, pot, ... },
  seats: [
    { seat_index: 0, user_id, display_name, chips, ... },
    ...
  ],
  me: {
    user_id: X,
    seat_index: 0,
    display_name: "WALEED",
    hole_cards: ["hearts_A", "diamonds_A"],
    rejoin_token: "abc123..."
  },
  recent_actions: [...],
  timer: { actor_seat, started_at, timebank_remaining }
}
```

### For Spectators
```
GET /api/rooms/:roomId/hydrate?userId=X&role=spectator

Response:
{
  // Same as player, EXCEPT:
  me: {
    user_id: X,
    role: "spectator",
    display_name: "Observer1",
    rejoin_token: "xyz789..."
    // NO hole_cards
    // NO seat_index
  }
}
```

### For Host
```
GET /api/rooms/:roomId/hydrate?userId=X&role=host

Response:
{
  // Same as player, PLUS:
  pending_requests: [
    { user_id, display_name, requested_at },
    ...
  ],
  host_controls: {
    can_pause: true,
    can_kick: true,
    can_adjust_chips: true
  }
}
```

---

## 🎯 STATE SYNCHRONIZATION (DB → CLIENT)

### The Flow
```
1. User action → HTTP POST
2. Server validates
3. Server writes to DB (FIRST!)
4. Server updates in-memory cache
5. Server increments sequence number
6. Server broadcasts WS event (with seq)
7. All clients receive WS event
8. Clients check: seq > currentSeq?
9. If yes: Update UI, store new seq
10. If no: Ignore (already have newer state)
```

### Cache Invalidation
```javascript
// In-memory cache is EPHEMERAL
// On server restart: Load from DB

app.on('start', async () => {
  const activeGames = await db.query(
    'SELECT * FROM games WHERE status != "completed"'
  );
  
  for (const game of activeGames) {
    // Rebuild in-memory state from DB
    const gameState = await reconstructGameState(game.id);
    games.set(game.id, gameState);
  }
});
```

---

## 🚨 CRITICAL INVARIANTS

### 1. **DB Writes Before Broadcasts**
```javascript
// ❌ WRONG
io.to(`room:${roomId}`).emit('player_action', {...});
await db.query('INSERT INTO actions ...');

// ✅ CORRECT
await db.query('INSERT INTO actions ...');
io.to(`room:${roomId}`).emit('player_action', {...});
```

### 2. **Sequence Numbers Always Increase**
```javascript
// On every mutation:
await db.query(
  'UPDATE game_states SET seq = seq + 1, current_state = $1 WHERE id = $2',
  [newState, gameId]
);
```

### 3. **Disconnect ≠ Seat Free**
```javascript
// On socket disconnect:
await db.query(
  'UPDATE room_seats SET last_seen_at = NOW() WHERE user_id = $1',
  [userId]
);

// Grace period worker:
setInterval(async () => {
  await db.query(
    'DELETE FROM room_seats WHERE last_seen_at < NOW() - INTERVAL "5 minutes"'
  );
}, 60000); // Check every minute
```

### 4. **Rejoin Tokens Expire**
```javascript
// Tokens valid for current hand + 5 min
await db.query(
  'DELETE FROM rejoin_tokens WHERE expires_at < NOW()'
);
```

### 5. **Hydration Returns Latest State**
```javascript
// NEVER return cached state
// ALWAYS fetch from DB
const state = await db.query('SELECT current_state FROM game_states WHERE id = $1', [gameId]);
return state.rows[0].current_state;
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: DB Schema (Foundation)
- [ ] Add `display_name` to `room_seats`
- [ ] Add `display_name` to `room_spectators`
- [ ] Add `last_seen_at` to `room_seats`
- [ ] Add `last_seen_at` to `room_spectators`
- [ ] Verify `rejoin_tokens` table exists
- [ ] Add index on `rejoin_tokens.token_hash`
- [ ] Add index on `room_seats.last_seen_at`

### Phase 2: Spectator Endpoints
- [ ] POST `/api/rooms/:roomId/spectate` - Join as spectator
- [ ] DELETE `/api/rooms/:roomId/spectate` - Leave spectator
- [ ] GET `/api/rooms/:roomId/spectators` - List spectators
- [ ] Hydration endpoint supports `role=spectator`

### Phase 3: Ingress Flow
- [ ] POST `/api/rooms/:roomId/join` - Request to join
- [ ] POST `/api/rooms/:roomId/approve` - Host approves
- [ ] POST `/api/rooms/:roomId/reject` - Host rejects
- [ ] WS: `player_join_requested` event
- [ ] WS: `player_approved` event
- [ ] WS: `player_rejected` event

### Phase 4: Rejoin System
- [ ] Generate rejoin token on approval
- [ ] Store token hash in DB
- [ ] Validate token on reconnect
- [ ] Clear expired tokens (cron job)
- [ ] Update `last_seen_at` on heartbeat

### Phase 5: Grace Period Worker
- [ ] Background job: Check `last_seen_at`
- [ ] After 5 min: Mark as disconnected
- [ ] After 10 min: Free seat
- [ ] Broadcast: `player_disconnected` event

### Phase 6: Hydration by Role
- [ ] Player hydration (with hole cards)
- [ ] Spectator hydration (no hole cards)
- [ ] Host hydration (with pending requests)
- [ ] Sequence number in all responses

### Phase 7: WS Event Handlers
- [ ] `authenticate` - Validate rejoin token
- [ ] `heartbeat` - Update last_seen_at
- [ ] `disconnect` - Mark disconnected
- [ ] `reconnect` - Auto-rejoin if token valid

---

## 🧪 TEST SCENARIOS

### Test 1: Player Join → Approve → Seat
1. User requests to join
2. Host approves
3. User chooses seat
4. Hydration returns full state
5. User can play

### Test 2: Spectator Join → Watch
1. User requests to join
2. Host approves
3. User chooses spectate
4. Hydration returns game state (no hole cards)
5. User can watch

### Test 3: Player Refresh Mid-Hand
1. Player mid-hand
2. Refresh browser
3. Rejoin token validates
4. Hydration returns exact state
5. Player can continue

### Test 4: Spectator Refresh
1. Spectator watching
2. Refresh browser
3. Rejoin token validates
4. Hydration returns game state
5. Spectator continues watching

### Test 5: Disconnect Grace Period
1. Player disconnects
2. `last_seen_at` updates
3. Wait 3 min → Still seated
4. Wait 10 min → Seat freed
5. Broadcast: `seat_freed`

### Test 6: Sequence Number Dedup
1. Client at seq=100
2. Receives WS event seq=99 → IGNORE
3. Receives WS event seq=101 → UPDATE
4. Receives WS event seq=102 → UPDATE

---

## 🎯 CRITICAL SUCCESS CRITERIA

✅ **DB is ALWAYS the source of truth**
✅ **Hydration works for players, spectators, and hosts**
✅ **Rejoin tokens allow seamless reconnection**
✅ **Sequence numbers prevent stale updates**
✅ **Grace period prevents instant seat loss**
✅ **Spectators can watch without playing**
✅ **Ingress flow requires host approval**

---

**This architecture ensures the DB is the single source of truth, with proper spectator support, ingress handling, and bulletproof state management.**

**Now let's implement it.** 🚀

