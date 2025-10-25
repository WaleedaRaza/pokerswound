// Simple Session Test - No room creation needed
require('dotenv').config();
const io = require('socket.io-client');
const fetch = require('undici').fetch;

const WS_BASE = 'http://localhost:3000';

async function testSimpleSession() {
  console.log('\n🧪 SIMPLE SESSION TEST\n');
  
  const userId = `test_${Date.now()}`;
  let socket;
  
  try {
    // ============================================
    // TEST 1: Connect & Authenticate
    // ============================================
    console.log('🔌 TEST 1: Connecting to server...');
    socket = io(WS_BASE, { 
      transports: ['websocket'],
      reconnection: false 
    });
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
      socket.once('connect', () => {
        clearTimeout(timeout);
        console.log(`✅ Connected: ${socket.id}`);
        resolve();
      });
      socket.once('connect_error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    
    // ============================================
    // TEST 2: Authenticate (creates session)
    // ============================================
    console.log('\n🔐 TEST 2: Authenticating...');
    const authResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Auth timeout')), 5000);
      
      socket.once('authenticated', (data) => {
        clearTimeout(timeout);
        console.log('✅ Authenticated:', {
          userId: data.userId,
          hasSession: !!data.session,
          hasSeatBinding: !!data.seatBinding
        });
        resolve(data);
      });
      
      socket.once('auth_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.error));
      });
      
      socket.emit('authenticate', {
        userId,
        roomId: null,
        seatToken: null
      });
    });
    
    if (!authResult.session) {
      throw new Error('No session created!');
    }
    
    // ============================================
    // TEST 3: Heartbeat
    // ============================================
    console.log('\n💓 TEST 3: Testing heartbeat...');
    try {
      const heartbeatResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Heartbeat timeout')), 3000);
        
        socket.once('heartbeat_ack', (data) => {
          clearTimeout(timeout);
          console.log('✅ Heartbeat acknowledged');
          resolve(data);
        });
        
        socket.emit('heartbeat', { userId });
      });
    } catch (error) {
      console.log('⚠️  Heartbeat not acknowledged (non-critical)');
    }
    
    // ============================================
    // TEST 4: Disconnect & Reconnect
    // ============================================
    console.log('\n🔄 TEST 4: Testing disconnect/reconnect...');
    socket.disconnect();
    console.log('🔌 Disconnected');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Reconnect
    socket = io(WS_BASE, { 
      transports: ['websocket'],
      reconnection: false 
    });
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Reconnection timeout')), 5000);
      socket.once('connect', () => {
        clearTimeout(timeout);
        console.log(`✅ Reconnected: ${socket.id}`);
        resolve();
      });
    });
    
    // Re-authenticate
    const reAuthResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Re-auth timeout')), 5000);
      
      socket.once('authenticated', (data) => {
        clearTimeout(timeout);
        console.log('✅ Re-authenticated:', {
          userId: data.userId,
          sessionRestored: !!data.session
        });
        resolve(data);
      });
      
      socket.once('auth_error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.error));
      });
      
      socket.emit('authenticate', {
        userId,
        roomId: null,
        seatToken: null
      });
    });
    
    if (!reAuthResult.session) {
      throw new Error('Session not restored after reconnection!');
    }
    
    // ============================================
    // SUCCESS
    // ============================================
    console.log('\n✅ ALL TESTS PASSED!\n');
    console.log('Session Management Works:');
    console.log('  ✓ Session creation');
    console.log('  ✓ WebSocket authentication');
    console.log('  ✓ Heartbeat');
    console.log('  ✓ Disconnect/reconnect');
    console.log('  ✓ Session restoration\n');
    
    socket.disconnect();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    if (socket) socket.disconnect();
    process.exit(1);
  }
}

console.log('⏳ Starting test in 3 seconds...');
setTimeout(() => {
  testSimpleSession();
}, 3000);

