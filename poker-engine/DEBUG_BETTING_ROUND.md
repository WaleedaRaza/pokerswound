# BETTING ROUND BUG ANALYSIS

## 🐛 The Problem

**Scenario:**
1. Player 1: CHECK
2. Player 2: BET $50 (becomes lastAggressor)
3. Player 1: CALL $50 (matches bet)
4. ❌ BUG: Player 1 gets action buttons again (should advance street)

**Expected:** Betting round should be complete (both matched the bet)  
**Actual:** Player 1 asked to act again

---

## 🔍 ROOT CAUSE ANALYSIS

### The Betting Round Completion Logic (game-state.ts:209-283)

```typescript
public isBettingRoundComplete(): boolean {
  const activePlayers = this.getActivePlayers();
  
  // Check action history
  for (const player of nonAllInPlayers) {
    const playerBet = player.betThisStreet;
    
    // Check if player has acted this street
    const hasActedThisStreet = this.actionHistory.some(action => 
      action.player === player.uuid && 
      action.street === this.currentStreet && 
      action.handNumber === this.handState.handNumber
    );
    
    if (hasActedThisStreet) {
      playersWhoActed++;
      
      if (playerBet >= currentBet) {
        playersWithMatchingBets++;
      }
    }
  }
  
  // Betting round is complete only if all players have acted and matched bets
  const allPlayersActed = playersWhoActed >= activePlayers.length;
  const allBetsMatched = playersWithMatchingBets >= activePlayers.length;
  
  return allPlayersActed && allBetsMatched;
}
```

### The Problem:

**Scenario State:**
```
Player 1: betThisStreet=$50, acted=true
Player 2: betThisStreet=$50, acted=true
currentBet: $50
```

**Check:**
- `playersWhoActed`: 2 ✅
- `activePlayers.length`: 2 ✅
- `playersWithMatchingBets`: 2 ✅
- `allPlayersActed`: true ✅
- `allBetsMatched`: true ✅

**Should Return:** `true` (betting complete)

**BUT:** The function might be counting actions incorrectly OR there's a CHECK action override somewhere.

---

## 🎯 POSSIBLE ISSUES

### Issue 1: Action History Not Recording Properly
If `actionHistory` doesn't include the CALL, then `hasActedThisStreet` returns false.

### Issue 2: lastAggressor Logic Missing
The code checks action counts but doesn't check if action came BACK to the original raiser.

### Issue 3: Server Override Logic
The server has edge case logic (L1107-1140) that might be incorrectly overriding `isBettingComplete`.

---

## 🔬 DIAGNOSTIC NEEDED

Add this logging to see what's happening:

```javascript
// In sophisticated-engine-server.js after L1105
console.log('🔍 BETTING ROUND COMPLETION CHECK:');
console.log('  isBettingComplete (from engine):', isBettingComplete);
console.log('  Current bet:', result.newState.bettingRound.currentBet);
console.log('  Last aggressor:', result.newState.bettingRound.lastAggressor);
console.log('  Action history this street:');
result.newState.actionHistory
  .filter(a => a.street === result.newState.currentStreet && a.handNumber === result.newState.handState.handNumber)
  .forEach(a => console.log(`    ${a.player}: ${a.action} ${a.amount || ''}`));

for (const player of result.newState.players.values()) {
  if (!player.hasFolded) {
    console.log(`  Player ${player.name}:`, {
      betThisStreet: player.betThisStreet,
      isAllIn: player.isAllIn,
      hasFolded: player.hasFolded
    });
  }
}
```

---

## 💡 LIKELY FIX

The betting round completion logic needs to ensure:
1. All players have matched the current bet ✅
2. All players have acted ✅
3. **Action has come back to the last aggressor** ❌ (MISSING!)

When Player 2 raises, they become `lastAggressor`. When Player 1 calls, action should go BACK to Player 2, but since Player 2 already has the highest bet, the round should end.

The bug is: The code doesn't check if the LAST player to act was the aggressor with the highest bet.

