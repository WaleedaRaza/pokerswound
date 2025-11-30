/**
 * Run all pending migrations
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase.co') 
    ? { rejectUnauthorized: false } 
    : undefined
});

async function runMigration(fileName) {
  console.log(`\n📄 Running migration: ${fileName}`);
  
  const filePath = path.join(__dirname, 'database/migrations', fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return false;
  }
  
  const sql = fs.readFileSync(filePath, 'utf8');
  
  try {
    await pool.query(sql);
    console.log(`✅ Migration completed: ${fileName}`);
    return true;
  } catch (error) {
    console.error(`❌ Migration failed: ${fileName}`);
    console.error(`Error: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Running database migrations...\n');
  console.log(`📊 Database: ${process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown'}\n`);
  
  const migrations = [
    'add-game-states-table.sql',
    'add-game-events-table.sql'
  ];
  
  let successCount = 0;
  let failCount = 0;
  
  for (const migration of migrations) {
    const success = await runMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Migration Summary:`);
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`${'='.repeat(60)}\n`);
  
  await pool.end();
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

