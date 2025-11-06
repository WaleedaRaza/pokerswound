# ✅ PRE-TEST VERIFICATION - DATA TRACKING SYSTEM

**Date:** November 6, 2025  
**Status:** Ready for Testing  
**Goal:** Verify all components are wired before moving to Friends features

---

## 🔍 **COMPLETE SYSTEM AUDIT**

### **1. DATABASE SCHEMA** ✅

#### **hand_history Table:**
```sql
✅ game_id (character varying)
✅ room_id (uuid)
✅ hand_number (integer)
✅ pot_size (bigint)
✅ community_cards (ARRAY)
✅ winners (jsonb) - legacy
✅ player_actions (jsonb) - legacy
✅ final_stacks (jsonb) - legacy
✅ player_ids (UUID[]) - NEW (Migration 13)
✅ winner_id (UUID) - NEW (Migration 13)
✅ winning_hand (TEXT) - NEW (Migration 13)
✅ hand_rank (INTEGER) - NEW (Migration 13)
✅ board_cards (TEXT) - NEW (Migration 13)
✅ actions_log (JSONB) - NEW (Migration 13)
✅ created_at (timestamp)
```

#### **user_profiles Table:**
```sql
✅ best_hand (TEXT)
✅ best_hand_rank (INTEGER) - FIXED (Migration 14)
✅ best_hand_date (TIMESTAMP)
✅ biggest_pot (BIGINT)
✅ total_hands_played (INTEGER)
✅ total_wins (INTEGER)
✅ win_rate (NUMERIC)
✅ total_games_played (INTEGER) - TODO: wire tracking
```

#### **player_statistics Table:**
```sql
✅ user_id (UUID) - UNIQUE
✅ total_hands_played (INTEGER)
✅ total_hands_won (INTEGER)
✅ last_hand_played_at (TIMESTAMP)
```

---

### **2. DATABASE TRIGGERS** ✅

#### **✅ sync_user_profile_stats() (Migration 03)**
**Trigger:** `sync_profile_stats_trigger` on `player_statistics`  
**What it does:** Syncs `player_statistics` → `user_profiles`
- `total_hands_played`
- `total_wins` (from `total_hands_won`)
- `win_rate` (calculated)

**Status:** ✅ Working (verified in previous tests)

---

#### **✅ track_game_start() (Migration 06)**
**Trigger:** `on_game_states_insert` on `game_states`  
**What it does:** Creates `room_participations` record when game starts

**Status:** ✅ Fixed (Migration 11)

---

#### **✅ track_game_complete() (Migration 06)**
**Trigger:** `on_game_states_complete` on `game_states`  
**What it does:** Creates `game_completions` record when game ends

**Status:** ✅ Fixed (Migration 11 - changed `NEW.game_id` to `NEW.id`)

---

#### **🔥 update_best_hand_trigger() (Migration 12)**
**Trigger:** `update_best_hand_trigger` on `hand_history`  
**What it does:** Updates `user_profiles.best_hand` when better hand is won
- Compares `hand_rank` (lower = better)
- Updates `best_hand`, `best_hand_rank`, `best_hand_date`

**Status:** 🔥 **PENDING** - Run Migration 14, then Migration 12

---

### **3. BACKEND - GAME ENGINE** ✅

**File:** `routes/game-engine-bridge.js` (lines 748-841)

**Endpoint:** `POST /api/engine/action`

**Data Extraction Flow:**
```javascript
1. Hand completes at showdown
   ↓
2. evaluateShowdown() → updatedState.winners[{userId, handDescription}]
   ↓
3. getHandRank(handDescription) → INTEGER (1-10)
   ↓
4. INSERT hand_history (
     game_id, room_id, hand_number, pot_size,
     player_ids,   // ✅ All player UUIDs
     winner_id,    // ✅ Winner UUID
     winning_hand, // ✅ "Flush (J-high)"
     hand_rank,    // ✅ 5
     board_cards,  // ✅ "Ah Tc 5h Jc Kc"
     actions_log   // ✅ Full action history
   )
   ↓
5. UPDATE player_statistics (hands_played, hands_won)
   ↓
6. UPDATE user_profiles.biggest_pot (direct)
   ↓
7. TRIGGER sync_user_profile_stats() fires
   ↓
8. TRIGGER update_best_hand_trigger() fires (after Migration 12)
```

**Console Logs:**
```
📊 [MINIMAL] Extracting hand data to hand_history + player_statistics
   ✅ hand_history insert: [uuid]
      Winner: [userId] | Hand: Pair (8s) | Rank: 9
   ✅ player_statistics updated: [userId] (won: false)
   ✅ player_statistics updated: [userId] (won: true)
   💰 Updated biggest_pot for [userId]: $20
📊 [MINIMAL] Data extraction complete - triggers will sync to user_profiles
```

**Status:** ✅ Fully wired, ready to test

---

### **4. BACKEND - PROFILE API** ✅

#### **GET /api/auth/profile/:userId**
**File:** `routes/auth.js` (lines 213-244)

**Returns:**
```json
{
  "id": "uuid",
  "username": "war",
  "display_name": "Player Name",
  "avatar_url": "...",
  "bio": "...",
  "total_hands_played": 5,        // ✅
  "total_wins": 2,                 // ✅
  "win_rate": 40.0,                // ✅
  "total_games_played": 1,         // ⚠️ Not yet tracked
  "total_winnings": 0,             // ⚠️ Not yet tracked
  "best_hand": "Flush (J-high)",   // ✅ (after Migration 12)
  "best_hand_date": "2025-11-06",  // ✅ (after Migration 12)
  "biggest_pot": 350,              // ✅
  "created_at": "..."
}
```

**Status:** ✅ Fully wired

---

#### **GET /api/social/profile/me**
**File:** `routes/social.js` (lines 254-278)

**Returns:** Same as above, plus `friend_count`

**Status:** ✅ Fully wired

---

### **5. FRONTEND - PROFILE MODAL** ✅

**File:** `public/js/social-modals.js` (lines 174-274)

**Function:** `openProfileModal()`

**API Call:**
```javascript
const response = await fetch('/api/social/profile/me', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const profile = await response.json();
```

**Display:**
```html
<div class="stat-card">
  <div class="stat-value">${profile.total_hands_played ?? 0}</div>
  <div class="stat-label">Hands Played</div>
</div>

<div class="stat-card">
  <div class="stat-value">${profile.total_games_played ?? 0}</div>
  <div class="stat-label">Games Played</div>
</div>

<div class="stat-card">
  <div class="stat-value">${profile.total_wins ?? 0}</div>
  <div class="stat-label">Total Wins</div>
</div>

<div class="stat-card">
  <div class="stat-value">${(profile.win_rate ?? 0).toFixed(1)}%</div>
  <div class="stat-label">Win Rate</div>
</div>

<div class="stat-card">
  <div class="stat-value">$${formatChips(profile.biggest_pot ?? 0)}</div>
  <div class="stat-label">Biggest Pot</div>
</div>

<!-- Best Hand -->
<div class="best-hand-section">
  <h4>🏆 Best Hand</h4>
  <div class="best-hand-display">
    ${profile.best_hand ? `
      <div class="hand-rank">${profile.best_hand}</div>
      <div class="hand-date">${new Date(profile.best_hand_date).toLocaleDateString()}</div>
    ` : '<p class="text-muted">No hands recorded yet</p>'}
  </div>
</div>
```

**Status:** ✅ Fully wired

---

### **6. SERVER ROUTING** ✅

**File:** `sophisticated-engine-server.js`

**Mounted Routes:**
```javascript
✅ app.use('/api/engine', gameEngineBridgeRouter);  // Game actions
✅ app.use('/api/auth', authRouter);                // Profile endpoints
✅ app.use('/api/social', socialRouter);            // Social endpoints
✅ app.use('/api/rooms', roomsRouter);              // Room management
✅ app.use('/api/sandbox', sandboxRouter);          // Sandbox rooms
```

**Status:** ✅ All routes mounted correctly

---

## 🔥 **WHAT YOU NEED TO DO NOW:**

### **STEP 1: Run Migration 14** 🔥
```sql
-- Open Supabase SQL Editor
-- Paste: migrations/14_fix_best_hand_rank_type.sql
-- Execute
```

**Expected Output:**
```
✅ best_hand_rank is now INTEGER type
✅ Migration 14 complete
```

---

### **STEP 2: Run Migration 12** 🔥
```sql
-- AFTER Migration 14 completes
-- Paste: migrations/12_best_hand_tracking.sql
-- Execute
```

**Expected Output:**
```
✅ Trigger "update_best_hand_trigger" created successfully
✅ Migration 12 complete
```

---

### **STEP 3: Restart Server** 🔥
```bash
# In terminal:
Ctrl+C
npm start
```

---

### **STEP 4: Test Data Flow** 🧪

#### **4a. Create Room & Play Hand**
1. Navigate to `/play`
2. Click "Create Room" (Private Room tile)
3. Open in 2 browser windows/tabs
4. Join both players
5. Start game
6. Play 1 hand to **showdown** (don't fold, play all streets)

#### **4b. Check Server Console**
Look for these logs:
```
📊 [MINIMAL] Extracting hand data to hand_history + player_statistics
   ✅ hand_history insert: [uuid]
      Winner: [userId] | Hand: Pair (8s) | Rank: 9
   ✅ player_statistics updated: [userId] (won: false)
   ✅ player_statistics updated: [userId] (won: true)
   💰 Updated biggest_pot for [userId]: $20
📊 [MINIMAL] Data extraction complete - triggers will sync to user_profiles
```

**If you see this: ✅ Data extraction is working!**

#### **4c. Check Profile Modal**
1. Click your username in navbar
2. Click "View Profile"
3. **Verify stats:**
   - ✅ Hands Played: 1 (or incrementing)
   - ✅ Total Wins: 1 (if you won)
   - ✅ Win Rate: 100% (or updating)
   - ✅ Biggest Pot: $[pot amount]
   - ✅ Best Hand: "[hand description]" with date

**If all stats show: ✅ COMPLETE SUCCESS!**

---

## 🚨 **TROUBLESHOOTING:**

### **Issue: "hand_history insert failed"**
**Cause:** Migration 13 not run  
**Fix:** Run Migration 13, restart server

### **Issue: "operator does not exist: integer < character varying"**
**Cause:** Migration 14 not run  
**Fix:** Run Migration 14, then re-run Migration 12

### **Issue: "best_hand not updating"**
**Cause:** Migration 12 not run or trigger failed  
**Fix:** Check Supabase logs, verify trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'update_best_hand_trigger';
```

### **Issue: "Profile shows all zeros"**
**Cause:** Trigger not firing or game engine not extracting data  
**Fix:** Check server console for "Data extraction complete" log. If missing, check game actually reached showdown (not all folds).

---

## ✅ **SUCCESS CRITERIA:**

After testing, you should see:

1. ✅ **Server Console:**
   - "hand_history insert" with winner & hand rank
   - "player_statistics updated" for all players
   - "Updated biggest_pot"
   - "Data extraction complete"

2. ✅ **Profile Modal:**
   - Hands Played incrementing
   - Win Rate calculating correctly
   - Biggest Pot showing actual pot amount
   - Best Hand showing with date

3. ✅ **Database (verify in Supabase):**
   ```sql
   SELECT * FROM hand_history ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM player_statistics;
   SELECT username, total_hands_played, total_wins, win_rate, best_hand, biggest_pot 
   FROM user_profiles;
   ```

---

## 🎯 **WHAT'S DEFERRED:**

### **games_played Tracking** ⚠️
**Why deferred:** Needs room session logic (when to increment?)  
**Options:**
1. Once per room (first hand in new room)
2. Once per session (join → leave = 1 game)
3. When room closes (all hands in closed room = 1 game)

**Recommendation:** Implement as separate feature after Friends system

**Implementation stub:**
```javascript
// In game-engine-bridge.js, before hand_history INSERT:
const { rows } = await db.query(`
  SELECT COUNT(*) FROM room_participations
  WHERE user_id = $1 AND room_id = $2
`, [playerId, roomId]);

if (rows[0].count === 0) {
  // First hand in this room for this player
  await db.query(`
    UPDATE player_statistics
    SET total_games_played = total_games_played + 1
    WHERE user_id = $1
  `, [playerId]);
}
```

---

## 🚀 **AFTER SUCCESSFUL TEST:**

**You're ready to move to Friends features!** 🎉

The entire data pipeline is complete:
- ✅ Hand completion extracts data
- ✅ Triggers sync to profile
- ✅ Profile API returns all stats
- ✅ Frontend displays live data

---

**EVERYTHING IS WIRED. RUN MIGRATIONS 14 & 12, TEST, THEN ADVANCE TO FRIENDS!** 🚀

