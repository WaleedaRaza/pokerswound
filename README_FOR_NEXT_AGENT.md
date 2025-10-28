# 👋 README FOR NEXT AGENT

**Welcome. You have been assigned to complete PokerGeek.AI MVP.**

**Current Status:** 95% complete, one bug blocking launch

**Your Mission:** Fix hydration query, ship the game

**Time Estimate:** 2-4 hours if fix works, 4-8 if complications

---

## ⚡ ULTRA QUICK START (5 Minutes to First Action)

### **Read This:**
1. **What's broken:** Hydration endpoint (routes/rooms.js:350) queries empty `games` table instead of full `game_states` table
2. **Impact:** Game starts backend, but frontend can't see it (returns hasGame: false)
3. **Fix:** Change ONE query to use game_states, extract from current_state JSONB
4. **Where:** See Document 04 (04_COMMANDMENTS_AND_PATH_FORWARD.md) Phase 1 for exact code

### **Do This:**
1. Open routes/rooms.js
2. Find line 350 (SELECT FROM games...)
3. Replace with: SELECT FROM game_states...
4. Extract hand/player data from current_state JSONB (code in Doc 04)
5. Save, restart server
6. Test: Create room → Claim seats → Start hand
7. Check browser console for: `hasGame: true`

### **Report:**
- If cards appear on screen: ✅ SUCCESS - Test more
- If still empty: ❌ Check database, verify game_states has data
- If new error: Debug that specific error

---

## 📚 COMPLETE DOCUMENTATION SET

**Created by Octavian (Session #12):**

### **00_START_HERE.md**
Entry point, master index, quick reference

### **01_GOALS_AND_FEATURES.md (230 lines)**
Every feature from MVP to platform dominance

### **02_CURRENT_STATE_ANALYSIS.md (450 lines)**
Brutal honesty - what works, what's broken, why

### **03_HISTORY_AND_FAILURES.md (320 lines)**
10+ failed attempts, 84 hours wasted, lessons learned

### **04_COMMANDMENTS_AND_PATH_FORWARD.md (380 lines)**
Immutable truths + exact code fixes (COPY-PASTE READY)

### **05_COMPLETE_FILE_DIRECTORY.md (340 lines)**
Every file explained (purpose, status, dependencies)

### **06_SYSTEM_ARCHITECTURE.md (450 lines)**
Architecture diagrams, data flows, all connections

---

## 🎯 YOUR IMMEDIATE TASK

**Don't:**
- Add new features
- Refactor code
- Rebuild UI
- Try creative solutions
- Claim it works without testing

**Do:**
1. Fix hydration query (30 min)
2. Test that one thing (10 min)
3. Report exact results (5 min)
4. If works: Test more, ship
5. If fails: Debug that specific failure

---

## 🔍 DIAGNOSTIC QUICK CHECKS

### **Before Coding:**

**Check 1: Database has data?**
```sql
SELECT id, room_id, current_state FROM game_states WHERE room_id = 'xxx';
-- Should return rows
```

**Check 2: Current query returns empty?**
```sql
SELECT * FROM games WHERE room_id = 'xxx';
-- Returns 0 rows (this is the bug)
```

**Check 3: Server running?**
```bash
node sophisticated-engine-server.js
# Should show: "🚀 SOPHISTICATED POKER ENGINE running on port 3000"
```

---

### **After Coding:**

**Check 1: Does hydration return game?**
```
Browser console after fetchHydration():
📊 Hydration data: { hasGame: ??? }
-- Should be TRUE
```

**Check 2: Do cards appear?**
```
Visual check: Screen should show cards like D6, H3
Not just: Empty seat selection
```

**Check 3: Can you take action?**
```
Click FOLD/CALL/RAISE
Check: Does it process?
```

---

## 🚨 IF YOU GET STUCK

### **After 2 Failed Attempts:**
- STOP coding
- Read Document 03 (History & Failures)
- Check: Have you made same mistake as previous agent?
- Step back, look at system holistically

### **If Hydration Fix Doesn't Work:**
- Check: Is data in game_states table?
- Check: Is query syntax correct?
- Check: Is JSONB extraction working?
- Check: Does response format match frontend expectations?

### **If Totally Lost:**
- Read all 6 documents (90 min investment)
- Map the actual data flow
- Trace one request end-to-end
- Find where it breaks

---

## 📊 EVIDENCE-BASED DEBUGGING

**Don't assume. Verify everything.**

### **Terminal Evidence:**
```
✅ Game created successfully
✅ Hand started
🃏 Cards dealt
```
**Meaning:** Backend works

### **Browser Console Evidence:**
```
📊 Hydration data: { hasGame: false }
```
**Meaning:** Hydration returns wrong data

### **Database Evidence:**
```sql
SELECT COUNT(*) FROM game_states;  -- Returns: 5+
SELECT COUNT(*) FROM games;        -- Returns: 0
```
**Meaning:** game_states has data, games doesn't

**Conclusion:** Query wrong table

---

## 🎖️ SUCCESS METRICS

**You've succeeded when:**
- User creates room, claims seat, starts game
- Cards appear on screen (not seat selection)
- User can fold/call/raise
- User refreshes → Same state restored
- User says "IT WORKS!"

**Don't claim success before user confirmation.**

---

## 💬 FINAL WORDS FROM OCTAVIAN

I spent 12 hours on this.

I didn't fix the game (failed at execution).

But I documented everything (succeeded at analysis).

**You have:**
- Complete system map
- Exact bug location
- Specific fix code
- All context preserved
- No information loss

**The game is fixable.**

**The path is clear.**

**You just need to walk it.**

**One step at a time.**

**Good luck.** ⚔️

---

**Start with:** 00_START_HERE.md  
**Then:** Make ONE change  
**Then:** Test  
**Then:** Report

**That's the way forward.**

