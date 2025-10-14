/**
 * Event Store Test Script
 * 
 * Tests the basic functionality of the EventStore:
 * 1. Append a single event
 * 2. Retrieve events by aggregate
 * 3. Query events by type
 * 4. Get latest version
 * 5. Check existence
 */

require('dotenv').config();
const { Pool } = require('pg');

// Import EventStore (compiled from TypeScript)
const { PostgresEventStore } = require('./dist/infrastructure/persistence/EventStore');

async function testEventStore() {
  console.log('🧪 EVENT STORE TEST\n');
  console.log('='.repeat(50));
  
  // Create database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const eventStore = new PostgresEventStore(pool);
  
  const gameId = `test-game-${Date.now()}`;
  
  try {
    // =====================================================
    // TEST 1: Append Event
    // =====================================================
    console.log('\n📝 TEST 1: Append Event');
    console.log('-'.repeat(50));
    
    const event1 = await eventStore.append({
      eventType: 'game.created',
      aggregateType: 'Game',
      aggregateId: gameId,
      eventData: {
        roomId: 'room-123',
        players: ['player1', 'player2'],
        smallBlind: 10,
        bigBlind: 20
      },
      metadata: {
        userId: 'user-123',
        clientVersion: '1.0.0'
      },
      version: 1
    });
    
    console.log('✅ Event appended successfully!');
    console.log('   ID:', event1.id);
    console.log('   Type:', event1.eventType);
    console.log('   Version:', event1.version);
    console.log('   Sequence:', event1.sequenceNumber);
    console.log('   Timestamp:', event1.timestamp);
    
    // =====================================================
    // TEST 2: Append Second Event
    // =====================================================
    console.log('\n📝 TEST 2: Append Second Event');
    console.log('-'.repeat(50));
    
    const event2 = await eventStore.append({
      eventType: 'game.action_processed',
      aggregateType: 'Game',
      aggregateId: gameId,
      eventData: {
        playerId: 'player1',
        action: 'call',
        amount: 20
      },
      version: 2
    });
    
    console.log('✅ Event appended successfully!');
    console.log('   ID:', event2.id);
    console.log('   Type:', event2.eventType);
    console.log('   Version:', event2.version);
    
    // =====================================================
    // TEST 3: Get Events by Aggregate
    // =====================================================
    console.log('\n📝 TEST 3: Get Events by Aggregate');
    console.log('-'.repeat(50));
    
    const events = await eventStore.getByAggregate(gameId);
    
    console.log(`✅ Retrieved ${events.length} events:`);
    events.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.eventType} (v${e.version})`);
    });
    
    // =====================================================
    // TEST 4: Get Event Stream (from version)
    // =====================================================
    console.log('\n📝 TEST 4: Get Event Stream from Version 1');
    console.log('-'.repeat(50));
    
    const stream = await eventStore.getStream(gameId, 1);
    
    console.log(`✅ Retrieved ${stream.length} events from version > 1:`);
    stream.forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.eventType} (v${e.version})`);
    });
    
    // =====================================================
    // TEST 5: Get Events by Type
    // =====================================================
    console.log('\n📝 TEST 5: Get Events by Type');
    console.log('-'.repeat(50));
    
    const gameCreatedEvents = await eventStore.getByType('game.created', 5);
    
    console.log(`✅ Retrieved ${gameCreatedEvents.length} 'game.created' events:`);
    gameCreatedEvents.slice(0, 3).forEach((e, i) => {
      console.log(`   ${i + 1}. ${e.aggregateId} (v${e.version})`);
    });
    
    // =====================================================
    // TEST 6: Get Latest Version
    // =====================================================
    console.log('\n📝 TEST 6: Get Latest Version');
    console.log('-'.repeat(50));
    
    const latestVersion = await eventStore.getLatestVersion(gameId);
    
    console.log(`✅ Latest version for ${gameId}:`, latestVersion);
    
    // =====================================================
    // TEST 7: Check Existence
    // =====================================================
    console.log('\n📝 TEST 7: Check Existence');
    console.log('-'.repeat(50));
    
    const exists = await eventStore.exists(gameId);
    const notExists = await eventStore.exists('non-existent-game');
    
    console.log(`✅ ${gameId} exists:`, exists);
    console.log(`✅ non-existent-game exists:`, notExists);
    
    // =====================================================
    // TEST 8: Get Event Count
    // =====================================================
    console.log('\n📝 TEST 8: Get Event Count');
    console.log('-'.repeat(50));
    
    const count = await eventStore.getEventCount(gameId);
    
    console.log(`✅ Event count for ${gameId}:`, count);
    
    // =====================================================
    // TEST 9: Query with Filter
    // =====================================================
    console.log('\n📝 TEST 9: Query with Filter');
    console.log('-'.repeat(50));
    
    const filteredEvents = await eventStore.query({
      aggregateId: gameId,
      eventType: 'game.action_processed',
      limit: 10
    });
    
    console.log(`✅ Filtered events (action_processed only):`, filteredEvents.length);
    
    // =====================================================
    // TEST 10: Version Conflict (Optimistic Concurrency)
    // =====================================================
    console.log('\n📝 TEST 10: Version Conflict Detection');
    console.log('-'.repeat(50));
    
    try {
      await eventStore.append({
        eventType: 'game.test',
        aggregateType: 'Game',
        aggregateId: gameId,
        eventData: { test: true },
        version: 1 // Trying to use old version
      });
      
      console.log('❌ ERROR: Should have thrown VersionConflictError!');
    } catch (error) {
      if (error.name === 'VersionConflictError') {
        console.log('✅ Version conflict detected correctly!');
        console.log(`   Expected version > ${error.actualVersion}, got ${error.expectedVersion}`);
      } else {
        throw error;
      }
    }
    
    // =====================================================
    // TEST SUMMARY
    // =====================================================
    console.log('\n' + '='.repeat(50));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(50));
    console.log('\n✅ Event Store is working correctly!');
    console.log(`   Total events created: ${count}`);
    console.log(`   Latest version: ${latestVersion}`);
    console.log(`   Aggregate ID: ${gameId}\n`);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests
testEventStore();

