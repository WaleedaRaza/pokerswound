# 🗂️ MIGRATION EXECUTION ORDER

**CRITICAL:** Run these migrations in exact order!

---

## ✅ **Already Run (Confirmed Working):**
1. ~~`01_initial_schema.sql`~~ - Base schema
2. ~~`02_identity_social_system_FIXED.sql`~~ - User profiles, friends
3. ~~`03_sync_profile_stats_COMPLETE.sql`~~ - Player stats → profile sync
4. ~~`06_profile_room_game_relationships.sql`~~ - Room participations, game completions
5. ~~`08_hand_history_and_cleanup.sql`~~ - Hand history table (partial)
6. ~~`09_remove_status_simplify.sql`~~ - Removed room status enum
7. ~~`10_fix_processed_actions_fkey.sql`~~ - Fixed foreign key ON DELETE
8. ~~`11_fix_game_complete_trigger.sql`~~ - Fixed trigger bug ✅

---

## 🔥 **MUST RUN NOW (In Order):**

### **13. Add Missing hand_history Columns** ✅
**File:** `migrations/13_add_hand_history_columns.sql`

**Status:** ✅ Already run by user

**What it did:** Added `player_ids`, `winner_id`, `winning_hand`, `hand_rank`, `board_cards`, `actions_log` to `hand_history` table.

---

### **14. Fix best_hand_rank Type** 🔥
**File:** `migrations/14_fix_best_hand_rank_type.sql`

**Why:** `user_profiles.best_hand_rank` is VARCHAR but needs to be INTEGER for comparison with `hand_history.hand_rank`.

**Run this BEFORE Migration 12!**

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

### **12. Best Hand Tracking** 🔥
**File:** `migrations/12_best_hand_tracking.sql`

**Why:** Creates trigger to update `user_profiles.best_hand` when better hand is won.

**Run this AFTER Migration 14!**

```sql
-- Open Supabase SQL Editor
-- Paste: migrations/12_best_hand_tracking.sql
-- Execute
```

**Expected Output:**
```
✅ Trigger "update_best_hand_trigger" created successfully
✅ Migration 12 complete
```

---

## 🎯 **EXECUTION CHECKLIST:**

- [x] **Step 1:** Run Migration 13 (`13_add_hand_history_columns.sql`) ✅
- [ ] **Step 2:** Run Migration 14 (`14_fix_best_hand_rank_type.sql`) 🔥 **YOU ARE HERE**
- [ ] **Step 3:** Run Migration 12 (`12_best_hand_tracking.sql`)
- [ ] **Step 4:** Restart server (`Ctrl+C`, then `npm start`)
- [ ] **Step 5:** Test data flow (play 1 hand, check profile stats)

---

## 🔍 **VERIFY SCHEMA:**

After running Migration 13, verify in Supabase SQL Editor:

```sql
-- Check hand_history columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'hand_history' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
```

**Expected Columns:**
- `id` (uuid)
- `game_id` (character varying)
- `room_id` (uuid)
- `hand_number` (integer)
- `pot_size` (bigint)
- `community_cards` (ARRAY)
- `winners` (jsonb)
- `player_actions` (jsonb)
- `final_stacks` (jsonb)
- `created_at` (timestamp)
- **✅ `player_ids` (ARRAY)** ← NEW
- **✅ `winner_id` (uuid)** ← NEW
- **✅ `winning_hand` (text)** ← NEW
- **✅ `hand_rank` (integer)** ← NEW
- **✅ `board_cards` (text)** ← NEW
- **✅ `actions_log` (jsonb)** ← NEW

---

## 🚨 **TROUBLESHOOTING:**

### **Error: "column already exists"**
✅ **Safe to ignore** - `ADD COLUMN IF NOT EXISTS` is idempotent.

### **Error: "constraint already exists"**
✅ **Safe to ignore** - `DROP CONSTRAINT IF EXISTS` handles this.

### **Error after Migration 13: Backend still fails**
❌ **Check column names match exactly** - run verification query above.

---

**READY TO RUN!** 🚀

