# COMPLETE CODEBASE MAP - Every File, Every Communication, Every Dependency

**Created:** Current Session  
**Purpose:** Complete transparency - map every single file, communication point, dependency, and potential conflict  
**Status:** IN PROGRESS - Building comprehensive index

---

## EXECUTIVE SUMMARY

This document maps **EVERY** file in the codebase:
- Purpose and responsibility
- Dependencies (what it requires)
- Exports (what it provides)
- Communications (socket events, HTTP endpoints, DB queries)
- Conflicts and overlaps
- Status (active/legacy/unused)

**Total Files:** ~500+ files across entire codebase

---

## PART 1: RUNTIME ENTRY POINTS

### 1.1 Server Bootstrap
**File:** `sophisticated-engine-server.js` (1,081 lines)

**Purpose:** Main Express server entry point

**Dependencies:**
- `dotenv` - Environment variables
- `express` - HTTP server
- `cors` - CORS middleware
- `path` - File paths
- `pg` (Pool) - PostgreSQL connection
- `socket.io` (Server) - WebSocket server
- `@socket.io/redis-adapter` - Redis adapter for Socket.IO scaling
- `@supabase/supabase-js` - Supabase auth client
- `./config/redis` - Redis initialization
- `./services/session-service` - Session management
- `./middleware/session` - Session middleware
- `./dist/core/models/game-state` - GameStateModel (TypeScript compiled)
- `./dist/core/models/player` - PlayerModel (TypeScript compiled)
- `./dist/core/engine/game-state-machine` - GameStateMachine (TypeScript compiled)
- `./dist/core/engine/betting-engine` - BettingEngine (TypeScript compiled)
- `./dist/core/engine/round-manager` - RoundManager (TypeScript compiled)
- `./dist/core/engine/turn-manager` - TurnManager (TypeScript compiled)
- `./dist/application/services/DisplayStateManager` - Display state manager
- `./dist/services/database/event-store.repo` - EventStoreRepository
- `./dist/application/events/EventBus` - EventBus
- `./dist/application/events/handlers/GameEventHandler` - Game event handler
- `./dist/application/events/handlers/WebSocketEventHandler` - WebSocket event handler
- `./dist/application/services/EventReplayer` - Event replayer
- `./dist/application/services/GameApplicationService` - CQRS application service
- `./dist/routes/user.routes` - User routes (TypeScript compiled)
- `./dist/routes/friends.routes` - Friends routes (TypeScript compiled)
- `./dist/routes/game-display.routes` - Game display routes (TypeScript compiled)
- `./routes/rooms` - Rooms router
- `./routes/games` - Games router
- `./routes/auth` - Auth router
- `./routes/v2` - V2 API router
- `./routes/pages` - Page serving router
- `./dist/database/connection` - Database connection module
- `./src/db/poker-table-v2` - Poker table V2 DB layer
- `./websocket/socket-handlers` - Socket.IO handlers
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT tokens

**Exports:**
- `{ app, io, games, StorageAdapter }` - Server app, Socket.IO instance, games map, storage adapter

**Initialization Sequence:**
1. Load environment variables
2. Initialize Express app
3. Setup CORS, JSON parsing, static file serving
4. Initialize database pool (PostgreSQL)
5. Initialize Redis (optional, graceful degradation)
6. Initialize Supabase client
7. Mount modular routers
8. Start HTTP server
9. Initialize Socket.IO
10. Setup Socket.IO handlers
11. Initialize event sourcing infrastructure
12. Attempt crash recovery

**Socket.IO Setup:**
- Creates Socket.IO server on HTTP server
- Attaches Redis adapter (if available)
- Sets up connection handlers via `websocket/socket-handlers.js`
- Makes `io` available via `app.locals.io` for routers

**Storage Systems:**
- In-memory Map: `games` (legacy, preserved during migration)
- Database: `gameStatesRepository` (conditional, via feature flag)
- Dual-write pattern: Writes to both in-memory and DB when enabled

**Feature Flags:**
- `USE_DB_REPOSITORY` - Enable database persistence
- `USE_INPUT_VALIDATION` - Enable input validation middleware
- `USE_AUTH_MIDDLEWARE` - Enable auth middleware
- `USE_EVENT_PERSISTENCE` - Enable event sourcing persistence

**Status:** ✅ ACTIVE - Primary entry point

---

## PART 2: ROUTE FILES (HTTP API)

### 2.1 Game Engine Bridge
**File:** `routes/game-engine-bridge.js` (~2,500 lines)

**Purpose:** Main game logic API - processes all player actions, hand completion, extraction

**Dependencies:**
- `express` - Router
- `../src/utils/action-logger` - Logging helper
- `../src/adapters/minimal-engine-bridge` - MinimalBettingAdapter (game logic orchestrator)
- `axios` - HTTP client (for auto-start)
- `../src/adapters/pot-logic` - Pot calculation logic
- `../public/js/hand-encoder.js` - Hand encoding (PHE format)

**Endpoints:**
1. `GET /api/engine/hydrate/:roomId/:userId` - Get current game state + private cards
2. `POST /api/engine/claim-seat` - Claim a seat at table
3. `GET /api/engine/seats/:roomId` - Get seat data
4. `POST /api/engine/deal-cards` - Start new hand (host only)
5. `GET /api/engine/room/:roomId` - Get room info
6. `GET /api/engine/game/:roomId` - Get game state
7. `GET /api/engine/my-cards/:roomId/:userId` - Get player's hole cards
8. `POST /api/engine/action` - Process player action (fold/call/raise)
9. `POST /api/engine/showdown-action` - Show/muck cards at showdown
10. `POST /api/engine/next-hand` - Start next hand (host)
11. `GET /api/engine/host-controls/:roomId/:userId` - Get host control state
12. `POST /api/engine/host-controls/update-stack` - Update player stack (host)
13. `POST /api/engine/host-controls/kick-player` - Kick player (host)
14. `GET /api/engine/health` - Health check

**Socket Events Emitted:**
- `seat_update` - Seat assignments changed
- `seat_request_approved` - Seat request approved (to user)
- `seat_request_resolved` - Seat request resolved (to room)
- `seat_request_pending` - Seat request created (to room)
- `seat_request_sent` - Seat request sent (to requester)
- `hand_started` - New hand begins
- `game_ended` - Game completed
- `hand_complete_lobby` - Hand complete, back to lobby
- `auto_start_failed` - Auto-start failed
- `phase_update` - Phase change (HAND_COMPLETED, TRANSITION_PENDING, TRANSITION_RUNNING, DEALING, HAND_ACTIVE)
- `hand_complete` - Hand finished with winners
- `street_reveal` - Community cards dealt
- `action_processed` - Player action processed
- `player_kicked` - Player kicked
- `blinds_updated` - Blinds changed
- `showdown_action` - Player shows/mucks

**Key Functions:**
- `hydrate()` - State recovery after refresh/reconnect
- `claimSeat()` - Seat claiming with approval system
- `dealCards()` - Start new hand, post blinds, deal cards
- `processAction()` - Process player action (fold/call/raise/all-in)
- `handleHandCompleteEmission()` - Emit hand completion events
- `persistHandCompletion()` - Update chips in DB after hand
- `extractHandHistory()` - Extract hand data to `hand_history` table
- `emitPhaseUpdate()` - Emit phase_update events
- `autoStartNextHand()` - Auto-start timer logic

**Database Queries:**
- Reads: `rooms`, `game_states`, `room_seats`, `user_profiles`, `seat_requests`
- Writes: `room_seats`, `game_states`, `hand_history`, `player_statistics`, `user_profiles`

**Status:** ✅ ACTIVE - Primary game API

---

### 2.2 Rooms Router
**File:** `routes/rooms.js` (1,072 lines)

**Purpose:** Room management, seat management, lobby system

**Dependencies:**
- `express` - Router
- `../src/middleware/idempotency` - Idempotency middleware
- `crypto` - Crypto utilities

**Endpoints:** 30 endpoints (see CODEBASE_INDEX.md for full list)

**Key Functions:**
- Room CRUD operations
- Seat management
- Lobby/approval system
- Hydration endpoint

**Status:** ✅ ACTIVE

---

### 2.3 Games Router
**File:** `routes/games.js` (630 lines)

**Purpose:** Game state queries (legacy endpoints)

**Dependencies:**
- `express` - Router
- `../src/middleware/idempotency` - Idempotency middleware
- `../src/services/timer-service` - Timer service

**Status:** ⚠️ LEGACY - Only used by legacy HTML files (`play.html`, `poker-table-zoom-lock.html`)

---

### 2.4 Auth Router
**File:** `routes/auth.js` (~100 lines)

**Purpose:** Authentication endpoints

**Dependencies:**
- `express` - Router
- `../src/middleware/idempotency` - Idempotency middleware
- `@supabase/supabase-js` - Supabase client

**Status:** ✅ ACTIVE

---

### 2.5 Social Router
**File:** `routes/social.js` (1,416 lines)

**Purpose:** Friends, profiles, analytics, notifications

**Dependencies:**
- `express` - Router
- `@supabase/supabase-js` - Supabase client

**Endpoints:** 25 endpoints (username, profile, friends, notifications, analytics)

**Status:** ✅ ACTIVE

---

### 2.6 Pages Router
**File:** `routes/pages.js` (112 lines)

**Purpose:** Serve HTML pages

**Dependencies:**
- `express` - Router
- `path` - File paths

**Routes:** 13 routes serving HTML files

**Status:** ✅ ACTIVE

---

### 2.7 V2 Router
**File:** `routes/v2.js` (65 lines)

**Purpose:** CQRS API endpoints

**Status:** ⚠️ PARTIAL

---

### 2.8 Sandbox Router
**File:** `routes/sandbox.js` (289 lines)

**Purpose:** Testing endpoints

**Dependencies:**
- `express` - Router

**Status:** 🧪 TESTING

---

## PART 3: GAME ENGINE ADAPTERS

### 3.1 Minimal Engine Bridge
**File:** `src/adapters/minimal-engine-bridge.js` (1,152 lines)

**Purpose:** Orchestrates game logic modules

**Dependencies:**
- `./game-logic` - Game logic orchestrator
- `./pot-logic` - Pot calculation
- `./turn-logic` - Turn rotation
- `./betting-logic` - Betting validation/application
- `./rules-ranks` - Hand evaluation

**Exports:**
- `MinimalBettingAdapter` class with methods:
  - `processAction()` - Process player action
  - `dealCards()` - Deal new hand
  - `calculateSidePots()` - Calculate side pots
  - `handleShowdown()` - Evaluate hands at showdown
  - `handleAllInRunout()` - Handle all-in runout

**Status:** ✅ ACTIVE - Primary game logic orchestrator

---

### 3.2 Game Logic
**File:** `src/adapters/game-logic.js` (597 lines)

**Purpose:** Main game flow orchestrator

**Dependencies:**
- `./betting-logic` - Action validation/application
- `./pot-logic` - Pot calculation
- `./turn-logic` - Turn rotation
- `./rules-ranks` - Hand evaluation
- `./simple-hand-evaluator` - Hand comparison
- `../utils/action-logger` - Logging
- `./state-machine` - State machine (dynamic require)

**Key Functions:**
- `processAction()` - Main entry point for processing actions
- `handleFoldWin()` - Handle when all players fold except one
- `handleShowdown()` - Evaluate hands and distribute pots
- `handleAllInRunout()` - Handle all-in runout

**Status:** ✅ ACTIVE

---

### 3.3 Betting Logic
**File:** `src/adapters/betting-logic.js` (348 lines)

**Purpose:** Validate and apply player actions

**Dependencies:** None (self-contained)

**Key Functions:**
- `validateAction()` - Validate if action is legal
- `applyAction()` - Apply validated action to game state

**Status:** ✅ ACTIVE

---

### 3.4 Pot Logic
**File:** `src/adapters/pot-logic.js` (228 lines)

**Purpose:** Calculate side pots and validate chip conservation

**Dependencies:** None (self-contained)

**Key Functions:**
- `calculateSidePots()` - Calculate main pot and side pots
- `handleUncalledBets()` - Return uncalled bets to raiser
- `validateChipConservation()` - Ensure chips are conserved

**Status:** ✅ ACTIVE

---

### 3.5 Turn Logic
**File:** `src/adapters/turn-logic.js` (481 lines)

**Purpose:** Manage turn order and street progression

**Dependencies:**
- `./seat-manager` - Seat management
- `./state-machine` - State machine
- `./game-logic` - Game logic (circular dependency)
- `./pot-logic` - Pot logic

**Key Functions:**
- `canPlayerAct()` - Check if player can act
- `isBettingRoundComplete()` - Check if betting round is complete
- `rotateToNextPlayer()` - Move to next player who can act
- `progressToNextStreet()` - Advance to next betting round

**Status:** ✅ ACTIVE

---

### 3.6 Rules & Ranks
**File:** `src/adapters/rules-ranks.js` (114 lines)

**Purpose:** Evaluate poker hand strength

**Dependencies:** None (self-contained)

**Key Functions:**
- `evaluateHand()` - Determine hand rank

**Status:** ✅ ACTIVE

---

### 3.7 Simple Hand Evaluator
**File:** `src/adapters/simple-hand-evaluator.js` (246 lines)

**Purpose:** Compare poker hands

**Dependencies:** None (self-contained)

**Key Functions:**
- `evaluatePokerHand()` - Evaluate hand strength
- `compareHands()` - Compare two hands

**Status:** ✅ ACTIVE

---

### 3.8 Seat Manager
**File:** `src/adapters/seat-manager.js`

**Purpose:** Seat management utilities

**Status:** ✅ ACTIVE (used by turn-logic)

---

### 3.9 State Machine
**File:** `src/adapters/state-machine.js` (201 lines)

**Purpose:** State machine utilities

**Status:** ✅ ACTIVE (used by game-logic, turn-logic)

---

### 3.10 Unused Adapters (CONFIRMED DEAD CODE)
**Files:**
- `src/adapters/timer-logic.js` (178 lines) - ❌ UNUSED
- `src/adapters/post-hand-logic.js` (216 lines) - ❌ UNUSED
- `src/adapters/misdeal-detector.js` (272 lines) - ❌ UNUSED
- `src/adapters/game-state-translator.js` (244 lines) - ❌ UNUSED
- `src/adapters/game-state-schema.js` (274 lines) - ❌ UNUSED
- `src/adapters/socket-event-builder.js` (245 lines) - ❌ UNUSED

**Total Dead Code:** ~1,429 lines

**Status:** ❌ ARCHIVE CANDIDATES

---

## PART 4: FRONTEND FILES

### 4.1 Main Table UI
**File:** `public/minimal-table.html` (9,622 lines)

**Purpose:** Single-page poker table application

**External Scripts Loaded:**
1. `/js/liquid-glass-controller.js` - Liquid glass effects
2. `/js/global-animations.js` - Global animations
3. `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2` - Supabase client
4. `/js/auth-manager.js` - Authentication
5. `/js/nav-shared.js` - Navigation shared logic
6. `/js/navbar-template.js` - Navbar template
7. `/js/social-modals.js` - Social modals
8. `/js/username-styling.js` - Username styling
9. `/socket.io/socket.io.js` - Socket.IO client

**Socket Events Listened To:**
- `connect` - Socket connected
- `disconnect` - Socket disconnected
- `seat_update` - Seat assignments changed
- `hand_complete` - Hand finished
- `seat_request_resolved` - Seat request resolved
- `hand_started` - New hand begins
- `street_reveal` - Community cards dealt
- `action_processed` - Player action processed
- `showdown_action` - Player shows/mucks
- `game_started` - Game started
- `blinds_updated` - Blinds changed
- `blinds_queued` - Blinds queued
- `chips_adjusted` - Chips adjusted
- `chips_queued` - Chips queued
- `player_kicked` - Player kicked
- `seat_request_pending` - Seat request pending
- `seat_request_resolved` - Seat request resolved (duplicate?)
- `seat_request_approved` - Seat request approved
- `seat_request_rejected` - Seat request rejected
- `seat_request_sent` - Seat request sent
- `you_busted` - Current user busted
- `player_busted` - Player busted
- `game_ended` - Game ended
- `hand_complete_lobby` - Hand complete, back to lobby

**HTTP Endpoints Called:**
- `GET /api/engine/hydrate/:roomId/:userId` - Hydrate game state
- `GET /api/engine/room/:roomId` - Get room info
- `GET /api/engine/seats/:roomId` - Get seats
- `POST /api/engine/claim-seat` - Claim seat
- `GET /api/engine/game/:roomId` - Get game state
- `GET /api/engine/my-cards/:roomId/:userId` - Get hole cards
- `POST /api/engine/action` - Process action
- `POST /api/engine/showdown-action` - Showdown action
- `GET /api/engine/host-controls/:roomId/:userId` - Get host controls
- `GET /api/rooms/:roomId/seat-requests` - Get seat requests
- `POST /api/rooms/:roomId/approve-seat-request` - Approve request
- `POST /api/rooms/:roomId/reject-seat-request` - Reject request
- `POST /api/engine/host-controls/update-stack` - Update stack
- `POST /api/engine/host-controls/kick-player` - Kick player
- `POST /api/engine/host-controls/update-blinds` - Update blinds
- `POST /api/engine/host-controls/adjust-chips` - Adjust chips
- `POST /api/engine/host-controls/room-lock` - Lock room
- `POST /api/engine/host-controls/force-next-hand` - Force next hand
- `POST /api/engine/host-controls/toggle-autostart` - Toggle auto-start
- `POST /api/engine/host-controls/reset-stacks` - Reset stacks
- `POST /api/engine/host-controls/end-game` - End game

**Key Functions:**
- `hydrateGameState()` - Hydrate from server
- `loadRoom()` - Load room data
- `updateSeatChips()` - Update seat chip displays
- `updatePotDisplay()` - Update pot display
- `handleHandComplete()` - Handle hand completion
- `handleHandStarted()` - Handle new hand start
- `handleActionProcessed()` - Handle action updates
- `renderSeats()` - Render seat tiles
- `renderCommunityCards()` - Render board cards
- `renderMyCards()` - Render hole cards

**State Variables:**
- `currentGameState` - Current game state object
- `myHoleCards` - Player's hole cards
- `mySeatIndex` - Player's seat index
- `previousPlayerChips` - Map of previous chip values (for animations)
- `previousPlayerBets` - Map of previous bet values
- `currentPotValue` - Current pot value
- `isAllInRunout` - All-in runout flag
- `previousCommunityCards` - Previous community cards
- `showdownActions` - Showdown actions map
- `previousStreet` - Previous street
- `autoStartTimer` - Auto-start timer
- `autoStartCountdownInterval` - Countdown interval

**Status:** ✅ ACTIVE - Primary frontend

---

## PART 5: COMMUNICATION MAP

### 5.1 Socket Events (Server → Client)

**From `routes/game-engine-bridge.js`:**
- `action_processed` - Player action processed
- `hand_started` - New hand begins
- `hand_complete` - Hand finished
- `hand_complete_lobby` - Hand complete, back to lobby
- `phase_update` - Phase change
- `street_reveal` - Community cards dealt
- `showdown_action` - Player shows/mucks
- `player_busted` - Player ran out of chips
- `you_busted` - Current user busted
- `game_ended` - Game completed
- `blinds_updated` - Blinds changed
- `player_kicked` - Player kicked

**From `websocket/socket-handlers.js`:**
- `authenticated` - Auth successful
- `auth_error` - Auth failed
- `joined_room` - Room join confirmed
- `join_error` - Room join failed
- `heartbeat_ack` - Heartbeat acknowledged
- `seat_update` - Seat assignments changed
- `player_away` - Player disconnected
- `player_timeout` - Grace period expired
- `go_to_table` - Navigate to table
- `game_started` - New game begins

**From `routes/rooms.js`:**
- `seat_request_pending` - Seat request created
- `seat_request_resolved` - Seat request approved/rejected

### 5.2 Socket Events (Client → Server)

**To `websocket/socket-handlers.js`:**
- `authenticate` - Authenticate socket connection
- `join_room` - Join Socket.IO room namespace
- `heartbeat` - Keep seat binding alive
- `go_to_table` - Navigate to table view
- `start_game` - Broadcast game start
- `disconnect` - Handle disconnection

### 5.3 HTTP Endpoints

**Game Engine (`/api/engine/*`):**
- `GET /api/engine/hydrate/:roomId/:userId`
- `POST /api/engine/claim-seat`
- `GET /api/engine/seats/:roomId`
- `POST /api/engine/deal-cards`
- `GET /api/engine/room/:roomId`
- `GET /api/engine/game/:roomId`
- `GET /api/engine/my-cards/:roomId/:userId`
- `POST /api/engine/action`
- `POST /api/engine/showdown-action`
- `POST /api/engine/next-hand`
- `GET /api/engine/host-controls/:roomId/:userId`
- `POST /api/engine/host-controls/update-stack`
- `POST /api/engine/host-controls/kick-player`
- `GET /api/engine/health`

**Rooms (`/api/rooms/*`):**
- 30 endpoints (see CODEBASE_INDEX.md)

**Social (`/api/social/*`):**
- 25 endpoints (username, profile, friends, notifications, analytics)

**Auth (`/api/auth/*`):**
- 8 endpoints

**Pages (`/`):**
- 13 routes serving HTML

---

## PART 6: DATABASE SCHEMA

### 6.1 Core Tables
- `user_profiles` - User accounts
- `rooms` - Poker game rooms
- `room_seats` - Player seat assignments
- `game_states` - Game state (JSONB)
- `hand_history` - Completed hands
- `player_statistics` - Player analytics
- `friendships` - Friend relationships
- `notifications` - User notifications
- `badges` - User badges
- `seat_requests` - Seat request queue
- `chips_transactions` - Chip transaction audit
- `player_sessions` - Stable player IDs
- `rejoin_tokens` - Mid-game reconnection tokens

### 6.2 Migrations
**Location:** `database/migrations/` (44 SQL files)

**Key Migrations:**
- `001_initial_schema.sql` - Initial schema
- `007_create_missing_tables.sql` - Missing tables
- `add-game-states-table.sql` - Game states table
- `018_scaling_features_complete.sql` - Scaling features
- `021_add_auto_start_setting.sql` - Auto-start setting
- `022_add_dealer_position.sql` - Dealer position

---

## PART 7: CONFLICTS AND OVERLAPS

### 7.1 Multiple Event Handlers
**Problem:** Multiple socket event handlers updating same DOM elements

**Locations:**
- `action_processed` handler updates chips/pot
- `hand_complete` handler updates chips/pot
- `loadRoom()` refetches and updates chips/pot
- `updateSeatChips()` called from multiple places

**Impact:** Double increments/decrements, conflicting state

### 7.2 Phase Ambiguity
**Problem:** No explicit phase contract between server and client

**Locations:**
- Server emits multiple overlapping events
- Client infers phase from data (status === 'COMPLETED')
- No single source of truth for current phase

**Impact:** Race conditions, UI guessing state

### 7.3 Pot Display Conflicts
**Problem:** Pot display rewritten by multiple functions

**Locations:**
- `updatePotDisplay()` - Normal updates
- `handleHandComplete()` - Winner overlay
- Manual animations - Payout animations
- `loadRoom()` - Refetch updates

**Impact:** DOM structure destroyed, subsequent updates fail

### 7.4 Chip Animation Conflicts
**Problem:** Multiple systems trying to animate chips

**Locations:**
- `updateSeatChips()` - Normal updates (animates if previous value differs)
- `handleHandComplete()` - Payout animation
- `action_processed` - Real-time updates
- `loadRoom()` - Refetch updates

**Impact:** Chips increment/decrement multiple times

---

## PART 8: FRONTEND JAVASCRIPT MODULES

### 8.1 Auth Manager
**File:** `public/js/auth-manager.js` (364 lines)

**Purpose:** Single source of truth for authentication (Supabase + Guest)

**Dependencies:**
- `window.supabase` - Supabase client (loaded from CDN)
- `localStorage` - Browser storage

**Exports:**
- `AuthManager` class (global)
- Methods: `checkAuth()`, `signInWithGoogle()`, `signOut()`, `getAccessToken()`, `syncToBackend()`, `normalizeUser()`

**Communications:**
- Supabase Auth API (OAuth)
- `POST /api/auth/sync-user` - Sync user to backend

**Status:** ✅ ACTIVE - Used by minimal-table.html

---

### 8.2 Hand Encoder
**File:** `public/js/hand-encoder.js` (403 lines)

**Purpose:** PHE (Poker Hand Encoding) format - compact hand serialization

**Dependencies:** None (self-contained)

**Exports:**
- `HandEncoder` object with methods:
  - `encode(handData)` - Encode hand to PHE string
  - `decode(pheString)` - Decode PHE string to hand object

**Format:** `P[seat]:[cards]|B:[board]|W:[winner]|R:[rank]|P:[pot]|D:[dealer]|S:[seat]:[stack],...|A:[actions]`

**Status:** ✅ ACTIVE - Used by extraction pipeline

---

### 8.3 Sequence Tracker
**File:** `public/js/sequence-tracker.js` (149 lines)

**Purpose:** Client-side sequence number tracking to ignore stale updates

**Dependencies:** None (self-contained)

**Exports:**
- `SequenceTracker` class (global)
- Methods: `shouldProcessMessage()`, `reset()`, `setSequence()`, `getCurrentSeq()`, `createHandler()`

**Status:** ✅ ACTIVE - Used by play.html (legacy), should be used by minimal-table.html

---

### 8.4 Other Frontend JS Modules

**Active Modules (Used by minimal-table.html):**
- `liquid-glass-controller.js` - Liquid glass effects
- `global-animations.js` - Global animations
- `nav-shared.js` - Navigation shared logic
- `navbar-template.js` - Navbar template
- `social-modals.js` - Social modals
- `username-styling.js` - Username styling

**Legacy Modules (Only used by old HTML files):**
- `game-state-client.js` - Legacy game state client
- `game-state-manager.js` - Legacy game state manager
- `TableRenderer.js` - Legacy table renderer
- `poker-table-v2.js` - Legacy table v2
- `poker-table-production.js` - Legacy production table
- `poker-table-grid.js` - Legacy grid table

**Component Modules (Unused?):**
- `components/ActionButtons.js`
- `components/CommunityCards.js`
- `components/PotDisplay.js`
- `components/SeatComponent.js`

**Analytics Modules:**
- `analytics-components.js` - Analytics UI components
- `analytics-live.js` - Live analytics service
- `analytics-history.js` - Hand history viewer

**Other Modules:**
- `action-timer-manager.js` - Action timer management
- `empty-states.js` - Empty state messages
- `error-handler.js` - Error handling
- `friends-page.js` - Friends page logic
- `loading-states.js` - Loading UI
- `player-status-manager.js` - Player status management
- `seat-positioning-tool.js` - Seat positioning tool
- `timer-display.js` - Timer display
- `username-helper.js` - Username utilities
- `username-modal.js` - Username modal

---

## PART 9: SERVICES

### 9.1 Session Service
**File:** `services/session-service.js` (273 lines)

**Purpose:** Stable player identity & seat binding with Redis

**Dependencies:**
- `uuid` (v4) - UUID generation
- Redis client (from config/redis.js)
- PostgreSQL database

**Exports:**
- `SessionService` class
- Methods: `getOrCreateSession()`, `bindUserToSeat()`, `getUserSeat()`, `releaseSeat()`, `markPlayerAway()`, `heartbeat()`

**Redis Keys:**
- `session:${userId}` - Session data
- `seat:${roomId}:${seatIndex}` - Seat binding
- `userSeat:${userId}` - User's current seat

**Status:** ✅ ACTIVE - Used by sophisticated-engine-server.js

---

### 9.2 Player Identity Service
**File:** `services/player-identity-service.js` (298 lines)

**Purpose:** Stable player IDs that survive refreshes/restarts

**Dependencies:**
- `crypto` - Crypto utilities
- PostgreSQL database

**Exports:**
- `PlayerIdentityService` class
- Methods: `getOrCreatePlayerId()`, `generateStablePlayerId()`, `generateSessionToken()`, `validateSessionToken()`, `getPlayerId()`, `clearCache()`

**Database Tables:**
- `player_sessions` - Stores player_id mappings

**Status:** ✅ ACTIVE - Used by game-engine-bridge.js

---

### 9.3 Game State Hydrator
**File:** `services/game-state-hydrator.js` (320 lines)

**Purpose:** Hydrate game state from database

**Status:** ⚠️ REDUNDANT - Functionality moved to routes/game-engine-bridge.js hydrate endpoint

---

## PART 10: CONFIGURATION

### 10.1 Redis Config
**File:** `config/redis.js` (111 lines)

**Purpose:** Redis client initialization for sessions & Socket.IO scaling

**Dependencies:**
- `ioredis` - Redis client

**Exports:**
- `initializeRedis()` - Initialize Redis clients
- `getRedisClient()` - Get main client
- `getRedisSubscriber()` - Get subscriber client
- `closeRedis()` - Close connections

**Environment Variables:**
- `UPSTASH_REDIS_REST_URL` - Redis URL
- `UPSTASH_REDIS_REST_TOKEN` - Redis token

**Status:** ✅ ACTIVE

---

## PART 11: MIDDLEWARE

### 11.1 Session Middleware
**File:** `middleware/session.js`

**Purpose:** Express session middleware with Redis store

**Dependencies:**
- `express-session` - Session middleware
- `connect-redis` - Redis session store
- Redis client

**Status:** ✅ ACTIVE

---

### 11.2 Idempotency Middleware
**File:** `src/middleware/idempotency.js`

**Purpose:** Prevent duplicate requests

**Status:** ✅ ACTIVE - Used by routes/rooms.js, routes/games.js, routes/auth.js

---

## PART 12: DATABASE MIGRATIONS

**Location:** `database/migrations/` (44 SQL files)

**Key Migrations:**
- `001_initial_schema.sql` - Initial schema
- `007_create_missing_tables.sql` - Missing tables
- `add-game-states-table.sql` - Game states table (TEXT id, JSONB current_state)
- `018_scaling_features_complete.sql` - Scaling features
- `021_add_auto_start_setting.sql` - Auto-start setting
- `022_add_dealer_position.sql` - Dealer position

**Status:** ✅ ACTIVE - All migrations should be run

---

## PART 13: TYPESCRIPT SOURCE FILES

**Location:** `src/` (100+ TypeScript files)

**Status:** ⚠️ COMPILED BUT INACTIVE - Compiled to `dist/`, but runtime uses JavaScript adapters (`src/adapters/*.js`)

**Key Directories:**
- `src/core/engine/` - TypeScript poker engine (unused by runtime)
- `src/application/` - CQRS architecture (partial, compiled but not primary)
- `src/services/` - Business logic services (some used, some not)
- `src/types/` - TypeScript type definitions

---

## PART 14: LEGACY FILES

### 14.1 Dist Directory
**Location:** `dist/` (100+ compiled JavaScript files)

**Purpose:** Compiled TypeScript output

**Status:** ❌ LEGACY - Not used by runtime (server imports from `/routes` and `/src/adapters`)

---

### 14.2 Pokeher Directory
**Location:** `pokeher/` (old project folder)

**Status:** ❌ LEGACY - Historical reference only

---

### 14.3 Archive Directory
**Location:** `archive/` (200+ markdown files)

**Status:** 📚 HISTORICAL - Documentation and history

---

## PART 15: COMMUNICATION FLOW DIAGRAM

### 15.1 Hand Play Flow

```
Client (minimal-table.html)
  ↓ POST /api/engine/action
Server (routes/game-engine-bridge.js)
  ↓ MinimalBettingAdapter.processAction()
Adapter (src/adapters/minimal-engine-bridge.js)
  ↓ game-logic.processAction()
Game Logic (src/adapters/game-logic.js)
  ↓ betting-logic.validateAction() + applyAction()
Betting Logic (src/adapters/betting-logic.js)
  ↓ turn-logic.isBettingRoundComplete()
Turn Logic (src/adapters/turn-logic.js)
  ↓ If complete: progressToNextStreet()
  ↓ If showdown: handleShowdown()
Pot Logic (src/adapters/pot-logic.js)
  ↓ calculateSidePots()
  ↓ Return updated gameState
Server (routes/game-engine-bridge.js)
  ↓ UPDATE game_states SET current_state = ...
Database (PostgreSQL)
  ↓ Persist chips to room_seats
Server (routes/game-engine-bridge.js)
  ↓ io.to(`room:${roomId}`).emit('action_processed', {...})
Socket.IO
  ↓ Broadcast to room
Client (minimal-table.html)
  ↓ socket.on('action_processed', ...)
  ↓ updateSeatChips() + updatePotDisplay()
DOM Updates
```

### 15.2 Hand Completion Flow

```
Game Logic detects hand complete
  ↓
Server (routes/game-engine-bridge.js)
  ↓ persistHandCompletion() - Update chips in DB
Database (PostgreSQL)
  ↓
Server (routes/game-engine-bridge.js)
  ↓ emitPhaseUpdate('HAND_COMPLETED', {...})
  ↓ handleHandCompleteEmission() - Emit hand_complete
Socket.IO
  ↓ io.to(`room:${roomId}`).emit('hand_complete', {...})
  ↓ io.to(`room:${roomId}`).emit('hand_complete_lobby', {...})
Client (minimal-table.html)
  ↓ socket.on('hand_complete', handleHandComplete)
  ↓ socket.on('hand_complete_lobby', ...)
  ↓ Show winner, animate payout
  ↓ After 3s: Start countdown or show Start button
  ↓ Auto-start timer OR manual start
Server (routes/game-engine-bridge.js)
  ↓ POST /api/engine/next-hand
  ↓ Deal new hand, post blinds
  ↓ emitPhaseUpdate('DEALING', {...})
  ↓ io.to(`room:${roomId}`).emit('hand_started', {...})
Client (minimal-table.html)
  ↓ socket.on('hand_started', handleHandStarted)
  ↓ Render new hand state
```

### 15.3 Hydration Flow

```
Client refresh/reconnect
  ↓ GET /api/engine/hydrate/:roomId/:userId
Server (routes/game-engine-bridge.js)
  ↓ Load room from DB
  ↓ Load game_states.current_state (JSONB)
  ↓ Extract player's hole cards (private)
  ↓ Calculate action buttons state
  ↓ Return { hasActiveGame, gameState, myCards, isMyTurn, ... }
Client (minimal-table.html)
  ↓ hydrateGameState()
  ↓ Render game state
  ↓ Connect Socket.IO
  ↓ socket.emit('authenticate', {userId, roomId})
  ↓ socket.emit('join_room', {roomId, userId})
```

---

## PART 16: CONFLICTS AND ROOT CAUSES

### 16.1 Chip Increment/Decrement Chaos

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

### 16.2 Pot Display Broken

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

### 16.3 Double Dealing

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

### 16.4 Phase Ambiguity

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

## PART 17: GOLDEN PATH RECOMMENDATION

### 17.1 The One True Fix

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

## PART 18: NEXT STEPS FOR COMPLETE INDEX

1. ✅ Map all backend route files
2. ✅ Map all adapter files
3. ✅ Map main frontend file
4. ✅ Map frontend JS modules (partial)
5. ⏳ Complete frontend JS modules mapping
6. ⏳ Map all CSS files (`public/css/*`)
7. ⏳ Map all HTML pages (`public/pages/*`)
8. ⏳ Map all TypeScript source files (`src/**/*.ts`) - Full dependency graph
9. ⏳ Map all database migrations - Full schema map
10. ⏳ Map all test files
11. ⏳ Map all scripts (`scripts/*`)
12. ⏳ Complete services mapping
13. ⏳ Complete middleware mapping
14. ⏳ Map all config files
15. ⏳ Map all legacy files (dist/, pokeher/, archive/)
16. ⏳ Create complete dependency graph
17. ⏳ Create complete communication flow diagram
18. ⏳ Identify ALL conflicts (not just the 4 major ones)
19. ⏳ Create detailed golden path implementation plan

---

**Status:** IN PROGRESS - Parts 1-17 complete, continuing with remaining files...

