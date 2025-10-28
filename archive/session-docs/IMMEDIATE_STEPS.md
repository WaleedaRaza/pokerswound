# ⚔️ IMMEDIATE STEPS - TACTICAL EXECUTION PLAN

**Purpose:** Clear, sequential steps to wire MVP and fix refresh bug  
**Mode:** PLANNER  
**Status:** Ready for Commander approval  
**Guardrails:** Integrated consultant brief (see CONSULTANT_ANSWERS.md)

---

## 🎯 OBJECTIVE

**Goal:** Connect poker-table-zoom-lock.html to working backend  
**Success:** Refresh mid-game → continue playing (not restart)  
**Estimated Time:** 4-6 hours  
**Risk:** Low (backend already works, just wiring frontend)

---

## 📋 STEP-BY-STEP PROCEDURE

### **STEP 0: VERIFY BACKEND HEALTH** ⏱️ 15 minutes

**Purpose:** Prove hydration endpoint works BEFORE touching frontend

**Procedure:**
1. Start server:
   ```bash
   node sophisticated-engine-server.js
   ```

2. Open browser console (F12)

3. Run this test:
   ```javascript
   // Test hydration endpoint exists
   fetch('http://localhost:3000/api/rooms/test-room/hydrate?userId=test-user')
     .then(r => r.json())
     .then(data => console.log('✅ HYDRATION WORKS:', data))
     .catch(err => console.error('❌ HYDRATION BROKEN:', err));
   ```

**Expected Result:**
- ✅ Returns 404 (room doesn't exist) - Endpoint works
- ❌ If 500 error → Backend broken, fix first

**Verification Checklist:**
- [ ] Server starts without errors
- [ ] `/api/rooms/:roomId/hydrate` endpoint responds (even if 404)
- [ ] Console shows no startup errors
- [ ] Database connection successful

**If This Fails:**
- STOP. Backend is broken.
- Check: Database connection
- Check: migrations run
- Check: routes/rooms.js loaded correctly

**If This Passes:**
- ✅ Backend confirmed working
- ✅ Proceed to Step 1

---

### **STEP 1: ADD WEBSOCKET CONNECTION** ⏱️ 30 minutes

**File:** `public/poker-table-zoom-lock.html`  
**Location:** Before closing `</body>` tag (around line 1100)

**Procedure:**

**1.1: Add Script Tags**
```html
<!-- Add these BEFORE closing </body> -->
<script src="/socket.io/socket.io.js"></script>
<script src="/js/sequence-tracker.js"></script>
<script src="/js/auth-manager.js"></script>
```

**1.2: Add Socket Properties to PokerTableGrid Class**

Find: `constructor()` in PokerTableGrid class (line ~868)

Add these properties:
```javascript
constructor() {
  // ... existing properties ...
  
  // Backend connection properties
  this.socket = null;
  this.sequenceTracker = null;
  this.gameId = null;
  this.userId = null;
  this.roomId = null;
  this.currentBet = 0;
  this.myTurn = false;
}
```

**Verification:**
- [ ] Script tags added (check network tab shows files loaded)
- [ ] No console errors
- [ ] Properties added to class

**If This Fails:**
- Check: File paths correct (/js/sequence-tracker.js exists)
- Check: Socket.IO script loads (network tab)

**If This Passes:**
- ✅ WebSocket infrastructure ready
- ✅ Proceed to Step 2

---

### **STEP 2: CREATE BACKEND INITIALIZATION METHOD** ⏱️ 1 hour

**File:** `public/poker-table-zoom-lock.html`  
**Location:** Inside PokerTableGrid class (around line 1000)

**Procedure:**

**2.1: Create `initWithBackend()` Method**

Add this new method to the class:

```javascript
async initWithBackend() {
  console.log('🔌 Initializing with backend...');
  
  // 1. Get roomId from URL
  const urlParams = new URLSearchParams(window.location.search);
  this.roomId = urlParams.get('room');
  
  if (!this.roomId) {
    console.error('No room ID in URL, redirecting to /play');
    window.location.href = '/play';
    return;
  }
  
  // 2. Get userId from auth or session
  this.userId = window.currentUser?.id || sessionStorage.getItem('userId');
  
  if (!this.userId) {
    console.error('No user ID found');
    alert('Please sign in first');
    window.location.href = '/';
    return;
  }
  
  console.log(`🎮 Connecting to room ${this.roomId} as user ${this.userId}`);
  
  // 3. Initialize sequence tracker
  this.sequenceTracker = new SequenceTracker();
  
  // 4. Initialize Socket.IO
  this.socket = io();
  
  // 5. Socket event handlers
  this.socket.on('connect', () => {
    console.log('✅ Socket connected:', this.socket.id);
    this.authenticateSocket();
  });
  
  this.socket.on('disconnect', () => {
    console.log('❌ Socket disconnected');
  });
  
  this.socket.on('authenticated', () => {
    console.log('✅ Authenticated, fetching game state...');
    this.fetchHydration();
  });
  
  // 6. Setup UI
  this.setupZoomLock();
  this.initHostControls();
  this.wireActionButtons();
}

authenticateSocket() {
  const rejoinToken = sessionStorage.getItem('rejoin_token');
  
  this.socket.emit('authenticate', {
    userId: this.userId,
    roomId: this.roomId,
    rejoinToken: rejoinToken
  });
}
```

**2.2: Modify `init()` Method**

Find: `async init()` method (line ~912)

Change from:
```javascript
async init() {
  this.setupZoomLock();
  this.initDemo();  // ❌ OLD
  this.initHostControls();
  this.setupResizeObserver();
}
```

To:
```javascript
async init() {
  await this.initWithBackend();  // ✅ NEW
  this.setupResizeObserver();
}
```

**Verification:**
- [ ] Start server
- [ ] Open `/table?room=test123` in browser
- [ ] Console shows "🔌 Initializing with backend..."
- [ ] Console shows "✅ Socket connected"
- [ ] No JavaScript errors

**If This Fails:**
- Check: URL has `?room=` parameter
- Check: auth-manager.js sets window.currentUser
- Check: Socket connects (WebSocket tab in DevTools)

**If This Passes:**
- ✅ Socket connecting
- ✅ Proceed to Step 3

---

### **STEP 3: IMPLEMENT HYDRATION FETCH** ⏱️ 1 hour

**File:** `public/poker-table-zoom-lock.html`  
**Location:** Inside PokerTableGrid class

**Procedure:**

Add this method:

```javascript
async fetchHydration() {
  try {
    console.log('🌊 Fetching hydration data...');
    
    const response = await fetch(
      `/api/rooms/${this.roomId}/hydrate?userId=${this.userId}`
    );
    
    if (!response.ok) {
      throw new Error(`Hydration failed: ${response.status}`);
    }
    
    const hydration = await response.json();
    console.log('✅ Hydration received:', hydration);
    
    // Update sequence tracker
    this.sequenceTracker.currentSeq = hydration.seq || 0;
    
    // Store game ID for actions
    if (hydration.game) {
      this.gameId = hydration.game.id;
    }
    
    // Store rejoin token
    if (hydration.me?.rejoin_token) {
      sessionStorage.setItem('rejoin_token', hydration.me.rejoin_token);
    }
    
    // Render everything from server state
    this.renderFromHydration(hydration);
    
    // Setup game event listeners
    this.setupGameEventHandlers();
    
  } catch (error) {
    console.error('❌ Hydration failed:', error);
    alert('Failed to load game. Please refresh or return to lobby.');
    // Optional: redirect to /play after 3 seconds
  }
}

renderFromHydration(hydration) {
  console.log('🎨 Rendering from hydration...');
  
  // Apply seat positions (existing method)
  this.applySeatPositions();
  
  // Render seats
  if (hydration.seats) {
    this.renderSeats(hydration.seats);
  }
  
  // Render board cards
  if (hydration.hand?.board) {
    this.renderBoard(hydration.hand.board);
  }
  
  // Render pot
  if (hydration.hand?.pot_total) {
    this.renderPot(hydration.hand.pot_total);
  }
  
  // Render my hole cards
  if (hydration.me?.hole_cards) {
    this.renderMyCards(hydration.me.hole_cards, hydration.me.seat_index);
  }
  
  // Update HUD info
  this.renderHudInfo({
    room: hydration.room?.code || 'Unknown',
    hand: hydration.hand?.hand_number || 1,
    seats: hydration.seats || []
  });
  
  console.log('✅ Rendering complete');
}
```

**Verification:**
- [ ] Create real room via /play
- [ ] Join as player, claim seat
- [ ] Start game
- [ ] Check console: "🌊 Fetching hydration data..."
- [ ] Check console: "✅ Hydration received: {data}"
- [ ] Table shows actual game state (not demo)

**If This Fails:**
- Check: Hydration endpoint returns data (test with curl)
- Check: roomId and userId are correct
- Check: Network tab shows successful request

**If This Passes:**
- ✅ Hydration working
- ✅ Can see game state from DB
- ✅ Proceed to Step 4

---

### **STEP 4: WIRE ACTION BUTTONS** ⏱️ 45 minutes

**File:** `public/poker-table-zoom-lock.html`  
**Location:** Inside PokerTableGrid class

**Procedure:**

Add these methods:

```javascript
wireActionButtons() {
  console.log('🔘 Wiring action buttons...');
  
  const foldBtn = document.getElementById('foldBtn');
  const callBtn = document.getElementById('callBtn');
  const raiseBtn = document.getElementById('raiseBtn');
  const betInput = document.getElementById('betInput');
  
  if (!foldBtn || !callBtn || !raiseBtn) {
    console.warn('Action buttons not found in DOM');
    return;
  }
  
  foldBtn.addEventListener('click', () => this.sendAction('FOLD', 0));
  callBtn.addEventListener('click', () => this.sendAction('CALL', this.currentBet));
  raiseBtn.addEventListener('click', () => {
    const amount = parseInt(betInput?.value || 0);
    this.sendAction('RAISE', amount);
  });
  
  console.log('✅ Action buttons wired');
}

async sendAction(action, amount) {
  if (!this.gameId) {
    console.error('No game ID - cannot send action');
    this.showToast('Game not started', 'error');
    return;
  }
  
  if (!this.userId) {
    console.error('No user ID - cannot send action');
    return;
  }
  
  console.log(`🎯 Sending action: ${action} ${amount}`);
  
  try {
    const response = await fetch(`/api/games/${this.gameId}/actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Idempotency-Key': `${this.gameId}-${this.userId}-${action}-${Date.now()}`
      },
      body: JSON.stringify({
        player_id: this.userId,
        action: action.toUpperCase(),
        amount: amount || 0
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Action failed');
    }
    
    const result = await response.json();
    console.log('✅ Action sent successfully:', result);
    
  } catch (error) {
    console.error('❌ Action failed:', error);
    this.showToast(error.message, 'error');
  }
}

showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 100px;
    right: 20px;
    padding: 16px 24px;
    border-radius: 12px;
    background: ${type === 'error' ? '#ff3b3b' : '#00d4aa'};
    color: white;
    font-weight: 700;
    box-shadow: 0 18px 44px rgba(0,0,0,.55);
    z-index: 300;
    font-family: var(--font-main);
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
```

**Verification:**
- [ ] Buttons have click handlers (check in DevTools)
- [ ] Click FOLD → Console shows "🎯 Sending action: FOLD 0"
- [ ] Network tab shows POST to /api/games/:id/actions
- [ ] Server broadcasts action to other players
- [ ] Toast appears on success/error

**If This Fails:**
- Check: Button IDs match (foldBtn, callBtn, raiseBtn)
- Check: gameId is set (from hydration)
- Check: Endpoint exists (check routes/games.js)

**If This Passes:**
- ✅ Actions working
- ✅ Proceed to Step 5

---

### **STEP 5: ADD GAME EVENT HANDLERS** ⏱️ 1.5 hours

**File:** `public/poker-table-zoom-lock.html`  
**Location:** Inside PokerTableGrid class

**Procedure:**

Add this method:

```javascript
setupGameEventHandlers() {
  console.log('🎧 Setting up game event handlers...');
  
  // Hand started - New hand dealt
  this.socket.on('hand_started', this.sequenceTracker.createHandler((data) => {
    console.log('🃏 Hand started:', data.payload);
    this.onHandStarted(data.payload);
  }));
  
  // Player action - Someone folded/called/raised
  this.socket.on('player_action', this.sequenceTracker.createHandler((data) => {
    console.log('👤 Player action:', data.payload);
    this.onPlayerAction(data.payload);
  }));
  
  // Action required - Your turn
  this.socket.on('action_required', this.sequenceTracker.createHandler((data) => {
    console.log('⚡ Your turn:', data.payload);
    this.onActionRequired(data.payload);
  }));
  
  // Board dealt - Community cards revealed
  this.socket.on('board_dealt', this.sequenceTracker.createHandler((data) => {
    console.log('🎴 Board dealt:', data.payload);
    this.onBoardDealt(data.payload);
  }));
  
  // Hand complete - Winner determined
  this.socket.on('hand_complete', this.sequenceTracker.createHandler((data) => {
    console.log('🏆 Hand complete:', data.payload);
    this.onHandComplete(data.payload);
  }));
  
  // Turn timeout - Player auto-folded
  this.socket.on('turn_timeout', this.sequenceTracker.createHandler((data) => {
    console.log('⏰ Turn timeout:', data.payload);
    this.onTurnTimeout(data.payload);
  }));
  
  console.log('✅ Event handlers registered');
}

// Event handler implementations
onHandStarted(data) {
  // Clear previous hand
  this.renderBoard([]);
  this.renderPot(0);
  
  // Show new dealer button position
  if (data.dealerSeat !== undefined) {
    this.updateDealerButton(data.dealerSeat);
  }
  
  // Render my hole cards if dealt
  if (data.myCards) {
    this.renderMyCards(data.myCards, data.mySeat);
  }
  
  this.showToast('New hand started', 'info');
}

onPlayerAction(data) {
  const { playerId, action, amount, seatIndex } = data;
  
  // Update player display
  this.updatePlayerAction(seatIndex, action, amount);
  
  // Update pot
  if (data.pot) {
    this.renderPot(data.pot);
  }
  
  // Update current bet
  if (data.currentBet !== undefined) {
    this.currentBet = data.currentBet;
  }
}

onActionRequired(data) {
  // Highlight my seat
  this.highlightActiveSeat(data.seatIndex);
  
  // Enable action buttons
  this.myTurn = true;
  this.enableActionButtons();
  
  // Update call amount
  this.currentBet = data.callAmount || 0;
  this.updateActionButtons(data.availableActions);
}

onBoardDealt(data) {
  // Render community cards
  this.renderBoard(data.board);
  
  // Animate card reveal
  this.animateCardReveal(data.street);
}

onHandComplete(data) {
  // Show winner
  this.showWinnerModal(data.winners);
  
  // Update chip stacks
  if (data.finalStacks) {
    this.updateAllChipStacks(data.finalStacks);
  }
  
  // Clear board after 5 seconds
  setTimeout(() => {
    this.renderBoard([]);
  }, 5000);
}

onTurnTimeout(data) {
  this.showToast(`${data.username} timed out`, 'info');
  this.onPlayerAction(data); // Process the auto-fold
}
```

**Verification:**
- [ ] Create game with 2 players
- [ ] Start hand
- [ ] Console shows "🃏 Hand started"
- [ ] Cards appear on table
- [ ] Click FOLD
- [ ] Console shows "👤 Player action"
- [ ] Other player sees your fold

**If This Fails:**
- Check: Event names match server (websocket/socket-handlers.js)
- Check: sequenceTracker wrapping handlers correctly
- Check: Payload structure matches server format

**If This Passes:**
- ✅ Real-time updates working
- ✅ Proceed to Step 6

---

### **STEP 6: TEST REFRESH** ⏱️ 30 minutes

**Procedure:**

**6.1: Single Refresh Test**
1. Start game with 2 players
2. Play 2-3 actions (fold, call, etc.)
3. Press F5 (refresh)
4. Observe:
   - [ ] Console shows "🌊 Fetching hydration data..."
   - [ ] Same cards appear
   - [ ] Same pot amount
   - [ ] Same seat positions
   - [ ] Can continue playing

**6.2: Rapid Refresh Test**
1. Mid-hand, refresh 10 times rapidly
2. Verify: No state corruption, no errors

**6.3: Multi-Player Refresh Test**
1. Player A and Player B in game
2. Player A refreshes
3. Verify: Player B still sees Player A's seat occupied
4. Verify: Player A can continue playing after refresh

**Success Criteria:**
- [ ] 10/10 single refreshes work
- [ ] 10/10 rapid refreshes work
- [ ] Multi-player refresh preserves state
- [ ] No console errors
- [ ] Rejoin token persists

**If This Fails:**
- Check: Hydration returns correct data (test endpoint manually)
- Check: sessionStorage preserves userId and rejoin_token
- Check: Sequence numbers preventing stale updates
- Review: Console logs for specific error

**If This Passes:**
- ✅ **MVP COMPLETE**
- ✅ Refresh bug FIXED
- ✅ Proceed to polish/features

---

### **STEP 7: VISUAL POLISH** ⏱️ 1 hour

**File:** `public/poker-table-zoom-lock.html`

**Procedure:**

**7.1: Add Turn Indicator**
```css
/* Add to <style> section */
.seat.to-act {
  box-shadow: 0 0 24px var(--teal);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 24px var(--teal); }
  50% { box-shadow: 0 0 36px var(--teal); }
}
```

**7.2: Add Dealer Button**
```javascript
updateDealerButton(seatIndex) {
  // Remove from all seats
  document.querySelectorAll('.dealer-button').forEach(btn => btn.remove());
  
  // Add to dealer seat
  const dealerSeat = document.querySelector(`[data-seat="${seatIndex}"]`);
  if (dealerSeat) {
    const button = document.createElement('div');
    button.className = 'dealer-button';
    button.textContent = 'D';
    dealerSeat.appendChild(button);
  }
}
```

**7.3: Add Folded Player Greying**
```javascript
updatePlayerAction(seatIndex, action) {
  const seat = document.querySelector(`[data-seat="${seatIndex}"]`);
  if (!seat) return;
  
  if (action === 'FOLD') {
    seat.classList.add('folded');
    seat.style.opacity = '0.5';
  }
}
```

**Verification:**
- [ ] Active player's seat glows
- [ ] Dealer button visible and positioned correctly
- [ ] Folded players greyed out
- [ ] Visual feedback on all actions

---

### **STEP 8: ERROR HANDLING** ⏱️ 30 minutes

**File:** `public/poker-table-zoom-lock.html`

**Procedure:**

**8.1: Connection Loss Handling**
```javascript
this.socket.on('disconnect', (reason) => {
  console.warn('🔌 Socket disconnected:', reason);
  this.showToast('Connection lost. Reconnecting...', 'error');
});

this.socket.on('connect', () => {
  if (this.gameId) {
    this.showToast('Reconnected', 'info');
    this.authenticateSocket();
  }
});
```

**8.2: Action Validation Errors**
```javascript
// Already in sendAction() catch block
catch (error) {
  console.error('❌ Action failed:', error);
  this.showToast(error.message, 'error');
  
  // Re-enable buttons (don't leave disabled on error)
  this.enableActionButtons();
}
```

**Verification:**
- [ ] Disconnect server → See "Connection lost" toast
- [ ] Reconnect → See "Reconnected" toast
- [ ] Send invalid action → See error toast
- [ ] Buttons don't stay disabled on error

---

## 📊 VERIFICATION CHECKLIST (Before Declaring Complete)

### **Functional Tests:**
- [ ] Room creation works
- [ ] Player join + approval works
- [ ] Seat claiming works
- [ ] Game starts, cards dealt
- [ ] Can fold/call/raise
- [ ] Actions broadcast to all players
- [ ] Hand completes, winner shown
- [ ] Next hand starts
- [ ] **Refresh preserves exact state**
- [ ] Multiple refreshes don't break anything

### **Performance Tests:**
- [ ] Action latency < 200ms
- [ ] Hydration response < 500ms
- [ ] No memory leaks (play 10 hands, check memory)
- [ ] WebSocket stable (no disconnects)

### **Edge Cases:**
- [ ] Refresh with no game → Redirect to /play
- [ ] Refresh during card deal → Cards appear correctly
- [ ] Refresh when it's my turn → Turn indicator shows
- [ ] Refresh as spectator → Spectator view maintained

### **Cross-Browser:**
- [ ] Chrome works
- [ ] Firefox works
- [ ] Safari works
- [ ] Mobile Safari works
- [ ] Mobile Chrome works

---

## 🎯 SUCCESS CRITERIA

**MVP is complete when:**

1. ✅ Create room with invite code
2. ✅ Friend uses invite code to join
3. ✅ Host approves friend
4. ✅ Both claim seats
5. ✅ Host starts game
6. ✅ Cards are dealt
7. ✅ Can see turn indicator
8. ✅ Can fold/call/raise
9. ✅ Actions update in real-time
10. ✅ **Either player refreshes → Game continues**
11. ✅ Hand completes, winner announced
12. ✅ Next hand starts automatically
13. ✅ Play 10 hands without issues
14. ✅ Refresh 50 times → 50 successful recoveries

**Definition of Success:**
"Two friends can play a full 10-hand game together, with either player able to refresh at any time without disrupting the game."

---

## 🔄 ROLLBACK PLAN (If Anything Breaks)

### **If Step 1-4 Breaks Existing Functionality:**

```bash
# Immediate rollback
git stash

# Or if committed:
git reset --hard HEAD~1

# Or specific file:
git checkout HEAD -- public/poker-table-zoom-lock.html
```

### **If New Code Has Bugs:**
1. **Don't delete** - Comment out
2. **Add feature flag:**
   ```javascript
   const USE_BACKEND = false; // Set to true when ready
   
   async init() {
     if (USE_BACKEND) {
       await this.initWithBackend();
     } else {
       this.initDemo(); // Fallback to demo
     }
   }
   ```

3. **Fix incrementally** - One method at a time
4. **Test each fix** - Don't pile on changes

---

## ⚡ FAST-TRACK (If Urgent)

**Minimum Viable Wire** (Skip polish, just make it work):

1. **Step 0** - Verify backend (15 min)
2. **Step 2** - Init with backend (45 min)
3. **Step 3** - Fetch hydration (45 min)
4. **Step 6** - Test refresh (15 min)

**Total: 2 hours to working refresh**

Then add:
- Action buttons (Step 4): 30 min
- Event handlers (Step 5): 1 hour
- Polish (Step 7-8): Optional

---

## 🎖️ EXECUTOR MODE READINESS

**When Commander says "Be Executor":**

1. **Start with Step 0** (verify backend)
2. **Execute Steps 1-6 sequentially**
3. **Test after each step** (don't pile changes)
4. **Report results** (which step, what worked/failed)
5. **Update CONTEXT.md** when complete

**Estimated Timeline:**
- Focused work: 4-6 hours
- With testing: 6-8 hours
- With polish: 8-10 hours

**Commit Strategy:**
```bash
git checkout -b octavian-wire-zoom-lock
git commit -m "Step 1: Add WebSocket connection"
git commit -m "Step 2: Add backend initialization"
git commit -m "Step 3: Implement hydration"
git commit -m "Step 4: Wire action buttons"
git commit -m "Step 5: Add game event handlers"
git commit -m "Step 6: Test refresh - MVP COMPLETE"
```

---

## 🔍 WHAT COULD GO WRONG (Risk Assessment)

### **Low Risk (95% confidence):**
- Hydration endpoint works (already tested by previous LLM)
- Socket.IO connection (used elsewhere successfully)
- Sequence tracker (battle-tested)

### **Medium Risk (80% confidence):**
- Event payload formats might not match exactly
- Button IDs might be different than expected
- Render methods might need adjustment

### **Mitigation:**
- Reference play.html (working example)
- Check websocket/socket-handlers.js (exact event formats)
- Test each event handler individually

### **If Critical Failure:**
1. Stop immediately
2. Revert changes (git reset)
3. Return to PLANNER mode
4. Diagnose issue
5. Adjust plan
6. Try again with fix

---

## 📝 QUESTIONS TO RESOLVE BEFORE EXECUTION

**For Commander:**

1. **Should I proceed with Step 0 (verify backend)?**
   - Yes → I'll test hydration endpoint now
   - No → Wait for your signal

2. **Preferred execution style?**
   - Fast-track (2 hours, minimal) → Just make refresh work
   - Full implementation (6-8 hours) → Include polish and all handlers
   - Super careful (10+ hours) → Test every single method

3. **If something breaks:**
   - Rollback immediately → Ask for guidance
   - Try to fix → Max 2 attempts then rollback
   - Your preference?

4. **Testing availability:**
   - Can you test alongside me? (Helpful for 2-player tests)
   - Should I test solo? (Will use 2 browsers)
   - Do you have test accounts ready?

---

**OCTAVIAN READY FOR EXECUTION** ⚔️

**Awaiting Commander approval to proceed with Step 0 or adjustments to plan.**

