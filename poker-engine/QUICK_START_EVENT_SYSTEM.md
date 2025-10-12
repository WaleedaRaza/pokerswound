# Quick Start: Event System Integration

**Time to implement: 15-20 minutes**

## Backend Integration (3 changes to sophisticated-engine-server.js)

### Change 1: Add imports (line ~15)

```javascript
// Add after: const { ActionType, Street } = require('./dist/types/common.types');
const EventBroadcaster = require('./src/events/event-broadcaster');
```

### Change 2: Initialize broadcaster (line ~1768)

```javascript
// Add after: const io = new Server(httpServer, {...});
const eventBroadcaster = new EventBroadcaster(io);
console.log('✅ Event broadcaster initialized');
```

### Change 3: Fix bug + Use event system for all-in (line ~1029 and ~1225)

**Part A - Fix detection (line 1029):**

```javascript
// Change from:
const willBeAllInRunout = isHandComplete && result.events.filter(e => e.type === 'STREET_ADVANCED').length > 1;

// To:
const willBeAllInRunout = isHandComplete && result.events.filter(e => e.type === 'STREET_ADVANCED').length >= 1;
```

**Part B - Replace all-in broadcast section (line ~1225):**

Find:
```javascript
if (streetEvents.length > 1 && io && roomId) {
  // Multiple streets were dealt at once (all-in scenario)
  console.log(`🎬 All-in runout detected: ${streetEvents.length} streets to reveal`);
  // ... lots of old code ...
```

Replace the ENTIRE if block with:

```javascript
if (streetEvents.length >= 1 && io && roomId) {
  console.log(`🎬 All-in runout: ${streetEvents.length} streets via EVENT SYSTEM`);
  
  const userIdMap = playerUserIds.get(gameId);
  
  // Prepare winners with final stacks
  const winnersWithStacks = winners.map(w => {
    const winnerPlayer = result.newState.getPlayer(w.playerId);
    return {
      playerId: w.playerId,
      playerName: winnerPlayer ? winnerPlayer.name : 'Unknown',
      amount: w.amount,
      handRank: w.handRank,
      newStack: winnerPlayer ? winnerPlayer.stack : 0
    };
  });
  
  // Prepare all-in players (stack = 0 during animation)
  const allInPlayers = postActionPreShowdownPlayers
    .filter(p => !p.hasFolded && p.isAllIn)
    .map(p => ({ id: p.uuid, name: p.name, stack: 0 }));
  
  // Broadcast event sequence
  eventBroadcaster.broadcastAllInRunout(
    roomId, gameId, streetEvents, winnersWithStacks, potAmount, allInPlayers
  );
  
  // Update database (don't wait for animation)
  if (userIdMap) {
    const db = getDb();
    for (const player of result.newState.players.values()) {
      const userId = userIdMap.get(player.uuid);
      if (userId) {
        try {
          await db.query(
            `UPDATE room_seats SET chips_in_play = $1 WHERE room_id = $2 AND user_id = $3`,
            [player.stack, roomId, userId]
          );
        } catch (dbErr) {
          console.error(`❌ DB update failed:`, dbErr.message);
        }
      }
    }
  }
  
  return res.json({
    gameId, action, amount: amount || 0,
    street: result.newState.currentStreet,
    pot: result.newState.pot.totalPot,
    isHandComplete: true,
    winners: winnersWithStacks,
    players: Array.from(result.newState.players.values()).map(p => ({
      id: p.uuid, name: p.name, stack: p.stack
    })),
    engine: 'SOPHISTICATED_TYPESCRIPT',
    message: 'All-in via event system'
  });
}
```

---

## Frontend Integration (2 changes to poker-test.html)

### Change 1: Add script tags in <head>

```html
<!-- Add before closing </head> tag -->
<script src="/public/js/game-events.js"></script>
<script src="/public/js/display-state.js"></script>
```

### Change 2: Initialize and wire up DisplayState

Find where socket is created (~line 2480), add this RIGHT AFTER:

```javascript
// Initialize display state manager
const displayState = new PokerDisplayState();

// Wait for DOM, then set element references
window.addEventListener('DOMContentLoaded', () => {
  displayState.setElements(
    document.getElementById('potAmount'),
    document.getElementById('communityCards'),
    document.getElementById('playersGrid'),
    null // status element (optional)
  );
  console.log('✅ DisplayState initialized');
});

// Listen for game events
socket.on('game_event', (event) => {
  console.log(`🎮 Event: ${event.type}`);
  displayState.receiveEvent(event);
});
```

---

## Test It

1. Start server: `node sophisticated-engine-server.js`
2. Open `http://localhost:3000/poker` in 2 browser windows
3. Create game, join 2 players
4. Player 1 all-in → Player 2 call
5. **Watch console**: Should see event sequence
6. **Watch UI**: Winner stack stays at $0 until after cards revealed

### Success Criteria

✅ Console shows: `📡 Broadcasting: ALL_IN_RUNOUT_STARTED`  
✅ Console shows: Multiple `STREET_REVEALED` events  
✅ Console shows: `CHIPS_TRANSFERRED_TO_WINNER` (last)  
✅ Winner stack = $0 during card reveals  
✅ Winner stack updates ONCE at the end  
✅ No flickering or premature updates

---

## Rollback (if needed)

If something breaks:

1. Comment out the 3 backend changes
2. Comment out the 2 frontend changes
3. Server reverts to old system

The event system files don't interfere with old code - they're just unused.

---

## Debug Commands (Browser Console)

```javascript
// Check display state
displayState.getState();

// Is it animating?
displayState.isProcessingAnimation;

// How many events queued?
displayState.eventQueue.length;

// Manual reset
displayState.reset();
```

---

## What This Fixes

1. **Winner stack updates prematurely** ✅ Fixed (CHIPS_TRANSFERRED_TO_WINNER event)
2. **Race condition with HTTP GET** ✅ Fixed (no more HTTP during animation)
3. **Brittle animation timing** ✅ Fixed (frontend controls timing)
4. **Hard to add features** ✅ Fixed (just add events)

---

## Next: Clean Up Old Code (Optional)

Once tested, you can remove:
- `gameAnimations` Map (line 32)
- Animation context storage (line 1084-1111)
- Display snapshot logic (line 1612-1645)
- Old broadcast events (pot_update, hand_complete)

But for now, keep them for backward compatibility.

