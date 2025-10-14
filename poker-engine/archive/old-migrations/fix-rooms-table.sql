-- Fix rooms table schema to match what the code expects
-- Add missing columns if they don't exist

DO $$ 
BEGIN
    -- Add min_buy_in if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='rooms' AND column_name='min_buy_in') THEN
        ALTER TABLE rooms ADD COLUMN min_buy_in INTEGER NOT NULL DEFAULT 100 CHECK (min_buy_in > 0);
    END IF;
    
    -- Add max_buy_in if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='rooms' AND column_name='max_buy_in') THEN
        ALTER TABLE rooms ADD COLUMN max_buy_in INTEGER NOT NULL DEFAULT 10000 CHECK (max_buy_in >= min_buy_in);
    END IF;
    
    -- Add small_blind if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='rooms' AND column_name='small_blind') THEN
        ALTER TABLE rooms ADD COLUMN small_blind INTEGER NOT NULL DEFAULT 1 CHECK (small_blind > 0);
    END IF;
    
    -- Add big_blind if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='rooms' AND column_name='big_blind') THEN
        ALTER TABLE rooms ADD COLUMN big_blind INTEGER NOT NULL DEFAULT 2 CHECK (big_blind > small_blind);
    END IF;
    
    -- Add max_players if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='rooms' AND column_name='max_players') THEN
        ALTER TABLE rooms ADD COLUMN max_players INTEGER DEFAULT 9 CHECK (max_players >= 2 AND max_players <= 10);
    END IF;
    
    -- Add invite_code if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='rooms' AND column_name='invite_code') THEN
        ALTER TABLE rooms ADD COLUMN invite_code VARCHAR(10) UNIQUE;
    END IF;
    
    -- Add is_private if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='rooms' AND column_name='is_private') THEN
        ALTER TABLE rooms ADD COLUMN is_private BOOLEAN DEFAULT false;
    END IF;
    
    -- Add status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='rooms' AND column_name='status') THEN
        ALTER TABLE rooms ADD COLUMN status VARCHAR(20) DEFAULT 'waiting' 
            CHECK (status IN ('waiting', 'active', 'paused', 'completed'));
    END IF;
END $$;

SELECT 'Rooms table fixed!' as result;

