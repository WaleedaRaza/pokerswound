# PokerGeek Active Architecture (Post-Audit)

**Last Updated:** Current Session  
**Status:** Production System Documentation

---

## 🎯 PRODUCTION SYSTEM (What's Actually Running)

### Server Entry Point
- **File:** `sophisticated-engine-server.js`
- **Port:** 3000 (or `process.env.PORT`)
- **Start Command:** `node sophisticated-engine-server.js`

### Active Routes (Mounted in Server)
```
/api/engine/*     → routes/game-engine-bridge.js  ✅ ACTIVE (UI uses this)
/api/rooms/*      → routes/rooms.js              ✅ ACTIVE
/api/auth/*       → routes/auth.js                ✅ ACTIVE
/api/social/*     → routes/social.js              ✅ ACTIVE
/api/pages/*     → routes/pages.js               ✅ ACTIVE
/api/v2/*        → routes/v2.js                  ✅ ACTIVE
```

### Inactive Routes (Wired but Unused by UI)
```
/api/games/*     → routes/games.js               ❌ INACTIVE (UI doesn't call)
```

---

## 🎮 ACTIVE GAME ENGINE (System B - "Minimal")

### Location
`src/adapters/` (JavaScript modules)

### Module Structure
```
src/adapters/
├── minimal-engine-bridge.js  (176 lines)  ← Thin adapter layer
├── game-logic.js             (528 lines)  ← Main orchestrator
├── betting-logic.js          (348 lines)  ← Validation & action application
├── pot-logic.js              (228 lines)  ← Side pots & chip conservation
├── turn-logic.js             (369 lines)  ← Turn rotation & round completion
├── rules-ranks.js            (114 lines)  ← Hand evaluation rules
└── simple-hand-evaluator.js  (246 lines)  ← Hand ranking implementation
```

### Data Flow
```
Frontend (minimal-table.html)
  ↓ POST /api/engine/action
routes/game-engine-bridge.js
  ↓ MinimalBettingAdapter.processAction()
src/adapters/minimal-engine-bridge.js
  ↓ Delegates to game-logic.js
src/adapters/game-logic.js
  ├─→ betting-logic.js (validate & apply)
  ├─→ turn-logic.js (rotate & complete)
  ├─→ pot-logic.js (side pots)
  └─→ rules-ranks.js (hand evaluation)
  ↓ Returns updatedState
routes/game-engine-bridge.js
  ├─→ UPDATE game_states (persist)
  └─→ io.emit('action_processed') (broadcast)
Frontend (socket.on('action_processed'))
  ↓ Updates UI
```

### Key Endpoints Used by UI
- `POST /api/engine/action` - Player actions (FOLD, CALL, RAISE, CHECK, ALL_IN)
- `GET /api/engine/hydrate/:roomId/:userId` - Initial state load
- `GET /api/engine/room/:roomId` - Room info
- `GET /api/engine/seats/:roomId` - Seat data
- `GET /api/engine/game/:roomId` - Game state
- `GET /api/engine/my-cards/:roomId/:userId` - Private hole cards
- `POST /api/engine/claim-seat` - Seat claiming
- `POST /api/engine/showdown-action` - Show/muck at showdown
- `POST /api/engine/deal-cards` - Start hand (host only)
- Various `/api/engine/host-controls/*` endpoints

---

## 🚫 INACTIVE ENGINE (System A - "Sophisticated")

### Location
`dist/core/`, `dist/application/` (Compiled TypeScript)

### Status
- **Compiled:** Yes (TypeScript → JavaScript)
- **Wired to Server:** Yes (imported in `sophisticated-engine-server.js` lines 18-35)
- **Used by UI:** ❌ NO (minimal-table.html never calls `/api/games/*`)
- **Routes:** `/api/games/*` (exists but unused)

### Why It Exists
- Original architecture attempt
- Event sourcing / CQRS pattern
- More complex than needed for current requirements
- Kept as reference but not active

---

## 🎨 FRONTEND

### Active UI
- **File:** `public/minimal-table.html` (6,736 lines)
- **WebSocket:** Socket.IO client
- **Endpoints:** Only `/api/engine/*` (confirmed via grep)

### Key Frontend Functions
- `performAction(action, amount)` - Sends actions to backend
- `updateActionButtons(gameState)` - Updates button states
- `updateSeatChips(players)` - Updates chip displays
- `renderCommunityCards(cards)` - Renders board cards
- Socket listeners: `action_processed`, `hand_started`, `hand_complete`, `street_reveal`

---

## 🐛 CRITICAL BUGS FIXED

### Bug #1: Frontend/Backend Bet Mismatch ✅ FIXED
**Problem:**
- Frontend used `myPlayer.bet` (cumulative) for call amount calculation
- Backend used `myPlayer.betThisStreet` (street-scoped) for validation
- After street change, `betThisStreet` resets to 0 but `bet` persists
- Frontend calculated negative call amounts: `0 - 100 = -100`

**Fix Applied:**
- Changed `public/minimal-table.html` line 4627: `myPlayer.bet` → `myPlayer.betThisStreet`
- Changed `public/minimal-table.html` line 4680: `myPlayer.bet` → `myPlayer.betThisStreet` (raise modal)

**Files Changed:**
- `public/minimal-table.html` (2 locations)

---

## 📊 BET TRACKING SEMANTICS

### Two Bet Variables (By Design)
1. **`player.bet`** (cumulative)
   - Purpose: Side pot calculation
   - Persists: Across all streets
   - Example: P1 bets 100 PREFLOP, 50 FLOP → `bet = 150`

2. **`player.betThisStreet`** (street-scoped)
   - Purpose: Matching current bet, action validation
   - Resets: To 0 on each new street (`progressToNextStreet()`)
   - Example: P1 bets 100 PREFLOP → `betThisStreet = 100`, then FLOP → `betThisStreet = 0`

### When to Use Which
- **Frontend UI calculations:** `betThisStreet` ✅
- **Backend validation:** `betThisStreet` ✅
- **Side pot calculation:** `bet` ✅
- **Chip conservation:** `bet` (cumulative) ✅

---

## 🔍 DEBUG LOGGING

### Frontend Debug
- `debug()` function logs button state updates
- Now includes both `myBet` (betThisStreet) and `myBetCumulative` (bet)

### Backend Debug
- Added comprehensive logging in `routes/game-engine-bridge.js` after action processing
- Logs: street, currentBet, currentActorSeat, reopensAction, all player states

---

## 🗑️ CLEANUP CANDIDATES (Future)

### Safe to Delete (After Verification)
- `tests/` (TypeScript tests for inactive engine)
- `src/core/` (TypeScript source - unused)
- `src/application/` (TypeScript source - unused)
- `src/api/` (TypeScript source - unused)
- `dist/` (Compiled TypeScript - if committing to JS-only)

### DO NOT DELETE (Dependencies Exist)
- `routes/games.js` (imported by server, even if unused)
- `dist/database/connection.js` (used by server line 50)
- `dist/utils/logger.js` (used by server line 55)
- `sophisticated-engine-server.js` (main entry point)

---

## ✅ VERIFICATION CHECKLIST

- [x] Confirmed UI only calls `/api/engine/*` endpoints
- [x] Confirmed System B (Minimal) is active engine
- [x] Fixed frontend bet calculation bug
- [x] Added debug logging
- [ ] Test CHECK button after street change
- [ ] Verify turn rotation works correctly
- [ ] Test all-in scenarios
- [ ] Test side pot calculation

---

## 📝 NOTES

- The "minimal" engine is actually production-grade and well-modularized
- TypeScript engine exists but is completely disconnected from production flow
- Architecture is clean - just need to ensure frontend/backend alignment
- All fixes are surgical and low-risk

