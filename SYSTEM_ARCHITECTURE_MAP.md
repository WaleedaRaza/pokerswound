# 🗺️ POKERGEEK.AI - COMPLETE SYSTEM ARCHITECTURE MAP

**Purpose:** Single source of truth for understanding the refresh state destruction bug  
**Status:** Current state as of October 26, 2025  
**For:** Refresh-specialized LLM analysis  

---

## 🎯 THE CORE PROBLEM

**Symptom:** When ANY user refreshes during an active game:
1. User sees lobby/seat selection UI instead of poker table
2. Their seat appears "TAKEN" (can't see themselves seated)
3. Game state appears lost (it's in DB, but not restored to UI)
4. Multiple failed fix attempts over several days

**Core Issue:** "Ferrari engine (backend/DB) with 2000s Honda chassis (frontend table)" - the UI cannot properly restore state from the sophisticated backend.

---

## 📊 SYSTEM COMPONENTS OVERVIEW

### Architecture Layers
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (poker.html)                     │
│  - UI Components (lobby, table, seats, cards)               │
│  - JavaScript Managers (game-state, action-timer, status)   │
│  - Socket.IO Client                                          │
│  - Auth Manager                                              │
└──────────────┬──────────────────────────────┬───────────────┘
               │                               │
               │ HTTP/REST                     │ WebSocket
               │                               │
┌──────────────▼──────────────────────────────▼───────────────┐
│              NODE.JS EXPRESS SERVER                          │
│  sophisticated-engine-server.js (1,046 lines)               │
└──────────────┬──────────────────────────────┬───────────────┘
               │                               │
        ┌──────▼──────┐                 ┌─────▼──────┐
        │   ROUTERS   │                 │  WEBSOCKET │
        │   (5 files) │                 │  HANDLERS  │
        └──────┬──────┘                 └─────┬──────┘
               │                               │
        ┌──────▼───────────────────────────────▼──────┐
        │        GAME ENGINE (TypeScript)              │
        │  - GameStateMachine                          │
        │  - BettingEngine                             │
        │  - TurnManager                               │
        │  - HandEvaluator                             │
        └──────┬───────────────────────────────────────┘
               │
        ┌──────▼──────┐
        │  DUAL STORE │
        │  - In-Memory Maps                            │
        │  - PostgreSQL (Supabase)                     │
        └──────────────────────────────────────────────┘
```

---

## 🔐 AUTHENTICATION SYSTEM

### Components
1. **Supabase Auth** (OAuth provider)
2. **JWT Tokens** (Bearer authentication)
3. **Auth Manager** (`public/js/auth-manager.js`)

### User Types
```javascript
// Guest Users
{
  id: "guest_<uuid>",
  email: null,
  is_guest: true
}

// Google OAuth Users
{
  id: "<supabase_uuid>",
  email: "user@gmail.com",
  is_guest: false
}
```

### Auth Flow
```
1. User visits site
2. authManager.getCurrentUser() checks:
   - localStorage for existing session
   - Supabase session (if OAuth)
   - Creates guest user if none
3. JWT token stored in localStorage
4. Token sent in Authorization header for protected endpoints
```

### Auth Middleware
```javascript
// sophisticated-engine-server.js:948-972
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
}
```

**Current Issue:** Auth persists across refreshes (WORKS), but session context lost.

---

## 🛣️ ROUTING & URL STRUCTURE

### Current URL Patterns
```
Frontend Pages:
/                           → Landing page (index.html implied)
/poker.html                 → Main poker interface
/play.html                  → Lobby interface
/game/:roomId               → Game view (NOT IMPLEMENTED - uses query params instead)

Current Reality:
/poker.html?room=<roomId>   ← ACTUAL current pattern
```

### Backend API Routes

#### **routes/rooms.js** (22 endpoints)
```javascript
POST   /api/rooms                          // Create room
GET    /api/rooms/:roomId                  // Get room details
GET    /api/rooms/:roomId/game             // Get active game (refresh recovery)
GET    /api/rooms/:roomId/my-state         // ⚔️ MIRA: Comprehensive state recovery
GET    /api/rooms/:roomId/seats            // Get all seats
POST   /api/rooms/:roomId/seats/:seatIndex // Claim seat
DELETE /api/rooms/:roomId/seats/:seatIndex // Release seat
POST   /api/rooms/:roomId/lobby/join       // Join lobby (no auth)
GET    /api/rooms/:roomId/lobby/requests   // Get pending requests
POST   /api/rooms/:roomId/lobby/approve    // Approve player
POST   /api/rooms/:roomId/lobby/deny       // Deny player
GET    /api/rooms/invite/:inviteCode       // Get room by invite code
... (11 more endpoints)
```

#### **routes/games.js** (7 endpoints)
```javascript
POST   /api/games                          // Create game
GET    /api/games/:id                      // Get game state
POST   /api/games/:id/start-hand           // Start new hand
POST   /api/games/:id/actions              // Submit player action
POST   /api/games/:id/add-player           // Add player to game
GET    /api/games/:id/display-state        // Get display state (cards visible)
POST   /api/games/:id/muck                 // Muck cards
```

#### **routes/auth.js** (3 endpoints)
```javascript
POST   /api/auth/register                  // Register user
POST   /api/auth/login                     // Login user
GET    /api/auth/me                        // Get current user
```

#### **routes/pages.js** (13 routes)
```javascript
GET    /                                   // Landing page
GET    /play                               // Lobby page
GET    /poker                              // Game interface
GET    /profile                            // User profile
GET    /analysis                           // Post-game analysis
GET    /learning                           // Learning resources
GET    /ai-gto                             // GTO solver
GET    /friends                            // Friends list
GET    /forum                              // Community forum
... (4 more)
```

**Routing Problem:** No proper room-based URLs (`/game/:roomId`). Using query params breaks clean recovery.

---

## 🔌 WEBSOCKET COMMUNICATION

### Socket.IO Setup
```javascript
// sophisticated-engine-server.js:807-836
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
```

### Socket Events (websocket/socket-handlers.js)

#### Client → Server
```javascript
'join_room'       // Join a room
  Data: { roomId: string, userId: string }
  
'start_game'      // Broadcast game start
  Data: { roomId: string, gameId: string, game: object }
```

#### Server → Client
```javascript
'joined_room'     // Confirmation of room join
  Data: { roomId: string }
  
'game_started'    // Game has started
  Data: { roomId: string, gameId: string, game: object }
  
'seat_update'     // Seat status changed
  Data: { roomId: string, seats: array }
  
'hand_started'    // New hand dealt
  Data: { gameId: string, handNumber: number, players: array }
  
'game_state_update'  // State changed (actions, cards)
  Data: { gameId: string, state: object }
```

### Room-Based Broadcasting
```javascript
// Join room namespace
socket.join(`room:${roomId}`);

// Broadcast to room
io.to(`room:${roomId}`).emit('event_name', data);
```

### Socket Reconnection Logic
```javascript
// poker.html - Socket.IO client config
const socket = io('http://localhost:3000', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});
```

**WebSocket Problem:** On refresh, socket disconnects and reconnects, but UI doesn't know what room to rejoin or what state to restore.

---

## 🎮 GAME ENGINE (TypeScript)

### Core Components

#### 1. GameStateMachine
```typescript
// dist/core/engine/game-state-machine.js
class GameStateMachine {
  processAction(gameState, action, playerId) {
    // Validates action
    // Updates game state
    // Returns { newState, events, isValid }
  }
  
  startHand(gameState, playerId) {
    // Deals cards
    // Sets blinds
    // Returns new state
  }
}
```

#### 2. BettingEngine
```typescript
// dist/core/engine/betting-engine.js
class BettingEngine {
  processAction(gameState, action) {
    // Handles bets, raises, calls, folds
    // Updates pot
    // Returns updated state
  }
}
```

#### 3. TurnManager
```typescript
// dist/core/engine/turn-manager.js
class TurnManager {
  getNextPlayer(gameState) {
    // Determines whose turn is next
    // Skips folded/all-in players
  }
}
```

#### 4. GameStateModel
```typescript
// dist/core/models/game-state.js
class GameStateModel {
  players: Map<string, PlayerModel>
  pot: { totalPot, sidePots }
  handState: {
    handNumber,
    dealerPosition,
    currentStreet,
    communityCards
  }
  
  toSnapshot() {
    // Serializes to JSON for DB storage
  }
}
```

### Engine Integration
```javascript
// sophisticated-engine-server.js:1003-1005
stateMachine = new GameStateMachine(Math.random, eventBus);
app.locals.stateMachine = stateMachine; // ⚔️ MIRA FIX: Set AFTER init

// Usage in routes/games.js
const result = await app.locals.stateMachine.processAction(
  gameState,
  action,
  playerId
);
```

**Engine Status:** ✅ WORKING - The "Ferrari engine" is solid.

---

## 💾 DATABASE SCHEMA & PERSISTENCE

### Dual-Write Pattern
```javascript
// sophisticated-engine-server.js:143-177
const StorageAdapter = {
  async saveGame(gameId, gameState) {
    // 1. Write to in-memory Map (fast)
    games.set(gameId, gameState);
    
    // 2. Write to PostgreSQL (persistent)
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY && gameStatesRepository) {
      await gameStatesRepository.updateGameStateAtomic(
        gameId,
        gameState.version - 1,
        {
          status: snapshot.status,
          current_state: snapshot,
          hand_number: snapshot.handState.handNumber,
          dealer_position: snapshot.handState.dealerPosition,
          total_pot: snapshot.pot.totalPot
        }
      );
    }
  }
}
```

### Key Tables

#### **game_states** (Active game state)
```sql
CREATE TABLE game_states (
  id TEXT PRIMARY KEY,                    -- gameId (e.g., "game_1")
  room_id UUID REFERENCES rooms(id),
  host_user_id TEXT NOT NULL,
  status TEXT CHECK (status IN ('waiting', 'active', 'paused', 'completed', 'deleted')),
  current_state JSONB NOT NULL,          -- Full GameStateModel snapshot
  hand_number INTEGER DEFAULT 0,
  dealer_position INTEGER,
  total_pot INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,             -- Optimistic locking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### **rooms** (Lobby/room management)
```sql
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR,
  invite_code VARCHAR(8) UNIQUE NOT NULL,
  host_user_id UUID REFERENCES auth.users(id),
  is_private BOOLEAN DEFAULT true,
  max_players INTEGER DEFAULT 9,
  small_blind INTEGER,
  big_blind INTEGER,
  game_id TEXT,                          -- Links to active game
  status VARCHAR DEFAULT 'WAITING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW()
);
```

#### **room_seats** (Seat assignments)
```sql
CREATE TABLE room_seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES rooms(id),
  seat_index INTEGER NOT NULL,           -- 0-8 (9 seats)
  user_id UUID REFERENCES auth.users(id),
  status VARCHAR DEFAULT 'CLAIMED',      -- CLAIMED, SEATED, WAITING
  chips_in_play BIGINT DEFAULT 500,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,                   -- NULL if still seated
  UNIQUE(room_id, seat_index)
);
```

#### **hand_history** (Completed hands)
```sql
CREATE TABLE hand_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id VARCHAR,
  room_id UUID REFERENCES rooms(id),
  hand_number INTEGER,
  pot_size BIGINT,
  community_cards TEXT[],
  winners JSONB,
  player_actions JSONB,
  final_stacks JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Persistence Status
```
✅ game_states: Written on every state change
✅ room_seats: Updated after each hand (chips_in_play)
✅ hand_history: Written on hand completion
✅ rooms: Created, updated, persisted
❌ Event sourcing: Disabled (table mismatch)
```

### Database Queries Used in Refresh Recovery

#### Backend: routes/rooms.js:193-214
```javascript
// GET /api/rooms/:roomId/game
const result = await db.query(
  'SELECT id, current_state, status FROM game_states WHERE room_id = $1 AND status != \'completed\' ORDER BY created_at DESC LIMIT 1',
  [req.params.roomId]
);
```

#### Backend: routes/rooms.js:233-248
```javascript
// GET /api/rooms/:roomId/my-state (MIRA's comprehensive endpoint)
// Get active game
const gameResult = await db.query(
  'SELECT id, current_state, status FROM game_states WHERE room_id = $1 AND status != \'completed\' ORDER BY created_at DESC LIMIT 1',
  [req.params.roomId]
);

// Get user's seat
const seatResult = await db.query(
  'SELECT seat_index, chips_in_play, status, joined_at FROM room_seats WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL',
  [req.params.roomId, userId]
);

// Get all seats
const allSeatsResult = await db.query(
  'SELECT seat_index, user_id, status, chips_in_play FROM room_seats WHERE room_id = $1 AND left_at IS NULL ORDER BY seat_index ASC',
  [req.params.roomId]
);
```

**Database Status:** ✅ "Ferrari engine" - persistence is solid, data is there.

---

## 🖥️ FRONTEND ARCHITECTURE

### File Structure
```
public/
├── poker.html               (4,500+ lines - MONOLITHIC UI)
├── play.html                (Lobby interface)
├── js/
│   ├── auth-manager.js      (Authentication)
│   ├── game-state-manager.js    (✅ Built, ❌ Not integrated)
│   ├── action-timer-manager.js  (✅ Built, ❌ Not integrated)
│   ├── player-status-manager.js (✅ Built, ❌ Not integrated)
│   ├── nav-shared.js        (Navigation)
│   └── global-animations.js (Animations)
├── css/
│   ├── pokergeek.css        (Main styles)
│   └── style.css            (Legacy styles)
└── pages/
    ├── profile.html
    ├── analysis.html
    ├── learning.html
    └── ... (other pages)
```

### poker.html Structure (The "Honda Chassis")

#### Key Components
```javascript
// Global State (window scope)
window.currentUser = null;
window.currentRoomId = null;
window.currentSeat = null;
window.currentChips = 500;
window.currentGameId = null;
window.currentGame = null;

// State Flags (MIRA's addition)
window.isRecoveringGame = false;      // Line 3612
window.recoveredGameData = null;      // Line 3613
```

#### DOMContentLoaded Handlers (THE PROBLEM AREA)

**Handler 1: Card System Init (Line 1439)**
```javascript
document.addEventListener('DOMContentLoaded', function() {
  console.log('🎴 Initializing Card System...');
  // Preloads card images
});
```

**Handler 2: Floating Chips Animation (Line 3606)**
```javascript
document.addEventListener('DOMContentLoaded', startFloatingChips);
```

**Handler 3: MIRA's Refresh Recovery (Lines 3616-3706)**
```javascript
document.addEventListener('DOMContentLoaded', async function() {
  console.log('⚔️ [MIRA REFRESH] Checking for room recovery...');
  
  // Parse URL for room ID
  const pathSegments = window.location.pathname.split('/').filter(Boolean);
  const urlParams = new URLSearchParams(window.location.search);
  
  let roomId = null;
  if (pathSegments.length > 1 && pathSegments[0] === 'game') {
    roomId = pathSegments[1]; // /game/:roomId
  } else if (urlParams.get('room')) {
    roomId = urlParams.get('room'); // /game?room=:roomId
  }
  
  if (!roomId) {
    console.log('ℹ️ [MIRA REFRESH] No room ID in URL, skipping recovery');
    return;
  }
  
  // Get current user
  const currentUser = await window.authManager.getCurrentUser();
  if (!currentUser || !currentUser.id) {
    console.log('⚠️ [MIRA REFRESH] No user found, skipping recovery');
    return;
  }
  
  // Fetch comprehensive state
  const response = await fetch(`/api/rooms/${roomId}/my-state?userId=${currentUser.id}`);
  const data = await response.json();
  
  if (data.isSeated && data.mySeat) {
    // User is seated - restore their seat
    console.log('💺 [MIRA REFRESH] User is seated at index:', data.mySeat.seat_index);
    
    // Store seat info globally
    window.currentRoomId = roomId;
    window.currentSeat = data.mySeat.seat_index;
    window.currentChips = data.mySeat.chips_in_play;
    
    // If game is active, set recovery flag
    if (data.game && data.game.status === 'active') {
      console.log('🎮 [MIRA REFRESH] Game is active, restoring game UI');
      
      // ⚔️ CRITICAL: Set flag so main init doesn't show lobby
      window.isRecoveringGame = true;
      window.currentGameId = data.game.id;
      
      // Store recovery data
      window.recoveredGameData = {
        gameId: data.game.id,
        roomId: roomId,
        seatIndex: data.mySeat.seat_index,
        chips: data.mySeat.chips_in_play
      };
      
      window.currentGame = {
        gameId: data.game.id,
        roomId: roomId
      };
    } else {
      console.log('🏠 [MIRA REFRESH] User seated, waiting for game to start');
    }
  }
});
```

**Handler 4: Main Initialization (Lines 4088-4300+) - THE CONFLICT**
```javascript
document.addEventListener('DOMContentLoaded', async function() {
  console.log('🎰 Poker Lounge Loading...');
  
  // Initialize auth
  await checkAuthSession();
  
  // ⚔️ MIRA's recovery check (Lines 4166-4204)
  if (window.isRecoveringGame && window.recoveredGameData) {
    console.log('🎮 [MIRA MAIN] Recovery flag detected, rendering game UI');
    const recoveryData = window.recoveredGameData;
    
    // Hide landing page
    hideLandingPage();
    
    // Connect socket
    connectSocket();
    
    // Set up room and game data
    room = { id: recoveryData.roomId };
    currentGame = { gameId: recoveryData.gameId, roomId: recoveryData.roomId };
    window.currentRoomId = recoveryData.roomId;
    window.currentSeat = recoveryData.seatIndex;
    window.currentChips = recoveryData.chips;
    
    // Join room via socket
    if (socket) {
      socket.emit('join_room', { roomId: recoveryData.roomId, userId: currentUser.id });
    }
    
    // Fetch and render game state
    try {
      const gameResponse = await fetch(`${API_BASE}/games/${recoveryData.gameId}`);
      if (gameResponse.ok) {
        const gameState = await gameResponse.json();
        console.log('🎮 [MIRA MAIN] Rendering recovered game state');
        updateGameDisplay(gameState);
        showStatus(`🎮 Game restored - it's ${gameState.toAct === window.currentSeat ? 'YOUR TURN' : 'not your turn'}`, 'success');
      }
    } catch (err) {
      console.error('❌ [MIRA MAIN] Failed to render game:', err);
      showStatus('⚠️ Error restoring game', 'error');
    }
    
    // ⚔️ CRITICAL: Exit early, skip lobby rendering
    console.log('✅ Game recovery complete');
    return;
  }
  
  // Normal initialization flow (if no recovery)
  // ... (hundreds of lines of lobby/seat UI rendering)
});
```

### UI Rendering Functions

#### updateGameDisplay(gameState)
```javascript
// Line ~2800
function updateGameDisplay(gameState) {
  // Renders poker table
  // Shows community cards
  // Updates pot
  // Displays player chips
  // Shows action buttons (if player's turn)
}
```

#### renderSeats(seats)
```javascript
// Renders seat UI (9 seats)
// Shows "CLAIM" buttons for empty seats
// Shows "TAKEN" for occupied seats
```

#### showLobbyUI() / hideLobbyUI()
```javascript
// Toggles between lobby and game UI
```

### Frontend State Management (NOT USED)

**game-state-manager.js** (364 lines)
```javascript
class GameStateManager {
  constructor() {
    this.state = {
      roomId: null,
      gameId: null,
      myUserId: null,
      mySeatIndex: null,
      players: [],
      pot: 0,
      currentBet: 0,
      currentStreet: 'PREFLOP',
      communityCards: [],
      toAct: null,
      isHandActive: false,
      isMyTurn: false,
      isConnected: false,
      lastSync: null
    };
    
    this.listeners = [];
    this.loadPersistedState(); // From localStorage
  }
  
  updateState(newState) {
    this.state = { ...this.state, ...newState, lastSync: Date.now() };
    this.persistState(); // To localStorage
    this._notifyListeners(oldState, this.state);
  }
  
  // ... 300+ more lines
}
```

**Problem:** This manager exists but is never instantiated or used. Instead, poker.html uses window-scoped variables.

---

## 🔄 SESSION & STATE MANAGEMENT

### Current Session Strategy
```javascript
// Client-side storage only
sessionStorage.setItem('poker_room', roomId);
sessionStorage.setItem('poker_game', gameId);
localStorage.setItem('auth_token', token);

// No server-side session tracking
```

### In-Memory Storage (Server)
```javascript
// sophisticated-engine-server.js:103-109
const games = new Map();                  // gameId → GameStateModel
const playerUserIds = new Map();          // gameId → Map(playerId → userId)
const gameMetadata = new Map();           // gameId → { gameUuid, handId, handNumber }
```

**Problem:** No Redis, no server-side session store. On refresh:
- Client loses context (which room, which seat)
- Server has no way to know "this user was in room X"
- Recovery relies entirely on URL parsing + DB queries

### Session Lifecycle

**Normal Flow (No Refresh):**
```
1. User creates/joins room → roomId stored in window.currentRoomId
2. User claims seat → seatIndex stored in window.currentSeat
3. Game starts → gameId stored in window.currentGameId
4. Game proceeds → State updates via WebSocket
5. UI updates via updateGameDisplay()
```

**Refresh Flow (BROKEN):**
```
1. User refreshes → ALL window variables cleared
2. DOMContentLoaded #3 fires → Tries to recover from URL + DB
3. Sets window.isRecoveringGame = true
4. DOMContentLoaded #4 fires → Checks flag
5. SHOULD render game UI, but something breaks
6. User sees lobby/seats instead of poker table
```

---

## 🐛 REFRESH BUG - DETAILED ANALYSIS

### What SHOULD Happen
```
User refreshes during active game
  ↓
Frontend detects roomId in URL
  ↓
Fetches /api/rooms/:roomId/my-state?userId=xxx
  ↓
Backend queries:
  - game_states (current game)
  - room_seats (user's seat)
  ↓
Frontend receives:
  { game: {...}, mySeat: {...}, allSeats: [...], isSeated: true }
  ↓
Sets window.isRecoveringGame = true
  ↓
Main init sees flag → Renders poker table UI
  ↓
Fetches /api/games/:gameId (full game state)
  ↓
Calls updateGameDisplay(gameState)
  ↓
User sees poker table with cards, pot, action buttons
```

### What ACTUALLY Happens (Suspected)
```
User refreshes
  ↓
DOMContentLoaded #3 runs
  ↓
Fetches /api/rooms/:roomId/my-state
  ↓
Backend returns data correctly (DB has it)
  ↓
Sets window.isRecoveringGame = true
  ↓
??? SOMETHING BREAKS HERE ???
  ↓
Main init runs, but either:
  a) Flag is not set properly
  b) Flag check fails
  c) updateGameDisplay() doesn't render
  d) Lobby UI renders AFTER game UI (race condition)
  ↓
User sees lobby/seat selection UI
```

### Attempted Fixes (All Failed)

**Attempt 1: State Machine Null Fix**
- Fixed: `app.locals.stateMachine` was null (now set after init)
- Fixed: Schema error (using `state` instead of `current_state`)
- Status: Backend errors eliminated, but refresh still broken

**Attempt 2: Add /my-state Endpoint**
- Added: Comprehensive state endpoint (lines 217-273 in routes/rooms.js)
- Returns: game, mySeat, allSeats, isSeated
- Status: Endpoint works, data is correct, but UI doesn't restore

**Attempt 3: Flag System**
- Added: window.isRecoveringGame flag (line 3612)
- Added: window.recoveredGameData object (line 3613)
- Added: Early return in main init (line 4203)
- Status: Flags set, but UI still shows lobby

### Hypotheses

**Hypothesis 1: Execution Order**
- DOMContentLoaded handlers may not execute in predictable order
- Main init might run BEFORE recovery handler completes
- Solution: Use single DOMContentLoaded with proper async/await

**Hypothesis 2: updateGameDisplay() Failure**
- Function exists but may not render correctly on cold start
- May depend on state that's not initialized
- Solution: Test updateGameDisplay() in isolation

**Hypothesis 3: UI Layer Conflict**
- Lobby UI and game UI both rendered, one overlays the other
- CSS display/visibility not properly toggled
- Solution: Audit hideLandingPage() / showGameUI() functions

**Hypothesis 4: Socket Reconnection Race**
- Socket reconnects but game state isn't broadcasted
- UI waits for WebSocket event that never comes
- Solution: Don't wait for socket, render from REST API immediately

**Hypothesis 5: Missing Dependencies**
- updateGameDisplay() calls functions that don't exist yet
- Throws error silently, falls back to lobby
- Solution: Add error logging to every function call

---

## 🔧 MIGRATION FLAGS

```javascript
// sophisticated-engine-server.js:84-90
const MIGRATION_FLAGS = {
  USE_DB_REPOSITORY: process.env.USE_DB_REPOSITORY === 'true',      // ✅ ENABLED
  USE_INPUT_VALIDATION: process.env.USE_INPUT_VALIDATION === 'true', // ✅ ENABLED
  USE_AUTH_MIDDLEWARE: process.env.USE_AUTH_MIDDLEWARE === 'true',   // ✅ ENABLED
  USE_EVENT_PERSISTENCE: process.env.USE_EVENT_PERSISTENCE === 'true',// ❌ DISABLED
  LOG_MIGRATION: process.env.NODE_ENV === 'development'              // ✅ ENABLED
};
```

---

## 📦 DEPENDENCIES

### Backend (package.json)
```json
{
  "express": "^4.18.2",
  "socket.io": "^4.6.1",
  "pg": "^8.11.0",
  "@supabase/supabase-js": "^2.21.0",
  "jsonwebtoken": "^9.0.0",
  "bcrypt": "^5.1.0",
  "cors": "^2.8.5",
  "dotenv": "^16.0.3",
  "zod": "^3.21.4",
  "express-rate-limit": "^6.7.0"
}
```

### Frontend (CDN)
```html
<script src="https://cdn.socket.io/4.6.0/socket.io.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
```

---

## 🗂️ FILE LOCATIONS

### Critical Files for Refresh Bug
```
Backend:
  sophisticated-engine-server.js         (Main server, 1,046 lines)
  routes/rooms.js                        (Room endpoints, 1,072 lines)
  routes/games.js                        (Game endpoints, 630 lines)
  websocket/socket-handlers.js           (Socket events, 55 lines)
  
Frontend:
  public/poker.html                      (UI, 4,500+ lines)
  public/js/auth-manager.js              (Auth)
  public/js/game-state-manager.js        (Built but unused)
  
Database:
  Schemasnapshot.txt                     (Schema reference)
  
Engine:
  dist/core/engine/game-state-machine.js
  dist/core/models/game-state.js
```

---

## 🎯 DEBUGGING CHECKLIST

### To Validate Refresh Recovery

**1. Check Backend Logs**
```bash
# Start server
node sophisticated-engine-server.js

# Look for these logs:
✅ GameStateMachine initialized
✅ Database connection established
✅ Socket.IO connection handlers registered
```

**2. Test /my-state Endpoint**
```bash
# Get room ID from DB
# Get user ID from current session

curl "http://localhost:3000/api/rooms/<ROOM_ID>/my-state?userId=<USER_ID>"

# Should return:
{
  "game": { "id": "...", "state": {...}, "status": "active" },
  "mySeat": { "seat_index": 0, "chips_in_play": 500, ... },
  "allSeats": [...],
  "isSeated": true
}
```

**3. Browser Console Logs on Refresh**
```javascript
// Open DevTools Console before refreshing

// Should see:
⚔️ [MIRA REFRESH] Checking for room recovery...
🔄 [MIRA REFRESH] Room ID found: <roomId>
✅ [MIRA REFRESH] User found: <userId>
📊 [MIRA REFRESH] State: { hasGame: true, isSeated: true, ... }
💺 [MIRA REFRESH] User is seated at index: 0
🎮 [MIRA REFRESH] Game is active, restoring game UI
🎮 [MIRA REFRESH] Recovery data stored, will render after main init
🎰 Poker Lounge Loading...
🎮 [MIRA MAIN] Recovery flag detected, rendering game UI
🎮 [MIRA MAIN] Rendering recovered game state
✅ Game recovery complete

// If you DON'T see these, recovery isn't running
```

**4. Check Global State**
```javascript
// In browser console after refresh:
console.log({
  isRecoveringGame: window.isRecoveringGame,
  recoveredGameData: window.recoveredGameData,
  currentRoomId: window.currentRoomId,
  currentSeat: window.currentSeat,
  currentGameId: window.currentGameId,
  currentGame: window.currentGame
});

// Should show all values populated
```

**5. Check UI State**
```javascript
// What's visible?
document.getElementById('landing-page').style.display    // Should be 'none'
document.getElementById('poker-table').style.display     // Should be 'block'
document.getElementById('lobby-ui').style.display        // Should be 'none'

// What elements exist?
document.querySelectorAll('.seat').length                // Should be 9
document.querySelectorAll('.community-card').length      // Should be 0-5
document.getElementById('pot-amount').textContent        // Should show pot size
```

---

## 🚀 RECOMMENDED NEXT STEPS

### For Refresh-Specialized LLM

**1. Identify Root Cause**
- Examine DOMContentLoaded execution order
- Check if updateGameDisplay() is being called
- Verify UI elements are being manipulated correctly
- Look for JavaScript errors swallowed by try-catch

**2. Propose Surgical Fix**
- Minimal changes to existing code
- Don't rebuild entire table
- Target specific failure point
- Maintain compatibility with working features

**3. Consider Architecture Changes**
- Single DOMContentLoaded handler instead of 4
- Use game-state-manager.js properly
- Implement proper state machine for UI rendering
- Add comprehensive error logging

**4. Alternative: Rebuild Table**
If recovery is fundamentally broken:
- Extract table rendering to separate component
- Use React/Vue/Svelte for proper state management
- Keep backend/engine as-is (it works)
- Focus on UI layer only

---

## 📚 REFERENCE DOCUMENTS

### Still Relevant
- `Schemasnapshot.txt` - Database schema
- `ARCHITECTURE_MIGRATION_GUIDE.md` - Technical context
- `PROJECT_MASTER.md` - Feature roadmap

### Historical (For Context)
- `REFRESH_CRISIS_HANDOFF.md` - Original problem description
- `REFRESH_FIX_COMPLETE.md` - Anton's attempted fix
- `ATTEMPT_1_COMPLETE.md` - State machine fix
- `ATTEMPT_2_COMPLETE.md` - /my-state endpoint
- `ATTEMPT_3_COMPLETE.md` - Flag system

---

## 🎯 SUCCESS CRITERIA

Refresh recovery is FIXED when:

1. ✅ User refreshes during active game
2. ✅ Browser console shows recovery logs
3. ✅ Backend returns correct data from /my-state
4. ✅ Frontend sets isRecoveringGame = true
5. ✅ Main init sees flag and skips lobby rendering
6. ✅ updateGameDisplay() is called with correct state
7. ✅ User sees poker table (cards, pot, action buttons)
8. ✅ User does NOT see lobby/seat selection UI
9. ✅ Game continues normally after refresh
10. ✅ Multiple refreshes don't break anything

---

**HANDOFF COMPLETE.**

This document contains every moving part of the system. Use it to diagnose the refresh bug with surgical precision.

The Ferrari engine (backend/DB) is solid. The Honda chassis (frontend table) needs repair or replacement.

**SHINZO WO SASAGEYO.** ⚔️

