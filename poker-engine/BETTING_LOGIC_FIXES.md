# BETTING LOGIC FIXES

## 🐛 BUGS IDENTIFIED

### Bug 1: Minimum Raise Logic
**Current Behavior:**
- Player 1 bets $10
- Player 2 can only raise by $10 or more (total bet must be $20+)
- Player 2 cannot raise to $15 (only $5 more)

**User Expectation:**
- Player 2 should be able to raise ANY amount above the current bet
- Minimum raise should always be big blind (e.g., $2), not match last bet size

**Root Cause:**
```typescript
// betting-engine.ts:160-162
// Minimum raise is the size of the last raise, or big blind if no raises yet
const minRaiseAmount = Math.max(lastRaiseNum, bigBlindNum);
```

This implements STANDARD POKER RULES (minimum raise = size of last bet/raise).
User wants HOUSE RULES (minimum raise = always big blind).

---

### Bug 2: CHECK Available When Facing Bet
**Current Behavior:**
- Player 1 raises
- Player 2 sees both CALL and CHECK buttons

**Expected:**
- Player 2 should only see CALL (or FOLD/RAISE/ALL-IN)
- CHECK should NOT appear when facing a bet

**Root Cause:**
Server has logic to filter CHECK (lines 1597-1603), but might not be triggered correctly.

---

### Bug 3: Confusing Bet UI
**Current Behavior:**
- "Bet" and "Place Bet" buttons both exist
- Unclear amounts
- No quick sizing options

**Expected:**
- Single BET/RAISE button
- Slider for amount
- Preset buttons: 1/4 pot, 1/2 pot, 3/4 pot, pot, 2x pot, 5x pot, 10x pot

---

## 🔧 FIXES NEEDED

### Fix 1: Simplify Minimum Raise Logic

**Option A: House Rules (User Wants This)**
```typescript
// Always use big blind as minimum
const minRaiseAmount = bigBlindNum;
```

**Option B: Standard Poker Rules (Current)**
```typescript
// Min raise = size of last raise
const minRaiseAmount = Math.max(lastRaiseNum, bigBlindNum);
```

**Recommendation:** Go with Option A for simplicity. Can add "Standard Rules" toggle later.

---

### Fix 2: Proper Legal Actions

**Current Check Logic:**
```typescript
// betting-engine.ts:390-393
if (currentBetNum === playerBetThisStreet) {
  actions.push(ActionType.Check);
}
```

**Issue:** After a raise, `currentBetNum` changes, but this might be called with stale data.

**Fix:** Add stricter validation:
```typescript
// Can ONLY check if:
// 1. No bet to face (currentBet == 0) OR
// 2. Player has already matched the bet AND it's not a new bet since they acted
if (currentBetNum === 0 || 
    (currentBetNum === playerBetThisStreet && currentBetNum === 0)) {
  actions.push(ActionType.Check);
}
```

---

### Fix 3: Bet Sizing UI

**Add to poker-test.html:**
```html
<div id="betSizingModal">
  <div class="bet-input-container">
    <input type="range" id="betSlider" min="0" max="100" value="50">
    <input type="number" id="betAmount" value="20">
  </div>
  
  <div class="preset-buttons">
    <button onclick="setBetAmount('1/4')">1/4 Pot</button>
    <button onclick="setBetAmount('1/2')">1/2 Pot</button>
    <button onclick="setBetAmount('3/4')">3/4 Pot</button>
    <button onclick="setBetAmount('pot')">Pot</button>
    <button onclick="setBetAmount('2x')">2x Pot</button>
    <button onclick="setBetAmount('5x')">5x Pot</button>
    <button onclick="setBetAmount('10x')">10x Pot</button>
  </div>
</div>
```

---

## 📋 IMPLEMENTATION PLAN

### Step 1: Fix Minimum Raise (15 mins)
- Modify `betting-engine.ts:160-162`
- Change to always use big blind
- Recompile TypeScript

### Step 2: Fix Legal Actions (15 mins)
- Modify `betting-engine.ts:390-393`
- Stricter CHECK validation
- Recompile

### Step 3: Add Bet Sizing UI (2 hours)
- Add slider HTML
- Add preset buttons
- Wire up JavaScript logic
- Style components

### Step 4: Test All Scenarios (1 hour)
- Test: Bet → Raise (should allow any amount > big blind)
- Test: Raise → Call (should not show CHECK)
- Test: Bet sizing presets work
- Test: Slider updates amount correctly

**Total Time:** ~3.5 hours

---

## 🤔 DECISION

**Should we fix these NOW or later?**

**Option A: Fix Now** (3.5 hours)
- Betting works correctly
- Better UX with slider
- Ready for friends

**Option B: Fix Later** (after deployment)
- Friends test current version
- Fix based on their feedback
- Might find more issues

**My Recommendation:** **Fix Now** - These are fundamental game logic issues that will confuse players.

---

**Want me to start implementing the fixes?**

