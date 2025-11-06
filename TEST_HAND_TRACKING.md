# TEST: HAND TRACKING & PROFILE SYNC
**Date:** Nov 5, 2025  
**Status:** Ready to test  
**Purpose:** Verify hand completion → hand_history → player_statistics → user_profiles

---

## ✅ **WHAT WAS FIXED**

### **1. Hand Completion Data Extraction** (`routes/game-engine-bridge.js`)
- ✅ **Line 753-773:** Insert `hand_history` on hand completion
- ✅ **Line 777-795:** Update `player_statistics` for each player
- ✅ **Line 688:** Extract `game_id` from game_states for hand_history FK
- ✅ **Line 799-802:** Graceful error handling (non-critical)
- ✅ **Removed:** Obsolete `rooms.status` UPDATE (line 748-753 deleted)

### **2. Trigger Already Exists** (Migration 03)
- ✅ `sync_user_profile_stats()` auto-syncs `player_statistics` → `user_profiles`
- ✅ Updates: `total_hands_played`, `total_wins`, `win_rate`

---

## 🧪 **TESTING PROCEDURE**

### **Step 1: Clear Old Data (Optional)**
```sql
-- Run in Supabase SQL Editor
DELETE FROM hand_history WHERE created_at < NOW();
DELETE FROM player_statistics WHERE created_at < NOW();
UPDATE user_profiles SET total_hands_played = 0, total_wins = 0, win_rate = 0;
```

### **Step 2: Start Server & Clear Console**
```bash
cd /Users/waleedraza/Desktop/PokerGeek
node sophisticated-engine-server.js
```
- Open browser console (F12)
- Clear all logs

### **Step 3: Play a Full Hand**
1. Go to `/play.html`
2. Click **"Create Sandbox"**
3. Open 2 browser tabs (or use incognito for 2nd player)
4. Both join the same room
5. Click **"Start Hand"** (host only)
6. Play through PREFLOP → FLOP → TURN → RIVER → SHOWDOWN
7. Watch for console logs

### **Step 4: Check Server Console**
**Look for these logs:**
```
💰 [MINIMAL] Hand complete - persisting chips to DB
   Players in updatedState: [...]
   🔄 Attempting UPDATE for [userId]: chips=...
   ✅ Updated chips for [userId]: $...

📊 [MINIMAL] Extracting hand data to hand_history + player_statistics
   ✅ hand_history insert: [uuid]
   ✅ player_statistics updated: [userId] (won: true/false)
   ✅ player_statistics updated: [userId] (won: true/false)
📊 [MINIMAL] Data extraction complete - trigger will sync to user_profiles
```

**If you see errors:**
- `❌ [MINIMAL] Data extraction failed (non-critical): [error]`
- → Copy the error and share with me

### **Step 5: Check Database**
Run these queries in Supabase SQL Editor:

**A. Check hand_history:**
```sql
SELECT id, game_id, room_id, hand_number, pot_size, 
       winners, created_at
FROM hand_history
ORDER BY created_at DESC
LIMIT 1;
```
**Expected:** 1 row with:
- `pot_size` > 0
- `winners` as JSON array
- `created_at` = recent

**B. Check player_statistics:**
```sql
SELECT user_id, total_hands_played, total_hands_won, 
       last_hand_played_at, updated_at
FROM player_statistics
WHERE last_hand_played_at > NOW() - INTERVAL '5 minutes'
ORDER BY updated_at DESC;
```
**Expected:** 2 rows (one per player) with:
- `total_hands_played` = 1
- `total_hands_won` = 1 for winner, 0 for loser

**C. Check user_profiles (trigger sync):**
```sql
SELECT id, username, total_hands_played, total_wins, win_rate
FROM user_profiles
WHERE id IN (
  SELECT user_id FROM player_statistics 
  WHERE last_hand_played_at > NOW() - INTERVAL '5 minutes'
);
```
**Expected:** 2 rows with:
- `total_hands_played` = 1
- `total_wins` = 1 for winner, 0 for loser
- `win_rate` = 100.00 for winner, 0.00 for loser

### **Step 6: Check Profile Modal (Frontend)**
1. Click your username in navbar
2. Click **"View Profile"**
3. Verify stats:
   - **Hands Played:** 1
   - **Total Wins:** 1 or 0
   - **Win Rate:** 100% or 0%

---

## 🐛 **DIAGNOSE CHECK BUG**

### **When Does It Happen?**
- You said: "when i hit the final check, nothing changed"

### **What to Look For:**
**In server console, find this log:**
```
🔍 Betting round check: {
  street: 'FLOP' / 'TURN' / 'RIVER',
  activePlayers: 2,
  playersWhoActed: 2,
  allMatched: true/false,
  allActed: true/false,
  currentBet: 0,
  playerBets: [...]
}
```

**Diagnosis:**
- ✅ If `allMatched: true` AND `allActed: true` → Round should advance
- ❌ If `allMatched: false` OR `allActed: false` → Bug identified

**Copy the entire log block** and send it to me. This will tell us exactly why the check isn't advancing.

---

## 📊 **SUCCESS CRITERIA**

### **Must Pass:**
1. ✅ Server logs show `hand_history insert` and `player_statistics updated`
2. ✅ Database has 1 row in `hand_history`
3. ✅ Database has 2 rows in `player_statistics`
4. ✅ Database shows `user_profiles` synced (total_hands_played = 1)
5. ✅ Profile modal displays updated stats

### **Nice to Have:**
6. ✅ Check bug diagnosed via console logs
7. ✅ No errors in browser or server console

---

## 🚨 **IF SOMETHING FAILS**

### **Scenario A: No hand_history row**
- Check server console for: `❌ [MINIMAL] Data extraction failed`
- Copy the error message
- Possible causes:
  - `hand_history` table doesn't exist → Run Migration 08
  - Column mismatch → Check schema
  - FK constraint violation → Verify `game_id` exists

### **Scenario B: player_statistics not updating**
- Check if `ON CONFLICT` clause is working
- Verify `user_id` FK constraint
- Check for unique constraint on `user_id`

### **Scenario C: user_profiles not syncing**
- Trigger might not be firing
- Check: `SELECT * FROM pg_trigger WHERE tgname = 'update_profile_stats_trigger';`
- Re-run Migration 03 if trigger missing

### **Scenario D: Check not advancing**
- Server console shows `🔍 Betting round check` with `allActed: false`
- This means not all players have acted
- Share the console log for deeper diagnosis

---

## 🎯 **NEXT STEPS AFTER TESTING**

1. **If all tests pass:** Move to friends system testing
2. **If check bug persists:** Debug `isBettingRoundComplete()` logic
3. **If hand tracking fails:** Fix data extraction SQL

**When ready, report back with:**
- ✅ What worked
- ❌ What failed (with console logs)
- 📊 Database query results (screenshots or text)

---

**🎮 Let's validate the cure, not just the symptoms!**


