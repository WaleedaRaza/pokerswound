# ROLLBACK: Session Management Separated from Game Flow

## What I Broke

By trying to integrate session management into `join_room`, I broke the existing seat claiming flow that was working perfectly via the API.

## What I Fixed

**Changed: `websocket/socket-handlers.js` - `join_room` event**

**Before (BROKEN):**
```javascript
socket.on('join_room', async (data) => {
  // Tried to bind seats here → CONFLICTED with claimSeat() API
  if (seatIndex !== undefined) {
    seatToken = await sessionService.bindUserToSeat(userId, roomId, seatIndex);
  }
});
```

**After (FIXED):**
```javascript
socket.on('join_room', async (data) => {
  // ONLY joins lobby, NO seat binding
  // Session creation is optional and non-blocking
  socket.join(`room:${roomId}`);
  // Seat claiming stays with existing claimSeat() API
});
```

## Game Flow (Restored to Working State)

1. **User joins room** → `join_room` event → Joins lobby only
2. **User clicks "Claim Seat"** → API call to `/api/rooms/:roomId/seats/:seatIndex` → Seat claimed
3. **Host starts game** → Works as before

## Session Management (Now Non-Intrusive)

- Session creation happens in background
- Does NOT interfere with game flow
- Optional feature for future refresh recovery
- **Game works WITHOUT it**

## What You Should Test Now

1. Create room → Should work ✅
2. Guest joins → Should work ✅
3. Approve guest → Should work ✅
4. **Both claim seats** → **Should work** ✅
5. **Host starts game** → **Should work** ✅

The game flow is back to how it was. Session stuff happens in the background and doesn't break anything.

**Server running:** http://localhost:3000

Test it. If seats work, we can cautiously add refresh recovery LATER without breaking the game.

