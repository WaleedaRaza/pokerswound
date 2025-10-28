# 📚 COMPLETE CODEBASE INDEX - FOR NEXT AGENT

## File Structure & What's Where

### Backend (Node.js + Express)

#### Main Server
- **`sophisticated-engine-server.js`** (1046 lines)
  - Entry point
  - Initializes all services
  - Sets up Socket.IO
  - Creates Express app
  - Line 708: Dependency injection via app.locals

#### Modularized Routes
- **`routes/games.js`** (630 lines, 7 endpoints)
  - Line 13: `POST /api/games` - Create game
  - Line 310: `POST /api/games/:id/start-hand` - Deal cards
  - Line 514: `POST /api/games/:id/actions` - **PLAYER ACTIONS**
  - Has timer integration (line 680)
  - Has idempotency (line 6)
  
- **`routes/rooms.js`** (1072 lines, 22 endpoints)
  - Line 47: `POST /api/rooms` - Create room
  - Line 180: `POST /api/rooms/:id/join` - Claim seat
  - Line 262: **`GET /api/rooms/:id/hydrate`** - HYDRATION ENDPOINT
  - Line 326: `POST /api/rooms/:id/lobby/join` - Request join
  - Line 441: `POST /api/rooms/:id/lobby/approve` - Approve player
  
- **`routes/auth.js`** (~100 lines)
  - Line 44: `POST /api/auth/sync-user` - Sync Supabase user

- **`routes/pages.js`** (74 lines)
  - Line 82: `GET /table` - **ZOOM-LOCK TABLE**
  - Line 44: `GET /game/:roomId` - Game entry point

#### WebSocket
- **`websocket/socket-handlers.js`** (246 lines)
  - Line 17: `authenticate` handler
  - Line 115: `join_room` handler  
  - Line 170: `start_game` handler
  - Line 182: Disconnect + grace period
  - **ALL SESSION-AWARE**

#### Services
- **`src/services/timer-service.js`** (270 lines)
  - Auto-fold logic
  - Timebank management
  - Integrated in games.js

- **`src/db/poker-table-v2.js`** (300+ lines)
  - Database access layer
  - `incrementSequence()`
  - `checkIdempotency()`
  - `getTurnTimer()`
  - `createRejoinToken()`

- **`src/middleware/idempotency.js`** (105 lines)
  - Applied to ALL POST endpoints
  - Checks X-Idempotency-Key header

- **`services/session-service.js`**
  - Session management
  - Seat binding
  - Grace period handling

---

### Frontend (HTML/CSS/JS)

#### Main UI Pages
- **`public/pages/play.html`** (2400+ lines)
  - Room creation UI
  - Lobby waiting room
  - Seat claiming
  - **Has working hydration logic** (line 1020)
  - **Has working WS integration**
  - **REFERENCE THIS FOR WIRING**

- **`public/poker-table-zoom-lock.html`** (1183 lines)
  - Beautiful zoom-locked table
  - Fixed 1680x800px virtual canvas
  - Letterbox/pillarbox support
  - Host controls modal
  - **NEEDS BACKEND CONNECTION**

- **`public/poker.html`** (641 lines)
  - Old table (for reference)

#### JavaScript Modules
- **`public/js/sequence-tracker.js`** (147 lines)
  - `shouldProcessMessage(seq)`
  - `createHandler()` wrapper
  - Rejects stale updates
  - **USE THIS FOR ALL WS EVENTS**

- **`public/js/auth-manager.js`**
  - Supabase auth
  - User session
  - **HAS getCurrentUser()**

- **`public/js/game-state-manager.js`** (363 lines)
  - Centralized state
  - **Could be used for zoom-lock**

- **`public/js/timer-display.js`** (257 lines)
  - Client-side timer visualization
  - **Ready to integrate**

- **`public/js/action-timer-manager.js`** (257 lines)
  - Timer countdown logic
  - **Could be used**

#### CSS
- **`public/css/pokergeek.css`** (2500+ lines)
  - Main site design system
  - Liquid glass tiles
  - Navbar styles
  - **REFERENCE FOR CONSISTENCY**

---

### Database

#### Schema
**Location:** `database/migrations/`
- `20251027_poker_table_evolution.sql` - Latest migration
- All tables created and indexed

#### Key Tables
```sql
rooms - Room settings (turn_time_seconds, timebank_seconds)
room_seats - Seat assignments (player_status, missed_turns)
games - Game instances
game_states - Current state (seq, current_state JSONB)
hands - Hand history (phase, board, pot_total)
players - Player state (hole_cards, stack, has_folded)
actions - Action log (sequence_number)
rejoin_tokens - Recovery tokens
processed_actions - Idempotency
game_audit_log - Audit trail
```

---

## WHAT TO DO (Procedural Order)

### Task 1: Wire Zoom-Lock to Hydration
**File:** `poker-table-zoom-lock.html`
**Time:** 2 hours

1. Add script imports (sequence-tracker, auth-manager)
2. Add WebSocket initialization code
3. Add `fetchHydration()` method
4. Call hydration on `authenticated` event
5. Render state from hydration
6. Store rejoin token

### Task 2: Wire Action Buttons
**File:** `poker-table-zoom-lock.html`
**Time:** 30 min

1. Add event listeners to FOLD/CALL/RAISE
2. POST to `/api/games/:id/actions`
3. Include X-Idempotency-Key header
4. Handle errors with toast

### Task 3: Add WS Event Handlers
**File:** `poker-table-zoom-lock.html`
**Time:** 1 hour

1. Listen to `hand_started` - Render new hand
2. Listen to `player_action` - Update UI
3. Listen to `game_over` - Show winner
4. Listen to `turn_timeout` - Show auto-fold
5. Wrap ALL with `sequenceTracker.createHandler()`

### Task 4: Visual Indicators
**Time:** 1 hour

1. Add `.to-act` class CSS (pulsing glow)
2. On action_required, highlight seat
3. Add D/SB/BB badges
4. Grey out folded players

### Task 5: Test Refresh
**Time:** 30 min

1. Start game
2. Play a few actions
3. **Refresh browser**
4. Verify state restored
5. Verify can continue playing

---

## ENDPOINTS TO USE

### Hydration
```
GET /api/rooms/:roomId/hydrate?userId=X
Returns: { seq, room, game, hand, seats, me: { hole_cards, rejoin_token } }
```

### Actions
```
POST /api/games/:gameId/actions
Headers: { X-Idempotency-Key: uuid }
Body: { player_id, action: 'FOLD'|'CALL'|'RAISE', amount }
```

### Room Management
```
POST /api/rooms - Create
POST /api/rooms/:id/join - Claim seat
POST /api/rooms/:id/lobby/approve - Approve join
```

---

## WS EVENTS TO HANDLE

### Client listens for:
- `authenticated` → Fetch hydration
- `state_sync` → Re-hydrate if needed
- `hand_started` → New hand dealt
- `player_action` → Someone acted
- `game_over` → Winner determined
- `turn_timeout` → Player auto-folded

### Client emits:
- `authenticate` → On connect
- `join_room` → Join lobby

**All other actions via HTTP POST, not WS**

---

## INVARIANTS (NEVER VIOLATE)

1. Server = source of truth
2. Refresh = hydrate from server
3. Sequence numbers prevent stale data
4. Idempotency prevents duplicates
5. Disconnect ≠ free seat (grace period)

---

## REFERENCE FILES

### For WebSocket Integration:
- Look at `public/pages/play.html` line 1130-1180 (working WS integration)

### For Hydration:
- Look at `public/pages/play.html` line 1020-1110 (working hydration)

### For Action Wiring:
- Look at `routes/games.js` line 514-660 (action handling)

### For State Management:
- Look at `public/js/game-state-manager.js` (centralized state)

---

## TESTING CHECKLIST

- [ ] Room creation works
- [ ] Lobby works
- [ ] Game starts
- [ ] Cards are dealt
- [ ] Can see turn indicator
- [ ] Can fold/call/raise
- [ ] Actions update other players
- [ ] Winner is announced
- [ ] **REFRESH MID-HAND WORKS** ← CRITICAL
- [ ] Rejoin token persists
- [ ] Sequence numbers prevent stale updates
- [ ] Can play 10-player game
- [ ] Host controls work
- [ ] Zoom-lock works at all sizes

---

## ESTIMATED TIME TO MVP

**If next agent follows this plan:**
- Wiring: 4 hours
- Testing: 2 hours
- Polish: 2 hours
- **Total: 8 hours to MVP**

---

**Everything exists. Just needs wiring. Next agent: succeed where I failed.** ⚔️
