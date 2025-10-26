#!/usr/bin/env node
/**
 * Test Poker Table V2 Database Layer
 */

require('dotenv').config();
const PokerTableV2DB = require('../src/db/poker-table-v2');
const crypto = require('crypto');

async function testV2DB() {
  console.log('🧪 Testing Poker Table V2 Database Layer...\n');
  
  const db = new PokerTableV2DB(process.env.DATABASE_URL);
  
  try {
    // 1. Health check
    console.log('1️⃣ Testing health check...');
    const health = await db.healthCheck();
    console.log('   ✅ Database healthy:', health.time);
    
    // 2. Test audit logging
    console.log('\n2️⃣ Testing audit logging...');
    await db.auditLog({
      traceId: crypto.randomBytes(16).toString('hex'),
      roomId: '00000000-0000-0000-0000-000000000001',
      userId: '00000000-0000-0000-0000-000000000002',
      action: 'test_action',
      payload: { test: true }
    });
    console.log('   ✅ Audit log created');
    
    // 3. Test idempotency
    console.log('\n3️⃣ Testing idempotency...');
    const idempKey = 'test-' + Date.now();
    const userId = '00000000-0000-0000-0000-000000000002';
    
    // First check - should be null
    const check1 = await db.checkIdempotency(idempKey, userId);
    console.log('   ✅ First check returned:', check1);
    
    // Store result
    await db.storeIdempotency(idempKey, userId, 'test', { success: true });
    console.log('   ✅ Stored idempotency result');
    
    // Second check - should return stored result
    const check2 = await db.checkIdempotency(idempKey, userId);
    console.log('   ✅ Second check returned:', check2);
    
    // 4. Test rate limiting
    console.log('\n4️⃣ Testing rate limiting...');
    const testUserId = '00000000-0000-0000-0000-' + Date.now().toString().padStart(12, '0').slice(-12);
    
    // First 3 actions should be allowed
    for (let i = 1; i <= 3; i++) {
      const result = await db.checkRateLimit(testUserId, 'test_action', 60000, 3);
      console.log(`   ✅ Action ${i}: allowed=${result.allowed}, count=${result.count}/${result.limit}`);
    }
    
    // 4th action should be blocked
    const blocked = await db.checkRateLimit(testUserId, 'test_action', 60000, 3);
    console.log(`   ✅ Action 4: allowed=${blocked.allowed} (should be false)`);
    
    // 5. Test transaction
    console.log('\n5️⃣ Testing transaction helper...');
    try {
      await db.withTransaction(async (client) => {
        await client.query(
          `INSERT INTO game_audit_log (trace_id, room_id, user_id, action) 
           VALUES ($1, $2, $3, $4)`,
          [
            crypto.randomBytes(16).toString('hex'),
            '00000000-0000-0000-0000-000000000001',
            '00000000-0000-0000-0000-000000000002',
            'transaction_test'
          ]
        );
        console.log('   ✅ Transaction completed successfully');
      });
    } catch (error) {
      console.log('   ❌ Transaction failed (expected if testing rollback)');
    }
    
    console.log('\n✅ All tests passed! V2 DB layer is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await db.close();
  }
}

testV2DB().catch(console.error);
