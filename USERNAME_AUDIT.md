# 🔍 USERNAME AUDIT - Phase 0 Assessment

**Date:** November 6, 2025  
**Purpose:** Complete assessment of current username system state  
**Status:** ✅ COMPLETE

---

## 📊 SCHEMA ANALYSIS

### **Tables with Username Columns**

#### **1. `user_profiles` Table**

**Columns Found:**
- ✅ `username` (VARCHAR, NOT NULL, UNIQUE)
- ⚠️ `global_username` (VARCHAR, NULLABLE, CHECK constraint: 3-50 chars)
- ✅ `username_changed_at` (TIMESTAMPTZ, nullable)
- ✅ `username_change_count` (INTEGER, default 0)
- ✅ `max_username_changes` (INTEGER, default 3)
- ✅ `username_set_at` (TIMESTAMP, nullable)

**Constraints:**
- `username` is **NOT NULL** (enforced by migration 17)
- `username` is **UNIQUE**
- `global_username` has CHECK constraint (3-50 chars, alphanumeric + underscore)
- `global_username` has UNIQUE INDEX (where not null)

**Status:** ⚠️ **DUAL COLUMN CONFLICT**
- `username` is primary (NOT NULL, enforced)
- `global_username` exists but is nullable
- Both have unique constraints
- Migration 18a tried to sync them but incomplete

---

#### **2. `profiles` Table** (Supabase Auth)

**Columns Found:**
- ✅ `username` (VARCHAR, NOT NULL, UNIQUE)

**Note:** This appears to be a separate table (possibly Supabase's auth schema). Need to verify if this is used or if it's just `user_profiles`.

---

#### **3. `username_changes` Table**

**Purpose:** Audit log for username changes

**Columns:**
- `old_username` (VARCHAR, nullable)
- `new_username` (VARCHAR, NOT NULL)
- `user_id` (UUID)
- `changed_at` (TIMESTAMPTZ)
- `ip_address` (INET, nullable)
- `user_agent` (TEXT, nullable)

**Status:** ✅ Exists and ready for use

---

## 💻 CODEBASE ANALYSIS

### **JavaScript Files (Routes & Public)**

#### **✅ Files Using `username` (CORRECT)**

**Backend Routes:**
1. **`routes/social.js`**
   - Line 122: `profile.username` (check if exists)
   - Line 144: `data.username` (return username)
   - Line 183: `profile.username === username` (comparison)
   - Line 206: `old_username: profile.username` (username change log)
   - Line 231: `username: data.username` (response)
   - Line 250: `.select('id, username, display_name, ...')` (query)
   - Line 251: `.eq('username', username)` (search by username)

2. **`routes/rooms.js`**
   - Line 247: `username` (from request body)
   - Line 261: `UPDATE user_profiles SET username = $1` (update username)
   - Line 298: `up.username` (seat query JOIN)
   - Line 549: `up.username` (seat broadcast)
   - Line 564: `username: seat.username` (response)
   - Line 816: `up.username` (lobby query)
   - Line 1719: `hostUsername = hostResult.rows[0]?.username` (host display)
   - Line 1797: `up.username` (seat query)

3. **`routes/games.js`**
   - Line 317: `up.username` (seat query)
   - Line 333: `winner.username` (game over log)
   - Line 347: `name: winner.username` (response)
   - Line 381: `name: seat.username` (response)

**Frontend JavaScript:**
4. **`public/js/nav-shared.js`**
   - Uses `user.username` throughout (navbar display)

5. **`public/js/auth-manager.js`**
   - Uses `profile.username` (fetched from DB)
   - Uses `user.username` (normalized user object)

6. **`public/js/friends-page.js`**
   - Line 161: `@${friend.username}` (display)
   - Line 200: `@${request.sender.username}` (display)
   - Line 287: `@${user.username}` (search result)
   - Line 297: `sendFriendRequest('${user.username}')` (button)

7. **`public/js/social-modals.js`**
   - Uses `profile.username` throughout

8. **`public/pages/play.html`**
   - Uses `friend.username`, `user.username`, `seat.username` throughout

9. **`public/poker-table-zoom-lock.html`**
   - Uses `seat.username` for player display

**Status:** ✅ **Most code uses `username` correctly**

---

#### **⚠️ Files Using `global_username` (NEEDS UPDATE)**

**TypeScript Services:**
1. **`src/services/social/FriendService.ts`**
   - Line 6: `global_username: string` (interface)
   - Line 35: `up.global_username` (query)
   - Line 54: `global_username: row.global_username` (mapping)
   - Line 68: `up.global_username as requester_username` (query)
   - Line 90: `WHERE global_username = $1` (search by global_username)

2. **`src/services/user/UsernameService.ts`**
   - Line 42: `WHERE global_username = $1` (availability check)
   - Line 80: `SELECT global_username FROM user_profiles` (get old username)
   - Line 83: `oldUsername = oldUsernameResult.rows[0]?.global_username` (extract)
   - Line 87: `SET global_username = $2` (update global_username)

3. **`src/services/user/UserProfileService.ts`**
   - Line 7: `global_username: string` (interface)
   - Line 32: `can_change_username(up.id, up.global_username)` (function call)
   - Line 69: `INSERT INTO user_profiles (id, username, global_username, ...)` (create user)
   - Line 92: `WHERE global_username ILIKE $1` (search)
   - Line 105: `global_username: row.global_username` (mapping)

4. **`src/services/game/DisplayService.ts`**
   - Line 19: `up.global_username` (query)
   - Line 44: `ELSE global_username` (fallback)
   - Line 75: `up.global_username` (query)
   - Line 100: `ELSE global_username` (fallback)

**Status:** ⚠️ **TypeScript services use `global_username` - NEEDS UPDATE**

---

## 🔍 CONFLICT ANALYSIS

### **The Problem:**

1. **Backend Routes (JavaScript):** Use `username` ✅
2. **Frontend (JavaScript):** Use `username` ✅
3. **TypeScript Services:** Use `global_username` ❌
4. **Database:** Has both columns ⚠️

### **Impact:**

- **Friend Search:** 
  - Frontend searches by `username` (routes/social.js line 250)
  - TypeScript FriendService searches by `global_username` (line 90)
  - **CONFLICT:** May not find users if columns differ

- **Friend Display:**
  - Frontend displays `friend.username` (friends-page.js line 161)
  - TypeScript returns `global_username` (FriendService.ts line 54)
  - **CONFLICT:** Frontend expects `username`, gets `global_username`

- **Username Updates:**
  - Routes update `username` (routes/auth.js line 198)
  - TypeScript updates `global_username` (UsernameService.ts line 87)
  - **CONFLICT:** Updates go to different columns

---

## 📈 DATA STATE ANALYSIS

### **Current Data State (From Schema Snapshot):**

**`user_profiles` Table:**
- `username`: NOT NULL, UNIQUE ✅
- `global_username`: NULLABLE, has CHECK constraint ⚠️

**Migration History:**
- Migration 17: Enforced `username` NOT NULL
- Migration 18a: Added `global_username`, tried to sync from `username`
- Migration 18: Also added `global_username` (duplicate?)

**Unknown (Need to Query):**
- How many users have `username`?
- How many users have `global_username`?
- How many have both?
- How many have mismatches?

**SQL to Run:**
```sql
-- Check data state
SELECT 
  COUNT(*) as total_users,
  COUNT(username) as has_username,
  COUNT(global_username) as has_global_username,
  COUNT(CASE WHEN username IS NULL THEN 1 END) as null_username,
  COUNT(CASE WHEN global_username IS NULL THEN 1 END) as null_global_username,
  COUNT(CASE WHEN username != global_username THEN 1 END) as mismatched
FROM user_profiles;
```

---

## 🎯 FINDINGS SUMMARY

### **✅ What's Working:**
1. `username` column is NOT NULL and enforced
2. Most JavaScript code uses `username` correctly
3. Frontend displays `username` correctly
4. Backend routes use `username` correctly

### **⚠️ What's Broken:**
1. TypeScript services use `global_username` instead of `username`
2. Friend search may fail (queries wrong column)
3. Friend display may show wrong data (expects `username`, gets `global_username`)
4. Username updates may go to wrong column

### **🔴 Critical Issues:**
1. **FriendService.ts** - Searches by `global_username`, but frontend searches by `username`
2. **UsernameService.ts** - Updates `global_username`, but routes update `username`
3. **DisplayService.ts** - Uses `global_username`, but frontend expects `username`

---

## 📋 FILES TO UPDATE (Phase 1)

### **Priority 1: TypeScript Services (CRITICAL)**

1. **`src/services/social/FriendService.ts`**
   - Change all `global_username` → `username`
   - Update interface (line 6)
   - Update queries (lines 35, 68, 90)
   - Update mappings (line 54)

2. **`src/services/user/UsernameService.ts`**
   - Change all `global_username` → `username`
   - Update queries (lines 42, 80, 87)

3. **`src/services/user/UserProfileService.ts`**
   - Change all `global_username` → `username`
   - Update interface (line 7)
   - Update queries (lines 32, 69, 92, 105)

4. **`src/services/game/DisplayService.ts`**
   - Change all `global_username` → `username`
   - Update queries (lines 19, 75)
   - Update fallbacks (lines 44, 100)

### **Priority 2: Verify No Other References**

- Search for any remaining `global_username` references
- Check if any migrations need updating
- Verify no database functions use `global_username`

---

## 🧪 TESTING CHECKLIST

### **After Phase 1 (Consolidate):**

- [ ] Friend search finds users by `username`
- [ ] Friend list displays usernames correctly
- [ ] Username updates work (go to `username` column)
- [ ] Player display shows usernames at table
- [ ] No TypeScript compilation errors
- [ ] No runtime errors in console

---

## 📊 METRICS

**Total Files Analyzed:** 20+  
**Files Using `username`:** 15+ ✅  
**Files Using `global_username`:** 4 ⚠️  
**Conflicts Found:** 3 🔴  
**Estimated Fix Time:** 1-2 hours

---

## ✅ PHASE 0 COMPLETE

**Status:** Assessment complete, ready for Phase 1

**Next Steps:**
1. Run data state query (if database accessible)
2. Proceed to Phase 1: Consolidate to `username` only
3. Update TypeScript services first (highest priority)
4. Test after each file update

---

**This audit provides the foundation for safe, incremental changes.**

