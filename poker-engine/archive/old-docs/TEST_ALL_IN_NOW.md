# 🎯 ALL-IN TEST PROCEDURE

## ✅ Server Status: RUNNING with DIAGNOSTIC LOGGING

Port: **3002**  
Process ID: **35912**  
Logging: **VERBOSE MODE ENABLED**

---

## 🔍 WHAT WE ADDED (Diagnostic Logging)

### 1. **After Every Action** (`POST /api/games/:id/actions`)
```
🔍 POST-ACTION STATE:
  Current bet: <amount>
  Players:
    Player Name: { betThisStreet, stack, isAllIn, hasFolded }
  isBettingComplete (raw from engine): true/false
```

### 2. **All-In Edge Case Detection**
```
🔍 ALL-IN EDGE CASE DETECTED:
  All-in players: [names]
  Non-all-in player: <name>
  Current bet: <amount>
  Player bet this street: <amount>
  Needs to act? true/false
  
🔧 OVERRIDING: <player> must act before street advances
   isBettingComplete changed from TRUE to FALSE
```

### 3. **Legal Actions Request** (`GET /api/games/:id/legal-actions`)
```
🔍 LEGAL ACTIONS REQUEST:
  Player: <name>
  Current bet: <amount>
  Player bet this street: <amount>
  Player stack: <amount>
  Player isAllIn: true/false
  Raw actions from engine: [actions]
  ✅ Final legal actions returned: [actions]
```

---

## 🧪 TEST PROCEDURE

### STEP 1: Open 2 Browser Windows
1. **Window 1 (Host):** Open http://localhost:3002/poker (regular browser)
2. **Window 2 (Guest):** Open http://localhost:3002/poker (incognito/private)
3. **In BOTH windows:** Press F12 to open Developer Console

### STEP 2: Create & Join Game
1. **Window 1:** Register/Login → Create Game
2. **Window 2:** Register/Login → Join Game (use invite code)
3. **Window 1:** Approve the guest
4. **Window 1:** Claim Seat 0 ($500)
5. **Window 2:** Claim Seat 1 ($500)

### STEP 3: Start Hand
1. **Window 1 (Host):** Click "Start Game"
2. **Verify both windows show:**
   - Cards dealt
   - Blinds posted (Player 0: $1 SB, Player 1: $2 BB)
   - Action on Player 0 (has button + SB in heads-up)

### STEP 4: TEST ALL-IN

#### Scenario A: Player 0 Goes All-In
1. **Window 1 (Player 0):** Click **ALL_IN** button
2. **Immediately check SERVER LOGS** for:
   ```
   🔍 POST-ACTION STATE:
     Current bet: 500  <-- Should be $500
     Players:
       Player 0: { betThisStreet: 500, stack: 0, isAllIn: true }
       Player 1: { betThisStreet: 2, stack: 498, isAllIn: false }
     isBettingComplete (raw from engine): true  <-- Engine says TRUE (wrong!)
   
   🔍 ALL-IN EDGE CASE DETECTED:
     All-in players: [Player 0]
     Non-all-in player: Player 1
     Current bet: 500
     Player bet this street: 2
     Needs to act? true  <-- YES! $2 < $500
   
   🔧 OVERRIDING: Player 1 must act before street advances
      isBettingComplete changed from TRUE to FALSE  <-- Our fix!
   ```

3. **Check Window 2 (Player 1):**
   - Should see "Your Turn" indicator
   - Should see legal actions request in console
   
4. **Check SERVER LOGS again**:
   ```
   🔍 LEGAL ACTIONS REQUEST:
     Player: Player 1
     Current bet: 500
     Player bet this street: 2
     Player stack: 498
     Player isAllIn: false
     Raw actions from engine: [...]
     ✅ Final legal actions returned: ['FOLD', 'CALL', 'ALL_IN']  <-- NO CHECK!
   ```

5. **Check Window 2 buttons:**
   - ✅ Should see: **FOLD** | **CALL $498** | **ALL_IN**
   - ❌ Should NOT see: **CHECK**

#### Expected Result:
- ✅ Player 1 sees correct buttons (FOLD, CALL, ALL_IN)
- ✅ No CHECK button
- ✅ Game waits for Player 1 to act
- ✅ Street does NOT advance yet

#### Scenario B: Player 1 Calls the All-In
1. **Window 2 (Player 1):** Click **CALL $498**
2. **Check SERVER LOGS:**
   ```
   🔍 POST-ACTION STATE:
     Current bet: 500
     Players:
       Player 0: { betThisStreet: 500, stack: 0, isAllIn: true }
       Player 1: { betThisStreet: 500, stack: 0, isAllIn: true }  <-- Matched!
     isBettingComplete (raw from engine): true
   
   🔍 ALL-IN EDGE CASE DETECTED:
     All-in players: [Player 0, Player 1]
     Non-all-in player: (none - length is 0)  <-- No override needed
   
   ✅ Sophisticated betting round complete - advancing street
   ```

3. **Both windows should show:**
   - Flop cards appear
   - Turn card appears
   - River card appears
   - Showdown happens
   - Winner announced
   - Stacks updated

---

## 🐛 ISSUES TO LOOK FOR

### Issue 1: CHECK Button Appears After All-In
**Symptom:** Player 2 sees CHECK button instead of CALL
**Log to check:**
```
✅ Final legal actions returned: [...]
```
**Should contain:** `['FOLD', 'CALL', 'ALL_IN']`  
**Should NOT contain:** `['CHECK']`

### Issue 2: Street Advances Before Player Acts
**Symptom:** Player 2 never gets to act, game jumps to flop
**Log to check:**
```
🔍 ALL-IN EDGE CASE DETECTED:
  Needs to act? true
```
**Should see:** `🔧 OVERRIDING: Player 1 must act before street advances`

### Issue 3: Duplicate Buttons
**Symptom:** Action buttons appear twice
**Frontend check:** Look for `isUpdatingActions` in browser console
**Should see:** Flag prevents concurrent updates

### Issue 4: Game Ends Immediately
**Symptom:** Game ends without Player 2 acting
**Log to check:** Should NOT see `🏆 Hand is complete!` until AFTER Player 2 acts

---

## 📋 CHECKLIST

After testing, answer these:

- [ ] Did Player 0 ALL_IN execute correctly? (stack = 0, isAllIn = true)
- [ ] Did SERVER LOG show "ALL-IN EDGE CASE DETECTED"?
- [ ] Did SERVER LOG show "OVERRIDING: ... must act before street advances"?
- [ ] Did Player 1 see CALL button (not CHECK)?
- [ ] Did Player 1 see correct CALL amount ($498)?
- [ ] Did game WAIT for Player 1 to act (street didn't advance)?
- [ ] After Player 1 CALL, did both players become all-in?
- [ ] After both all-in, did streets advance automatically?
- [ ] Did showdown happen correctly?
- [ ] Did winner get paid correctly?

---

## 📤 REPORT RESULTS

**If it WORKS:**
✅ Paste the server logs showing:
- POST-ACTION STATE (after all-in)
- ALL-IN EDGE CASE DETECTED
- OVERRIDING message
- LEGAL ACTIONS REQUEST (for Player 1)
- Final legal actions returned

**If it FAILS:**
❌ Tell me:
1. Which step failed?
2. What did you see vs. what was expected?
3. Paste relevant server logs
4. Screenshot of button issue

---

## 🎮 TEST NOW!

1. Refresh both browsers (Ctrl+Shift+R)
2. Follow STEP 1-4 above
3. Watch server console closely
4. Report results

**Server is ready with FULL DIAGNOSTIC LOGGING!** 🔍🎯

