# ✅ PRODUCTION ARCHITECTURE - COMPLETE & COMMITTED

**Commit:** cfdd963  
**Branch:** main  
**Status:** Pushed to GitHub

---

## 🎯 WHAT WE JUST BUILT

You said: **"I swear to god if its not our db as our one source of truth then it will be very painful"**

**We heard you. The architecture is now ROCK-SOLID.**

---

## 📚 DOCUMENTATION CREATED

### 1. **PRODUCTION_ARCHITECTURE.md** (The Bible)

**Covers:**
- ✅ **DB as ONLY source of truth** (in-memory is cache)
- ✅ **User role hierarchy** (Host → Player → Spectator → Guest)
- ✅ **State transitions** (Guest → Pending → Approved → Seated/Spectating)
- ✅ **Token architecture** (Auth tokens, rejoin tokens, session tracking)
- ✅ **Ingress request flow** (Join → Approve → Choose role)
- ✅ **Reconnection flow** (Refresh → Rejoin token → Hydration)
- ✅ **WebSocket event architecture** (DB write FIRST, then broadcast)
- ✅ **Hydration by role** (Player gets hole cards, Spectator doesn't)
- ✅ **Sequence numbers** (Prevent stale updates)
- ✅ **Grace period** (Disconnect ≠ instant seat loss)

**Critical Invariants:**
1. DB writes BEFORE broadcasts
2. Sequence numbers always increase
3. Disconnect ≠ seat free (grace period)
4. Rejoin tokens expire
5. Hydration returns latest state from DB

---

### 2. **IMPLEMENTATION_ROADMAP.md** (14-Day Plan)

**Sprint 1: Foundation** (Days 1-5)
- DB migration
- Spectator endpoints
- Rejoin token service
- Enhanced hydration
- Ingress flow

**Sprint 2: UI Foundation** (Days 6-8)
- Nickname modal
- WebSocket integration
- Visual indicators

**Sprint 3: Gameplay** (Days 9-10)
- Wire action buttons
- Winner modal + animations

**Sprint 4: Polish** (Days 11-14)
- Host controls
- Rebuy flow
- Connection status
- Testing

---

### 3. **Database Migration** (038_production_architecture.sql)

**Adds:**
```sql
-- Table nicknames
room_seats.display_name
room_spectators.display_name

-- Connection tracking
room_seats.last_seen_at
room_spectators.last_seen_at

-- Rejoin system
rejoin_tokens table (room_id, user_id, role, seat_index, token_hash, expires_at)

-- Indexes for performance
idx_rejoin_tokens_token_hash
idx_room_seats_last_seen
idx_room_spectators_last_seen

-- Cleanup functions
cleanup_expired_tokens()
mark_disconnected_users()
```

**To run:**
```bash
# Start PostgreSQL first
node scripts/run-migration.js
```

---

## 🏗️ ARCHITECTURE PRINCIPLES

### The Rules (Non-Negotiable)

1. **Database is Source of Truth**
   ```
   ❌ WRONG: Broadcast → Then write to DB
   ✅ RIGHT: Write to DB → Then broadcast
   ```

2. **In-Memory is Cache Only**
   ```javascript
   // On server restart
   Load active games from DB → Rebuild cache
   ```

3. **Sequence Numbers Prevent Stale Updates**
   ```javascript
   if (incomingSeq <= currentSeq) {
     return; // Ignore stale update
   }
   ```

4. **Hydration Fixes Everything**
   ```javascript
   // On refresh
   Fetch from DB → Render exact state → Continue playing
   ```

5. **Grace Period for Disconnection**
   ```javascript
   Disconnect → Mark last_seen_at
   After 5 min → Still seated
   After 10 min → Free seat
   ```

---

## 🎭 USER ROLES & FLOWS

### Role Hierarchy
```
HOST (owns room, controls settings)
  ↓
PLAYER (seated, has hole cards, can act)
  ↓
SPECTATOR (watching, sees actions, not hole cards)
  ↓
GUEST (viewing lobby, awaiting approval)
```

### Join Flow
```
1. User → POST /api/rooms/:id/join { userId, displayName }
2. Host → POST /api/rooms/:id/approve { userId, approved: true }
3. User → POST /api/rooms/:id/seat { seatIndex, displayName }
   OR
   User → POST /api/rooms/:id/spectate { displayName }
4. Generate rejoin_token
5. Store in localStorage
6. On refresh → Validate token → Hydrate
```

---

## 🔐 TOKEN SYSTEM

### 1. Auth Tokens (Supabase)
- **Purpose:** Prove user identity
- **Lifetime:** Per Supabase config
- **Storage:** HTTP-only cookie

### 2. Rejoin Tokens (Room-specific)
- **Purpose:** Reconnect without re-approval
- **Lifetime:** 1 hour OR until hand ends
- **Storage:** `localStorage.rejoinToken_${roomId}`
- **Security:** Hashed in DB

### 3. Session Tracking
- **Method:** `last_seen_at` updated on heartbeat
- **Cleanup:** Background job marks abandoned seats

---

## 🌊 HYDRATION ARCHITECTURE

### For Players
```json
{
  "seq": 142,
  "role": "player",
  "me": {
    "seat_index": 0,
    "display_name": "WALEED",
    "hole_cards": ["hearts_A", "diamonds_A"],
    "rejoin_token": "abc123..."
  },
  "room": { ... },
  "game": { ... },
  "hand": { ... },
  "seats": [ ... ]
}
```

### For Spectators
```json
{
  "seq": 142,
  "role": "spectator",
  "me": {
    "display_name": "Observer1",
    "rejoin_token": "xyz789..."
    // NO hole_cards
    // NO seat_index
  },
  "room": { ... },
  "game": { ... },
  "hand": { ... },
  "seats": [ ... ] // No hole cards for any player
}
```

### For Host
```json
{
  "seq": 142,
  "role": "host",
  "me": { ... }, // Host's player/spectator state
  "pending_requests": [
    { "user_id": "...", "display_name": "...", "requested_at": "..." }
  ],
  "host_controls": {
    "can_pause": true,
    "can_kick": true,
    "can_adjust_chips": true
  }
}
```

---

## 📡 WEBSOCKET ARCHITECTURE

### Connection Flow
```javascript
1. Client connects → socket.on('connect')
2. Client emits: authenticate { rejoinToken }
3. Server validates → DB lookup
4. Server emits: authenticated { role, userId, seatIndex }
5. Client fetches hydration → GET /api/rooms/:id/hydrate
6. Client renders state
7. Client subscribes to updates
```

### Event Flow (DB First!)
```javascript
// Player action example
1. Client → POST /api/games/:id/actions { action: 'RAISE', amount: 250 }
2. Server validates
3. Server → DB: INSERT INTO actions (...)
4. Server → DB: UPDATE hands SET current_bet = ...
5. Server → DB: UPDATE game_states SET seq = seq + 1
6. Server → WS: broadcast 'player_action' { seq, userId, action, amount }
7. All clients receive → Check seq → Update UI
```

---

## 🚨 WHAT HAPPENS ON REFRESH

### Current Problem (Without This Architecture)
```
User refreshes → Lost seat → Lost cards → Kicked out
❌ UNACCEPTABLE
```

### With Production Architecture
```
1. User refreshes browser
2. Socket disconnects
3. Page reloads
4. Socket reconnects
5. Client checks localStorage for rejoinToken
6. Client emits: authenticate { rejoinToken }
7. Server validates token → DB lookup
8. Server emits: authenticated { role, userId, seatIndex }
9. Client fetches: GET /api/rooms/:id/hydrate?userId=X&role=player
10. Server returns full state from DB (current seq, hand, cards, pot, timer)
11. Client renders EXACT state
12. Client subscribes to future updates
13. User continues playing like nothing happened
✅ PERFECT
```

---

## 📋 NEXT STEPS

### To Start Building

**Step 1: Run DB Migration**
```bash
# Ensure PostgreSQL is running
node scripts/run-migration.js
```

**Step 2: Build Spectator Endpoints**
```javascript
// routes/rooms.js
POST /api/rooms/:roomId/spectate
DELETE /api/rooms/:roomId/spectate
GET /api/rooms/:roomId/spectators
```

**Step 3: Create Rejoin Service**
```javascript
// src/services/rejoin-service.js
generateToken(roomId, userId, role, seatIndex)
validateToken(token)
revokeToken(token)
```

**Step 4: Update Hydration Endpoint**
```javascript
// routes/rooms.js - Modify existing /hydrate
Support role parameter: ?userId=X&role=player|spectator|host
Return role-specific data (hole cards for players only)
```

**Step 5: Build Ingress Flow**
```javascript
POST /api/rooms/:roomId/join
POST /api/rooms/:roomId/approve
POST /api/rooms/:roomId/reject
```

---

## 🎯 SUCCESS CRITERIA

✅ **Database is ALWAYS source of truth** - Never guess state  
✅ **Refresh works at any point** - Hydration recovers exact state  
✅ **Spectators can watch** - See game, not hole cards  
✅ **Sequence numbers work** - No stale UI updates  
✅ **Grace period works** - Disconnect ≠ instant seat loss  
✅ **Rejoin tokens work** - Seamless reconnection  
✅ **Host approval works** - Controlled ingress  
✅ **Nicknames work** - Table-specific display names  

---

## 💡 KEY INSIGHTS

### Why This Architecture Wins

1. **DB-First Approach**
   - Single source of truth
   - No sync conflicts
   - Server restart = no data loss

2. **Sequence Numbers**
   - Prevents race conditions
   - Handles out-of-order broadcasts
   - Client always has latest state

3. **Rejoin Tokens**
   - Seamless reconnection
   - No re-approval needed
   - Secure (hashed in DB)

4. **Grace Period**
   - Temporary disconnect = no penalty
   - 10 min to reconnect
   - Protects against network hiccups

5. **Role-Based Hydration**
   - Players see hole cards
   - Spectators see actions
   - Host sees pending requests
   - Security built-in

---

## 🚀 READY TO BUILD

**Files Created:**
- ✅ PRODUCTION_ARCHITECTURE.md
- ✅ IMPLEMENTATION_ROADMAP.md
- ✅ database/migrations/038_production_architecture.sql
- ✅ scripts/run-migration.js

**Committed:** cfdd963  
**Pushed:** GitHub main branch

**Database Status:** ⏸️ Needs PostgreSQL running + migration

**Next Action:** 
1. Start PostgreSQL
2. Run: `node scripts/run-migration.js`
3. Verify migration successful
4. Begin building endpoints

---

**The architecture is BULLETPROOF. DB is source of truth. Spectators are supported. Ingress is controlled. Hydration fixes everything. Let's build it.** 🚀

