-- Fix room_seats table schema
-- Add missing columns if they don't exist

DO $$ 
BEGIN
    -- Add left_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='room_seats' AND column_name='left_at') THEN
        ALTER TABLE room_seats ADD COLUMN left_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='room_seats' AND column_name='status') THEN
        ALTER TABLE room_seats ADD COLUMN status VARCHAR(20) DEFAULT 'occupied' 
            CHECK (status IN ('occupied', 'reserved', 'empty'));
    END IF;
    
    -- Add chips_in_play if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='room_seats' AND column_name='chips_in_play') THEN
        ALTER TABLE room_seats ADD COLUMN chips_in_play INTEGER DEFAULT 0 CHECK (chips_in_play >= 0);
    END IF;
    
    -- Add seat_index if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='room_seats' AND column_name='seat_index') THEN
        ALTER TABLE room_seats ADD COLUMN seat_index INTEGER NOT NULL DEFAULT 0 
            CHECK (seat_index >= 0 AND seat_index < 10);
    END IF;
    
    -- Add room_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='room_seats' AND column_name='room_id') THEN
        ALTER TABLE room_seats ADD COLUMN room_id UUID REFERENCES rooms(id) ON DELETE CASCADE;
    END IF;
    
    -- Add user_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='room_seats' AND column_name='user_id') THEN
        ALTER TABLE room_seats ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

SELECT 'Room seats table fixed!' as result;

