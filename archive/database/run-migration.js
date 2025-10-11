// Simple migration runner
require('dotenv').config({ path: './test.env' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('🗃️  Running database migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '001_initial_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📋 Executing migration: 001_initial_schema.sql');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('');
    console.log('🎯 Tables created:');
    console.log('   - users (authentication & profiles)');
    console.log('   - user_sessions (JWT refresh tokens)');
    console.log('   - rejoin_tokens (game rejoin capability)');
    console.log('   - rooms (poker tables/rooms)');
    console.log('   - room_seats (player seating)');
    console.log('   - room_spectators (observers)');
    console.log('   - games (game instances)');
    console.log('   - hands (individual poker hands)');
    console.log('   - chips_transactions (chips economy)');
    console.log('   - game_events (event sourcing)');
    console.log('   - game_snapshots (state recovery)');
    console.log('');
    console.log('🚀 Database is ready for production!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('');
    if (error.message.includes('already exists')) {
      console.log('💡 Tables may already exist. This is normal if migration was run before.');
    } else {
      console.log('🔧 Check the SQL syntax and database permissions.');
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
