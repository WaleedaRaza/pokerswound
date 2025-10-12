const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('🚀 Starting FIXED Sophisticated Poker Engine...');

// ✅ CORRECT WAY to import compiled TypeScript modules
console.log('📦 Loading engine components...');
const gameStateModule = require('./dist/core/models/game-state');
const GameStateModel = gameStateModule.GameStateModel;

const gameStateMachineModule = require('./dist/core/engine/game-state-machine');
const GameStateMachine = gameStateMachineModule.GameStateMachine;

const bettingEngineModule = require('./dist/core/engine/betting-engine');
const BettingEngine = bettingEngineModule.BettingEngine;

const playerModule = require('./dist/core/models/player');
const PlayerModel = playerModule.PlayerModel;

const commonTypesModule = require('./dist/types/common.types');
const ActionType = commonTypesModule.ActionType;
const Street = commonTypesModule.Street;

console.log('🔧 Engine modules loaded:');
console.log('- GameStateModel:', typeof GameStateModel);
console.log('- GameStateMachine:', typeof GameStateMachine);
console.log('- BettingEngine:', typeof BettingEngine);
console.log('- PlayerModel:', typeof PlayerModel);
console.log('- ActionType:', typeof ActionType);

// ✅ Test engine creation
try {
  const testStateMachine = new GameStateMachine();
  const testBettingEngine = new BettingEngine();
  console.log('✅ Engine instances created successfully');
} catch (error) {
  console.error('❌ Engine creation failed:', error);
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use('/cards', express.static(path.join(__dirname, 'public/cards')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Request logging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path}`, req.body || '');
  next();
});

// In-memory storage
const games = new Map();
let gameCounter = 1;

// Engine instances
const stateMachine = new GameStateMachine();
const bettingEngine = new BettingEngine();

// Helper functions
function generateGameId() {
  return `sophisticated_${Date.now()}_${gameCounter++}`;
}

function generatePlayerId() {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// Routes with REAL sophisticated engine integration
app.get('/', (req, res) => {
  res.json({
    message: '🚀 FIXED SOPHISTICATED POKER ENGINE',
    status: 'working',
    engine: 'SOPHISTICATED_TYPESCRIPT',
    components: {
      GameStateModel: typeof GameStateModel,
      GameStateMachine: typeof GameStateMachine,
      BettingEngine: typeof BettingEngine,
      PlayerModel: typeof PlayerModel
    },
    features: [
      'Complete game state management',
      'Sophisticated betting engine',
      'Proper turn management',
      'Street progression (preflop → flop → turn → river)',
      'Action validation',
      'Legal actions calculation'
    ]
  });
});

app.get('/health', (req, res) => {
  try {
    console.log('🏥 Health check - testing engine components...');
    
    // Test engine creation
    const testGame = new GameStateModel({
      id: 'health-test',
      configuration: {
        smallBlind: 10,
        bigBlind: 20,
        ante: 0,
        maxPlayers: 6,
        minPlayers: 2,
        turnTimeLimit: 30,
        timebankSeconds: 60,
        autoMuckLosingHands: true,
        allowRabbitHunting: false
      }
    });

    console.log('✅ Health check passed');

    res.json({
      status: 'healthy',
      engine: 'SOPHISTICATED_TYPESCRIPT',
      components: {
        GameStateModel: 'working',
        GameStateMachine: 'working', 
        BettingEngine: 'working',
        PlayerModel: 'working'
      },
      test: {
        gameCreated: true,
        gameId: testGame.id,
        canStartHand: testGame.canStartHand()
      },
      uptime: process.uptime(),
      memory: process.memoryUsage()
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      engine: 'SOPHISTICATED_TYPESCRIPT'
    });
  }
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/poker-test.html'));
});

// CREATE GAME - Using Real GameStateModel
app.post('/api/games', (req, res) => {
  try {
    console.log('🎮 Creating game with sophisticated engine...');
    const { small_blind = 10, big_blind = 20, max_players = 6 } = req.body;
    const gameId = generateGameId();

    // ✅ Use REAL sophisticated GameStateModel
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

    games.set(gameId, gameState);

    console.log(`✅ Created sophisticated game: ${gameId}`);

    res.json({
      gameId,
      status: gameState.status,
      playerCount: gameState.players.size,
      engine: 'SOPHISTICATED_TYPESCRIPT',
      canStartHand: gameState.canStartHand(),
      configuration: {
        smallBlind: small_blind,
        bigBlind: big_blind,
        maxPlayers: max_players
      }
    });

  } catch (error) {
    console.error('❌ Create game error:', error);
    res.status(500).json({ error: error.message });
  }
});

// JOIN GAME - Using Real PlayerModel
app.post('/api/games/:id/join', (req, res) => {
  try {
    console.log('👤 Player joining game with sophisticated engine...');
    const gameId = req.params.id;
    const { player_name, buy_in_amount = 1000 } = req.body;

    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameState.players.size >= gameState.configuration.maxPlayers) {
      return res.status(400).json({ error: 'Game is full' });
    }

    const playerId = generatePlayerId();

    // ✅ Use REAL sophisticated PlayerModel  
    const player = new PlayerModel({
      uuid: playerId,
      name: player_name,
      stack: buy_in_amount,
      seatIndex: gameState.players.size
    });

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
    console.error('❌ Join game error:', error);
    res.status(500).json({ error: error.message });
  }
});

// START HAND - Using Real GameStateMachine
app.post('/api/games/:id/start-hand', (req, res) => {
  try {
    console.log('🃏 Starting hand with sophisticated state machine...');
    const gameId = req.params.id;
    const gameState = games.get(gameId);

    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // ✅ Use REAL sophisticated GameStateMachine
    const result = stateMachine.processAction(gameState, {
      type: 'START_HAND'
    });

    if (!result.success) {
      console.error('❌ Start hand failed:', result.error);
      return res.status(400).json({ error: result.error });
    }

    console.log(`✅ Started sophisticated hand ${result.newState.handState.handNumber}`);

    // Update stored state
    games.set(gameId, result.newState);

    const players = Array.from(result.newState.players.values()).map(p => ({
      id: p.uuid,
      name: p.name,
      stack: p.stack,
      betThisStreet: p.betThisStreet,
      isActive: p.isActive,
      hasFolded: p.hasFolded,
      isAllIn: p.isAllIn,
      holeCards: p.holeCards ? p.holeCards.map(c => c.toString()) : []
    }));

    res.json({
      gameId,
      handNumber: result.newState.handState.handNumber,
      communityCards: result.newState.handState.communityCards.map(c => c.toString()),
      pot: result.newState.pot.totalPot,
      toAct: result.newState.toAct,
      street: result.newState.currentStreet,
      currentBet: result.newState.bettingRound.currentBet,
      engine: 'SOPHISTICATED_TYPESCRIPT',
      events: result.events,
      players: players
    });

  } catch (error) {
    console.error('❌ Start hand error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PLAYER ACTION - Using Real BettingEngine and GameStateMachine
app.post('/api/games/:id/actions', (req, res) => {
  try {
    console.log('⚡ Processing player action with sophisticated engine...');
    const gameId = req.params.id;
    const { player_id, action, amount } = req.body;

    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    console.log(`Processing action: ${player_id} -> ${action} (${amount || 'no amount'})`);

    // ✅ Use REAL sophisticated GameStateMachine
    const result = stateMachine.processAction(gameState, {
      type: 'PLAYER_ACTION',
      playerId: player_id,
      actionType: action,
      amount: amount
    });

    if (!result.success) {
      console.error('❌ Action failed:', result.error);
      return res.status(400).json({ error: result.error });
    }

    console.log(`✅ Processed sophisticated action: ${player_id} ${action} ${amount || ''}`);

    // Update stored state
    games.set(gameId, result.newState);

    const players = Array.from(result.newState.players.values()).map(p => ({
      id: p.uuid,
      name: p.name,
      stack: p.stack,
      betThisStreet: p.betThisStreet,
      hasFolded: p.hasFolded,
      isAllIn: p.isAllIn,
      isActive: p.isActive
    }));

    res.json({
      gameId,
      action,
      amount: amount || 0,
      street: result.newState.currentStreet,
      pot: result.newState.pot.totalPot,
      currentBet: result.newState.bettingRound.currentBet,
      toAct: result.newState.toAct,
      isHandComplete: result.newState.isHandComplete(),
      isBettingRoundComplete: result.newState.isBettingRoundComplete(),
      communityCards: result.newState.handState.communityCards.map(c => c.toString()),
      engine: 'SOPHISTICATED_TYPESCRIPT',
      events: result.events,
      players: players
    });

  } catch (error) {
    console.error('❌ Process action error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET GAME STATE - Using Real GameStateModel
app.get('/api/games/:id', (req, res) => {
  try {
    console.log('📊 Getting game state...');
    const gameId = req.params.id;
    const gameState = games.get(gameId);

    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    const players = Array.from(gameState.players.values()).map(p => ({
      id: p.uuid,
      name: p.name,
      stack: p.stack,
      seatIndex: p.seatIndex,
      isActive: p.isActive,
      hasFolded: p.hasFolded,
      isAllIn: p.isAllIn,
      betThisStreet: p.betThisStreet,
      holeCards: p.holeCards ? p.holeCards.map(c => c.toString()) : []
    }));

    res.json({
      gameId,
      status: gameState.status,
      handNumber: gameState.handState.handNumber,
      street: gameState.currentStreet,
      communityCards: gameState.handState.communityCards.map(c => c.toString()),
      pot: gameState.pot.totalPot,
      currentBet: gameState.bettingRound.currentBet,
      toAct: gameState.toAct,
      canStartHand: gameState.canStartHand(),
      isHandComplete: gameState.isHandComplete(),
      isBettingRoundComplete: gameState.isBettingRoundComplete(),
      players: players,
      engine: 'SOPHISTICATED_TYPESCRIPT'
    });

  } catch (error) {
    console.error('❌ Get game state error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET LEGAL ACTIONS - Using Real BettingEngine
app.get('/api/games/:id/legal-actions', (req, res) => {
  try {
    console.log('⚖️ Getting legal actions...');
    const gameId = req.params.id;
    const playerId = req.query.player_id;

    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (!playerId) {
      return res.status(400).json({ error: 'player_id query parameter required' });
    }

    // ✅ Use REAL sophisticated BettingEngine
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
        toAct: gameState.toAct,
        street: gameState.currentStreet
      },
      engine: 'SOPHISTICATED_TYPESCRIPT'
    });

  } catch (error) {
    console.error('❌ Get legal actions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// LIST GAMES
app.get('/api/games', (req, res) => {
  try {
    const gameList = Array.from(games.values()).map(game => ({
      id: game.id,
      status: game.status,
      playerCount: game.players.size,
      maxPlayers: game.configuration.maxPlayers,
      canJoin: game.players.size < game.configuration.maxPlayers,
      canStartHand: game.canStartHand()
    }));

    res.json({
      games: gameList,
      total: gameList.length,
      engine: 'SOPHISTICATED_TYPESCRIPT'
    });

  } catch (error) {
    console.error('❌ List games error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error handling
app.use((error, req, res, next) => {
  console.error('❌ Server error:', error);
  res.status(500).json({ error: error.message });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ===============================================');
  console.log('🚀 FIXED SOPHISTICATED POKER ENGINE STARTED!');
  console.log('🚀 ===============================================');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log(`🚀 Health: http://localhost:${PORT}/health`);
  console.log(`🚀 Test UI: http://localhost:${PORT}/test`);
  console.log(`🚀 Engine: REAL TypeScript components`);
  console.log(`🚀 Features: Complete poker game logic`);
  console.log('🚀 ===============================================');
  console.log('');
});
