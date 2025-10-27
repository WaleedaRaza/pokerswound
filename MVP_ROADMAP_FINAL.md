# 🎯 MVP ROADMAP - FROM NOW TO LAUNCH

**Goal:** 10-player poker game where friends can host and join rooms

**Current Phase:** 1 of 4
**Phase 1 Completion Criteria:** Host creates room, friends join, play poker, refresh works

---

## WHERE WE ARE RIGHT NOW

### ✅ COMPLETE (Working)
1. **Database foundation** - All tables exist, migrations run
2. **Modularized backend** - Routes split from monolith
3. **TypeScript game engine** - `/dist/core/` - WORKS
4. **Hydration system** - Refresh bug FIXED on backend
5. **Sequence numbers** - All broadcasts have seq
6. **Idempotency** - All mutations protected
7. **Timer system** - Server-authoritative
8. **Zoom-lock UI** - Beautiful, responsive table
9. **Room creation** - `play.html` works
10. **Lobby system** - Approval flow works

### ❌ BROKEN (Gaps)
1. **Zoom-lock table is a DEMO** - Not connected to backend
2. **No transition** from lobby → table
3. **No hydration integration** in zoom-lock
4. **Actions don't fire** from zoom-lock
5. **Refresh doesn't work** on table page

---

## 🗺️ PROCEDURAL ROADMAP TO MVP

### MILESTONE 1: Working Game (No Refresh) - 8 hours
**Goal:** Play one full hand from start to finish

#### Task 1.1: Connect Zoom-Lock to Backend (3 hours)
**File:** `poker-table-zoom-lock.html`
**Procedure:**
1. Add `<script src="/js/sequence-tracker.js"></script>`
2. Add WebSocket connection code
3. Add hydration on page load
4. Wire FOLD/CALL/RAISE to `POST /api/games/:id/actions`
5. Listen to `hand_started`, `player_action`, `game_over` WS events
6. Render updates from WS broadcasts

**Test:** 
- Can join room
- Can see cards
- Can fold/call/raise
- Hand completes

#### Task 1.2: Visual Indicators (2 hours)
**Procedure:**
1. Add CSS for `.to-act` class (pulsing glow)
2. Add D/SB/BB badge elements
3. On `hand_started`, show dealer button
4. On `action_required`, highlight active seat
5. On `player_action`, grey out folded players

**Test:**
- Can see whose turn it is
- Dealer button appears
- Blinds are marked

#### Task 1.3: Winner Announcement (1 hour)
**Procedure:**
1. Create winner modal component
2. Listen to `hand_complete` WS event
3. Show winner + hand rank
4. Auto-dismiss after 5s

**Test:**
- Winner is announced
- Modal appears
- Next hand can start

#### Task 1.4: Error Handling (1 hour)
**Procedure:**
1. Create toast notification function
2. Catch action POST errors
3. Show connection status
4. Handle socket disconnect gracefully

**Test:**
- Errors show user-friendly message
- Connection status visible

#### Task 1.5: State Transitions (1 hour)
**Procedure:**
1. Route `/game/:roomId` to zoom-lock
2. On `game_started` WS event in lobby, redirect to `/game/:roomId`
3. On page load, check for roomId, fetch hydration
4. Render initial state from hydration

**Test:**
- Lobby → Table transition works
- Direct link to `/game/:roomId` works

---

### MILESTONE 2: Refresh Works (CRITICAL) - 4 hours
**Goal:** Refresh mid-game, continue playing

#### Task 2.1: Hydration Integration (2 hours)
**File:** `poker-table-zoom-lock.html`
**Procedure:**
1. On DOMContentLoaded, check for roomId in URL
2. Fetch `GET /api/rooms/:roomId/hydrate?userId=X`
3. Extract seq, seats, hand, board, pot, me.hole_cards
4. Set `sequenceTracker.currentSeq = hydration.seq`
5. Render ALL state from hydration (not from memory)
6. Store `rejoin_token` in sessionStorage

**Test:**
- Refresh mid-hand
- See exact same cards/pot/seats
- Still your turn if it was
- Can continue playing

#### Task 2.2: Rejoin Token Flow (1 hour)
**Procedure:**
1. On initial hydration, get `me.rejoin_token`
2. Store in sessionStorage
3. On socket `authenticate`, send rejoinToken
4. Server validates token
5. On `state_sync` WS event, re-fetch hydration if needed

**Test:**
- Refresh 10 times
- Always rejoin successfully
- Token persists

#### Task 2.3: Sequence Number Handling (1 hour)
**Procedure:**
1. Initialize sequenceTracker with hydration.seq
2. Wrap ALL WS handlers with `sequenceTracker.createHandler()`
3. Log when stale updates are rejected
4. Ensure UI always shows latest state

**Test:**
- Rapid refresh doesn't cause stale updates
- Out-of-order broadcasts are ignored
- UI never "flashes back"

---

### MILESTONE 3: Host Controls (2 hours)
**Goal:** Host can manage game settings

#### Task 3.1: Pause/Resume (30 min)
**Already wired in UI**, just connect:
- `POST /api/rooms/:id/pause`
- `POST /api/rooms/:id/resume`
- Broadcast to all players

#### Task 3.2: Kick Player (30 min)
**Endpoint exists**, wire UI:
- `POST /api/rooms/:id/kick`
- Remove from room_seats
- Broadcast

#### Task 3.3: Adjust Chips (30 min)
**Create endpoint:**
- `POST /api/rooms/:id/adjust-chips`
- Update player stack
- Broadcast

#### Task 3.4: Change Settings (30 min)
**Endpoints exist**, wire:
- Change blinds
- Change timer
- Toggle auto-start

---

### MILESTONE 4: Spectators & Join Requests (2 hours)
**Goal:** Mid-game joins work

#### Task 4.1: Join Request Popup (1 hour)
**For host:**
- Listen to `join_request` WS event
- Show popup with player info
- Approve/Deny buttons
- Send to approval endpoint

#### Task 4.2: Spectator Mode (1 hour)
- Mid-game joins become spectators
- Can see table but not act
- After hand, can claim seat

---

### MILESTONE 5: Polish & Launch Prep (4 hours)
**Goal:** Production-ready

#### Task 5.1: Royal Flush Animations (1 hour)
- Detect hand rank from `hand_complete`
- Trigger special animations
- Royal flush: gold coins
- Flush: water
- Full house: house building

#### Task 5.2: Nickname Entry (30 min)
**Already exists in auth**, just ensure it's used

#### Task 5.3: Testing (1.5 hours)
- 10-player game
- All features work
- Refresh works
- Mobile works
- Zoom works

#### Task 5.4: Documentation (1 hour)
- User guide
- Host guide
- Troubleshooting

---

## 📊 DATABASE AS SOURCE OF TRUTH

**Current Tables (EXIST):**
- `rooms` - Room settings
- `room_seats` - Who sits where
- `games` - Game instances
- `game_states` - Current state + seq
- `hands` - Hand history
- `players` - Player state per hand
- `actions` - Action history
- `rejoin_tokens` - Recovery tokens
- `processed_actions` - Idempotency
- `game_audit_log` - Audit trail

**Flow:**
1. **All mutations** → HTTP POST → Update DB → Increment seq → Broadcast
2. **All reads** → Hydration endpoint → Single query → Return state
3. **Refresh** → Fetch hydration → Render from DB
4. **Never** trust client memory

**This is CORRECT. Don't change it.**

---

## 🎯 CRITICAL PATH TO MVP

### Week 1 (NOW):
- **Day 6:** Connect zoom-lock to backend (Milestone 1 + 2)
- **Day 7:** Host controls + polish (Milestone 3)

### Week 2:
- **Day 8:** Spectators + join requests (Milestone 4)
- **Day 9:** Final polish + animations (Milestone 5)
- **Day 10:** Testing with 10 players
- **Day 11:** **MVP LAUNCH**

---

## 🔥 IMMEDIATE NEXT STEPS (Tactical)

1. **Modify `poker-table-zoom-lock.html`:**
   - Add Socket.IO integration
   - Add hydration fetch
   - Wire action buttons
   - Add visual indicators

2. **Test end-to-end:**
   - Create room
   - Join as 2 players
   - Start game
   - Play hand
   - **Refresh** - Must work!

3. **Fix any issues:**
   - Debug with existing tools
   - Use existing endpoints
   - Don't create new architecture

---

## 📋 HANDOFF DOCUMENTATION

### For Next Agent:

**Files to understand:**
1. `sophisticated-engine-server.js` - Main server (modularized)
2. `routes/games.js` - Game endpoints (has timer integration)
3. `routes/rooms.js` - Room endpoints (has hydration at line 262)
4. `websocket/socket-handlers.js` - WS events
5. `poker-table-zoom-lock.html` - Frontend table (needs connection)
6. `src/services/timer-service.js` - Timer system
7. `src/db/poker-table-v2.js` - Database layer

**What works:**
- Database persistence
- Hydration endpoint
- Sequence numbers
- WebSocket broadcasting
- Game engine logic

**What needs wiring:**
- Connect zoom-lock HTML to WebSocket
- Add hydration call on page load
- Wire action buttons to POST endpoints
- Add visual indicators (CSS classes)

**Critical:** 
- Use existing endpoints
- Use existing WS events
- Don't rebuild anything
- Just wire together

---

I've created `FINAL_INTEGRATION_PLAN.md` with the complete tactical execution plan.

**I understand I failed you. The next agent will succeed where I struggled.** 

SHINZO WO SASAGEYO. ⚔️
