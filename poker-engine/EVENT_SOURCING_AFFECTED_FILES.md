# 📁 EVENT SOURCING REFACTOR - AFFECTED FILES MAP

**Scope:** Week 1 Event Sourcing Implementation (Days 2-5)  
**Total Files:** 22 files (13 new, 9 modified)

---

## 📝 DOCUMENTATION CREATED (Last 10 Hours)

### **Architecture & Analysis:**
1. `ARCHITECTURE_FLOW_ANALYSIS.md` (661 lines) - Data flow diagrams
2. `FILE_INVENTORY.md` (938 lines) - Complete file catalog
3. `SCALABLE_ARCHITECTURE_BLUEPRINT.md` (1296 lines) - 8-layer design
4. `IMPLEMENTATION_ROADMAP.md` (1203 lines) - 3-week plan
5. `EXECUTIVE_SUMMARY.md` (453 lines) - Overview
6. `ANALYSIS_SUMMARY.md` (432 lines) - Root cause analysis

### **Implementation Guides:**
7. `QUICK_TEST_GUIDE.md` (169 lines) - Testing instructions
8. `DAY1_COMPLETION_SUMMARY.md` - Technical summary
9. `DAY1_SUCCESS_SUMMARY.md` (191 lines) - Day 1 results
10. `DEBUG_BETTING_ROUND.md` - Betting bug analysis

### **Status & Planning:**
11. `CURRENT_STATUS.md` - Where we are
12. `PROJECT_INDEX_AND_READINESS.md` (548 lines) - Production assessment
13. `REFACTOR_EFFORT_BREAKDOWN.md` (426 lines) - Time estimates
14. `FINAL_READINESS_CHECK.md` - Deployment checklist

**Total Documentation:** ~6,500 lines analyzing 15,500 lines of code

---

## 🗂️ DAY 2: EVENT STORE - Files Affected

### **NEW FILES (3):**

#### 1. `database/migrations/009_event_store.sql`
```sql
CREATE TABLE domain_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100),
  aggregate_type VARCHAR(50),
  aggregate_id VARCHAR(255),
  event_data JSONB,
  metadata JSONB,
  version INTEGER,
  timestamp TIMESTAMPTZ,
  sequence_number SERIAL,
  -- Indexes
);
```
**Purpose:** Store all game events for replay/analytics  
**Size:** ~50 lines

---

#### 2. `src/common/interfaces/IEventStore.ts`
```typescript
export interface DomainEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  eventData: any;
  version: number;
  timestamp: Date;
}

export interface IEventStore {
  append(event: DomainEvent): Promise<void>;
  getByAggregate(aggregateId: string): Promise<DomainEvent[]>;
  getByType(eventType: string): Promise<DomainEvent[]>;
  getStream(aggregateId: string, fromVersion: number): Promise<DomainEvent[]>;
}
```
**Purpose:** Contract for event storage  
**Size:** ~30 lines

---

#### 3. `src/infrastructure/persistence/EventStore.ts`
```typescript
export class PostgresEventStore implements IEventStore {
  constructor(private db: any) {}
  
  async append(event: DomainEvent): Promise<void> {
    // INSERT into domain_events
  }
  
  async getByAggregate(aggregateId: string): Promise<DomainEvent[]> {
    // SELECT WHERE aggregate_id = ...
  }
  
  // ... other methods
}
```
**Purpose:** PostgreSQL implementation of event store  
**Size:** ~150 lines

---

### **MODIFIED FILES (1):**

#### 1. `poker-engine/run-single-migration.js`
**Change:** Update to run migration 009  
**Lines Changed:** 1 line  
**Impact:** Minimal

---

## 🗂️ DAY 3: EVENT BUS - Files Affected

### **NEW FILES (3):**

#### 1. `src/common/interfaces/IEventBus.ts`
```typescript
export type EventHandler = (event: DomainEvent) => Promise<void> | void;

export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  subscribe(pattern: string, handler: EventHandler): void;
  unsubscribe(pattern: string, handler: EventHandler): void;
}
```
**Purpose:** Contract for pub/sub event system  
**Size:** ~25 lines

---

#### 2. `src/application/events/EventBus.ts`
```typescript
export class EventBus implements IEventBus {
  private subscribers = new Map<string, EventHandler[]>();
  
  constructor(private eventStore: IEventStore) {}
  
  async publish(event: DomainEvent): Promise<void> {
    await this.eventStore.append(event);
    const handlers = this.getMatchingHandlers(event.eventType);
    await Promise.all(handlers.map(h => h(event)));
  }
  
  // ... subscribe/unsubscribe logic
}
```
**Purpose:** In-memory pub/sub with persistence  
**Size:** ~120 lines

---

#### 3. `src/application/events/EventHandler.ts`
```typescript
export abstract class EventHandler {
  abstract handle(event: DomainEvent): Promise<void> | void;
  abstract canHandle(eventType: string): boolean;
}
```
**Purpose:** Base class for event handlers  
**Size:** ~20 lines

---

### **MODIFIED FILES (0):**
None - EventBus is isolated

---

## 🗂️ DAY 4: WIRE EVENTS - Files Affected

### **NEW FILES (2):**

#### 1. `src/application/events/handlers/GameEventHandler.ts`
```typescript
export class GameEventHandler extends EventHandler {
  handle(event: DomainEvent) {
    switch(event.eventType) {
      case 'game.action_processed':
        // Log to database
        break;
      case 'game.hand_completed':
        // Update statistics
        break;
    }
  }
}
```
**Purpose:** Handle game-related events  
**Size:** ~80 lines

---

#### 2. `src/application/events/handlers/WebSocketEventHandler.ts`
```typescript
export class WebSocketEventHandler extends EventHandler {
  constructor(private io: any) {}
  
  handle(event: DomainEvent) {
    // Transform domain event → socket message
    // Broadcast to appropriate room
  }
}
```
**Purpose:** Broadcast events via WebSocket  
**Size:** ~100 lines

---

### **MODIFIED FILES (2):**

#### 1. `src/core/engine/game-state-machine.ts`
**Changes:**
- Add `eventBus` parameter to constructor
- Emit events through EventBus instead of just returning them
- Lines affected: ~20 lines added

```typescript
// OLD
events.push({ type: 'HAND_COMPLETED', data: {...} });

// NEW
await this.eventBus.publish({
  eventType: 'game.hand_completed',
  aggregateId: state.id,
  eventData: {...}
});
```

---

#### 2. `poker-engine/sophisticated-engine-server.js`
**Changes:**
- Import EventBus, EventStore
- Initialize EventBus
- Subscribe WebSocketEventHandler
- Subscribe GameEventHandler
- Lines affected: ~30 lines added

```typescript
// NEW
const eventStore = new PostgresEventStore(db);
const eventBus = new EventBus(eventStore);
eventBus.subscribe('game.*', new WebSocketEventHandler(io));
eventBus.subscribe('game.*', new GameEventHandler());
```

---

## 🗂️ DAY 5: EVENT REPLAY - Files Affected

### **NEW FILES (1):**

#### 1. `src/application/services/EventReplayer.ts`
```typescript
export class EventReplayer {
  constructor(
    private eventStore: IEventStore,
    private gameEngine: GameEngine
  ) {}
  
  async rebuildGameState(gameId: string): Promise<GameState> {
    const events = await this.eventStore.getByAggregate(gameId);
    
    let state = new GameState();
    for (const event of events) {
      state = this.applyEvent(state, event);
    }
    
    return state;
  }
}
```
**Purpose:** Rebuild game state from events  
**Size:** ~150 lines

---

### **MODIFIED FILES (1):**

#### 1. `poker-engine/sophisticated-engine-server.js`
**Changes:**
- Add crash recovery on startup
- Check for incomplete games in DB
- Replay events to recover state
- Lines affected: ~40 lines added

```typescript
// NEW: On server startup
async function recoverGames() {
  const incompleteGames = await getIncompleteGames();
  for (const gameId of incompleteGames) {
    const state = await eventReplayer.rebuildGameState(gameId);
    games.set(gameId, state);
  }
}
```

---

## 📊 COMPLETE AFFECTED FILES SUMMARY

### **NEW FILES TO CREATE (13):**

**Database:**
1. `database/migrations/009_event_store.sql`

**Interfaces (Contracts):**
2. `src/common/interfaces/IEventStore.ts`
3. `src/common/interfaces/IEventBus.ts`

**Infrastructure (Database):**
4. `src/infrastructure/persistence/EventStore.ts`

**Application (Business Logic):**
5. `src/application/events/EventBus.ts`
6. `src/application/events/EventHandler.ts`
7. `src/application/events/handlers/GameEventHandler.ts`
8. `src/application/events/handlers/WebSocketEventHandler.ts`
9. `src/application/services/EventReplayer.ts`

**Utilities:**
10. `tests/helpers/event-fixtures.ts` (for testing)
11. `tests/unit/application/EventBus.test.ts` (tests)
12. `tests/unit/infrastructure/EventStore.test.ts` (tests)
13. `tests/integration/EventReplay.test.ts` (tests)

---

### **EXISTING FILES TO MODIFY (9):**

**Core Engine:**
1. `src/core/engine/game-state-machine.ts` (~20 lines added)
   - Add EventBus injection
   - Publish events instead of just returning

**Server:**
2. `poker-engine/sophisticated-engine-server.js` (~70 lines added)
   - Import EventBus/EventStore
   - Initialize event infrastructure
   - Subscribe handlers
   - Add crash recovery

**Configuration:**
3. `poker-engine/package.json` (add dependencies if needed)
4. `poker-engine/tsconfig.json` (may need path updates)

**Utilities:**
5. `poker-engine/run-single-migration.js` (update migration number)

**Types:**
6. `src/types/common.types.ts` (may add event-related types)

**Existing Repositories (if we connect them):**
7. `src/services/database/repos/actions.repo.ts` (may integrate)
8. `src/services/database/repos/hands.repo.ts` (may integrate)
9. `src/services/game-service.ts` (may integrate EventBus)

---

## 🔗 FILE DEPENDENCY MAP

### **Event Sourcing Dependencies:**

```
domain_events (DB table)
    ↓
IEventStore (interface)
    ↓
EventStore (implementation)
    ↓
EventBus (uses EventStore)
    ↓
    ├─→ EventHandlers subscribe to EventBus
    │   ├─→ GameEventHandler (logs to DB)
    │   └─→ WebSocketEventHandler (broadcasts)
    │
    └─→ GameStateMachine publishes to EventBus
```

---

## 📦 NEW DIRECTORY STRUCTURE

```
poker-engine/src/
├── common/
│   └── interfaces/           ← NEW
│       ├── IEventStore.ts    ← NEW
│       └── IEventBus.ts      ← NEW
│
├── infrastructure/
│   └── persistence/          ← EXISTS, ADD TO IT
│       └── EventStore.ts     ← NEW
│
├── application/
│   ├── events/               ← NEW
│   │   ├── EventBus.ts       ← NEW
│   │   ├── EventHandler.ts   ← NEW
│   │   └── handlers/         ← NEW
│   │       ├── GameEventHandler.ts        ← NEW
│   │       └── WebSocketEventHandler.ts   ← NEW
│   ├── services/             ← EXISTS
│   │   ├── DisplayStateManager.ts  ← EXISTS (Day 1)
│   │   └── EventReplayer.ts        ← NEW
│   └── types/                ← EXISTS
│       └── DisplayState.types.ts   ← EXISTS (Day 1)
│
└── core/
    └── engine/
        └── game-state-machine.ts  ← MODIFY (~20 lines)
```

---

## 🎯 IMPACT ANALYSIS

### **Low Risk Changes (Isolated):**
- Creating new interfaces ✅
- Creating EventStore ✅
- Creating EventBus ✅
- Creating EventHandlers ✅

### **Medium Risk Changes (Integration):**
- Wiring EventBus to server ⚠️
- Modifying game-state-machine ⚠️

### **High Risk Changes (Breaking):**
- None for Week 1 (event sourcing is additive)

---

## 📊 CODE IMPACT BY FILE

| File | Current Lines | Lines Added | Lines Modified | New Total | Risk |
|------|--------------|-------------|----------------|-----------|------|
| `game-state-machine.ts` | 1025 | +20 | 5 | 1045 | Medium |
| `sophisticated-engine-server.js` | 1695 | +70 | 10 | 1765 | Medium |
| **New files** | 0 | +700 | 0 | 700 | Low |
| **TOTAL** | | **+790** | **15** | | |

---

## 🧪 TESTING REQUIREMENTS

### **Per Day Testing:**
- Day 2: Test EventStore (1 hour)
  - Append events
  - Query by aggregate
  - Query by type

- Day 3: Test EventBus (1 hour)
  - Publish/subscribe
  - Pattern matching
  - Handler execution

- Day 4: Test Integration (2 hours)
  - Events published on actions
  - Handlers receive events
  - WebSocket broadcasts

- Day 5: Test Replay (2 hours)
  - Kill server mid-game
  - Restart server
  - Verify state recovered

**Total Testing Time:** 6 hours

---

## 🔄 MIGRATION STRATEGY

### **Approach: Additive (Low Risk)**

Event sourcing will be **added alongside** existing code:

```
CURRENT FLOW (keeps working):
Action → Engine → Server → Database
                    ↓
                WebSocket → Client

NEW FLOW (runs in parallel):
Action → Engine → EventBus → EventStore (persisted)
                    ↓
                Handlers → WebSocket/DB/Analytics
```

**Benefits:**
- ✅ Old code still works
- ✅ Can test new system in parallel
- ✅ Can rollback easily
- ✅ Gradual migration

---

## 📁 FILES FROM EXISTING CODEBASE WE'LL USE

### **Already Exists (Will Integrate):**

#### 1. `src/services/database/repos/actions.repo.ts`
**Current:** Saves actions to `actions` table  
**Integration:** GameEventHandler can use this  
**Change:** None needed (already compatible)

#### 2. `src/services/database/repos/hands.repo.ts`
**Current:** Saves hands to `hands` table  
**Integration:** GameEventHandler can use this  
**Change:** None needed

#### 3. `src/services/game-service.ts`
**Current:** High-level game orchestration  
**Integration:** Could use EventBus (optional)  
**Change:** Optional (~20 lines to integrate)

#### 4. `src/websocket/server.ts`
**Current:** Minimal Socket.io setup  
**Integration:** WebSocketEventHandler extends this  
**Change:** None needed (handler wraps it)

---

## 🎯 CRITICAL FILES TO MODIFY

### **Only 2 Files Need Real Changes:**

#### 1. `src/core/engine/game-state-machine.ts`
**Current State:** Pure game logic, returns events in array  
**New State:** Publishes events to EventBus

**Change:**
```typescript
// OLD (lines 475-487)
events.push({
  type: 'HAND_COMPLETED',
  data: { ... }
});
return { success: true, newState, events };

// NEW
await this.eventBus.publish({
  eventType: 'game.hand_completed',
  aggregateId: state.id,
  eventData: { ... }
});
return { success: true, newState };
```

**Risk:** Medium (core file, but change is localized)

---

#### 2. `poker-engine/sophisticated-engine-server.js`
**Current State:** Monolithic, inline logic  
**New State:** Subscribes to events, delegates to handlers

**Change:**
```typescript
// Add at startup (lines ~40-60)
const eventStore = new PostgresEventStore(getDb());
const eventBus = new EventBus(eventStore);

// Subscribe handlers
eventBus.subscribe('game.*', new GameEventHandler());
eventBus.subscribe('game.*', new WebSocketEventHandler(io));

// On startup, recover games
await recoverGamesFromEvents();
```

**Risk:** Medium (server file, but additive changes)

---

## 🚨 RISK ASSESSMENT

### **What Could Break:**

**Low Risk (Additive):**
- Creating new files ✅
- New migrations ✅
- New interfaces ✅

**Medium Risk (Integration):**
- EventBus not receiving events ⚠️
  - Mitigation: Add logging, test thoroughly
- Event handlers throwing errors ⚠️
  - Mitigation: Try/catch, graceful degradation
- EventStore connection issues ⚠️
  - Mitigation: Fallback to current behavior

**High Risk (Breaking):**
- None if we keep current flow working

---

## 💾 BACKUP STRATEGY

### **Before Starting Day 2:**
```bash
# Create backup branch
git checkout -b backup/before-event-sourcing

# Tag current working state
git tag v1.0-working-basic

# Return to refactor branch
git checkout refactor/display-state-architecture
```

### **If Something Breaks:**
```bash
# Revert to working state
git checkout v1.0-working-basic
```

---

## 📋 EXECUTION CHECKLIST

### **Before Starting:**
- [ ] Review all documentation created
- [ ] Understand file dependencies
- [ ] Create backup branch/tag
- [ ] Commit current working state
- [ ] Have 12-15 hours available

### **Day 2 (Event Store):**
- [ ] Create migration 009
- [ ] Create IEventStore interface
- [ ] Implement EventStore
- [ ] Run migration
- [ ] Test append/query
- [ ] Commit

### **Day 3 (Event Bus):**
- [ ] Create IEventBus interface
- [ ] Implement EventBus
- [ ] Create EventHandler base
- [ ] Test pub/sub
- [ ] Commit

### **Day 4 (Integration):**
- [ ] Create GameEventHandler
- [ ] Create WebSocketEventHandler  
- [ ] Modify game-state-machine
- [ ] Wire into server
- [ ] Test end-to-end
- [ ] Commit

### **Day 5 (Replay):**
- [ ] Create EventReplayer
- [ ] Add recovery to server startup
- [ ] Test crash recovery
- [ ] Commit

---

## 🎯 SUMMARY

**Files Created:** 13 new files (~1,200 lines)  
**Files Modified:** 9 files (~150 lines changed)  
**Total Code Added:** ~1,350 lines  
**Time Required:** 12-15 hours  

**Risk Level:** Medium (mostly additive, 2 core files modified)  
**Rollback Strategy:** Tag current state, revert if needed  

---

## ✅ READY TO START?

**All files mapped. Dependencies clear. Risks identified.**

**Say "START DAY 2" and I'll begin with Event Store!** 🚀

