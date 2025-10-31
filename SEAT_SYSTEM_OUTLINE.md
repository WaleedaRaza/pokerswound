# 🪑 SEAT SYSTEM OUTLINE

## 🎯 CURRENT ISSUES

1. **Seats move wildly on hover** - CSS transform issue
2. **Positioning is off** - Need better coordinates
3. **Main player tile not wider** - Need special styling for YOUR seat
4. **All seats always visible** - Should hide unclaimed during game

---

## 🎨 DESIRED BEHAVIOR

### **LOBBY STATE (Before Hand Starts):**
```
          [Seat 4]     [Seat 5]     [Seat 6]
                                    
     [Seat 3]                            [Seat 7]
                      TABLE
     [Seat 2]                            [Seat 8]
                                    
          [Seat 1]   [🦈 YOU]    [Seat 0]
```
- All 9 seats visible
- Empty seats show "🪑 EMPTY - Click to claim"
- Occupied seats show nickname + chips

---

### **GAME STATE (Hand in Progress):**
```
               [Player D]    [Player E]
                                    
     [Player C]              TABLE             [Player F]
                      🃏 🃏 🃏
                       POT: $500
     [Player B]                                [Player G]
                                    
               [Player A]  [🦈 YOU - WIDER]
```
- **Only seated players visible**
- **Empty seats disappear**
- **YOUR seat is wider** (to fit 2 hole cards clearly)
- **Other players arranged around you**
- **Position relative to YOU, not absolute seat numbers**

---

## 🔧 TECHNICAL FIXES NEEDED

### **FIX 1: Stop Hover Movement**
**Problem:** `transform: translate(-50%, -50%)` + hover effects = wild movement

**Solution:**
```css
.seat {
  position: absolute;
  left: 840px; /* example */
  top: 700px;
  transform: translate(-50%, -50%);
  /* Don't add more transforms on hover! */
}

.seat:hover {
  /* NO transform changes */
  border-color: var(--teal);
  box-shadow: 0 0 20px rgba(0, 212, 170, 0.5);
}
```

---

### **FIX 2: Better Seat Positions**
**Current positions are rough. Need accurate ellipse math.**

**Better approach:**
```javascript
// Calculate positions around an ellipse
function calculateSeatPosition(index, totalSeats) {
  const centerX = 840;  // Center of 1680px canvas
  const centerY = 400;  // Center of 800px canvas
  const radiusX = 600;  // Horizontal radius
  const radiusY = 280;  // Vertical radius
  
  // Start from bottom (your position)
  const angle = (Math.PI / 2) + (2 * Math.PI * index / totalSeats);
  
  return {
    x: centerX + radiusX * Math.cos(angle),
    y: centerY + radiusY * Math.sin(angle)
  };
}
```

---

### **FIX 3: Main Player Wider**
```css
/* Regular player seat */
.seat {
  width: 130px;
  padding: 12px;
}

/* YOUR seat (wider for cards) */
.seat.me {
  width: 200px;
  padding: 16px;
  border: 2px solid var(--teal);
  background: rgba(0, 212, 170, 0.08);
}
```

---

### **FIX 4: Hide/Show Seats Based on Game State**

**JavaScript Logic:**
```javascript
function renderSeats(seats, gameState) {
  const seatsDiv = document.getElementById('seats');
  seatsDiv.innerHTML = '';
  
  const isGameActive = gameState && gameState.status === 'IN_PROGRESS';
  
  for (let i = 0; i < 9; i++) {
    const seat = seats ? seats[i] : null;
    const isEmpty = !seat || !seat.userId;
    
    // CRITICAL: Hide empty seats during active game
    if (isEmpty && isGameActive) {
      continue; // Skip rendering this seat
    }
    
    // Render the seat...
  }
}
```

---

### **FIX 5: Relative Positioning (Advanced)**
**Problem:** Seat 0 is always bottom center, but what if YOU are in Seat 3?

**Current:** Fixed positions based on seat index  
**Desired:** Positions rotate so YOU are always at bottom

**Solution (Phase 2):**
```javascript
function getRelativePosition(seatIndex, yourSeatIndex, totalSeats) {
  // Calculate relative position from your perspective
  const offset = (seatIndex - yourSeatIndex + totalSeats) % totalSeats;
  return calculateSeatPosition(offset, totalSeats);
}
```

---

## 📋 IMPLEMENTATION PLAN

### **PHASE 1: Fix Current Issues** (NOW)
1. ✅ Fix hover movement (remove transform changes)
2. ✅ Improve seat coordinates (better ellipse)
3. ✅ Make YOUR seat wider
4. ✅ Hide empty seats during game

### **PHASE 2: Relative Positioning** (LATER)
1. ⏸️ Calculate positions relative to YOUR seat
2. ⏸️ Rotate seat arrangement so YOU are always bottom-center
3. ⏸️ Smooth transitions when seats change

---

## 🚨 WHAT NOT TO TOUCH
- ❌ Game logic
- ❌ Seat claiming logic
- ❌ Backend API calls
- ❌ WebSocket handlers

## ✅ WHAT TO CHANGE
- ✅ CSS seat styling (hover, width)
- ✅ JavaScript position calculations
- ✅ Conditional rendering (hide empty during game)

---

## 🎯 IMMEDIATE ACTIONS

**Step 1:** Fix hover CSS (no transform on hover)  
**Step 2:** Recalculate seat positions (better ellipse)  
**Step 3:** Add `.seat.me` wider styling  
**Step 4:** Add game state check to hide empty seats  

**Test after each step!**

---

**Ready to start with Step 1?** (Fix hover movement)

