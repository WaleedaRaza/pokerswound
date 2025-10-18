require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = `
ALTER TABLE room_players DROP CONSTRAINT IF EXISTS room_players_user_id_fkey;
ALTER TABLE room_seats DROP CONSTRAINT IF EXISTS room_seats_user_id_fkey;
ALTER TABLE room_spectators DROP CONSTRAINT IF EXISTS room_spectators_user_id_fkey;
`;

pool.query(sql)
  .then(() => {
    console.log('✅ Foreign key constraints dropped - guests can now join!');
    pool.end();
  })
  .catch(e => {
    console.error('❌ Error:', e.message);
    pool.end();
    process.exit(1);
  });

