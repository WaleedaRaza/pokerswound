# 🚀 START HERE - Sandbox Build

**You now have 29 TODOs organized into phases.**

---

## 📋 WHAT YOU HAVE

1. **TODO List** - Check your IDE's TODO panel (29 tasks)
2. **SANDBOX_BUILD_PLAN.md** - Complete guide with code examples
3. **This file** - Your starting point

---

## 🎯 WHAT TO DO NOW

### **OPTION 1: Schema Cleanup First** (Recommended)

Clean up the database before building sandbox.

**Steps:**
1. Open **Supabase Dashboard** → SQL Editor
2. Run this query to verify UUID tables are empty:

```sql
SELECT 
  (SELECT COUNT(*) FROM games) as games_count,
  (SELECT COUNT(*) FROM hands) as hands_count,
  (SELECT COUNT(*) FROM players) as players_count,
  (SELECT COUNT(*) FROM actions) as actions_count,
  (SELECT COUNT(*) FROM pots) as pots_count,
  (SELECT COUNT(*) FROM game_states) as game_states_count;
```

3. **If all UUID tables show 0 rows:**
   - Create a backup in Supabase (Database → Backups)
   - Run the cleanup SQL from `SANDBOX_BUILD_PLAN.md` (Part 1, Task 3)
   - Delete the TypeScript repo files
   - Test that server still starts

4. **Mark these TODOs complete:**
   - `schema-audit` ✅
   - `schema-backup` ✅
   - `schema-delete-uuid` ✅
   - `schema-delete-repos` ✅
   - `schema-verify` ✅

**Time Estimate:** 15-20 minutes

---

### **OPTION 2: Skip Cleanup, Start Building**

Jump straight to Phase 1a (room creation).

**Why skip cleanup?**
- UUID tables aren't causing immediate harm
- You want to see progress fast
- Can clean up later

**Start with:**
- TODO: `phase1a-create-button`
- Follow `SANDBOX_BUILD_PLAN.md` Phase 1a section

**Time Estimate:** Start seeing results in 10 minutes

---

## 🎯 MY RECOMMENDATION

**Do cleanup first.** Here's why:

1. **Clean slate** - No confusion about which tables to use
2. **Less cognitive load** - One system, not two
3. **Prevents future errors** - Won't accidentally query wrong table
4. **Fast** - Only 15-20 minutes
5. **Safe** - Tables are empty, backup exists

---

## 📞 NEXT STEPS

### If You Choose Option 1 (Cleanup):
```
1. Check TODO: schema-audit (verify empty)
2. Check TODO: schema-backup (create backup)
3. Check TODO: schema-delete-uuid (run SQL)
4. Check TODO: schema-delete-repos (delete files)
5. Check TODO: schema-verify (test server)
6. → Then move to Phase 1a
```

### If You Choose Option 2 (Build Now):
```
1. Mark schema TODOs as 'cancelled' (do later)
2. Start TODO: phase1a-create-button
3. Follow SANDBOX_BUILD_PLAN.md Phase 1a
4. Test with 2 browsers
5. → Then move to Phase 1b
```

---

## 🛡️ SAFETY NET

**If anything breaks:**
1. Stop immediately
2. Check console for errors
3. Restore from Supabase backup if needed
4. Ask for help with specific error message

---

## 📖 DOCUMENTATION

- **SANDBOX_BUILD_PLAN.md** - Complete guide with all code
- **Schemasnapshot.txt** - Your current database schema
- **TODO panel** - Track your progress (29 tasks)

---

## ✅ SUCCESS CRITERIA

**Phase 1 Complete when:**
- ✅ Can create room with shareable code
- ✅ Can join room with code
- ✅ Can claim seats (real-time updates work)
- ✅ Host can start hand (broadcasts to all)
- ✅ Refresh preserves state

**Then you move to Phase 2 (deal cards).**

---

## 🎯 READY?

**Pick your path:**

1. **"I'll do cleanup first"** → Go to Supabase, run audit query
2. **"I'll build first"** → Open `/play.html`, add create button

**Either way, work ONE TODO at a time. Test each piece.**

**No massive changes. No bandaids. Just working code, one step at a time.** ⚔️

