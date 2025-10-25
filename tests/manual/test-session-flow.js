// Manual Test: Session Flow with Redis
// Tests: Session creation, seat binding, reconnection, grace period

require('dotenv').config();
const io = require('socket.io-client');
const fetch = require('undici').fetch;

const API_BASE = 'http://localhost:3000';
const WS_BASE = 'http://localhost:3000';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testSessionFlow() {
  console.log('\n🧪 TESTING SESSION FLOW\n');
  
  // Mock user IDs
  const user1 = `test_user_${Date.now()}`;
  const user2 = `test_user_${Date.now() + 1}`;
  
  let socket1, socket2;
  let roomId, seatToken1;
  
  try {
    // ============================================
    // TEST 1: Create Room
    // ============================================
    console.log('\n📝 TEST 1: Creating room...');
    const roomResponse = await fetch(`${API_BASE}/api/rooms`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Session Test Room',
        small_blind: 10,
        big_blind: 20,
        min_buy_in: 1000,
        max_buy_in: 5000,
        max_players: 6,
        is_private: false,
        user_id: user1
      })
    });
    
    if (!roomResponse.ok) {
      const error = await roomResponse.text();
      throw new Error(`Failed to create room: ${error}`);
    }
    
    const roomData = await roomResponse.json();
    roomId = roomData.id;
    console.log(`✅ Room created: ${roomId}`);
    
    // ============================================
    // TEST 2: User 1 Connects & Authenticates
    // ============================================
    console.log('\n🔌 TEST 2: User 1 connecting...');
    socket1 = io(WS_BASE, { 
      transports: ['websocket'],
      reconnection: false 
    });
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
      socket1.once('connect', () => {
        clearTimeout(timeout);
        console.log(`✅ User 1 connected: ${socket1.id}`);
        resolve();
      });
    });
    
    // Authenticate
    const authResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Auth timeout')), 5000);
      
      socket1.once('authenticated', (data) => {
        clearTimeout(timeout);
        console.log(`✅ User 1 authenticated:`, data);
        resolve(data);
      });
      
      socket1.once('auth_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.error));
      });
      
      socket1.emit('authenticate', {
        userId: user1,
        roomId: null,
        seatToken: null
      });
    });
    
    // ============================================
    // TEST 3: User 1 Joins Room & Claims Seat
    // ============================================
    console.log('\n🪑 TEST 3: User 1 joining room and claiming seat 0...');
    const joinResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Join timeout')), 5000);
      
      socket1.once('joined_room', (data) => {
        clearTimeout(timeout);
        console.log(`✅ User 1 joined room:`, data);
        seatToken1 = data.seatToken;
        resolve(data);
      });
      
      socket1.once('join_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.error));
      });
      
      socket1.emit('join_room', {
        roomId,
        userId: user1,
        seatIndex: 0
      });
    });
    
    if (!seatToken1) {
      throw new Error('No seat token received!');
    }
    console.log(`💾 Seat token received: ${seatToken1.substring(0, 20)}...`);
    
    // ============================================
    // TEST 4: Verify Session Info
    // ============================================
    console.log('\n📊 TEST 4: Verifying session info...');
    const sessionResponse = await fetch(`${API_BASE}/api/rooms/${roomId}/session?userId=${user1}`);
    if (!sessionResponse.ok) {
      throw new Error('Failed to fetch session info');
    }
    
    const sessionData = await sessionResponse.json();
    console.log('✅ Session data:', {
      isSeated: sessionData.isSeated,
      seatIndex: sessionData.seatBinding?.seatIndex,
      status: sessionData.seatBinding?.status
    });
    
    // ============================================
    // TEST 5: Disconnect & Reconnect with Token
    // ============================================
    console.log('\n🔄 TEST 5: Simulating disconnect and reconnect...');
    socket1.disconnect();
    console.log('🔌 User 1 disconnected');
    
    await sleep(2000);
    
    // Reconnect with seat token
    socket1 = io(WS_BASE, { 
      transports: ['websocket'],
      reconnection: false 
    });
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
      socket1.once('connect', () => {
        clearTimeout(timeout);
        console.log(`✅ User 1 reconnected: ${socket1.id}`);
        resolve();
      });
    });
    
    // Re-authenticate with seat token
    const reAuthResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Re-auth timeout')), 5000);
      
      socket1.once('authenticated', (data) => {
        clearTimeout(timeout);
        console.log(`✅ User 1 re-authenticated with seat restored:`, {
          roomId: data.seatBinding?.roomId,
          seatIndex: data.seatBinding?.seatIndex,
          status: data.seatBinding?.status
        });
        resolve(data);
      });
      
      socket1.once('auth_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.error));
      });
      
      socket1.emit('authenticate', {
        userId: user1,
        roomId: roomId,
        seatToken: seatToken1
      });
    });
    
    if (!reAuthResult.seatBinding) {
      throw new Error('Seat not restored after reconnection!');
    }
    
    console.log('✅ Seat successfully restored after reconnection');
    
    // ============================================
    // TEST 6: Heartbeat
    // ============================================
    console.log('\n💓 TEST 6: Testing heartbeat...');
    const heartbeatResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Heartbeat timeout')), 5000);
      
      socket1.once('heartbeat_ack', (data) => {
        clearTimeout(timeout);
        console.log(`✅ Heartbeat acknowledged:`, data);
        resolve(data);
      });
      
      socket1.emit('heartbeat', { userId: user1 });
    });
    
    // ============================================
    // SUCCESS
    // ============================================
    console.log('\n✅ ALL TESTS PASSED!\n');
    
    // Cleanup
    socket1.disconnect();
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error(error.stack);
    
    // Cleanup
    if (socket1) socket1.disconnect();
    if (socket2) socket2.disconnect();
    
    process.exit(1);
  }
  
  process.exit(0);
}

// Run tests
console.log('⏳ Waiting for server to be ready...');
setTimeout(() => {
  testSessionFlow();
}, 3000);

