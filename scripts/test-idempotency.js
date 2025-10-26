#!/usr/bin/env node
/**
 * Test Idempotency Implementation
 * Verifies that duplicate requests return same response
 */

const axios = require('axios');
const crypto = require('crypto');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

async function testIdempotency() {
  console.log('🧪 Testing Idempotency Implementation...\n');
  
  // Generate unique idempotency key
  const idempotencyKey = crypto.randomUUID();
  const userId = '00000000-0000-0000-0000-000000000001';
  
  console.log(`📝 Idempotency Key: ${idempotencyKey}`);
  
  // Test payload
  const payload = {
    user_id: userId,
    small_blind: 5,
    big_blind: 10,
    max_players: 9,
    roomId: '00000000-0000-0000-0000-000000000001'
  };
  
  console.log('\n1️⃣ Sending first request...');
  
  try {
    // First request
    const response1 = await axios.post(`${BASE_URL}/api/games`, payload, {
      headers: {
        'X-Idempotency-Key': idempotencyKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   ✅ First response:', response1.data);
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 100));
    
    console.log('\n2️⃣ Sending duplicate request with same idempotency key...');
    
    // Duplicate request - should return cached response
    const response2 = await axios.post(`${BASE_URL}/api/games`, payload, {
      headers: {
        'X-Idempotency-Key': idempotencyKey,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   ✅ Second response:', response2.data);
    
    // Compare responses
    const areEqual = JSON.stringify(response1.data) === JSON.stringify(response2.data);
    
    if (areEqual) {
      console.log('\n✅ SUCCESS! Duplicate request returned same response');
    } else {
      console.log('\n❌ FAILURE! Responses differ:');
      console.log('   First:', response1.data);
      console.log('   Second:', response2.data);
    }
    
    // Test missing idempotency key
    console.log('\n3️⃣ Testing request without idempotency key...');
    
    try {
      await axios.post(`${BASE_URL}/api/games`, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('   ❌ Request succeeded without key (should have failed)');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('   ✅ Request correctly rejected: ' + error.response.data.error);
      } else {
        console.log('   ❌ Unexpected error:', error.message);
      }
    }
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
  }
}

// Check if axios is installed
try {
  require.resolve('axios');
  testIdempotency();
} catch(e) {
  console.log('📦 Installing axios...');
  require('child_process').execSync('npm install axios', { stdio: 'inherit' });
  console.log('✅ Axios installed, please run the script again');
}
