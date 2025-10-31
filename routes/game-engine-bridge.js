// MINIMAL POKER API - CLEAN SLATE
// Only uses columns that ACTUALLY exist in the database
// No dependencies, no complexity, no bullshit

const express = require('express');
const router = express.Router();

/**
 * PHILOSOPHY:
 * - Only query columns we KNOW exist (verified from Schemasnapshot.txt)
 * - No SessionService, no complex middleware
 * - Test each endpoint with curl before UI
 * - If it breaks, we know exactly why
 */

// ============================================
// ENDPOINT 0: HYDRATE (CRITICAL FOR REFRESH)
// ============================================
// GET /api/engine/hydrate/:roomId/:userId
// Returns: Current game state + player's hole cards + action buttons state

router.get('/hydrate/:roomId/:userId', async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    
    console.log('💧 [GAME] Hydrating game state for:', { roomId: roomId.substr(0, 8), userId: userId.substr(0, 8) });
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // First check if room is ACTIVE (has an ongoing game)
    const roomResult = await db.query(
      `SELECT status, game_id FROM rooms WHERE id = $1`,
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = roomResult.rows[0];
    
    // If room status is not ACTIVE, or no game_id, return lobby state
    if (room.status !== 'ACTIVE' || !room.game_id) {
      console.log('   ⏸️  Room not active or no game - lobby state');
      return res.json({
        hasActiveGame: false,
        roomStatus: room.status
      });
    }
    
    // Room is ACTIVE - get the current game state (use game_id from rooms, not status filter)
    const gameResult = await db.query(
      `SELECT id, current_state, hand_number, total_pot, status, created_at
       FROM game_states
       WHERE id = $1`,
      [room.game_id]
    );
    
    if (gameResult.rows.length === 0) {
      console.log('   ❌ Room says ACTIVE but game not found - data inconsistency');
      return res.json({
        hasActiveGame: false,
        roomStatus: 'WAITING'
      });
    }
    
    // CRITICAL: current_state is JSONB in Postgres, which returns an object, NOT a string
    // Do NOT call JSON.parse() on it - it's already parsed
    const gameState = gameResult.rows[0].current_state;
    console.log(`   🎮 Active game found - Hand #${gameState.handNumber}, Street: ${gameState.street}`);
    
    // Get player's hole cards (private)
    const myPlayer = gameState.players.find(p => p.userId === userId);
    const myHoleCards = myPlayer ? myPlayer.holeCards : [];
    
    // Create public game state (no hole cards)
    const publicGameState = {
      ...gameState,
      players: gameState.players.map(p => ({
        userId: p.userId,
        seatIndex: p.seatIndex,
        chips: p.chips,
        bet: p.bet,
        folded: p.folded,
        status: p.status
      }))
    };
    
    console.log('   ✅ Hydration complete');
    
    res.json({
      hasActiveGame: true,
      gameState: publicGameState,
      myHoleCards,
      isMyTurn: gameState.currentActorSeat === myPlayer?.seatIndex,
      gameId: gameResult.rows[0].id
    });
    
  } catch (error) {
    console.error('❌ [GAME] Hydration error:', error);
    res.status(500).json({ error: 'Failed to hydrate', details: error.message });
  }
});

// ============================================
// ENDPOINT 1: CLAIM SEAT
// ============================================
// POST /api/minimal/claim-seat
// Body: { roomId, userId, seatIndex }
// Returns: { success: true, seat: {...} }

router.post('/claim-seat', async (req, res) => {
  try {
    const { roomId, userId, seatIndex, nickname } = req.body;
    
    console.log('🪑 [MINIMAL] Claim seat:', { roomId, userId, seatIndex, nickname });
    
    // Validate input
    if (!roomId || !userId || seatIndex === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, userId, seatIndex' 
      });
    }
    
    if (seatIndex < 0 || seatIndex > 8) {
      return res.status(400).json({ 
        error: 'seatIndex must be 0-8' 
      });
    }
    
    // Validate nickname if provided
    if (nickname && (nickname.length < 3 || nickname.length > 15)) {
      return res.status(400).json({
        error: 'Nickname must be 3-15 characters'
      });
    }
    
    // Validate nickname format (alphanumeric + underscore only)
    if (nickname && !/^[a-zA-Z0-9_]+$/.test(nickname)) {
      return res.status(400).json({
        error: 'Nickname can only contain letters, numbers, and underscores'
      });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Check if seat is available
    const checkResult = await db.query(
      `SELECT user_id FROM room_seats 
       WHERE room_id = $1 AND seat_index = $2 AND left_at IS NULL`,
      [roomId, seatIndex]
    );
    
    if (checkResult.rows.length > 0 && checkResult.rows[0].user_id !== userId) {
      return res.status(409).json({ 
        error: 'Seat already taken',
        occupiedBy: checkResult.rows[0].user_id
      });
    }
    
    // Ensure user profile exists (for guest users)
    // This prevents foreign key constraint violations
    try {
      await db.query(
        `INSERT INTO user_profiles (id, username, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [userId, `Guest_${userId.substr(0, 6)}`]
      );
    } catch (profileError) {
      console.warn('⚠️ Could not create user profile (non-critical):', profileError.message);
    }
    
    // Generate default nickname if not provided
    const finalNickname = nickname || `Guest_${userId.substring(0, 6)}`;
    
    // Claim the seat with nickname
    const insertResult = await db.query(
      `INSERT INTO room_seats (room_id, user_id, seat_index, chips_in_play, status, nickname, joined_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (room_id, seat_index) 
       DO UPDATE SET 
         user_id = $2,
         chips_in_play = $4,
         status = $5,
         nickname = $6,
         joined_at = NOW(),
         left_at = NULL
       RETURNING *`,
      [roomId, userId, seatIndex, 1000, 'SEATED', finalNickname]
    );
    
    const seat = insertResult.rows[0];
    
    console.log('✅ [MINIMAL] Seat claimed:', seat);
    
    // Broadcast to room (if Socket.IO available)
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${roomId}`).emit('seat_update', {
        roomId,
        seatIndex,
        userId,
        action: 'claimed'
      });
      console.log(`📡 [MINIMAL] Broadcast seat_update to room:${roomId}`);
    }
    
    res.json({ 
      success: true, 
      seat: {
        seatIndex: seat.seat_index,
        userId: seat.user_id,
        chips: seat.chips_in_play,
        status: seat.status
      }
    });
    
  } catch (error) {
    console.error('❌ [MINIMAL] Claim seat error:', error);
    res.status(500).json({ 
      error: 'Failed to claim seat',
      details: error.message 
    });
  }
});

// ============================================
// ENDPOINT 2: GET SEATS
// ============================================
// GET /api/minimal/seats/:roomId
// Returns: { seats: [{seatIndex, userId, chips, status}, ...] }

router.get('/seats/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    console.log('🔍 [MINIMAL] Get seats:', roomId);
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get all seats with nicknames
    const result = await db.query(
      `SELECT 
         seat_index,
         user_id,
         chips_in_play,
         status,
         nickname,
         joined_at
       FROM room_seats
       WHERE room_id = $1 AND left_at IS NULL
       ORDER BY seat_index`,
      [roomId]
    );
    
    // Create array of 9 seats (null if empty)
    const seatsArray = Array(9).fill(null);
    
    result.rows.forEach(row => {
      seatsArray[row.seat_index] = {
        seatIndex: row.seat_index,
        userId: row.user_id,
        nickname: row.nickname || `Guest_${row.user_id.substring(0, 6)}`,
        chips: row.chips_in_play,
        status: row.status,
        joinedAt: row.joined_at
      };
    });
    
    console.log('✅ [MINIMAL] Seats retrieved:', result.rows.length, 'occupied');
    
    res.json({ 
      seats: seatsArray,
      occupiedCount: result.rows.length
    });
    
  } catch (error) {
    console.error('❌ [MINIMAL] Get seats error:', error);
    res.status(500).json({ 
      error: 'Failed to get seats',
      details: error.message 
    });
  }
});

// ============================================
// ENDPOINT 3: DEAL CARDS (REAL GAME STATE)
// ============================================
// POST /api/minimal/deal-cards
// Body: { roomId, userId }
// Returns: { cards: ['Ah', 'Kd'], gameState: {...} }

router.post('/deal-cards', async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    
    console.log('🃏 [MINIMAL] Starting real hand:', { roomId, userId });
    
    if (!roomId || !userId) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, userId' 
      });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get room info (need blinds + verify host)
    const roomResult = await db.query(
      `SELECT small_blind, big_blind, host_user_id FROM rooms WHERE id = $1`,
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const { small_blind, big_blind, host_user_id } = roomResult.rows[0];
    
    // HOST-ONLY CHECK: Only the host can start a hand
    if (userId !== host_user_id) {
      console.log(`❌ [MINIMAL] Non-host tried to start hand: ${userId} (host: ${host_user_id})`);
      return res.status(403).json({ 
        error: 'Only the host can start a hand',
        hostId: host_user_id 
      });
    }
    
    console.log(`✅ [MINIMAL] Host verified: ${userId}`);
    
    // Get all seated players
    const playersResult = await db.query(
      `SELECT user_id, seat_index, chips_in_play 
       FROM room_seats 
       WHERE room_id = $1 AND left_at IS NULL
       ORDER BY seat_index`,
      [roomId]
    );
    
    const seatedPlayers = playersResult.rows;
    
    if (seatedPlayers.length < 2) {
      return res.status(400).json({ 
        error: 'Need at least 2 players to start hand',
        currentPlayers: seatedPlayers.length
      });
    }
    
    console.log(`🎲 Starting hand with ${seatedPlayers.length} players`);
    
    // ===== STEP 1: CREATE SHUFFLED DECK =====
    const suits = ['h', 'd', 'c', 's']; // hearts, diamonds, clubs, spades
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    
    const deck = [];
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push(`${rank}${suit}`); // e.g., "Ah", "Kd", "2c"
      });
    });
    
    // Shuffle (Fisher-Yates)
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    console.log('🃏 Deck shuffled, total cards:', deck.length);
    
    // ===== STEP 2: DEAL HOLE CARDS =====
    const players = seatedPlayers.map((player, index) => {
      const card1 = deck.pop();
      const card2 = deck.pop();
      
      return {
        userId: player.user_id,
        seatIndex: player.seat_index,
        chips: parseInt(player.chips_in_play),
        holeCards: [card1, card2],
        bet: 0,
        folded: false,
        status: 'ACTIVE'
      };
    });
    
    console.log('🎴 Dealt hole cards to all players');
    
    // ===== STEP 3: DETERMINE POSITIONS =====
    // Dealer button: first player (for now, later we'll rotate)
    // Small blind: next player after dealer
    // Big blind: next player after small blind
    
    const dealerPosition = 0;
    const sbPosition = (dealerPosition + 1) % players.length;
    const bbPosition = (dealerPosition + 2) % players.length;
    
    // Heads-up exception: dealer posts SB, other player posts BB
    if (players.length === 2) {
      players[dealerPosition].bet = small_blind;
      players[dealerPosition].chips -= small_blind;
      players[(dealerPosition + 1) % 2].bet = big_blind;
      players[(dealerPosition + 1) % 2].chips -= big_blind;
    } else {
      // 3+ players: normal blinds
      players[sbPosition].bet = small_blind;
      players[sbPosition].chips -= small_blind;
      players[bbPosition].bet = big_blind;
      players[bbPosition].chips -= big_blind;
    }
    
    const pot = small_blind + big_blind;
    
    console.log(`💰 Blinds posted: SB=${small_blind}, BB=${big_blind}, Pot=${pot}`);
    
    // ===== STEP 4: DETERMINE FIRST ACTOR =====
    // First to act is player after BB (in heads-up, it's the dealer/SB)
    const firstActorIndex = players.length === 2 ? dealerPosition : (bbPosition + 1) % players.length;
    const currentActorSeat = players[firstActorIndex].seatIndex;
    
    console.log(`👉 First to act: Seat ${currentActorSeat}`);
    
    // ===== STEP 5: CREATE GAME STATE JSONB =====
    const gameState = {
      roomId,
      handNumber: 1,
      street: 'PREFLOP',
      pot,
      currentBet: big_blind,
      communityCards: [],
      deck: deck, // Remaining cards for flop/turn/river
      dealerPosition: players[dealerPosition].seatIndex,
      sbPosition: players.length === 2 ? players[dealerPosition].seatIndex : players[sbPosition].seatIndex,
      bbPosition: players.length === 2 ? players[(dealerPosition + 1) % 2].seatIndex : players[bbPosition].seatIndex,
      currentActorSeat,
      players: players.map(p => ({
        userId: p.userId,
        seatIndex: p.seatIndex,
        chips: p.chips,
        bet: p.bet,
        holeCards: p.holeCards, // Stored in DB but only sent to card owner
        folded: p.folded,
        status: p.status
      })),
      actionHistory: [], // Track all actions for betting round completion
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString()
    };
    
    // ===== STEP 6: SAVE TO DATABASE =====
    const gameStateId = `minimal_${Date.now()}_${roomId.substr(0, 8)}`;
    
    await db.query(
      `INSERT INTO game_states (id, room_id, host_user_id, current_state, hand_number, total_pot, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [gameStateId, roomId, host_user_id, JSON.stringify(gameState), 1, pot, 'active']
    );
    
    // Update room status and link game
    await db.query(
      `UPDATE rooms SET status = 'ACTIVE', game_id = $1 WHERE id = $2`,
      [gameStateId, roomId]
    );
    
    console.log(`💾 Game state saved: ${gameStateId}`);
    
    // ===== STEP 7: BROADCAST PUBLIC STATE =====
    const io = req.app.locals.io;
    if (io) {
      // Public state (no hole cards)
      const publicState = {
        ...gameState,
        players: gameState.players.map(p => ({
          userId: p.userId,
          seatIndex: p.seatIndex,
          chips: p.chips,
          bet: p.bet,
          folded: p.folded,
          status: p.status
          // holeCards intentionally omitted
        }))
      };
      
      io.to(`room:${roomId}`).emit('hand_started', {
        roomId,
        gameStateId,
        gameState: publicState
      });
      
      console.log(`📡 Broadcast hand_started to room:${roomId}`);
      
      // NOTE: Private hole cards sent via HTTP response below
      // WebSocket private emit requires users to join user-specific rooms on connection
      // We'll add that in Phase 2b
    }
    
    // ===== STEP 8: RETURN RESPONSE =====
    // Find requesting player's cards
    const requestingPlayer = players.find(p => p.userId === userId);
    
    if (!requestingPlayer) {
      return res.status(403).json({ 
        error: 'User not in this hand' 
      });
    }
    
    res.json({ 
      success: true,
      cards: requestingPlayer.holeCards,
      gameStateId,
      gameState: {
        pot,
        currentBet: big_blind,
        currentActorSeat,
        street: 'PREFLOP',
        playerCount: players.length
      }
    });
    
  } catch (error) {
    console.error('❌ [MINIMAL] Deal cards error:', error);
    res.status(500).json({ 
      error: 'Failed to deal cards',
      details: error.message 
    });
  }
});

// ============================================
// ENDPOINT 4: GET ROOM INFO
// ============================================
// GET /api/minimal/room/:roomId
// Returns: { room: {id, name, code, blinds, etc.} }

router.get('/room/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    console.log('🏠 [MINIMAL] Get room:', roomId);
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get room (ONLY use columns that exist)
    const result = await db.query(
      `SELECT 
         id,
         name,
         invite_code,
         host_user_id,
         max_players,
         small_blind,
         big_blind,
         status,
         game_id
       FROM rooms
       WHERE id = $1`,
      [roomId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = result.rows[0];
    
    console.log('✅ [MINIMAL] Room retrieved:', room.name);
    
    res.json({ 
      room: {
        id: room.id,
        name: room.name,
        code: room.invite_code,
        hostId: room.host_user_id,
        maxPlayers: room.max_players,
        smallBlind: room.small_blind,
        bigBlind: room.big_blind,
        status: room.status,
        gameId: room.game_id
      }
    });
    
  } catch (error) {
    console.error('❌ [MINIMAL] Get room error:', error);
    res.status(500).json({ 
      error: 'Failed to get room',
      details: error.message 
    });
  }
});

// ============================================
// ENDPOINT 5: PERFORM ACTION (PRODUCTION LOGIC)
// ============================================
// POST /api/minimal/action
// Body: { roomId, userId, action, amount }
// Returns: { success: true, gameState, ... }

const { MinimalBettingAdapter } = require('../src/adapters/minimal-engine-bridge');

router.post('/action', async (req, res) => {
  try {
    const { roomId, userId, action, amount } = req.body;
    
    console.log('🎮 [MINIMAL] Action:', { roomId, userId, action, amount });
    
    if (!roomId || !userId || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, userId, action' 
      });
    }
    
    // Validate action
    const validActions = ['FOLD', 'CALL', 'RAISE', 'CHECK', 'ALL_IN'];
    if (!validActions.includes(action)) {
      return res.status(400).json({ 
        error: `Invalid action. Must be one of: ${validActions.join(', ')}` 
      });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // ===== STEP 1: GET CURRENT GAME STATE =====
    const gameStateResult = await db.query(
      `SELECT current_state FROM game_states
       WHERE room_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [roomId]
    );
    
    if (gameStateResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active game in this room' });
    }
    
    const currentState = gameStateResult.rows[0].current_state;
    
    // ===== STEP 2: PROCESS ACTION (PRODUCTION LOGIC) =====
    const result = MinimalBettingAdapter.processAction(currentState, userId, action, amount);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const updatedState = result.gameState;
    
    // ===== STEP 3: SAVE TO DATABASE =====
    await db.query(
      `UPDATE game_states 
       SET current_state = $1, 
           total_pot = $2, 
           updated_at = NOW()
       WHERE room_id = $3 AND status = 'active'`,
      [JSON.stringify(updatedState), updatedState.pot, roomId]
    );
    
    console.log(`✅ [MINIMAL] Action processed: ${userId.substr(0, 8)} ${action} $${amount || 0}`);
    console.log(`   Pot: ${updatedState.pot}, Current Bet: ${updatedState.currentBet}, Street: ${updatedState.street}`);
    
    // ===== STEP 3B: PERSIST CHIPS TO DB IF HAND COMPLETE =====
    if (updatedState.status === 'COMPLETED') {
      console.log('💰 [MINIMAL] Hand complete - persisting chips to DB');
      console.log('   Players in updatedState:', updatedState.players.map(p => ({ 
        userId: p.userId.substr(0, 8), 
        chips: p.chips 
      })));
      
      // Update room_seats with final chip counts
      for (const player of updatedState.players) {
        console.log(`   🔄 Attempting UPDATE for ${player.userId.substr(0, 8)}: chips=${player.chips}, roomId=${roomId.substr(0, 8)}`);
        
        const updateResult = await db.query(
          `UPDATE room_seats 
           SET chips_in_play = $1 
           WHERE room_id = $2 AND user_id = $3
           RETURNING user_id, chips_in_play`,
          [player.chips, roomId, player.userId]
        );
        
        if (updateResult.rows.length === 0) {
          console.error(`   ❌ UPDATE failed - no rows matched! userId=${player.userId.substr(0, 8)}, roomId=${roomId.substr(0, 8)}`);
        } else {
          console.log(`   ✅ Updated chips for ${updateResult.rows[0].user_id.substr(0, 8)}: $${updateResult.rows[0].chips_in_play}`);
        }
      }
      
      // Mark game_states as completed
      await db.query(
        `UPDATE game_states 
         SET status = 'completed' 
         WHERE room_id = $1 AND status = 'active'`,
        [roomId]
      );
      
      // Reset room status to WAITING for next hand
      await db.query(
        `UPDATE rooms 
         SET status = 'WAITING' 
         WHERE id = $1`,
        [roomId]
      );
      
      // VERIFY: Query room_seats to confirm chips were updated
      const verifyResult = await db.query(
        `SELECT user_id, chips_in_play FROM room_seats WHERE room_id = $1 ORDER BY seat_index`,
        [roomId]
      );
      console.log('🔍 [MINIMAL] VERIFICATION - room_seats after update:');
      verifyResult.rows.forEach(row => {
        console.log(`   ${row.user_id.substr(0, 8)}: $${row.chips_in_play}`);
      });
      
      console.log('✅ [MINIMAL] Chips persisted, game marked complete, room ready for next hand');
    }
    
    // ===== STEP 4: BROADCAST TO ALL PLAYERS =====
    const io = req.app.locals.io;
    if (io) {
      // Public state (no hole cards)
      const publicState = {
        ...updatedState,
        players: updatedState.players.map(p => ({
          userId: p.userId,
          seatIndex: p.seatIndex,
          chips: p.chips,
          bet: p.bet,
          folded: p.folded,
          status: p.status
          // holeCards intentionally omitted
        }))
      };
      
      io.to(`room:${roomId}`).emit('action_processed', {
        userId,
        action,
        amount: amount || 0,
        gameState: publicState
      });
      
      console.log(`📡 [MINIMAL] Broadcast action_processed to room:${roomId}`);
    }
    
    res.json({ 
      success: true,
      action,
      gameState: {
        pot: updatedState.pot,
        currentBet: updatedState.currentBet,
        currentActorSeat: updatedState.currentActorSeat,
        street: updatedState.street,
        communityCards: updatedState.communityCards || [],
        status: updatedState.status
      }
    });
    
  } catch (error) {
    console.error('❌ [MINIMAL] Action error:', error);
    res.status(500).json({ 
      error: 'Failed to perform action',
      details: error.message 
    });
  }
});

// ============================================
// ENDPOINT 6: GET GAME STATE (REAL FROM DB)
// ============================================
// GET /api/minimal/game/:roomId
// Returns: { pot, currentBet, communityCards, currentActor, phase, players }

router.get('/game/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    
    console.log('🎲 [MINIMAL] Get game state:', roomId);
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get the latest game state for this room
    const result = await db.query(
      `SELECT id, current_state, hand_number, total_pot, status
       FROM game_states
       WHERE room_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [roomId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No active game in this room',
        roomId 
      });
    }
    
    const gameStateRow = result.rows[0];
    const gameState = gameStateRow.current_state;
    
    console.log(`✅ [MINIMAL] Game state retrieved: ${gameStateRow.id}`);
    
    // Return public game state (no hole cards)
    res.json({
      gameStateId: gameStateRow.id,
      pot: gameState.pot,
      currentBet: gameState.currentBet,
      communityCards: gameState.communityCards || [],
      currentActorSeat: gameState.currentActorSeat,
      street: gameState.street,
      dealerPosition: gameState.dealerPosition,
      sbPosition: gameState.sbPosition,
      bbPosition: gameState.bbPosition,
      players: gameState.players.map(p => ({
        userId: p.userId,
        seatIndex: p.seatIndex,
        chips: p.chips,
        bet: p.bet,
        folded: p.folded,
        status: p.status
        // holeCards intentionally omitted
      })),
      handNumber: gameState.handNumber,
      status: gameState.status
    });
    
  } catch (error) {
    console.error('❌ [MINIMAL] Get game state error:', error);
    res.status(500).json({ 
      error: 'Failed to get game state',
      details: error.message 
    });
  }
});

// ============================================
// ENDPOINT 7: GET MY HOLE CARDS
// ============================================
// GET /api/minimal/my-cards/:roomId/:userId
// Returns: { cards: ['Ah', 'Kd'] } (private to requesting user)

router.get('/my-cards/:roomId/:userId', async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    
    console.log('🔒 [MINIMAL] Get my hole cards:', { roomId, userId });
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get the latest game state for this room
    const result = await db.query(
      `SELECT current_state FROM game_states
       WHERE room_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [roomId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'No active game in this room' 
      });
    }
    
    const gameState = result.rows[0].current_state;
    
    // Find this user's hole cards
    const player = gameState.players.find(p => p.userId === userId);
    
    if (!player) {
      return res.status(404).json({ 
        error: 'User not in this hand' 
      });
    }
    
    console.log(`✅ [MINIMAL] Hole cards retrieved for ${userId.substr(0, 8)}`);
    
    res.json({ 
      success: true,
      cards: player.holeCards || []
    });
    
  } catch (error) {
    console.error('❌ [MINIMAL] Get my cards error:', error);
    res.status(500).json({ 
      error: 'Failed to get hole cards',
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
    message: 'Minimal API is running',
    endpoints: [
      'POST /api/minimal/claim-seat',
      'GET /api/minimal/seats/:roomId',
      'POST /api/minimal/deal-cards',
      'GET /api/minimal/room/:roomId',
      'POST /api/minimal/action',
      'GET /api/minimal/game/:roomId',
      'GET /api/minimal/my-cards/:roomId/:userId'
    ]
  });
});

// ============================================
// ENDPOINT 7: START NEXT HAND (PRODUCTION FLOW)
// ============================================
// POST /api/game/next-hand
// Body: { roomId, userId }
// Returns: { success: true, gameId, handNumber }

router.post('/next-hand', async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    
    console.log('🎬 [GAME] Starting next hand:', { roomId, userId });
    
    if (!roomId || !userId) {
      return res.status(400).json({ error: 'Missing roomId or userId' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // ===== STEP 1: VERIFY HOST =====
    const roomResult = await db.query(
      `SELECT host_user_id, small_blind, big_blind, dealer_position FROM rooms WHERE id = $1`,
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const { host_user_id, small_blind, big_blind, dealer_position } = roomResult.rows[0];
    
    if (userId !== host_user_id) {
      return res.status(403).json({ error: 'Only host can start next hand' });
    }
    
    // ===== STEP 2: GET SEATED PLAYERS WITH CURRENT CHIPS =====
    const playersResult = await db.query(
      `SELECT user_id, seat_index, chips_in_play 
       FROM room_seats 
       WHERE room_id = $1 AND left_at IS NULL AND status != 'ELIMINATED'
       ORDER BY seat_index`,
      [roomId]
    );
    
    const seatedPlayers = playersResult.rows;
    
    if (seatedPlayers.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players' });
    }
    
    console.log(`🎲 [GAME] Starting hand with ${seatedPlayers.length} players`);
    seatedPlayers.forEach(p => {
      console.log(`   Player ${p.user_id.substr(0, 8)} (Seat ${p.seat_index}): $${p.chips_in_play}`);
    });
    
    // ===== STEP 3: ROTATE DEALER =====
    const oldDealer = dealer_position || 0;
    const newDealer = (oldDealer + 1) % seatedPlayers.length;
    
    console.log(`🔄 [GAME] Dealer rotation: ${oldDealer} → ${newDealer}`);
    
    await db.query(
      `UPDATE rooms SET dealer_position = $1 WHERE id = $2`,
      [newDealer, roomId]
    );
    
    // ===== STEP 4: CALCULATE POSITIONS =====
    const dealerSeatIndex = seatedPlayers[newDealer].seat_index;
    const sbPlayerIndex = (newDealer + 1) % seatedPlayers.length;
    const bbPlayerIndex = (newDealer + 2) % seatedPlayers.length;
    const sbSeatIndex = seatedPlayers[sbPlayerIndex].seat_index;
    const bbSeatIndex = seatedPlayers[bbPlayerIndex].seat_index;
    
    // First to act preflop (after BB)
    const firstActorIndex = (newDealer + 3) % seatedPlayers.length;
    const firstActorSeatIndex = seatedPlayers[firstActorIndex].seat_index;
    
    console.log(`🎯 [GAME] Positions - Dealer: Seat ${dealerSeatIndex}, SB: Seat ${sbSeatIndex}, BB: Seat ${bbSeatIndex}, First Actor: Seat ${firstActorSeatIndex}`);
    
    // ===== STEP 5: CREATE DECK & SHUFFLE =====
    const suits = ['h', 'd', 'c', 's'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    
    const deck = [];
    suits.forEach(suit => {
      ranks.forEach(rank => {
        deck.push(`${rank}${suit}`);
      });
    });
    
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    console.log('🃏 [GAME] Deck shuffled');
    
    // ===== STEP 6: DEAL HOLE CARDS =====
    const players = seatedPlayers.map((player) => {
      const card1 = deck.pop();
      const card2 = deck.pop();
      
      return {
        userId: player.user_id,
        seatIndex: player.seat_index,
        chips: parseInt(player.chips_in_play), // READ FROM DB
        holeCards: [card1, card2],
        bet: 0,
        folded: false,
        status: 'ACTIVE'
      };
    });
    
    console.log('🎴 [GAME] Dealt hole cards');
    
    // ===== STEP 7: POST BLINDS =====
    const sbPlayer = players.find(p => p.seatIndex === sbSeatIndex);
    const bbPlayer = players.find(p => p.seatIndex === bbSeatIndex);
    
    sbPlayer.chips -= small_blind;
    sbPlayer.bet = small_blind;
    
    bbPlayer.chips -= big_blind;
    bbPlayer.bet = big_blind;
    
    const pot = small_blind + big_blind;
    
    console.log(`💰 [GAME] Blinds posted - SB: $${small_blind}, BB: $${big_blind}, Pot: $${pot}`);
    
    // ===== STEP 8: GET HAND NUMBER =====
    const handCountResult = await db.query(
      `SELECT COUNT(*) FROM game_states WHERE room_id = $1`,
      [roomId]
    );
    const handNumber = parseInt(handCountResult.rows[0].count) + 1;
    
    // ===== STEP 9: CREATE GAME STATE =====
    const gameStateId = `game_${Date.now()}_${roomId.substr(0, 8)}`;
    
    const gameState = {
      roomId,
      handNumber,
      street: 'PREFLOP',
      pot,
      currentBet: big_blind,
      communityCards: [],
      deck: deck, // Remaining cards
      dealerPosition: dealerSeatIndex,
      sbPosition: sbSeatIndex,
      bbPosition: bbSeatIndex,
      currentActorSeat: firstActorSeatIndex,
      players: players,
      actionHistory: [],
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString()
    };
    
    // ===== STEP 10: SAVE TO DATABASE =====
    await db.query(
      `INSERT INTO game_states (id, room_id, host_user_id, current_state, hand_number, total_pot, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [gameStateId, roomId, host_user_id, JSON.stringify(gameState), handNumber, pot, 'active']
    );
    
    // Update room status
    await db.query(
      `UPDATE rooms SET status = 'ACTIVE', game_id = $1 WHERE id = $2`,
      [gameStateId, roomId]
    );
    
    console.log(`✅ [GAME] Hand #${handNumber} created: ${gameStateId}`);
    
    // ===== STEP 11: BROADCAST =====
    const io = req.app.locals.io;
    if (io) {
      const publicState = {
        ...gameState,
        players: gameState.players.map(p => ({
          userId: p.userId,
          seatIndex: p.seatIndex,
          chips: p.chips,
          bet: p.bet,
          folded: p.folded,
          status: p.status
          // holeCards omitted
        }))
      };
      
      io.to(`room:${roomId}`).emit('hand_started', {
        roomId,
        gameStateId,
        handNumber,
        gameState: publicState
      });
      
      console.log(`📡 [GAME] Broadcast hand_started for Hand #${handNumber}`);
    }
    
    // ===== STEP 12: RETURN =====
    const requestingPlayer = players.find(p => p.userId === userId);
    
    res.json({
      success: true,
      gameStateId,
      handNumber,
      cards: requestingPlayer ? requestingPlayer.holeCards : [],
      gameState: {
        pot,
        currentBet: big_blind,
        currentActorSeat: firstActorSeatIndex,
        street: 'PREFLOP',
        dealerPosition: dealerSeatIndex,
        handNumber
      }
    });
    
  } catch (error) {
    console.error('❌ [GAME] Next hand error:', error);
    res.status(500).json({ error: 'Failed to start next hand', details: error.message });
  }
});

module.exports = router;

