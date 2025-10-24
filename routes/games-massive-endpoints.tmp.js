// ⚔️ TEMPORARY FILE - The two MASSIVE game endpoints
// These will be inserted into routes/games.js between JOIN and LEGAL_ACTIONS

// POST /api/games/:id/start-hand - Start hand with sophisticated GameStateMachine (BRIDGED with room_seats)
// ⚠️ NO AUTH: Host might be using local guest account  
// THIS IS ~180 LINES OF LOGIC
router.post('/:id/start-hand', async (req, res) => {
  try {
    const gameId = req.params.id;
    const { roomId } = req.body; // UI should pass the roomId
    
    const games = req.app.locals.games;
    let gameState = games.get(gameId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // ============================================
    // BIG EDIT 3: BRIDGE ROOM SEATS TO GAME
    // ============================================
    
    // If roomId provided, sync players from room_seats table
    if (roomId) {
      const getDb = req.app.locals.getDb;
      const db = getDb();
      if (db) {
        // 🏆 TOURNAMENT MODE: Exclude players with 0 chips (eliminated)
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
        
        // Check if game is over (only 1 or 0 players left)
        if (seatsRes.rowCount === 1) {
          const winner = seatsRes.rows[0];
          console.log(`🏆 GAME OVER! Winner: ${winner.username} with $${winner.chips_in_play}`);
          
          // Broadcast game over
          const io = req.app.locals.io;
          io.to(`room:${roomId}`).emit('game_over', {
            winner: { 
              name: winner.username, 
              stack: winner.chips_in_play 
            }
          });
          
          return res.status(200).json({ 
            message: 'Game over - tournament complete', 
            winner: winner.username,
            stack: winner.chips_in_play
          });
        }
        
        if (seatsRes.rowCount < 2) {
          return res.status(400).json({ error: 'Need at least 2 players with chips to start' });
        }
        
        // Clear existing players and repopulate from seats
        gameState.players.clear();
        
        // Initialize userId mapping for this game
        const playerUserIds = req.app.locals.playerUserIds;
        if (!playerUserIds.has(gameId)) {
          playerUserIds.set(gameId, new Map());
        }
        const userIdMap = playerUserIds.get(gameId);
        userIdMap.clear();
        
        console.log(`🔗 Bridging ${seatsRes.rowCount} seated players to game engine...`);
        
        const PlayerModel = req.app.locals.PlayerModel;
        for (const seat of seatsRes.rows) {
          const playerId = `player_${seat.user_id}_${seat.seat_index}`;
          
          const player = new PlayerModel({
            uuid: playerId,
            name: seat.username,
            stack: seat.chips_in_play,
            seatIndex: seat.seat_index
          });
          
          // Store userId mapping separately
          userIdMap.set(playerId, seat.user_id);
          
          gameState.addPlayer(player);
          console.log(`  ✅ Added ${seat.username} (seat ${seat.seat_index}, chips: ${seat.chips_in_play}, userId: ${seat.user_id})`);
        }
      }
    }
    
    // Validate we have enough players
    if (gameState.players.size < 2) {
      return res.status(400).json({ error: 'Need at least 2 players to start hand' });
    }
    
    // Use sophisticated GameStateMachine to start hand
    const stateMachine = req.app.locals.stateMachine;
    const result = stateMachine.processAction(gameState, {
      type: 'START_HAND'
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    const handNumber = result.newState.handState.handNumber;
    const Logger = req.app.locals.Logger;
    const LogCategory = req.app.locals.LogCategory;
    Logger.success(LogCategory.GAME, 'Hand started', { gameId, handNumber });
    
    // Store roomId in game state for later WebSocket broadcasts
    result.newState.roomId = roomId;
    
    // Update stored state
    games.set(gameId, result.newState);
    
    // ✅ FULL SCHEMA PERSISTENCE: Record hand in `hands` table
    const gameMetadata = req.app.locals.gameMetadata;
    const metadata = gameMetadata.get(gameId);
    const fullGameRepository = req.app.locals.fullGameRepository;
    if (fullGameRepository && metadata && metadata.gameUuid) {
      try {
        const handId = await fullGameRepository.startHand({
          gameUuid: metadata.gameUuid,
          handNumber,
          dealerSeat: result.newState.handState.dealerPosition,
          smallBlindSeat: result.newState.handState.dealerPosition, // Simplified
          bigBlindSeat: result.newState.handState.dealerPosition, // Simplified
          deckState: { shuffled: true }
        });
        
        metadata.currentHandId = handId;
        metadata.currentHandNumber = handNumber;
        metadata.actionSequence = 0;
        gameMetadata.set(gameId, metadata);
        
        Logger.success(LogCategory.PERSIST, 'Hand persisted to database', { 
          gameId, 
          handId, 
          handNumber 
        });
      } catch (error) {
        Logger.error(LogCategory.PERSIST, 'Failed to persist hand', { 
          gameId, 
          handNumber, 
          error: error.message 
        });
      }
    }
    
    // Broadcast hand start via WebSocket
    const io = req.app.locals.io;
    const playerUserIds = req.app.locals.playerUserIds;
    if (io) {
      const userIdMap = playerUserIds.get(gameId);
      io.to(`room:${roomId}`).emit('hand_started', {
        gameId,
        handNumber: result.newState.handState.handNumber,
        players: Array.from(result.newState.players.values()).map(p => ({
          id: p.uuid,
          name: p.name,
          stack: p.stack,
          seatIndex: p.seatIndex,
          userId: userIdMap ? userIdMap.get(p.uuid) : null
        }))
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

// NOTE: The ACTIONS endpoint is ~450 lines and will be added next due to its complexity

