# EXECUTE NOW - Fast Track to Friends System

## 🚨 IMMEDIATE ACTIONS (15 min)

### Step 1: Run Hotfix SQL (2 min)
**File:** `HOTFIX_TRIGGER_ROOM_LIMIT.sql`
**Where:** Supabase SQL Editor
**What it does:** Fixes game start trigger (`NEW.game_id` → `NEW.id`)

```sql
-- Just copy/paste the whole file and run it
```

### Step 2: Test Room Limit (3 min)
1. Open browser, go to `/play`
2. Click "Create Sandbox"
3. **Expected:** Red modal appears showing "23 active rooms (max 5)"
4. Click "Close" on rooms until you have < 5
5. Try creating again → should work

### Step 3: Test Game Start (5 min)
1. Create new sandbox room
2. Open incognito window → join as 2nd player
3. Click "Start Hand"
4. **Expected:** Cards deal, no errors in console
5. **Check console for:** `✅ Dealt cards to 2 players`

### Step 4: Test Hand Completion (5 min)
1. Play through the hand (fold/call/raise)
2. Hand completes
3. **Check DB:**
```sql
SELECT total_hands_played, total_wins, biggest_pot 
FROM user_profiles 
WHERE id = 'YOUR_USER_ID';
```
4. **Expected:** Stats increment

---

## ✅ IF ALL TESTS PASS → MOVE TO PHASE 2

---

## 📋 PHASE 2: Data Architecture (30 min)

### Task 1: Run Migration 08 (2 min)
**File:** `migrations/08_hand_history_and_cleanup.sql`
**Where:** Supabase SQL Editor
**What it does:** Creates `hand_history` table + triggers

### Task 2: Wire Hand Completion to hand_history (15 min)
**File:** Backend game engine
**What:** When hand completes, INSERT into `hand_history`
**Code location:** Find where hand winner is determined

```javascript
// After hand completes:
await db.query(`
  INSERT INTO hand_history (
    game_id, room_id, hand_number, player_ids, 
    winner_id, pot_size, board_cards, winning_hand
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
`, [gameId, roomId, handNum, playerIds, winnerId, pot, board, handDesc]);
```

### Task 3: Update Room Close Logic (5 min)
**File:** `routes/rooms.js` + `routes/sandbox.js`
**Change:** `UPDATE status = 'closed'` → `DELETE FROM rooms`

```javascript
// OLD:
await db.query('UPDATE rooms SET status = $1 WHERE id = $2', ['closed', roomId]);

// NEW:
await db.query('DELETE FROM rooms WHERE id = $1 AND host_user_id = $2', [roomId, hostId]);
```

### Task 4: Update Room Limit Queries (3 min)
**Files:** `routes/rooms.js`, `routes/sandbox.js`
**Change:** Remove status checks (all existing rooms are active)

```javascript
// OLD:
WHERE host_user_id = $1 AND status != 'closed'

// NEW:
WHERE host_user_id = $1
```

### Task 5: Test Data Flow (5 min)
1. Create room
2. Play 3 hands
3. Close room (should DELETE)
4. Check `hand_history`: `SELECT * FROM hand_history ORDER BY created_at DESC LIMIT 10;`
5. Check profile: `SELECT * FROM get_user_hand_history('YOUR_USER_ID', 10);`

---

## 📋 PHASE 3: Friends System (1 hour)

### Task 1: Test Friends Page (10 min)
**URL:** `/friends`
**Tests:**
- Search by username → find user
- Send friend request → shows in "Sent" tab
- Accept request (from 2nd account) → shows in "All Friends"
- Online status shows correctly

### Task 2: Friend Invites from Gate Modal (15 min)
**File:** `public/pages/play.html`
**Add:** "Invite Friends" button in room limit gate modal

```javascript
function showRoomLimitGate(roomData) {
  // Add invite button to each room card:
  <button onclick="inviteFriendsToRoom('${room.id}')">
    👥 Invite Friends
  </button>
}
```

### Task 3: Notifications Polish (20 min)
**File:** Create `public/js/notifications.js`
**Features:**
- Bell icon in navbar
- Red badge for unread count
- Dropdown shows recent notifications
- Click notification → navigate to relevant page

### Task 4: Profile Modal Enhancement (15 min)
**File:** `public/js/social-modals.js`
**Add tabs:**
- Stats (existing)
- Recent Games (from `game_completions`)
- Hand History (from `hand_history`)
- Best Hands (from `hand_history` sorted by rank)

---

## 📋 PHASE 4: Polish & Testing (1 hour)

### Task 1: Host Controls Testing (15 min)
**Test each control:**
- Kick player → removes from game
- Pause game → stops action timer
- Reset stacks → sets all chips to default
- End game → closes game, shows results

### Task 2: Mobile Responsiveness Check (15 min)
**Pages to test:**
- `/` - Landing
- `/play` - Game lobby
- `/friends` - Friends list
- `/poker` - Game table (most critical)

### Task 3: Debug Cleanup (15 min)
**Remove:**
- `console.log()` statements
- Debug alerts
- Old commented code

### Task 4: Final Smoke Test (15 min)
**Full user flow:**
1. Sign in with Google
2. Set username
3. Create room
4. Invite friend
5. Play full game
6. View profile → see stats updated
7. Check friends list
8. Check notifications

---

## 🎯 CURRENT STATUS

- ✅ Migrations 03, 06, 07 ran
- ✅ Room limit backend enforced
- ✅ Frontend gate modal ready
- ✅ Data architecture designed
- ⏳ **WAITING ON:** Hotfix SQL + testing

---

## 🚀 EXECUTE ORDER

1. **YOU:** Run hotfix SQL in Supabase
2. **YOU:** Test room limit + game start (15 min)
3. **ME:** If tests pass, I wire Phase 2 (data extraction)
4. **YOU:** Run Migration 08
5. **ME + YOU:** Test data flow together
6. **ME:** Build friends features (Phase 3)
7. **YOU:** Test friends flow
8. **ME:** Polish & final testing (Phase 4)
9. **DONE:** Launch ready

---

**START NOW:** Run `HOTFIX_TRIGGER_ROOM_LIMIT.sql` and report back with test results! 🔥

