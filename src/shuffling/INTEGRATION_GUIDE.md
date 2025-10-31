# 🔗 SHUFFLING ALGORITHM - INTEGRATION GUIDE

## 📋 **QUICK START**

### **Step 1: Your Algorithm is Ready**

Branch this code and replace the placeholder in `provably-fair.js`:

```bash
git checkout -b feature/provably-fair-shuffle
# Work on your algorithm
# Replace deterministicShuffle() function
git add src/shuffling/provably-fair.js
git commit -m "feat: Implement seeded PRNG for provably fair shuffling"
git push origin feature/provably-fair-shuffle
```

### **Step 2: Test Your Implementation**

```bash
node src/shuffling/test-shuffling.js
```

Expected output:
- ✅ All 52 cards present
- ✅ Verification works
- ✅ Determinism test PASSES (same seed → same shuffle)
- ✅ Different seeds → different shuffles

### **Step 3: Integrate into Game Engine**

The integration points are already set up! Just ensure your algorithm is working.

---

## 🎯 **INTEGRATION POINTS**

### **1. Deal Cards Endpoint (First Hand)**

**File:** `routes/game-engine-bridge.js`  
**Function:** `POST /deal-cards`

**Current code (line ~750):**
```javascript
// ===== STEP 5: CREATE DECK & SHUFFLE =====
const suits = ['h', 'd', 'c', 's'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

const deck = [];
suits.forEach(suit => {
  ranks.forEach(rank => {
    deck.push(`${rank}${suit}`);
  });
});

// Fisher-Yates shuffle
for (let i = deck.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [deck[i], deck[j]] = [deck[j], deck[i]];
}
```

**Replace with:**
```javascript
// ===== STEP 5: CREATE PROVABLY FAIR DECK =====
const { createProvablyFairDeck } = require('../src/shuffling/provably-fair');

// Get client seed from request (optional)
const clientSeed = req.body.clientSeed; // Optional player-provided seed

// Create shuffled deck
const {
  deck,
  serverSeed,
  serverSeedHash,
  clientSeed: finalClientSeed,
  deckHash,
  timestamp
} = createProvablyFairDeck(clientSeed);

console.log('🎲 [SHUFFLE] Deck created with provably fair shuffle');
console.log(`   Server seed hash: ${serverSeedHash.substring(0, 16)}...`);
console.log(`   Client seed: ${finalClientSeed}`);
console.log(`   Deck hash: ${deckHash.substring(0, 16)}...`);
```

**Update game state storage:**
```javascript
// Store shuffle data in game_states (line ~850):
const gameState = {
  roomId,
  handNumber: 1,
  street: 'PREFLOP',
  pot,
  currentBet: bigBlind,
  communityCards: [],
  deck,
  
  // ADD THESE FOR PROVABLY FAIR:
  originalDeck: [...deck], // Full deck before dealing (for verification)
  serverSeed,              // KEEP SECRET until hand completes
  serverSeedHash,          // PUBLIC - show to players
  clientSeed: finalClientSeed, // PUBLIC
  deckHash,                // PUBLIC
  shuffleTimestamp: timestamp,
  
  dealerPosition: dealerSeatIndex,
  sbPosition: sbSeatIndex,
  bbPosition: bbSeatIndex,
  currentActorSeat: firstActorSeatIndex,
  players,
  actionHistory: [],
  status: 'IN_PROGRESS',
  createdAt: new Date().toISOString()
};
```

---

### **2. Next Hand Endpoint (Subsequent Hands)**

**File:** `routes/game-engine-bridge.js`  
**Function:** `POST /next-hand`

**Current code (line ~1000):**
```javascript
// ===== STEP 5: CREATE DECK & SHUFFLE =====
const suits = ['h', 'd', 'c', 's'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

const deck = [];
suits.forEach(suit => {
  ranks.forEach(rank => {
    deck.push(`${rank}${suit}`);
  });
});

// Fisher-Yates shuffle
for (let i = deck.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [deck[i], deck[j]] = [deck[j], deck[i]];
}
```

**Replace with:**
```javascript
// ===== STEP 5: CREATE PROVABLY FAIR DECK =====
const { createProvablyFairDeck } = require('../src/shuffling/provably-fair');

const clientSeed = req.body.clientSeed; // Optional

const {
  deck,
  serverSeed,
  serverSeedHash,
  clientSeed: finalClientSeed,
  deckHash,
  timestamp
} = createProvablyFairDeck(clientSeed);

console.log(`🎲 [SHUFFLE] Hand #${handNumber + 1} deck created`);
```

**Update game state storage (same as above):**
```javascript
const gameState = {
  // ... existing fields ...
  
  // Provably fair shuffle data:
  originalDeck: [...deck],
  serverSeed,
  serverSeedHash,
  clientSeed: finalClientSeed,
  deckHash,
  shuffleTimestamp: timestamp
};
```

---

### **3. Reveal Server Seed After Hand Completes**

**File:** `routes/game-engine-bridge.js`  
**Function:** `handleShowdown()` (inside minimal-engine-bridge.js)

**Add after awarding chips:**
```javascript
// In src/adapters/minimal-engine-bridge.js, handleShowdown():
static handleShowdown(gameState) {
  // ... existing winner determination code ...
  
  // Award chips
  winners.forEach(winner => {
    const player = gameState.players.find(p => p.seatIndex === winner.seatIndex);
    if (player) {
      player.chips += winner.amount;
    }
  });
  
  // REVEAL SERVER SEED for verification
  console.log('🔓 [SHUFFLE] Revealing server seed for verification');
  gameState.serverSeedRevealed = true; // Mark as revealed
  // serverSeed is already in gameState, just flag it as revealed
  
  // Set game status
  gameState.status = 'COMPLETED';
  gameState.winners = winners;
  
  return gameState;
}
```

---

### **4. Add Verification Endpoint**

**File:** `routes/game-engine-bridge.js`  
**Add new endpoint:**

```javascript
const { verifyShuffleWasFair } = require('../src/shuffling/provably-fair');

/**
 * GET /api/engine/verify-shuffle/:gameId
 * Verify that a completed hand's shuffle was provably fair
 */
router.get('/verify-shuffle/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    console.log('🔍 [VERIFY] Verifying shuffle for game:', gameId);
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get completed game state
    const gameResult = await db.query(
      `SELECT id, current_state, hand_number, status 
       FROM game_states 
       WHERE id = $1`,
      [gameId]
    );
    
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const game = gameResult.rows[0];
    const gameState = game.current_state;
    
    // Check if hand is completed (server seed should be revealed)
    if (game.status !== 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Cannot verify shuffle for active hand',
        message: 'Server seed is only revealed after hand completes'
      });
    }
    
    // Verify shuffle
    const verification = verifyShuffleWasFair(
      gameState.serverSeed,
      gameState.clientSeed,
      gameState.originalDeck, // Full 52-card deck before dealing
      gameState.deckHash
    );
    
    console.log(`   Verification result: ${verification.verified ? '✅ FAIR' : '❌ FAILED'}`);
    
    res.json({
      gameId: game.id,
      handNumber: game.hand_number,
      verified: verification.verified,
      serverSeed: gameState.serverSeed, // Now revealed
      serverSeedHash: gameState.serverSeedHash,
      clientSeed: gameState.clientSeed,
      deckHash: gameState.deckHash,
      shuffleTimestamp: gameState.shuffleTimestamp,
      verification
    });
    
  } catch (error) {
    console.error('❌ [VERIFY] Verification error:', error);
    res.status(500).json({ 
      error: 'Failed to verify shuffle',
      details: error.message 
    });
  }
});
```

---

### **5. Frontend Integration**

**Show "Provably Fair" Badge:**

```html
<!-- In minimal-table.html, add to game info section -->
<div class="provably-fair-badge">
  <span class="badge">🎲 PROVABLY FAIR</span>
  <button onclick="showShuffleInfo()">ℹ️ Shuffle Info</button>
</div>
```

**Show Shuffle Info Modal:**

```javascript
async function showShuffleInfo() {
  try {
    const response = await fetch(`/api/engine/verify-shuffle/${gameId}`);
    const data = await response.json();
    
    const message = `
🎲 SHUFFLE VERIFICATION

Hand #${data.handNumber}
Status: ${data.verified ? '✅ VERIFIED FAIR' : '❌ VERIFICATION FAILED'}

Server Seed Hash: ${data.serverSeedHash}
Client Seed: ${data.clientSeed}
Deck Hash: ${data.deckHash}

${data.verified ? 
  'This hand was provably fair! The shuffle was cryptographically secure.' : 
  'Warning: This hand could not be verified.'
}

Click below to learn how to verify shuffles yourself.
    `;
    
    alert(message);
    
  } catch (error) {
    alert('Could not retrieve shuffle info. Hand may still be in progress.');
  }
}
```

**Add Client Seed Input (Optional):**

```html
<!-- Let players provide their own seed -->
<div class="client-seed-input">
  <label>Your Lucky Seed (Optional):</label>
  <input 
    type="text" 
    id="clientSeed" 
    placeholder="Enter any text (e.g., 'lucky777')"
    maxlength="64"
  />
  <small>Used to generate provably fair shuffle. Leave blank for random.</small>
</div>
```

```javascript
async function startHand() {
  const clientSeed = document.getElementById('clientSeed').value || undefined;
  
  const response = await fetch('/api/engine/deal-cards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      roomId,
      userId,
      clientSeed // Send client seed if provided
    })
  });
  
  // ... rest of function
}
```

---

## 🧪 **TESTING CHECKLIST**

### **Unit Tests:**
- [ ] `deterministicShuffle()` is deterministic (same seed → same result)
- [ ] All 52 cards present, no duplicates
- [ ] Verification returns `true` for valid shuffles
- [ ] Verification returns `false` for tampered shuffles

### **Integration Tests:**
- [ ] Deal first hand with provably fair shuffle
- [ ] Deal subsequent hands with provably fair shuffle
- [ ] Server seed is hidden during hand
- [ ] Server seed is revealed after hand completes
- [ ] Verification endpoint works for completed hands
- [ ] Verification endpoint rejects active hands

### **UI Tests:**
- [ ] "Provably Fair" badge displays
- [ ] Shuffle info modal shows correct data
- [ ] Players can provide custom client seed
- [ ] Shuffle info updates after each hand

---

## 📊 **DATABASE CHANGES**

No schema changes needed! All shuffle data fits in existing `game_states.current_state` JSONB:

```sql
-- Example game_states.current_state structure:
{
  "deck": ["Ah", "Kd", ...],
  "originalDeck": ["Ah", "Kd", ...], -- NEW: Full deck for verification
  "serverSeed": "abc123...",         -- NEW: PRIVATE until hand ends
  "serverSeedHash": "def456...",     -- NEW: PUBLIC
  "clientSeed": "xyz789...",         -- NEW: PUBLIC
  "deckHash": "ghi012...",           -- NEW: PUBLIC
  "shuffleTimestamp": 1234567890,    -- NEW: When shuffle occurred
  "serverSeedRevealed": false,       -- NEW: Flag for reveal status
  -- ... rest of game state
}
```

---

## 🚀 **DEPLOYMENT STEPS**

1. ✅ Commit shuffling foundation (you're here)
2. 🎯 Branch and implement your algorithm
3. 🧪 Test thoroughly with `test-shuffling.js`
4. 🔗 Integrate into deal-cards endpoint
5. 🔗 Integrate into next-hand endpoint
6. 🔗 Add verification endpoint
7. 🎨 Add UI elements (badge, modal)
8. 🧪 Full integration testing
9. 📚 Write player-facing verification guide
10. 🚀 Deploy to production

---

## 📚 **PLAYER-FACING DOCUMENTATION**

Create a help page explaining how players can verify:

```markdown
# How to Verify Our Shuffle is Fair

1. Play a hand to completion
2. Click "🎲 Shuffle Info" button
3. Copy the Server Seed, Client Seed, and Deck Hash
4. Use our verification tool (or any SHA-256 calculator)
5. Re-run the shuffle algorithm with the same seeds
6. Compare the resulting deck hash

If they match, the shuffle was provably fair!
```

---

## 🎯 **NEXT ACTIONS**

1. **Test foundation:** `node src/shuffling/test-shuffling.js`
2. **Commit this code:** Ready for you to branch
3. **Develop your algorithm** on other PC
4. **Branch and integrate** when ready
5. **Test end-to-end**
6. **Launch with confidence** 🚀

---

**Foundation Status:** ✅ Complete and ready for your algorithm!

