# Testing the Event-Based System

## Integration Complete ✅

The event system has been fully integrated into your poker application:

**Backend:** `sophisticated-engine-server.js`
- EventBroadcaster initialized
- All-in runouts now use event system
- Bug fixed: Single-street runouts now detected (>= 1 instead of > 1)

**Frontend:** `poker-test.html`
- DisplayState manager initialized
- Event listener wired to socket
- DOM elements connected

**Commit:** `e4571a3`

---

## Quick Test (5 minutes)

### 1. Start the Server

```bash
cd poker-engine
node sophisticated-engine-server.js
```

**Expected output:**
```
🚀 SOPHISTICATED POKER ENGINE running on port 3000
✅ Event broadcaster initialized
```

### 2. Open the UI

Open two browser windows:
- Window 1: `http://localhost:3000/poker`
- Window 2: `http://localhost:3000/poker` (incognito/private mode)

### 3. Create and Join Game

**Window 1 (Host):**
1. Click "Create Room"
2. Enter room details (default is fine)
3. Copy the invite code
4. Click "Join Room" and pick Seat 1
5. Buy in for $500

**Window 2 (Guest):**
1. Enter the invite code
2. Click "Join Room" and pick Seat 2
3. Buy in for $500

**Window 1:**
1. Click "Start Game"

### 4. Test All-In Scenario

**Window 1:**
1. Click "All In" button

**Window 2:**
1. Click "Call" button

### 5. Watch the Console and UI

**Server Console (Terminal):**
```
🎬 All-in runout: 2 streets via EVENT SYSTEM
📡 Broadcasting: ALL_IN_RUNOUT_STARTED to room:xxx
📡 Broadcasting: TURN_REVEALED to room:xxx
📡 Broadcasting: RIVER_REVEALED to room:xxx
📡 Broadcasting: WINNER_DETERMINED to room:xxx
📡 Broadcasting: POT_AWARDED to room:xxx
📡 Broadcasting: CHIPS_TRANSFERRED_TO_WINNER to room:xxx
✅ All-in runout event sequence broadcasted
```

**Browser Console (DevTools):**
```
🎮 Game event received: ALL_IN_RUNOUT_STARTED
📥 Event received: ALL_IN_RUNOUT_STARTED { streetsToReveal: ['TURN', 'RIVER'], ... }
  ⏸️  Queued (animation in progress), queue size: 0
🎮 Game event received: TURN_REVEALED
🎮 Game event received: RIVER_REVEALED
🎮 Game event received: WINNER_DETERMINED
🎮 Game event received: POT_AWARDED
🎮 Game event received: CHIPS_TRANSFERRED_TO_WINNER
```

**UI Behavior:**
- ✅ Winner's stack shows **$0** during card reveals
- ✅ Cards reveal one at a time (1 second between cards)
- ✅ After all cards shown, pot goes to $0
- ✅ Winner's stack updates to **$1000** (once, at the end)
- ✅ No flickering or premature updates

---

## Success Criteria

### ✅ Backend
- [ ] Server starts with "Event broadcaster initialized" message
- [ ] Server logs show event sequence for all-in runouts
- [ ] No errors in server console

### ✅ Frontend
- [ ] Browser console shows `🎮 Game event received` messages
- [ ] DisplayState initialized message appears
- [ ] No JavaScript errors in browser console

### ✅ UI/UX
- [ ] Winner's stack stays at $0 during animation
- [ ] Cards reveal progressively (not all at once)
- [ ] Winner's stack updates to final amount after animation
- [ ] No flickering between $0 and $1000
- [ ] Smooth, controlled animation

### ✅ Bug Fix Verification
- [ ] Single-street runouts work (e.g., all-in on turn, only river deals)
- [ ] Multi-street runouts work (e.g., all-in on flop, turn+river deal)
- [ ] Winner stack never updates prematurely

---

## Debug Commands

### Backend (Server Console)

Check if EventBroadcaster exists:
```javascript
// In sophisticated-engine-server.js, add temporary log:
console.log('EventBroadcaster:', typeof eventBroadcaster);
```

### Frontend (Browser Console)

Check display state:
```javascript
// After displayState is initialized:
displayState.getState()
// Should return: { players: Map, pot: number, ... }

displayState.isProcessingAnimation
// Should be true during animation, false otherwise

displayState.eventQueue.length
// Shows how many events are queued
```

Manual reset if needed:
```javascript
displayState.reset()
```

---

## Troubleshooting

### Problem: "EventBroadcaster is not defined"

**Solution:**
```javascript
// Check imports at top of sophisticated-engine-server.js:
const EventBroadcaster = require('./src/events/event-broadcaster');
```

### Problem: "displayState is not defined"

**Solution:**
1. Check script tags in `poker-test.html` (before `</head>`):
```html
<script src="/public/js/game-events.js"></script>
<script src="/public/js/display-state.js"></script>
```

2. Check initialization after socket creation

### Problem: Events not showing in console

**Solution:**
1. Check socket connection: `socket.connected` should be `true`
2. Check room ID is correct
3. Verify `game_event` listener is registered

### Problem: Winner stack still updates prematurely

**Solution:**
1. Check server logs - do you see "EVENT SYSTEM" message?
2. Check browser console - are events being received?
3. Verify `displayState.isProcessingAnimation` is `true` during animation
4. Check that `CHIPS_TRANSFERRED_TO_WINNER` is the LAST event

### Problem: Animation doesn't play

**Solution:**
1. Check `displayState.isProcessingAnimation` - should be `true`
2. Check `displayState.eventQueue` - events should queue up
3. Verify `handleAllInRunoutStarted` sets `isProcessingAnimation = true`
4. Check console for errors in event handlers

---

## Advanced Testing

### Test 1: Single-Street Runout (Bug Fix Verification)

**Setup:**
- Player 1: $300
- Player 2: $500
- Blinds: $10/$20

**Actions:**
1. Pre-flop: Bet/raise to $300 (all-in for player 1)
2. Player 1 all-in on turn
3. Player 2 calls
4. **Only river card should be dealt**

**Expected:**
- Server logs: `🎬 All-in runout: 1 streets via EVENT SYSTEM`
- Frontend receives: `RIVER_REVEALED` (only 1 card)
- Winner's stack stays at $0, updates after river shown

### Test 2: Multi-Street Runout

**Setup:**
- Both players: $500

**Actions:**
1. Player 1 all-in pre-flop
2. Player 2 calls
3. **Flop, turn, river all dealt progressively**

**Expected:**
- Server logs: `🎬 All-in runout: 3 streets via EVENT SYSTEM`
- Frontend receives: `FLOP_REVEALED`, `TURN_REVEALED`, `RIVER_REVEALED`
- 3 seconds of animation (1 second per street)
- Winner's stack updates only at end

### Test 3: Normal Hand (No All-In)

**Actions:**
1. Player 1 bets $50
2. Player 2 calls
3. Continue to showdown without all-in

**Expected:**
- Old event handlers still work
- `hand_complete` event fires
- Stacks update immediately (no animation)

### Test 4: Rapid Multiple Hands

Play 5 hands in a row with all-ins. Verify:
- [ ] No event queue buildup
- [ ] Each animation plays fully
- [ ] No stale events from previous hands
- [ ] Database updates correctly

---

## Performance Check

After integration, verify:

1. **Memory:** No event log buildup
   ```javascript
   // In browser console:
   displayState.eventQueue.length  // Should be 0 when idle
   ```

2. **Timing:** Animations feel smooth
   - Cards reveal at 1-second intervals
   - No lag or stuttering

3. **Network:** Event payloads are small
   - Open DevTools → Network → WS (WebSocket)
   - Check game_event payloads (should be < 1KB each)

---

## Rollback (If Needed)

If something breaks:

```bash
# Revert the integration commit
git revert e4571a3

# Or reset to before integration
git reset --hard b46940c
```

The event system files (`src/events/*`, `public/js/*`) don't interfere with old code - they're just unused.

---

## Next Steps

Once verified:

1. **Remove old animation code** (optional):
   - `gameAnimations` Map
   - Display snapshot logic
   - Old setTimeout-based broadcasts

2. **Add more events** (as needed):
   - `PLAYER_JOINED`
   - `PLAYER_LEFT`
   - `CHAT_MESSAGE`
   - etc.

3. **Implement hand replay**:
   ```javascript
   // Get event log for a game
   const events = eventBroadcaster.getEventLog(gameId);
   
   // Replay events
   eventBroadcaster.replayEvents(roomId, gameId);
   ```

---

## Success! 🎉

If all tests pass:
- ✅ Bug is fixed
- ✅ Architecture is robust
- ✅ Pattern won't recur
- ✅ System is scalable

The event-based system is now live and controlling your poker game's display timing.

