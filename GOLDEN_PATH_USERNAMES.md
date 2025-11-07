# 🏆 GOLDEN PATH: Usernames & Profile System

**Date:** November 6, 2025  
**Purpose:** Safe, incremental approach to robust usernames and profile system  
**Philosophy:** One change at a time, test after each, never break production

---

## 🎯 THE PROBLEM

You tried to do too much at once:
- ✅ Username NOT NULL enforcement
- ✅ Profile modality (global vs per-game)
- ✅ Game tracking via serialization
- ✅ Friends system
- ✅ Stats/analytics
- ✅ Data flow extraction

**Result:** 8 hours fixing broken codebase.

**Root Causes:**
1. **Dual username columns** (`username` + `global_username`) - confusing which to use
2. **NOT NULL too early** - enforced before all code updated
3. **Cascade failures** - friends system broke when username changed
4. **No rollback plan** - changes couldn't be undone safely

---

## 🗺️ THE GOLDEN PATH (Safe Incremental Steps)

### **PHASE 0: ASSESSMENT** (30 min)

**Goal:** Understand current state before making changes

**Tasks:**
1. **Audit Current Schema**
   ```sql
   -- Check what username columns exist
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = 'user_profiles' 
     AND column_name LIKE '%username%';
   
   -- Check current data
   SELECT 
     COUNT(*) as total_users,
     COUNT(username) as has_username,
     COUNT(global_username) as has_global_username,
     COUNT(CASE WHEN username IS NULL THEN 1 END) as null_username,
     COUNT(CASE WHEN global_username IS NULL THEN 1 END) as null_global_username
   FROM user_profiles;
   ```

2. **Find All Username References**
   ```bash
   # Search codebase for username usage
   grep -r "username" routes/ public/ src/ --include="*.js" --include="*.ts"
   grep -r "global_username" routes/ public/ src/ --include="*.js" --include="*.ts"
   ```

3. **Document Current State**
   - Which column is used where?
   - Are there conflicts?
   - What breaks if we change one?

**Success Criteria:**
- ✅ Know exactly which columns exist
- ✅ Know which code uses which column
- ✅ Know current data state (NULL counts)

**Output:** `USERNAME_AUDIT.md` document

---

### **PHASE 1: CONSOLIDATE TO ONE COLUMN** (2-3 hours)

**Goal:** Use `username` everywhere, deprecate `global_username`

**Why This First:**
- Having two columns causes confusion
- Code doesn't know which to use
- Friends system might query wrong one

**Steps:**

#### **Step 1.1: Backfill Missing Usernames** (15 min)

```sql
-- Migration: 18_consolidate_usernames.sql

-- Part 1: Migrate global_username → username where username is NULL
UPDATE user_profiles
SET username = global_username
WHERE username IS NULL 
  AND global_username IS NOT NULL;

-- Part 2: Generate usernames for users with neither
UPDATE user_profiles
SET username = 'user_' || SUBSTRING(id::text, 1, 8)
WHERE username IS NULL;

-- Part 3: Verify no NULLs remain
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM user_profiles
  WHERE username IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % users without username after backfill!', null_count;
  END IF;
  
  RAISE NOTICE '✅ All users have username';
END $$;
```

**Test:**
```sql
SELECT COUNT(*) FROM user_profiles WHERE username IS NULL;
-- Should return 0
```

**Success Criteria:**
- ✅ All users have `username` populated
- ✅ No NULL usernames remain

---

#### **Step 1.2: Update Code to Use `username` Only** (1-2 hours)

**Files to Update:**

1. **`routes/social.js`** - Friend search
   ```javascript
   // BEFORE:
   .select('global_username, display_name, ...')
   
   // AFTER:
   .select('username, display_name, ...')
   ```

2. **`src/services/social/FriendService.ts`** - Friend queries
   ```typescript
   // BEFORE:
   up.global_username,
   
   // AFTER:
   up.username,
   ```

3. **`public/js/friends-page.js`** - Frontend display
   ```javascript
   // BEFORE:
   <div class="result-name">@${user.global_username}</div>
   
   // AFTER:
   <div class="result-name">@${user.username}</div>
   ```

4. **`routes/auth.js`** - Profile endpoints
   ```javascript
   // Ensure all queries return 'username', not 'global_username'
   ```

**Test After Each File:**
- Run server
- Test friend search
- Verify username displays correctly
- Check no errors in console

**Success Criteria:**
- ✅ All code uses `username` column
- ✅ No references to `global_username` in active code
- ✅ Friends system works
- ✅ Profile displays work

---

#### **Step 1.3: Mark `global_username` as Deprecated** (15 min)

```sql
-- Add comment to column (documentation)
COMMENT ON COLUMN user_profiles.global_username IS 
  'DEPRECATED: Use username instead. Will be removed in future migration.';
```

**Don't delete yet** - keep for rollback safety.

**Success Criteria:**
- ✅ Column marked deprecated
- ✅ No code uses it
- ✅ Column still exists (for rollback)

---

### **PHASE 2: ENFORCE NOT NULL SAFELY** (1 hour)

**Goal:** Make username required, but only after code is ready

**Why This Order:**
- Code must handle usernames first
- Then enforce at database level
- Prevents constraint violations

**Steps:**

#### **Step 2.1: Verify All Code Handles Usernames** (30 min)

**Checklist:**
- [ ] User creation sets username (auth flows)
- [ ] Guest users get auto-generated username
- [ ] Profile updates can change username
- [ ] Friends search uses username
- [ ] Room display shows username
- [ ] Game history tracks username

**Test Each Flow:**
1. Create new user → Has username?
2. Guest login → Gets username?
3. Search friends → Finds by username?
4. Update profile → Can change username?

**Success Criteria:**
- ✅ All flows handle username
- ✅ No code assumes username can be NULL
- ✅ All tests pass

---

#### **Step 2.2: Enforce NOT NULL** (15 min)

```sql
-- Migration: 19_enforce_username_not_null.sql

-- Already done in migration 17, but verify:
ALTER TABLE user_profiles 
  ALTER COLUMN username SET NOT NULL;

-- Verify constraint exists
SELECT 
  constraint_name, 
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'user_profiles' 
  AND constraint_name LIKE '%username%';
```

**Test:**
```sql
-- This should fail:
INSERT INTO user_profiles (id) VALUES (gen_random_uuid());
-- Error: null value in column "username" violates not-null constraint
```

**Success Criteria:**
- ✅ NOT NULL constraint active
- ✅ Cannot insert user without username
- ✅ Existing users all have username

---

### **PHASE 3: PROFILE MODALITY** (3-4 hours)

**Goal:** Support both global profile and per-game nicknames

**Architecture:**
```
user_profiles.username        → Global identity (for friends, search)
room_seats.nickname          → Per-game display name
player_aliases.alias         → Historical game-specific names
```

**Why This Order:**
- Username must be stable first
- Then add nickname layer on top
- Don't mix the two

**Steps:**

#### **Step 3.1: Verify `room_seats.nickname` Column** (15 min)

```sql
-- Check if column exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'room_seats' 
  AND column_name = 'nickname';

-- If missing, add it:
ALTER TABLE room_seats 
  ADD COLUMN IF NOT EXISTS nickname VARCHAR(15) 
  CHECK (nickname IS NULL OR (length(nickname) >= 3 AND length(nickname) <= 15));
```

**Success Criteria:**
- ✅ `room_seats.nickname` exists
- ✅ Can be NULL (optional)
- ✅ Has length constraints

---

#### **Step 3.2: Update Seat Display Logic** (1 hour)

**Files:**
- `routes/rooms.js` - Seat broadcasts
- `public/poker-table-zoom-lock.html` - Player display

**Logic:**
```javascript
// Display priority:
const displayName = seat.nickname || user.username || 'Player';
```

**Test:**
- Join room with nickname → Shows nickname
- Join room without nickname → Shows username
- Change nickname → Updates display

**Success Criteria:**
- ✅ Nickname displays when set
- ✅ Falls back to username
- ✅ Updates in real-time

---

#### **Step 3.3: Add Nickname Setting UI** (1-2 hours)

**Files:**
- `public/poker-table-zoom-lock.html` - Settings modal
- `routes/rooms.js` - Update nickname endpoint

**UI Flow:**
1. Player clicks "Settings" in seat
2. Modal shows: "Display Name" input
3. Save → Updates `room_seats.nickname`
4. Broadcasts `seat_update` to room

**Test:**
- Set nickname → Appears at table
- Other players see nickname
- Refresh → Nickname persists

**Success Criteria:**
- ✅ Can set nickname per game
- ✅ Visible to all players
- ✅ Persists across refresh

---

### **PHASE 4: FRIENDS SYSTEM** (2-3 hours)

**Goal:** Robust friend system using stable usernames

**Why After Username Consolidation:**
- Friends search needs reliable username
- Friend requests use username
- Can't work if username is unstable

**Steps:**

#### **Step 4.1: Verify Friends Schema** (15 min)

```sql
-- Check friendships table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'friendships';

-- Should have:
-- - requester_id (UUID)
-- - addressee_id (UUID)
-- - status (VARCHAR)
```

**Success Criteria:**
- ✅ `friendships` table exists
- ✅ Has correct columns
- ✅ Has indexes on user_id columns

---

#### **Step 4.2: Friend Search by Username** (1 hour)

**Files:**
- `routes/social.js` - `/api/social/username/:username`
- `public/js/friends-page.js` - Search UI

**Query:**
```sql
SELECT id, username, display_name, avatar_url
FROM user_profiles
WHERE LOWER(username) = LOWER($1)
  AND id != $2  -- Exclude self
LIMIT 1;
```

**Test:**
- Search existing username → Found
- Search non-existent → 404
- Search own username → Not found (or handled)

**Success Criteria:**
- ✅ Search finds users by username
- ✅ Case-insensitive
- ✅ Returns profile data

---

#### **Step 4.3: Friend Request Flow** (1-2 hours)

**Endpoints:**
- `POST /api/social/friends/request` - Send request
- `GET /api/social/friends/requests` - List pending
- `POST /api/social/friends/accept/:id` - Accept
- `DELETE /api/social/friends/:id` - Remove

**Test Flow:**
1. User A searches User B
2. User A sends friend request
3. User B sees pending request
4. User B accepts
5. Both see each other in friends list

**Success Criteria:**
- ✅ Requests sent/received
- ✅ Accept works
- ✅ Friends list updates
- ✅ Notifications work (if implemented)

---

### **PHASE 5: STATS & ANALYTICS** (4-6 hours)

**Goal:** Profile stats that persist and display correctly

**Why Last:**
- Depends on stable username
- Needs game tracking working
- Can build on top of stable foundation

**Steps:**

#### **Step 5.1: Verify Stats Tables** (30 min)

```sql
-- Check player_statistics table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'player_statistics';

-- Should track:
-- - total_games_played
-- - total_hands_played
-- - total_wins
-- - win_rate
-- - etc.
```

**Success Criteria:**
- ✅ `player_statistics` table exists
- ✅ Has all needed columns
- ✅ Linked to `user_profiles.id`

---

#### **Step 5.2: Stats Aggregation** (2-3 hours)

**Files:**
- `routes/social.js` - Stats endpoints
- `public/pages/analysis.html` - Stats display

**Aggregation Logic:**
```sql
-- Update stats after each hand
UPDATE player_statistics
SET 
  total_hands_played = total_hands_played + 1,
  total_wins = total_wins + CASE WHEN won THEN 1 ELSE 0 END,
  win_rate = (total_wins::DECIMAL / NULLIF(total_hands_played, 0)) * 100
WHERE user_id = $1;
```

**Test:**
- Play hand → Stats update
- Win hand → Win count increases
- View profile → Stats display correctly

**Success Criteria:**
- ✅ Stats update after each hand
- ✅ Win rate calculates correctly
- ✅ Profile displays stats

---

#### **Step 5.3: Analytics Page** (2-3 hours)

**Files:**
- `public/pages/analysis.html` - Main page
- `public/js/analysis-page.js` - Data fetching

**Features:**
- Hand history viewer
- Game history viewer
- Statistics dashboard
- Charts/graphs (optional)

**Test:**
- View own stats → Correct data
- View hand history → Past hands shown
- Filter by date → Works

**Success Criteria:**
- ✅ Analytics page loads
- ✅ Shows correct data
- ✅ Hand history accessible

---

### **PHASE 6: GAME TRACKING VIA SERIALIZATION** (6-8 hours)

**Goal:** Efficient hand history storage using PHE encoding

**Why Last:**
- Most complex feature
- Depends on everything else working
- Can be added incrementally

**Steps:**

#### **Step 6.1: Verify Hand History Tables** (30 min)

```sql
-- Check hand_history table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'hand_history';

-- Should have:
-- - encoded_hand (TEXT) - PHE encoded
-- - game_id
-- - room_id
-- - player_ids (ARRAY)
-- - actions_log (JSONB)
```

**Success Criteria:**
- ✅ `hand_history` table exists
- ✅ Has `encoded_hand` column
- ✅ Has all needed fields

---

#### **Step 6.2: Implement PHE Encoding** (3-4 hours)

**Files:**
- `src/services/hand-encoding.ts` - Encoding logic
- `routes/games.js` - Save hand after completion

**Encoding Format:**
```
PHE Format: [game_type][players][actions][board][winners]
Example: "TH_2_ABC_XYZ_12345_67890_W"
```

**Test:**
- Complete hand → Encoded
- Store in database → Saved
- Retrieve → Decodes correctly

**Success Criteria:**
- ✅ Hands encode to compact format
- ✅ Storage reduced (80% target)
- ✅ Can decode back to full data

---

#### **Step 6.3: Hand History Viewer** (2-3 hours)

**Files:**
- `public/pages/analysis.html` - History section
- `public/js/hand-history-viewer.js` - Decode & display

**Features:**
- List of past hands
- Click to view details
- Replay actions (optional)

**Test:**
- View hand history → List shown
- Click hand → Details displayed
- Decode works → Full hand data shown

**Success Criteria:**
- ✅ Hand history displays
- ✅ Can view individual hands
- ✅ Decoding works correctly

---

## 🛡️ SAFETY PRINCIPLES

### **1. One Change at a Time**
- Never do multiple phases simultaneously
- Test after each step
- Commit after each successful test

### **2. Backward Compatibility**
- Keep old columns until new code works
- Don't delete until verified
- Allow rollback path

### **3. Data Safety First**
- Always backfill before enforcing constraints
- Never lose existing data
- Test with production-like data

### **4. Incremental Testing**
- Test each file change immediately
- Don't wait until "everything is done"
- Fix bugs as you find them

### **5. Rollback Plan**
- Each migration should be reversible
- Keep old code commented (not deleted)
- Document rollback steps

---

## 📋 TESTING CHECKLIST

### **After Each Phase:**

**Phase 1 (Consolidate):**
- [ ] All users have username
- [ ] Friends search works
- [ ] Profile displays username
- [ ] No `global_username` references in code

**Phase 2 (NOT NULL):**
- [ ] Cannot create user without username
- [ ] Guest users get auto-username
- [ ] Existing users unaffected

**Phase 3 (Nicknames):**
- [ ] Can set nickname per game
- [ ] Nickname displays at table
- [ ] Falls back to username
- [ ] Persists across refresh

**Phase 4 (Friends):**
- [ ] Search finds users
- [ ] Can send friend request
- [ ] Can accept request
- [ ] Friends list works

**Phase 5 (Stats):**
- [ ] Stats update after hands
- [ ] Profile shows stats
- [ ] Analytics page works
- [ ] Hand history displays

**Phase 6 (Serialization):**
- [ ] Hands encode correctly
- [ ] Storage reduced
- [ ] Can decode hands
- [ ] History viewer works

---

## 🚨 COMMON PITFALLS TO AVOID

### **Pitfall 1: Enforcing NOT NULL Too Early**
**Mistake:** Add NOT NULL before code handles it  
**Result:** Constraint violations, broken user creation  
**Fix:** Backfill first, then enforce

### **Pitfall 2: Dual Username Columns**
**Mistake:** Keep both `username` and `global_username`  
**Result:** Code doesn't know which to use  
**Fix:** Consolidate to one column first

### **Pitfall 3: Cascade Changes**
**Mistake:** Change username system while friends system uses it  
**Result:** Friends system breaks  
**Fix:** Stabilize username first, then build friends on top

### **Pitfall 4: No Rollback Plan**
**Mistake:** Delete old code/columns immediately  
**Result:** Can't undo if something breaks  
**Fix:** Keep deprecated code until verified

### **Pitfall 5: Testing Everything at Once**
**Mistake:** Make all changes, then test  
**Result:** Don't know what broke  
**Fix:** Test after each small change

---

## 📊 ESTIMATED TIMELINE

| Phase | Time | Risk Level |
|-------|------|------------|
| Phase 0: Assessment | 30 min | Low |
| Phase 1: Consolidate | 2-3 hours | Medium |
| Phase 2: NOT NULL | 1 hour | Low |
| Phase 3: Nicknames | 3-4 hours | Low |
| Phase 4: Friends | 2-3 hours | Medium |
| Phase 5: Stats | 4-6 hours | Medium |
| Phase 6: Serialization | 6-8 hours | High |
| **TOTAL** | **18-25 hours** | |

**With proper testing and incremental approach:**
- **Best case:** 18 hours (everything works first try)
- **Realistic:** 25 hours (some debugging needed)
- **Worst case:** 35 hours (major issues found)

**Previous attempt:** 8 hours fixing broken code  
**This approach:** 25 hours doing it right  
**Time saved:** Not breaking things = faster overall

---

## 🎯 SUCCESS METRICS

### **Technical:**
- ✅ Single `username` column (no `global_username`)
- ✅ NOT NULL enforced
- ✅ All code uses same column
- ✅ Friends system works
- ✅ Stats persist correctly
- ✅ Hand history stored efficiently

### **User Experience:**
- ✅ Users can set username
- ✅ Username searchable for friends
- ✅ Can use nickname per game
- ✅ Profile shows stats
- ✅ Hand history accessible
- ✅ No broken features

### **Code Quality:**
- ✅ No duplicate username logic
- ✅ Consistent column usage
- ✅ Clear data flow
- ✅ Testable components
- ✅ Rollback possible

---

## 📝 HANDOFF NOTES

**For Next Agent (Executor Mode):**

1. **Start with Phase 0** - Don't skip assessment
2. **One phase at a time** - Don't jump ahead
3. **Test after each step** - Not at the end
4. **Commit after each phase** - Not all at once
5. **If stuck >30 min** - Revert, reassess, ask questions

**Critical Files:**
- `routes/social.js` - Friend search
- `routes/auth.js` - Profile endpoints
- `public/js/friends-page.js` - Friend UI
- `src/services/social/FriendService.ts` - Friend logic

**Database Tables:**
- `user_profiles` - Main profile (username here)
- `room_seats` - Per-game nicknames
- `friendships` - Friend relationships
- `player_statistics` - User stats
- `hand_history` - Past hands

---

## 🏁 FINAL CHECKLIST

Before declaring success:

- [ ] All users have username (no NULLs)
- [ ] Only `username` column used (no `global_username`)
- [ ] Friends search works
- [ ] Friend requests work
- [ ] Nicknames work per game
- [ ] Stats update correctly
- [ ] Analytics page works
- [ ] Hand history stores/retrieves
- [ ] No broken existing features
- [ ] All tests pass
- [ ] Code reviewed
- [ ] Documentation updated

---

**This is the golden path. Follow it, and you won't break things.**

**Remember:** Slow and steady wins the race. One change at a time.

