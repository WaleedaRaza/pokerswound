# ALL-IN FLOW DIAGNOSIS

## 🎯 TEST SCENARIOS TO RUN

### SCENARIO 1: Simple All-In (Player A all-in, Player B has more chips)
**Setup:**
- Player A: $500 stack
- Player B: $500 stack
- Blinds: $1/$2

**Flow:**
1. Player A (SB, $1 posted): Goes ALL_IN for $499 more
2. ✅ **Expected:** Player B sees FOLD | CALL $498 | ALL_IN (no CHECK)
3. Player B chooses CALL $498
4. ✅ **Expected:** Both all-in, streets advance, showdown, winner

**What to log:**
```
When Player A goes all-in:
- Current bet becomes: $500
- Player A betThisStreet: $500
- Player A isAllIn: true
- Player B betThisStreet: $2
- Player B isAllIn: false
- isBettingComplete BEFORE edge case check: ?
- isBettingComplete AFTER edge case check: ?
- Player B legal actions: ?
```

---

### SCENARIO 2: Both All-In (Equal stacks)
**Setup:**
- Player A: $500 stack
- Player B: $500 stack

**Flow:**
1. Player A: ALL_IN $499
2. Player B: ALL_IN $498
3. ✅ **Expected:** Streets advance automatically, showdown

---

### SCENARIO 3: Partial All-In (Player A all-in for less than current bet)
**Setup:**
- Player A: $100 stack
- Player B: $500 stack

**Flow:**
1. Player B: BET $200
2. Player A: ALL_IN $100 (can't match $200)
3. ✅ **Expected:** Player B wins immediately (Player A can't call)

---

### SCENARIO 4: All-In After Raise
**Setup:**
- Player A: $500 stack
- Player B: $500 stack

**Flow:**
1. Player A: BET $50
2. Player B: RAISE to $100
3. Player A: ALL_IN $450 (re-raise)
4. ✅ **Expected:** Player B sees FOLD | CALL $400 | ALL_IN

---

## 🔍 KEY QUESTIONS TO ANSWER

### Question 1: What actions does BettingEngine.getLegalActions return?
**Check in:** `GET /api/games/:id/legal-actions`
- Before filtering
- After filtering

### Question 2: Is the edge case check triggering?
**Check in:** `POST /api/games/:id/actions`
- Log: "🔧 All-in scenario: {player} must act before street advances"
- Is this appearing?

### Question 3: What is isBettingRoundComplete returning?
- Before edge case override
- After edge case override

### Question 4: Are betThisStreet values correct?
- After ALL_IN action
- Before next player's turn

---

## 🐛 DEBUGGING CHECKLIST

### Frontend (`poker-test.html`)
- [ ] `updateLegalActions()` is called
- [ ] `isUpdatingActions` flag working
- [ ] Actions received from server logged
- [ ] Buttons rendered with correct labels
- [ ] isCurrentPlayer check correct

### Backend (`sophisticated-engine-server.js`)
- [ ] ALL_IN action processed correctly
- [ ] betThisStreet updated for all-in player
- [ ] currentBet updated
- [ ] Edge case check runs
- [ ] isBettingComplete overridden correctly
- [ ] Legal actions calculated correctly
- [ ] CHECK filtered out when CALL present

### Game Engine (`BettingEngine`, `TurnManager`)
- [ ] `getLegalActions()` returns correct actions
- [ ] `isBettingRoundComplete()` behavior understood
- [ ] Player state (`isAllIn`, `betThisStreet`) correct

---

## 📊 ADD THESE DEBUG LOGS

### In `POST /api/games/:id/actions` (after action processed):
```javascript
console.log('🔍 POST-ACTION STATE:');
console.log('  Current bet:', result.newState.bettingRound.currentBet);
console.log('  Players:');
for (const player of result.newState.players.values()) {
  console.log(`    ${player.name}:`, {
    betThisStreet: player.betThisStreet,
    stack: player.stack,
    isAllIn: player.isAllIn,
    hasFolded: player.hasFolded
  });
}
console.log('  isBettingComplete (before override):', result.newState.isBettingRoundComplete());
```

### In edge case check:
```javascript
if (allInPlayers.length > 0 && nonAllInPlayers.length === 1) {
  console.log('🔍 ALL-IN EDGE CASE DETECTED:');
  console.log('  All-in players:', allInPlayers.map(p => p.name));
  console.log('  Non-all-in player:', nonAllInPlayer.name);
  console.log('  Current bet:', currentBetNum);
  console.log('  Player bet:', playerBetNum);
  console.log('  Needs to act?', playerBetNum < currentBetNum);
}
```

### In `GET /api/games/:id/legal-actions`:
```javascript
console.log('🔍 LEGAL ACTIONS REQUEST:');
console.log('  Player:', player.name);
console.log('  Current bet:', currentBet);
console.log('  Player bet this street:', player.betThisStreet);
console.log('  Player stack:', player.stack);
console.log('  Raw actions from engine:', actions);
console.log('  After filtering:', actions);
```

---

## 🎮 TEST PROCEDURE

1. **Start fresh game**
2. **Open browser console (F12)**
3. **Enable verbose logging**
4. **Run Scenario 1**
5. **Copy ALL logs from:**
   - Browser console
   - Server terminal
6. **Paste into diagnosis**

---

## 📝 RESULTS

### Test Run 1: [Date/Time]
**Scenario:** 
**Result:** 
**Logs:**
```
[paste logs here]
```

**Issues Found:**
- 

**Next Steps:**
- 


