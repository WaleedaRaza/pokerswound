// Create a test user for login
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function createTestUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const username = 'testplayer';
    const email = 'test@poker.com';
    const password = 'test123';
    
    console.log('🔐 Creating test user...');
    console.log(`   Username: ${username}`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    
    // Check if user exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existing.rows.length > 0) {
      console.log('\n⚠️  User already exists!');
      console.log('   Try logging in with:');
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
      await pool.end();
      return;
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, total_chips, is_active, is_verified)
       VALUES ($1, $2, $3, 1000, true, true)
       RETURNING id, username, email, total_chips`,
      [username, email, hashedPassword]
    );
    
    console.log('\n✅ Test user created successfully!');
    console.log('   ID:', result.rows[0].id);
    console.log('   Username:', result.rows[0].username);
    console.log('   Email:', result.rows[0].email);
    console.log('   Chips:', result.rows[0].total_chips);
    
    console.log('\n🎮 You can now login with:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    
    await pool.end();
  } catch (err) {
    console.error('❌ Error:', err.message);
    await pool.end();
    process.exit(1);
  }
}

createTestUser();

