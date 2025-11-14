# PLAYER STATE SYSTEM
**Date:** November 13, 2025  
**Status:** ✅ Implemented

---

## THREE STATES (Exhaustive)

Every user in the room is in exactly ONE of these states at any time:

### **STATE 1: LOBBY** (Pre-Game)
**When:** No active game (`gameState.status !== 'IN_PROGRESS'`)  
**Who:** Everyone (host, seated players, visitors)

**What They See:**
- ✅ All 10 seats at hardcoded positions (circular layout)
- ✅ Occupied seats show player names and chips
- ✅ Empty seats show "CLAIM" button

**What They Can Do:**
- ✅ Claim any empty seat (instant, no approval needed)
- ✅ Host can start game when 2+ players seated

**Frontend State:**
```javascript
{
  isSpectator: false,
  isGameActive: false,
  visibleSeats: [0,1,2,3,4,5,6,7,8,9], // All 10
  seatLayout: 'hardcoded', // Fixed circular positions
  canClaimSeats: true, // Direct claim (no approval)
}
```

**Backend State:**
```sql
-- No active game_states row
SELECT * FROM game_states WHERE room_id = $1 AND status = 'active'
-- Returns: 0 rows

-- Players in room_seats
SELECT * FROM room_seats WHERE room_id = $1 AND left_at IS NULL
-- Returns: 0-10 rows (whoever is seated)
```

---

### **STATE 2: ACTIVE PLAYER** (In Current Hand)
**When:** Active game AND user is in `gameState.players[]`  
**Who:** Players dealt into current hand

**What They See:**
- ✅ Only occupied seats (2-9 players)
- ✅ Dynamic positioning (compact, heads-up optimized)
- ✅ Their own hole cards
- ✅ Action buttons when it's their turn

**What They Can Do:**
- ✅ Act on their turn (fold/check/call/raise)
- ✅ See community cards as they're revealed
- ✅ See their hand strength calculation

**Frontend State:**
```javascript
{
  isSpectator: false,
  isGameActive: true,
  inCurrentHand: true,
  visibleSeats: [6, 10], // Example: Only seats with players
  seatLayout: 'dynamic', // Compact positioning (2-9 player layouts)
  canClaimSeats: false, // Cannot claim mid-hand
  myHoleCards: ['Ah', 'Kd'],
  canAct: true // When it's their turn
}
```

**Backend State:**
```sql
-- Active game exists
SELECT * FROM game_states WHERE room_id = $1 AND status = 'active'
-- Returns: 1 row with current_state JSON

-- User is in gameState.players[]
SELECT current_state FROM game_states WHERE room_id = $1 AND status = 'active'
-- current_state.players contains: { userId: '...', seatIndex: 6, chips: 1000, ... }

-- User is in room_seats
SELECT * FROM room_seats WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL
-- Returns: 1 row
```

**Hydration Response:**
```json
{
  "hasActiveGame": true,
  "isSpectator": false,
  "inCurrentHand": true,
  "myHoleCards": ["Ah", "Kd"],
  "isMyTurn": true,
  "gameState": { ... }
}
```

---

### **STATE 3: SPECTATOR** (Watching, Not in Hand)
**When:** Active game AND user is NOT in `gameState.players[]`  
**Who:**
- Busted players (lost all chips, removed from `room_seats`)
- Mid-game approved players (in `room_seats`, not yet in hand)
- Visitors who entered room code during active game

**What They See:**
- ✅ All 10 seats at hardcoded positions (full table layout)
- ✅ Occupied seats show player names and chips
- ✅ Empty seats show "CLAIM" button (creates request)
- ✅ Community cards (public)
- ❌ NO hole cards (private)
- ❌ NO action buttons (can't act)

**What They Can Do:**
- ✅ Click empty seat → creates seat request
- ✅ Request appears as "PENDING" (waiting for host approval)
- ✅ Host can approve → user joins NEXT hand (not current)
- ✅ See all game actions in real-time (spectate)

**Frontend State:**
```javascript
{
  isSpectator: true,
  isGameActive: true,
  inCurrentHand: false,
  visibleSeats: [0,1,2,3,4,5,6,7,8,9], // All 10
  seatLayout: 'hardcoded', // Fixed circular positions
  canClaimSeats: true, // Can request seats (needs approval)
  myHoleCards: [], // No hole cards (spectating)
  canAct: false // Cannot act
}
```

**Backend State (Busted Player):**
```sql
-- Active game exists
SELECT * FROM game_states WHERE room_id = $1 AND status = 'active'
-- Returns: 1 row

-- User is NOT in gameState.players[]
-- (busted, removed from players array)

-- User is NOT in room_seats (removed after bust)
SELECT * FROM room_seats WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL
-- Returns: 0 rows
```

**Backend State (Mid-Game Approved Player):**
```sql
-- Active game exists
SELECT * FROM game_states WHERE room_id = $1 AND status = 'active'
-- Returns: 1 row

-- User is NOT in gameState.players[]
-- (approved mid-hand, will join next hand)

-- User IS in room_seats (approved, waiting for next hand)
SELECT * FROM room_seats WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL
-- Returns: 1 row
```

**Backend State (Visitor):**
```sql
-- Active game exists
SELECT * FROM game_states WHERE room_id = $1 AND status = 'active'
-- Returns: 1 row

-- User is NOT in gameState.players[]
-- (never joined)

-- User is NOT in room_seats (never claimed seat)
SELECT * FROM room_seats WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL
-- Returns: 0 rows
```

**Hydration Response (All Spectator Types):**
```json
{
  "hasActiveGame": true,
  "isSpectator": true,
  "inCurrentHand": false,
  "myHoleCards": [],
  "isMyTurn": false,
  "gameState": { ... },
  "mySeat": null // or { seat_index: 5, chips: 0 } if approved mid-game
}
```

---

## STATE TRANSITIONS

### **LOBBY → ACTIVE PLAYER**
```
1. User claims seat in lobby (instant, no approval)
2. Host starts game
3. POST /api/game/next-hand
4. Backend queries: SELECT * FROM room_seats WHERE left_at IS NULL
5. User is included in gameState.players[]
6. hand_started event emitted
7. Frontend receives event → isGameActive = true, isSpectator = false
```

### **ACTIVE PLAYER → SPECTATOR (Bust)**
```
1. Player loses all chips
2. Backend sets: UPDATE room_seats SET left_at = NOW()
3. Player removed from gameState.players[]
4. hand_complete event emitted
5. Player refreshes page
6. Hydration returns: isSpectator = true, inCurrentHand = false
7. Frontend shows all 10 seats (spectator view)
```

### **SPECTATOR → LOBBY**
```
1. Hand completes
2. Backend emits: hand_complete_lobby
3. Frontend clears: currentGameState = null, gameId = null
4. isGameActive = false
5. All users see lobby (all 10 seats, direct claim)
```

### **SPECTATOR → ACTIVE PLAYER (Next Hand)**
```
1. Spectator claims empty seat
2. Creates seat_request (status = 'PENDING')
3. Host approves
4. INSERT INTO room_seats (user_id, seat_index, left_at = NULL)
5. Current hand completes
6. Next hand starts
7. Backend queries room_seats (includes new player)
8. New player added to gameState.players[]
9. hand_started event → player is now ACTIVE_PLAYER
```

---

## INVARIANTS (Must Always Be True)

### **Invariant 1: isSpectator Derivation**
```
isSpectator = (gameIsActive && !inCurrentHand)

where:
  gameIsActive = !!gameState && gameState.status === 'IN_PROGRESS'
  inCurrentHand = gameState.players.some(p => p.userId === myUserId)
```

**Backend is source of truth:** Hydration calculates this on server and sends to client.

### **Invariant 2: Seat Visibility**
```
if (isSpectator || !isGameActive) {
  // Show ALL 10 seats (hardcoded positions)
  visibleSeats = [0,1,2,3,4,5,6,7,8,9]
} else {
  // Show ONLY occupied seats (dynamic positions)
  visibleSeats = gameState.players.map(p => p.seatIndex)
}
```

### **Invariant 3: Seat Claiming**
```
if (!isGameActive) {
  // LOBBY: Direct claim (instant, no approval)
  claimSeat() → INSERT room_seats
} else if (isSpectator) {
  // SPECTATOR: Create request (needs host approval)
  claimSeat() → INSERT seat_requests (status = 'PENDING')
} else {
  // ACTIVE PLAYER: Cannot claim (already in hand)
  claimSeat() → DISABLED
}
```

### **Invariant 4: Position Layout**
```
if (isSpectator || !isGameActive) {
  // Hardcoded positions (all 10 seats around table)
  layout = 'hardcoded'
} else {
  // Dynamic positions (compact, optimized for player count)
  layout = 'dynamic'
}
```

### **Invariant 5: Action Buttons**
```
if (isSpectator || !inCurrentHand) {
  // No action buttons (cannot act)
  showActionButtons = false
} else if (gameState.currentActorSeat === mySeatIndex) {
  // My turn - show action buttons
  showActionButtons = true
} else {
  // Waiting for others - hide action buttons
  showActionButtons = false
}
```

---

## BUG FIXES APPLIED

### **Bug 1: isSpectator Overwritten by loadRoom()**
**Before:**
```javascript
// loadRoom() always recalculated isSpectator (WRONG)
isSpectator = !mySeat && roomIsActive && !isHost;
```

**After:**
```javascript
// loadRoom() only calculates if hydration hasn't set it
if (typeof isSpectator !== 'boolean') {
  // Fallback for pre-game or no hydration
  isSpectator = roomIsActive ? true : false;
} else {
  // Trust hydration (backend is source of truth)
  debug('✅ Using isSpectator from hydration:', isSpectator);
}
```

**Result:** Backend's `isSpectator` is never overwritten ✅

---

### **Bug 2: Empty Seats Not Positioned for Spectators**
**Before:**
```javascript
positionsToApply.forEach(pos => {
  const seat = document.querySelector(`.seat[data-seat-index="${pos.index}"]`);
  if (seat && !seat.classList.contains('empty')) {
    // Only position non-empty seats (WRONG for spectators)
  }
});
```

**After:**
```javascript
positionsToApply.forEach(pos => {
  const seat = document.querySelector(`.seat[data-seat-index="${pos.index}"]`);
  const shouldPosition = seat && (isSpectator || !seat.classList.contains('empty'));
  
  if (shouldPosition) {
    // Position ALL seats for spectators, only occupied for players
  }
});
```

**Result:** Spectators see all 10 seats properly positioned ✅

---

## TESTING SCENARIOS

### **Test 1: Busted Player → Spectator → Reclaim**
```
✅ Player A busts (chips = 0)
✅ Backend sets: left_at = NOW(), removes from gameState.players[]
✅ A refreshes page
✅ Hydration returns: isSpectator = true
✅ A sees: P1 at seat 6, P2 at seat 10, seats 0-5,7-9 empty (hardcoded positions)
✅ A clicks seat 3
✅ Seat request created (PENDING)
✅ Host approves
✅ A added to room_seats
✅ Current hand completes
✅ Next hand starts
✅ A is dealt in (ACTIVE_PLAYER)
```

### **Test 2: Mid-Game Visitor → Spectator → Join Next Hand**
```
✅ Visitor enters room code during active game
✅ Hydration returns: isSpectator = true, inCurrentHand = false
✅ Visitor sees: Full table (all 10 seats, hardcoded positions)
✅ P1 at seat 2, P2 at seat 8, rest empty
✅ Visitor clicks seat 5
✅ Request created (PENDING)
✅ Host approves mid-hand
✅ Visitor added to room_seats
✅ Visitor CANNOT act in current hand (protected by backend)
✅ Hand completes → countdown (3s)
✅ Next hand starts
✅ Visitor is dealt in (ACTIVE_PLAYER)
```

### **Test 3: Active Player Sees Compact Layout**
```
✅ 3 players in hand (seats 2, 5, 9)
✅ Player A (seat 2) sees:
  - Only 3 seats (2, 5, 9)
  - Dynamic positions (compact, optimized)
  - Own hole cards
  - Action buttons on turn
✅ Player A does NOT see:
  - Empty seats (0,1,3,4,6,7,8,10)
  - Spectator claim buttons
```

### **Test 4: Lobby → Game Start**
```
✅ Room in lobby (no active game)
✅ Host and 2 players see: All 10 seats (hardcoded)
✅ Empty seats show "CLAIM" (direct, instant)
✅ Host starts game
✅ Players see: Only 2 occupied seats (dynamic, heads-up layout)
✅ Empty seats hidden
```

---

## ARCHITECTURAL PRINCIPLES

### **Principle 1: Backend is Source of Truth**
- Frontend NEVER calculates `isSpectator` authoritatively
- Hydration endpoint determines state based on `gameState.players[]`
- Frontend uses backend's answer

### **Principle 2: Three States, No Ambiguity**
- LOBBY: No game, all see all seats
- ACTIVE_PLAYER: In hand, compact layout
- SPECTATOR: Watching, full layout

### **Principle 3: Seat Visibility = Layout**
```
if (all 10 seats visible) → hardcoded positions
if (only occupied seats visible) → dynamic positions
```

### **Principle 4: Spectators See Structure**
- Full table layout shows WHERE players are sitting
- Empty seats are contextual (seat 6 empty, seat 10 occupied)
- Spectators can strategically choose which seat to request

---

## SUMMARY

**States strengthened:**
1. ✅ Three exhaustive states (LOBBY, ACTIVE_PLAYER, SPECTATOR)
2. ✅ Backend determines state (hydration is source of truth)
3. ✅ Frontend never overwrites backend state
4. ✅ All seats positioned correctly for each state

**Bugs fixed:**
1. ✅ `isSpectator` no longer overwritten by `loadRoom()`
2. ✅ Empty seats positioned for spectators
3. ✅ State transitions tested and documented

**Result:** Spectators see P1 at seat 6, P2 at seat 10, rest empty and claimable. No more overlapping tiles. No more half-working states.

