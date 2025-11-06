# ✅ PRE-TESTING CHECKLIST - FINAL VALIDATION

Date: November 6, 2025  
Status: **READY FOR TESTING**

---

## 🔥 **CRITICAL: RUN THESE SQL SCRIPTS FIRST**

### ✅ Already Completed
- [x] Migration 17: `migrations/17_enforce_username.sql` (Username NOT NULL)

### 🚨 **MUST RUN NOW: Wipe Legacy Data**

```sql
-- Copy and paste this into Supabase SQL Editor:
-- File: WIPE_LEGACY_DATA.sql

-- STEP 1: Wipe all game history tables
TRUNCATE TABLE hand_history CASCADE;
TRUNCATE TABLE room_participations CASCADE;
TRUNCATE TABLE game_completions CASCADE;
TRUNCATE TABLE player_statistics CASCADE;

-- STEP 2: Reset all profile stats to zero
UPDATE user_profiles SET
  total_hands_played = 0,
  total_wins = 0,
  win_rate = 0,
  total_winnings = 0,
  biggest_pot = 0,
  best_hand = NULL,
  best_hand_date = NULL,
  best_hand_rank = NULL
WHERE id IS NOT NULL;

-- STEP 3: Verify clean slate
SELECT 
  (SELECT COUNT(*) FROM hand_history) as hand_history_count,
  (SELECT COUNT(*) FROM room_participations) as room_participations_count,
  (SELECT COUNT(*) FROM game_completions) as game_completions_count,
  (SELECT COUNT(*) FROM player_statistics) as player_statistics_count,
  (SELECT COUNT(*) FROM user_profiles WHERE total_hands_played > 0) as users_with_hands;

-- Expected result: All counts should be 0

SELECT '✅ Clean slate ready!' as status;
```

**Expected Output:** All counts = 0

---

## 📦 **CODE VALIDATION COMPLETE**

### ✅ Linter Errors: **NONE**
All files passed linting:
- `public/js/auth-manager.js` ✅
- `public/js/social-modals.js` ✅
- `public/js/friends-page.js` ✅
- `public/js/analytics-history.js` ✅
- `routes/social.js` ✅

### ✅ Missing Files: **NONE**
All required files exist and are complete.

### ✅ CSS Styles: **COMPLETE**
All UI components have styling:
- Username modal ✅
- Profile modal ✅
- Friends list ✅
- Game invite modal ✅
- Hand history viewer ✅
- Privacy notice ✅

---

## 🚀 **TESTING SEQUENCE**

Follow this **exact order** to test all features:

### **1️⃣ TIER 0: Username Persistence** (~2 minutes)

**Test Steps:**
1. Open browser in **incognito mode**
2. Go to `http://localhost:3000`
3. Login with Google
4. Click your profile → Change username to `testuser1`
5. **Hard refresh** (Cmd+Shift+R or Ctrl+F5)
6. Click your profile again

**Expected:** Username is still `testuser1` (not email prefix)

**If it fails:** Check browser console for errors

---

### **2️⃣ TIER 1A: Hand History & Analytics** (~5 minutes)

**Test Steps:**
1. Go to Play Now → Create "Test Room"
2. Open 2nd browser window (same user or different)
3. Join the room
4. Play 3-5 hands (deal, bet, fold, etc.)
5. Go to **Analysis & Data** page
6. Scroll to "Hand History" section

**Expected:**
- See all hands you played
- Each hand shows: pot size, winner, hand rank
- Click a hand → Expands to show board, players, actions
- Filters work (try filtering by room)

**If it fails:**
- Check if hands are being inserted into `hand_history` table
- Check browser console for API errors
- Verify `/api/social/analytics/hands/:userId` endpoint is accessible

---

### **3️⃣ TIER 1B: Profile Viewing** (~3 minutes)

**Test Steps:**
1. Create a 2nd user (different browser/incognito)
2. With User 1: Go to Friends page
3. Search for User 2 by username
4. Click **"View Profile"** on User 2

**Expected:**
- See User 2's profile modal
- If not friends: Stats are hidden (privacy notice)
- See "Add Friend" button

**Test Privacy:**
1. Send friend request (User 1 → User 2)
2. Switch to User 2 → Accept request
3. User 1: View User 2's profile again

**Expected:** Now see all stats (privacy bypassed for friends)

---

### **4️⃣ TIER 2: Friends & Invites** (~3 minutes)

**Test Steps:**
1. With User 1 (who has active room):
2. Go to Friends page
3. Click **"🎮 Invite"** on User 2
4. Select a room from the modal

**Expected:**
- Modal shows User 1's active rooms
- Click room → "Invite sent!" notification
- User 2 receives notification (check their notifications)

**Test Fallback:**
1. Delete all User 1's rooms
2. Try to invite again

**Expected:** Message: "Create a room first, then invite your friend!"

---

## 🔍 **COMMON ISSUES & FIXES**

### Issue: Username reverts on refresh
**Fix:** Clear browser cache and localStorage, then test again

### Issue: Hand history shows "No hands found"
**Diagnosis:**
- Check `hand_history` table in Supabase
- Verify `encoded_hand` column exists
- Check if triggers are firing (run test query)

### Issue: Profile stats are always hidden
**Check:**
- `show_game_history` column in `user_profiles` (should be NULL or TRUE by default)
- Friend relationship in `friendships` table

### Issue: Invite button does nothing
**Check:**
- Browser console for errors
- Verify `/api/rooms/:roomId/invite` endpoint exists
- Check if room has valid `id` and `name`

---

## 📊 **VALIDATION QUERIES**

Run these in Supabase SQL Editor to verify data:

### Check Username
```sql
SELECT id, username, email FROM user_profiles ORDER BY created_at DESC LIMIT 5;
-- All users should have a username (NOT NULL)
```

### Check Hand History
```sql
SELECT 
  COUNT(*) as total_hands,
  COUNT(DISTINCT room_id) as unique_rooms,
  COUNT(DISTINCT unnest(player_ids)) as unique_players
FROM hand_history;
-- Should match the number of hands played
```

### Check Profile Stats
```sql
SELECT 
  username, 
  total_hands_played, 
  total_wins, 
  win_rate,
  biggest_pot,
  best_hand
FROM user_profiles 
WHERE total_hands_played > 0
ORDER BY total_hands_played DESC;
-- Should show updated stats after playing hands
```

### Check Friendships
```sql
SELECT 
  up1.username as requester,
  up2.username as addressee,
  f.status
FROM friendships f
JOIN user_profiles up1 ON up1.id = f.requester_id
JOIN user_profiles up2 ON up2.id = f.addressee_id
ORDER BY f.created_at DESC;
-- Should show your friend relationships
```

---

## 🎯 **SUCCESS CRITERIA**

| Feature | Test | Status |
|---------|------|--------|
| Username Persistence | Survives hard refresh | ⏳ |
| Hand History | Shows played hands | ⏳ |
| Hand Filters | Date/room/rank filtering works | ⏳ |
| PHE Decoding | Expands to show board/actions | ⏳ |
| View Profile | Opens modal with stats | ⏳ |
| Privacy Controls | Hides stats for non-friends | ⏳ |
| Friend Request | Sends and accepts | ⏳ |
| Game Invite | Shows rooms, sends notification | ⏳ |

**ALL must be ✅ to proceed to MVP launch**

---

## 🚀 **IF ALL TESTS PASS**

You're ready for:
1. **UI/UX Audit** (mobile responsiveness, loading states, empty states)
2. **Public Room Implementation**
3. **Tournament Mode**
4. **MVP Launch** 🎉

---

## 🆘 **IF TESTS FAIL**

**DO NOT PANIC!**

1. Note which specific test failed
2. Check browser console for errors
3. Check server logs for backend errors
4. Run validation queries above
5. Report back with:
   - Exact test that failed
   - Error messages (frontend + backend)
   - Screenshots if UI issue

We'll debug together!

---

## 📝 **TESTING NOTES**

Use this space to track your test results:

```
TIER 0 (Username):
- Test 1: [ ] Pass / [ ] Fail - Notes: _______________
- Test 2: [ ] Pass / [ ] Fail - Notes: _______________

TIER 1A (Analytics):
- Test 1: [ ] Pass / [ ] Fail - Notes: _______________
- Test 2: [ ] Pass / [ ] Fail - Notes: _______________

TIER 1B (Profile):
- Test 1: [ ] Pass / [ ] Fail - Notes: _______________
- Test 2: [ ] Pass / [ ] Fail - Notes: _______________

TIER 2 (Friends):
- Test 1: [ ] Pass / [ ] Fail - Notes: _______________
- Test 2: [ ] Pass / [ ] Fail - Notes: _______________
```

---

**STATUS:** 🔥 **READY TO TEST!** 🔥

*All code complete, all linter errors fixed, all styles in place.*

*Run the WIPE_LEGACY_DATA.sql script above, then start testing!*

