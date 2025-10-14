# QUICK TEST GUIDE: All-In Display Bug Fix

## 🎯 What We Fixed

**Problem**: When players go all-in, their winning chips were displayed immediately instead of after card reveals.

**Solution**: DisplayStateManager now calculates correct display state from pre-distribution snapshots.

## 🧪 How to Test

### Step 1: Start the Server

```bash
cd poker-engine
node sophisticated-engine-server.js
```

Server should start on `http://localhost:3000`

### Step 2: Open Two Browser Windows

**Window 1 (Player 1):**
```
http://localhost:3000/public/poker-test.html
```

**Window 2 (Player 2):**
```
http://localhost:3000/public/poker-test.html
```

### Step 3: Create Game & Join

**In Window 1:**
1. Click "Create New Game"
2. Note the Game ID
3. Enter your name (e.g., "Alice")
4. Click "Join Game"

**In Window 2:**
1. Paste the Game ID
2. Enter your name (e.g., "Bob")
3. Click "Join Game"

### Step 4: Start Game

**In Window 1:**
1. Click "Start Game"

Both players should see hole cards dealt.

### Step 5: Test All-In Scenario

**Preflop:**
1. Player 1 (Alice): Click "ALL-IN"
2. Player 2 (Bob): Click "CALL"

### ✅ Expected Behavior (FIXED)

**Immediately after all-in:**
- ✅ Both players show `stack: $0` (chips in pot)
- ✅ Pot shows total amount (e.g., `$2000`)
- ✅ Message: "All players all-in - dealing remaining cards..."

**Progressive card reveals:**
- ✅ Flop deals after 1 second
- ✅ Turn deals after 2 seconds
- ✅ River deals after 3 seconds

**After river:**
- ✅ Winner announced
- ✅ Pot animates to winner
- ✅ Winner's stack updates to final amount (e.g., `$2000`)
- ✅ Loser's stack stays at `$0`

### ❌ Old Buggy Behavior (SHOULD NOT HAPPEN)

- ❌ Winner's chips show immediately (e.g., `$2000`) before cards revealed
- ❌ All-in players show incorrect stacks during runout

## 🔍 Debug Console Messages

Watch the server console for:

```
✅ DisplayStateManager calculated all-in display state:
   Pot: $2000
   Alice: stack=$0, allIn=true
   Bob: stack=$0, allIn=true
📡 Emitted pot_update with CORRECT display state
```

If you see:
```
❌ CRITICAL: No preDistributionSnapshot in HAND_COMPLETED event!
```

This means the game-state-machine didn't capture the snapshot. File is not compiled.

## 🐛 Troubleshooting

### Issue: "Cannot find module DisplayStateManager"

**Fix:**
```bash
cd poker-engine
npx tsc --skipLibCheck
```

Re-run the server.

### Issue: Stacks still show incorrectly

**Check:**
1. Did you compile TypeScript? (`npx tsc`)
2. Server logs show `✅ DisplayStateManager calculated...`?
3. Are you using the latest `sophisticated-engine-server.js`?

### Issue: Game doesn't start

**Check:**
1. Database connection (set `DATABASE_URL` env var or disable DB)
2. Port 3000 not in use
3. Both players joined before clicking "Start Game"

## 📊 Test Scenarios

### Scenario 1: Preflop All-In (Basic)
- Player 1: ALL-IN
- Player 2: CALL
- **Expected**: Flop, Turn, River revealed progressively, winner announced, chips distributed

### Scenario 2: Turn All-In
- Player 1: CHECK (preflop)
- Player 2: CHECK
- *Flop deals*
- Player 1: CHECK
- Player 2: CHECK
- *Turn deals*
- Player 1: ALL-IN
- Player 2: CALL
- **Expected**: Only River revealed, then winner announced

### Scenario 3: One Player Folds
- Player 1: ALL-IN
- Player 2: FOLD
- **Expected**: No runout, chips go to Player 1 immediately (no all-in animation needed)

## ✅ Success Criteria

- [ ] All-in players show `stack: $0` during runout
- [ ] Pot amount is correct
- [ ] Cards reveal progressively (not all at once)
- [ ] Winner announced after all cards revealed
- [ ] Chips transfer to winner with animation
- [ ] Final stacks are correct

## 🚀 Next Steps After Testing

1. Test with friends (more than 2 players)
2. Test side pot scenarios (3+ players, different stack sizes)
3. Verify hand history recording is correct
4. Add visual animations for card reveals (client-side)

---

**If all tests pass, the display bug is FIXED! 🎉**

