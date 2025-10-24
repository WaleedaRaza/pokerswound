// ⚔️ TEMPORARY FILE - Remaining game endpoints
// These will be added to routes/games.js

// POST /api/games/:id/join - Join game with sophisticated PlayerModel
// ⚠️ NO AUTH: Guests need to join games
router.post('/:id/join', (req, res) => {
  try {
    const gameId = req.params.id;
    const { player_name, buy_in_amount } = req.body;
    
    const games = req.app.locals.games;
    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const generatePlayerId = req.app.locals.generatePlayerId;
    const playerId = generatePlayerId();
    
    // Create sophisticated PlayerModel
    const PlayerModel = req.app.locals.PlayerModel;
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

// GET /api/games/:id/legal-actions - Get legal actions using sophisticated BettingEngine
router.get('/:id/legal-actions', (req, res) => {
  try {
    const gameId = req.params.id;
    const playerId = req.query.player_id;
    
    const games = req.app.locals.games;
    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Use sophisticated BettingEngine to get legal actions
    const bettingEngine = req.app.locals.bettingEngine;
    let legalActions = bettingEngine.getLegalActions(
      playerId,
      gameState,
      gameState.bettingRound.currentBet,
      gameState.bettingRound.minRaise
    );
    
    // 🔍 DIAGNOSTIC: Legal actions request
    const player = gameState.getPlayer(playerId);
    console.log('🔍 LEGAL ACTIONS REQUEST:');
    console.log('  Player:', player ? player.name : 'NOT FOUND');
    console.log('  Current bet:', gameState.bettingRound.currentBet);
    console.log('  Player bet this street:', player ? player.betThisStreet : 'N/A');
    console.log('  Player stack:', player ? player.stack : 'N/A');
    console.log('  Player isAllIn:', player ? player.isAllIn : 'N/A');
    console.log('  Raw actions from engine:', legalActions);
    
    // EDGE CASE FIX: If CALL is available, CHECK should NOT be available
    if (legalActions.includes('CALL') && legalActions.includes('CHECK')) {
      legalActions = legalActions.filter(a => a !== 'CHECK');
      console.log('  Fixed: Removed CHECK (CALL is available)');
    }
    
    res.json({ legalActions });
    
  } catch (error) {
    console.error('Get legal actions error:', error);
    res.status(500).json({ error: error.message });
  }
});

