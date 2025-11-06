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

### **13. Add Missing hand_history Columns** 🔥
**File:** `migrations/13_add_hand_history_columns.sql`

**Why:** Backend is trying to INSERT into columns that don't exist:
- `player_ids` (UUID[])
- `winner_id` (UUID)
- `winning_hand` (TEXT)
- `hand_rank` (INTEGER)
- `board_cards` (TEXT)
- `actions_log` (JSONB)

**Run this FIRST before Migration 12!**

```sql
-- Open Supabase SQL Editor
-- Paste: migrations/13_add_hand_history_columns.sql
-- Execute
```

**Expected Output:**
```
✅ All required columns exist in hand_history table!
✅ Migration 13 complete
```

---

### **12. Best Hand Tracking** 🔥
**File:** `migrations/12_best_hand_tracking.sql`

**Why:** Creates trigger to update `user_profiles.best_hand` when better hand is won.

**Run this AFTER Migration 13!**

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

- [ ] **Step 1:** Run Migration 13 (`13_add_hand_history_columns.sql`)
- [ ] **Step 2:** Run Migration 12 (`12_best_hand_tracking.sql`)
- [ ] **Step 3:** Restart server (`Ctrl+C`, then `npm start`)
- [ ] **Step 4:** Test data flow (play 1 hand, check profile stats)

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

