# BETTING BUGS - ROOT CAUSE ANALYSIS

## 🐛 BUG 1: Player Acts Twice (CALL then CHECK)

### **Scenario:**
```
Heads-up (2 players):
1. Player 1 (BB): Checks (bet=2)
2. Player 2 (SB): Bets $10 (bet=12)
3. Player 1: Calls $10 (bet=12)
4. ❌ Player 1 gets to act AGAIN with CHECK option
```

### **Root Cause:**

**In `game-state.ts:209-283` (`isBettingRoundComplete`):**

```typescript
// Lines 277-282
const allPlayersActed = playersWhoActed >= activePlayers.length;
const allBetsMatched = playersWithMatchingBets >= activePlayers.length;

return allPlayersActed && allBetsMatched;
```

**The Problem:**
- After Player 1 calls, BOTH players have matched the bet ($12)
- But Player 2 only acted ONCE (the initial bet)
- The logic says: "All bets matched BUT not all players acted"
- So it returns `false` → sets Player 1 to act again

**Why This Is Wrong:**
- In heads-up, when facing a bet:
  - Aggressor acts first (raises/bets)
  - Responder acts second (calls/folds/raises)
  - IF responder CALLS → betting COMPLETE (don't go back to aggressor!)

**The Fix:**
After a CALL that matches the bet, betting round should be COMPLETE.

---

## 🐛 BUG 2: Minimum Raise Too High

### **Scenario:**
```
Blinds: $1/$2
1. Player 1: Bets $10 (currentBet = 10)
2. Player 2 wants to raise to $15
3. ❌ Engine says: "Raise must be at least $10" (total $20+)
```

### **Root Cause:**

**In `betting-engine.ts:160-162` (`calculateMinRaise`):**

```typescript
// Minimum raise is the size of the last raise, or big blind if no raises yet
const minRaiseAmount = Math.max(lastRaiseNum, bigBlindNum);
return minRaiseAmount as Chips;
```

**Current Logic (Standard Poker Rules):**
- If Player 1 bets $10, that's a $10 raise from $0
- Player 2 must raise by AT LEAST $10 (total $20+)

**User Wants (House Rules):**
- Minimum raise is always the big blind ($2)
- Player 2 can raise to $12, $15, $20, anything > $10

---

## 🐛 BUG 3: CHECK After CALL

### **Scenario:**
After Player 1 calls, they see CHECK in legal actions (should only see FOLD/ALL-IN, or nothing if round complete)

### **Root Cause:**

**In `betting-engine.ts:390-393`:**

```typescript
// Check if can check
if (currentBetNum === playerBetThisStreet) {
  actions.push(ActionType.Check);
}
```

**Why This Triggers:**
- After CALL, player's bet ($12) === current bet ($12)
- Condition is true → CHECK is added
- But betting round should be COMPLETE (shouldn't ask for action at all)

---

## 🔧 COMPREHENSIVE FIX

### Fix 1: Betting Round Completion Logic

**In `game-state.ts:209-283`, need to add special case for heads-up:**

```typescript
// After all players have matched the bet
if (allBetsMatched) {
  // In heads-up, if both players matched bet, round is complete
  if (activePlayers.length === 2) {
    return true;
  }
  
  // In multi-way, ensure everyone has had at least one action
  return allPlayersActed;
}
```

**Better Approach:** Check if action came back to last aggressor:

```typescript
// If there's an aggressor and all players matched their bet
if (allBetsMatched && this.bettingRound.lastAggressor) {
  const aggressor = this.getPlayer(this.bettingRound.lastAggressor);
  if (aggressor && aggressor.betThisStreet >= currentBet) {
    // Action came back to aggressor and they're matched → round complete
    return true;
  }
}
```

---

### Fix 2: Minimum Raise = Always Big Blind

**In `betting-engine.ts:160-162`:**

```typescript
// OLD (Standard Rules):
const minRaiseAmount = Math.max(lastRaiseNum, bigBlindNum);

// NEW (House Rules):
const minRaiseAmount = bigBlindNum;  // Always big blind
```

---

### Fix 3: Never Show CHECK When Facing Bet

**In `betting-engine.ts:390-393`:**

```typescript
// OLD:
if (currentBetNum === playerBetThisStreet) {
  actions.push(ActionType.Check);
}

// NEW:
// Can only check if NO BET TO FACE
if (currentBetNum === 0) {
  actions.push(ActionType.Check);
}
```

---

## 📝 FILES TO MODIFY

1. **`poker-engine/src/core/models/game-state.ts`**
   - Line 209-283: `isBettingRoundComplete()`
   - Add heads-up special case
   - OR add lastAggressor check

2. **`poker-engine/src/core/engine/betting-engine.ts`**
   - Line 161: Change minRaise calculation to always use big blind
   - Line 390-393: Change CHECK condition to only when currentBet === 0

3. **Recompile:** `npx tsc --skipLibCheck`

4. **Test:** Verify betting flows work correctly

---

## 🧪 TEST SCENARIOS

### Scenario 1: Basic Bet/Call (Heads-Up)
```
1. Player 1 (BB): Checks
2. Player 2 (SB): Bets $10
3. Player 1: Calls $10
✅ Expected: Betting complete, advance to flop
❌ Current: Player 1 asked to act again (CHECK option)
```

### Scenario 2: Bet/Raise/Call
```
1. Player 1: Bets $10
2. Player 2: Raises to $25
3. Player 1: Calls $15
✅ Expected: Betting complete
❌ Current: Player 1 might be asked to act again
```

### Scenario 3: Minimum Raise
```
Blinds: $1/$2
1. Player 1: Bets $10
2. Player 2: Raises to $13 (only $3 more)
✅ Expected: Valid (above big blind of $2)
❌ Current: Rejected (must raise by $10)
```

---

**Want me to implement all 3 fixes now?**

