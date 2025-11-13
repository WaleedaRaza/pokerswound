# POKER TABLE LIFECYCLE FIXES
**Date:** November 13, 2025  
**Status:** Auto-Start & Player Elimination Complete

---

## SUMMARY

Implemented automatic game continuation and silent player elimination to create a seamless tournament experience. The table is now **agnostic to players** - players can join, bust, and rejoin without stopping the game.

---

## WHAT WAS BROKEN

**Before:**
- Hand completes → Room returns to lobby → `game_id = NULL`
- Host must manually click "START HAND" button after EVERY hand
- Busted players get disruptive notifications and ceremony
- Game stops if any player busts
- Everyone sees "WAITING FOR HOST" screen between hands

**Result:** Felt like disconnected individual hands, not a continuous game.

---

## WHAT WAS FIXED

### **Fix 1: Auto-Start Logic**

**File:** `routes/game-engine-bridge.js` (lines 1160-1273)

**How it works:**
```javascript
// After hand completes:
if (playersWithChips.length <= 1) {
  // GAME OVER: Clear game_id, return to lobby, show winner
  io.emit('game_ended', { winner: ... });
} else {
  // GAME CONTINUES: Keep game running, auto-start next hand in 3s
  io.emit('hand_complete_lobby', { 
    message: 'Next hand starting in 3 seconds...',
    autoStartIn: 3000
  });
  
  setTimeout(async () => {
    // Call /api/engine/next-hand internally
    await axios.post('/api/engine/next-hand', { roomId, userId: hostUserId });
  }, 3000);
}
```

**Impact:**
- ✅ Hands auto-start after 3 second pause
- ✅ Game runs continuously until 1 winner remains
- ✅ No manual intervention needed
- ✅ Feels like a real tournament

---

### **Fix 2: Silent Player Elimination**

**File:** `routes/game-engine-bridge.js` (lines 1116-1134, 1328-1329)

**How it works:**
```javascript
// When player has 0 chips:
if (bustedPlayers.length > 0) {
  for (const busted of bustedPlayers) {
    // Remove from seat silently
    await db.query(`UPDATE room_seats SET left_at = NOW() WHERE user_id = $1`, [busted.userId]);
  }
  
  // NO bust event broadcasts
  // NO "you_busted" notifications  
  // NO ceremony
  
  // Player's seat just shows as EMPTY next hand
}
```

**What was removed:**
- ❌ `player_busted` socket event (disruptive to everyone)
- ❌ `you_busted` socket event (annoying modal)
- ❌ `pendingBustEvents` delayed broadcast (complexity)
- ❌ 2-second delay ceremony

**Impact:**
- ✅ Busted players silently removed from seats
- ✅ No disruptive notifications to other players
- ✅ Seat shows as empty and claimable
- ✅ Busted player can rejoin by clicking empty seat

---

### **Fix 3: Game Over Detection**

**File:** `routes/game-engine-bridge.js` (lines 1165-1205)

**How it works:**
```javascript
if (playersWithChips.length === 1) {
  // One winner remains
  io.emit('game_ended', {
    reason: 'tournament_winner',
    winner: { ...winner },
    message: '🏆 PlayerName wins the tournament!'
  });
} else if (playersWithChips.length === 0) {
  // All players busted (rare edge case)
  io.emit('game_ended', {
    reason: 'all_busted',
    message: 'Game ended - all players busted'
  });
}
```

**Impact:**
- ✅ Game ends cleanly when 1 winner remains
- ✅ Shows tournament winner screen
- ✅ Returns to lobby for host to start new game

---

## EXPECTED BEHAVIOR

### **Scenario: 3 Players, One Busts**

**Setup:**
- Player A: $1000
- Player B: $30 (short stack)
- Player C: $2970

**Hand completes, Player B busts:**

1. **Backend:**
   - B's chips updated to $0 in room_seats
   - B removed from seat (`left_at = NOW()`)
   - Detects 2 players remain (A + C have chips)
   - Marks game_states as 'completed' (NOT deleted)
   - Schedules auto-start in 3s

2. **Broadcast:**
   ```javascript
   io.emit('hand_complete_lobby', {
     message: 'Next hand starting in 3 seconds...',
     autoStartIn: 3000,
     playersRemaining: 2,
     bustedPlayers: 1
   });
   ```

3. **Frontend (Players A & C):**
   - See "Hand complete. Next hand starting in 3 seconds..."
   - Countdown timer shows: 3... 2... 1...
   - New hand starts automatically
   - B's seat shows as EMPTY

4. **Frontend (Player B - busted):**
   - Sees same hand complete screen
   - Sees all seats (including their old seat) as CLAIMABLE
   - Can click any empty seat to request rejoin
   - If host approves (or auto-approved), B back in next hand

5. **3 seconds later:**
   - Backend calls `/api/engine/next-hand`
   - New hand dealt automatically
   - A and C get cards, betting begins
   - B watching as spectator (unless they reclaimed seat)

---

## FRONTEND CHANGES NEEDED

The backend now sends `autoStartIn: 3000` in the hand_complete event. Frontend should:

### **1. Show Countdown Timer**

```javascript
socket.on('hand_complete_lobby', (data) => {
  if (data.autoStartIn) {
    // Show countdown: "Next hand in 3..."
    showCountdown(data.autoStartIn / 1000);
  } else {
    // Show "Waiting for host to start"
    showWaitingForHost();
  }
});
```

### **2. Handle Game Ended**

```javascript
socket.on('game_ended', (data) => {
  if (data.reason === 'tournament_winner') {
    showWinnerScreen(data.winner);
  }
  // Clear game state, show lobby
  gameState = null;
});
```

### **3. Spectator Mode (for busted players)**

```javascript
// On hydration:
const mySeat = seats.find(s => s.userId === myUserId);
const isSpectator = !mySeat && gameIsActive;

if (isSpectator) {
  // Show all seats as claimable
  renderSeats(seats, { allClaimable: true });
  // Hide action buttons
  hideActionButtons();
} else {
  // Normal player view
  renderSeats(seats, { allClaimable: false });
}
```

---

## TESTING SCENARIOS

### **Test 1: Auto-Start Works**
- [ ] Start game with 3 players
- [ ] Play one hand to completion
- [ ] Verify "Next hand in 3 seconds..." message shows
- [ ] Verify countdown timer works
- [ ] Verify new hand starts automatically without manual button click

### **Test 2: Player Busts, Game Continues**
- [ ] Start game with 3 players (different stack sizes)
- [ ] One player busts (reaches $0)
- [ ] Verify no "player_busted" notification to other players
- [ ] Verify busted player's seat shows as EMPTY on next hand
- [ ] Verify remaining 2 players continue playing
- [ ] Verify auto-start still works

### **Test 3: Game Ends with 1 Winner**
- [ ] Continue game until only 1 player has chips
- [ ] Verify "tournament_winner" message shows
- [ ] Verify winner screen displays
- [ ] Verify game returns to lobby
- [ ] Verify "START HAND" button reappears (manual start for new game)

### **Test 4: Busted Player Can Rejoin**
- [ ] Player busts
- [ ] As busted player, see all seats (including old seat) as claimable
- [ ] Click empty seat to rejoin
- [ ] Get approved by host (or auto-approved)
- [ ] Verify player back in next hand with new chips

### **Test 5: Host Busts, Game Continues**
- [ ] Host is player with chips
- [ ] Host busts
- [ ] Verify remaining players continue
- [ ] Verify auto-start still works (uses host_user_id from rooms table)

---

## KNOWN LIMITATIONS

1. **Frontend Countdown:** Need to implement countdown timer in frontend
2. **Spectator UI:** Need to ensure busted players see claimable seats
3. **Rebuy Flow:** Need to handle "claim seat after busting" flow
4. **Auto-Start Delay:** Hardcoded to 3s (could be configurable)
5. **Error Handling:** If auto-start fails, falls back to manual start

---

## FUTURE ENHANCEMENTS

### **Configurable Auto-Start Delay**
```sql
ALTER TABLE rooms ADD COLUMN auto_start_delay_ms INTEGER DEFAULT 3000;
```

### **Cash Game Mode (No Auto-Start)**
```sql
ALTER TABLE rooms ADD COLUMN game_mode VARCHAR(20) DEFAULT 'TOURNAMENT';
-- 'TOURNAMENT' = auto-start until 1 winner
-- 'CASH_GAME' = manual start each hand
```

### **Rebuy/Add-On Support**
- Allow busted players to rebuy chips
- Configurable rebuy amounts and limits
- Auto-approve rebuys vs host approval

---

## ROLLBACK

If auto-start causes issues:

```javascript
// In persistHandCompletion(), line 1207:
// Change from:
} else {
  // GAME CONTINUES: auto-start
  console.log(`🔄 [AUTO-START] ...`);
  
// To:
} else {
  // Return to lobby (old behavior)
  await client.query(`DELETE FROM game_states WHERE room_id = $1`, [roomId]);
  await client.query(`UPDATE rooms SET game_id = NULL WHERE id = $1`, [roomId]);
  
  io.emit('hand_complete_lobby', {
    message: 'Hand complete. Host can start the next hand.',
    canStartNextHand: true
  });
}
```

---

## SUMMARY OF CHANGES

| File | Lines | Change |
|------|-------|--------|
| `routes/game-engine-bridge.js` | 1116-1134 | Silent player elimination (removed broadcasts) |
| `routes/game-engine-bridge.js` | 1160-1273 | Auto-start logic (3s delay, HTTP call) |
| `routes/game-engine-bridge.js` | 1328-1329 | Removed delayed bust event code |

**Total:** ~100 lines changed, ~50 lines deleted (net: +50 lines, -3 event types)

---

## NEXT STEPS

1. **Test auto-start** - Verify hands start automatically
2. **Test player busting** - Verify silent removal works
3. **Implement frontend countdown** - Show "Next hand in X seconds..."
4. **Test spectator mode** - Busted players see claimable seats
5. **Deploy and monitor** - Watch for auto-start failures in logs

