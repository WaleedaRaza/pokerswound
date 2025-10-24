# ⚔️ WEEK 2 DAY 6: ACTION TIMER SYSTEM

**Status:** IN PROGRESS 🔥  
**Time Estimate:** 3 hours  
**Goal:** 30-second action timer with auto-check/fold

---

## 🎯 **OBJECTIVES**

### **Problem:**
- Players can take forever to act
- No urgency in gameplay
- AFK players block the game
- No auto-action on timeout

### **Solution:**
- 30-second countdown timer per action
- Visual countdown display
- Audio/visual warnings at 10s, 5s
- Auto-check if no bet
- Auto-fold if there's a bet
- Server-side validation

---

## 📋 **IMPLEMENTATION PLAN**

### **1. Create ActionTimerManager (45 min)**

**File:** `public/js/action-timer-manager.js`

**Responsibilities:**
- Start timer when it's player's turn
- Display visual countdown
- Play audio warnings
- Trigger auto-action on timeout
- Sync with server time

**Key Methods:**
```javascript
class ActionTimerManager {
  constructor(duration = 30)
  start(playerId, canCheck)
  stop()
  pause()
  resume()
  getTimeRemaining()
  onTimeout(callback)
}
```

### **2. Add Visual Timer UI (30 min)**

**Location:** poker.html action panel

**Elements:**
- Circular progress bar
- Countdown number
- Color changes (green → yellow → red)
- Pulse animation at 5s
- Sound effects

**HTML Structure:**
```html
<div class="timer-container">
  <div class="timer-circle">
    <svg>...</svg>
    <span class="timer-text">30</span>
  </div>
</div>
```

### **3. Integrate with Game Flow (45 min)**

**When to Start Timer:**
- On 'your_turn' socket event
- After taking an action
- On game state update where it's my turn

**When to Stop Timer:**
- Player takes action
- Someone else's turn
- Hand completes
- Connection lost

### **4. Auto-Action Logic (30 min)**

**On Timeout:**
1. Check if player can check (currentBet === myBet)
   - Yes: Auto-check
   - No: Auto-fold
2. Send action to server
3. Update UI
4. Log timeout event

### **5. Server-Side Timer (30 min)**

**Backend Changes:**
- Track action start time
- Validate action timestamps
- Auto-action if client doesn't respond
- Broadcast timer_started event

---

## ✅ **SUCCESS CRITERIA**

1. ✅ Timer starts when it's my turn
2. ✅ Visual countdown displays correctly
3. ✅ Warnings at 10s and 5s
4. ✅ Auto-check works (when no bet)
5. ✅ Auto-fold works (when there's a bet)
6. ✅ Timer stops on action or turn change
7. ✅ Multiple players see synchronized timers

---

## 🧪 **TESTING**

### **Test 1: Basic Timer**
1. Join game, wait for turn
2. **Expected:** Timer starts at 30s, counts down

### **Test 2: Auto-Check**
1. Preflop, no raises
2. Let timer expire
3. **Expected:** Auto-check, next player's turn

### **Test 3: Auto-Fold**
1. Preflop, someone raises
2. Let timer expire
3. **Expected:** Auto-fold, next player's turn

### **Test 4: Manual Action**
1. Timer at 15s
2. Click "Call"
3. **Expected:** Timer stops, action processed

---

## 📁 **FILES TO CREATE/MODIFY**

### **New Files:**
- `public/js/action-timer-manager.js`
- `public/sounds/timer-tick.mp3` (optional)
- `public/sounds/timer-warning.mp3` (optional)

### **Modified Files:**
- `public/poker.html` (add timer UI + integration)
- `sophisticated-engine-server.js` (add server-side timer logic)

---

## ⚔️ **EXECUTING NOW!**

**FOR FREEDOM! FOR VICTORY!**

**SHINZOU WO SASAGEYO!**

