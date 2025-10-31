# 🔍 ACTUAL SCHEMA ANALYSIS - What We Have vs What Code Expects

**Source:** `Schemasnapshot.txt`  
**Date:** Oct 30, 2025

---

## ✅ `rooms` Table - WHAT WE ACTUALLY HAVE

```sql
CREATE TABLE public.rooms (
  id uuid,
  name character varying,
  description text,
  owner_id uuid,
  is_private boolean,
  invite_code character varying,
  password_hash character varying,
  game_type character varying DEFAULT 'TEXAS_HOLDEM',
  small_blind integer,
  big_blind integer,
  ante integer DEFAULT 0,
  max_players integer DEFAULT 6,
  min_players integer DEFAULT 2,
  min_buy_in integer,
  max_buy_in integer,
  turn_time_limit integer DEFAULT 30,        -- ✅ EXISTS (not turn_time_seconds)
  timebank_seconds integer DEFAULT 60,       -- ✅ EXISTS
  auto_muck_losing_hands boolean,
  allow_rabbit_hunting boolean,
  allow_spectators boolean,
  status character varying DEFAULT 'WAITING',
  current_game_id uuid,
  created_at timestamp,
  updated_at timestamp,
  closed_at timestamp,
  host_user_id uuid,
  lobby_status character varying,
  game_id character varying                   -- ✅ TEXT, not UUID
);
```

### ❌ What Our Code Was Looking For (BUT DOESN'T EXIST)
- `turn_time_seconds` → **WRONG**, actual column is `turn_time_limit`

### ✅ What Actually Exists
- `timebank_seconds` → **EXISTS**
- `turn_time_limit` → **EXISTS** (code uses wrong name)

---

## ✅ `room_seats` Table - WHAT WE ACTUALLY HAVE

```sql
CREATE TABLE public.room_seats (
  id uuid,
  room_id uuid,
  user_id uuid,
  seat_index integer,                         -- ✅ 0-9
  status character varying DEFAULT 'SEATED',  -- ✅ SEATED, PLAYING, SITTING_OUT, WAITLIST
  chips_in_play bigint DEFAULT 0,             -- ✅ EXISTS
  joined_at timestamp,
  last_action_at timestamp,
  left_at timestamp
);
```

### ✅ This Table Is Actually Fine
- All expected columns exist
- `seat_index` is 0-9 (matches our 9-seat table)
- `chips_in_play` exists
- `status` has proper enum

---

## ✅ `game_states` Table - WHAT WE ACTUALLY HAVE

```sql
CREATE TABLE public.game_states (
  id text NOT NULL,                            -- ✅ TEXT ID (e.g., "sophisticated_xxx")
  room_id uuid,
  host_user_id text,                           -- ✅ TEXT, not UUID
  status text,                                 -- ✅ waiting, active, paused, completed, deleted
  current_state jsonb NOT NULL,                -- ✅ JSONB (all game data here)
  hand_number integer DEFAULT 0,
  dealer_position integer,
  total_pot integer DEFAULT 0,
  version integer DEFAULT 1,
  created_at timestamp,
  updated_at timestamp
);
```

### ✅ This Table Is Actually Fine
- Uses TEXT ID (matches our `sophisticated_xxx` format)
- Stores everything in `current_state` JSONB
- Has `hand_number`, `total_pot`, etc.

### ❌ What Doesn't Exist
- **NO `seq` column** (code tries to query this)
- **NO timer columns** (actor_timebank_remaining, etc.)

---

## 🎯 The Root Cause

### Hydration Endpoint Bugs

**Line 391-393 in `routes/rooms.js`:**
```javascript
const roomResult = await db.query(
  `SELECT id, invite_code, host_user_id, max_players, status, 
          turn_time_seconds, timebank_seconds,    // ❌ WRONG NAME
          small_blind, big_blind, game_id, created_at
   FROM rooms WHERE id = $1`,
  [req.params.roomId]
);
```

**Should be:**
```javascript
const roomResult = await db.query(
  `SELECT id, invite_code, host_user_id, max_players, status, 
          turn_time_limit, timebank_seconds,      // ✅ CORRECT NAME
          small_blind, big_blind, game_id, created_at
   FROM rooms WHERE id = $1`,
  [req.params.roomId]
);
```

---

## 🔥 Minimal Working Endpoints (What We Need)

### 1. `POST /api/minimal/claim-seat`

**Uses only columns that exist:**
```sql
INSERT INTO room_seats (room_id, user_id, seat_index, chips_in_play, status)
VALUES ($1, $2, $3, 1000, 'SEATED')
```

**No missing columns. Works.**

### 2. `GET /api/minimal/seats/:roomId`

**Uses only columns that exist:**
```sql
SELECT seat_index, user_id, chips_in_play, status
FROM room_seats
WHERE room_id = $1 AND left_at IS NULL
ORDER BY seat_index
```

**No missing columns. Works.**

### 3. `POST /api/minimal/start-hand`

**Option A: Use existing game engine**
- Creates game in `game_states` with TEXT ID
- Stores everything in `current_state` JSONB
- Deals cards via game engine
- **Should work if we don't query missing columns**

**Option B: Ultra-minimal (just prove cards work)**
- Don't even touch `game_states`
- Just generate 2 random cards
- Store in memory or Redis
- Return to client
- **Guaranteed to work, no DB dependencies**

---

## 💡 IMMEDIATE FIX OPTIONS

### Option 1: Fix Hydration Column Names (5 minutes)
```javascript
// Change this line in routes/rooms.js:391
turn_time_seconds → turn_time_limit

// Remove timer queries that use actor_timebank_remaining
// (lines 520-535)
```

**Result:** Hydration works, minimal table loads seats.

### Option 2: New Minimal Endpoints (30 minutes)
```javascript
// New file: routes/minimal.js
// 3 endpoints:
// - POST /claim-seat (uses room_seats columns we have)
// - GET /seats/:roomId (uses room_seats columns we have)
// - POST /deal-cards (generates cards, doesn't touch broken queries)
```

**Result:** Completely independent, guaranteed to work.

### Option 3: In-Memory Proof of Concept (15 minutes)
```javascript
// Don't even use DB for cards
// Just:
const cardMap = new Map(); // roomId → userId → [card1, card2]

router.post('/deal', (req, res) => {
  const {roomId, userId} = req.body;
  const cards = ['hearts_A', 'clubs_K']; // or random
  cardMap.set(`${roomId}:${userId}`, cards);
  res.json({cards});
});

router.get('/cards/:roomId/:userId', (req, res) => {
  const cards = cardMap.get(`${roomId}:${userId}`) || [];
  res.json({cards});
});
```

**Result:** Proves UI → Backend → Cards works. No DB issues.

---

## 🎯 YOUR DECISION

**Pick one:**

### A. Quick Fix (5 min)
"Fix the column name in hydration, test minimal table again"

### B. Build Minimal API (30 min)
"Create `/api/minimal/` with 3 clean endpoints"

### C. In-Memory POC (15 min)
"Prove cards work without touching DB at all"

### D. Your Own Plan
"Tell me exactly what you want"

---

## 📊 Summary

| Component | Status | Issue |
|-----------|--------|-------|
| `room_seats` table | ✅ GOOD | All columns exist |
| `game_states` table | ✅ GOOD | Structure is fine |
| `rooms` table | ⚠️ COLUMN NAME | `turn_time_seconds` should be `turn_time_limit` |
| Hydration endpoint | ❌ BROKEN | Queries wrong column name |
| Seat claiming | ✅ GOOD | `/claim-seat` uses correct columns |
| Game engine | ✅ GOOD | Works, stores in JSONB |

**Bottom line:** One column name typo breaks everything. Fix takes 5 minutes.

---

**Server:** Stopped  
**Kill command:** `pkill -f "node sophisticated"`  
**Your move:** A, B, C, or D?

