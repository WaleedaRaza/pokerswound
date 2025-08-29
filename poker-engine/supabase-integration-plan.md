# Supabase Integration Plan

## Current State
- Using in-memory storage (`Map<string, GameStateModel>`)
- Data lost on server restart
- No persistence or real-time sync

## Supabase Integration Steps

### 1. Database Schema
```sql
-- Games table
CREATE TABLE games (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL,
    configuration JSONB NOT NULL,
    hand_state JSONB NOT NULL,
    current_street TEXT NOT NULL,
    to_act TEXT,
    betting_round JSONB NOT NULL,
    pot JSONB NOT NULL,
    timing JSONB NOT NULL,
    action_history JSONB[] DEFAULT '{}',
    version INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table  
CREATE TABLE players (
    id TEXT PRIMARY KEY,
    game_id TEXT REFERENCES games(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    stack INTEGER NOT NULL,
    seat_index INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    has_folded BOOLEAN DEFAULT false,
    is_all_in BOOLEAN DEFAULT false,
    has_left BOOLEAN DEFAULT false,
    bet_this_street INTEGER DEFAULT 0,
    hole_cards JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Public access for now (add auth later)
CREATE POLICY "Allow all operations" ON games FOR ALL USING (true);
CREATE POLICY "Allow all operations" ON players FOR ALL USING (true);
```

### 2. Repository Layer
- Replace `games.set()` with Supabase client
- Implement `GameRepository` and `PlayerRepository`
- Add optimistic locking with version field

### 3. Real-time Features  
- Use Supabase Realtime for live game updates
- Subscribe to game state changes
- Push updates to all clients

### 4. Implementation Priority
1. **Phase 1**: Replace in-memory storage with Supabase
2. **Phase 2**: Add real-time subscriptions
3. **Phase 3**: Add authentication and permissions
4. **Phase 4**: Add game history and analytics

## File Changes Needed
- `fixed-sophisticated-server.js` - Replace Map with Supabase client
- Add `repositories/` folder with game and player repositories
- Update game state persistence logic
- Add Supabase configuration

## Benefits
- ✅ Persistent game state
- ✅ Real-time multiplayer
- ✅ Game history
- ✅ Scalable architecture
- ✅ Built-in auth ready
