// SANDBOX ROUTER - Clean iterative testing environment
// Build one feature at a time, test, then add next

const express = require('express');
const router = express.Router();

/**
 * PHILOSOPHY:
 * - Start simple, add complexity incrementally
 * - Test each endpoint before building next one
 * - Use only safe tables: rooms, room_seats, user_profiles, game_states
 */

// ============================================
// UTILITY: Generate Room Code
// ============================================
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No ambiguous chars (0, O, 1, I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ============================================
// POST /api/sandbox/create-room
// ============================================
router.post('/create-room', async (req, res) => {
  try {
    const { userId, name } = req.body;
    
    console.log('🧪 [SANDBOX] Create room request:', { userId, name });
    
    // Validate
    if (!userId || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: userId, name' 
      });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // 🚨 HARD LIMIT: Enforce 5-room limit per user (SANDBOX ALSO COUNTS!)
    const roomCount = await db.query(
      `SELECT COUNT(*) FROM rooms 
       WHERE host_user_id = $1`,
      [userId]
    );
    
    const activeRooms = parseInt(roomCount.rows[0].count);
    console.log(`🔍 [SANDBOX] Room limit check: User ${userId} has ${activeRooms} active rooms`);
    
    if (activeRooms >= 5) {
      console.warn(`🚫 [SANDBOX] BLOCKED: User has ${activeRooms} active rooms (limit: 5)`);
      return res.status(403).json({ 
        error: 'ROOM_LIMIT_REACHED',
        message: `You have ${activeRooms} active rooms. Maximum is 5. Close an existing room before creating a new one.`,
        activeRooms: activeRooms,
        limit: 5,
        action: 'manage_rooms'
      });
    }
    
    // Ensure user profile exists
    try {
      await db.query(
        `INSERT INTO user_profiles (id, username, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [userId, `Player_${userId.substr(0, 6)}`]
      );
    } catch (profileError) {
      console.warn('⚠️ Could not create user profile (non-critical):', profileError.message);
    }
    
    // Generate unique room code
    let code = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const existing = await db.query(
        'SELECT id FROM rooms WHERE invite_code = $1',
        [code]
      );
      if (existing.rows.length === 0) break;
      code = generateRoomCode();
      attempts++;
    }
    
    // Create room (minimal fields, no status column)
    const result = await db.query(
      `INSERT INTO rooms (
        name, invite_code, host_user_id,
        small_blind, big_blind, max_players, min_buy_in, max_buy_in,
        created_at, updated_at
      ) VALUES ($1, $2, $3, 5, 10, 10, 100, 5000, NOW(), NOW())
      RETURNING id, invite_code`,
      [name, code, userId]
    );
    
    const room = result.rows[0];
    
    console.log('✅ [SANDBOX] Room created:', { roomId: room.id, code: room.invite_code });
    
    res.json({ 
      roomId: room.id, 
      code: room.invite_code 
    });
    
  } catch (error) {
    console.error('❌ [SANDBOX] Create room error:', error);
    res.status(500).json({ 
      error: 'Failed to create room',
      details: error.message 
    });
  }
});

// ============================================
// POST /api/sandbox/join-room
// ============================================
router.post('/join-room', async (req, res) => {
  try {
    const { code } = req.body;
    
    console.log('🧪 [SANDBOX] Join room request:', { code });
    
    if (!code) {
      return res.status(400).json({ error: 'Missing required field: code' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Find room by code
    const result = await db.query(
      `SELECT id, name, host_user_id, status, invite_code 
       FROM rooms 
       WHERE invite_code = $1`,
      [code.toUpperCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = result.rows[0];
    
    console.log('✅ [SANDBOX] Room found:', { roomId: room.id });
    
    res.json({ room });
    
  } catch (error) {
    console.error('❌ [SANDBOX] Join room error:', error);
    res.status(500).json({ 
      error: 'Failed to join room',
      details: error.message 
    });
  }
});

// ============================================
// GET /api/sandbox/my-rooms
// ============================================
router.get('/my-rooms', async (req, res) => {
  try {
    const { userId } = req.query;
    
    console.log('🗂️ [SANDBOX] My rooms request:', { userId });
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing required query param: userId' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Fetch all rooms where user is the host (if it exists, it's active)
    const result = await db.query(
      `SELECT id, name, invite_code as code, created_at, updated_at
       FROM rooms 
       WHERE host_user_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [userId]
    );
    
    console.log(`✅ [SANDBOX] Found ${result.rows.length} rooms for user ${userId.substr(0, 8)}`);
    
    res.json({ 
      rooms: result.rows 
    });
    
  } catch (error) {
    console.error('❌ [SANDBOX] My rooms error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch rooms',
      details: error.message 
    });
  }
});

// ============================================
// DELETE /api/sandbox/delete-room
// ============================================
router.delete('/delete-room', async (req, res) => {
  try {
    const { roomId, userId, forceDelete } = req.body;
    
    console.log('🗑️ [SANDBOX] Delete room request:', { roomId, userId, forceDelete });
    
    if (!roomId || !userId) {
      return res.status(400).json({ error: 'Missing required fields: roomId, userId' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Verify ownership
    const roomCheck = await db.query(
      'SELECT host_user_id, status FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = roomCheck.rows[0];
    
    if (room.host_user_id !== userId) {
      return res.status(403).json({ error: 'Only the host can delete this room' });
    }
    
    // Block deletion of active games unless force flag is set
    if (room.status === 'ACTIVE' && !forceDelete) {
      return res.status(400).json({ error: 'Cannot delete an active game without force flag' });
    }
    
    // Delete related records first (foreign key constraints)
    await db.query('DELETE FROM room_seats WHERE room_id = $1', [roomId]);
    await db.query('DELETE FROM game_states WHERE room_id = $1', [roomId]);
    
    // Delete the room
    await db.query('DELETE FROM rooms WHERE id = $1', [roomId]);
    
    console.log(`✅ [SANDBOX] Room deleted: ${roomId}${forceDelete ? ' (FORCED)' : ''}`);
    
    res.json({ 
      success: true,
      message: 'Room deleted successfully'
    });
    
  } catch (error) {
    console.error('❌ [SANDBOX] Delete room error:', error);
    res.status(500).json({ 
      error: 'Failed to delete room',
      details: error.message 
    });
  }
});

// ============================================
// HEALTH CHECK
// ============================================
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Sandbox API is running',
    endpoints: [
      'POST /api/sandbox/create-room',
      'POST /api/sandbox/join-room',
      'GET /api/sandbox/my-rooms',
      'DELETE /api/sandbox/delete-room'
    ]
  });
});

module.exports = router;

