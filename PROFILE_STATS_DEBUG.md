# 🔍 PROFILE STATS DEBUG GUIDE

**Status:** Migration 11 complete, game working, profile modal error  
**Goal:** Verify data flow & fix profile display

---

## ✅ **WHAT'S WORKING NOW:**
- ✅ Hands complete to showdown
- ✅ Chips update correctly
- ✅ NO trigger errors!
- ✅ Room limit enforced

---

## 🐛 **NEXT: FIX PROFILE STATS ERROR**

### **Step 1: What error are you seeing?**

**Check browser console when you click profile:**
- Press F12
- Click your username → "View Profile"
- Look for errors in console

**Common errors:**
1. `Cannot read property 'total_hands_played' of undefined`
2. `404 /api/social/profile/me`
3. `500 Internal Server Error`
4. `Unauthorized`

### **Step 2: Check Database**

**Run these queries in Supabase SQL Editor (when it's back up):**

```sql
-- A. Check if hand_history was created
SELECT COUNT(*), MAX(created_at) 
FROM hand_history;

-- B. Check if player_statistics was updated
SELECT user_id, total_hands_played, total_hands_won, last_hand_played_at
FROM player_statistics
ORDER BY last_hand_played_at DESC
LIMIT 5;

-- C. Check if user_profiles synced
SELECT id, username, total_hands_played, total_wins, win_rate
FROM user_profiles
WHERE total_hands_played > 0
ORDER BY total_hands_played DESC
LIMIT 5;

-- D. Check game_completions (new!)
SELECT game_id, room_id, total_hands_played, completed_at
FROM game_completions
ORDER BY completed_at DESC
LIMIT 5;
```

### **Step 3: Check Server Logs**

**After hand completes, server console should show:**
```
💰 [MINIMAL] Hand complete - persisting chips to DB
   ✅ Updated chips for [userId]: $...
📊 [MINIMAL] Extracting hand data to hand_history + player_statistics
   ✅ hand_history insert: [uuid]
   ✅ player_statistics updated: [userId] (won: true/false)
   ✅ player_statistics updated: [userId] (won: true/false)
📊 [MINIMAL] Data extraction complete - trigger will sync to user_profiles
```

**If you see errors here, share them!**

---

## 🔧 **LIKELY FIXES:**

### **Fix 1: Profile API Missing Columns**

If profile API doesn't return `total_hands_played`, check:

**File:** `routes/auth.js`  
**Endpoint:** `GET /api/auth/profile/:userId`

Should include:
```javascript
SELECT id, username, display_name, avatar_url, bio,
  total_hands_played,  -- ADD IF MISSING
  total_wins,          -- ADD IF MISSING
  win_rate,            -- ADD IF MISSING
  total_games_played, total_winnings, best_hand,
  created_at
FROM user_profiles
WHERE id = $1
```

### **Fix 2: Frontend Expecting Wrong Fields**

**File:** `public/js/social-modals.js`  
**Function:** `openProfileModal(userId)`

Should handle missing fields gracefully:
```javascript
const handsPlayed = profile.total_hands_played || 0;
const totalWins = profile.total_wins || 0;
const winRate = profile.win_rate || 0;
```

### **Fix 3: Trigger Not Firing**

If `user_profiles` not updating, verify trigger exists:
```sql
SELECT 
  tgname AS trigger_name,
  tgenabled AS enabled
FROM pg_trigger
WHERE tgname = 'update_profile_stats_trigger';
```

Should return: `update_profile_stats_trigger | O` (O = enabled)

---

## 📊 **EXPECTED DATA FLOW (After Fix):**

```
Play hand to completion
  ↓
game-engine-bridge.js (line 748-802)
  ↓
INSERT hand_history ✅
  ↓
UPDATE player_statistics ✅
  ↓
TRIGGER sync_user_profile_stats() ✅
  ↓
UPDATE user_profiles (total_hands_played, total_wins, win_rate) ✅
  ↓
Frontend calls /api/auth/profile/:userId ✅
  ↓
Profile modal shows live stats ✅
```

---

## 🧪 **QUICK TEST:**

1. **Play 1 full hand**
2. **Check server console for "📊 Data extraction complete"**
3. **Open profile modal**
4. **Share error if it appears**

**What error are you seeing in the profile modal?** 🔍

