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
    
    const migrationFile = process.argv[2] || '010_fix_auth_foreign_keys.sql';
    const sql = fs.readFileSync(`database/migrations/${migrationFile}`, 'utf8');
    
    console.log(`📝 Running migration ${migrationFile}...`);
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

