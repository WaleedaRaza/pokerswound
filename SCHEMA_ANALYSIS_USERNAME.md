# 🔬 HOLISTIC SCHEMA ANALYSIS - Username System

**Date:** November 6, 2025  
**Purpose:** Complete analysis before any schema changes  
**Status:** PRE-EXECUTION REVIEW

---

## 📊 CURRENT SCHEMA STATE

### **`user_profiles` Table - Username Columns**

**Column 1: `username`**
- Type: `VARCHAR`
- Nullable: **NO** (NOT NULL enforced by migration 17)
- Unique: **YES** (UNIQUE constraint)
- Index: `idx_username` (non-unique index exists)
- Status: ✅ **PRIMARY COLUMN** - This is our target

**Column 2: `global_username`**
- Type: `VARCHAR(50)`
- Nullable: **YES** (can be NULL)
- Unique: **YES** (UNIQUE INDEX where not null)
- Constraints:
  - CHECK: length between 3-50
  - CHECK: format `^[a-zA-Z0-9_-]+$`
- Indexes:
  - `user_profiles_global_username_key` (unique, partial: WHERE global_username IS NOT NULL)
  - `idx_user_profiles_global_username` (non-unique)
- Status: ⚠️ **DEPRECATED COLUMN** - Should be removed

---

## 🔍 DATA CONSISTENCY ANALYSIS

### **Migration History:**

1. **Migration 17** (enforce_username.sql):
   - Backfilled NULL usernames: `'user_' || SUBSTRING(id::text, 1, 8)`
   - Enforced NOT NULL constraint
   - **Result:** All users MUST have `username`

2. **Migration 18a** (user_profiles_enhancement.sql):
   - Added `global_username` column
   - Tried to sync: `UPDATE user_profiles SET global_username = username WHERE global_username IS NULL AND username IS NOT NULL`
   - **Result:** `global_username` populated from `username` for existing users

### **Current Data State (Unknown - Need to Query):**

**Critical Questions:**
1. Do ALL users have `username`? (Should be YES - NOT NULL enforced)
2. Do ALL users have `global_username`? (Unknown - nullable)
3. Are there mismatches? (username != global_username)
4. Are there users with `global_username` but different `username`?

**SQL to Run Before Changes:**
```sql
-- COMPREHENSIVE DATA AUDIT
SELECT 
  COUNT(*) as total_users,
  COUNT(username) as has_username,
  COUNT(global_username) as has_global_username,
  COUNT(CASE WHEN username IS NULL THEN 1 END) as null_username,
  COUNT(CASE WHEN global_username IS NULL THEN 1 END) as null_global_username,
  COUNT(CASE WHEN username != global_username THEN 1 END) as mismatched,
  COUNT(CASE WHEN global_username IS NOT NULL AND username IS NULL THEN 1 END) as global_without_username,
  COUNT(CASE WHEN username IS NOT NULL AND global_username IS NULL THEN 1 END) as username_without_global
FROM user_profiles;
```

---

## 🎯 SCHEMA CHANGES NEEDED

### **Option A: NO SCHEMA CHANGES (Safest - Recommended)**

**Approach:**
- Keep both columns
- Use `username` everywhere in code
- Mark `global_username` as deprecated (comment only)
- Remove `global_username` in future migration (after verification)

**Pros:**
- ✅ Zero risk of breaking existing data
- ✅ Can rollback easily
- ✅ No migration needed
- ✅ Can verify everything works first

**Cons:**
- ⚠️ Column exists but unused (minor storage overhead)
- ⚠️ Need to remember to remove later

**Recommendation:** ✅ **START HERE**

---

### **Option B: DATA MIGRATION ONLY (Medium Risk)**

**Approach:**
- Sync `global_username` → `username` for any mismatches
- Ensure all users have `username` populated
- Keep both columns (don't delete yet)

**Migration SQL:**
```sql
-- Step 1: Migrate global_username → username where username is NULL (shouldn't happen, but safety check)
UPDATE user_profiles
SET username = global_username
WHERE username IS NULL 
  AND global_username IS NOT NULL;

-- Step 2: Verify no NULLs remain
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count
  FROM user_profiles
  WHERE username IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Found % users without username after migration!', null_count;
  END IF;
  
  RAISE NOTICE '✅ All users have username';
END $$;
```

**Pros:**
- ✅ Ensures data consistency
- ✅ No column deletion (safe)
- ✅ Can verify before removing column

**Cons:**
- ⚠️ Requires migration execution
- ⚠️ Need to verify data first

**Recommendation:** ✅ **DO THIS AFTER OPTION A WORKS**

---

### **Option C: REMOVE `global_username` COLUMN (High Risk - Do Last)**

**Approach:**
- After all code uses `username` only
- After data is verified consistent
- Remove column, indexes, constraints

**Migration SQL:**
```sql
-- Step 1: Drop indexes
DROP INDEX IF EXISTS user_profiles_global_username_key;
DROP INDEX IF EXISTS idx_user_profiles_global_username;

-- Step 2: Drop constraints
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_global_username_len,
  DROP CONSTRAINT IF EXISTS user_profiles_global_username_format;

-- Step 3: Drop column
ALTER TABLE user_profiles 
  DROP COLUMN IF EXISTS global_username;
```

**Pros:**
- ✅ Clean schema (no unused columns)
- ✅ Removes confusion

**Cons:**
- ❌ Cannot rollback easily
- ❌ High risk if code still references it
- ❌ Need to verify ALL code updated first

**Recommendation:** ❌ **DO NOT DO THIS YET** - Wait until everything verified

---

## 🛡️ RISK ANALYSIS

### **Risk 1: Data Loss**

**Scenario:** Removing `global_username` before migrating data

**Impact:** HIGH - If users have data in `global_username` but not `username`, data is lost

**Mitigation:**
- ✅ Migration 17 already enforced NOT NULL on `username`
- ✅ Migration 18a synced `global_username` from `username`
- ✅ Should be safe, but verify data first

**Action:** Run data audit query before any changes

---

### **Risk 2: Code References**

**Scenario:** Code still references `global_username` after column removal

**Impact:** HIGH - Application breaks

**Mitigation:**
- ✅ Update all TypeScript services first
- ✅ Verify no code references `global_username`
- ✅ Test thoroughly before removing column

**Action:** Complete code updates before schema changes

---

### **Risk 3: Index Dependencies**

**Scenario:** Other queries/indexes depend on `global_username`

**Impact:** MEDIUM - Performance degradation

**Mitigation:**
- ✅ Check for foreign keys (none found)
- ✅ Check for views/materialized views (none found)
- ✅ Only indexes on `global_username` (safe to drop)

**Action:** Verify no dependencies before dropping indexes

---

### **Risk 4: Constraint Violations**

**Scenario:** NOT NULL constraint fails during migration

**Impact:** HIGH - Migration fails, system broken

**Mitigation:**
- ✅ Migration 17 already enforced NOT NULL
- ✅ All users should have `username`
- ✅ But verify with audit query first

**Action:** Run audit query, backfill if needed

---

## 📋 EXECUTION PLAN (Safe Path)

### **Phase 1: Data Audit (NO CHANGES)**

**Goal:** Understand current data state

**Actions:**
1. Run comprehensive data audit query
2. Document findings
3. Identify any inconsistencies

**Time:** 15 minutes  
**Risk:** ZERO (read-only)

---

### **Phase 2: Code Updates (NO SCHEMA CHANGES)**

**Goal:** All code uses `username` only

**Actions:**
1. Update TypeScript services (4 files)
2. Remove `global_username` references
3. Test all functionality
4. Verify friend search works
5. Verify username display works

**Time:** 2-3 hours  
**Risk:** LOW (code changes only, no schema)

---

### **Phase 3: Data Sync (OPTIONAL - Only if needed)**

**Goal:** Ensure data consistency

**Actions:**
1. Run data sync migration (if mismatches found)
2. Verify all users have `username`
3. Test again

**Time:** 30 minutes  
**Risk:** LOW (data migration, no column deletion)

---

### **Phase 4: Mark Deprecated (NO SCHEMA CHANGES)**

**Goal:** Document `global_username` as deprecated

**Actions:**
1. Add comment to column
2. Update documentation
3. Keep column for rollback safety

**Time:** 5 minutes  
**Risk:** ZERO (comment only)

---

### **Phase 5: Remove Column (FUTURE - After Verification)**

**Goal:** Clean up schema

**Actions:**
1. Wait 1-2 weeks after Phase 2
2. Verify no issues reported
3. Remove column, indexes, constraints
4. Final cleanup

**Time:** 30 minutes  
**Risk:** MEDIUM (irreversible)

---

## ✅ RECOMMENDED APPROACH

### **START WITH: Option A (No Schema Changes)**

**Why:**
1. Zero risk to existing data
2. Can verify everything works first
3. Easy rollback if issues
4. No migration execution needed

**Steps:**
1. ✅ Update code to use `username` only (already started)
2. ✅ Test thoroughly
3. ✅ Mark `global_username` as deprecated (comment)
4. ✅ Wait and verify
5. ✅ Remove column later (future migration)

---

## 🚨 CRITICAL CHECKS BEFORE EXECUTION

### **Pre-Flight Checklist:**

- [ ] Run data audit query (understand current state)
- [ ] Verify NOT NULL constraint is active
- [ ] Verify all users have `username` (should be 100%)
- [ ] Check for any `global_username` without `username` (should be 0%)
- [ ] Document current data state
- [ ] Backup database (if possible)
- [ ] Update all code first (before any schema changes)
- [ ] Test all functionality
- [ ] Verify friend search works
- [ ] Verify username display works
- [ ] Only then consider schema changes

---

## 📊 DECISION MATRIX

| Option | Risk | Time | Reversible | Recommended |
|--------|------|------|------------|-------------|
| A: No Changes | ✅ ZERO | 0 min | ✅ Yes | ✅ **START HERE** |
| B: Data Sync | ⚠️ LOW | 30 min | ✅ Yes | ✅ Do if needed |
| C: Remove Column | ❌ HIGH | 30 min | ❌ No | ❌ Do last |

---

## 🎯 FINAL RECOMMENDATION

**DO NOT MAKE SCHEMA CHANGES YET**

**Instead:**
1. ✅ Update code to use `username` only (in progress)
2. ✅ Test everything works
3. ✅ Mark `global_username` as deprecated (comment)
4. ✅ Keep column for safety
5. ✅ Remove in future migration (after 1-2 weeks verification)

**Why:**
- Zero risk approach
- Can verify everything works first
- Easy rollback
- No data loss possible
- No breaking changes

**Schema changes can wait. Code changes are the priority.**

---

**This analysis ensures we don't break anything. Safety first.**

