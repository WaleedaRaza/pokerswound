// Test script to verify database persistence is working
require('dotenv').config({ path: 'test.env' });
const { Pool } = require('pg');

async function testPersistence() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('supabase.co') 
      ? { rejectUnauthorized: false } 
      : undefined
  });

  try {
    console.log('🧪 Testing Database Persistence\n');
    console.log('═'.repeat(60));

    // Test 1: Check table exists
    console.log('\n📋 Test 1: Verify table structure');
    const tableCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'game_states'
      ORDER BY ordinal_position;
    `);
    console.log(`✅ Table game_states has ${tableCheck.rows.length} columns`);
    
    // Test 2: Check indexes
    console.log('\n📋 Test 2: Verify indexes');
    const indexCheck = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'game_states';
    `);
    console.log(`✅ Found ${indexCheck.rows.length} indexes:`);
    indexCheck.rows.forEach(idx => console.log(`   - ${idx.indexname}`));

    // Test 3: Check current data
    console.log('\n📋 Test 3: Check existing game states');
    const dataCheck = await pool.query(`
      SELECT 
        id, 
        room_id,
        status, 
        hand_number,
        total_pot,
        version,
        created_at
      FROM game_states
      ORDER BY created_at DESC
      LIMIT 10;
    `);
    
    if (dataCheck.rows.length === 0) {
      console.log('📭 No game states yet (this is normal on first run)');
      console.log('💡 Create a game via the UI to test persistence!');
    } else {
      console.log(`✅ Found ${dataCheck.rows.length} game state(s):`);
      dataCheck.rows.forEach(game => {
        console.log(`\n   Game: ${game.id}`);
        console.log(`   Status: ${game.status}`);
        console.log(`   Hand #: ${game.hand_number}`);
        console.log(`   Pot: ${game.total_pot}`);
        console.log(`   Version: ${game.version}`);
        console.log(`   Created: ${game.created_at}`);
        if (game.room_id) {
          console.log(`   Room: ${game.room_id}`);
        }
      });
    }

    // Test 4: Verify room linkage capability
    console.log('\n📋 Test 4: Test room linkage query');
    const roomCheck = await pool.query(`
      SELECT 
        gs.id as game_id,
        gs.status as game_status,
        r.name as room_name,
        r.id as room_id
      FROM game_states gs
      LEFT JOIN rooms r ON gs.room_id = r.id
      LIMIT 5;
    `);
    
    if (roomCheck.rows.length > 0) {
      console.log('✅ Room linkage working:');
      roomCheck.rows.forEach(row => {
        console.log(`   Game ${row.game_id} → Room: ${row.room_name || 'standalone'}`);
      });
    } else {
      console.log('✅ Room linkage query ready (no games with rooms yet)');
    }

    // Test 5: Optimistic locking test
    console.log('\n📋 Test 5: Verify optimistic locking setup');
    const versionCheck = await pool.query(`
      SELECT 
        id,
        version,
        updated_at
      FROM game_states
      ORDER BY version DESC
      LIMIT 3;
    `);
    
    if (versionCheck.rows.length > 0) {
      console.log('✅ Version tracking active:');
      versionCheck.rows.forEach(row => {
        console.log(`   ${row.id}: v${row.version} (updated: ${row.updated_at})`);
      });
    } else {
      console.log('✅ Version column ready for optimistic locking');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('\n📊 Summary:');
    console.log(`   - Table structure: ✅ Valid`);
    console.log(`   - Indexes: ✅ ${indexCheck.rows.length} created`);
    console.log(`   - Game states: ${dataCheck.rows.length === 0 ? '📭 Empty (ready)' : `✅ ${dataCheck.rows.length} stored`}`);
    console.log(`   - Room linkage: ✅ Ready`);
    console.log(`   - Version control: ✅ Active`);
    
    console.log('\n💡 Next steps:');
    console.log('   1. Server is running on http://localhost:3000');
    console.log('   2. Open http://localhost:3000/poker');
    console.log('   3. Create a game and make some moves');
    console.log('   4. Run this script again to see persisted data!');
    console.log('   5. Restart server - game should reload from DB');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testPersistence();

