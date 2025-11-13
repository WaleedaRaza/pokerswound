# SPECTATOR & INGRESS ARCHITECTURE
**Date:** November 13, 2025  
**Status:** Robustness Audit & Fixes

---

## CRITICAL QUESTIONS

1. **Are mid-game seat approvals safe?** (Don't break current hand)
2. **Is spectator mode robust?** (Busted players vs never-seated viewers)
3. **Do host control changes apply next hand?** (Not mid-hand)

---

## CURRENT FLOW ANALYSIS

### **Seat Claiming Flow**

```
Player clicks empty seat
  ↓
POST /api/minimal/claim-seat
  ↓
Check: Is game active?
  ├─ NO (Pre-game): Direct claim → INSERT INTO room_seats (left_at IS NULL)
  └─ YES (Mid-game): Create seat_request (status='PENDING')
     ↓
     Host sees request in host controls
     ↓
     POST /api/rooms/:roomId/approve-seat-request
     ↓
     INSERT INTO room_seats (left_at IS NULL)  ← APPROVED MID-GAME
```

### **Next Hand Player Selection**

```sql
-- In next-hand endpoint (line 2029-2035):
SELECT user_id, seat_index, chips_in_play 
FROM room_seats 
WHERE room_id = $1 
  AND left_at IS NULL       -- Must be seated
  AND status != 'ELIMINATED' -- Not eliminated
ORDER BY seat_index
```

**THE GOOD NEWS:** Approved mid-game players are added to `room_seats` but **NOT included in current hand**. They'll be in **next hand** when it queries the DB.

**THE RISK:** If approved mid-game player's userId is somehow in current gameState, they could try to act.

---

## ROBUSTNESS CHECKS NEEDED

### **Check 1: Mid-Game Approval Can't Affect Current Hand**

**What happens:**
1. Game active with players A, B, C
2. Player D requests seat, gets approved mid-hand
3. D is in `room_seats` with `left_at IS NULL`
4. Current `gameState.players` = [A, B, C] (no D)
5. D tries to act → Should be rejected

**Guard needed in:**
- `/api/engine/action` - Validate userId is in current gameState.players

**Current code (line 1475):**
```javascript
const player = updatedState.players.find(p => p.userId === userId);

if (!player) {
  return res.status(400).json({ error: 'Player not in this hand' });
}
```

✅ **ALREADY PROTECTED** - Mid-game approved players can't act until next hand.

---

### **Check 2: Host Control Stack Updates Apply Next Hand**

**What happens:**
1. Game active, player has $500
2. Host updates stack to $1000 via host controls
3. UPDATE room_seats SET chips_in_play = 1000
4. Current `gameState.players[].chips` = 500 (unchanged)
5. Player acts → Uses 500 from gameState (correct)
6. Hand completes → Chips saved to DB → Overwritten host's change (BUG!)

**The issue:** Host stack changes mid-hand get overwritten when hand completes.

**Fix needed:** Block stack updates during active hand, OR flag them as "apply next hand".

---

### **Check 3: Spectator Mode - Who Sees Claimable Seats?**

**Should see claimable seats:**
- Busted players (had seat, lost all chips)
- Never-seated viewers (just watching)
- Players between hands (in lobby)

**Should NOT see claimable seats:**
- Active players in current hand (seated and playing)

**Frontend logic needed:**
```javascript
const mySeat = seats.find(s => s.userId === myUserId && !s.left_at);
const isInCurrentHand = currentGameState?.players?.find(p => p.userId === myUserId);
const gameIsActive = currentGameState?.status === 'IN_PROGRESS';

const isSpectator = gameIsActive && !isInCurrentHand;

if (isSpectator) {
  // Show all seats as claimable (even occupied ones if they request)
  renderSeats(seats, { allClaimable: true });
} else if (!gameIsActive) {
  // Pre-game lobby - show empty seats as claimable
  renderSeats(seats, { emptySeatsClaimable: true });
} else {
  // Active player - normal view
  renderSeats(seats, { normalView: true });
}
```

---

## FIXES NEEDED

### **Fix 1: Block Host Control Stack Updates During Active Hand**

**File:** `routes/game-engine-bridge.js` (host-controls/update-stack endpoint)

**Current code (line 2360):**
```javascript
router.post('/host-controls/update-stack', async (req, res) => {
  // ... directly updates room_seats ...
  await db.query(
    `UPDATE room_seats SET chips_in_play = $1 WHERE room_id = $2 AND seat_index = $3`,
    [newChips, roomId, seatIndex]
  );
});
```

**Fixed code:**
```javascript
router.post('/host-controls/update-stack', async (req, res) => {
  // Check if hand is active
  const gameCheck = await db.query(
    `SELECT status FROM game_states WHERE room_id = $1 AND status = 'active'`,
    [roomId]
  );
  
  if (gameCheck.rows.length > 0) {
    // Hand is active - block stack updates
    return res.status(400).json({ 
      error: 'Cannot update stacks during active hand',
      message: 'Stack updates will be available after current hand completes'
    });
  }
  
  // Pre-game or between hands - allow update
  await db.query(
    `UPDATE room_seats SET chips_in_play = $1 
     WHERE room_id = $2 AND seat_index = $3 AND left_at IS NULL`,
    [newChips, roomId, seatIndex]
  );
  
  res.json({ success: true, newChips });
});
```

---

### **Fix 2: Add Seat Status Field to Prevent Mid-Hand Confusion**

**Problem:** Player approved mid-hand has `left_at IS NULL` (looks seated) but isn't in gameState yet.

**Solution:** Add `in_current_hand` flag to distinguish.

**Migration:**
```sql
ALTER TABLE room_seats ADD COLUMN in_current_hand BOOLEAN DEFAULT FALSE;

-- Set to true when hand starts
UPDATE room_seats 
SET in_current_hand = TRUE 
WHERE room_id = $1 AND user_id IN (...players in gameState...);

-- Set to false when hand ends
UPDATE room_seats 
SET in_current_hand = FALSE 
WHERE room_id = $1;
```

**Alternative (simpler):** Use existing data - if player is in `game_states.current_state.players[]`, they're in current hand.

**Frontend can query:**
```javascript
// On hydration:
const gameState = await fetch(`/api/engine/game/${roomId}`);
const amIInCurrentHand = gameState.players.some(p => p.userId === myUserId);
```

---

### **Fix 3: Explicit Spectator Detection in Hydration**

**File:** `routes/game-engine-bridge.js` (hydrate endpoint)

**Add to response:**
```javascript
res.json({
  hasActiveGame: true,
  gameState: gameState,
  myCards: player?.holeCards || [],
  canAct: isMyTurn,
  isSpectator: !player,  // ← ADD THIS
  mySeat: seatsData.find(s => s.userId === userId),
  inCurrentHand: !!player  // ← ADD THIS
});
```

---

## IMPLEMENTATION PLAN

### **Immediate Fixes (Required for Robustness)**

1. **Block host stack updates during active hand** ✅ Critical
2. **Add `isSpectator` flag to hydration response** ✅ Important
3. **Frontend countdown timer for auto-start** ✅ UX improvement

### **Nice-to-Have (Future Enhancement)**

1. **Add `in_current_hand` column to room_seats** (Better clarity)
2. **Queue mid-game approvals** (Show "Will join next hand" message)
3. **Host control "pending changes"** (Show what will apply next hand)

---

## TEST SCENARIOS

### **Test 1: Mid-Game Approval Doesn't Break Hand**
- [ ] Start hand with A, B, C
- [ ] Player D requests seat mid-hand
- [ ] Host approves D mid-hand
- [ ] Verify D **cannot** act in current hand
- [ ] Verify D **can** act in next hand
- [ ] Verify current hand completes normally

### **Test 2: Host Stack Update Timing**
- [ ] Try to update stack during active hand
- [ ] Verify it's blocked with error message
- [ ] Try to update stack between hands
- [ ] Verify it works and persists to next hand

### **Test 3: Spectator Mode Accuracy**
- [ ] Busted player sees all seats as claimable
- [ ] Active player sees normal view (only empty seats claimable)
- [ ] Never-seated viewer sees all seats as claimable
- [ ] Frontend correctly detects spectator vs player state

### **Test 4: Seat Request Queueing**
- [ ] Multiple players request same seat mid-hand
- [ ] Host approves one request
- [ ] Verify only approved player gets seat
- [ ] Verify others get rejection message
- [ ] Verify approved player joins next hand (not current)

---

## ARCHITECTURAL PRINCIPLES

### **Principle 1: Hands Are Immutable**
Once a hand starts, the player list is **frozen**. No adds, no removes (except natural elimination). Host control changes apply to **next hand**.

### **Principle 2: Two Player Lists**
- **`room_seats` table** = Who is seated in the room (includes pending next-hand)
- **`gameState.players[]`** = Who is in THIS specific hand (immutable during hand)

### **Principle 3: Spectators Are Not a Status**
"Spectator" is a **derived state**, not a stored value:
- `isSpectator = gameIsActive && !isInCurrentHand`

Anyone not in `gameState.players[]` during an active hand is a spectator (busted, approved mid-game, or just watching).

---

## SUMMARY

**What's already robust:**
✅ Mid-game approvals don't affect current hand (action validation prevents it)
✅ Next-hand queries DB fresh (picks up new players)
✅ Busted players removed from seats (silent elimination)

**What needs fixing:**
❌ Host stack updates during active hand (get overwritten)
❌ Frontend spectator detection (needs explicit `isSpectator` flag)
❌ Countdown timer for auto-start (UX polish)

**Implementation priority:**
1. Block host stack updates during active hand (critical)
2. Add `isSpectator` to hydration response (important)
3. Frontend countdown timer (nice-to-have)

