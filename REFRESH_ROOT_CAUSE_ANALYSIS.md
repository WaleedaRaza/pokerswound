# 🔍 REFRESH ROOT CAUSE ANALYSIS

**Date:** October 24, 2025  
**Status:** 🚨 **CRITICAL - NEEDS STRATEGIC FIX**

---

## 🎯 THE REAL PROBLEM

### What User Reports:
> "When a refresh is detected, players leave seats. Seats show as taken but users can't interact. We're going in circles."

### What I Was Fixing (WRONG APPROACH):
- ❌ Preventing duplicate start-hand calls (symptom)
- ❌ Clearing seat data structures (symptom)
- ❌ Checking if hand is active (symptom)

### The ACTUAL Root Cause:
**The frontend loses ALL state on refresh and doesn't restore it from the backend.**

---

## 🔬 DETAILED TRACE OF THE PROBLEM

### What Happens on Refresh (Step by Step):

1. **User refreshes page** (`F5` or `Ctrl+R`)
   
2. **Frontend JavaScript reloads:**
   - ❌ `currentUser` = lost
   - ❌ `room` = lost
   - ❌ `currentGame` = lost
   - ❌ `seats` array = lost
   - ❌ **Which seat I'm in** = **LOST**
   - ❌ Current hand state = lost

3. **`DOMContentLoaded` fires:**
   - Calls `autoJoinRoomById(roomId)` (parsed from URL)
   - Re-fetches room data ✅
   - Re-fetches game data ✅
   - Calls `loadSeats()` ✅

4. **`loadSeats()` fetches seats:**
   ```javascript
   const res = await fetch(`/api/rooms/${roomId}/seats`);
   seats = data.seats; // Shows ALL seats, but...
   ```
   - ✅ Backend returns correct data (all seats, including which are occupied)
   - ❌ **Frontend doesn't identify which seat belongs to currentUser**
   - ❌ Frontend renders all seats as "Taken" with no distinction

5. **User sees:**
   - "Seat 0: Taken" (but this is MY seat!)
   - "Seat 1: Taken"
   - No way to interact
   - "Start Game" button might appear (shouldn't)

6. **If user clicks "Start Game":**
   - Frontend calls `/api/games/:id/start-hand`
   - Backend tries to re-add players who are already in seats
   - Error: "Seat already occupied"
   - Backend now blocks with 409 (but damage is done)

---

## 🎯 THE ROOT CAUSE (Summarized)

**Frontend doesn't restore user's seat ownership after refresh.**

### What's Missing:
1. ❌ Frontend doesn't fetch "which seat is mine?"
2. ❌ Frontend doesn't highlight "YOUR SEAT" after refresh
3. ❌ Frontend doesn't restore game state (cards, pot, actions)
4. ❌ Frontend doesn't disable "Start Game" if hand is active

### What Backend Has (Correctly):
1. ✅ `room_seats` table knows which user is in which seat
2. ✅ `game_states` table knows if hand is active
3. ✅ Game state in memory has current hand data

**The disconnect:** Frontend and backend aren't synchronized after refresh.

---

## 📊 COMPARISON: Before Refresh vs After Refresh

### BEFORE REFRESH (Working):
```javascript
// Frontend State:
currentUser = { id: "abc123", username: "Player1" }
room = { id: "room-xyz", ... }
currentGame = { gameId: "game-123" }
seats = [
  { seat_index: 0, user_id: "abc123", status: "SEATED" }, // MY SEAT
  { seat_index: 1, user_id: "def456", status: "SEATED" }
]
mySeat = seats.find(s => s.user_id === currentUser.id) // ✅ Found!

// UI Shows:
- Seat 0: "YOUR SEAT" (gold border, interactable)
- Seat 1: "Player2" (taken, not interactable)
```

### AFTER REFRESH (Broken):
```javascript
// Frontend State:
currentUser = null → await checkAuthSession() → { id: "abc123", ... } ✅
room = null → await fetch(`/rooms/${roomId}`) → { id: "room-xyz", ... } ✅
currentGame = null → await fetch(`/games?roomId=...`) → { gameId: "game-123" } ✅
seats = [] → await fetch(`/rooms/${roomId}/seats`) → [
  { seat_index: 0, user_id: "abc123", status: "SEATED" },
  { seat_index: 1, user_id: "def456", status: "SEATED" }
] ✅
mySeat = ??? // ❌ NEVER CALCULATED!

// UI Shows:
- Seat 0: "Taken" (no indication this is ME)
- Seat 1: "Taken"
// User is confused and clicks buttons they shouldn't
```

---

## 🔧 THE STRATEGIC FIX (Step by Step)

### Fix 1: Restore User's Seat After Refresh
**Location:** `public/poker.html` - `loadSeats()` function

**Current Code (Simplified):**
```javascript
async function loadSeats() {
  const res = await fetch(`/api/rooms/${roomId}/seats`);
  seats = data.seats;
  renderSeatGrid(); // Just renders all seats
}
```

**Fixed Code:**
```javascript
async function loadSeats() {
  const res = await fetch(`/api/rooms/${roomId}/seats`);
  seats = data.seats;
  
  // ✅ IDENTIFY MY SEAT
  if (currentUser && seats.length > 0) {
    const mySeat = seats.find(s => s.user_id === currentUser.id && s.status === 'SEATED');
    if (mySeat) {
      console.log(`✅ [REFRESH] Restored my seat: ${mySeat.seat_index}`);
      window.mySeatIndex = mySeat.seat_index; // Save for UI
    }
  }
  
  renderSeatGrid();
}
```

---

### Fix 2: Update `renderSeatGrid()` to Highlight User's Seat
**Location:** `public/poker.html` - `renderSeatGrid()` function

**Add Logic:**
```javascript
function renderSeatGrid() {
  seats.forEach(seat => {
    const seatElement = document.getElementById(`seat-${seat.seat_index}`);
    
    // ✅ Check if this is MY seat
    const isMySeat = (currentUser && seat.user_id === currentUser.id);
    
    if (isMySeat) {
      seatElement.classList.add('my-seat'); // Gold border
      seatElement.innerHTML = `
        <div class="seat-label">YOUR SEAT</div>
        <div class="seat-player">${seat.username || currentUser.username}</div>
        <div class="seat-chips">$${seat.chips_in_play}</div>
      `;
    } else if (seat.status === 'SEATED') {
      seatElement.classList.add('taken');
      seatElement.innerHTML = `
        <div class="seat-label">Seat ${seat.seat_index} (Taken)</div>
        <div class="seat-player">${seat.username || 'Player'}</div>
      `;
    } else {
      seatElement.innerHTML = `
        <button onclick="claimSeat(${seat.seat_index})">Claim Seat ${seat.seat_index}</button>
      `;
    }
  });
}
```

---

### Fix 3: Restore Game State After Refresh
**Location:** `public/poker.html` - `autoJoinRoomById()` function

**Add After Loading Seats:**
```javascript
async function autoJoinRoomById(roomId) {
  // ... existing code to load room, game, seats ...
  
  await loadSeats(); // ✅ This now identifies my seat
  
  // ✅ CHECK IF HAND IS ACTIVE
  if (currentGame && currentGame.gameId) {
    const gameStateRes = await fetch(`/api/games/${currentGame.gameId}`);
    if (gameStateRes.ok) {
      const gameState = await gameStateRes.json();
      
      if (gameState.handState && gameState.handState.isHandActive) {
        console.log('✅ [REFRESH] Hand is active, restoring game state');
        
        // Restore cards, pot, community cards, etc.
        renderGameState(gameState);
        
        // Hide "Start Hand" button
        const startBtn = document.getElementById('startHandBtn');
        if (startBtn) startBtn.style.display = 'none';
        
      } else {
        console.log('ℹ️ [REFRESH] No active hand, showing Start Hand button');
        // Show "Start Hand" button if enough players
        updateStartHandButton();
      }
    }
  }
}
```

---

### Fix 4: Add `renderGameState()` Function
**Location:** `public/poker.html` - New function

**Purpose:** Display current game state (cards, pot, actions) after refresh

```javascript
function renderGameState(gameState) {
  // Display community cards
  if (gameState.communityCards && gameState.communityCards.length > 0) {
    displayCommunityCards(gameState.communityCards);
  }
  
  // Display pot
  if (gameState.pot) {
    document.getElementById('potAmount').textContent = `$${gameState.pot}`;
  }
  
  // Display my hole cards (if I'm in the hand)
  if (currentUser && gameState.players) {
    const myPlayer = gameState.players.find(p => p.userId === currentUser.id);
    if (myPlayer && myPlayer.holeCards) {
      displayMyCards(myPlayer.holeCards);
    }
  }
  
  // Display whose turn it is
  if (gameState.currentPlayer) {
    displayCurrentTurn(gameState.currentPlayer);
  }
  
  // Display legal actions (if it's my turn)
  if (gameState.currentPlayer === currentUser.id) {
    displayLegalActions(gameState.legalActions);
  }
  
  console.log('✅ [REFRESH] Game state restored');
}
```

---

## 🔧 BACKEND FIX: Event Persistence Error

### The Other Error We Keep Seeing:
```
null value in column "aggregate_id" violates not-null constraint
```

### Root Cause:
The `EventStoreRepository` is passing `NULL` for `aggregate_id` when it should be passing the `gameId`.

### Location:
`src/services/database/event-store.repo.ts` (TypeScript, not our modularized code)

### The Fix (TypeScript):
```typescript
// In event-store.repo.ts
async append(event: DomainEvent): Promise<void> {
  const query = `
    INSERT INTO domain_events (
      aggregate_type, aggregate_id, event_type, event_data, version, user_id, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  
  await this.client.query(query, [
    event.aggregateType,
    event.aggregateId, // ❌ This is NULL!
    event.eventType,
    event.eventData,
    event.version,
    event.userId,
    event.metadata
  ]);
}
```

**The problem:** `event.aggregateId` is `NULL` because when the event is created, it's not being populated.

**Where it's created:** `dist/core/engine/game-state-machine.js` (compiled TypeScript)

**The issue:** We're passing events like:
```javascript
{
  eventType: 'game.hand_started',
  aggregateType: 'Game',
  aggregateId: gameId, // ❌ gameId is undefined or not passed
  ...
}
```

**Quick Fix (Without touching TypeScript):**
Turn off event persistence by setting in `.env`:
```
USE_EVENT_PERSISTENCE=false
```

**Proper Fix (Requires TypeScript recompilation):**
Ensure `gameId` is always passed when creating domain events.

---

## 📋 THE COMPLETE FIX PLAN

### Phase 1: Frontend State Restoration (HIGH PRIORITY)
1. ✅ Update `loadSeats()` to identify user's seat
2. ✅ Update `renderSeatGrid()` to highlight "YOUR SEAT"
3. ✅ Add `renderGameState()` to display current hand
4. ✅ Update `autoJoinRoomById()` to check for active hand
5. ✅ Hide/show "Start Hand" button based on game state

**Estimated Time:** 30 minutes  
**Impact:** Fixes 90% of user-reported issues

---

### Phase 2: Event Persistence (MEDIUM PRIORITY)
1. ⚠️ Disable event persistence temporarily (`USE_EVENT_PERSISTENCE=false`)
2. 🔄 Fix `aggregateId` issue in TypeScript (requires recompilation)

**Estimated Time:** 15 minutes (temp fix), 1 hour (proper fix)  
**Impact:** Removes error spam from logs

---

### Phase 3: Backend Improvements (LOW PRIORITY)
1. ✅ Already done: Strengthen hand-active detection
2. ✅ Already done: Clear seats properly
3. ✅ Already done: Return 409 for duplicate starts

**Estimated Time:** Already complete  
**Impact:** Prevents backend errors

---

## 🎯 IMMEDIATE ACTION PLAN

### Step 1: Disable Event Persistence (2 minutes)
**Why:** Stop the error spam so we can focus on real issues

**How:**
```bash
# Edit .env file
USE_EVENT_PERSISTENCE=false
```

**Restart server**

---

### Step 2: Fix Frontend State Restoration (30 minutes)
**Priority Order:**
1. Update `loadSeats()` - identify user's seat
2. Update `renderSeatGrid()` - highlight "YOUR SEAT"
3. Add game state check in `autoJoinRoomById()`
4. Add `renderGameState()` function
5. Test refresh flow

---

### Step 3: Test and Verify (10 minutes)
**Test Case:**
1. Start game, deal cards
2. Refresh page
3. Verify:
   - ✅ My seat is highlighted as "YOUR SEAT"
   - ✅ Other seats show as "Taken"
   - ✅ Current game state is displayed (cards, pot)
   - ✅ "Start Hand" button is hidden
   - ✅ No errors in console

---

## 🚀 AFTER THIS FIX

### What Will Work:
- ✅ Refresh doesn't break the game
- ✅ Users see their seat highlighted
- ✅ Current game state is preserved
- ✅ No duplicate start attempts
- ✅ Clean console (no event errors)

### What We Can Build Next (Week 4):
- Action buttons (Fold, Check, Bet, Raise)
- Hand history display
- Rebuy system
- Chat system

---

## 📊 ROOT CAUSE SUMMARY

| Problem | Root Cause | Solution |
|---------|------------|----------|
| "Seats show as taken" | Frontend doesn't identify user's seat after refresh | Update `loadSeats()` and `renderSeatGrid()` |
| "Can't interact after refresh" | Game state not restored | Add `renderGameState()` function |
| "Start Game doesn't work" | Trying to start when hand is active | Check hand status before showing button |
| Event persistence errors | `aggregate_id` is NULL | Disable or fix TypeScript event creation |

---

**Status:** 🎯 **STRATEGIC PLAN READY**

This is the proper fix. No more band-aids. Let's implement this systematically.

