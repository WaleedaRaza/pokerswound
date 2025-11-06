# 🏗️ DATA ARCHITECTURE AUDIT - COMPLETE ANALYSIS

**Date:** November 6, 2025  
**Status:** Architectural Review  
**Goal:** Verify data extraction loop is complete & plan for analytics

---

## 📊 **CURRENT STATUS: What's Working vs. Not**

### ✅ **WORKING:**
- **Hands Played:** 6 ✅
- **Total Wins:** 2 ✅
- **Win Rate:** 33.3% ✅
- **Best Hand:** Pair (Js) ✅

### ❌ **NOT WORKING:**
- **Games Played:** 0 ❌
- **Biggest Pot:** $0 ❌

---

## 🔍 **ROOT CAUSE ANALYSIS:**

### **1. BIGGEST POT - Why It's Showing $0**

**Backend Code (lines 789, 804, 824-833):**
```javascript
const potSize = updatedState.pot || 0;  // Should be the final pot

// Direct UPDATE
await db.query(`
  UPDATE user_profiles
  SET biggest_pot = GREATEST(COALESCE(biggest_pot, 0), $1)
  WHERE id = $2
`, [potSize, winnerId]);
```

**Problem:** `updatedState.pot` might be 0 or undefined at showdown.

**Verification Needed:**
1. Check if `updatedState.pot` contains the correct final pot at showdown
2. Check if trigger `update_user_biggest_pot` from Migration 08 exists
3. Verify `hand_history.pot_size` is being inserted correctly

**Expected Pot Flow:**
```
Players bet → pot accumulates → showdown → updatedState.pot = total
  ↓
INSERT hand_history (pot_size = updatedState.pot)
  ↓
TRIGGER update_user_biggest_pot() fires
  ↓
UPDATE user_profiles.biggest_pot
```

---

### **2. GAMES PLAYED - Architectural Ambiguity**

**Your Insight:** "Games played" doesn't make sense in free-flowing rooms.

**Problem:** What counts as "1 game"?
- ❌ **Per hand?** Too granular (that's hands_played)
- ❌ **Per room?** But rooms are persistent, people can play 100 hands in one room
- ❌ **Per session?** Hard to define (what if they refresh? leave/rejoin?)

**Better Approach:** **`rooms_participated_in`** or **`unique_rooms_played`**

**Implementation:**
```javascript
// Track: First hand in a NEW room = +1 to rooms_played
const { rows } = await db.query(`
  SELECT COUNT(*) FROM room_participations
  WHERE user_id = $1 AND room_id = $2
`, [playerId, roomId]);

if (rows[0].count === 0) {
  // First time in this room
  await db.query(`
    UPDATE user_profiles
    SET total_rooms_played = COALESCE(total_rooms_played, 0) + 1
    WHERE id = $1
  `, [playerId]);
}
```

**Alternative:** Use `room_participations` table (already exists from Migration 06):
```sql
SELECT COUNT(DISTINCT room_id) as rooms_played
FROM room_participations
WHERE user_id = $1
```

Then display as **"Rooms Played"** instead of "Games Played".

---

## 🌊 **DATA FLOW ARCHITECTURE - CURRENT STATE**

### **Phase 1: Hand Completion → Data Extraction** ✅

```
Player Action (final CHECK/CALL at river)
  ↓
MinimalBettingAdapter.processAction()
  ↓
evaluateShowdown() → determines winners, hand descriptions
  ↓
updatedState = {
  pot: FINAL_POT,
  winners: [{userId, handDescription, handRank}],
  players: [{userId, chips, seatIndex}],
  communityCards: ["Ah", "Tc", "5h", "Jc", "Kc"],
  actionHistory: [all actions],
  status: 'COMPLETED'
}
  ↓
INSERT hand_history (
  game_id, room_id, hand_number,
  pot_size,           // ✅ updatedState.pot
  player_ids,         // ✅ All player UUIDs
  winner_id,          // ✅ Winner UUID
  winning_hand,       // ✅ "Flush (J-high)"
  hand_rank,          // ✅ 5
  board_cards,        // ✅ "Ah Tc 5h Jc Kc"
  actions_log         // ✅ Full action history
)
  ↓
UPDATE player_statistics (hands_played, hands_won)
  ↓
UPDATE user_profiles.biggest_pot (direct)
  ↓
TRIGGER sync_user_profile_stats() → updates profile
  ↓
TRIGGER update_best_hand_trigger() → updates best_hand
```

**Status:** ✅ **COMPLETE**

---

### **Phase 2: Profile Display → Real-Time Stats** ✅

```
User clicks "View Profile"
  ↓
GET /api/social/profile/me
  ↓
SELECT 
  total_hands_played,     // ✅ From player_statistics
  total_wins,             // ✅ From player_statistics
  win_rate,               // ✅ Calculated by trigger
  biggest_pot,            // ⚠️ Should be from hand_history
  best_hand,              // ✅ From hand_history trigger
  best_hand_date          // ✅ From hand_history trigger
FROM user_profiles
  ↓
Frontend displays stats
```

**Status:** ✅ **COMPLETE** (except biggest_pot needs debugging)

---

### **Phase 3: Analytics & Serialization** ⚠️ **PARTIAL**

**What We Have:**
```sql
hand_history (
  id,
  game_id,
  room_id,
  hand_number,
  pot_size,              // ✅ Final pot
  player_ids,            // ✅ All players
  winner_id,             // ✅ Winner
  winning_hand,          // ✅ "Flush (J-high)"
  hand_rank,             // ✅ 5
  board_cards,           // ✅ "Ah Tc 5h Jc Kc"
  actions_log,           // ✅ Full action history (JSONB)
  created_at
)
```

**What We're MISSING for Full Analytics:**
1. ❌ **Individual player hole cards** (for replay & analysis)
2. ❌ **Player positions** (BTN, SB, BB, UTG, etc.)
3. ❌ **Bet sizes per street** (preflop, flop, turn, river)
4. ❌ **Stack sizes at start of hand**
5. ❌ **Fold equity calculations**
6. ❌ **Time taken per action**

---

## 🎯 **ARCHITECTURAL GAPS & SOLUTIONS**

### **Gap 1: Hole Cards Not Stored** 🚨

**Problem:** Can't replay hands or do hand range analysis without hole cards.

**Solution:** Add column to `hand_history`:
```sql
ALTER TABLE hand_history
  ADD COLUMN player_hole_cards JSONB DEFAULT '[]'::jsonb;

-- Format:
-- [{userId: "uuid", holeCards: ["Ah", "Kd"]}, ...]
```

**Backend Implementation:**
```javascript
// In game-engine-bridge.js, during data extraction:
const playerHoleCards = updatedState.players.map(p => ({
  userId: p.userId,
  holeCards: p.holeCards || []
}));

// INSERT into hand_history
player_hole_cards: JSON.stringify(playerHoleCards)
```

**Privacy Consideration:**
- Store encrypted or hashed hole cards for losers who mucked
- Only decrypt for analysis if user opts-in
- Never show opponent's mucked cards in UI

---

### **Gap 2: Player Positions Not Tracked** 🚨

**Problem:** Can't analyze VPIP, PFR, or positional play without knowing positions.

**Solution:** Add to `hand_history`:
```sql
ALTER TABLE hand_history
  ADD COLUMN dealer_position INTEGER,
  ADD COLUMN sb_position INTEGER,
  ADD COLUMN bb_position INTEGER;
```

**Backend Implementation:**
```javascript
dealer_position: updatedState.dealerPosition,
sb_position: updatedState.sbPosition,
bb_position: updatedState.bbPosition
```

---

### **Gap 3: Street-by-Street Betting Missing** 🚨

**Problem:** Can't analyze aggression factor, c-bet %, fold-to-cbet without street-level data.

**Solution:** Parse `actions_log` to extract per-street actions:
```javascript
// Helper function
function parseActionsByStreet(actions) {
  return {
    preflop: actions.filter(a => a.street === 'PREFLOP'),
    flop: actions.filter(a => a.street === 'FLOP'),
    turn: actions.filter(a => a.street === 'TURN'),
    river: actions.filter(a => a.street === 'RIVER')
  };
}
```

**Already have this!** ✅ `actions_log` includes full history.

---

### **Gap 4: Stack Sizes at Hand Start Missing** 🚨

**Problem:** Can't calculate pot odds, SPR (stack-to-pot ratio) without starting stacks.

**Solution:** Add to `hand_history`:
```sql
ALTER TABLE hand_history
  ADD COLUMN starting_stacks JSONB DEFAULT '[]'::jsonb;

-- Format:
-- [{userId: "uuid", startingStack: 1000}, ...]
```

**Backend Implementation:**
```javascript
const startingStacks = updatedState.players.map(p => ({
  userId: p.userId,
  startingStack: p.startingStack || p.chips + totalBetsInHand
}));
```

---

## 🏆 **RECOMMENDED ARCHITECTURE: "Data River" Model**

**Your Metaphor:** "A river we must continually widen."

### **Current River (Narrow):**
```
Hand Completes → Basic Stats (hands, wins, pot)
```

### **Wide River (Full Analytics):**
```
Hand Completes → EVERYTHING
  ↓
hand_history (complete serialization):
  - pot_size              ✅
  - player_ids            ✅
  - winner_id             ✅
  - winning_hand          ✅
  - hand_rank             ✅
  - board_cards           ✅
  - actions_log           ✅
  - player_hole_cards     ❌ NEW
  - starting_stacks       ❌ NEW
  - dealer_position       ❌ NEW
  - sb_position           ❌ NEW
  - bb_position           ❌ NEW
  - hand_duration_seconds ❌ NEW
  - showdown_reached      ❌ NEW
  ↓
Future Analytics:
  - Hand replayer
  - Range analysis
  - GTO comparison
  - Leak detection
  - Opponent modeling
```

---

## 🔧 **IMMEDIATE FIXES NEEDED:**

### **Fix 1: Debug Biggest Pot** 🔥

**Test in console:**
```javascript
// Add this log in game-engine-bridge.js line 800:
console.log(`🔍 POT DEBUG: updatedState.pot = ${updatedState.pot}, potSize = ${potSize}`);
```

**Check:**
1. Is `updatedState.pot` > 0?
2. Is `winnerId` valid UUID?
3. Is UPDATE query executing?

**Likely Cause:** `updatedState.pot` is 0 at showdown (bug in betting logic).

---

### **Fix 2: Implement Rooms Played** 🔥

**Option A: Real-time tracking (recommended):**
```javascript
// In game-engine-bridge.js, before hand_history INSERT:
for (const player of updatedState.players) {
  const { rows } = await db.query(`
    SELECT COUNT(*) FROM room_participations
    WHERE user_id = $1 AND room_id = $2
  `, [player.userId, roomId]);
  
  if (rows[0].count === 0) {
    // First hand in this room
    await db.query(`
      UPDATE user_profiles
      SET total_rooms_played = COALESCE(total_rooms_played, 0) + 1
      WHERE id = $1
    `, [player.userId]);
  }
}
```

**Option B: Computed on-demand:**
```sql
-- In profile API:
SELECT 
  up.*,
  (SELECT COUNT(DISTINCT room_id) FROM room_participations WHERE user_id = up.id) as rooms_played
FROM user_profiles up
WHERE up.id = $1
```

**Option B is cleaner** - no need to track incrementally, just compute from participations.

---

### **Fix 3: Add Schema Column** 🔥

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS total_rooms_played INTEGER DEFAULT 0;
```

Or rename existing:
```sql
ALTER TABLE user_profiles
  RENAME COLUMN total_games_played TO total_rooms_played;
```

---

## 📋 **PHASED IMPLEMENTATION PLAN:**

### **Phase 1: Fix Current Issues** 🔥 (DO NOW)
- [ ] Debug biggest_pot (add console logs)
- [ ] Implement rooms_played (computed from room_participations)
- [ ] Update profile API to return computed rooms_played
- [ ] Update frontend to display "Rooms Played" instead of "Games Played"

### **Phase 2: Widen the Data River** (NEXT SPRINT)
- [ ] Add `player_hole_cards` to hand_history
- [ ] Add `starting_stacks` to hand_history
- [ ] Add `dealer_position`, `sb_position`, `bb_position` to hand_history
- [ ] Add `hand_duration_seconds` to hand_history
- [ ] Add `showdown_reached` to hand_history

### **Phase 3: Analytics Dashboard** (FUTURE)
- [ ] Hand replayer UI
- [ ] Position-based stats (VPIP by position)
- [ ] Aggression factor (bets + raises / calls)
- [ ] C-bet percentage
- [ ] Fold-to-c-bet percentage
- [ ] Hand range heatmaps
- [ ] LLM insights integration

---

## 🎯 **SUCCESS CRITERIA:**

**After Phase 1:**
- ✅ Profile shows biggest pot correctly
- ✅ Profile shows rooms played (not games)
- ✅ All stats update in real-time
- ✅ Data pipeline is complete for basic stats

**After Phase 2:**
- ✅ Can replay any hand from hand_history
- ✅ Can analyze player ranges
- ✅ Can calculate GTO deviation
- ✅ Can export hand history for external tools

**After Phase 3:**
- ✅ Full analytics dashboard live
- ✅ LLM-powered insights working
- ✅ Leak detection working
- ✅ Opponent modeling working

---

## 🚀 **NEXT STEPS:**

1. **Debug biggest_pot** - Add logs, verify `updatedState.pot` is correct
2. **Implement rooms_played** - Use computed query from room_participations
3. **Test full data flow** - Play hand, verify all stats update
4. **Move to Friends features** - Core data extraction is complete

---

**The data river is flowing. Now we widen it.** 🌊

