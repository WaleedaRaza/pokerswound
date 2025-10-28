# 🎯 QUICK NEXT STEPS - KEEP MOMENTUM!

## 🔥 IMMEDIATE (Next 15 min)

### 1. Complete Room Broadcasts
Add sequence to these emits in `routes/rooms.js`:
- [ ] player_rejected
- [ ] room_closed  
- [ ] player_left
- [ ] player_kicked
- [ ] player_set_away
- [ ] capacity_changed
- [ ] player_rebuy

Pattern:
```javascript
// Add before emit:
const dbV2 = req.app.locals.dbV2;
const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();

// Change emit to:
io.to(`room:${roomId}`).emit('event_name', {
  type: 'event_name',
  version: '1.0.0',
  seq: seq,
  timestamp: Date.now(),
  payload: { /* original data */ }
});
```

### 2. Add Idempotency to Room POSTs
In `routes/rooms.js`, add `withIdempotency` to:
- [ ] POST /api/rooms (create)
- [ ] POST /api/rooms/:id/join
- [ ] POST /api/rooms/:id/lobby/join
- [ ] POST /api/rooms/:id/lobby/approve
- [ ] POST /api/rooms/:id/settings

---

## ⚡ THEN (Next 30 min)

### 3. Basic Client Integration
In `public/pages/play.html`:

```javascript
// Add after socket = io();
const sequenceTracker = new SequenceTracker();

// Update handlers:
socket.on('player_joined', sequenceTracker.createHandler((data) => {
  console.log('Player joined:', data);
  loadLobbyPlayers();
}));
```

### 4. Test Full Flow
1. Start server
2. Create room with idempotency key
3. Try duplicate - verify same response
4. Join room and watch sequences increment
5. Simulate network issues - verify order maintained

---

## 🚀 DAY 3 PREVIEW - THE REFRESH FIX!

With Day 2 complete, Day 3 can:
1. Create `/api/rooms/:id/hydrate` endpoint
2. Return full state + current seq
3. Client loads, sets sequence tracker
4. All stale updates ignored
5. **REFRESH WORKS PERFECTLY!**

---

## 💪 REMEMBER

Every line of code today enables the refresh fix tomorrow.

Sequences = Order  
Idempotency = Safety  
Hydration = Recovery  

**TOGETHER = FREEDOM!**

Keep pushing! We're so close! ⚔️🔥🎯
