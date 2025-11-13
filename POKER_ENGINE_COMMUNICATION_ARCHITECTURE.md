# POKER ENGINE COMMUNICATION ARCHITECTURE
**Status:** Implementation Plan  
**Date:** November 13, 2025  
**Purpose:** Fix core logic bugs + redesign engine-to-frontend communication

---

## EXECUTIVE SUMMARY

**Root Cause Identified:** The poker engine has 3 desynchronized state machines (betting, pots, runout) that update at different times, causing unpredictable behavior in all-in scenarios.

**Additional Issue:** The communication layer between engine and frontend is event-based but inconsistent, leading to:
- Frontend receiving state updates before calculations complete
- Animations triggered at wrong times
- No clear contract for what state looks like at each game phase

**Solution:** 
1. **Synchronize the 3 state machines** into one coordinator
2. **Redesign communication as phases** instead of individual events
3. **Separate game truth from display instructions**

---

## PART 1: THE THREE DESYNCHRONIZED MACHINES

### **Machine 1: Betting State**
**Location:** `turn-logic.js`  
**Updates:** On every player action  
**Tracks:** Who can bet, when round completes, whose turn it is

### **Machine 2: Pot State**
**Location:** `pot-logic.js`  
**Updates:** On street changes (progressToNextStreet)  
**Tracks:** Main pot, side pots, uncalled bets

### **Machine 3: Runout State**
**Location:** `game-logic.js`  
**Updates:** When betting round completes  
**Tracks:** Whether to deal remaining streets immediately

### **The Desync Problem:**

```
SCENARIO: 3 players, P2 has $300 (short), others have $1000

FLOP:
  P1 bets $500
  P2 calls all-in $300 (partial)
  P3 calls $500
  
WHAT HAPPENS:
  1. Betting Machine: "Round complete, not everyone all-in, advance to turn"
  2. Pot Machine: Calculates side pots DURING street advance
  3. Runout Machine: Not triggered (someone can still bet)
  4. Frontend: Receives pot=$800 before side pots calculated → displays wrong
  
TURN:
  P1 checks
  P3 checks
  
WHAT HAPPENS:
  1. Betting Machine: "Round complete, advance to river"
  2. Pot Machine: REcalculates side pots (pot jumps in UI)
  3. Runout Machine: Still not triggered
  
RIVER:
  P1 bets $200
  P3 calls $200
  
WHAT HAPPENS:
  1. Betting Machine: "Round complete, go to showdown"
  2. Pot Machine: Calculates side pots AGAIN (3rd time)
  3. Runout Machine: Not triggered
  4. Showdown runs
  5. Chips distributed
  6. BUT: Side pots were calculated wrong because P2's cap wasn't respected in later streets
```

---

## PART 2: THE UNIFIED COORDINATOR

### **New Component: `game-phase-coordinator.js`**

**Purpose:** Single source of truth for "what happens next" that coordinates all 3 machines.

```javascript
/**
 * GAME PHASE COORDINATOR
 * Single function that determines hand progression after betting round completes
 * Coordinates: betting state, pot calculations, runout detection
 * 
 * Called from: game-logic.js processAction() when betting round completes
 */

function coordinateHandProgression(gameState) {
  console.log('🎯 [COORDINATOR] Determining hand progression...');
  
  // STEP 1: Calculate side pots IMMEDIATELY (before any decisions)
  // This ensures pot state is correct for all downstream logic
  const potLogic = require('./pot-logic');
  potLogic.handleUncalledBets(gameState);
  const pots = potLogic.calculateSidePots(gameState);
  
  // STEP 2: Analyze player chip states
  const activePlayers = gameState.players.filter(p => !p.folded);
  const playersWithChips = activePlayers.filter(p => p.chips > 0 && p.status !== 'ALL_IN');
  const allInPlayers = activePlayers.filter(p => p.status === 'ALL_IN' && p.chips === 0);
  
  console.log('🎯 [COORDINATOR] Player analysis:', {
    active: activePlayers.length,
    withChips: playersWithChips.length,
    allIn: allInPlayers.length,
    street: gameState.street
  });
  
  // STEP 3: Determine phase based on chip states and street
  let phase;
  
  if (activePlayers.length === 1) {
    // PHASE: FOLD_WIN
    phase = {
      type: 'FOLD_WIN',
      winner: activePlayers[0],
      potAmount: gameState.pot
    };
    
  } else if (playersWithChips.length === 0) {
    // PHASE: IMMEDIATE_RUNOUT
    // Everyone is all-in, deal all remaining streets immediately
    phase = {
      type: 'IMMEDIATE_RUNOUT',
      currentStreet: gameState.street,
      streetsToReveal: getRemainingStreets(gameState.street),
      pots: pots
    };
    
  } else if (gameState.street === 'RIVER') {
    // PHASE: SHOWDOWN
    // River betting complete, go to showdown
    phase = {
      type: 'SHOWDOWN',
      pots: pots,
      playersInShowdown: activePlayers
    };
    
  } else {
    // PHASE: NEXT_STREET
    // Normal progression to next street
    const nextStreet = getNextStreet(gameState.street);
    phase = {
      type: 'NEXT_STREET',
      from: gameState.street,
      to: nextStreet,
      pots: pots,
      hasAllInPlayers: allInPlayers.length > 0,
      willRunoutEventually: playersWithChips.length <= 1 && allInPlayers.length > 0
    };
  }
  
  console.log('🎯 [COORDINATOR] Phase determined:', phase.type);
  return phase;
}

// Helper functions
function getRemainingStreets(currentStreet) {
  const streetOrder = ['PREFLOP', 'FLOP', 'TURN', 'RIVER'];
  const currentIndex = streetOrder.indexOf(currentStreet);
  return streetOrder.slice(currentIndex + 1);
}

function getNextStreet(currentStreet) {
  const map = {
    'PREFLOP': 'FLOP',
    'FLOP': 'TURN',
    'TURN': 'RIVER',
    'RIVER': 'SHOWDOWN'
  };
  return map[currentStreet] || 'SHOWDOWN';
}
```

### **Integration into game-logic.js**

Replace the current branching logic with phase coordinator:

```javascript
// In processAction(), after betting round completes:
if (bettingComplete) {
  const phaseCoordinator = require('./game-phase-coordinator');
  const phase = phaseCoordinator.coordinateHandProgression(updatedState);
  
  switch (phase.type) {
    case 'FOLD_WIN':
      handleFoldWin(updatedState, phase.winner);
      break;
      
    case 'IMMEDIATE_RUNOUT':
      handleImmediateRunout(updatedState, phase);
      break;
      
    case 'SHOWDOWN':
      handleShowdown(updatedState, phase);
      break;
      
    case 'NEXT_STREET':
      handleNextStreet(updatedState, phase);
      break;
  }
  
  return { success: true, gameState: updatedState, phase: phase };
}
```

---

## PART 3: COMMUNICATION ARCHITECTURE REDESIGN

### **Current Problem: Event Soup**

Backend emits 21+ different events:
- `action_processed`
- `hand_started`
- `street_reveal`
- `hand_complete`
- `player_busted`
- `you_busted`
- `game_ended`
- `hand_complete_lobby`
- `state_sync`
- ... 12 more

Frontend has 24 socket listeners reacting to these events independently.

**Result:** Race conditions, missing updates, unpredictable UI state.

### **New Design: Phase-Based Communication**

**Principle:** Backend emits ONE event type with phase information. Frontend renders based on phase.

#### **Single Event Schema:**

```javascript
{
  type: 'game_state_update',
  seq: 123,  // Incrementing sequence number
  timestamp: '2025-11-13T...',
  
  // GAME TRUTH (current state)
  gameState: {
    roomId: 'uuid',
    handNumber: 5,
    street: 'FLOP',
    pot: 1200,
    mainPot: 900,
    sidePots: [{ amount: 300, eligibleSeats: [0, 2] }],
    communityCards: ['Kh', 'Js', '4d'],
    players: [
      {
        seatIndex: 0,
        userId: 'uuid',
        chips: 500,
        bet: 500,
        betThisStreet: 500,
        folded: false,
        status: 'ACTIVE',
        holeCards: null  // Not revealed to others
      },
      // ... more players
    ],
    currentActorSeat: 2,
    dealerPosition: 0
  },
  
  // PHASE INFORMATION (what's happening)
  phase: {
    type: 'NEXT_STREET',  // or FOLD_WIN, IMMEDIATE_RUNOUT, SHOWDOWN
    from: 'FLOP',
    to: 'TURN',
    hasAllInPlayers: true,
    willRunoutEventually: false
  },
  
  // DISPLAY INSTRUCTIONS (how to show it)
  display: {
    animation: 'street_change',  // or 'runout', 'chip_distribution', 'fold_win'
    timing: {
      cardRevealDelay: 1500,
      chipAnimationDuration: 1000
    },
    message: 'Dealing turn...'
  }
}
```

### **Frontend Rendering:**

```javascript
// Single socket listener
socket.on('game_state_update', (update) => {
  // 1. Update game state (source of truth)
  gameState = update.gameState;
  
  // 2. Render based on phase
  switch (update.phase.type) {
    case 'NEXT_STREET':
      renderNextStreet(gameState, update.display);
      break;
      
    case 'IMMEDIATE_RUNOUT':
      renderRunout(gameState, update.display);
      break;
      
    case 'SHOWDOWN':
      renderShowdown(gameState, update.display);
      break;
      
    case 'FOLD_WIN':
      renderFoldWin(gameState, update.display);
      break;
  }
});
```

### **Benefits:**

1. **Single source of truth**: Frontend always knows complete game state
2. **Phase-aware**: Frontend knows what's happening, not just current values
3. **Animation guidance**: Backend tells frontend how to display transitions
4. **Sequence numbers**: Frontend can detect and ignore stale updates
5. **Idempotent**: If user refreshes, backend sends same phase-aware state

---

## PART 4: IMPLEMENTATION PLAN

### **Phase 1: Core Logic Fixes (Week 1)**

**Files to create:**
- `src/adapters/game-phase-coordinator.js` - New coordinator

**Files to modify:**
- `src/adapters/game-logic.js` - Use coordinator in processAction()
- `src/adapters/pot-logic.js` - Ensure side pots calculated once
- `src/adapters/turn-logic.js` - Remove runout detection logic (moved to coordinator)

**Deliverable:** All-in scenarios work correctly 100% of the time (no more unpredictable behavior)

### **Phase 2: Communication Redesign (Week 2)**

**Files to create:**
- `src/adapters/state-broadcaster.js` - Builds phase-aware updates
- `public/js/phase-renderer.js` - Renders based on phase

**Files to modify:**
- `routes/game-engine-bridge.js` - Replace 21 emit() calls with one broadcaster
- `public/minimal-table.html` - Replace 24 listeners with phase renderer

**Deliverable:** Clean communication contract, no race conditions

### **Phase 3: Testing & Polish (Week 3)**

**Test scenarios:**
- 3 players, one short stack all-in on flop → continues to river correctly
- 3 players, all go all-in on flop → runout works correctly
- 2 players, one busts → game continues correctly
- 5 players, various stack sizes → side pots calculated correctly

**Deliverable:** Production-ready poker table

---

## PART 5: IMMEDIATE FIXES FOR CURRENT BUGS

While implementing the full architecture, here are **hotfixes** for the immediate bugs:

### **Hotfix 1: Calculate side pots immediately when betting completes**

```javascript
// In game-logic.js, line 148:
if (bettingComplete) {
  // HOTFIX: Calculate side pots NOW (before any branching)
  const potLogic = require('./pot-logic');
  potLogic.handleUncalledBets(updatedState);
  potLogic.calculateSidePots(updatedState);
  
  // Then determine progression
  const turnLogic = require('./turn-logic');
  const playersWhoCanBetList = turnLogic.playersWhoCanBet(updatedState);
  // ... rest of logic
}
```

### **Hotfix 2: Don't recalculate side pots on every street**

```javascript
// In turn-logic.js progressToNextStreet(), line 372:
// REMOVE these lines (already calculated in game-logic.js):
// potLogic.handleUncalledBets(gameState);
// potLogic.calculateSidePots(gameState);

// REPLACE with:
// Side pots already calculated before progression
console.log(`💰 [TURN] Using pre-calculated side pots:`, {
  mainPot: gameState.mainPot,
  sidePots: gameState.sidePots?.length || 0
});
```

### **Hotfix 3: Reset reopensAction on every action**

```javascript
// In betting-logic.js applyAction(), line 231:
function applyAction(gameState, player, action, amount, isAllInFromValidation, validateChipConservation) {
  // HOTFIX: Reset reopensAction at start of every action (prevent persistence)
  gameState.reopensAction = undefined;
  
  // ... rest of function
}
```

### **Hotfix 4: Synchronous chip distribution**

```javascript
// In game-engine-bridge.js, line 1616:
// REMOVE setTimeout wrapping
// INSTEAD: Do everything synchronously
console.log('🏆 [ALL-IN RUNOUT] All cards revealed - completing showdown');
MinimalBettingAdapter.handleShowdown(updatedState);
await db.query(`UPDATE game_states SET current_state = $1`, [JSON.stringify(updatedState)]);
await persistHandCompletion(updatedState, roomId, db, reqForCallback);
await handleHandCompleteEmission(updatedState, roomId, db, io);
```

---

## DECISION POINT

**Option A: Full Rebuild (3 weeks)**
- Implement phase coordinator
- Redesign communication architecture
- Production-grade, maintainable solution

**Option B: Hotfixes + Gradual Migration (1 week immediate, 2 weeks gradual)**
- Apply hotfixes 1-4 immediately (fixes 80% of bugs)
- Implement phase coordinator (week 2)
- Redesign communication (week 3)

**Recommendation:** Option B - Get working table ASAP, then improve architecture.

---

## NEXT STEPS

1. **Apply Hotfixes 1-4** (30 minutes)
2. **Test with 3 players, various stack sizes** (1 hour)
3. **If tests pass:** Deploy hotfixes
4. **Then begin Phase 1:** Implement phase coordinator (2-3 days)

**Ready to proceed?**

