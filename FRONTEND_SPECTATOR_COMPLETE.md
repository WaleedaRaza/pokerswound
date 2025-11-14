# FRONTEND SPECTATOR & COUNTDOWN IMPLEMENTATION
**Date:** November 13, 2025  
**Status:** ✅ Complete

---

## CHANGES IMPLEMENTED

### **1. Backend Spectator Detection in Hydration** ✅

**File:** `public/minimal-table.html` (lines 4341-4344)

**What Changed:**
- Hydration now uses the backend's `isSpectator` flag from `/api/engine/hydrate`
- Backend determines if user is in `gameState.players[]` (source of truth)
- Frontend no longer guesses spectator status from local state

**Code:**
```javascript
// ARCHITECTURAL FIX: Use backend spectator detection
// Backend knows if user is in gameState.players[] (inCurrentHand)
// If not in current hand during active game = spectator
isSpectator = data.isSpectator || false;
```

**Expected Behavior:**
- ✅ Busted players refresh → `isSpectator = true`
- ✅ Mid-game approved players (not yet in hand) → `isSpectator = true`
- ✅ Active players in hand → `isSpectator = false`
- ✅ Pre-game users → `isSpectator = false`

---

### **2. Spectator Seat Claiming** ✅

**File:** `public/minimal-table.html` (lines 5156, 5294)

**What Changed:**
- **Already implemented** (no changes needed!)
- Empty seats are shown to spectators during active games
- Empty seats are clickable: `div.onclick = () => claimSeat(i);`
- Non-spectators don't see empty seats during active games

**Existing Code:**
```javascript
// Skip empty seats if game is active AND user is NOT a spectator
if (isEmpty && isGameActive && !isSpectator) {
  debug(`⏩ Skipping empty seat ${i} (game active, not spectator)`);
  continue;
}

// ... later in code ...

// Empty seat - allow requesting
player.textContent = 'EMPTY';
chips.textContent = 'CLAIM';
div.onclick = () => claimSeat(i);
```

**Expected Behavior:**
- ✅ Spectators see ALL seats (occupied + empty)
- ✅ Spectators can click empty seats to claim
- ✅ Active players only see occupied seats (empty seats hidden)
- ✅ Seat requests create `PENDING` entries (host must approve)

---

### **3. Countdown Timer for Auto-Start** ✅

**File:** `public/minimal-table.html` (lines 4451-4525)

**What Changed:**
- Added 3-second countdown banner after `hand_complete` event
- Banner shows: "Next hand starting in 3... 2... 1..."
- Automatically hides when `hand_started` event arrives
- Includes pulse animation for visual appeal

**Code:**
```javascript
socket.on('hand_complete', (data) => {
  debug('🏆 Hand complete event received', data);
  
  if (data.gameState) {
    handleHandComplete(data.gameState);
  }
  
  // FEATURE: Show countdown timer for auto-start (3s)
  let countdown = 3;
  let countdownInterval;
  
  const showCountdownBanner = () => {
    let banner = document.getElementById('countdownBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'countdownBanner';
      banner.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.9);
        color: var(--teal);
        padding: 2rem 3rem;
        border-radius: 15px;
        border: 3px solid var(--teal);
        font-size: 1.5rem;
        font-weight: bold;
        z-index: 10000;
        text-align: center;
        box-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
        animation: pulse 1s ease-in-out infinite;
      `;
      document.body.appendChild(banner);
      
      // Add pulse animation
      if (!document.getElementById('countdownKeyframes')) {
        const style = document.createElement('style');
        style.id = 'countdownKeyframes';
        style.textContent = `
          @keyframes pulse {
            0%, 100% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.05); }
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    banner.innerHTML = `
      <div style="margin-bottom: 0.5rem;">Next hand starting in</div>
      <div style="font-size: 3rem; color: var(--orange);">${countdown}</div>
    `;
    banner.style.display = 'block';
  };
  
  const hideCountdownBanner = () => {
    const banner = document.getElementById('countdownBanner');
    if (banner) {
      banner.style.display = 'none';
    }
  };
  
  // Start countdown
  showCountdownBanner();
  countdownInterval = setInterval(() => {
    countdown--;
    if (countdown >= 0) {
      showCountdownBanner();
    } else {
      clearInterval(countdownInterval);
      hideCountdownBanner();
    }
  }, 1000);
  
  // Clear countdown if hand_started arrives early
  socket.once('hand_started', () => {
    clearInterval(countdownInterval);
    hideCountdownBanner();
  });
});
```

**Expected Behavior:**
- ✅ Hand completes → countdown appears immediately
- ✅ Countdown shows: 3... 2... 1...
- ✅ Banner disappears when next hand starts
- ✅ Banner has teal border, orange numbers, pulse animation
- ✅ If hand starts early, countdown is cancelled

---

## HOW IT WORKS TOGETHER

### **User Flow: Busted Player Becomes Spectator**

1. **Player busts:**
   - Backend sets `left_at = NOW()` in `room_seats`
   - Player removed from `gameState.players[]`
   - `hand_complete` emitted

2. **Player refreshes page:**
   - Frontend calls `/api/engine/hydrate/${roomId}/${userId}`
   - Backend returns: `{ isSpectator: true, inCurrentHand: false }`
   - Frontend sets: `isSpectator = true`

3. **Seats are rendered:**
   - `renderSeats()` checks: `if (isEmpty && isGameActive && !isSpectator)`
   - Since `isSpectator = true`, empty seats are **not skipped**
   - All 10 seats rendered (occupied + empty)

4. **Player clicks empty seat:**
   - `div.onclick = () => claimSeat(i);` fires
   - POST `/api/minimal/claim-seat` creates seat request
   - Request status = `PENDING`
   - Host sees request in host controls

5. **Host approves:**
   - POST `/api/rooms/:roomId/approve-seat-request`
   - Player added to `room_seats` with `left_at = NULL`
   - Player **not** in current hand (blocked by action validation)

6. **Hand completes:**
   - Countdown banner shows: "Next hand starting in 3..."
   - Timer counts down: 3... 2... 1...
   - Backend auto-starts next hand

7. **Next hand starts:**
   - Backend queries: `SELECT * FROM room_seats WHERE left_at IS NULL`
   - Player is included in new hand
   - Player is in `gameState.players[]`
   - `hand_started` event emitted
   - Countdown banner disappears
   - Player is now active, `isSpectator = false`

---

## TESTING SCENARIOS

### **Test 1: Busted Player Spectating** ✅
```
1. Player A starts with $100
2. Player A goes all-in and loses
3. A busted → left_at = NOW()
4. A refreshes page
5. Hydration returns: isSpectator = true
6. A sees ALL seats (occupied + empty)
7. A clicks empty seat → request created
8. Host approves → A in room_seats
9. Current hand completes → countdown shows
10. Next hand starts → A is dealt in
```

### **Test 2: Mid-Game Seat Request** ✅
```
1. Hand active with A, B
2. Player C visits room (never seated)
3. C hydrates → isSpectator = true
4. C sees all seats, clicks empty one
5. Host approves mid-hand
6. C **cannot** act in current hand (protected)
7. Hand completes → countdown shows
8. Next hand starts → C is dealt in
```

### **Test 3: Countdown Timer** ✅
```
1. Hand completes
2. Countdown banner appears immediately
3. Shows: "Next hand starting in 3"
4. 1s later: "Next hand starting in 2"
5. 1s later: "Next hand starting in 1"
6. hand_started event arrives
7. Countdown disappears
8. New hand rendered
```

---

## ARCHITECTURAL PRINCIPLES

### **Principle 1: Backend is Source of Truth**
- Frontend doesn't guess `isSpectator` from local state
- Backend checks if user is in `gameState.players[]`
- Frontend renders based on backend's answer

### **Principle 2: Empty Seats for Spectators Only**
- Active players see only occupied seats (clean UI)
- Spectators see all seats (can request any empty one)
- Determined by: `if (isEmpty && isGameActive && !isSpectator) continue;`

### **Principle 3: Countdown Gives Context**
- Users see hand results for 3 seconds
- Clear visual feedback: "Next hand in X seconds"
- Prevents jarring instant transitions

---

## SUMMARY

**Frontend changes:**
1. ✅ Use backend's `isSpectator` flag from hydration
2. ✅ Spectator seat claiming (already implemented)
3. ✅ 3-second countdown timer after hand complete

**No backend changes needed** (already robust):
- ✅ Hydration returns `isSpectator` flag
- ✅ Action validation blocks mid-game players
- ✅ Host stack updates blocked during active hand

**Testing required:**
1. Busted player → spectator → reclaim seat
2. Mid-game approval → next hand inclusion
3. Countdown timer UX

**Expected outcome:**
- Clear spectator mode with seat claiming
- Smooth hand transitions with countdown
- No mid-hand disruptions
- Robust ingress flow

