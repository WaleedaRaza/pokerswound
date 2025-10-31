# 🐛 DEBUG: CHIP PERSISTENCE ISSUE

## 📊 CURRENT STATUS

**Problem:** Chips show as $1000 after hand completes (should be updated)

**What I Added:**
- ✅ Detailed console logs around UPDATE queries
- ✅ RETURNING clause to verify UPDATE worked
- ✅ Verification query after all updates
- ✅ Error checking for failed UPDATEs

---

## 🧪 TEST PROCEDURE

### **1. Play a hand to showdown**
- Both players check through all streets
- Let it complete

### **2. Watch the console logs** (server terminal)

**Look for these logs:**

```bash
💰 [MINIMAL] Hand complete - persisting chips to DB
   Players in updatedState: [
     { userId: '7d3c1161', chips: 990 },
     { userId: 'bd4385b0', chips: 1010 }
   ]
   🔄 Attempting UPDATE for 7d3c1161: chips=990, roomId=75a3dd04
   ✅ Updated chips for 7d3c1161: $990
   🔄 Attempting UPDATE for bd4385b0: chips=1010, roomId=75a3dd04
   ✅ Updated chips for bd4385b0: $1010
🔍 [MINIMAL] VERIFICATION - room_seats after update:
   7d3c1161: $990
   bd4385b0: $1010
✅ [MINIMAL] Chips persisted, game marked complete, room ready for next hand
```

### **3. Check for errors**

**If you see this:**
```bash
❌ UPDATE failed - no rows matched! userId=..., roomId=...
```

**Then the problem is:**
- Wrong `userId` or `roomId` format
- Row doesn't exist in `room_seats`
- Column name mismatch

---

## 🔍 POSSIBLE ROOT CAUSES

### **Cause 1: UPDATE Never Runs**
- `updatedState.status` is not 'COMPLETED'
- Check if `handleShowdown()` sets status correctly

**Fix:** Ensure status='COMPLETED' after showdown

### **Cause 2: Wrong User IDs**
- `updatedState.players[].userId` doesn't match `room_seats.user_id`
- UUID format mismatch

**Fix:** Log both and compare

### **Cause 3: Room ID Mismatch**
- `roomId` in request doesn't match `room_seats.room_id`

**Fix:** Verify UUIDs match exactly

### **Cause 4: Transaction Rollback**
- Error later in the function rolls back UPDATE
- DB connection issues

**Fix:** Wrap in try/catch, commit explicitly

### **Cause 5: Numeric vs String Type**
- `chips_in_play` is NUMERIC but we're passing string

**Fix:** Ensure `parseInt()` or cast in SQL

### **Cause 6: "NEXT HAND" Reads Stale Data**
- Chips ARE updated in DB
- BUT frontend caches old value
- OR new hand reads before UPDATE commits

**Fix:** Add delay or query after UPDATE

---

## 🛠️ DEBUGGING STEPS

### **Step 1: Verify UPDATE Runs**
Look for this log:
```
💰 [MINIMAL] Hand complete - persisting chips to DB
```

- ✅ If present → UPDATE code is reached
- ❌ If missing → `updatedState.status !== 'COMPLETED'`

### **Step 2: Check UPDATE Result**
Look for:
```
✅ Updated chips for ...: $...
```

- ✅ If present → UPDATE succeeded
- ❌ If see "UPDATE failed - no rows matched" → ID mismatch

### **Step 3: Verify Final DB State**
Look for:
```
🔍 [MINIMAL] VERIFICATION - room_seats after update:
   ...: $990
   ...: $1010
```

- ✅ If chips are correct → DB is updated ✅
- ❌ If still $1000 → UPDATE didn't work

### **Step 4: Check "NEXT HAND" Start**
When you click "NEXT HAND", look for:
```
🎲 Starting hand with 2 players
🎴 Dealt hole cards to all players
```

Then check: **Do players start with correct chips?**

---

## 💡 LIKELY ISSUE

Based on the screenshot showing "$1000" in seats:

**Hypothesis:** The UPDATE is working, but:
1. The frontend's seat display is reading from a CACHED value
2. OR the "loadRoom()" function in `minimal-table.html` needs to be called AFTER the UPDATE completes
3. OR there's a race condition where frontend queries before UPDATE finishes

**Solution:** 
- Force frontend to refetch seats after hand completes
- Add a delay or WebSocket event to trigger seat refresh

---

## 🔧 MANUAL DB CHECK

After a hand completes, run this SQL in Supabase:

```sql
SELECT 
  rs.user_id,
  rs.seat_index,
  rs.chips_in_play,
  rs.status
FROM room_seats rs
WHERE rs.room_id = '75a3dd04-834b-4c17-942a-3e375123a64d'
ORDER BY rs.seat_index;
```

**Expected:**
- Seat 3: chips_in_play = 990 (or whatever they ended with)
- Seat 4: chips_in_play = 1010

**If you see $1000:**
- UPDATE query is failing silently
- Check server logs for errors

**If you see correct values:**
- DB is fine ✅
- Problem is frontend not refreshing

---

## 🚀 NEXT STEPS (After Debug)

Once we confirm WHERE the issue is:

**If DB UPDATE works but frontend doesn't refresh:**
→ Fix `loadRoom()` to be called after showdown
→ Add WebSocket event `chips_updated`

**If UPDATE fails:**
→ Fix SQL query / IDs / column names

**If everything works:**
→ Move to PHASE 1.3 (post-showdown period)

---

## 📝 TEST RESULTS (Fill in after test)

**Console logs observed:**
```
(paste logs here)
```

**DB query result:**
```
(paste SQL result here)
```

**Conclusion:**
- [ ] UPDATE runs but fails (no rows matched)
- [ ] UPDATE succeeds but frontend doesn't refresh
- [ ] UPDATE doesn't run at all
- [ ] Everything works, just UI bug

---

**🔥 Play a hand now and paste the console logs!**

