# ⚔️ WEEK 2 - REVISED PLAN

**Date:** October 24, 2025  
**Status:** Days 1-2 Complete, Days 3-7 Revised  
**Decision:** Modularize early to enable rapid feature development

---

## 📊 WHAT CHANGED?

### **Original Week 2 Plan:**
```
Day 1: Session Management
Day 2: WebSocket Reconnection
Day 3: Redis Setup
Day 4: Socket.IO Redis Adapter
Day 5: Load Testing
```

### **Revised Week 2 Plan:**
```
✅ Day 1: Auth Emergency Fix (unplanned, but critical)
✅ Day 2: URL Recovery & Seat Restoration (unplanned, but critical)
🔨 Day 3: Critical Refresh Fix (4 hours)
🔨 Days 4-7: Start Week 3 Early (modularization)
```

### **Why the Change?**

**Problem Discovered:** 
- Auth was broken (guests couldn't join)
- Refresh broke game state (seats shown as "taken")
- These issues blocked all testing

**Solution:**
- Fixed auth issues (Days 1-2)
- Fixed seat restoration (Day 2)
- Still need to fix game state detection (Day 3)

**Strategic Pivot:**
- Every feature we add to monolith makes migration harder
- Modularizing NOW prevents 90-hour bugs
- Features after modularization take 1 day instead of 1 week

---

## 🎯 WEEK 2 REVISED: DAYS 3-7

### **DAY 3 (Tomorrow): Critical Refresh Fix** ⚔️

**Goal:** Make refresh not break the game

**Problem:**
1. Player refreshes browser
2. Recovery system loads room and seats ✅
3. But doesn't detect if game is active ❌
4. Shows lobby instead of game table ❌
5. "Start Game" button not disabled ❌
6. Players disconnected from active hand ❌

**Solution:**
```javascript
// Add to attemptRoomRecovery()
const activeGame = await checkActiveGame(roomId);

if (activeGame && activeGame.state) {
  // Game is active, show game table
  showGameTable(activeGame);
  renderGameState(activeGame.state);
} else {
  // No active game, show lobby
  showLobby();
}

// Disable "Start Game" if game already running
if (activeGame) {
  document.getElementById('startGameBtn').disabled = true;
  document.getElementById('startGameBtn').textContent = 'Game in Progress';
}
```

**Tasks:**
1. ✅ Add backend endpoint: `GET /api/rooms/:roomId/game` (already done)
2. 🔨 Enhance `checkActiveGame()` to return full game state
3. 🔨 Add game state detection to recovery flow
4. 🔨 Show game table if game is active
5. 🔨 Disable "Start Game" button if game exists
6. 🔨 Add "Game Active" indicator to UI

**Time Estimate:** 4 hours

**Success Criteria:**
- ✅ Host refreshes mid-game → sees game table, not lobby
- ✅ Guest refreshes mid-game → sees game table, not lobby
- ✅ Player refreshes in lobby → sees lobby (no change)
- ✅ "Start Game" button disabled when game active
- ✅ Players stay connected to active hand

**Testing:**
```bash
# Test 1: Refresh in lobby
1. Create room
2. Claim seats
3. Refresh (F5)
→ Should: See lobby, seats claimed, "Start Game" enabled

# Test 2: Refresh mid-game
1. Start game
2. Play a few actions
3. Refresh (F5)
→ Should: See game table, cards visible, action panel ready

# Test 3: Both players refresh
1. Start game
2. Player 1 refreshes
3. Player 2 refreshes
→ Should: Both see game table, both connected, game continues
```

---

### **DAYS 4-7: Modularization (Week 3 Early Start)** ⚔️

**Goal:** Break the 2,746-line monolith into clean modules

**Why Now?**
- Every feature added to monolith = harder migration
- Modularizing enables 1-day feature development
- Prevents another 90-hour bug

---

### **DAY 4: Extract REST Routes**

**Current State:**
```javascript
// sophisticated-engine-server.js (lines 288-800)
app.post('/api/rooms', async (req, res) => { /* 50 lines */ });
app.get('/api/rooms/:id', async (req, res) => { /* 30 lines */ });
app.post('/api/rooms/:id/join', async (req, res) => { /* 40 lines */ });
// ... 12 more inline routes
```

**Target State:**
```typescript
// routes/rooms.controller.ts
export class RoomsController {
  async createRoom(req, res) { /* 50 lines */ }
  async getRoom(req, res) { /* 30 lines */ }
  async joinRoom(req, res) { /* 40 lines */ }
}

// sophisticated-engine-server.js (now just wiring)
app.use('/api/rooms', roomsRouter);
app.use('/api/games', gamesRouter);
app.use('/api/auth', authRouter);
```

**Tasks:**
1. Create `routes/rooms.controller.ts`
2. Create `routes/games.controller.ts`
3. Create `routes/auth.controller.ts`
4. Move route logic from monolith to controllers
5. Update main server file to use routers
6. Test all endpoints still work

**Time Estimate:** 8 hours

---

### **DAY 5: Extract WebSocket Handlers**

**Current State:**
```javascript
// sophisticated-engine-server.js (lines 2001-2746)
io.on('connection', (socket) => {
  socket.on('join_room', async (data) => { /* 50 lines */ });
  socket.on('player_action', async (data) => { /* 80 lines */ });
  socket.on('chat_message', async (data) => { /* 30 lines */ });
  // ... 10 more inline handlers
});
```

**Target State:**
```typescript
// services/socket/room-handler.ts
export class RoomSocketHandler {
  handleJoinRoom(socket, data) { /* 50 lines */ }
  handleLeaveRoom(socket, data) { /* 30 lines */ }
}

// services/socket/game-handler.ts
export class GameSocketHandler {
  handlePlayerAction(socket, data) { /* 80 lines */ }
  handleStartHand(socket, data) { /* 40 lines */ }
}

// sophisticated-engine-server.js (now just wiring)
io.on('connection', (socket) => {
  roomHandler.register(socket);
  gameHandler.register(socket);
  chatHandler.register(socket);
});
```

**Tasks:**
1. Create `services/socket/room-handler.ts`
2. Create `services/socket/game-handler.ts`
3. Create `services/socket/chat-handler.ts`
4. Move socket logic from monolith to handlers
5. Update main server file to use handlers
6. Test all socket events still work

**Time Estimate:** 8 hours

---

### **DAY 6: Integrate TypeScript Services**

**Current State:**
- GameStateMachine exists but not fully used
- CommandBus, QueryBus, EventBus initialized but not wired
- Repositories exist but queries are inline

**Target State:**
- All game logic goes through GameApplicationService
- All commands go through CommandBus
- All queries go through QueryBus
- All events go through EventBus

**Tasks:**
1. Wire up `CreateGameCommand` → `GameApplicationService`
2. Wire up `JoinGameCommand` → `GameApplicationService`
3. Wire up `PlayerActionCommand` → `GameApplicationService`
4. Replace inline database queries with repository calls
5. Ensure all domain events are published
6. Test full CQRS flow

**Time Estimate:** 8 hours

---

### **DAY 7: Testing & Validation**

**Tasks:**
1. Run all existing test scripts
2. Manual testing of full game flow
3. Performance testing (100 concurrent users)
4. Fix any bugs discovered
5. Document new architecture
6. Deploy to staging

**Time Estimate:** 8 hours

---

## 📊 WEEK 2 PROGRESS TRACKER

```
✅ Day 1: Auth Emergency Fix (100%)
✅ Day 2: URL Recovery & Seat Restoration (100%)
🔨 Day 3: Critical Refresh Fix (0%)
🔲 Day 4: Extract REST Routes (0%)
🔲 Day 5: Extract WebSocket Handlers (0%)
🔲 Day 6: Integrate TypeScript Services (0%)
🔲 Day 7: Testing & Validation (0%)

Overall: 28% Complete (2/7 days)
```

---

## 🎯 SUCCESS METRICS

**By End of Week 2:**
- ✅ Refresh doesn't break game
- ✅ All routes extracted to controllers
- ✅ All socket handlers extracted to services
- ✅ Full CQRS flow operational
- ✅ Monolith reduced from 2,746 lines to <500 lines
- ✅ All features still work
- ✅ Ready for rapid feature development

**Feature Development Velocity After Week 2:**
- Before: 1 feature = 1 week (in monolith)
- After: 1 feature = 1 day (in clean architecture)

**Risk Reduction:**
- Before: Every change risks 90-hour bug
- After: Changes isolated, no side effects

---

## 📋 DEPENDENCIES

**Day 3 depends on:**
- ✅ Week 2 Day 2 complete (seat restoration)

**Days 4-7 depend on:**
- ✅ Day 3 complete (game playable)

**Week 3+ depends on:**
- ✅ Days 4-7 complete (modularization done)

---

## ⚔️ COMMITMENT

**This week we:**
1. Fix the last critical bug (refresh)
2. Break the monolith (enable rapid dev)
3. Set up for 1-day feature development

**Next week we:**
1. Build action timers (1 day)
2. Build player status (1 day)
3. Build room management (3 days)

**No 90-hour bugs. Ever again.** ⚔️
