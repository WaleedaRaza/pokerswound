# Race Condition Fix: Premature Winner Stack Update

## Problem

Winner's stack was updating prematurely during all-in animations, showing the final stack amount ($1000) instead of staying at $0 until cards were fully revealed.

## Root Cause: Race Condition

The animation context was being stored AFTER the `pot_update` WebSocket event was broadcast, creating a timing vulnerability:

```
❌ BROKEN FLOW:
1. Backend: emit('pot_update', { players: [{stack: 0}] })
2. Frontend: Receives pot_update, updates UI to show stack = 0 ✅
3. Frontend: Calls fetchGameState() via HTTP GET
4. Backend: gameAnimations.get(gameId) returns NULL (not stored yet!) ❌
5. Backend: Returns logical state (post-distribution, stack = 1000) ❌
6. Frontend: UI updates to show stack = 1000 (premature!) ❌
```

**The problem:** Steps 3-4 happened before the animation context was stored in step 5 (which came later in the code).

## Solution: Store Animation Context BEFORE Broadcasting

Move `gameAnimations.set()` to execute BEFORE any WebSocket events are emitted:

```javascript
// ✅ CORRECT ORDER (fixed in commit f4aaa63)

// 1. Create pre-distribution player data
const currentPlayers = [...]; // stack = 0 for all-in players

// 2. STORE ANIMATION CONTEXT FIRST
gameAnimations.set(gameId, {
  isAnimating: true,
  animationType: 'allInRunout',
  displaySnapshot: {
    players: currentPlayers,  // stack = 0
    pot: potAmount
  },
  logicalState: {
    players: [...],  // stack = 1000 (post-distribution)
    pot: 0
  },
  startTime: Date.now(),
  endTime: Date.now() + animationDuration
});

// 3. NOW emit pot_update (animation context is ready)
io.to(`room:${roomId}`).emit('pot_update', {
  players: currentPlayers,
  pot: potAmount
});
```

**Why this works:**

```
✅ FIXED FLOW:
1. Backend: Store animation context with display snapshot (stack = 0)
2. Backend: emit('pot_update', { players: [{stack: 0}] })
3. Frontend: Receives pot_update, updates UI to show stack = 0 ✅
4. Frontend: Calls fetchGameState() via HTTP GET
5. Backend: gameAnimations.get(gameId) returns animation context ✅
6. Backend: Returns display snapshot (pre-distribution, stack = 0) ✅
7. Frontend: UI stays at stack = 0 (correct!) ✅
8. After animation ends: Backend clears animation context
9. Frontend: fetchGameState() now returns logical state (stack = 1000) ✅
```

## Changes Made

**File:** `poker-engine/sophisticated-engine-server.js`

### Before (Broken)
```javascript
// Line ~1050: Emit pot_update first
io.to(`room:${roomId}`).emit('pot_update', { ... });

// Line ~1196: Store animation context AFTER (race condition!)
gameAnimations.set(gameId, { ... });
```

### After (Fixed)
```javascript
// Line ~1079: Store animation context FIRST
gameAnimations.set(gameId, {
  isAnimating: true,
  displaySnapshot: { players: [...] }, // stack = 0
  logicalState: { players: [...] }      // stack = 1000
});

// Line ~1120: NOW emit pot_update (safe)
io.to(`room:${roomId}`).emit('pot_update', { ... });
```

## Dual State Architecture

The backend maintains TWO representations during animations:

### Display Snapshot (UI State)
- What the UI should show during animation
- Winner has stack = $0 (chips in pot)
- Pot has full amount
- Returned by HTTP GET during animation

### Logical State (Truth)
- What actually happened in game engine
- Winner has stack = $1000 (pot distributed)
- Pot is reset to $0
- Returned by HTTP GET after animation ends

### Animation Context Lifecycle

```
[All-in Action]
    ↓
Store animation context
    ├─ displaySnapshot: { players: [stack: 0], pot: 1000 }
    ├─ logicalState: { players: [stack: 1000], pot: 0 }
    └─ endTime: now + animationDuration
    ↓
Emit pot_update (WebSocket)
    ↓
[Animation playing... 5 seconds]
    ├─ HTTP GET returns displaySnapshot ✅
    └─ Winner shows $0 in UI
    ↓
Emit hand_complete (WebSocket)
    ↓
Clear animation context (gameAnimations.delete)
    ↓
[Animation complete]
    └─ HTTP GET returns logicalState ✅
    └─ Winner shows $1000 in UI
```

## Testing Plan

### Test 1: All-In Animation with HTTP Fetch
1. Start game with 2 players
2. Player 1 goes all-in ($500)
3. Player 2 calls
4. **During card reveals (5 seconds):**
   - Open DevTools Network tab
   - Observe `GET /api/games/:id` requests
   - Backend should log: `🎬 HTTP GET during animation - returning display snapshot`
   - Response should show `isAnimating: true`
   - Winner's stack should be $0 in response
5. **After hand_complete:**
   - Backend should log: `🎬 Animation complete - HTTP GET will now return post-distribution state`
   - Next HTTP GET should show `isAnimating: false`
   - Winner's stack should be $1000

### Test 2: UI Stack Display
1. All-in scenario as above
2. **Watch winner's stack element in DOM:**
   - Should show $0 during animation
   - Should update to $1000 after animation completes
   - Should NOT flicker between values

### Test 3: Multiple Rapid HTTP Fetches
1. All-in scenario
2. In DevTools Console, run:
   ```javascript
   setInterval(() => fetch('/api/games/:id').then(r => r.json()).then(console.log), 500);
   ```
3. All responses during animation should show `isAnimating: true` and `stack: 0`
4. After 5 seconds, responses should show `isAnimating: false` and `stack: 1000`

## Success Criteria

✅ Winner's stack stays at $0 during entire animation (no flicker)
✅ Backend logs show animation context stored before pot_update
✅ HTTP GET requests during animation return display snapshot
✅ HTTP GET requests after animation return logical state
✅ Frontend logs show: `🎬 Backend is animating (allInRunout) - display state frozen`
✅ Winner's stack updates to final amount only after hand_complete

## Files Modified

- `poker-engine/sophisticated-engine-server.js` (lines 1049-1132, 1227-1229)

## Commit

```
fix: store animation context before broadcasting to prevent race condition

- Move gameAnimations.set() to execute BEFORE pot_update emission
- This ensures HTTP GET requests return display snapshot immediately
- Prevents premature winner stack updates during all-in animations
- Root cause: frontend fetchGameState() was racing animation context storage

Commit: f4aaa63
```

## Related Documentation

- `ANIMATION_STATE_ARCHITECTURE.md` - Comprehensive architecture guide
- `FIX_ALL_IN_STACK_DISPLAY.md` - Original all-in bug documentation
- `FIX_BETTING_BROADCAST.md` - Normal betting action broadcast fix

