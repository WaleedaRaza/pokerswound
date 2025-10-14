# POKER ENGINE - COMPLETE FILE INVENTORY

## 📁 File Organization by Layer

---

## 🎯 ENTRY POINTS (Server Files)

### **sophisticated-engine-server.js** (1663 lines)
**Location**: `poker-engine/`  
**Purpose**: Main production server (currently monolithic)  
**Responsibilities**:
- HTTP server setup (Express)
- WebSocket server setup (Socket.io)
- All HTTP route handlers (inline, not extracted)
- All WebSocket event handlers (inline)
- In-memory game state storage (`games = new Map()`)
- Database queries (inline, not extracted)
- Authentication middleware (inline)
- Room/lobby management
- Display state reconstruction (broken)
- Animation timing (setTimeout)

**Dependencies**:
- `src/core/models/game-state.js` (compiled)
- `src/core/models/player.js` (compiled)
- `src/core/engine/game-state-machine.js` (compiled)
- `src/core/engine/betting-engine.js` (compiled)
- PostgreSQL via `pg` library

**Used By**: Everything - this is the entry point

**Problems**:
- ❌ Too many responsibilities (8 different concerns)
- ❌ Hard to test (mocking nightmare)
- ❌ Hard to scale (in-memory Map)
- ❌ Display state reconstruction logic broken

---

### **src/production-server.ts** (TypeScript version)
**Location**: `poker-engine/src/`  
**Purpose**: Newer TypeScript entry point (not actively used)  
**Status**: Exists but `sophisticated-engine-server.js` is the active server

---

### **src/app.ts**
**Location**: `poker-engine/src/`  
**Purpose**: Express app setup (TypeScript)  
**Responsibilities**:
- Express middleware configuration
- CORS setup
- Route registration
- Error handling

**Dependencies**:
- `src/api/routes/`
- `src/middleware/`

---

### **src/auth-server.ts**
**Location**: `poker-engine/src/`  
**Purpose**: Standalone authentication server  
**Responsibilities**:
- User registration
- User login
- JWT token generation
- Password hashing

---

## 🎮 DOMAIN LAYER (Core Game Logic)

### **Core Engine Files** (`src/core/engine/`)

#### **game-state-machine.ts** (1002 lines) ⚠️ CRITICAL
**Purpose**: Main state machine that processes all game actions  
**Responsibilities**:
- Process player actions (fold, call, raise, all-in)
- Start new hands
- Deal cards (hole cards, flop, turn, river)
- Advance streets
- **End hands and distribute pots** ← THE PROBLEM AREA
- Validate state transitions
- Emit game events

**Key Methods**:
- `processAction(state, action)` - Main entry point
- `handlePlayerAction()` - Process betting actions
- `handleRunOutAllStreets()` - Deal all remaining streets when all-in
- `handleEndHand()` - **⚠️ Distributes pot immediately (L459)**
- `distributePot()` - **⚠️ Mutates player stacks (L942-958)**
- `cleanupHand()` - **⚠️ Resets flags (L960-968)**

**Dependencies**:
- `GameStateModel` (models/game-state.ts)
- `PlayerModel` (models/player.ts)
- `HandEvaluator` (hand-evaluator.ts)
- `Deck` (card/deck.ts)

**Used By**:
- `sophisticated-engine-server.js` (L954)
- `GameService` (services/game-service.ts)

**Problems**:
- ❌ Mutates state immediately (no display phase)
- ❌ Cleanup destroys evidence (can't reconstruct)
- ❌ Events emitted AFTER mutations (too late)

---

#### **betting-engine.ts** (453 lines)
**Purpose**: Validates and processes betting actions  
**Responsibilities**:
- Validate actions (can player check/call/raise?)
- Calculate bet amounts
- Determine legal actions for a player
- Process blinds
- Detect betting round completion

**Key Methods**:
- `validateAction()` - Check if action is legal
- `getLegalActions()` - Return array of valid actions
- `processAction()` - Execute validated action
- `isBettingRoundComplete()` - Check if betting done

**Dependencies**:
- `GameStateModel`
- `PlayerModel`
- `ActionType` enum

**Used By**:
- `GameStateMachine`
- Controllers for action validation

---

#### **pot-manager.ts** (314 lines)
**Purpose**: Manages pots (main pot + side pots for all-ins)  
**Responsibilities**:
- Track player contributions
- Create side pots for all-in scenarios
- Calculate pot distributions
- Handle complex all-in scenarios

**Key Methods**:
- `addContribution()` - Add chips to pot
- `getTotalPot()` - Sum all pots
- `distributePots()` - Calculate winnings per player
- `calculateSidePots()` - Static method for side pot logic

**Dependencies**:
- `PlayerModel`
- `Chips` type

**Used By**:
- `GameStateMachine`
- Pot calculation logic

**Note**: Currently not fully integrated - game-state-machine.ts does its own pot math

---

#### **hand-evaluator.ts** (500+ lines)
**Purpose**: Evaluates poker hands and determines winners  
**Responsibilities**:
- Rank hands (high card → royal flush)
- Compare two hands
- Find best 5-card combination from 7 cards
- Handle ties/split pots

**Key Methods**:
- `evaluateHand(holeCards, communityCards)` - Return hand rank
- `compareHands(hand1, hand2)` - Return -1/0/1
- `determineWinners()` - Find best hand(s)

**Dependencies**:
- `Card` type
- `HandRanking` enum

**Used By**:
- `GameStateMachine.determineWinners()`

---

#### **turn-manager.ts** (385 lines)
**Purpose**: Determines whose turn it is  
**Responsibilities**:
- Get next player to act
- Handle turn rotation (clockwise)
- Skip folded/all-in players
- Determine first to act per street

**Key Methods**:
- `getNextToAct()` - Return next player UUID
- `advanceTurn()` - Move to next player
- `isBettingRoundComplete()` - Check if all acted

**Dependencies**:
- `GameStateModel`
- `PlayerModel`

**Used By**:
- `GameStateMachine`

---

#### **round-manager.ts** (407 lines)
**Purpose**: Manages betting rounds and street transitions  
**Responsibilities**:
- Initialize betting rounds
- Advance to next street
- Reset betting state between streets
- Complete hands

**Key Methods**:
- `startBettingRound()` - Initialize preflop/flop/etc
- `advanceStreet()` - Move preflop→flop→turn→river
- `completeHand()` - Finish hand and determine winners

**Dependencies**:
- `GameStateMachine`
- `HandEvaluator`

**Used By**:
- `GameStateMachine`

**Note**: Some overlap with game-state-machine.ts - unclear separation

---

#### **action-validator.ts**
**Purpose**: Validates player actions before execution  
**Responsibilities**:
- Check if it's player's turn
- Validate bet/raise amounts
- Ensure player has enough chips
- Check game state allows action

**Dependencies**:
- `GameStateModel`
- `ActionType` enum

**Used By**:
- `BettingEngine`
- Controllers

---

### **Core Models** (`src/core/models/`)

#### **game-state.ts** (464 lines) ⚠️ CRITICAL
**Purpose**: Complete game state representation (single source of truth)  
**Structure**:
```typescript
class GameStateModel {
  id: string
  status: GameStatus  // WAITING, PREFLOP, FLOP, etc.
  players: Map<UUID, PlayerModel>
  handState: HandState  // current hand data
  currentStreet: Street
  toAct: UUID | null  // whose turn
  bettingRound: BettingRoundState
  pot: PotState
  timing: TimingState
  actionHistory: ActionHistory[]
  configuration: GameConfiguration
}
```

**Key Methods**:
- `addPlayer()` / `removePlayer()`
- `getActivePlayers()` - Non-folded players
- `isBettingRoundComplete()` - Check if betting done
- `isHandComplete()` - Check if hand over
- `toSnapshot()` / `fromSnapshot()` - Serialization

**Dependencies**:
- `PlayerModel`
- `TableModel`
- Type definitions

**Used By**:
- Everything - this is the core state object

**Problems**:
- ❌ No display state separation
- ❌ Mutated directly (not immutable)
- ❌ Version field exists but not used (optimistic locking)

---

#### **player.ts** (200+ lines)
**Purpose**: Player state and chip management  
**Structure**:
```typescript
class PlayerModel {
  uuid: UUID
  name: string
  stack: Chips
  betThisStreet: Chips
  isAllIn: boolean
  hasFolded: boolean
  hole: Card[]  // 2 hole cards
  seatIndex: number
}
```

**Key Methods**:
- `collectBet(amount)` - Deduct chips, update bet
- `allIn()` - Set all-in flag
- `fold()` - Set folded flag
- `resetForNewStreet()` - Reset betThisStreet
- `resetForNewHand()` - **⚠️ Clear all flags (L960)**

**Dependencies**:
- `Card` type
- `Chips` type

**Used By**:
- `GameStateModel`
- `GameStateMachine`

**Problems**:
- ❌ `resetForNewHand()` destroys evidence (isAllIn → false)
- ❌ No way to get "pre-reset" state

---

#### **table.ts**
**Purpose**: Represents physical poker table  
**Responsibilities**:
- Seat assignment
- Max players
- Table configuration

**Dependencies**: None

**Used By**:
- `GameStateModel`

---

### **Card System** (`src/core/card/`)

#### **card.ts**
**Purpose**: Card class (e.g., "Ah" = Ace of Hearts)  
**Methods**:
- `toString()` - "Ah"
- `getRank()` - "A"
- `getSuit()` - "h"

---

#### **deck.ts**
**Purpose**: 52-card deck with shuffling  
**Methods**:
- `shuffle()` - Fisher-Yates shuffle
- `drawOne()` - Deal next card

**Note**: Accepts `randomFn` for seeded entropy (YouTube integration point!)

---

#### **rank.ts** / **suit.ts**
**Purpose**: Enums and utilities for card ranks/suits

---

### **Type Definitions** (`src/types/`)

#### **common.types.ts**
**Purpose**: Shared types across entire app  
**Exports**:
```typescript
type UUID = string
type Chips = number  // Branded type
enum Street { Preflop, Flop, Turn, River, Showdown }
enum ActionType { Fold, Check, Call, Bet, Raise, AllIn }
type SeatIndex = number
```

---

#### **game.types.ts**
**Purpose**: Game-specific types  
**Exports**: Game state interfaces, configurations

---

#### **player.types.ts**
**Purpose**: Player-specific types

---

#### **card.types.ts**
**Purpose**: Card-related types (Hole2 = [Card, Card])

---

## 🔧 APPLICATION LAYER (Orchestration)

### **Services** (`src/services/`)

#### **game-service.ts** (475+ lines) ⚠️ IMPORTANT
**Purpose**: High-level game orchestration with persistence  
**Responsibilities**:
- Create games (orchestrate engine + DB)
- Join games (add players to state + DB)
- Process actions (engine + persist + broadcast)
- Start hands
- Coordinate between engine and database

**Key Methods**:
- `createGame()` - Initialize game in memory + DB
- `joinGame()` - Add player to game + DB
- `processAction()` - Run engine, save to DB, return events
- `startHand()` - Deal cards via engine
- `getGameState()` - Retrieve from DB or memory

**Dependencies**:
- `GameStateMachine`
- `RoundManager`
- Database repositories
- Supabase client

**Used By**:
- `games.controller.ts`
- `sophisticated-engine-server.js` (not yet - could replace inline logic)

**Problems**:
- ⚠️ Not used by main server file yet (duplication)
- ⚠️ Still has display state issues (inherits from engine)

---

### **Authentication Services** (`src/services/auth/`)

#### **auth-service.ts**
**Purpose**: User authentication logic  
**Methods**:
- `register()` - Create user
- `login()` - Validate credentials
- `verifyToken()` - Check JWT

---

#### **jwt-service.ts**
**Purpose**: JWT token generation/validation  
**Methods**:
- `generateToken()` - Create JWT
- `verifyToken()` - Validate JWT
- `refreshToken()` - Issue new token

---

#### **password-service.ts**
**Purpose**: Password hashing with bcrypt  
**Methods**:
- `hashPassword()` - Salt + hash
- `comparePassword()` - Verify against hash

---

### **Database Services** (`src/services/database/`)

#### **supabase.ts**
**Purpose**: Supabase client initialization  
**Exports**:
- `getSupabaseServiceClient()` - Admin client
- `getSupabaseClient()` - Regular client

---

#### **Repositories** (`src/services/database/repos/`)

##### **base.repo.ts**
**Purpose**: Base class for all repositories  
**Provides**: Common CRUD methods, query helpers

---

##### **games.repo.ts**
**Purpose**: Game persistence  
**Methods**:
- `createGame()` - INSERT into games table
- `getGame()` - SELECT game by ID
- `updateGame()` - UPDATE game state
- `deleteGame()` - Remove game

---

##### **players.repo.ts**
**Purpose**: Player data persistence  
**Methods**:
- `createPlayer()` - INSERT player
- `updatePlayerStack()` - UPDATE chips
- `getPlayersByGame()` - Fetch all players in game

---

##### **hands.repo.ts**
**Purpose**: Hand history persistence  
**Methods**:
- `saveHand()` - Record hand results
- `getHandHistory()` - Fetch past hands

---

##### **actions.repo.ts**
**Purpose**: Action log persistence  
**Methods**:
- `saveAction()` - Record player action
- `getActionsByHand()` - Retrieve action history

---

##### **pots.repo.ts**
**Purpose**: Pot state persistence  
**Methods**:
- `savePotState()` - Record pot amounts

---

##### **user-repository.ts**
**Purpose**: User account management  
**Methods**:
- `createUser()`
- `getUserById()`
- `getUserByEmail()`
- `updateUser()`

---

#### **transaction-manager.ts**
**Purpose**: Database transaction coordination  
**Methods**:
- `beginTransaction()`
- `commit()`
- `rollback()`

**Note**: Not fully implemented yet

---

#### **concurrency-manager.ts**
**Purpose**: Handle concurrent game state updates  
**Methods**:
- `lockGame()` - Prevent simultaneous mutations
- `unlockGame()`

**Note**: Partially implemented

---

## 🌐 PRESENTATION LAYER (API)

### **HTTP Controllers** (`src/api/controllers/`)

#### **games.controller.ts** (206 lines)
**Purpose**: HTTP request handlers for game endpoints  
**Endpoints Handled**:
- `POST /api/games` - Create game
- `POST /api/games/:id/join` - Join game
- `POST /api/games/:id/start-hand` - Deal cards
- `POST /api/games/:id/actions` - Process action
- `GET /api/games/:id` - Get state

**Dependencies**:
- `GameService`
- WebSocket server (for broadcasts)

**Used By**:
- `games.routes.ts`

**Problems**:
- ⚠️ Not used by `sophisticated-engine-server.js` (duplicate logic)
- ⚠️ WebSocket broadcast logic mixed in

---

### **Routes** (`src/api/routes/`)

#### **games.routes.ts**
**Purpose**: Express route registration  
**Registers**:
- `/api/games/*` routes to `games.controller.ts`

---

### **Authentication Routes** (`src/routes/`)

#### **auth.ts**
**Purpose**: Auth endpoint routing  
**Endpoints**:
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/verify`

---

### **WebSocket Server** (`src/websocket/`)

#### **server.ts** (28 lines)
**Purpose**: Socket.io setup and connection handling  
**Responsibilities**:
- Initialize Socket.io
- Handle `connection` events
- Room join/leave logic

**Methods**:
- `initWs(httpServer)` - Setup
- `getIo()` - Get Socket.io instance

**Used By**:
- Entry point servers
- Controllers (to broadcast)

**Problems**:
- ⚠️ Minimal - most logic in `sophisticated-engine-server.js`
- ⚠️ Should handle more events here

---

## 🗄️ INFRASTRUCTURE LAYER

### **Database** (`src/database/`)

#### **connection.ts**
**Purpose**: PostgreSQL connection setup  
**Methods**:
- `getDbPool()` - Get connection pool
- `testConnection()` - Health check

---

### **Configuration** (`src/config/`)

#### **environment.ts**
**Purpose**: Environment variable management  
**Exports**:
```typescript
{
  DATABASE_URL,
  JWT_SECRET,
  PORT,
  CORS_ORIGIN,
  SUPABASE_URL,
  SUPABASE_KEY
}
```

---

### **Middleware** (`src/middleware/`)

#### **auth-middleware.ts**
**Purpose**: JWT authentication middleware  
**Methods**:
- `authenticateToken()` - Verify JWT in request header
- `requireAuth()` - Protect routes

---

## 🎨 FRONTEND (Client)

### **UI Files** (`poker-engine/public/`)

#### **poker-test.html** (3548 lines) ⚠️ MASSIVE
**Purpose**: Complete poker UI (single-file app)  
**Responsibilities**:
- WebSocket client connection
- Game state rendering
- Player action UI (buttons)
- Pot/chip display
- Card rendering (PNG images)
- Room/lobby management
- Seat selection
- Animation handling (**BROKEN FOR ALL-IN**)

**Key Sections**:
- L1-840: Styles (CSS in HTML)
- L841-2400: HTML structure
- L2401-3548: JavaScript logic

**JavaScript Functions**:
- `updateGameDisplay()` - Render game state
- `performAction()` - Send action to server
- `fetchGameState()` - Poll for updates
- `socket.on('pot_update')` - **L2537 - BUG AREA**
- `socket.on('hand_complete')` - L2618
- `socket.on('street_reveal')` - L2581

**Dependencies**:
- Socket.io client
- Fetch API
- Card PNG images

**Problems**:
- ❌ Single 3500+ line file (maintainability nightmare)
- ❌ Mixed concerns (UI + logic + styles)
- ❌ Dumb renderer (just displays what server sends)
- ❌ No client-side state machine
- ❌ No TypeScript/type safety

---

#### **test-client.html**
**Purpose**: Simpler test UI  
**Use**: Quick testing during development

---

#### **test-websocket.html**
**Purpose**: WebSocket connection testing  
**Use**: Debug WebSocket issues

---

#### **Card Images** (`public/cards/*.png`)
**Purpose**: 52 PNG files for card rendering  
**Format**: `{suit}_{rank}.png` (e.g., `hearts_A.png`)

---

#### **card-images-base64.js**
**Purpose**: Base64-encoded card images (fallback if PNGs fail)

---

## 📚 UTILITIES & HELPERS

### **Utils** (`src/utils/`)

#### **constants.ts**
**Purpose**: App-wide constants  
**Exports**: Default values, magic numbers, timeouts

---

#### **helpers.ts**
**Purpose**: General utility functions  
**Functions**: String manipulation, number formatting, etc.

---

#### **validators.ts**
**Purpose**: Input validation helpers  
**Functions**: Email validation, chip amount checks, etc.

---

## 🧪 TESTING

### **Test Setup** (`src/tests/`)

#### **setup.ts**
**Purpose**: Jest configuration and test utilities

---

### **Manual Tests** (`tests/manual/*.js`)
**Purpose**: Manual test scripts for specific scenarios  
**Files**: All-in tests, betting tests, hand evaluation tests

---

### **Unit Tests** (`tests/unit/*.ts`)
**Purpose**: Unit tests for core engine components

---

### **Integration Tests** (`tests/integration/*.ts`)
**Purpose**: End-to-end game flow tests

---

## 🗺️ FILE RELATIONSHIP MAP

### Data Flow: Player Action
```
poker-test.html (L1850)
    │ HTTP POST /api/games/:id/actions
    ▼
sophisticated-engine-server.js (L910-1663)
    │ Inline handler
    │ Gets gameState from Map
    │ Calls engine
    ▼
src/core/engine/game-state-machine.ts (compiled to dist/)
    │ processAction()
    │ handlePlayerAction()
    │ handleEndHand() ← PROBLEM
    │ distributePot() ← PROBLEM
    ▼
src/core/models/player.ts (compiled)
    │ setStack() ← Mutation
    │ resetForNewHand() ← Destroys evidence
    ▼
sophisticated-engine-server.js (L963)
    │ Tries to reconstruct display state ← FAILS
    │ Emits 'pot_update'
    ▼
poker-test.html (L2537)
    │ socket.on('pot_update')
    │ Renders incorrect stack
    ▼
❌ BUG: Player sees $1000 immediately instead of $0
```

---

### Dependency Graph (Key Files Only)
```
sophisticated-engine-server.js
    ├─▶ dist/core/engine/game-state-machine.js
    │       ├─▶ dist/core/models/game-state.js
    │       ├─▶ dist/core/models/player.js
    │       ├─▶ dist/core/engine/hand-evaluator.js
    │       └─▶ dist/core/card/deck.js
    │
    ├─▶ pg (PostgreSQL driver)
    ├─▶ socket.io (WebSocket)
    └─▶ express (HTTP)

src/api/controllers/games.controller.ts (NOT USED)
    ├─▶ src/services/game-service.ts
    │       ├─▶ src/core/engine/game-state-machine.ts
    │       ├─▶ src/services/database/repos/games.repo.ts
    │       └─▶ src/services/database/repos/players.repo.ts
    │
    └─▶ src/websocket/server.ts

poker-test.html
    ├─▶ socket.io-client (WebSocket)
    ├─▶ fetch API (HTTP)
    └─▶ public/cards/*.png (card images)
```

---

## 🔥 PROBLEM FILES (Need Immediate Attention)

### 1. **sophisticated-engine-server.js** (1663 lines)
**Issues**:
- ❌ Monolithic (8 different concerns)
- ❌ Lines 1029-1062: Broken display state reconstruction
- ❌ Lines 1148-1254: setTimeout-based animation (fragile)
- ❌ Duplicate logic with `GameService`

**Needs**:
- Extract display state calculation
- Extract WebSocket broadcasting
- Extract database persistence
- Use `GameService` instead of inline logic

---

### 2. **src/core/engine/game-state-machine.ts** (1002 lines)
**Issues**:
- ❌ Lines 459: Immediate pot distribution
- ❌ Lines 467: Cleanup destroys evidence
- ❌ Lines 484: Event contains pot=0

**Needs**:
- Separate display state from logical state
- Emit events BEFORE mutations
- Don't cleanup until UI confirms ready

---

### 3. **src/core/models/player.ts**
**Issues**:
- ❌ `resetForNewHand()` clears `isAllIn` flag
- ❌ No way to preserve pre-reset state

**Needs**:
- Add display state snapshot before reset
- Or delay reset until UI confirms

---

### 4. **poker-test.html** (3548 lines)
**Issues**:
- ❌ Monolithic single file
- ❌ No separation of concerns
- ❌ Dumb renderer (can't handle phased updates)
- ❌ Lines 2537-2578: Just displays whatever server sends

**Needs**:
- Extract into components
- Add client-side state machine
- Handle animation phases

---

## 📊 FILE STATISTICS

| Layer | Files | Total Lines | Average per File |
|-------|-------|-------------|------------------|
| Entry Points | 4 | ~2000 | 500 |
| Domain (Engine) | 9 | ~4500 | 500 |
| Domain (Models) | 4 | ~1000 | 250 |
| Application (Services) | 10+ | ~2000 | 200 |
| Presentation (API) | 5 | ~500 | 100 |
| Infrastructure | 15+ | ~1500 | 100 |
| Frontend | 3 | ~4000 | 1333 |
| **TOTAL** | **50+** | **~15,500** | **310** |

---

## 🎯 MODULARIZATION PRIORITY

### Phase 1: Extract from sophisticated-engine-server.js
1. **DisplayStateManager.ts** (new) - Calculate display states
2. **AnimationCoordinator.ts** (new) - Handle timing
3. **WebSocketBroadcaster.ts** (new) - Centralize broadcasts
4. Use existing **GameService** instead of inline logic

### Phase 2: Fix Engine Architecture
1. Modify **game-state-machine.ts** to preserve display state
2. Add **GameEvents.ts** for event-first approach
3. Modify **player.ts** to delay cleanup

### Phase 3: Modernize Frontend
1. Break **poker-test.html** into React components
2. Add client-side state machine
3. Handle animation phases properly

---

**This inventory shows we have ~15,500 lines of code across 50+ files, but the main problem is in just 4 files totaling ~7,000 lines. Fix those 4, and the architecture becomes scalable.**

**Ready to start modularization? Which file should we tackle first?**

