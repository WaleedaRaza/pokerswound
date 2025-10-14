# POKER ENGINE - ARCHITECTURAL FLOW ANALYSIS

## Visual System Architecture (Current State)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (Browser)                           │
│                       poker-engine/public/poker-test.html                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ WebSocket (Socket.io)
                                    │ HTTP REST API
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      SERVER ORCHESTRATION LAYER                          │
│                 sophisticated-engine-server.js (1663 lines)              │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ CONCERNS MIXED IN THIS FILE:                                     │   │
│  │ • HTTP route handling                                            │   │
│  │ • WebSocket connection management                                │   │
│  │ • Game state orchestration                                       │   │
│  │ • Display state reconstruction (BROKEN)                          │   │
│  │ • Database persistence                                            │   │
│  │ • Animation timing (setTimeout)                                  │   │
│  │ • Authentication middleware                                       │   │
│  │ • Room/lobby management                                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                           │
│  Storage: In-memory Map                                                  │
│  • games = new Map()  (game states)                                     │
│  • playerUserIds = new Map()  (mappings)                                │
└─────────────────────────────────────────────────────────────────────────┘
                    │                              │
                    │                              │
                    ▼                              ▼
    ┌───────────────────────────┐    ┌───────────────────────────┐
    │  GAME ENGINE LAYER        │    │  DATABASE LAYER           │
    │  (TypeScript Core)        │    │  (PostgreSQL)             │
    │                           │    │                           │
    │  src/core/engine/         │    │  Tables:                  │
    │  • game-state-machine.ts  │    │  • users                  │
    │  • betting-engine.ts      │    │  • rooms                  │
    │  • pot-manager.ts         │    │  • room_seats             │
    │  • hand-evaluator.ts      │    │  • games                  │
    │  • turn-manager.ts        │    │  • hand_history           │
    │  • round-manager.ts       │    │  • actions                │
    │                           │    │  • rejoin_tokens          │
    │  src/core/models/         │    └───────────────────────────┘
    │  • game-state.ts          │
    │  • player.ts              │
    │  • table.ts               │
    └───────────────────────────┘
```

---

## Detailed Data Flow: Player Action → UI Update

### Phase 1: Client Action
```
┌──────────────────────────┐
│ USER CLICKS "CALL"       │
│ poker-test.html:L1850    │
└────────────┬─────────────┘
             │
             │ async function performAction(action, amount)
             │ POST /api/games/:gameId/actions
             │ Body: { player_id, action: "CALL", amount: 500 }
             ▼
```

### Phase 2: Server Receives Request
```
┌─────────────────────────────────────────────────────────────────┐
│ HTTP ENDPOINT                                                    │
│ sophisticated-engine-server.js:L910-L1663                       │
│                                                                  │
│ app.post('/api/games/:id/actions', async (req, res) => {        │
│   const { player_id, action, amount } = req.body;               │
│                                                                  │
│   ┌───────────────────────────────────────────────────────┐    │
│   │ STEP 1: Get Current Game State (L915-L918)            │    │
│   │ const gameState = games.get(gameId);                   │    │
│   │ if (!gameState) return 404;                            │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                  │
│   ┌───────────────────────────────────────────────────────┐    │
│   │ STEP 2: Pre-Action Capture (L920-L951)                │    │
│   │ const actingPlayer = gameState.getPlayer(player_id);   │    │
│   │ const preActionPlayers = [...snapshot...];             │    │
│   │                                                         │    │
│   │ SNAPSHOT CONTAINS:                                     │    │
│   │ Player A: stack=500, isAllIn=false, betThisStreet=0   │    │
│   │ Player B: stack=500, isAllIn=false, betThisStreet=2   │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                  │
│   ┌───────────────────────────────────────────────────────┐    │
│   │ STEP 3: Process Action (L954-L959)                    │    │
│   │ const result = stateMachine.processAction(gameState, { │    │
│   │   type: 'PLAYER_ACTION',                               │    │
│   │   playerId: player_id,                                 │    │
│   │   actionType: action,                                  │    │
│   │   amount: amount                                       │    │
│   │ });                                                     │    │
│   │                                                         │    │
│   │ ⚠️ BLACK BOX - enters engine, returns mutated state   │    │
│   └───────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
             │
             │ Calls into engine...
             ▼
```

### Phase 3: Game Engine Processing (The Black Box)
```
┌─────────────────────────────────────────────────────────────────┐
│ GAME STATE MACHINE                                               │
│ src/core/engine/game-state-machine.ts                           │
│                                                                  │
│ processAction(state, action) {                                  │
│   ┌───────────────────────────────────────────────────────┐    │
│   │ L182-267: handlePlayerAction()                         │    │
│   │                                                         │    │
│   │ 1. Validate turn                                       │    │
│   │ 2. Process action (update stack, pot, betThisStreet)  │    │
│   │ 3. Record in action history                            │    │
│   │ 4. Check if betting round complete                     │    │
│   │                                                         │    │
│   │ IF ALL PLAYERS ALL-IN:                                 │    │
│   │   goto handleRunOutAllStreets() ──┐                   │    │
│   │                                     │                   │    │
│   └─────────────────────────────────────┼───────────────────┘   │
│                                          │                        │
│   ┌──────────────────────────────────────▼──────────────────┐   │
│   │ L272-366: handleRunOutAllStreets()                      │   │
│   │                                                          │   │
│   │ DEALS ALL REMAINING STREETS AT ONCE:                   │   │
│   │ L279-286: Deal Flop (3 cards)                          │   │
│   │   events.push({ type: 'STREET_ADVANCED', Flop })      │   │
│   │ L288-295: Deal Turn (1 card)                           │   │
│   │   events.push({ type: 'STREET_ADVANCED', Turn })      │   │
│   │ L297-304: Deal River (1 card)                          │   │
│   │   events.push({ type: 'STREET_ADVANCED', River })     │   │
│   │                                                          │   │
│   │ L365: return handleEndHand(state, events) ──┐         │   │
│   └──────────────────────────────────────────────┼──────────┘   │
│                                                   │               │
│   ┌───────────────────────────────────────────────▼─────────┐   │
│   │ L443-494: handleEndHand()                              │   │
│   │                                                         │   │
│   │ L445: pot = $1000                                      │   │
│   │ L448: Player A: stack=0, isAllIn=true                  │   │
│   │ L448: Player B: stack=0, isAllIn=true                  │   │
│   │                                                         │   │
│   │ L452: results = determineWinners(state)                │   │
│   │   → [{ playerId: 'A', amount: 1000, handRank: ... }]  │   │
│   │                                                         │   │
│   │ ⚠️ L459: distributePot(state, results)  ⚠️            │   │
│   │   ┌─────────────────────────────────────────────┐     │   │
│   │   │ L944-951: Mutate player stacks               │     │   │
│   │   │ Player A: stack = 0 + 1000 = 1000 ✅         │     │   │
│   │   │ Player B: stack = 0 (no change)              │     │   │
│   │   │                                               │     │   │
│   │   │ L955-957: Reset pot                          │     │   │
│   │   │ state.pot.totalPot = 0 ✅                    │     │   │
│   │   │ state.pot.mainPot = 0                        │     │   │
│   │   │ state.pot.sidePots = []                      │     │   │
│   │   └─────────────────────────────────────────────┘     │   │
│   │                                                         │   │
│   │ L467: cleanupHand(state)                               │   │
│   │   ┌─────────────────────────────────────────────┐     │   │
│   │   │ L962-964: Reset player flags                 │     │   │
│   │   │ Player A: isAllIn = false ✅                 │     │   │
│   │   │ Player A: betThisStreet = 0                  │     │   │
│   │   │ Player A: hasFolded = false                  │     │   │
│   │   │ Player B: (same resets)                      │     │   │
│   │   └─────────────────────────────────────────────┘     │   │
│   │                                                         │   │
│   │ L475-487: Create HAND_COMPLETED event                  │   │
│   │   {                                                     │   │
│   │     type: 'HAND_COMPLETED',                            │   │
│   │     winners: [{ playerId: 'A', amount: 1000, ... }],  │   │
│   │     totalPot: state.pot.totalPot  ← ⚠️ THIS IS 0!     │   │
│   │   }                                                     │   │
│   │                                                         │   │
│   │ L489: return { success: true, newState, events }       │   │
│   └─────────────────────────────────────────────────────────┘  │
│ }                                                                │
└─────────────────────────────────────────────────────────────────┘
             │
             │ Returns StateTransitionResult
             ▼
```

### Phase 4: Server Post-Processing (The Failed Reconstruction)
```
┌─────────────────────────────────────────────────────────────────┐
│ BACK IN SERVER                                                   │
│ sophisticated-engine-server.js:L960-1069                        │
│                                                                  │
│   ┌───────────────────────────────────────────────────────┐    │
│   │ L963-970: Post-Action Capture                          │    │
│   │ const postActionPreShowdownPlayers = [                │    │
│   │   ...result.newState.players.values()                 │    │
│   │ ].map(p => snapshot);                                  │    │
│   │                                                         │    │
│   │ ⚠️ CAPTURED STATE (ALREADY MUTATED):                  │    │
│   │ Player A: {                                            │    │
│   │   stack: 1000,        ← Already updated!              │    │
│   │   isAllIn: false,     ← Already reset!                │    │
│   │   betThisStreet: 0,   ← Already reset!                │    │
│   │   hasFolded: false                                     │    │
│   │ }                                                       │    │
│   │ Player B: {                                            │    │
│   │   stack: 0,                                            │    │
│   │   isAllIn: false,     ← Already reset!                │    │
│   │   betThisStreet: 0,                                    │    │
│   │   hasFolded: false                                     │    │
│   │ }                                                       │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                  │
│   ┌───────────────────────────────────────────────────────┐    │
│   │ L1010-1026: Desperate Pot Recovery                     │    │
│   │                                                         │    │
│   │ let potAmount = result.newState.pot.totalPot;          │    │
│   │ // potAmount = 0 ❌                                    │    │
│   │                                                         │    │
│   │ const handCompletedEvent = result.events.find(...);   │    │
│   │ if (handCompletedEvent.data.pot) {                     │    │
│   │   potAmount = handCompletedEvent.data.pot;             │    │
│   │   // Still 0 ❌                                        │    │
│   │ } else {                                                │    │
│   │   // Fallback: reconstruct from winners               │    │
│   │   potAmount = winners.reduce((sum, w) => sum + w.amount, 0);│
│   │   // potAmount = 1000 ✅ WORKS!                       │    │
│   │ }                                                       │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                  │
│   ┌───────────────────────────────────────────────────────┐    │
│   │ L1029-1062: Emit pot_update with "reconstructed" state│    │
│   │                                                         │    │
│   │ const currentPlayers = postActionPreShowdownPlayers    │    │
│   │   .filter(p => !p.hasFolded)                           │    │
│   │   .map(p => {                                          │    │
│   │     const displayStack = p.isAllIn ? 0 : p.stack;     │    │
│   │     //                   ▲                             │    │
│   │     //                   └─ false (reset) ❌          │    │
│   │     //                                                  │    │
│   │     // So displayStack = p.stack = 1000 ❌            │    │
│   │                                                         │    │
│   │     return {                                            │    │
│   │       id: p.uuid,                                      │    │
│   │       name: p.name,                                    │    │
│   │       stack: displayStack,  ← 1000 instead of 0 ❌    │    │
│   │       isAllIn: p.isAllIn    ← false ❌                │    │
│   │     };                                                  │    │
│   │   });                                                   │    │
│   │                                                         │    │
│   │ io.emit('pot_update', {                                │    │
│   │   pot: 1000,  ✅                                       │    │
│   │   players: [                                           │    │
│   │     { id: 'A', stack: 1000, isAllIn: false }, ❌      │    │
│   │     { id: 'B', stack: 0, isAllIn: false }     ❌      │    │
│   │   ]                                                     │    │
│   │ });                                                     │    │
│   └───────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
             │
             │ WebSocket broadcast
             ▼
```

### Phase 5: Client Renders (The Visible Bug)
```
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT RECEIVES EVENT                                            │
│ poker-test.html:L2537-2578                                      │
│                                                                  │
│ socket.on('pot_update', (payload) => {                          │
│   ┌───────────────────────────────────────────────────────┐    │
│   │ L2543-2547: Update pot display                         │    │
│   │ potEl.textContent = payload.pot;                       │    │
│   │ // Shows: $1000 ✅                                     │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                  │
│   ┌───────────────────────────────────────────────────────┐    │
│   │ L2552-2572: Update player stacks                       │    │
│   │                                                         │    │
│   │ payload.players.forEach(player => {                   │    │
│   │   const stackEl = find(player.name);                  │    │
│   │   stackEl.textContent = `$${player.stack}`;           │    │
│   │ });                                                     │    │
│   │                                                         │    │
│   │ RESULT:                                                │    │
│   │ Player A UI: $1000 ❌ Should be $0 during animation   │    │
│   │ Player B UI: $0 ✅                                     │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                  │
│ ✅ Pot shows $1000                                              │
│ ❌ Winner's stack shows $1000 immediately (no animation)        │
│ ❌ No way to animate the pot → stack transfer                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Coupling Analysis: Where Components Are Tightly Bound

### 1. Server ↔ Engine Coupling
```
┌──────────────────────────────────────┐
│ sophisticated-engine-server.js       │
│                                      │
│ Knows about:                         │
│ • GameStateModel internal structure  │
│ • PlayerModel properties             │
│ • Event structure from engine        │
│ • Engine's synchronous execution     │
│                                      │
│ Assumes:                             │
│ • processAction() is atomic          │
│ • State is mutated immediately       │
│ • No rollback capability             │
└──────────────────────────────────────┘
              │
              │ Tight coupling
              ▼
┌──────────────────────────────────────┐
│ src/core/engine/                     │
│                                      │
│ Knows nothing about:                 │
│ • WebSocket requirements             │
│ • Animation phases                   │
│ • Display state needs                │
│ • Database persistence               │
│                                      │
│ Assumes:                             │
│ • Immediate execution is fine        │
│ • State mutations are final          │
│ • Cleanup can happen immediately     │
└──────────────────────────────────────┘
```

**Problem**: Server needs display state, engine only provides logical state.

### 2. State Mutation ↔ Event Emission Coupling
```
TIME: t0                t1                t2
      ┌───────────┐     ┌───────────┐     ┌───────────┐
      │ Calculate │────▶│  Mutate   │────▶│   Emit    │
      │  Winners  │     │   State   │     │   Event   │
      └───────────┘     └───────────┘     └───────────┘
                              │                  │
                              │                  │
                        State changed      Event describes
                        irreversibly       already-changed state
```

**Problem**: No way to emit event BEFORE mutation.

### 3. Animation ↔ Business Logic Coupling
```
┌────────────────────────────────────────────────┐
│ sophisticated-engine-server.js:L1148-1254      │
│                                                 │
│ Business logic MIXED with presentation logic:  │
│                                                 │
│ setTimeout(() => {                              │
│   io.emit('street_reveal', ...);  ← Animation  │
│ }, 1000);                                       │
│                                                 │
│ setTimeout(async () => {                        │
│   await db.query('UPDATE ...');   ← Persistence│
│   io.emit('hand_complete', ...);  ← Animation  │
│   res.json(...);                  ← HTTP        │
│ }, finalDelay);                                 │
└────────────────────────────────────────────────┘
```

**Problem**: Animation timing controls when persistence happens!

### 4. WebSocket ↔ HTTP Response Coupling
```
┌─────────────────────────────────────────────┐
│ POST /api/games/:id/actions                 │
│                                             │
│ 1. Process action                           │
│ 2. Detect all-in runout                     │
│ 3. Schedule animations via setTimeout       │
│ 4. HTTP response delayed until animations   │
│    complete (L1254)                         │
│                                             │
│ setTimeout(() => {                          │
│   io.emit(...);                             │
│   res.json(...);  ← Response 3+ seconds late!│
│ }, 3000);                                   │
└─────────────────────────────────────────────┘
```

**Problem**: HTTP client waits for animations meant for WebSocket clients!

---

## Modularization Opportunities

### Identified Boundaries

```
┌────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                        │
│  Concerns: HTTP routes, WebSocket, API contracts               │
│  Files: routes/, api/, websocket/                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ Interface: Commands & Queries
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATION LAYER                          │
│  Concerns: Use cases, workflows, display state                 │
│  Files: orchestration/, services/                              │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ Interface: Domain Events
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                        DOMAIN LAYER                             │
│  Concerns: Game rules, poker logic, validation                 │
│  Files: core/engine/, core/models/                             │
└────────────────────────────────────────────────────────────────┘
                              │
                              │ Interface: Repository Pattern
                              ▼
┌────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE LAYER                        │
│  Concerns: Database, external APIs, file system                │
│  Files: database/, repositories/                               │
└────────────────────────────────────────────────────────────────┘
```

### Proposed Module Breakdown

```
poker-engine/
├── src/
│   ├── api/                        ← PRESENTATION
│   │   ├── http/
│   │   │   ├── routes/
│   │   │   │   ├── game.routes.ts
│   │   │   │   ├── room.routes.ts
│   │   │   │   └── auth.routes.ts
│   │   │   └── controllers/
│   │   │       ├── GameController.ts
│   │   │       └── RoomController.ts
│   │   └── websocket/
│   │       ├── SocketServer.ts
│   │       ├── handlers/
│   │       │   ├── GameSocketHandler.ts
│   │       │   └── RoomSocketHandler.ts
│   │       └── events/
│   │           └── ClientEvents.ts
│   │
│   ├── application/               ← ORCHESTRATION
│   │   ├── commands/
│   │   │   ├── ProcessPlayerAction.ts
│   │   │   ├── StartHand.ts
│   │   │   └── CreateGame.ts
│   │   ├── queries/
│   │   │   ├── GetGameState.ts
│   │   │   ├── GetLegalActions.ts
│   │   │   └── GetPlayerStats.ts
│   │   ├── services/
│   │   │   ├── GameOrchestrator.ts
│   │   │   ├── DisplayStateManager.ts
│   │   │   ├── AnimationCoordinator.ts
│   │   │   └── EntropyService.ts
│   │   └── events/
│   │       ├── DomainEventBus.ts
│   │       └── DomainEvents.ts
│   │
│   ├── domain/                    ← PURE GAME LOGIC
│   │   ├── engine/
│   │   │   ├── GameStateMachine.ts
│   │   │   ├── BettingEngine.ts
│   │   │   ├── PotManager.ts
│   │   │   └── HandEvaluator.ts
│   │   ├── models/
│   │   │   ├── GameState.ts
│   │   │   ├── Player.ts
│   │   │   └── Pot.ts
│   │   └── events/
│   │       └── GameEvents.ts
│   │
│   └── infrastructure/             ← EXTERNAL CONCERNS
│       ├── persistence/
│       │   ├── GameRepository.ts
│       │   ├── PlayerRepository.ts
│       │   └── EventStore.ts
│       ├── entropy/
│       │   └── YouTubeEntropyProvider.ts
│       └── cache/
│           └── RedisCache.ts
```

---

## Key Architectural Improvements Needed

### 1. **Separate Display State from Logical State**

**Current:**
```typescript
// Engine mutates state immediately
state.pot.totalPot = 0;
player.stack += winnings;

// Server tries to reverse-engineer display state
const displayStack = p.isAllIn ? 0 : p.stack; // Broken!
```

**Proposed:**
```typescript
// Engine returns BOTH states
return {
  logicalState: {
    pot: 0,
    players: [{ id: 'A', stack: 1000 }]
  },
  displayState: {
    pot: 1000,
    players: [{ id: 'A', stack: 0 }],
    transitions: [
      { type: 'POT_TO_PLAYER', from: 'pot', to: 'A', amount: 1000 }
    ]
  }
};
```

### 2. **Event-Driven State Changes**

**Current:**
```typescript
// Immediate mutation
this.distributePot(state, results);
events.push({ type: 'HAND_COMPLETED' }); // Too late
```

**Proposed:**
```typescript
// Event-first approach
const event = new PotDistributionCalculated(results);
this.eventBus.publish(event);

// Listeners can:
// 1. Update logical state
// 2. Update display state
// 3. Persist to database
// 4. Broadcast to clients
// Each at the right time!
```

### 3. **Async-Aware Orchestration**

**Current:**
```typescript
// Synchronous, blocks everything
const result = stateMachine.processAction(state, action);
res.json(result); // Done
```

**Proposed:**
```typescript
// Async workflow
const command = new ProcessPlayerAction(playerId, action);
const workflow = await orchestrator.execute(command);

// Workflow can:
// 1. Execute game logic
// 2. Schedule animations
// 3. Return HTTP response immediately
// 4. Continue animations in background
```

### 4. **Dependency Inversion**

**Current:**
```
Server → Direct instantiation → Engine
Server → Direct DB queries
Server → Direct Socket.io calls
```

**Proposed:**
```
Controller → Command → Orchestrator
             ↓
         Domain (pure logic)
             ↓
         Repository Interface
             ↓
         Concrete DB Implementation
```

---

## Next Steps for Modularization

1. **Extract Display State Manager** (2-3 hours)
   - Create `DisplayStateManager.ts`
   - Calculate display states from logical states
   - Keep engine pure

2. **Extract Animation Coordinator** (2-3 hours)
   - Create `AnimationCoordinator.ts`
   - Manage timing without setTimeout hell
   - Decouple from HTTP responses

3. **Introduce Event Bus** (4-5 hours)
   - Create `DomainEventBus.ts`
   - Publish events BEFORE mutations
   - Allow multiple listeners

4. **Extract Repositories** (3-4 hours)
   - Create `GameRepository.ts`
   - Move DB queries out of server file
   - Enable testing with mocks

5. **Create Orchestrator** (5-6 hours)
   - Create `GameOrchestrator.ts`
   - Coordinate engine + display + persistence
   - Single entry point for commands

---

## Scalability Benefits

### Before Modularization:
- ❌ Can't test engine without mocking Socket.io
- ❌ Can't add analytics without touching game logic
- ❌ Can't change animation timing without refactoring server
- ❌ Can't replay hands (no event log)
- ❌ YouTube entropy requires major surgery

### After Modularization:
- ✅ Engine testable in isolation
- ✅ Analytics as separate event listener
- ✅ Animation timing configurable
- ✅ Event sourcing enables replay
- ✅ Entropy service pluggable

---

**Ready to start extracting modules? Which module should we tackle first?**

1. **DisplayStateManager** (fixes the immediate bug)
2. **EventBus** (enables proper event-driven architecture)
3. **Orchestrator** (cleans up server file)

Your call!

