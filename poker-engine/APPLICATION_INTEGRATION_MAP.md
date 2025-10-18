# Application Integration Map
**How Each Database Table Connects to Application Code**

## Table → Code Integration Mapping

### 🏠 ROOM MANAGEMENT LAYER

#### `rooms` Table
**Application Files:**
- `sophisticated-engine-server.js:1687` - `POST /api/rooms` (create)
- `sophisticated-engine-server.js:1750` - `GET /api/rooms/:roomId/lobby/players` (query)
- `sophisticated-engine-server.js:1950` - `createGame()` (room → game transition)

**WebSocket Events:**
- `room_created` - Broadcast to all clients
- `room_updated` - Status changes
- `room_deleted` - Cleanup notifications

**Key Functions:**
```javascript
// Create room
async function createRoom({ name, small_blind, big_blind, min_buy_in, max_buy_in, max_players, is_private, host_user_id })

// Query room players
const seatsRes = await db.query(`
  SELECT rs.seat_index, rs.user_id, rs.chips_in_play, up.username
  FROM room_seats rs
  JOIN user_profiles up ON rs.user_id = up.id
  WHERE rs.room_id = $1 AND rs.status = 'SEATED' AND rs.left_at IS NULL
`, [roomId]);
```

---

#### `room_players` Table
**Application Files:**
- `sophisticated-engine-server.js:1720` - `POST /api/rooms/:roomId/lobby/join` (create)
- `sophisticated-engine-server.js:1750` - `GET /api/rooms/:roomId/lobby/players` (query)
- `sophisticated-engine-server.js:1800` - `POST /api/rooms/:roomId/lobby/approve` (update)
- `sophisticated-engine-server.js:1820` - `POST /api/rooms/:roomId/lobby/reject` (update)

**WebSocket Events:**
- `player_joined_lobby` - New player in lobby
- `player_approved` - Host approved player
- `player_rejected` - Host rejected player

**Key Functions:**
```javascript
// Join lobby
app.post('/api/rooms/:roomId/lobby/join', async (req, res) => {
  const { user_id } = req.body;
  await db.query(`
    INSERT INTO room_players (room_id, user_id, status, approved_at)
    VALUES ($1, $2, $3, ${status === 'approved' ? 'NOW()' : 'NULL'})
  `, [roomId, user_id, status]);
});

// Approve player
app.post('/api/rooms/:roomId/lobby/approve', async (req, res) => {
  await db.query(`
    UPDATE room_players 
    SET status = 'approved', approved_at = NOW() 
    WHERE room_id = $1 AND user_id = $2
  `, [roomId, targetUserId]);
});
```

---

#### `room_seats` Table
**Application Files:**
- `sophisticated-engine-server.js:1780` - `claimSeat()` function
- `sophisticated-engine-server.js:1850` - `syncPlayersFromRoomSeats()` function
- `poker.html:2553` - `claimSeat()` frontend call

**WebSocket Events:**
- `seat_claimed` - Player claimed a seat
- `seat_vacated` - Player left seat
- `seat_updated` - Chip amount changes

**Key Functions:**
```javascript
// Claim seat
async function claimSeat({ roomId, userId, seatIndex, buyInAmount }) {
  await client.query(`
    INSERT INTO room_seats (room_id, user_id, seat_index, status, chips_in_play)
    VALUES ($1, $2, $3, 'SEATED', $4)
  `, [roomId, userId, seatIndex, buyInAmount]);
}

// Sync players from seats
async function syncPlayersFromRoomSeats(roomId) {
  const seatsRes = await db.query(`
    SELECT rs.seat_index, rs.user_id, rs.chips_in_play, up.username
    FROM room_seats rs
    JOIN user_profiles up ON rs.user_id = up.id
    WHERE rs.room_id = $1 AND rs.status = 'SEATED' AND rs.left_at IS NULL
  `, [roomId]);
}
```

---

### 🎮 GAME EXECUTION LAYER

#### `games` Table
**Application Files:**
- `sophisticated-engine-server.js:1950` - `createGame()` function
- `sophisticated-engine-server.js:2000` - `startHand()` function
- `game-state-machine.ts:245` - `processAction()` method

**WebSocket Events:**
- `game_created` - New game instance
- `game_started` - Game began
- `game_ended` - Game completed
- `game_paused` - Game paused

**Key Functions:**
```javascript
// Create game
async function createGame(roomId, gameConfig) {
  const gameId = `sophisticated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  await db.query(`
    INSERT INTO games (id, room_id, small_blind, big_blind, ante)
    VALUES ($1, $2, $3, $4, $5)
  `, [gameId, roomId, gameConfig.smallBlind, gameConfig.bigBlind, gameConfig.ante]);
}

// Start hand
async function startHand(gameId) {
  await db.query(`
    UPDATE games 
    SET status = 'active', current_hand = current_hand + 1, started_at = NOW()
    WHERE id = $1
  `, [gameId]);
}
```

---

#### `players` Table
**Application Files:**
- `sophisticated-engine-server.js:1850` - `syncPlayersFromRoomSeats()` function
- `game-state-machine.ts:245` - `processAction()` method
- `game-state-machine.ts:300` - `handleEndHand()` method

**WebSocket Events:**
- `player_joined_game` - Player entered game
- `player_left_game` - Player exited game
- `player_chips_updated` - Chip amount changed
- `player_status_changed` - Status update (active/folded/all_in)

**Key Functions:**
```javascript
// Sync players from room seats
async function syncPlayersFromRoomSeats(roomId) {
  const seatsRes = await db.query(`
    SELECT rs.seat_index, rs.user_id, rs.chips_in_play, up.username
    FROM room_seats rs
    JOIN user_profiles up ON rs.user_id = up.id
    WHERE rs.room_id = $1 AND rs.status = 'SEATED' AND rs.left_at IS NULL
  `, [roomId]);
  
  // Create players in game
  for (const seat of seatsRes.rows) {
    await db.query(`
      INSERT INTO players (game_id, user_id, seat_number, chips, status)
      VALUES ($1, $2, $3, $4, 'active')
    `, [gameId, seat.user_id, seat.seat_index, seat.chips_in_play]);
  }
}
```

---

#### `hands` Table
**Application Files:**
- `game-state-machine.ts:300` - `handleEndHand()` method
- `game-state-machine.ts:245` - `processAction()` method
- `sophisticated-engine-server.js:2000` - `startHand()` function

**WebSocket Events:**
- `hand_started` - New hand began
- `hand_ended` - Hand completed
- `community_cards_dealt` - Cards revealed
- `hand_winner` - Winner determined

**Key Functions:**
```javascript
// Start new hand
async function startHand(gameId) {
  const handId = crypto.randomUUID();
  await db.query(`
    INSERT INTO hands (id, game_id, hand_number, status, pot)
    VALUES ($1, $2, $3, 'preflop', 0)
  `, [handId, gameId, currentHand + 1]);
}

// End hand
async function handleEndHand(gameId, handId) {
  await db.query(`
    UPDATE hands 
    SET status = 'ended', ended_at = NOW(), winner_user_id = $2, winning_hand = $3
    WHERE id = $1
  `, [handId, winnerId, winningHand]);
}
```

---

#### `actions` Table
**Application Files:**
- `game-state-machine.ts:245` - `processAction()` method
- `poker.html:2553` - `takeAction()` frontend call
- `sophisticated-engine-server.js:2000` - Action processing

**WebSocket Events:**
- `action_taken` - Player made action
- `betting_round_complete` - Round finished
- `all_in` - Player went all-in

**Key Functions:**
```javascript
// Process player action
async function processAction(gameId, userId, actionType, amount) {
  const actionId = crypto.randomUUID();
  await db.query(`
    INSERT INTO actions (id, hand_id, user_id, action_type, amount, position)
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [actionId, currentHandId, userId, actionType, amount, position]);
}
```

---

### 👤 USER MANAGEMENT LAYER

#### `user_profiles` Table
**Application Files:**
- `sophisticated-engine-server.js:1780` - `claimSeat()` function
- `sophisticated-engine-server.js:1720` - `POST /api/rooms/:roomId/lobby/join`
- `poker.html:1700` - `signInAsGuest()` function
- `poker.html:2020` - `updateAuthUI()` function

**WebSocket Events:**
- `profile_updated` - Profile changes
- `user_online` - User came online
- `user_offline` - User went offline

**Key Functions:**
```javascript
// Create user profile
async function createUserProfile(userId, username) {
  await db.query(`
    INSERT INTO user_profiles (id, username, display_name, chips)
    VALUES ($1, $2, $3, 1000)
    ON CONFLICT (id) DO NOTHING
  `, [userId, username, username]);
}

// Update profile
async function updateUserProfile(userId, updates) {
  await db.query(`
    UPDATE user_profiles 
    SET username = $2, display_name = $3, updated_at = NOW()
    WHERE id = $1
  `, [userId, updates.username, updates.display_name]);
}
```

---

### 📊 EVENT SOURCING LAYER

#### `domain_events` Table
**Application Files:**
- `EventBus.ts` - `publish()` method
- `GameEventHandler.ts` - Event processing
- `EventReplayer.ts` - Event replay
- `game-state-machine.ts:245` - Event publishing

**WebSocket Events:**
- `event_published` - New event created
- `event_processed` - Event processed
- `event_replayed` - Event replayed

**Key Functions:**
```javascript
// Publish event
async function publishEvent(aggregateId, eventType, eventData) {
  await db.query(`
    INSERT INTO domain_events (aggregate_id, aggregate_type, event_type, event_data, event_version)
    VALUES ($1, $2, $3, $4, $5)
  `, [aggregateId, 'Game', eventType, JSON.stringify(eventData), version]);
}

// Replay events
async function replayEvents(aggregateId) {
  const events = await db.query(`
    SELECT * FROM domain_events 
    WHERE aggregate_id = $1 
    ORDER BY event_version ASC
  `, [aggregateId]);
}
```

---

### 💰 FINANCIAL LAYER

#### `chips_transactions` Table
**Application Files:**
- `sophisticated-engine-server.js:2000` - Transaction logging
- `game-state-machine.ts:300` - Chip distribution
- `poker.html:2553` - Buy-in processing

**WebSocket Events:**
- `chips_transferred` - Chip movement
- `buy_in_completed` - Player bought in
- `cash_out_completed` - Player cashed out

**Key Functions:**
```javascript
// Log transaction
async function logTransaction(userId, type, amount, gameId, handId) {
  await db.query(`
    INSERT INTO chips_transactions (user_id, transaction_type, amount, game_id, hand_id)
    VALUES ($1, $2, $3, $4, $5)
  `, [userId, type, amount, gameId, handId]);
}
```

---

## WebSocket Event Flow

### Room Events
```
User Action → Database Update → WebSocket Broadcast → UI Update
```

### Game Events
```
Player Action → Game State Machine → Database Update → WebSocket Broadcast → UI Update
```

### User Events
```
Profile Change → Database Update → WebSocket Broadcast → UI Update
```

---

## API Endpoint Mapping

### Room Management
- `POST /api/rooms` → `rooms` table
- `GET /api/rooms/:id` → `rooms` table
- `POST /api/rooms/:id/lobby/join` → `room_players` table
- `POST /api/rooms/:id/join` → `room_seats` table

### Game Management
- `POST /api/games/:id/start-hand` → `games`, `hands` tables
- `POST /api/games/:id/action` → `actions` table
- `GET /api/games/:id/state` → `games`, `players`, `hands` tables

### User Management
- `GET /api/v2/user/profile` → `user_profiles` table
- `PUT /api/v2/user/profile` → `user_profiles` table
- `GET /api/v2/user/check-username` → `user_profiles` table

---

## Database Transaction Patterns

### Room Creation
```sql
BEGIN;
INSERT INTO rooms (...);
INSERT INTO room_players (...);
COMMIT;
```

### Game Start
```sql
BEGIN;
UPDATE rooms SET game_id = $1;
INSERT INTO games (...);
INSERT INTO players (...);
INSERT INTO hands (...);
COMMIT;
```

### Player Action
```sql
BEGIN;
INSERT INTO actions (...);
UPDATE players SET chips = chips - $1;
UPDATE hands SET pot = pot + $1;
COMMIT;
```

This integration map shows exactly how each database table connects to your application code, making it easy to understand the complete data flow and identify optimization opportunities.
