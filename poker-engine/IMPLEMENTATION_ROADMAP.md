# IMPLEMENTATION ROADMAP: Point A → Point B

## 📍 Current State (Point A)

**What Works**:
- ✅ Poker engine with all game rules
- ✅ Database schema and persistence
- ✅ Authentication system
- ✅ Room/lobby system
- ✅ WebSocket real-time updates
- ✅ Basic UI (poker-test.html)

**What's Broken**:
- ❌ Display state bug (all-in animations)
- ❌ Monolithic server (1663 lines, 8 responsibilities)
- ❌ No event sourcing (can't replay/analyze)
- ❌ Tight coupling (can't add features without breaking things)
- ❌ No YouTube entropy integration point

**Constraints**:
- 10 friends need to play NOW
- Must support unlimited concurrent private games
- Architecture must be ready for future features (AI, LLM, tournaments)
- YouTube entropy swappable later (architecture ready)

---

## 🎯 Target State (Point B)

**What Works**:
- ✅ 10+ friends playing smooth games with working animations
- ✅ Unlimited concurrent private games (isolated)
- ✅ Modular architecture (8 layers, clear boundaries)
- ✅ Event sourcing (can replay any game)
- ✅ Display state manager (animations work)
- ✅ YouTube entropy integration point ready (swap in later)
- ✅ Testable, scalable, maintainable codebase

**Ready for Future**:
- 🔜 AI analysis (just add event subscriber)
- 🔜 LLM insights (query event store)
- 🔜 Public tournaments (add new aggregate)
- 🔜 Marketing/scaling (architecture already scalable)

---

## 🛣️ THE ROADMAP (3 Weeks Total)

### **WEEK 1: Quick Fix + Foundation** (Play with friends by end of week)
**Goal**: Friends can play, animations work, foundation laid

### **WEEK 2: Core Refactoring** (Scalable architecture)
**Goal**: Modular architecture, event sourcing, unlimited games

### **WEEK 3: Polish + YouTube Prep** (Production-ready)
**Goal**: Testing, deployment, entropy integration point

---

## 📅 WEEK 1: QUICK FIX + FOUNDATION

### Day 1-2: Quick Fix (6-8 hours)
**Goal**: Display state bug FIXED, friends can play

#### Tasks:

**1.1 Create DisplayStateManager** (3 hours)
```typescript
// poker-engine/src/application/services/DisplayStateManager.ts
class DisplayStateManager {
  calculateDisplayState(
    preChangeSnapshot: GameState,  // BEFORE cleanup
    outcomes: DomainOutcomes,
    postChangeState: GameState
  ): DisplayState {
    // Logic to calculate what UI should show
    // Uses preChangeSnapshot for isAllIn checks
  }
}
```

**Files to Create**:
- `src/application/services/DisplayStateManager.ts` (new)
- `src/application/services/DisplayState.types.ts` (new)

**Files to Modify**:
- `poker-engine/sophisticated-engine-server.js` (use DisplayStateManager)

**Test**:
- Manual all-in scenario
- Player 2 sees stack=0 during animation ✅
- After animation, sees stack=1000 ✅

---

**1.2 Capture Pre-Change Snapshot in Engine** (2 hours)
```typescript
// poker-engine/src/core/engine/game-state-machine.ts
private handleEndHand(state: GameStateModel, events: GameEvent[]): StateTransitionResult {
  // BEFORE determining winners, capture snapshot
  const preDistributionSnapshot = {
    players: Array.from(state.players.values()).map(p => ({
      id: p.uuid,
      stack: p.stack,
      isAllIn: p.isAllIn,  // ✅ Still true here!
      betThisStreet: p.betThisStreet
    })),
    pot: state.pot.totalPot
  };
  
  // Now determine winners and distribute
  const results = this.determineWinners(state);
  this.distributePot(state, results);
  this.cleanupHand(state);
  
  // Return snapshot in event data
  events.push({
    type: 'HAND_COMPLETED',
    data: {
      preDistributionSnapshot,  // ✅ Added
      winners: results,
      totalPot: preDistributionSnapshot.pot  // ✅ Use captured pot
    }
  });
}
```

**Files to Modify**:
- `src/core/engine/game-state-machine.ts`

**Test**:
- Event data includes preDistributionSnapshot ✅
- Pot amount is correct ✅

---

**1.3 Wire DisplayStateManager into Server** (2 hours)
```javascript
// poker-engine/sophisticated-engine-server.js (L1029)
const displayStateManager = require('./dist/application/services/DisplayStateManager').DisplayStateManager;

// In action handler:
if (willBeAllInRunout) {
  const displayState = displayStateManager.calculateDisplayState(
    handCompletedEvent.data.preDistributionSnapshot,
    handCompletedEvent.data,
    result.newState
  );
  
  io.to(`room:${roomId}`).emit('pot_update', {
    pot: displayState.pot,
    players: displayState.players  // ✅ Correct stack values
  });
}
```

**Files to Modify**:
- `sophisticated-engine-server.js` (L1029-1062)

**Test**:
- All-in scenario
- UI shows correct stacks during animation ✅
- No more $1000 jumping immediately ✅

---

**Milestone 1.1 Complete** ✅
- Friends can play games
- All-in animations work correctly
- No broken UI states

**Deploy & Test with Friends** (1 day)
- Host on Render/Railway
- Share link with 3-5 friends
- Play 10+ hands
- Collect feedback

---

### Day 3-5: Foundation for Refactoring (10-12 hours)
**Goal**: Event sourcing infrastructure, interfaces defined

#### Tasks:

**1.4 Create Event Store Schema** (2 hours)
```sql
-- poker-engine/database/migrations/006_event_store.sql
CREATE TABLE domain_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  event_data JSONB NOT NULL,
  metadata JSONB,
  version INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- For event replay
  sequence_number SERIAL,
  
  -- Indexes for efficient queries
  INDEX idx_aggregate (aggregate_id, version),
  INDEX idx_type (event_type),
  INDEX idx_timestamp (timestamp)
);

-- Ensure event ordering per aggregate
CREATE UNIQUE INDEX idx_aggregate_version 
  ON domain_events (aggregate_id, version);
```

**Files to Create**:
- `database/migrations/006_event_store.sql`

**Run Migration**:
```bash
cd poker-engine
psql $DATABASE_URL -f database/migrations/006_event_store.sql
```

---

**1.5 Create Core Interfaces** (3 hours)
```typescript
// poker-engine/src/common/interfaces/IEventStore.ts
export interface DomainEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  eventData: any;
  metadata?: any;
  version: number;
  timestamp: Date;
}

export interface IEventStore {
  append(event: DomainEvent): Promise<void>;
  getByAggregate(aggregateId: string): Promise<DomainEvent[]>;
  getByType(eventType: string): Promise<DomainEvent[]>;
  getStream(aggregateId: string, fromVersion: number): Promise<DomainEvent[]>;
}

// poker-engine/src/common/interfaces/IEventBus.ts
export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(pattern: string, handler: EventHandler): void;
  unsubscribe(pattern: string, handler: EventHandler): void;
}

// poker-engine/src/common/interfaces/IRepository.ts
export interface IGameRepository {
  getById(id: string): Promise<GameState | null>;
  save(game: GameState): Promise<void>;
  delete(id: string): Promise<void>;
}

// poker-engine/src/common/interfaces/ICommandBus.ts
export interface ICommand {
  readonly type: string;
  readonly aggregateId: string;
  readonly metadata: CommandMetadata;
}

export interface ICommandBus {
  execute<T>(command: ICommand): Promise<T>;
  register(commandType: string, handler: ICommandHandler): void;
}
```

**Files to Create**:
- `src/common/interfaces/IEventStore.ts`
- `src/common/interfaces/IEventBus.ts`
- `src/common/interfaces/IRepository.ts`
- `src/common/interfaces/ICommandBus.ts`
- `src/common/interfaces/IQueryBus.ts`

---

**1.6 Implement EventStore** (3 hours)
```typescript
// poker-engine/src/infrastructure/persistence/PostgresEventStore.ts
import { IEventStore, DomainEvent } from '../../common/interfaces/IEventStore';

export class PostgresEventStore implements IEventStore {
  constructor(private db: any) {}
  
  async append(event: DomainEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO domain_events 
       (event_type, aggregate_type, aggregate_id, event_data, metadata, version, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        event.eventType,
        event.aggregateType,
        event.aggregateId,
        JSON.stringify(event.eventData),
        JSON.stringify(event.metadata),
        event.version,
        event.timestamp
      ]
    );
  }
  
  async getByAggregate(aggregateId: string): Promise<DomainEvent[]> {
    const result = await this.db.query(
      `SELECT * FROM domain_events 
       WHERE aggregate_id = $1 
       ORDER BY version ASC`,
      [aggregateId]
    );
    return result.rows.map(this.rowToEvent);
  }
  
  async getByType(eventType: string): Promise<DomainEvent[]> {
    const result = await this.db.query(
      `SELECT * FROM domain_events 
       WHERE event_type = $1 
       ORDER BY timestamp DESC`,
      [eventType]
    );
    return result.rows.map(this.rowToEvent);
  }
  
  async getStream(aggregateId: string, fromVersion: number): Promise<DomainEvent[]> {
    const result = await this.db.query(
      `SELECT * FROM domain_events 
       WHERE aggregate_id = $1 AND version >= $2
       ORDER BY version ASC`,
      [aggregateId, fromVersion]
    );
    return result.rows.map(this.rowToEvent);
  }
  
  private rowToEvent(row: any): DomainEvent {
    return {
      id: row.id,
      eventType: row.event_type,
      aggregateType: row.aggregate_type,
      aggregateId: row.aggregate_id,
      eventData: JSON.parse(row.event_data),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      version: row.version,
      timestamp: row.timestamp
    };
  }
}
```

**Files to Create**:
- `src/infrastructure/persistence/PostgresEventStore.ts`

---

**1.7 Implement EventBus** (2 hours)
```typescript
// poker-engine/src/application/events/EventBus.ts
import { IEventBus } from '../../common/interfaces/IEventBus';
import { IEventStore } from '../../common/interfaces/IEventStore';

type EventHandler = (event: DomainEvent) => Promise<void> | void;

export class EventBus implements IEventBus {
  private subscribers = new Map<string, EventHandler[]>();
  
  constructor(private eventStore: IEventStore) {}
  
  async publish(event: DomainEvent): Promise<void> {
    // 1. Persist event (event sourcing)
    await this.eventStore.append(event);
    
    // 2. Notify subscribers
    const handlers = this.getMatchingHandlers(event.eventType);
    await Promise.all(handlers.map(h => h(event)));
  }
  
  subscribe(pattern: string, handler: EventHandler): void {
    const handlers = this.subscribers.get(pattern) || [];
    handlers.push(handler);
    this.subscribers.set(pattern, handlers);
  }
  
  unsubscribe(pattern: string, handler: EventHandler): void {
    const handlers = this.subscribers.get(pattern) || [];
    const filtered = handlers.filter(h => h !== handler);
    this.subscribers.set(pattern, filtered);
  }
  
  private getMatchingHandlers(eventType: string): EventHandler[] {
    const handlers: EventHandler[] = [];
    
    for (const [pattern, patternHandlers] of this.subscribers) {
      if (this.matches(eventType, pattern)) {
        handlers.push(...patternHandlers);
      }
    }
    
    return handlers;
  }
  
  private matches(eventType: string, pattern: string): boolean {
    // Simple glob matching
    // 'game.*' matches 'game.action', 'game.hand_completed'
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(eventType);
  }
}
```

**Files to Create**:
- `src/application/events/EventBus.ts`

---

**Milestone 1.2 Complete** ✅
- Event store infrastructure ready
- Interfaces defined (contracts between layers)
- Event bus implemented
- Ready for Week 2 refactoring

---

## 📅 WEEK 2: CORE REFACTORING

### Day 6-8: Domain Layer Refactoring (12-15 hours)
**Goal**: Clean domain layer, proper event emission

#### Tasks:

**2.1 Refactor GameEngine** (5 hours)
```typescript
// poker-engine/src/domain/engine/GameEngine.ts
import { IGameEngine } from '../../common/interfaces/IGameEngine';

export interface DomainResult {
  success: boolean;
  preChangeSnapshot: GameStateSnapshot;
  newState: GameState;
  outcomes: DomainOutcomes;
  events: DomainEvent[];
  error?: string;
}

export class GameEngine implements IGameEngine {
  constructor(
    private stateMachine: GameStateMachine,
    private handEvaluator: HandEvaluator
  ) {}
  
  processAction(state: GameState, action: PlayerAction): DomainResult {
    // 1. Capture BEFORE state
    const preChangeSnapshot = this.captureSnapshot(state);
    
    // 2. Validate
    const validation = this.validateAction(state, action);
    if (!validation.isValid) {
      return this.failureResult(state, validation.error);
    }
    
    // 3. Process (mutates state)
    const result = this.stateMachine.processAction(state, action);
    
    // 4. Analyze outcomes (BEFORE cleanup)
    const outcomes = this.analyzeOutcomes(preChangeSnapshot, result.newState, action);
    
    // 5. Create domain events (BEFORE cleanup)
    const events = this.createDomainEvents(preChangeSnapshot, result, outcomes);
    
    // 6. Cleanup (NOW safe)
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
  
  private captureSnapshot(state: GameState): GameStateSnapshot {
    return {
      players: Array.from(state.players.values()).map(p => ({
        id: p.uuid,
        name: p.name,
        stack: p.stack,
        isAllIn: p.isAllIn,
        betThisStreet: p.betThisStreet,
        hasFolded: p.hasFolded
      })),
      pot: state.pot.totalPot,
      communityCards: [...state.handState.communityCards],
      currentStreet: state.currentStreet
    };
  }
  
  private analyzeOutcomes(
    before: GameStateSnapshot,
    after: GameState,
    action: PlayerAction
  ): DomainOutcomes {
    if (after.isHandComplete()) {
      const winners = this.handEvaluator.determineWinners(after);
      const wasAllIn = after.players.every(p => p.isAllIn || p.hasFolded);
      
      return {
        type: 'HAND_COMPLETED',
        wasAllIn,
        potAmount: before.pot,  // Use BEFORE pot
        winners,
        action
      };
    }
    
    if (after.isBettingRoundComplete()) {
      return {
        type: 'BETTING_COMPLETE',
        action
      };
    }
    
    return {
      type: 'ACTION_PROCESSED',
      action
    };
  }
  
  private createDomainEvents(
    snapshot: GameStateSnapshot,
    result: any,
    outcomes: DomainOutcomes
  ): DomainEvent[] {
    const events: DomainEvent[] = [];
    
    // Action processed event
    events.push({
      id: uuid(),
      eventType: 'game.action_processed',
      aggregateType: 'game',
      aggregateId: result.newState.id,
      eventData: {
        playerId: outcomes.action.playerId,
        action: outcomes.action.type,
        amount: outcomes.action.amount
      },
      version: result.newState.version,
      timestamp: new Date()
    });
    
    // Hand completed event
    if (outcomes.type === 'HAND_COMPLETED') {
      events.push({
        id: uuid(),
        eventType: 'game.hand_completed',
        aggregateType: 'game',
        aggregateId: result.newState.id,
        eventData: {
          handNumber: result.newState.handState.handNumber,
          preDistributionSnapshot: snapshot,
          winners: outcomes.winners,
          potAmount: outcomes.potAmount,
          wasAllIn: outcomes.wasAllIn
        },
        version: result.newState.version + 1,
        timestamp: new Date()
      });
    }
    
    return events;
  }
}
```

**Files to Create**:
- `src/domain/engine/GameEngine.ts` (new, wraps existing GameStateMachine)
- `src/domain/types/DomainResult.ts`
- `src/domain/types/DomainOutcomes.ts`

**Files to Modify**:
- `src/core/engine/game-state-machine.ts` (make cleanupHand public)

---

**2.2 Separate GameStateMachine Cleanup** (2 hours)
```typescript
// poker-engine/src/core/engine/game-state-machine.ts

// Make cleanup a separate public method
public cleanupHand(state: GameStateModel): void {
  // Reset player states
  for (const player of state.players.values()) {
    player.resetForNewHand();
  }
  
  // Clear community cards
  state.handState.communityCards = [];
  
  // Reset deck
  state.handState.deck = [];
}

// Remove cleanup from handleEndHand
private handleEndHand(state: GameStateModel, events: GameEvent[]): StateTransitionResult {
  // Determine winners
  const results = this.determineWinners(state);
  
  // Distribute pot
  this.distributePot(state, results);
  
  // Set status
  state.status = GameStatus.COMPLETED;
  state.toAct = null;
  
  // DON'T cleanup here anymore (GameEngine will call it)
  
  return {
    success: true,
    newState: state,
    events  // Don't create events here (GameEngine does it)
  };
}
```

**Files to Modify**:
- `src/core/engine/game-state-machine.ts`

---

**2.3 Create YouTube Entropy Integration Point** (2 hours)
```typescript
// poker-engine/src/common/interfaces/IEntropyProvider.ts
export interface EntropySource {
  type: 'random' | 'youtube' | 'user-provided';
  data?: any;  // Video ID, timestamp, etc.
}

export interface IEntropyProvider {
  generateSeed(source: EntropySource): Promise<string>;
  verifySeed(source: EntropySource, seed: string): Promise<boolean>;
}

// poker-engine/src/infrastructure/entropy/RandomEntropyProvider.ts
export class RandomEntropyProvider implements IEntropyProvider {
  async generateSeed(source: EntropySource): Promise<string> {
    // Default: use crypto.randomBytes
    const bytes = crypto.randomBytes(32);
    return bytes.toString('hex');
  }
  
  async verifySeed(source: EntropySource, seed: string): Promise<boolean> {
    // Random can't be verified
    return false;
  }
}

// poker-engine/src/infrastructure/entropy/YouTubeEntropyProvider.ts
export class YouTubeEntropyProvider implements IEntropyProvider {
  async generateSeed(source: EntropySource): Promise<string> {
    // TODO: Implement when YouTube integration ready
    // For now, throw "not implemented"
    throw new Error('YouTube entropy not yet implemented - use RandomEntropyProvider');
  }
  
  async verifySeed(source: EntropySource, seed: string): Promise<boolean> {
    throw new Error('YouTube entropy not yet implemented');
  }
}
```

**Files to Create**:
- `src/common/interfaces/IEntropyProvider.ts`
- `src/infrastructure/entropy/RandomEntropyProvider.ts`
- `src/infrastructure/entropy/YouTubeEntropyProvider.ts` (stub for later)

**Inject into Deck**:
```typescript
// poker-engine/src/core/card/deck.ts
export class Deck {
  constructor(
    private entropyProvider: IEntropyProvider,
    private entropySource: EntropySource
  ) {}
  
  async shuffle(): Promise<void> {
    const seed = await this.entropyProvider.generateSeed(this.entropySource);
    
    // Use seed for Fisher-Yates
    const rng = this.createSeededRNG(seed);
    
    // Fisher-Yates with seeded RNG
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }
  
  private createSeededRNG(seed: string): () => number {
    // Mulberry32 seeded RNG
    let state = this.hashSeed(seed);
    return () => {
      state = (state + 0x6D2B79F5) | 0;
      let t = Math.imul(state ^ (state >>> 15), 1 | state);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
}
```

**Files to Modify**:
- `src/core/card/deck.ts`

---

**Milestone 2.1 Complete** ✅
- GameEngine wraps StateMachine properly
- Cleanup separated (called after events created)
- YouTube entropy integration point ready (swap in later)

---

### Day 9-10: Application Layer (10-12 hours)
**Goal**: Command/Query buses, orchestration

#### Tasks:

**2.4 Create CommandBus** (3 hours)
```typescript
// poker-engine/src/application/commands/CommandBus.ts
import { ICommandBus, ICommand } from '../../common/interfaces/ICommandBus';

export class CommandBus implements ICommandBus {
  private handlers = new Map<string, ICommandHandler>();
  
  async execute<T>(command: ICommand): Promise<T> {
    const handler = this.handlers.get(command.type);
    
    if (!handler) {
      throw new Error(`No handler registered for command: ${command.type}`);
    }
    
    return handler.handle(command) as Promise<T>;
  }
  
  register(commandType: string, handler: ICommandHandler): void {
    if (this.handlers.has(commandType)) {
      throw new Error(`Handler already registered for: ${commandType}`);
    }
    this.handlers.set(commandType, handler);
  }
}
```

**Files to Create**:
- `src/application/commands/CommandBus.ts`

---

**2.5 Create ProcessPlayerAction Command** (4 hours)
```typescript
// poker-engine/src/application/commands/ProcessPlayerAction/ProcessPlayerActionCommand.ts
export class ProcessPlayerActionCommand implements ICommand {
  readonly type = 'ProcessPlayerAction';
  
  constructor(
    readonly gameId: string,
    readonly playerId: string,
    readonly action: ActionType,
    readonly amount?: number,
    readonly metadata: CommandMetadata = {}
  ) {}
  
  get aggregateId(): string {
    return this.gameId;
  }
}

// poker-engine/src/application/commands/ProcessPlayerAction/ProcessPlayerActionHandler.ts
export class ProcessPlayerActionHandler implements ICommandHandler {
  constructor(
    private gameEngine: GameEngine,
    private gameRepository: IGameRepository,
    private displayStateManager: DisplayStateManager,
    private eventBus: IEventBus
  ) {}
  
  async handle(command: ProcessPlayerActionCommand) {
    // 1. Load game
    const game = await this.gameRepository.getById(command.gameId);
    if (!game) {
      throw new Error('Game not found');
    }
    
    // 2. Execute domain logic
    const domainResult = this.gameEngine.processAction(game, {
      playerId: command.playerId,
      type: command.action,
      amount: command.amount
    });
    
    if (!domainResult.success) {
      throw new Error(domainResult.error);
    }
    
    // 3. Calculate display state
    const displayState = this.displayStateManager.calculateDisplayState(
      domainResult.preChangeSnapshot,
      domainResult.outcomes,
      domainResult.newState
    );
    
    // 4. Persist new state
    await this.gameRepository.save(domainResult.newState);
    
    // 5. Publish domain events
    for (const event of domainResult.events) {
      await this.eventBus.publish(event);
    }
    
    // 6. Return result
    return {
      success: true,
      displayState,
      logicalState: domainResult.newState,
      events: domainResult.events
    };
  }
}
```

**Files to Create**:
- `src/application/commands/ProcessPlayerAction/ProcessPlayerActionCommand.ts`
- `src/application/commands/ProcessPlayerAction/ProcessPlayerActionHandler.ts`

---

**2.6 Update sophisticated-engine-server.js to use CommandBus** (3 hours)
```javascript
// poker-engine/sophisticated-engine-server.js
const { CommandBus } = require('./dist/application/commands/CommandBus');
const { ProcessPlayerActionCommand } = require('./dist/application/commands/ProcessPlayerAction/ProcessPlayerActionCommand');
const { ProcessPlayerActionHandler } = require('./dist/application/commands/ProcessPlayerAction/ProcessPlayerActionHandler');

// Setup dependencies
const eventStore = new PostgresEventStore(db);
const eventBus = new EventBus(eventStore);
const gameRepository = new PostgresGameRepository(db);
const gameEngine = new GameEngine(stateMachine, handEvaluator);
const displayStateManager = new DisplayStateManager();

// Setup command bus
const commandBus = new CommandBus();
commandBus.register(
  'ProcessPlayerAction',
  new ProcessPlayerActionHandler(
    gameEngine,
    gameRepository,
    displayStateManager,
    eventBus
  )
);

// In route handler
app.post('/api/games/:id/actions', async (req, res) => {
  try {
    const command = new ProcessPlayerActionCommand(
      req.params.id,
      req.body.player_id,
      req.body.action,
      req.body.amount
    );
    
    const result = await commandBus.execute(command);
    
    res.json({
      success: true,
      displayState: result.displayState
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
```

**Files to Modify**:
- `sophisticated-engine-server.js` (gradual migration to CommandBus)

---

**Milestone 2.2 Complete** ✅
- CommandBus infrastructure working
- ProcessPlayerAction uses new architecture
- sophisticated-engine-server.js partially migrated

---

## 📅 WEEK 3: POLISH + PRODUCTION

### Day 11-12: Testing (8-10 hours)
**Goal**: Critical paths tested, confidence in refactor

#### Tasks:

**3.1 Domain Layer Tests** (4 hours)
```typescript
// poker-engine/tests/unit/domain/GameEngine.test.ts
describe('GameEngine', () => {
  it('should capture snapshot before distribution', async () => {
    const engine = new GameEngine(stateMachine, evaluator);
    const state = createGameState(); // Helper
    
    const result = engine.processAction(state, {
      playerId: 'p1',
      type: ActionType.AllIn
    });
    
    expect(result.preChangeSnapshot.players[0].isAllIn).toBe(true);
    expect(result.newState.players.get('p1').isAllIn).toBe(false); // Cleaned up
  });
  
  it('should emit events with correct pot amount', async () => {
    // ... test event data has preDistributionSnapshot.pot
  });
});
```

**Test Files to Create**:
- `tests/unit/domain/GameEngine.test.ts`
- `tests/unit/application/DisplayStateManager.test.ts`
- `tests/integration/ProcessPlayerAction.test.ts`

---

**3.2 Integration Tests** (3 hours)
```typescript
// poker-engine/tests/integration/AllInScenario.test.ts
describe('All-In Scenario', () => {
  it('should show correct display state throughout', async () => {
    // Setup game
    const gameId = await createTestGame();
    await joinGame(gameId, 'p1', 500);
    await joinGame(gameId, 'p2', 500);
    await startHand(gameId);
    
    // Player 1 goes all-in
    const result = await processAction(gameId, 'p1', 'ALL_IN');
    
    // Check display state
    expect(result.displayState.players).toEqual([
      { id: 'p1', stack: 0, isAllIn: true },
      { id: 'p2', stack: 500, isAllIn: false }
    ]);
    
    // Player 2 calls
    await processAction(gameId, 'p2', 'CALL', 500);
    
    // Check final state
    const finalState = await getGameState(gameId);
    expect(finalState.players.find(p => p.id === 'p1').stack).toBe(1000);
  });
});
```

**Test Files to Create**:
- `tests/integration/AllInScenario.test.ts`
- `tests/integration/MultiPlayerGame.test.ts`

---

**3.3 E2E Tests** (2 hours)
```typescript
// poker-engine/tests/e2e/FriendsPlayGame.test.ts
describe('Friends Play Game E2E', () => {
  it('should allow 5 friends to play a complete game', async () => {
    // Create room
    const room = await createRoom({ maxPlayers: 9 });
    
    // 5 friends join
    for (let i = 1; i <= 5; i++) {
      await joinRoom(room.id, `friend${i}`);
    }
    
    // Start game
    await startGame(room.id);
    
    // Play 10 hands
    for (let hand = 1; hand <= 10; hand++) {
      await playHand(room.id);
    }
    
    // Check all chips accounted for
    const finalState = await getGameState(room.id);
    const totalChips = finalState.players.reduce((sum, p) => sum + p.stack, 0);
    expect(totalChips).toBe(5 * 500); // 5 players * 500 starting chips
  });
});
```

---

**Milestone 3.1 Complete** ✅
- Critical paths tested
- Confidence in refactored code
- Ready for deployment

---

### Day 13-14: Deployment + Polish (6-8 hours)
**Goal**: Production deployment, friends can play

#### Tasks:

**3.4 Deploy to Production** (3 hours)
```bash
# Setup environment
export DATABASE_URL="postgres://..."
export JWT_SECRET="..."
export NODE_ENV="production"

# Build TypeScript
cd poker-engine
npm run build

# Run migrations
npm run migrate

# Start server
npm run start:prod
```

**Hosting Options**:
- **Render** (easiest): Free tier, auto-deploy from GitHub
- **Railway** (good): $5/month, better performance
- **Fly.io** (scalable): Pay as you grow

---

**3.5 Monitor & Optimize** (2 hours)
```typescript
// Add simple logging
import { Logger } from './utils/Logger';

const logger = new Logger();

commandBus.use(async (command, next) => {
  logger.info('Command received', { type: command.type });
  const start = Date.now();
  
  try {
    const result = await next();
    logger.info('Command succeeded', { 
      type: command.type, 
      duration: Date.now() - start 
    });
    return result;
  } catch (error) {
    logger.error('Command failed', { 
      type: command.type, 
      error: error.message 
    });
    throw error;
  }
});
```

---

**3.6 Share with Friends** (1 hour)
```
1. Create invite link: https://your-poker-app.com/room/abc123
2. Share with 10 friends
3. Test with 5+ concurrent players
4. Collect feedback
5. Fix any issues
```

---

**Milestone 3.2 Complete** ✅
- Deployed to production
- Friends can join and play
- Monitoring in place

---

## 🎯 FINAL STATE (Point B Achieved)

### What You Now Have:

**✅ Functional**:
- 10+ friends can play smooth games
- All-in animations work perfectly
- Unlimited concurrent private games
- Event sourcing (can replay any game)

**✅ Architectural**:
- Modular codebase (layers separated)
- DisplayStateManager (no more display bugs)
- CommandBus + EventBus (decoupled)
- YouTube entropy integration point ready

**✅ Scalable**:
- Event store (analytics ready)
- CQRS-ready (can add read models)
- Repository pattern (can swap DB)
- Clean interfaces (can add features)

**✅ Future-Ready**:
- AI analysis: Subscribe to events
- LLM insights: Query event store
- Tournaments: Add new aggregate
- Public games: Already supports unlimited

---

## 📊 METRICS TO TRACK

### Week 1:
- [ ] Display state bug fixed (manual test)
- [ ] 3 friends play 10 hands (no broken UI)
- [ ] Event store schema created
- [ ] Interfaces defined

### Week 2:
- [ ] GameEngine refactored (tests pass)
- [ ] CommandBus working (integration test)
- [ ] 5 friends play simultaneously (load test)
- [ ] YouTube entropy stub created

### Week 3:
- [ ] 10+ unit tests passing
- [ ] 5+ integration tests passing
- [ ] Deployed to production
- [ ] 10 friends can join and play

---

## 🚨 RISKS & MITIGATION

### Risk 1: Refactoring breaks existing functionality
**Mitigation**: Gradual migration, keep old code until new code tested

### Risk 2: Performance degradation with event sourcing
**Mitigation**: Benchmark early, add caching if needed

### Risk 3: Friends find new bugs during testing
**Mitigation**: Quick hotfix process, rollback capability

### Risk 4: Database migration issues
**Mitigation**: Test migrations on copy of production DB first

---

## 📝 NEXT IMMEDIATE ACTIONS

### Tomorrow (Start Week 1):
1. Create `DisplayStateManager.ts` (3 hours)
2. Modify `game-state-machine.ts` to capture snapshot (2 hours)
3. Wire into `sophisticated-engine-server.js` (2 hours)
4. Test with manual all-in scenario (1 hour)

**Total Day 1**: 8 hours → Friends can test by end of day

### Day After:
1. Create event store schema (2 hours)
2. Create core interfaces (3 hours)
3. Implement EventStore (3 hours)
4. Implement EventBus (2 hours)

**Total Day 2**: 10 hours → Foundation ready

---

## ✅ SUCCESS CRITERIA

**Week 1 Success**:
- [ ] 3+ friends played 10+ hands with no UI bugs
- [ ] Event infrastructure in place

**Week 2 Success**:
- [ ] GameEngine refactored and tested
- [ ] CommandBus handling actions
- [ ] 5+ friends playing simultaneously

**Week 3 Success**:
- [ ] Deployed to production
- [ ] 10+ friends can play
- [ ] Tests passing
- [ ] Monitoring working

**Point B Achieved**:
- [ ] All Week 1-3 criteria met
- [ ] YouTube entropy integration point ready
- [ ] Architecture ready for AI/LLM features
- [ ] Code is maintainable and scalable

---

**Ready to start? Let's begin with Day 1 tomorrow! 🚀**

