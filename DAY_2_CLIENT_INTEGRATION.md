# 📋 DAY 2 CLIENT INTEGRATION GUIDE

## What needs to be done in play.html:

### 1. Load Sequence Tracker
```html
<script src="/js/sequence-tracker.js"></script>
```

### 2. Initialize Tracker
```javascript
// At top of script
const sequenceTracker = new SequenceTracker();
```

### 3. Update ALL Socket Handlers
Replace each handler with sequence-aware version:

```javascript
// OLD:
socket.on('player_joined', (data) => {
  loadLobbyPlayers();
});

// NEW:
socket.on('player_joined', sequenceTracker.createHandler((data) => {
  loadLobbyPlayers();
}));
```

### 4. Socket Events to Update:
- [x] connect - No seq needed
- [x] disconnect - No seq needed  
- [ ] game_started - Needs seq wrapper
- [ ] player_approved - Needs seq wrapper
- [ ] player_joined - Needs seq wrapper
- [ ] game_state_update - Needs seq wrapper

### 5. Add Sequence Monitoring
```javascript
// Add sequence event monitoring
sequenceTracker.addListener((event, data) => {
  if (event === 'gap') {
    console.warn('⚠️ Missed sequences:', data.missing);
    // Could request resync here
  }
});
```

### 6. Set Sequence on Hydration
When implementing Day 3's hydration:
```javascript
// After successful hydration
const hydrationData = await fetchHydration();
sequenceTracker.setSequence(hydrationData.seq);
```

---

## Testing Sequence Tracking

1. Open browser console
2. Join a room
3. Take actions
4. Watch for:
   - "✅ Sequence advanced: X → Y"
   - "🚫 Ignoring stale update: seq X <= current Y"
   - "⚠️ Sequence gap detected"

---

## Why This Matters for Day 3

With sequence tracking:
1. Hydration returns current seq
2. Client sets sequenceTracker to that seq
3. Any stale updates are automatically ignored
4. Fresh updates continue from correct point
5. **NO MORE STATE CONFUSION AFTER REFRESH!**
