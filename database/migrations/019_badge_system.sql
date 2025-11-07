-- Migration: Badge and Achievement System
-- Date: 2025-11-06
-- Purpose: Create badge definitions and user badge tracking

-- Badge definitions table
CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT '🏆',
  category VARCHAR(50) DEFAULT 'milestone', -- 'milestone', 'performance', 'style', 'social'
  criteria JSONB NOT NULL, -- Conditions to unlock (e.g., {"hands_played": 100})
  rarity VARCHAR(20) DEFAULT 'common', -- 'common', 'rare', 'epic', 'legendary'
  xp_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

-- User badges (earned badges)
CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  progress JSONB, -- For multi-step badges (e.g., {"current": 50, "target": 100})
  UNIQUE(user_id, badge_id)
);

-- User ranks/levels
CREATE TABLE IF NOT EXISTS user_ranks (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  experience_points BIGINT DEFAULT 0,
  rank_title VARCHAR(50) DEFAULT 'Novice',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_definitions_category ON badge_definitions(category);

-- Insert basic milestone badges
INSERT INTO badge_definitions (name, description, icon, category, criteria, rarity, xp_reward) VALUES
  ('First Hand', 'Play your first hand', '🎯', 'milestone', '{"hands_played": 1}', 'common', 10),
  ('Century Club', 'Play 100 hands', '💯', 'milestone', '{"hands_played": 100}', 'common', 100),
  ('Thousand Hands', 'Play 1,000 hands', '🔥', 'milestone', '{"hands_played": 1000}', 'rare', 500),
  ('Big Pot Winner', 'Win a pot over $500', '💰', 'performance', '{"biggest_pot": 500}', 'rare', 200),
  ('Hot Streak', 'Win 5 hands in a row', '🔥', 'performance', '{"win_streak": 5}', 'epic', 300),
  ('Royal Flush', 'Get a royal flush', '👑', 'performance', '{"best_hand_rank": 1}', 'legendary', 1000),
  ('Tight Aggressive', 'VPIP < 25% and PFR > 20%', '🎯', 'style', '{"vpip_max": 25, "pfr_min": 20}', 'rare', 250),
  ('Friend Collector', 'Add 10 friends', '👥', 'social', '{"friends_count": 10}', 'common', 150)
ON CONFLICT (name) DO NOTHING;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badges(user_id_param UUID)
RETURNS TABLE(badge_id UUID, badge_name VARCHAR) AS $$
DECLARE
  badge_record RECORD;
  user_stats RECORD;
  criteria_met BOOLEAN;
BEGIN
  -- Get user stats
  SELECT 
    up.total_hands_played,
    up.biggest_pot,
    up.best_hand,
    ps.current_win_streak,
    ps.vpip_percentage,
    ps.pfr_percentage,
    (SELECT COUNT(*) FROM friendships WHERE requester_id = user_id_param OR addressee_id = user_id_param) as friends_count
  INTO user_stats
  FROM user_profiles up
  LEFT JOIN player_statistics ps ON ps.user_id = up.id
  WHERE up.id = user_id_param;
  
  -- Check each badge
  FOR badge_record IN 
    SELECT * FROM badge_definitions 
    WHERE id NOT IN (SELECT badge_id FROM user_badges WHERE user_id = user_id_param)
  LOOP
    criteria_met := false;
    
    -- Check criteria based on badge type
    CASE badge_record.name
      WHEN 'First Hand' THEN
        criteria_met := (user_stats.total_hands_played >= 1);
      WHEN 'Century Club' THEN
        criteria_met := (user_stats.total_hands_played >= 100);
      WHEN 'Thousand Hands' THEN
        criteria_met := (user_stats.total_hands_played >= 1000);
      WHEN 'Big Pot Winner' THEN
        criteria_met := (user_stats.biggest_pot >= 500);
      WHEN 'Hot Streak' THEN
        criteria_met := (user_stats.current_win_streak >= 5);
      WHEN 'Royal Flush' THEN
        criteria_met := (user_stats.best_hand LIKE '%Royal Flush%');
      WHEN 'Tight Aggressive' THEN
        criteria_met := (user_stats.vpip_percentage < 25 AND user_stats.pfr_percentage > 20);
      WHEN 'Friend Collector' THEN
        criteria_met := (user_stats.friends_count >= 10);
    END CASE;
    
    -- Award badge if criteria met
    IF criteria_met THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (user_id_param, badge_record.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;
      
      -- Award XP
      UPDATE user_ranks
      SET experience_points = experience_points + badge_record.xp_reward,
          updated_at = NOW()
      WHERE user_id = user_id_param;
      
      -- Return badge info
      badge_id := badge_record.id;
      badge_name := badge_record.name;
      RETURN NEXT;
    END IF;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check badges after profile update
CREATE OR REPLACE FUNCTION trigger_check_badges()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM check_and_award_badges(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_badges_on_profile_update
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  WHEN (OLD.total_hands_played IS DISTINCT FROM NEW.total_hands_played 
     OR OLD.biggest_pot IS DISTINCT FROM NEW.biggest_pot
     OR OLD.best_hand IS DISTINCT FROM NEW.best_hand)
  EXECUTE FUNCTION trigger_check_badges();

-- Initialize user_ranks for existing users
INSERT INTO user_ranks (user_id, level, experience_points, rank_title)
SELECT id, 1, 0, 'Novice'
FROM user_profiles
WHERE id NOT IN (SELECT user_id FROM user_ranks)
ON CONFLICT (user_id) DO NOTHING;

SELECT 'Migration 019 completed - Badge system created' AS result;

