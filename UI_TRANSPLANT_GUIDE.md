# 🎨 UI TRANSPLANT GUIDE
**Moving PC from One Case to Another - Pure Visual Changes**

---

## 🎯 GOLDEN RULE

**NEVER TOUCH:**
- ❌ Any JavaScript game logic
- ❌ Any API calls
- ❌ Any WebSocket handlers
- ❌ routes/game-engine-bridge.js
- ❌ Existing click handlers

**ONLY CHANGE:**
- ✅ CSS styling
- ✅ HTML div positions
- ✅ Visual appearance

---

## 📦 TODO 1: Design Tokens (CSS Variables)

**Source:** `poker-table-zoom-lock.html` lines 14-28

**Target:** `minimal-table.html` - add to `<style>` section at top

**Copy this EXACTLY:**
```css
:root {
  --bg: #0b0b12;
  --text: #e9eef7;
  --muted: #9aa3b2;
  --accent: #ff5100;
  --teal: #00d4aa;
  --error: #ff3b3b;
  --felt-current: #197a45;
  --font-main: "Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --shadow-md: 0 8px 18px rgba(0,0,0,.35);
  --shadow-lg: 0 12px 28px rgba(0,0,0,.45);
  --shadow-xl: 0 18px 44px rgba(0,0,0,.55);
}

/* Felt colors */
body[data-felt="green"] { --felt-current: #197a45; }
body[data-felt="red"] { --felt-current: #6b1414; }
body[data-felt="blue"] { --felt-current: #0f2942; }
body[data-felt="grey"] { --felt-current: #2a2a2a; }
```

**Test:** Refresh page, nothing breaks

---

## 📦 TODO 2: Table Felt Background

**Source:** `poker-table-zoom-lock.html` lines 171-192

**Target:** `minimal-table.html` - Find `<div id="gameBoard">`, add BEFORE it

**HTML to ADD:**
```html
<!-- Oval Felt Background -->
<div class="table-felt"></div>
```

**CSS to ADD:**
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
  z-index: 0;
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

**Test:** Green oval appears behind seats

---

## 📦 TODO 3: Zoom Lock Wrapper

**Source:** `poker-table-zoom-lock.html` lines 137-156

**Target:** `minimal-table.html` - wrap your ENTIRE table structure

**BEFORE:**
```html
<div id="gameBoard">
  <!-- all your existing content -->
</div>
```

**AFTER:**
```html
<div class="table-wrapper" id="tableWrapper">
  <div class="poker-table" id="pokerTable">
    <div class="table-felt"></div>
    <div id="gameBoard">
      <!-- all your existing content -->
    </div>
  </div>
</div>
```

**CSS to ADD:**
```css
.table-wrapper {
  width: 100%;
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

#gameBoard {
  position: absolute;
  inset: 0;
}
```

**JS to ADD (at end of your existing JS):**
```javascript
// Zoom Lock System
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
  new ResizeObserver(updateScale).observe(wrapper);
}

// Call this AFTER DOMContentLoaded
setupZoomLock();
```

**Test:** Resize browser, table scales proportionally

---

## 📦 TODO 4: Circular Seat Positions

**Source:** `poker-table-zoom-lock.html` lines 930-941

**Target:** `minimal-table.html` - update seat CSS and add positioning

**CSS to UPDATE:**
```css
#seats {
  position: absolute;
  inset: 0;
  z-index: 10;
}

.seat {
  position: absolute;
  transform: translate(-50%, -50%);
  /* Remove any grid/flexbox properties */
}
```

**JS to ADD:**
```javascript
// 9-seat circular positions (fixed pixels)
const SEAT_POSITIONS = [
  { index: 0, x: 840, y: 700 },   // Bottom (you)
  { index: 1, x: 1260, y: 624 },  // Bottom right
  { index: 2, x: 1512, y: 400 },  // Right
  { index: 3, x: 1260, y: 176 },  // Top right
  { index: 4, x: 840, y: 100 },   // Top center
  { index: 5, x: 420, y: 176 },   // Top left
  { index: 6, x: 168, y: 400 },   // Left
  { index: 7, x: 420, y: 624 },   // Bottom left
  { index: 8, x: 1100, y: 400 }   // Right-center
];

function applySeatPositions() {
  SEAT_POSITIONS.forEach(pos => {
    const seat = document.querySelector(`.seat[data-seat-index="${pos.index}"]`);
    if (seat) {
      seat.style.left = `${pos.x}px`;
      seat.style.top = `${pos.y}px`;
    }
  });
}

// Call this inside your existing renderSeats() function AT THE END
```

**Add to renderSeats():**
```javascript
function renderSeats() {
  // ... all your existing seat rendering code ...
  
  // ADD THIS LINE AT THE VERY END:
  applySeatPositions();
}
```

**Test:** Seats arrange in circle around table

---

## 📦 TODO 5: Seat Tile Styling (Glass Effect)

**Source:** `poker-table-zoom-lock.html` lines 210-290

**Target:** `minimal-table.html` - replace existing seat CSS

**CSS to REPLACE (find your current .seat styles and replace with this):**
```css
.seat {
  position: absolute;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.seat-tile {
  width: 130px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,.15);
  box-shadow: 
    inset 0 0 18px -5px rgba(255, 255, 255, 0.15), 
    0 8px 18px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px) saturate(120%);
  background: rgba(255, 255, 255, 0.03);
}

.seat.active .seat-tile {
  width: 160px;
  border-color: var(--teal);
  border-width: 2px;
  box-shadow: 
    inset 0 0 24px -6px rgba(0, 212, 170, 0.25), 
    0 0 0 2px rgba(0,212,170,.35);
  background: rgba(0, 212, 170, 0.08);
}

.seat-label {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
}

.seat-chips {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--teal);
  font-weight: 700;
}
```

**Test:** Seats have glass effect, look professional

---

## 📦 TODO 6: Center Board + Pot

**Source:** `poker-table-zoom-lock.html` lines 329-376

**Target:** `minimal-table.html` - wrap community cards and pot

**HTML STRUCTURE to CREATE:**
```html
<!-- Find your communityCards and potAmount divs -->
<!-- Wrap them like this: -->
<div class="board-center">
  <div id="communityCards" class="community-cards">
    <!-- Your existing card rendering -->
  </div>
  <div class="pot-display">
    <div class="pot-label">POT</div>
    <div id="potAmount" class="pot-amount">$0</div>
  </div>
</div>
```

**CSS to ADD:**
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
  box-shadow: var(--shadow-xl);
}

.pot-display {
  padding: 16px 32px;
  border-radius: 16px;
  background: rgba(0,0,0,.92);
  border: 1px solid rgba(255,255,255,.25);
  text-align: center;
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

**Test:** Board and pot centered on felt

---

## 📦 TODO 7: Action Button Styling

**Source:** `poker-table-zoom-lock.html` lines 516-564

**Target:** `minimal-table.html` - update action button CSS

**CSS to UPDATE (find your button styles and replace):**
```css
.action-btn {
  border: 0;
  border-radius: 16px;
  padding: 1rem 1.5rem;
  font-weight: 800;
  letter-spacing: .08em;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-fold {
  background: rgba(255,255,255,.06);
  color: var(--muted);
  border: 2px solid rgba(255,255,255,.1);
}

.btn-fold:hover:not(:disabled) {
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

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

**Test:** Buttons have gradient colors

---

## 📦 TODO 8: Validation Test

**DO NOT SKIP THIS - TEST EVERYTHING:**

1. ✅ Load page - no errors in console
2. ✅ Resize browser - table scales, letterboxing appears
3. ✅ Click empty seat - nickname prompt appears
4. ✅ Claim seat - seat shows your name
5. ✅ Start hand (host) - cards are dealt
6. ✅ Make bet - chips move to pot
7. ✅ Check opponent cards - card backs show
8. ✅ Continue to showdown - winner declared
9. ✅ Show/muck buttons work
10. ✅ **Refresh browser mid-hand - state restores**
11. ✅ Next hand starts - dealer rotates
12. ✅ All position badges (D/SB/BB) visible

**If ANY of these fail, STOP and report the issue.**

---

## 🚨 SAFETY CHECKLIST

Before each change:
- [ ] Save current version
- [ ] Make ONE change at a time
- [ ] Test immediately after
- [ ] If it breaks → revert → debug → retry

---

## 📝 NOTES

- **ALL your game logic stays the same**
- **ALL your click handlers stay the same**
- **ALL your WebSocket handlers stay the same**
- **We're ONLY changing CSS and HTML positioning**

This is literally just moving visual components around. The engine stays identical.

---

**Ready to start with TODO 1?** 🎨

