/**
 * MIGRATION 11 RUNNER
 * Fixes track_game_complete() trigger to use NEW.id instead of NEW.game_id
 * Run this directly via Node.js to bypass Supabase UI
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { Pool } = require('pg');

console.log('🔍 Checking environment variables...');
console.log(`   DATABASE_URL exists: ${!!process.env.DATABASE_URL}`);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('\n❌ DATABASE_URL not found in .env file');
  console.error('   This is the same variable your main server uses.');
  console.error('   Check sophisticated-engine-server.js line 320\n');
  console.error('💡 Alternative: Wait for Supabase to come back online');
  console.error('   Then run the SQL in migrations/11_fix_game_complete_trigger.sql\n');
  process.exit(1);
}

console.log('✅ DATABASE_URL found, connecting...\n');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const migrationSQL = `
-- MIGRATION 11: Fix track_game_complete() Trigger
CREATE OR REPLACE FUNCTION track_game_complete() RETURNS TRIGGER AS $$
DECLARE
  host_id UUID;
  player_ids_array UUID[];
  game_duration INT;
BEGIN
  -- Only proceed if game is being marked as completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    
    -- Get host_user_id from rooms table
    SELECT host_user_id INTO host_id
    FROM rooms
    WHERE id = NEW.room_id;
    
    -- Get all player_ids from room_seats
    SELECT ARRAY_AGG(DISTINCT user_id) INTO player_ids_array
    FROM room_seats
    WHERE room_id = NEW.room_id AND left_at IS NULL;
    
    -- Calculate game duration
    game_duration := EXTRACT(EPOCH FROM (NOW() - NEW.created_at))::INT;
    
    -- Insert game completion record
    -- FIXED: Changed NEW.game_id to NEW.id (game_states uses 'id' column)
    INSERT INTO game_completions (
      game_id,
      room_id,
      host_user_id,
      started_at,
      completed_at,
      duration_seconds,
      total_hands_played,
      player_ids,
      player_count
    ) VALUES (
      NEW.id,  -- FIXED: was NEW.game_id
      NEW.room_id,
      host_id,
      NEW.created_at,
      NOW(),
      game_duration,
      COALESCE(NEW.hand_number, 0),
      player_ids_array,
      COALESCE(array_length(player_ids_array, 1), 0)
    )
    ON CONFLICT (game_id) DO NOTHING;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

async function runMigration() {
  console.log('🔧 Running Migration 11: Fix track_game_complete() trigger...\n');
  
  try {
    const result = await pool.query(migrationSQL);
    
    console.log('✅ Migration 11 executed successfully!');
    console.log('   Fixed: NEW.game_id → NEW.id');
    console.log('\n🎯 Next steps:');
    console.log('   1. Restart your server (Ctrl+C, then npm start)');
    console.log('   2. Play a hand to completion');
    console.log('   3. Check for NO trigger errors in console\n');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await pool.end();
  }
}

runMigration();

