# ⏰ DAY 4 BATTLE PLAN - SERVER-SIDE TIMER SYSTEM

**Mission:** Build authoritative server-side timers that survive refresh and enforce turn limits!

## 🎯 Primary Objectives

### 1. Timer Architecture
- **Timestamp-based**: Store `turn_started_at` + `turn_time_seconds`
- **Server enforced**: Backend auto-folds on timeout
- **Survives refresh**: Already supported by hydration!
- **Timebank system**: Extra time pool per player

### 2. Database Schema (Already Added!)
From our Day 1 migration:
```sql
-- In game_states table
turn_started_at TIMESTAMPTZ,
turn_time_seconds INT,
current_turn_player_id VARCHAR(255)

-- In rooms table  
turn_time_seconds INT DEFAULT 30,
timebank_seconds INT DEFAULT 60

-- New turn_timers table
CREATE TABLE turn_timers (
  game_id UUID,
  player_id VARCHAR(255),
  turn_started_at TIMESTAMPTZ,
  turn_time_seconds INT,
  timebank_used_ms INT DEFAULT 0
);
```

### 3. Implementation Plan

#### Phase 1: Start Turn Timer
When action moves to a player:
```javascript
// In game engine when setting current actor
async function startPlayerTurn(gameId, playerId) {
  const turnTime = room.turn_time_seconds || 30;
  
  // Record in database
  await dbV2.startTurn(gameId, playerId, turnTime);
  
  // Schedule auto-fold
  scheduleAutoFold(gameId, playerId, turnTime * 1000);
  
  // Broadcast with timer info
  io.emit('turn_started', {
    type: 'turn_started',
    seq: await dbV2.incrementSequence(roomId),
    payload: {
      gameId,
      playerId,
      turnStartedAt: new Date(),
      turnTimeSeconds: turnTime,
      timebankAvailable: player.timebank_ms || 0
    }
  });
}
```

#### Phase 2: Auto-Fold System
```javascript
// Timer manager
const activeTimers = new Map();

function scheduleAutoFold(gameId, playerId, delayMs) {
  const key = `${gameId}:${playerId}`;
  
  // Clear any existing timer
  if (activeTimers.has(key)) {
    clearTimeout(activeTimers.get(key));
  }
  
  // Set new timer
  const timerId = setTimeout(async () => {
    await enforceTimeout(gameId, playerId);
    activeTimers.delete(key);
  }, delayMs);
  
  activeTimers.set(key, timerId);
}

async function enforceTimeout(gameId, playerId) {
  // Check if still their turn
  const timer = await dbV2.getTurnTimer(gameId);
  if (timer.player_id !== playerId) return;
  
  // Check timebank
  const timebankRemaining = await getTimebankRemaining(playerId);
  if (timebankRemaining > 0) {
    // Use timebank
    await useTimebank(gameId, playerId);
    return;
  }
  
  // Auto-fold
  await executeAction(gameId, playerId, 'fold', 0);
}
```

#### Phase 3: Timebank Management
```javascript
// Player starts with room.timebank_seconds
// Tracked per game in players table
async function useTimebank(gameId, playerId) {
  const TIMEBANK_CHUNK = 10; // seconds
  
  // Deduct from timebank
  await db.query(
    `UPDATE players 
     SET timebank_remaining_ms = timebank_remaining_ms - $1
     WHERE game_id = $2 AND user_id = $3
     RETURNING timebank_remaining_ms`,
    [TIMEBANK_CHUNK * 1000, gameId, playerId]
  );
  
  // Extend turn
  scheduleAutoFold(gameId, playerId, TIMEBANK_CHUNK * 1000);
  
  // Notify
  io.emit('timebank_used', {
    type: 'timebank_used',
    seq: await dbV2.incrementSequence(roomId),
    payload: {
      playerId,
      secondsUsed: TIMEBANK_CHUNK,
      remaining: timebankRemaining
    }
  });
}
```

#### Phase 4: Client Display (Read-Only)
```javascript
// Client just displays countdown
function displayTimer(turnData) {
  const { turnStartedAt, turnTimeSeconds } = turnData;
  const elapsed = Date.now() - new Date(turnStartedAt).getTime();
  const remaining = Math.max(0, turnTimeSeconds * 1000 - elapsed);
  
  // Update UI countdown
  updateTimerDisplay(remaining);
  
  // No client enforcement! Server handles timeout
}
```

### 4. Integration Points

#### A. Game State Machine
- Hook into `setCurrentActor()`
- Start timer when turn begins
- Clear timer when action received

#### B. Action Endpoints
- Cancel timer on valid action
- Check if action is within time limit
- Reject actions after timeout

#### C. Hydration Endpoint
- Include `turn_started_at` in response
- Calculate `remaining_time` server-side
- Include `timebank_remaining`

#### D. WebSocket Events
- `turn_started` - Timer begins
- `timebank_used` - Extra time activated
- `turn_timeout` - Player auto-folded

### 5. Edge Cases

1. **Disconnection During Turn**
   - Timer continues server-side
   - Reconnect shows remaining time

2. **All-In Players**
   - Skip timer for all-in players
   - Move instantly to next active player

3. **Hand End**
   - Clear all active timers
   - Reset timebanks for new hand

4. **Pause/Resume**
   - Store pause timestamp
   - Adjust timer on resume

## 🛠️ Implementation Steps

### Step 1: Timer Service Module
Create `src/services/timer-service.js`:
- Timer scheduling
- Auto-fold logic
- Timebank management
- Cleanup methods

### Step 2: Integrate with Game Engine
Modify game state machine:
- Start timer on turn change
- Cancel timer on action
- Handle timeout events

### Step 3: Update Action Handlers
In `routes/games.js`:
- Check timer validity
- Cancel timer after action
- Enforce time limits

### Step 4: Enhance Hydration
Add to hydration response:
- Current turn timer
- Timebank status
- Time remaining calculation

### Step 5: Client Timer Display
Update poker UI:
- Show countdown (read-only)
- Timebank button
- Visual warnings

## 🎯 Success Criteria

1. **Authoritative**: Server enforces all timeouts
2. **Accurate**: Within 1 second precision
3. **Persistent**: Survives refresh/disconnect
4. **Fair**: Timebank available equally
5. **Clear**: Players see time remaining

## 🚫 What NOT to Do

- ❌ Client-side timeout enforcement
- ❌ Trusting client timestamps
- ❌ Resetting timer on refresh
- ❌ Blocking server on timer wait

## 🎖️ Victory Conditions

- ✅ Turn timer starts automatically
- ✅ Auto-fold works reliably
- ✅ Timebank activates smoothly
- ✅ Refresh shows correct remaining time
- ✅ No timer memory leaks

---

**LET'S BUILD THE CLOCK THAT NEVER LIES!**
