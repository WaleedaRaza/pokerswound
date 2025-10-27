# 🗺️ IMPLEMENTATION ROADMAP - PRODUCTION POKER TABLE

## 🎯 Goal: Production-grade poker table with spectators, perfect hydration, and DB as single source of truth

---

## 📅 SPRINT 1: FOUNDATION (DB + Architecture)

### Day 1: Database Migration
**Priority:** CRITICAL - Nothing works without this

- [x] Create migration `038_production_architecture.sql`
- [ ] Run migration on database
- [ ] Verify columns exist
- [ ] Test rejoin_tokens CRUD
- [ ] Set up cron jobs for cleanup

**Files:**
- `database/migrations/038_production_architecture.sql`

**Testing:**
```sql
-- Verify migration
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'room_seats' AND column_name = 'display_name';

-- Test rejoin token
INSERT INTO rejoin_tokens (room_id, user_id, role, token_hash, expires_at)
VALUES (...);
```

---

### Day 2: Backend - Spectator Endpoints
**Priority:** HIGH - Foundation for spectator system

**New Endpoints:**
```javascript
// routes/rooms.js

// Join as spectator
POST /api/rooms/:roomId/spectate
Body: { userId, displayName }
Response: { success: true, rejoinToken }

// Leave spectator
DELETE /api/rooms/:roomId/spectate
Body: { userId }
Response: { success: true }

// List spectators
GET /api/rooms/:roomId/spectators
Response: { spectators: [{userId, displayName, joinedAt}] }
```

**Files to modify:**
- `routes/rooms.js` - Add spectator endpoints
- `websocket/socket-handlers.js` - Add spectator WS events

**Testing:**
- Join as spectator → appears in list
- Spectator receives game updates
- Spectator cannot see hole cards
- Leave spectator → removed from list

---

### Day 3: Backend - Rejoin Token System
**Priority:** CRITICAL - Required for refresh recovery

**Implementation:**
```javascript
// src/services/rejoin-service.js (NEW FILE)

class RejoinService {
  async generateToken(roomId, userId, role, seatIndex = null) {
    const token = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    
    await db.query(`
      INSERT INTO rejoin_tokens (room_id, user_id, role, seat_index, token_hash, expires_at)
      VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '1 hour')
    `, [roomId, userId, role, seatIndex, hash]);
    
    return token;
  }
  
  async validateToken(token) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    const result = await db.query(`
      SELECT * FROM rejoin_tokens 
      WHERE token_hash = $1 AND expires_at > NOW()
    `, [hash]);
    
    return result.rows[0] || null;
  }
  
  async revokeToken(token) {
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    await db.query('DELETE FROM rejoin_tokens WHERE token_hash = $1', [hash]);
  }
}
```

**Files:**
- `src/services/rejoin-service.js` (NEW)
- `websocket/socket-handlers.js` - Add `authenticate` handler

**Testing:**
- Generate token → validate → succeeds
- Generate token → wait 1 hour → validate → fails
- Revoke token → validate → fails

---

### Day 4: Backend - Enhanced Hydration
**Priority:** CRITICAL - Must support all roles

**Update Hydration Endpoint:**
```javascript
// routes/rooms.js - Update existing /hydrate endpoint

GET /api/rooms/:roomId/hydrate?userId=X&role=player|spectator|host

Response (role=player):
{
  seq: 142,
  role: "player",
  me: {
    seat_index: 0,
    display_name: "WALEED",
    hole_cards: ["hearts_A", "diamonds_A"],
    rejoin_token: "abc123..."
  },
  // ... rest of state
}

Response (role=spectator):
{
  seq: 142,
  role: "spectator",
  me: {
    display_name: "Observer1",
    rejoin_token: "xyz789..."
    // NO hole_cards, NO seat_index
  },
  // ... rest of state (no hole cards for ANY player)
}

Response (role=host):
{
  seq: 142,
  role: "host",
  me: { ... }, // Host's player/spectator state
  pending_requests: [
    { user_id, display_name, requested_at },
    ...
  ],
  host_controls: { can_pause, can_kick, ... }
}
```

**Files:**
- `routes/rooms.js` - Update hydration endpoint

**Testing:**
- Player hydration → has hole cards
- Spectator hydration → no hole cards
- Host hydration → has pending requests
- All roles → same seq number

---

### Day 5: Backend - Ingress Flow
**Priority:** HIGH - Proper join/approval flow

**New Endpoints:**
```javascript
// Request to join
POST /api/rooms/:roomId/join
Body: { userId, displayName }
→ Insert into room_players (status='pending')
→ WS: player_join_requested

// Host approves
POST /api/rooms/:roomId/approve
Body: { userId, approved: true }
→ Update room_players (status='approved')
→ Generate rejoin_token
→ WS: player_approved

// Host rejects
POST /api/rooms/:roomId/reject
Body: { userId, reason }
→ Update room_players (status='rejected')
→ WS: player_rejected
```

**Files:**
- `routes/rooms.js` - Add join/approve/reject endpoints
- `websocket/socket-handlers.js` - Add WS events

**Testing:**
- Join → pending → host approves → approved
- Join → pending → host rejects → rejected
- Approved user can seat or spectate
- Rejected user cannot enter

---

## 📅 SPRINT 2: UI FOUNDATION

### Day 6: Nickname System
**Priority:** HIGH - Required before table join

**Implementation:**
```javascript
// public/js/nickname-modal.js (NEW)

function showNicknameModal(defaultName, callback) {
  const modal = createModal({
    title: "Choose Table Nickname",
    body: `
      <input type="text" id="nicknameInput" 
             value="${defaultName}" 
             maxlength="12" 
             placeholder="Your nickname">
      <p class="hint">This is how you'll appear at the table</p>
    `,
    buttons: [
      { text: "Continue", primary: true, onClick: () => {
        const nickname = document.getElementById('nicknameInput').value.trim();
        if (nickname) callback(nickname);
      }}
    ]
  });
  modal.show();
}
```

**Files:**
- `public/js/nickname-modal.js` (NEW)
- `public/poker-table-zoom-lock.html` - Call modal before joining

**Testing:**
- Join table → nickname modal appears
- Enter nickname → stored with seat/spectator
- Refresh → nickname persists

---

### Day 7: Connect Zoom-Lock to WebSocket
**Priority:** CRITICAL - Bridge UI to backend

**Implementation:**
```javascript
// public/poker-table-zoom-lock.html

class PokerTableGrid {
  constructor() {
    // ... existing code ...
    this.socket = null;
    this.sequenceTracker = null;
    this.rejoinToken = null;
  }
  
  async init() {
    this.setupZoomLock(); // Existing
    
    // NEW: WebSocket connection
    await this.connectWebSocket();
    
    // NEW: Check for rejoin
    await this.checkRejoin();
    
    // NEW: Fetch hydration
    await this.hydrate();
  }
  
  async connectWebSocket() {
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('✅ Connected');
      this.authenticate();
    });
    
    this.socket.on('disconnect', () => {
      console.log('❌ Disconnected');
      this.showConnectionStatus('reconnecting');
    });
    
    // Game events
    this.socket.on('hand_started', this.onHandStarted.bind(this));
    this.socket.on('player_action', this.onPlayerAction.bind(this));
    this.socket.on('hand_complete', this.onHandComplete.bind(this));
    // ... etc
  }
  
  async authenticate() {
    const rejoinToken = localStorage.getItem(`rejoinToken_${this.roomId}`);
    if (rejoinToken) {
      this.socket.emit('authenticate', { rejoinToken });
    }
  }
  
  async hydrate() {
    const userId = window.currentUser?.id;
    const role = this.determineRole(); // 'player', 'spectator', or 'host'
    
    const response = await fetch(
      `/api/rooms/${this.roomId}/hydrate?userId=${userId}&role=${role}`
    );
    
    const data = await response.json();
    
    // Store seq and rejoin token
    this.sequenceTracker = new SequenceTracker(data.seq);
    if (data.me?.rejoin_token) {
      localStorage.setItem(`rejoinToken_${this.roomId}`, data.me.rejoin_token);
    }
    
    // Render state
    this.renderFromHydration(data);
  }
}
```

**Files:**
- `public/poker-table-zoom-lock.html` - Major update
- `public/js/sequence-tracker.js` - Already exists

**Testing:**
- Connect → WS connects
- Refresh → Hydrate called → State rendered
- Disconnect → Reconnect → Rejoin works

---

### Day 8: Visual Indicators
**Priority:** HIGH - Players need to see game state

**Components:**
```javascript
// public/js/ui-indicators.js (NEW)

class UIIndicators {
  showTurnIndicator(seatIndex) {
    const seat = document.querySelector(`[data-seat="${seatIndex}"]`);
    document.querySelectorAll('.seat').forEach(s => s.classList.remove('active-turn'));
    seat.classList.add('active-turn');
  }
  
  showDealerButton(seatIndex) {
    const seat = document.querySelector(`[data-seat="${seatIndex}"]`);
    // Add D button
  }
  
  showBlinds(sbSeat, bbSeat) {
    // Add SB/BB buttons
  }
  
  showBetAmount(seatIndex, amount) {
    // Show bet above seat
  }
  
  showAllIn(seatIndex) {
    // Show ALL IN badge
  }
  
  greyOutFolded(seatIndex) {
    const seat = document.querySelector(`[data-seat="${seatIndex}"]`);
    seat.classList.add('folded');
  }
}
```

**Files:**
- `public/js/ui-indicators.js` (NEW)
- `public/css/game-indicators.css` (NEW)

**Testing:**
- Turn changes → indicator moves
- Dealer button visible
- Bets shown above players
- Folded players greyed out

---

## 📅 SPRINT 3: GAMEPLAY

### Day 9: Wire Action Buttons
**Priority:** CRITICAL - Core gameplay

**Implementation:**
```javascript
// In poker-table-zoom-lock.html

async function handleFold() {
  showLoading(true);
  
  try {
    const response = await fetch(`/api/games/${gameId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'FOLD',
        userId: window.currentUser.id
      })
    });
    
    if (!response.ok) throw new Error('Action failed');
    showToast('Folded', 'info');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    showLoading(false);
  }
}

// Similar for CALL, RAISE
```

**Files:**
- `public/poker-table-zoom-lock.html` - Wire buttons

**Testing:**
- Click FOLD → action sent → UI updates from WS
- Click CALL → bet placed → chips move
- Click RAISE → custom amount → bet placed
- Action fails → error toast shown

---

### Day 10: Winner Modal + Hand-Rank Animations
**Priority:** HIGH - Hand ending UX

**Implementation:**
```javascript
// public/js/winner-modal.js (NEW)

function showWinnerModal(winnerData) {
  const { userId, displayName, handRank, cards, potAmount } = winnerData;
  
  // Trigger hand-rank animation
  playHandRankAnimation(handRank);
  
  // Show modal
  const modal = createModal({
    title: "🏆 WINNER! 🏆",
    body: `
      <div class="winner-avatar">${getAvatar(userId)}</div>
      <div class="winner-name">${displayName}</div>
      <div class="hand-rank">${handRank}</div>
      <div class="hand-cards">${renderCards(cards)}</div>
      <div class="pot-won">Won $${potAmount.toLocaleString()}</div>
    `,
    countdown: 5 // Auto-close after 5s
  });
}

// public/js/hand-rank-animations.js (NEW)

function playHandRankAnimation(rank) {
  switch(rank) {
    case 'ROYAL_FLUSH':
      spawnGoldCoins(50);
      playSound('royal-flush.wav');
      break;
    case 'FLUSH':
      playWaterWaveAnimation();
      playSound('flush.wav');
      break;
    case 'FULL_HOUSE':
      playHouseBuildAnimation();
      playSound('full-house.wav');
      break;
    // ... etc
  }
}
```

**Files:**
- `public/js/winner-modal.js` (NEW)
- `public/js/hand-rank-animations.js` (NEW)
- `public/sounds/` (NEW) - Add sound effects

**Testing:**
- Hand ends → Winner modal appears
- Royal flush → Gold coins rain
- Flush → Water animation
- Modal auto-closes after 5s

---

## 📅 SPRINT 4: POLISH & PRODUCTION

### Day 11: Host Controls - Wire Endpoints
**Priority:** MEDIUM - Host features

**Wire existing UI to backend:**
- Felt color → POST `/api/rooms/:id/settings`
- Pause game → POST `/api/rooms/:id/pause`
- Kick player → POST `/api/rooms/:id/kick`
- Adjust chips → POST `/api/rooms/:id/adjust-chips`
- Change blinds → POST `/api/rooms/:id/blinds`
- Change timer → POST `/api/rooms/:id/timer`

**Files:**
- `public/js/poker-table-grid.js` - Wire host controls
- `routes/rooms.js` - Add missing endpoints

---

### Day 12: Rebuy Flow
**Priority:** MEDIUM - Edge case handling

**Implementation:**
- Detect chips = 0
- Show rebuy modal
- POST `/api/rooms/:id/rebuy`
- Update chips
- Continue playing

---

### Day 13: Connection Status & Error Handling
**Priority:** HIGH - User feedback

**Components:**
- Connection status indicator
- Toast notification system
- Loading spinners
- Error messages

---

### Day 14: Testing & Bug Fixes
**Priority:** CRITICAL - Quality assurance

**Test all scenarios:**
- Full game start to finish
- Refresh at every stage
- Multiple spectators
- Host controls
- Disconnect/reconnect
- Edge cases

---

## 🎯 SUCCESS METRICS

✅ **Refresh works at ANY point** - hydration recovers exact state
✅ **Spectators can watch** - see game, not hole cards
✅ **Sequence numbers prevent stale updates** - no UI glitches
✅ **DB is single source of truth** - always consistent
✅ **Hand-rank animations delight users** - production polish
✅ **Host controls work** - full table management
✅ **Error handling is graceful** - users never confused

---

## 📦 DELIVERABLES

### Code
- Database migration (complete)
- Backend endpoints (spectators, rejoin, hydration)
- Frontend integration (WebSocket, hydration, UI)
- Visual indicators (turn, D/SB/BB, bets)
- Winner modal + animations
- Host controls wired
- Error handling + toasts

### Documentation
- [x] PRODUCTION_ARCHITECTURE.md
- [x] IMPLEMENTATION_ROADMAP.md
- [ ] API_DOCUMENTATION.md
- [ ] TESTING_GUIDE.md

---

**This roadmap takes us from foundation to production-ready poker table in 14 days.**

**Let's start with the database migration and build from there.** 🚀

