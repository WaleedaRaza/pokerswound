-- Add lobby system to rooms table

DO $$ 
BEGIN
    -- Add lobby_status column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='rooms' AND column_name='lobby_status') THEN
        ALTER TABLE rooms ADD COLUMN lobby_status VARCHAR(20) DEFAULT 'lobby' 
            CHECK (lobby_status IN ('lobby', 'playing', 'completed'));
    END IF;
    
    -- Add host_user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='rooms' AND column_name='host_user_id') THEN
        ALTER TABLE rooms ADD COLUMN host_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    -- Create room_players table for lobby management
    CREATE TABLE IF NOT EXISTS room_players (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'left')),
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        approved_at TIMESTAMP WITH TIME ZONE,
        UNIQUE(room_id, user_id)
    );
    
    CREATE INDEX IF NOT EXISTS idx_room_players_room ON room_players(room_id);
    CREATE INDEX IF NOT EXISTS idx_room_players_status ON room_players(room_id, status);
END $$;

SELECT 'Lobby system added!' as result;

