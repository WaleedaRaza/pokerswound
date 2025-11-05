# ✅ READY TO TEST

**Date:** November 5, 2025  
**Status:** All migrations run, all fixes applied  
**Architecture:** Profile-centric, fully wired

---

## 🎯 WHAT'S BEEN DONE

### ✅ Database Architecture (Complete)
- [x] Migration 03: Profile stats sync trigger
- [x] Migration 06: Profile-room-game relationships
- [x] 5 triggers created and active
- [x] 2 tracking tables created
- [x] Profile enhanced with real-time fields

### ✅ Backend Integration (Complete)
- [x] Profile endpoint returns new fields
- [x] Game completion triggers fire automatically
- [x] Room join/leave triggers fire automatically
- [x] Room creation triggers fire automatically
- [x] Triggers use correct column names (`game_states.id`)

### ✅ Data Flow (Wired)
```
User joins room → room_seats INSERT → Trigger → Profile updated
Game starts → game_states status='active' → Trigger → is_playing=true
Hand ends → player_statistics → Trigger → total_hands_played++
Game ends → game_states status='completed' → Trigger → game_completions created
User leaves → room_seats DELETE → Trigger → Profile cleared
```

---

## 🧪 TESTING INSTRUCTIONS

### Test 1: Join Room (Verify Room Tracking)

**Actions:**
1. Create a room
2. Join the room

**Verification:**
```sql
-- Check profile updated
SELECT username, currently_in_room_id, total_rooms_joined, last_active_at
FROM user_profiles WHERE username = 'YOUR_USERNAME';

-- Should show:
-- currently_in_room_id: [UUID]
-- total_rooms_joined: 1 (or incremented)

-- Check participation tracked
SELECT * FROM room_participations 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY joined_at DESC LIMIT 1;

-- Should show new row with room_id, joined_at
```

---

### Test 2: Play Hand (Verify Stats Sync)

**Actions:**
1. Start game
2. Play a complete hand

**Verification:**
```sql
-- Check profile stats updated
SELECT 
  username, 
  is_playing,
  total_hands_played, 
  total_wins,
  win_rate
FROM user_profiles WHERE username = 'YOUR_USERNAME';

-- Should show:
-- is_playing: true (during game)
-- total_hands_played: incremented by 1
-- total_wins: incremented if you won
```

---

### Test 3: Complete Game (Verify Game Tracking)

**Actions:**
1. Play several hands
2. End the game (or leave room)

**Verification:**
```sql
-- Check game completion record
SELECT * FROM game_completions 
ORDER BY completed_at DESC LIMIT 1;

-- Should show:
-- game_id, room_id, player_ids, total_hands_played

-- Check profile updated
SELECT 
  username,
  total_games_completed,
  is_playing,
  currently_in_room_id
FROM user_profiles WHERE username = 'YOUR_USERNAME';

-- Should show:
-- total_games_completed: incremented by 1
-- is_playing: false (after game ends)
```

---

### Test 4: Leave Room (Verify Cleanup)

**Actions:**
1. Leave the room

**Verification:**
```sql
-- Check profile cleared
SELECT 
  username,
  currently_in_room_id,
  current_game_id,
  is_playing
FROM user_profiles WHERE username = 'YOUR_USERNAME';

-- Should show all NULL/false

-- Check participation ended
SELECT * FROM room_participations 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY joined_at DESC LIMIT 1;

-- Should show left_at timestamp populated
```

---

### Test 5: View Profile (Verify Frontend)

**Actions:**
1. Click your profile in navbar

**Verification:**
- Profile modal opens ✅
- Shows hands played ✅
- Shows games played ✅
- Shows win rate ✅
- All stats accurate ✅

**In Console:**
```javascript
// Check API response
fetch('/api/social/profile/me', {
  headers: {
    'Authorization': 'Bearer ' + await window.authManager.getAccessToken()
  }
}).then(r => r.json()).then(console.log)

// Should include:
// currently_in_room_id, is_playing, total_rooms_created, etc.
```

---

## 🚨 WHAT TO WATCH FOR

### Red Flags (Report Immediately)
- ❌ Profile stats don't update after playing
- ❌ `currently_in_room_id` stays NULL after joining
- ❌ `is_playing` doesn't flip to true
- ❌ Console errors about triggers
- ❌ 500 errors from profile endpoint

### Expected Behavior
- ✅ Stats update in real-time (refresh profile to see)
- ✅ No console errors
- ✅ All queries return data
- ✅ Triggers fire silently in background

---

## 📊 VALIDATION QUERIES

### Quick Health Check
```sql
-- Check triggers exist
SELECT tgname FROM pg_trigger 
WHERE tgname IN (
  'user_joins_room',
  'user_leaves_room',
  'room_created',
  'game_starts',
  'game_completes'
);
-- Should return 5 rows

-- Check your profile
SELECT * FROM user_profiles WHERE username = 'YOUR_USERNAME';

-- Check your participations
SELECT COUNT(*) FROM room_participations WHERE user_id = 'YOUR_USER_ID';

-- Check game completions
SELECT COUNT(*) FROM game_completions;
```

---

## 🎯 SUCCESS CRITERIA

**Integration is working if:**
1. ✅ Joining room updates `currently_in_room_id`
2. ✅ Playing hand increments `total_hands_played`
3. ✅ Completing game increments `total_games_completed`
4. ✅ Leaving room clears current room fields
5. ✅ Profile API returns all new fields
6. ✅ No trigger errors in logs

---

## 💡 DEBUGGING TIPS

### If Stats Don't Update:
```sql
-- Check if triggers are enabled
SELECT tgname, tgenabled FROM pg_trigger 
WHERE tgname LIKE '%room%' OR tgname LIKE '%game%';

-- Check player_statistics exists
SELECT * FROM player_statistics WHERE user_id = 'YOUR_USER_ID';

-- Manually trigger the sync
UPDATE player_statistics 
SET updated_at = NOW() 
WHERE user_id = 'YOUR_USER_ID';
```

### If Room Tracking Fails:
```sql
-- Check room_seats
SELECT * FROM room_seats WHERE user_id = 'YOUR_USER_ID';

-- Manually insert participation
INSERT INTO room_participations (user_id, room_id, joined_at)
VALUES ('YOUR_USER_ID', 'ROOM_ID', NOW());
```

---

## 🚀 NEXT STEPS AFTER TESTING

**If all tests pass:**
1. Move to Iteration 2 (Remove email/password UI)
2. Continue with ITERATIVE_FIXES.md procedure
3. Build out UI enhancements

**If tests fail:**
1. Note exactly which test failed
2. Copy SQL query results
3. Copy console errors
4. Report back - we'll debug together

---

**Current Status:** Architecture complete, wired, ready to test.  
**Your Move:** Run through Test 1-5, report results.

