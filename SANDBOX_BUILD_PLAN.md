# 🎯 SANDBOX BUILD PLAN - Iterative & Tactical

**Philosophy:** Build ONE piece at a time. Test until perfect. Never break what works.

---

## 📋 TODO SYSTEM

All tasks are tracked in the TODO list. Check off each one before moving to the next.

**Rule:** If ANY task fails testing, STOP. Fix it before continuing.

---

## 🗄️ PART 1: SCHEMA CLEANUP (Supabase)

### Goal
Remove unused UUID system tables that conflict with our working TEXT ID system.

### Tasks

#### Task 1: Verify Tables Are Empty
**Location:** Supabase SQL Editor

```sql
-- Run this query to check if UUID tables have any data
SELECT 
  (SELECT COUNT(*) FROM games) as games_count,
  (SELECT COUNT(*) FROM hands) as hands_count,
  (SELECT COUNT(*) FROM players) as players_count,
  (SELECT COUNT(*) FROM actions) as actions_count,
  (SELECT COUNT(*) FROM pots) as pots_count,
  (SELECT COUNT(*) FROM game_states) as game_states_count;
```

**Expected Result:** 
- `games`, `hands`, `players`, `actions`, `pots` should be 0
- `game_states` should have data (your active system)

**If UUID tables have data:** STOP. We need to analyze what's using them.

---

#### Task 2: Create Backup
**Location:** Supabase Dashboard → Database → Backups

1. Go to your Supabase project
2. Navigate to Database → Backups
3. Click "Create Backup"
4. Name it: `before_uuid_cleanup_YYYYMMDD`
5. Wait for completion

**Alternative (if manual backup not available):**
```bash
# If you have pg_dump access
pg_dump YOUR_SUPABASE_CONNECTION_STRING > backup_before_cleanup.sql
```

---

#### Task 3: Delete UUID Tables
**Location:** Supabase SQL Editor

```sql
-- TACTICAL CLEANUP MIGRATION
-- Removes unused UUID game system tables
-- SAFE: These tables are not referenced by any active code

BEGIN;

-- Drop in reverse dependency order (children first)
DROP TABLE IF EXISTS actions CASCADE;
DROP TABLE IF EXISTS pots CASCADE;
DROP TABLE IF EXISTS players CASCADE; 
DROP TABLE IF EXISTS hands CASCADE;
DROP TABLE IF EXISTS games CASCADE;

-- Verify game_states still exists (our active system)
SELECT COUNT(*) FROM game_states;

COMMIT;
```

**Expected Result:** Query runs without errors, returns count from `game_states`.

---

#### Task 4: Delete Dead Code Files
**Location:** VSCode / Terminal

```bash
# Delete TypeScript repos that reference deleted tables
rm -f src/services/database/repos/games.repo.ts
rm -f src/services/database/repos/full-game.repo.ts
rm -f dist/services/database/repos/games.repo.js
rm -f dist/services/database/repos/full-game.repo.js

# Rebuild TypeScript
npm run build
```

**Expected Result:** No TypeScript errors, build succeeds.

---

#### Task 5: Verify Server Still Works
**Location:** Terminal

```bash
# Start server
npm start

# In browser, check:
# 1. http://localhost:3000 loads
# 2. http://localhost:3000/play loads
# 3. Console shows no SQL errors
```

**Expected Result:** Server starts, no database errors.

---

## 🏗️ PART 2: SANDBOX BUILD (Iterative)

### Tables We Use
- ✅ `rooms` - Room metadata, invite codes
- ✅ `room_seats` - Who's sitting where
- ✅ `user_profiles` - User info
- ✅ `game_states` - Game state (JSONB)

### Tables We DON'T Touch
- ❌ All others (analytics, social, moderation, etc.)

---

## 🔹 PHASE 1a: Room Management (15 min)

### Goal
Prove room creation + joining works with shareable codes.

### What We Build

#### 1. Create Room Button (`/play` page)
**File:** `public/pages/play.html`

Add a new section:
```html
<div class="sandbox-section">
  <h2>🧪 Sandbox Table (Testing)</h2>
  <button id="createSandboxBtn" class="btn-primary">Create Sandbox Room</button>
  <button id="joinSandboxBtn" class="btn-secondary">Join Sandbox Room</button>
</div>
```

---

#### 2. Backend: Create Room API
**File:** `routes/sandbox.js` (NEW FILE)

```javascript
router.post('/create-room', async (req, res) => {
  const { userId, name } = req.body;
  
  // Generate 6-char code
  const code = generateRoomCode(); // e.g., "X7K9M2"
  
  // Insert into rooms
  const result = await db.query(
    `INSERT INTO rooms (name, invite_code, host_user_id, status, small_blind, big_blind, max_players, min_buy_in, max_buy_in)
     VALUES ($1, $2, $3, 'WAITING', 5, 10, 9, 100, 5000)
     RETURNING id, invite_code`,
    [name, code, userId]
  );
  
  res.json({ 
    roomId: result.rows[0].id, 
    code: result.rows[0].invite_code 
  });
});
```

---

#### 3. Backend: Join Room API
**File:** `routes/sandbox.js`

```javascript
router.post('/join-room', async (req, res) => {
  const { code } = req.body;
  
  // Find room by code
  const result = await db.query(
    `SELECT id, name, host_user_id, status FROM rooms WHERE invite_code = $1`,
    [code]
  );
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Room not found' });
  }
  
  res.json({ room: result.rows[0] });
});
```

---

#### 4. Frontend: Connect Buttons to API
**File:** `public/pages/play.html` (JavaScript section)

```javascript
document.getElementById('createSandboxBtn').addEventListener('click', async () => {
  const userId = getCurrentUserId(); // Your existing auth logic
  const name = prompt('Room name?') || 'Test Room';
  
  const response = await fetch('/api/sandbox/create-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, name })
  });
  
  const { roomId, code } = await response.json();
  alert(`Room created! Code: ${code}`);
  window.location.href = `/sandbox-table?room=${roomId}`;
});

document.getElementById('joinSandboxBtn').addEventListener('click', async () => {
  const code = prompt('Enter room code:');
  if (!code) return;
  
  const response = await fetch('/api/sandbox/create-room', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code })
  });
  
  const { room } = await response.json();
  window.location.href = `/sandbox-table?room=${room.id}`;
});
```

---

### How to Test Phase 1a

1. **Browser 1:** Go to `/play`, click "Create Sandbox"
2. **Browser 1:** See room code (e.g., "X7K9M2"), copy it
3. **Browser 1:** Should redirect to `/sandbox-table?room=<ID>`
4. **Browser 2:** Go to `/play`, click "Join Sandbox"
5. **Browser 2:** Paste code, click OK
6. **Browser 2:** Should redirect to same `/sandbox-table?room=<ID>`

**Success Criteria:**
- ✅ Both browsers see the same sandbox-table page
- ✅ Room ID matches in URL
- ✅ No console errors

**If ANY of these fail: STOP. Debug before Phase 1b.**

---

## 🔹 PHASE 1b: Seat Broadcasting (20 min)

### Goal
Prove real-time seat updates work across browsers.

### What We Build

#### 1. Sandbox Table UI
**File:** `public/sandbox-table.html` (NEW FILE)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Sandbox Table</title>
</head>
<body>
  <h1>🎰 Sandbox Table</h1>
  <div id="roomInfo">
    <p>Room Code: <span id="roomCode"></span></p>
    <p>Your ID: <span id="userId"></span></p>
  </div>
  
  <div id="seats" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
    <!-- 9 seats, generated by JS -->
  </div>
  
  <script src="/socket.io/socket.io.js"></script>
  <script src="/js/sandbox-table.js"></script>
</body>
</html>
```

---

#### 2. Backend: Get Seats API
**File:** `routes/sandbox.js`

```javascript
router.get('/seats/:roomId', async (req, res) => {
  const { roomId } = req.params;
  
  const result = await db.query(
    `SELECT seat_index, user_id, chips_in_play, status 
     FROM room_seats 
     WHERE room_id = $1 AND left_at IS NULL
     ORDER BY seat_index`,
    [roomId]
  );
  
  // Create array of 9 seats
  const seats = Array(9).fill(null);
  result.rows.forEach(row => {
    seats[row.seat_index] = {
      userId: row.user_id,
      chips: row.chips_in_play,
      status: row.status
    };
  });
  
  res.json({ seats });
});
```

---

#### 3. Backend: Claim Seat API
**File:** `routes/sandbox.js`

```javascript
router.post('/claim-seat', async (req, res) => {
  const { roomId, userId, seatIndex } = req.body;
  
  // Ensure user profile exists
  await db.query(
    `INSERT INTO user_profiles (id, username, created_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO NOTHING`,
    [userId, `Player_${userId.substr(0, 6)}`]
  );
  
  // Claim seat
  await db.query(
    `INSERT INTO room_seats (room_id, user_id, seat_index, chips_in_play, status)
     VALUES ($1, $2, $3, 1000, 'SEATED')
     ON CONFLICT (room_id, seat_index) DO UPDATE SET user_id = $2`,
    [roomId, userId, seatIndex]
  );
  
  // Broadcast to room
  const io = req.app.locals.io;
  io.to(`room:${roomId}`).emit('seat_update', {
    roomId,
    seatIndex,
    userId
  });
  
  res.json({ success: true });
});
```

---

#### 4. Frontend: WebSocket Listener
**File:** `public/js/sandbox-table.js` (NEW FILE)

```javascript
const socket = io();
const roomId = new URLSearchParams(window.location.search).get('room');
const userId = getCurrentUserId();

// Join room
socket.emit('join_room', { roomId, userId });

// Render seats initially
async function loadSeats() {
  const response = await fetch(`/api/sandbox/seats/${roomId}`);
  const { seats } = await response.json();
  renderSeats(seats);
}

function renderSeats(seats) {
  const container = document.getElementById('seats');
  container.innerHTML = '';
  
  seats.forEach((seat, index) => {
    const div = document.createElement('div');
    div.className = 'seat';
    
    if (seat) {
      div.innerHTML = `
        <p>Seat ${index}</p>
        <p>Player: ${seat.userId.substr(0, 8)}...</p>
        <p>Chips: ${seat.chips}</p>
      `;
    } else {
      div.innerHTML = `
        <p>Seat ${index}</p>
        <button onclick="claimSeat(${index})">Claim Seat</button>
      `;
    }
    
    container.appendChild(div);
  });
}

async function claimSeat(seatIndex) {
  await fetch('/api/sandbox/claim-seat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, userId, seatIndex })
  });
}

// Listen for real-time updates
socket.on('seat_update', () => {
  loadSeats(); // Re-fetch and re-render
});

// Initial load
loadSeats();
```

---

### How to Test Phase 1b

1. **Browser 1:** Claim Seat 0
2. **Browser 2:** Should instantly see Seat 0 filled
3. **Browser 1:** Refresh page
4. **Browser 1:** Seat 0 should still be filled (DB persistence)
5. **Browser 2:** Claim Seat 1
6. **Browser 1:** Should instantly see Seat 1 filled

**Success Criteria:**
- ✅ Real-time updates work instantly
- ✅ Refresh preserves seat state
- ✅ No double-booking of seats

**If ANY of these fail: STOP. Debug before Phase 1c.**

---

## 🔹 PHASE 1c: Start Hand Broadcast (10 min)

### Goal
Prove host controls work and broadcasts reach all players.

### What We Build

#### 1. Start Hand Button
**File:** `public/sandbox-table.html`

```html
<button id="startHandBtn" style="display: none;">START HAND</button>
<p id="gameStatus">Waiting for players...</p>
```

---

#### 2. Backend: Start Hand API
**File:** `routes/sandbox.js`

```javascript
router.post('/start-hand', async (req, res) => {
  const { roomId, userId } = req.body;
  
  // Verify user is host
  const roomResult = await db.query(
    `SELECT host_user_id FROM rooms WHERE id = $1`,
    [roomId]
  );
  
  if (roomResult.rows[0].host_user_id !== userId) {
    return res.status(403).json({ error: 'Only host can start hand' });
  }
  
  // Check 2+ players
  const seatsResult = await db.query(
    `SELECT COUNT(*) FROM room_seats WHERE room_id = $1 AND left_at IS NULL`,
    [roomId]
  );
  
  if (parseInt(seatsResult.rows[0].count) < 2) {
    return res.status(400).json({ error: 'Need at least 2 players' });
  }
  
  // Update room status
  await db.query(
    `UPDATE rooms SET status = 'ACTIVE' WHERE id = $1`,
    [roomId]
  );
  
  // Broadcast
  const io = req.app.locals.io;
  io.to(`room:${roomId}`).emit('hand_started', { roomId });
  
  res.json({ success: true });
});
```

---

#### 3. Frontend: Show Button for Host
**File:** `public/js/sandbox-table.js`

```javascript
async function checkHostStatus() {
  const response = await fetch(`/api/sandbox/room/${roomId}`);
  const { room } = await response.json();
  
  if (room.hostId === userId) {
    document.getElementById('startHandBtn').style.display = 'block';
  }
}

document.getElementById('startHandBtn').addEventListener('click', async () => {
  await fetch('/api/sandbox/start-hand', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, userId })
  });
});

socket.on('hand_started', () => {
  document.getElementById('gameStatus').textContent = 'Hand In Progress';
});

checkHostStatus();
```

---

### How to Test Phase 1c

1. **Browser 1 (Host):** See "START HAND" button
2. **Browser 2 (Guest):** Should NOT see button
3. **Browser 1:** Click "START HAND"
4. **Both Browsers:** Should see "Hand In Progress" instantly

**Success Criteria:**
- ✅ Only host sees button
- ✅ Button disabled if <2 players
- ✅ Status update broadcasts instantly

**If ANY of these fail: STOP. Debug.**

---

## ⏭️ FUTURE PHASES (After Phase 1 Perfect)

### Phase 2: Deal Cards
- Generate hole cards
- Store in `game_states.current_state` JSONB
- Show only to card owner

### Phase 3: Player Actions
- Fold, Call, Raise buttons
- Update pot/chips in JSONB
- Rotate turn

### Phase 4: Community Cards
- Deal flop/turn/river
- Handle betting rounds

---

## 🎯 CRITICAL RULES

1. **ONE PHASE AT A TIME**
2. **TEST UNTIL PERFECT** before moving forward
3. **IF IT BREAKS, STOP** - don't add bandaids
4. **NO MASSIVE CHANGES** - small, testable pieces
5. **USE ONLY SAFE TABLES** - rooms, room_seats, user_profiles, game_states

---

## 📞 EMERGENCY ROLLBACK

If schema cleanup breaks something:

```bash
# Restore from Supabase backup
# OR
psql YOUR_SUPABASE_CONNECTION_STRING < backup_before_cleanup.sql
```

---

**YOU NOW HAVE A COMPLETE, TACTICAL PLAN. EXECUTE ONE TODO AT A TIME.** ⚔️

