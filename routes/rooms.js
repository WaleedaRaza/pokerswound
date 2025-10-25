// ROOMS ROUTER - EXTRACTED FROM MONOLITH
// CRITICAL: Preserves ALL existing logic, middleware, and error handling

const express = require('express');
const router = express.Router();

/**
 * IMPORTANT: This router expects the following to be passed via app.locals:
 * - getDb: Database connection getter
 * - createRoom: Room creation service
 * - getRoomByInvite: Room lookup service  
 * - claimSeat: Seat claiming service
 * - releaseSeat: Seat release service
 * - authenticateToken: Auth middleware
 */

// ============================================
// ROOMS ENDPOINTS
// ============================================

// GET /api/rooms - List all active rooms
router.get('/', async (req, res) => {
  try {
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    
    const result = await db.query(
      `SELECT id, name, small_blind, big_blind, max_players, is_private, 
              host_user_id, invite_code, created_at
       FROM rooms
       WHERE status = 'active'
       ORDER BY created_at DESC
       LIMIT 50`
    );
    
    res.json({ rooms: result.rows });
  } catch (e) {
    console.error('List rooms error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/rooms - Create new room
// 🔒 AUTH REQUIRED
router.post('/', async (req, res) => {
  const authenticateToken = req.app.locals.authenticateToken;
  
  // Apply auth middleware
  await new Promise((resolve, reject) => {
    authenticateToken(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(() => {
    // Auth middleware already sent response
    return;
  });
  
  try {
    const { name, small_blind, big_blind, min_buy_in, max_buy_in, max_players = 9, is_private, user_id } = req.body || {};
    if (!name || !small_blind || !big_blind || !min_buy_in || !max_buy_in) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id required - please sign in first' });
    }
    
    // WEEK 3 DAY 3: Enforce 5-room limit per user
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (db) {
      const roomCount = await db.query(
        `SELECT COUNT(*) FROM rooms 
         WHERE host_user_id = $1 AND status = 'active'`,
        [user_id]
      );
      
      const activeRooms = parseInt(roomCount.rows[0].count);
      if (activeRooms >= 5) {
        return res.status(400).json({ 
          error: 'Room limit reached',
          message: `You have ${activeRooms} active rooms. Maximum is 5. Please close an existing room first.`,
          activeRooms: activeRooms,
          limit: 5
        });
      }
    }
    
    const createRoom = req.app.locals.createRoom;
    const room = await createRoom({ name, small_blind, big_blind, min_buy_in, max_buy_in, max_players, is_private, host_user_id: user_id });
    
    // Auto-join host to lobby
    if (db) {
      await db.query(
        `INSERT INTO room_players (room_id, user_id, status, approved_at)
         VALUES ($1, $2, 'approved', NOW())`,
        [room.id, user_id]
      );
      console.log(`👑 Host ${user_id} auto-joined room ${room.id}`);
    }
    
    res.status(201).json({ 
      roomId: room.id, 
      inviteCode: room.invite_code, 
      maxPlayers: room.max_players, 
      hostUserId: room.host_user_id 
    });
  } catch (e) {
    console.error('Create room error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/rooms/invite/:code - Get room by invite code
router.get('/invite/:code', async (req, res) => {
  try {
    const getRoomByInvite = req.app.locals.getRoomByInvite;
    const data = await getRoomByInvite(req.params.code);
    if (!data) return res.status(404).json({ error: 'Room not found' });
    res.json(data);
  } catch (e) {
    console.error('Get room by invite error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/rooms/:roomId/seats - Get seats for room
router.get('/:roomId/seats', async (req, res) => {
  try {
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    const { rows } = await db.query(
      `SELECT seat_index, user_id, status, chips_in_play FROM room_seats WHERE room_id=$1 ORDER BY seat_index ASC`,
      [req.params.roomId]
    );
    res.json({ seats: rows });
  } catch (e) {
    console.error('List seats error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/rooms/:roomId/join - Claim seat
// ⚠️ NO AUTH: Guests need to join without JWT tokens
// GET /api/rooms/:roomId/session - Get session info for current user
router.get('/:roomId/session', async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.userId || req.query.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }
    
    const sessionService = req.app.locals.sessionService;
    if (!sessionService) {
      return res.status(500).json({ error: 'Session service not available' });
    }
    
    // Get session and seat binding
    const session = await sessionService.getOrCreateSession(userId);
    const seatBinding = await sessionService.getUserSeat(userId);
    
    res.json({
      session,
      seatBinding,
      isSeated: !!seatBinding && seatBinding.roomId === roomId,
      roomId
    });
  } catch (e) {
    console.error('Session info error:', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/:roomId/join', async (req, res) => {
  try {
    console.log('🎯 Claim seat request:', {
      roomId: req.params.roomId,
      body: req.body
    });
    
    const { user_id, seat_index, buy_in_amount } = req.body || {};
    if (!user_id || seat_index === undefined || buy_in_amount === undefined) {
      console.error('❌ Missing fields:', { user_id, seat_index, buy_in_amount });
      return res.status(400).json({ error: 'Missing required fields: user_id, seat_index, buy_in_amount' });
    }
    
    const claimSeat = req.app.locals.claimSeat;
    await claimSeat({ roomId: req.params.roomId, userId: user_id, seatIndex: seat_index, buyInAmount: buy_in_amount });
    
    // ✅ NEW: Bind user to seat via SessionService
    const sessionService = req.app.locals.sessionService;
    let seatToken = null;
    if (sessionService) {
      try {
        seatToken = await sessionService.bindUserToSeat(user_id, req.params.roomId, seat_index);
        console.log(`✅ User ${user_id} bound to seat ${seat_index} in room ${req.params.roomId}`);
      } catch (bindError) {
        console.warn('Failed to bind seat via SessionService:', bindError.message);
      }
    }
    
    console.log('✅ Seat claimed successfully');
    res.status(201).json({ ok: true, seatIndex: seat_index, seatToken });
  } catch (e) {
    console.error('❌ Join room error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

// POST /api/rooms/:roomId/leave - Release seat
// ⚠️ NO AUTH: Players might be using local guest accounts
router.post('/:roomId/leave', async (req, res) => {
  try {
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    const releaseSeat = req.app.locals.releaseSeat;
    await releaseSeat({ roomId: req.params.roomId, userId: user_id });
    res.json({ ok: true });
  } catch (e) {
    console.error('Leave room error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ⚔️ Get active game for room (for recovery)
router.get('/:roomId/game', async (req, res) => {
  try {
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    const result = await db.query(
      'SELECT id, current_state, status FROM game_states WHERE room_id = $1 AND status != \'completed\' ORDER BY created_at DESC LIMIT 1',
      [req.params.roomId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'No active game found' });
    }
    
    const gameState = result.rows[0];
    console.log('🎮 [RECOVERY] Active game found for room:', req.params.roomId);
    
    res.json({
      id: gameState.id,
      state: gameState.current_state,
      status: gameState.status
    });
  } catch (e) {
    console.error('Get active game error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ⚔️ MIRA: Get complete state for refresh recovery (comprehensive)
router.get('/:roomId/my-state', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query parameter' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    console.log('🔄 [REFRESH RECOVERY] Fetching state for user:', userId, 'room:', req.params.roomId);
    
    // Get active game
    const gameResult = await db.query(
      'SELECT id, current_state, status FROM game_states WHERE room_id = $1 AND status != \'completed\' ORDER BY created_at DESC LIMIT 1',
      [req.params.roomId]
    );
    
    // Get user's seat
    const seatResult = await db.query(
      'SELECT seat_index, chips_in_play, status, joined_at FROM room_seats WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL',
      [req.params.roomId, userId]
    );
    
    // Get all seats
    const allSeatsResult = await db.query(
      'SELECT seat_index, user_id, status, chips_in_play FROM room_seats WHERE room_id = $1 AND left_at IS NULL ORDER BY seat_index ASC',
      [req.params.roomId]
    );
    
    const response = {
      game: gameResult.rowCount > 0 ? {
        id: gameResult.rows[0].id,
        state: gameResult.rows[0].current_state,
        status: gameResult.rows[0].status
      } : null,
      mySeat: seatResult.rowCount > 0 ? seatResult.rows[0] : null,
      allSeats: allSeatsResult.rows,
      isSeated: seatResult.rowCount > 0
    };
    
    console.log('✅ [REFRESH RECOVERY] State fetched:', {
      hasGame: !!response.game,
      isSeated: response.isSeated,
      seatIndex: response.mySeat?.seat_index,
      totalSeats: response.allSeats.length
    });
    
    res.json(response);
  } catch (e) {
    console.error('❌ [REFRESH RECOVERY] Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// LOBBY ENDPOINTS
// ============================================

// POST /api/rooms/:roomId/lobby/join - Join lobby
// ⚠️ NO AUTH: Guests don't have JWT tokens
router.post('/:roomId/lobby/join', async (req, res) => {
  try {
    const { user_id, username } = req.body;
    
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    if (!username) return res.status(400).json({ error: 'Missing username' });
    
    console.log(`🎮 Lobby join request: User ${username} (${user_id})`);
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Check if user profile exists
    const profileCheck = await db.query(
      'SELECT id FROM user_profiles WHERE id = $1',
      [user_id]
    );
    
    if (profileCheck.rowCount === 0) {
      console.log(`📝 Creating user profile for ${user_id} with username: ${username}`);
      await db.query(
        `INSERT INTO user_profiles (id, username, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [user_id, username]
      );
    } else {
      console.log(`✅ User profile exists: ${username}`);
    }
    
    // Get room to check host
    const roomResult = await db.query(
      'SELECT host_user_id FROM rooms WHERE id = $1',
      [req.params.roomId]
    );
    
    if (roomResult.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = roomResult.rows[0];
    const isHost = room.host_user_id === user_id;
    
    // If host, auto-approve. Otherwise, add as pending
    const status = isHost ? 'approved' : 'pending';
    const approvedAt = isHost ? new Date().toISOString() : null;
    
    await db.query(
      `INSERT INTO room_players (room_id, user_id, status, approved_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (room_id, user_id) DO UPDATE SET status = $3`,
      [req.params.roomId, user_id, status, approvedAt]
    );
    
    if (isHost) {
      console.log(`👋 Player ${user_id} joined room lobby`);
    } else {
      console.log(`👋 Player ${user_id} requesting to join room lobby`);
    }
    
    // Broadcast to all clients in the room
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${req.params.roomId}`).emit('player_joined', {
        userId: user_id,
        username,
        status,
        approved_at: approvedAt
      });
      console.log(`📡 Broadcast player_joined to room:${req.params.roomId}`);
    }
    
    res.json({ ok: true, status });
  } catch (e) {
    console.error('Join lobby error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/rooms/:roomId/lobby/players - Get lobby players
router.get('/:roomId/lobby/players', async (req, res) => {
  try {
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    const result = await db.query(
      `SELECT rp.user_id, rp.status, rp.approved_at, up.username
       FROM room_players rp
       LEFT JOIN user_profiles up ON rp.user_id = up.id
       WHERE rp.room_id = $1
       ORDER BY rp.approved_at ASC NULLS LAST`,
      [req.params.roomId]
    );
    
    res.json({ players: result.rows });
  } catch (e) {
    console.error('Get lobby players error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/rooms/:roomId/lobby/approve - Approve player (host only)
// ⚠️ NO AUTH: Host might be using local guest account
router.post('/:roomId/lobby/approve', async (req, res) => {
  try {
    const { user_id, target_user_id } = req.body;
    if (!user_id || !target_user_id) return res.status(400).json({ error: 'Missing user_id or target_user_id' });
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Verify user is host
    const roomResult = await db.query(
      'SELECT host_user_id FROM rooms WHERE id = $1',
      [req.params.roomId]
    );
    
    if (roomResult.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomResult.rows[0].host_user_id !== user_id) {
      return res.status(403).json({ error: 'Only host can approve players' });
    }
    
    // Approve player
    await db.query(
      `UPDATE room_players
       SET status = 'approved', approved_at = NOW()
       WHERE room_id = $1 AND user_id = $2`,
      [req.params.roomId, target_user_id]
    );
    
    console.log(`✅ Host approved player ${target_user_id}`);
    
    // Broadcast to all clients in the room
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${req.params.roomId}`).emit('player_approved', {
        userId: target_user_id,
        approved_at: new Date().toISOString()
      });
      console.log(`📡 Broadcast player_approved to room:${req.params.roomId}`);
    }
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Approve player error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/rooms/:roomId/lobby/reject - Reject player (host only)
// ⚠️ NO AUTH: Host might be using local guest account
router.post('/:roomId/lobby/reject', async (req, res) => {
  try {
    const { user_id, target_user_id } = req.body;
    if (!user_id || !target_user_id) return res.status(400).json({ error: 'Missing user_id or target_user_id' });
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Verify user is host
    const roomResult = await db.query(
      'SELECT host_user_id FROM rooms WHERE id = $1',
      [req.params.roomId]
    );
    
    if (roomResult.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomResult.rows[0].host_user_id !== user_id) {
      return res.status(403).json({ error: 'Only host can reject players' });
    }
    
    // Remove player
    await db.query(
      `DELETE FROM room_players
       WHERE room_id = $1 AND user_id = $2`,
      [req.params.roomId, target_user_id]
    );
    
    console.log(`❌ Host rejected player ${target_user_id}`);
    
    // Broadcast to all clients in the room
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${req.params.roomId}`).emit('player_rejected', {
        userId: target_user_id
      });
      console.log(`📡 Broadcast player_rejected to room:${req.params.roomId}`);
    }
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Reject player error:', e);
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// WEEK 3 DAY 3: ROOM MANAGEMENT
// ============================================

// GET /api/rooms/my-rooms - Get all rooms for a user (hosted + joined)
router.get('/my-rooms', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId query parameter required' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    
    // Get hosted rooms
    const hostedRooms = await db.query(
      `SELECT r.id, r.name, r.invite_code, r.max_players, r.status, r.created_at,
              COUNT(DISTINCT rs.user_id) as player_count
       FROM rooms r
       LEFT JOIN room_seats rs ON r.id = rs.room_id
       WHERE r.host_user_id = $1 AND r.status = 'active'
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
      [userId]
    );
    
    // Get joined rooms (where user is not host)
    const joinedRooms = await db.query(
      `SELECT r.id, r.name, r.invite_code, r.max_players, r.status, r.created_at,
              r.host_user_id,
              COUNT(DISTINCT rs2.user_id) as player_count
       FROM room_seats rs
       JOIN rooms r ON rs.room_id = r.id
       LEFT JOIN room_seats rs2 ON r.id = rs2.room_id
       WHERE rs.user_id = $1 AND r.host_user_id != $1 AND r.status = 'active'
       GROUP BY r.id, r.host_user_id
       ORDER BY r.created_at DESC`,
      [userId]
    );
    
    res.json({
      hosted: hostedRooms.rows,
      joined: joinedRooms.rows,
      totalActive: hostedRooms.rows.length,
      limit: 5
    });
    
  } catch (error) {
    console.error('Get my rooms error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rooms/:roomId/close - Host closes/deletes a room
router.post('/:roomId/close', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId } = req.body;
    
    if (!hostId) {
      return res.status(400).json({ error: 'hostId required' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    
    // Verify host owns the room
    const roomCheck = await db.query(
      'SELECT host_user_id, game_id FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomCheck.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Only the host can close the room' });
    }
    
    // Set room status to closed
    await db.query(
      `UPDATE rooms SET status = 'closed', updated_at = NOW() WHERE id = $1`,
      [roomId]
    );
    
    // Remove all players from room seats
    await db.query(
      'DELETE FROM room_seats WHERE room_id = $1',
      [roomId]
    );
    
    console.log(`🚪 Host ${hostId} closed room ${roomId}`);
    
    // Broadcast to all players in room
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${roomId}`).emit('room_closed', {
        roomId,
        closedBy: hostId,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      message: 'Room closed successfully',
      roomId
    });
    
  } catch (error) {
    console.error('Close room error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rooms/:roomId/abandon - Guest leaves/abandons a room
router.post('/:roomId/abandon', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    
    // Verify user is not the host
    const roomCheck = await db.query(
      'SELECT host_user_id FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomCheck.rows[0].host_user_id === userId) {
      return res.status(400).json({ 
        error: 'Host cannot abandon room. Use close endpoint instead.' 
      });
    }
    
    // Remove user from room seats
    const deleteResult = await db.query(
      'DELETE FROM room_seats WHERE room_id = $1 AND user_id = $2 RETURNING *',
      [roomId, userId]
    );
    
    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found in room' });
    }
    
    // Remove from lobby if present
    await db.query(
      'DELETE FROM room_players WHERE room_id = $1 AND user_id = $2',
      [roomId, userId]
    );
    
    console.log(`🚶 User ${userId} abandoned room ${roomId}`);
    
    // Broadcast to all players in room
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${roomId}`).emit('player_left', {
        roomId,
        userId,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      message: 'Successfully left room',
      roomId
    });
    
  } catch (error) {
    console.error('Abandon room error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// WEEK 3 DAY 1: HOST CONTROLS
// ============================================

// POST /api/rooms/:roomId/kick - Host kicks a player from room/game
router.post('/:roomId/kick', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId, targetPlayerId, targetUserId } = req.body;
    
    if (!hostId || (!targetPlayerId && !targetUserId)) {
      return res.status(400).json({ error: 'Missing hostId or target identifier' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    
    // Verify host owns the room
    const roomCheck = await db.query(
      'SELECT host_user_id FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomCheck.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Only the host can kick players' });
    }
    
    // Remove player from room_seats
    const deleteResult = await db.query(
      'DELETE FROM room_seats WHERE room_id = $1 AND (user_id = $2 OR user_id = $3) RETURNING *',
      [roomId, targetUserId, targetPlayerId]
    );
    
    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Player not found in room' });
    }
    
    const kickedPlayer = deleteResult.rows[0];
    
    console.log(`👢 Host ${hostId} kicked player ${kickedPlayer.user_id} from room ${roomId}`);
    
    // Broadcast to all players in room
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${roomId}`).emit('player_kicked', {
        roomId,
        kickedUserId: kickedPlayer.user_id,
        kickedBy: hostId,
        timestamp: new Date().toISOString()
      });
    }
    
    // Get updated player list
    const players = await db.query(
      'SELECT * FROM room_seats WHERE room_id = $1 ORDER BY seat_index',
      [roomId]
    );
    
    res.json({
      message: 'Player kicked successfully',
      kickedPlayer: kickedPlayer.user_id,
      remainingPlayers: players.rows
    });
    
  } catch (error) {
    console.error('Kick player error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rooms/:roomId/set-away - Host sets a player to AWAY status
router.post('/:roomId/set-away', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId, targetPlayerId } = req.body;
    
    if (!hostId || !targetPlayerId) {
      return res.status(400).json({ error: 'Missing hostId or targetPlayerId' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    
    // Verify host owns the room
    const roomCheck = await db.query(
      'SELECT host_user_id FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomCheck.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Only the host can set player status' });
    }
    
    // Verify player is in room
    const playerCheck = await db.query(
      'SELECT * FROM room_seats WHERE room_id = $1 AND user_id = $2',
      [roomId, targetPlayerId]
    );
    
    if (playerCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Player not found in room' });
    }
    
    console.log(`⏸️ Host ${hostId} set player ${targetPlayerId} to AWAY in room ${roomId}`);
    
    // Broadcast to all players in room
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${roomId}`).emit('player_set_away', {
        roomId,
        playerId: targetPlayerId,
        status: 'AWAY',
        setBy: hostId,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      message: 'Player status updated to AWAY',
      playerId: targetPlayerId,
      status: 'AWAY'
    });
    
  } catch (error) {
    console.error('Set away error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rooms/:roomId/capacity - Host changes room player capacity
router.post('/:roomId/capacity', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId, newCapacity } = req.body;
    
    if (!hostId || !newCapacity) {
      return res.status(400).json({ error: 'Missing hostId or newCapacity' });
    }
    
    // Validate capacity range
    const capacity = parseInt(newCapacity);
    if (isNaN(capacity) || capacity < 2 || capacity > 10) {
      return res.status(400).json({ error: 'Capacity must be between 2 and 10' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    
    // Verify host owns the room
    const roomCheck = await db.query(
      'SELECT host_user_id, max_players FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomCheck.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Only the host can change capacity' });
    }
    
    const oldCapacity = roomCheck.rows[0].max_players;
    
    // Count current players
    const playerCount = await db.query(
      'SELECT COUNT(*) FROM room_seats WHERE room_id = $1',
      [roomId]
    );
    
    const currentPlayers = parseInt(playerCount.rows[0].count);
    
    // Don't allow reducing below current player count
    if (capacity < currentPlayers) {
      return res.status(400).json({ 
        error: `Cannot reduce capacity to ${capacity}. Currently ${currentPlayers} players in room.`,
        currentPlayers,
        requestedCapacity: capacity
      });
    }
    
    // Update room capacity
    await db.query(
      'UPDATE rooms SET max_players = $1 WHERE id = $2',
      [capacity, roomId]
    );
    
    console.log(`🔢 Host ${hostId} changed room ${roomId} capacity from ${oldCapacity} to ${capacity}`);
    
    // Broadcast to all players in room
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${roomId}`).emit('capacity_changed', {
        roomId,
        oldCapacity,
        newCapacity: capacity,
        changedBy: hostId,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      message: 'Room capacity updated',
      oldCapacity,
      newCapacity: capacity,
      currentPlayers
    });
    
  } catch (error) {
    console.error('Change capacity error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ADDITIONAL ROOM ENDPOINTS (Phase 1 Completion)
// ============================================

// POST /api/rooms/:roomId/rebuy - Player rebuy
router.post('/:roomId/rebuy', async (req, res) => {
  const { authenticateToken, getDb, io } = req.app.locals;
  
  // Apply auth
  await new Promise((resolve, reject) => {
    authenticateToken(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(() => {
    return;
  });
  
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid rebuy amount' });
    }
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Check if room allows rebuys
    const roomRes = await db.query(
      'SELECT allow_rebuys, game_mode FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomRes.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (!roomRes.rows[0].allow_rebuys) {
      return res.status(400).json({ error: 'Rebuys not allowed in this game (tournament mode)' });
    }
    
    // Update player's chip count
    const updateRes = await db.query(
      'UPDATE room_seats SET chips_in_play = chips_in_play + $1 WHERE room_id = $2 AND user_id = $3 RETURNING chips_in_play',
      [amount, roomId, userId]
    );
    
    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'Player not seated in this room' });
    }
    
    const newStack = updateRes.rows[0].chips_in_play;
    
    // Log rebuy
    await db.query(
      'INSERT INTO rebuys (room_id, user_id, amount) VALUES ($1, $2, $3)',
      [roomId, userId, amount]
    );
    
    console.log(`💰 Player ${userId} rebought for $${amount} (new stack: $${newStack})`);
    
    // Broadcast to room
    if (io) {
      io.to(`room:${roomId}`).emit('player_rebuy', {
        userId,
        amount,
        newStack,
        message: `Player bought in for $${amount}`
      });
    }
    
    res.json({ success: true, newStack });
  } catch (error) {
    console.error('Rebuy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rooms/:roomId/lobby/my-status - Check lobby status
router.get('/:roomId/lobby/my-status', async (req, res) => {
  const { getDb } = req.app.locals;
  
  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: 'Missing user_id' });
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    const result = await db.query(
      `SELECT status, joined_at, approved_at FROM room_players
       WHERE room_id = $1 AND user_id = $2`,
      [req.params.roomId, userId]
    );
    
    if (result.rowCount === 0) {
      return res.json({ status: 'not_joined' });
    }
    
    res.json({ 
      status: result.rows[0].status, 
      joined_at: result.rows[0].joined_at, 
      approved_at: result.rows[0].approved_at 
    });
  } catch (e) {
    console.error('Check lobby status error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/rooms/:roomId/history - Get hand history for room
router.get('/:roomId/history', async (req, res) => {
  const { authenticateToken, getDb } = req.app.locals;
  
  // Apply auth
  await new Promise((resolve, reject) => {
    authenticateToken(req, res, (err) => {
      if (err) reject(err);
      else resolve();
    });
  }).catch(() => {
    return;
  });
  
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    const historyRes = await db.query(
      'SELECT * FROM hand_history WHERE room_id = $1 ORDER BY created_at DESC LIMIT $2',
      [roomId, limit]
    );
    
    res.json({ hands: historyRes.rows });
  } catch (error) {
    console.error('Get hand history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rooms/:roomId - Get single room by ID or invite code
router.get('/:roomId', async (req, res) => {
  const { getDb } = req.app.locals;
  
  try {
    const { roomId } = req.params;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    // Check if roomId is a UUID or an invite code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId);
    
    let result;
    if (isUUID) {
      // Query by UUID
      result = await db.query(`
        SELECT 
          r.*,
          COUNT(DISTINCT rs.user_id) as player_count
        FROM rooms r
        LEFT JOIN room_seats rs ON r.id = rs.room_id AND rs.status = 'occupied'
        WHERE r.id = $1
        GROUP BY r.id
      `, [roomId]);
    } else {
      // Query by invite code
      result = await db.query(`
        SELECT 
          r.*,
          COUNT(DISTINCT rs.user_id) as player_count
        FROM rooms r
        LEFT JOIN room_seats rs ON r.id = rs.room_id AND rs.status = 'occupied'
        WHERE r.invite_code = $1
        GROUP BY r.id
      `, [roomId]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room: result.rows[0] });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/rooms/:roomId/game-state - Game recovery endpoint
router.get('/:roomId/game-state', async (req, res) => {
  const { getDb, games, Logger, LogCategory } = req.app.locals;
  const { roomId } = req.params;
  const startTime = Date.now();
  
  Logger.info(LogCategory.RECOVERY, 'Game recovery requested', { roomId, userId: req.query.userId });
  
  try {
    const db = getDb();
    const result = await db.query(
      `SELECT id, status, hand_number, total_pot 
       FROM game_states 
       WHERE room_id = $1 
       AND status NOT IN ('completed', 'deleted')
       ORDER BY created_at DESC 
       LIMIT 1`,
      [roomId]
    );
    
    if (result.rows.length === 0) {
      Logger.info(LogCategory.RECOVERY, 'No active game found', { roomId, duration: Date.now() - startTime });
      return res.json({ game: null });
    }
    
    const gameId = result.rows[0].id;
    Logger.debug(LogCategory.RECOVERY, 'Found game in database', { gameId, roomId });
    
    // Check in-memory first
    const gameState = games.get(gameId);
    
    if (!gameState) {
      Logger.error(LogCategory.RECOVERY, 'Game exists in DB but not in memory', { gameId });
      return res.json({ game: null });
    }
    
    Logger.success(LogCategory.RECOVERY, 'Game recovered successfully', { 
      gameId, 
      roomId, 
      handNumber: gameState.handState?.handNumber || 0,
      playerCount: gameState.players.size,
      duration: Date.now() - startTime 
    });
    
    res.json({
      game: {
        id: gameState.id,
        status: gameState.status,
        handNumber: gameState.handState?.handNumber || 0,
        pot: gameState.pot?.totalPot || 0,
        players: Array.from(gameState.players.values()).map(p => ({
          id: p.uuid,
          name: p.name,
          stack: p.stack,
          seatIndex: p.seatIndex
        }))
      }
    });
  } catch (error) {
    Logger.error(LogCategory.RECOVERY, 'Game recovery failed', { 
      roomId, 
      error: error.message
    });
    res.status(500).json({ error: 'Recovery failed', details: error.message });
  }
});

module.exports = router;

