# 🔧 ITERATIVE FIX PROCEDURE

**Date:** November 5, 2025  
**Mode:** Iterative - One issue at a time  
**Status:** Foundation complete, now wiring in

---

## 🎯 PROCEDURE PHILOSOPHY

1. **Fix one thing** at a time
2. **Test immediately** after each fix
3. **Commit** when working
4. **Document** what changed
5. **Move to next**

**No sweeping changes. No getting ahead. Methodical progress.**

---

## 📋 ISSUES IDENTIFIED FROM TESTING

### ✅ What Works
- Authentication (Google + Guest)
- Room creation
- Joining rooms
- Playing poker hands (core game loop)
- Actions (fold, call, raise)
- Winner determination

### ❌ What's Broken
1. Email/password UI still visible (should be Google + Guest only)
2. Friend search returns "no users exist"
3. Profile stats show 0 (migration 03 not run)
4. 50 old rooms showing (cleanup + limit enforcement)
5. Host controls UI broken (no current players list)
6. Game pause doesn't work
7. Kick player has no buttons
8. Player settings has features we don't need
9. Reset stacks/End game fail
10. Game completion doesn't increment profile games

---

## 🔴 ITERATION 1: Profile Stats Sync (BLOCKING)

**Why First:** Stats are core MVP feature, needed for validation

**Issue:** Migration 03 not run, trigger doesn't exist

**Steps:**
1. Create complete migration SQL
2. User runs in Supabase SQL Editor
3. User plays a hand
4. Check `player_statistics` table updates
5. Check `user_profiles` table auto-updates via trigger
6. User views profile - should show correct stats

**Success Criteria:**
- Trigger exists: `SELECT tgname FROM pg_trigger WHERE tgname = 'update_profile_stats_trigger';`
- After playing hand, profile stats increment
- `total_hands_played`, `total_wins`, `win_rate` all correct

**SQL to Run:**
```sql
-- See migration file created below
```

**Testing:**
- Before: Profile shows 0 hands
- Action: Play 1 hand
- After: Profile shows 1 hand, stats updated

**Commit Message:** `Fix profile stats sync - add trigger for player_statistics → user_profiles`

---

## 🔴 ITERATION 2: Remove Email/Password UI

**Why Next:** Simple cleanup, improves auth clarity

**Issue:** Email/password forms still in all HTML files

**Files to Edit:** (6 files)
- `public/pages/index.html`
- `public/pages/play.html`
- `public/pages/learning.html`
- `public/pages/poker-today.html`
- `public/pages/ai-solver.html`
- `public/pages/analysis.html`

**Steps:**
1. Search each file for "loginForm" div
2. Remove email/password input sections
3. Keep only Google button + Guest button
4. Remove "Sign Up" tab (only "Sign In" needed)
5. Test login modal on each page

**Success Criteria:**
- Click "Sign In" → Only see Google + Guest buttons
- No email/password fields visible
- No "Sign Up" tab

**Commit Message:** `Remove email/password UI - Google + Guest only`

---

## 🔴 ITERATION 3: Friend Search Debug

**Why Next:** Need to understand why search fails

**Issue:** Searching username/email returns "no users exist"

**Investigation Steps:**
1. Check what users exist: `SELECT id, username, display_name FROM user_profiles LIMIT 20;`
2. Test exact username search
3. Check friend search endpoint logs
4. Verify username in request matches database

**Possible Causes:**
- User searched doesn't exist
- Case sensitivity issue
- API endpoint issue
- Frontend sending wrong parameter

**Steps:**
1. Add console.log in `friends-page.js` searchUsers()
2. Add console.log in `routes/social.js` /username/:username
3. User searches for known username
4. Check browser console
5. Check server logs
6. Identify mismatch

**Success Criteria:**
- Search for existing user → User found
- See exact username in logs
- API returns user profile

**Commit Message:** `Fix friend search - [describe root cause]`

---

## 🔴 ITERATION 4: Room Cleanup & Limit Enforcement

**Why Next:** Clutter + limit not working

**Issue:** 50 old rooms showing, 5-room limit not enforced

**Steps:**
1. **Cleanup:** Delete old/inactive rooms
   ```sql
   DELETE FROM rooms 
   WHERE status != 'active' 
   OR (status = 'active' AND updated_at < NOW() - INTERVAL '7 days');
   ```

2. **Verify Limit Code:** Check `routes/rooms.js` lines 71-90
   - Limit IS in code
   - Need to test if it works

3. **Test Enforcement:**
   - User creates 5 rooms
   - Try to create 6th
   - Should get error: "Room limit reached"

4. **Add Room Manager Cleanup:**
   - Show only active rooms
   - Add "Close Room" button for each

**Success Criteria:**
- Old rooms deleted
- User can't create 6th room
- Room manager shows only active rooms

**Commit Message:** `Clean old rooms and enforce 5-room limit`

---

## 🔴 ITERATION 5: Simplify Host Controls UI

**Why Next:** Core hosting functionality broken

**Issue:** Current players section doesn't render, buttons missing

**Current Problems:**
- "💡 Use KICK buttons..." but no buttons visible
- Pause doesn't work
- Reset stacks fails
- End game fails
- UI is confusing

**Redesign Approach:**
```
Host Controls
├── Current Players (cards with controls)
│   ├── Player 1: Name, Stack, [Adjust] [Kick]
│   ├── Player 2: Name, Stack, [Adjust] [Kick]
│   └── ...
└── Game Controls
    ├── [⏸️ Pause] [▶️ Resume]
    ├── [🔄 Reset Stacks]
    └── [🛑 End Game]
```

**Steps:**
1. Read current host controls HTML
2. Create simplified version
3. Add `renderHostPlayers()` function
4. Wire up to seat updates
5. Test each button individually

**Success Criteria:**
- Host sees all seated players
- Can adjust player stack
- Can kick player (player removed)
- Can pause game (actions disabled)
- Can end game (room closes)

**Commit Message:** `Simplify host controls - working player list and actions`

---

## 🔴 ITERATION 6: Remove Unnecessary Player Settings

**Why Next:** Cleanup, focus on what works

**Issue:** Player settings has features we don't support yet

**Remove:**
- 🃏 4-Color Deck (not implemented)
- 🎴 Card Back Design (not implemented)
- ⚡ Animation Speed (not needed now)
- 🙈 Auto-Muck (not needed now)

**Keep:**
- Table color selection (works)
- Any accessibility settings

**Steps:**
1. Find player settings modal
2. Remove HTML for unused features
3. Keep only working features
4. Test modal still opens

**Success Criteria:**
- Player settings shows only table color
- No "coming soon" items
- Modal is clean and focused

**Commit Message:** `Clean up player settings - remove unimplemented features`

---

## 🔴 ITERATION 7: Implement Game Completion Architecture

**Why Next:** The conceptual gap you identified

**Issue:** No connection between game completion and profile

**Current Flow:**
```
Hand completes → player_statistics updates ✅
                ↓ (with Iteration 1)
                user_profiles.total_hands_played++ ✅
                
Game ends → ??? ❌
           No game entity
           No games_played increment
```

**New Architecture:**
```sql
CREATE TABLE game_summary (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL,
  game_id TEXT NOT NULL,
  host_user_id UUID,
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  total_hands INTEGER,
  players JSONB, -- [{user_id, final_stack, net_result}]
  winner_user_id UUID
);

-- Trigger on INSERT
-- → Increment user_profiles.total_games_played for all players
```

**Steps:**
1. Create migration `05_game_summary.sql`
2. Add trigger to increment games_played
3. Find where games end in code
4. Add `insertGameSummary()` call
5. Test: Play game, end it, check profile

**Success Criteria:**
- Game ends → game_summary row created
- All players' total_games_played increments
- Profile shows correct game count

**Commit Message:** `Add game_summary architecture - track completed games`

---

## 🔴 ITERATION 8: Final Integration & Testing

**Why Last:** Ensure everything works together

**Steps:**
1. Full user flow test (sign up → create → play → stats)
2. Test all host controls
3. Test friend system end-to-end
4. Test mobile basic responsiveness
5. Check for console errors
6. Check for server errors

**Success Criteria:**
- All critical flows work
- No red console errors
- Stats update correctly
- Friends system works
- Host controls work

**Commit Message:** `Integration complete - all critical features working`

---

## 📊 PROGRESS TRACKING

| Iteration | Status | Time | Commit |
|-----------|--------|------|--------|
| 1. Profile Stats | ⏳ | - | - |
| 2. Remove Email UI | ⏳ | - | - |
| 3. Friend Search | ⏳ | - | - |
| 4. Room Cleanup | ⏳ | - | - |
| 5. Host Controls | ⏳ | - | - |
| 6. Player Settings | ⏳ | - | - |
| 7. Game Summary | ⏳ | - | - |
| 8. Final Testing | ⏳ | - | - |

---

## 🎯 EXECUTION RULES

1. **Start with Iteration 1** (always)
2. **Complete fully** before moving to next
3. **Test immediately** after implementing
4. **Commit when working** (or revert if broken)
5. **Update progress table** after each iteration
6. **Document any blockers** in this file
7. **No skipping ahead** - order matters

---

## 🚨 BLOCKERS LOG

**Iteration X:** [Issue description]  
**Cause:** [Root cause]  
**Resolution:** [How fixed or workaround]  
**Time Lost:** [Duration]

---

## ✅ COMPLETION CRITERIA

**MVP is ready when:**
- ✅ All 8 iterations complete
- ✅ Profile stats update after playing
- ✅ Friends system works end-to-end
- ✅ Host controls work
- ✅ Room limit enforced
- ✅ Game completion tracked
- ✅ No critical console errors
- ✅ Basic mobile support

**Then we can:**
- Do UI consistency audit
- Mobile polish
- Notifications bell
- Deploy to production

---

**Current Iteration:** 1 (Profile Stats Sync)  
**Next Step:** Create migration SQL and have user run it

