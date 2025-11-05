# HAND COMPLETION ARCHITECTURE
**Date:** Nov 5, 2025  
**Purpose:** Wire hand completion to profile tracking (hand_history → player_statistics → user_profiles)

---

## 🎯 **CURRENT STATE**

### **What Works:**
- ✅ Minimal Engine processes actions (`/api/engine/action`)
- ✅ `isBettingRoundComplete()` checks if round is done (line 197-228 in `minimal-engine-bridge.js`)
- ✅ `progressToNextStreet()` advances PREFLOP → FLOP → TURN → RIVER → SHOWDOWN
- ✅ `handleShowdown()` evaluates hands and awards chips (line 364-469)
- ✅ Hand status set to `COMPLETED` (line 466, 386, 354)
- ✅ Chips persisted to `room_seats` (line 720-737 in `game-engine-bridge.js`)

### **What's Missing:**
- ❌ No `hand_history` insert on completion
- ❌ No `player_statistics` updates
- ❌ No trigger to sync stats to `user_profiles`
- ❌ Check bug (needs diagnosis via console logs)

---

## 🔧 **ARCHITECTURAL FIX**

### **Phase 1: Wire Data Extraction (Priority)**

**Target File:** `routes/game-engine-bridge.js`  
**Target Section:** Line 712-753 (after `updatedState.status === 'COMPLETED'`)

**Add AFTER chip persistence (line 737):**

```javascript
// ===== STEP 3C: EXTRACT HAND DATA TO HISTORY =====
console.log('📊 [MINIMAL] Extracting hand data to hand_history + player_statistics');

// 1. INSERT HAND_HISTORY
const handHistoryInsert = await db.query(
  `INSERT INTO hand_history (
    game_id, room_id, hand_number, pot_size, 
    community_cards, winners, player_actions, final_stacks, created_at
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
  RETURNING id`,
  [
    gameStateResult.rows[0].id,  // game_id from game_states
    roomId,
    updatedState.handNumber || 1,
    updatedState.pot || 0,
    JSON.stringify(updatedState.communityCards || []),
    JSON.stringify(updatedState.winners || []),
    JSON.stringify(updatedState.actionHistory || []),
    JSON.stringify(updatedState.players.map(p => ({
      userId: p.userId,
      seatIndex: p.seatIndex,
      finalChips: p.chips
    })))
  ]
);

console.log(`   ✅ hand_history insert: ${handHistoryInsert.rows[0].id}`);

// 2. UPDATE PLAYER_STATISTICS
const winnerIds = new Set((updatedState.winners || []).map(w => w.userId));

for (const player of updatedState.players) {
  const isWinner = winnerIds.has(player.userId);
  
  await db.query(
    `INSERT INTO player_statistics (user_id, total_hands_played, total_hands_won, last_hand_played_at, created_at)
     VALUES ($1, 1, $2, NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       total_hands_played = player_statistics.total_hands_played + 1,
       total_hands_won = player_statistics.total_hands_won + $2,
       last_hand_played_at = NOW(),
       updated_at = NOW()`,
    [player.userId, isWinner ? 1 : 0]
  );
  
  console.log(`   ✅ player_statistics updated: ${player.userId.substr(0, 8)} (won: ${isWinner})`);
}

console.log('📊 [MINIMAL] Data extraction complete - trigger will sync to user_profiles');
```

**Trigger (Already exists from Migration 03):**
- `sync_user_profile_stats()` automatically updates `user_profiles` when `player_statistics` changes

---

### **Phase 2: Diagnose Check Bug**

**Hypothesis:** `isBettingRoundComplete()` returning false when it should return true

**Diagnostic:**
1. User plays a hand and checks
2. Check server console for log: `🔍 Betting round check:`
3. Verify:
   - `allMatched: true`
   - `allActed: true`
   - `playersWhoActed.size === activePlayers.length`

**Possible Root Causes:**
1. **Blind posts not in actionHistory** → BB doesn't count as "acted" in PREFLOP
2. **Reset logic bug** → Bets not properly reset after street change
3. **Status mismatch** → Player marked as 'ALL_IN' incorrectly
4. **Frontend issue** → CHECK not sent or UI not updated

**Fix Location:** `src/adapters/minimal-engine-bridge.js` line 197-228

---

## 📊 **DATA FLOW (After Fix)**

```
Player checks (final action)
  ↓
isBettingRoundComplete() → true
  ↓
progressToNextStreet() → SHOWDOWN
  ↓
handleShowdown() → Evaluate hands
  ↓
updatedState.status = 'COMPLETED'
  ↓
game-engine-bridge.js line 713
  ↓
INSERT hand_history ✅
  ↓
UPDATE player_statistics (each player) ✅
  ↓
TRIGGER sync_user_profile_stats() ✅
  ↓
UPDATE user_profiles (total_hands_played, total_wins, win_rate) ✅
  ↓
Profile modal shows live stats ✅
```

---

## ✅ **SUCCESS CRITERIA**

1. Hand completes → `hand_history` row inserted
2. Each player → `player_statistics` updated (hands_played +1, wins +1 if won)
3. Trigger fires → `user_profiles` synced
4. Profile modal → Shows updated stats immediately
5. Check bug diagnosed and fixed

---

## 🧪 **TESTING PLAN**

1. Create sandbox room
2. Play 1 hand to completion
3. Check database:
   - `SELECT * FROM hand_history ORDER BY created_at DESC LIMIT 1;`
   - `SELECT * FROM player_statistics WHERE user_id IN (...);`
   - `SELECT total_hands_played, total_wins FROM user_profiles WHERE id IN (...);`
4. Open profile modal → Verify stats updated
5. Play another hand → Verify increments

---

**Next Step:** Implement Phase 1 in `routes/game-engine-bridge.js`

