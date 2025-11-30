require('dotenv').config({ path: 'test.env' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

pool.query(`
  CREATE TABLE IF NOT EXISTS domain_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    version INT NOT NULL,
    user_id TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_aggregate_version UNIQUE(aggregate_id, version)
  );
  
  CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate ON domain_events(aggregate_id, version);
  CREATE INDEX IF NOT EXISTS idx_domain_events_type ON domain_events(event_type);
  
  -- Add metadata column if table already exists
  ALTER TABLE domain_events ADD COLUMN IF NOT EXISTS metadata JSONB;
`).then(() => {
  console.log('✅ domain_events table created');
  pool.end();
}).catch(e => {
  console.error('❌', e.message);
  pool.end();
});

