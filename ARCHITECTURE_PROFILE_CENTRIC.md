# 🏗️ PROFILE-CENTRIC ARCHITECTURE

**Date:** November 5, 2025  
**Philosophy:** Profile as the central, living tracker of all user interactions

---

## 🎯 CORE CONCEPT

> **The user profile is not just a static record - it's a living, breathing entity that tracks every interaction in real-time. It's the source of truth for "who you are" in the poker ecosystem.**

### Current Problem (Weak Architecture)

```
user_profiles ❌ (disconnected)
    ↓ (no link)
rooms (host_user_id only)
    ↓ (no link)
game_states (JSONB blob, no profile link)
    ↓ (strong link)
hands → player_statistics → user_profiles ✅
```

**Gap:** Profile only knows about stats AFTER hands complete. It doesn't know:
- What room you're in RIGHT NOW
- What games you've participated in
- Your room creation history
- Your participation patterns

---

## ✅ PROPER ARCHITECTURE (Strong Relationships)

```
┌─────────────────────────────────────────────────────────┐
│                   USER PROFILE                          │
│              (Central Living Tracker)                    │
├─────────────────────────────────────────────────────────┤
│ Real-Time State (What's happening NOW)                  │
│  • currently_in_room_id                                 │
│  • current_game_id                                      │
│  • is_playing (boolean)                                 │
│  • last_active_at                                       │
│  • current_seat_index                                   │
├─────────────────────────────────────────────────────────┤
│ Lifetime Aggregates (Historical totals)                 │
│  • total_rooms_created                                  │
│  • total_rooms_joined                                   │
│  • total_games_started                                  │
│  • total_games_completed                                │
│  • total_hands_played ✅                                │
│  • total_wins ✅                                        │
│  • total_winnings ✅                                    │
├─────────────────────────────────────────────────────────┤
│ Relationships (Tracked participation)                   │
│  • room_participations (which rooms)                    │
│  • game_participations (which games)                    │
│  • friendships ✅                                       │
└─────────────────────────────────────────────────────────┘
       ↓ triggers ↓ updates ↓ syncs
       
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    ROOMS     │  │    GAMES     │  │    HANDS     │
│              │  │              │  │              │
│ host_id      │→ │ room_id      │→ │ game_id      │
│ created_at   │  │ started_at   │  │ completed_at │
└──────────────┘  └──────────────┘  └──────────────┘
       ↓                 ↓                 ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│room_players  │  │game_players  │  │player_stats  │
│(who joined)  │  │(who played)  │  │(results)     │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 📊 NEW DATA STRUCTURES NEEDED

### 1. Room Participation Tracking

```sql
CREATE TABLE room_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  room_id UUID NOT NULL REFERENCES rooms(id),
  
  -- Participation details
  joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
  left_at TIMESTAMP,
  
  -- Role
  was_host BOOLEAN DEFAULT FALSE,
  
  -- Activity metrics
  hands_played INTEGER DEFAULT 0,
  games_completed INTEGER DEFAULT 0,
  total_winnings BIGINT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(user_id, room_id)
);

CREATE INDEX idx_room_participations_user ON room_participations(user_id);
CREATE INDEX idx_room_participations_room ON room_participations(room_id);
```

**Purpose:** Track every room a user has ever joined, including duration and outcomes.

---

### 2. Game Completion Tracking

```sql
CREATE TABLE game_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id TEXT NOT NULL UNIQUE,
  room_id UUID NOT NULL REFERENCES rooms(id),
  
  -- Timing
  started_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NOT NULL,
  duration_seconds INTEGER,
  
  -- Host info
  host_user_id UUID REFERENCES user_profiles(id),
  
  -- Game details
  total_hands_played INTEGER NOT NULL,
  total_pot_size BIGINT,
  
  -- Participants (array of user_ids)
  player_ids UUID[] NOT NULL,
  
  -- Winner (if applicable)
  winner_user_id UUID REFERENCES user_profiles(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_game_completions_room ON game_completions(room_id);
CREATE INDEX idx_game_completions_host ON game_completions(host_user_id);
CREATE INDEX idx_game_completions_winner ON game_completions(winner_user_id);
```

**Purpose:** Permanent record of every completed game, who played, outcomes.

---

### 3. Enhanced User Profile Schema

```sql
-- Add real-time tracking columns
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS currently_in_room_id UUID REFERENCES rooms(id),
  ADD COLUMN IF NOT EXISTS current_game_id TEXT,
  ADD COLUMN IF NOT EXISTS is_playing BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS current_seat_index INTEGER,
  ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT NOW();

-- Add aggregate counters
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS total_rooms_created INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_rooms_joined INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_games_started INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_games_completed INTEGER DEFAULT 0;
```

---

## 🔄 AUTO-SYNC TRIGGERS

### Trigger 1: Room Join
```sql
CREATE OR REPLACE FUNCTION track_room_join()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user profile
  UPDATE user_profiles
  SET 
    currently_in_room_id = NEW.room_id,
    total_rooms_joined = total_rooms_joined + 1,
    last_active_at = NOW()
  WHERE id = NEW.user_id;
  
  -- Record participation
  INSERT INTO room_participations (user_id, room_id, joined_at)
  VALUES (NEW.user_id, NEW.room_id, NOW())
  ON CONFLICT (user_id, room_id) DO UPDATE
  SET joined_at = NOW(), left_at = NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_joins_room
AFTER INSERT ON room_seats
FOR EACH ROW
EXECUTE FUNCTION track_room_join();
```

### Trigger 2: Room Leave
```sql
CREATE OR REPLACE FUNCTION track_room_leave()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user profile (clear current room)
  UPDATE user_profiles
  SET 
    currently_in_room_id = NULL,
    is_playing = FALSE,
    current_game_id = NULL,
    current_seat_index = NULL,
    last_active_at = NOW()
  WHERE id = OLD.user_id;
  
  -- Mark participation as ended
  UPDATE room_participations
  SET left_at = NOW()
  WHERE user_id = OLD.user_id 
    AND room_id = OLD.room_id 
    AND left_at IS NULL;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_leaves_room
AFTER DELETE ON room_seats
FOR EACH ROW
EXECUTE FUNCTION track_room_leave();
```

### Trigger 3: Game Start
```sql
CREATE OR REPLACE FUNCTION track_game_start()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    -- Update all players in this room
    UPDATE user_profiles
    SET 
      is_playing = TRUE,
      current_game_id = NEW.game_id,
      total_games_started = total_games_started + 1,
      last_active_at = NOW()
    WHERE currently_in_room_id = NEW.room_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_starts
AFTER UPDATE ON game_states
FOR EACH ROW
EXECUTE FUNCTION track_game_start();
```

### Trigger 4: Game Complete
```sql
CREATE OR REPLACE FUNCTION track_game_complete()
RETURNS TRIGGER AS $$
DECLARE
  player_ids UUID[];
  host_id UUID;
BEGIN
  -- Get all player IDs who played
  SELECT ARRAY_AGG(DISTINCT user_id) INTO player_ids
  FROM room_seats
  WHERE room_id = NEW.room_id;
  
  -- Get host
  SELECT host_user_id INTO host_id
  FROM rooms
  WHERE id = NEW.room_id;
  
  -- Create game completion record
  INSERT INTO game_completions (
    game_id,
    room_id,
    host_user_id,
    started_at,
    completed_at,
    total_hands_played,
    player_ids
  ) VALUES (
    NEW.game_id,
    NEW.room_id,
    host_id,
    NEW.created_at,
    NOW(),
    NEW.hand_number,
    player_ids
  );
  
  -- Update all players' game completion count
  UPDATE user_profiles
  SET 
    total_games_completed = total_games_completed + 1,
    is_playing = FALSE,
    current_game_id = NULL,
    last_active_at = NOW()
  WHERE id = ANY(player_ids);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_completes
AFTER UPDATE ON game_states
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
EXECUTE FUNCTION track_game_complete();
```

### Trigger 5: Room Creation
```sql
CREATE OR REPLACE FUNCTION track_room_creation()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles
  SET 
    total_rooms_created = total_rooms_created + 1,
    last_active_at = NOW()
  WHERE id = NEW.host_user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER room_created
AFTER INSERT ON rooms
FOR EACH ROW
EXECUTE FUNCTION track_room_creation();
```

---

## 🔍 QUERY PATTERNS ENABLED

### Real-Time Profile State
```sql
SELECT 
  username,
  currently_in_room_id,
  current_game_id,
  is_playing,
  last_active_at
FROM user_profiles
WHERE id = 'user-id';
```

### User's Room History
```sql
SELECT 
  r.name,
  rp.joined_at,
  rp.left_at,
  rp.was_host,
  rp.hands_played,
  rp.total_winnings
FROM room_participations rp
JOIN rooms r ON r.id = rp.room_id
WHERE rp.user_id = 'user-id'
ORDER BY rp.joined_at DESC;
```

### User's Game History
```sql
SELECT 
  gc.game_id,
  r.name as room_name,
  gc.started_at,
  gc.completed_at,
  gc.total_hands_played,
  CASE 
    WHEN gc.winner_user_id = 'user-id' THEN 'WON'
    ELSE 'LOST'
  END as result
FROM game_completions gc
JOIN rooms r ON r.id = gc.room_id
WHERE 'user-id' = ANY(gc.player_ids)
ORDER BY gc.completed_at DESC;
```

### Complete Profile Dashboard
```sql
SELECT 
  -- Identity
  username,
  display_name,
  avatar_url,
  
  -- Current State
  currently_in_room_id,
  is_playing,
  last_active_at,
  
  -- Lifetime Aggregates
  total_rooms_created,
  total_rooms_joined,
  total_games_completed,
  total_hands_played,
  total_wins,
  win_rate,
  total_winnings,
  
  -- Friends
  (SELECT COUNT(*) FROM friendships WHERE requester_id = user_profiles.id OR addressee_id = user_profiles.id) as friend_count
  
FROM user_profiles
WHERE id = 'user-id';
```

---

## 🎯 BENEFITS OF THIS ARCHITECTURE

### 1. **Real-Time Awareness**
Profile always knows where you are and what you're doing.

### 2. **Complete History**
Every room visit, every game played - all tracked.

### 3. **Automatic Updates**
Triggers handle all the bookkeeping. No manual updates needed.

### 4. **Rich Analytics**
Can query: "Show me all games I played in November" or "Which rooms did I play in most?"

### 5. **Reconnection Support**
If disconnected, profile knows which room/game to rejoin.

### 6. **Social Features**
"Your friend John is currently playing in Room X" - easy to implement.

---

## 🔧 IMPLEMENTATION PLAN

### Phase 1: Schema (Migration 06)
1. Create `room_participations` table
2. Create `game_completions` table
3. Add real-time columns to `user_profiles`
4. Add aggregate counters to `user_profiles`

### Phase 2: Triggers
1. Room join trigger
2. Room leave trigger
3. Game start trigger
4. Game complete trigger
5. Room creation trigger

### Phase 3: Backfill
1. Populate `room_participations` from existing `room_seats`
2. Create `game_completions` from `hand_history` (estimate games)
3. Update profile aggregates from history

### Phase 4: Application Integration
1. Update frontend to show real-time state
2. Add "Currently Playing" indicator
3. Add game history view
4. Add room participation history

---

## 💡 KEY INSIGHT

> **The profile is not passive - it's an active participant in the system. Every action updates it, every state change reflects in it. It's the living memory of the user's poker journey.**

This transforms:
```
User → plays game → stats update later
```

Into:
```
User → joins room → profile.currently_in_room_id = X
     → game starts → profile.is_playing = true
     → hand ends → profile.total_hands++
     → game ends → profile.total_games++, is_playing = false
     → leaves room → profile.currently_in_room_id = null
```

**Everything is tracked. Everything is connected. The profile is the source of truth.**

---

**Next Step:** Create Migration 06 with this complete architecture.

