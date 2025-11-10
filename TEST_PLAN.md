# 🧪 CORNER CASE TEST PLAN

**Location:** `context.txt` lines 113-250

## Test Format
For each test:
1. **Setup:** Cards, stacks, board (if needed)
2. **Actions:** What to do in game
3. **Expected:** What should happen
4. **Status:** ✅ PASS / ❌ FAIL / ⏳ PENDING

---

## 🎯 TEST CATEGORY 1: ALL-IN & SIDE POTS

### Test 1.1: Multiple Side Pots (3 players, different stacks)
**Setup:**
- Seat 0: `As Ah`, Stack: `100`
- Seat 1: `Kd Kh`, Stack: `200`  
- Seat 2: `Qc Qs`, Stack: `500`
- Blinds: `10/20`

**Actions:**
1. Seat 0 goes all-in (100)
2. Seat 1 calls (100)
3. Seat 2 calls (100)
4. Play to showdown

**Expected:**
- Main pot: 300 (100×3)
- Side pot 1: 200 (100×2, Seat 1 & 2 only)
- Side pot 2: 300 uncalled → returned to Seat 2
- Winner gets appropriate pot(s)

**Status:** ⏳ PENDING

---

### Test 1.2: Partial Call All-In
**Setup:**
- Seat 0: `As Ah`, Stack: `50`
- Seat 1: `Kd Kh`, Stack: `200`
- Blinds: `10/20`

**Actions:**
1. Seat 1 raises to 100
2. Seat 0 calls all-in (50 total)
3. Play to showdown

**Expected:**
- Main pot: 100 (50×2)
- Side pot: 50 (50×1, Seat 1 only)
- Seat 0 eligible for main pot only

**Status:** ⏳ PENDING

---

### Test 1.3: Uncalled Bet Return
**Setup:**
- Seat 0: `As Ah`, Stack: `1000`
- Seat 1: `Kd Kh`, Stack: `1000`
- Blinds: `10/20`

**Actions:**
1. Seat 0 raises to 100
2. Seat 1 folds

**Expected:**
- Seat 0 gets pot (30) + uncalled bet (80) returned = 110 total
- Seat 0 stack increases by 80 (not just pot)

**Status:** ⏳ PENDING

---

## 🃏 TEST CATEGORY 2: SHOWDOWN & POT DISTRIBUTION

### Test 2.1: Exact Tie (Split Pot)
**Setup:**
- Seat 0: `As Kd`, Stack: `1000`
- Seat 1: `Ah Kh`, Stack: `1000`
- Board: `Qh Jh Th 9h 8h` (straight flush on board)

**Actions:**
1. Both players go all-in preflop
2. Board plays (both use board)

**Expected:**
- Pot split evenly (50/50)
- Both players get same amount

**Status:** ⏳ PENDING

---

### Test 2.2: Odd Chip Rule
**Setup:**
- Seat 0: `As Kd`, Stack: `1000`
- Seat 1: `Ah Kh`, Stack: `1000`
- Board: `Qh Jh Th 9h 8h` (tie)
- Pot: `151` (odd number)

**Actions:**
1. Both players tie
2. Pot distribution

**Expected:**
- Pot split: 75 + 76 (or 76 + 75)
- Extra chip goes to player closest to left of dealer

**Status:** ⏳ PENDING

---

### Test 2.3: Split Side Pot + Main Pot
**Setup:**
- Seat 0: `As Ah`, Stack: `100` (all-in)
- Seat 1: `Kd Kh`, Stack: `200` (all-in)
- Seat 2: `Qc Qs`, Stack: `500`
- Board: `Ad Ks Qh Jd Th` (Seat 0: trips, Seat 1: two pair, Seat 2: straight)

**Actions:**
1. All go all-in preflop
2. Play to showdown

**Expected:**
- Main pot (300): Seat 0 wins (best hand among all 3)
- Side pot 1 (200): Seat 2 wins (only eligible player)

**Status:** ⏳ PENDING

---

### Test 2.4: Wheel Straight (A-2-3-4-5)
**Setup:**
- Seat 0: `As 2d`, Stack: `1000`
- Seat 1: `Kh Kd`, Stack: `1000`
- Board: `3h 4c 5s 6d 7h`

**Actions:**
1. Play to showdown

**Expected:**
- Seat 0: Straight (A-2-3-4-5) - wheel straight
- Seat 1: Pair of Kings
- Seat 0 wins (straight beats pair)

**Status:** ⏳ PENDING

---

## 🪙 TEST CATEGORY 3: ROUND & TURN ORDER

### Test 3.1: Heads-Up Blind Reversal
**Setup:**
- Seat 0: `As Ah`, Stack: `1000`
- Seat 1: `Kd Kh`, Stack: `1000`
- Blinds: `10/20`
- Only 2 players

**Actions:**
1. Start hand

**Expected:**
- Dealer = Small Blind (Seat 0)
- Other player = Big Blind (Seat 1)
- First to act = Dealer (Seat 0)

**Status:** ⏳ PENDING

---

### Test 3.2: All-In Skip (No Action Prompt)
**Setup:**
- Seat 0: `As Ah`, Stack: `100` (all-in)
- Seat 1: `Kd Kh`, Stack: `1000`
- Blinds: `10/20`

**Actions:**
1. Seat 0 posts blind (all-in)
2. Action should skip to next player

**Expected:**
- Seat 0 not prompted for action (already all-in)
- Action moves to Seat 1

**Status:** ⏳ PENDING

---

### Test 3.3: Min Raise Validation
**Setup:**
- Seat 0: `As Ah`, Stack: `1000`
- Seat 1: `Kd Kh`, Stack: `1000`
- Blinds: `10/20`

**Actions:**
1. Seat 1 raises to 40 (min raise = 20 + 20 = 40)
2. Seat 0 tries to raise to 50 (should fail - min is 60)

**Expected:**
- Raise to 50 rejected
- Min raise = 60 (40 + 20)

**Status:** ⏳ PENDING

---

## 🔁 TEST CATEGORY 4: GAME LIFECYCLE

### Test 4.1: Premature Showdown (All-In Before River)
**Setup:**
- Seat 0: `As Ah`, Stack: `100` (all-in)
- Seat 1: `Kd Kh`, Stack: `200` (all-in)
- Board: `Qh Jh Th` (flop only)

**Actions:**
1. Both go all-in on flop
2. Hand should complete

**Expected:**
- Turn and River dealt automatically
- Showdown occurs
- Winner determined

**Status:** ⏳ PENDING

---

### Test 4.2: Game Reset After Hand
**Setup:**
- Complete a hand

**Actions:**
1. Hand completes
2. Start next hand

**Expected:**
- Pots cleared
- Bets reset
- Dealer rotated
- New cards dealt
- Blinds posted

**Status:** ⏳ PENDING

---

## 📊 TEST EXECUTION LOG

**Date:** _______________
**Tester:** _______________

| Test # | Status | Notes |
|--------|--------|-------|
| 1.1 | ⏳ | |
| 1.2 | ⏳ | |
| 1.3 | ⏳ | |
| 2.1 | ⏳ | |
| 2.2 | ⏳ | |
| 2.3 | ⏳ | |
| 2.4 | ⏳ | |
| 3.1 | ⏳ | |
| 3.2 | ⏳ | |
| 3.3 | ⏳ | |
| 4.1 | ⏳ | |
| 4.2 | ⏳ | |

---

## 🚀 QUICK TEST COMMANDS

For each test, use sandbox mode:
1. Enable sandbox mode
2. Set cards/stacks as specified
3. Click "START HAND"
4. Execute actions
5. Verify expected results
6. Mark status in this file

