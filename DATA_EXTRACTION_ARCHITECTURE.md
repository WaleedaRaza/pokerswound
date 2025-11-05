# Data Extraction Architecture
**Philosophy: Rooms are ephemeral. Data is eternal.**

## Core Principle

When a room closes, it should be **deleted** - not archived. All valuable data has already been extracted to permanent tables in real-time.

```
Room = Container (temporary, deleted when closed)
Game Data = Gold (permanent, powers analytics)
Profile = Living Tracker (always current)
```

---

## Data Flow Layers

### Layer 1: Ephemeral (Rooms)
**Purpose:** Lobby/table for games to happen
**Lifetime:** Created → Games played → Closed → **DELETED**
**Storage:** `rooms` table

```sql
rooms (simplified):
  - id
  - name
  - host_user_id
  - created_at
  -- NO status column (if it exists in table, it's active)
```

**Room Limit:**
```sql
-- Count ALL rooms (they're all active if they exist)
SELECT COUNT(*) FROM rooms WHERE host_user_id = $1
```

**Close Room:**
```sql
-- Just delete it (data already extracted)
DELETE FROM rooms WHERE id = $1 AND host_user_id = $2
```

---

### Layer 2: Permanent Game Records

These tables capture **everything** that happened, independent of rooms:

#### 2A: `game_completions` (Game-level summary)
**When written:** Game ends (trigger on `game_states` completion)

```sql
game_completions:
  - id (unique game ID)
  - room_id (which room it happened in - for context only)
  - room_name (snapshot of room name at time of game)
  - host_user_id
  - player_ids (array of all players)
  - winner_id
  - hands_played (how many hands in this game)
  - total_pot (sum of all pots)
  - started_at
  - ended_at
  - duration_seconds
```

**Trigger:**
```sql
ON game_states UPDATE (when status becomes 'completed')
  → INSERT INTO game_completions
  → UPDATE user_profiles.total_games_completed for all players
```

#### 2B: `hand_history` (Hand-level detail)
**When written:** Each hand completes
**Purpose:** Power "hand history" feature, analytics, replays

```sql
hand_history:
  - id
  - game_id (which game this hand was part of)
  - room_id (context)
  - hand_number (1, 2, 3... within the game)
  - player_ids (who played this hand)
  - winner_id
  - pot_size
  - board_cards (community cards shown)
  - winning_hand (best hand description)
  - actions_log (JSON: all player actions - bet, raise, fold, etc.)
  - started_at
  - ended_at
```

**Trigger:**
```sql
ON hand completion
  → INSERT INTO hand_history
  → UPDATE user_profiles.total_hands_played for all players
  → UPDATE user_profiles.biggest_pot if pot > current biggest
```

#### 2C: `player_statistics` (Per-user aggregates)
**Already exists** - tracks cumulative stats per user

```sql
player_statistics:
  - user_id
  - total_hands_played
  - total_wins
  - total_losses
  - win_rate
  - biggest_pot_won
```

**Trigger:**
```sql
ON hand_history INSERT
  → UPDATE player_statistics for all players in hand
  → SYNC to user_profiles (via existing trigger)
```

---

### Layer 3: Profile (Living Tracker)

`user_profiles` is the **single source of truth** for a user's holistic poker life:

```sql
user_profiles:
  -- Identity
  - id, username, avatar
  
  -- Current State (real-time)
  - currently_in_room_id (NULL if not in a room)
  - is_playing (true if hand in progress)
  - current_game_id (active game UUID)
  
  -- Lifetime Stats (updated by triggers)
  - total_rooms_created
  - total_games_completed
  - total_hands_played
  - total_wins
  - win_rate
  - biggest_pot
  
  -- Social
  - friends (count)
  
  -- Timestamps
  - last_active_at
  - created_at, updated_at
```

---

## Data Extraction Triggers (Real-Time)

### Trigger 1: Hand Completes
```sql
CREATE TRIGGER extract_hand_data
AFTER hand completion
  1. INSERT INTO hand_history (all hand details)
  2. UPDATE player_statistics (hands_played++, wins, etc.)
  3. UPDATE user_profiles (total_hands_played++, biggest_pot if record)
```

### Trigger 2: Game Completes
```sql
CREATE TRIGGER extract_game_data
AFTER game ends
  1. INSERT INTO game_completions (game summary)
  2. UPDATE user_profiles (total_games_completed++, is_playing = false)
```

### Trigger 3: Room Closes
```sql
-- NO TRIGGER NEEDED - just DELETE
-- All data already extracted during gameplay
```

---

## Profile Modal Data Sources

When user clicks profile, show:

### Stats Tab
**Source:** `user_profiles` (always current)
- Total Games: `total_games_completed`
- Total Hands: `total_hands_played`
- Win Rate: `win_rate`
- Biggest Pot: `biggest_pot`

### Recent Games Tab
**Source:** `game_completions` WHERE `player_ids` contains user
```sql
SELECT 
  room_name,
  winner_id = $userId as won,
  hands_played,
  total_pot,
  ended_at
FROM game_completions
WHERE $userId = ANY(player_ids)
ORDER BY ended_at DESC
LIMIT 10
```

### Hand History Tab
**Source:** `hand_history` WHERE `player_ids` contains user
```sql
SELECT 
  hand_number,
  room_id,
  winner_id = $userId as won,
  pot_size,
  board_cards,
  winning_hand,
  ended_at
FROM hand_history
WHERE $userId = ANY(player_ids)
ORDER BY ended_at DESC
LIMIT 50
```

### Best Hands Tab
**Source:** `hand_history` with hand strength ranking
```sql
SELECT 
  winning_hand,
  pot_size,
  board_cards,
  ended_at
FROM hand_history
WHERE winner_id = $userId
ORDER BY hand_rank DESC, pot_size DESC
LIMIT 10
```

---

## Analytics Page Data Sources

### Global Stats
- Most active players: `SELECT user_id, total_hands_played FROM user_profiles ORDER BY DESC`
- Biggest pots: `SELECT * FROM hand_history ORDER BY pot_size DESC`
- Most games played: `SELECT user_id, total_games_completed FROM user_profiles ORDER BY DESC`

### User vs User Comparison
```sql
SELECT 
  h.winner_id,
  COUNT(*) as wins
FROM hand_history h
WHERE h.player_ids @> ARRAY[$user1, $user2]
GROUP BY h.winner_id
```

---

## Migration Strategy

### Step 1: Create `hand_history` table (NEW)
- Store every hand played with full context
- Enables replay, analysis, best hands

### Step 2: Create `game_completions` table (already in Migration 06)
- Already created, verify it's being populated

### Step 3: Add triggers for real-time extraction
- Hand completion → `hand_history` + `player_statistics` + `user_profiles`
- Game completion → `game_completions` + `user_profiles`

### Step 4: Simplify `rooms` table
- Remove `status` column (not needed - existence = active)
- Update close logic to DELETE not UPDATE

### Step 5: Update Profile Modal UI
- Fetch from permanent tables, not rooms
- Show rich history (games, hands, best hands)

---

## Benefits of This Architecture

1. ✅ **Rooms are simple** - create/delete, no status management
2. ✅ **Data is safe** - extracted in real-time, room deletion doesn't lose anything
3. ✅ **Analytics are powerful** - query `hand_history` and `game_completions` for insights
4. ✅ **Profile is rich** - shows holistic poker life across all rooms/games
5. ✅ **User-to-user relations** - compare stats, head-to-head records
6. ✅ **Scalable** - old closed rooms don't bloat database

---

## Next Steps

1. Create `hand_history` table and triggers
2. Verify `game_completions` triggers work
3. Update close room logic to DELETE
4. Build Profile Modal with tabs (Stats, Games, Hands, Best Hands)
5. Test data flow: create room → play hands → close room → verify profile has data

