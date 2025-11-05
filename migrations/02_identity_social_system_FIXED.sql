-- ============================================
-- PHASE 1 MVP: IDENTITY & SOCIAL FEATURES (FIXED)
-- Compatible with existing schema
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- ============================================
-- 1. ADD MISSING COLUMNS TO user_profiles
-- ============================================

-- Username system (already has username, just add timestamp)
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS username_set_at TIMESTAMP;

-- Add missing stats columns
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS total_hands_played INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_hand_rank VARCHAR(50),
  ADD COLUMN IF NOT EXISTS best_hand_cards TEXT,
  ADD COLUMN IF NOT EXISTS total_wins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS biggest_pot_won BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5,2) DEFAULT 0.00;

-- Add index for username lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_username ON user_profiles(username);

-- ============================================
-- 2. CREATE friend_requests TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure no duplicate pending requests
  UNIQUE(sender_id, receiver_id),
  
  -- Prevent self-requests
  CHECK (sender_id != receiver_id),
  
  -- Valid statuses
  CHECK (status IN ('pending', 'accepted', 'rejected'))
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

COMMENT ON TABLE friend_requests IS 'Friend requests (pending, accepted, rejected)';

-- ============================================
-- 3. CREATE notifications TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(100) NOT NULL,
  message TEXT,
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Valid notification types
  CHECK (type IN (
    'friend_request',
    'friend_accepted',
    'game_invite',
    'game_started',
    'achievement',
    'system'
  ))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

COMMENT ON TABLE notifications IS 'User notifications (friend requests, game invites, etc.)';

-- ============================================
-- 4. HELPER FUNCTIONS (Work with existing friendships table)
-- ============================================

-- Function to check username availability
CREATE OR REPLACE FUNCTION check_username_available(username_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE username = username_input
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get friend count (works with existing friendships structure)
CREATE OR REPLACE FUNCTION get_friend_count(user_id_input UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM friendships 
    WHERE (requester_id = user_id_input OR addressee_id = user_id_input)
    AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if users are friends (works with existing structure)
CREATE OR REPLACE FUNCTION are_friends(user_id_1 UUID, user_id_2 UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships 
    WHERE ((requester_id = user_id_1 AND addressee_id = user_id_2)
       OR (requester_id = user_id_2 AND addressee_id = user_id_1))
    AND status = 'accepted'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(user_id_input UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM notifications 
    WHERE user_id = user_id_input AND is_read = FALSE
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. UPDATE SOCIAL API TO WORK WITH EXISTING SCHEMA
-- ============================================

-- When accepting friend request, create friendship with existing schema
-- This will be handled in the API layer:
-- INSERT INTO friendships (requester_id, addressee_id, status)
-- VALUES (sender_id, receiver_id, 'accepted')

-- ============================================
-- 6. VERIFICATION QUERIES
-- ============================================

-- Verify friend_requests table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'friend_requests';

-- Verify notifications table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'notifications';

-- Verify new columns in user_profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN (
  'username_set_at', 
  'total_hands_played', 
  'best_hand_rank', 
  'total_wins', 
  'win_rate'
);

-- Check existing friendships table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'friendships';

-- Expected results:
-- - friend_requests table created
-- - notifications table created
-- - New columns added to user_profiles
-- - friendships table uses requester_id/addressee_id (existing)

-- ============================================
-- SUCCESS!
-- ============================================
-- Migration complete. Now update routes/social.js to use existing schema.

