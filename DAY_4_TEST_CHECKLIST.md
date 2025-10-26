# 🧪 DAY 4 TESTING CHECKLIST - TIMER SYSTEM

## 🎯 Critical Test Scenarios

### 1. Basic Timer Test
- [ ] Start a new hand with multiple players
- [ ] Observe timer countdown for first player
- [ ] Let timer expire without action
- [ ] Verify:
  - Auto-fold occurs exactly at 0
  - `turn_timeout` event broadcast
  - Next player's timer starts automatically
  - Folded player marked correctly

### 2. Timebank Activation Test
- [ ] Start a hand
- [ ] Let main timer expire (30s)
- [ ] Verify:
  - Timebank auto-activates
  - Timer display changes color/style
  - `timebank_used` event broadcast
  - Timer continues with timebank

### 3. Timebank Exhaustion Test
- [ ] Let main timer expire
- [ ] Let entire timebank expire (60s default)
- [ ] Verify:
  - Final auto-fold occurs
  - No more extensions
  - Player marked as folded
  - Next player's timer starts

### 4. Action Cancels Timer Test
- [ ] Start timer for player
- [ ] Make action before timeout (fold/call/raise)
- [ ] Verify:
  - Timer immediately stops
  - No timeout occurs
  - Next player's timer starts
  - No lingering timers

### 5. Refresh During Timer Test
- [ ] Start a hand with timer running
- [ ] Note remaining time (e.g., 18s)
- [ ] Refresh the page
- [ ] Verify:
  - Timer continues from correct time
  - No timer reset
  - Hydration includes timer data
  - Display matches server state

### 6. Hand Completion Clears Timers
- [ ] Play a hand to completion
- [ ] Verify:
  - All timers cleared
  - No orphaned timeouts
  - Console shows "cleared all timers"
  - Next hand starts fresh

### 7. Multi-Table Timer Isolation
- [ ] Start games in 2 different rooms
- [ ] Let timer expire in room 1
- [ ] Verify:
  - Only room 1 player folds
  - Room 2 unaffected
  - Timers properly isolated

### 8. Rapid Action Test
- [ ] Make actions very quickly
- [ ] Verify:
  - No timer overlap
  - Each player gets proper timer
  - No race conditions
  - Sequence maintained

### 9. All-In Player Skip Test
- [ ] Have a player go all-in
- [ ] Continue to next street
- [ ] Verify:
  - All-in player skipped for timer
  - Timer goes to next active player
  - No timer for all-in players

### 10. WebSocket Events Test
Monitor WebSocket tab in DevTools:
- [ ] `turn_started` includes all timer data
- [ ] `timebank_used` shows remaining
- [ ] `turn_timeout` shows fold reason
- [ ] All events have sequence numbers

## 🔍 Performance Checks

### Timer Accuracy
- [ ] Server timeout within 100ms of expected
- [ ] Client display smooth (60 FPS)
- [ ] No memory leaks after 50+ hands

### Database Verification
```sql
-- Check timer data is stored
SELECT actor_turn_started_at, actor_timebank_remaining 
FROM game_states 
WHERE room_id = ?;

-- Verify timebank updates
SELECT timebank_remaining_ms 
FROM players 
WHERE game_id = ?;
```

## 🐛 Edge Cases

1. **Player Disconnects During Turn**
   - Timer should continue
   - Auto-fold still occurs
   - Can rejoin to see result

2. **Host Pauses Game** (future feature)
   - Timers should pause
   - Resume from same point

3. **Clock Drift**
   - Server time authoritative
   - Client adjusts if needed

## 📊 Monitoring

Check server logs for:
```
⏱️ Starting 30s timer for player xyz
⏰ Timer expired for player xyz  
✅ Auto-fold completed for player xyz
🛑 Cleared timer for game:player
🧹 Cleared 3 timers for game abc
```

## 🎬 Visual Testing

1. **Timer States**
   - Green (> 10s)
   - Yellow (5-10s) with pulse
   - Red (< 5s) with fast pulse
   - Purple (timebank) with slow pulse

2. **Timer Display Positions**
   - Centered on active player
   - Visible at all zoom levels
   - Mobile responsive

---

**TIMER SYSTEM MUST BE BULLETPROOF - TEST THOROUGHLY! ⏰🎯**
