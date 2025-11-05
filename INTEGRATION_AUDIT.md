# 🔌 CROSS-FUNCTIONAL INTEGRATION AUDIT

**Date:** November 5, 2025  
**Purpose:** Verify database architecture is wired into application layer  
**Status:** Pre-testing validation

---

## 🎯 ARCHITECTURE FLOW

```
User Action → Backend Route → Database → Trigger → Profile Update → Frontend Display
```

Each step must be validated before testing.

---

## ✅ WHAT'S ALREADY WIRED (No Action Needed)

### 1. Room Seat Management
**Triggers:** `user_joins_room`, `user_leaves_room`  
**Fires On:** `INSERT/DELETE room_seats`  
**Current Code:** `routes/rooms.js` lines 90-130 (claim-seat endpoint)

```javascript
// This ALREADY exists and will trigger the profile update
await client.query(
  `INSERT INTO room_seats (room_id, user_id, seat_index, chips_in_play, nickname)
   VALUES ($1, $2, $3, $4, $5)`,
  [roomId, userId, seatIndex, buyInAmount, username]
);
```

**Verification:** ✅ No code changes needed, trigger will fire automatically.

---

### 2. Room Creation
**Trigger:** `room_created`  
**Fires On:** `INSERT rooms`  
**Current Code:** `sophisticated-engine-server.js` lines 366-386 (createRoom function)

```javascript
const res = await db.query(
  `INSERT INTO rooms (name, small_blind, big_blind, min_buy_in, max_buy_in, max_players, is_private, invite_code, host_user_id, lobby_status)
   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'lobby')
   RETURNING id, invite_code, max_players, host_user_id`,
  [name, small_blind, big_blind, min_buy_in, max_buy_in, max_players, is_private, invite, host_user_id]
);
```

**Verification:** ✅ No code changes needed, trigger will fire automatically.

---

### 3. Game Completion
**Trigger:** `game_completes`  
**Fires On:** `UPDATE game_states SET status='completed'`  
**Current Code:** `routes/game-engine-bridge.js` lines 742-747

```javascript
await db.query(
  `UPDATE game_states 
   SET status = 'completed' 
   WHERE room_id = $1 AND status = 'active'`,
  [roomId]
);
```

**Verification:** ✅ No code changes needed, trigger will fire automatically.

---

## ⚠️ INTEGRATION GAPS (Need Fixes)

### GAP 1: Profile Endpoint Missing New Fields

**Issue:** `/api/social/profile/me` doesn't SELECT new columns  
**Impact:** Frontend can't display real-time state  
**Location:** `routes/social.js` lines 254-285

**Current Query:**
```javascript
const { data, error } = await supabase
  .from('user_profiles')
  .select('id, username, display_name, avatar_url, bio, total_hands_played, total_games_played, total_wins, win_rate, total_winnings, best_hand, created_at')
  .eq('id', userId)
  .single();
```

**Fix Needed:**
```javascript
const { data, error } = await supabase
  .from('user_profiles')
  .select(`
    id, username, display_name, avatar_url, bio,
    total_hands_played, total_games_played, total_wins, win_rate, total_winnings, best_hand,
    currently_in_room_id, current_game_id, is_playing, current_seat_index,
    total_rooms_created, total_rooms_joined, total_games_started, total_games_completed,
    last_active_at, created_at
  `)
  .eq('id', userId)
  .single();
```

**File:** `routes/social.js` line ~262

---

### GAP 2: Frontend Profile Modal Missing New Stats

**Issue:** `openProfileModal()` doesn't display new stats  
**Impact:** Users can't see real-time status  
**Location:** `public/js/social-modals.js` lines 174-283

**Current Stats Shown:**
- Hands Played ✅
- Games Played ✅ (but uses old data)
- Total Wins ✅
- Win Rate ✅
- Friends ✅
- Biggest Pot ✅

**Missing Stats:**
- Currently Playing (is_playing)
- Current Room (currently_in_room_id)
- Rooms Created (total_rooms_created)
- Rooms Joined (total_rooms_joined)
- Games Started (total_games_started)
- Games Completed (total_games_completed)

**Fix Needed:** Add these to the stats grid in the modal HTML.

---

### GAP 3: Game States Table Schema

**Issue:** Trigger references `game_id` but need to verify column exists  
**Impact:** Trigger might fail if column missing  
**Location:** Migration 06, trigger `track_game_complete()`

**Current Trigger Code:**
```sql
INSERT INTO game_completions (
  game_id,  -- ← Does this column exist in game_states?
  room_id,
  ...
)
```

**Verification Needed:**
```sql
-- Check if game_states has game_id column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'game_states' 
AND column_name = 'game_id';
```

**Expected:** Column exists (likely `id` or `game_id`)

**Possible Fix:** If column is `id` not `game_id`, update trigger:
```sql
game_id = NEW.id  -- Use id column instead
```

---

### GAP 4: Game Start Trigger May Not Fire

**Issue:** Need to verify `game_states` INSERT happens with status='active'  
**Impact:** `is_playing` might not update  
**Location:** Game start logic

**Current Trigger:**
```sql
IF NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
```

**Need to Find:** Where `game_states` is created with `status='active'`

**Search Results:** Not found in grep - need to investigate game start logic.

---

## 🔧 FIXES NEEDED (In Priority Order)

### FIX 1: Update Profile Endpoint (CRITICAL)
**File:** `routes/social.js`  
**Line:** ~262  
**Change:** Add new columns to SELECT statement  
**Time:** 2 minutes

### FIX 2: Verify game_states Schema (CRITICAL)
**Action:** Run SQL query to check schema  
**Command:**
```sql
\d game_states
-- Or
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'game_states';
```
**Time:** 1 minute

### FIX 3: Fix Trigger if Needed (CRITICAL)
**File:** `migrations/06_profile_room_game_relationships.sql`  
**Action:** Update `game_id` to `id` if column mismatch  
**Time:** 2 minutes

### FIX 4: Enhance Profile Modal (MEDIUM)
**File:** `public/js/social-modals.js`  
**Line:** ~220-250  
**Change:** Add new stats to display  
**Time:** 10 minutes

### FIX 5: Find Game Start Logic (MEDIUM)
**Action:** Verify `game_states` INSERT has `status='active'`  
**Time:** 5 minutes

---

## 🧪 VALIDATION CHECKLIST

### Before Testing:
- [ ] Fix 1: Profile endpoint updated
- [ ] Fix 2: Verify game_states schema
- [ ] Fix 3: Update trigger if needed
- [ ] Fix 4: Enhance profile modal
- [ ] Fix 5: Verify game start logic

### Testing Flow:
1. **Join Room**
   - Check: `SELECT currently_in_room_id FROM user_profiles WHERE id = 'X'`
   - Expect: room UUID populated
   - Check: `SELECT * FROM room_participations WHERE user_id = 'X'`
   - Expect: New row created

2. **Start Game**
   - Check: `SELECT is_playing, current_game_id FROM user_profiles WHERE id = 'X'`
   - Expect: `is_playing = true`, `current_game_id` populated

3. **Complete Hand**
   - Check: `SELECT total_hands_played FROM user_profiles WHERE id = 'X'`
   - Expect: Incremented by 1

4. **Complete Game**
   - Check: `SELECT total_games_completed FROM user_profiles WHERE id = 'X'`
   - Expect: Incremented by 1
   - Check: `SELECT * FROM game_completions ORDER BY created_at DESC LIMIT 1`
   - Expect: New row with game details

5. **Leave Room**
   - Check: `SELECT currently_in_room_id, is_playing FROM user_profiles WHERE id = 'X'`
   - Expect: Both NULL/false

6. **View Profile**
   - Open profile modal
   - Expect: All stats visible and accurate

---

## 🚨 CRITICAL PATH

**Order of Operations:**
1. Run schema check (2 min)
2. Fix profile endpoint (2 min)
3. Fix trigger if needed (2 min)
4. Test basic flow (10 min)
5. Enhance UI if tests pass (10 min)

**Total Time:** ~26 minutes to full integration

---

## 📊 RISK ASSESSMENT

### HIGH RISK (Will Break)
- ❌ Profile endpoint not returning new fields → Frontend can't display
- ❌ game_states column mismatch → Trigger fails silently

### MEDIUM RISK (Might Break)
- ⚠️ Game start not setting status='active' → Trigger doesn't fire
- ⚠️ Room_seats missing columns → Join trigger fails

### LOW RISK (Should Work)
- ✅ Room join/leave triggers (straightforward INSERTs/DELETEs)
- ✅ Room creation trigger (straightforward INSERT)
- ✅ Hand completion via migration 03 (already tested)

---

## 💡 TESTING STRATEGY

**Incremental Validation:**
```
1. Fix profile endpoint → Test API call → Verify response
2. Check schema → Fix trigger → Test trigger manually
3. Join room → Query database → Verify update
4. Play hand → Query database → Verify stats
5. View profile → Check UI → Verify display
```

**No error trail. Each step validated before next.**

---

## 🎯 SUCCESS CRITERIA

**Integration is complete when:**
- ✅ Profile endpoint returns all new fields
- ✅ Joining room updates `currently_in_room_id`
- ✅ Starting game sets `is_playing = true`
- ✅ Completing hand increments `total_hands_played`
- ✅ Completing game increments `total_games_completed`
- ✅ Leaving room clears current room/game
- ✅ Profile modal shows real-time status
- ✅ All triggers fire without errors

---

**Next Step:** Apply the 5 fixes in order, then test incrementally.

