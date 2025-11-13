# SPECTATOR & INGRESS ROBUSTNESS FIXES
**Date:** November 13, 2025  
**Status:** ✅ Backend Complete | ⏳ Frontend Pending

---

## FIXES APPLIED

### **Fix 1: Block Host Stack Updates During Active Hand** ✅

**Problem:** Host could update player stacks mid-hand, but changes would be overwritten when hand completes, causing confusion.

**Solution:** Block stack updates during active hands, only allow between hands.

**File:** `routes/game-engine-bridge.js` (line 2371-2385)

**Code Added:**
```javascript
// ARCHITECTURAL FIX: Block stack updates during active hand
// Stack updates mid-hand would be overwritten when hand completes
// Solution: Only allow updates between hands
const gameCheck = await db.query(
  `SELECT status FROM game_states WHERE room_id = $1 AND status = 'active'`,
  [roomId]
);

if (gameCheck.rows.length > 0) {
  return res.status(400).json({ 
    error: 'Cannot update stacks during active hand',
    message: 'Stack updates will be available after current hand completes',
    allowedAfterHandComplete: true
  });
}
```

**Expected Behavior:**
- ✅ Stack updates work between hands (no active game_states)
- ✅ Stack updates blocked during hands (returns 400 error)
- ✅ Clear error message explains why blocked
- ✅ Frontend can show "Available after hand" message

---

### **Fix 2: Add Spectator Detection Flags to Hydration** ✅

**Problem:** Frontend couldn't distinguish between:
- Active players (in current hand)
- Spectators (busted, mid-game approved, or viewers)
- Seated but not playing (edge case)

**Solution:** Add explicit `isSpectator` and `inCurrentHand` flags to hydration response.

**File:** `routes/game-engine-bridge.js` (line 136-166)

**Code Added:**
```javascript
// ARCHITECTURAL FIX: Add spectator detection flags
// A spectator is anyone NOT in gameState.players[] during an active hand
// This includes: busted players, mid-game approved players, or viewers
const isInCurrentHand = !!myPlayer;
const isSpectator = !isInCurrentHand; // If not in gameState.players, you're spectating

// Get seat info from room_seats (may be seated but not in current hand)
const seatsResult = await db.query(
  `SELECT seat_index, chips_in_play, nickname FROM room_seats 
   WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
  [roomId, userId]
);
const mySeatData = seatsResult.rows.length > 0 ? seatsResult.rows[0] : null;

console.log('   ✅ Hydration complete', {
  inCurrentHand: isInCurrentHand,
  isSpectator,
  hasSeat: !!mySeatData
});

res.json({
  hasActiveGame: true,
  gameState: publicGameState,
  myHoleCards,
  isMyTurn: gameState.currentActorSeat === myPlayer?.seatIndex,
  gameId: gameResult.rows[0].id,
  // NEW: Spectator detection flags
  isSpectator, // True if not in current hand (can request seats)
  inCurrentHand: isInCurrentHand, // True if in gameState.players[]
  mySeat: mySeatData // Seat info from room_seats (may differ from gameState)
});
```

**Expected Behavior:**
- ✅ `isSpectator = true` if not in `gameState.players[]`
- ✅ `inCurrentHand = true` if in current hand
- ✅ `mySeat` shows seat info from DB (even if not in current hand)
- ✅ Frontend can conditionally render spectator UI

---

## WHAT'S ALREADY ROBUST (NO FIX NEEDED)

### **Mid-Game Seat Approvals Don't Affect Current Hand** ✅

**Why it works:**
1. `/api/minimal/claim-seat` creates seat request (status='PENDING')
2. Host approves → INSERT INTO `room_seats` with `left_at IS NULL`
3. `/api/engine/action` validates: `if (!gameState.players.find(p => p.userId === userId))`
4. `/api/game/next-hand` queries: `WHERE left_at IS NULL` (picks up new players)

**Result:** Mid-game approved players are added to `room_seats` but **cannot act** until next hand.

---

## FRONTEND WORK NEEDED

### **Task 1: Use Spectator Flags in UI**

**File:** `public/minimal-table.html` (or wherever hydration is consumed)

**Current hydration consumer:**
```javascript
const data = await fetch(`/api/engine/hydrate/${roomId}/${userId}`);
// Currently only checks: data.hasActiveGame
```

**Updated consumer:**
```javascript
const data = await fetch(`/api/engine/hydrate/${roomId}/${userId}`);

if (data.isSpectator) {
  // Show spectator UI:
  // - All seats appear claimable (grayed out with "Request Seat" button)
  // - Hide action buttons (fold/check/call/raise)
  // - Show "Spectating - Request a seat to play next hand"
  renderSpectatorMode(data.gameState);
} else if (data.inCurrentHand) {
  // Show normal player UI:
  // - Action buttons enabled when isMyTurn
  // - Can see hole cards (data.myHoleCards)
  renderPlayerMode(data.gameState, data.myHoleCards, data.isMyTurn);
} else {
  // Lobby (no active game)
  renderLobbyMode();
}
```

---

### **Task 2: Show Countdown Timer for Auto-Start**

**Where:** After hand completes, before next hand auto-starts (3s delay)

**Current flow:**
1. Hand completes → `hand_complete` event emitted
2. 3s delay → `next-hand` auto-called by backend
3. `hand_started` event emitted

**Problem:** Users see no countdown, sudden hand start is jarring.

**Solution:** Frontend countdown timer between `hand_complete` and `hand_started`.

**Code:**
```javascript
socket.on('hand_complete', (data) => {
  // Show winners, chip updates
  renderHandComplete(data);
  
  // Start countdown
  let countdown = 3;
  const countdownInterval = setInterval(() => {
    showCountdownBanner(`Next hand in ${countdown}s...`);
    countdown--;
    if (countdown < 0) {
      clearInterval(countdownInterval);
    }
  }, 1000);
  
  // hand_started will arrive ~3s later and clear banner
});

socket.on('hand_started', (data) => {
  hideCountdownBanner();
  renderNewHand(data.gameState);
});
```

---

### **Task 3: Host Control Stack Update Error Handling**

**Where:** Host controls panel (wherever `/api/engine/host-controls/update-stack` is called)

**Current behavior:** May show generic error if stack update fails.

**Expected behavior:** Show user-friendly message if blocked during active hand.

**Code:**
```javascript
async function updatePlayerStack(roomId, hostId, seatIndex, newChips) {
  try {
    const response = await fetch('/api/engine/host-controls/update-stack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, hostId, seatIndex, newChips })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      if (data.allowedAfterHandComplete) {
        // Specific error for mid-hand block
        showError('Stack updates are disabled during active hands. Try again after the hand completes.');
      } else {
        showError(data.message || 'Failed to update stack');
      }
      return;
    }
    
    showSuccess(`Stack updated to $${newChips}`);
  } catch (error) {
    showError('Network error');
  }
}
```

---

## TESTING CHECKLIST

### **Test 1: Mid-Game Seat Approval**
- [ ] Start hand with players A, B
- [ ] Player C requests seat mid-hand
- [ ] Host approves C mid-hand
- [ ] Verify C **cannot** act in current hand (action should fail)
- [ ] Current hand completes
- [ ] Next hand starts
- [ ] Verify C **is** dealt in to next hand
- [ ] Verify C can act normally in next hand

### **Test 2: Host Stack Updates Timing**
- [ ] Start hand with player A ($500)
- [ ] Host tries to update A's stack to $1000 mid-hand
- [ ] Verify request **fails** with clear error message
- [ ] Hand completes
- [ ] Host updates A's stack to $1000 (should succeed)
- [ ] Verify A has $1000 in next hand
- [ ] Verify update persists correctly

### **Test 3: Spectator Mode After Busting**
- [ ] Player A starts with $100
- [ ] Player A goes all-in and loses
- [ ] Player A busted (chips = 0)
- [ ] Backend sets A's `left_at = NOW()` in `room_seats`
- [ ] A refreshes page
- [ ] Hydration returns: `isSpectator = true`, `inCurrentHand = false`, `mySeat = null`
- [ ] Frontend shows spectator UI (all seats claimable)
- [ ] A requests new seat
- [ ] Host approves
- [ ] A joins next hand with fresh chips

### **Test 4: Never-Seated Viewer**
- [ ] Player D visits room URL (never claimed seat)
- [ ] Hand is active with A, B, C
- [ ] D hydrates
- [ ] Returns: `isSpectator = true`, `inCurrentHand = false`, `mySeat = null`
- [ ] D sees spectator UI
- [ ] D requests seat
- [ ] Host approves
- [ ] D joins next hand

### **Test 5: Auto-Start Countdown**
- [ ] Hand completes with 2+ players having chips
- [ ] Frontend receives `hand_complete` event
- [ ] Countdown banner appears: "Next hand in 3s..."
- [ ] Countdown decrements: 3... 2... 1...
- [ ] `hand_started` event arrives
- [ ] Countdown banner disappears
- [ ] New hand rendered

---

## ARCHITECTURAL PRINCIPLES ENFORCED

### **Principle 1: Hands Are Immutable**
Once a hand starts, `gameState.players[]` is **frozen**. No players can be added or removed mid-hand (except natural elimination via busting).

**Implementation:**
- ✅ `/api/engine/action` validates `userId` exists in `gameState.players[]`
- ✅ `/api/game/next-hand` queries `room_seats` fresh each time (picks up new players)
- ✅ Host control changes blocked during active hand

---

### **Principle 2: Two Player Lists**
- **`room_seats` table** = Who is seated in the room (includes pending next-hand)
- **`gameState.players[]`** = Who is in THIS specific hand (immutable)

**Why both are needed:**
- `room_seats` persists across hands (DB source of truth)
- `gameState.players[]` is ephemeral (only for current hand)
- Mid-game approved players are in `room_seats` but not `gameState.players[]`

---

### **Principle 3: Spectators Are Derived, Not Stored**
"Spectator" is not a database status, it's a **runtime condition**:

```
isSpectator = gameIsActive && !isInCurrentHand
```

**Who are spectators?**
- Busted players (lost all chips, removed from `room_seats`)
- Mid-game approved players (in `room_seats`, not in `gameState.players[]`)
- Never-seated viewers (not in `room_seats` at all)

**Result:** One unified spectator UI for all three cases.

---

## ROLLBACK PLAN

If these fixes cause issues:

### **Rollback Fix 1 (Host Stack Updates):**
```bash
cd /Users/waleedraza/Desktop/PokerGeek
git diff routes/game-engine-bridge.js | grep "gameCheck" -A 10
# Remove lines 2371-2385 (the gameCheck block)
```

### **Rollback Fix 2 (Spectator Flags):**
```bash
# Remove lines 136-149 and 162-165 from routes/game-engine-bridge.js
# Revert hydration response to original (no isSpectator/inCurrentHand)
```

**Worst-case:** Revert entire file:
```bash
git checkout HEAD -- routes/game-engine-bridge.js
```

---

## SUMMARY

**Backend fixes complete:** ✅
1. Host stack updates blocked during active hands
2. Spectator detection flags added to hydration

**Frontend work needed:** ⏳
1. Use `isSpectator` flag to render spectator UI
2. Show countdown timer for auto-start (3s)
3. Handle host control stack update errors gracefully

**Testing required:** 🧪
1. Mid-game seat approval flow
2. Host stack update timing
3. Spectator mode after busting
4. Never-seated viewer experience
5. Auto-start countdown UX

**Expected outcome:**
- Clear separation between active players and spectators
- No mid-hand disruptions from host control changes
- Smooth ingress flow for new/returning players
- Better UX with countdown timers

**Next step:** Test backend fixes, then implement frontend tasks.

