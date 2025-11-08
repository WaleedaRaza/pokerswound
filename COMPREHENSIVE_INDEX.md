# 🗂️ COMPREHENSIVE CODEBASE INDEX

**Created:** November 6, 2025  
**Purpose:** Complete index of all files, endpoints, classes, functions, and systems  
**Status:** Living document - update as codebase evolves

---

## 📊 QUICK STATS

- **Total Files:** ~500+ (excluding node_modules)
- **Backend Routes:** 8 files, 100+ endpoints
- **Frontend Pages:** 7 HTML pages
- **Frontend JS:** 25 JavaScript modules
- **TypeScript Files:** 104 source files
- **Database Tables:** 40+ tables
- **Socket.IO Events:** 10+ event types
- **Lines of Code:** ~20,000+ (estimated)

---

## 📁 DIRECTORY STRUCTURE

```
PokerGeek/
├── routes/              # Backend API routers (8 files)
├── public/              # Frontend assets
│   ├── pages/          # HTML pages (7 files)
│   ├── js/             # JavaScript modules (25 files)
│   ├── css/            # Stylesheets (17 files)
│   └── cards/          # Card images (53 PNGs)
├── src/                # TypeScript source (104 files)
│   ├── core/           # Game engine core
│   ├── application/    # CQRS application layer
│   ├── services/       # Business logic services
│   ├── routes/         # TypeScript route definitions
│   └── types/          # TypeScript type definitions
├── database/           # Database schema & migrations
│   └── migrations/     # 40+ migration files
├── services/           # Legacy JavaScript services (3 files)
├── websocket/          # Socket.IO handlers (1 file)
├── middleware/         # Express middleware (1 file)
└── config/             # Configuration files
```

---

## 🔌 API ENDPOINTS INDEX

### **routes/rooms.js** (1,955 lines, 30 endpoints)

**Purpose:** Room and lobby management, seat claiming, game hydration

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/api/rooms` | List all active rooms | No |
| POST | `/api/rooms` | Create new room | Yes |
| GET | `/api/rooms/invite/:code` | Get room by invite code | No |
| GET | `/api/rooms/:roomId/seats` | Get seat assignments | No |
| POST | `/api/rooms/:roomId/claim-seat` | Claim a seat | Yes |
| GET | `/api/rooms/:roomId/session` | Get player session | Yes |
| POST | `/api/rooms/:roomId/join` | Join room (claim seat) | Yes |
| POST | `/api/rooms/:roomId/leave` | Leave room (release seat) | Yes |
| GET | `/api/rooms/:roomId/game` | Get active game for room | No |
| GET | `/api/rooms/:roomId/hydrate` | **Hydrate game state** | Yes |
| GET | `/api/rooms/:roomId/my-state` | Get player's game state | Yes |
| POST | `/api/rooms/:roomId/lobby/join` | Join lobby (request approval) | Yes |
| GET | `/api/rooms/:roomId/lobby/players` | Get lobby players | No |
| POST | `/api/rooms/:roomId/lobby/approve` | Approve player (host) | Yes |
| POST | `/api/rooms/:roomId/lobby/reject` | Reject player (host) | Yes |
| GET | `/api/rooms/my-rooms` | Get user's rooms | Yes |
| POST | `/api/rooms/:roomId/close` | Close room (host) | Yes |
| POST | `/api/rooms/:roomId/abandon` | Abandon room | Yes |
| POST | `/api/rooms/:roomId/kick` | Kick player (host) | Yes |
| POST | `/api/rooms/:roomId/set-away` | Mark player away | Yes |
| POST | `/api/rooms/:roomId/capacity` | Update room capacity | Yes |
| POST | `/api/rooms/:roomId/rebuy` | Rebuy chips | Yes |
| GET | `/api/rooms/:roomId/lobby/my-status` | Get lobby status | Yes |
| GET | `/api/rooms/:roomId/history` | Get hand history | No |
| GET | `/api/rooms/:roomId` | Get room details | No |
| GET | `/api/rooms/:roomId/game-state` | Get game state | No |
| POST | `/api/rooms/:roomId/invite` | Generate invite code | Yes |
| POST | `/api/rooms/:roomId/update-chips` | Update player chips (host) | Yes |
| POST | `/api/rooms/:roomId/pause-game` | Pause game (host) | Yes |
| POST | `/api/rooms/:roomId/resume-game` | Resume game (host) | Yes |

**Key Functions:**
- `hydrate()` - State recovery after refresh (lines 377-653)
- `claimSeat()` - Seat claiming logic (lines 240-332)
- `createRoom()` - Room creation (lines 47-123)

---

### **routes/games.js** (997 lines, 7 endpoints)

**Purpose:** Game instance management, hand starting, player actions

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/games` | Create new game | Yes |
| GET | `/api/games` | List games | No |
| GET | `/api/games/:id` | Get game state | No |
| POST | `/api/games/:id/join` | Join game (legacy) | Yes |
| GET | `/api/games/:id/legal-actions` | Get legal actions | No |
| POST | `/api/games/:id/start-hand` | **Start poker hand** | Yes |
| POST | `/api/games/:id/actions` | Player action (fold/call/raise) | Yes |

**Key Functions:**
- `startHand()` - Deal cards, post blinds (lines 295-640)
- `processAction()` - Handle player actions (lines 641-996)

---

### **routes/auth.js** (292 lines, 8 endpoints)

**Purpose:** Authentication and user management

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/sync-user` | Sync Supabase user | Yes |
| POST | `/api/auth/check-username` | Check username availability | No |
| POST | `/api/auth/set-username` | Set username | Yes |
| GET | `/api/auth/profile/:userId` | Get user profile | No |
| PUT | `/api/auth/profile` | Update profile | Yes |

---

### **routes/social.js** (1,416 lines, 25 endpoints)

**Purpose:** Social features, friends, profiles, analytics

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/social/username/check` | Check username | Yes |
| POST | `/api/social/username/set` | Set username | Yes |
| POST | `/api/social/username/change` | Change username | Yes |
| GET | `/api/social/username/:username` | Get user by username | Yes |
| GET | `/api/social/profile/me` | Get own profile | Yes |
| PUT | `/api/social/profile` | Update profile | Yes |
| GET | `/api/social/profile/:userId` | Get user profile | Yes |
| PATCH | `/api/social/profile/me` | Partial profile update | Yes |
| GET | `/api/social/friends` | Get friends list | Yes |
| POST | `/api/social/friends/request` | Send friend request | Yes |
| GET | `/api/social/friends/requests` | Get pending requests | Yes |
| POST | `/api/social/friends/accept/:requestId` | Accept request | Yes |
| POST | `/api/social/friends/reject/:requestId` | Reject request | Yes |
| DELETE | `/api/social/friends/:friendId` | Remove friend | Yes |
| GET | `/api/social/notifications` | Get notifications | Yes |
| PATCH | `/api/social/notifications/:id/read` | Mark notification read | Yes |
| PATCH | `/api/social/notifications/read-all` | Mark all read | Yes |
| GET | `/api/social/notifications/count` | Get unread count | Yes |
| GET | `/api/social/analytics/hands/:userId` | Get hand history | Yes |
| GET | `/api/social/analytics/stats/:userId` | Get player stats | Yes |
| GET | `/api/social/analytics/positional/:userId` | Positional stats | Yes |
| GET | `/api/social/analytics/charts/:userId` | Chart data | Yes |
| GET | `/api/social/analytics/rooms/:userId` | Room analytics | Yes |
| GET | `/api/social/badges/:userId` | Get badges | Yes |

---

### **routes/game-engine-bridge.js** (1,604 lines, 12 endpoints)

**Purpose:** Minimal API bridge for game engine

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/api/engine/hydrate/:roomId/:userId` | Hydrate game state | No |
| POST | `/api/engine/claim-seat` | Claim seat | No |
| GET | `/api/engine/seats/:roomId` | Get seats | No |
| POST | `/api/engine/deal-cards` | Deal cards | No |
| GET | `/api/engine/room/:roomId` | Get room info | No |
| POST | `/api/engine/action` | Player action | No |
| GET | `/api/engine/game/:roomId` | Get game state | No |
| GET | `/api/engine/my-cards/:roomId/:userId` | Get hole cards | No |
| GET | `/api/engine/health` | Health check | No |
| POST | `/api/engine/next-hand` | Start next hand | No |
| GET | `/api/engine/host-controls/:roomId/:userId` | Get host controls | No |
| POST | `/api/engine/host-controls/kick-player` | Kick player | No |
| PATCH | `/api/engine/host-controls/update-blinds` | Update blinds | No |
| POST | `/api/engine/showdown-action` | Showdown action | No |

---

### **routes/sandbox.js** (289 lines, 5 endpoints)

**Purpose:** Sandbox/testing endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| POST | `/api/sandbox/create-room` | Create test room | No |
| POST | `/api/sandbox/join-room` | Join test room | No |
| GET | `/api/sandbox/my-rooms` | Get test rooms | No |
| DELETE | `/api/sandbox/delete-room` | Delete test room | No |
| GET | `/api/sandbox/health` | Health check | No |

---

### **routes/pages.js** (112 lines, 13 routes)

**Purpose:** Serve HTML pages

| Method | Route | Serves | Purpose |
|--------|-------|--------|---------|
| GET | `/` | `public/pages/index.html` | Landing page |
| GET | `/play` | `public/pages/play.html` | Lobby |
| GET | `/friends` | `public/pages/friends.html` | Friends page |
| GET | `/ai-solver` | `public/pages/ai-solver.html` | AI solver |
| GET | `/analysis` | `public/pages/analysis.html` | Hand analysis |
| GET | `/learning` | `public/pages/learning.html` | Learning |
| GET | `/poker-today` | `public/pages/poker-today.html` | News feed |
| GET | `/game/:roomId` | `public/poker-table-zoom-lock.html` | **Main game table** |
| GET | `/game` | `public/poker-table-zoom-lock.html` | Game table (no room) |
| GET | `/poker-v2` | `public/poker-table-v2.html` | Legacy table |
| GET | `/game-v2/:roomId` | `public/poker-table-v2.html` | Legacy table |
| GET | `/poker-demo` | `public/poker-table-v2-demo.html` | Demo |
| GET | `/poker-v3` | `public/poker-table-v3.html` | Legacy table |
| GET | `/poker-v3-demo` | `public/poker-table-v3-demo.html` | Demo |
| GET | `/table` | `public/poker-table-final.html` | Legacy table |
| GET | `/table-grid` | `public/poker-table-grid.html` | Legacy table |
| GET | `/table-old` | `public/poker.html` | Legacy table |
| GET | `/sandbox-table` | `public/minimal-table.html` | Minimal table |
| GET | `/poker` | `public/poker.html` | Legacy table |

---

### **routes/v2.js** (65 lines, 3 endpoints)

**Purpose:** CQRS-style API v2 endpoints

| Method | Endpoint | Purpose | Auth Required |
|--------|----------|---------|---------------|
| GET | `/api/v2/game/:gameId` | Get game state (CQRS) | No |
| GET | `/api/v2/room/:roomId` | Get room info (CQRS) | No |
| POST | `/api/v2/game/:gameId/action` | Process action (CQRS) | Yes |

---

## 🔌 SOCKET.IO EVENTS INDEX

### **websocket/socket-handlers.js** (190 lines)

**Client → Server Events:**

| Event | Payload | Purpose |
|-------|---------|---------|
| `authenticate` | `{userId, roomId}` | Authenticate socket connection |
| `join_room` | `{roomId, userId}` | Join Socket.IO room namespace |
| `heartbeat` | `{userId}` | Keep seat binding alive |
| `go_to_table` | `{roomId, userId}` | Navigate to table view |

**Server → Client Events:**

| Event | Payload | Purpose |
|-------|---------|---------|
| `authenticated` | `{userId, roomId}` | Auth successful |
| `auth_error` | `{error}` | Auth failed |
| `joined_room` | `{roomId, userId}` | Room join confirmed |
| `join_error` | `{error}` | Room join failed |
| `heartbeat_ack` | `{status}` | Heartbeat acknowledged |
| `seat_update` | `{roomId, seats: []}` | Seat assignments changed |
| `player_away` | `{userId, seatIndex, gracePeriod}` | Player disconnected |
| `player_timeout` | `{userId, seatIndex}` | Grace period expired |
| `hand_started` | `{gameId, handNumber, dealerSeat, pot}` | New hand begins |
| `player_action` | `{playerId, action, amount}` | Player acted |
| `action_required` | `{playerId, legalActions}` | Your turn |
| `board_dealt` | `{cards: []}` | Community cards dealt |
| `hand_complete` | `{winners: [], pot}` | Hand finished |

**Helper Functions:**
- `broadcastSeats(io, getDb, roomId)` - Broadcast seat updates

---

## 🎮 TYPESCRIPT CORE ENGINE INDEX

### **src/core/engine/** (8 files)

#### **game-state-machine.ts** (~1,200 lines)
**Purpose:** Main state machine for game flow

**Key Classes:**
- `GameStateMachine` - State transition engine

**Key Methods:**
- `processAction(action: GameAction)` - Process game actions
- `startHand()` - Begin new hand
- `advanceStreet()` - Move to next betting round
- `endHand()` - Complete hand

**State Transitions:**
- `WAITING` → `DEALING` → `PREFLOP` → `FLOP` → `TURN` → `RIVER` → `SHOWDOWN` → `WAITING`

---

#### **betting-engine.ts** (~450 lines)
**Purpose:** Betting action validation and processing

**Key Interfaces:**
- `BettingAction` - Action structure
- `ValidationResult` - Validation outcome

**Key Methods:**
- `validateAction()` - Validate bet/call/raise
- `calculateMinRaise()` - Calculate minimum raise
- `calculateMaxRaise()` - Calculate maximum raise

---

#### **hand-evaluator.ts** (~417 lines)
**Purpose:** Hand ranking and winner determination

**Key Classes:**
- `HandEvaluator` - Hand evaluation engine

**Key Methods:**
- `evaluateHand(cards: Card[])` - Rank hand
- `compareHands(hand1, hand2)` - Compare two hands
- `determineWinners()` - Find winning players

**Hand Rankings:**
1. Royal Flush
2. Straight Flush
3. Four of a Kind
4. Full House
5. Flush
6. Straight
7. Three of a Kind
8. Two Pair
9. One Pair
10. High Card

---

#### **pot-manager.ts** (~313 lines)
**Purpose:** Pot calculation and side pot management

**Key Interfaces:**
- `Pot` - Pot structure
- `PlayerContribution` - Player's pot contribution

**Key Methods:**
- `calculatePots()` - Calculate main + side pots
- `distributePots()` - Distribute to winners

---

#### **round-manager.ts** (~407 lines)
**Purpose:** Betting round management

**Key Interfaces:**
- `RoundResult` - Round completion result
- `PlayerAction` - Action structure

**Key Methods:**
- `processBettingRound()` - Process entire round
- `checkRoundComplete()` - Check if round finished

---

#### **turn-manager.ts** (~384 lines)
**Purpose:** Player turn order management

**Key Interfaces:**
- `TurnOrder` - Turn order structure
- `TurnInfo` - Current turn info

**Key Methods:**
- `getNextPlayer()` - Get next to act
- `calculateTurnOrder()` - Calculate action order

---

#### **action-validator.ts** (~460 lines)
**Purpose:** Validate legal actions

**Key Interfaces:**
- `ActionValidationContext` - Validation context
- `ActionValidationResult` - Validation result

**Key Methods:**
- `validateAction()` - Validate action legality
- `getLegalActions()` - Get available actions

---

#### **enhanced-hand-evaluator.ts** (~204 lines)
**Purpose:** Advanced hand evaluation features

**Key Methods:**
- `evaluateWithKickers()` - Evaluate with kickers
- `evaluateDraws()` - Evaluate drawing hands

---

### **src/core/models/** (3 files)

#### **game-state.ts** (~478 lines)
**Purpose:** Game state model class

**Key Class:**
- `GameStateModel` - Complete game state representation

**Key Properties:**
- `id: string` - Game ID
- `status: GameStatus` - Current status
- `players: Map<UUID, PlayerModel>` - Active players
- `handState: HandState` - Current hand state
- `pot: PotState` - Pot information
- `bettingRound: BettingRoundState` - Betting round state

**Key Methods:**
- `addPlayer(player)` - Add player to game
- `removePlayer(playerId)` - Remove player
- `serialize()` - Convert to JSON
- `deserialize(data)` - Load from JSON

---

#### **player.ts** (~120 lines)
**Purpose:** Player model class

**Key Class:**
- `PlayerModel` - Player representation

**Key Properties:**
- `uuid: UUID` - Player ID
- `name: string` - Player name
- `stack: Chips` - Chip stack
- `seatIndex: SeatIndex` - Seat number
- `holeCards: Card[]` - Private cards
- `isActive: boolean` - Active status
- `isAllIn: boolean` - All-in status

---

#### **table.ts** (~68 lines)
**Purpose:** Table configuration model

**Key Class:**
- `TableModel` - Table configuration

**Key Properties:**
- `maxSeats: number` - Maximum seats
- `smallBlind: Chips` - Small blind amount
- `bigBlind: Chips` - Big blind amount

---

### **src/core/card/** (4 files)

#### **card.ts**
**Purpose:** Card representation

**Key Class:**
- `Card` - Card object

**Key Methods:**
- `toString()` - Convert to string (e.g., "C4")
- `equals(other)` - Compare cards

#### **deck.ts**
**Purpose:** Deck shuffling and dealing

**Key Class:**
- `Deck` - Deck of cards

**Key Methods:**
- `shuffle()` - Fisher-Yates shuffle
- `deal()` - Deal card
- `reset()` - Reset deck

#### **rank.ts**
**Purpose:** Card rank enumeration

**Key Enum:**
- `Rank` - TWO, THREE, ..., ACE

#### **suit.ts**
**Purpose:** Card suit enumeration

**Key Enum:**
- `Suit` - CLUBS, DIAMONDS, HEARTS, SPADES

---

## 🗄️ DATABASE TABLES INDEX

### **Core Game Tables**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `rooms` | Game rooms/lobbies | `id`, `host_user_id`, `game_id`, `invite_code` |
| `room_seats` | Seat assignments | `room_id`, `user_id`, `seat_index`, `status` |
| `room_players` | Lobby players | `room_id`, `user_id`, `status` |
| `room_spectators` | Spectators | `room_id`, `user_id` |
| `game_states` | **Primary game state** | `id` (TEXT), `room_id`, `current_state` (JSONB) |
| `games` | Game instances (UUID) | `id` (UUID), `room_id`, `status` |
| `hands` | Hand records | `id`, `game_id`, `hand_number` |
| `players` | Players in games | `id`, `game_id`, `user_id` |
| `actions` | Player actions | `id`, `hand_id`, `player_id`, `action_type` |
| `pots` | Pot tracking | `id`, `hand_id`, `amount` |
| `hand_history` | Complete hand records | `id`, `room_id`, `hand_data` (JSONB) |

### **Authentication Tables**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `auth.users` | Supabase auth (managed) | `id`, `email` |
| `user_profiles` | Application user data | `user_id`, `username`, `avatar_url` |
| `player_sessions` | Stable player IDs | `id`, `user_id`, `room_id`, `seat_index` |

### **Audit & Tracking Tables**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `processed_actions` | Idempotency tracking | `idempotency_key`, `result` |
| `game_audit_log` | Audit trail | `id`, `game_id`, `action`, `timestamp` |
| `rejoin_tokens` | Reconnection tokens | `token`, `user_id`, `room_id` |
| `rate_limits` | Rate limiting | `user_id`, `endpoint`, `count` |

### **Social Features Tables**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `friends` | Friend relationships | `user_id`, `friend_id`, `status` |
| `friend_requests` | Pending requests | `id`, `from_user_id`, `to_user_id` |
| `notifications` | User notifications | `id`, `user_id`, `type`, `read` |
| `badges` | User badges | `id`, `user_id`, `badge_type` |

---

## 🎨 FRONTEND FILES INDEX

### **HTML Pages** (`public/pages/`)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `index.html` | 1,186 | Landing page | ✅ Active |
| `play.html` | 2,707 | Lobby system | ✅ Active |
| `friends.html` | ~800 | Friends page | ✅ Active |
| `analysis.html` | ~600 | Hand analysis | ⚠️ Partial |
| `learning.html` | ~400 | Learning content | ⚠️ Partial |
| `poker-today.html` | ~500 | News feed | ⚠️ Partial |
| `ai-solver.html` | ~300 | AI solver | ⚠️ Partial |

### **Main Game Table** (`public/`)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `poker-table-zoom-lock.html` | 2,170 | **Main game table** | ✅ Active |
| `poker-table-zoom-lock.html.backup` | 2,170 | Backup | 📦 Archive |
| `poker-table-v2.html` | ~1,500 | Legacy table | 📦 Legacy |
| `poker-table-v3.html` | ~1,200 | Legacy table | 📦 Legacy |
| `poker-table-grid.html` | ~800 | Legacy table | 📦 Legacy |
| `poker-table-final.html` | ~600 | Legacy table | 📦 Legacy |
| `minimal-table.html` | ~400 | Minimal table | 📦 Test |

### **JavaScript Modules** (`public/js/`)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `auth-manager.js` | 364 | Supabase auth wrapper | ✅ Active |
| `sequence-tracker.js` | 145 | WebSocket sequence tracking | ✅ Active |
| `game-state-manager.js` | 363 | Game state management | ⚠️ Unused |
| `action-timer-manager.js` | ~200 | Turn timer display | ✅ Active |
| `timer-display.js` | ~150 | Timer UI | ✅ Active |
| `friends-page.js` | ~400 | Friends page logic | ✅ Active |
| `analytics-components.js` | ~300 | Analytics UI | ✅ Active |
| `analytics-live.js` | ~250 | Live analytics | ✅ Active |
| `analytics-history.js` | ~200 | History analytics | ✅ Active |
| `global-animations.js` | 440 | Global animations | ✅ Active |
| `navbar-template.js` | ~200 | Navbar component | ✅ Active |
| `social-modals.js` | ~300 | Social modals | ✅ Active |
| `username-modal.js` | ~150 | Username modal | ✅ Active |
| `username-helper.js` | ~100 | Username utilities | ✅ Active |
| `nav-shared.js` | ~150 | Shared nav logic | ✅ Active |
| `hand-encoder.js` | ~100 | Hand encoding | ✅ Active |
| `empty-states.js` | ~100 | Empty state UI | ✅ Active |
| `loading-states.js` | ~100 | Loading UI | ✅ Active |
| `error-handler.js` | ~150 | Error handling | ✅ Active |
| `player-status-manager.js` | ~200 | Player status | ✅ Active |
| `poker-table-grid.js` | ~500 | Grid table logic | 📦 Legacy |
| `poker-table-production.js` | ~400 | Production table | 📦 Legacy |
| `poker-table-v2.js` | ~300 | V2 table logic | 📦 Legacy |
| `seat-positioning-tool.js` | ~200 | Seat positioning | 📦 Dev tool |
| `liquid-glass-controller.js` | ~100 | Glass effect | ✅ Active |

### **CSS Stylesheets** (`public/css/`)

| File | Purpose | Status |
|------|---------|--------|
| `pokergeek.css` | Global styles (3,023 lines) | ✅ Active |
| `index-modern.css` | Landing page styles | ✅ Active |
| `play-modern.css` | Lobby styles | ✅ Active |
| `friends-modern.css` | Friends page styles | ✅ Active |
| `analytics-modern.css` | Analytics styles | ✅ Active |
| `analytics-live.css` | Live analytics styles | ✅ Active |
| `design-tokens.css` | CSS variables | ✅ Active |
| `empty-states.css` | Empty state styles | ✅ Active |
| `loading-states.css` | Loading styles | ✅ Active |
| `social-features.css` | Social features styles | ✅ Active |
| `social-modals.css` | Modal styles | ✅ Active |
| `timer-display.css` | Timer styles | ✅ Active |
| `poker-table-grid.css` | Grid table styles | 📦 Legacy |
| `poker-table-production.css` | Production table styles | 📦 Legacy |
| `poker-table-v2.css` | V2 table styles | 📦 Legacy |
| `poker-table-v3.css` | V3 table styles | 📦 Legacy |
| `style.css` | Legacy styles | 📦 Legacy |

---

## 🔧 SERVICES INDEX

### **services/** (Legacy JavaScript Services)

| File | Lines | Purpose | Status |
|------|-------|---------|--------|
| `session-service.js` | 273 | Session management | ✅ Active |
| `player-identity-service.js` | 298 | Stable player IDs | ✅ Active |
| `game-state-hydrator.js` | 320 | State recovery | ⚠️ Redundant |

### **src/services/** (TypeScript Services)

#### **Database Services**

| File | Purpose | Status |
|------|---------|--------|
| `database/repos/game-states.repo.ts` | TEXT game state persistence | ✅ Active |
| `database/repos/full-game.repo.ts` | UUID game persistence | ❌ Unused |
| `database/repos/games.repo.ts` | Games CRUD | ❌ Unused |
| `database/repos/hands.repo.ts` | Hands CRUD | ❌ Unused |
| `database/repos/players.repo.ts` | Players CRUD | ❌ Unused |
| `database/repos/actions.repo.ts` | Actions CRUD | ❌ Unused |
| `database/repos/pots.repo.ts` | Pots CRUD | ❌ Unused |
| `database/repos/base.repo.ts` | Base repository | ✅ Active |
| `database/event-store.repo.ts` | Event sourcing | ⚠️ Partial |
| `database/concurrency-manager.ts` | Concurrency control | ✅ Active |
| `database/transaction-manager.ts` | Transaction management | ✅ Active |
| `database/supabase.ts` | Supabase client | ✅ Active |

#### **Business Logic Services**

| File | Purpose | Status |
|------|---------|--------|
| `game-service.ts` | Game business logic | ✅ Active |
| `game/DisplayService.ts` | Display state management | ✅ Active |
| `user/UserProfileService.ts` | User profile management | ✅ Active |
| `user/UsernameService.ts` | Username management | ✅ Active |
| `social/FriendService.ts` | Friend management | ✅ Active |
| `auth/auth-service.ts` | Authentication | ✅ Active |
| `auth/jwt-service.ts` | JWT tokens | ✅ Active |
| `auth/password-service.ts` | Password hashing | ✅ Active |
| `timer-service.js` | Turn timers | ✅ Active |

---

## 🏗️ APPLICATION LAYER INDEX (CQRS)

### **src/application/commands/** (Command Handlers)

| File | Purpose | Status |
|------|---------|--------|
| `CommandBus.ts` | Command bus | ✅ Active |
| `CreateGame/CreateGameCommand.ts` | Create game command | ✅ Active |
| `CreateGame/CreateGameHandler.ts` | Create game handler | ✅ Active |
| `JoinRoom/JoinRoomCommand.ts` | Join room command | ✅ Active |
| `JoinRoom/JoinRoomHandler.ts` | Join room handler | ✅ Active |
| `LeaveRoom/LeaveRoomCommand.ts` | Leave room command | ✅ Active |
| `LeaveRoom/LeaveRoomHandler.ts` | Leave room handler | ✅ Active |
| `StartHand/StartHandCommand.ts` | Start hand command | ✅ Active |
| `StartHand/StartHandHandler.ts` | Start hand handler | ✅ Active |
| `ProcessPlayerAction/ProcessPlayerActionCommand.ts` | Action command | ✅ Active |
| `ProcessPlayerAction/ProcessPlayerActionHandler.ts` | Action handler | ✅ Active |

### **src/application/queries/** (Query Handlers)

| File | Purpose | Status |
|------|---------|--------|
| `QueryBus.ts` | Query bus | ✅ Active |
| `GetGameState/GetGameStateQuery.ts` | Get game state query | ✅ Active |
| `GetGameState/GetGameStateHandler.ts` | Get game state handler | ✅ Active |
| `GetPlayerStats/GetPlayerStatsQuery.ts` | Get stats query | ✅ Active |
| `GetPlayerStats/GetPlayerStatsHandler.ts` | Get stats handler | ✅ Active |
| `GetRoomInfo/GetRoomInfoQuery.ts` | Get room query | ✅ Active |
| `GetRoomInfo/GetRoomInfoHandler.ts` | Get room handler | ✅ Active |

### **src/application/events/** (Event Handlers)

| File | Purpose | Status |
|------|---------|--------|
| `EventBus.ts` | Event bus | ✅ Active |
| `EventHandler.ts` | Base event handler | ✅ Active |
| `handlers/GameEventHandler.ts` | Game event handler | ✅ Active |
| `handlers/WebSocketEventHandler.ts` | WebSocket event handler | ✅ Active |

### **src/application/services/**

| File | Purpose | Status |
|------|---------|--------|
| `GameApplicationService.ts` | Application service | ✅ Active |
| `DisplayStateManager.ts` | Display state | ✅ Active |
| `EventReplayer.ts` | Event replay | ✅ Active |

### **src/application/readmodels/**

| File | Purpose | Status |
|------|---------|--------|
| `GameReadModel.ts` | Game read model | ✅ Active |
| `PlayerReadModel.ts` | Player read model | ✅ Active |
| `RoomReadModel.ts` | Room read model | ✅ Active |

---

## 📦 DEPENDENCIES INDEX

### **Runtime Dependencies** (package.json)

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.18.2 | Web framework |
| `socket.io` | ^4.8.1 | WebSocket server |
| `pg` | ^8.16.3 | PostgreSQL client |
| `@supabase/supabase-js` | ^2.75.0 | Supabase client |
| `ioredis` | ^5.8.2 | Redis client |
| `jsonwebtoken` | ^9.0.2 | JWT tokens |
| `bcrypt` | ^6.0.0 | Password hashing |
| `dotenv` | ^17.2.2 | Environment variables |
| `cors` | ^2.8.5 | CORS middleware |
| `uuid` | ^13.0.0 | UUID generation |
| `zod` | ^4.1.5 | Schema validation |
| `express-rate-limit` | ^8.1.0 | Rate limiting |
| `express-session` | ^1.18.2 | Session management |
| `helmet` | ^8.1.0 | Security headers |
| `cookie-parser` | ^1.4.7 | Cookie parsing |
| `connect-redis` | ^9.0.0 | Redis session store |
| `@socket.io/redis-adapter` | ^8.3.0 | Redis adapter for Socket.IO |
| `axios` | ^1.11.0 | HTTP client |
| `undici` | ^7.13.0 | HTTP client |

### **Development Dependencies**

| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ^5.9.2 | TypeScript compiler |
| `nodemon` | ^3.1.10 | Auto-restart dev server |
| `jest` | ^29.7.0 | Testing framework |
| `eslint` | ^8.57.0 | Linting |
| `prettier` | ^3.2.5 | Code formatting |
| `ts-jest` | ^29.1.2 | TypeScript Jest preset |
| `ts-node` | ^10.9.2 | TypeScript execution |
| `@typescript-eslint/eslint-plugin` | ^7.15.0 | TypeScript ESLint |
| `@typescript-eslint/parser` | ^7.15.0 | TypeScript parser |
| `socket.io-client` | ^4.8.1 | Socket.IO client (testing) |

---

## 🔑 KEY FUNCTIONS & CLASSES INDEX

### **Backend Key Functions**

#### **sophisticated-engine-server.js**
- `initializeDatabase()` - Initialize DB connection
- `initializeRedis()` - Initialize Redis
- `setupSocketIO()` - Configure Socket.IO
- `loadIncompleteGames()` - Crash recovery
- `generateGameId()` - Generate TEXT game ID

#### **routes/rooms.js**
- `hydrate()` - State recovery (lines 377-653)
- `claimSeat()` - Seat claiming (lines 240-332)
- `createRoom()` - Room creation (lines 47-123)
- `approvePlayer()` - Approve lobby player (lines 833-894)

#### **routes/games.js**
- `startHand()` - Start poker hand (lines 295-640)
- `processAction()` - Process player action (lines 641-996)
- `createGame()` - Create game instance (lines 14-118)

### **Frontend Key Classes**

#### **poker-table-zoom-lock.html**
- `PokerTableGrid` - Main table class
- `initWithBackend()` - Initialize backend connection
- `fetchHydration()` - Fetch game state
- `renderFromHydration()` - Render game state
- `renderSeats()` - Render seat positions
- `handleAction()` - Handle player action

---

## 📝 TYPE DEFINITIONS INDEX

### **src/types/common.types.ts**

**Key Types:**
- `UUID` - UUID string type
- `Chips` - Chip amount (number)
- `SeatIndex` - Seat number (0-8)
- `ActionType` - FOLD | CALL | RAISE | CHECK | ALL_IN
- `Street` - PREFLOP | FLOP | TURN | RIVER | SHOWDOWN
- `GameStatus` - WAITING | DEALING | ACTIVE | PAUSED | COMPLETE

### **src/types/game.types.ts**

**Key Interfaces:**
- `GameConfiguration` - Game settings
- `GameState` - Game state structure
- `HandState` - Hand state structure
- `PotState` - Pot state structure

### **src/types/player.types.ts**

**Key Interfaces:**
- `Player` - Player structure
- `PlayerStats` - Player statistics

### **src/types/card.types.ts**

**Key Types:**
- `CardCode` - Card string code (e.g., "C4")
- `Suit` - Card suit
- `Rank` - Card rank

---

## 🗂️ DATABASE MIGRATIONS INDEX

### **database/migrations/** (40+ files)

**Key Migrations:**

| File | Purpose | Status |
|------|---------|--------|
| `001_initial_schema.sql` | Initial schema | ✅ Applied |
| `007_create_missing_tables.sql` | UUID system tables | ⚠️ Empty tables |
| `add-game-states-table.sql` | TEXT game states | ✅ Active |
| `20251027_poker_table_evolution.sql` | Table evolution | ✅ Applied |
| `036_fix_idempotency_key_length.sql` | Idempotency fix | ✅ Applied |
| `037_create_player_sessions.sql` | Player sessions | ✅ Applied |

---

## 🎯 CRITICAL PATHS INDEX

### **Game Creation Flow**
```
POST /api/rooms → Create room
POST /api/rooms/:id/join → Claim seat
POST /api/games → Create game
POST /api/games/:id/start-hand → Start hand
```

### **State Recovery Flow**
```
GET /api/rooms/:id/hydrate → Fetch game state
→ Extract hole cards
→ Render on frontend
```

### **Player Action Flow**
```
POST /api/games/:id/actions → Process action
→ Validate action
→ Update game state
→ Broadcast via Socket.IO
```

---

## 📚 DOCUMENTATION FILES INDEX

### **Root Documentation**

| File | Purpose | Status |
|------|---------|--------|
| `00_START_HERE.md` | Master index | ✅ Active |
| `01_GOALS_AND_FEATURES.md` | Feature roadmap | ✅ Active |
| `02_CURRENT_STATE_ANALYSIS.md` | Current state | ✅ Active |
| `03_HISTORY_AND_FAILURES.md` | History | ✅ Active |
| `04_COMMANDMENTS_AND_PATH_FORWARD.md` | Principles | ✅ Active |
| `05_COMPLETE_FILE_DIRECTORY.md` | File directory | ✅ Active |
| `06_SYSTEM_ARCHITECTURE.md` | Architecture | ✅ Active |
| `DEEP_INDEX.md` | Deep index | ✅ Active |
| `COMPREHENSIVE_INDEX.md` | This file | ✅ Active |
| `PLAN.md` | Current plan | ✅ Active |
| `THE_TEN_COMMANDMENTS.md` | Principles | ✅ Active |

---

## 🔍 SEARCH PATTERNS

### **Find All Endpoints**
```bash
grep -r "router\.(get|post|put|delete|patch)" routes/
```

### **Find All Socket Events**
```bash
grep -r "socket\.on\|socket\.emit\|io\.to" websocket/ public/
```

### **Find All TypeScript Classes**
```bash
grep -r "export class" src/
```

### **Find All Database Queries**
```bash
grep -r "db\.query\|await.*query" routes/ services/
```

---

## 📊 FILE SIZE STATISTICS

### **Largest Files**

| File | Lines | Purpose |
|------|-------|---------|
| `sophisticated-engine-server.js` | ~1,081 | Main server |
| `routes/rooms.js` | 1,955 | Rooms router |
| `routes/games.js` | 997 | Games router |
| `routes/social.js` | 1,416 | Social router |
| `routes/game-engine-bridge.js` | 1,604 | Engine bridge |
| `public/pages/play.html` | 2,707 | Lobby page |
| `public/poker-table-zoom-lock.html` | 2,170 | Main table |
| `public/css/pokergeek.css` | 3,023 | Global styles |
| `src/core/engine/game-state-machine.ts` | ~1,200 | State machine |
| `src/core/models/game-state.ts` | ~478 | Game state model |

---

## 🎯 QUICK REFERENCE

### **Most Important Files**
1. `sophisticated-engine-server.js` - Entry point
2. `routes/rooms.js` - Room management
3. `routes/games.js` - Game management
4. `public/poker-table-zoom-lock.html` - Main UI
5. `src/core/engine/game-state-machine.ts` - Game logic

### **Most Critical Endpoints**
1. `GET /api/rooms/:id/hydrate` - State recovery
2. `POST /api/games/:id/start-hand` - Start hand
3. `POST /api/games/:id/actions` - Player actions
4. `POST /api/rooms/:id/join` - Claim seat

### **Most Critical Socket Events**
1. `hand_started` - New hand begins
2. `player_action` - Player acted
3. `action_required` - Your turn
4. `seat_update` - Seats changed

---

## 🔧 FUNCTION & METHOD INDEX

### **Core Engine Classes & Methods**

#### **GameStateMachine** (`src/core/engine/game-state-machine.ts`)
- `processAction(action: GameAction): StateTransitionResult` - Process game action
- `startHand(): StateTransitionResult` - Begin new hand
- `advanceStreet(): StateTransitionResult` - Move to next betting round
- `endHand(): StateTransitionResult` - Complete hand
- `pauseGame(): StateTransitionResult` - Pause game
- `resumeGame(): StateTransitionResult` - Resume game

#### **BettingEngine** (`src/core/engine/betting-engine.ts`)
- `validateAction(action: BettingAction, gameState: GameStateModel): ValidationResult` - Validate action
- `calculateMinRaise(gameState: GameStateModel): Chips` - Calculate minimum raise
- `calculateMaxRaise(player: PlayerModel, gameState: GameStateModel): Chips` - Calculate maximum raise
- `processAction(action: BettingAction, gameState: GameStateModel): GameStateModel` - Process betting action

#### **HandEvaluator** (`src/core/engine/hand-evaluator.ts`)
- `evaluateHand(cards: Card[]): HandRank` - Evaluate hand strength
- `compareHands(hand1: HandRank, hand2: HandRank): number` - Compare two hands
- `determineWinners(players: PlayerModel[], board: Card[]): WinnerResult[]` - Find winners

#### **PotManager** (`src/core/engine/pot-manager.ts`)
- `calculatePots(gameState: GameStateModel): Pot[]` - Calculate main + side pots
- `distributePots(pots: Pot[], winners: WinnerResult[]): PotDistribution[]` - Distribute pots

#### **TurnManager** (`src/core/engine/turn-manager.ts`)
- `getNextPlayer(gameState: GameStateModel): UUID | null` - Get next to act
- `calculateTurnOrder(gameState: GameStateModel): TurnOrder[]` - Calculate action order
- `getTurnInfo(gameState: GameStateModel): TurnInfo` - Get current turn info

#### **RoundManager** (`src/core/engine/round-manager.ts`)
- `processBettingRound(gameState: GameStateModel): RoundResult` - Process entire round
- `checkRoundComplete(gameState: GameStateModel): boolean` - Check if round finished

#### **ActionValidator** (`src/core/engine/action-validator.ts`)
- `validateAction(action: ActionType, amount: Chips, gameState: GameStateModel, playerId: UUID): ActionValidationResult` - Validate action
- `getLegalActions(gameState: GameStateModel, playerId: UUID): ActionType[]` - Get available actions

#### **GameStateModel** (`src/core/models/game-state.ts`)
- `addPlayer(player: PlayerModel): void` - Add player to game
- `removePlayer(playerId: UUID): void` - Remove player
- `serialize(): string` - Convert to JSON
- `deserialize(data: string): GameStateModel` - Load from JSON
- `createEmptyHandState(): HandState` - Initialize hand state
- `createEmptyBettingRound(): BettingRoundState` - Initialize betting round
- `createEmptyPot(): PotState` - Initialize pot

#### **PlayerModel** (`src/core/models/player.ts`)
- `addChips(amount: Chips): void` - Add chips
- `removeChips(amount: Chips): void` - Remove chips
- `bet(amount: Chips): void` - Place bet
- `fold(): void` - Fold hand
- `goAllIn(): void` - Go all-in

#### **Deck** (`src/core/card/deck.ts`)
- `shuffle(): void` - Fisher-Yates shuffle
- `deal(): Card | null` - Deal card
- `reset(): void` - Reset deck
- `remaining(): number` - Cards remaining

#### **Card** (`src/core/card/card.ts`)
- `toString(): string` - Convert to string (e.g., "C4")
- `equals(other: Card): boolean` - Compare cards
- `getRank(): Rank` - Get rank
- `getSuit(): Suit` - Get suit

---

### **Backend Route Functions**

#### **routes/rooms.js**
- `hydrate(roomId, userId)` - State recovery (lines 377-653)
- `claimSeat(roomId, userId, seatIndex, nickname)` - Claim seat (lines 240-332)
- `createRoom(name, blinds, buyIn, maxPlayers, isPrivate, hostUserId)` - Create room (lines 47-123)
- `approvePlayer(roomId, playerId, hostUserId)` - Approve lobby player (lines 833-894)
- `rejectPlayer(roomId, playerId, hostUserId)` - Reject lobby player (lines 895-957)
- `kickPlayer(roomId, targetUserId, hostUserId)` - Kick player (lines 1165-1245)
- `updateChips(roomId, userId, amount, hostUserId)` - Update chips (lines 1754-1829)
- `pauseGame(roomId, hostUserId)` - Pause game (lines 1830-1891)
- `resumeGame(roomId, hostUserId)` - Resume game (lines 1892-1952)

#### **routes/games.js**
- `createGame(roomId, smallBlind, bigBlind, maxPlayers, hostUserId)` - Create game (lines 14-118)
- `startHand(gameId, roomId)` - Start poker hand (lines 295-640)
- `processAction(gameId, playerId, actionType, amount)` - Process action (lines 641-996)
- `getLegalActions(gameId, playerId)` - Get legal actions (lines 249-294)

#### **routes/auth.js**
- `register(email, password)` - Register user (lines 22-32)
- `login(email, password)` - Login user (lines 33-44)
- `syncUser(userId, email)` - Sync Supabase user (lines 45-118)
- `checkUsername(username)` - Check availability (lines 119-162)
- `setUsername(userId, username)` - Set username (lines 163-257)

#### **routes/social.js**
- `checkUsername(username)` - Check username (lines 62-102)
- `setUsername(userId, username)` - Set username (lines 103-154)
- `changeUsername(userId, newUsername)` - Change username (lines 155-243)
- `getProfile(userId)` - Get profile (lines 277-324)
- `updateProfile(userId, data)` - Update profile (lines 325-366)
- `getFriends(userId)` - Get friends (lines 501-547)
- `sendFriendRequest(fromUserId, toUserId)` - Send request (lines 548-633)
- `acceptFriendRequest(requestId, userId)` - Accept request (lines 663-721)
- `rejectFriendRequest(requestId, userId)` - Reject request (lines 722-747)
- `removeFriend(userId, friendId)` - Remove friend (lines 748-775)
- `getAnalytics(userId)` - Get analytics (lines 892-1090)

---

### **Services Functions**

#### **services/session-service.js**
- `getOrCreateSession(userId)` - Get or create session
- `getUserSeat(userId)` - Get user's seat
- `bindSeat(userId, roomId, seatIndex)` - Bind user to seat
- `releaseSeat(userId)` - Release seat
- `markPlayerAway(userId)` - Mark player away
- `heartbeat(userId)` - Keep session alive

#### **services/player-identity-service.js**
- `getStablePlayerId(userId, roomId)` - Get stable player ID
- `createPlayerSession(userId, roomId, seatIndex)` - Create session

#### **services/game-state-hydrator.js**
- `hydrateGameState(roomId, userId)` - Hydrate game state
- `extractPlayerState(gameState, userId)` - Extract player state

#### **src/services/timer-service.js**
- `startTurn(gameId, roomId, playerId)` - Start turn timer
- `getTurnTimer(gameId, roomId)` - Get remaining time
- `autoFold(gameId, roomId, playerId)` - Auto-fold on timeout

---

### **WebSocket Functions**

#### **websocket/socket-handlers.js**
- `setupSocketIO(io, getDb)` - Setup Socket.IO handlers
- `broadcastSeats(io, getDb, roomId)` - Broadcast seat updates
- `handleAuthenticate(socket, data)` - Handle authentication
- `handleJoinRoom(socket, data)` - Handle room join
- `handleDisconnect(socket)` - Handle disconnect

---

### **Frontend Functions**

#### **poker-table-zoom-lock.html**
- `PokerTableGrid.initWithBackend()` - Initialize backend connection
- `PokerTableGrid.fetchHydration()` - Fetch game state
- `PokerTableGrid.renderFromHydration(data)` - Render game state
- `PokerTableGrid.renderSeats()` - Render seat positions
- `PokerTableGrid.handleAction(action, amount)` - Handle player action
- `PokerTableGrid.updatePot(amount)` - Update pot display
- `PokerTableGrid.showCards(cards)` - Show hole cards
- `PokerTableGrid.hideCards()` - Hide hole cards
- `PokerTableGrid.initHostControls()` - Initialize host controls

#### **public/js/auth-manager.js**
- `signInWithGoogle()` - Google OAuth
- `signInAsGuest()` - Guest authentication
- `getCurrentUser()` - Get logged-in user
- `signOut()` - Logout
- `getAuthHeaders()` - Get auth headers

#### **public/js/sequence-tracker.js**
- `setSequence(seq)` - Set sequence number
- `createHandler(callback)` - Create sequenced handler
- `shouldProcess(seq)` - Check if should process

---

## 🔄 UPDATE LOG

- **2025-11-06**: Initial comprehensive index created
  - Indexed all routes, endpoints, Socket.IO events
  - Indexed TypeScript classes and interfaces
  - Indexed database tables
  - Indexed frontend files
  - Indexed services and dependencies
  - Added function and method index

---

**This index is a living document. Update it as the codebase evolves.**

