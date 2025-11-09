-- Migration: Rank System MVP
-- Date: 2025-11-06
-- Purpose: Add rank tiers, remove playstyle badges, add launch badges

-- 1. Create user_ranks table if it doesn't exist (in case migration 019 wasn't run)
CREATE TABLE IF NOT EXISTS user_ranks (
  user_id UUID PRIMARY KEY REFERENCES user_profiles(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1,
  experience_points BIGINT DEFAULT 0,
  rank_title VARCHAR(50) DEFAULT 'Novice',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add rank_tier and hands_played to user_ranks
ALTER TABLE user_ranks
  ADD COLUMN IF NOT EXISTS rank_tier VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hands_played BIGINT DEFAULT 0;

-- 3. Simple rank calculation function
CREATE OR REPLACE FUNCTION calculate_rank_tier(hands BIGINT)
RETURNS VARCHAR(50) AS $$
BEGIN
  CASE
    WHEN hands >= 1000000 THEN RETURN 'MASTER';
    WHEN hands >= 100000 THEN RETURN 'EXPERT';
    WHEN hands >= 10000 THEN RETURN 'SKILLED';
    WHEN hands >= 1000 THEN RETURN 'COMPETENT';
    WHEN hands >= 100 THEN RETURN 'APPRENTICE';
    ELSE RETURN 'NOVICE';
  END CASE;
END;
$$ LANGUAGE plpgsql;

-- 4. Function to update rank when hands played changes
CREATE OR REPLACE FUNCTION update_rank_on_hands()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure user_ranks row exists
  INSERT INTO user_ranks (user_id, level, experience_points, rank_title, rank_tier, hands_played, updated_at)
  VALUES (NEW.id, 1, 0, 'Novice', calculate_rank_tier(NEW.total_hands_played), NEW.total_hands_played, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET 
    rank_tier = calculate_rank_tier(NEW.total_hands_played),
    hands_played = NEW.total_hands_played,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists, then create
DROP TRIGGER IF EXISTS update_rank_trigger ON user_profiles;
CREATE TRIGGER update_rank_trigger
  AFTER UPDATE OF total_hands_played ON user_profiles
  FOR EACH ROW
  WHEN (OLD.total_hands_played IS DISTINCT FROM NEW.total_hands_played)
  EXECUTE FUNCTION update_rank_on_hands();

-- 5. Create badge tables if they don't exist (in case migration 019 wasn't run)
CREATE TABLE IF NOT EXISTS badge_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50) DEFAULT '🏆',
  category VARCHAR(50) DEFAULT 'milestone',
  criteria JSONB NOT NULL,
  rarity VARCHAR(20) DEFAULT 'common',
  xp_reward INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badge_definitions(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  progress JSONB,
  UNIQUE(user_id, badge_id)
);

-- 6. Remove playstyle badges (MVP doesn't need these)
DELETE FROM badge_definitions WHERE name IN (
  'Tight Aggressive', 'Loose Aggressive', 'Rock', 'Maniac', 'Calling Station', 'Nit'
);

-- 7. Add launch_exclusive and expires_at columns to badge_definitions if they don't exist
ALTER TABLE badge_definitions
  ADD COLUMN IF NOT EXISTS launch_exclusive BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 8. Add MVP milestone badges (if they don't exist)
INSERT INTO badge_definitions (name, description, icon, category, criteria, rarity, xp_reward) VALUES
  ('First Hand', 'Play your first hand', '🎯', 'milestone', '{"hands_played": 1}', 'common', 10),
  ('Century Club', 'Play 100 hands', '💯', 'milestone', '{"hands_played": 100}', 'common', 100),
  ('Thousand Hands', 'Play 1,000 hands', '🔥', 'milestone', '{"hands_played": 1000}', 'rare', 500),
  ('Ten Thousand', 'Play 10,000 hands', '💪', 'milestone', '{"hands_played": 10000}', 'rare', 2000),
  ('Hundred Thousand', 'Play 100,000 hands', '🏆', 'milestone', '{"hands_played": 100000}', 'epic', 10000),
  ('Million Hands', 'Play 1,000,000 hands', '👑', 'milestone', '{"hands_played": 1000000}', 'legendary', 50000)
ON CONFLICT (name) DO UPDATE
SET 
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  criteria = EXCLUDED.criteria,
  rarity = EXCLUDED.rarity,
  xp_reward = EXCLUDED.xp_reward;

-- 9. Add launch badges (Nov 8 - Dec 8 window)
INSERT INTO badge_definitions (name, description, icon, category, criteria, rarity, xp_reward, launch_exclusive, expires_at) VALUES
  ('Founding Member', 'Joined during launch week (Nov 8 - Dec 8)', '🌟', 'launch', '{"joined_before": "2025-12-08"}', 'legendary', 5000, true, '2025-12-08 23:59:59+00'),
  ('Day One', 'Played on launch day (Nov 8)', '☀️', 'launch', '{"joined_date": "2025-11-08"}', 'legendary', 10000, true, '2025-11-09 00:00:00+00')
ON CONFLICT (name) DO UPDATE
SET 
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  criteria = EXCLUDED.criteria,
  rarity = EXCLUDED.rarity,
  xp_reward = EXCLUDED.xp_reward,
  launch_exclusive = EXCLUDED.launch_exclusive,
  expires_at = EXCLUDED.expires_at;

-- 10. Initialize ranks for existing users
UPDATE user_ranks ur
SET 
  rank_tier = calculate_rank_tier(COALESCE(up.total_hands_played, 0)),
  hands_played = COALESCE(up.total_hands_played, 0)
FROM user_profiles up
WHERE ur.user_id = up.id;

-- 11. Create ranks for users who don't have one yet
INSERT INTO user_ranks (user_id, level, experience_points, rank_title, rank_tier, hands_played, updated_at)
SELECT 
  id, 
  1, 
  0, 
  'Novice',
  calculate_rank_tier(COALESCE(total_hands_played, 0)),
  COALESCE(total_hands_played, 0),
  NOW()
FROM user_profiles
WHERE id NOT IN (SELECT user_id FROM user_ranks)
ON CONFLICT (user_id) DO NOTHING;

SELECT 'Migration 020 completed - Rank system MVP ready' AS result;

