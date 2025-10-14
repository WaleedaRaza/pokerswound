// Run single migration
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting...');
    const client = await pool.connect();
    
    const sql = fs.readFileSync('database/migrations/009_event_store.sql', 'utf8');
    
    console.log('📝 Running migration 009 (Event Store)...');
    await client.query(sql);
    
    console.log('✅ Migration complete!');
    
    client.release();
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();

