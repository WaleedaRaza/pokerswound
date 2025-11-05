# Pre-Friends Testing Checklist
**Goal:** Verify room limit + game start work before moving to friends system

## ✅ Already Done
- [x] Migration 03: Profile stats sync
- [x] Migration 06: Profile-room-game relationships  
- [x] Migration 07: Room status cleanup (just ran)
- [x] Backend room limit enforcement (both `/api/rooms` and `/api/sandbox`)
- [x] Frontend gate modal for room limit

## 🚨 CRITICAL: Must Run Before Testing
- [ ] **HOTFIX_TRIGGER_ROOM_LIMIT.sql** in Supabase
  - Fixes `track_game_start()` trigger to use `NEW.id` instead of `NEW.game_id`
  - Without this, cards won't deal (error: "record has no field game_id")

## 🧪 Test Flow (5 min)

### Test 1: Room Limit Gate (2 min)
1. Click "Create Sandbox"
2. Enter room name, submit
3. **Expected:** Red gate modal appears with "You have X rooms (max 5)"
4. **Verify:** Console shows `🚫 [SANDBOX] BLOCKED: User has X active rooms`
5. **Actions Available:**
   - Close a room → modal refreshes
   - Rejoin a room → navigate to room
   - Cancel → close modal

### Test 2: Game Start (2 min)
1. Close old rooms until < 5
2. Create new sandbox room
3. Join with 2nd player (incognito window)
4. Click "Start Hand"
5. **Expected:** Cards deal successfully, no errors
6. **Verify Console:**
   - ✅ `Dealt cards to 2 players`
   - ✅ No error about `game_id`
7. **Verify DB:**
   ```sql
   SELECT is_playing, current_game_id, total_games_started 
   FROM user_profiles 
   WHERE id = 'YOUR_USER_ID';
   ```
   - `is_playing` should be `true`
   - `current_game_id` should be set
   - `total_games_started` should increment

### Test 3: Complete Hand (1 min)
1. Play through a hand to completion
2. **Verify DB:**
   ```sql
   SELECT total_hands_played, total_wins 
   FROM user_profiles 
   WHERE id = 'YOUR_USER_ID';
   ```
   - `total_hands_played` should increment
   - Winner's `total_wins` should increment

## 🔧 If Tests Fail

### Room Limit Not Working?
- Check server logs for `🔍 [SANDBOX] Room limit check`
- Verify query uses `status != 'closed'` (not `= 'active'`)
- Check DB: `SELECT COUNT(*) FROM rooms WHERE host_user_id = 'YOUR_ID' AND status != 'closed';`

### Cards Not Dealing?
- **Most likely:** You didn't run `HOTFIX_TRIGGER_ROOM_LIMIT.sql`
- Check server logs for error about `game_id`
- Verify trigger uses `NEW.id` not `NEW.game_id`

### Profile Not Updating?
- Check triggers exist:
  ```sql
  SELECT trigger_name, event_manipulation, event_object_table 
  FROM information_schema.triggers 
  WHERE event_object_table IN ('game_states', 'player_statistics', 'room_seats');
  ```
- Should see: `game_starts`, `game_completes`, `update_profile_stats_trigger`, etc.

## ✅ Sign-Off Criteria

All 3 tests pass → **READY FOR FRIENDS**

Then we'll tackle:
1. Friends page testing (search, tabs, requests)
2. Friend invites to games (from gate modal)
3. Notifications polish

---

**Current Status:** Waiting for HOTFIX SQL to be run, then test.

