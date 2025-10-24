# 🔧 Schema Fixes Log

**Purpose:** Track all database schema mismatches fixed during modularization testing  
**Date:** October 24, 2025

---

## 🐛 Issue 1: Auth Sync Email Column

**Error:**
```
❌ User sync error: error: column "email" does not exist
   at routes\auth.js:69:29
```

**Root Cause:**
- `routes/auth.js` was querying `email` column from `user_profiles` table
- `user_profiles` table doesn't have an `email` column (only `id`, `username`, `display_name`, etc.)
- Email is stored in Supabase's `auth.users` table, not `user_profiles`

**Fix:**
- Removed all `email` references from SELECT and INSERT queries
- Changed `SELECT id, username, email FROM user_profiles` → `SELECT id, username, display_name FROM user_profiles`
- Changed `INSERT INTO user_profiles (id, username, email, display_name, ...)` → `INSERT INTO user_profiles (id, username, display_name, ...)`

**Files Modified:**
- `routes/auth.js` (lines 70, 77, 87)

**Status:** ✅ Fixed

---

## 🐛 Issue 2: Lobby Join - User Profile Primary Key

**Error:**
```
❌ Join lobby error: error: column "user_id" does not exist
   at routes\rooms.js:235:26
```

**Root Cause:**
- `routes/rooms.js` was querying `user_profiles` using `user_id` as the column name
- The actual schema uses `id` as the primary key, not `user_id`

**Schema Reference:**
```sql
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,           -- ✅ Primary key is 'id'
  username character varying NOT NULL UNIQUE,
  ...
)
```

**Fix:**
- Line 236: Changed `SELECT user_id FROM user_profiles WHERE user_id = $1` → `SELECT id FROM user_profiles WHERE id = $1`
- Line 243: Changed `INSERT INTO user_profiles (user_id, username, created_at)` → `INSERT INTO user_profiles (id, username, created_at)`
- Line 245: Changed `ON CONFLICT (user_id) DO NOTHING` → `ON CONFLICT (id) DO NOTHING`

**Files Modified:**
- `routes/rooms.js` (lines 236, 243, 245)

**Status:** ✅ Fixed

---

## 🐛 Issue 3: Get Lobby Players - JOIN Clause

**Error:**
```
❌ Get lobby players error: error: column up.user_id does not exist
   at routes\rooms.js:296:20
   hint: Perhaps you meant to reference the column "rp.user_id".
```

**Root Cause:**
- JOIN clause was using `up.user_id` to join `room_players` with `user_profiles`
- `user_profiles` table uses `id` as its primary key, not `user_id`
- `room_players.user_id` should join with `user_profiles.id`

**Schema Reference:**
```sql
-- room_players has user_id as a foreign key
CREATE TABLE public.room_players (
  id uuid NOT NULL,
  room_id uuid NOT NULL,
  user_id uuid NOT NULL,     -- ✅ Foreign key to user_profiles.id
  ...
)

-- user_profiles has id as primary key
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,           -- ✅ Primary key
  username character varying NOT NULL,
  ...
)
```

**Fix:**
- Line 299: Changed `LEFT JOIN user_profiles up ON rp.user_id = up.user_id` → `LEFT JOIN user_profiles up ON rp.user_id = up.id`

**Files Modified:**
- `routes/rooms.js` (line 299)

**Status:** ✅ Fixed

---

## 📋 Summary

**Total Schema Issues Found:** 3  
**Total Files Modified:** 2
- `routes/auth.js`
- `routes/rooms.js`

**Common Pattern:**
The code was inconsistently using `user_id` when the actual database schema uses `id` as the primary key for `user_profiles`.

**Root Cause Analysis:**
These errors were introduced during modularization when endpoints were copy-pasted from the monolith. The monolith likely had similar issues that went unnoticed or were working against an older schema.

**Prevention:**
1. Always cross-reference `Schemasnapshot.txt` before writing SQL queries
2. Use consistent naming conventions across the codebase
3. Consider using an ORM or query builder to catch these at compile time
4. Add integration tests for database queries

---

## ✅ Verification

After fixes:
1. ✅ Server starts without errors
2. ✅ User can sign in (Google or Guest)
3. ✅ User sync completes successfully
4. ✅ User can join their own lobby
5. ✅ Lobby players list loads correctly

**Next Test:** Second user joining the lobby

---

---

## 🐛 Issue 4: Missing Socket.IO Broadcasts

**Error:**
```
User report: "The second player joins the lobby on their screen, 
but the host doesn't see them in their lobby"
```

**Root Cause:**
- Lobby endpoints (`/lobby/join`, `/lobby/approve`, `/lobby/reject`) were missing Socket.IO broadcast logic
- Database was updated correctly, but no real-time events were emitted to other clients
- Frontend had listeners (`player_joined`, `player_approved`) but backend wasn't emitting the events

**Fix:**
Added Socket.IO broadcasts to 3 endpoints:

1. **POST /api/rooms/:roomId/lobby/join**:
   - Added `io.to('room:${roomId}').emit('player_joined', ...)`
   - Broadcasts when a new player joins the lobby

2. **POST /api/rooms/:roomId/lobby/approve**:
   - Added `io.to('room:${roomId}').emit('player_approved', ...)`
   - Broadcasts when host approves a player

3. **POST /api/rooms/:roomId/lobby/reject**:
   - Added `io.to('room:${roomId}').emit('player_rejected', ...)`
   - Broadcasts when host rejects a player

**Key Adjustments:**
- Changed event name from `lobby_updated` to `player_joined` (to match frontend listeners)
- Changed property names from `user_id` to `userId` (camelCase for JavaScript consistency)

**Files Modified:**
- `routes/rooms.js` (lines 282-292, 359-367, 410-417)

**Status:** ✅ Fixed

---

---

## 🐛 Issue 5: Seat Broadcast Parameter Mismatch

**Error:**
```
Seat broadcast failed: getDb is not a function
```

**User Report:**
> "Just some errors with claiming seats. its a mess, a player claims and it says taken, but on their screen it won't properly register, the host doesn't see others taking seats and cant start game"

**Root Cause:**
- `broadcastSeats` function requires THREE parameters: `(io, getDb, roomId)`
- Function was being called with only ONE parameter: `broadcastSeats(roomId)`
- This caused parameter shifting: `io=roomId`, `getDb=undefined`, `roomId=undefined`
- Result: `getDb()` threw "getDb is not a function" error

**Fix:**
Fixed function calls in `sophisticated-engine-server.js`:
- Line 439 (claimSeat): `broadcastSeats(roomId)` → `broadcastSeats(io, getDb, roomId)`
- Line 456 (releaseSeat): `broadcastSeats(roomId)` → `broadcastSeats(io, getDb, roomId)`

**Files Modified:**
- `sophisticated-engine-server.js` (lines 439, 456)

**Status:** ✅ Fixed

---

## 🎯 Next Steps

1. ✅ Fix schema mismatches (auth, lobby join, lobby players)
2. ✅ Add Socket.IO broadcasts for real-time lobby updates
3. ✅ Fix seat broadcast parameter mismatch
4. 🔄 **NOW TESTING:** Seat claiming (should broadcast to all players in real-time)
5. Test game start
6. Test full game flow (deal, actions, showdown)
7. Complete full test plan in `MODULARIZATION_TEST_PLAN.md`

