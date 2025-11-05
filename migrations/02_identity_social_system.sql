-- ============================================
-- PHASE 1 MVP: IDENTITY & SOCIAL FEATURES
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- ============================================
-- 1. USERNAME SYSTEM
-- ============================================

-- Add username column to user_profiles
ALTER TABLE user_profiles 
  ADD COLUMN IF NOT EXISTS username VARCHAR(30) UNIQUE,
  ADD COLUMN IF NOT EXISTS username_set_at TIMESTAMP,
  ADD CONSTRAINT username_format CHECK (username ~ '^[a-zA-Z0-9_]{3,20}$');

-- Create index for fast username lookups
CREATE INDEX IF NOT EXISTS idx_username ON user_profiles(username);

-- Create function to check username availability
CREATE OR REPLACE FUNCTION check_username_available(username_input TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE username = username_input
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN user_profiles.username IS 'Unique username (3-20 chars, alphanumeric + underscore)';


-- ============================================
-- 2. PROFILE STATS (for profile modal)
-- ============================================

-- Add stats columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS total_hands_played INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_games_played INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS best_hand_rank VARCHAR(50),
  ADD COLUMN IF NOT EXISTS best_hand_cards TEXT,
  ADD COLUMN IF NOT EXISTS total_wins INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_winnings BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS biggest_pot_won BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS win_rate DECIMAL(5,2) DEFAULT 0.00;

COMMENT ON COLUMN user_profiles.total_hands_played IS 'Total hands played across all games';
COMMENT ON COLUMN user_profiles.best_hand_rank IS 'Best poker hand achieved (e.g., Royal Flush)';
COMMENT ON COLUMN user_profiles.win_rate IS 'Win rate percentage (0-100)';


-- ============================================
-- 3. FRIENDS SYSTEM
-- ============================================

-- Create friendships table (mutual relationship)
CREATE TABLE IF NOT EXISTS friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure no duplicate friendships
  UNIQUE(user_id, friend_id),
  
  -- Prevent self-friending
  CHECK (user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON friendships(friend_id);

COMMENT ON TABLE friendships IS 'Mutual friend relationships (bidirectional)';


-- Create friend_requests table (pending requests)
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
-- 4. NOTIFICATIONS SYSTEM
-- ============================================

-- Create notifications table
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
-- 5. HELPER FUNCTIONS
-- ============================================

-- Function to get friend count
CREATE OR REPLACE FUNCTION get_friend_count(user_id_input UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) FROM friendships 
    WHERE user_id = user_id_input OR friend_id = user_id_input
  );
END;
$$ LANGUAGE plpgsql;


-- Function to check if users are friends
CREATE OR REPLACE FUNCTION are_friends(user_id_1 UUID, user_id_2 UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM friendships 
    WHERE (user_id = user_id_1 AND friend_id = user_id_2)
       OR (user_id = user_id_2 AND friend_id = user_id_1)
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
-- 6. VERIFICATION QUERIES
-- ============================================

-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('friendships', 'friend_requests', 'notifications');

-- Verify username column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name = 'username';

-- Verify stats columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('total_hands_played', 'total_games_played', 'best_hand_rank');

-- Expected results:
-- - 3 tables (friendships, friend_requests, notifications)
-- - username column in user_profiles
-- - Stats columns in user_profiles

-- ============================================
-- SUCCESS!
-- ============================================
-- Now run the server and implement the API endpoints in routes/social.js

