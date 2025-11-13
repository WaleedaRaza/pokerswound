# 📚 CODEBASE INDEX - Final Sprint Reference

**Last Updated:** Current Session  
**Purpose:** Comprehensive index of codebase structure, current state, and sprint goals

---

## 🎯 FINAL SPRINT GOALS

1. **Clean up game logic bugs/corner cases** ⚠️ CRITICAL
2. **Clean up JSON data bloat** 📦
3. **Enhance extraction** 🔄
4. **Get analytics to display on page** 📊
5. **Create basic badges** 🏅
6. **Add "coming soon" to all other pages** 🚧
7. **Launch app** 🚀

---

## 📁 PROJECT STRUCTURE

### **Backend (Node.js/Express)**

#### **Main Server**
- `sophisticated-engine-server.js` (1,081 lines) - Main Express server
  - Socket.IO setup
  - Route mounting
  - Database initialization
  - Session management

#### **Routes** (`/routes/`)
- `game-engine-bridge.js` (2,396 lines) - **CRITICAL** - Game action processing
  - `/action` endpoint - Processes player actions
  - Hand completion logic
  - Hand history extraction (`extractHandHistory()`)
  - Chip persistence
- `rooms.js` (1,072 lines) - Room management (22 endpoints)
- `games.js` (630 lines) - Game state queries (7 endpoints)
- `auth.js` (~100 lines) - Authentication (3 endpoints)
- `social.js` - Friends, analytics, notifications
- `v2.js` (117 lines) - V2 API endpoints (3 endpoints)
- `pages.js` (74 lines) - Page routes (13 routes)

#### **Core Engine** (`/src/`)
- `adapters/minimal-engine-bridge.js` (1,152 lines) - **CRITICAL** - Betting logic
  - `applyAction()` - Processes FOLD/CALL/RAISE/ALL_IN
  - `canPlayerAct()` - Action eligibility
  - `calculateSidePots()` - Side pot calculation
  - `handleShowdown()` - Showdown logic
  - `handleAllInRunout()` - All-in runout handling
- `core/engine/` - TypeScript poker engine
  - `betting-engine.ts` - Betting logic
  - `pot-manager.ts` - Pot management
  - `game-state-machine.ts` - State transitions
  - `hand-evaluator.ts` - Hand evaluation
- `services/` - Business logic services
- `database/` - Database repositories

#### **WebSocket** (`/websocket/`)
- `socket-handlers.js` (55 lines) - Socket.IO event handlers

---

### **Frontend (Vanilla JS)**

#### **Pages** (`/public/pages/`)
- `minimal-table.html` (6,618 lines) - **CRITICAL** - Main poker table UI
- `analysis.html` - Analytics dashboard
- `play.html` - Game lobby
- `friends.html` - Friends management
- `index.html` - Homepage
- `learning.html` - Coming soon
- `ai-solver.html` - Coming soon
- `poker-today.html` - Coming soon

#### **JavaScript** (`/public/js/`)
- `analytics-live.js` - Live analytics data service
- `analytics-components.js` - Analytics UI components
- `auth-manager.js` - Authentication
- `error-handler.js` - Error handling
- `loading-states.js` - Loading UI
- `empty-states.js` - Empty state messages
- `friends-page.js` - Friends functionality
- `social-modals.js` - Profile/username modals

#### **CSS** (`/public/css/`)
- `pokergeek.css` - Global styles
- `loading-states.css` - Loading animations
- `empty-states.css` - Empty state styles
- `social-modals.css` - Modal styles

---

### **Database** (`/database/`)

#### **Migrations** (`/migrations/`)
- `02_identity_social_system_FIXED.sql` - User profiles, friends, notifications
- `03_sync_profile_stats.sql` - Auto-sync stats trigger
- `04_room_limits_privacy.sql` - Room privacy & limits
- `022_fix_hand_history_position_columns.sql` - Position tracking fix

#### **Key Tables**
- `user_profiles` - User info, stats, settings
- `rooms` - Poker rooms (name, blinds, host, invite_code, is_private)
- `game_states` - Active game state (JSONB)
- `hand_history` - Completed hands (with `encoded_hand` PHE format)
- `player_statistics` - Detailed game stats (VPIP, PFR, etc.)
- `room_seats` - Player seats (chips_in_play, seat_index)
- `friendships` - Friend relationships
- `notifications` - User notifications

---

## 🐛 CURRENT KNOWN ISSUES

### **CRITICAL - Game Logic Bugs**

#### **1. All-In Not Working** ❌
**Status:** User reports all-ins don't work at all  
**Location:** `src/adapters/minimal-engine-bridge.js`  
**Test Plan:** `TEST_PLAN.md` lines 14-73  
**Fixes Attempted:** See `ALL_IN_SIDE_POT_FIXES.md`  
**Needs:** Comprehensive testing with 3+ browsers

#### **2. Hand Completion Stuck** ⚠️
**Problem:** Hands stuck in `IN_PROGRESS` after river checks  
**Location:** `routes/game-engine-bridge.js`  
**Impact:** Extraction never runs → missing stats  
**Fix Needed:** Ensure hand completes properly

#### **3. Side Pot Calculation** ⚠️
**Status:** Logic exists but may have bugs  
**Location:** `src/adapters/minimal-engine-bridge.js:792-826`  
**Test Cases:** `TEST_PLAN.md` lines 14-56

#### **4. Uncalled Bet Return** ⚠️
**Status:** Logic exists but may be incomplete  
**Location:** `src/adapters/minimal-engine-bridge.js:632-672`  
**Test Case:** `TEST_PLAN.md` lines 59-73

---

### **Data Extraction Issues**

#### **1. Extraction Timing** ⚠️
**Problem:** Extraction happens AFTER cleanup, may read mutated data  
**Location:** `routes/game-engine-bridge.js:1165-1341`  
**Fix Needed:** Capture snapshot BEFORE cleanup

#### **2. Missing Hands** ⚠️
**Problem:** Some hands not tracked (user reports discrepancy)  
**Impact:** Stats don't match reality  
**Fix Needed:** 
- Ensure extraction runs even if hand incomplete
- Add reconciliation job

#### **3. JSON Data Bloat** 📦
**Problem:** Large JSONB columns storing full game state  
**Location:** `game_states.current_state` (JSONB)  
**Fix Needed:** 
- Use `encoded_hand` (PHE format) instead of full JSON
- Delete snapshots after encoding
- Store only essential data

#### **4. Missing Computed Flags** ⚠️
**Problem:** `is_biggest_pot`, `is_best_hand` not computed at extraction  
**Fix Needed:** Calculate flags during extraction, update `user_profiles` directly

---

### **Analytics Issues**

#### **1. Analytics Not Displaying** ❌
**Status:** Analytics page exists but data may not show  
**Location:** `public/pages/analysis.html`  
**API:** `routes/social.js:1012-1101` (`/api/social/analytics/stats/:userId`)  
**Fix Needed:** Verify data flow, check API responses

#### **2. Data Discrepancies** ⚠️
**Problem:** User reports better hands/pots than stats show  
**Impact:** Analytics unreliable  
**Fix Needed:** 
- Verify extraction runs for all hands
- Check data integrity
- Reconcile discrepancies

---

## 🧪 TESTING REQUIREMENTS

### **Test Plan Document**
- `TEST_PLAN.md` - Comprehensive corner case test plan
- **10 test scenarios** covering:
  - All-in & side pots (3 tests)
  - Showdown & pot distribution (4 tests)
  - Round & turn order (3 tests)
  - Game lifecycle (2 tests)

### **Testing Challenges**
- **Requires 3 browsers** for multi-player testing
- **Time-consuming** - manual testing needed
- **No automated tests** for game logic

### **Critical Test Scenarios** (from `TEST_PLAN.md`)

1. **Multiple Side Pots** (Test 1.1)
   - 3 players, different stacks (100, 200, 500)
   - All go all-in
   - Verify pot distribution

2. **Partial Call All-In** (Test 1.2)
   - Player calls all-in for less than current bet
   - Verify side pot creation

3. **Uncalled Bet Return** (Test 1.3)
   - Player raises, others fold
   - Verify uncalled bet returned

4. **Exact Tie (Split Pot)** (Test 2.1)
   - Both players tie
   - Verify pot split evenly

5. **Odd Chip Rule** (Test 2.2)
   - Odd pot amount
   - Verify extra chip goes to correct player

6. **All-In Skip** (Test 3.2)
   - All-in player not prompted for action
   - Action moves to next player

7. **Min Raise Validation** (Test 3.3)
   - Verify min raise calculation
   - Reject invalid raises

---

## 📊 DATA FLOW ARCHITECTURE

### **Hand Completion Flow**

```
Player Action
  ↓
routes/game-engine-bridge.js: /action endpoint
  ↓
src/adapters/minimal-engine-bridge.js: applyAction()
  ↓
Check if betting round complete
  ↓
If complete → progressToNextStreet()
  ↓
If all-in runout → handleAllInRunout()
  ↓
If showdown → handleShowdown()
  ↓
Status = 'COMPLETED'
  ↓
persistHandCompletion() - Update chips in DB
  ↓
extractHandHistory() - Extract to hand_history table
  ↓
Update player_statistics
  ↓
Trigger updates user_profiles (via trigger)
```

### **Extraction Flow** (Current)

```
Hand Completes (status === 'COMPLETED')
  ↓
extractHandHistory() called
  ↓
Reads updatedState (may be mutated by cleanup)
  ↓
Encodes hand to PHE format
  ↓
Inserts into hand_history
  ↓
Updates player_statistics
  ↓
Trigger syncs to user_profiles
```

### **Extraction Flow** (Ideal - Not Implemented)

```
Hand Completes
  ↓
CAPTURE SNAPSHOT (before cleanup)
  ↓
Cleanup runs (safe to reset)
  ↓
Extract from snapshot (guaranteed clean data)
  ↓
Compute flags (is_biggest_pot, is_best_hand)
  ↓
Store encoded_hand + flags
  ↓
Update user_profiles directly
```

---

## 🔍 KEY FILES & THEIR PURPOSES

### **Game Logic**
- `src/adapters/minimal-engine-bridge.js` - **CRITICAL** - All betting logic
- `routes/game-engine-bridge.js` - **CRITICAL** - Action endpoint & extraction
- `src/core/engine/pot-manager.ts` - Pot management (TypeScript)
- `src/core/engine/betting-engine.ts` - Betting engine (TypeScript)

### **Data Extraction**
- `routes/game-engine-bridge.js:1165-1341` - `extractHandHistory()` function
- `routes/game-engine-bridge.js:1497-1524` - Hand completion flow

### **Analytics**
- `public/pages/analysis.html` - Analytics page UI
- `public/js/analytics-live.js` - Live analytics service
- `routes/social.js:1012-1101` - Analytics API endpoint

### **Testing**
- `TEST_PLAN.md` - Comprehensive test plan
- `ALL_IN_SIDE_POT_FIXES.md` - All-in fixes documentation

### **Documentation**
- `README.md` - Project overview
- `context.txt` - Historical context (4,487 lines)
- `ANALYSIS_PAGE_REDESIGN_PLAN.md` - Analytics page design

---

## 🚧 SPRINT TASKS BREAKDOWN

### **Phase 1: Fix Game Logic** (CRITICAL)

#### **Task 1.1: Fix All-In Logic**
- **File:** `src/adapters/minimal-engine-bridge.js`
- **Tests:** `TEST_PLAN.md` Tests 1.1, 1.2, 1.3
- **Status:** Logic exists, needs testing
- **Action:** Test with 3 browsers, fix bugs

#### **Task 1.2: Fix Hand Completion**
- **File:** `routes/game-engine-bridge.js`
- **Problem:** Hands stuck in IN_PROGRESS
- **Action:** Ensure hand completes properly, extraction runs

#### **Task 1.3: Test All Corner Cases**
- **File:** `TEST_PLAN.md`
- **Action:** Run all 10 test scenarios, mark pass/fail

---

### **Phase 2: Fix Data Extraction**

#### **Task 2.1: Capture Snapshot Before Cleanup**
- **File:** `routes/game-engine-bridge.js:1165-1341`
- **Action:** Move snapshot capture BEFORE cleanup
- **Impact:** Ensures clean data extraction

#### **Task 2.2: Extract Even If Incomplete**
- **File:** `routes/game-engine-bridge.js`
- **Action:** Extract partial hands, mark as INCOMPLETE
- **Impact:** No missing hands

#### **Task 2.3: Compute Flags During Extraction**
- **File:** `routes/game-engine-bridge.js:extractHandHistory()`
- **Action:** Calculate `is_biggest_pot`, `is_best_hand`
- **Impact:** Accurate analytics

#### **Task 2.4: Clean Up JSON Bloat**
- **Files:** `game_states.current_state`, `hand_history.actions_log`
- **Action:** 
  - Use `encoded_hand` instead of full JSON
  - Delete snapshots after encoding
  - Store only essential data

---

### **Phase 3: Analytics Display**

#### **Task 3.1: Fix Analytics API**
- **File:** `routes/social.js:1012-1101`
- **Action:** Verify API returns correct data
- **Test:** Check `/api/social/analytics/stats/:userId`

#### **Task 3.2: Fix Analytics Page**
- **File:** `public/pages/analysis.html`
- **Action:** Ensure data displays correctly
- **Test:** Load page, verify stats show

#### **Task 3.3: Verify Data Integrity**
- **Action:** Compare `user_profiles` vs `hand_history` counts
- **Fix:** Reconcile discrepancies

---

### **Phase 4: Badges & Coming Soon**

#### **Task 4.1: Create Basic Badges**
- **Action:** Design badge system
- **Storage:** Add `badges` table or column
- **Display:** Show on profile/analytics page

#### **Task 4.2: Add "Coming Soon" to Pages**
- **Files:** 
  - `public/pages/learning.html`
  - `public/pages/ai-solver.html`
  - `public/pages/poker-today.html`
- **Action:** Add "Coming Soon" message

---

### **Phase 5: Launch Prep**

#### **Task 5.1: Final Testing**
- **Action:** Run all test scenarios
- **Verify:** All critical bugs fixed

#### **Task 5.2: Performance Check**
- **Action:** Check data extraction performance
- **Verify:** No slow queries

#### **Task 5.3: Launch Checklist**
- **Action:** Create launch checklist
- **Verify:** All features working

---

## 📝 NOTES

### **Testing Limitations**
- **Requires 3 browsers** for multi-player testing
- **Time-consuming** - manual testing only
- **No automated tests** for game logic

### **Data Integrity**
- User reports **discrepancies** between stats and reality
- Some hands may not be tracked
- Need to verify extraction runs for all hands

### **Architecture Decisions**
- Using **PHE encoding** for hand history (saves space)
- **Trigger-based** stats sync (auto-updates `user_profiles`)
- **Snapshot before cleanup** pattern (not yet implemented)

---

## 🔗 RELATED DOCUMENTS

- `TEST_PLAN.md` - Comprehensive test plan (10 scenarios)
- `ALL_IN_SIDE_POT_FIXES.md` - All-in fixes documentation
- `ANALYSIS_PAGE_REDESIGN_PLAN.md` - Analytics page design
- `README.md` - Project overview
- `context.txt` - Historical context (4,487 lines)

---

**Next Steps:** Start with Phase 1 (Fix Game Logic) - Test all-in scenarios with 3 browsers, fix bugs as found.

