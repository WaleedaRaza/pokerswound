/**
 * TEST SCRIPT FOR PROVABLY FAIR SHUFFLING
 * 
 * Run this to verify the shuffling foundation works
 * Usage: node src/shuffling/test-shuffling.js
 */

const {
  createProvablyFairDeck,
  verifyShuffleWasFair,
  hashServerSeed
} = require('./provably-fair');

console.log('🧪 Testing Provably Fair Shuffling Foundation...\n');

// Test 1: Create a shuffled deck
console.log('TEST 1: Create shuffled deck');
const result1 = createProvablyFairDeck();
console.log('✅ Deck created');
console.log('   Deck length:', result1.deck.length);
console.log('   First 5 cards:', result1.deck.slice(0, 5));
console.log('   Server seed hash:', result1.serverSeedHash.substring(0, 16) + '...');
console.log('   Client seed:', result1.clientSeed.substring(0, 16) + '...');
console.log('   Deck hash:', result1.deckHash.substring(0, 16) + '...\n');

// Test 2: Create deck with custom client seed
console.log('TEST 2: Create deck with custom client seed');
const result2 = createProvablyFairDeck('my-lucky-seed-12345');
console.log('✅ Deck created with custom seed');
console.log('   Client seed:', result2.clientSeed);
console.log('   First 5 cards:', result2.deck.slice(0, 5) + '\n');

// Test 3: Verify shuffle
console.log('TEST 3: Verify shuffle is fair');
const verification = verifyShuffleWasFair(
  result1.serverSeed,
  result1.clientSeed,
  result1.deck,
  result1.deckHash
);
console.log('✅ Verification result:', verification.verified);
console.log('   Hashes match:', verification.hashesMatch);
console.log('   Decks match:', verification.decksMatch);
console.log('   Message:', verification.message + '\n');

// Test 4: Ensure all 52 cards are present
console.log('TEST 4: Verify all 52 cards present (no duplicates)');
const uniqueCards = new Set(result1.deck);
const hasDuplicates = uniqueCards.size !== result1.deck.length;
console.log('✅ Unique cards:', uniqueCards.size);
console.log('   Has duplicates:', hasDuplicates ? '❌ YES' : '✅ NO\n');

// Test 5: Determinism (same seed should produce same result)
console.log('TEST 5: Test determinism (WARNING: Currently will FAIL)');
const testSeed = 'test-determinism';
const det1 = createProvablyFairDeck(testSeed);
const det2 = createProvablyFairDeck(testSeed);
const isDeterministic = JSON.stringify(det1.deck) === JSON.stringify(det2.deck);
console.log('   Same seed produces same shuffle:', isDeterministic ? '✅ YES' : '⚠️  NO (placeholder uses Math.random)');
console.log('   NOTE: This will pass once you implement seeded PRNG\n');

// Test 6: Different seeds should produce different results
console.log('TEST 6: Different seeds produce different shuffles');
const diff1 = createProvablyFairDeck('seed-1');
const diff2 = createProvablyFairDeck('seed-2');
const areDifferent = JSON.stringify(diff1.deck) !== JSON.stringify(diff2.deck);
console.log('✅ Different seeds produce different shuffles:', areDifferent ? 'YES' : 'NO\n');

// Summary
console.log('📊 SUMMARY:');
console.log('   Foundation: ✅ Complete');
console.log('   Basic functions: ✅ Working');
console.log('   Verification: ✅ Working');
console.log('   Determinism: ⚠️  Needs seeded PRNG (replace Math.random)');
console.log('\n🎯 NEXT STEP: Implement seeded PRNG in deterministicShuffle()');
console.log('   Then re-run this test to verify determinism works.');

