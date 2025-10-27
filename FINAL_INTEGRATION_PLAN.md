# 🎯 FINAL INTEGRATION - ONE PUSH TO PRODUCTION

## Current Reality

**What EXISTS and WORKS:**
- ✅ TypeScript game engine (`/dist/core/engine/`)
- ✅ Modularized routes (`routes/games.js`, `routes/rooms.js`)
- ✅ Hydration endpoint (`GET /api/rooms/:roomId/hydrate`)
- ✅ WebSocket handlers (`websocket/socket-handlers.js`)
- ✅ Sequence numbers + idempotency
- ✅ Timer system (`src/services/timer-service.js`)
- ✅ Zoom-lock table (`poker-table-zoom-lock.html`)
- ✅ Lobby + room creation (`play.html`)

**What's BROKEN:**
- ❌ Zoom-lock table is NOT connected to backend
- ❌ No transition from lobby → table
- ❌ Actions don't fire
- ❌ Refresh doesn't work on table

---

## WebSocket Events (EXIST in codebase)

### Inbound (Client → Server):
- `authenticate` - With userId, roomId, rejoinToken
- `join_room` - Join lobby
- `heartbeat` - Keep-alive
- `start_game` - Host starts

### Outbound (Server → Client):
- `authenticated` - Confirms auth
- `state_sync` - Hydration signal
- `joined_room` - Room joined
- `game_started` - Game begins
- `hand_started` - New hand (with seq)
- `turn_timeout` - Player auto-folded (with seq)
- `game_over` - Winner (with seq)
- `player_away` - Disconnected
- `player_timeout` - Grace period expired
- `seat_update` - Seats changed

---

## HTTP Endpoints (EXIST)

### Room Management:
- `POST /api/rooms` - Create room
- `POST /api/rooms/:id/join` - Claim seat
- `POST /api/rooms/:id/lobby/join` - Request to join
- `POST /api/rooms/:id/lobby/approve` - Host approves
- `GET /api/rooms/:id/hydrate` - **FULL STATE RECOVERY**
- `GET /api/rooms/:id/seats` - Get all seats

### Game Actions:
- `POST /api/games` - Create game
- `POST /api/games/:id/start-hand` - Start new hand
- `POST /api/games/:id/actions` - Player action (fold/call/raise)

---

## TACTICAL EXECUTION PLAN

### Step 1: Wire Zoom-Lock to Backend (2 hours)
**File:** `public/poker-table-zoom-lock.html`

**Add to `<script>` section:**
```javascript
// 1. Initialize Socket.IO with sequence tracker
this.socket = io();
this.sequenceTracker = new SequenceTracker();

// 2. On connect, authenticate
this.socket.on('connect', () => {
  this.socket.emit('authenticate', {
    userId: this.userId,
    roomId: this.roomId,
    rejoinToken: sessionStorage.getItem('rejoin_token')
  });
});

// 3. On authenticated, hydrate
this.socket.on('authenticated', async (data) => {
  await this.hydrateFromServer();
});

// 4. Listen for game events
this.socket.on('hand_started', this.sequenceTracker.createHandler((data) => {
  this.renderHand(data.payload);
}));

// 5. Listen for actions
this.socket.on('player_action', this.sequenceTracker.createHandler((data) => {
  this.updatePlayerAction(data.payload);
}));

// 6. Listen for game_over
this.socket.on('game_over', this.sequenceTracker.createHandler((data) => {
  this.showWinner(data.payload);
}));
```

**Add hydration method:**
```javascript
async hydrateFromServer() {
  const response = await fetch(`/api/rooms/${this.roomId}/hydrate?userId=${this.userId}`);
  const hydration = await response.json();
  
  // Update sequence tracker
  this.sequenceTracker.currentSeq = hydration.seq;
  
  // Render everything from hydration
  this.renderSeats(hydration.seats);
  this.renderBoard(hydration.hand?.board || []);
  this.renderPot(hydration.hand?.pot_total || 0);
  
  // If I have hole cards, show them
  if (hydration.me?.hole_cards) {
    this.renderMyCards(hydration.me.hole_cards);
  }
  
  // Store rejoin token
  if (hydration.me?.rejoin_token) {
    sessionStorage.setItem('rejoin_token', hydration.me.rejoin_token);
  }
}
```

**Wire action buttons:**
```javascript
document.getElementById('foldBtn').addEventListener('click', () => {
  this.sendAction('FOLD', 0);
});

document.getElementById('callBtn').addEventListener('click', () => {
  const callAmount = this.currentBet; // Get from game state
  this.sendAction('CALL', callAmount);
});

document.getElementById('raiseBtn').addEventListener('click', () => {
  const raiseAmount = parseInt(document.getElementById('betInput').value);
  this.sendAction('RAISE', raiseAmount);
});

async sendAction(action, amount) {
  const response = await fetch(`/api/games/${this.gameId}/actions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Idempotency-Key': `${this.gameId}-${this.userId}-${action}-${Date.now()}`
    },
    body: JSON.stringify({
      player_id: this.userId,
      action: action,
      amount: amount
    })
  });
  
  if (!response.ok) {
    this.showError('Action failed');
  }
}
```

---

### Step 2: Route `/game/:roomId` to Zoom-Lock (15 min)
**File:** `routes/pages.js`

Already exists:
```javascript
router.get('/game/:roomId', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/poker-table-zoom-lock.html'));
});
```

Just update to use zoom-lock instead of old poker.html.

---

### Step 3: Add Visual Indicators (1 hour)
**In zoom-lock table CSS:**
```css
/* Turn indicator */
.seat.to-act .seat-content {
  animation: pulse-turn 2s infinite;
  box-shadow: 0 0 40px var(--accent);
}

@keyframes pulse-turn {
  0%, 100% { box-shadow: 0 0 40px var(--accent); }
  50% { box-shadow: 0 0 60px var(--accent); }
}

/* Folded player */
.seat.folded .seat-content {
  opacity: 0.3;
  filter: grayscale(1);
}

/* Dealer/Blind badges */
.dealer-badge,
.sb-badge,
.bb-badge {
  position: absolute;
  top: -12px;
  right: -12px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 12px;
  box-shadow: var(--shadow-lg);
}

.dealer-badge { background: white; color: #111; }
.sb-badge { background: var(--accent); color: white; }
.bb-badge { background: var(--teal); color: white; }
```

**In JS:**
```javascript
showTurnIndicator(seatIndex) {
  document.querySelectorAll('.seat').forEach(s => s.classList.remove('to-act'));
  document.querySelector(`[data-seat="${seatIndex}"]`).classList.add('to-act');
}

showDealerButton(seatIndex) {
  // Add dealer badge to seat
  const seat = document.querySelector(`[data-seat="${seatIndex}"]`);
  let badge = seat.querySelector('.dealer-badge');
  if (!badge) {
    badge = document.createElement('div');
    badge.className = 'dealer-badge';
    badge.textContent = 'D';
    seat.querySelector('.seat-content').appendChild(badge);
  }
}
```

---

### Step 4: Winner Modal (30 min)
```javascript
showWinner(data) {
  const modal = document.createElement('div');
  modal.className = 'winner-modal';
  modal.innerHTML = `
    <div class="modal-content">
      <h2>🏆 ${data.winner.name} Wins!</h2>
      <p class="hand-rank">${data.handRank}</p>
      <p class="pot-won">$${data.pot.toLocaleString()}</p>
      <button onclick="this.closest('.winner-modal').remove()">Continue</button>
    </div>
  `;
  document.body.appendChild(modal);
  
  // Auto-close after 5s
  setTimeout(() => modal.remove(), 5000);
}
```

---

### Step 5: Error Toast System (15 min)
```javascript
showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 12px;
    background: ${type === 'error' ? 'var(--error)' : 'var(--teal)'};
    color: white;
    font-weight: 700;
    box-shadow: var(--shadow-xl);
    z-index: 300;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
```

---

## 📊 EXISTING FLOW (From old poker.html - REFERENCE)

The OLD working table did this:
1. Get roomId from URL
2. Fetch `/api/rooms/:id/game` to check for active game
3. If game exists: fetch seats, render table
4. Connect WebSocket
5. Listen for updates
6. Send actions via POST

**We just need to replicate this in zoom-lock table.**

---

## 🎯 ONE-FILE INTEGRATION

**Modify:** `public/poker-table-zoom-lock.html`

**Add at top of `<script>` section:**
```javascript
// Get roomId from URL
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room') || urlParams.get('roomId');

// Get userId from auth
const userId = await getCurrentUserId(); // From auth-manager.js

// If no room, redirect to /play
if (!roomId) {
  window.location.href = '/play';
  return;
}

// Initialize table with roomId
window.pokerTable = new PokerTableGrid();
window.pokerTable.roomId = roomId;
window.pokerTable.userId = userId;
window.pokerTable.initWithBackend(); // NEW method
```

**Add new method to `PokerTableGrid` class:**
```javascript
async initWithBackend() {
  // 1. Initialize WebSocket
  this.socket = io();
  this.sequenceTracker = new SequenceTracker();
  
  // 2. Setup event handlers
  this.setupSocketEvents();
  
  // 3. Setup zoom lock (already exists)
  this.setupZoomLock();
  
  // 4. Setup host controls (already exists)
  this.initHostControls();
  
  // 5. When socket connects, authenticate
  this.socket.on('connect', () => {
    this.socket.emit('authenticate', {
      userId: this.userId,
      roomId: this.roomId,
      rejoinToken: sessionStorage.getItem('rejoin_token')
    });
  });
  
  // 6. When authenticated, hydrate
  this.socket.on('authenticated', async () => {
    await this.hydrateFromServer();
  });
}

setupSocketEvents() {
  // All WebSocket event handlers
  this.socket.on('hand_started', this.sequenceTracker.createHandler((data) => {
    this.onHandStarted(data.payload);
  }));
  
  // ... more handlers
}

async hydrateFromServer() {
  // Fetch from /hydrate endpoint
  // Render everything
  // Update sequence tracker
}
```

---

## 🔥 EXECUTION ORDER

1. **Import sequence-tracker.js** into zoom-lock
2. **Add WebSocket connection** logic
3. **Add hydration** on authenticate
4. **Wire action buttons** to POST endpoints
5. **Add visual indicators** (turn, D/SB/BB)
6. **Add winner modal**
7. **Add error toasts**
8. **Test end-to-end**

---

## ✅ COMPLETION CRITERIA

- [ ] Can create room, join, start game
- [ ] Can play full hand
- [ ] Can see turn indicator
- [ ] Can fold/call/raise
- [ ] Winner is announced
- [ ] **Can refresh mid-hand and continue**
- [ ] Can disconnect and rejoin
- [ ] No overlaps at any zoom
- [ ] All players see same state

---

## 🚨 CRITICAL REMINDERS

1. **Use existing endpoints** - Don't create new ones
2. **Use existing WS events** - Don't invent new broadcasts
3. **Hydration on every refresh** - Server is source of truth
4. **Sequence numbers** - Use sequenceTracker everywhere
5. **Idempotency keys** - X-Idempotency-Key on all actions

---

**This is the FINAL push. Everything exists. We just wire it together.** 🎯

Ready to execute?
