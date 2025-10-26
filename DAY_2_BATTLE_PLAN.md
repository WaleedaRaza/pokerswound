# ⚔️ DAY 2 BATTLE PLAN - SEQUENCE NUMBERS & IDEMPOTENCY
**Target Date:** October 27, 2025  
**Mission:** Add seq to ALL mutations, prevent duplicates forever  
**Foundation:** Day 1 database complete ✅

---

## 🎯 OBJECTIVES

By end of Day 2:
1. **Every mutation increments seq**
2. **Every action is idempotent**
3. **Every broadcast includes seq**
4. **Client rejects seq <= currentSeq**

This sets up Day 3's hydration endpoint to FIX THE REFRESH BUG!

---

## 📋 MORNING TASKS (4 hours)

### 1. Add Sequence Increment to Game Mutations (2 hours)
Files to modify:
- `routes/games.js` - All POST endpoints
- `routes/rooms.js` - Join/leave endpoints
- `sophisticated-engine-server.js` - Any remaining mutations

Pattern to add:
```javascript
// Before broadcast
const seq = await req.app.locals.dbV2.incrementSequence(roomId);

// Include in broadcast
io.to(`room:${roomId}`).emit('table_update', {
  type: 'table_update',
  version: '1.0.0',
  seq: seq,
  timestamp: Date.now(),
  payload: gameState
});
```

### 2. Create Idempotency Middleware (1 hour)
File: `src/middleware/idempotency.js`
```javascript
async function withIdempotency(req, res, next) {
  const key = req.headers['x-idempotency-key'];
  if (!key) return res.status(400).json({ error: 'X-Idempotency-Key required' });
  
  // Check if already processed
  const existing = await req.app.locals.dbV2.checkIdempotency(key, req.user.id);
  if (existing) {
    return res.json(existing);
  }
  
  // Store original json method
  const originalJson = res.json.bind(res);
  
  // Override to capture and store result
  res.json = async (data) => {
    await req.app.locals.dbV2.storeIdempotency(key, req.user.id, req.path, data, req.params.roomId);
    return originalJson(data);
  };
  
  next();
}
```

### 3. Apply Middleware to All POST Endpoints (1 hour)
- `/api/games/*` - All game actions
- `/api/rooms/*/join` - Seat claims
- `/api/rooms/*/lobby/*` - Approvals

---

## 📋 AFTERNOON TASKS (4 hours)

### 4. Update WebSocket Message Format (1 hour)
Standardize ALL socket emissions:
```javascript
{
  type: 'table_update' | 'private_cards' | 'timer_tick' | 'player_joined',
  version: '1.0.0',
  seq: number,
  timestamp: number,
  payload: any
}
```

### 5. Update Client to Track Sequence (2 hours)
In `public/pages/play.html`:
```javascript
let currentSeq = 0;

socket.on('table_update', (message) => {
  // Validate message structure
  if (!message.seq || !message.type || !message.version) {
    console.warn('Invalid message format:', message);
    return;
  }
  
  // Check sequence
  if (message.seq <= currentSeq) {
    console.log(`Ignoring stale update: ${message.seq} <= ${currentSeq}`);
    return;
  }
  
  currentSeq = message.seq;
  updateTableUI(message.payload);
});
```

### 6. Integration Testing (1 hour)
Create `tests/sequence-idempotency.test.js`:
- Send duplicate requests → verify same response
- Send out-of-order updates → verify ignored
- Simulate network delays → verify correct ordering

---

## 🔍 CRITICAL PATHS TO UPDATE

### Game Actions
- `POST /api/games/:id/action` - fold/call/raise
- `POST /api/games/:id/start-hand` - deal cards
- `POST /api/games/:id/end-hand` - complete hand

### Room Management  
- `POST /api/rooms` - create room
- `POST /api/rooms/:id/join` - claim seat
- `POST /api/rooms/:id/leave` - release seat
- `POST /api/rooms/:id/settings` - update settings

### Lobby System
- `POST /api/rooms/:id/lobby/join` - request to join
- `POST /api/rooms/:id/lobby/approve` - approve player
- `POST /api/rooms/:id/lobby/reject` - reject player

---

## ⚠️ GOTCHAS TO AVOID

1. **Don't forget rejoin after refresh** - Sequence must continue from where it left off
2. **Transaction safety** - Increment seq IN SAME TRANSACTION as mutation
3. **Broadcast after commit** - Only broadcast AFTER database write succeeds
4. **Private messages need seq too** - hole cards, private notifications

---

## 🎯 SUCCESS CRITERIA

By end of Day 2:
- [ ] Can send same request 10x → get same response
- [ ] Can send updates out of order → old ones ignored  
- [ ] Can refresh → sequence continues correctly
- [ ] Can simulate network issues → no duplicate actions

---

## 🚀 THIS ENABLES DAY 3

With sequences + idempotency:
1. Hydration can return current seq
2. Client knows exactly what updates it has
3. No fear of duplicate actions on retry
4. **Perfect foundation for refresh recovery!**

---

## 💪 BATTLE CRY

**Day 2 is about CONSISTENCY!**

No more duplicate bets. No more stale updates. No more race conditions.

Every action happens EXACTLY ONCE. Every update arrives IN ORDER.

**TOMORROW WE ADD PRECISION TO OUR ARSENAL!**

⚔️🎯🔥
