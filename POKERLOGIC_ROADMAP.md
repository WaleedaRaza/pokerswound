# Roadmap: From Current Architecture to Production-Grade PokerLogic Spec

**Goal:** Align our modular JavaScript engine with the comprehensive poker logic spec in `pokerlogic.txt`, ensuring clean translation to frontend and routes.

---

## 📊 CURRENT STATE vs. POKERLOGIC SPEC

### ✅ What We Have (Mapped to 6 Pillars)

| PokerLogic Pillar | Current Module | Status | Coverage |
|-------------------|----------------|--------|----------|
| **1. State Machine** | `game-logic.js` (partial) | ⚠️ Partial | Has street transitions, missing explicit state machine |
| **2. Action Validator** | `betting-logic.js` (`validateAction`) | ✅ Good | Covers most rules, needs edge cases |
| **3. Betting Engine** | `betting-logic.js` (`applyAction`) | ✅ Good | Handles chips, bets, all-ins |
| **4. Pot Manager** | `pot-logic.js` | ✅ Good | Side pots, chip conservation |
| **5. Seat & Turn Manager** | `turn-logic.js` | ⚠️ Partial | Has turn rotation, missing seat management |
| **6. Showdown Engine** | `rules-ranks.js` + `simple-hand-evaluator.js` | ✅ Good | Hand evaluation works |

### ❌ What's Missing

1. **Explicit State Machine** - No `INIT`, `HAND_END` states, no state transition validation
2. **Seat Manager** - No centralized seat/blind/button management
3. **Disconnect Handling** - No forced fold/check on timeout
4. **Dead Blinds** - No handling of busted SB/BB scenarios
5. **Zero-Chip Edge Cases** - No "free check/fold" logic
6. **Misdeal Detection** - No validation of deck integrity
7. **Post-Hand Logic** - Button rotation, busted player removal not centralized

---

## 🎯 PHASE 1: ARCHITECTURAL ALIGNMENT (Foundation)

### Goal: Restructure modules to match PokerLogic's 6 pillars exactly

### 1.1 Create Explicit State Machine Module

**File:** `src/adapters/state-machine.js` (NEW)

```javascript
/**
 * STATE MACHINE MODULE
 * 
 * Purpose: Explicit game state transitions
 * States: INIT → PRE_FLOP → FLOP → TURN → RIVER → SHOWDOWN → HAND_END
 * 
 * Invariants:
 * - State transitions only when betting engine reports "action closed"
 * - Never render UI based on assumption - always read from state machine
 */

const VALID_STATES = ['INIT', 'PRE_FLOP', 'FLOP', 'TURN', 'RIVER', 'SHOWDOWN', 'HAND_END'];

function canTransition(currentState, nextState, gameState) {
  // Validate transition rules
  // e.g., SHOWDOWN can only go to HAND_END
  // e.g., PRE_FLOP can only go to FLOP or HAND_END (fold win)
}

function transition(gameState, nextState) {
  // Validate and execute state transition
  // Update gameState.street = nextState
  // Emit state transition event
}
```

**Integration:** Replace direct `gameState.street = 'FLOP'` assignments with `stateMachine.transition(gameState, 'FLOP')`

### 1.2 Extract Seat Manager from Turn Logic

**File:** `src/adapters/seat-manager.js` (NEW)

```javascript
/**
 * SEAT MANAGER MODULE
 * 
 * Purpose: Dealer button, blinds, seat assignment
 * Responsibilities:
 * - Rotate dealer button each HAND_END
 * - Assign SB and BB positions
 * - Apply heads-up blind rules (Button = SB, BB acts first pre-flop)
 * - Handle dead blinds (busted SB/BB)
 * - Handle missed blinds (returning players)
 */

function rotateDealerButton(gameState) {
  // Move button clockwise
  // Handle empty seats
}

function assignBlinds(gameState) {
  // Set sbPosition, bbPosition
  // Handle heads-up special case
  // Handle dead button scenarios
}

function getFirstActor(gameState) {
  // Pre-flop: left of BB (or BB in heads-up)
  // Post-flop: left of button (SB in heads-up)
}
```

**Integration:** Move `resetToFirstActor()` logic from `turn-logic.js` to `seat-manager.js`

### 1.3 Enhance Action Validator with Missing Edge Cases

**File:** `src/adapters/betting-logic.js` (ENHANCE)

**Add validations for:**
- Zero-chip "free check/fold" (line 315-319 of pokerlogic.txt)
- Player cannot raise their own all-in (line 158)
- Free call with 0 chips (line 160)
- All-in for less than call does NOT reopen (line 140-142)
- All-in for less than min-raise counts as call (line 144-146)

### 1.4 Add Disconnect/Timer Handling

**File:** `src/adapters/timer-logic.js` (NEW)

```javascript
/**
 * TIMER LOGIC MODULE
 * 
 * Purpose: Action timers and disconnect handling
 * Responsibilities:
 * - Track action timestamps
 * - Force action on timeout (fold if facing bet, check if no bet)
 * - Handle disconnect during action
 */

function startActionTimer(gameState, playerId) {
  // Record timestamp
  // Set timeout callback
}

function handleTimeout(gameState, playerId) {
  // If facing bet → forced fold
  // If no bet → forced check
  // If all-in → hand continues normally
}
```

**Integration:** Add to `routes/game-engine-bridge.js` action endpoint

---

## 🎯 PHASE 2: TRANSLATION LAYER (Routes → Engine → Frontend)

### Goal: Clean, predictable data flow with single source of truth

### 2.1 Standardize Game State Schema

**File:** `src/adapters/game-state-schema.js` (NEW)

```javascript
/**
 * GAME STATE SCHEMA
 * 
 * Purpose: Single source of truth for game state structure
 * Ensures consistency between backend, database, and frontend
 */

const GAME_STATE_SCHEMA = {
  // Core state
  street: 'PRE_FLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN' | 'HAND_END',
  status: 'INIT' | 'IN_PROGRESS' | 'COMPLETED',
  
  // Betting state
  currentBet: number,
  currentActorSeat: number,
  lastRaiseSize: number,
  lastAggressor: string | null,
  reopensAction: boolean,
  
  // Players (array)
  players: [{
    userId: string,
    seatIndex: number,
    chips: number,
    bet: number,              // Cumulative
    betThisStreet: number,   // Street-scoped
    status: 'ACTIVE' | 'FOLDED' | 'ALL_IN' | 'SITTING_OUT' | 'DISCONNECTED' | 'BUSTED',
    folded: boolean,
    // ... other fields
  }],
  
  // Pots
  pot: number,              // Main pot
  sidePots: [{             // Side pots
    amount: number,
    contributors: string[]  // Player IDs
  }],
  
  // ... rest of schema
};

function validateGameState(state) {
  // Validate against schema
  // Ensure invariants hold
}
```

### 2.2 Create State Translation Layer

**File:** `routes/game-state-translator.js` (NEW)

```javascript
/**
 * GAME STATE TRANSLATOR
 * 
 * Purpose: Convert engine state to frontend-friendly format
 * Responsibilities:
 * - Strip private data (hole cards)
 * - Add computed fields (callAmount, canCheck, etc.)
 * - Ensure consistent structure
 */

function toPublicState(gameState, requestingUserId) {
  return {
    // Public fields
    street: gameState.street,
    pot: gameState.pot,
    currentBet: gameState.currentBet,
    currentActorSeat: gameState.currentActorSeat,
    
    // Players (with private data filtered)
    players: gameState.players.map(p => ({
      ...p,
      holeCards: p.userId === requestingUserId ? p.holeCards : undefined
    })),
    
    // Computed fields for frontend
    isMyTurn: gameState.currentActorSeat === mySeatIndex,
    callAmount: calculateCallAmount(gameState, requestingUserId),
    canCheck: canPlayerCheck(gameState, requestingUserId),
    // ... etc
  };
}

function toPrivateState(gameState, userId) {
  // Include hole cards for requesting user only
  return {
    ...toPublicState(gameState, userId),
    myHoleCards: getPlayerHoleCards(gameState, userId)
  };
}
```

**Integration:** Use in `routes/game-engine-bridge.js` before broadcasting

### 2.3 Standardize Socket Events

**File:** `routes/socket-events.js` (NEW)

```javascript
/**
 * SOCKET EVENT STANDARDIZATION
 * 
 * Purpose: Consistent event structure across all broadcasts
 * Pattern: { type, seq, payload, timestamp }
 */

const SOCKET_EVENTS = {
  ACTION_PROCESSED: 'action_processed',
  HAND_STARTED: 'hand_started',
  HAND_COMPLETE: 'hand_complete',
  STREET_REVEAL: 'street_reveal',
  STATE_SYNC: 'state_sync',
  TURN_STARTED: 'turn_started',
  TURN_TIMEOUT: 'turn_timeout',
  // ... etc
};

function emitActionProcessed(io, roomId, gameState, userId, action) {
  io.to(`room:${roomId}`).emit(SOCKET_EVENTS.ACTION_PROCESSED, {
    type: SOCKET_EVENTS.ACTION_PROCESSED,
    seq: gameState.actionSeq,
    timestamp: Date.now(),
    payload: {
      userId,
      action,
      gameState: toPublicState(gameState, null) // Public for all
    }
  });
}
```

**Integration:** Replace all `io.emit()` calls with standardized functions

### 2.4 Frontend State Manager

**File:** `public/js/game-state-client.js` (NEW)

```javascript
/**
 * CLIENT-SIDE GAME STATE MANAGER
 * 
 * Purpose: Single source of truth on frontend
 * Responsibilities:
 * - Receive state updates from server
 * - Maintain local state (with sequence numbers)
 * - Render UI from state (never guess)
 * - Handle reconnection/hydration
 */

class GameStateClient {
  constructor() {
    this.state = null;
    this.lastSeq = 0;
    this.myUserId = null;
  }
  
  updateFromServer(event) {
    // Ignore stale events (seq <= lastSeq)
    if (event.seq <= this.lastSeq) {
      console.warn('Ignoring stale event', event.seq);
      return;
    }
    
    // Update state
    this.state = event.payload.gameState;
    this.lastSeq = event.seq;
    
    // Trigger re-render
    this.render();
  }
  
  render() {
    // Render from this.state (single source of truth)
    // Never guess "lobby" vs "active" - read from state.status
    if (this.state.status === 'IN_PROGRESS') {
      this.renderGame();
    } else {
      this.renderLobby();
    }
  }
  
  hydrate(roomId, userId) {
    // Fetch complete state from server
    // Set this.state
    // Render
  }
}
```

**Integration:** Replace ad-hoc state handling in `minimal-table.html`

---

## 🎯 PHASE 3: MISSING FEATURES (Per PokerLogic Spec)

### 3.1 Post-Hand Logic

**File:** `src/adapters/post-hand-logic.js` (NEW)

```javascript
/**
 * POST-HAND LOGIC MODULE
 * 
 * Purpose: Cleanup and preparation for next hand
 * Responsibilities:
 * - Rotate dealer button
 * - Remove busted players
 * - Handle dead blinds
 * - Update stats
 */

function handleHandEnd(gameState, roomId, db) {
  // Rotate button
  seatManager.rotateDealerButton(gameState);
  
  // Remove busted players
  removeBustedPlayers(gameState, roomId, db);
  
  // Fix blind positions (dead button scenarios)
  seatManager.assignBlinds(gameState);
  
  // Update stats
  updatePlayerStats(gameState, db);
  
  // Reset for next hand
  resetGameState(gameState);
}
```

### 3.2 Dead Blinds & Missed Blinds

**Add to:** `src/adapters/seat-manager.js`

```javascript
function handleDeadBlind(gameState) {
  // If BB busted → next hand may skip a blind
  // If SB busted → adjust BB position
}

function handleMissedBlinds(player, gameState) {
  // Returning player must post BB or wait for BB
  // Track missed blinds in player state
}
```

### 3.3 Zero-Chip Edge Cases

**Add to:** `src/adapters/betting-logic.js`

```javascript
function validateAction(gameState, player, action, amount) {
  // Zero-chip "free check/fold"
  if (player.chips === 0 && !player.status === 'ALL_IN') {
    if (action === 'CHECK' && gameState.currentBet === 0) {
      return { isValid: true }; // Free check allowed
    }
    if (action === 'FOLD') {
      return { isValid: true }; // Free fold always allowed
    }
    return { isValid: false, error: 'Cannot bet or call with 0 chips' };
  }
  // ... rest of validation
}
```

### 3.4 Misdeal Detection

**Add to:** `src/adapters/game-logic.js`

```javascript
function validateDeck(gameState) {
  // Check deck integrity
  if (gameState.deck.length !== 52 - (gameState.players.length * 2) - gameState.communityCards.length) {
    throw new Error('Deck integrity violation - misdeal');
  }
  
  // Check for duplicate cards
  const allCards = [...gameState.deck, ...gameState.communityCards];
  gameState.players.forEach(p => {
    if (p.holeCards) allCards.push(...p.holeCards);
  });
  
  if (new Set(allCards).size !== allCards.length) {
    throw new Error('Duplicate cards detected - misdeal');
  }
}
```

---

## 🎯 PHASE 4: FRONTEND ARCHITECTURE REFACTOR

### Goal: Clean separation of concerns, render from state

### 4.1 Component-Based UI

**Structure:**
```
public/js/
├── game-state-client.js      (State management)
├── components/
│   ├── SeatComponent.js      (Renders one seat)
│   ├── PotDisplay.js          (Renders pots)
│   ├── ActionButtons.js       (Renders action buttons)
│   ├── CommunityCards.js      (Renders board)
│   └── HandStrength.js        (Renders hand strength)
└── renderers/
    ├── GameRenderer.js        (Renders game state)
    └── LobbyRenderer.js        (Renders lobby state)
```

### 4.2 State-Driven Rendering

**Pattern:**
```javascript
// OLD (guessing state):
if (gameId) {
  renderGame();
} else {
  renderLobby();
}

// NEW (state-driven):
if (gameStateClient.state.status === 'IN_PROGRESS') {
  GameRenderer.render(gameStateClient.state);
} else {
  LobbyRenderer.render(roomState);
}
```

### 4.3 Action Button Logic

**File:** `public/js/components/ActionButtons.js`

```javascript
class ActionButtons {
  static render(gameState, myUserId) {
    const myPlayer = gameState.players.find(p => p.userId === myUserId);
    const isMyTurn = gameState.currentActorSeat === myPlayer.seatIndex;
    
    if (!isMyTurn || gameState.status !== 'IN_PROGRESS') {
      this.disable();
      return;
    }
    
    // Calculate available actions from state (not guessing)
    const callAmount = gameState.currentBet - (myPlayer.betThisStreet || 0);
    const canCheck = callAmount === 0;
    const canCall = callAmount > 0 && callAmount <= myPlayer.chips;
    const canRaise = myPlayer.chips > callAmount;
    
    // Render buttons based on state
    this.updateButtons({ canCheck, canCall, canRaise, callAmount });
  }
}
```

---

## 📋 IMPLEMENTATION ORDER

### Sprint 1: Foundation (Week 1)
1. ✅ Create `state-machine.js` module
2. ✅ Extract `seat-manager.js` from turn-logic
3. ✅ Create `game-state-schema.js` for validation
4. ✅ Add state machine transitions to `game-logic.js`

### Sprint 2: Translation Layer (Week 2)
1. ✅ Create `game-state-translator.js`
2. ✅ Standardize socket events (`socket-events.js`)
3. ✅ Refactor `routes/game-engine-bridge.js` to use translator
4. ✅ Create `game-state-client.js` on frontend

### Sprint 3: Missing Features (Week 3)
1. ✅ Add post-hand logic module
2. ✅ Implement dead blinds handling
3. ✅ Add zero-chip edge cases
4. ✅ Add misdeal detection

### Sprint 4: Frontend Refactor (Week 4)
1. ✅ Componentize UI (`components/` folder)
2. ✅ State-driven rendering
3. ✅ Remove all state guessing logic
4. ✅ Add proper hydration flow

---

## 🔑 KEY PRINCIPLES

### 1. Single Source of Truth
- **Backend:** `gameState` object is the only truth
- **Frontend:** `gameStateClient.state` is the only truth
- **Never guess** - always read from state

### 2. State Machine Enforces Flow
- No direct `gameState.street = 'FLOP'` assignments
- All transitions go through `stateMachine.transition()`
- Invalid transitions throw errors

### 3. Translation Layer is Pure
- `toPublicState()` never mutates original state
- Always returns new object
- Can be called multiple times safely

### 4. Frontend is Dumb
- Frontend renders from state, never computes game logic
- All validation happens on backend
- Frontend only sends actions, receives state

### 5. Sequence Numbers for Idempotency
- Every state update has `actionSeq`
- Frontend ignores events with `seq <= lastSeq`
- Prevents duplicate/out-of-order updates

---

## 🎯 SUCCESS METRICS

### Code Quality
- [ ] All 6 pillars explicitly implemented as modules
- [ ] Zero direct state mutations (all through state machine)
- [ ] 100% of edge cases from pokerlogic.txt covered
- [ ] Frontend has zero state guessing logic

### Functionality
- [ ] All corner cases pass (dead blinds, zero-chip, etc.)
- [ ] Turn rotation works in all scenarios (heads-up, 3+, all-ins)
- [ ] Side pots calculated correctly for all scenarios
- [ ] Disconnect handling works (forced fold/check)

### Architecture
- [ ] Clean separation: Engine → Translator → Routes → Frontend
- [ ] State schema validated on every transition
- [ ] Socket events standardized and typed
- [ ] Frontend components are pure renderers

---

## 📝 NEXT STEPS

1. **Start with Phase 1.1** - Create `state-machine.js` module
2. **Test incrementally** - Each module should have unit tests
3. **Refactor gradually** - Don't break existing functionality
4. **Document as you go** - Update `ACTIVE_ARCHITECTURE.md`

**Estimated Timeline:** 4-6 weeks for full implementation

**Priority:** Phase 1 (Foundation) is critical - everything else builds on it.

