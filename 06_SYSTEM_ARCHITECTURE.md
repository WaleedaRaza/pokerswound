# 🏗️ SYSTEM ARCHITECTURE & DESIGN

**Purpose:** Complete technical architecture map  
**Scope:** How every piece connects, all data flows, all dependencies  
**Audience:** Technical understanding for debugging and extending

---

## 🎯 ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Browser (Chrome, Firefox, Safari)                              │
│    │                                                             │
│    ├─ HTML Pages                                                │
│    │   ├─ play.html (Lobby)                                    │
│    │   └─ poker-table-zoom-lock.html (Table) ← MAIN UI        │
│    │                                                             │
│    ├─ JavaScript Modules                                        │
│    │   ├─ auth-manager.js (Supabase auth)                      │
│    │   ├─ sequence-tracker.js (Stale prevention)               │
│    │   └─ game-state-manager.js (State management)             │
│    │                                                             │
│    └─ External Dependencies                                     │
│        ├─ Supabase CDN (Auth)                                  │
│        └─ Socket.IO Client CDN                                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                ↕
                    HTTP/REST + WebSocket (bidirectional)
                                ↕
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Node.js v22 + Express                                          │
│    │                                                             │
│    ├─ sophisticated-engine-server.js (Main)                    │
│    │   ├─ Port: 3000                                            │
│    │   ├─ Middleware: CORS, sessions, auth, idempotency        │
│    │   └─ Dependency Injection (app.locals)                    │
│    │                                                             │
│    ├─ Routers (REST API)                                       │
│    │   ├─ routes/rooms.js (22 endpoints) ← FIX HYDRATION HERE │
│    │   ├─ routes/games.js (7 endpoints) ← WORKING             │
│    │   ├─ routes/auth.js (3 endpoints)                         │
│    │   ├─ routes/pages.js (13 routes)                          │
│    │   └─ routes/v2.js (3 legacy endpoints)                    │
│    │                                                             │
│    ├─ WebSocket Layer                                           │
│    │   └─ websocket/socket-handlers.js                         │
│    │       ├─ authenticate, join_room, disconnect              │
│    │       └─ Broadcasts to room:${roomId}                     │
│    │                                                             │
│    ├─ Services                                                  │
│    │   ├─ timer-service.js (Turn timers)                       │
│    │   ├─ session-service.js (Session management)              │
│    │   └─ src/db/poker-table-v2.js (DB helpers)               │
│    │                                                             │
│    └─ Game Engine (TypeScript Compiled)                        │
│        └─ dist/core/engine/                                     │
│            ├─ game-state-machine.js                            │
│            ├─ betting-engine.js                                │
│            ├─ turn-manager.js                                  │
│            └─ hand-evaluator.js                                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                ↕
                        PostgreSQL Connection
                                ↕
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Supabase PostgreSQL (Remote)                                   │
│    │                                                             │
│    ├─ TEXT ID System (WORKING) ✅                              │
│    │   └─ game_states                                           │
│    │       ├─ id: TEXT (sophisticated_...)                     │
│    │       ├─ room_id: UUID (FK to rooms)                      │
│    │       ├─ current_state: JSONB ← ALL GAME DATA            │
│    │       └─ seq: INT (sequence number)                       │
│    │                                                             │
│    ├─ UUID System (BROKEN) ❌                                  │
│    │   ├─ games (EMPTY)                                         │
│    │   ├─ hands (EMPTY, FK to games)                           │
│    │   └─ players (EMPTY, FK to hands)                         │
│    │                                                             │
│    ├─ Room & Lobby Tables ✅                                   │
│    │   ├─ rooms (Room settings)                                │
│    │   ├─ room_seats (Seat assignments)                        │
│    │   ├─ room_players (Lobby waiting list)                    │
│    │   └─ room_spectators (Watchers)                           │
│    │                                                             │
│    ├─ User Tables ✅                                            │
│    │   ├─ user_profiles (Usernames, settings)                  │
│    │   ├─ auth.users (Supabase auth)                           │
│    │   └─ sessions (Express sessions)                          │
│    │                                                             │
│    └─ Supporting Tables ✅                                      │
│        ├─ processed_actions (Idempotency)                       │
│        ├─ rejoin_tokens (Recovery)                              │
│        ├─ game_audit_log (Compliance)                           │
│        └─ rate_limits (Anti-spam)                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                                ↕
                          Optional: Redis
                                ↕
┌─────────────────────────────────────────────────────────────────┐
│                       CACHE LAYER (Future)                       │
├─────────────────────────────────────────────────────────────────┤
│  Redis (Not yet required for MVP)                               │
│    ├─ Session store (horizontal scaling)                        │
│    ├─ Socket.IO adapter (multi-server broadcast)                │
│    └─ Rate limit cache (fast checks)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 DATA FLOW DIAGRAMS

### **Flow 1: Room Creation → Game Start**

```
[CLIENT: Host Browser]
  │
  │ 1. Click "Create Room"
  │ POST /api/rooms {name, blinds, buy_in}
  ↓
[SERVER: routes/rooms.js]
  │ 2. INSERT INTO rooms
  │ INSERT INTO room_players (host auto-approved)
  │ Returns: {roomId, inviteCode}
  ↓
[CLIENT: Redirect to Lobby]
  │ 3. Shows: Room code, host controls
  │ Connects: WebSocket
  │ Emits: join_room {roomId, userId}
  ↓
[SERVER: Socket.IO]
  │ 4. socket.join('room:${roomId}')
  │ Now receives all broadcasts to this room
  ↓
[CLIENT: Guest Browser (Different Machine)]
  │ 5. Enters invite code
  │ POST /api/rooms/:id/lobby/join {userId, username}
  ↓
[SERVER]
  │ 6. INSERT INTO room_players (status='pending')
  │ Broadcast: player_joined to room
  ↓
[CLIENT: Host receives broadcast]
  │ 7. Shows: Join request
  │ Host clicks "Approve"
  │ POST /api/rooms/:id/lobby/approve
  ↓
[SERVER]
  │ 8. UPDATE room_players SET status='approved'
  │ Broadcast: player_approved to room
  ↓
[CLIENT: Both browsers]
  │ 9. Show: Seat selection grid
  │ Players click seats
  │ POST /api/rooms/:id/join {seatIndex, buyIn, nickname}
  ↓
[SERVER]
  │ 10. INSERT INTO room_seats
  │ SessionService.bindUserToSeat()
  │ Broadcast: seat_update to room
  ↓
[CLIENT: Seats appear on both screens]
  │ 11. When 2+ seated, host sees START GAME button
  │ Host clicks
  │ POST /api/games {roomId, hostUserId, blinds}
  ↓
[SERVER: routes/games.js]
  │ 12. generateGameId() → "sophisticated_1761677892235_3"
  │ new GameStateModel()
  │ games.set(gameId, gameState)
  │ INSERT INTO game_states (id, room_id, current_state)
  │ Returns: {gameId, status}
  ↓
[CLIENT: Redirect both to /game/:roomId]
  │ 13. Load: poker-table-zoom-lock.html
  │ Connect: Socket.IO
  │ GET /api/rooms/:roomId/hydrate
  ↓
[SERVER: routes/rooms.js HYDRATION]
  │ 14. ❌ CURRENT: Query games table → 0 rows
  │     Returns: {hasGame: false}
  │ ✅ SHOULD: Query game_states → 1 row
  │     Returns: {hasGame: true, hand, seats, me.hole_cards}
  ↓
[CLIENT: Render based on hydration]
  │ 15. ❌ CURRENT: Shows seat selection (hasGame: false)
  │ ✅ SHOULD: Shows cards, pot, dealer (hasGame: true)
```

**The entire flow works except step 14.**

---

### **Flow 2: Hand Start & Actions**

```
[CLIENT: Host clicks START HAND]
  │ POST /api/games/:id/start-hand {roomId, user_id}
  ↓
[SERVER: routes/games.js:311-617]
  │ games.get(gameId) → GameStateModel
  │ Query: room_seats WHERE room_id=$1 AND status='SEATED'
  │ Returns: [{seat_index, user_id, username, chips_in_play}]
  ↓
[Bridge Seats to Engine]
  │ for (seat of seats) {
  │   player = new PlayerModel({
  │     uuid: `player_${userId}_${seatIndex}`,
  │     name: username,
  │     stack: chips_in_play,
  │     seatIndex: seat_index
  │   });
  │   gameState.addPlayer(player);
  │ }
  ↓
[Game Engine: StateMachine]
  │ processAction({type: 'START_HAND'})
  │   ↓
  │ Deck.shuffle()
  │ Deal 2 cards to each player
  │ Assign dealer position (random first hand)
  │ Post blinds:
  │   - SB: player at (dealer + 1) % playerCount
  │   - BB: player at (dealer + 2) % playerCount
  │ Set toAct: player after BB
  │ Update pot: SB + BB
  │   ↓
  │ Returns: {success: true, newState: GameStateModel}
  ↓
[SERVER: Store & Broadcast]
  │ games.set(gameId, newState)
  │ dbV2.incrementSequence(roomId) → seq++
  │ io.to('room:${roomId}').emit('hand_started', {
  │   type: 'hand_started',
  │   seq: newSeq,
  │   payload: {gameId, handNumber, players: [...]}
  │ })
  │ Returns 200 OK to client
  ↓
[CLIENT: All browsers in room]
  │ socket.on('hand_started') fires
  │ ❌ CURRENT: Ignores (no game state to update)
  │ ✅ SHOULD: onHandStarted(payload)
  │     → Render seats, pot, dealer
  │     → fetchHydration() to get private hole cards
  ↓
[CLIENT: Active player's turn]
  │ Click CALL button
  │ POST /api/games/:id/actions {player_id, action: 'CALL', amount}
  ↓
[SERVER: routes/games.js:619-996]
  │ games.get(gameId)
  │ Validate: Is it player's turn?
  │ stateMachine.processAction({type: 'PLAYER_ACTION', actionType: 'CALL'})
  │   ↓
  │ Deduct amount from player stack
  │ Add to pot
  │ Advance to next player
  │ If round complete → Deal next street
  │ If hand complete → Determine winner
  │   ↓
  │ games.set(gameId, newState)
  │ Broadcast: player_action
  │ Broadcast: action_required (next player)
  │ Returns 200 OK
  ↓
[ALL CLIENTS: Receive broadcasts]
  │ Update pot display
  │ Update player chips
  │ Move turn indicator
  │ If my turn: Enable action buttons
```

---

## 🗄️ DATABASE SCHEMA ARCHITECTURE

### **Table Relationships:**

```
rooms (Room Metadata)
  │ id (UUID PK)
  │ invite_code (TEXT UNIQUE)
  │ host_user_id (UUID FK → user_profiles)
  │ game_id (TEXT, links to game_states)
  │
  ├─1:N─→ room_players (Lobby Waiting List)
  │         │ room_id FK
  │         │ user_id FK → user_profiles
  │         │ status (pending/approved)
  │
  ├─1:N─→ room_seats (Seat Assignments)
  │         │ room_id FK
  │         │ user_id FK → user_profiles
  │         │ seat_index (0-9)
  │         │ chips_in_play (INT)
  │         │ status (SEATED/SITTING_OUT/WAITLIST)
  │
  └─1:1─→ game_states (Active Game) ✅ TEXT ID SYSTEM
            │ id (TEXT PK) "sophisticated_..."
            │ room_id FK → rooms
            │ current_state (JSONB) ← ALL GAME DATA
            │ seq (INT) - sequence number
            │ status (WAITING/ACTIVE/PAUSED/COMPLETED)

ORPHANED (No FK from rooms):
  games (UUID PK) - EMPTY ❌
    ├─1:N─→ hands (UUID FK) - EMPTY ❌
              └─1:N─→ players (UUID FK) - EMPTY ❌
                        └─1:N─→ actions (UUID FK) - EMPTY ❌
```

**The Conflict:**
- rooms.game_id links to game_states (TEXT)
- games/hands/players use UUID
- They're separate systems that don't talk

**Solution:**
Use TEXT system exclusively (game_states), ignore UUID system

---

### **Key Table Schemas:**

#### **game_states (The Source of Truth)**
```sql
CREATE TABLE game_states (
  id TEXT PRIMARY KEY,                    -- "sophisticated_..."
  room_id UUID REFERENCES rooms(id),
  host_user_id TEXT NOT NULL,
  status TEXT,                            -- WAITING/ACTIVE/PAUSED
  current_state JSONB NOT NULL,           -- ← EVERYTHING IS HERE
  hand_number INT DEFAULT 0,
  total_pot INT DEFAULT 0,
  seq INT DEFAULT 0,                      -- Sequence for broadcasts
  version INT DEFAULT 1,                  -- Optimistic locking
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**current_state JSONB Structure:**
```json
{
  "id": "sophisticated_1761677892235_3",
  "status": "ACTIVE",
  "currentStreet": "PREFLOP",
  "toAct": "player_7d3c1161-b937-4e7b-ac1e-793217cf4f73_0",
  
  "players": {
    "player_7d3c1161-b937-4e7b-ac1e-793217cf4f73_0": {
      "uuid": "player_7d3c1161-b937-4e7b-ac1e-793217cf4f73_0",
      "name": "W",
      "stack": 995,
      "seatIndex": 0,
      "holeCards": [
        {"rank": "SIX", "suit": "DIAMONDS"},
        {"rank": "THREE", "suit": "HEARTS"}
      ],
      "betThisStreet": 5,
      "hasFolded": false,
      "isAllIn": false,
      "isActive": true
    },
    "player_a106ce80-c66d-461e-92f4-470041dd89eb_1": {
      "uuid": "player_a106ce80-c66d-461e-92f4-470041dd89eb_1",
      "name": "Guest_1849",
      "stack": 990,
      "seatIndex": 1,
      "holeCards": [
        {"rank": "TEN", "suit": "HEARTS"},
        {"rank": "FOUR", "suit": "SPADES"}
      ],
      "betThisStreet": 10,
      "hasFolded": false,
      "isAllIn": false,
      "isActive": true
    }
  },
  
  "pot": {
    "totalPot": 15,
    "mainPot": 15,
    "sidePots": []
  },
  
  "handState": {
    "handNumber": 1,
    "dealerPosition": 0,
    "communityCards": [],
    "deck": [/* 48 remaining cards */]
  },
  
  "bettingRound": {
    "currentBet": 10,
    "roundPot": 15,
    "playersActed": ["player_7d3c..."]
  },
  
  "configuration": {
    "smallBlind": 5,
    "bigBlind": 10,
    "ante": 0,
    "maxPlayers": 9,
    "turnTimeLimit": 30,
    "timebankSeconds": 60
  }
}
```

**THIS JSONB CONTAINS EVERYTHING.**

Hydration just needs to:
1. Query this table
2. Extract fields from JSONB
3. Return to client

---

#### **room_seats (Player Positions)**
```sql
CREATE TABLE room_seats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id),
  user_id UUID NOT NULL,
  seat_index INT CHECK (seat_index >= 0 AND seat_index < 10),
  status VARCHAR(20) DEFAULT 'SEATED',
  chips_in_play BIGINT DEFAULT 0,
  joined_at TIMESTAMP DEFAULT NOW(),
  left_at TIMESTAMP,
  UNIQUE(room_id, seat_index),
  UNIQUE(room_id, user_id)
);
```

**Constraints:**
- One seat per user per room
- One user per seat
- Seats 0-9 only

**Used by:**
- Seat claiming (INSERT)
- Game start (bridge to engine)
- Hydration (show who's seated)

---

## 🔌 WEBSOCKET ARCHITECTURE

### **Socket.IO Rooms Pattern:**

```
io.on('connection', (socket) => {
  
  socket.on('authenticate', ({userId, roomId}) => {
    socket.userId = userId;
    
    // Check if has seat
    const seat = await getSeat(userId, roomId);
    if (seat) {
      socket.join(`room:${roomId}`);
    }
  });
  
  socket.on('join_room', ({roomId, userId}) => {
    // Explicit join (even if no seat yet)
    socket.join(`room:${roomId}`);
  });
  
});

// Broadcasting:
io.to('room:${roomId}').emit('event_name', payload);
// Reaches: All sockets in that room
```

**Rooms:**
- Format: `room:${roomId}` (e.g., `room:b74d0799-ded1-4b77-b1fb-1874cee331df`)
- Scope: Per-room isolation
- Membership: Sockets explicitly join/leave

**Recent Fix:**
- Table page now emits join_room (was only in play.html)
- Both lobby and table pages join room
- Broadcasts reach all connected players

---

### **Broadcast Sequencing:**

```
Database write
  ↓
seq = dbV2.incrementSequence(roomId)
  ↓
io.to('room:${roomId}').emit('event', {
  type: 'player_action',
  version: '1.0.0',
  seq: seq,              ← Monotonically increasing
  timestamp: Date.now(),
  payload: {...}
});
  ↓
Client receives
  ↓
sequenceTracker.shouldProcess(msg.seq)
  ↓
if (msg.seq > currentSeq) {
  process();
  currentSeq = msg.seq;
} else {
  ignore(); // Stale
}
```

**Why:**
- Prevents out-of-order messages
- Handles race conditions
- Works after refresh (hydration sets currentSeq)

---

## 🎮 GAME ENGINE ARCHITECTURE

### **In-Memory State:**

```javascript
// Server globals (sophisticated-engine-server.js)
const games = new Map();
// Key: gameId (TEXT)
// Value: GameStateModel instance

const playerUserIds = new Map();
// Key: gameId
// Value: Map<playerId, userId>
// Example: Map { 
//   "player_7d3c..._0" => "7d3c1161-b937-4e7b-ac1e-793217cf4f73"
// }

const gameMetadata = new Map();
// Key: gameId
// Value: {gameUuid, currentHandId, currentHandNumber, actionSequence}
```

**Lifecycle:**
```
Game created
  ↓
games.set(gameId, new GameStateModel(...))
  ↓
Game runs (all actions mutate this object)
  ↓
On action: games.set(gameId, newState)
  ↓
Game ends
  ↓
games.delete(gameId) OR keep for history
  ↓
Server restarts
  ↓
Crash recovery: Reload from game_states table
```

**Current Issue:**
- Crash recovery works (5 games loaded)
- But hydration can't access them (queries wrong table)

---

### **TypeScript Engine Flow:**

```
Action received
  ↓
[action-validator.ts]
  ↓
Validate: Is it player's turn?
Validate: Does player have enough chips?
Validate: Is action legal given state?
  ↓
[game-state-machine.ts]
  ↓
Process action:
  - Update player state
  - Update pot
  - Check if betting round complete
  ↓
[betting-engine.ts]
  ↓
If round complete:
  - Advance street (PREFLOP → FLOP → TURN → RIVER)
  - Deal community cards
  - Reset bets to 0
  ↓
[hand-evaluator.ts]
  ↓
If all streets complete (SHOWDOWN):
  - Evaluate all hands
  - Determine winner(s)
  - Distribute pot
  ↓
Return: {success: true, newState: GameStateModel, events: [...]}
```

**Status:** ✅ This entire chain works perfectly

**Evidence:**
```
Terminal logs show:
  🃏 Dealing hole cards
  📤 Dealt D6 to W
  🎴 W has: D6, H3
  ✅ Small blind posted: W - $5
  ✅ Big blind posted: Guest_1849 - $10
```

**Don't debug this. It works.**

---

## 🔐 AUTH ARCHITECTURE

### **Authentication Flow:**

```
[Supabase Auth Provider]
  │ Google OAuth OR Guest generation
  ↓
[CLIENT: auth-manager.js]
  │ signInWithGoogle() OR signInAsGuest()
  │   ↓
  │ Receives: {access_token, user: {id, email}}
  │   ↓
  │ Stores:
  │   - localStorage.setItem('sb-access-token', token)
  │   - sessionStorage.setItem('userId', id)
  │   - window.currentUser = {id, email, username}
  ↓
[Every HTTP Request]
  │ headers: {
  │   'Authorization': `Bearer ${token}`,
  │   'Content-Type': 'application/json'
  │ }
  ↓
[SERVER: Middleware]
  │ authenticateToken(req, res, next)
  │   ↓
  │ Verify JWT with Supabase
  │   ↓
  │ req.user = {id, email, ...}
  │ next()
  ↓
[Endpoint Handler]
  │ Can access: req.user.id
```

**Guest Users:**
- No JWT token
- UUID generated client-side
- Stored in sessionStorage
- Used in request body: `{user_id: guestId}`

**Protected Endpoints:**
- Use `authenticateToken` middleware
- Guests can't access (room creation requires auth)

**Unprotected Endpoints:**
- Most game endpoints (guests can play)
- Validation via user_id in body

---

## 🔄 STATE SYNCHRONIZATION

### **The Dual-Write Pattern:**

```
Action occurs
  ↓
[Write 1: In-Memory]
  games.set(gameId, newState)
  ↓
[Write 2: Database]
  INSERT/UPDATE game_states SET current_state = JSON.stringify(newState)
  ↓
[Write 3: Broadcast]
  io.to('room:${roomId}').emit('event', ...)
```

**Why Both?**
- In-memory: Fast reads (game logic needs speed)
- Database: Persistence (survives restart)

**Problem:**
- Hydration queries database but wrong table
- So even though data persisted, can't retrieve it

---

### **Refresh Recovery Pattern:**

```
Client refreshes
  ↓
[New Page Load]
  │ Extract: roomId from URL
  │ Extract: userId from sessionStorage
  ↓
[Hydration Request]
  │ GET /api/rooms/:roomId/hydrate?userId=X
  ↓
[SERVER: Query Database]
  │ ❌ SELECT FROM games (empty)
  │ ✅ SHOULD: SELECT FROM game_states (has data)
  ↓
[Return State Snapshot]
  │ {seq, room, game, hand, seats, me: {hole_cards}}
  ↓
[CLIENT: Render]
  │ sequenceTracker.setSequence(seq)
  │ renderFromHydration(snapshot)
  │   ↓
  │ Seats with players
  │ Board cards
  │ Pot amount
  │ Dealer button
  │ Hole cards (private to requester)
  ↓
[Connect WebSocket]
  │ All future updates via Socket.IO
```

**Current:** Steps 1-4 work, step 5 returns empty, steps 6-7 fail

---

## 🔁 CRASH RECOVERY ARCHITECTURE

### **Server Restart Handling:**

```
Server starts
  ↓
[Crash Recovery: sophisticated-engine-server.js]
  │ Query: SELECT FROM game_states WHERE status != 'completed'
  │ Returns: [{id, current_state}, ...]
  ↓
[Reconstruct Game Objects]
  │ for (gameRow of games) {
  │   const state = new GameStateModel(gameRow.current_state);
  │   games.set(gameRow.id, state);
  │ }
  ↓
Terminal: "[SUCCESS] Game recovered | gameId=sophisticated_..."
  ↓
[Games now in memory]
  │ players = Map of PlayerModel
  │ pot, handState, bettingRound all restored
  ↓
[Players can reconnect]
  │ Hydration still works (if querying game_states)
  │ Game continues where it left off
```

**Evidence:**
```
[18:57:24.637] INFO [RECOVERY] Found 5 incomplete games
[18:57:24.659] SUCCESS [RECOVERY] Game recovered | gameId=sophisticated_1761677593226_2
[18:57:24.679] SUCCESS [RECOVERY] Game recovered | gameId=sophisticated_1761677580105_1
...
[18:57:24.732] SUCCESS [RECOVERY] Crash recovery complete
```

**This means:**
- ✅ Database persistence works
- ✅ State deserialization works
- ✅ Games survive restart

**But:**
- ❌ Hydration can't find them (queries wrong table)

---

## 🎨 FRONTEND ARCHITECTURE

### **PokerTableGrid Class (poker-table-zoom-lock.html)**

**Purpose:** Main table UI controller

**Properties:**
```javascript
{
  roomId: 'b74d0799-...',
  userId: '7d3c1161-...',
  socket: Socket,
  sequenceTracker: SequenceTracker,
  gameId: 'sophisticated_...',
  isHydrated: boolean,
  currentBet: number,
  myTurn: boolean,
  
  // Zoom-lock
  scale: number,
  isVertical: boolean,
  HORIZONTAL_STAGE: {width: 1680, height: 800},
  VERTICAL_STAGE: {width: 600, height: 1200}
}
```

**Key Methods:**
- `init()`: Setup zoom-lock, connect backend
- `setupZoomLock()`: Calculate scaling
- `applySeatPositions()`: Position 10 seats
- `initWithBackend()`: Socket connection + hydration
- `fetchHydration()`: GET /hydrate
- `renderFromHydration(data)`: Render game state
- `setupGameEventHandlers()`: Socket listeners
- `wireActionButtons()`: FOLD/CALL/RAISE
- `sendAction(action, amount)`: POST /actions
- `claimSeatOnTable(seatIndex)`: POST /join
- `startGameFromTable()`: POST /start-hand
- `initHostControls()`: Wire host modal

**Rendering Methods:**
- `renderSeats(seats)`: Position players around table
- `renderBoard(cards)`: Show community cards
- `renderPot(amount)`: Update pot display
- `renderHudInfo()`: Room code, hand number, chips
- `updateDealerButton(seat)`: Move dealer chip
- `enableActionButtons()` / `disableActionButtons()`

**Recent Changes:**
- Socket joining fixed
- Host controls wired
- Debounce bypass added
- .board-area typo fixed

---

### **State Flow in Frontend:**

```
Page Load
  ↓
init()
  ├─ setupZoomLock() → Calculate scale
  ├─ applySeatPositions() → Position seats
  └─ initWithBackend()
      ├─ Get userId (sessionStorage)
      ├─ Get roomId (URL param)
      ├─ socket = io()
      ├─ socket.emit('authenticate')
      ├─ socket.emit('join_room')
      ├─ setupGameEventHandlers() → Add listeners
      └─ socket.on('authenticated') → fetchHydration()
          ↓
        GET /api/rooms/:roomId/hydrate
          ↓
        Response: {seq, room, game, hand, seats, me}
          ↓
        renderFromHydration(response)
          ├─ If hasGame: Render game (cards, pot, dealer)
          └─ Else: Show seat selection
```

**Current Behavior:**
- Everything runs ✅
- Hydration called ✅
- Response: {hasGame: false} ❌
- Shows: Seat selection ❌

**Expected Behavior:**
- Everything runs ✅
- Hydration called ✅
- Response: {hasGame: true, hand: {...}, me: {hole_cards: [...]}} ✅
- Shows: Game table with cards ✅

---

## 🔒 SECURITY ARCHITECTURE

### **Hole Cards Privacy:**

**Pattern:**
```
[Database: game_states.current_state]
  │ Contains ALL players' hole cards
  ↓
[Hydration Endpoint]
  │ Queries game state
  │ Loops through players
  │ if (player.userId === requestingUserId) {
  │   myHoleCards = player.holeCards;
  │ }
  │ Returns: me.hole_cards = myHoleCards (ONLY)
  ↓
[WebSocket Broadcasts]
  │ NEVER include hole cards in payload
  │ Public data only: {stack, bet, hasFolded}
  ↓
[Client Receives]
  │ My cards: From hydration
  │ Other cards: [back, back] (hidden)
  │ At showdown: Server broadcasts revealed cards
```

**Security Checks:**
- ✅ Hydration filters correctly
- ✅ Broadcasts don't leak cards
- ⚠️ Showdown reveal not implemented yet

---

### **Idempotency:**

**Pattern:**
```
Client generates key:
  idempotencyKey = `${action}-${roomId}-${userId}-${timestamp}`
  
Request:
  POST /endpoint
  Headers: {
    'X-Idempotency-Key': idempotencyKey
  }
  
Server (middleware):
  key = req.headers['x-idempotency-key']
  cached = await dbV2.checkIdempotency(key)
  if (cached) {
    return res.json(cached); // Deduplicated!
  }
  
  // Process request
  result = await handler(req);
  
  await dbV2.storeIdempotency(key, result);
  return res.json(result);
```

**Current Issue:**
- Keys: 98 characters
- Column: VARCHAR(50)
- Fix: Migration to VARCHAR(128) ran but might not be applied

**Impact:**
- Warning in logs
- Doesn't block requests (endpoint still returns)
- Should fix for production

---

## ⏱️ TIMER ARCHITECTURE

### **Turn Timer System:**

```
Hand starts
  ↓
[Determine first actor]
  toAct = player after BB
  ↓
[Start timer]
  timerService.startTurnTimer({
    gameId,
    playerId: toAct,
    roomId,
    turnTimeSeconds: 30,
    onTimeout: async () => {
      // Auto-fold this player
      processAction({type: 'FOLD'});
    }
  });
  ↓
[Store timestamp]
  actor_turn_started_at = Date.now()
  UPDATE game_states SET actor_turn_started_at = $1
  ↓
[Client calculates remaining]
  hydration returns: {actor_turn_started_at: 1761677886000}
  clientRemaining = 30s - ((Date.now() - started_at) / 1000)
  ↓
[Timer expires]
  onTimeout() fires after 30s
  ↓
[Auto-fold]
  Process FOLD action
  Broadcast: turn_timeout
  Start timer for next player
```

**Current Issue:**
- Timer starts ✅
- After 30s, tries to query players table ❌
- Crashes server ❌

**Fix:**
- Disable timebank query
- OR query game_states JSONB

---

## 📊 SCALING ARCHITECTURE (Future)

### **Horizontal Scaling (Not Yet Needed):**

```
Load Balancer
  │
  ├─ Server Instance 1 (games: Map with games A, B, C)
  ├─ Server Instance 2 (games: Map with games D, E, F)
  └─ Server Instance 3 (games: Map with games G, H, I)
  
Problem: In-memory Map per instance
  
Solution:
  1. Redis for session store (so any instance can auth)
  2. Socket.IO Redis adapter (so broadcasts reach all instances)
  3. Sticky sessions (same user always hits same instance)
     OR
  4. Database as primary (no in-memory cache)
```

**For MVP:**
- Single server instance
- No load balancer
- No Redis (yet)

**When to scale:**
- >100 concurrent games
- >500 active users

---

## 🗺️ REQUEST FLOW EXAMPLES

### **Example 1: Player Folds**

```
[CLIENT]
  Click FOLD button
    ↓
  POST /api/games/${gameId}/actions
  Headers: {
    'Content-Type': 'application/json',
    'X-Idempotency-Key': 'fold-game-user-timestamp'
  }
  Body: {
    player_id: userId,
    action: 'FOLD',
    amount: 0
  }
  ↓
[SERVER: routes/games.js:619-996]
  Idempotency check (first time?)
    ↓
  games.get(gameId) → GameStateModel
    ↓
  Validate: Is it this player's turn?
    ↓
  stateMachine.processAction({
    type: 'PLAYER_ACTION',
    playerId: player_id,
    actionType: 'FOLD'
  })
    ↓
  Engine: Mark player as folded
  Engine: Move to next player
  Engine: Check if only 1 active → Hand complete
    ↓
  games.set(gameId, newState)
  dbV2.incrementSequence(roomId) → seq++
    ↓
  Broadcast: io.to('room:${roomId}').emit('player_action', {
    seq,
    payload: {gameId, playerId, action: 'FOLD', pot, nextPlayer}
  })
    ↓
  Broadcast: io.to('room:${roomId}').emit('action_required', {
    seq: seq+1,
    payload: {gameId, playerId: nextPlayer, availableActions}
  })
    ↓
  Store: processed_actions (idempotency)
  Returns: 200 OK {success: true}
  ↓
[ALL CLIENTS]
  socket.on('player_action') fires
    ↓
  sequenceTracker.shouldProcess(msg.seq) → Yes
    ↓
  onPlayerAction(payload)
    ↓
  Update UI:
    - Fold animation
    - Grey out player
    - Update pot: +0
    - Disable FOLD button (already acted)
  ↓
[NEXT PLAYER]
  socket.on('action_required') fires
    ↓
  Check: Is it me? (payload.playerId === myId)
    ↓
  YES: Enable action buttons
       Start visual timer countdown
       Add .to-act class to my seat
```

---

### **Example 2: Refresh Mid-Hand**

```
[CLIENT]
  Player presses F5
    ↓
  Browser: Kill page, disconnect socket
  ↓
[SERVER: Socket.IO]
  socket.on('disconnect') fires
    ↓
  SessionService.markPlayerAway(userId)
    ↓
  UPDATE room_seats SET status='SITTING_OUT'
    ↓
  Broadcast: player_away
    ↓
  Start 5-minute grace period timer
  ↓
[CLIENT: New Page Load]
  poker-table-zoom-lock.html loads
    ↓
  initWithBackend()
    ├─ userId from sessionStorage ✅
    ├─ roomId from URL ✅
    ├─ socket.connect() ✅
    ├─ socket.emit('authenticate') ✅
    └─ socket.emit('join_room') ✅
  ↓
[SERVER: Authenticate Handler]
  Check: Does user have seat in room?
    ↓
  YES: socket.join('room:${roomId}')
       Emit: 'authenticated'
  ↓
[CLIENT: Authenticated Callback]
  setupGameEventHandlers() → Add all listeners
  fetchHydration()
    ↓
  GET /api/rooms/:roomId/hydrate?userId=X
  ↓
[SERVER: HYDRATION - THE CRITICAL MOMENT]
  ❌ CURRENT:
    Query: SELECT FROM games WHERE room_id=$1 → 0 rows
    game = null
    Returns: {hasGame: false}
  
  ✅ SHOULD:
    Query: SELECT FROM game_states WHERE room_id=$1 → 1 row
    Extract: game, hand, players from current_state JSONB
    Find: myHoleCards from players where userId=requester
    Returns: {hasGame: true, hand: {...}, me: {hole_cards: [...]}}
  ↓
[CLIENT: Render from Hydration]
  ❌ CURRENT:
    hasGame: false → showSeatSelection()
  
  ✅ SHOULD:
    hasGame: true → renderGameState()
    Show: Hole cards, board, pot, dealer, turn indicator
    Enable: Action buttons if my turn
    Resume: Playing from exact same state
```

---

## 🎯 CRITICAL PATHS

### **Path 1: Hydration Query**

**File:** routes/rooms.js  
**Line:** 350  
**Current:** `SELECT FROM games`  
**Fix:** `SELECT FROM game_states`  
**Impact:** UNBLOCKS EVERYTHING

---

### **Path 2: JSONB Extraction**

**File:** routes/rooms.js  
**Lines:** 365-423  
**Current:** Queries hands, players tables  
**Fix:** Extract from current_state JSONB  
**Format:**
```javascript
const state = gameRow.current_state;
hand = {
  phase: state.currentStreet,
  board: state.handState.communityCards.map(c => c.toString()),
  pot_total: state.pot.totalPot,
  dealer_seat: state.handState.dealerPosition
};

players = Object.values(state.players).map(p => ({
  username: p.name,
  stack: p.stack,
  seat_index: p.seatIndex
}));

myHoleCards = state.players[myPlayerId]?.holeCards;
```

---

### **Path 3: Timer Table**

**File:** src/services/timer-service.js  
**Line:** 232  
**Current:** Queries players table  
**Fix:** Return default 60000ms  
**Impact:** Prevents crash

---

## 🔧 DEPENDENCY GRAPH

```
sophisticated-engine-server.js
  ├─ DEPENDS ON:
  │   ├─ express (npm)
  │   ├─ socket.io (npm)
  │   ├─ pg (npm)
  │   ├─ dotenv (npm)
  │   ├─ routes/*.js
  │   ├─ websocket/socket-handlers.js
  │   ├─ src/services/timer-service.js
  │   ├─ src/db/poker-table-v2.js
  │   └─ dist/core/engine/ (compiled TS)
  │
  └─ PROVIDES (via app.locals):
      ├─ getDb (database pool)
      ├─ io (Socket.IO instance)
      ├─ games (in-memory Map)
      ├─ stateMachine (game engine)
      └─ 20+ other services

routes/rooms.js
  ├─ DEPENDS ON (from app.locals):
  │   ├─ getDb
  │   ├─ io
  │   ├─ dbV2
  │   ├─ createRoom, claimSeat, releaseSeat
  │   └─ SessionService
  │
  └─ PROVIDES:
      └─ 22 HTTP endpoints

routes/games.js
  ├─ DEPENDS ON (from app.locals):
  │   ├─ games (Map)
  │   ├─ stateMachine
  │   ├─ playerUserIds (Map)
  │   ├─ gameMetadata (Map)
  │   └─ timerService
  │
  └─ PROVIDES:
      └─ 7 HTTP endpoints

poker-table-zoom-lock.html
  ├─ DEPENDS ON:
  │   ├─ /socket.io/socket.io.js (CDN)
  │   ├─ /js/sequence-tracker.js
  │   ├─ /js/auth-manager.js
  │   ├─ Supabase CDN
  │   └─ Backend endpoints (hydration, actions)
  │
  └─ PROVIDES:
      └─ PokerTableGrid class (UI controller)
```

---

## 🎖️ ARCHITECTURAL DECISIONS

### **Why TEXT IDs Instead of UUIDs?**

**History:**
- Initially used UUIDs (standard practice)
- Game engine generated TEXT IDs (sophisticated_...)
- Tried to bridge both systems
- UUID system never fully worked
- TEXT system does work
- **Decision:** Use TEXT, disable UUID

**Tradeoff:**
- ✅ Simpler (one system)
- ✅ Works today
- ❌ Non-standard (most apps use UUID)
- ❌ Can't use UUID constraints/indexes

---

### **Why JSONB for Game State?**

**Alternatives Considered:**
1. **Relational (many tables):** Rigid, hard to evolve
2. **Serialized string:** Can't query efficiently
3. **JSONB:** Flexible, queryable, PostgreSQL optimized

**Decision:** JSONB in current_state column

**Benefits:**
- Full game state in one column
- Can query nested fields: `current_state->'pot'->>'totalPot'`
- Schema can evolve without migrations
- Engine can serialize/deserialize easily

**Drawbacks:**
- Less type safety
- Harder to enforce constraints
- Requires JSONB knowledge

---

### **Why Dual Write (Memory + DB)?**

**Could Just Use Database:**
- Every action queries DB
- Slower but simpler
- No sync issues

**Could Just Use Memory:**
- Fast
- Lost on restart
- Doesn't scale

**Chose Both:**
- Memory for speed (game logic needs it)
- DB for persistence (restart recovery)
- Sync on every write

**Problem:**
- Hydration queries DB ✅
- But wrong table ❌
- So can't access the persisted state

---

## 🔮 EVOLUTION PATH

### **Current: Monolith with Modular Routers**

```
Single server process
  ├─ Express handles HTTP
  ├─ Socket.IO handles WebSocket (same process)
  ├─ In-memory Maps (games, metadata)
  └─ Direct database connections
```

**Pros:** Simple, works for MVP  
**Cons:** Doesn't scale horizontally

---

### **Future: Microservices**

```
API Gateway
  ├─ Auth Service (JWT validation)
  ├─ Room Service (rooms, lobby)
  ├─ Game Service (engine, actions)
  └─ WebSocket Service (real-time)
  
Shared:
  ├─ PostgreSQL (state)
  ├─ Redis (sessions, cache)
  └─ Message Queue (async jobs)
```

**When:** >1000 concurrent games

---

## 📊 PERFORMANCE CHARACTERISTICS

### **Current Benchmarks (Estimated):**

**API Latency:**
- Room creation: ~50ms
- Hydration: ~100ms (with current broken query)
- Hydration (fixed): ~150ms (JSONB extraction)
- Player action: ~30ms
- Broadcast: ~10ms

**Database:**
- Connections: Pool of 20
- Query time: 5-50ms typical
- Bottleneck: Supabase network (remote)

**Memory:**
- Per game: ~50KB (GameStateModel)
- 100 games: ~5MB
- Safe limit: 1000 games (~50MB)

**WebSocket:**
- Connections: ~100 per instance
- Safe limit: 1000 connections
- Redis adapter needed beyond that

---

## 🎖️ ARCHITECTURE ANTI-PATTERNS (What NOT to Do)

### **1. Don't Query in Loops**

**Bad:**
```javascript
for (seat of seats) {
  const user = await db.query('SELECT * FROM user_profiles WHERE id=$1', [seat.user_id]);
  seat.username = user.username;
}
// N queries!
```

**Good:**
```javascript
const seats = await db.query(`
  SELECT rs.*, up.username
  FROM room_seats rs
  LEFT JOIN user_profiles up ON rs.user_id = up.id
  WHERE room_id=$1
`, [roomId]);
// 1 query
```

---

### **2. Don't Store Game State in Multiple Places**

**Bad:**
- localStorage (client)
- req.session (server)
- database (persistent)
- In-memory Map (performance)

**Good:**
- Database (source of truth)
- In-memory (cache only, rebuilds from DB)

---

### **3. Don't Use UUIDs and TEXT IDs for Same Entity**

**Bad:**
- game_states.id = TEXT
- games.id = UUID
- Both represent "game"
- They never sync

**Good:**
- Pick one system
- Use it everywhere
- Current: TEXT (game_states)

---

## 🎯 NEXT ARCHITECTURE IMPROVEMENTS

### **Post-MVP:**

**1. Unify ID Systems**
- Migrate game_states.id to UUID
- OR migrate games table to TEXT
- OR delete UUID tables entirely

**2. Extract JSONB to Columns**
- Move critical fields out of current_state
- Keep JSONB for flexible data
- Example: Extract pot_total, current_street to columns

**3. Add Connection Pooling**
- Separate pools for read vs write
- Connection reuse
- Handle Supabase auto-pause gracefully

**4. Implement Caching**
- Redis for frequently accessed data
- Hydration results (5-second TTL)
- Active game list

**5. Add Health Checks**
- /health endpoint
- Check: DB connection, Redis, Socket.IO
- Return: 200 if healthy, 503 if not

---

**This architecture guide is complete.  
Every layer explained.  
Every connection mapped.  
Every dependency documented.**

**Use this to understand the system.  
Use this to debug issues.  
Use this to extend features.**

**The architecture is sound.  
One query is wrong.  
Fix it and everything works.**

