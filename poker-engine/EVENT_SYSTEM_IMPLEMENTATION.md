# Event-Based Architecture Implementation Guide

## Overview

This document outlines the complete implementation of the event-based system that replaces the brittle state-based broadcasting.

## Problem Solved

**Before**: Backend sent state snapshots via WebSocket. Frontend had race conditions where HTTP GET requests returned different state than WebSocket broadcasts, causing premature winner stack updates.

**After**: Backend sends atomic events (facts). Frontend maintains its own display state and processes events in a queue, controlling timing completely.

## Architecture

```
Backend (sophisticated-engine-server.js)
  ↓
EventBroadcaster (emit events)
  ↓
Socket.IO ('game_event')
  ↓
Frontend (poker-test.html)
  ↓
DisplayState (receive & queue events)
  ↓
Apply events when ready (animations)
  ↓
Update UI
```

## Files Created

### Backend

1. **`poker-engine/src/events/game-events.js`** - Event type definitions
2. **`poker-engine/src/events/event-broadcaster.js`** - Event broadcasting class

### Frontend

3. **`poker-engine/public/js/game-events.js`** - Event types (frontend copy)
4. **`poker-engine/public/js/display-state.js`** - Display state manager

## Integration Steps

### Step 1: Integrate EventBroadcaster into Server

**File: `poker-engine/sophisticated-engine-server.js`**

#### 1.1 Add imports (top of file, after line 14)

```javascript
// Add after const { ActionType, Street } = require('./dist/types/common.types');
const EventBroadcaster = require('./src/events/event-broadcaster');
const { GameEventType } = require('./src/events/game-events');
```

#### 1.2 Initialize broadcaster (after Socket.IO setup, around line 1768)

```javascript
// Find this section:
const io = new Server(httpServer, {
  cors: { origin: '*', credentials: false },
});

// ADD THIS RIGHT AFTER:
const eventBroadcaster = new EventBroadcaster(io);
console.log('✅ Event broadcaster initialized');
```

#### 1.3 Replace hand_started broadcast (around line 891-904)

**OLD CODE (remove):**
```javascript
if (io) {
  const userIdMap = playerUserIds.get(gameId);
  io.to(`room:${roomId}`).emit('hand_started', {
    gameId,
    handNumber: result.newState.handState.handNumber,
    players: Array.from(result.newState.players.values()).map(p => ({
      id: p.uuid,
      name: p.name,
      stack: p.stack,
      seatIndex: p.seatIndex,
      userId: userIdMap ? userIdMap.get(p.uuid) : null
    }))
  });
}
```

**NEW CODE (replace with):**
```javascript
if (io && roomId) {
  const userIdMap = playerUserIds.get(gameId);
  const players = Array.from(result.newState.players.values()).map(p => ({
    id: p.uuid,
    name: p.name,
    stack: p.stack,
    seatIndex: p.seatIndex,
    userId: userIdMap ? userIdMap.get(p.uuid) : null
  }));
  
  eventBroadcaster.emitHandStarted(
    roomId,
    gameId,
    result.newState.handState.handNumber,
    players,
    {
      small: gameState.configuration.smallBlind,
      big: gameState.configuration.bigBlind
    }
  );
}
```

#### 1.4 Replace all-in runout logic (around line 1225-1355)

**Find the section starting with:**
```javascript
if (streetEvents.length > 1 && io && roomId) {
  // Multiple streets were dealt at once (all-in scenario)
```

**Replace THE ENTIRE section** with:

```javascript
if (streetEvents.length >= 1 && io && roomId) {
  // All-in runout detected - use event system
  console.log(`🎬 All-in runout: ${streetEvents.length} streets to reveal`);
  
  const userIdMap = playerUserIds.get(gameId);
  
  // Prepare winner data with new stacks
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
  
  // Prepare all-in players data (show stack = 0 during animation)
  const allInPlayers = postActionPreShowdownPlayers
    .filter(p => !p.hasFolded && p.isAllIn)
    .map(p => ({
      id: p.uuid,
      name: p.name,
      stack: 0  // Critical: show 0 during runout
    }));
  
  // Broadcast the entire runout as an event sequence
  eventBroadcaster.broadcastAllInRunout(
    roomId,
    gameId,
    streetEvents,
    winnersWithStacks,
    potAmount,
    allInPlayers
  );
  
  console.log(`✅ All-in runout event sequence broadcasted`);
  
  // Update database immediately (don't wait for animation)
  if (userIdMap) {
    const db = getDb();
    console.log('💾 Updating player stacks in database after hand completion...');
    for (const player of result.newState.players.values()) {
      const userId = userIdMap.get(player.uuid);
      if (userId) {
        try {
          await db.query(
            `UPDATE room_seats 
             SET chips_in_play = $1 
             WHERE room_id = $2 AND user_id = $3`,
            [player.stack, roomId, userId]
          );
          console.log(`  ✅ Updated ${player.name}: stack=${player.stack}`);
        } catch (dbErr) {
          console.error(`  ❌ Failed to update ${player.name} stack:`, dbErr.message);
        }
      }
    }
  }
  
  // Return early - events are already sent
  return res.json({
    gameId,
    action,
    amount: amount || 0,
    street: result.newState.currentStreet,
    pot: result.newState.pot.totalPot,
    isHandComplete: true,
    winners: winnersWithStacks,
    players: Array.from(result.newState.players.values()).map(p => ({
      id: p.uuid,
      name: p.name,
      stack: p.stack
    })),
    engine: 'SOPHISTICATED_TYPESCRIPT',
    events: result.events,
    message: 'All-in runout events broadcasted'
  });
}
```

**IMPORTANT**: Change line 1029 from:
```javascript
const willBeAllInRunout = isHandComplete && result.events.filter(e => e.type === 'STREET_ADVANCED').length > 1;
```

To:
```javascript
const willBeAllInRunout = isHandComplete && result.events.filter(e => e.type === 'STREET_ADVANCED').length >= 1;
```

This fixes the bug where single-street runouts (e.g., all-in on turn, only river deals) weren't detected.

#### 1.5 Replace normal action broadcast (around line 1096-1133)

**Find:**
```javascript
} else {
  // Normal action - full game state update with player stacks
```

**Replace the io.to().emit() section with:**
```javascript
} else {
  // Normal action - emit granular events
  const userIdMap = playerUserIds.get(gameId);
  const actingPlayer = result.newState.getPlayer(player_id);
  
  // Emit player action event
  eventBroadcaster.emitPlayerAction(
    roomId,
    gameId,
    player_id,
    actingPlayer ? actingPlayer.name : 'Unknown',
    action,
    amount
  );
  
  // If chips were committed, emit chips event
  if (amount && amount > 0 && (action === 'BET' || action === 'CALL' || action === 'RAISE' || action === 'ALL_IN')) {
    eventBroadcaster.emitChipsCommittedToPot(
      roomId,
      gameId,
      player_id,
      actingPlayer ? actingPlayer.name : 'Unknown',
      amount,
      actingPlayer ? actingPlayer.stack : 0,
      result.newState.pot.totalPot
    );
  }
  
  // Emit turn started for next player
  if (result.newState.toAct) {
    const nextPlayer = result.newState.getPlayer(result.newState.toAct);
    if (nextPlayer) {
      eventBroadcaster.emitTurnStarted(
        roomId,
        gameId,
        nextPlayer.uuid,
        nextPlayer.name
      );
    }
  }
}
```

### Step 2: Integrate DisplayState into Frontend

**File: `poker-engine/public/poker-test.html`**

#### 2.1 Add script tags (in <head> section)

```html
<!-- Add before closing </head> tag -->
<script src="/public/js/game-events.js"></script>
<script src="/public/js/display-state.js"></script>
```

#### 2.2 Initialize DisplayState (in <script> section, after socket initialization)

Find where the socket is initialized (around line 2480), and add:

```javascript
// Initialize display state manager
const displayState = new PokerDisplayState();

// Wait for DOM to be ready, then set element references
document.addEventListener('DOMContentLoaded', () => {
  displayState.setElements(
    document.getElementById('potAmount'),
    document.getElementById('communityCards'),
    document.getElementById('playersGrid'),
    document.getElementById('statusMessage') // You may need to add this element
  );
  
  console.log('✅ DisplayState initialized with DOM elements');
});
```

#### 2.3 Add event listener for game_event

Add this right after socket initialization:

```javascript
// Listen for new event-based system
socket.on('game_event', (event) => {
  console.log(`🎮 Game event received: ${event.type}`);
  displayState.receiveEvent(event);
});
```

#### 2.4 (Optional) Keep old event listeners for backward compatibility

You can keep the old `hand_started`, `game_state_update`, `pot_update`, `hand_complete` listeners for now, or comment them out to test the new system exclusively.

### Step 3: Testing

#### 3.1 Start the server

```bash
cd poker-engine
node sophisticated-engine-server.js
```

#### 3.2 Open browser

1. Navigate to `http://localhost:3000/poker` (or your configured port)
2. Open DevTools Console
3. Create a game and join with 2 players

#### 3.3 Test all-in scenario

1. Player 1 goes all-in
2. Player 2 calls
3. **Watch the console** - you should see:
   ```
   📡 Broadcasting: ALL_IN_RUNOUT_STARTED to room:xxx
   📡 Broadcasting: TURN_REVEALED to room:xxx
   📡 Broadcasting: RIVER_REVEALED to room:xxx
   📡 Broadcasting: WINNER_DETERMINED to room:xxx
   📡 Broadcasting: POT_AWARDED to room:xxx
   📡 Broadcasting: CHIPS_TRANSFERRED_TO_WINNER to room:xxx
   ```

4. **Verify in UI**:
   - Winner's stack shows $0 during card reveals
   - Cards reveal one at a time (1 second delay)
   - After all cards shown, pot transfers to winner
   - Winner's stack updates to final amount ONCE
   - No flickering or premature updates

#### 3.4 Debug console commands

In the browser console, you can inspect the display state:

```javascript
// Check current display state
displayState.getState();

// Check if animating
displayState.isProcessingAnimation;

// Check event queue
displayState.eventQueue;

// Manual reset (if needed)
displayState.reset();
```

## Key Differences from Old System

| Aspect | Old System (State-based) | New System (Event-based) |
|--------|-------------------------|--------------------------|
| **Backend sends** | State snapshots | Atomic events |
| **Frontend receives** | Mixed state via WebSocket + HTTP | Event stream only |
| **Timing control** | Backend (timeouts) | Frontend (queue) |
| **Race conditions** | HTTP GET can return wrong state | Events processed in order |
| **Animation** | Backend sets delay | Frontend controls animation |
| **Stack updates** | Immediate (premature) | Only when CHIPS_TRANSFERRED event |
| **Debugging** | Hard (state changes) | Easy (event log) |
| **Replay** | Impossible | Trivial (replay events) |

## Benefits

1. **No More Race Conditions**: Events are ordered and queued
2. **Frontend Controls Timing**: Backend doesn't know about animations
3. **Easier Debugging**: Event log shows exactly what happened
4. **Spectator Mode Ready**: Just replay event stream
5. **Hand History Free**: Event log IS the hand history
6. **Testable**: Record events, replay in tests
7. **Scalable**: Adding new features = adding new events

## Migration Strategy

### Phase 1: Dual System (Recommended)

Keep both old and new systems running:
- New events go through EventBroadcaster
- Old events still work
- Gradually migrate UI to use DisplayState

### Phase 2: Full Migration

Once tested, remove:
- Old broadcast code in server
- Old event listeners in frontend
- Animation context (gameAnimations Map)
- Display snapshot logic

### Phase 3: Cleanup

- Remove deprecated code
- Update all documentation
- Add more event types as needed

## Troubleshooting

### Events not received

1. Check browser console: Do you see `🎮 Game event received`?
2. Check server console: Do you see `📡 Broadcasting:`?
3. Verify socket connection: `socket.connected` should be `true`

### Animation not working

1. Check `displayState.isProcessingAnimation` - should be `true` during animation
2. Check `displayState.eventQueue.length` - events should queue up
3. Verify `processNextEvent()` is being called after animation

### Stack updates prematurely

1. Verify you changed line 1029: `>= 1` not `> 1`
2. Check that `CHIPS_TRANSFERRED_TO_WINNER` is the LAST event in sequence
3. Verify `handleChipsTransferredToWinner()` is being called

## Next Steps

1. Add more event types for other features
2. Implement event replay for spectators
3. Store event log in database for hand history
4. Add time-travel debugging (replay to any point)
5. Build mobile frontend (consumes same events)

## Conclusion

This event-based architecture fundamentally solves the brittleness issue. Instead of fighting timing with setTimeout and hoping HTTP GET returns the right state, the frontend controls its own display state and processes events when ready.

The backend is now **stateless from the frontend's perspective** - it just reports facts ("pot awarded"), and the frontend decides when and how to show those facts.

