# 🌊 DAY 3 BATTLE PLAN - HYDRATION ENDPOINT (REFRESH FIX!)

**Mission:** BUILD THE HYDRATION SYSTEM THAT FIXES THE REFRESH BUG FOREVER!

## 🎯 Primary Objective

Create a single source of truth endpoint that returns COMPLETE game state on reconnect. No more lobby flash, no more lost state, no more refresh despair!

## 🔥 Critical Requirements

### 1. Hydration Endpoint: GET /rooms/:roomId/hydrate

Must return a COMPLETE snapshot:
```javascript
{
  seq: currentSequence,         // Latest sequence number
  timestamp: Date.now(),
  room: {
    id, code, host_id, 
    capacity, status,
    turn_time_seconds,
    timebank_seconds
  },
  game: {
    id, status, current_hand_id,
    small_blind, big_blind
  },
  hand: {
    id, phase, board,
    pot_total, current_bet,
    dealer_seat, actor_seat,
    timer: {
      started_at,
      turn_time_remaining,
      timebank_remaining
    }
  },
  seats: [
    {
      index, user_id, username,
      stack, status,
      current_bet, has_acted,
      is_all_in, has_folded
    }
  ],
  me: {
    user_id, seat_index,
    hole_cards: ['Ah', 'Kd'],  // ONLY for requesting user
    timebank_remaining,
    rejoin_token  // For secure reconnection
  },
  recent_actions: [  // Last 5 actions for context
    { seq, type, player_id, amount }
  ]
}
```

### 2. WebSocket state_sync Event

On socket connection with room context:
```javascript
socket.on('authenticate', async (data) => {
  const { roomId, userId, rejoinToken } = data;
  
  // Validate rejoin token
  const valid = await validateRejoinToken(rejoinToken, roomId, userId);
  
  // Get hydration data
  const snapshot = await hydrateRoom(roomId, userId);
  
  // Send state_sync immediately
  socket.emit('state_sync', snapshot);
});
```

### 3. Client Hydration Flow

```javascript
// On page load/refresh
async function initializeGame() {
  // 1. Check if we have room context
  const roomId = getRoomFromURL() || localStorage.getItem('currentRoomId');
  if (!roomId) return showLobby();
  
  // 2. Fetch hydration data
  const snapshot = await fetch(`/api/rooms/${roomId}/hydrate?userId=${userId}`)
    .then(r => r.json());
  
  // 3. Initialize sequence tracker with current seq
  sequenceTracker.currentSeq = snapshot.seq;
  
  // 4. Render game state directly
  renderGameFromSnapshot(snapshot);
  
  // 5. Connect WebSocket
  socket = io({ query: { roomId, userId } });
  socket.on('connect', () => {
    socket.emit('authenticate', { roomId, userId, rejoinToken });
  });
  
  // 6. Listen for state_sync to confirm
  socket.on('state_sync', (data) => {
    if (data.seq > sequenceTracker.currentSeq) {
      renderGameFromSnapshot(data);
    }
  });
}
```

## 🛠️ Implementation Steps

### Step 1: Update my-state Endpoint
Transform the existing `/my-state` endpoint into full `/hydrate`:
- Add hand details (board, pot, phase)
- Add timer information
- Add recent actions
- Include rejoin token generation

### Step 2: Create Composite Query
Build efficient SQL to gather all data in one query:
```sql
WITH room_data AS (
  SELECT * FROM rooms WHERE id = $1
),
game_data AS (
  SELECT g.*, gs.current_state, gs.seq 
  FROM games g
  JOIN game_states gs ON g.id = gs.id
  WHERE g.room_id = $1 AND g.status = 'IN_PROGRESS'
),
hand_data AS (
  SELECT * FROM hands 
  WHERE game_id = (SELECT id FROM game_data)
  ORDER BY hand_number DESC LIMIT 1
),
seat_data AS (
  SELECT rs.*, p.stack, p.status as player_status
  FROM room_seats rs
  LEFT JOIN players p ON p.game_id = game_data.id 
    AND p.user_id = rs.user_id
  WHERE rs.room_id = $1
)
SELECT json_build_object(...) as hydration_data;
```

### Step 3: Add Private Data Layer
- Fetch hole cards for requesting user only
- Include timebank status
- Generate fresh rejoin token

### Step 4: Socket Handler Updates
- Modify websocket/socket-handlers.js authenticate event
- Add state_sync emission
- Ensure room binding on connect

### Step 5: Client Integration
- Update poker.html refresh recovery
- Use hydration instead of multiple endpoints
- Remove the 3-step recovery dance
- Direct render from snapshot

## 🚨 Critical Success Factors

1. **Atomic Read** - Entire snapshot from one consistent read
2. **Private Isolation** - Never leak other players' hole cards
3. **Sequence Continuity** - Client picks up at exact right seq
4. **Timer Accuracy** - Calculate remaining time server-side
5. **Direct Render** - No lobby flash, straight to game

## 📊 Test Scenarios

1. **Mid-Hand Refresh**
   - Player refreshes during betting
   - Must see exact game state, timer, own cards

2. **Post-Disconnect Rejoin**
   - Network drops, player returns
   - Seat preserved, state intact

3. **Multi-Tab Sync**
   - Same user, multiple tabs
   - All tabs show same state

4. **Race Condition**
   - Refresh during state transition
   - Sequence number prevents confusion

## 🎖️ Victory Conditions

- ✅ Zero lobby flash on refresh
- ✅ Hole cards preserved for active player
- ✅ Timer continues accurately
- ✅ All UI elements render correctly
- ✅ Sequence tracking prevents stale updates

## 💪 Battle Cry

> "THE REFRESH BUG DIES TODAY! HYDRATION BRINGS LIFE TO OUR WITHERED STATE!"

---

**LET'S BUILD THE FOUNTAIN OF ETERNAL GAME STATE!**
