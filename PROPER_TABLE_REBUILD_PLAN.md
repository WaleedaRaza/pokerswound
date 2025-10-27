# 🎯 POKER TABLE - PROPER RESPONSIVE REBUILD

## 📋 EXECUTION PLAN

### Phase 1: Foundation (30 min)
1. ✅ Copy EXACT navbar from index.html
2. ✅ Create flex column wrapper (navbar + game + hud)
3. ✅ Add aspect-ratio container for table
4. ✅ Define design tokens (no magic numbers)

### Phase 2: Table Layout (1 hour)
1. ✅ CSS Grid for seat positioning (9-position grid)
2. ✅ Percentage-based positioning fallback
3. ✅ Main player (seat 0) - larger grid area
4. ✅ Responsive seat sizing with clamp()
5. ✅ Test zoom: 50%, 75%, 100%, 125%, 150%

### Phase 3: HUD Overlay (45 min)
1. ✅ Floating overlay (not footer)
2. ✅ Consolidate: actions + room info + chips
3. ✅ Feels like "in-game" not "separate UI"
4. ✅ Responsive layout (desktop row, mobile column)

### Phase 4: Cards & Elements (30 min)
1. ✅ Clamp-based card sizing
2. ✅ Proper pot display positioning
3. ✅ D/S/B buttons with responsive sizing
4. ✅ Card images from `/cards/` folder

### Phase 5: Testing (30 min)
1. ✅ Desktop zoom: 33%, 50%, 75%, 100%, 125%, 150%
2. ✅ Mobile: 375px, 768px, 1024px
3. ✅ No overlaps at any size
4. ✅ All elements visible and readable

---

## 🎨 DESIGN SYSTEM

### Spacing Tokens
```css
--space-3xs: clamp(0.125rem, 0.25vw, 0.25rem);
--space-2xs: clamp(0.25rem, 0.5vw, 0.5rem);
--space-xs: clamp(0.5rem, 1vw, 0.75rem);
--space-sm: clamp(0.75rem, 1.5vw, 1rem);
--space-md: clamp(1rem, 2vw, 1.5rem);
--space-lg: clamp(1.5rem, 3vw, 2rem);
--space-xl: clamp(2rem, 4vw, 3rem);
--space-2xl: clamp(3rem, 6vw, 4rem);
```

### Element Sizing
```css
/* Cards */
--card-sm: clamp(45px, 4vw, 60px);
--card-md: clamp(60px, 5vw, 80px);
--card-lg: clamp(80px, 7vw, 110px);

/* Seats */
--seat-sm: clamp(140px, 11vw, 180px);
--seat-lg: clamp(220px, 18vw, 280px);

/* Buttons */
--btn-height: clamp(48px, 5vh, 64px);
```

### Grid Layout
```css
.poker-table {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-template-rows: repeat(8, 1fr);
  gap: var(--space-sm);
  width: 100%;
  height: 100%;
}

/* Seat positioning in grid */
.seat-0 { grid-area: 7 / 5 / 9 / 9; } /* Main player: spans 4 columns, 2 rows */
.seat-1 { grid-area: 7 / 9 / 8 / 11; }
.seat-2 { grid-area: 5 / 10 / 6 / 12; }
.seat-3 { grid-area: 4 / 10 / 5 / 12; }
/* etc... */
```

---

## 🎮 HUD OVERLAY DESIGN

### Layout
```
┌─────────────────────────────────────────────┐
│  💰 $5,280   🎲 #42   👑 Host               │
│  ─────────────────────────────────────────  │
│  [½ POT] [¾ POT] [POT] [2× POT]             │
│  ─────────────────────────────────────────  │
│  [FOLD] [CALL $950] [RAISE $2,400]          │
└─────────────────────────────────────────────┘
```

All-in-one overlay that floats over the table, not a separate footer.

---

## 🚀 EXECUTION ORDER

1. **NOW:** Create design tokens CSS file
2. **NEXT:** Rebuild HTML structure with proper flex/grid
3. **THEN:** Copy exact navbar from index.html
4. **THEN:** Build HUD overlay with all controls
5. **THEN:** Position seats using grid
6. **THEN:** Test exhaustively

---

## ⏱️ TIME ESTIMATE

- **Total:** ~3 hours for production-quality rebuild
- **Testable version:** 1.5 hours
- **Polished version:** 3 hours

---

## ✅ SUCCESS CRITERIA

- [ ] Works at 33% zoom
- [ ] Works at 150% zoom
- [ ] Works on iPhone (375px)
- [ ] Works on iPad (768px)
- [ ] Works on desktop (1920px)
- [ ] No overlapping at ANY size
- [ ] Main player always prominent
- [ ] Cards always readable
- [ ] Actions feel like "in-game"
- [ ] Navbar matches index.html exactly

---

**Starting Phase 1 NOW - Design Tokens & Foundation** 🚀
