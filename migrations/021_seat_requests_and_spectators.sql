-- Migration: 021_seat_requests_and_spectators.sql
-- Purpose: Add seat request system and spectator mode support

-- ============================================
-- SEAT REQUESTS TABLE
-- ============================================
-- Tracks seat requests from players (late joiners, busted players, spectators)
CREATE TABLE IF NOT EXISTS seat_requests (
  id SERIAL PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  seat_index INTEGER NOT NULL CHECK (seat_index >= 0 AND seat_index < 10),
  requested_chips INTEGER DEFAULT 1000 CHECK (requested_chips >= 0),
  
  -- Request status
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  
  -- Timing
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID, -- host user_id who approved/rejected
  
  -- Prevent duplicate pending requests
  CONSTRAINT unique_pending_request UNIQUE (room_id, user_id) 
    WHERE status = 'PENDING',
  
  -- Index for fast lookups
  CONSTRAINT valid_seat_index CHECK (seat_index >= 0 AND seat_index < 10)
);

-- Index for host queries (pending requests)
CREATE INDEX IF NOT EXISTS idx_seat_requests_pending 
  ON seat_requests(room_id, status) 
  WHERE status = 'PENDING';

-- Index for user queries (my requests)
CREATE INDEX IF NOT EXISTS idx_seat_requests_user 
  ON seat_requests(user_id, status);

-- ============================================
-- SPECTATOR COLUMN
-- ============================================
-- Add spectator flag to room_seats
ALTER TABLE room_seats 
  ADD COLUMN IF NOT EXISTS is_spectator BOOLEAN DEFAULT FALSE;

-- Index for spectator queries
CREATE INDEX IF NOT EXISTS idx_room_seats_spectator 
  ON room_seats(room_id, is_spectator) 
  WHERE is_spectator = TRUE;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE seat_requests IS 'Tracks seat requests for mid-game joins, busted players, and spectators';
COMMENT ON COLUMN seat_requests.status IS 'PENDING: awaiting host approval, APPROVED: seat granted, REJECTED: host denied, CANCELLED: user cancelled';
COMMENT ON COLUMN room_seats.is_spectator IS 'TRUE: player can watch but not play, FALSE: normal player';

