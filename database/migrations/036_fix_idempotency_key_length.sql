-- Fix idempotency key column length
-- Current: VARCHAR(50) is too short for our keys (98 chars)
-- Change to VARCHAR(128) to accommodate longer keys

ALTER TABLE processed_actions 
  ALTER COLUMN idempotency_key TYPE VARCHAR(128);

COMMENT ON COLUMN processed_actions.idempotency_key IS 'Idempotency key for deduplication (max 128 chars)';

