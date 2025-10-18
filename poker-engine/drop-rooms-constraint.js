require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_host_user_id_fkey;
`;

pool.query(sql)
  .then(() => {
    console.log('✅ rooms.host_user_id constraint dropped - room creation should work now!');
    pool.end();
  })
  .catch(e => {
    console.error('❌ Error:', e.message);
    pool.end();
    process.exit(1);
  });
