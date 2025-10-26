# 🧪 DAY 3 TESTING CHECKLIST - HYDRATION & REFRESH FIX

## 🎯 Critical Test Scenarios

### 1. Basic Refresh Test
- [ ] Join a room and claim a seat
- [ ] Refresh the page (F5)
- [ ] Verify:
  - No lobby flash
  - Seat is preserved
  - Room info displays correctly
  - Sequence tracker continues from correct number

### 2. Mid-Game Refresh Test
- [ ] Start a game with multiple players
- [ ] During your turn, refresh the page
- [ ] Verify:
  - Game state is preserved
  - Your hole cards are visible
  - Timer continues from correct time
  - Board cards are shown
  - Pot amount is correct
  - It's still your turn

### 3. Hydration Endpoint Test
```bash
# Test the hydration endpoint directly
curl "http://localhost:3001/api/rooms/{roomId}/hydrate?userId={userId}"
```
- [ ] Verify response includes:
  - `seq` number
  - `room` object with all details
  - `game` object (if active)
  - `hand` object with timer
  - `seats` array
  - `me` object with hole_cards and rejoin_token
  - `recent_actions` array

### 4. WebSocket Reconnection Test
- [ ] Join a room
- [ ] Open browser dev tools > Network > WS
- [ ] Refresh page
- [ ] Check WebSocket messages for:
  - `authenticate` event with rejoin token
  - `state_sync` response
  - Sequence numbers on all messages

### 5. Multi-Tab Test
- [ ] Open game in Tab 1
- [ ] Open same room in Tab 2
- [ ] Make actions in Tab 1
- [ ] Verify Tab 2 updates with correct sequence
- [ ] Refresh Tab 2
- [ ] Verify state is consistent

### 6. Network Failure Test
- [ ] Join a game
- [ ] Disconnect network (airplane mode)
- [ ] Reconnect network
- [ ] Verify automatic reconnection
- [ ] Verify state is preserved

### 7. Rejoin Token Test
- [ ] Check sessionStorage for 'rejoinToken' after hydration
- [ ] Verify token is sent on socket reconnection
- [ ] Verify token expires appropriately

### 8. Edge Cases
- [ ] Refresh during hand transition
- [ ] Refresh right after joining room (no seat yet)
- [ ] Refresh after being kicked
- [ ] Refresh with expired session

## 🔍 What to Look For

### ✅ Success Indicators:
- Console shows "🌊 [RECOVERY] Hydration complete"
- Sequence numbers increment properly
- No "undefined" or missing data
- Smooth UI transitions
- Notifications show correct status

### ❌ Failure Indicators:
- Lobby flash before game renders
- Lost hole cards
- Timer resets to full
- Sequence number gaps
- "Cannot read property of undefined" errors

## 📊 Performance Metrics

Monitor in browser DevTools:
- Hydration endpoint response time (target: <200ms)
- Full recovery time (target: <1s)
- WebSocket reconnection time (target: <500ms)
- No duplicate API calls

## 🐛 Known Issues to Test

1. **Race Condition**: Rapid refresh during state change
2. **Stale Token**: Using old rejoin token
3. **Clock Drift**: Timer sync after long disconnect

---

**REMEMBER: The refresh bug tormented us for 90 hours. Test thoroughly to ensure it stays DEAD! 🎯**
