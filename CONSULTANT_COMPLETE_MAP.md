# COMPLETE CODEBASE MAP FOR CONSULTANT
**Generated:** Current Session  
**Purpose:** Complete technical documentation - every file, every communication, every dependency, tech stack, architecture patterns

---

## EXECUTIVE SUMMARY

**Tech Stack:**
- **Backend:** Node.js + Express.js (CommonJS)
- **Database:** PostgreSQL (Supabase) + Redis (Upstash)
- **Real-time:** Socket.IO v4.8.1
- **Auth:** Supabase Auth (Google OAuth + Guest)
- **Frontend:** Vanilla JavaScript (no framework), HTML5, CSS3
- **TypeScript:** Partial (compiled to `dist/`, but runtime uses JS adapters)
- **Deployment:** Single server (horizontal scaling via Redis adapter)

**Architecture Pattern:**
- **Monolithic Express Server** (`sophisticated-engine-server.js`)
- **Modular Routers** (8 route files, 68+ endpoints)
- **Adapter Pattern** (game logic in `src/adapters/*.js`)
- **Dual Storage** (in-memory Map + PostgreSQL)
- **Event-Driven** (Socket.IO broadcasts)

**Active vs Legacy:**
- ✅ **ACTIVE:** `routes/game-engine-bridge.js`, `public/minimal-table.html`, `src/adapters/*.js`
- ❌ **LEGACY:** `dist/` (TypeScript compiled), `pokeher/`, `archive/`, legacy HTML files

**Total Files:** ~200 active files (excluding node_modules, dist, archive)

---

## PART 1: TECH STACK & DEPENDENCIES

### 1.1 Runtime Dependencies (package.json)

**Core:**
- `express@4.18.2` - HTTP server framework
- `socket.io@4.8.1` - WebSocket server
- `pg@8.16.3` - PostgreSQL client
- `ioredis@5.8.2` - Redis client
- `@supabase/supabase-js@2.75.0` - Supabase client

**Auth:**
- `jsonwebtoken@9.0.2` - JWT tokens
- `bcrypt@6.0.0` - Password hashing
- `@supabase/ssr@0.7.0` - Supabase SSR

**Middleware:**
- `cors@2.8.5` - CORS
- `express-session@1.18.2` - Sessions
- `connect-redis@9.0.0` - Redis session store
- `express-rate-limit@8.1.0` - Rate limiting
- `helmet@8.1.0` - Security headers
- `cookie-parser@1.4.7` - Cookie parsing

**Scaling:**
- `@socket.io/redis-adapter@8.3.0` - Socket.IO horizontal scaling

**Utilities:**
- `axios@1.11.0` - HTTP client
- `uuid@13.0.0` - UUID generation
- `dotenv@17.2.2` - Environment variables
- `zod@4.1.5` - Schema validation

### 1.2 Dev Dependencies

- `typescript@5.9.2` - TypeScript compiler
- `jest@29.7.0` - Testing framework
- `nodemon@3.1.10` - Auto-reload
- `eslint@8.57.0` - Linting
- `prettier@3.2.5` - Code formatting

---

## PART 2: ARCHITECTURE OVERVIEW

### 2.1 Server Bootstrap Flow

```
sophisticated-engine-server.js (1,081 lines)
├── Load environment variables (dotenv)
├── Initialize Express app
├── Setup CORS, JSON parsing, static file serving
├── Initialize PostgreSQL pool (pg.Pool)
├── Initialize Redis (ioredis) - optional, graceful degradation
├── Initialize Supabase client
├── Mount modular routers:
│   ├── /api/engine → routes/game-engine-bridge.js
│   ├── /api/rooms → routes/rooms.js
│   ├── /api/games → routes/games.js
│   ├── /api/auth → routes/auth.js
│   ├── /api/social → routes/social.js
│   ├── /api/v2 → routes/v2.js
│   └── / → routes/pages.js (catch-all)
├── Start HTTP server
├── Initialize Socket.IO server
├── Attach Redis adapter (if available)
├── Setup Socket.IO handlers (websocket/socket-handlers.js)
├── Initialize Event Sourcing infrastructure (optional)
└── Attempt crash recovery
```

### 2.2 Request Flow

```
HTTP Request
  ↓
Express Router (routes/*.js)
  ↓
Middleware (auth, idempotency, session)
  ↓
Route Handler
  ↓
Database Query (PostgreSQL)
  ↓
Game Logic (src/adapters/*.js)
  ↓
Socket.IO Broadcast (if needed)
  ↓
Response
```

### 2.3 Real-Time Flow

```
Client Action (minimal-table.html)
  ↓ POST /api/engine/action
Server (routes/game-engine-bridge.js)
  ↓ MinimalBettingAdapter.processAction()
Game Logic (src/adapters/minimal-engine-bridge.js)
  ↓ Process action, update state
Database (UPDATE game_states SET current_state = ...)
  ↓
Socket.IO (io.to(`room:${roomId}`).emit('action_processed', ...))
  ↓
All Clients (socket.on('action_processed', ...))
  ↓
UI Update (updateSeatChips(), updatePotDisplay())
```

---

## PART 3: FILE-BY-FILE ANALYSIS

### 3.1 Server Entry Point

**File:** `sophisticated-engine-server.js` (1,081 lines)

**Lines 1-100:** Imports and initialization
- Loads environment variables
- Imports Express, Socket.IO, PostgreSQL, Redis, Supabase
- Imports compiled TypeScript modules from `dist/`
- Imports modular routers
- Creates Express app

**Lines 100-300:** Storage setup
- In-memory Map: `games = new Map()` (legacy, preserved)
- Database repositories (conditional via feature flag)
- Dual-write pattern: writes to both in-memory and DB

**Lines 300-500:** Database connection
- PostgreSQL pool creation with error handling
- Supabase auto-pause detection and reconnection
- Helper functions: `createRoom()`, `getRoomByInvite()`, `claimSeat()`, `releaseSeat()`

**Lines 500-700:** Route mounting
- Static file serving (`/public`, `/css`, `/js`, `/cards`)
- Page routes (`/`, `/play`, `/friends`, etc.)
- API routes (modular routers)
- Social feature routes (TypeScript compiled)

**Lines 700-900:** Auth middleware
- JWT authentication (Supabase + local fallback)
- Session middleware (Redis-backed)
- Auth helpers

**Lines 900-1100:** Server startup
- Initialize database connection
- Start HTTP server
- Initialize Socket.IO
- Setup Socket.IO handlers
- Initialize event sourcing (optional)
- Crash recovery (optional)

**Communications:**
- **HTTP:** Serves static files, mounts routers
- **Socket.IO:** Creates server, attaches handlers
- **Database:** PostgreSQL pool, Redis clients
- **Exports:** `{ app, io, games, StorageAdapter }`

**Status:** ✅ ACTIVE - Primary entry point

---

### 3.2 Game Engine Bridge (PRIMARY API)

**File:** `routes/game-engine-bridge.js` (2,989 lines)

**Purpose:** Main game logic API - processes all player actions, hand completion, extraction

**Key Sections:**

**Lines 1-200:** Setup and hydration
- Imports: express, action-logger, adapters
- `GET /api/engine/hydrate/:roomId/:userId` - State recovery endpoint
  - Loads `game_states.current_state` (JSONB)
  - Extracts player's hole cards (private)
  - Returns public game state + private cards
  - Fixes stale betting state (minRaise reset)

**Lines 200-500:** Seat management
- `POST /api/engine/claim-seat` - Seat claiming with approval system
  - Creates `seat_requests` entry
  - Host auto-approves, others require approval
  - Updates `room_seats` table
  - Broadcasts `seat_update` event
- `GET /api/engine/seats/:roomId` - Get seat data
  - Returns 10-seat array with user_id, chips, nickname, avatar_url

**Lines 500-1000:** Hand dealing
- `POST /api/engine/deal-cards` - Start new hand (host only)
  - Creates `game_states` entry (JSONB `current_state`)
  - Posts blinds, deals cards, assigns positions
  - Broadcasts `hand_started` event
  - Emits `phase_update` ('DEALING', 'HAND_ACTIVE')

**Lines 1000-2000:** Action processing
- `POST /api/engine/action` - Process player action
  - Loads `game_states.current_state` (JSONB)
  - Calls `MinimalBettingAdapter.processAction()`
  - Updates `game_states` (JSONB write)
  - If hand complete: `persistHandCompletion()` (updates `room_seats.chips_in_play`)
  - Broadcasts `action_processed` (unless `status === 'COMPLETED'`)
  - If hand complete: `handleHandCompleteEmission()` + `extractHandHistory()`

**Lines 2000-2500:** Hand completion
- `persistHandCompletion()` - Updates chips in DB
  - Transaction: UPDATE `room_seats.chips_in_play`
  - Converts busted players to spectators
  - Marks game as completed
  - Schedules auto-start (if enabled)
- `handleHandCompleteEmission()` - Emits hand_complete event
  - Calculates side pots
  - Emits `hand_complete` with winners
  - Emits `phase_update` ('HAND_COMPLETED')
- `extractHandHistory()` - Extracts hand to `hand_history` table
  - Encodes hand in PHE format (Poker Hand Encoding)
  - INSERT `hand_history` (pot_size, winner_id, encoded_hand, etc.)
  - UPDATE `player_statistics` (hands played, wins)
  - UPDATE `user_profiles` (biggest_pot)

**Lines 2500-2900:** Host controls and utilities
- `GET /api/engine/host-controls/:roomId/:userId` - Get host control state
- `POST /api/engine/host-controls/update-stack` - Update player stack
- `POST /api/engine/host-controls/kick-player` - Kick player
- `POST /api/engine/host-controls/update-blinds` - Update blinds
- `POST /api/engine/host-controls/adjust-chips` - Adjust chips
- `POST /api/engine/host-controls/force-next-hand` - Force next hand
- `POST /api/engine/host-controls/toggle-autostart` - Toggle auto-start

**Database Queries:**
- **SELECT:** `rooms`, `game_states`, `room_seats`, `user_profiles`, `seat_requests`
- **UPDATE:** `game_states.current_state` (JSONB), `room_seats.chips_in_play`, `rooms.game_id`
- **INSERT:** `game_states`, `hand_history`, `player_statistics`, `seat_requests`
- **DELETE:** `game_states` (soft delete via status)

**Socket Events Emitted:**
- `action_processed` - Player action processed (unless hand complete)
- `hand_started` - New hand begins
- `hand_complete` - Hand finished with winners
- `hand_complete_lobby` - Hand complete, back to lobby
- `phase_update` - Phase change (HAND_COMPLETED, TRANSITION_PENDING, DEALING, HAND_ACTIVE)
- `street_reveal` - Community cards dealt (all-in runout)
- `showdown_action` - Player shows/mucks
- `seat_update` - Seat assignments changed
- `player_kicked` - Player kicked
- `blinds_updated` - Blinds changed
- `auto_start_failed` - Auto-start failed

**Status:** ✅ ACTIVE - Primary game API

---

### 3.3 Game Logic Adapters

#### 3.3.1 Minimal Engine Bridge

**File:** `src/adapters/minimal-engine-bridge.js` (1,152 lines)

**Purpose:** Orchestrates game logic modules

**Key Functions:**
- `processAction(gameState, userId, action, amount)` - Main entry point
  - Validates action via `betting-logic.validateAction()`
  - Applies action via `betting-logic.applyAction()`
  - Checks if betting round complete via `turn-logic.isBettingRoundComplete()`
  - If complete: `turn-logic.progressToNextStreet()`
  - If showdown: `game-logic.handleShowdown()`
  - Returns `{ success, gameState, error }`

- `dealCards(players, smallBlind, bigBlind)` - Deal new hand
  - Creates deck, shuffles, deals hole cards
  - Posts blinds, assigns positions
  - Returns initial game state

- `calculateSidePots(gameState)` - Calculate side pots
  - Calls `pot-logic.calculateSidePots()`
  - Returns `{ mainPot, sidePots, totalPot }`

**Dependencies:**
- `./game-logic` - Game flow orchestrator
- `./pot-logic` - Pot calculation
- `./turn-logic` - Turn rotation
- `./betting-logic` - Betting validation/application
- `./rules-ranks` - Hand evaluation

**Status:** ✅ ACTIVE - Primary game logic orchestrator

---

#### 3.3.2 Game Logic

**File:** `src/adapters/game-logic.js` (597 lines)

**Purpose:** Main game flow orchestrator

**Key Functions:**
- `processAction(gameState, userId, action, amount)` - Process action
  - Calls `betting-logic.validateAction()` + `applyAction()`
  - Calls `turn-logic.isBettingRoundComplete()`
  - If complete: `turn-logic.progressToNextStreet()`
  - If all fold except one: `handleFoldWin()`
  - If showdown: `handleShowdown()`
  - If all-in runout: `handleAllInRunout()`

- `handleShowdown(gameState)` - Evaluate hands and distribute pots
  - Calls `simple-hand-evaluator.evaluatePokerHand()` for each player
  - Calls `pot-logic.calculateSidePots()`
  - Distributes pots to winners
  - Returns updated game state with winners

- `handleAllInRunout(gameState)` - Handle all-in runout
  - Deals remaining streets progressively
  - Returns game state with `needsProgressiveReveal` flag

**Dependencies:**
- `./betting-logic` - Action validation/application
- `./pot-logic` - Pot calculation
- `./turn-logic` - Turn rotation
- `./rules-ranks` - Hand evaluation
- `./simple-hand-evaluator` - Hand comparison
- `../utils/action-logger` - Logging
- `./state-machine` - State machine (dynamic require)

**Status:** ✅ ACTIVE

---

#### 3.3.3 Betting Logic

**File:** `src/adapters/betting-logic.js` (348 lines)

**Purpose:** Validate and apply player actions

**Key Functions:**
- `validateAction(gameState, userId, action, amount)` - Validate if action is legal
  - Checks if player can act (not folded, has chips, is current actor)
  - Validates action type (FOLD, CHECK, CALL, RAISE, BET, ALL_IN)
  - Validates amounts (call amount, raise amount, all-in)
  - Returns `{ valid, error }`

- `applyAction(gameState, userId, action, amount)` - Apply validated action
  - Updates player's `bet`, `betThisStreet`, `chips`, `status`
  - Updates `gameState.pot`, `gameState.currentBet`
  - Updates `gameState.minRaise` (if raise)
  - Returns updated game state

**Dependencies:** None (self-contained)

**Status:** ✅ ACTIVE

---

#### 3.3.4 Pot Logic

**File:** `src/adapters/pot-logic.js` (228 lines)

**Purpose:** Calculate side pots and validate chip conservation

**Key Functions:**
- `calculateSidePots(gameState)` - Calculate main pot and side pots
  - Groups players by all-in amount
  - Creates side pots for each group
  - Returns `{ mainPot, sidePots, totalPot }`

- `handleUncalledBets(gameState)` - Return uncalled bets to raiser
  - If all players fold except raiser, return bet to raiser
  - Updates pot and player chips

- `validateChipConservation(gameState)` - Ensure chips are conserved
  - Sums player chips + pot
  - Compares to `startingTotalChips`
  - Returns `{ valid, error }`

**Dependencies:** None (self-contained)

**Status:** ✅ ACTIVE

---

#### 3.3.5 Turn Logic

**File:** `src/adapters/turn-logic.js` (481 lines)

**Purpose:** Manage turn order and street progression

**Key Functions:**
- `canPlayerAct(gameState, seatIndex)` - Check if player can act
  - Not folded, has chips, not all-in, is current actor

- `isBettingRoundComplete(gameState)` - Check if betting round is complete
  - All active players have matched current bet
  - No pending actions

- `rotateToNextPlayer(gameState)` - Move to next player who can act
  - Finds next active player
  - Updates `currentActorSeat`

- `progressToNextStreet(gameState)` - Advance to next betting round
  - PREFLOP → FLOP → TURN → RIVER → SHOWDOWN
  - Deals community cards
  - Resets betting state
  - Calls `pot-logic.calculateSidePots()`

**Dependencies:**
- `./seat-manager` - Seat management
- `./state-machine` - State machine
- `./game-logic` - Game logic (circular dependency, lazy require)
- `./pot-logic` - Pot logic

**Status:** ✅ ACTIVE

---

### 3.4 Frontend Main File

**File:** `public/minimal-table.html` (9,622 lines)

**Purpose:** Single-page poker table application

**Structure:**
- **Lines 1-500:** HTML structure, CSS styles (inline)
- **Lines 500-4000:** CSS animations, liquid glass effects, responsive design
- **Lines 4000-4500:** JavaScript initialization, AuthManager setup
- **Lines 4500-5000:** Hydration logic (`hydrateGameState()`)
- **Lines 5000-5500:** Socket.IO connection and event handlers
- **Lines 5500-7000:** Rendering functions (`renderSeats()`, `renderCommunityCards()`, `updateSeatChips()`, `updatePotDisplay()`)
- **Lines 7000-8000:** Action handling (`performAction()`, `updateActionButtons()`)
- **Lines 8000-9000:** Hand completion (`handleHandComplete()`)
- **Lines 9000-9622:** Host controls, seat management, utilities

**Key Functions:**

**Hydration:**
- `hydrateGameState()` - Fetches `/api/engine/hydrate/:roomId/:userId`
  - Restores game state, hole cards, action buttons
  - Renders seats, community cards, pot
  - Connects Socket.IO

**Socket Handlers:**
- `socket.on('action_processed', ...)` - Updates UI on action
  - Calls `updateSeatChips()`, `updatePotDisplay()`
  - Updates action buttons
  - Skips if `status === 'COMPLETED'`

- `socket.on('hand_complete', ...)` - Handles hand completion
  - Shows winner overlay
  - Animates pot decrementing, chips incrementing
  - Shows show/muck controls
  - After 3s: starts countdown or shows Start button

- `socket.on('hand_started', ...)` - Handles new hand
  - Fades out old cards
  - Renders new cards
  - Calls `loadRoom()` to refresh seats
  - Restores pot display structure

- `socket.on('hand_complete_lobby', ...)` - Handles lobby transition
  - Shows countdown overlay (if auto-start enabled)
  - Shows Start button (if manual start)

**Rendering:**
- `renderSeats(seats, roomData)` - Renders 10 seat tiles
  - Uses `currentGameState.players` for chips (if active game)
  - Uses `seats` from DB for spectator detection
  - Applies dynamic positioning

- `updateSeatChips(players)` - Updates chip displays with animation
  - Compares to `previousPlayerChips` Map
  - Animates if value changed
  - Updates DOM

- `updatePotDisplay(gameState)` - Updates pot display
  - Shows main pot, side pots (if any)
  - Handles null side-pot containers
  - Preserves DOM structure

**State Variables:**
- `currentGameState` - Current game state object
- `myHoleCards` - Player's hole cards
- `mySeatIndex` - Player's seat index
- `previousPlayerChips` - Map of previous chip values (for animations)
- `previousPlayerBets` - Map of previous bet values
- `currentPotValue` - Current pot value
- `isAllInRunout` - All-in runout flag
- `showdownActions` - Showdown actions map
- `autoStartTimer` - Auto-start timer
- `autoStartCountdownInterval` - Countdown interval

**HTTP Calls:**
- `GET /api/engine/hydrate/:roomId/:userId` - Hydrate game state
- `GET /api/engine/room/:roomId` - Get room info
- `GET /api/engine/seats/:roomId` - Get seats
- `POST /api/engine/claim-seat` - Claim seat
- `GET /api/engine/game/:roomId` - Get game state
- `GET /api/engine/my-cards/:roomId/:userId` - Get hole cards
- `POST /api/engine/action` - Process action
- `POST /api/engine/showdown-action` - Showdown action
- `POST /api/engine/next-hand` - Start next hand
- `GET /api/engine/host-controls/:roomId/:userId` - Get host controls
- `POST /api/engine/host-controls/*` - Host control actions

**Socket Events Listened To:**
- `connect`, `disconnect` - Connection status
- `seat_update` - Seat assignments changed
- `hand_complete` - Hand finished
- `hand_started` - New hand begins
- `street_reveal` - Community cards dealt
- `action_processed` - Player action processed
- `showdown_action` - Player shows/mucks
- `game_started` - Game started
- `blinds_updated` - Blinds changed
- `player_kicked` - Player kicked
- `seat_request_*` - Seat request events
- `hand_complete_lobby` - Hand complete, back to lobby

**Status:** ✅ ACTIVE - Primary frontend

---

## PART 4: COMMUNICATION MAP

### 4.1 HTTP Endpoints

**Game Engine (`/api/engine/*`):**
- `GET /api/engine/hydrate/:roomId/:userId` - Hydrate game state
- `POST /api/engine/claim-seat` - Claim seat
- `GET /api/engine/seats/:roomId` - Get seats
- `POST /api/engine/deal-cards` - Start new hand
- `GET /api/engine/room/:roomId` - Get room info
- `GET /api/engine/game/:roomId` - Get game state
- `GET /api/engine/my-cards/:roomId/:userId` - Get hole cards
- `POST /api/engine/action` - Process action
- `POST /api/engine/showdown-action` - Showdown action
- `POST /api/engine/next-hand` - Start next hand
- `GET /api/engine/host-controls/:roomId/:userId` - Get host controls
- `POST /api/engine/host-controls/update-stack` - Update stack
- `POST /api/engine/host-controls/kick-player` - Kick player
- `POST /api/engine/host-controls/update-blinds` - Update blinds
- `POST /api/engine/host-controls/adjust-chips` - Adjust chips
- `POST /api/engine/host-controls/room-lock` - Lock room
- `POST /api/engine/host-controls/force-next-hand` - Force next hand
- `POST /api/engine/host-controls/toggle-autostart` - Toggle auto-start
- `POST /api/engine/host-controls/reset-stacks` - Reset stacks
- `POST /api/engine/host-controls/end-game` - End game
- `GET /api/engine/health` - Health check

**Rooms (`/api/rooms/*`):** 30 endpoints (see CODEBASE_INDEX.md)

**Social (`/api/social/*`):** 25 endpoints (username, profile, friends, notifications, analytics)

**Auth (`/api/auth/*`):** 8 endpoints

**Pages (`/`):** 13 routes serving HTML

### 4.2 Socket Events (Server → Client)

**From `routes/game-engine-bridge.js`:**
- `action_processed` - `{ userId, action, amount, gameState }`
- `hand_started` - `{ roomId, gameStateId, handNumber, gameState }`
- `hand_complete` - `{ roomId, gameState, winners, finalPot }`
- `hand_complete_lobby` - `{ message, autoStartIn, playersRemaining, bustedPlayers }`
- `phase_update` - `{ roomId, phase, timestamp, data }`
- `street_reveal` - `{ street, communityCards }`
- `showdown_action` - `{ userId, seatIndex, action }`
- `player_busted` - `{ userId, seatIndex }`
- `you_busted` - `{ message }`
- `game_ended` - `{ roomId, message }`
- `blinds_updated` - `{ smallBlind, bigBlind }`
- `player_kicked` - `{ userId, seatIndex }`
- `auto_start_failed` - `{ message, error }`

**From `websocket/socket-handlers.js`:**
- `authenticated` - `{ userId, roomId }`
- `auth_error` - `{ error }`
- `joined_room` - `{ roomId, userId }`
- `join_error` - `{ error }`
- `heartbeat_ack` - `{ status }`
- `seat_update` - `{ roomId, seats }`
- `player_away` - `{ userId, seatIndex, gracePeriod }`
- `player_timeout` - `{ userId, seatIndex }`
- `go_to_table` - `{ roomId }`
- `game_started` - `{ roomId, gameId, game }`

**From `routes/rooms.js`:**
- `seat_request_pending` - `{ requestId, userId, username, seatIndex, requestedChips }`
- `seat_request_resolved` - `{ requestId, status, userId, seatIndex }`
- `seat_request_approved` - `{ requestId, seatIndex, chips, message }`
- `seat_request_rejected` - `{ requestId, message }`
- `seat_request_sent` - `{ requestId, seatIndex, message }`

### 4.3 Socket Events (Client → Server)

**To `websocket/socket-handlers.js`:**
- `authenticate` - `{ userId, roomId }`
- `join_room` - `{ roomId, userId }`
- `heartbeat` - `{ userId }`
- `go_to_table` - `{ roomId }`
- `start_game` - `{ roomId, gameId, game }`
- `disconnect` - (automatic)

### 4.4 Database Schema

**Core Tables:**
- `user_profiles` - User accounts (id, username, display_name, avatar_url, total_hands_played, total_wins, biggest_pot)
- `rooms` - Poker game rooms (id, name, small_blind, big_blind, min_buy_in, max_buy_in, max_players, is_private, invite_code, host_user_id, game_id, auto_start_enabled)
- `room_seats` - Player seat assignments (room_id, user_id, seat_index, chips_in_play, status, nickname, joined_at, left_at, is_spectator)
- `game_states` - Game state (id TEXT, room_id, host_user_id, current_state JSONB, hand_number, total_pot, status, created_at, updated_at)
- `hand_history` - Completed hands (id, game_id, room_id, hand_number, pot_size, player_ids, winner_id, winning_hand, hand_rank, board_cards, actions_log, encoded_hand, dealer_position, sb_position, bb_position, starting_stacks)
- `player_statistics` - Player analytics (user_id, total_hands_played, total_hands_won, last_hand_played_at)
- `friendships` - Friend relationships (id, user_id, friend_id, status, created_at)
- `notifications` - User notifications (id, user_id, type, message, read, created_at)
- `badges` - User badges (id, user_id, badge_type, earned_at)
- `seat_requests` - Seat request queue (id, room_id, user_id, seat_index, requested_chips, status, resolved_at, resolved_by)
- `chips_transactions` - Chip transaction audit (id, room_id, user_id, amount, type, created_at)
- `player_sessions` - Stable player IDs (user_id, game_id, player_id, seat_index, room_id, session_token, expires_at)
- `rejoin_tokens` - Mid-game reconnection tokens (id, user_id, game_id, token, expires_at)

**Key Relationships:**
- `rooms.game_id` → `game_states.id`
- `room_seats.room_id` → `rooms.id`
- `room_seats.user_id` → `user_profiles.id`
- `hand_history.winner_id` → `user_profiles.id`
- `hand_history.game_id` → `game_states.id`
- `seat_requests.room_id` → `rooms.id`
- `seat_requests.user_id` → `user_profiles.id`

---

## PART 5: ARCHITECTURE PATTERNS

### 5.1 Dual Storage Pattern

**Problem:** Migrating from in-memory to database without downtime

**Solution:** Dual-write pattern
- Writes go to BOTH in-memory Map AND database
- Reads come from in-memory Map (fast)
- Database is source of truth for persistence

**Implementation:**
```javascript
StorageAdapter.saveGame(gameId, gameState) {
  games.set(gameId, gameState); // In-memory (fast)
  if (USE_DB_REPOSITORY) {
    await gameStatesRepository.saveSnapshot(gameId, snapshot); // Database (persistent)
  }
}
```

**Status:** ✅ ACTIVE - Used during migration

---

### 5.2 Adapter Pattern

**Problem:** Game logic needs to be modular and testable

**Solution:** Adapter pattern with separate modules
- `minimal-engine-bridge.js` - Orchestrator
- `game-logic.js` - Game flow
- `betting-logic.js` - Action validation/application
- `pot-logic.js` - Pot calculation
- `turn-logic.js` - Turn rotation
- `rules-ranks.js` - Hand evaluation

**Benefits:**
- Single responsibility per module
- Easy to test
- Easy to replace

**Status:** ✅ ACTIVE

---

### 5.3 Event-Driven Architecture

**Problem:** Real-time updates to multiple clients

**Solution:** Socket.IO broadcasts
- Server emits events after state changes
- Clients listen and update UI
- No polling required

**Implementation:**
```javascript
// Server
io.to(`room:${roomId}`).emit('action_processed', { userId, action, gameState });

// Client
socket.on('action_processed', (data) => {
  updateSeatChips(data.gameState.players);
  updatePotDisplay(data.gameState);
});
```

**Status:** ✅ ACTIVE

---

### 5.4 JSONB State Storage

**Problem:** Complex game state needs to be stored efficiently

**Solution:** PostgreSQL JSONB column
- `game_states.current_state` is JSONB
- Fast queries, indexed
- No schema migration needed for state changes

**Implementation:**
```sql
CREATE TABLE game_states (
  id TEXT PRIMARY KEY,
  current_state JSONB NOT NULL,
  ...
);
```

**Status:** ✅ ACTIVE

---

## PART 6: CONFLICTS & ISSUES

### 6.1 Chip Increment/Decrement Chaos

**Root Cause:** Multiple systems updating chips simultaneously

**Conflicting Systems:**
1. `action_processed` event → `updateSeatChips()` (real-time updates)
2. `hand_complete` event → `handleHandComplete()` → Manual payout animation
3. `loadRoom()` → Refetches seats → `updateSeatChips()` again
4. `hand_started` event → `loadRoom()` → `updateSeatChips()` again

**Why It Happens:**
- No single source of truth for "when to update chips"
- No phase-aware rendering (client doesn't know when to suspend updates)
- `previousPlayerChips` tracking gets out of sync
- Multiple animations running simultaneously

**Fix Required:**
- Single event per phase (phase_update with explicit phase)
- Client suspends updates during payout animation
- No `loadRoom()` calls during active hand
- Single animation path (pot decrements, chips increment, synchronized)

---

### 6.2 Pot Display Broken

**Root Cause:** DOM structure destroyed by winner overlay

**What Happens:**
1. `handleHandComplete()` replaces `.pot-display-center` innerHTML with winner overlay
2. Destroys `#mainPotAmount` element
3. Subsequent `updatePotDisplay()` calls fail (can't find `#mainPotAmount`)
4. Pot display breaks for next hand

**Fix Required:**
- Preserve DOM structure (overlay separate from pot amount)
- Or restore structure before next hand starts

---

### 6.3 Double Dealing

**Root Cause:** Cards rendered multiple times

**What Happens:**
1. `hand_started` event → `handleHandStarted()` → Renders cards
2. `loadRoom()` called → Refetches seats → May trigger re-render
3. `action_processed` event → Updates state → May trigger re-render
4. No flag to prevent re-rendering during transition

**Fix Required:**
- Transition controller with `renderSuspended` flag
- Only render cards once per hand_started event
- Queue updates during transition, apply after transition completes

---

### 6.4 Phase Ambiguity

**Root Cause:** Server doesn't explicitly tell client current phase

**What Happens:**
- Client infers phase from data (`status === 'COMPLETED'`)
- Multiple events fire (hand_complete, hand_complete_lobby, action_processed)
- Client guesses which handler should run
- Race conditions when events arrive out of order

**Fix Required:**
- Single `phase_update` event with explicit phase
- Client routes to phase-specific handlers
- No guessing, no inference

---

## PART 7: GOLDEN PATH RECOMMENDATION

### 7.1 The One True Fix

**Problem:** 4 parallel systems managing same state

**Solution:** Single state machine contract

**Server Changes:**
1. Emit ONE event per state change: `game_state_update` with explicit `phase`
2. Include all data needed for that phase in the payload
3. Never emit `action_processed` after `status === 'COMPLETED'`

**Client Changes:**
1. ONE socket listener: `socket.on('game_state_update', routeByPhase)`
2. Phase-specific handlers (no overlap, no guessing)
3. Suspend rendering during transitions
4. No `loadRoom()` calls during active hand

**Result:**
- Single source of truth
- No conflicts
- No double updates
- Predictable behavior

---

## PART 8: USED VS UNUSED FILES

### 8.1 Active Files (Used in Production)

**Backend:**
- `sophisticated-engine-server.js` ✅
- `routes/game-engine-bridge.js` ✅
- `routes/rooms.js` ✅
- `routes/games.js` ✅
- `routes/auth.js` ✅
- `routes/social.js` ✅
- `routes/pages.js` ✅
- `routes/v2.js` ✅
- `routes/sandbox.js` ✅
- `websocket/socket-handlers.js` ✅
- `src/adapters/*.js` (all 9 files) ✅
- `services/session-service.js` ✅
- `services/player-identity-service.js` ✅
- `config/redis.js` ✅
- `middleware/session.js` ✅
- `src/middleware/idempotency.js` ✅
- `src/utils/action-logger.js` ✅

**Frontend:**
- `public/minimal-table.html` ✅
- `public/js/auth-manager.js` ✅
- `public/js/hand-encoder.js` ✅
- `public/js/sequence-tracker.js` ✅
- `public/js/liquid-glass-controller.js` ✅
- `public/js/global-animations.js` ✅
- `public/js/nav-shared.js` ✅
- `public/js/navbar-template.js` ✅
- `public/js/social-modals.js` ✅
- `public/js/username-styling.js` ✅
- `public/pages/*.html` (8 files) ✅

**Database:**
- `database/migrations/*.sql` (44 files) ✅

### 8.2 Legacy Files (Not Used)

**Backend:**
- `dist/` (100+ compiled TypeScript files) ❌ - Compiled but not used by runtime
- `pokeher/` (old project folder) ❌
- `sophisticated-engine-server.backup.js` ❌
- `services/game-state-hydrator.js` ⚠️ - Redundant (functionality moved to routes)

**Frontend:**
- `public/poker-table-zoom-lock.html` ❌ - Legacy table
- `public/poker-table-v2.html` ❌ - Legacy table
- `public/poker-table-v3.html` ❌ - Legacy table
- `public/poker-table-grid.html` ❌ - Legacy table
- `public/poker-table-production.html` ❌ - Legacy table
- `public/poker-table-final.html` ❌ - Legacy table
- `public/js/game-state-client.js` ❌ - Legacy client
- `public/js/game-state-manager.js` ❌ - Legacy manager
- `public/js/TableRenderer.js` ❌ - Legacy renderer
- `public/js/poker-table-v2.js` ❌ - Legacy table v2
- `public/js/poker-table-production.js` ❌ - Legacy production
- `public/js/poker-table-grid.js` ❌ - Legacy grid
- `public/js/components/*.js` ❌ - Unused components

**Archive:**
- `archive/` (200+ markdown files) 📚 - Historical documentation

---

## PART 9: DEPENDENCY GRAPH

### 9.1 Backend Dependency Graph

```
sophisticated-engine-server.js
├── express, cors, path, pg, socket.io, @socket.io/redis-adapter
├── @supabase/supabase-js
├── config/redis.js
│   └── ioredis
├── services/session-service.js
│   ├── uuid
│   ├── config/redis.js
│   └── PostgreSQL
├── middleware/session.js
│   ├── express-session
│   └── connect-redis
├── routes/game-engine-bridge.js
│   ├── express
│   ├── src/utils/action-logger.js
│   ├── src/adapters/minimal-engine-bridge.js
│   │   ├── src/adapters/game-logic.js
│   │   │   ├── src/adapters/betting-logic.js
│   │   │   ├── src/adapters/pot-logic.js
│   │   │   ├── src/adapters/turn-logic.js
│   │   │   │   ├── src/adapters/seat-manager.js (circular)
│   │   │   │   ├── src/adapters/state-machine.js
│   │   │   │   └── src/adapters/game-logic.js (circular, lazy)
│   │   │   ├── src/adapters/rules-ranks.js
│   │   │   └── src/adapters/simple-hand-evaluator.js
│   │   ├── src/adapters/pot-logic.js
│   │   ├── src/adapters/turn-logic.js
│   │   ├── src/adapters/betting-logic.js
│   │   └── src/adapters/rules-ranks.js
│   ├── axios
│   └── public/js/hand-encoder.js
├── routes/rooms.js
│   ├── express
│   └── src/middleware/idempotency.js
├── routes/games.js
│   ├── express
│   ├── src/middleware/idempotency.js
│   └── src/services/timer-service.js
├── routes/auth.js
│   ├── express
│   ├── src/middleware/idempotency.js
│   └── @supabase/supabase-js
├── routes/social.js
│   ├── express
│   └── @supabase/supabase-js
├── routes/pages.js
│   └── express, path
├── routes/v2.js
│   └── express
├── routes/sandbox.js
│   └── express
├── websocket/socket-handlers.js
│   └── socket.io
└── dist/ (TypeScript compiled - not used by runtime)
```

### 9.2 Frontend Dependency Graph

```
minimal-table.html
├── /js/liquid-glass-controller.js
├── /js/global-animations.js
├── https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
├── /js/auth-manager.js
│   └── window.supabase (from CDN)
├── /js/nav-shared.js
│   └── window.authManager (must be loaded first)
├── /js/navbar-template.js
├── /js/social-modals.js
│   └── window.authManager
├── /js/username-styling.js
└── /socket.io/socket.io.js
```

---

## PART 10: COMPLETE COMMUNICATION FLOW

### 10.1 Hand Play Flow (Complete)

```
1. Client: User clicks "RAISE" button
   ↓
2. Client: POST /api/engine/action { roomId, userId, action: 'RAISE', amount: 50 }
   ↓
3. Server: routes/game-engine-bridge.js → POST /api/engine/action handler
   ↓
4. Server: Load game_states.current_state (JSONB) from PostgreSQL
   ↓
5. Server: MinimalBettingAdapter.processAction(gameState, userId, 'RAISE', 50)
   ↓
6. Adapter: betting-logic.validateAction() → { valid: true }
   ↓
7. Adapter: betting-logic.applyAction() → Updates gameState
   ↓
8. Adapter: turn-logic.isBettingRoundComplete() → false (more players need to act)
   ↓
9. Adapter: Returns { success: true, gameState: updatedState }
   ↓
10. Server: UPDATE game_states SET current_state = JSON.stringify(updatedState)
   ↓
11. Server: io.to(`room:${roomId}`).emit('action_processed', { userId, action: 'RAISE', amount: 50, gameState })
   ↓
12. Socket.IO: Broadcasts to all clients in room
   ↓
13. Client: socket.on('action_processed', (data) => { ... })
   ↓
14. Client: updateSeatChips(data.gameState.players) → Animates chip decrement
   ↓
15. Client: updatePotDisplay(data.gameState) → Animates pot increment
   ↓
16. Client: updateActionButtons(data.gameState) → Updates button states
   ↓
17. Client: Highlights next player's seat
```

### 10.2 Hand Completion Flow (Complete)

```
1. Game Logic: Detects hand complete (all players acted, showdown evaluated)
   ↓
2. Server: persistHandCompletion() → BEGIN TRANSACTION
   ↓
3. Server: UPDATE room_seats SET chips_in_play = newChips WHERE room_id = X
   ↓
4. Server: UPDATE game_states SET status = 'completed' WHERE room_id = X
   ↓
5. Server: COMMIT TRANSACTION
   ↓
6. Server: handleHandCompleteEmission() → Calculates winners, side pots
   ↓
7. Server: io.to(`room:${roomId}`).emit('hand_complete', { gameState, winners, finalPot })
   ↓
8. Server: io.to(`room:${roomId}`).emit('hand_complete_lobby', { message, autoStartIn })
   ↓
9. Server: emitPhaseUpdate('HAND_COMPLETED', { handNumber, winners })
   ↓
10. Server: extractHandHistory() → INSERT hand_history, UPDATE player_statistics
   ↓
11. Socket.IO: Broadcasts to all clients
   ↓
12. Client: socket.on('hand_complete', handleHandComplete)
   ↓
13. Client: Shows winner overlay, highlights winner seat
   ↓
14. Client: After 3s: Animates pot decrementing, chips incrementing (synchronized)
   ↓
15. Client: Shows show/muck controls (if in showdown)
   ↓
16. Client: socket.on('hand_complete_lobby', ...) → Shows countdown overlay (if auto-start)
   ↓
17. Client: After countdown OR manual Start button → POST /api/engine/next-hand
   ↓
18. Server: Deals new hand, posts blinds, broadcasts hand_started
   ↓
19. Client: socket.on('hand_started', ...) → Renders new hand
```

---

## PART 11: TECH STACK SUMMARY

**Backend:**
- Node.js (CommonJS)
- Express.js 4.18.2
- PostgreSQL (Supabase) - pg 8.16.3
- Redis (Upstash) - ioredis 5.8.2
- Socket.IO 4.8.1
- Supabase Auth 2.75.0

**Frontend:**
- Vanilla JavaScript (no framework)
- HTML5
- CSS3
- Socket.IO Client 4.8.1

**Dev Tools:**
- TypeScript 5.9.2 (compiled, not used by runtime)
- Jest 29.7.0
- Nodemon 3.1.10
- ESLint 8.57.0

**Architecture:**
- Monolithic Express server
- Modular routers
- Adapter pattern (game logic)
- Event-driven (Socket.IO)
- Dual storage (in-memory + PostgreSQL)
- JSONB state storage

---

## PART 12: CONSULTANT CHECKLIST

✅ **Complete File Tree** - All active files mapped  
✅ **Line-by-Line Analysis** - Key files analyzed  
✅ **Communication Map** - All HTTP endpoints, socket events, DB queries  
✅ **Tech Stack** - All dependencies and versions  
✅ **Architecture Patterns** - Dual storage, adapter, event-driven  
✅ **Used vs Unused** - Active files vs legacy files  
✅ **Dependency Graph** - Complete dependency tree  
✅ **Conflict Analysis** - 4 major conflicts identified  
✅ **Golden Path** - Single state machine contract solution  

---

**STATUS:** ✅ COMPLETE - Ready for consultant review

**NEXT STEPS:**
1. Consultant reviews this document
2. Identifies specific areas needing deeper analysis
3. Implements golden path fix (single state machine contract)
4. Tests and validates

---

**Document Generated:** Current Session  
**Total Files Mapped:** ~200 active files  
**Total Lines Analyzed:** ~15,000+ lines  
**Total Endpoints:** 68+ HTTP endpoints  
**Total Socket Events:** 25+ events  
**Total DB Tables:** 15+ tables  

