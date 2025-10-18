require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
`;

pool.query(sql)
  .then(() => {
    console.log('✅ user_profiles constraint dropped - guests can now be created!');
    pool.end();
  })
  .catch(e => {
    console.error('❌ Error:', e.message);
    pool.end();
    process.exit(1);
  });

