const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runFix() {
  const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.yxscqaznmhvxezxzmppc:ubSAqnfNkepAbaPq@aws-1-us-east-1.pooler.supabase.com:5432/postgres';
  
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Fixing rooms table schema...');
    
    const sqlPath = path.join(__dirname, 'fix-rooms-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Rooms table schema fixed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runFix();

