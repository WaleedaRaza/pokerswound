/**
 * PROVABLY FAIR SHUFFLING ALGORITHM
 * 
 * This module provides cryptographically secure, provably fair card shuffling
 * using SHA-256 hashing and deterministic Fisher-Yates shuffle.
 * 
 * INTEGRATION INSTRUCTIONS:
 * Replace the placeholder functions below with your actual algorithm.
 * 
 * Requirements:
 * - Server seed (generated per hand)
 * - Client seed (from player or auto-generated)
 * - SHA-256 hashing of seeds
 * - Deterministic Fisher-Yates shuffle using hashed seed
 * - Deck hash for verification
 * 
 * @module shuffling/provably-fair
 */

const crypto = require('crypto');

/**
 * Generate a cryptographically secure random seed
 * @returns {string} - Hex string seed (64 characters)
 */
function generateServerSeed() {
  // TODO: Replace with your secure seed generation
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate client seed (can be provided by player or auto-generated)
 * @param {string} [providedSeed] - Optional seed from client
 * @returns {string} - Hex string seed
 */
function generateClientSeed(providedSeed) {
  if (providedSeed && typeof providedSeed === 'string' && providedSeed.length > 0) {
    // Use provided seed from client
    return crypto.createHash('sha256').update(providedSeed).digest('hex');
  }
  // Auto-generate if not provided
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Hash the server seed (to keep secret until hand completes)
 * @param {string} serverSeed - The server seed to hash
 * @returns {string} - SHA-256 hash of server seed
 */
function hashServerSeed(serverSeed) {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Combine seeds and create deterministic shuffle seed
 * @param {string} serverSeed - Server seed (unhashed)
 * @param {string} clientSeed - Client seed
 * @returns {string} - Combined seed hash for shuffle
 */
function combineSeedsForShuffle(serverSeed, clientSeed) {
  // TODO: Replace with your seed combining logic
  const combined = serverSeed + clientSeed;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Perform deterministic Fisher-Yates shuffle using seed
 * @param {Array} deck - Array of cards to shuffle
 * @param {string} seed - Seed for deterministic randomness
 * @returns {Array} - Shuffled deck
 */
function deterministicShuffle(deck, seed) {
  // TODO: Replace with your deterministic Fisher-Yates implementation
  // This is a PLACEHOLDER - uses standard random shuffle
  // YOUR ALGORITHM should use the seed to generate deterministic random numbers
  
  const shuffled = [...deck]; // Copy array
  
  // PLACEHOLDER: Standard Fisher-Yates (NOT deterministic, needs replacement)
  for (let i = shuffled.length - 1; i > 0; i--) {
    // TODO: Replace Math.random() with seed-based PRNG
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled;
}

/**
 * Create a hash of the shuffled deck for verification
 * @param {Array} deck - Shuffled deck
 * @returns {string} - SHA-256 hash of deck order
 */
function hashDeck(deck) {
  const deckString = deck.join(',');
  return crypto.createHash('sha256').update(deckString).digest('hex');
}

/**
 * Main function: Create a provably fair shuffled deck
 * @param {string} [providedClientSeed] - Optional client seed
 * @returns {Object} - Shuffled deck with seeds and hashes
 */
function createProvablyFairDeck(providedClientSeed) {
  // Step 1: Generate seeds
  const serverSeed = generateServerSeed();
  const clientSeed = generateClientSeed(providedClientSeed);
  
  // Step 2: Create standard 52-card deck
  const suits = ['h', 'd', 'c', 's']; // hearts, diamonds, clubs, spades
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const deck = [];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push(`${rank}${suit}`);
    });
  });
  
  // Step 3: Combine seeds for shuffle
  const shuffleSeed = combineSeedsForShuffle(serverSeed, clientSeed);
  
  // Step 4: Perform deterministic shuffle
  const shuffledDeck = deterministicShuffle(deck, shuffleSeed);
  
  // Step 5: Hash the deck for verification
  const deckHash = hashDeck(shuffledDeck);
  
  // Step 6: Hash server seed (keep secret until reveal)
  const serverSeedHash = hashServerSeed(serverSeed);
  
  return {
    deck: shuffledDeck,               // The shuffled deck
    serverSeed,                        // Server seed (KEEP SECRET until hand ends)
    serverSeedHash,                    // Hashed server seed (public)
    clientSeed,                        // Client seed (public)
    shuffleSeed,                       // Combined seed (for internal use)
    deckHash,                          // Hash of shuffled deck (public)
    timestamp: Date.now()              // When deck was created
  };
}

/**
 * Verify a shuffle was fair after hand completes
 * @param {string} serverSeed - Revealed server seed
 * @param {string} clientSeed - Client seed
 * @param {Array} deck - The deck that was used
 * @param {string} deckHash - The hash that was provided before hand
 * @returns {Object} - Verification result
 */
function verifyShuffleWasFair(serverSeed, clientSeed, deck, deckHash) {
  // Step 1: Recreate shuffle seed
  const shuffleSeed = combineSeedsForShuffle(serverSeed, clientSeed);
  
  // Step 2: Create fresh deck and shuffle with same seed
  const suits = ['h', 'd', 'c', 's'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const freshDeck = [];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      freshDeck.push(`${rank}${suit}`);
    });
  });
  
  const reShuffledDeck = deterministicShuffle(freshDeck, shuffleSeed);
  
  // Step 3: Hash the re-shuffled deck
  const recomputedDeckHash = hashDeck(reShuffledDeck);
  
  // Step 4: Compare hashes
  const hashesMatch = recomputedDeckHash === deckHash;
  
  // Step 5: Compare deck orders
  const decksMatch = JSON.stringify(reShuffledDeck) === JSON.stringify(deck);
  
  return {
    verified: hashesMatch && decksMatch,
    hashesMatch,
    decksMatch,
    originalDeckHash: deckHash,
    recomputedDeckHash,
    message: (hashesMatch && decksMatch) 
      ? 'Shuffle verified! The deck was provably fair.'
      : 'Verification failed! The shuffle may not have been fair.'
  };
}

module.exports = {
  createProvablyFairDeck,
  verifyShuffleWasFair,
  generateServerSeed,
  generateClientSeed,
  hashServerSeed,
  combineSeedsForShuffle,
  deterministicShuffle,
  hashDeck
};

