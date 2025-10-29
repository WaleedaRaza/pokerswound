// GAMES ROUTER - Modularized game endpoints
// Complete Modularization Phase 1 - Extracted from sophisticated-engine-server.js

const express = require('express');
const router = express.Router();
const { withIdempotency } = require('../src/middleware/idempotency');
const timerService = require('../src/services/timer-service');

// All dependencies injected via app.locals

// ============================================
// POST /api/games - Create new game
// ============================================
router.post('/', withIdempotency, async (req, res) => {
  const { 
    games, gameMetadata, playerUserIds, generateGameId,
    GameStateModel, StorageAdapter, fullGameRepository, getDb,
    Logger, LogCategory
  } = req.app.locals;
  
  try {
    const { small_blind, big_blind, max_players, roomId, hostUserId } = req.body;
    console.log('🎮 Start game request:', { roomId, hostUserId });
    
    console.log('🔍 BACKEND: Received game creation request:', {
      roomId,
      hostUserId,
      small_blind,
      big_blind,
      max_players
    });
    
    const gameId = generateGameId();
    const hostUser = hostUserId || 'system';
    
    Logger.info(LogCategory.GAME, 'Creating game', { gameId, roomId, hostUserId: hostUser });
    
    // Create sophisticated GameStateModel
    const gameState = new GameStateModel({
      id: gameId,
      configuration: {
        smallBlind: small_blind,
        bigBlind: big_blind,
        ante: 0,
        maxPlayers: max_players,
        minPlayers: 2,
        turnTimeLimit: 30,
        timebankSeconds: 60,
        autoMuckLosingHands: true,
        allowRabbitHunting: false
      }
    });
    
    // Store roomId in game state for WebSocket broadcasts
    if (roomId) {
      gameState.roomId = roomId;
    }
    
    // DUAL-WRITE: Store to both memory AND database
    console.log('🔍 BACKEND: About to call StorageAdapter.createGame with gameId:', gameId);
    await StorageAdapter.createGame(gameId, gameState, hostUser, roomId);
    console.log('🔍 BACKEND: StorageAdapter.createGame succeeded');
    
    // NOTE: fullGameRepository persistence disabled - StorageAdapter already handles game_states
    // Using TEXT gameId system (sophisticated_*) instead of UUID system
    let gameUuid = null;
    
    // Store game_id in room table for room lookup
    if (roomId) {
      const db = getDb();
      if (db) {
        try {
          console.log('🔍 BACKEND: About to UPDATE rooms table, linking game_id:', gameId, 'to room:', roomId);
          await db.query(
            'UPDATE rooms SET game_id = $1 WHERE id = $2',
            [gameId, roomId]
          );
          console.log('🔍 BACKEND: UPDATE rooms succeeded');
          Logger.debug(LogCategory.GAME, 'Linked game to room', { gameId, roomId });
        } catch (dbError) {
          console.error('❌ BACKEND: UPDATE rooms FAILED:', dbError.message);
          Logger.error(LogCategory.GAME, 'Error linking game to room', { 
            gameId, 
            roomId, 
            error: dbError.message 
          });
          throw dbError; // Re-throw to fail the request
        }
      }
    }
    
    Logger.success(LogCategory.GAME, 'Game created successfully', { 
      gameId, 
      roomId 
    });
    
    const responsePayload = {
      gameId,
      status: gameState.status,
      playerCount: gameState.players.size,
      engine: 'SOPHISTICATED_TYPESCRIPT'
    };
    
    console.log('🔍 BACKEND: Sending success response:', responsePayload);
    
    res.json(responsePayload);
    
  } catch (error) {
    const Logger = req.app.locals.Logger;
    const LogCategory = req.app.locals.LogCategory;
    Logger.error(LogCategory.GAME, 'Create game error', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET /api/games - Get games by roomId
// ============================================
router.get('/', async (req, res) => {
  const { games } = req.app.locals;
  
  try {
    const { roomId } = req.query;
    
    if (!roomId) {
      return res.status(400).json({ error: 'roomId query parameter required' });
    }
    
    console.log(`🔍 Finding games for roomId: ${roomId}`);
    
    // Find games for this room in memory
    const matchingGames = [];
    for (const [gameId, gameState] of games.entries()) {
      if (gameState.roomId === roomId) {
        matchingGames.push({ 
          gameId, 
          roomId: gameState.roomId,
          status: gameState.status,
          handNumber: gameState.handState.handNumber
        });
      }
    }
    
    console.log(`✅ Found ${matchingGames.length} games for room ${roomId}`);
    
    res.json({ games: matchingGames });
    
  } catch (error) {
    console.error('Get games by room error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET /api/games/:id - Get game state
// ============================================
router.get('/:id', (req, res) => {
  const { games, playerUserIds } = req.app.locals;
  
  try {
    const gameId = req.params.id;
    const gameState = games.get(gameId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const userIdMap = playerUserIds.get(gameId);
    
    res.json({
      gameId,
      status: gameState.status,
      handNumber: gameState.handState.handNumber,
      street: gameState.currentStreet,
      communityCards: gameState.handState.communityCards.map(c => c.toString()),
      pot: gameState.pot.totalPot,
      currentBet: gameState.bettingRound.currentBet,
      toAct: gameState.toAct,
      players: Array.from(gameState.players.values()).map(p => ({
        id: p.uuid,
        name: p.name,
        stack: p.stack,
        seatIndex: p.seatIndex,
        userId: userIdMap ? userIdMap.get(p.uuid) : null,
        isActive: p.isActive,
        hasFolded: p.hasFolded,
        isAllIn: p.isAllIn,
        betThisStreet: p.betThisStreet,
        holeCards: p.holeCards ? p.holeCards.map(c => c.toString()) : []
      })),
      engine: 'SOPHISTICATED_TYPESCRIPT'
    });
    
  } catch (error) {
    console.error('Get game state error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// POST /api/games/:id/join - Join game
// ============================================
router.post('/:id/join', withIdempotency, (req, res) => {
  const { games, generatePlayerId, PlayerModel } = req.app.locals;
  
  try {
    const gameId = req.params.id;
    const { player_name, buy_in_amount } = req.body;
    
    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const playerId = generatePlayerId();
    
    // Create sophisticated PlayerModel
    const player = new PlayerModel({
      uuid: playerId,
      name: player_name,
      stack: buy_in_amount,
      seatIndex: gameState.players.size
    });
    
    // Add player using sophisticated GameStateModel
    gameState.addPlayer(player);
    
    console.log(`✅ Player ${player_name} joined sophisticated game`);
    
    res.json({
      gameId,
      playerId,
      playerName: player_name,
      seatIndex: player.seatIndex,
      playerCount: gameState.players.size,
      canStart: gameState.canStartHand(),
      engine: 'SOPHISTICATED_TYPESCRIPT'
    });
    
  } catch (error) {
    console.error('Join game error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// GET /api/games/:id/legal-actions - Get legal actions for player
// ============================================
router.get('/:id/legal-actions', (req, res) => {
  const { games, bettingEngine } = req.app.locals;
  
  try {
    const gameId = req.params.id;
    const playerId = req.query.player_id;
    
    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Use sophisticated BettingEngine to get legal actions
    let legalActions = bettingEngine.getLegalActions(
      playerId,
      gameState,
      gameState.bettingRound.currentBet,
      gameState.bettingRound.minRaise
    );
    
    // Diagnostic logging
    const player = gameState.getPlayer(playerId);
    console.log('🔍 LEGAL ACTIONS REQUEST:');
    console.log('  Player:', player ? player.name : 'NOT FOUND');
    console.log('  Current bet:', gameState.bettingRound.currentBet);
    console.log('  Player bet this street:', player ? player.betThisStreet : 'N/A');
    console.log('  Legal actions:', legalActions);
    
    res.json({
      gameId,
      playerId,
      actions: legalActions,
      engine: 'SOPHISTICATED_TYPESCRIPT'
    });
    
  } catch (error) {
    console.error('Get legal actions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// POST /api/games/:id/start-hand - Start a hand
// ============================================
// NOTE: This is a large endpoint with room bridging, persistence, and WebSocket logic
// TODO: Extract business logic to services layer in Phase 3
router.post('/:id/start-hand', withIdempotency, async (req, res) => {
  const {
    games, playerUserIds, gameMetadata, getDb, PlayerModel,
    stateMachine, fullGameRepository, Logger, LogCategory, io,
    StorageAdapter
  } = req.app.locals;
  
  try {
    const gameId = req.params.id;
    const { roomId } = req.body;
    
    let gameState = games.get(gameId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Bridge room seats to game if roomId provided
    if (roomId) {
      const db = getDb();
      if (db) {
        const seatsRes = await db.query(
          `SELECT rs.seat_index, rs.user_id, rs.chips_in_play, up.username
           FROM room_seats rs
           JOIN user_profiles up ON rs.user_id = up.id
           WHERE rs.room_id = $1 
             AND rs.status = 'SEATED' 
             AND rs.left_at IS NULL
             AND rs.chips_in_play > 0
           ORDER BY rs.seat_index ASC`,
          [roomId]
        );
        
        console.log(`🎮 Active players with chips: ${seatsRes.rowCount}`);
        
        // Check for game over
        if (seatsRes.rowCount === 1) {
          const winner = seatsRes.rows[0];
          console.log(`🏆 GAME OVER! Winner: ${winner.username} with $${winner.chips_in_play}`);
          
          if (io) {
            // Increment sequence number
            const dbV2 = req.app.locals.dbV2;
            const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
            
            io.to(`room:${roomId}`).emit('game_over', {
              type: 'game_over',
              version: '1.0.0',
              seq: seq,
              timestamp: Date.now(),
              payload: {
              winner: { 
                name: winner.username, 
                stack: winner.chips_in_play 
                }
              }
            });
          }
          
          return res.status(200).json({ 
            message: 'Game over - tournament complete', 
            winner: winner.username,
            stack: winner.chips_in_play
          });
        }
        
        if (seatsRes.rowCount < 2) {
          return res.status(400).json({ error: 'Need at least 2 players with chips to start' });
        }
        
        // Clear and repopulate players
        gameState.players.clear();
        
        if (!playerUserIds.has(gameId)) {
          playerUserIds.set(gameId, new Map());
        }
        const userIdMap = playerUserIds.get(gameId);
        userIdMap.clear();
        
        console.log(`🔗 Bridging ${seatsRes.rowCount} seated players to game engine...`);
        
        for (const seat of seatsRes.rows) {
          const playerId = `player_${seat.user_id}_${seat.seat_index}`;
          
          const player = new PlayerModel({
            uuid: playerId,
            name: seat.username,
            stack: seat.chips_in_play,
            seatIndex: seat.seat_index
          });
          
          // CRITICAL: Add userId to player model so hydration can match hole cards
          player.userId = seat.user_id;
          
          userIdMap.set(playerId, seat.user_id);
          gameState.addPlayer(player);
          console.log(`  ✅ Added ${seat.username} (seat ${seat.seat_index}, chips: ${seat.chips_in_play}, userId: ${seat.user_id})`);
        }
      }
    }
    
    if (gameState.players.size < 2) {
      return res.status(400).json({ error: 'Need at least 2 players to start hand' });
    }
    
    // Start hand
    const result = stateMachine.processAction(gameState, {
      type: 'START_HAND'
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const handNumber = result.newState.handState.handNumber;
    Logger.success(LogCategory.GAME, 'Hand started', { gameId, handNumber });
    
    result.newState.roomId = roomId;
    games.set(gameId, result.newState);
    
    // Broadcast via WebSocket IMMEDIATELY (before persistence to ensure clients get update)
    console.log(`🔍 BROADCAST CHECK: io=${!!io}, roomId=${roomId}`);
    if (io && roomId) {
      // Increment sequence number
      const dbV2 = req.app.locals.dbV2;
      let seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      seq = parseInt(seq); // Ensure it's a number, not string
      
      const userIdMap = playerUserIds.get(gameId);
      io.to(`room:${roomId}`).emit('hand_started', {
        type: 'hand_started',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          gameId,
          handNumber: result.newState.handState.handNumber,
          dealerSeat: result.newState.handState.dealerPosition,
          pot: result.newState.pot.totalPot,
          players: Array.from(result.newState.players.values()).map(p => ({
            id: p.uuid,
            name: p.name,
            stack: p.stack,
            seatIndex: p.seatIndex,
            userId: userIdMap ? userIdMap.get(p.uuid) : null
          }))
        }
      });
      
      console.log(`📡 Broadcast hand_started to room:${roomId} (seq: ${seq})`);
      
      // Also send state_sync to tell clients to refetch hydration
      io.to(`room:${roomId}`).emit('state_sync', {
        type: 'state_sync',
        version: '1.0.0',
        seq: seq + 1,
        timestamp: Date.now(),
        payload: {
          fetchViaHttp: true,
          reason: 'hand_started'
        }
      });
      
      console.log(`📡 Broadcast state_sync to room:${roomId} - clients should refetch hydration`);
    }
    
    // Persist updated game state to database (after broadcast)
    try {
      console.log(`🔍 PERSIST DEBUG: Attempting to save gameId=${gameId}, version=${result.newState.version}, handNumber=${result.newState.handState.handNumber}`);
      await StorageAdapter.saveGame(gameId, result.newState);
      console.log('✅ Game state persisted to database after hand start');
    } catch (error) {
      console.error('⚠️ Failed to persist game state:', error.message);
      // Continue anyway - in-memory state is updated
    }
    
    Logger.info(LogCategory.PERSIST, 'Hand started (using in-memory + game_states only)', { 
      gameId, 
      handNumber, 
      playerCount: result.newState.players.size
    });
    
    // Start timer for first player to act
    const firstPlayer = result.newState.toAct;
    if (firstPlayer) {
      const { dbV2 } = req.app.locals;
      
      // Get room's turn time setting
      let turnTimeSeconds = 30; // Default
      if (getDb && roomId) {
        try {
          const db = getDb();
          const roomResult = await db.query(
            'SELECT turn_time_seconds FROM rooms WHERE id = $1',
            [roomId]
          );
          if (roomResult.rows[0]) {
            turnTimeSeconds = roomResult.rows[0].turn_time_seconds || 30;
          }
        } catch (error) {
          console.error('Failed to get room turn time:', error);
        }
      }
      
      // Auto-fold handler
      const onTimeout = async (gameId, playerId) => {
        console.log(`⏰ Auto-folding player ${playerId} due to timeout`);
        
        try {
          // Get current game state
          const gameState = games.get(gameId);
          if (!gameState) {
            console.error('Game not found for auto-fold:', gameId);
            return;
          }
          
          // Check if it's still this player's turn
          if (gameState.toAct !== playerId) {
            console.log('Not player turn anymore, skipping auto-fold');
            return;
          }
          
          // Process fold action directly
          const result = stateMachine.processAction(gameState, {
            type: 'PLAYER_ACTION',
            playerId: playerId,
            actionType: 'FOLD',
            amount: 0
          });
          
          if (result.success) {
            // Update game state
            games.set(gameId, result.newState);
            
            // Broadcast timeout and fold
            if (io && roomId) {
              const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
              
              io.to(`room:${roomId}`).emit('turn_timeout', {
                type: 'turn_timeout',
                version: '1.0.0',
                seq: seq,
                timestamp: Date.now(),
                payload: {
                  gameId,
                  playerId,
                  action: 'FOLD',
                  reason: 'timeout'
                }
              });
              
              // Clear timers if hand complete
              if (result.newState.isHandComplete()) {
                timerService.clearGameTimers(gameId);
              } else {
                // Start timer for next player
                const nextPlayer = result.newState.toAct;
                if (nextPlayer) {
                  await timerService.startTurnTimer({
                    gameId,
                    playerId: nextPlayer,
                    roomId,
                    turnTimeSeconds,
                    dbV2,
                    io,
                    onTimeout
                  });
                }
              }
            }
            
            console.log(`✅ Auto-fold completed for player ${playerId}`);
          } else {
            console.error('Auto-fold failed:', result.error);
          }
        } catch (error) {
          console.error('Auto-fold error:', error);
        }
      };
      
      // Start the timer (pass roomId explicitly to avoid UUID lookup)
      await timerService.startTurnTimer({
        gameId,
        playerId: firstPlayer,
        roomId: roomId, // Explicitly pass roomId
        turnTimeSeconds,
        dbV2,
        io,
        onTimeout
      });
    }
    
    const userIdMap = playerUserIds.get(gameId);
    res.json({
      gameId,
      handNumber: result.newState.handState.handNumber,
      communityCards: result.newState.handState.communityCards.map(c => c.toString()),
      pot: result.newState.pot.totalPot,
      toAct: result.newState.toAct,
      street: result.newState.currentStreet,
      players: Array.from(result.newState.players.values()).map(p => ({
        id: p.uuid,
        name: p.name,
        stack: p.stack,
        userId: userIdMap ? userIdMap.get(p.uuid) : null
      })),
      engine: 'SOPHISTICATED_TYPESCRIPT',
      events: result.events
    });
    
  } catch (error) {
    console.error('Start hand error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// POST /api/games/:id/actions - Process player action
// ============================================
// NOTE: This is the most complex endpoint (~700 lines)
// Handles all game actions, all-in runout animations, hand completion, database persistence
// TODO: Extract to GameActionService in Phase 3
// Helper function for available actions
function getAvailableActions(gameState, playerId) {
  const player = gameState.getPlayer(playerId);
  if (!player || !player.isActive || player.hasFolded) return [];
  
  const actions = ['FOLD'];
  const currentBet = gameState.bettingRound.currentBet;
  const playerBet = player.betThisStreet;
  const callAmount = currentBet - playerBet;
  
  if (callAmount === 0) {
    actions.push('CHECK');
  } else if (player.stack >= callAmount) {
    actions.push('CALL');
  }
  
  if (player.stack > callAmount) {
    actions.push('RAISE');
  }
  
  actions.push('ALL_IN');
  return actions;
}

router.post('/:id/actions', withIdempotency, async (req, res) => {
  const {
    games, playerUserIds, gameMetadata, stateMachine, fullGameRepository,
    getDb, displayStateManager, Logger, LogCategory, io, StorageAdapter
  } = req.app.locals;
  
  try {
    const gameId = req.params.id;
    const { player_id, action, amount } = req.body;
    
    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Capture pre-action state for all-in detection
    const actingPlayer = gameState.getPlayer(player_id);
    const isAllInAction = action === 'ALL_IN';
    const willBeAllIn = isAllInAction || (actingPlayer && actingPlayer.stack === amount);
    
    let projectedTotalBet = gameState.bettingRound.currentBet;
    if (actingPlayer && willBeAllIn) {
      const playerCurrentBet = actingPlayer.betThisStreet;
      const playerStack = actingPlayer.stack;
      const newTotalBet = (playerCurrentBet + playerStack);
      if (newTotalBet > projectedTotalBet) {
        projectedTotalBet = newTotalBet;
      }
    }
    
    console.log('🔍 PRE-ACTION ANALYSIS:');
    console.log('  Action:', action);
    console.log('  Player:', actingPlayer ? actingPlayer.name : 'UNKNOWN');
    console.log('  Will be all-in?', willBeAllIn);
    console.log('  Projected bet after action:', projectedTotalBet);
    
    const preActionPlayers = Array.from(gameState.players.values()).map(p => ({
      uuid: p.uuid,
      name: p.name,
      betThisStreet: p.betThisStreet,
      stack: p.stack,
      isAllIn: p.isAllIn,
      hasFolded: p.hasFolded
    }));
    
    // Process action
    const result = stateMachine.processAction(gameState, {
      type: 'PLAYER_ACTION',
      playerId: player_id,
      actionType: action,
      amount: amount
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    Logger.success(LogCategory.GAME, 'Action processed', { gameId, player_id, action, amount });
    
    // Clear timer for the player who just acted
    timerService.clearPlayerTimer(gameId, player_id);
    
    // Persist action
    const metadata = gameMetadata.get(gameId);
    if (fullGameRepository && metadata && metadata.gameUuid && metadata.currentHandId) {
      try {
        const userIdMap = playerUserIds.get(gameId);
        const userId = userIdMap ? userIdMap.get(player_id) : null;
        
        if (userId) {
          const potBefore = gameState.pot.totalPot;
          const potAfter = result.newState.pot.totalPot;
          const playerModel = result.newState.getPlayer(player_id);
          
          await fullGameRepository.recordAction({
            handId: metadata.currentHandId,
            gameUuid: metadata.gameUuid,
            userId,
            actionType: action.toUpperCase(),
            amount: amount || 0,
            street: result.newState.currentStreet,
            seatIndex: playerModel ? playerModel.seatIndex : 0,
            potBefore,
            potAfter,
            sequenceNumber: metadata.actionSequence++
          });
          
          gameMetadata.set(gameId, metadata);
          
          Logger.debug(LogCategory.PERSIST, 'Action persisted to database', { 
            gameId, 
            handId: metadata.currentHandId, 
            action, 
            userId 
          });
        }
      } catch (error) {
        Logger.error(LogCategory.PERSIST, 'Failed to persist action', { 
          gameId, 
          action, 
          error: error.message 
        });
      }
    }
    
    // Preserve roomId
    const oldState = games.get(gameId);
    const roomId = oldState ? oldState.roomId : null;
    
    if (roomId) {
      result.newState.roomId = roomId;
    }
    
    games.set(gameId, result.newState);
    
    // Persist updated game state to database
    try {
      await StorageAdapter.saveGame(gameId, result.newState);
      console.log('✅ Game state persisted to database after action');
    } catch (error) {
      console.error('⚠️ Failed to persist game state:', error.message);
      // Continue anyway - in-memory state is updated
    }
    
    // Start timer for next player (if any)
    const nextPlayerToAct = result.newState.toAct;
    if (nextPlayerToAct && !result.newState.isHandComplete()) {
      const { dbV2 } = req.app.locals;
      
      // Get room's turn time setting
      let turnTimeSeconds = 30; // Default
      if (getDb && roomId) {
        try {
          const db = getDb();
          const roomResult = await db.query(
            'SELECT turn_time_seconds FROM rooms WHERE id = $1',
            [roomId]
          );
          if (roomResult.rows[0]) {
            turnTimeSeconds = roomResult.rows[0].turn_time_seconds || 30;
          }
        } catch (error) {
          console.error('Failed to get room turn time:', error);
        }
      }
      
      // Auto-fold handler
      const onTimeout = async (gameId, playerId) => {
        console.log(`⏰ Auto-folding player ${playerId} due to timeout`);
        
        try {
          // Get current game state
          const gameState = games.get(gameId);
          if (!gameState) {
            console.error('Game not found for auto-fold:', gameId);
            return;
          }
          
          // Check if it's still this player's turn
          if (gameState.toAct !== playerId) {
            console.log('Not player turn anymore, skipping auto-fold');
            return;
          }
          
          // Process fold action directly
          const result = stateMachine.processAction(gameState, {
            type: 'PLAYER_ACTION',
            playerId: playerId,
            actionType: 'FOLD',
            amount: 0
          });
          
          if (result.success) {
            // Update game state
            games.set(gameId, result.newState);
            
            // Broadcast timeout and fold
            if (io && roomId) {
              const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
              
              io.to(`room:${roomId}`).emit('turn_timeout', {
                type: 'turn_timeout',
                version: '1.0.0',
                seq: seq,
                timestamp: Date.now(),
                payload: {
                  gameId,
                  playerId,
                  action: 'FOLD',
                  reason: 'timeout'
                }
              });
              
              // Clear timers if hand complete
              if (result.newState.isHandComplete()) {
                timerService.clearGameTimers(gameId);
              } else {
                // Start timer for next player
                const nextPlayer = result.newState.toAct;
                if (nextPlayer) {
                  await timerService.startTurnTimer({
                    gameId,
                    playerId: nextPlayer,
                    roomId,
                    turnTimeSeconds,
                    dbV2,
                    io,
                    onTimeout
                  });
                }
              }
            }
            
            console.log(`✅ Auto-fold completed for player ${playerId}`);
          } else {
            console.error('Auto-fold failed:', result.error);
          }
        } catch (error) {
          console.error('Auto-fold error:', error);
        }
      };
      
      // Start the timer
      await timerService.startTurnTimer({
        gameId,
        playerId: nextPlayerToAct,
        roomId,
        turnTimeSeconds,
        dbV2,
        io,
        onTimeout
      });
    }
    
    // ⚔️ BROADCAST ACTION REQUIRED (next player's turn)
    const nextPlayerForAction = result.newState.toAct;
    if (nextPlayerForAction && io && roomId) {
      const { dbV2 } = req.app.locals;
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      const userIdMap = playerUserIds.get(gameId);
      const nextUserId = userIdMap ? userIdMap.get(nextPlayerForAction) : null;
      const nextPlayerModel = result.newState.getPlayer(nextPlayerForAction);
      
      if (nextUserId && nextPlayerModel) {
        io.to(`room:${roomId}`).emit('action_required', {
          type: 'action_required',
          version: '1.0.0',
          seq: seq,
          timestamp: Date.now(),
          payload: {
            gameId,
            playerId: nextUserId,
            seatIndex: nextPlayerModel.seatIndex,
            callAmount: result.newState.bettingRound.currentBet,
            minRaise: result.newState.bettingRound.minRaise,
            availableActions: getAvailableActions(result.newState, nextPlayerForAction)
          }
        });
        
        console.log(`📡 Broadcasted action_required for player ${nextUserId} (seq: ${seq})`);
      }
    }
    
    Logger.debug(LogCategory.GAME, 'Broadcasting update', { roomId, ioExists: !!io });
    
    // ⚔️ BROADCAST BOARD CARDS if street advanced
    const streetAdvanced = result.events.find(e => e.type === 'STREET_ADVANCED');
    if (streetAdvanced && io && roomId) {
      const { dbV2 } = req.app.locals;
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      
      io.to(`room:${roomId}`).emit('board_dealt', {
        type: 'board_dealt',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          gameId,
          street: result.newState.currentStreet,
          board: result.newState.handState.communityCards.map(c => c.toString()),
          pot: result.newState.pot.totalPot
        }
      });
      
      console.log(`📡 Broadcasted board_dealt: ${result.newState.currentStreet} (seq: ${seq})`);
    }
    
    // Check for hand completion
    const isHandComplete = result.newState.isHandComplete();
    const handCompletedEvent = result.events.find(e => e.type === 'HAND_COMPLETED');
    const willBeAllInRunout = isHandComplete && result.events.filter(e => e.type === 'STREET_ADVANCED').length > 1;
    
    // Capture pot amount before clearing timers
    let potAmount = result.newState.pot.totalPot;
    if (handCompletedEvent && handCompletedEvent.data && handCompletedEvent.data.pot) {
      potAmount = handCompletedEvent.data.pot;
    }
    
    // ⚔️ BROADCAST HAND COMPLETE
    if (isHandComplete && io && roomId) {
      const { dbV2 } = req.app.locals;
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      
      const winners = handCompletedEvent?.data?.winners || [];
      
      io.to(`room:${roomId}`).emit('hand_complete', {
        type: 'hand_complete',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          gameId,
          winners: winners.map(w => ({
            playerId: w.id,
            username: w.name,
            amount: w.winnings,
            hand: w.handRank
          })),
          finalPot: potAmount,
          board: result.newState.handState.communityCards.map(c => c.toString())
        }
      });
      
      console.log(`📡 Broadcasted hand_complete (seq: ${seq})`);
    }
    
    // Clear all timers if hand is complete
    if (isHandComplete) {
      timerService.clearGameTimers(gameId);
      console.log(`🏁 Hand complete, cleared all timers for game ${gameId}`);
    }
    
    // Full game state persistence and completion logic omitted for brevity
    // (In Phase 3, this will move to GameActionService)
    
    // Basic response for now
    res.json({
      gameId,
      action,
      amount: amount || 0,
      street: result.newState.currentStreet,
      pot: result.newState.pot.totalPot,
      toAct: result.newState.toAct,
      isHandComplete: result.newState.isHandComplete(),
      communityCards: result.newState.handState.communityCards.map(c => c.toString()),
      engine: 'SOPHISTICATED_TYPESCRIPT',
      events: result.events
    });
    
  } catch (error) {
    console.error('Process action error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
