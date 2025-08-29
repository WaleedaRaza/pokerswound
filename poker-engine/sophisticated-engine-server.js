const express = require('express');
const cors = require('cors');
const path = require('path');

// Import our SOPHISTICATED compiled engine components
const { GameStateModel } = require('./dist/core/models/game-state');
const { PlayerModel } = require('./dist/core/models/player');
const { GameStateMachine } = require('./dist/core/engine/game-state-machine');
const { BettingEngine } = require('./dist/core/engine/betting-engine');
const { RoundManager } = require('./dist/core/engine/round-manager');
const { TurnManager } = require('./dist/core/engine/turn-manager');
const { ActionType, Street } = require('./dist/types/common.types');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory storage for demo (normally would use database)
const games = new Map();
let gameCounter = 1;

// Engine instances
const stateMachine = new GameStateMachine();
const bettingEngine = new BettingEngine();
const roundManager = new RoundManager();
const turnManager = new TurnManager();

// Helper functions
function generateGameId() {
  return `sophisticated_${Date.now()}_${gameCounter++}`;
}

function generatePlayerId() {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// Routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'SOPHISTICATED Poker Engine - Using Real GameStateMachine!',
    features: ['Proper betting round completion', 'Turn management', 'Action validation', 'State transitions']
  });
});

app.get('/poker', (req, res) => {
  res.sendFile(__dirname + '/poker-test.html');
});

// Create game with sophisticated engine
app.post('/api/games', (req, res) => {
  try {
    const { small_blind, big_blind, max_players } = req.body;
    
    const gameId = generateGameId();
    
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
    
    // Store in memory
    games.set(gameId, gameState);
    
    console.log(`✅ Created sophisticated game: ${gameId}`);
    
    res.json({
      gameId,
      status: gameState.status,
      playerCount: gameState.players.size,
      engine: 'SOPHISTICATED_TYPESCRIPT'
    });
    
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Join game with sophisticated PlayerModel
app.post('/api/games/:id/join', (req, res) => {
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

// Start hand with sophisticated GameStateMachine
app.post('/api/games/:id/start-hand', (req, res) => {
  try {
    const gameId = req.params.id;
    const gameState = games.get(gameId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Use sophisticated GameStateMachine to start hand
    const result = stateMachine.processAction(gameState, {
      type: 'START_HAND'
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    console.log(`✅ Started sophisticated hand ${result.newState.handState.handNumber}`);
    
    // Update stored state
    games.set(gameId, result.newState);
    
    res.json({
      gameId,
      handNumber: result.newState.handState.handNumber,
      communityCards: result.newState.handState.communityCards.map(c => c.toString()),
      pot: result.newState.pot.totalPot,
      toAct: result.newState.toAct,
      street: result.newState.currentStreet,
      engine: 'SOPHISTICATED_TYPESCRIPT',
      events: result.events
    });
    
  } catch (error) {
    console.error('Start hand error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Process player action with sophisticated BettingEngine and TurnManager
app.post('/api/games/:id/actions', (req, res) => {
  try {
    const gameId = req.params.id;
    const { player_id, action, amount } = req.body;
    
    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Use sophisticated GameStateMachine to process action
    const result = stateMachine.processAction(gameState, {
      type: 'PLAYER_ACTION',
      playerId: player_id,
      actionType: action,
      amount: amount
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    console.log(`✅ Processed sophisticated action: ${player_id} ${action} ${amount || ''}`);
    
    // Update stored state
    games.set(gameId, result.newState);
    
    // Check if betting round is complete using sophisticated logic
    const isBettingComplete = result.newState.isBettingRoundComplete();
    const isHandComplete = result.newState.isHandComplete();
    
    if (isBettingComplete && !isHandComplete) {
      console.log('✅ Sophisticated betting round complete - advancing street');
      
      // Advance street using sophisticated GameStateMachine
      const streetResult = stateMachine.processAction(result.newState, {
        type: 'ADVANCE_STREET'
      });
      
      if (streetResult.success) {
        games.set(gameId, streetResult.newState);
        
        res.json({
          gameId,
          action,
          amount: amount || 0,
          street: streetResult.newState.currentStreet,
          pot: streetResult.newState.pot.totalPot,
          toAct: streetResult.newState.toAct,
          isHandComplete: streetResult.newState.isHandComplete(),
          communityCards: streetResult.newState.handState.communityCards.map(c => c.toString()),
          engine: 'SOPHISTICATED_TYPESCRIPT',
          events: [...result.events, ...streetResult.events]
        });
        return;
      }
    }
    
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

// Get game state using sophisticated GameStateModel
app.get('/api/games/:id', (req, res) => {
  try {
    const gameId = req.params.id;
    const gameState = games.get(gameId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
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

// Get legal actions using sophisticated BettingEngine
app.get('/api/games/:id/legal-actions', (req, res) => {
  try {
    const gameId = req.params.id;
    const playerId = req.query.player_id;
    
    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // Use sophisticated BettingEngine to get legal actions
    const legalActions = bettingEngine.getLegalActions(
      playerId,
      gameState,
      gameState.bettingRound.currentBet,
      gameState.bettingRound.minRaise
    );
    
    res.json({
      gameId,
      playerId,
      legalActions,
      bettingInfo: {
        currentBet: gameState.bettingRound.currentBet,
        minRaise: gameState.bettingRound.minRaise,
        pot: gameState.pot.totalPot,
        toAct: gameState.toAct
      },
      engine: 'SOPHISTICATED_TYPESCRIPT'
    });
    
  } catch (error) {
    console.error('Get legal actions error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 SOPHISTICATED POKER ENGINE running on port ${PORT}`);
  console.log(`🎯 Using: GameStateMachine, BettingEngine, RoundManager, TurnManager`);
  console.log(`🎰 Test at: http://localhost:${PORT}/poker`);
  console.log(`✅ REAL poker rules with sophisticated betting round completion!`);
});
