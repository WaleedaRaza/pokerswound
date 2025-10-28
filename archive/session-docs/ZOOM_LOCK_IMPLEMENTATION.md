# 🎯 ZOOM-LOCK TABLE - TRUE VIRTUAL CANVAS

## Implementation

### Route: **http://localhost:3001/table**

---

## How It Works

### 1. **Virtual Canvas** (Fixed Dimensions)
```javascript
HORIZONTAL_STAGE = { width: 1680, height: 800 }
VERTICAL_STAGE = { width: 600, height: 1200 }
```
Everything positioned in fixed pixels on this virtual stage.

### 2. **Uniform Scaling**
```javascript
scaleX = containerWidth / stageWidth
scaleY = containerHeight / stageHeight
scale = Math.min(scaleX, scaleY) // Contain fit

table.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`
```
ONE transform on root element, everything inherits.

### 3. **Letterbox/Pillarbox**
```javascript
offsetX = (containerWidth - scaledWidth) / 2
offsetY = (containerHeight - scaledHeight) / 2
```
Centers the stage, bars appear naturally.

### 4. **Mode Switch**
```javascript
if (width < 768px) {
  // Switch to vertical stage
  // Reposition all seats
}
```
Breakpoint changes entire layout preset.

---

## Features

✅ **Zoom in/out:** Proportions stay EXACTLY the same
✅ **Resize width:** Pillarboxes (side bars) appear
✅ **Resize height:** Letterboxes (top/bottom bars) appear
✅ **Mobile:** Switches to vertical table
✅ **Fixed positions:** Seats NEVER overlap
✅ **Uniform scale:** Everything grows/shrinks together

---

## Seat Positions (Fixed Pixels)

### Horizontal Mode:
```javascript
Seat 0: x: 840,  y: 700  // Main player
Seat 1: x: 1260, y: 624
Seat 2: x: 1512, y: 224
Seat 3: x: 1512, y: 480
Seat 4: x: 1108, y: 64
Seat 5: x: 823,  y: 104
Seat 6: x: 538,  y: 64
Seat 7: x: 185,  y: 256
Seat 8: x: 185,  y: 504
Seat 9: x: 437,  y: 592
```

### Vertical Mode:
Automatically repositions when width < 768px

---

## Technical Details

### Virtual Canvas Approach:
1. Stage has FIXED dimensions (1680×800px)
2. All elements positioned in FIXED pixels
3. JS calculates single scale factor
4. Applies `transform: scale()` to entire stage
5. Letterbox/pillarbox handled by centering

### Benefits:
- Zero overlap at any zoom
- Pixel-perfect positioning
- Uniform scaling (PowerPoint group behavior)
- Mode switching for mobile
- True zoom-lock like professional poker sites

---

## Files

- `public/poker-table-zoom-lock.html` - Self-contained implementation
- Route: `/table` (now points to zoom-lock version)
- Previous versions: `/table-grid` (em units), `/table-old` (absolute positioning)

---

## Test

**http://localhost:3001/table**

Try:
- Zoom 33%-300%: Scales uniformly
- Resize browser: Letterbox/pillarbox appears
- Make window narrow: Switches to vertical mode
- All proportions stay EXACTLY the same

**This is the professional poker site zoom-lock behavior!** 🎰
