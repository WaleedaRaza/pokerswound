// ROOMS ROUTER - EXTRACTED FROM MONOLITH
// CRITICAL: Preserves ALL existing logic, middleware, and error handling

const express = require('express');
const router = express.Router();
const { withIdempotency } = require('../src/middleware/idempotency');

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
router.post('/', withIdempotency, async (req, res) => {
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
    
    // 🚨 HARD LIMIT: Enforce 5-room limit per user (BACKEND BLOCK)
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database unavailable' });
    }
    
      const roomCount = await db.query(
        `SELECT COUNT(*) FROM rooms 
       WHERE host_user_id = $1`,
        [user_id]
      );
      
      const activeRooms = parseInt(roomCount.rows[0].count);
    console.log(`🔍 Room limit check: User ${user_id} has ${activeRooms} active rooms`);
    
      if (activeRooms >= 5) {
      console.warn(`🚫 BLOCKED: User has ${activeRooms} active rooms (limit: 5)`);
      return res.status(403).json({ 
        error: 'ROOM_LIMIT_REACHED',
        message: `You have ${activeRooms} active rooms. Maximum is 5. Close an existing room before creating a new one.`,
          activeRooms: activeRooms,
        limit: 5,
        action: 'manage_rooms' // Tell frontend to show room management
        });
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
// POST /api/rooms/:roomId/claim-seat - MINIMAL TABLE: Simple seat claiming
router.post('/:roomId/claim-seat', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId, seatIndex, username, requestedChips = 1000 } = req.body;
    
    console.log('🪑 Claim seat request:', { roomId, userId, seatIndex, username, requestedChips });
    
    if (!userId || seatIndex === undefined) {
      return res.status(400).json({ error: 'Missing userId or seatIndex' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Check room status (is game active?)
    const roomResult = await db.query(
      'SELECT game_id, host_user_id FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const gameId = roomResult.rows[0].game_id;
    const isGameActive = gameId !== null && gameId !== undefined;
    
    // Check if seat is available
    const existing = await db.query(
      'SELECT * FROM room_seats WHERE room_id = $1 AND seat_index = $2 AND left_at IS NULL',
      [roomId, seatIndex]
    );
    
    if (existing.rows.length > 0 && existing.rows[0].user_id !== userId) {
      return res.status(409).json({ error: 'Seat already taken' });
    }
    
    // If game is active, create seat request (requires host approval)
    if (isGameActive) {
      // Get username for notification
      const usernameResult = await db.query(
        'SELECT username, display_name FROM user_profiles WHERE id = $1',
        [userId]
      );
      const displayName = usernameResult.rows[0]?.username || usernameResult.rows[0]?.display_name || `Guest_${userId.substring(0, 6)}`;
      
      // Create or update seat request (handle partial unique index)
      // First, delete any existing pending request from this user
      await db.query(
        `DELETE FROM seat_requests 
         WHERE room_id = $1 AND user_id = $2 AND status = 'PENDING'`,
        [roomId, userId]
      );
      
      // Then insert new request
      const requestResult = await db.query(`
        INSERT INTO seat_requests (room_id, user_id, seat_index, requested_chips, status)
        VALUES ($1, $2, $3, $4, 'PENDING')
        RETURNING id
      `, [roomId, userId, seatIndex, requestedChips]);
      
      console.log('✅ Seat request created:', { requestId: requestResult.rows[0].id, roomId, userId, seatIndex });
      
      // Notify host via WebSocket
      const io = req.app.locals.io;
      if (io) {
        io.to(`room:${roomId}`).emit('seat_request_pending', {
          requestId: requestResult.rows[0].id,
          userId,
          username: displayName,
          seatIndex,
          requestedChips,
          requestedAt: new Date().toISOString()
        });
        
        // Also notify the requester
        io.to(`user:${userId}`).emit('seat_request_sent', {
          requestId: requestResult.rows[0].id,
          seatIndex,
          message: 'Seat request sent to host. Waiting for approval...'
        });
      }
      
      return res.json({ 
        success: true, 
        requiresApproval: true,
        requestId: requestResult.rows[0].id,
        message: 'Seat request sent to host'
      });
    }
    
    // Pre-game: Direct claim (no approval needed)
    await db.query(`
      INSERT INTO room_seats (room_id, user_id, seat_index, chips_in_play, is_spectator)
      VALUES ($1, $2, $3, $4, FALSE)
      ON CONFLICT (room_id, seat_index) 
      DO UPDATE SET user_id = $2, chips_in_play = $4, left_at = NULL, is_spectator = FALSE
    `, [roomId, userId, seatIndex, requestedChips]);
    
    console.log('✅ Seat claimed directly (pre-game):', { roomId, userId, seatIndex });
    
    // Broadcast seat update
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${roomId}`).emit('seat_update', {
        type: 'seat_claimed',
        roomId,
        seatIndex,
        userId
      });
    }
    
    res.json({ success: true, seatIndex, requiresApproval: false });
  } catch (error) {
    console.error('❌ Claim seat error:', error);
    res.status(500).json({ error: error.message });
  }
});

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

router.post('/:roomId/join', withIdempotency, async (req, res) => {
  try {
    console.log('🎯 Claim seat request:', {
      roomId: req.params.roomId,
      body: req.body
    });
    
    const { user_id, seat_index, buy_in_amount, username } = req.body || {};
    if (!user_id || seat_index === undefined || buy_in_amount === undefined) {
      console.error('❌ Missing fields:', { user_id, seat_index, buy_in_amount });
      return res.status(400).json({ error: 'Missing required fields: user_id, seat_index, buy_in_amount' });
    }
    
    // ✅ Update username in user_profiles if provided (room_seats doesn't have username column)
    if (username) {
      const getDb = req.app.locals.getDb;
      const db = getDb();
      if (db) {
        try {
          // Only update if username is actually different to avoid duplicate key errors
          await db.query(
            `UPDATE user_profiles SET username = $1 WHERE id = $2 AND (username IS NULL OR username != $1)`,
            [username, user_id]
          );
          console.log(`✅ Updated username to "${username}" for user ${user_id}`);
        } catch (usernameError) {
          // Log but don't fail on username errors - not critical for seat claiming
          console.warn(`⚠️ Username update failed (non-critical):`, usernameError.message);
        }
      }
    }
    
    const claimSeat = req.app.locals.claimSeat;
    await claimSeat({ roomId: req.params.roomId, userId: user_id, seatIndex: seat_index, buyInAmount: buy_in_amount });
    
    // ✅ Bind user to seat via SessionService
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
    
    // ✅ Broadcast seat update to all players in room
    const io = req.app.locals.io;
    if (io) {
      const getDb = req.app.locals.getDb;
      const db = getDb();
      if (db) {
        // Get all current seats with usernames from user_profiles
        const seatsResult = await db.query(
          `SELECT 
             rs.seat_index, 
             rs.user_id, 
             up.username, 
             rs.chips_in_play, 
             rs.status 
           FROM room_seats rs
           LEFT JOIN user_profiles up ON rs.user_id = up.id
           WHERE rs.room_id = $1 
           ORDER BY rs.seat_index`,
          [req.params.roomId]
        );
        
        io.to(`room:${req.params.roomId}`).emit('seat_update', {
          type: 'seat_update',
          version: '1.0.0',
          seq: Date.now(),
          timestamp: Date.now(),
          payload: {
            roomId: req.params.roomId,
            seats: seatsResult.rows
          }
        });
        
        console.log(`📡 Broadcasted seat update to room:${req.params.roomId}`);
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
router.post('/:roomId/leave', withIdempotency, async (req, res) => {
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

// ⚔️ HYDRATION ENDPOINT: Complete state recovery - FIXES REFRESH BUG!
router.get('/:roomId/hydrate', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId query parameter' });
    }
    
    const { getDb, dbV2 } = req.app.locals;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    console.log('🌊 [HYDRATION] Building complete snapshot for user:', userId, 'room:', req.params.roomId);
    
    // Get current sequence number
    const currentSeq = dbV2 ? await dbV2.getCurrentSequence(req.params.roomId) : 0;
    
    // Get room details
    const roomResult = await db.query(
      `SELECT id, invite_code, host_user_id, max_players, 
              small_blind, big_blind, game_id, created_at
       FROM rooms WHERE id = $1`,
      [req.params.roomId]
    );
    
    if (roomResult.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = roomResult.rows[0];
    
    // Get current game_id from rooms table
    const currentGameId = room.game_id;
    
    // Get active game from game_states table using exact game_id
    const gameResult = currentGameId ? await db.query(
      `SELECT id, current_state, seq, version, updated_at, room_id
       FROM game_states
       WHERE id = $1`,
      [currentGameId]
    ) : { rowCount: 0, rows: [] };
    
    let game = null;
    let hand = null;
    let players = [];
    let myHoleCards = null;
    let recentActions = [];
    
    if (gameResult.rowCount > 0) {
      game = gameResult.rows[0];
      
      // Extract game data from JSONB current_state
      const currentState = game.current_state;
      game.id = game.id; // Keep TEXT gameId
      game.status = currentState.status || 'ACTIVE';
      game.players = currentState.players || {};
      game.pot = currentState.pot || {};
      game.handState = currentState.handState || {};
      game.currentStreet = currentState.currentStreet;
      game.bettingRound = currentState.bettingRound || {};
      game.toAct = currentState.toAct;
      
      console.log(`🔍 HYDRATION: Extracted handState:`, {
        hasHandState: !!game.handState,
        handNumber: game.handState?.handNumber,
        checkPasses: !!(game.handState && game.handState.handNumber > 0)
      });
      
      // Get current hand details from handState (in-memory game state)
      if (game.handState && game.handState.handNumber > 0) {
        // Convert board cards from "C4" format to "clubs_4" format
        const suitMap = { 'C': 'clubs', 'D': 'diamonds', 'H': 'hearts', 'S': 'spades' };
        const rankMap = { 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A' };
        const convertCard = (card) => {
          const cardStr = typeof card === 'string' ? card : (card.toString ? card.toString() : card);
          if (cardStr && cardStr.length >= 2) {
            const suit = suitMap[cardStr[0]] || 'clubs';
            const rank = rankMap[cardStr[1]] || cardStr.substring(1);
            return `${suit}_${rank}`;
          }
          return cardStr;
        };
        
        hand = {
          hand_number: game.handState.handNumber,
          phase: game.currentStreet || 'PREFLOP',
          board: (game.handState.communityCards || []).map(convertCard),
          pot_total: game.pot.totalPot || 0,
          current_bet: game.bettingRound.currentBet || 0,
          dealer_seat: game.handState.dealerSeat,
          current_actor_seat: null // Will be computed from toAct
        };
        
        // Convert game.players object to array
        // game.players is a Map serialized as object: {"player_xyz_0": {...}, ...}
        if (game.players && typeof game.players === 'object') {
          const playerEntries = Object.entries(game.players);
          
          players = playerEntries.map(([playerId, player]) => {
            const playerData = {
              user_id: player.userId || null,
              username: player.name,
              seat_index: player.seatIndex,
              stack: player.stack,
              status: player.isActive ? 'ACTIVE' : 'INACTIVE',
              current_bet: player.betThisStreet || 0,
              has_acted: !player.isActive || player.hasFolded,
              is_all_in: player.isAllIn,
              has_folded: player.hasFolded,
              contributed_to_pot: 0
            };
            
            // Only include hole cards for the requesting user
            console.log(`🔍 Checking hole cards for player ${player.name}: userId=${player.userId}, requestingUserId=${userId}, match=${player.userId === userId}, hasCards=${!!player.holeCards}`);
            if (player.userId === userId && player.holeCards) {
              myHoleCards = player.holeCards.map(card => {
                const cardStr = typeof card === 'string' ? card : (card.toString ? card.toString() : card);
                // Convert format: "C4" → "clubs_4", "H7" → "hearts_7"
                const suitMap = { 'C': 'clubs', 'D': 'diamonds', 'H': 'hearts', 'S': 'spades' };
                const rankMap = { 'T': '10', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A' };
                if (cardStr && cardStr.length >= 2) {
                  const suit = suitMap[cardStr[0]] || 'clubs';
                  const rank = rankMap[cardStr[1]] || cardStr.substring(1);
                  return `${suit}_${rank}`;
                }
                return cardStr;
              });
              console.log(`✅ Extracted ${myHoleCards.length} hole cards for user ${userId}:`, myHoleCards);
            }
            
            return playerData;
          });
          
          // Find current actor seat from toAct
          if (game.toAct) {
            const actorPlayer = playerEntries.find(([pid]) => pid === game.toAct);
            if (actorPlayer) {
              hand.current_actor_seat = actorPlayer[1].seatIndex;
            }
          }
        }
        
        // Recent actions - skip for now (not stored in game state)
        recentActions = [];
      }
      
      // Get turn timer if active
      if (hand && hand.current_actor_seat !== null) {
        const timerResult = await dbV2?.getTurnTimer(game.id);
        if (timerResult) {
          const turnStartedAt = timerResult.actor_turn_started_at;
          const turnTimeSeconds = timerResult.turn_time_seconds || 30;
          const timebankRemaining = timerResult.actor_timebank_remaining || 0;
          
          const elapsedMs = Date.now() - turnStartedAt;
          const turnTimeRemainingMs = Math.max(0, (turnTimeSeconds * 1000) - elapsedMs);
          
          hand.timer = {
            started_at: new Date(turnStartedAt).toISOString(),
            turn_time_seconds: turnTimeSeconds,
            turn_time_remaining_ms: turnTimeRemainingMs,
            timebank_remaining_ms: timebankRemaining,
            is_using_timebank: turnTimeRemainingMs === 0 && timebankRemaining > 0
          };
        }
      }
    }
    
    // Get all room seats (including empty ones)
    const seatsResult = await db.query(
      `SELECT rs.seat_index, rs.user_id, rs.status, rs.chips_in_play,
              up.username
       FROM room_seats rs
       LEFT JOIN user_profiles up ON rs.user_id = up.id
       WHERE rs.room_id = $1 AND rs.left_at IS NULL
       ORDER BY rs.seat_index`,
      [req.params.roomId]
    );
    
    const seats = Array(room.max_players || 10).fill(null);
    let mySeat = null;
    
    seatsResult.rows.forEach(seat => {
      seats[seat.seat_index] = {
        index: seat.seat_index,
        user_id: seat.user_id,
        username: seat.username,
        status: seat.status,
        chips_in_play: seat.chips_in_play
      };
      
      if (seat.user_id === userId) {
        mySeat = seat.seat_index;
      }
    });
    
    // Merge game player data with seat data
    if (players.length > 0) {
      players.forEach(player => {
        if (seats[player.seat_index]) {
          Object.assign(seats[player.seat_index], {
            stack: player.stack,
            current_bet: player.current_bet,
            has_acted: player.has_acted,
            is_all_in: player.is_all_in,
            has_folded: player.has_folded,
            contributed_to_pot: player.contributed_to_pot
          });
        }
      });
    }
    
    // Generate rejoin token
    const crypto = require('crypto');
    const rejoinToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rejoinToken).digest('hex');
    
    if (dbV2 && mySeat !== null) {
      await dbV2.createRejoinToken(req.params.roomId, userId, mySeat, tokenHash);
    }
    
    // Build complete hydration response
    const hydrationData = {
      seq: currentSeq,
      timestamp: Date.now(),
      room: {
        id: room.id,
        code: room.invite_code,
        host_id: room.host_user_id,
        capacity: room.max_players,
        small_blind: room.small_blind,
        big_blind: room.big_blind
      },
      game: game ? {
        id: game.id,
        status: game.status,
        state: game.current_state // Full game state for compatibility
      } : null,
      hand: hand ? {
        number: hand.hand_number,
        phase: hand.phase,
        board: hand.board || [],
        pot_total: hand.pot_total || 0,
        current_bet: hand.current_bet || 0,
        dealer_seat: hand.dealer_seat,
        actor_seat: hand.current_actor_seat,
        timer: hand.timer
      } : null,
      seats: seats,
      me: mySeat !== null ? {
        user_id: userId,
        seat_index: mySeat,
        hole_cards: myHoleCards,
        rejoin_token: rejoinToken
      } : null,
      recent_actions: recentActions
    };
    
    console.log('🌊 [HYDRATION] Complete snapshot built:', {
      roomId: req.params.roomId,
      userId,
      seq: currentSeq,
      hasGame: !!game,
      hasHand: !!hand,
      hasSeat: mySeat !== null,
      hasHoleCards: !!myHoleCards
    });
    
    res.json(hydrationData);
  } catch (error) {
    console.error('❌ [HYDRATION] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ⚔️ MIRA: Get complete state for refresh recovery (comprehensive) - LEGACY ENDPOINT
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
router.post('/:roomId/lobby/join', withIdempotency, async (req, res) => {
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
      // Increment sequence number
      const dbV2 = req.app.locals.dbV2;
      const seq = dbV2 ? await dbV2.incrementSequence(req.params.roomId) : Date.now();
      
      io.to(`room:${req.params.roomId}`).emit('player_joined', {
        type: 'player_joined',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          userId: user_id,
          username,
          status,
          approved_at: approvedAt
        }
      });
      console.log(`📡 Broadcast player_joined to room:${req.params.roomId} (seq: ${seq})`);
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
router.post('/:roomId/lobby/approve', withIdempotency, async (req, res) => {
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
      // Increment sequence number
      const dbV2 = req.app.locals.dbV2;
      const seq = dbV2 ? await dbV2.incrementSequence(req.params.roomId) : Date.now();
      
      io.to(`room:${req.params.roomId}`).emit('player_approved', {
        type: 'player_approved',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          userId: target_user_id,
          approved_at: new Date().toISOString()
        }
      });
      console.log(`📡 Broadcast player_approved to room:${req.params.roomId} (seq: ${seq})`);
    }
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Approve player error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/rooms/:roomId/lobby/reject - Reject player (host only)
// ⚠️ NO AUTH: Host might be using local guest account
router.post('/:roomId/lobby/reject', withIdempotency, async (req, res) => {
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
      // Increment sequence number
      const dbV2 = req.app.locals.dbV2;
      const seq = dbV2 ? await dbV2.incrementSequence(req.params.roomId) : Date.now();
      
      io.to(`room:${req.params.roomId}`).emit('player_rejected', {
        type: 'player_rejected',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          userId: target_user_id
        }
      });
      console.log(`📡 Broadcast player_rejected to room:${req.params.roomId} [seq: ${seq}]`);
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
    
    // Get ALL hosted rooms (if it exists, it's active)
    const hostedRooms = await db.query(
      `SELECT r.id, r.name, r.invite_code, r.max_players, r.created_at,
              COUNT(DISTINCT rs.user_id) as player_count
       FROM rooms r
       LEFT JOIN room_seats rs ON r.id = rs.room_id
       WHERE r.host_user_id = $1
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
      [userId]
    );
    
    // Get ALL joined rooms (if it exists, it's active)
    const joinedRooms = await db.query(
      `SELECT r.id, r.name, r.invite_code, r.max_players, r.created_at,
              r.host_user_id,
              COUNT(DISTINCT rs2.user_id) as player_count
       FROM room_seats rs
       JOIN rooms r ON rs.room_id = r.id
       LEFT JOIN room_seats rs2 ON r.id = rs2.room_id
       WHERE rs.user_id = $1 AND r.host_user_id != $1
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
router.post('/:roomId/close', withIdempotency, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId } = req.body;
    
    if (!hostId) {
      console.error('❌ Close room: hostId missing', { body: req.body, params: req.params });
      return res.status(400).json({ error: 'hostId required' });
    }
    
    console.log(`🚪 Close room request: ${roomId} by host ${hostId}`);
    
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
    
    // DELETE room entirely (data already extracted to game_completions/hand_history)
    // First remove related records (foreign keys)
    await db.query('DELETE FROM room_seats WHERE room_id = $1', [roomId]);
    await db.query('DELETE FROM game_states WHERE room_id = $1', [roomId]);
    
    // Then delete the room itself
    await db.query('DELETE FROM rooms WHERE id = $1', [roomId]);
    
    console.log(`🚪 Host ${hostId} closed room ${roomId}`);
    
    // Broadcast to all players in room
    const io = req.app.locals.io;
    if (io) {
      // Increment sequence number
      const dbV2 = req.app.locals.dbV2;
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      
      io.to(`room:${roomId}`).emit('room_closed', {
        type: 'room_closed',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          roomId,
          closedBy: hostId,
          closedAt: new Date().toISOString()
        }
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
router.post('/:roomId/abandon', withIdempotency, async (req, res) => {
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
      // Increment sequence number
      const dbV2 = req.app.locals.dbV2;
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      
      io.to(`room:${roomId}`).emit('player_left', {
        type: 'player_left',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          roomId,
          userId,
          username
        }
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
router.post('/:roomId/kick', withIdempotency, async (req, res) => {
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
      // Increment sequence number
      const dbV2 = req.app.locals.dbV2;
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      
      io.to(`room:${roomId}`).emit('player_kicked', {
        type: 'player_kicked',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          roomId,
          kickedUserId: kickedPlayer.user_id,
          kickedBy: hostId,
          kickedAt: new Date().toISOString()
        }
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
router.post('/:roomId/set-away', withIdempotency, async (req, res) => {
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
      // Increment sequence number
      const dbV2 = req.app.locals.dbV2;
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      
      io.to(`room:${roomId}`).emit('player_set_away', {
        type: 'player_set_away',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          roomId,
          playerId: targetPlayerId,
          status: 'AWAY',
          setBy: hostId,
          setAt: new Date().toISOString()
        }
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
router.post('/:roomId/capacity', withIdempotency, async (req, res) => {
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
      // Increment sequence number
      const dbV2 = req.app.locals.dbV2;
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      
      io.to(`room:${roomId}`).emit('capacity_changed', {
        type: 'capacity_changed',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          roomId,
          oldCapacity,
          newCapacity: capacity,
          changedBy: hostId,
          changedAt: new Date().toISOString()
        }
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
router.post('/:roomId/rebuy', withIdempotency, async (req, res) => {
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
      // Increment sequence number
      const dbV2 = req.app.locals.dbV2;
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      
      io.to(`room:${roomId}`).emit('player_rebuy', {
        type: 'player_rebuy',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          userId,
          amount,
          newStack,
          message: `Player bought in for $${amount}`
        }
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
        LEFT JOIN room_seats rs ON r.id = rs.room_id AND rs.left_at IS NULL
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
        LEFT JOIN room_seats rs ON r.id = rs.room_id AND rs.left_at IS NULL
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

// POST /api/rooms/:roomId/invite - Invite friend to game
router.post('/:roomId/invite', withIdempotency, async (req, res) => {
  try {
    const { friendId, hostId } = req.body;
    const { roomId } = req.params;
    
    if (!friendId || !hostId) {
      return res.status(400).json({ error: 'Missing friendId or hostId' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Get room details
    const roomResult = await db.query(
      'SELECT name, invite_code FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomResult.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = roomResult.rows[0];
    
    // Get host username
    const hostResult = await db.query(
      'SELECT username FROM user_profiles WHERE id = $1',
      [hostId]
    );
    const hostUsername = hostResult.rows[0]?.username || 'A friend';
    
    // Create notification
    const notificationResult = await db.query(
      `INSERT INTO notifications (user_id, type, message, metadata, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id`,
      [
        friendId,
        'GAME_INVITE',
        `${hostUsername} invited you to play poker in "${room.name}"`,
        JSON.stringify({
          roomId: roomId,
          inviteCode: room.invite_code,
          roomName: room.name,
          hostId: hostId,
          hostUsername: hostUsername
        })
      ]
    );
    
    console.log(`📧 Game invite sent: ${hostId} → ${friendId} for room ${roomId}`);
    
    res.json({
      success: true,
      notificationId: notificationResult.rows[0].id,
      message: 'Invite sent!'
    });
  } catch (error) {
    console.error('Send invite error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rooms/:roomId/update-chips - Host directly sets player chip amount
router.post('/:roomId/update-chips', withIdempotency, async (req, res) => {
  try {
    const { hostId, targetUserId, newAmount } = req.body;
    const { roomId } = req.params;
    
    if (!hostId || !targetUserId || newAmount === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Verify host
    const roomCheck = await db.query(
      'SELECT host_user_id FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomCheck.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Only host can adjust chips' });
    }
    
    // Update chips
    const updateResult = await db.query(
      'UPDATE room_seats SET chips_in_play = $1 WHERE room_id = $2 AND user_id = $3 RETURNING seat_index',
      [newAmount, roomId, targetUserId]
    );
    
    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Player not found in room' });
    }
    
    console.log(`💰 Host ${hostId} set player ${targetUserId} chips to ${newAmount}`);
    
    // Broadcast seat update
    const io = req.app.locals.io;
    if (io) {
      const seatsResult = await db.query(
        `SELECT rs.seat_index, rs.user_id, up.username, rs.chips_in_play, rs.status
         FROM room_seats rs
         LEFT JOIN user_profiles up ON rs.user_id = up.id
         WHERE rs.room_id = $1
         ORDER BY rs.seat_index`,
        [roomId]
      );
      
      const dbV2 = req.app.locals.dbV2;
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      
      io.to(`room:${roomId}`).emit('seat_update', {
        type: 'seat_update',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          roomId: roomId,
          seats: seatsResult.rows
        }
      });
      
      console.log(`📡 Broadcasted chip update to room:${roomId}`);
    }
    
    res.json({ ok: true });
  } catch (error) {
    console.error('Update chips error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rooms/:roomId/pause-game - Host pauses the game
router.post('/:roomId/pause-game', withIdempotency, async (req, res) => {
  try {
    const { hostId } = req.body;
    const { roomId } = req.params;
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Verify host
    const roomCheck = await db.query(
      'SELECT host_user_id, game_id FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomCheck.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Only host can pause game' });
    }
    
    const gameId = roomCheck.rows[0].game_id;
    if (!gameId) {
      return res.status(400).json({ error: 'No active game to pause' });
    }
    
    // Update game status
    await db.query(
      'UPDATE games SET status = $1 WHERE id = $2',
      ['PAUSED', gameId]
    );
    
    console.log(`⏸️ Host ${hostId} paused game ${gameId}`);
    
    // Broadcast
    const io = req.app.locals.io;
    if (io) {
      const dbV2 = req.app.locals.dbV2;
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      
      io.to(`room:${roomId}`).emit('game_paused', {
        type: 'game_paused',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          gameId: gameId,
          pausedBy: hostId
        }
      });
    }
    
    res.json({ ok: true, status: 'PAUSED' });
  } catch (error) {
    console.error('Pause game error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SEAT REQUEST MANAGEMENT
// ============================================

// GET /api/rooms/:roomId/seat-requests - Get pending seat requests (host only)
router.get('/:roomId/seat-requests', async (req, res) => {
  try {
    const { roomId } = req.params;
    const hostId = req.query.hostId || req.body.hostId;
    
    if (!hostId) {
      return res.status(400).json({ error: 'Missing hostId' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Verify host
    const roomCheck = await db.query(
      'SELECT host_user_id FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomCheck.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Only host can view seat requests' });
    }
    
    // Get pending requests with user info
    const requestsResult = await db.query(`
      SELECT 
        sr.id,
        sr.user_id,
        sr.seat_index,
        sr.requested_chips,
        sr.requested_at,
        up.username,
        up.display_name
      FROM seat_requests sr
      LEFT JOIN user_profiles up ON sr.user_id = up.id
      WHERE sr.room_id = $1 AND sr.status = 'PENDING'
      ORDER BY sr.requested_at ASC
    `, [roomId]);
    
    const requests = requestsResult.rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      username: row.username || row.display_name || `Guest_${row.user_id.substring(0, 6)}`,
      seatIndex: row.seat_index,
      requestedChips: row.requested_chips,
      requestedAt: row.requested_at
    }));
    
    res.json({ success: true, requests });
  } catch (error) {
    console.error('❌ Get seat requests error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rooms/:roomId/approve-seat-request - Host approves seat request
router.post('/:roomId/approve-seat-request', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId, requestId, approvedChips } = req.body;
    
    if (!hostId || !requestId) {
      return res.status(400).json({ error: 'Missing hostId or requestId' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Verify host
    const roomCheck = await db.query(
      'SELECT host_user_id FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomCheck.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Only host can approve seat requests' });
    }
    
    // Get request details
    const requestResult = await db.query(
      'SELECT * FROM seat_requests WHERE id = $1 AND room_id = $2 AND status = $3',
      [requestId, roomId, 'PENDING']
    );
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Seat request not found or already processed' });
    }
    
    const request = requestResult.rows[0];
    const finalChips = approvedChips !== undefined ? approvedChips : request.requested_chips;
    
    // Check if seat is still available
    const seatCheck = await db.query(
      'SELECT * FROM room_seats WHERE room_id = $1 AND seat_index = $2 AND left_at IS NULL',
      [roomId, request.seat_index]
    );
    
    if (seatCheck.rows.length > 0 && seatCheck.rows[0].user_id !== request.user_id) {
      // Seat was taken - reject request
      await db.query(
        'UPDATE seat_requests SET status = $1, resolved_at = NOW(), resolved_by = $2 WHERE id = $3',
        ['REJECTED', hostId, requestId]
      );
      return res.status(409).json({ error: 'Seat is no longer available' });
    }
    
    // Create/update seat
    await db.query(`
      INSERT INTO room_seats (room_id, user_id, seat_index, chips_in_play, is_spectator)
      VALUES ($1, $2, $3, $4, FALSE)
      ON CONFLICT (room_id, seat_index) 
      DO UPDATE SET user_id = $2, chips_in_play = $4, left_at = NULL, is_spectator = FALSE
    `, [roomId, request.user_id, request.seat_index, finalChips]);
    
    // Mark request as approved
    await db.query(
      'UPDATE seat_requests SET status = $1, resolved_at = NOW(), resolved_by = $2 WHERE id = $3',
      ['APPROVED', hostId, requestId]
    );
    
    // Cancel any other pending requests from this user
    await db.query(
      'UPDATE seat_requests SET status = $1, resolved_at = NOW(), resolved_by = $2 WHERE room_id = $3 AND user_id = $4 AND status = $5 AND id != $6',
      ['CANCELLED', hostId, roomId, request.user_id, 'PENDING', requestId]
    );
    
    console.log(`✅ Seat request approved: User ${request.user_id.substr(0, 8)} -> Seat ${request.seat_index} with $${finalChips}`);
    
    // Get username for notification
    const usernameResult = await db.query(
      'SELECT username, display_name FROM user_profiles WHERE id = $1',
      [request.user_id]
    );
    const username = usernameResult.rows[0]?.username || usernameResult.rows[0]?.display_name || 'Player';
    
    // Broadcast updates
    const io = req.app.locals.io;
    if (io) {
      // Notify requester
      io.to(`user:${request.user_id}`).emit('seat_request_approved', {
        requestId,
        seatIndex: request.seat_index,
        chips: finalChips,
        message: 'Your seat request was approved!'
      });
      
      // Broadcast seat update to room
      io.to(`room:${roomId}`).emit('seat_update', {
        type: 'seat_claimed',
        roomId,
        seatIndex: request.seat_index,
        userId: request.user_id
      });
      
      // Notify all spectators that request was processed (includes username)
      io.to(`room:${roomId}`).emit('seat_request_resolved', {
        requestId,
        status: 'APPROVED',
        userId: request.user_id,
        username, // ADD THIS for corner notification
        seatIndex: request.seat_index
      });
    }
    
    res.json({ 
      success: true, 
      seatIndex: request.seat_index,
      chips: finalChips 
    });
  } catch (error) {
    console.error('❌ Approve seat request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rooms/:roomId/reject-seat-request - Host rejects seat request
router.post('/:roomId/reject-seat-request', async (req, res) => {
  try {
    const { roomId } = req.params;
    const { hostId, requestId } = req.body;
    
    if (!hostId || !requestId) {
      return res.status(400).json({ error: 'Missing hostId or requestId' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Verify host
    const roomCheck = await db.query(
      'SELECT host_user_id FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomCheck.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Only host can reject seat requests' });
    }
    
    // Get request to get user_id
    const requestResult = await db.query(
      'SELECT user_id FROM seat_requests WHERE id = $1 AND room_id = $2 AND status = $3',
      [requestId, roomId, 'PENDING']
    );
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ error: 'Seat request not found or already processed' });
    }
    
    const userId = requestResult.rows[0].user_id;
    
    // Mark request as rejected
    await db.query(
      'UPDATE seat_requests SET status = $1, resolved_at = NOW(), resolved_by = $2 WHERE id = $3',
      ['REJECTED', hostId, requestId]
    );
    
    console.log(`❌ Seat request rejected: Request ${requestId}`);
    
    // Broadcast rejection
    const io = req.app.locals.io;
    if (io) {
      // Notify requester
      // Get seat index from request before deleting
      const requestSeatIndex = requestResult.rows[0]?.seat_index;
      
      io.to(`user:${userId}`).emit('seat_request_rejected', {
        requestId,
        seatIndex: requestSeatIndex,
        message: 'Your seat request was rejected by the host'
      });
      
      // Notify host
      io.to(`room:${roomId}`).emit('seat_request_resolved', {
        requestId,
        status: 'REJECTED',
        userId,
        seatIndex: requestSeatIndex
      });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Reject seat request error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rooms/:roomId/resume-game - Host resumes the game
router.post('/:roomId/resume-game', withIdempotency, async (req, res) => {
  try {
    const { hostId } = req.body;
    const { roomId } = req.params;
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Verify host
    const roomCheck = await db.query(
      'SELECT host_user_id, game_id FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomCheck.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomCheck.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Only host can resume game' });
    }
    
    const gameId = roomCheck.rows[0].game_id;
    if (!gameId) {
      return res.status(400).json({ error: 'No game to resume' });
    }
    
    // Update game status
    await db.query(
      'UPDATE games SET status = $1 WHERE id = $2',
      ['ACTIVE', gameId]
    );
    
    console.log(`▶️ Host ${hostId} resumed game ${gameId}`);
    
    // Broadcast
    const io = req.app.locals.io;
    if (io) {
      const dbV2 = req.app.locals.dbV2;
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      
      io.to(`room:${roomId}`).emit('game_resumed', {
        type: 'game_resumed',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          gameId: gameId,
          resumedBy: hostId
        }
      });
    }
    
    res.json({ ok: true, status: 'ACTIVE' });
  } catch (error) {
    console.error('Resume game error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

