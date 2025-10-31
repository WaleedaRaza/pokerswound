# 🎨 INCREMENTAL UI MIGRATION PLAN
**Bringing Zoom-Lock UI into Sandbox (No Game Logic Changes)**

---

## 🎯 PHILOSOPHY

1. **minimal-table.html stays the base** (all game logic intact)
2. **Add zoom-lock features ONE AT A TIME**
3. **Test after EVERY change**
4. **If it breaks, revert immediately**
5. **Never touch game-engine-bridge.js**

---

## 📋 STEP-BY-STEP MIGRATION

### **STEP 1: Add Design Tokens** ⏱️ 10 min

**What:** Copy CSS variables from zoom-lock to sandbox

**File:** `public/minimal-table.html`

**Action:**
```css
/* Add to <style> section at top */
:root {
  --bg: #0b0b12;
  --text: #e9eef7;
  --muted: #9aa3b2;
  --accent: #ff5100;
  --teal: #00d4aa;
  --error: #ff3b3b;
  --felt-current: #197a45;
  --font-main: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --shadow-md: 0 8px 18px rgba(0,0,0,.35);
  --shadow-lg: 0 12px 28px rgba(0,0,0,.45);
  --shadow-xl: 0 18px 44px rgba(0,0,0,.55);
}
```

**Test:** Page loads, nothing breaks

**Validation:** ✅ Game still starts, seats still work

---

### **STEP 2: Add Zoom Lock Container** ⏱️ 15 min

**What:** Wrap existing table in zoom-lock structure

**File:** `public/minimal-table.html`

**Before:**
```html
<div id="gameBoard">
  <div id="seats"></div>
  <div id="communityCards"></div>
</div>
```

**After:**
```html
<!-- Letterbox Container -->
<div class="table-wrapper" id="tableWrapper">
  <!-- Fixed Virtual Canvas -->
  <div class="poker-table" id="pokerTable">
    <div id="gameBoard">
      <div id="seats"></div>
      <div id="communityCards"></div>
    </div>
  </div>
</div>
```

**Add CSS:**
```css
.table-wrapper {
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  position: relative;
  overflow: hidden;
}

.poker-table {
  position: absolute;
  width: 1680px;
  height: 800px;
  transform-origin: top left;
  pointer-events: auto;
}
```

**Add JS (at end of script section):**
```javascript
function setupZoomLock() {
  const wrapper = document.getElementById('tableWrapper');
  const table = document.getElementById('pokerTable');
  
  if (!wrapper || !table) return;

  const updateScale = () => {
    const containerWidth = wrapper.clientWidth;
    const containerHeight = wrapper.clientHeight;
    const stageWidth = 1680;
    const stageHeight = 800;

    const scaleX = containerWidth / stageWidth;
    const scaleY = containerHeight / stageHeight;
    const scale = Math.min(scaleX, scaleY);

    const scaledWidth = stageWidth * scale;
    const scaledHeight = stageHeight * scale;
    const offsetX = (containerWidth - scaledWidth) / 2;
    const offsetY = (containerHeight - scaledHeight) / 2;

    table.style.left = `${offsetX}px`;
    table.style.top = `${offsetY}px`;
    table.style.transform = `scale(${scale})`;
  };

  updateScale();
  window.addEventListener('resize', updateScale);
}

// Call in DOMContentLoaded
setupZoomLock();
```

**Test:** 
- Resize browser window
- Table should scale proportionally
- Letterboxing appears when aspect ratio changes

**Validation:** ✅ Game still works, zoom lock active

---

### **STEP 3: Add Circular Felt Background** ⏱️ 10 min

**What:** Add oval felt behind seats

**File:** `public/minimal-table.html`

**Update HTML:**
```html
<div class="poker-table" id="pokerTable">
  <!-- NEW: Felt background -->
  <div class="table-felt"></div>
  
  <div id="gameBoard">
    <div id="seats"></div>
    <div id="communityCards"></div>
  </div>
</div>
```

**Add CSS:**
```css
.table-felt {
  position: absolute;
  inset: 24px;
  border-radius: 360px;
  border: 2px solid #0d1117;
  background: var(--felt-current);
  box-shadow: 
    inset 0 0 0 16px rgba(0,0,0,.35), 
    inset 0 0 80px rgba(0,0,0,.45);
}

.table-felt::after {
  content: "";
  position: absolute;
  inset: -24px;
  border-radius: inherit;
  box-shadow: 0 16px 56px rgba(0,0,0,.55);
  pointer-events: none;
}
```

**Test:** Green oval table appears behind seats

**Validation:** ✅ Seats still clickable, game still works

---

### **STEP 4: Convert 9-Seat Grid → Circular Layout** ⏱️ 30 min

**What:** Position seats around ellipse (keep 9 seats)

**File:** `public/minimal-table.html`

**Update CSS:**
```css
#seats {
  position: absolute;
  inset: 0;
  z-index: 10;
}

.seat {
  position: absolute;
  transform: translate(-50%, -50%);
  /* Positions will be set via JS */
}
```

**Add JS Function:**
```javascript
// Circular seat positions for 9 seats
const SEAT_POSITIONS_9 = [
  { index: 0, x: 840, y: 700 },   // Bottom (you)
  { index: 1, x: 1260, y: 624 },  // Bottom right
  { index: 2, x: 1512, y: 400 },  // Right
  { index: 3, x: 1260, y: 176 },  // Top right
  { index: 4, x: 840, y: 100 },   // Top center
  { index: 5, x: 420, y: 176 },   // Top left
  { index: 6, x: 168, y: 400 },   // Left
  { index: 7, x: 420, y: 624 },   // Bottom left
  { index: 8, x: 840, y: 500 }    // Center (optional)
];

function applySeatPositions() {
  SEAT_POSITIONS_9.forEach(pos => {
    const seatEl = document.querySelector(`.seat[data-seat-index="${pos.index}"]`);
    if (seatEl) {
      seatEl.style.left = `${pos.x}px`;
      seatEl.style.top = `${pos.y}px`;
    }
  });
}

// Call after renderSeats() in your existing code
```

**Update renderSeats():**
```javascript
function renderSeats() {
  // ... existing seat rendering code ...
  
  // AFTER rendering, apply circular positions
  applySeatPositions();
}
```

**Test:** 
- Seats should arrange in circle
- Game should still start
- Seat claiming should still work

**Validation:** ✅ All game features work, seats in circle

---

### **STEP 5: Professional Seat Styling** ⏱️ 20 min

**What:** Make seats look like zoom-lock (glass effect, better cards)

**File:** `public/minimal-table.html`

**Update Seat CSS:**
```css
.seat {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.seat-content {
  width: 130px;
  padding: 12px;
  border-radius: 12px;
  position: relative;
  border: 1px solid rgba(255,255,255,.15);
  box-shadow: 
    inset 0 0 18px -5px rgba(255, 255, 255, 0.15), 
    0 8px 18px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px) saturate(120%);
  background: rgba(255, 255, 255, 0.03);
}

.seat.active .seat-content {
  width: 180px;
  padding: 16px;
  border-color: var(--teal);
  border-width: 2px;
  box-shadow: 
    inset 0 0 24px -6px rgba(0, 212, 170, 0.25), 
    0 0 0 2px rgba(0,212,170,.35), 
    0 0 40px rgba(0,212,170,.55);
  background: rgba(0, 212, 170, 0.08);
}

.player-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent) 0%, #ff7a2f 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  box-shadow: var(--shadow-md);
}

.player-name {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}

.player-chips {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--teal);
  font-weight: 700;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
}
```

**Test:** Seats look professional with glass effect

**Validation:** ✅ Game works, seats beautiful

---

### **STEP 6: Center Community Cards on Felt** ⏱️ 15 min

**What:** Move community cards to center of table

**File:** `public/minimal-table.html`

**Update HTML:**
```html
<div class="poker-table" id="pokerTable">
  <div class="table-felt"></div>
  
  <!-- NEW: Board center container -->
  <div class="board-center">
    <div id="communityCards" class="community-cards"></div>
    <div class="pot-display">
      <div class="pot-label">POT</div>
      <div id="potAmount" class="pot-amount">$0</div>
    </div>
  </div>
  
  <div id="seats"></div>
</div>
```

**Add CSS:**
```css
.board-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 5;
  pointer-events: none;
}

.community-cards {
  display: flex;
  gap: 12px;
}

.community-card {
  width: 80px;
  aspect-ratio: 5 / 7;
  border-radius: 8px;
  background-size: cover;
  box-shadow: var(--shadow-xl);
}

.pot-display {
  padding: 16px 32px;
  border-radius: 16px;
  background: rgba(0,0,0,.92);
  border: 1px solid rgba(255,255,255,.25);
  box-shadow: var(--shadow-xl);
}

.pot-label {
  font-size: 10px;
  color: var(--muted);
  letter-spacing: .15em;
  font-weight: 800;
  margin-bottom: 4px;
}

.pot-amount {
  font-family: var(--font-mono);
  font-size: 32px;
  color: var(--teal);
  font-weight: 800;
}
```

**Test:** Community cards and pot centered on felt

**Validation:** ✅ Game works, board centered

---

### **STEP 7: Professional Action Buttons** ⏱️ 15 min

**What:** Style action buttons like zoom-lock (below table)

**File:** `public/minimal-table.html`

**Update Button CSS:**
```css
.action-btn {
  border: 0;
  border-radius: 16px;
  padding: 1rem 1.5rem;
  font-weight: 800;
  letter-spacing: .08em;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: .25rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-fold {
  background: rgba(255,255,255,.06);
  color: var(--muted);
  border: 2px solid rgba(255,255,255,.1);
}

.btn-fold:hover {
  background: var(--error);
  color: #fff;
  border-color: var(--error);
}

.btn-call {
  background: linear-gradient(135deg, var(--teal) 0%, #00efc2 100%);
  color: #0b0b0f;
  box-shadow: 0 6px 22px rgba(0,212,170,.35);
}

.btn-raise {
  background: linear-gradient(135deg, var(--accent) 0%, #ff7a2f 100%);
  color: #0b0b0f;
  box-shadow: 0 6px 22px rgba(255,81,0,.35);
}
```

**Test:** Buttons look professional

**Validation:** ✅ All actions work, buttons beautiful

---

### **STEP 8: Add Felt Color Picker** ⏱️ 10 min

**What:** Let host change felt color (like zoom-lock)

**File:** `public/minimal-table.html`

**Add to Host Controls Panel:**
```html
<div class="host-control-section">
  <h3>Table Felt Color</h3>
  <div class="felt-colors">
    <div class="felt-option active" data-color="green" style="background: #197a45;"></div>
    <div class="felt-option" data-color="red" style="background: #6b1414;"></div>
    <div class="felt-option" data-color="blue" style="background: #0f2942;"></div>
    <div class="felt-option" data-color="grey" style="background: #2a2a2a;"></div>
  </div>
</div>
```

**Add CSS:**
```css
body[data-felt="green"] { --felt-current: #197a45; }
body[data-felt="red"] { --felt-current: #6b1414; }
body[data-felt="blue"] { --felt-current: #0f2942; }
body[data-felt="grey"] { --felt-current: #2a2a2a; }

.felt-colors {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.felt-option {
  aspect-ratio: 1;
  border-radius: 8px;
  border: 2px solid transparent;
  cursor: pointer;
}

.felt-option.active {
  border-color: var(--accent);
  box-shadow: 0 0 20px rgba(255, 81, 0, 0.5);
}
```

**Add JS:**
```javascript
document.querySelectorAll('.felt-option').forEach(option => {
  option.addEventListener('click', () => {
    const color = option.dataset.color;
    document.body.dataset.felt = color;
    sessionStorage.setItem('tableColor', color);
    document.querySelectorAll('.felt-option').forEach(o => o.classList.remove('active'));
    option.classList.add('active');
  });
});

// Load saved color
const savedColor = sessionStorage.getItem('tableColor');
if (savedColor) {
  document.body.dataset.felt = savedColor;
  document.querySelector(`.felt-option[data-color="${savedColor}"]`)?.classList.add('active');
}
```

**Test:** Clicking colors changes felt

**Validation:** ✅ Game works, colors changeable

---

## ✅ COMPLETION CHECKLIST

After all steps:
- [ ] Zoom lock works (resize browser)
- [ ] Seats in circle around felt
- [ ] Professional glass effect on seats
- [ ] Community cards centered
- [ ] Pot display centered
- [ ] Action buttons styled
- [ ] Felt color changeable
- [ ] **ALL GAME FEATURES STILL WORK:**
  - [ ] Can start hand
  - [ ] Cards are dealt
  - [ ] Betting works
  - [ ] Dealer/SB/BB badges show
  - [ ] Showdown evaluates winner
  - [ ] Winner banner appears
  - [ ] Show/muck works
  - [ ] Auto-start countdown
  - [ ] **Refresh mid-hand works**

---

## 🚨 IF SOMETHING BREAKS

1. **Immediately revert the last change**
2. **Test again to confirm it's fixed**
3. **Debug the specific step before proceeding**

---

## 🎯 FINAL RESULT

After all steps, you'll have:
- Beautiful zoom-locked table ✨
- Circular seat layout ✨
- Professional casino aesthetic ✨
- **ALL sandbox game features intact** ✅

---

**Ready to start with Step 1?** (Add design tokens) 🎨

