# 🎲 PROVABLY FAIR SHUFFLING ALGORITHM

## 📋 **OVERVIEW**

This module provides cryptographically secure, provably fair card shuffling for the poker game.

**Current Status:** 🚧 **FOUNDATION COMPLETE** - Ready for algorithm integration

---

## 🔧 **INTEGRATION INSTRUCTIONS**

### **Step 1: Replace Placeholder Functions**

The file `provably-fair.js` contains placeholder implementations. Replace these functions with your actual algorithm:

**Functions to Replace:**

1. **`deterministicShuffle(deck, seed)`** ⚠️ **CRITICAL**
   - Current: Uses standard `Math.random()` (NOT deterministic)
   - Replace with: Seed-based PRNG + Fisher-Yates shuffle
   - Requirements:
     - Must use `seed` parameter to generate deterministic random numbers
     - Must produce identical shuffle given same seed
     - Should use Fisher-Yates algorithm for fairness

2. **`combineSeedsForShuffle(serverSeed, clientSeed)`** (Optional)
   - Current: Simple concatenation + SHA-256
   - Can improve: Use more sophisticated seed combining (e.g., HMAC)

3. **`generateServerSeed()`** (Optional)
   - Current: Uses Node.js `crypto.randomBytes(32)`
   - Already secure, but can customize if needed

### **Step 2: Test Your Algorithm**

```javascript
// Test determinism:
const { createProvablyFairDeck } = require('./provably-fair');

const result1 = createProvablyFairDeck('test-client-seed');
const result2 = createProvablyFairDeck('test-client-seed');

// These should be IDENTICAL if algorithm is deterministic:
console.log(JSON.stringify(result1.deck) === JSON.stringify(result2.deck));
// Should print: true
```

### **Step 3: Verify Implementation**

```javascript
const { createProvablyFairDeck, verifyShuffleWasFair } = require('./provably-fair');

// Create deck
const { deck, serverSeed, clientSeed, deckHash } = createProvablyFairDeck();

// Verify it's fair
const verification = verifyShuffleWasFair(serverSeed, clientSeed, deck, deckHash);
console.log(verification.verified); // Should be: true
```

---

## 📐 **ALGORITHM REQUIREMENTS**

### **1. Deterministic Fisher-Yates Shuffle**

Given the same seed, the shuffle MUST produce the same result:

```javascript
function deterministicShuffle(deck, seed) {
  const shuffled = [...deck];
  
  // Use seed to generate deterministic random numbers
  const rng = createSeededRNG(seed); // Your PRNG implementation
  
  // Fisher-Yates shuffle
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1)); // Use seeded RNG
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}
```

### **2. Cryptographic Security**

- Server seed: 256-bit random (32 bytes)
- Client seed: Player-provided or auto-generated
- Combined seed: SHA-256 hash of both seeds
- Deck hash: SHA-256 hash of final deck order

### **3. Verifiability**

Players must be able to verify ANY hand by:
1. Getting the revealed server seed (after hand ends)
2. Using their client seed
3. Re-running the shuffle with same seeds
4. Comparing the deck hash

---

## 🔗 **INTEGRATION POINTS**

### **Game Engine Integration**

The shuffling module is already integrated into `routes/game-engine-bridge.js`:

**Current Integration (deal-cards endpoint):**
```javascript
// In routes/game-engine-bridge.js:
const { createProvablyFairDeck } = require('../src/shuffling/provably-fair');

router.post('/deal-cards', async (req, res) => {
  // ... existing code ...
  
  // OLD: Random shuffle
  // for (let i = deck.length - 1; i > 0; i--) {
  //   const j = Math.floor(Math.random() * (i + 1));
  //   [deck[i], deck[j]] = [deck[j], deck[i]];
  // }
  
  // NEW: Provably fair shuffle
  const clientSeed = req.body.clientSeed; // Optional from client
  const {
    deck,
    serverSeed,
    serverSeedHash,
    clientSeed: finalClientSeed,
    deckHash
  } = createProvablyFairDeck(clientSeed);
  
  // Store in game_states for verification
  const gameState = {
    // ... other game state ...
    deck,
    serverSeedHash, // Public (hashed, not revealed until hand ends)
    clientSeed: finalClientSeed, // Public
    deckHash, // Public
    serverSeed // PRIVATE - only reveal after hand completes
  };
  
  // ... rest of dealing logic ...
});
```

**Next Hand Integration:**
```javascript
router.post('/next-hand', async (req, res) => {
  // ... existing code ...
  
  // Use provably fair shuffle for subsequent hands too
  const { deck, serverSeed, serverSeedHash, clientSeed, deckHash } = createProvablyFairDeck();
  
  // ... rest of dealing logic ...
});
```

### **Verification Endpoint**

Add endpoint for players to verify any hand:

```javascript
// In routes/game-engine-bridge.js:
const { verifyShuffleWasFair } = require('../src/shuffling/provably-fair');

router.get('/verify-shuffle/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;
    
    // Get completed game state from DB
    const gameResult = await db.query(
      'SELECT current_state FROM game_states WHERE id = $1 AND status = $2',
      [gameId, 'COMPLETED']
    );
    
    if (gameResult.rows.length === 0) {
      return res.status(404).json({ error: 'Game not found or not completed' });
    }
    
    const gameState = gameResult.rows[0].current_state;
    
    // Verify shuffle
    const verification = verifyShuffleWasFair(
      gameState.serverSeed,      // Revealed after hand
      gameState.clientSeed,       // Public
      gameState.originalDeck,     // Full 52-card deck before dealing
      gameState.deckHash          // Hash provided before hand
    );
    
    res.json({
      verified: verification.verified,
      gameId,
      handNumber: gameState.handNumber,
      ...verification
    });
    
  } catch (error) {
    console.error('❌ Verification error:', error);
    res.status(500).json({ error: 'Failed to verify shuffle' });
  }
});
```

---

## 📊 **DATABASE SCHEMA**

Store shuffle data in `game_states.current_state` JSONB:

```sql
-- Add to game_states.current_state:
{
  "deck": ["Ah", "Kd", ...],           -- Shuffled deck (after dealing)
  "originalDeck": ["Ah", "Kd", ...],   -- Full deck before dealing (for verification)
  "serverSeedHash": "abc123...",       -- Public hash (before hand)
  "serverSeed": "xyz789...",           -- PRIVATE (reveal after hand)
  "clientSeed": "def456...",           -- Public
  "deckHash": "ghi789...",             -- Public hash of deck order
  "shuffleTimestamp": 1234567890       -- When shuffle occurred
}
```

---

## 🧪 **TESTING CHECKLIST**

Before pushing your algorithm:

- [ ] **Determinism Test:** Same seed → same shuffle
- [ ] **Randomness Test:** Different seeds → different shuffles
- [ ] **Verification Test:** `verifyShuffleWasFair()` returns true
- [ ] **Edge Cases:** Test with empty deck, single card, etc.
- [ ] **Performance:** Shuffle 52 cards in < 10ms
- [ ] **Integration Test:** Full hand with real game engine
- [ ] **Security Audit:** No seed leakage, proper hashing

---

## 📦 **EXAMPLE USAGE**

### **Basic Usage:**
```javascript
const { createProvablyFairDeck } = require('./src/shuffling/provably-fair');

// Create shuffled deck
const result = createProvablyFairDeck();

console.log('Shuffled deck:', result.deck);
console.log('Server seed hash:', result.serverSeedHash); // Show to players
console.log('Client seed:', result.clientSeed);           // Show to players
console.log('Deck hash:', result.deckHash);               // Show to players
// DO NOT show result.serverSeed until hand completes!
```

### **With Client Seed:**
```javascript
// Player provides their own seed
const playerSeed = "my-lucky-seed-12345";
const result = createProvablyFairDeck(playerSeed);

// Now player can verify later using their seed + revealed server seed
```

### **Verification After Hand:**
```javascript
const { verifyShuffleWasFair } = require('./src/shuffling/provably-fair');

// After hand completes, reveal server seed
const verification = verifyShuffleWasFair(
  revealedServerSeed,
  clientSeed,
  deckThatWasUsed,
  deckHashFromBeforeHand
);

if (verification.verified) {
  console.log('✅ Shuffle was provably fair!');
} else {
  console.log('❌ Shuffle verification failed!');
}
```

---

## 🚀 **DEPLOYMENT CHECKLIST**

Before going live:

1. ✅ Algorithm implementation complete
2. ✅ All tests passing
3. ✅ Integrated into deal-cards endpoint
4. ✅ Integrated into next-hand endpoint
5. ✅ Verification endpoint working
6. ✅ Database storing all seeds + hashes
7. ✅ UI shows "Provably Fair" badge
8. ✅ Help page explaining how to verify
9. ✅ Audit log for all shuffles
10. ✅ Load testing (1000+ hands)

---

## 📚 **RESOURCES**

**Fisher-Yates Shuffle:**
- https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle

**Provably Fair Gaming:**
- https://en.bitcoin.it/wiki/Provably_Fair

**Cryptographic Hash Functions:**
- https://nodejs.org/api/crypto.html

---

## 🎯 **NEXT STEPS**

1. **Develop algorithm on your PC**
2. **Test thoroughly**
3. **Branch this code:** `git checkout -b feature/provably-fair-shuffle`
4. **Replace placeholders in `provably-fair.js`**
5. **Test integration with game engine**
6. **Merge back to main**
7. **Deploy with confidence** 🚀

---

**Current Status:** 🚧 Foundation complete, ready for your algorithm!

