# 🎯 Poker Table HUD Design - Proper Architecture

## Core Problems to Solve

1. **Table doesn't fit tiles properly** - Tiles floating awkwardly
2. **100% zoom is messy** - Default view broken
3. **Wasted space** - Footer taking up valuable real estate
4. **Poor scaling** - Components don't resize elegantly
5. **UI fragmentation** - Controls split between header/footer

## New Architecture: Full-Screen Table + Floating HUD

### Layout Philosophy
```
┌─────────────────────────────────────┐
│          FULL VIEWPORT              │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │      POKER TABLE           │   │
│  │    (fills entire space)    │   │
│  │                             │   │
│  │  [Seats integrated into     │   │
│  │   table edge naturally]     │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [Floating HUD - Top Right]        │
│  [Action Panel - Bottom Center]    │
└─────────────────────────────────────┘
```

### Key Design Decisions

1. **NO FIXED HEADER/FOOTER**
   - Table uses 100vh
   - All UI elements float over table
   - No wasted vertical space

2. **INTEGRATED SEATS**
   - Seats are part of the table edge
   - Not floating randomly
   - Proper visual connection

3. **FLOATING HUD (Top Right)**
   ```
   ┌──────────────┐
   │ PokerGeek.ai │
   │ Room: DEMO   │
   │ Hand: #42    │
   │──────────────│
   │ 🎮 Host      │
   │ ⚙️ Settings  │
   │ 🚪 Leave     │
   └──────────────┘
   ```
   - Semi-transparent
   - Collapsible
   - Contains ALL controls

4. **ACTION OVERLAY (When Your Turn)**
   ```
   Bottom center, floats over table:
   ┌─────────────────────────────┐
   │ [½POT] [¾POT] [POT] [2×POT] │
   │ ────────[$slider]────────   │
   │ [FOLD] [CALL $X] [RAISE $X] │
   └─────────────────────────────┘
   ```
   - Only shows when acting
   - Semi-transparent background
   - Doesn't push table up

5. **SCALING STRATEGY**
   - Use CSS `vh/vw` units
   - Table = 90vw × 60vh (maintains aspect)
   - Seats scale with table
   - Font sizes in `rem` with viewport scaling
   - Cards as percentage of table size

### Viewport-Based Sizing

```css
/* Base scaling */
:root {
  --table-width: min(90vw, 150vh);  /* Maintain aspect ratio */
  --table-height: calc(var(--table-width) * 0.6);
  --seat-size: calc(var(--table-width) * 0.12);
  --card-width: calc(var(--table-width) * 0.05);
  --card-height: calc(var(--card-width) * 1.4);
}

/* Main player gets 1.5x */
.seat.my-seat {
  --seat-size: calc(var(--table-width) * 0.18);
}
```

### Seat Positioning (Natural Table Edge)

```css
/* Seats positioned ON the table edge, not floating */
.seat[data-position="0"] { 
  left: 50%; 
  bottom: 5%;  /* ON the edge */
}
.seat[data-position="1"] { 
  left: 75%; 
  bottom: 15%;  /* Following table curve */
}
/* etc... following natural table edge */
```

### Mobile Considerations

- Portrait: Table rotates, action buttons stay bottom
- Landscape: Full experience
- Touch targets: Min 44px
- Gestures: Swipe to show/hide HUD

## Implementation Plan

1. **Remove fixed header/footer**
2. **Make table fill viewport**
3. **Position seats ON table edge**
4. **Create floating HUD component**
5. **Create action overlay**
6. **Implement viewport-based scaling**
7. **Test at various zoom levels**

## Benefits

✅ **Maximum table space** - No wasted pixels
✅ **Natural seat placement** - Tiles fit the table
✅ **Clean at 100% zoom** - Designed for default
✅ **Elegant scaling** - Everything proportional
✅ **Unified controls** - Single HUD location
✅ **Mobile-friendly** - Responsive by design

---

This is a COMPLETE REDESIGN focusing on:
- Table-first design
- Floating UI elements
- Natural seat integration
- Proper scaling architecture
