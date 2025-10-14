/**
 * Event Bus Test Script
 * 
 * Tests the EventBus pub/sub functionality:
 * 1. Subscribe to events
 * 2. Publish events
 * 3. Pattern matching (wildcards)
 * 4. Multiple handlers
 * 5. Handler priorities
 * 6. Error handling
 * 7. Unsubscribe
 * 8. Integration with EventStore
 */

require('dotenv').config();
const { Pool } = require('pg');

// Import compiled classes
const { EventBus } = require('./dist/application/events/EventBus');
const { EventHandler, LoggingEventHandler, MultiEventHandler } = require('./dist/application/events/EventHandler');
const { PostgresEventStore } = require('./dist/infrastructure/persistence/EventStore');

async function testEventBus() {
  console.log('🧪 EVENT BUS TEST\n');
  console.log('='.repeat(50));
  
  // Track test results
  const events = [];
  let testsPassed = 0;
  let testsFailed = 0;
  
  try {
    // =====================================================
    // TEST 1: Basic Subscribe & Publish
    // =====================================================
    console.log('\n📝 TEST 1: Basic Subscribe & Publish');
    console.log('-'.repeat(50));
    
    const eventBus = new EventBus({ asyncHandlers: false });
    
    let handlerCalled = false;
    const handler1 = async (event) => {
      console.log('  Handler1 received:', event.eventType);
      handlerCalled = true;
      events.push(event);
    };
    
    eventBus.subscribe('game.created', handler1);
    
    await eventBus.publish({
      id: '1',
      eventType: 'game.created',
      aggregateType: 'Game',
      aggregateId: 'game-1',
      eventData: { roomId: 'room-1' },
      version: 1,
      timestamp: new Date()
    });
    
    if (handlerCalled && events.length === 1) {
      console.log('✅ TEST 1 PASSED: Handler received event');
      testsPassed++;
    } else {
      console.log('❌ TEST 1 FAILED: Handler not called');
      testsFailed++;
    }
    
    // =====================================================
    // TEST 2: Wildcard Pattern Matching
    // =====================================================
    console.log('\n📝 TEST 2: Wildcard Pattern Matching');
    console.log('-'.repeat(50));
    
    const wildcardEvents = [];
    const wildcardHandler = async (event) => {
      console.log('  Wildcard handler received:', event.eventType);
      wildcardEvents.push(event);
    };
    
    eventBus.subscribe('game.*', wildcardHandler);
    
    await eventBus.publish({
      id: '2',
      eventType: 'game.action_processed',
      aggregateType: 'Game',
      aggregateId: 'game-1',
      eventData: { action: 'call' },
      version: 2,
      timestamp: new Date()
    });
    
    await eventBus.publish({
      id: '3',
      eventType: 'game.hand_completed',
      aggregateType: 'Game',
      aggregateId: 'game-1',
      eventData: { winners: ['player1'] },
      version: 3,
      timestamp: new Date()
    });
    
    if (wildcardEvents.length === 2) {
      console.log('✅ TEST 2 PASSED: Wildcard matched 2 events');
      testsPassed++;
    } else {
      console.log(`❌ TEST 2 FAILED: Expected 2 events, got ${wildcardEvents.length}`);
      testsFailed++;
    }
    
    // =====================================================
    // TEST 3: Multiple Handlers for Same Event
    // =====================================================
    console.log('\n📝 TEST 3: Multiple Handlers for Same Event');
    console.log('-'.repeat(50));
    
    let handler2Called = false;
    let handler3Called = false;
    
    const handler2 = async (event) => {
      console.log('  Handler2 received:', event.eventType);
      handler2Called = true;
    };
    
    const handler3 = async (event) => {
      console.log('  Handler3 received:', event.eventType);
      handler3Called = true;
    };
    
    eventBus.subscribe('test.event', handler2);
    eventBus.subscribe('test.event', handler3);
    
    await eventBus.publish({
      id: '4',
      eventType: 'test.event',
      aggregateType: 'Test',
      aggregateId: 'test-1',
      eventData: {},
      version: 1,
      timestamp: new Date()
    });
    
    if (handler2Called && handler3Called) {
      console.log('✅ TEST 3 PASSED: Multiple handlers called');
      testsPassed++;
    } else {
      console.log('❌ TEST 3 FAILED: Not all handlers called');
      testsFailed++;
    }
    
    // =====================================================
    // TEST 4: Handler Priority
    // =====================================================
    console.log('\n📝 TEST 4: Handler Priority');
    console.log('-'.repeat(50));
    
    const executionOrder = [];
    
    const lowPriority = async (event) => {
      console.log('  Low priority handler (100)');
      executionOrder.push('low');
    };
    
    const highPriority = async (event) => {
      console.log('  High priority handler (10)');
      executionOrder.push('high');
    };
    
    const mediumPriority = async (event) => {
      console.log('  Medium priority handler (50)');
      executionOrder.push('medium');
    };
    
    eventBus.subscribe('priority.test', lowPriority, { priority: 100 });
    eventBus.subscribe('priority.test', highPriority, { priority: 10 });
    eventBus.subscribe('priority.test', mediumPriority, { priority: 50 });
    
    await eventBus.publish({
      id: '5',
      eventType: 'priority.test',
      aggregateType: 'Test',
      aggregateId: 'test-1',
      eventData: {},
      version: 1,
      timestamp: new Date()
    });
    
    if (executionOrder[0] === 'high' && executionOrder[1] === 'medium' && executionOrder[2] === 'low') {
      console.log('✅ TEST 4 PASSED: Handlers executed in priority order');
      testsPassed++;
    } else {
      console.log(`❌ TEST 4 FAILED: Order was ${executionOrder.join(', ')}`);
      testsFailed++;
    }
    
    // =====================================================
    // TEST 5: Error Handling
    // =====================================================
    console.log('\n📝 TEST 5: Error Handling (Swallow Errors)');
    console.log('-'.repeat(50));
    
    let errorHandlerCalled = false;
    let successHandlerCalled = false;
    
    const errorHandler = async (event) => {
      console.log('  Error handler throwing...');
      errorHandlerCalled = true;
      throw new Error('Handler error!');
    };
    
    const successHandler = async (event) => {
      console.log('  Success handler executing...');
      successHandlerCalled = true;
    };
    
    eventBus.subscribe('error.test', errorHandler);
    eventBus.subscribe('error.test', successHandler);
    
    await eventBus.publish({
      id: '6',
      eventType: 'error.test',
      aggregateType: 'Test',
      aggregateId: 'test-1',
      eventData: {},
      version: 1,
      timestamp: new Date()
    });
    
    if (errorHandlerCalled && successHandlerCalled) {
      console.log('✅ TEST 5 PASSED: Error swallowed, other handlers still executed');
      testsPassed++;
    } else {
      console.log('❌ TEST 5 FAILED: Handlers not executed correctly');
      testsFailed++;
    }
    
    // =====================================================
    // TEST 6: Unsubscribe
    // =====================================================
    console.log('\n📝 TEST 6: Unsubscribe');
    console.log('-'.repeat(50));
    
    let unsubscribeCount = 0;
    
    const unsubHandler = async (event) => {
      unsubscribeCount++;
    };
    
    eventBus.subscribe('unsub.test', unsubHandler);
    
    await eventBus.publish({
      id: '7',
      eventType: 'unsub.test',
      aggregateType: 'Test',
      aggregateId: 'test-1',
      eventData: {},
      version: 1,
      timestamp: new Date()
    });
    
    eventBus.unsubscribe('unsub.test', unsubHandler);
    
    await eventBus.publish({
      id: '8',
      eventType: 'unsub.test',
      aggregateType: 'Test',
      aggregateId: 'test-1',
      eventData: {},
      version: 2,
      timestamp: new Date()
    });
    
    if (unsubscribeCount === 1) {
      console.log('✅ TEST 6 PASSED: Handler unsubscribed correctly');
      testsPassed++;
    } else {
      console.log(`❌ TEST 6 FAILED: Expected 1 call, got ${unsubscribeCount}`);
      testsFailed++;
    }
    
    // =====================================================
    // TEST 7: EventHandler Base Class
    // =====================================================
    console.log('\n📝 TEST 7: EventHandler Base Class');
    console.log('-'.repeat(50));
    
    let baseClassHandled = false;
    
    class TestEventHandler extends EventHandler {
      constructor() {
        super('TestEventHandler');
      }
      
      canHandle(eventType) {
        return eventType.startsWith('base.');
      }
      
      async handle(event) {
        console.log(`  ${this.name} handling: ${event.eventType}`);
        baseClassHandled = true;
      }
    }
    
    const testHandler = new TestEventHandler();
    eventBus.subscribe('base.*', testHandler.getHandlerFunction());
    
    await eventBus.publish({
      id: '9',
      eventType: 'base.test',
      aggregateType: 'Test',
      aggregateId: 'test-1',
      eventData: {},
      version: 1,
      timestamp: new Date()
    });
    
    if (baseClassHandled) {
      console.log('✅ TEST 7 PASSED: EventHandler base class works');
      testsPassed++;
    } else {
      console.log('❌ TEST 7 FAILED: Base class handler not called');
      testsFailed++;
    }
    
    // =====================================================
    // TEST 8: MultiEventHandler
    // =====================================================
    console.log('\n📝 TEST 8: MultiEventHandler');
    console.log('-'.repeat(50));
    
    let multiHandlerCount = 0;
    
    const multiHandler = new MultiEventHandler('TestMultiHandler');
    multiHandler
      .on('multi.event1', (event) => {
        console.log('  MultiHandler: event1');
        multiHandlerCount++;
      })
      .on('multi.event2', (event) => {
        console.log('  MultiHandler: event2');
        multiHandlerCount++;
      });
    
    eventBus.subscribe('multi.*', multiHandler.getHandlerFunction());
    
    await eventBus.publish({
      id: '10',
      eventType: 'multi.event1',
      aggregateType: 'Test',
      aggregateId: 'test-1',
      eventData: {},
      version: 1,
      timestamp: new Date()
    });
    
    await eventBus.publish({
      id: '11',
      eventType: 'multi.event2',
      aggregateType: 'Test',
      aggregateId: 'test-1',
      eventData: {},
      version: 2,
      timestamp: new Date()
    });
    
    if (multiHandlerCount === 2) {
      console.log('✅ TEST 8 PASSED: MultiEventHandler works');
      testsPassed++;
    } else {
      console.log(`❌ TEST 8 FAILED: Expected 2 calls, got ${multiHandlerCount}`);
      testsFailed++;
    }
    
    // =====================================================
    // TEST 9: Integration with EventStore
    // =====================================================
    console.log('\n📝 TEST 9: Integration with EventStore');
    console.log('-'.repeat(50));
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    const eventStore = new PostgresEventStore(pool);
    const eventBusWithStore = new EventBus({
      eventStore,
      persistEvents: true,
      asyncHandlers: false
    });
    
    let storeHandlerCalled = false;
    eventBusWithStore.subscribe('store.test', (event) => {
      console.log('  Handler received persisted event');
      storeHandlerCalled = true;
    });
    
    const testGameId = `test-game-${Date.now()}`;
    
    await eventBusWithStore.publish({
      eventType: 'store.test',
      aggregateType: 'Game',
      aggregateId: testGameId,
      eventData: { test: true },
      version: 1
    });
    
    // Verify event was persisted
    const persistedEvents = await eventStore.getByAggregate(testGameId);
    
    await pool.end();
    
    if (storeHandlerCalled && persistedEvents.length === 1) {
      console.log('✅ TEST 9 PASSED: EventStore integration works');
      testsPassed++;
    } else {
      console.log('❌ TEST 9 FAILED: Event not persisted or handler not called');
      testsFailed++;
    }
    
    // =====================================================
    // TEST 10: Utility Methods
    // =====================================================
    console.log('\n📝 TEST 10: Utility Methods');
    console.log('-'.repeat(50));
    
    const utilBus = new EventBus();
    const utilHandler = async () => {};
    
    utilBus.subscribe('util.test', utilHandler);
    
    const isSubscribed = utilBus.isSubscribed('util.test', utilHandler);
    const handlers = utilBus.getHandlers('util.test');
    const patterns = utilBus.getPatterns();
    
    utilBus.clear();
    const patternsAfterClear = utilBus.getPatterns();
    
    if (isSubscribed && handlers.length === 1 && patterns.includes('util.test') && patternsAfterClear.length === 0) {
      console.log('✅ TEST 10 PASSED: Utility methods work');
      testsPassed++;
    } else {
      console.log('❌ TEST 10 FAILED: Utility methods not working');
      testsFailed++;
    }
    
    // =====================================================
    // TEST SUMMARY
    // =====================================================
    console.log('\n' + '='.repeat(50));
    console.log(`🎉 TESTS COMPLETE: ${testsPassed}/${testsPassed + testsFailed} passed`);
    console.log('='.repeat(50));
    
    if (testsFailed === 0) {
      console.log('\n✅ ALL TESTS PASSED!\n');
      console.log('Event Bus is fully functional!');
      process.exit(0);
    } else {
      console.log(`\n❌ ${testsFailed} TESTS FAILED\n`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run tests
testEventBus();

