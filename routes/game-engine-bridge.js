// MINIMAL POKER API - CLEAN SLATE
// Only uses columns that ACTUALLY exist in the database
// No dependencies, no complexity, no bullshit

const express = require('express');
const router = express.Router();
const { 
  setLogDetail, 
  logActionSummary, 
  logActionDetail 
} = require('../src/utils/action-logger');

setLogDetail(process.env.ENGINE_LOG_DETAIL);

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
    
    logActionSummary({
      phase: 'hydrate',
      roomId,
      playerId: userId
    });
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Check if room has an active game
    const roomResult = await db.query(
      `SELECT game_id FROM rooms WHERE id = $1`,
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = roomResult.rows[0];
    
    // If no game_id, return lobby state
    if (!room.game_id) {
      logActionDetail('hydrate.status', { hasActiveGame: false });
      return res.json({
        hasActiveGame: false,
        roomStatus: 'WAITING'
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
      logActionDetail('hydrate.status', { hasActiveGame: false, reason: 'room-record-missing-game' });
      return res.json({
        hasActiveGame: false,
        roomStatus: 'WAITING'
      });
    }
    
    // CRITICAL: current_state is JSONB in Postgres, which returns an object, NOT a string
    // Do NOT call JSON.parse() on it - it's already parsed
    const gameState = gameResult.rows[0].current_state;
    logActionSummary({
      phase: 'hydrate',
      roomId,
      playerId: userId,
      handNumber: gameState.handNumber,
      street: gameState.street,
      metadata: { hasActiveGame: true }
    });
    
    // ARCHITECTURAL FIX: Reset stale betting state if on PREFLOP
    // This prevents minRaise from previous hand persisting (e.g., minRaise=400 when it should be bigBlind=10)
    if (gameState.street === 'PREFLOP') {
      const roomBlinds = await db.query(
        `SELECT small_blind, big_blind FROM rooms WHERE id = $1`,
        [roomId]
      );
      if (roomBlinds.rows.length > 0) {
        const { big_blind } = roomBlinds.rows[0];
        // CRITICAL: Reset minRaise to bigBlind if it's incorrect (stale from previous hand)
        if (gameState.minRaise !== big_blind && gameState.minRaise > big_blind) {
          logActionDetail('hydrate.fixMinRaise', { from: gameState.minRaise, to: big_blind });
          gameState.minRaise = big_blind;
        }
        // CRITICAL: Reset raise tracking fields if they're stale
        if (gameState.lastRaiseSize > 0 || gameState.lastAggressor !== null) {
          logActionDetail('hydrate.resetRaiseTracking', {
            lastRaiseSize: gameState.lastRaiseSize,
            lastAggressor: gameState.lastAggressor
          });
          gameState.lastRaiseSize = 0;
          gameState.lastAggressor = null;
          gameState.reopensAction = false;
        }
      }
    }
    
    // BACKWARDS COMPATIBILITY: Ensure betThisStreet exists for all players
    // ARCHITECTURAL FIX: On PREFLOP, if bet > 0 but betThisStreet is 0/undefined, set betThisStreet = bet
    // This fixes the case where blinds were posted but betThisStreet wasn't initialized
    if (gameState.players) {
      gameState.players.forEach(p => {
        if (p.betThisStreet === undefined || p.betThisStreet === 0) {
          // On PREFLOP, if player has bet (from blinds), betThisStreet should equal bet
          if (gameState.street === 'PREFLOP' && p.bet > 0) {
            p.betThisStreet = p.bet;
          } else {
            // Otherwise, initialize from bet or 0
          p.betThisStreet = p.bet || 0;
          }
        }
      });
    }
    
    // Get player's hole cards (private)
    const myPlayer = gameState.players.find(p => p.userId === userId);
    const myHoleCards = myPlayer ? myPlayer.holeCards : [];
    
    // Create public game state (no hole cards)
    // ARCHITECTURAL FIX: Include betThisStreet so frontend can calculate callAmount correctly
    const publicGameState = {
      ...gameState,
      players: gameState.players.map(p => ({
        userId: p.userId,
        seatIndex: p.seatIndex,
        chips: p.chips,
        bet: p.bet,
        betThisStreet: p.betThisStreet || 0, // CRITICAL: Frontend needs this for callAmount calculation
        folded: p.folded,
        status: p.status
      }))
    };
    
    // ARCHITECTURAL FIX: Add spectator detection flags
    // A spectator is anyone NOT in gameState.players[] during an active hand
    // This includes: busted players, mid-game approved players, or viewers
    const isInCurrentHand = !!myPlayer;
    const isSpectator = !isInCurrentHand; // If not in gameState.players, you're spectating
    
    // Get seat info from room_seats (may be seated but not in current hand)
    const seatsResult = await db.query(
      `SELECT seat_index, chips_in_play, nickname FROM room_seats 
       WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
      [roomId, userId]
    );
    const mySeatData = seatsResult.rows.length > 0 ? seatsResult.rows[0] : null;
    
    console.log('   ✅ Hydration complete', {
      inCurrentHand: isInCurrentHand,
      isSpectator,
      hasSeat: !!mySeatData
    });
    
    res.json({
      hasActiveGame: true,
      gameState: publicGameState,
      myHoleCards,
      isMyTurn: gameState.currentActorSeat === myPlayer?.seatIndex,
      gameId: gameResult.rows[0].id,
      // NEW: Spectator detection flags
      isSpectator, // True if not in current hand (can request seats)
      inCurrentHand: isInCurrentHand, // True if in gameState.players[]
      mySeat: mySeatData // Seat info from room_seats (may differ from gameState)
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
    const { roomId, userId, seatIndex, nickname, requestedChips = 1000 } = req.body;
    
    logActionSummary({
      phase: 'seat',
      roomId,
      playerId: userId,
      seatIndex,
      metadata: { requestedChips }
    });
    
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
    
    // Check room status (is game active?)
    const roomResult = await db.query(
      'SELECT game_id, host_user_id FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const hostUserId = roomResult.rows[0].host_user_id;
    const isHost = userId === hostUserId;
    
    // UNIFIED FLOW: ALL seat claims create requests (pre-game OR mid-game)
    // Host auto-approves their own requests, others require approval
    
    // Check if seat is already taken
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
    
    const requestId = requestResult.rows[0].id;
    
    // AUTO-APPROVE if host is requesting their own seat
    if (isHost) {
      logActionSummary({
        phase: 'seat',
        roomId,
        playerId: userId,
        seatIndex,
        metadata: { requestId, requestedChips, autoApproved: true }
      });
      
      // Generate default nickname if not provided
      const finalNickname = nickname || displayName;
      
      // Check if user already has a row in room_seats for this room
      const existingUserSeat = await db.query(
        `SELECT seat_index, left_at FROM room_seats 
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, userId]
      );
      
      // Create/update seat directly (host auto-approved)
      let insertResult;
      if (existingUserSeat.rows.length > 0) {
        // User already has a row - UPDATE it
        insertResult = await db.query(
          `UPDATE room_seats 
           SET 
             seat_index = $3,
             chips_in_play = $4,
             nickname = $5,
             joined_at = NOW(),
             left_at = NULL,
             is_spectator = FALSE
           WHERE room_id = $1 AND user_id = $2
           RETURNING *`,
          [roomId, userId, seatIndex, requestedChips, finalNickname]
        );
      } else {
        // New user - INSERT
        insertResult = await db.query(
          `INSERT INTO room_seats (room_id, user_id, seat_index, chips_in_play, nickname, joined_at, is_spectator)
           VALUES ($1, $2, $3, $4, $5, NOW(), FALSE)
           ON CONFLICT (room_id, seat_index) 
           DO UPDATE SET 
             user_id = $2,
             chips_in_play = $4,
             nickname = $5,
             joined_at = NOW(),
             left_at = NULL,
             is_spectator = FALSE
           RETURNING *`,
          [roomId, userId, seatIndex, requestedChips, finalNickname]
        );
      }
      
      // Mark request as approved
      await db.query(
        'UPDATE seat_requests SET status = $1, resolved_at = NOW(), resolved_by = $2 WHERE id = $3',
        ['APPROVED', userId, requestId]
      );
      
      // Broadcast updates
      const io = req.app.locals.io;
      if (io) {
        io.to(`room:${roomId}`).emit('seat_update', {
          roomId,
          seatIndex,
          userId,
          action: 'claimed'
        });
        
        io.to(`user:${userId}`).emit('seat_request_approved', {
          requestId,
          seatIndex,
          chips: requestedChips,
          message: 'Seat request approved!'
        });
        
        io.to(`room:${roomId}`).emit('seat_request_resolved', {
          requestId,
          status: 'APPROVED',
          userId,
          seatIndex
        });
      }
      
      return res.json({ 
        success: true, 
        requiresApproval: false,
        autoApproved: true,
        seat: {
          seatIndex: insertResult.rows[0].seat_index,
          userId: insertResult.rows[0].user_id,
          chips: insertResult.rows[0].chips_in_play,
          nickname: insertResult.rows[0].nickname
        }
      });
    }
    
    // Non-host: Create request and notify host
    logActionSummary({
      phase: 'seat',
      roomId,
      playerId: userId,
      seatIndex,
      metadata: { requestId, requestedChips, requiresApproval: true }
    });
    
    // Notify host via WebSocket
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${roomId}`).emit('seat_request_pending', {
        requestId,
        userId,
        username: displayName,
        seatIndex,
        requestedChips,
        requestedAt: new Date().toISOString()
      });
      
      // Also notify the requester
      io.to(`user:${userId}`).emit('seat_request_sent', {
        requestId,
        seatIndex,
        message: 'Seat request sent to host. Waiting for approval...'
      });
    }
    
    return res.json({ 
      success: true, 
      requiresApproval: true,
      requestId,
      message: 'Seat request sent to host'
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
    
    logActionSummary({
      phase: 'seat',
      roomId,
      metadata: { action: 'fetchSeats' }
    });
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get all seats with nicknames and avatar_url (spectators are NOT in room_seats)
    const result = await db.query(
      `SELECT 
         rs.seat_index,
         rs.user_id,
         rs.chips_in_play,
         rs.status,
         rs.nickname,
         rs.joined_at,
         up.avatar_url
       FROM room_seats rs
       LEFT JOIN user_profiles up ON rs.user_id = up.id
       WHERE rs.room_id = $1 AND rs.left_at IS NULL
       ORDER BY rs.seat_index`,
      [roomId]
    );
    
    // Create array of 10 seats (null if empty) - Fixed: was 9, should be 10
    const seatsArray = Array(10).fill(null);
    
    result.rows.forEach(row => {
      seatsArray[row.seat_index] = {
        seatIndex: row.seat_index,
        userId: row.user_id,
        nickname: row.nickname || `Guest_${row.user_id.substring(0, 6)}`,
        chips: row.chips_in_play,
        status: row.status,
        joinedAt: row.joined_at,
        avatar_url: row.avatar_url || null // Include avatar_url from user_profiles
        // NOTE: isSpectator removed - spectators are NOT in room_seats at all
      };
    });
    
    logActionDetail('seats.occupied', { roomId, occupied: result.rows.length });
    
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
    const { roomId, userId, sandboxConfig } = req.body;
    
    logActionSummary({
      phase: 'deal',
      roomId,
      playerId: userId,
      metadata: { sandboxMode: !!sandboxConfig }
    });
    
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
      console.warn(`❌ [MINIMAL] Non-host tried to start hand: ${userId} (host: ${host_user_id})`);
      return res.status(403).json({ 
        error: 'Only the host can start a hand',
        hostId: host_user_id 
      });
    }
    logActionDetail('deal.hostVerified', { roomId, host: userId });
    
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
    
    logActionSummary({
      phase: 'deal',
      roomId,
      playerId: userId,
      metadata: { players: seatedPlayers.length }
    });
    
    // ===== STEP 1: CREATE SHUFFLED DECK =====
    const suits = ['h', 'd', 'c', 's']; // hearts, diamonds, clubs, spades
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    
    let deck = [];
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
    
    // ===== SANDBOX MODE: Replace deck with pre-set cards =====
    // CRITICAL: Sandbox should use EXACT same game logic, only difference is deck initialization
    if (sandboxConfig && sandboxConfig.players && sandboxConfig.players.length > 0) {
      logActionDetail('deal.sandboxDeck', { roomId, presetPlayers: sandboxConfig.players.length });
      
      // Validate and collect all sandbox cards
      const allSandboxCards = [];
      const validRanks = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
      const validSuits = ['H','D','C','S'];
      
      // Collect hole cards from all players
      const sandboxHoleCards = [];
      for (const sandboxPlayer of sandboxConfig.players) {
        if (!sandboxPlayer.holeCards || sandboxPlayer.holeCards.length !== 2) {
          return res.status(400).json({ 
            error: `Player at seat ${sandboxPlayer.seatIndex} must have 2 cards` 
          });
        }
        
        const playerCards = sandboxPlayer.holeCards.map(card => {
          const cardUpper = card.toUpperCase();
          if (cardUpper.length !== 2) {
            throw new Error(`Invalid card format: ${card}`);
          }
          const rank = cardUpper[0];
          const suit = cardUpper[1];
          if (!validRanks.includes(rank) || !validSuits.includes(suit)) {
            throw new Error(`Invalid card: ${card} (rank: ${rank}, suit: ${suit})`);
          }
          // Convert to lowercase to match deck format
          const cardLower = `${rank}${suit.toLowerCase()}`;
          if (allSandboxCards.includes(cardLower)) {
            throw new Error(`Duplicate card: ${cardLower}`);
          }
          allSandboxCards.push(cardLower);
          return cardLower;
        });
        
        sandboxHoleCards.push({
          seatIndex: sandboxPlayer.seatIndex,
          cards: playerCards,
          chips: sandboxPlayer.chips
        });
      }
      
      // Collect board cards if provided
      let sandboxBoardCards = [];
      if (sandboxConfig.boardCards && sandboxConfig.boardCards.length > 0) {
        sandboxBoardCards = sandboxConfig.boardCards.map(card => {
          const cardUpper = card.toUpperCase();
          if (cardUpper.length !== 2) {
            throw new Error(`Invalid board card format: ${card}`);
          }
          const rank = cardUpper[0];
          const suit = cardUpper[1];
          if (!validRanks.includes(rank) || !validSuits.includes(suit)) {
            throw new Error(`Invalid board card: ${card}`);
          }
          const cardLower = `${rank}${suit.toLowerCase()}`;
          if (allSandboxCards.includes(cardLower)) {
            throw new Error(`Duplicate card: ${cardLower}`);
          }
          allSandboxCards.push(cardLower);
          return cardLower;
        });
      }
      
      // Build sandbox deck in DEALING ORDER:
      // 1. Hole cards (2 per player, in seat order) - sandbox cards first, then random for non-sandbox players
      // 2. Board cards (if provided)
      // 3. Remaining cards
      
      // First, get remaining cards (excluding sandbox cards)
      const remainingCards = deck.filter(card => !allSandboxCards.includes(card));
      
      // Shuffle remaining cards for non-sandbox players
      for (let i = remainingCards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingCards[i], remainingCards[j]] = [remainingCards[j], remainingCards[i]];
      }
      
      const sandboxDeck = [];
      let remainingIndex = 0;
      
      // Add hole cards in seat order (so deck.pop() deals them correctly)
      seatedPlayers.forEach(player => {
        const sandboxPlayer = sandboxConfig.players.find(sp => sp.seatIndex === player.seat_index);
        if (sandboxPlayer && sandboxPlayer.holeCards) {
          // Add this player's sandbox cards
          sandboxPlayer.holeCards.forEach(card => {
            const cardUpper = card.toUpperCase();
            const rank = cardUpper[0];
            const suit = cardUpper[1];
            const cardLower = `${rank}${suit.toLowerCase()}`;
            sandboxDeck.push(cardLower);
          });
        } else {
          // Player not in sandbox config - use random cards from remaining deck
          sandboxDeck.push(remainingCards[remainingIndex++]);
          sandboxDeck.push(remainingCards[remainingIndex++]);
        }
      });
      
      // Add board cards if provided
      if (sandboxBoardCards.length > 0) {
        sandboxBoardCards.forEach(card => {
          sandboxDeck.push(card);
        });
      }
      
      // Add rest of remaining cards
      while (remainingIndex < remainingCards.length) {
        sandboxDeck.push(remainingCards[remainingIndex++]);
      }
      
      // Replace deck with sandbox deck (reverse so pop() works correctly)
      deck = sandboxDeck.reverse();
      logActionDetail('deal.sandboxDeckBuilt', {
        presetCards: allSandboxCards.length,
        remaining: remainingCards.length
      });
    } else {
      // NORMAL MODE: Shuffle deck randomly
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      logActionDetail('deal.deckShuffled', { size: deck.length });
    }
    
    // ===== STEP 2: DEAL HOLE CARDS (SAME LOGIC FOR BOTH MODES) =====
    // CRITICAL: Use EXACT same dealing logic - sandbox deck just has cards in specific order
    const players = seatedPlayers.map((player) => {
      const card1 = deck.pop();
      const card2 = deck.pop();
      
      // Apply sandbox stack override if provided
      let chips = parseInt(player.chips_in_play);
      if (sandboxConfig && sandboxConfig.players) {
        const sandboxPlayer = sandboxConfig.players.find(sp => sp.seatIndex === player.seat_index);
        if (sandboxPlayer && sandboxPlayer.chips !== undefined) {
          chips = sandboxPlayer.chips;
        }
      }
      
      return {
        userId: player.user_id,
        seatIndex: player.seat_index,
        chips: chips,
        holeCards: [card1, card2],
        bet: 0,
        betThisStreet: 0, // ARCHITECTURAL FIX: Initialize betThisStreet for all players
        folded: false,
        status: 'ACTIVE'
      };
    });
    
    logActionDetail('deal.holeCards', { players: players.length });
    
    // ===== SANDBOX MODE: UPDATE STACKS IN DATABASE =====
    // CRITICAL: Update room_seats.chips_in_play BEFORE starting hand so game reads correct values
    if (sandboxConfig && sandboxConfig.players && sandboxConfig.players.length > 0) {
      logActionDetail('deal.sandboxStacks', { players: sandboxConfig.players.length });
      for (const sandboxPlayer of sandboxConfig.players) {
        const updateResult = await db.query(
          `UPDATE room_seats 
           SET chips_in_play = $1 
           WHERE room_id = $2 AND seat_index = $3 AND left_at IS NULL
           RETURNING user_id, chips_in_play`,
          [sandboxPlayer.chips, roomId, sandboxPlayer.seatIndex]
        );
        
        if (updateResult.rows.length > 0) {
          logActionDetail('deal.sandboxStackUpdated', {
            seat: sandboxPlayer.seatIndex,
            chips: sandboxPlayer.chips,
            userId: updateResult.rows[0].user_id
          });
          
          // Also update the players array to use the sandbox chips
          const playerIndex = players.findIndex(p => p.seatIndex === sandboxPlayer.seatIndex);
          if (playerIndex !== -1) {
            players[playerIndex].chips = sandboxPlayer.chips;
          }
        } else {
          console.warn(`⚠️ [SANDBOX] Could not update seat ${sandboxPlayer.seatIndex} - seat not found or player left`);
        }
      }
    }
    
    // ===== STEP 3: DETERMINE POSITIONS WITH ROTATION =====
    // Fetch last hand's dealer position to rotate properly
    let dealerPosition = 0;
    
    try {
      const lastHandResult = await db.query(
        `SELECT current_state->>'dealerPosition' as last_dealer 
         FROM game_states 
         WHERE room_id = $1 AND status = 'completed' 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [roomId]
      );
      
      if (lastHandResult.rows.length > 0 && lastHandResult.rows[0].last_dealer !== null) {
        const lastDealer = parseInt(lastHandResult.rows[0].last_dealer);
        dealerPosition = (lastDealer + 1) % players.length;
        logActionDetail('deal.dealerRotated', { from: lastDealer, to: dealerPosition });
      } else {
        logActionDetail('deal.dealerRotated', { from: null, to: dealerPosition });
      }
    } catch (rotationError) {
      console.warn('⚠️ Could not fetch last dealer, defaulting to 0:', rotationError.message);
      dealerPosition = 0;
    }
    // HEADS-UP LOGIC: In heads-up (2 players), dealer posts SB, other posts BB
    // Normal (3+ players): SB = dealer+1, BB = dealer+2
    let sbPosition, bbPosition;
    if (players.length === 2) {
      // Heads-up: dealer = SB, other = BB
      sbPosition = dealerPosition;
      bbPosition = (dealerPosition + 1) % 2;
    } else {
      // Normal: SB = dealer+1, BB = dealer+2
      sbPosition = (dealerPosition + 1) % players.length;
      bbPosition = (dealerPosition + 2) % players.length;
    }
    
    // Total chips BEFORE blinds are posted (for chip conservation)
    const startingTotalChips = players.reduce((sum, p) => sum + (p.chips || 0), 0);
    
    // Post blinds
    // CRITICAL: Clamp chips to 0 minimum (prevent negative balances)
    players[sbPosition].bet = small_blind;
    players[sbPosition].chips = Math.max(0, players[sbPosition].chips - small_blind);
    players[sbPosition].betThisStreet = small_blind; // Track street bet
    
    players[bbPosition].bet = big_blind;
    players[bbPosition].chips = Math.max(0, players[bbPosition].chips - big_blind);
    players[bbPosition].betThisStreet = big_blind; // Track street bet
    
    const pot = small_blind + big_blind;
    
    logActionSummary({
      phase: 'deal',
      roomId,
      metadata: { sb: small_blind, bb: big_blind, pot, startingTotalChips }
    });
    
    // ===== STEP 4: DETERMINE FIRST ACTOR =====
    // First to act: after BB in normal play, dealer/SB in heads-up
    const firstActorIndex = players.length === 2 ? dealerPosition : (bbPosition + 1) % players.length;
    const currentActorSeat = players[firstActorIndex].seatIndex;
    
    logActionDetail('deal.firstActor', { seat: currentActorSeat });
    
    // ===== STEP 5: CREATE GAME STATE JSONB =====
    // Handle sandbox board cards (store them for use when dealing streets)
    let initialStreet = 'PREFLOP';
    let initialCommunityCards = [];
    let sandboxBoardCards = null;
    
    if (sandboxConfig && sandboxConfig.boardCards && sandboxConfig.boardCards.length >= 3) {
      // Store board cards to use when dealing flop/turn/river
      sandboxBoardCards = sandboxConfig.boardCards.map(c => c.toUpperCase());
      
      // If board cards are provided, set initial community cards and street
      initialCommunityCards = sandboxBoardCards.slice(0, Math.min(sandboxBoardCards.length, 5));
      
      // Set street based on number of board cards
      if (initialCommunityCards.length >= 5) {
        initialStreet = 'RIVER';
      } else if (initialCommunityCards.length >= 4) {
        initialStreet = 'TURN';
      } else {
        initialStreet = 'FLOP';
      }
      logActionDetail('deal.sandboxBoard', { cards: initialCommunityCards, street: initialStreet });
    }
    
    const gameState = {
      roomId,
      handNumber: 1,
      street: initialStreet,
      pot,
      currentBet: big_blind,
      minRaise: big_blind, // Initialize min raise to big blind (minimum raise amount)
      communityCards: initialCommunityCards,
      deck: deck, // Remaining cards after dealing hole cards (sandbox board cards stored separately)
      sandboxBoardCards: sandboxBoardCards, // Store sandbox board cards for use when dealing streets
      dealerPosition: players[dealerPosition].seatIndex,
      sbPosition: players[sbPosition].seatIndex,
      bbPosition: players[bbPosition].seatIndex,
      currentActorSeat,
      // CRITICAL: Store starting total for chip conservation validation
      startingTotalChips: startingTotalChips,
      // Store blinds for min-raise calculation
      smallBlind: small_blind,
      bigBlind: big_blind,
      // Initialize raise tracking
      lastRaiseSize: 0, // Will be set to bigBlind on first raise
      lastAggressor: null,
      reopensAction: false,
      originalStacks: players.map(p => ({
        userId: p.userId,
        seatIndex: p.seatIndex,
        startingChips: p.chips + (p.bet || 0) // Starting chips before blinds (chips + bet = original)
      })),
      players: players.map(p => ({
        userId: p.userId,
        seatIndex: p.seatIndex,
        chips: p.chips,
        bet: p.bet,
        betThisStreet: p.bet || 0, // Track bet on current street (starts with blinds)
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
    
    // Link game to room
    await db.query(
      `UPDATE rooms SET game_id = $1 WHERE id = $2`,
      [gameStateId, roomId]
    );
    
    console.log(`💾 Game state saved: ${gameStateId}`);
    
    // ===== STEP 7: BROADCAST PUBLIC STATE =====
    const io = req.app.locals.io;
    if (io) {
      // Fetch nicknames from room_seats (get fresh db connection in case pool was terminated)
      let seatsResult;
      try {
        const freshDb = getDb();
        seatsResult = await freshDb.query(
          `SELECT user_id, nickname FROM room_seats WHERE room_id = $1 AND left_at IS NULL`,
          [roomId]
        );
      } catch (dbError) {
        console.error('⚠️ Failed to fetch nicknames for broadcast:', dbError.message);
        // Continue without nicknames - use user IDs
        seatsResult = { rows: [] };
      }
      
      const nicknameMap = {};
      seatsResult.rows.forEach(row => {
        nicknameMap[row.user_id] = row.nickname;
      });
      
      // Public state (no hole cards, but WITH nicknames)
      // ARCHITECTURAL FIX: Include betThisStreet so frontend can calculate callAmount correctly
      const publicState = {
        ...gameState,
        players: gameState.players.map(p => ({
          userId: p.userId,
          seatIndex: p.seatIndex,
          chips: p.chips,
          bet: p.bet,
          betThisStreet: p.betThisStreet || 0, // CRITICAL: Frontend needs this for callAmount calculation
          folded: p.folded,
          status: p.status,
          nickname: nicknameMap[p.userId] || `Player_${p.seatIndex}`
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
    
    logActionSummary({
      phase: 'room',
      roomId,
      metadata: { action: 'fetchRoom' }
    });
    
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
         game_id
       FROM rooms
       WHERE id = $1`,
      [roomId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = result.rows[0];
    logActionDetail('room.data', { roomId, name: room.name });
    
    res.json({ 
      room: {
        id: room.id,
        name: room.name,
        code: room.invite_code,
        hostId: room.host_user_id,
        maxPlayers: room.max_players,
        smallBlind: room.small_blind,
        bigBlind: room.big_blind,
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

const MinimalBettingAdapter = require('../src/adapters/minimal-engine-bridge');

// Helper function to persist hand completion (chips, busted players → spectators, game end check)
async function persistHandCompletion(updatedState, roomId, db, req) {
  logActionSummary({
    phase: 'persist',
    roomId,
    handNumber: updatedState.handNumber,
    metadata: { players: updatedState.players?.length }
  });
  
  // Get host user ID for bust event handling
  const hostResult = await db.query(
    'SELECT host_user_id FROM rooms WHERE id = $1',
    [roomId]
  );
  const hostUserId = hostResult.rows[0]?.host_user_id || null;
  logActionDetail('persist.players', updatedState.players.map(p => ({
    userId: p.userId,
    chips: p.chips 
  })));
  
  // ✅ TRANSACTION: Wrap all hand completion writes for atomicity
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    logActionDetail('persist.tx', { status: 'BEGIN' });
    
    // Update room_seats with final chip counts and convert busted players to spectators
    const bustedPlayers = [];
    const activePlayers = [];
    
    // CRITICAL: Validate chip conservation before persisting
    // ARCHITECTURAL FIX: After showdown, bets are distributed, so don't include currentBets
    // Chips are either in stacks (distributed) or in pots (not yet distributed)
    // After distribution, pots should be 0 and all chips in stacks
    const startingTotal = updatedState.startingTotalChips;
    if (startingTotal) {
      const currentStacks = updatedState.players.reduce((sum, p) => sum + (p.chips || 0), 0);
      const currentPot = updatedState.pot || 0;
      const sidePots = updatedState.sidePots || [];
      const totalSidePots = sidePots.reduce((sum, p) => sum + (p.amount || 0), 0);
      // FIX: After distribution, bets are already in stacks, so don't double-count
      // Only include stacks + remaining pots (should be 0 after full distribution)
      const currentTotal = currentStacks + currentPot + totalSidePots;
      
      logActionDetail('persist.chipConservation', {
        startingTotal,
        currentTotal,
        stacks: currentStacks,
        pot: currentPot,
        sidePots: totalSidePots
      });
      
      if (Math.abs(currentTotal - startingTotal) > 0.01) {
        console.error(`❌ CHIP CONSERVATION VIOLATION at hand completion!`);
        console.error(`   Difference: $${Math.abs(currentTotal - startingTotal)}`);
      }
    }
    
    for (const player of updatedState.players) {
      logActionDetail('persist.updateSeat', {
        userId: player.userId,
        seatIndex: player.seatIndex,
        chips: player.chips
      });
      
      // CRITICAL: Use chips from gameState (final chips after showdown distribution)
      // NEVER reset to DB value - gameState.chips is the source of truth
      // Update chips (clamp to 0 minimum to prevent negative balances)
      // CRITICAL: Ensure chips never go negative (shouldn't happen, but defensive)
      const finalChips = Math.max(0, player.chips || 0);
      
      // Check if player is busted (chips <= 0)
      if (finalChips === 0) {
        bustedPlayers.push({
          userId: player.userId,
          seatIndex: player.seatIndex
        });
      } else {
        activePlayers.push({
          userId: player.userId,
          seatIndex: player.seatIndex,
          chips: finalChips
        });
      }
      
      const updateResult = await client.query(
        `UPDATE room_seats 
         SET chips_in_play = $1 
         WHERE room_id = $2 AND user_id = $3
         RETURNING user_id, chips_in_play`,
        [finalChips, roomId, player.userId]
      );
      
      if (updateResult.rows.length === 0) {
        console.error(`   ❌ UPDATE failed - no rows matched! userId=${player.userId.substr(0, 8)}, roomId=${roomId.substr(0, 8)}`);
        throw new Error(`Failed to update chips for player ${player.userId.substr(0, 8)}`);
      }
    }
    
    // LIFECYCLE FIX: Remove busted players from seats silently (no ceremony)
    // They become spectators and can rejoin by claiming an empty seat
    if (bustedPlayers.length > 0) {
      logActionDetail('persist.bustedPlayers', { count: bustedPlayers.length });
      
      for (const busted of bustedPlayers) {
        await client.query(
          `UPDATE room_seats 
           SET left_at = NOW()
           WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
          [roomId, busted.userId]
        );
      }
      
      // NO bust event broadcasts - players just disappear from table
      // Their seats become empty and claimable for next hand
      // The busted player will see empty seats when they refresh/reconnect
    }
    
    // ARCHITECTURAL FIX: After ANY hand completion (with or without busts), ALWAYS return to lobby
    // This prevents auto-start and ensures host manually starts next hand
    // CRITICAL: Check players WITH CHIPS, not just activePlayers
    // activePlayers is calculated before removing busted players, so if host busts but others have chips,
    // activePlayers.length might be <= 1 even though game should continue
    const playersWithChips = updatedState.players.filter(p => (p.chips || 0) > 0);
    
    // LIFECYCLE FIX: Check if game should continue or end
    logActionSummary({
      phase: 'persist',
      roomId,
      handNumber: updatedState.handNumber,
      metadata: { playersWithChips: playersWithChips.length }
    });
      
    const io = req.app.locals.io;
    
    if (playersWithChips.length <= 1) {
      // GAME OVER: Only 1 or 0 players with chips remain
      logActionSummary({
        phase: 'persist',
        roomId,
        handNumber: updatedState.handNumber,
        metadata: { gameOver: true, playersRemaining: playersWithChips.length }
      });
      
      // Delete active game_states
      await client.query(
        `DELETE FROM game_states WHERE room_id = $1 AND status = 'active'`,
        [roomId]
      );
      
      // Clear game_id to return to lobby
      await client.query(
        `UPDATE rooms SET game_id = NULL WHERE id = $1`,
        [roomId]
      );
      
      // Broadcast game_ended
      if (io) {
        let winnerMessage;
        if (playersWithChips.length === 1) {
          const winner = playersWithChips[0];
          const winnerSeat = await client.query(
            `SELECT nickname FROM room_seats 
             WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL`,
            [roomId, winner.userId]
          );
          const winnerName = winnerSeat.rows[0]?.nickname || `Player ${winner.seatIndex}`;
          winnerMessage = `🏆 ${winnerName} wins the tournament!`;
        } else {
          winnerMessage = `Game ended - all players busted`;
        }
        
        io.to(`room:${roomId}`).emit('game_ended', {
          reason: playersWithChips.length === 1 ? 'tournament_winner' : 'all_busted',
          winner: playersWithChips.length === 1 ? playersWithChips[0] : null,
          message: winnerMessage,
          canStartNewGame: true
        });
      }
      
      logActionDetail('persist.gameStatus', { returnedToLobby: true });
      
    } else {
      // GAME CONTINUES: Multiple players with chips
      // Check if auto-start is enabled (host control setting)
      // NOTE: Column may not exist yet - default to true for backwards compatibility
      let autoStartEnabled = true;
      try {
        const roomSettings = await client.query(
          `SELECT auto_start_enabled FROM rooms WHERE id = $1`,
          [roomId]
        );
        autoStartEnabled = roomSettings.rows[0]?.auto_start_enabled !== false;
      } catch (err) {
        console.warn('⚠️  auto_start_enabled column not found, defaulting to true');
      }
      
      logActionSummary({
        phase: 'autoStart',
        roomId,
        metadata: { playersRemaining: playersWithChips.length, autoStartEnabled }
      });
      
      // DON'T delete game_states or clear game_id - keep game running
      // Just mark current hand as complete
      await client.query(
        `UPDATE game_states 
         SET status = 'completed', updated_at = NOW()
         WHERE room_id = $1 AND status = 'active'`,
        [roomId]
      );
      
      // Broadcast hand_complete
      if (io) {
        if (autoStartEnabled) {
          const autoStartInMs = 3000;
          const nextHandAt = Date.now() + autoStartInMs;
        io.to(`room:${roomId}`).emit('hand_complete_lobby', {
            message: `Hand complete. Next hand starting in 3 seconds...`,
            autoStartIn: autoStartInMs,
            playersRemaining: playersWithChips.length,
          bustedPlayers: bustedPlayers.length
        });
          emitPhaseUpdate(io, roomId, 'TRANSITION_PENDING', {
            autoStartIn: autoStartInMs,
            nextHandAt,
            playersRemaining: playersWithChips.length,
            bustedPlayers: bustedPlayers.length,
            requiresManualStart: false
          });
        } else {
          io.to(`room:${roomId}`).emit('hand_complete_lobby', {
            message: `Hand complete. Host can start next hand.`,
            autoStartIn: 0,
            playersRemaining: playersWithChips.length,
            bustedPlayers: bustedPlayers.length,
            requiresManualStart: true
          });
          emitPhaseUpdate(io, roomId, 'TRANSITION_PENDING', {
            autoStartIn: 0,
            nextHandAt: null,
            playersRemaining: playersWithChips.length,
            bustedPlayers: bustedPlayers.length,
            requiresManualStart: true
          });
        }
      }
      
      // Schedule auto-start after 3 seconds (only if enabled)
      if (autoStartEnabled) {
        setTimeout(async () => {
        try {
          logActionSummary({
            phase: 'autoStart',
            roomId,
            metadata: { action: 'startNextHand' }
          });
          
          // Get host user_id for the next-hand call
          const roomData = await db.query(
            `SELECT host_user_id FROM rooms WHERE id = $1`,
            [roomId]
          );
          
          if (roomData.rows.length === 0) {
            console.error(`❌ [AUTO-START] Room not found: ${roomId}`);
            return;
          }
          
          const { host_user_id: hostUserId } = roomData.rows[0];
          
          // Make internal HTTP request to next-hand endpoint
          // This ensures all logic is reused consistently
          const axios = require('axios');
          const port = process.env.PORT || 3000;
          
          const response = await axios.post(`http://localhost:${port}/api/engine/next-hand`, {
            roomId: roomId,
            userId: hostUserId,
            trigger: 'auto'
          });
          
          if (response.data.success) {
            logActionSummary({
              phase: 'autoStart',
              roomId,
              metadata: { result: 'success', handNumber: response.data.handNumber }
            });
          } else {
            console.error(`❌ [AUTO-START] Failed to start hand:`, response.data.error);
          }
        } catch (autoStartError) {
          console.error(`❌ [AUTO-START] Error:`, autoStartError.message);
          // If auto-start fails, emit error to room
          if (io) {
            io.to(`room:${roomId}`).emit('auto_start_failed', {
              message: 'Auto-start failed, host must manually start next hand',
              error: autoStartError.message
            });
          }
        }
        }, 3000);
      }
      
      logActionDetail('persist.autoStart', { scheduled: autoStartEnabled });
    }
    
    // Commit transaction - chip updates, spectator conversions, and game state are atomic
    await client.query('COMMIT');
    logActionDetail('persist.tx', { status: 'COMMIT' });
    
    // LIFECYCLE FIX: No bust event broadcasts - players are removed silently
    // Next hand will show their seats as empty and claimable
  } catch (error) {
    // Rollback on any error
    await client.query('ROLLBACK');
    console.error('   ❌ Transaction rolled back due to error:', error.message);
    throw error; // Re-throw to be handled by outer try/catch
  } finally {
    client.release(); // Always release the client back to the pool
  }
}

// Helper function to emit hand_complete event (ensures consistent principle)
// CRITICAL PRINCIPLE: Only emit when ALL cards are revealed AND winner determined
function emitPhaseUpdate(io, roomId, phase, payload = {}) {
  if (!io || !roomId || !phase) return;
  io.to(`room:${roomId}`).emit('phase_update', {
    roomId,
    phase,
    timestamp: Date.now(),
    data: payload
  });
}

async function handleHandCompleteEmission(updatedState, roomId, db, io) {
  if (!io || !roomId) return;
  
  const winners = updatedState.winners || [];
  
  // ARCHITECTURAL FIX: Ensure pot values are set (should already be from handleShowdown)
  const potLogic = require('../src/adapters/pot-logic');
  if (updatedState.mainPot === undefined || updatedState.sidePots === undefined) {
    potLogic.calculateSidePots(updatedState);
  }
  
  // Calculate total chips in play for chip conservation display
  const totalChipsInPlay = updatedState.players.reduce((sum, p) => sum + (p.chips || 0), 0) + 
                           (updatedState.totalPot || updatedState.pot || 0);
  
  const publicState = {
    ...updatedState,
    // Ensure pot values are explicitly set
    mainPot: updatedState.mainPot !== undefined ? updatedState.mainPot : (updatedState.pot || 0),
    sidePots: updatedState.sidePots || [],
    totalPot: updatedState.totalPot !== undefined ? updatedState.totalPot : (updatedState.pot || 0),
    totalChipsInPlay: totalChipsInPlay,
    startingTotalChips: updatedState.startingTotalChips || totalChipsInPlay,
    players: updatedState.players.map(p => ({
      userId: p.userId,
      seatIndex: p.seatIndex,
      chips: p.chips,
      bet: p.bet,
      folded: p.folded,
      status: p.status,
      nickname: p.nickname || `Player_${p.seatIndex}`
    }))
  };
  
  io.to(`room:${roomId}`).emit('hand_complete', {
    type: 'hand_complete',
    roomId,
    gameState: publicState,
    winners: winners.map(w => ({
      userId: w.userId,
      seatIndex: w.seatIndex,
      amount: w.amount,
      handDescription: w.handDescription
    })),
    finalPot: updatedState.totalPot || updatedState.pot || 0
  });
  
  emitPhaseUpdate(io, roomId, 'HAND_COMPLETED', {
    handNumber: updatedState.handNumber,
    winners: winners.map(w => ({
      seatIndex: w.seatIndex,
      amount: w.amount,
      userId: w.userId,
      handDescription: w.handDescription
    })),
    finalPot: publicState.totalPot
  });
  
  logActionSummary({
    phase: 'action',
    roomId,
    handNumber: updatedState.handNumber,
    metadata: { event: 'hand_complete', winners: winners.length }
  });
  
  // LIFECYCLE FIX: No bust event broadcasts - silent player removal
  // Busted players are already removed from seats, their seats show as empty next hand
}

// Helper function to extract hand history (ensures consistent principle)
async function extractHandHistory(updatedState, roomId, db, gameStateId) {
  logActionSummary({
    phase: 'extract',
    roomId,
    handNumber: updatedState.handNumber
  });
  
  try {
    // ✅ TRANSACTION: Wrap all hand history writes for atomicity
    const historyClient = await db.connect();
    try {
      await historyClient.query('BEGIN');
      logActionDetail('extract.tx', { status: 'BEGIN' });
    
      // Helper function to get hand rank from description
      const getHandRank = (handDescription) => {
        if (!handDescription) return 10;
        const desc = handDescription.toLowerCase();
        if (desc.includes('royal flush')) return 1;
        if (desc.includes('straight flush')) return 2;
        if (desc.includes('four of a kind') || desc.includes('quads')) return 3;
        if (desc.includes('full house')) return 4;
        if (desc.includes('flush')) return 5;
        if (desc.includes('straight')) return 6;
        if (desc.includes('three of a kind') || desc.includes('trips')) return 7;
        if (desc.includes('two pair')) return 8;
        if (desc.includes('pair')) return 9;
        return 10; // High card
      };
      
      // ✅ USE SNAPSHOT BEFORE SHOWDOWN (captured before any mutations)
      const snapshot = updatedState.snapshotBeforeShowdown || {
        pot: updatedState.finalPotSize || updatedState.pot || 0,
        players: updatedState.players,
        communityCards: updatedState.communityCards || [],
        dealerPosition: updatedState.dealerPosition,
        sbPosition: updatedState.sbPosition,
        bbPosition: updatedState.bbPosition,
        actionHistory: updatedState.actionHistory || []
      };
      
      // Extract winner data
      const winner = (updatedState.winners && updatedState.winners[0]) ? updatedState.winners[0] : null;
      const winnerId = winner ? winner.userId : null;
      
      let winnerIdForInsert = winnerId;
      if (winnerIdForInsert) {
        const winnerExists = await historyClient.query(
          `SELECT 1 FROM user_profiles WHERE id = $1`,
          [winnerIdForInsert]
        );
        if (winnerExists.rows.length === 0) {
          winnerIdForInsert = null;
        }
      }
      const winningHand = winner ? winner.handDescription : null;
      const handRank = getHandRank(winningHand);
      
      // Extract all player IDs from snapshot
      const playerIds = snapshot.players.map(p => p.userId);
      
      // ✅ USE POT SIZE FROM SNAPSHOT (before zeroing)
      const potSize = snapshot.pot || 0;
      
      // Extract position data from snapshot
      const dealerPosition = snapshot.dealerPosition !== undefined ? snapshot.dealerPosition : null;
      const sbPosition = snapshot.sbPosition !== undefined ? snapshot.sbPosition : null;
      const bbPosition = snapshot.bbPosition !== undefined ? snapshot.bbPosition : null;
      
      // Calculate starting stacks from snapshot
      const startingStacks = {};
      const playersWithStacks = snapshot.players.map(p => {
        const startingStack = p.chips + (p.bet || 0);
        startingStacks[p.seatIndex] = startingStack;
        return {
          userId: p.userId,
          seatIndex: p.seatIndex,
          cards: p.holeCards || [],
          revealed: winner && p.userId === winnerId,
          stack: startingStack
        };
      });
      
      // ✅ ENCODE HAND (PHE v2.0 format)
      const HandEncoder = require('../public/js/hand-encoder.js');
      const encodedHand = HandEncoder.encode({
        players: playersWithStacks,
        board: snapshot.communityCards || [],
        winner: winner ? winner.seatIndex : null,
        rank: handRank,
        pot: potSize,
        dealerPosition: dealerPosition,
        actions: snapshot.actionHistory.map(a => ({
          seatIndex: a.seatIndex || 0,
          action: a.action,
          amount: a.amount || 0,
          street: a.street || 'PREFLOP'
        }))
      });
      
      logActionDetail('extract.encodedHand', {
        preview: encodedHand.substring(0, 60),
        length: encodedHand.length
      });
      
      // Calculate size savings
      const jsonSize = JSON.stringify(snapshot.actionHistory || []).length;
      const encodedSize = encodedHand.length;
      const savings = Math.round((1 - encodedSize / jsonSize) * 100);
      logActionDetail('extract.storage', { encodedSize, savings });
      
      // 1. INSERT HAND_HISTORY
      const handHistoryInsert = await historyClient.query(
        `INSERT INTO hand_history (
          game_id, room_id, hand_number, pot_size, 
          player_ids, winner_id, winning_hand, hand_rank,
          board_cards, actions_log, encoded_hand,
          dealer_position, sb_position, bb_position, starting_stacks,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        RETURNING id`,
        [
          gameStateId,
          roomId,
          updatedState.handNumber || 1,
          potSize,
          playerIds,
          winnerIdForInsert,
          winningHand,
          handRank,
          updatedState.communityCards ? updatedState.communityCards.join(' ') : null,
          JSON.stringify(updatedState.actionHistory || []),
          encodedHand,
          dealerPosition,
          sbPosition,
          bbPosition,
          JSON.stringify(startingStacks)
        ]
      );
      
      logActionDetail('extract.insert', { handHistoryId: handHistoryInsert.rows[0].id });
      
      // 2. UPDATE PLAYER_STATISTICS
      const winnerIds = new Set((updatedState.winners || []).map(w => w.userId));
      
      for (const player of updatedState.players) {
        const isWinner = winnerIds.has(player.userId);
        
        await historyClient.query(
          `INSERT INTO player_statistics (user_id, total_hands_played, total_hands_won, last_hand_played_at, created_at)
           VALUES ($1, 1, $2, NOW(), NOW())
           ON CONFLICT (user_id) DO UPDATE SET
             total_hands_played = player_statistics.total_hands_played + 1,
             total_hands_won = player_statistics.total_hands_won + $2,
             last_hand_played_at = NOW(),
             updated_at = NOW()`,
          [player.userId, isWinner ? 1 : 0]
        );
        
        await historyClient.query(
          `UPDATE user_profiles
           SET total_hands_played = COALESCE(total_hands_played, 0) + 1,
               total_wins = COALESCE(total_wins, 0) + $2,
               updated_at = NOW()
           WHERE id = $1`,
          [player.userId, isWinner ? 1 : 0]
        );
      }
      
      // 3. UPDATE BIGGEST_POT FOR WINNERS
      if (winnerIdForInsert && potSize > 0) {
        await historyClient.query(`
          UPDATE user_profiles
          SET 
            biggest_pot = GREATEST(COALESCE(biggest_pot, 0), $1),
            updated_at = NOW()
          WHERE id = $2
        `, [potSize, winnerIdForInsert]);
      }
      
      // Commit transaction
      await historyClient.query('COMMIT');
      logActionDetail('extract.tx', { status: 'COMMIT' });
    } catch (error) {
      await historyClient.query('ROLLBACK');
      console.error('   ❌ Transaction rolled back due to error:', error.message);
      throw error;
    } finally {
      historyClient.release();
    }
  } catch (extractionError) {
    console.error('❌ [MINIMAL] Data extraction failed (non-critical):', extractionError.message);
    throw extractionError; // Re-throw so caller can handle
  }
}

router.post('/action', async (req, res) => {
  try {
    const { roomId, userId, action, amount } = req.body;
    
    logActionSummary({
      phase: 'action',
      roomId,
      playerId: userId,
      action,
      amount
    });
    
    if (!roomId || !userId || !action) {
      return res.status(400).json({ 
        error: 'Missing required fields: roomId, userId, action' 
      });
    }
    
    // Validate action
    const validActions = ['FOLD', 'CALL', 'RAISE', 'BET', 'CHECK', 'ALL_IN'];
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
      `SELECT id, current_state FROM game_states
       WHERE room_id = $1 AND status = 'active'
       ORDER BY created_at DESC
       LIMIT 1`,
      [roomId]
    );
    
    if (gameStateResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active game in this room' });
    }
    
    const gameStateId = gameStateResult.rows[0].id;
    const currentState = gameStateResult.rows[0].current_state;
    
    // BACKWARDS COMPATIBILITY: Ensure betThisStreet exists for all players
    if (currentState.players) {
      currentState.players.forEach(p => {
        if (p.betThisStreet === undefined) {
          // Initialize betThisStreet from bet (approximation for old hands)
          p.betThisStreet = p.bet || 0;
        }
      });
    }
    
    // ===== STEP 2: PROCESS ACTION (PRODUCTION LOGIC) =====
    // FIX: Extract actionSeq from request (client sends expected sequence)
    const expectedSeq = req.body.actionSeq !== undefined ? req.body.actionSeq : null;
    const result = MinimalBettingAdapter.processAction(currentState, userId, action, amount, expectedSeq);
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const updatedState = result.gameState;
    
    // ===== STEP 2B: HANDLE ALL-IN RUNOUT PROGRESSIVE REVEALS =====
    // CRITICAL PRINCIPLE: hand_complete only broadcast when ALL cards are revealed AND winner determined
    if (updatedState.needsProgressiveReveal && updatedState.allInRunoutStreets && updatedState.allInRunoutStreets.length > 0) {
      logActionSummary({
        phase: 'action',
        roomId,
        handNumber: updatedState.handNumber,
        metadata: { allInRunoutStreets: updatedState.allInRunoutStreets.length }
      });
      
      // Save state with progressive reveal flag (but NOT completed yet)
      await db.query(
        `UPDATE game_states 
         SET current_state = $1, 
             total_pot = $2, 
             updated_at = NOW()
         WHERE room_id = $3 AND status = 'active'`,
        [JSON.stringify(updatedState), updatedState.pot, roomId]
      );
      
      // Capture req and io from outer scope before setTimeout
      const io = req.app.locals.io;
      const reqForCallback = req;
      
      if (io && roomId) {
        // ARCHITECTURAL PRINCIPLE: Progressive reveals with smooth delays
        // Reveal streets in order: FLOP (3 cards), TURN (1 card), RIVER (1 card)
        // Each street gets 1.5 seconds to be seen before next reveal
        const revealDelayMs = 1500; // 1.5 seconds between each street reveal
        
        updatedState.allInRunoutStreets.forEach((streetData, index) => {
          setTimeout(() => {
            logActionDetail('allInRunout.reveal', {
              street: streetData.street,
              cards: streetData.cards
            });
            io.to(`room:${roomId}`).emit('street_reveal', {
              street: streetData.street,
              communityCards: streetData.cards,
              roomId,
              message: `Dealing ${streetData.street}...`
            });
          }, (index + 1) * revealDelayMs);
        });
        
        // Calculate delay: wait for all streets to be revealed + buffer for players to see final cards
        const revealDelay = updatedState.allInRunoutStreets.length * revealDelayMs;
        const bufferDelay = 2000; // 2 seconds after last card so players can see it
        const finalDelay = revealDelay + bufferDelay;
        
        logActionDetail('allInRunout.schedule', {
          finalDelay,
          streets: updatedState.allInRunoutStreets.length
        });
        
        // HOTFIX 4: Complete showdown synchronously after progressive reveals
        // Wait for card reveals to finish, THEN run all completion steps atomically
        // This prevents chip distribution race conditions
        setTimeout(async () => {
          logActionSummary({
            phase: 'action',
            roomId,
            handNumber: updatedState.handNumber,
            metadata: { event: 'allInRunoutComplete' }
          });
          
          try {
            // Step 1: Determine winners
          MinimalBettingAdapter.handleShowdown(updatedState);
            logActionDetail('allInRunout.winners', { count: updatedState.winners?.length || 0 });
          
            // Step 2: Save completed state to game_states
          await db.query(
            `UPDATE game_states 
             SET current_state = $1, 
                 total_pot = $2, 
                 updated_at = NOW()
             WHERE room_id = $3 AND status = 'active'`,
            [JSON.stringify(updatedState), updatedState.pot, roomId]
          );
            logActionDetail('allInRunout.stateSaved', { roomId });
          
            // Step 3: Persist chips to room_seats (atomic transaction)
          if (updatedState.status === 'COMPLETED') {
            await persistHandCompletion(updatedState, roomId, db, reqForCallback);
              logActionDetail('allInRunout.chipsPersisted', { roomId });
            
              // Step 4: Extract hand history
            await extractHandHistory(updatedState, roomId, db, gameStateId);
              logActionDetail('allInRunout.handHistory', { roomId });
            
              // Step 5: Emit hand_complete to all clients
            await handleHandCompleteEmission(updatedState, roomId, db, io);
            }
            
            logActionDetail('allInRunout.status', { result: 'success' });
          } catch (error) {
            console.error('❌ [ALL-IN RUNOUT] Error during synchronous completion:', error);
            // Don't throw - log and continue (chips already distributed in memory)
          }
        }, finalDelay);
      }
      
      // Return early - don't process hand completion yet
      return res.json({ 
        success: true, 
        gameState: updatedState,
        needsProgressiveReveal: true,
        message: 'All-in runout: Cards will be revealed progressively'
      });
    }
    
    // ===== STEP 3: SAVE TO DATABASE =====
    // CRITICAL: Save totalPot (sum of all pots) for UI display, not just main pot
    const totalPotToSave = updatedState.totalPot !== undefined 
      ? updatedState.totalPot 
      : (updatedState.pot || 0);
    
    await db.query(
      `UPDATE game_states 
       SET current_state = $1, 
           total_pot = $2, 
           updated_at = NOW()
       WHERE room_id = $3 AND status = 'active'`,
      [JSON.stringify(updatedState), totalPotToSave, roomId]
    );
    
    logActionSummary({
      phase: 'action',
      roomId,
      playerId: userId,
      action,
      amount,
      handNumber: updatedState.handNumber,
      street: updatedState.street,
      pot: updatedState.pot,
      currentBet: updatedState.currentBet,
      nextActorSeat: updatedState.currentActorSeat
    });
    
    // ===== DEBUG LOGGING: Post-action game state =====
    logActionDetail('action.state', {
      street: updatedState.street,
      currentBet: updatedState.currentBet,
      currentActorSeat: updatedState.currentActorSeat,
      reopensAction: updatedState.reopensAction,
      players: updatedState.players.map(p => ({
        seat: p.seatIndex,
        userId: p.userId,
        bet: p.bet,
        betThisStreet: p.betThisStreet,
        chips: p.chips,
        status: p.status,
        folded: p.folded
      }))
    });
    
    // ===== STEP 3B: PERSIST CHIPS TO DB IF HAND COMPLETE =====
    if (updatedState.status === 'COMPLETED') {
      // Persist chips and extract hand history
      await persistHandCompletion(updatedState, roomId, db, req);
      
      // ===== EMIT HAND COMPLETE EVENT =====
      // CRITICAL PRINCIPLE: Only emit when all cards are revealed AND winner determined
      const io = req.app.locals.io;
      await handleHandCompleteEmission(updatedState, roomId, db, io);
      
      // ===== STEP 3C: EXTRACT HAND DATA TO HISTORY =====
      try {
        await extractHandHistory(updatedState, roomId, db, gameStateId);
      } catch (extractionError) {
        console.error('❌ [MINIMAL] Data extraction failed (non-critical):', extractionError.message);
        // Don't fail the request - chips already updated
      }
      
      // VERIFY: Query room_seats to confirm chips were updated
      const verifyResult = await db.query(
        `SELECT user_id, chips_in_play FROM room_seats WHERE room_id = $1 ORDER BY seat_index`,
        [roomId]
      );
      logActionDetail('action.verifySeats', verifyResult.rows.map(row => ({
        userId: row.user_id,
        chips: row.chips_in_play
      })));
      
      logActionDetail('action.handComplete', { roomReady: true });
    }
    
    // ===== STEP 4: BROADCAST TO ALL PLAYERS =====
    const io = req.app.locals.io;
    if (io) {
      // Fetch nicknames from room_seats
      const seatsResult = await db.query(
        `SELECT user_id, nickname FROM room_seats WHERE room_id = $1 AND left_at IS NULL`,
        [roomId]
      );
      
      const nicknameMap = {};
      seatsResult.rows.forEach(row => {
        nicknameMap[row.user_id] = row.nickname;
      });
      
      // Public state (no hole cards, but WITH nicknames)
      // ARCHITECTURAL FIX: Include betThisStreet so frontend can calculate callAmount correctly
      // ARCHITECTURAL FIX: Ensure pot values are always set (mainPot, sidePots, totalPot)
      // CRITICAL: Only calculate side pots if they haven't been set yet AND we're not in an active betting round
      // During active betting rounds, players haven't all matched yet, so side pot calculation would be incorrect
      const potLogic = require('../src/adapters/pot-logic');
      
      // If side pots haven't been calculated yet, use raw pot for display
      // Side pots are calculated after betting rounds complete (in progressToNextStreet)
      // During active betting, just show the raw pot amount
      if (updatedState.mainPot === undefined) {
        // Don't calculate side pots during active betting - just use raw pot
        updatedState.mainPot = updatedState.pot || 0;
        updatedState.sidePots = [];
        updatedState.totalPot = updatedState.pot || 0;
      }
      
      // Calculate total chips in play for chip conservation display
      const totalChipsInPlay = updatedState.players.reduce((sum, p) => sum + (p.chips || 0), 0) + 
                               (updatedState.totalPot || updatedState.pot || 0);
      
      const publicState = {
        ...updatedState,
        // Ensure pot values are explicitly set
        mainPot: updatedState.mainPot !== undefined ? updatedState.mainPot : (updatedState.pot || 0),
        sidePots: updatedState.sidePots || [],
        totalPot: updatedState.totalPot !== undefined ? updatedState.totalPot : (updatedState.pot || 0),
        totalChipsInPlay: totalChipsInPlay, // For chip conservation indicator
        startingTotalChips: updatedState.startingTotalChips || totalChipsInPlay, // For validation
        players: updatedState.players.map(p => ({
          userId: p.userId,
          seatIndex: p.seatIndex,
          chips: p.chips,
          bet: p.bet,
          betThisStreet: p.betThisStreet || 0, // CRITICAL: Frontend needs this for callAmount calculation
          folded: p.folded,
          status: p.status,
          nickname: nicknameMap[p.userId] || `Player_${p.seatIndex}`
          // holeCards intentionally omitted
        }))
      };
      
      // GOLDEN PATH: Don't send action_processed when hand is complete
      // Only hand_complete event should update UI at hand end
      if (updatedState.status !== 'COMPLETED') {
      io.to(`room:${roomId}`).emit('action_processed', {
        userId,
        action,
        amount: amount || 0,
        gameState: publicState
      });
      
        logActionDetail('action.broadcast', { roomId, event: 'action_processed' });
      } else {
        logActionDetail('action.broadcast', { roomId, event: 'action_processed', skipped: 'hand_complete' });
      }
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
    
    // Fetch nicknames from room_seats
    const seatsResult = await db.query(
      `SELECT user_id, nickname FROM room_seats WHERE room_id = $1 AND left_at IS NULL`,
      [roomId]
    );
    
    const nicknameMap = {};
    seatsResult.rows.forEach(row => {
      nicknameMap[row.user_id] = row.nickname;
    });
    
    // Return public game state (no hole cards, but WITH nicknames)
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
        status: p.status,
        nickname: nicknameMap[p.userId] || `Player_${p.seatIndex}` // Add nickname!
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
    const { roomId, userId, trigger } = req.body;
    
    console.log('🎬 [GAME] Starting next hand:', { roomId, userId });
    
    if (!roomId || !userId) {
      return res.status(400).json({ error: 'Missing roomId or userId' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    const io = req.app.locals.io;
    
    // ===== STEP 1: VERIFY HOST =====
    const roomResult = await db.query(
      `SELECT host_user_id, small_blind, big_blind FROM rooms WHERE id = $1`,
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const { host_user_id, small_blind, big_blind } = roomResult.rows[0];
    
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
    
    if (io) {
      emitPhaseUpdate(io, roomId, 'TRANSITION_RUNNING', {
        startedAt: Date.now(),
        trigger: trigger === 'auto' ? 'auto' : 'manual'
      });
    }
    
    // ===== STEP 3: ROTATE DEALER =====
    // NOTE: dealer_position column may not exist yet - handle gracefully
    let dealer_position = 0;
    try {
      const dealerResult = await db.query(
        `SELECT dealer_position FROM rooms WHERE id = $1`,
        [roomId]
      );
      dealer_position = dealerResult.rows[0]?.dealer_position || 0;
    } catch (err) {
      // Column doesn't exist yet - start at 0
      console.log('⚠️  dealer_position column not found, starting at 0');
    }
    
    const oldDealer = dealer_position;
    const newDealer = (oldDealer + 1) % seatedPlayers.length;
    
    console.log(`🔄 [GAME] Dealer rotation: ${oldDealer} → ${newDealer}`);
    
    // Try to update dealer position (will fail silently if column doesn't exist)
    try {
      await db.query(
        `UPDATE rooms SET dealer_position = $1 WHERE id = $2`,
        [newDealer, roomId]
      );
    } catch (err) {
      // Column doesn't exist yet - that's ok, we'll calculate from scratch each hand
      console.log('⚠️  Could not update dealer_position (column may not exist)');
    }
    
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
    
    // CRITICAL: Clamp chips to 0 minimum (prevent negative balances)
    sbPlayer.chips = Math.max(0, sbPlayer.chips - small_blind);
    sbPlayer.bet = small_blind;
    sbPlayer.betThisStreet = small_blind; // ARCHITECTURAL FIX: Set betThisStreet for SB
    
    bbPlayer.chips = Math.max(0, bbPlayer.chips - big_blind);
    bbPlayer.bet = big_blind;
    bbPlayer.betThisStreet = big_blind; // ARCHITECTURAL FIX: Set betThisStreet for BB
    
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
    
    // CRITICAL: Calculate starting total chips for chip conservation validation
    const startingTotalChips = players.reduce((sum, p) => sum + (p.chips || 0) + (p.bet || 0), 0);
    
    const gameState = {
      roomId,
      handNumber,
      street: 'PREFLOP',
      pot,
      currentBet: big_blind,
      minRaise: big_blind, // Initialize min raise to big blind (minimum raise amount)
      communityCards: [],
      deck: deck, // Remaining cards
      dealerPosition: dealerSeatIndex,
      sbPosition: sbSeatIndex,
      bbPosition: bbSeatIndex,
      currentActorSeat: firstActorSeatIndex,
      // CRITICAL: Store blinds for min-raise calculation
      smallBlind: small_blind,
      bigBlind: big_blind,
      // CRITICAL: Reset raise tracking fields (ARCHITECTURAL FIX: prevent stale values from previous hand)
      lastRaiseSize: 0, // Reset to 0 for new hand
      lastAggressor: null, // Reset to null for new hand
      reopensAction: false, // Reset to false for new hand
      // CRITICAL: Store starting total for chip conservation validation
      startingTotalChips: startingTotalChips,
      originalStacks: players.map(p => ({
        userId: p.userId,
        seatIndex: p.seatIndex,
        startingChips: p.chips + (p.bet || 0) // Starting chips before blinds (chips + bet = original)
      })),
      players: players,
      actionHistory: [],
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString()
    };
    
    // ===== STEP 9.5: MARK OLD GAME STATES AS COMPLETED =====
    // Ensure only one active game state exists per room
    await db.query(
      `UPDATE game_states 
       SET status = 'completed' 
       WHERE room_id = $1 AND status = 'active'`,
      [roomId]
    );
    console.log('🧹 [GAME] Marked old game states as completed');
    
    // ===== STEP 10: SAVE TO DATABASE =====
    await db.query(
      `INSERT INTO game_states (id, room_id, host_user_id, current_state, hand_number, total_pot, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [gameStateId, roomId, host_user_id, JSON.stringify(gameState), handNumber, pot, 'active']
    );
    
    // Link game to room
    await db.query(
      `UPDATE rooms SET game_id = $1 WHERE id = $2`,
      [gameStateId, roomId]
    );
    
    console.log(`✅ [GAME] Hand #${handNumber} created: ${gameStateId}`);
    
    // ===== STEP 11: BROADCAST =====
    if (io) {
      // Fetch nicknames from room_seats
      const seatsResult = await db.query(
        `SELECT user_id, nickname FROM room_seats WHERE room_id = $1 AND left_at IS NULL`,
        [roomId]
      );
      
      const nicknameMap = {};
      seatsResult.rows.forEach(row => {
        nicknameMap[row.user_id] = row.nickname;
      });
      
      const publicState = {
        ...gameState,
        players: gameState.players.map(p => ({
          userId: p.userId,
          seatIndex: p.seatIndex,
          chips: p.chips,
          bet: p.bet,
          folded: p.folded,
          status: p.status,
          nickname: nicknameMap[p.userId] || `Player_${p.seatIndex}`
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
      
      emitPhaseUpdate(io, roomId, 'DEALING', {
        handNumber,
        gameStateId
      });
      
      emitPhaseUpdate(io, roomId, 'HAND_ACTIVE', {
        handNumber,
        gameStateId
      });
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

// ============================================
// HOST CONTROLS ENDPOINTS
// ============================================

// GET /api/engine/host-controls/:roomId/:userId
// Returns: Current game state for host controls panel
router.get('/host-controls/:roomId/:userId', async (req, res) => {
  try {
    const { roomId, userId } = req.params;
    
    console.log('🎛️ [HOST] Get controls data:', { roomId: roomId.substr(0, 8), userId: userId.substr(0, 8) });
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Verify host
    const roomResult = await db.query(
      `SELECT host_user_id, small_blind, big_blind FROM rooms WHERE id = $1`,
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    const room = roomResult.rows[0];
    
    if (room.host_user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized - host only' });
    }
    
    // Get all seated players (spectators are NOT in room_seats - they're outside watching)
    const seatsResult = await db.query(
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
    
    const players = seatsResult.rows.map(row => ({
      seatIndex: row.seat_index,
      userId: row.user_id,
      chips: parseInt(row.chips_in_play || 1000),
      status: row.status,
      nickname: row.nickname || `Guest_${row.user_id.substring(0, 6)}`,
      joinedAt: row.joined_at
      // NOTE: isSpectator removed - spectators are NOT in room_seats at all
    }));
    
    console.log(`✅ [HOST] Controls data retrieved: ${players.length} players`);
    
    res.json({
      room: {
        smallBlind: parseInt(room.small_blind || 10),
        bigBlind: parseInt(room.big_blind || 20)
      },
      players,
      pendingRequests: [] // TODO: Sprint 1.3
    });
    
  } catch (error) {
    console.error('❌ [HOST] Get controls error:', error);
    res.status(500).json({ error: 'Failed to get host controls', details: error.message });
  }
});

// POST /api/engine/host-controls/update-stack
// Body: { roomId, hostId, seatIndex, newChips }
router.post('/host-controls/update-stack', async (req, res) => {
  try {
    const { roomId, hostId, seatIndex, newChips } = req.body;
    
    console.log('💰 [HOST] Update stack:', { roomId: roomId?.substr(0, 8), seatIndex, newChips });
    
    if (!roomId || !hostId || seatIndex === undefined || newChips === undefined) {
      return res.status(400).json({ error: 'Missing required fields: roomId, hostId, seatIndex, newChips' });
    }
    
    if (newChips < 0) {
      return res.status(400).json({ error: 'Chips cannot be negative' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Verify host
    const roomResult = await db.query(
      `SELECT host_user_id FROM rooms WHERE id = $1`,
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomResult.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Not authorized - host only' });
    }
    
    // ARCHITECTURAL FIX: Block stack updates during active hand
    // Stack updates mid-hand would be overwritten when hand completes
    // Solution: Only allow updates between hands
    const gameCheck = await db.query(
      `SELECT status FROM game_states WHERE room_id = $1 AND status = 'active'`,
      [roomId]
    );
    
    if (gameCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot update stacks during active hand',
        message: 'Stack updates will be available after current hand completes',
        allowedAfterHandComplete: true
      });
    }
    
    // Update chips (only between hands)
    const updateResult = await db.query(
      `UPDATE room_seats 
       SET chips_in_play = $1 
       WHERE room_id = $2 AND seat_index = $3 AND left_at IS NULL
       RETURNING user_id, chips_in_play`,
      [newChips, roomId, seatIndex]
    );
    
    if (updateResult.rows.length === 0) {
      return res.status(404).json({ error: 'Seat not found or player not seated' });
    }
    
    console.log(`✅ [HOST] Updated seat ${seatIndex} stack to ${newChips}`);
    
    // Broadcast update
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${roomId}`).emit('seat_update', {
        seatIndex,
        chips: newChips,
        userId: updateResult.rows[0].user_id
      });
    }
    
    res.json({ success: true, seatIndex, chips: newChips });
    
  } catch (error) {
    console.error('❌ [HOST] Update stack error:', error);
    res.status(500).json({ error: 'Failed to update stack', details: error.message });
  }
});

// POST /api/engine/host-controls/kick-player
// Body: { roomId, hostId, targetUserId }
router.post('/host-controls/kick-player', async (req, res) => {
  try {
    const { roomId, hostId, targetUserId } = req.body;
    
    console.log('🚫 [HOST] Kick player:', { roomId: roomId.substr(0, 8), targetUserId: targetUserId.substr(0, 8) });
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Verify host
    const roomResult = await db.query(
      `SELECT host_user_id FROM rooms WHERE id = $1`,
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomResult.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Not authorized - host only' });
    }
    
    // Remove player from seat
    const result = await db.query(
      `UPDATE room_seats
       SET left_at = NOW()
       WHERE room_id = $1 AND user_id = $2 AND left_at IS NULL
       RETURNING seat_index`,
      [roomId, targetUserId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Player not found in room' });
    }
    
    const seatIndex = result.rows[0].seat_index;
    
    console.log(`✅ [HOST] Player kicked from seat ${seatIndex}`);
    
    // Broadcast seat update to all clients in room
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${roomId}`).emit('seat_update', {
        seatIndex,
        userId: targetUserId,
        action: 'kicked'
      });
      
      // Send kick notification to kicked player
      io.to(`room:${roomId}`).emit('player_kicked', {
        userId: targetUserId,
        reason: 'Host removed you from the game'
      });
    }
    
    res.json({ success: true, seatIndex });
    
  } catch (error) {
    console.error('❌ [HOST] Kick player error:', error);
    res.status(500).json({ error: 'Failed to kick player', details: error.message });
  }
});

// PATCH /api/engine/host-controls/update-blinds
// Body: { roomId, hostId, smallBlind, bigBlind }
router.patch('/host-controls/update-blinds', async (req, res) => {
  try {
    const { roomId, hostId, smallBlind, bigBlind } = req.body;
    
    console.log('💰 [HOST] Update blinds:', { roomId: roomId.substr(0, 8), smallBlind, bigBlind });
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Verify host
    const roomResult = await db.query(
      `SELECT host_user_id FROM rooms WHERE id = $1`,
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomResult.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Not authorized - host only' });
    }
    
    // Validate blinds
    if (bigBlind <= smallBlind) {
      return res.status(400).json({ error: 'Big blind must be greater than small blind' });
    }
    
    if (smallBlind < 1 || bigBlind < 2) {
      return res.status(400).json({ error: 'Blinds must be positive integers' });
    }
    
    // Update blinds
    await db.query(
      `UPDATE rooms
       SET small_blind = $1, big_blind = $2
       WHERE id = $3`,
      [smallBlind, bigBlind, roomId]
    );
    
    console.log(`✅ [HOST] Blinds updated: $${smallBlind}/$${bigBlind}`);
    
    // Broadcast blinds update
    const io = req.app.locals.io;
    if (io) {
      io.to(`room:${roomId}`).emit('blinds_updated', {
        smallBlind,
        bigBlind
      });
    }
    
    res.json({ success: true, smallBlind, bigBlind });
    
  } catch (error) {
    console.error('❌ [HOST] Update blinds error:', error);
    res.status(500).json({ error: 'Failed to update blinds', details: error.message });
  }
});

// PATCH /api/engine/host-controls/toggle-autostart
// Body: { roomId, hostId, autoStartEnabled }
router.patch('/host-controls/toggle-autostart', async (req, res) => {
  try {
    const { roomId, hostId, autoStartEnabled } = req.body;
    
    console.log('🔄 [HOST] Toggle auto-start:', { roomId: roomId?.substr(0, 8), autoStartEnabled });
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Verify host
    const roomResult = await db.query(
      `SELECT host_user_id FROM rooms WHERE id = $1`,
      [roomId]
    );
    
    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (roomResult.rows[0].host_user_id !== hostId) {
      return res.status(403).json({ error: 'Not authorized - host only' });
    }
    
    // Update auto-start setting (gracefully handle missing column)
    try {
      await db.query(
        `UPDATE rooms SET auto_start_enabled = $1 WHERE id = $2`,
        [autoStartEnabled, roomId]
      );
      console.log(`✅ [HOST] Auto-start ${autoStartEnabled ? 'enabled' : 'disabled'}`);
    } catch (err) {
      // Column doesn't exist yet - that's ok, just log it
      console.log('⚠️  auto_start_enabled column not found, setting not persisted');
    }
    
    res.json({ success: true, autoStartEnabled });
    
  } catch (error) {
    console.error('❌ [HOST] Toggle auto-start error:', error);
    res.status(500).json({ error: 'Failed to toggle auto-start', details: error.message });
  }
});

// ============================================
// ENDPOINT: SHOWDOWN ACTION (SHOW/MUCK)
// ============================================
// POST /api/engine/showdown-action
// Body: { roomId, userId, action: 'SHOW' | 'MUCK' }
// Purpose: Let players show or muck their cards at showdown

router.post('/showdown-action', async (req, res) => {
  try {
    const { roomId, userId, action } = req.body;
    
    console.log(`🃏 [SHOWDOWN] ${action} cards:`, { roomId, userId });
    
    if (!roomId || !userId || !action) {
      return res.status(400).json({ error: 'Missing roomId, userId, or action' });
    }
    
    if (action !== 'SHOW' && action !== 'MUCK') {
      return res.status(400).json({ error: 'Action must be SHOW or MUCK' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not available' });
    }
    
    // Get most recent game state (can be active OR completed during showdown window)
    const result = await db.query(
      `SELECT id, current_state, status as db_status FROM game_states 
       WHERE room_id = $1 
       ORDER BY created_at DESC LIMIT 1`,
      [roomId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No game found' });
    }
    
    const gameStateRow = result.rows[0];
    const gameState = gameStateRow.current_state;
    
    // Can only show/muck at showdown
    if (gameState.street !== 'SHOWDOWN' || gameState.status !== 'COMPLETED') {
      return res.status(400).json({ 
        error: 'Can only show/muck at showdown',
        currentStreet: gameState.street,
        currentStatus: gameState.status
      });
    }
    
    // Find the player
    const player = gameState.players.find(p => p.userId === userId);
    if (!player) {
      return res.status(404).json({ error: 'Player not in game' });
    }
    
    // PRINCIPLE: Only players who reached showdown (didn't fold) can show/muck
    if (player.folded) {
      return res.status(400).json({ 
        error: 'Cannot show/muck - you folded before showdown',
        playerFolded: true
      });
    }
    
    // Track the action
    player.showdownAction = action;
    
    // Update game state in DB
    await db.query(
      `UPDATE game_states SET current_state = $1 WHERE id = $2`,
      [JSON.stringify(gameState), gameStateRow.id]
    );
    
    console.log(`✅ [SHOWDOWN] Player ${userId.substr(0, 8)} chose to ${action}`);
    
    // Broadcast to all players
    const io = req.app.locals.io;
    if (io) {
      // Fetch nicknames
      const seatsResult = await db.query(
        `SELECT user_id, nickname FROM room_seats WHERE room_id = $1 AND left_at IS NULL`,
        [roomId]
      );
      
      const nicknameMap = {};
      seatsResult.rows.forEach(row => {
        nicknameMap[row.user_id] = row.nickname;
      });
      
      io.to(`room:${roomId}`).emit('showdown_action', {
        userId,
        action,
        seatIndex: player.seatIndex,
        nickname: nicknameMap[userId] || `Player_${player.seatIndex}`,
        // Only include hole cards if SHOW
        holeCards: action === 'SHOW' ? player.holeCards : null
      });
      
      console.log(`📡 [SHOWDOWN] Broadcast ${action} action to room:${roomId}`);
    }
    
    res.json({ success: true, action });
    
  } catch (error) {
    console.error('❌ [SHOWDOWN] Error:', error);
    res.status(500).json({ 
      error: 'Failed to process showdown action',
      details: error.message 
    });
  }
});

module.exports = router;

