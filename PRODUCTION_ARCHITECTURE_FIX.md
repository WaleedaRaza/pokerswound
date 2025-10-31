# 🏗️ PRODUCTION ARCHITECTURE FIX - RIGHT NOW

## 🔥 **THE PROBLEM (What You Showed Me)**

1. ❌ **Split pot bug** - Both players get $10 (tie) instead of proper evaluation
2. ❌ **"NEXT HAND" broken** - Just deals new cards, doesn't reset board/pot
3. ❌ **Old community cards still showing** - Board not cleared between hands
4. ❌ **Chips stuck at $1000** - Not persisting or reading correctly
5. ❌ **Not using production TypeScript engine** - We're hacking around it

---

## ✅ **THE FIX (Right Now)**

### **STEP 1: Rename & Reorganize** ✅ DONE
- ✅ Renamed `minimal.js` → `game-engine-bridge.js`
- ✅ Updated server mount: `/api/minimal` → `/api/game`
- **Mental shift:** This IS production, not a "minimal" hack

### **STEP 2: Fix "NEXT HAND" Endpoint** 🔄 IN PROGRESS
**Current problem:** Clicks "NEXT HAND" → just deals cards

**What it SHOULD do:**
```javascript
POST /api/game/next-hand
1. Mark current game_states as 'completed' ✅
2. Verify chips persisted to room_seats ✅
3. Query room_seats for current chip counts
4. Rotate dealer position (+1)
5. Calculate new SB/BB positions
6. Create NEW game_states record
7. Deal fresh cards
8. Post blinds
9. Broadcast 'new_hand_started'
10. Clear old board state
```

### **STEP 3: Fix Chip Persistence Flow**
```
HAND END:
1. handleShowdown() awards chips in gameState ✅
2. UPDATE room_seats.chips_in_play ✅
3. Mark game_states status='completed' ✅

NEXT HAND START:
1. SELECT chips_in_play FROM room_seats ← READ PERSISTED
2. Use those as starting chips
3. Don't hardcode $1000
```

### **STEP 4: Fix Frontend Board Reset**
```javascript
// On 'new_hand_started' event:
1. Clear community cards UI
2. Clear pot display → $0
3. Hide hole cards
4. Reset action buttons
5. Show "Waiting for deal..."
6. Then fetch new game state
```

---

## 🎯 **IMPLEMENTATION PLAN**

### **File: routes/game-engine-bridge.js**

#### **Add POST /next-hand endpoint:**
```javascript
router.post('/next-hand', async (req, res) => {
  const { roomId, userId } = req.body;
  
  // 1. Verify host
  // 2. Get current game state
  // 3. Verify it's completed
  // 4. Get room info (dealer position, blinds)
  // 5. Query room_seats for current chips
  // 6. Rotate dealer
  // 7. Calculate SB/BB positions
  // 8. Create new deck & shuffle
  // 9. Deal cards
  // 10. Post blinds
  // 11. Create new game_states record
  // 12. Broadcast 'new_hand_started'
});
```

### **File: public/minimal-table.html**

#### **Update API endpoints:**
```javascript
// Change all /api/minimal → /api/game
'/api/minimal/deal-cards' → '/api/game/deal-cards'
'/api/minimal/action' → '/api/game/action'
'/api/minimal/my-cards' → '/api/game/my-cards'
'/api/minimal/game' → '/api/game/state'
'/api/minimal/seats' → '/api/game/seats'

// Add new endpoint:
'/api/game/next-hand' ← NEW
```

#### **Fix "NEXT HAND" button handler:**
```javascript
async function startNextHand() {
  // Clear UI first
  document.getElementById('communityCards').innerHTML = '';
  document.getElementById('myCards').innerHTML = '';
  document.getElementById('potAmount').textContent = '0';
  document.getElementById('actionButtons').style.display = 'none';
  
  // Call new endpoint
  const response = await fetch('/api/game/next-hand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, userId })
  });
  
  // Will receive 'new_hand_started' via WebSocket
}
```

#### **Add 'new_hand_started' WebSocket listener:**
```javascript
socket.on('new_hand_started', (data) => {
  debug('🎬 New hand starting', data);
  
  // Update dealer position
  // Show blinds posted
  // Fetch my new cards
  // Update pot/bet displays
  // Re-enable action buttons for actor
});
```

---

## 🔧 **IMMEDIATE ACTION ITEMS**

### **Priority 1: Create /next-hand endpoint**
- [ ] Add to `routes/game-engine-bridge.js`
- [ ] Read chips from room_seats
- [ ] Rotate dealer position
- [ ] Create new game state
- [ ] Broadcast properly

### **Priority 2: Update Frontend**
- [ ] Change API paths
- [ ] Fix "NEXT HAND" button
- [ ] Add board reset logic
- [ ] Listen for 'new_hand_started'

### **Priority 3: Fix Split Pot Bug**
- [ ] Why did both players get $10?
- [ ] HandEvaluator should have determined winner
- [ ] Check tie-breaking logic

---

## 📊 **DATABASE FLOW (Correct)**

```
TABLE: rooms
- dealer_position (int, tracks who has button)

TABLE: room_seats
- chips_in_play (updated after each hand)

TABLE: game_states
- Multiple records per room
- One per hand
- status: 'active' → 'completed'

HAND CYCLE:
1. Hand N ends → game_states[N].status = 'completed'
2. Chips awarded → room_seats.chips_in_play updated
3. "NEXT HAND" clicked
4. Read room_seats.chips_in_play (not hardcoded)
5. Rotate rooms.dealer_position
6. Create game_states[N+1] with status = 'active'
7. Deal cards, post blinds
8. Play hand...
9. Repeat
```

---

## ✅ **SUCCESS CRITERIA**

**After this fix, this should work:**

1. ✅ Play Hand 1 to showdown
2. ✅ Winner gets correct chips (not split if shouldn't be)
3. ✅ Chips persist to DB
4. ✅ Click "NEXT HAND"
5. ✅ Board clears completely
6. ✅ New cards dealt
7. ✅ Players start with PREVIOUS hand's ending chips
8. ✅ Dealer button rotates
9. ✅ Blinds rotate
10. ✅ Play Hand 2 normally
11. ✅ Repeat for 10 hands without bugs

---

## 🚀 **NEXT: IMPLEMENT NOW**

I'm going to:
1. Create the `/next-hand` endpoint
2. Update frontend to use it
3. Fix the board reset
4. Test full hand cycle

**NO MORE PATCHING. USE THE REAL ARCHITECTURE.**

