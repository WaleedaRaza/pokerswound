# 📐 Architectural Contracts & Behavioral Expectations

**Purpose:** Define clear boundaries and responsibilities for each layer  
**For:** AI assistants to understand system behavior without breaking contracts  
**Created:** October 21, 2025

---

## 🎯 Core Principle: Explicit Contracts

Each layer has:
1. **Responsibilities** - What it MUST do
2. **Constraints** - What it MUST NOT do
3. **Interfaces** - How other layers interact with it
4. **Invariants** - Conditions that must ALWAYS be true

---

## 🗄️ Layer 1: Database & Persistence

### Responsibilities
```typescript
interface DatabaseLayer {
  // MUST persist game state atomically
  saveGameState(gameId: string, state: GameState): Promise<void>
  
  // MUST return null if not found (never throw on not found)
  getGameState(gameId: string): Promise<GameState | null>
  
  // MUST log all game events for audit trail
  logEvent(event: GameEvent): Promise<void>
  
  // MUST handle connection failures gracefully
  // Returns connection status without crashing
  checkHealth(): Promise<{ healthy: boolean; error?: string }>
}
```

### Constraints
```yaml
❌ MUST NOT expose raw SQL to upper layers
❌ MUST NOT cache state in memory (that's StorageAdapter's job)
❌ MUST NOT modify state (read-only from DB perspective)
❌ MUST NOT throw errors on connection loss (return status instead)
❌ MUST NOT auto-reconnect without logging
```

### Contract with Upper Layers
```typescript
// Upper layers (Service Layer) can assume:

// 1. Calls are atomic - no partial saves
const saved = await db.saveGameState(id, state);
// Either ALL fields saved or NONE saved

// 2. Optimistic locking prevents race conditions
await db.saveGameState(id, stateV1); // version: 1
await db.saveGameState(id, stateV2); // version: 2
await db.saveGameState(id, stateV1); // ❌ MUST fail (stale version)

// 3. Null means "not found" (not error)
const state = await db.getGameState('nonexistent-id');
if (state === null) {
  // Expected behavior - not an error
}

// 4. Connection loss returns unhealthy status
const { healthy, error } = await db.checkHealth();
if (!healthy) {
  // System should degrade gracefully, not crash
}
```

### Invariants
```yaml
# These conditions MUST ALWAYS be true:

1. Every save increments version number
   - state.version(before save) + 1 === state.version(after save)

2. Event log is append-only
   - Events never deleted or modified
   - Sequence numbers always increasing

3. Transactions are ACID
   - Atomicity: All-or-nothing saves
   - Consistency: Schema constraints enforced
   - Isolation: No dirty reads
   - Durability: Committed = persisted

4. Connection pool never exhausted
   - Max connections: 20
   - Idle timeout: 30s
   - Connection timeout: 5s
```

---

## 🎮 Layer 2: Game Engine (Core Logic)

### Responsibilities
```typescript
interface GameEngine {
  // MUST enforce poker rules
  validateAction(gameState: GameState, action: Action): ValidationResult
  
  // MUST calculate game state transitions deterministically
  // Same input → Same output (no hidden randomness)
  processAction(gameState: GameState, action: Action): GameState
  
  // MUST evaluate hands correctly according to poker rules
  evaluateHand(holeCards: Card[], communityCards: Card[]): HandRank
  
  // MUST distribute pot fairly (no rounding errors)
  distributePot(gameState: GameState): { winners: Player[], amounts: number[] }
}
```

### Constraints
```yaml
❌ MUST NOT access database directly (use StorageAdapter)
❌ MUST NOT mutate input gameState (return new state)
❌ MUST NOT generate events (that's StateMachine's job)
❌ MUST NOT use Math.random() for shuffles (use seeded RNG)
❌ MUST NOT skip validation even if "trusted" input
```

### Contract with Upper Layers
```typescript
// Service Layer can assume:

// 1. Pure functions - no side effects
const newState = engine.processAction(oldState, action);
// oldState is unchanged
// newState is new object

// 2. Validation before mutation
const { valid, error } = engine.validateAction(state, action);
if (!valid) {
  throw new Error(error); // Will never get invalid state
}
const newState = engine.processAction(state, action);

// 3. Deterministic shuffle
const deck1 = engine.shuffleDeck(seed='abc123');
const deck2 = engine.shuffleDeck(seed='abc123');
// deck1 === deck2 (same order)

// 4. No data loss in state transitions
const chips_before = sumAllChips(oldState);
const newState = engine.processAction(oldState, action);
const chips_after = sumAllChips(newState);
// chips_before === chips_after (conservation of chips)
```

### Invariants
```yaml
# These conditions MUST ALWAYS be true:

1. Chip conservation
   - Sum of all player stacks + pot = Constant
   - No chips created or destroyed

2. Game state validity
   - Only one player can be "to act"
   - Pot >= sum of all bets this street
   - Community cards match street (3 at flop, 4 at turn, 5 at river)

3. Action ordering
   - Player can only act when it's their turn
   - Turn advances clockwise around table
   - Betting round ends when all bets matched

4. Hand evaluation consistency
   - evaluateHand(cards) called twice → same result
   - Royal flush always beats straight
   - Kickers break ties correctly
```

---

## 🚀 Layer 3: Application Services (Orchestration)

### Responsibilities
```typescript
interface ApplicationService {
  // MUST coordinate between layers
  async createGame(options: GameOptions): Promise<Game>
  
  // MUST enforce business rules
  async joinGame(gameId: string, userId: string): Promise<void>
  
  // MUST handle errors gracefully
  async processPlayerAction(
    gameId: string, 
    userId: string, 
    action: Action
  ): Promise<ActionResult>
  
  // MUST emit events for side effects
  async publishEvent(event: GameEvent): Promise<void>
}
```

### Constraints
```yaml
❌ MUST NOT contain game logic (that's Engine's job)
❌ MUST NOT manipulate state directly (use Engine)
❌ MUST NOT query database directly (use Repository)
❌ MUST NOT handle HTTP/WebSocket (that's API layer)
❌ MUST NOT block on event publishing (fire-and-forget)
```

### Contract with Upper Layers
```typescript
// API Layer can assume:

// 1. Business rules enforced
try {
  await service.joinGame(gameId, userId);
  // Success means: user added, seat claimed, chips deducted
} catch (error) {
  // Error means: NOTHING changed (atomic operation)
}

// 2. Events published automatically
await service.processPlayerAction(gameId, userId, action);
// Events emitted: 'ACTION_PROCESSED', 'POT_UPDATED', 'TURN_ADVANCED'
// API layer doesn't need to publish them

// 3. Async operations don't block
const promise = service.processPlayerAction(...);
// Returns immediately (doesn't wait for event handlers)
await promise; // Only waits for state update, not side effects

// 4. Errors are typed and actionable
try {
  await service.joinGame(gameId, userId);
} catch (error) {
  if (error instanceof GameFullError) {
    res.status(400).json({ error: 'Game is full' });
  } else if (error instanceof InsufficientChipsError) {
    res.status(400).json({ error: 'Not enough chips' });
  }
  // Error types tell API layer what HTTP status to return
}
```

### Invariants
```yaml
# These conditions MUST ALWAYS be true:

1. Atomicity of operations
   - Operation succeeds → ALL side effects complete
   - Operation fails → NO side effects (rollback)

2. Event causality
   - Events published in chronological order
   - Event N+1 cannot be published before event N
   - Event timestamps always increasing

3. State consistency
   - Database state matches in-memory state after save
   - No "phantom" states (state exists in DB or nowhere)

4. Idempotency
   - Calling same operation twice with same params = same result
   - Example: joinGame(id, user) called twice → user only joined once
```

---

## 🌐 Layer 4: API / WebSocket (Interface)

### Responsibilities
```typescript
interface APILayer {
  // MUST validate HTTP input
  validateRequest(req: Request): ValidationResult
  
  // MUST authenticate requests
  authenticateUser(req: Request): Promise<User | null>
  
  // MUST transform domain models to API responses
  serializeGameState(state: GameState): APIResponse
  
  // MUST rate-limit requests
  checkRateLimit(userId: string, endpoint: string): Promise<boolean>
}
```

### Constraints
```yaml
❌ MUST NOT contain business logic (delegate to Service layer)
❌ MUST NOT access database directly (use Service)
❌ MUST NOT access game engine directly (use Service)
❌ MUST NOT trust user input (validate everything)
❌ MUST NOT expose internal errors to client (sanitize)
```

### Contract with Client (Frontend)
```typescript
// Frontend can assume:

// 1. Consistent response format
GET /api/games/:id
{
  "gameId": "uuid",
  "status": "ACTIVE",
  "players": [...],
  "pot": 100
}
// These fields ALWAYS present (never undefined)

// 2. HTTP status codes meaningful
200 OK       → Success
400 Bad Request → Invalid input (check body)
401 Unauthorized → Need to login
404 Not Found → Resource doesn't exist
500 Server Error → Server issue (not client's fault)

// 3. Errors are actionable
{
  "error": "Validation failed",
  "details": [
    { "field": "amount", "message": "Must be positive" }
  ]
}
// Client knows WHAT went wrong and WHERE

// 4. WebSocket events are ordered
socket.on('action_processed', handler1); // Fires first
socket.on('pot_updated', handler2);      // Fires second
socket.on('turn_advanced', handler3);    // Fires third
// Order guaranteed for same game
```

### Invariants
```yaml
# These conditions MUST ALWAYS be true:

1. Authentication before authorization
   - Auth check happens before ANY business logic
   - Unauthenticated requests rejected at API boundary

2. Input validation completeness
   - ALL fields validated (including optional ones)
   - Validation happens before any processing
   - Invalid input → 400 error (never reaches service layer)

3. Response stability
   - Same request → Same response format
   - New fields added, never removed (backward compatibility)
   - Field types never change (string stays string)

4. Rate limiting fairness
   - Per-user limits (not global)
   - Sliding window (not fixed intervals)
   - Burst allowance for UX (allow 3 quick requests)
```

---

## 🎨 Layer 5: Frontend (UI State)

### Responsibilities
```typescript
interface FrontendLayer {
  // MUST reflect server state accurately
  renderGameState(state: GameState): void
  
  // MUST optimistically update UI
  handlePlayerAction(action: Action): void
  
  // MUST reconcile optimistic updates with server response
  onServerStateUpdate(state: GameState): void
  
  // MUST handle disconnections gracefully
  onWebSocketDisconnect(): void
}
```

### Constraints
```yaml
❌ MUST NOT calculate game logic (always defer to server)
❌ MUST NOT trust local state (server is source of truth)
❌ MUST NOT send requests without auth token
❌ MUST NOT retry failed requests indefinitely
❌ MUST NOT expose sensitive data in localStorage
```

### Contract with Server (API Layer)
```typescript
// Frontend can assume:

// 1. Server state is authoritative
const localState = calculateOptimistically(action);
const serverState = await fetchGameState();
if (localState !== serverState) {
  renderGameState(serverState); // Server wins
}

// 2. WebSocket events are reliable
socket.on('game_state_update', (state) => {
  // This WILL arrive (Socket.IO guarantees delivery)
  // But might be delayed (handle stale updates)
});

// 3. Idempotent requests
await submitAction(action); // Call 1
await submitAction(action); // Call 2 (duplicate)
// Server handles idempotency (action only processed once)

// 4. Graceful degradation
if (!socket.connected) {
  // Fall back to polling
  const state = await fetch('/api/games/:id');
  renderGameState(state);
}
```

### Invariants
```yaml
# These conditions MUST ALWAYS be true:

1. Optimistic UI follows server rules
   - Local state changes follow same logic as server
   - If server would reject action, UI should too (disable button)

2. Auth token freshness
   - Token checked before EVERY request
   - Expired token → Refresh or redirect to login
   - Never send expired token

3. State reconciliation on mismatch
   - Optimistic update shows immediately
   - Server response within 2 seconds → Reconcile
   - Mismatch detected → Revert to server state

4. Error recovery
   - Failed request → Retry 3 times with backoff
   - Still failing → Show user-friendly error
   - User can manually retry or refresh
```

---

## 🔄 Cross-Layer Contracts

### Data Flow: User Action → Database
```
Frontend → API → Service → Engine → Repository → Database
   ↓        ↓       ↓        ↓          ↓          ↓
[Click] [Auth] [Validate] [Logic] [Save] [Persist]

Return path:
Database → Repository → Service → API → Frontend
   ↓          ↓          ↓       ↓        ↓
[Read]    [Query]   [Transform] [Serialize] [Render]
```

**Contract Violations:**
```typescript
// ❌ WRONG: Frontend directly accessing database
const state = await database.query('SELECT * FROM games');

// ✅ RIGHT: Frontend through proper layers
const state = await fetch('/api/games/:id')
  .then(res => res.json());

// ❌ WRONG: API layer containing game logic
app.post('/api/games/:id/action', (req, res) => {
  if (player.stack < currentBet) {  // Game logic in API
    return res.status(400).json({error: 'Insufficient chips'});
  }
});

// ✅ RIGHT: API delegates to Service
app.post('/api/games/:id/action', (req, res) => {
  try {
    await gameService.processAction(gameId, userId, action);
    res.json({ success: true });
  } catch (InsufficientChipsError e) {
    res.status(400).json({ error: e.message });
  }
});
```

### Event Flow: State Change → Notifications
```
Service → EventBus → Handlers → [ Database | WebSocket | Logger ]
   ↓         ↓          ↓              ↓          ↓          ↓
[Emit]  [Subscribe] [Process]      [Persist]  [Broadcast] [Log]

Parallel execution (fire-and-forget):
EventBus publishes to ALL handlers simultaneously
Handlers don't wait for each other
Service doesn't wait for handlers
```

**Contract Violations:**
```typescript
// ❌ WRONG: Service waits for event handlers
await eventBus.publish(event);
await Promise.all(handlers.map(h => h.handle(event)));

// ✅ RIGHT: Service publishes and continues
eventBus.publish(event); // Fire-and-forget
// Service continues immediately

// ❌ WRONG: Handler modifies state
eventBus.on('action_processed', async (event) => {
  event.data.pot += 10; // Mutation!
  await database.save(event.data);
});

// ✅ RIGHT: Handler only reads and persists
eventBus.on('action_processed', async (event) => {
  const immutableCopy = { ...event.data };
  await database.save(immutableCopy);
});
```

---

## 🧪 Testing Contracts

### Unit Test Contracts
```typescript
// Each layer tested in isolation with mocked dependencies

describe('GameEngine', () => {
  it('MUST return new state without mutating input', () => {
    const originalState = createTestState();
    const originalCopy = deepClone(originalState);
    
    const newState = engine.processAction(originalState, action);
    
    expect(originalState).toEqual(originalCopy); // No mutation
    expect(newState).not.toBe(originalState);    // New object
  });
  
  it('MUST conserve chips across transitions', () => {
    const state = createTestState();
    const chipsBefore = sumAllChips(state);
    
    const newState = engine.processAction(state, action);
    const chipsAfter = sumAllChips(newState);
    
    expect(chipsAfter).toBe(chipsBefore);
  });
});
```

### Integration Test Contracts
```typescript
// Multiple layers tested together

describe('Game Flow', () => {
  it('MUST persist action to database', async () => {
    // Setup
    const gameId = await service.createGame(options);
    
    // Act
    await service.processAction(gameId, userId, action);
    
    // Assert - read from DB (not in-memory cache)
    const savedState = await repository.findById(gameId);
    expect(savedState.actionHistory).toContainEqual(action);
  });
  
  it('MUST emit events in correct order', async () => {
    const events = [];
    eventBus.onAny((type, data) => events.push({ type, data }));
    
    await service.processAction(gameId, userId, action);
    
    expect(events[0].type).toBe('ACTION_PROCESSED');
    expect(events[1].type).toBe('POT_UPDATED');
    expect(events[2].type).toBe('TURN_ADVANCED');
  });
});
```

---

## 🔒 Security Contracts

### Authentication Contract
```typescript
// EVERY protected endpoint MUST verify auth BEFORE processing

// ✅ CORRECT ORDER:
app.post('/api/games/:id/action', 
  authenticateUser,     // 1. Auth first
  validateInput,        // 2. Validate input
  checkRateLimit,       // 3. Rate limit
  async (req, res) => { // 4. Business logic
    await gameService.processAction(...);
  }
);

// ❌ WRONG ORDER:
app.post('/api/games/:id/action', 
  async (req, res) => {
    await gameService.processAction(...); // Business logic first
    authenticateUser(req, res, () => {}); // Auth after ❌
  }
);
```

### Input Validation Contract
```typescript
// EVERY input MUST be validated before use

// ✅ CORRECT:
const schema = z.object({
  amount: z.number().int().positive().max(1000000)
});

const validatedData = schema.parse(req.body); // Throws if invalid
const amount = validatedData.amount; // Use validated data

// ❌ WRONG:
const amount = req.body.amount; // Use raw input
if (amount < 0) throw new Error('Invalid'); // Validation after use
```

---

## 📚 Documentation Contracts

Every layer MUST document:

1. **Public Interface** - What other layers can call
2. **Contracts** - What callers can assume
3. **Invariants** - What conditions must always hold
4. **Error Cases** - What errors are thrown and why
5. **Side Effects** - What external state is modified

**Example:**
```typescript
/**
 * Process a player action in a poker game.
 * 
 * @param gameId - Unique game identifier (UUID format)
 * @param userId - User performing action (UUID format)
 * @param action - Action to perform (FOLD, CALL, RAISE, etc.)
 * 
 * @returns Updated game state after action
 * 
 * @throws {GameNotFoundError} If game doesn't exist
 * @throws {InvalidActionError} If action is illegal
 * @throws {NotYourTurnError} If it's not user's turn
 * 
 * @sideEffects 
 * - Saves updated state to database
 * - Publishes ACTION_PROCESSED event
 * - Broadcasts to WebSocket clients
 * 
 * @invariants
 * - Game state consistency maintained
 * - Chip conservation preserved
 * - Turn order advanced correctly
 * 
 * @example
 * ```typescript
 * const newState = await service.processAction(
 *   'game-123',
 *   'user-456',
 *   { type: 'RAISE', amount: 50 }
 * );
 * ```
 */
async processAction(
  gameId: string,
  userId: string,
  action: Action
): Promise<GameState>
```

---

**Document Version:** 1.0  
**Last Updated:** October 21, 2025  
**Reviewed By:** AI Engineering Team

