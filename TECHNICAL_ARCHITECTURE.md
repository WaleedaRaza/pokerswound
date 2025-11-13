# Technical Architecture Documentation

**Last Updated:** Current Session  
**Purpose:** Complete system architecture reference for poker table implementation  
**Status:** Production System Documentation

---

## Table of Contents

1. [API & Routes Documentation](#1-api--routes-documentation)
2. [Database Schema](#2-database-schema)
3. [WebSocket Event System](#3-websocket-event-system)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Critical Data Flows](#5-critical-data-flows)
6. [Architectural Truths & Invariants](#6-architectural-truths--invariants)
7. [Known Issue Patterns](#7-known-issue-patterns)
8. [File Reference Map](#8-file-reference-map)

---

## 1. API & Routes Documentation

### 1.1 Active Routes

#### Game Engine Routes (`routes/game-engine-bridge.js`)

**Primary game API - 14 endpoints**

| Method | Endpoint | Purpose | Auth |
|--------|----------|---------|------|
| GET | `/api/engine/hydrate/:roomId/:userId` | Get current game state + private cards | None |
| POST | `/api/engine/action` | Process player action (fold/call/raise) | None |
| POST | `/api/engine/claim-seat` | Claim a seat at table | None |
| GET | `/api/engine/seats/:roomId` | Get seat data | None |
| POST | `/api/engine/deal-cards` | Start new hand (host only) | None |
| GET | `/api/engine/room/:roomId` | Get room info | None |
| GET | `/api/engine/game/:roomId` | Get game state | None |
| GET | `/api/engine/my-cards/:roomId/:userId` | Get player's hole cards | None |
| POST | `/api/engine/showdown-action` | Show/muck cards at showdown | None |
| POST | `/api/engine/next-hand` | Start next hand | Host |
| GET | `/api/engine/host-controls/:roomId/:userId` | Get host control state | Host |
| POST | `/api/engine/host-controls/update-stack` | Update player stack | Host |
| POST | `/api/engine/host-controls/kick-player` | Kick player from room | Host |
| GET | `/api/engine/health` | Health check | None |

#### Room Routes (`routes/rooms.js`)

**Room management - 22 endpoints**

Key endpoints:
- `GET /api/rooms` - List active rooms
- `POST /api/rooms` - Create new room (auth required, 5-room limit)
- `GET /api/rooms/:id` - Get room details
- `POST /api/rooms/:id/join` - Join room
- `GET /api/rooms/:id/seats` - Get seats
- `POST /api/rooms/:id/approve-seat` - Approve seat request (host)
- `POST /api/rooms/:id/reject-seat` - Reject seat request (host)

#### Auth Routes (`routes/auth.js`)

**Authentication - 3 endpoints**

- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user

#### Other Routes

- `routes/social.js` - Social features (friends, clubs)
- `routes/pages.js` - Page serving (13 routes)
- `routes/v2.js` - API v2 (3 endpoints)
- `routes/games.js` - **INACTIVE** (not used by UI)

### 1.2 Request/Response Schemas

#### POST `/api/engine/action`

**Request Body:**
```json
{
  "roomId": "uuid",
  "userId": "uuid",
  "action": "FOLD" | "CHECK" | "CALL" | "RAISE" | "ALL_IN",
  "amount": number,  // Required for RAISE
  "actionSeq": number  // Optional: expected sequence number
}
```

**Response (200):**
```json
{
  "success": true,
  "gameState": {
    // Full game state object
  },
  "needsProgressiveReveal": boolean  // If all-in runout
}
```

**Response (400):**
```json
{
  "error": "string",
  "details": "string"  // Optional
}
```

**Error Codes:**
- `400` - Invalid action, missing fields, not player's turn
- `404` - Room not found, no active game
- `500` - Database unavailable

#### GET `/api/engine/hydrate/:roomId/:userId`

**Path Parameters:**
- `roomId` - UUID
- `userId` - UUID

**Response (200):**
```json
{
  "hasActiveGame": boolean,
  "gameState": {
    // Full game state if active
  },
  "myCards": ["Ah", "Kd"],  // Private hole cards
  "isMyTurn": boolean,
  "callAmount": number,
  "canCheck": boolean,
  "canRaise": boolean,
  "roomStatus": "WAITING" | "ACTIVE"
}
```

**Response (404):**
```json
{
  "error": "Room not found"
}
```

#### POST `/api/engine/deal-cards`

**Request Body:**
```json
{
  "roomId": "uuid",
  "userId": "uuid",
  "sandboxConfig": {}  // Optional: for testing
}
```

**Response (200):**
```json
{
  "success": true,
  "gameState": {
    // New hand state
  },
  "handNumber": number
}
```

**Error Codes:**
- `403` - Not host
- `400` - Missing required fields
- `404` - Room not found

### 1.3 Data Flow Paths

#### Player Action Flow

```
1. Frontend: performAction(action, amount)
   File: public/minimal-table.html:6454
   ↓ POST /api/engine/action
   
2. Route Handler
   File: routes/game-engine-bridge.js:1503
   - Validates request (roomId, userId, action)
   - Loads current gameState from DB (game_states.current_state)
   - Calls MinimalBettingAdapter.processAction()
   
3. Adapter Layer
   File: src/adapters/minimal-engine-bridge.js:36
   - Delegates to game-logic.processAction()
   
4. Game Logic Orchestrator
   File: src/adapters/game-logic.js:35
   - Validates action (betting-logic.validateAction)
   - Applies action (betting-logic.applyAction)
   - Checks round complete (turn-logic.isBettingRoundComplete)
   - Handles fold win / showdown / all-in runout
   - Returns updated state
   
5. Database Update
   File: routes/game-engine-bridge.js:1656
   - UPDATE game_states SET current_state = ...
   - Persists chips to room_seats (if hand complete)
   
6. WebSocket Broadcast
   File: routes/game-engine-bridge.js:1772
   - io.to(`room:${roomId}`).emit('action_processed', state)
   
7. Client Update
   File: public/minimal-table.html:4551
   - socket.on('action_processed', handler)
   - Updates local gameState
   - Re-renders UI (pot, chips, buttons, seats)
```

#### Hydration Flow (Initial Load / Reconnect)

```
1. Client Connects
   File: public/minimal-table.html (socket connection)
   - Connects to Socket.IO server
   - Emits 'join_room' event
   
2. Request Hydration
   GET /api/engine/hydrate/:roomId/:userId
   
3. Server Builds Response
   File: routes/game-engine-bridge.js:22
   - Loads room from DB (rooms table)
   - Loads game_states.current_state (JSONB)
   - Loads player's hole cards (private, filtered)
   - Calculates action buttons state
   - Returns: { gameState, myCards, isMyTurn, callAmount, ... }
   
4. Client Renders
   File: public/minimal-table.html
   - Renders all seats (from gameState.players)
   - Shows hole cards (only mine, from myCards)
   - Displays community cards (from gameState.communityCards)
   - Updates pot (from gameState.pot)
   - Enables/disables buttons (from isMyTurn, callAmount)
```

---

## 2. Database Schema

### 2.1 Core Tables

#### `game_states`

**Purpose:** Stores entire game state as JSONB

| Column | Type | Description |
|--------|------|-------------|
| `id` | text (PK) | Game state ID (UUID string) |
| `room_id` | uuid (FK) | References rooms.id |
| `host_user_id` | text | Host user ID |
| `status` | text | 'waiting' \| 'active' \| 'paused' \| 'completed' \| 'deleted' |
| `current_state` | jsonb | **Complete game state object** |
| `hand_number` | integer | Current hand number |
| `dealer_position` | integer | Dealer button seat index |
| `total_pot` | integer | Total pot size (for quick access) |
| `version` | integer | State version (for optimistic locking) |
| `created_at` | timestamp | Creation timestamp |
| `updated_at` | timestamp | Last update timestamp |
| `seq` | integer | Sequence number (for ordering) |

**Key Constraint:** `current_state` is the single source of truth for game state.

#### `rooms`

**Purpose:** Room configuration and metadata

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Room ID |
| `name` | varchar | Room name |
| `invite_code` | varchar | Unique invite code |
| `small_blind` | integer | Small blind amount |
| `big_blind` | integer | Big blind amount |
| `min_buy_in` | integer | Minimum buy-in |
| `max_buy_in` | integer | Maximum buy-in |
| `max_players` | integer | Max players (default 9) |
| `host_user_id` | uuid (FK) | References user_profiles.id |
| `status` | varchar | 'WAITING' \| 'ACTIVE' \| 'COMPLETED' |
| `game_id` | uuid (FK) | References game_states.id (when active) |
| `is_private` | boolean | Private room flag |
| `created_at` | timestamp | Creation timestamp |

**Key Constraints:**
- `game_id` must point to valid `game_states.id` when `status = 'ACTIVE'`
- Host limit: 5 rooms per user (enforced in backend)

#### `room_seats`

**Purpose:** Player seat assignments

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Seat record ID |
| `room_id` | uuid (FK) | References rooms.id |
| `seat_index` | integer | Seat position (0-9) |
| `user_id` | uuid (FK) | References user_profiles.id |
| `chips_in_play` | bigint | Current chip stack |
| `status` | varchar | 'ACTIVE' \| 'SITTING_OUT' \| 'RESERVED' |
| `nickname` | varchar | Display name |
| `joined_at` | timestamp | Join timestamp |
| `left_at` | timestamp | Leave timestamp (NULL if active) |
| `is_spectator` | boolean | Spectator flag |

**Key Constraints:**
- Unique constraint: `(room_id, seat_index)` where `left_at IS NULL`
- Max 1 seat per user per room
- Seat indices: 0-9 (10 seats max)

#### `chips_transactions`

**Purpose:** Audit trail for all chip movements

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Transaction ID |
| `user_id` | uuid (FK) | References user_profiles.id |
| `transaction_type` | varchar | 'BUY_IN' \| 'REBUY' \| 'CASHOUT' \| 'WIN' \| 'LOSS' \| 'BLIND' \| 'ANTE' \| 'ADMIN_ADJUST' \| 'BONUS' \| 'RAKEBACK' |
| `amount` | bigint | Transaction amount |
| `balance_before` | bigint | Balance before transaction |
| `balance_after` | bigint | Balance after transaction |
| `room_id` | uuid (FK) | References rooms.id |
| `game_id` | uuid | Game state ID |
| `hand_id` | uuid | Hand history ID |
| `description` | text | Transaction description |
| `metadata` | jsonb | Additional data |
| `processed_at` | timestamp | Processing timestamp |

**Key Constraint:** `balance_before + amount = balance_after` (enforced by CHECK constraint)

#### `hand_history`

**Purpose:** Historical record of completed hands

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid (PK) | Hand record ID |
| `game_id` | varchar | Game state ID |
| `room_id` | uuid (FK) | References rooms.id |
| `hand_number` | integer | Hand number in game |
| `pot_size` | bigint | Final pot size |
| `community_cards` | array | Board cards |
| `winners` | jsonb | Winner data |
| `player_actions` | jsonb | Action history |
| `final_stacks` | jsonb | Final chip stacks |
| `starting_stacks` | jsonb | Starting chip stacks |
| `dealer_position` | integer | Dealer seat |
| `sb_position` | integer | Small blind seat |
| `bb_position` | integer | Big blind seat |
| `created_at` | timestamp | Completion timestamp |

### 2.2 GameState JSONB Structure

The `game_states.current_state` column contains the complete game state:

```javascript
{
  // Hand metadata
  handNumber: number,
  street: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN',
  status: 'IN_PROGRESS' | 'COMPLETED',
  
  // Pot tracking
  pot: number,                    // Total pot (all bets)
  mainPot: number,                // Main pot only
  sidePots: Array<{               // Side pots (if any)
    amount: number,
    level: number,
    previousLevel: number,
    eligiblePlayerIds: string[],
    eligibleSeats: number[],
    isMainPot: boolean,
    capAmount: number
  }>,
  totalPot: number,               // Sum of all pots
  
  // Betting state
  currentBet: number,             // Highest bet this street
  minRaise: number,               // Minimum raise amount
  lastRaiseSize: number,          // Size of last raise
  lastAggressor: string | null,    // userId of last raiser
  reopensAction: boolean,         // Whether action reopened
  
  // Player state
  players: Array<{
    userId: string,
    seatIndex: number,
    chips: number,                // Remaining chips
    bet: number,                  // Cumulative bet (all streets)
    betThisStreet: number,        // Bet this street only
    holeCards: string[],          // Private cards (2 cards)
    folded: boolean,
    status: 'ACTIVE' | 'ALL_IN' | 'FOLDED',
    allInAmount: number | null    // Amount when went all-in
  }>,
  
  // Turn tracking
  currentActorSeat: number | null,  // Seat index of current actor
  dealerPosition: number,           // Button position
  smallBlindPosition: number,
  bigBlindPosition: number,
  sbPosition: number,               // Alias for smallBlindPosition
  bbPosition: number,                // Alias for bigBlindPosition
  
  // Board
  communityCards: string[],       // Board cards (0-5)
  deck: string[],                 // Remaining deck (shuffled)
  
  // History
  actionHistory: Array<{
    userId: string,
    action: string,
    amount: number,
    street: string,
    timestamp: string
  }>,
  
  // Winners (if completed)
  winners: Array<{
    userId: string,
    amount: number,
    hand: string,
    handRank: number
  }>,
  
  // Metadata
  startingTotalChips: number,     // For chip conservation validation
  originalStacks: Array<{         // Starting stacks per player
    userId: string,
    seatIndex: number,
    startingChips: number
  }>,
  actionSeq: number,              // Sequence counter (for ordering)
  bigBlind: number,               // Big blind amount
  smallBlind: number,             // Small blind amount
  
  // All-in runout tracking
  needsProgressiveReveal: boolean,  // If all-in runout needed
  allInRunoutStreets: Array<{       // Streets to reveal progressively
    street: string,
    cards: string[]
  }>
}
```

### 2.3 Key Invariants

**Schema-level rules that must never be violated:**

1. **Room-Game Relationship:**
   - `rooms.game_id` → Must point to valid `game_states.id` when `status = 'ACTIVE'`
   - Only one active game per room

2. **Seat Constraints:**
   - `room_seats.user_id` → Max 1 seat per user per room
   - Seat indices: 0-9 only, no duplicates in same room
   - `left_at IS NULL` for active seats

3. **Chip Conservation:**
   - `game_states.current_state` → Must always pass chip conservation validation
   - `chips_transactions.balance_before + amount = balance_after` (CHECK constraint)

4. **Game State Integrity:**
   - `game_states.current_state` → Must be valid JSONB
   - `game_states.total_pot` → Must match sum of pots in `current_state`
   - `game_states.status` → Must be one of: 'waiting', 'active', 'paused', 'completed', 'deleted'

5. **Hand History:**
   - `hand_history.pot_size` → Must match final pot from game state
   - `hand_history.final_stacks` → Must match player chips after distribution

---

## 3. WebSocket Event System

### 3.1 Server → Client Events

#### `action_processed`

**Trigger:** After any player action is processed

**Payload:**
```json
{
  "gameId": "uuid",
  "playerId": "uuid",
  "action": "FOLD" | "CHECK" | "CALL" | "RAISE" | "ALL_IN",
  "amount": number,
  "gameState": {
    // Full updated game state
  },
  "seq": number,
  "timestamp": "ISO string"
}
```

**Purpose:** Notify all players in room of action, update UI

**Client Handler:** `public/minimal-table.html:4551`

---

#### `hand_started`

**Trigger:** When new hand begins (after deal-cards)

**Payload:**
```json
{
  "handNumber": number,
  "dealerPosition": number,
  "smallBlindPosition": number,
  "bigBlindPosition": number,
  "gameState": {
    // New hand state
  },
  "timestamp": "ISO string"
}
```

**Purpose:** Notify players of new hand, reset UI

**Client Handler:** `public/minimal-table.html:4445`

---

#### `hand_complete`

**Trigger:** After showdown/fold win completes

**Payload:**
```json
{
  "winners": [
    {
      "userId": "uuid",
      "amount": number,
      "hand": "string",
      "handRank": number
    }
  ],
  "totalPot": number,
  "gameState": {
    // Completed state
  },
  "timestamp": "ISO string"
}
```

**Purpose:** Show results, update chips, prepare for next hand

**Client Handler:** `public/minimal-table.html:4437`

---

#### `street_reveal`

**Trigger:** When dealing flop/turn/river (or all-in runout)

**Payload:**
```json
{
  "street": "FLOP" | "TURN" | "RIVER",
  "communityCards": ["Ah", "Kd", "Qc"],
  "roomId": "uuid",
  "message": "Dealing FLOP...",
  "timestamp": "ISO string"
}
```

**Purpose:** Animate card dealing, update board

**Client Handler:** `public/minimal-table.html:4519`

---

#### `seat_update`

**Trigger:** When seat changes (claim, leave, kick)

**Payload:**
```json
{
  "roomId": "uuid",
  "seatIndex": number,
  "userId": "uuid",
  "action": "claimed" | "left" | "kicked",
  "seats": [
    // Array of all seats (optional)
  ]
}
```

**Purpose:** Update seat display, show/hide players

**Client Handler:** `public/minimal-table.html:4429`

---

#### `showdown_action`

**Trigger:** When player shows/mucks at showdown

**Payload:**
```json
{
  "userId": "uuid",
  "action": "SHOW" | "MUCK",
  "cards": ["Ah", "Kd"],  // Only if SHOW
  "timestamp": "ISO string"
}
```

**Purpose:** Update showdown UI, reveal cards

**Client Handler:** `public/minimal-table.html:4667`

---

#### Other Events

- `player_busted` - Player ran out of chips
- `you_busted` - Current user busted
- `game_ended` - Game completed (all players busted)
- `blinds_updated` - Host changed blinds
- `player_kicked` - Host kicked player
- `seat_request_pending` - Seat request created
- `seat_request_resolved` - Seat request approved/rejected

### 3.2 Client → Server Events

#### `join_room`

**Payload:**
```json
{
  "roomId": "uuid",
  "userId": "uuid"
}
```

**Purpose:** Subscribe to room events

**Server Handler:** `websocket/socket-handlers.js:47`

---

#### `authenticate`

**Payload:**
```json
{
  "userId": "uuid",
  "roomId": "uuid"
}
```

**Purpose:** Authenticate socket connection

**Server Handler:** `websocket/socket-handlers.js:17`

---

#### `heartbeat`

**Payload:**
```json
{
  "userId": "uuid"
}
```

**Purpose:** Keep seat binding alive (prevent timeout)

**Server Handler:** `websocket/socket-handlers.js:84`

### 3.3 Event Flow Architecture

**Pattern: HTTP Mutates, WebSocket Broadcasts**

```
1. Client sends HTTP POST request (mutation)
   POST /api/engine/action
   
2. Server validates and updates database
   - UPDATE game_states SET current_state = ...
   - Persist chips to room_seats
   
3. Server broadcasts WebSocket event to room
   io.to(`room:${roomId}`).emit('action_processed', state)
   
4. All connected clients receive event
   - socket.on('action_processed', handler)
   
5. Clients update UI from event payload
   - Update gameState
   - Re-render affected components
   - Update pot, chips, buttons, seats
```

**Benefits:**
- Prevents race conditions (only one writer: HTTP handler)
- Multiple readers (WebSocket listeners)
- No ad-hoc WS mutations (all mutations via HTTP)
- Single source of truth (database)

### 3.4 Room Channel Pattern

**Room Channels:**
```
Format: `room:{roomId}`
Example: `room:550e8400-e29b-41d4-a716-446655440000`
```

**Server Broadcasting:**
```javascript
io.to(`room:${roomId}`).emit('event_name', payload);
```

**Client Subscription:**
```javascript
socket.on('join_room', ({ roomId, userId }) => {
  socket.join(`room:${roomId}`);
});

socket.on('event_name', (data) => {
  // Handle event
});
```

### 3.5 Sequence Numbers

**Purpose:** Prevent stale/out-of-order updates

**Server Implementation:**
```javascript
// Increment sequence on each action
gameState.actionSeq = (gameState.actionSeq || 0) + 1;

// Broadcast with sequence
io.emit('action_processed', {
  seq: gameState.actionSeq,
  ...payload
});
```

**Client Implementation:**
```javascript
let currentSeq = 0;

socket.on('action_processed', (data) => {
  if (data.seq <= currentSeq) {
    return; // Ignore stale event
  }
  currentSeq = data.seq;
  updateUI(data);
});
```

**Benefits:**
- Prevents duplicate processing
- Handles reconnection gracefully
- Ensures events processed in order

---

## 4. Frontend Architecture

### 4.1 Component Structure

#### Current State (Monolith)

**File:** `public/minimal-table.html` (9,256 lines)

**Contains:**
- All game logic inline
- WebSocket handlers
- UI rendering functions
- Action handling
- State management

**Key Functions:**
- `performAction(action, amount)` - Send action to server
- `updateActionButtons(gameState)` - Update button states
- `updateSeatChips(players)` - Update chip displays
- `renderCommunityCards(cards)` - Render board cards
- `updatePotDisplay(gameState)` - Update pot display
- `updateBetIndicators(gameState)` - Show bet amounts

#### Emerging Component Structure

**Location:** `public/js/components/`

**Components:**
- `ActionButtons.js` (144 lines) - Action button UI
- `PotDisplay.js` - Pot display component (planned)
- `SeatComponent.js` - Seat rendering (planned)
- `CommunityCards.js` - Board cards (planned)

**Helper Modules:**
- `TableRenderer.js` (233 lines) - Table rendering logic
- `game-state-client.js` (314 lines) - State management helper
- `poker-table-v2.js` (336 lines) - Alternative table implementation

### 4.2 Key Frontend Functions

#### Action Handling

**Function:** `performAction(action, amount)`

**Location:** `public/minimal-table.html:6454`

**Purpose:** Send action to server

**Flow:**
1. Validates spectator status
2. Sets debounce lock (500ms)
3. POST `/api/engine/action`
4. Waits for WebSocket update (no immediate response handling)
5. Releases debounce lock

**Debouncing:** Prevents double-clicks, duplicate actions

---

#### Action Button Updates

**Function:** `updateActionButtons(gameState)`

**Location:** `public/minimal-table.html:6513`

**Purpose:** Enable/disable buttons based on turn

**Logic:**
- Finds `myPlayer` from `gameState.players`
- Checks `isMyTurn` (currentActorSeat === myPlayer.seatIndex)
- Calculates `callAmount` using `betThisStreet` (not `bet`)
- Sets button text: "CHECK" if callAmount === 0, else "CALL $X"
- Sets onclick handlers: `performAction('CHECK', 0)` or `performAction('CALL', callAmount)`
- Hides buttons if player has 0 chips or is ALL_IN

**Critical:** Uses `betThisStreet` (street-scoped), not `bet` (cumulative)

---

#### State Updates

**WebSocket Handler:** `socket.on('action_processed', (data) => { ... })`

**Location:** `public/minimal-table.html:4551`

**Purpose:** Update UI from server state

**Actions:**
1. Updates local `gameState` from `data.gameState`
2. Calls `updateUI(gameState)` to re-render
3. Updates pot display
4. Updates player chips
5. Updates action buttons
6. Highlights current actor
7. Updates bet indicators

**Principle:** Never guess state - always render from server truth

### 4.3 UI State Management

#### State Flow

**1. Initial Load:**
```
GET /api/engine/hydrate/:roomId/:userId
  → Returns full game state + private cards
  → Renders entire table
  → Sets up WebSocket listeners
```

**2. Action Updates:**
```
socket.on('action_processed', (data) => {
  → Partial state update
  → Re-render affected components
  → Update pot, chips, buttons, seats
})
```

**3. Reconnect:**
```
socket.on('disconnect', () => {
  → Auto-hydrate on reconnect
  → Fetches latest state
  → Prevents desync
})
```

#### State Rendering Rules

**Principles:**
- Never guess state from local memory
- Always render from server truth
- Use sequence numbers to prevent stale updates
- Hydrate on disconnect/reconnect
- Server is single source of truth

**Implementation:**
```javascript
// Always read from gameState, never cache
function updateUI(gameState) {
  // Render from gameState.players
  // Render from gameState.communityCards
  // Render from gameState.pot
  // Never use local variables for state
}
```

---

## 5. Critical Data Flows

### 5.1 Action Processing Pipeline

**Full pipeline with file locations:**

```
1. USER CLICKS BUTTON
   File: public/minimal-table.html:6454
   Function: performAction(action, amount)
   - Validates spectator status
   - Sets debounce lock

2. HTTP REQUEST
   POST /api/engine/action
   Body: { roomId, userId, action, amount, actionSeq? }

3. ROUTE HANDLER
   File: routes/game-engine-bridge.js:1503
   - Validates request (roomId, userId, action)
   - Loads current gameState from DB
   - Calls MinimalBettingAdapter.processAction()

4. ADAPTER LAYER
   File: src/adapters/minimal-engine-bridge.js:36
   - Delegates to game-logic.processAction()

5. GAME LOGIC ORCHESTRATOR
   File: src/adapters/game-logic.js:35
   - Validates action (betting-logic.validateAction)
   - Applies action (betting-logic.applyAction)
   - Checks round complete (turn-logic.isBettingRoundComplete)
   - Handles fold win / showdown / all-in runout
   - Returns updated state

6. DATABASE UPDATE
   File: routes/game-engine-bridge.js:1656
   - UPDATE game_states SET current_state = ...
   - Persists chips to room_seats (if hand complete)

7. WEBSOCKET BROADCAST
   File: routes/game-engine-bridge.js:1772
   - io.to(`room:${roomId}`).emit('action_processed', state)

8. CLIENT UPDATE
   File: public/minimal-table.html:4551
   - socket.on('action_processed', handler)
   - Updates local state
   - Re-renders UI
```

### 5.2 Hydration Flow

**Hydration (initial load / reconnect):**

```
1. CLIENT CONNECTS
   File: public/minimal-table.html (socket connection)
   - Connects to Socket.IO server
   - Emits 'join_room' event

2. REQUEST HYDRATION
   GET /api/engine/hydrate/:roomId/:userId

3. SERVER BUILDS RESPONSE
   File: routes/game-engine-bridge.js:22
   - Loads room from DB (rooms table)
   - Loads game_states.current_state (JSONB)
   - Loads player's hole cards (private, filtered)
   - Calculates action buttons state
   - Returns: { gameState, myCards, isMyTurn, callAmount, ... }

4. CLIENT RENDERS
   File: public/minimal-table.html
   - Renders all seats (from gameState.players)
   - Shows hole cards (only mine, from myCards)
   - Displays community cards (from gameState.communityCards)
   - Updates pot (from gameState.pot)
   - Enables/disables buttons (from isMyTurn, callAmount)
```

### 5.3 Street Progression Flow

**Street change (e.g., PREFLOP → FLOP):**

```
1. TRIGGER
   File: src/adapters/game-logic.js:148
   - isBettingRoundComplete() returns true

2. PROGRESS STREET
   File: src/adapters/turn-logic.js:308
   Function: progressToNextStreet(gameState)
   
   Steps:
   a) Handle uncalled bets (pot-logic.handleUncalledBets)
   b) Calculate side pots (pot-logic.calculateSidePots)
   c) Deal community cards (dealCommunityCardsForStreet)
   d) Reset betting state:
      - betThisStreet = 0 for all players
      - currentBet = 0
      - minRaise = 0
      - lastRaiseSize = 0
      - lastAggressor = null
   e) Reset turn to first actor (turn-logic.resetToFirstActor)
   f) Check if all-in runout needed

3. PERSIST & BROADCAST
   Back in routes/game-engine-bridge.js:
   - UPDATE game_states
   - io.emit('street_reveal', { street, cards })

4. CLIENT ANIMATES
   File: public/minimal-table.html:4519
   - socket.on('street_reveal')
   - Animates card dealing
   - Updates board display
   - Clears bet indicators
```

### 5.4 All-In Runout Flow

**All-in runout (progressive reveal):**

```
1. DETECTION
   File: src/adapters/game-logic.js:149
   - All players who can bet are all-in
   - Sets needsProgressiveReveal = true

2. PROGRESSIVE REVEAL SETUP
   File: routes/game-engine-bridge.js:1568
   - Saves state with progressive reveal flag
   - Sets up setTimeout for each street reveal
   - Delays: FLOP (1.5s), TURN (3.0s), RIVER (4.5s)

3. STREET REVEALS
   File: routes/game-engine-bridge.js:1594
   - io.emit('street_reveal', { street, cards })
   - Each street revealed with delay

4. SHOWDOWN AFTER ALL CARDS
   File: routes/game-engine-bridge.js:1611
   - After all cards revealed (6.5s delay)
   - Calls handleShowdown()
   - Determines winners
   - Emits hand_complete event
```

---

## 6. Architectural Truths & Invariants

### 6.1 Core Principles

#### Principle 1: Server as Source of Truth

**Rule:**
- All game state lives in `game_states.current_state` (JSONB)
- Frontend never calculates game logic
- Frontend renders what server says
- On disconnect: hydrate from server (never guess)

**Implementation:**
- Frontend reads from `gameState` object (from server)
- Never caches state locally
- Always re-render from server state

---

#### Principle 2: HTTP Mutates, WebSocket Broadcasts

**Rule:**
- All state changes via HTTP POST
- WebSocket is read-only (events, not commands)
- Prevents race conditions
- Single writer (HTTP handler), multiple readers (WebSocket listeners)

**Implementation:**
- Actions: `POST /api/engine/action`
- Updates: `socket.on('action_processed')`
- No direct WebSocket mutations

---

#### Principle 3: Chip Conservation

**Rule:**
```
At ALL times: Σ(player_chips) + Σ(pots) = starting_total
```

**Implementation:**
- Validated after every action (`validateChipConservation()`)
- Logged violations
- Never reset chips from DB after action
- `gameState.chips` is source of truth

**Validation Points:**
- After every action
- After uncalled bet handling
- After pot distribution
- At hand completion

---

#### Principle 4: Sequence Numbers

**Rule:**
- Incremented on every mutation
- Broadcast with every event
- Client discards stale (seq <= current)

**Implementation:**
```javascript
// Server
gameState.actionSeq = (gameState.actionSeq || 0) + 1;
io.emit('action_processed', { seq: gameState.actionSeq, ... });

// Client
if (data.seq <= currentSeq) return; // Ignore stale
currentSeq = data.seq;
```

---

#### Principle 5: Bet Scope Separation

**Rule:**
```
player.bet (cumulative):
  - Used for side pot calculation
  - Persists across streets
  - Sum of all bets this hand

player.betThisStreet (street-scoped):
  - Used for UI (call amount)
  - Used for validation (can check?)
  - Resets to 0 on street change
```

**Implementation:**
- Frontend uses `betThisStreet` for call amount calculation
- Backend uses `bet` for side pot calculation
- `betThisStreet` resets in `progressToNextStreet()`

---

### 6.2 State Machine

#### Game States

```
PREFLOP → FLOP → TURN → RIVER → SHOWDOWN → HAND_END
                                               ↓
                                         PREFLOP (new hand)
```

#### Transitions

**PREFLOP → FLOP:**
- Trigger: `isBettingRoundComplete() === true`
- Action: Deal 3 cards, reset betting

**FLOP → TURN:**
- Trigger: `isBettingRoundComplete() === true`
- Action: Deal 1 card, reset betting

**TURN → RIVER:**
- Trigger: `isBettingRoundComplete() === true`
- Action: Deal 1 card, reset betting

**RIVER → SHOWDOWN:**
- Trigger: `isBettingRoundComplete() === true`
- Action: Evaluate hands, distribute pots

**Any → HAND_END:**
- Trigger: Only 1 player left (fold win)
- Action: Award pot, no showdown

**HAND_END → PREFLOP:**
- Trigger: `POST /api/engine/deal-cards` (host action)
- Action: Move button, post blinds, deal cards

---

### 6.3 Global Invariants

**Rules that must never break:**

1. **Chip Conservation:**
   ```
   Sum of all chips (player stacks + committed + pots) never changes
   ```

2. **Action Order:**
   ```
   A player can never act out of turn
   ```

3. **All-In Status:**
   ```
   All-in players cannot act again (chips === 0 && status === 'ALL_IN')
   ```

4. **Folded Players:**
   ```
   Folded players are excluded from all betting & all pots
   ```

5. **Street Advancement:**
   ```
   Street cannot advance unless:
   - All committed amounts match OR
   - Only one player remains
   ```

6. **Side Pots:**
   ```
   Side pots must partition contributions completely
   ```

7. **Showdown:**
   ```
   Showdown uses only board + hole cards
   ```

8. **State Validity:**
   ```
   Engine state must always be one of the legal high-level states
   ```

---

## 7. Known Issue Patterns

### 7.1 Bug Categories

#### Category 1: All-In Runout

**Issue:** Hand doesn't progress when all players who can bet are done

**Root Cause:** Checks "all players all-in" instead of "all players who can BET are all-in"

**Files:**
- `src/adapters/turn-logic.js:106-143`
- `src/adapters/game-logic.js:149-153`

**Example:**
```
P1: $100 all-in (can't act)
P2: $200 (can act, but chooses to just call)
P3: $500 (can act)

Current behavior: Doesn't runout (P2 & P3 have chips)
Expected: Should runout when NO ONE can bet anymore
```

**Fix Strategy:**
- Add `playersWhoCanBet()` helper function
- Check: `chips > 0 && status !== 'ALL_IN'`
- Trigger runout when `playersWhoCanBet.length === 0`

---

#### Category 2: Betting Round Completion

**Issue:** Round doesn't complete when it should (or completes prematurely)

**Root Cause:** Complex completion logic with edge cases

**Files:**
- `src/adapters/turn-logic.js:87-303`

**Example:**
```
P1 all-in, P2 calls → should complete immediately
Current: P2 asked to act again (incorrect)
```

**Fix Strategy:**
- Simplify `isBettingRoundComplete()` logic
- Fix solo player scenario (1 player can bet + others all-in)
- Ensure last aggressor faces action

---

#### Category 3: Pot Display

**Issue:** Pot shows wrong amount after street changes

**Root Cause:** Possibly uncalled bet timing or side pot calculation

**Files:**
- `src/adapters/pot-logic.js:67-175`
- `src/adapters/turn-logic.js:308-449`
- `public/minimal-table.html` (pot display section)

**Example:**
```
After flop → pot shows $300
After turn → pot shows $250 (incorrect, should be $350)
```

**Fix Strategy:**
- Audit pot calculation in `progressToNextStreet()`
- Verify uncalled bets handled before side pot calculation
- Check frontend reads correct pot value

---

#### Category 4: Chip Conservation

**Issue:** Chips disappear or appear

**Root Cause:** Multiple possible leaks (uncalled bets, distributions, resets)

**Files:**
- `src/adapters/pot-logic.js:182-226` (handleUncalledBets)
- `src/adapters/game-logic.js:531-597` (distributePots)
- `routes/game-engine-bridge.js` (stack persistence)

**Example:**
```
Starting: P1=$100, P2=$200, P3=$500 = $800 total
After hand: P1=$0, P2=$150, P3=$600 = $750 total (missing $50)
```

**Fix Strategy:**
- Enable chip conservation validation everywhere
- Fix uncalled bet calculation (use betThisStreet)
- Audit pot distribution logic
- Verify stack persistence at hand end

---

## 8. File Reference Map

### 8.1 Backend - Game Logic

**Location:** `src/adapters/`

| File | Lines | Purpose |
|------|-------|---------|
| `minimal-engine-bridge.js` | 176 | Thin adapter, delegates to modules |
| `game-logic.js` | 597 | Main orchestrator (processAction, handleShowdown, handleAllInRunout) |
| `betting-logic.js` | 348 | Action validation & application (validateAction, applyAction) |
| `pot-logic.js` | 228 | Pot calculation & chip conservation (calculateSidePots, handleUncalledBets) |
| `turn-logic.js` | 369 | Turn rotation & round completion (canPlayerAct, isBettingRoundComplete) |
| `rules-ranks.js` | 114 | Hand evaluation rules (evaluateHand) |
| `simple-hand-evaluator.js` | 246 | Hand ranking implementation (evaluatePokerHand, compareHands) |

### 8.2 Backend - Routes

**Location:** `routes/`

| File | Lines | Purpose |
|------|-------|---------|
| `game-engine-bridge.js` | 2,631 | PRIMARY game API (14 endpoints) |
| `rooms.js` | 1,072 | Room management (22 endpoints) |
| `auth.js` | ~100 | Authentication (3 endpoints) |
| `social.js` | ~500 | Social features |
| `pages.js` | ~200 | Page serving (13 routes) |
| `v2.js` | ~100 | API v2 (3 endpoints) |
| `games.js` | ~600 | **INACTIVE** (not used by UI) |

### 8.3 Backend - WebSocket

**Location:** `websocket/`

| File | Lines | Purpose |
|------|-------|---------|
| `socket-handlers.js` | 192 | Socket.IO connection handlers (join_room, authenticate, heartbeat) |

### 8.4 Frontend

**Location:** `public/`

| File | Lines | Purpose |
|------|-------|---------|
| `minimal-table.html` | 9,256 | **MONOLITH** - all game UI, WebSocket handlers, action logic, rendering |

**Location:** `public/js/components/`

| File | Lines | Purpose |
|------|-------|---------|
| `ActionButtons.js` | 144 | Action button UI component |

**Location:** `public/js/`

| File | Lines | Purpose |
|------|-------|---------|
| `TableRenderer.js` | 233 | Table rendering logic |
| `game-state-client.js` | 314 | State management helper |
| `poker-table-v2.js` | 336 | Alternative table implementation |

### 8.5 Database

**Location:** `database/`

| File | Purpose |
|------|---------|
| `migrations/` | 42 migration files |
| `COMPLETE_SCHEMA_DUMP.sql` | Full schema dump |

---

## Success Criteria

Document is complete when it contains:

- [x] All active API routes documented with schemas
- [x] Complete data flow diagrams for critical operations
- [x] Full database schema for game-critical tables
- [x] GameState JSONB structure fully documented
- [x] All WebSocket events mapped (server→client, client→server)
- [x] Frontend component structure documented
- [x] Critical data flows traced file-by-file
- [x] Architectural principles explicitly stated
- [x] State machine transitions documented
- [x] Known bug patterns categorized
- [x] Complete file reference with line counts
- [x] Invariants and constraints documented

---

**Next Steps:** Use this document as reference for implementing bug fixes. All changes should maintain these architectural principles and invariants.

