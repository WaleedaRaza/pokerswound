# Room Status Schema - Clear Lifecycle Definition

## Problem
Current status values are inconsistent:
- Backend uses: `'active'` (lowercase) in queries
- Database has: `'WAITING'`, `'ACTIVE'` (uppercase) in actual data
- Semantics unclear: What's the difference between a waiting room and an active room?

## Solution: 3-State Lifecycle

### Status Types (Enum)

```sql
CREATE TYPE room_status AS ENUM (
  'active',    -- Room has players (in seats or playing)
  'inactive',  -- Room exists but empty (no players seated)
  'closed'     -- Room terminated/deleted (cleanup complete)
);
```

### State Definitions

| Status | Meaning | Transition From | Transition To |
|--------|---------|-----------------|---------------|
| `inactive` | Room created, no players seated yet | N/A (initial) | `active` (first player joins) |
| `active` | ≥1 player seated (game may or may not be running) | `inactive` | `closed` (host closes) |
| `closed` | Room terminated, cleanup done | `active`, `inactive` | N/A (final) |

### Key Insights

1. **Game state ≠ Room state**
   - Room `active` = players present
   - Game `active` = hand in progress (tracked separately in `game_states` table)

2. **Empty room = `inactive`, not `closed`**
   - If all players leave → room becomes `inactive` (can be rejoined)
   - Host explicitly closes → room becomes `closed` (permanent)

3. **Room limit counts `active` + `inactive`**
   - Query: `WHERE status != 'closed'`
   - Only `closed` rooms don't count toward limit

### Migration Strategy

```sql
-- Step 1: Add new enum type
CREATE TYPE room_status AS ENUM ('active', 'inactive', 'closed');

-- Step 2: Add temp column
ALTER TABLE rooms ADD COLUMN status_new room_status;

-- Step 3: Migrate data
UPDATE rooms SET status_new = 
  CASE 
    WHEN UPPER(status) = 'WAITING' THEN 'inactive'::room_status
    WHEN UPPER(status) = 'ACTIVE' THEN 'active'::room_status
    WHEN UPPER(status) = 'CLOSED' THEN 'closed'::room_status
    ELSE 'inactive'::room_status  -- Default for unknown
  END;

-- Step 4: Drop old, rename new
ALTER TABLE rooms DROP COLUMN status;
ALTER TABLE rooms RENAME COLUMN status_new TO status;
ALTER TABLE rooms ALTER COLUMN status SET DEFAULT 'inactive';
ALTER TABLE rooms ALTER COLUMN status SET NOT NULL;
```

## Triggers to Maintain Status

### Auto-activate on player join
```sql
CREATE OR REPLACE FUNCTION auto_activate_room()
RETURNS TRIGGER AS $$
BEGIN
  -- When first player joins, mark room as active
  UPDATE rooms 
  SET status = 'active', updated_at = NOW()
  WHERE id = NEW.room_id 
    AND status = 'inactive';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER room_auto_activate
AFTER INSERT ON room_seats
FOR EACH ROW
EXECUTE FUNCTION auto_activate_room();
```

### Auto-deactivate on last player leave
```sql
CREATE OR REPLACE FUNCTION auto_deactivate_room()
RETURNS TRIGGER AS $$
BEGIN
  -- When last player leaves, mark room as inactive
  IF NOT EXISTS (SELECT 1 FROM room_seats WHERE room_id = OLD.room_id) THEN
    UPDATE rooms 
    SET status = 'inactive', updated_at = NOW()
    WHERE id = OLD.room_id 
      AND status = 'active';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER room_auto_deactivate
AFTER DELETE ON room_seats
FOR EACH ROW
EXECUTE FUNCTION auto_deactivate_room();
```

## Backend Usage

### Room Creation
```javascript
// New rooms start as 'inactive'
await db.query(
  `INSERT INTO rooms (name, host_user_id, status, ...)
   VALUES ($1, $2, 'inactive', ...)`
);
```

### Room Limit Check
```javascript
// Count all non-closed rooms
const result = await db.query(
  `SELECT COUNT(*) FROM rooms 
   WHERE host_user_id = $1 AND status != 'closed'`
);
```

### Room List (My Rooms)
```javascript
// Show active and inactive separately
const active = await db.query(
  `SELECT * FROM rooms 
   WHERE host_user_id = $1 AND status = 'active'`
);

const inactive = await db.query(
  `SELECT * FROM rooms 
   WHERE host_user_id = $1 AND status = 'inactive'`
);
```

### Close Room (Host Action)
```javascript
await db.query(
  `UPDATE rooms 
   SET status = 'closed', updated_at = NOW()
   WHERE id = $1 AND host_user_id = $2`
);
```

## Benefits

1. ✅ **Clear semantics** - status name matches actual state
2. ✅ **Type safety** - PostgreSQL enum prevents invalid values
3. ✅ **Auto-management** - triggers keep status in sync with player count
4. ✅ **Accurate limits** - counts all "open" rooms (active + inactive)
5. ✅ **Case consistency** - lowercase everywhere, enforced by enum

## Next Steps

1. Run migration to convert existing data
2. Update all backend queries to use new status values
3. Update frontend to handle 3 states (instead of ambiguous WAITING/ACTIVE)
4. Add triggers for auto status management
5. Test room lifecycle (create → join → leave → close)

