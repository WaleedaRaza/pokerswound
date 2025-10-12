-- Add hand history tracking for audit trail
-- Migration 005: Create hand_history table

CREATE TABLE IF NOT EXISTS hand_history (
  id SERIAL PRIMARY KEY,
  game_id TEXT NOT NULL,
  room_id UUID NOT NULL REFERENCES rooms(id),
  hand_number INTEGER NOT NULL,
  pot_size INTEGER NOT NULL,
  community_cards TEXT[], -- Array of card strings (e.g., ['SA', 'D3', 'H9'])
  winners JSONB, -- [{playerId, amount, handRank}]
  player_actions JSONB, -- [{playerId, action, amount, street, timestamp}]
  final_stacks JSONB, -- {playerId: stack}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hand_history_game ON hand_history(game_id);
CREATE INDEX IF NOT EXISTS idx_hand_history_room ON hand_history(room_id);
CREATE INDEX IF NOT EXISTS idx_hand_history_created ON hand_history(created_at DESC);

COMMENT ON TABLE hand_history IS 'Complete audit trail of all poker hands played';
COMMENT ON COLUMN hand_history.community_cards IS 'Community cards shown in this hand';
COMMENT ON COLUMN hand_history.winners IS 'JSON array of winners with amounts and hand ranks';
COMMENT ON COLUMN hand_history.player_actions IS 'JSON array of all player actions during the hand';
COMMENT ON COLUMN hand_history.final_stacks IS 'JSON object mapping player IDs to their final stack after hand';

