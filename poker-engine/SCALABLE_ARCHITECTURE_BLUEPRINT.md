# SCALABLE ARCHITECTURE BLUEPRINT

## Vision: Comprehensive Poker Platform

### Current State (v0.1):
- Friends play via shared link
- Basic game logic works
- Display state bugs present

### Target State (v3.0+):
- **Social Platform**: Friend system, messaging, profiles
- **Competitive Play**: Public tournaments, quick games, ranked ladder
- **AI-Powered**: Post-game analysis, equity calculators
- **Learning Hub**: LLM-powered GTO insights, solver chatbots, tutorials
- **Community**: Discussion forums, hand reviews, strategy sharing
- **Security**: Fraud detection, anti-collusion, fair play guarantees

---

## 🏗️ ARCHITECTURAL PRINCIPLES

### 1. **Separation of Concerns**
Each layer has ONE job. No layer knows about implementation details of other layers.

### 2. **Dependency Inversion**
High-level modules don't depend on low-level modules. Both depend on abstractions.

### 3. **Single Responsibility**
Each module does one thing well. If you can describe a module with "and", it needs splitting.

### 4. **Open/Closed Principle**
Open for extension (new features), closed for modification (existing code stable).

### 5. **Interface Segregation**
No module should depend on interfaces it doesn't use.

### 6. **Loose Coupling**
Modules communicate through well-defined interfaces, not direct references.

### 7. **Event-Driven**
State changes trigger events. Observers react to events without coupling.

---

## 📐 THE 8 LAYERS (Clean Architecture)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER (L1)                       │
│  HTTP API, WebSocket, GraphQL, REST endpoints                   │
│  Concerns: Request/response formatting, authentication          │
└─────────────────────────────────────────────────────────────────┘
                              │ Commands & Queries
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   APPLICATION LAYER (L2)                         │
│  Use Cases, Workflows, Orchestration                            │
│  Concerns: Business workflows, display state, timing            │
└─────────────────────────────────────────────────────────────────┘
                              │ Domain Events
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DOMAIN LAYER (L3)                            │
│  Pure poker logic, game rules, hand evaluation                  │
│  Concerns: ONLY poker rules (no DB, no HTTP, no display)        │
└─────────────────────────────────────────────────────────────────┘
                              │ Repository Interfaces
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER (L4)                        │
│  Database, external APIs, file system, cache                    │
│  Concerns: Persistence, external services, I/O                  │
└─────────────────────────────────────────────────────────────────┘

          CROSS-CUTTING CONCERNS (all layers):
┌─────────────────────────────────────────────────────────────────┐
│  Logging, Monitoring, Security, Error Handling                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔍 DETAILED LAYER BREAKDOWN

### Layer 1: PRESENTATION (Edge/Gateway)

**Purpose**: Accept external requests, return responses  
**Never Contains**: Business logic, game rules, database queries

#### Modules:

##### 1.1 HTTP Gateway (`src/presentation/http/`)
```typescript
// src/presentation/http/server.ts
class HttpServer {
  constructor(
    private commandBus: ICommandBus,
    private queryBus: IQueryBus
  ) {}
  
  setupRoutes() {
    app.post('/api/games/:id/actions', async (req, res) => {
      // 1. Parse request
      const command = this.parseCommand(req);
      
      // 2. Dispatch to application layer (no logic here!)
      const result = await this.commandBus.execute(command);
      
      // 3. Format response
      res.json(this.formatResponse(result));
    });
  }
}
```

**Responsibilities**:
- Request validation (schema, auth token)
- Command/Query parsing
- Response formatting
- Rate limiting
- CORS handling

**Never Does**:
- ❌ Game logic
- ❌ Database queries
- ❌ State mutations

---

##### 1.2 WebSocket Gateway (`src/presentation/websocket/`)
```typescript
// src/presentation/websocket/SocketGateway.ts
class SocketGateway {
  constructor(
    private eventBus: IEventBus,
    private broadcaster: IWebSocketBroadcaster
  ) {}
  
  onConnection(socket: Socket) {
    // Subscribe to domain events
    this.eventBus.subscribe('game.*', (event) => {
      // Transform domain event → socket message
      const message = this.transformEvent(event);
      this.broadcaster.toRoom(event.gameId, message);
    });
  }
}
```

**Responsibilities**:
- Connection management
- Room subscription
- Event transformation (domain → socket format)
- Broadcast coordination

**Never Does**:
- ❌ Create events (just broadcasts them)
- ❌ Mutate state
- ❌ Game logic

---

##### 1.3 GraphQL Gateway (Future)
```typescript
// src/presentation/graphql/resolvers.ts
const resolvers = {
  Query: {
    game: (_, { id }, context) => context.queryBus.execute(new GetGameQuery(id)),
    playerStats: (_, { id }, context) => context.queryBus.execute(new GetPlayerStatsQuery(id))
  },
  Mutation: {
    processAction: (_, { input }, context) => 
      context.commandBus.execute(new ProcessActionCommand(input))
  }
};
```

---

### Layer 2: APPLICATION (Use Cases/Orchestration)

**Purpose**: Coordinate domain logic, manage workflows, handle timing  
**Never Contains**: Poker rules (domain's job), HTTP details (presentation's job)

#### Modules:

##### 2.1 Command Bus (`src/application/commands/`)
```typescript
// src/application/commands/CommandBus.ts
interface ICommand {
  readonly type: string;
  readonly aggregateId: string;
  readonly metadata: CommandMetadata;
}

class CommandBus {
  private handlers = new Map<string, ICommandHandler>();
  
  async execute<T>(command: ICommand): Promise<T> {
    const handler = this.handlers.get(command.type);
    return handler.handle(command);
  }
}

// src/application/commands/ProcessPlayerAction/ProcessPlayerActionCommand.ts
class ProcessPlayerActionCommand implements ICommand {
  constructor(
    readonly gameId: string,
    readonly playerId: string,
    readonly action: ActionType,
    readonly amount?: number
  ) {}
}

// src/application/commands/ProcessPlayerAction/ProcessPlayerActionHandler.ts
class ProcessPlayerActionHandler implements ICommandHandler {
  constructor(
    private gameEngine: IGameEngine,
    private displayStateManager: IDisplayStateManager,
    private animationCoordinator: IAnimationCoordinator,
    private gameRepository: IGameRepository,
    private eventBus: IEventBus
  ) {}
  
  async handle(command: ProcessPlayerActionCommand) {
    // 1. Load game state
    const game = await this.gameRepository.getById(command.gameId);
    
    // 2. Execute domain logic (pure poker rules)
    const domainResult = this.gameEngine.processAction(game, {
      playerId: command.playerId,
      action: command.action,
      amount: command.amount
    });
    
    // 3. Calculate display state (SEPARATE from logical state)
    const displayState = this.displayStateManager.calculate(
      domainResult.preChangeSnapshot,
      domainResult.outcomes,
      domainResult.newState
    );
    
    // 4. Persist logical state
    await this.gameRepository.save(domainResult.newState);
    
    // 5. Emit domain events
    for (const event of domainResult.events) {
      await this.eventBus.publish(event);
    }
    
    // 6. Coordinate animations (async, doesn't block)
    this.animationCoordinator.schedulePhases(displayState.animationPhases);
    
    // 7. Return immediately
    return {
      success: true,
      displayState,
      logicalState: domainResult.newState
    };
  }
}
```

**Responsibilities**:
- Coordinate between domain, infrastructure, presentation
- Manage display state (what UI should show)
- Handle animation timing
- Orchestrate transactions
- Emit events

**Never Does**:
- ❌ Poker rules (domain's job)
- ❌ Direct DB access (uses repositories)
- ❌ HTTP responses (presentation's job)

---

##### 2.2 Query Bus (`src/application/queries/`)
```typescript
// src/application/queries/GetGameState/GetGameStateQuery.ts
class GetGameStateQuery implements IQuery {
  constructor(
    readonly gameId: string,
    readonly perspective: 'player' | 'spectator',
    readonly playerId?: string
  ) {}
}

// src/application/queries/GetGameState/GetGameStateHandler.ts
class GetGameStateHandler implements IQueryHandler {
  constructor(
    private readModel: IGameStateReadModel,
    private displayStateManager: IDisplayStateManager
  ) {}
  
  async handle(query: GetGameStateQuery) {
    // 1. Query read model (optimized for reads)
    const gameState = await this.readModel.getState(query.gameId);
    
    // 2. Apply perspective filtering
    const filtered = this.applyPerspective(gameState, query);
    
    // 3. Calculate display state
    const displayState = this.displayStateManager.calculateForQuery(filtered);
    
    return {
      logicalState: filtered,
      displayState,
      metadata: {
        timestamp: Date.now(),
        version: gameState.version
      }
    };
  }
  
  private applyPerspective(state, query) {
    if (query.perspective === 'player') {
      // Hide opponent hole cards
      return this.hideOpponentCards(state, query.playerId);
    }
    return state;
  }
}
```

---

##### 2.3 Display State Manager (`src/application/services/DisplayStateManager.ts`)
```typescript
interface DisplayState {
  // What UI should show RIGHT NOW
  visibleState: {
    pot: number;
    players: DisplayPlayer[];
    communityCards: Card[];
  };
  
  // What transitions should happen
  animationPhases: AnimationPhase[];
  
  // Metadata
  phase: 'PRE_DEAL' | 'BETTING' | 'REVEALING' | 'DISTRIBUTING' | 'COMPLETE';
}

class DisplayStateManager {
  /**
   * Calculate display state from domain state
   * This is where we solve the "stack shows 1000 immediately" bug
   */
  calculate(
    preChangeSnapshot: GameState,
    outcomes: DomainOutcomes,
    postChangeState: GameState
  ): DisplayState {
    
    // If hand just completed with all-in
    if (outcomes.type === 'HAND_COMPLETED' && outcomes.wasAllIn) {
      return {
        visibleState: {
          pot: outcomes.potAmount,  // Show full pot
          players: preChangeSnapshot.players.map(p => ({
            id: p.id,
            name: p.name,
            stack: p.isAllIn ? 0 : p.stack,  // All-in players show 0
            isAllIn: p.isAllIn  // Use PRE-CLEANUP flag
          })),
          communityCards: postChangeState.communityCards
        },
        
        animationPhases: [
          {
            type: 'STREET_REVEAL',
            delay: 0,
            data: { street: 'FLOP', cards: [...] }
          },
          {
            type: 'STREET_REVEAL',
            delay: 1000,
            data: { street: 'TURN', cards: [...] }
          },
          {
            type: 'STREET_REVEAL',
            delay: 2000,
            data: { street: 'RIVER', cards: [...] }
          },
          {
            type: 'WINNER_ANNOUNCED',
            delay: 3000,
            data: { winners: outcomes.winners }
          },
          {
            type: 'POT_TRANSFER',
            delay: 4000,
            data: {
              from: 'pot',
              to: outcomes.winners[0].playerId,
              amount: outcomes.potAmount
            }
          },
          {
            type: 'STACKS_UPDATED',
            delay: 5000,
            data: {
              players: postChangeState.players  // NOW show final stacks
            }
          }
        ],
        
        phase: 'REVEALING'
      };
    }
    
    // Normal betting
    return {
      visibleState: this.mapToDisplay(postChangeState),
      animationPhases: [],
      phase: 'BETTING'
    };
  }
}
```

**THIS SOLVES YOUR BUG**: Display state is calculated BEFORE cleanup, so we have access to `isAllIn` flag.

---

##### 2.4 Animation Coordinator (`src/application/services/AnimationCoordinator.ts`)
```typescript
class AnimationCoordinator {
  constructor(
    private eventBus: IEventBus,
    private scheduler: IScheduler
  ) {}
  
  schedulePhases(phases: AnimationPhase[]) {
    for (const phase of phases) {
      this.scheduler.scheduleTask({
        delay: phase.delay,
        task: () => {
          // Publish animation event
          this.eventBus.publish({
            type: `animation.${phase.type}`,
            data: phase.data,
            timestamp: Date.now()
          });
        }
      });
    }
  }
}
```

**NO MORE setTimeout HELL**: Centralized scheduling, testable, cancellable.

---

##### 2.5 Event Bus (`src/application/events/EventBus.ts`)
```typescript
interface DomainEvent {
  type: string;
  aggregateId: string;
  data: any;
  timestamp: number;
  version: number;
}

class EventBus {
  private subscribers = new Map<string, EventHandler[]>();
  
  subscribe(pattern: string, handler: EventHandler) {
    // pattern: 'game.*', 'game.action', 'animation.*'
    this.subscribers.set(pattern, [...this.get(pattern), handler]);
  }
  
  async publish(event: DomainEvent) {
    // 1. Persist event (event sourcing)
    await this.eventStore.append(event);
    
    // 2. Notify subscribers
    const handlers = this.getMatchingHandlers(event.type);
    await Promise.all(handlers.map(h => h.handle(event)));
  }
}
```

**Event-Driven Architecture**: Decouples modules. Add new features by subscribing to events.

---

### Layer 3: DOMAIN (Core Poker Logic)

**Purpose**: Pure poker rules. Deterministic. No side effects.  
**Never Contains**: HTTP, WebSocket, Database, Display concerns

#### Modules:

##### 3.1 Game Engine (`src/domain/engine/GameEngine.ts`)
```typescript
interface IGameEngine {
  processAction(
    state: GameState,
    action: PlayerAction
  ): DomainResult;
}

interface DomainResult {
  success: boolean;
  
  // State BEFORE mutations (for display calculation)
  preChangeSnapshot: GameState;
  
  // State AFTER mutations (logical truth)
  newState: GameState;
  
  // What happened (for events)
  outcomes: DomainOutcomes;
  
  // Domain events (not mutated state!)
  events: DomainEvent[];
  
  error?: string;
}

interface DomainOutcomes {
  type: 'ACTION_PROCESSED' | 'BETTING_COMPLETE' | 'HAND_COMPLETED';
  
  // For display state calculation
  wasAllIn?: boolean;
  potAmount?: number;
  winners?: Winner[];
  
  // For event sourcing
  actionTaken?: PlayerAction;
  stateTransition?: StateTransition;
}

class GameEngine implements IGameEngine {
  constructor(
    private stateMachine: GameStateMachine,
    private handEvaluator: HandEvaluator
  ) {}
  
  processAction(state: GameState, action: PlayerAction): DomainResult {
    // 1. Capture snapshot BEFORE any mutations
    const preChangeSnapshot = state.clone();
    
    // 2. Validate action
    const validation = this.stateMachine.validateAction(state, action);
    if (!validation.isValid) {
      return { 
        success: false, 
        error: validation.error,
        preChangeSnapshot,
        newState: state,
        outcomes: { type: 'ACTION_PROCESSED' },
        events: []
      };
    }
    
    // 3. Process action (mutates state)
    const result = this.stateMachine.processAction(state, action);
    
    // 4. Determine outcomes
    const outcomes = this.analyzeOutcomes(preChangeSnapshot, result.newState);
    
    // 5. Create domain events (BEFORE cleanup!)
    const events = this.createEvents(preChangeSnapshot, result, outcomes);
    
    // 6. NOW cleanup (doesn't affect events or outcomes)
    if (outcomes.type === 'HAND_COMPLETED') {
      this.stateMachine.cleanupHand(result.newState);
    }
    
    return {
      success: true,
      preChangeSnapshot,
      newState: result.newState,
      outcomes,
      events
    };
  }
  
  private analyzeOutcomes(before: GameState, after: GameState): DomainOutcomes {
    // Detect all-in scenarios
    const wasAllIn = after.players.every(p => p.isAllIn || p.hasFolded);
    
    if (after.isHandComplete()) {
      // Evaluate winners BEFORE cleanup destroys evidence
      const winners = this.handEvaluator.determineWinners(after);
      const potAmount = after.pot.totalPot;
      
      return {
        type: 'HAND_COMPLETED',
        wasAllIn,
        potAmount,
        winners
      };
    }
    
    return {
      type: 'ACTION_PROCESSED',
      actionTaken: { /* ... */ }
    };
  }
}
```

**KEY CHANGES**:
- ✅ Returns `preChangeSnapshot` (before cleanup)
- ✅ Outcomes calculated BEFORE cleanup
- ✅ Events created BEFORE cleanup
- ✅ Cleanup happens LAST (doesn't affect anything)

---

##### 3.2 Game State Machine (REFACTORED)
```typescript
// src/domain/engine/GameStateMachine.ts
class GameStateMachine {
  /**
   * Process action (no longer responsible for events/display)
   */
  processAction(state: GameState, action: PlayerAction): StateMachineResult {
    switch (action.type) {
      case 'FOLD':
        return this.handleFold(state, action.playerId);
      case 'CALL':
        return this.handleCall(state, action.playerId, action.amount);
      case 'RAISE':
        return this.handleRaise(state, action.playerId, action.amount);
      case 'ALL_IN':
        return this.handleAllIn(state, action.playerId);
    }
  }
  
  /**
   * Handle end of hand (NO LONGER EMITS EVENTS)
   */
  private handleEndHand(state: GameState): StateMachineResult {
    // 1. Determine winners
    const winners = this.determineWinners(state);
    
    // 2. Distribute pot
    this.distributePot(state, winners);
    
    // 3. Update status
    state.status = GameStatus.COMPLETED;
    
    // 4. Return (DON'T emit events - that's GameEngine's job)
    return {
      newState: state,
      winners  // Return data, don't emit
    };
  }
  
  /**
   * Cleanup (called AFTER outcomes captured)
   */
  cleanupHand(state: GameState): void {
    // Reset player flags
    for (const player of state.players.values()) {
      player.resetForNewHand();
    }
    
    // Clear community cards
    state.handState.communityCards = [];
  }
}
```

**KEY CHANGES**:
- ❌ No longer emits events (GameEngine does that)
- ❌ No longer manages display concerns
- ✅ Pure game logic only
- ✅ Cleanup is separate method (called externally)

---

### Layer 4: INFRASTRUCTURE (External I/O)

**Purpose**: Interact with external systems (DB, APIs, cache)  
**Never Contains**: Business logic, game rules

#### Modules:

##### 4.1 Repository Pattern (`src/infrastructure/persistence/`)
```typescript
// src/infrastructure/persistence/GameRepository.ts
interface IGameRepository {
  getById(id: string): Promise<GameState>;
  save(game: GameState): Promise<void>;
  delete(id: string): Promise<void>;
}

class PostgresGameRepository implements IGameRepository {
  constructor(private db: IDatabase) {}
  
  async getById(id: string): Promise<GameState> {
    const row = await this.db.query('SELECT * FROM games WHERE id = $1', [id]);
    return this.hydrate(row);
  }
  
  async save(game: GameState): Promise<void> {
    const snapshot = game.toSnapshot();
    await this.db.query(
      'UPDATE games SET state = $1, version = $2 WHERE id = $3',
      [JSON.stringify(snapshot), game.version, game.id]
    );
  }
  
  private hydrate(row: any): GameState {
    return GameState.fromSnapshot(JSON.parse(row.state));
  }
}
```

---

##### 4.2 Event Store (`src/infrastructure/persistence/EventStore.ts`)
```typescript
interface IEventStore {
  append(event: DomainEvent): Promise<void>;
  getByAggregate(aggregateId: string): Promise<DomainEvent[]>;
  getByType(type: string): Promise<DomainEvent[]>;
}

class PostgresEventStore implements IEventStore {
  async append(event: DomainEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO domain_events 
       (id, type, aggregate_id, data, timestamp, version) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuid(), event.type, event.aggregateId, event.data, event.timestamp, event.version]
    );
  }
  
  async getByAggregate(aggregateId: string): Promise<DomainEvent[]> {
    const rows = await this.db.query(
      'SELECT * FROM domain_events WHERE aggregate_id = $1 ORDER BY version',
      [aggregateId]
    );
    return rows.map(this.hydrate);
  }
}
```

**EVENT SOURCING**: Can replay entire game history!

---

##### 4.3 Read Models (CQRS) (`src/infrastructure/read-models/`)
```typescript
// src/infrastructure/read-models/GameStateReadModel.ts
class GameStateReadModel {
  constructor(
    private db: IDatabase,
    private cache: ICache
  ) {}
  
  /**
   * Optimized for queries (not commands)
   */
  async getState(gameId: string): Promise<GameStateView> {
    // Try cache first
    const cached = await this.cache.get(`game:${gameId}`);
    if (cached) return cached;
    
    // Query denormalized table (fast!)
    const row = await this.db.query(
      `SELECT 
         g.*,
         json_agg(p.*) as players,
         json_agg(cc.*) as community_cards
       FROM games g
       LEFT JOIN players p ON p.game_id = g.id
       LEFT JOIN community_cards cc ON cc.game_id = g.id
       WHERE g.id = $1
       GROUP BY g.id`,
      [gameId]
    );
    
    const view = this.buildView(row);
    
    // Cache for next query
    await this.cache.set(`game:${gameId}`, view, 5); // 5 sec TTL
    
    return view;
  }
}
```

**CQRS**: Separate read and write models. Queries don't slow down commands!

---

##### 4.4 YouTube Entropy Provider (`src/infrastructure/entropy/YouTubeEntropyProvider.ts`)
```typescript
interface IEntropyProvider {
  generateSeed(videoId: string, timestamp: number): Promise<string>;
  verifySeed(videoId: string, timestamp: number, seed: string): Promise<boolean>;
}

class YouTubeEntropyProvider implements IEntropyProvider {
  constructor(
    private youtubeClient: IYouTubeClient,
    private hasher: ICryptographicHasher
  ) {}
  
  async generateSeed(videoId: string, timestamp: number): Promise<string> {
    // 1. Fetch video metadata
    const video = await this.youtubeClient.getVideo(videoId);
    
    // 2. Extract frames at deterministic timestamps
    const frames = await this.extractFrames(video, [
      timestamp,
      timestamp + 1000,
      timestamp + 2000
    ]);
    
    // 3. Hash frames + audio sample
    const input = frames.join('') + video.audioSample;
    const hash = await this.hasher.sha256(input);
    
    // 4. Derive seed from hash
    return this.deriveSeed(hash);
  }
  
  async verifySeed(videoId: string, timestamp: number, seed: string): Promise<boolean> {
    const recomputed = await this.generateSeed(videoId, timestamp);
    return recomputed === seed;
  }
}
```

**PLUGGABLE**: Want different entropy? Just implement `IEntropyProvider`.

---

## 🔄 HOW IT ALL WORKS TOGETHER

### Example: Player Goes All-In

```
1. CLIENT (Presentation Layer)
   User clicks "All-In"
   ↓
   HTTP POST /api/games/abc123/actions
   Body: { playerId: "p1", action: "ALL_IN" }

2. HTTP GATEWAY (Presentation Layer)
   Parses request → Creates Command
   ↓
   new ProcessPlayerActionCommand("abc123", "p1", "ALL_IN")

3. COMMAND BUS (Application Layer)
   Routes to handler
   ↓
   ProcessPlayerActionHandler.handle(command)

4. COMMAND HANDLER (Application Layer)
   a. Loads game state (via Repository)
   b. Calls domain
      ↓
      GameEngine.processAction(state, action)
   
5. GAME ENGINE (Domain Layer)
   a. Captures preChangeSnapshot ✅ (BEFORE cleanup)
   b. Calls StateMachine
      ↓
      GameStateMachine.processAction(state, action)
   c. Analyzes outcomes (wasAllIn, potAmount, winners)
   d. Creates domain events
   e. Calls cleanup (NOW safe - outcomes already captured)
   f. Returns DomainResult {
        preChangeSnapshot,  ← Has isAllIn = true
        newState,           ← Has isAllIn = false (cleaned)
        outcomes,           ← Has potAmount, winners
        events
      }

6. COMMAND HANDLER (Application Layer)
   a. Calculates display state
      ↓
      DisplayStateManager.calculate(
        preChangeSnapshot,  ← Uses THIS for isAllIn check ✅
        outcomes,
        newState
      )
      Returns: {
        visibleState: { players: [{ stack: 0, isAllIn: true }] },
        animationPhases: [...6 phases...]
      }
   
   b. Saves logical state (via Repository)
   
   c. Publishes domain events (via EventBus)
   
   d. Schedules animations (via AnimationCoordinator)
   
   e. Returns to gateway

7. HTTP GATEWAY (Presentation Layer)
   Formats response
   ↓
   HTTP 200 { success: true, displayState: {...} }

8. WEBSOCKET GATEWAY (Presentation Layer)
   Subscribed to EventBus
   ↓
   Receives 'game.hand_completed' event
   ↓
   Transforms to socket message
   ↓
   Broadcasts to room

9. ANIMATION COORDINATOR (Application Layer)
   Executes scheduled phases:
   t=0ms:   Emit 'animation.pot_update' (stack=0)
   t=1000ms: Emit 'animation.street_reveal' (flop)
   t=2000ms: Emit 'animation.street_reveal' (turn)
   t=3000ms: Emit 'animation.street_reveal' (river)
   t=4000ms: Emit 'animation.winner_announced'
   t=5000ms: Emit 'animation.pot_transfer' (stack=1000)

10. CLIENT (Presentation Layer)
    Receives events, updates UI smoothly ✅
```

**NO MORE BUG**: Display state calculated from `preChangeSnapshot` which has correct `isAllIn` flag.

---

## 📦 FILE STRUCTURE (After Refactor)

```
poker-engine/
├── src/
│   ├── presentation/                  ← Layer 1
│   │   ├── http/
│   │   │   ├── HttpServer.ts
│   │   │   ├── routes/
│   │   │   │   ├── GameRoutes.ts
│   │   │   │   ├── AuthRoutes.ts
│   │   │   │   └── TournamentRoutes.ts (future)
│   │   │   └── middleware/
│   │   │       ├── AuthMiddleware.ts
│   │   │       └── RateLimitMiddleware.ts
│   │   ├── websocket/
│   │   │   ├── SocketGateway.ts
│   │   │   ├── handlers/
│   │   │   │   ├── GameSocketHandler.ts
│   │   │   │   └── ChatSocketHandler.ts (future)
│   │   │   └── broadcasters/
│   │   │       └── WebSocketBroadcaster.ts
│   │   └── graphql/ (future)
│   │       ├── schema.graphql
│   │       └── resolvers/
│   │
│   ├── application/                   ← Layer 2
│   │   ├── commands/
│   │   │   ├── CommandBus.ts
│   │   │   ├── ProcessPlayerAction/
│   │   │   │   ├── ProcessPlayerActionCommand.ts
│   │   │   │   └── ProcessPlayerActionHandler.ts
│   │   │   ├── StartHand/
│   │   │   ├── CreateGame/
│   │   │   └── JoinGame/
│   │   ├── queries/
│   │   │   ├── QueryBus.ts
│   │   │   ├── GetGameState/
│   │   │   ├── GetLegalActions/
│   │   │   └── GetPlayerStats/ (future)
│   │   ├── services/
│   │   │   ├── DisplayStateManager.ts     ← SOLVES BUG
│   │   │   ├── AnimationCoordinator.ts    ← NO MORE setTimeout
│   │   │   └── TournamentOrchestrator.ts (future)
│   │   └── events/
│   │       ├── EventBus.ts
│   │       └── handlers/
│   │           ├── GameEventHandler.ts
│   │           ├── AnalyticsEventHandler.ts (future)
│   │           └── NotificationEventHandler.ts (future)
│   │
│   ├── domain/                        ← Layer 3
│   │   ├── engine/
│   │   │   ├── GameEngine.ts              ← REFACTORED
│   │   │   ├── GameStateMachine.ts        ← SIMPLIFIED
│   │   │   ├── BettingEngine.ts
│   │   │   ├── PotManager.ts
│   │   │   └── HandEvaluator.ts
│   │   ├── models/
│   │   │   ├── GameState.ts
│   │   │   ├── Player.ts
│   │   │   └── Tournament.ts (future)
│   │   ├── events/
│   │   │   └── DomainEvents.ts
│   │   └── value-objects/
│   │       ├── Card.ts
│   │       ├── Chips.ts
│   │       └── HandRank.ts
│   │
│   └── infrastructure/                ← Layer 4
│       ├── persistence/
│       │   ├── repositories/
│       │   │   ├── GameRepository.ts
│       │   │   ├── PlayerRepository.ts
│       │   │   └── TournamentRepository.ts (future)
│       │   ├── EventStore.ts
│       │   └── read-models/
│       │       ├── GameStateReadModel.ts
│       │       └── PlayerStatsReadModel.ts (future)
│       ├── entropy/
│       │   └── YouTubeEntropyProvider.ts  ← YOUR UNIQUE FEATURE
│       ├── cache/
│       │   └── RedisCache.ts
│       └── external-services/
│           ├── AIAnalysisService.ts (future)
│           └── GTOSolverService.ts (future)
│
├── tests/
│   ├── unit/
│   │   ├── domain/
│   │   ├── application/
│   │   └── infrastructure/
│   ├── integration/
│   └── e2e/
│
└── sophisticated-engine-server.ts ← BECOMES THIN BOOTSTRAP ONLY
```

---

## 🎯 SOPHISTICATED-ENGINE-SERVER.JS (AFTER)

```javascript
// sophisticated-engine-server.js (NOW ONLY ~100 LINES)

const { HttpServer } = require('./dist/presentation/http/HttpServer');
const { SocketGateway } = require('./dist/presentation/websocket/SocketGateway');
const { setupDependencyInjection } = require('./di-container');

async function bootstrap() {
  // 1. Setup dependency injection
  const container = setupDependencyInjection();
  
  // 2. Start HTTP server
  const httpServer = container.resolve('httpServer');
  await httpServer.start(process.env.PORT || 3000);
  
  // 3. Start WebSocket server
  const socketGateway = container.resolve('socketGateway');
  await socketGateway.start(httpServer.httpServer);
  
  console.log('✅ Server started');
}

bootstrap().catch(console.error);
```

**RESPONSIBILITIES REMOVED**:
- ❌ HTTP route handlers (moved to presentation layer)
- ❌ WebSocket handlers (moved to presentation layer)
- ❌ Game logic (moved to domain layer)
- ❌ Display state (moved to application layer)
- ❌ Database queries (moved to infrastructure layer)
- ❌ setTimeout animation (moved to AnimationCoordinator)

**NOW ONLY**:
- ✅ Bootstrap application
- ✅ Setup dependency injection
- ✅ Start servers

---

## 🔐 DEPENDENCY INJECTION CONTAINER

```typescript
// src/di-container.ts
import { Container } from 'inversify';

export function setupDependencyInjection(): Container {
  const container = new Container();
  
  // Infrastructure (Layer 4)
  container.bind<IDatabase>('IDatabase').to(PostgresDatabase).inSingletonScope();
  container.bind<ICache>('ICache').to(RedisCache).inSingletonScope();
  container.bind<IGameRepository>('IGameRepository').to(PostgresGameRepository);
  container.bind<IEventStore>('IEventStore').to(PostgresEventStore).inSingletonScope();
  container.bind<IEntropyProvider>('IEntropyProvider').to(YouTubeEntropyProvider);
  
  // Domain (Layer 3)
  container.bind<IGameEngine>('IGameEngine').to(GameEngine);
  container.bind<IHandEvaluator>('IHandEvaluator').to(HandEvaluator);
  
  // Application (Layer 2)
  container.bind<ICommandBus>('ICommandBus').to(CommandBus).inSingletonScope();
  container.bind<IQueryBus>('IQueryBus').to(QueryBus).inSingletonScope();
  container.bind<IEventBus>('IEventBus').to(EventBus).inSingletonScope();
  container.bind<IDisplayStateManager>('IDisplayStateManager').to(DisplayStateManager);
  container.bind<IAnimationCoordinator>('IAnimationCoordinator').to(AnimationCoordinator);
  
  // Presentation (Layer 1)
  container.bind<IHttpServer>('IHttpServer').to(HttpServer);
  container.bind<ISocketGateway>('ISocketGateway').to(SocketGateway);
  
  return container;
}
```

**BENEFITS**:
- ✅ Testable (inject mocks)
- ✅ Configurable (swap implementations)
- ✅ No circular dependencies (container manages lifecycle)

---

## 🚀 FUTURE SCALABILITY

### Phase 1: Current Game (v1.0)
- Friends play via link ✅
- Display state bug fixed ✅
- YouTube entropy ✅

### Phase 2: Social Features (v1.5)
**Add without touching existing code**:
```typescript
// src/application/commands/SendFriendRequest/
class SendFriendRequestHandler {
  // Just add handler, subscribe to events
  // No changes to game logic!
}
```

### Phase 3: Tournaments (v2.0)
**Add without touching existing code**:
```typescript
// src/domain/models/Tournament.ts
class Tournament {
  // New aggregate, separate from Game
}

// src/application/commands/JoinTournament/
class JoinTournamentHandler {
  // Reuses GameEngine, doesn't modify it
}
```

### Phase 4: AI Analysis (v2.5)
**Add without touching existing code**:
```typescript
// src/application/events/handlers/AIAnalysisEventHandler.ts
class AIAnalysisEventHandler {
  constructor(private aiService: IAIAnalysisService) {
    // Subscribe to game.hand_completed
    eventBus.subscribe('game.hand_completed', this.handle);
  }
  
  async handle(event: DomainEvent) {
    // Analyze hand, store results
    // No changes to game flow!
  }
}
```

### Phase 5: LLM Insights (v3.0)
**Add without touching existing code**:
```typescript
// src/infrastructure/external-services/GTOChatbot.ts
class GTOChatbot {
  constructor(
    private llmService: ILLMService,
    private eventStore: IEventStore
  ) {}
  
  async answer(question: string, gameId: string) {
    // Fetch game history from event store
    const events = await this.eventStore.getByAggregate(gameId);
    
    // Build context for LLM
    const context = this.buildContext(events);
    
    // Query LLM
    return this.llmService.chat(question, context);
  }
}
```

**EVENT SOURCING PAYS OFF**: Entire game history available for analysis!

---

## 📊 COMPARISON: BEFORE vs AFTER

### Before (Monolith):
```
sophisticated-engine-server.js (1663 lines)
├─ HTTP routes (inline)
├─ WebSocket handlers (inline)
├─ Game logic (inline)
├─ Display state (broken)
├─ DB queries (inline)
├─ Animation timing (setTimeout)
└─ Authentication (inline)
```

**Problems**:
- ❌ Can't test without mocking everything
- ❌ Can't add features without breaking existing code
- ❌ Can't scale (in-memory Map)
- ❌ Display state bug unfixable without refactor
- ❌ Circular dependencies
- ❌ 8 different concerns in one file

---

### After (Layered):
```
Presentation Layer (500 lines)
├─ HttpServer.ts (100 lines)
└─ SocketGateway.ts (100 lines)

Application Layer (1500 lines)
├─ CommandBus.ts (200 lines)
├─ QueryBus.ts (200 lines)
├─ DisplayStateManager.ts (300 lines) ← SOLVES BUG
├─ AnimationCoordinator.ts (200 lines)
└─ EventBus.ts (300 lines)

Domain Layer (2000 lines)
├─ GameEngine.ts (400 lines) ← SIMPLIFIED
├─ GameStateMachine.ts (800 lines) ← PURE LOGIC
└─ HandEvaluator.ts (500 lines)

Infrastructure Layer (1000 lines)
├─ GameRepository.ts (200 lines)
├─ EventStore.ts (200 lines)
├─ YouTubeEntropyProvider.ts (300 lines)
└─ ReadModels (300 lines)

Bootstrap (100 lines)
└─ sophisticated-engine-server.ts (NOW THIN!)
```

**Benefits**:
- ✅ Each module testable in isolation
- ✅ Add features without modifying existing code
- ✅ Scalable (event sourcing + CQRS)
- ✅ Display state bug solved architecturally
- ✅ No circular dependencies (DI container)
- ✅ Each file has ONE responsibility

---

## 🎯 NEXT STEPS

### Step 1: Create Interfaces
Define contracts between layers (2-3 hours)

### Step 2: Extract Display State Manager
Move display logic out of server (4-5 hours)

### Step 3: Refactor Game Engine
Add preChangeSnapshot, outcomes (6-8 hours)

### Step 4: Build Command/Query Infrastructure
CommandBus, QueryBus, EventBus (8-10 hours)

### Step 5: Extract Repositories
Move DB logic to infrastructure (4-5 hours)

### Step 6: Build Presentation Layer
Thin HTTP/WebSocket gateways (4-5 hours)

### Step 7: Wire with DI Container
Connect all layers (3-4 hours)

### Step 8: Migrate sophisticated-engine-server.js
Become thin bootstrap (2-3 hours)

**TOTAL**: 35-45 hours = 1-2 weeks full-time

---

## ❓ DISCUSSION QUESTIONS

Before we start implementation, let's align on:

1. **Timeline**: Is 1-2 weeks acceptable? Or need faster/slower?
2. **Testing**: Should we write tests as we refactor, or after?
3. **Migration**: Big bang refactor, or gradual module-by-module?
4. **Database**: Event sourcing from start, or add later?
5. **Framework**: Want to use NestJS (opinionated), or keep custom?

**This architecture will scale to your v3.0 vision. Let's discuss which approach fits your timeline and resources best.**

