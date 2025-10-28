# ⚔️ COMMANDMENTS & PATH FORWARD

**Purpose:** Immutable truths + concrete escape plan  
**Scope:** Principles that don't change + specific fixes that will work  
**Audience:** Every agent from now until MVP launch

---

## 📜 THE IMMUTABLE COMMANDMENTS

### **I. Database is Source of Truth**

**Never Trust:**
- Client memory (lost on refresh)
- In-memory server Maps (lost on restart)
- LocalStorage (per-browser, not authoritative)
- Session state (per-server instance)

**Always Trust:**
- PostgreSQL tables
- What's written persists
- What persists can be queried
- What can be queried can restore state

**Application:**
```
On ANY state-affecting action:
1. Write to database FIRST
2. Update in-memory SECOND (for performance)
3. Broadcast THIRD (for real-time)

On ANY page load:
1. Query database FIRST
2. Render from DB response
3. Connect WebSocket for updates AFTER
```

---

### **II. HTTP Mutates, WebSocket Broadcasts**

**The Rule:**
- ALL state changes → HTTP POST/PUT/DELETE
- ALL real-time notifications → WebSocket emit
- NEVER mutate state in WebSocket handler

**Why:**
- HTTP is stateless (works across multiple servers)
- HTTP has request/response (can return errors)
- HTTP has idempotency (can retry safely)
- WebSocket is for pub/sub only

**Example (Correct):**
```
Player folds:
  Client → POST /api/games/:id/actions (HTTP)
  Server → Process fold, update DB
  Server → io.emit('player_action', {folded}) (WebSocket)
  All clients → Receive broadcast, update UI
```

**Example (Wrong):**
```
Player folds:
  Client → socket.emit('fold') (WebSocket)
  Server → Process in socket handler
  Server → Update DB (maybe? if handler written correctly?)
  Server → Broadcast (to who? all rooms?)
  
Problems:
  - No idempotency
  - Error handling unclear
  - Doesn't work with load balancer
  - Hard to debug
```

---

### **III. Refresh = Hydrate from Server**

**The Pattern:**
```
Page loads (any reason: first visit, refresh, back button)
  ↓
1. Extract roomId from URL
2. Extract userId from sessionStorage/localStorage
3. GET /api/rooms/:roomId/hydrate?userId=X
4. Response: {seq, room, game, hand, seats, me: {hole_cards}}
5. Render EXACTLY what server returned
6. Connect WebSocket for live updates
7. All future updates via WebSocket
```

**Current Implementation:**
- ✅ Steps 1-3 work (frontend calls hydration)
- ❌ Step 4 broken (returns empty)
- ❌ Steps 5-7 never reached

**Fix Required:**
- Change database query in hydration endpoint
- Everything else already works

---

### **IV. Sequence Numbers Prevent Chaos**

**The Pattern:**
```
Every database write:
  seq = seq + 1
  BROADCAST {seq: newSeq, ...payload}

Every client:
  if (incoming.seq > currentSeq) {
    accept();
    currentSeq = incoming.seq;
  } else {
    ignore(); // Stale
  }
```

**Implementation:**
- ✅ game_states.seq column exists
- ✅ dbV2.incrementSequence() works
- ✅ Broadcasts include seq
- ✅ sequence-tracker.js handles it
- ✅ Prevents stale updates

**Status:** This part actually works

---

### **V. Disconnect ≠ Leave**

**The Rule:**
```
On socket disconnect:
  1. Mark player as AWAY
  2. Start 5-minute grace period
  3. DO NOT free seat
  4. DO NOT end game
  5. If reconnect within 5min → Resume
  6. If timeout → THEN release seat
```

**Implementation:**
- ✅ websocket/socket-handlers.js:196-236
- ✅ SessionService.markPlayerAway()
- ✅ Grace period: 300 seconds
- ✅ Broadcasts: player_away event

**Status:** Works correctly

---

### **VI. Timers Are Timestamps, Not Countdowns**

**The Rule:**
```
Server stores: actor_turn_started_at = 1761677886000 (Unix ms)
Client computes: remaining = 30s - (now - started_at)

On refresh:
  Client fetches started_at from server
  Recomputes remaining
  Timer continues seamlessly
```

**Implementation:**
- ✅ game_states.actor_turn_started_at column
- ✅ TimerService stores timestamps
- ⚠️ Frontend not wired to display yet

**Status:** Backend ready, frontend TODO

---

### **VII. Private Data Stays Private**

**The Rule:**
```
Hole cards NEVER in public broadcasts.

Only visible to:
  1. Card owner (via hydration endpoint: me.hole_cards)
  2. At showdown (via card_reveals table)
```

**Implementation:**
- ✅ Hydration filters: Only requester gets their cards
- ✅ Broadcasts don't include cards
- ⚠️ Showdown reveal not implemented yet

**Status:** Security pattern correct

---

### **VIII. Rejoin Tokens for Seamless Recovery**

**The Rule:**
```
On seat claim:
  token = crypto.randomBytes(32).toString('hex')
  hash = SHA256(token)
  Store hash in rejoin_tokens table
  Return token to client
  Client stores in sessionStorage

On refresh:
  Client sends token
  Server validates hash
  Instant rejoin without re-claiming
```

**Implementation:**
- ✅ rejoin_tokens table exists
- ⚠️ Creation fails (requires game__id, currently null)
- ⚠️ Validation not tested

**Status:** Broken but non-critical (can rejoin without token)

---

### **IX. One State Manager**

**The Rule:**
```
NO: Scattered state variables
    let gameState, let seats, let cards, let pot...

YES: Single state object
    const state = {
      game: {...},
      hand: {...},
      seats: [...],
      me: {...}
    }
    
    function render(state) {
      // Single source of truth
    }
```

**Implementation:**
- ✅ game-state-manager.js exists (363 lines)
- ❌ Not used by poker-table-zoom-lock.html
- ❌ State scattered in PokerTableGrid class properties

**Status:** Pattern exists, not applied

---

### **X. Test Don't Guess**

**The Rule:**
```
Before claiming "it works":
  1. Test it yourself (if possible)
  2. Check terminal logs
  3. Check browser console
  4. Check network tab
  5. Check database
  6. THEN report results
```

**Violation Pattern:**
```
Agent: "I added the code, it should work"
User: "It doesn't"
Agent: "Did you restart?"
User: "Yes"
Agent: "Hmm, try again?"
User: "STILL doesn't work"
Agent: "Oh wait, I see the issue..."
```

**Correct Pattern:**
```
Agent: "I made this change. Test it and tell me EXACTLY what console shows."
User: [tests, provides logs]
Agent: [analyzes actual output]
Agent: "I see the issue: [specific problem]"
Agent: [fixes specific problem]
```

---

## 🛣️ THE PATH FORWARD

### **Phase 1: Fix Hydration (30 minutes)**

**File:** routes/rooms.js  
**Lines:** 350-423

**Current Code:**
```javascript
const gameResult = await db.query(
  `SELECT g.id, g.status, g.current_hand_id, gs.current_state, gs.seq, gs.version
   FROM games g
   LEFT JOIN game_states gs ON g.id::text = gs.id
   WHERE g.room_id = $1::uuid AND g.status != 'completed'
   ORDER BY g.created_at DESC LIMIT 1`,
  [req.params.roomId]
);
```

**Problem:** `games` table is empty → 0 rows

**Fixed Code:**
```javascript
const gameResult = await db.query(
  `SELECT id, status, current_state, seq, version, host_user_id, hand_number, total_pot
   FROM game_states
   WHERE room_id = $1 
   AND status NOT IN ('completed', 'COMPLETED', 'deleted')
   ORDER BY created_at DESC LIMIT 1`,
  [req.params.roomId]
);
```

**Then Extract from JSONB:**
```javascript
if (gameResult.rowCount > 0) {
  const gameRow = gameResult.rows[0];
  const state = gameRow.current_state; // JSONB object
  
  game = {
    id: gameRow.id,
    status: gameRow.status,
    current_hand_id: gameRow.id
  };
  
  // Extract hand data from JSONB
  if (state && state.handState) {
    hand = {
      id: gameRow.id,
      hand_number: state.handState.handNumber || 1,
      phase: state.currentStreet || 'PREFLOP',
      board: (state.handState.communityCards || []).map(c => c.toString ? c.toString() : c),
      pot_total: state.pot?.totalPot || 0,
      current_bet: state.bettingRound?.currentBet || 0,
      dealer_seat: state.handState.dealerPosition
    };
    
    // Find current actor
    if (state.toAct && state.players) {
      for (const [playerId, player] of Object.entries(state.players)) {
        if (playerId === state.toAct) {
          hand.actor_seat = player.seatIndex;
          break;
        }
      }
    }
    
    // Extract players
    players = Object.values(state.players || {}).map(p => {
      const playerData = {
        user_id: p.userId || extractUserId(p.uuid), // Extract from player_XXX_0 format
        username: p.name,
        seat_index: p.seatIndex,
        stack: p.stack,
        status: p.hasFolded ? 'FOLDED' : 'ACTIVE',
        current_bet: p.betThisStreet || 0,
        is_all_in: p.isAllIn || false,
        has_folded: p.hasFolded || false
      };
      
      // Only include requester's hole cards
      if (p.holeCards && p.holeCards.length > 0 && p.userId === userId) {
        myHoleCards = p.holeCards.map(c => {
          if (c.toString) return c.toString();
          if (c.rank && c.suit) return `${c.suit[0]}${c.rank === 'TEN' ? 'T' : c.rank[0]}`;
          return c;
        });
      }
      
      return playerData;
    });
  }
}

// Helper to extract userId from player_XXX_0 format
function extractUserId(playerUuid) {
  // Format: player_7d3c1161-b937-4e7b-ac1e-793217cf4f73_0
  const parts = playerUuid.split('_');
  if (parts.length >= 2) {
    // Remove 'player' prefix and seat suffix
    return parts.slice(1, -1).join('-');
  }
  return playerUuid;
}
```

**Test:**
```bash
# After change, restart server
node sophisticated-engine-server.js

# Create game, start hand
# Check browser console:
📊 Hydration data: { hasGame: true, hasHand: true }  ← Should be TRUE

# Check cards appear on screen
```

**If this doesn't work:**
- Check: game_states table has data?
- Check: current_state JSONB populated?
- Check: Query syntax correct?
- Check: Response JSON structure?

---

### **Phase 2: Test End-to-End (1 hour)**

**After hydration fixed:**

**Test 1: Game Start**
1. Create room (host)
2. Guest joins + approved
3. Both claim seats
4. Host clicks START HAND
5. **Verify:**
   - Both see cards
   - Pot shows blinds
   - Dealer button visible
   - Turn indicator on active player

**Test 2: Player Actions**
1. Active player clicks CALL
2. **Verify:**
   - Action processes
   - Pot increases
   - Turn moves
   - Other player sees update

**Test 3: Refresh**
1. Mid-hand, press F5
2. **Verify:**
   - Same cards appear
   - Same pot amount
   - Same dealer
   - Can continue playing

**Test 4: Hand Completion**
1. Play to showdown or all fold
2. **Verify:**
   - Winner determined
   - Chips updated
   - Next hand starts (or lobby if one broke)

---

### **Phase 3: Fix Timer Crash (20 minutes)**

**File:** src/services/timer-service.js line 150-240

**Current Code:**
```javascript
async getTimebankRemaining(gameId, playerId) {
  const result = await dbV2.pool.query(
    `SELECT timebank_remaining_ms FROM players WHERE game_id = $1 AND user_id = $2`,
    [gameId, playerId]
  );
  // CRASHES: players table doesn't exist
}
```

**Quick Fix (Disable):**
```javascript
async getTimebankRemaining(gameId, playerId) {
  // Timebank feature disabled until players table populated
  // Default to 60 seconds
  return 60000; // ms
}
```

**Proper Fix (Use JSONB):**
```javascript
async getTimebankRemaining(gameId, playerId) {
  // Query game_states instead of players table
  const result = await dbV2.pool.query(
    `SELECT current_state->'players'->$2->>'timebankRemaining' as timebank
     FROM game_states WHERE id = $1`,
    [gameId, playerId]
  );
  
  return parseInt(result.rows[0]?.timebank) || 60000;
}
```

**Test:**
- Start hand
- Wait 31+ seconds
- Should NOT crash
- Should auto-fold timed-out player

---

### **Phase 4: Polish & Deploy (2-3 hours)**

**Once game works:**

**1. Fix Idempotency (10 min)**
- Verify column is VARCHAR(128)
- If not, run migration again
- Clear processed_actions table

**2. Test Multiplayer (30 min)**
- 3+ players
- Multiple hands
- Rapid actions
- All fold scenarios
- All-in scenarios

**3. Error Handling (20 min)**
- What if player disconnects mid-action?
- What if two players act simultaneously?
- What if server restarts mid-hand?

**4. Mobile Testing (30 min)**
- iPhone Safari
- Android Chrome
- Tablet
- Verify zoom-lock works

**5. Cross-Browser (20 min)**
- Chrome ✅
- Firefox
- Safari
- Edge

**6. Performance (20 min)**
- 10 concurrent games
- Check latency
- Check memory usage
- Check database connections

---

## 🎯 ESCAPE PLAN (Guaranteed Path)

### **Step 1: Fix THE Bug**

**What:** Change hydration query  
**Where:** routes/rooms.js:350  
**How:** See Phase 1 above  
**Time:** 30 minutes  
**Risk:** LOW (just a query)  
**Test:** hasGame: true in console

---

### **Step 2: Verify Game Visible**

**What:** Confirm cards/pot/dealer show  
**Where:** Browser screen  
**How:** Visual inspection  
**Time:** 5 minutes  
**Risk:** NONE (just looking)  
**Test:** Can see your hole cards

---

### **Step 3: Test One Action**

**What:** Click FOLD button  
**Where:** poker-table-zoom-lock.html  
**How:** Just click it  
**Time:** 2 minutes  
**Risk:** LOW (might error, but won't break)  
**Test:** Pot updates, turn moves

---

### **Step 4: Test Refresh**

**What:** F5 mid-game  
**Where:** Browser  
**How:** Press F5  
**Time:** 10 seconds  
**Risk:** NONE (just testing)  
**Test:** State preserved

---

### **Step 5: Complete First Hand**

**What:** Play until winner  
**Where:** Game table  
**How:** Keep taking actions  
**Time:** 2-3 minutes  
**Risk:** MEDIUM (might crash, but shows what breaks)  
**Test:** Winner declared, chips updated

---

### **Step 6: Declare Victory or Debug**

**If all 5 steps pass:**
- ✅ MVP is DONE
- Launch to friends
- Gather feedback
- Iterate

**If any step fails:**
- STOP at that step
- Don't continue to next
- Debug THAT specific failure
- Fix it
- Retry from that step

---

## 🚨 FAILURE PREVENTION

### **How to Avoid Past Mistakes:**

**1. Never Claim Without Testing**
```
BAD:  "I fixed X, test it"
GOOD: "I changed Y. After restart, check if Z appears in console"
```

**2. Never Fix Multiple Things Simultaneously**
```
BAD:  "I fixed hydration, host controls, and seat broadcasts"
      → Which one broke it?
      
GOOD: "I fixed hydration. Test ONLY that. Then we'll do host controls."
      → Clear cause/effect
```

**3. Never Assume Restart Fixes Things**
```
BAD:  "Hmm, restart and try again"
      → Why would restart help?
      
GOOD: "I changed X which requires server reload. Restart to load new code."
      → Restart has purpose
```

**4. Never Debug Without Data**
```
BAD:  "The socket probably isn't connected..."
      → Guessing
      
GOOD: "Check console for 'Socket connected: XXX'. Do you see it?"
      → Data-driven
```

---

## 📐 ARCHITECTURAL TRUTHS

### **Truth 1: Two Game ID Systems Exist**

**This is reality. Accept it.**

**System A (TEXT IDs):**
- Used by: game_states table, in-memory Map
- ID Format: "sophisticated_1761677892235_3"
- Status: ✅ Works, has all data

**System B (UUIDs):**
- Used by: games, hands, players tables
- ID Format: "550e8400-e29b-41d4-a716-446655440000"
- Status: ❌ Broken, empty tables

**Current Strategy:** Use System A, ignore System B

**Future:** Unify to single system (pick one, deprecate other)

**For Now:** All queries must use game_states (TEXT)

---

### **Truth 2: Hydration is the Linchpin**

**Everything depends on hydration working:**
- Initial render
- Refresh recovery
- Reconnect recovery
- State restoration
- Hole card security

**If hydration is broken, EVERYTHING is broken.**

**Current Status:** Hydration endpoint executes but returns wrong data

**Priority:** FIX THIS FIRST

---

### **Truth 3: The Engine Works**

**Don't debug:**
- Card dealing
- Blind posting
- Pot calculations
- Betting rules
- Hand evaluation

**These are PROVEN WORKING.**

Terminal evidence:
```
🃏 Dealing hole cards to 2 players
📤 Dealt D6 to W
📤 Dealt H3 to W
🎴 W has: D6, H3
✅ Small blind posted: W - $5
✅ Big blind posted: Guest_1849 - $10
```

**If game logic fails, it's integration issue, not engine issue.**

---

### **Truth 4: Frontend is 90% Ready**

**Don't rebuild:**
- Zoom-lock scaling ✅
- Seat positioning ✅
- Socket connection ✅
- Hydration fetch ✅
- Event handlers ✅
- Action buttons ✅

**Just needs:**
- Hydration to return correct data
- Then rendering code already works

**Evidence:** The renderFromHydration() method is 178 lines of complete rendering logic

---

## 🎖️ PRINCIPLES FOR SUCCESS

### **1. One Thing at a Time**

```
Don't: Fix hydration + host controls + seat broadcasts
Do: Fix hydration. Test. THEN do host controls.
```

### **2. Bottom-Up, Not Top-Down**

```
Don't: Start with "refresh should work"
Do: Start with "does database have game?" → "does query return it?" → etc.
```

### **3. Evidence Over Logic**

```
Don't: "Socket should receive broadcast because I added listener"
Do: "Console shows 'Broadcast received' so it's working"
```

### **4. Simplify, Don't Complicate**

```
Don't: Add new system to fix old system
Do: Fix old system or replace entirely
```

---

## 🔧 SPECIFIC FIXES NEEDED

### **Fix #1: Hydration Query**

**Current:** Queries empty games table  
**Change:** Query game_states table  
**Impact:** Game becomes visible  
**Risk:** Low  
**Time:** 30 min

---

### **Fix #2: Card Extraction from JSONB**

**Current:** Queries hands.current_hand_id, players.hole_cards (empty tables)  
**Change:** Extract from game_states.current_state JSONB  
**Impact:** Hole cards appear  
**Risk:** Medium (JSONB parsing can be tricky)  
**Time:** 20 min

---

### **Fix #3: Timer Table**

**Current:** Queries players table (doesn't exist)  
**Change:** Use game_states or disable  
**Impact:** No crash after 30s  
**Risk:** Low  
**Time:** 10 min

---

### **Fix #4: Idempotency Column**

**Current:** VARCHAR(50), keys are 98 chars  
**Change:** Verify migration or truncate table  
**Impact:** No more warnings  
**Risk:** None  
**Time:** 5 min

---

## 🎯 SUCCESS CRITERIA

### **MVP is DONE when:**

1. Host and guest can play a complete hand
2. Both see cards dealt
3. Actions work (fold/call/raise)
4. Winner determined
5. Chips updated correctly
6. **Refresh mid-game preserves state**
7. Second hand starts automatically
8. No critical errors in console
9. Works in Chrome + Firefox
10. Mobile responsive

### **NOT required for MVP:**

- Hand history viewer
- AI analysis
- Friends system
- Tournaments
- Perfect UI polish
- All host controls working
- Spectator mode

**Just: Core poker game that survives refresh.**

---

## 📊 ESTIMATED TIME TO MVP

### **Optimistic (If hydration fix works):**
- Fix hydration: 30 min
- Test & validate: 30 min
- Fix minor issues: 1 hour
- **Total: 2 hours**

### **Realistic (If new issues found):**
- Fix hydration: 30 min
- Discover next blocker: 30 min
- Fix that blocker: 1 hour
- Test again: 30 min
- Fix edge cases: 1 hour
- **Total: 3.5 hours**

### **Pessimistic (If major issue):**
- Fix hydration: 30 min
- Works but new error appears: 1 hour
- That fix breaks something else: 1 hour
- Debugging cascade: 2 hours
- Finally stable: 1 hour
- **Total: 5.5 hours**

---

## 🔮 BEYOND MVP

### **Week 1 Post-Launch:**
- Polish UI/UX
- Add hand history
- Implement basic host controls
- Fix all warnings/errors
- Performance optimization

### **Week 2-3:**
- Friends system
- Clubs (basic)
- AI analysis (rule-based first)
- Mobile testing
- SEO/marketing

### **Month 2:**
- Premium tier
- Advanced AI (OpenAI integration)
- Tournament mode (basic)
- Learning content
- Community features

---

## 💬 FINAL WORDS

**We are SO CLOSE.**

The foundation is solid:
- Database has everything
- Engine works perfectly
- UI is beautiful
- Most integration done

**One query is wrong.**

Change it.

Test it.

Ship it.

**That's the path forward.**

No more rebuilds.  
No more pivots.  
No more "let me try this other approach."

Fix the query.  
Everything else falls into place.

**This is the way.**

