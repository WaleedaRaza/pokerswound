// Simple database test without TypeScript compilation
require('dotenv').config({ path: './test.env' });

console.log('🔍 Environment Variables Check');
console.log('==============================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('SERVER_SECRET:', process.env.SERVER_SECRET ? 'SET' : 'NOT SET');

if (!process.env.DATABASE_URL) {
  console.log('❌ DATABASE_URL is not set');
  console.log('💡 Please update test.env with your actual database connection string');
  console.log('💡 Example: postgresql://username:password@localhost:5432/database_name');
  console.log('');
  console.log('🎯 To set up a database quickly:');
  console.log('   1. Install PostgreSQL locally, or');
  console.log('   2. Use a cloud provider like Supabase, Railway, or Neon');
  console.log('   3. Update DATABASE_URL in test.env');
  process.exit(1);
}

// Test basic database connection
const { Pool } = require('pg');

async function testBasicConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Attempting database connection...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
    const { current_time, pg_version } = result.rows[0];
    
    console.log('📊 Database Info:');
    console.log('   Time:', current_time);
    console.log('   Version:', pg_version.split(' ')[0] + ' ' + pg_version.split(' ')[1]);
    
    client.release();
    await pool.end();
    
    console.log('');
    console.log('🎉 Database connection test successful!');
    console.log('✅ Your environment setup is working correctly');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('');
    console.log('🔧 Common solutions:');
    console.log('   1. Check that PostgreSQL is running');
    console.log('   2. Verify DATABASE_URL is correct');
    console.log('   3. Ensure database exists and user has access');
    console.log('   4. Check firewall/network settings');
    await pool.end();
    process.exit(1);
  }
}

testBasicConnection();
