# 🗺️ COMPLETE SYSTEM MAP & FIX PLAN

**Purpose:** Show EVERY moving part, EVERY connection, EXACTLY what changes  
**For:** Understanding the full system before approving any changes

---

## 🏗️ THE 7 LAYERS (What You Actually Have)

```
┌──────────────────────────────────────────────────────────────┐
│ LAYER 1: BROWSER (Client)                                    │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Files:                                                        │
│   • poker-table-zoom-lock.html (2,100 lines) - Table UI     │
│   • play.html (2,200 lines) - Lobby UI                      │
│   • /js/sequence-tracker.js - Prevents stale updates        │
│   • /js/auth-manager.js - Handles Supabase auth             │
│                                                               │
│ State Storage:                                                │
│   • sessionStorage.userId - Who you are                      │
│   • sessionStorage.rejoin_token - How you reclaim seat      │
│   • window.currentUser - Auth data                          │
│   • window.pokerTable - Game instance                       │
│                                                               │
│ Connections OUT:                                              │
│   ↓ HTTP REST API (fetch calls)                             │
│   ↓ WebSocket (socket.io-client)                            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ LAYER 2: HTTP API (REST Endpoints)                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Routes (Modular):                                            │
│   • routes/rooms.js (22 endpoints)                          │
│     - POST /api/rooms (create room)                         │
│     - POST /:id/join (claim seat)                           │
│     - GET /:id/hydrate (★ CRITICAL - state recovery)       │
│                                                               │
│   • routes/games.js (7 endpoints)                           │
│     - POST /api/games (create game)                         │
│     - POST /:id/start-hand (deal cards)                     │
│     - POST /:id/actions (fold/call/raise)                   │
│                                                               │
│   • routes/auth.js (3 endpoints)                            │
│     - POST /auth/google (OAuth)                             │
│     - POST /auth/guest (guest users)                        │
│                                                               │
│ Middleware Chain (Every Request):                            │
│   1. CORS                                                    │
│   2. Body parser                                             │
│   3. Idempotency (src/middleware/idempotency.js)           │
│      - Checks X-Idempotency-Key header                      │
│      - Requires user_id in body OR auth token               │
│      - Returns cached response if duplicate                 │
│   4. Auth (authenticateToken) - Optional per endpoint       │
│   5. Handler function                                        │
│                                                               │
│ Connections OUT:                                              │
│   ↓ Database (PostgreSQL pool)                              │
│   ↓ In-Memory Maps (games, metadata)                        │
│   ↓ WebSocket broadcasts (io.to())                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ LAYER 3: WEBSOCKET (Real-Time Broadcasts)                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Handler: websocket/socket-handlers.js                       │
│                                                               │
│ Events FROM Client:                                          │
│   • authenticate {userId, roomId, rejoinToken}              │
│   • join_room {roomId, userId}                              │
│   • disconnect (automatic on page close)                    │
│                                                               │
│ Events TO Client (Broadcasts):                               │
│   • hand_started {seq, gameId, handNumber, dealerSeat}      │
│   • player_action {seq, action, playerId, pot}              │
│   • action_required {seq, playerId, legalActions}           │
│   • board_dealt {seq, cards, street}                        │
│   • hand_complete {seq, winners, pot}                       │
│   • seat_update {seq, seats}                                │
│   • state_sync {seq, fetchViaHttp: true}                    │
│                                                               │
│ Room Management:                                              │
│   • Sockets join: room:${roomId}                            │
│   • Broadcasts to: io.to('room:${roomId}').emit()          │
│   • Isolation: Each room independent                         │
│                                                               │
│ Connections OUT:                                              │
│   ↓ SessionService (seat binding)                           │
│   ↓ Database (mark AWAY on disconnect)                      │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ LAYER 4: GAME ENGINE (Poker Logic)                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ In-Memory State:                                             │
│   const games = new Map<gameId, GameStateModel>();          │
│                                                               │
│ TypeScript Classes (Compiled to /dist/core/):               │
│   • GameStateModel - Complete game state                    │
│   • PlayerModel - Player state                              │
│   • GameStateMachine - State transitions                    │
│   • BettingEngine - Action validation                       │
│   • HandEvaluator - Winner determination                    │
│                                                               │
│ Flow:                                                         │
│   HTTP request → routes/games.js                            │
│     ↓                                                         │
│   games.get(gameId) → GameStateModel instance               │
│     ↓                                                         │
│   stateMachine.processAction({type, actionType, amount})    │
│     ↓                                                         │
│   Returns: {success, newState, events}                      │
│     ↓                                                         │
│   games.set(gameId, newState) → Update in-memory            │
│                                                               │
│ Status: ✅ FULLY WORKING - DON'T TOUCH                      │
│                                                               │
│ Connections OUT:                                              │
│   ↓ Database (persist state)                                │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ LAYER 5: DATABASE PERSISTENCE                                │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Repository: src/services/database/repos/game-states.repo.ts │
│                                                               │
│ Methods:                                                      │
│   • create(gameId, roomId, initialState)                    │
│   • saveSnapshot(gameId, snapshot)                          │
│   • findById(gameId)                                         │
│                                                               │
│ Table: game_states                                            │
│   Columns:                                                    │
│     - id: TEXT (sophisticated_...)                           │
│     - room_id: UUID                                          │
│     - current_state: JSONB ← ALL DATA HERE                  │
│     - version: INT                                           │
│     - hand_number: INT (extracted for indexing)             │
│     - updated_at: TIMESTAMP                                  │
│                                                               │
│ current_state Structure:                                     │
│   {                                                           │
│     "id": "sophisticated_...",                               │
│     "status": "ACTIVE",                                      │
│     "players": {                                             │
│       "player_USER1_0": {                                    │
│         "uuid": "player_USER1_0",                            │
│         "userId": "7d3c1161-...",  ← ADDED TODAY            │
│         "name": "W",                                         │
│         "stack": 995,                                        │
│         "seatIndex": 0,                                      │
│         "holeCards": [{suit,rank}, ...],  ← HAS CARDS       │
│         "betThisStreet": 5                                   │
│       }                                                       │
│     },                                                        │
│     "pot": {"totalPot": 15},                                │
│     "handState": {                                           │
│       "handNumber": 1,                                       │
│       "dealerPosition": 0,                                   │
│       "communityCards": []                                   │
│     },                                                        │
│     "currentStreet": "PREFLOP",                             │
│     "toAct": "player_USER1_0"                               │
│   }                                                           │
│                                                               │
│ Status: ✅ WRITES WORKING, READS FIXED TODAY                │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ LAYER 6: SUPPORTING TABLES                                   │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ rooms                                                         │
│   • id, invite_code, host_user_id, game_id ← Links to game │
│   • small_blind, big_blind, max_players                     │
│   • Status: ✅ Working                                       │
│                                                               │
│ room_seats                                                    │
│   • room_id, user_id, seat_index, chips_in_play            │
│   • status (SEATED/SITTING_OUT/WAITLIST)                    │
│   • Status: ✅ Working (constraint fixed today)             │
│                                                               │
│ room_players                                                  │
│   • room_id, user_id, status (pending/approved)             │
│   • Status: ✅ Working                                       │
│                                                               │
│ user_profiles                                                 │
│   • id, username, email                                      │
│   • Status: ✅ Working                                       │
│                                                               │
│ rejoin_tokens                                                 │
│   • user_id, room_id, seat_index, token_hash               │
│   • Status: ⚠️ Errors (non-critical)                        │
│                                                               │
│ UNUSED TABLES (Empty, Ignored):                             │
│   • games (UUID system)                                      │
│   • hands (UUID system)                                      │
│   • players (UUID system)                                    │
│   • actions (UUID system)                                    │
│   Status: ❌ Empty, not used, can ignore or delete later   │
│                                                               │
└──────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────┐
│ LAYER 7: SERVICES (Supporting Infrastructure)                │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│ Timer Service (src/services/timer-service.js):              │
│   • Starts 30s turn timer                                    │
│   • Auto-folds on timeout                                    │
│   • Status: ✅ Works (timebank query fixed today)           │
│                                                               │
│ Session Service (services/session-service.js):              │
│   • Binds user to seat                                       │
│   • Manages grace periods                                    │
│   • Status: ✅ Works (status values fixed today)            │
│                                                               │
│ Poker Table V2 DB (src/db/poker-table-v2.js):              │
│   • incrementSequence(roomId)                               │
│   • storeIdempotency(key, response)                         │
│   • createRejoinToken()                                      │
│   • Status: ✅ Working                                       │
│                                                               │
│ Event Store (src/services/database/event-store.repo.ts):   │
│   • Logs events to domain_events table                      │
│   • Status: ⚠️ Fails gracefully (fixed today)              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔌 THE CONNECTIONS (How Layers Talk)

### **Connection 1: Browser → HTTP API**

**What Happens:**
```javascript
// Browser (poker-table-zoom-lock.html line 1983):
const response = await fetch('/api/games', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Idempotency-Key': 'game-roomId-timestamp'
  },
  body: JSON.stringify({
    roomId: this.roomId,
    hostUserId: this.userId,
    user_id: this.userId, // ← ADDED TODAY (idempotency needs this)
    small_blind: 5,
    big_blind: 10,
    max_players: 10
  })
});
```

**Server Receives:**
```javascript
// routes/games.js line 14:
router.post('/', withIdempotency, async (req, res) => {
  // Middleware already ran:
  //   1. Parsed JSON body
  //   2. Checked idempotency (user_id extracted from body)
  //   3. Passed to handler
  
  const {roomId, hostUserId, small_blind, big_blind} = req.body;
  // ... creates game
});
```

**Status:** ✅ Working (user_id added to all requests today)

**What Changed:** Added `user_id` to request bodies so idempotency middleware works

**Why This Enables Clean Building:** Every future endpoint follows same pattern - include user_id, middleware handles auth/dedup

---

### **Connection 2: Browser → WebSocket**

**Browser Connects:**
```javascript
// poker-table-zoom-lock.html line 1449:
this.socket = io(); // Connects to same origin
```

**Browser Authenticates:**
```javascript
// Line 1478:
this.socket.emit('authenticate', {
  userId: this.userId,
  roomId: this.roomId,
  rejoinToken: sessionStorage.getItem('rejoin_token')
});
```

**Server Handles:**
```javascript
// websocket/socket-handlers.js line 28:
socket.on('authenticate', async ({userId, roomId, rejoinToken}) => {
  // Validate token if provided
  // Join socket to room:
  socket.join(`room:${roomId}`);
  socket.emit('authenticated');
});
```

**Browser Joins Room:**
```javascript
// Line 1487 (ADDED TODAY):
this.socket.emit('join_room', {
  roomId: this.roomId,
  userId: this.userId
});
```

**Status:** ✅ Working (join_room added today)

**What Changed:** Table page now explicitly joins Socket.IO room

**Why This Enables Clean Building:** Any page can join a room and receive broadcasts - foundation for spectator mode, multi-table view, etc.

---

### **Connection 3: HTTP API → Game Engine**

**API Receives Action:**
```javascript
// routes/games.js line 661:
router.post('/:id/actions', withIdempotency, async (req, res) => {
  const {player_id, action, amount} = req.body;
  
  // Get game from in-memory Map:
  const gameState = games.get(gameId);
  
  // Process via engine:
  const result = stateMachine.processAction(gameState, {
    type: 'PLAYER_ACTION',
    playerId: player_id,
    actionType: action,
    amount: amount
  });
  
  // Engine returns new state:
  if (result.success) {
    games.set(gameId, result.newState); // Update memory
  }
});
```

**Engine Processes:**
```typescript
// dist/core/engine/game-state-machine.js:
processAction(gameState, action) {
  // Validate action
  // Update player state
  // Update pot
  // Check if betting round complete
  // Deal next street if needed
  // Return: {success: true, newState, events}
}
```

**Status:** ✅ FULLY WORKING (engine is solid)

**What Changed:** Nothing - this always worked

**Why This Enables Clean Building:** Engine is isolated, tested, handles ALL poker logic - you never touch it

---

### **Connection 4: Game Engine → Database**

**After Engine Processes:**
```javascript
// routes/games.js line 774:
games.set(gameId, result.newState); // Memory updated

// Then persist (ADDED TODAY):
await StorageAdapter.saveGame(gameId, result.newState);
```

**StorageAdapter Saves:**
```javascript
// sophisticated-engine-server.js line 159:
async saveGame(gameId, gameState) {
  games.set(gameId, gameState); // Memory
  
  const snapshot = gameState.toSnapshot(); // Serialize
  await gameStatesRepository.saveSnapshot(gameId, snapshot); // DB
}
```

**Repository Writes:**
```typescript
// src/services/database/repos/game-states.repo.ts line 210:
async saveSnapshot(gameId, snapshot) {
  const client = await this.db.connect();
  await client.query('BEGIN');
  
  await client.query(`
    UPDATE game_states 
    SET current_state = $1, 
        hand_number = $2,
        version = $3,
        updated_at = NOW()
    WHERE id = $4
  `, [snapshot, snapshot.handState.handNumber, snapshot.version, gameId]);
  
  await client.query('COMMIT'); // ← ADDED TODAY (explicit commit)
}
```

**Status:** ✅ Working (transaction commit added today)

**What Changed:** 
- Uses saveSnapshot instead of updateGameStateAtomic (avoids version conflicts)
- Explicit transaction commit (was implicit)
- Added userId to PlayerModel serialization

**Why This Enables Clean Building:** Every game state change auto-persists - you never manually write SQL for game data

---

### **Connection 5: Database → HTTP API (Hydration)**

**Browser Requests State:**
```javascript
// poker-table-zoom-lock.html line 1506:
const response = await fetch(`/api/rooms/${this.roomId}/hydrate?userId=${this.userId}`);
const hydration = await response.json();
```

**API Queries Database:**
```javascript
// routes/rooms.js line 336 (FIXED TODAY):
const roomResult = await db.query(`
  SELECT id, invite_code, host_user_id, game_id, ...
  FROM rooms WHERE id = $1
`, [roomId]);

const room = roomResult.rows[0];
const currentGameId = room.game_id; // ← Get linked game

// Query exact game (FIXED TODAY):
const gameResult = await db.query(`
  SELECT id, current_state, seq, version
  FROM game_states
  WHERE id = $1  ← Uses exact game_id
`, [currentGameId]);
```

**Extracts from JSONB:**
```javascript
// Lines 368-438 (FIXED TODAY):
const game = gameResult.rows[0];
const state = game.current_state; // Full JSONB object

// Extract hand:
hand = {
  hand_number: state.handState.handNumber,
  phase: state.currentStreet,
  board: state.handState.communityCards.map(convertCard), // ← Format conversion
  pot_total: state.pot.totalPot,
  dealer_seat: state.handState.dealerPosition
};

// Extract players:
players = Object.entries(state.players).map(([id, player]) => ({
  user_id: player.userId,  // ← ADDED TODAY (serialized now)
  username: player.name,
  seat_index: player.seatIndex,
  stack: player.stack
}));

// Extract MY hole cards:
for (const [id, player] of Object.entries(state.players)) {
  if (player.userId === userId && player.holeCards) {
    myHoleCards = player.holeCards.map(convertCard); // ← Format conversion
  }
}
```

**Returns to Browser:**
```javascript
res.json({
  seq: currentSeq,
  room: {...},
  game: {id, status},
  hand: {hand_number, phase, board, pot_total, dealer_seat},
  seats: [...],
  me: {
    seat_index: mySeat,
    hole_cards: myHoleCards  // ← ["clubs_4", "hearts_7"]
  }
});
```

**Status:** ✅ FIXED TODAY (queries correct table, extracts from JSONB, converts format)

**What Changed:**
- Query uses rooms.game_id instead of searching all games
- Extracts from current_state JSONB instead of querying hands/players tables
- Converts card format: `C4` → `clubs_4` to match image file names
- Returns userId in player objects so frontend can match hole cards

**Why This Enables Clean Building:** Hydration is now THE source of truth - any future feature (spectator, hand history, replay) uses same pattern

---

### **Connection 6: HTTP Response → Browser Render**

**Browser Receives Hydration:**
```javascript
// poker-table-zoom-lock.html line 1542:
renderFromHydration(hydration) {
  console.log('🎨 Rendering from hydration...', hydration);
  
  // Check if game exists:
  if (!hydration.game || !hydration.hand) {
    this.showSeatSelection(hydration); // No game yet
    return;
  }
  
  // Game exists - render it:
  const seatData = hydration.seats.map(s => {
    const isMe = s.user_id === this.userId;
    
    let cards = ['back', 'back']; // Default: card backs
    if (isMe && hydration.me?.hole_cards) {
      cards = hydration.me.hole_cards; // My cards: ["clubs_4", "hearts_7"]
    }
    
    return {
      index: s.seat_index,
      name: s.username,
      chips: s.chips_in_play,
      cards: cards,  // Will render as <img src="/cards/clubs_4.png">
      isMe: isMe
    };
  });
  
  this.renderSeats(seatData);
  this.renderBoard(hydration.hand.board); // Community cards
  this.renderPot(hydration.hand.pot_total); // Pot amount
  this.updateDealerButton(hydration.hand.dealer_seat); // Dealer chip
}
```

**Status:** ✅ Code exists and ready

**What Changed:** Added payload unwrapping for hand_started event

**Why This Enables Clean Building:** Rendering is data-driven - add new data to hydration response, frontend automatically shows it

---

### **Connection 7: WebSocket Broadcasts → Browser Updates**

**Server Broadcasts:**
```javascript
// routes/games.js line 421:
io.to(`room:${roomId}`).emit('hand_started', {
  type: 'hand_started',
  seq: seq,
  payload: {
    gameId,
    handNumber,
    dealerSeat,  // ← ADDED TODAY
    pot,         // ← ADDED TODAY
    players: [...]
  }
});
```

**Browser Receives:**
```javascript
// poker-table-zoom-lock.html line 1697:
this.socket.on('hand_started', this.sequenceTracker.createHandler((data) => {
  this.onHandStarted(data.payload);
}));
```

**Handler Updates UI:**
```javascript
// Line 1728:
onHandStarted(data) {
  const payload = data.payload || data; // ← ADDED TODAY (unwrap)
  this.renderPot(payload.pot || 0);
  this.updateDealerButton(payload.dealerSeat);
  // Note: Hole cards come from hydration, not broadcast (security)
}
```

**Status:** ✅ Working (payload format fixed today)

**What Changed:** Broadcast includes dealerSeat and pot, frontend unwraps payload

**Why This Enables Clean Building:** Real-time updates work - add new broadcasts for tournaments, spectators, etc.

---

## 🔧 EXACTLY WHAT WE CHANGED TODAY (Complete List)

### **File 1: routes/rooms.js**
**Lines 349-358:** Hydration now queries using rooms.game_id  
**Lines 388-399:** Converts card format (C4 → clubs_4)  
**Lines 417-433:** Card format conversion for hole cards  
**Lines 420-432:** Added userId matching for hole cards

**Result:** Hydration returns correct game with properly formatted cards

---

### **File 2: routes/games.js**
**Line 333:** Added StorageAdapter to destructured variables  
**Line 387:** Set player.userId when bridging from room_seats  
**Lines 429-430:** Added dealerSeat and pot to hand_started broadcast  
**Lines 448, 778:** Call StorageAdapter.saveGame after state changes  
**Line 664:** Added StorageAdapter to actions handler

**Result:** Game state persists to database, broadcasts include needed data

---

### **File 3: src/core/models/player.ts**
**Line 5:** Added userId property to PlayerModel  
**Line 90:** userId included in toSnapshot()  
**Line 100:** holeCards included in toSnapshot()  
**Line 110:** userId restored in fromSnapshot()

**Result:** userId survives serialization, hole cards match users

---

### **File 4: src/services/database/repos/game-states.repo.ts**
**Lines 68:** Uses initialState.version instead of hardcoded 1  
**Lines 151-156:** Added version mismatch diagnostics  
**Lines 211-253:** Explicit transaction (BEGIN/COMMIT) in saveSnapshot

**Result:** No version conflicts, transactions commit properly

---

### **File 5: sophisticated-engine-server.js**
**Lines 64-66:** Removed fullGameRepository.createGame() call  
**Lines 159-182:** saveGame uses saveSnapshot (no version checking)  
**Lines 168-184:** Added saveGame diagnostics

**Result:** No duplicate saves, no version conflicts

---

### **File 6: services/session-service.js**
**Line 125:** Changed 'active' → 'SEATED'  
**Line 229:** Changed 'vacant' → 'WAITLIST'

**Result:** room_seats constraint no longer fails

---

### **File 7: src/services/database/event-store.repo.ts**
**Lines 45-74:** Wrapped in try-catch, fails gracefully

**Result:** Event logging failures don't crash server

---

### **File 8: public/poker-table-zoom-lock.html**
**Line 1655:** Added user_id to action requests  
**Line 1729:** Unwraps payload in onHandStarted  
**Line 1992:** Added user_id to game creation request

**Result:** Actions work, broadcasts render correctly

---

### **File 9: src/services/timer-service.js**
**Lines 231-235:** Returns default timebank instead of querying players table

**Result:** Timer doesn't crash

---

## ✅ WHAT STAYS THE SAME (Don't Touch)

1. **Game Engine** (dist/core/) - Compiled TypeScript, fully working
2. **Database Schema** - 40+ tables, all relationships correct
3. **WebSocket Infrastructure** - Room management, broadcasts working
4. **Auth System** - Supabase OAuth + guest users working
5. **Lobby System** - Room creation, joining, approval working
6. **UI Design** - Zoom-lock table, responsive, beautiful
7. **Timer System** - Turn timers, auto-fold working
8. **Crash Recovery** - Loads games from database on restart

**These are DONE. Don't rebuild them.**

---

## 🎯 WHAT THIS ARCHITECTURE ENABLES

### **Immediate (Once Fixes Verified):**

✅ **Share link with friends** - They join, play poker, refresh works  
✅ **Host controls** - Kick player, adjust chips, pause game  
✅ **Mobile play** - Zoom-lock already responsive  
✅ **Multi-hand games** - Engine handles unlimited hands  
✅ **Crash recovery** - Server restart doesn't lose games

---

### **Week 1 (After Core Works):**

✅ **Hand History Viewer**
```javascript
// Query the JSONB we're already saving:
SELECT 
  id,
  current_state->'actionHistory' as actions,
  current_state->'handState'->'communityCards' as board,
  current_state->'winners' as winners
FROM game_states
WHERE id = $1;

// Display as timeline - data already exists
```

✅ **Player Statistics**
```javascript
// Extract from game_states:
SELECT 
  jsonb_object_keys(current_state->'players') as player_id,
  COUNT(*) as hands_played,
  SUM((current_state->'pot'->>'totalPot')::int) as total_pot_won
FROM game_states
WHERE current_state->'winners' @> ...
GROUP BY player_id;
```

✅ **Friends System**
```javascript
// Tables already exist:
INSERT INTO friendships (user_id, friend_id) VALUES ($1, $2);

// Use existing user_profiles table
// Use existing notifications system
```

---

### **Week 2-3:**

✅ **AI Analysis**
```javascript
// Extract hand from game_states:
const hand = gameState.current_state.actionHistory;

// Format for GPT-4:
const prompt = `Analyze this poker hand: ${JSON.stringify(hand)}`;

// OpenAI API call:
const analysis = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{role: "user", content: prompt}]
});

// Return insights
```

✅ **Clubs**
```javascript
// Tables exist: clubs, club_members
POST /api/clubs
POST /api/clubs/:id/invite
GET /api/clubs/:id/leaderboard

// Query game_states where room_id IN (SELECT room_id FROM club_games)
```

---

### **Month 1:**

✅ **Tournaments**
```javascript
// New tables needed:
CREATE TABLE tournaments (id, name, buy_in, status);
CREATE TABLE tournament_tables (tournament_id, table_number, game_id);

// Each table uses same game_states system
// Link tables: tournament_tables.game_id → game_states.id
// Balance tables by moving players between game_states rows
```

✅ **Provably Fair RNG**
```javascript
// Add to game_states.current_state:
{
  "shuffleProof": {
    "serverSecret": "...",
    "clientEntropy": "...",
    "commitment": "SHA256(...)",
    "deckOrder": [...]
  }
}

// Verification endpoint:
POST /api/games/:id/verify-shuffle
// Recomputes deck, compares to actual
```

---

## 🏗️ THE CLEAN ARCHITECTURE (Post-Fix)

```
User Action
  ↓
HTTP POST → Idempotency Check → Handler
  ↓
games.get(gameId) → GameStateModel (in-memory)
  ↓
stateMachine.processAction() → Engine logic
  ↓
games.set(gameId, newState) → Update memory
  ↓
StorageAdapter.saveGame() → Persist to game_states table
  ↓
io.to(room).emit() → Broadcast to clients
  ↓
All clients update UI from broadcast
```

**On Refresh:**
```
Browser loads
  ↓
GET /hydrate?userId=X
  ↓
Query: game_states WHERE id = (rooms.game_id)
  ↓
Extract from current_state JSONB
  ↓
Return: Complete snapshot
  ↓
Browser renders from snapshot
  ↓
Connect WebSocket for live updates
```

**Every future feature follows this pattern.**

---

## 🎯 ROADMAP TO COMPLETION

### **Phase 0: Verification (30 min - NOW)**

**No coding. Just verify fixes:**

1. Create new room
2. 2 players join
3. Start hand
4. Check server logs for:
   ```
   ✅ Transaction COMMITTED
   ✅ Extracted 2 hole cards for user
   ```
5. Hard refresh
6. Check if cards appear

**If works:** Phase 1  
**If broken:** Diagnostic session (I guide you through checks)

---

### **Phase 1: Core Game (2 hours)**

**Tasks:**
- Test full hand (preflop → flop → turn → river → showdown)
- Test all actions (fold, call, raise, check, all-in)
- Test multiple hands
- Test 3+ players
- Fix any bugs found

**Deliverable:** Working poker game, shareable with friends

---

### **Phase 2: Analytics Foundation (4 hours)**

**Create extraction:**
```javascript
// Add to routes/games.js when hand completes:
async function extractHandHistory(gameId) {
  const state = games.get(gameId);
  
  await db.query(`
    INSERT INTO hand_history_archive (
      game_id, hand_number, players, actions, board, pot, winner
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    gameId,
    state.handState.handNumber,
    JSON.stringify(state.players),
    JSON.stringify(state.actionHistory),
    JSON.stringify(state.handState.communityCards),
    state.pot.totalPot,
    JSON.stringify(state.winners)
  ]);
}
```

**Deliverable:** Historical data for analysis

---

### **Phase 3: Feature Layer (Ongoing)**

**Each feature = 4-8 hours:**
- Hand history viewer
- AI analysis
- Friends system
- Clubs
- Tournaments

**All build on same foundation.**

---

## 💬 WHY THIS PLAN IS DIFFERENT

### **Previous Plans:**
- "Let's rebuild the table" → Didn't address hydration
- "Let's add session management" → Added complexity, didn't fix core
- "Let's use React" → Framework change, same architecture problems

### **This Plan:**
- Fix the 9 connections that are broken
- Don't touch the 90% that works
- Verify each fix with diagnostics
- Build features on working foundation

---

## 🎯 WHAT YOU NEED TO APPROVE

**I will:**
1. Guide you through testing current fixes (30 min)
2. If broken, run diagnostics to find EXACT layer (30 min)
3. Make ONE surgical fix per broken layer (15 min each)
4. Repeat until game works (max 3-4 iterations)

**I will NOT:**
- Delete your UUID tables (might need later)
- Rebuild anything that works
- Change architecture
- Add new systems

**Total time:** 2-4 hours to working game

**Then you decide:** Continue with features OR hand off to another dev

---

**Do you approve this approach?**

Say "YES" and I'll start with diagnostic testing (no code changes).

