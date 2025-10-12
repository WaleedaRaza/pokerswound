# Fix: All-In Stack Display Bug

## Problem Description

When Player 1 goes all-in and Player 2 calls, Player 2's stack would immediately show the winning amount ($1000) before the final cards were revealed. The stack should remain at $0 until the winner is determined and announced.

## Root Cause

**Backend Issue:**
- The game engine (`game-state-machine.ts`) calculates winners and distributes pot **immediately** in `handleEndHand()`
- This updates `player.stack` with final values before UI animation completes
- The server was correctly storing pre-distribution stacks for `pot_update` event
- BUT was sending post-distribution stacks too early in `hand_complete` event

**Frontend Issue:**
- Frontend would display whatever stack values it received
- No timing control to delay showing winner's updated stack

## Event Flow Timeline

### BEFORE FIX (Incorrect):
```
1. P2 calls all-in
   └─> Backend calculates winner
   └─> Backend distributes pot (P2.stack = $1000)
   └─> Broadcasts pot_update (tries to show $0, but...)
   └─> Broadcasts hand_complete IMMEDIATELY (P2.stack = $1000) ❌
2. UI shows cards progressively (1s, 2s, 3s...)
3. UI already showing P2 has $1000 the whole time ❌
4. Hand complete event (nothing to update)
```

### AFTER FIX (Correct):
```
1. P2 calls all-in
   └─> Backend calculates winner
   └─> Backend distributes pot (P2.stack = $1000)
   └─> Stores pre-distribution stacks in Map
   └─> Broadcasts pot_update with $0 for all-in players ✅
2. UI shows cards progressively (1s, 2s, 3s...)
   └─> P2 stack shows $0 during animation ✅
3. After 5s delay, broadcasts hand_complete
   └─> Now sends post-distribution stacks (P2.stack = $1000) ✅
4. UI updates P2 stack to $1000 with pulse animation ✅
```

## Changes Made

### 1. Backend (sophisticated-engine-server.js)

**Lines 1033-1069:**
```javascript
// ✅ Store pre-distribution stacks in a Map
const preDistributionStacks = new Map();
const currentPlayers = postActionPreShowdownPlayers
  .filter(p => !p.hasFolded)
  .map(p => {
    const displayStack = p.isAllIn ? 0 : p.stack;
    const playerData = { /* player data with stack = 0 for all-in */ };
    preDistributionStacks.set(p.uuid, playerData);
    return playerData;
  });

// Emit pot_update with pre-distribution stacks (all-in = $0)
io.to(`room:${roomId}`).emit('pot_update', {
  players: currentPlayers  // Stack = $0 for all-in players
});

// ✅ Store for later use
result.newState.preDistributionStacks = preDistributionStacks;
```

**Lines 1172-1202:**
```javascript
setTimeout(async () => {
  // ✅ After animation delay, send post-distribution stacks
  const postDistributionPlayers = Array.from(result.newState.players.values())
    .map(p => ({
      stack: p.stack  // Winner has the pot now
    }));
  
  io.to(`room:${roomId}`).emit('hand_complete', {
    players: postDistributionPlayers,  // ✅ Correct timing
    preDistributionStacks: result.newState.preDistributionStacks,
    potTransfer: true
  });
}, finalDelay);  // Sent AFTER card animation completes
```

### 2. Frontend (poker-test.html)

**Lines 2644-2676:**
```javascript
// ✅ Add small delay for pot→stack animation
setTimeout(() => {
  payload.players.forEach(player => {
    stackEl.textContent = `$${player.stack}`;
    
    // ✅ Visual highlight for winner
    if (payload.potTransfer && player.stack > 0) {
      stackEl.style.animation = 'pulse 0.5s ease-in-out';
    }
  });
}, 300);  // 300ms delay for smooth animation
```

**Lines 834-838:**
```css
@keyframes pulse {
  0% { transform: scale(1); color: #10b981; }
  50% { transform: scale(1.15); color: #34d399; text-shadow: 0 0 10px; }
  100% { transform: scale(1); color: #10b981; }
}
```

## Key Architectural Insights

### Separation of Concerns

1. **Game Engine (Logic Layer)**
   - Calculates winners and updates state immediately
   - Pure business logic, no UI concerns
   - Returns events describing what happened

2. **API Server (Orchestration Layer)**
   - Manages event broadcasting timing
   - Transforms game state for UI consumption
   - Controls animation sequences

3. **Frontend (Presentation Layer)**
   - Displays what backend sends, when backend sends it
   - Simple, reactive updates
   - Minimal business logic

### The Golden Rule

**Backend processes should complete immediately, but UI events should be choreographed for optimal UX.**

Store multiple state snapshots:
- `preActionState` - Before action applied
- `postActionState` - After action applied
- `preDistributionState` - Before pot distributed
- `postDistributionState` - After pot distributed

Broadcast each at the right time for animations.

## Testing

**Test Scenario:**
1. Two players: Waleed ($1000), Guest_cd2701 ($1000)
2. Waleed goes all-in ($1000)
3. Guest calls ($1000)
4. Pot = $2000

**Expected Behavior:**
- [ ] pot_update event shows both players at $0
- [ ] Cards reveal progressively (1s intervals)
- [ ] After all cards shown + 2s delay
- [ ] hand_complete event shows winner at $2000
- [ ] Winner's stack pulses green

**Before Fix:**
❌ Guest showed $2000 immediately after calling

**After Fix:**
✅ Guest shows $0 during animation
✅ Guest shows $2000 after final delay

## Future Improvements

1. **State Snapshots**: Create a dedicated `GameStateSnapshot` class that stores multiple state versions
2. **Event Queue**: Implement a priority queue for UI events with configurable delays
3. **Animation Config**: Make animation timings configurable via game settings
4. **Rollback Support**: Store state history for replay/debug features

## Related Files

- `poker-engine/src/core/engine/game-state-machine.ts` - Game logic
- `poker-engine/sophisticated-engine-server.js` - Event broadcasting
- `poker-engine/public/poker-test.html` - UI event handlers

---

**Fixed:** January 2025
**Issue:** Stack display showing final value before animation completes
**Solution:** Store and broadcast pre-distribution stacks separately from post-distribution stacks

