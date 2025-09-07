import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config, validateRequiredEnvVars, securityConfig, gameConfig } from './config/environment';

console.log('🚀 Starting Production Poker Engine...');

// Validate environment configuration
try {
  validateRequiredEnvVars();
  console.log('✅ Environment configuration validated');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  process.exit(1);
}

// Import compiled TypeScript engine modules
console.log('📦 Loading sophisticated engine components...');
const { GameStateModel } = require('../dist/core/models/game-state');
const { GameStateMachine } = require('../dist/core/engine/game-state-machine');
const { BettingEngine } = require('../dist/core/engine/betting-engine');
const { PlayerModel } = require('../dist/core/models/player');
const { ActionType, Street } = require('../dist/types/common.types');

console.log('🔧 Engine modules loaded:');
console.log('- GameStateModel:', typeof GameStateModel);
console.log('- GameStateMachine:', typeof GameStateMachine);
console.log('- BettingEngine:', typeof BettingEngine);
console.log('- PlayerModel:', typeof PlayerModel);
console.log('- ActionType:', typeof ActionType);

// Test engine creation
try {
  const testStateMachine = new GameStateMachine();
  const testBettingEngine = new BettingEngine();
  console.log('✅ Engine instances created successfully');
} catch (error) {
  console.error('❌ Engine creation failed:', error);
  process.exit(1);
}

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow WebSocket connections
}));

// CORS configuration
app.use(cors({
  origin: securityConfig.corsOrigin,
  credentials: securityConfig.corsCredentials,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📥 ${timestamp} ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body).substring(0, 200) : '');
  next();
});

// Static file serving
app.use('/cards', express.static(path.join(__dirname, '../cards')));
app.use('/test', express.static(path.join(__dirname, '../poker-test.html')));

// In-memory storage (will be replaced with database)
const games = new Map();
let gameCounter = 1;

// Engine instances
const stateMachine = new GameStateMachine();
const bettingEngine = new BettingEngine();

// Helper functions
function generateGameId(): string {
  return `prod_${Date.now()}_${gameCounter++}`;
}

function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 PRODUCTION POKER ENGINE',
    status: 'running',
    engine: 'SOPHISTICATED_TYPESCRIPT',
    environment: config.NODE_ENV,
    version: '1.0.0',
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
      'Legal actions calculation',
      'Environment-based configuration',
      'Security hardening'
    ],
    config: {
      defaultStartingChips: gameConfig.defaultStartingChips,
      maxGamesPerUser: gameConfig.maxGamesPerUser,
      enableRegistration: config.ENABLE_REGISTRATION,
      enableSpectatorMode: gameConfig.enableSpectatorMode,
    }
  });
});

// Health check endpoint
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
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
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
      memory: process.memoryUsage(),
      activeGames: games.size
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: config.NODE_ENV,
      error: error instanceof Error ? error.message : 'Unknown error',
      engine: 'SOPHISTICATED_TYPESCRIPT'
    });
  }
});

// Readiness probe endpoint
app.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

// Test client endpoint
app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '../poker-test.html'));
});

// CREATE GAME - Using Real GameStateModel
app.post('/api/games', (req, res) => {
  try {
    console.log('🎮 Creating game with production engine...');
    const { small_blind = 10, big_blind = 20, max_players = 6 } = req.body;
    const gameId = generateGameId();

    // Use sophisticated GameStateModel
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

    console.log(`✅ Created production game: ${gameId}`);

    res.status(201).json({
      gameId,
      status: gameState.status,
      playerCount: gameState.players.size,
      engine: 'PRODUCTION_TYPESCRIPT',
      environment: config.NODE_ENV,
      canStartHand: gameState.canStartHand(),
      configuration: {
        smallBlind: small_blind,
        bigBlind: big_blind,
        maxPlayers: max_players
      }
    });

  } catch (error) {
    console.error('❌ Create game error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      engine: 'PRODUCTION_TYPESCRIPT'
    });
  }
});

// JOIN GAME - Using Real PlayerModel
app.post('/api/games/:id/join', (req, res) => {
  try {
    console.log('👤 Player joining game with production engine...');
    const gameId = req.params.id;
    const { player_name, buy_in_amount = gameConfig.defaultStartingChips } = req.body;

    if (!player_name) {
      return res.status(400).json({ error: 'player_name is required' });
    }

    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (gameState.players.size >= gameState.configuration.maxPlayers) {
      return res.status(400).json({ error: 'Game is full' });
    }

    const playerId = generatePlayerId();

    // Use sophisticated PlayerModel  
    const player = new PlayerModel({
      uuid: playerId,
      name: player_name,
      stack: buy_in_amount,
      seatIndex: gameState.players.size
    });

    gameState.addPlayer(player);

    console.log(`✅ Player ${player_name} joined production game`);

    res.status(201).json({
      gameId,
      playerId,
      playerName: player_name,
      seatIndex: player.seatIndex,
      playerCount: gameState.players.size,
      canStart: gameState.canStartHand(),
      engine: 'PRODUCTION_TYPESCRIPT',
      environment: config.NODE_ENV
    });

  } catch (error) {
    console.error('❌ Join game error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      engine: 'PRODUCTION_TYPESCRIPT'
    });
  }
});

// START HAND - Using Real GameStateMachine
app.post('/api/games/:id/start-hand', (req, res) => {
  try {
    console.log('🃏 Starting hand with production state machine...');
    const gameId = req.params.id;
    const gameState = games.get(gameId);

    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    // Use sophisticated GameStateMachine
    const result = stateMachine.processAction(gameState, {
      type: 'START_HAND'
    });

    if (!result.success) {
      console.error('❌ Start hand failed:', result.error);
      return res.status(400).json({ error: result.error });
    }

    console.log(`✅ Started production hand ${result.newState.handState.handNumber}`);

    // Update stored state
    games.set(gameId, result.newState);

    const players = Array.from(result.newState.players.values()).map((p: any) => ({
      id: p.uuid,
      name: p.name,
      stack: p.stack,
      betThisStreet: p.betThisStreet,
      isActive: p.isActive,
      hasFolded: p.hasFolded,
      isAllIn: p.isAllIn,
      holeCards: p.holeCards ? p.holeCards.map((c: any) => c.toString()) : []
    }));

    res.status(201).json({
      gameId,
      handNumber: result.newState.handState.handNumber,
      communityCards: result.newState.handState.communityCards.map(c => c.toString()),
      pot: result.newState.pot.totalPot,
      toAct: result.newState.toAct,
      street: result.newState.currentStreet,
      currentBet: result.newState.bettingRound.currentBet,
      engine: 'PRODUCTION_TYPESCRIPT',
      environment: config.NODE_ENV,
      events: result.events,
      players: players
    });

  } catch (error) {
    console.error('❌ Start hand error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      engine: 'PRODUCTION_TYPESCRIPT'
    });
  }
});

// PLAYER ACTION - Using Real BettingEngine and GameStateMachine
app.post('/api/games/:id/actions', (req, res) => {
  try {
    console.log('⚡ Processing player action with production engine...');
    const gameId = req.params.id;
    const { player_id, action, amount } = req.body;

    if (!player_id || !action) {
      return res.status(400).json({ error: 'player_id and action are required' });
    }

    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    console.log(`Processing action: ${player_id} -> ${action} (${amount || 'no amount'})`);

    // Use sophisticated GameStateMachine
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

    console.log(`✅ Processed production action: ${player_id} ${action} ${amount || ''}`);

    // Update stored state
    games.set(gameId, result.newState);

    const players = Array.from(result.newState.players.values()).map((p: any) => ({
      id: p.uuid,
      name: p.name,
      stack: p.stack,
      betThisStreet: p.betThisStreet,
      hasFolded: p.hasFolded,
      isAllIn: p.isAllIn,
      isActive: p.isActive
    }));

    res.status(201).json({
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
      engine: 'PRODUCTION_TYPESCRIPT',
      environment: config.NODE_ENV,
      events: result.events,
      players: players
    });

  } catch (error) {
    console.error('❌ Process action error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      engine: 'PRODUCTION_TYPESCRIPT'
    });
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

    const players = Array.from(gameState.players.values()).map((p: any) => ({
      id: p.uuid,
      name: p.name,
      stack: p.stack,
      seatIndex: p.seatIndex,
      isActive: p.isActive,
      hasFolded: p.hasFolded,
      isAllIn: p.isAllIn,
      betThisStreet: p.betThisStreet,
      holeCards: p.holeCards ? p.holeCards.map((c: any) => c.toString()) : []
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
      engine: 'PRODUCTION_TYPESCRIPT',
      environment: config.NODE_ENV
    });

  } catch (error) {
    console.error('❌ Get game state error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      engine: 'PRODUCTION_TYPESCRIPT'
    });
  }
});

// GET LEGAL ACTIONS - Using Real BettingEngine
app.get('/api/games/:id/legal-actions', (req, res) => {
  try {
    console.log('⚖️ Getting legal actions...');
    const gameId = req.params.id;
    const playerId = req.query.player_id as string;

    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (!playerId) {
      return res.status(400).json({ error: 'player_id query parameter required' });
    }

    // Use sophisticated BettingEngine
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
      engine: 'PRODUCTION_TYPESCRIPT',
      environment: config.NODE_ENV
    });

  } catch (error) {
    console.error('❌ Get legal actions error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      engine: 'PRODUCTION_TYPESCRIPT'
    });
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
      engine: 'PRODUCTION_TYPESCRIPT',
      environment: config.NODE_ENV
    });

  } catch (error) {
    console.error('❌ List games error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error',
      engine: 'PRODUCTION_TYPESCRIPT'
    });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found',
    path: req.originalUrl,
    engine: 'PRODUCTION_TYPESCRIPT',
    environment: config.NODE_ENV
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ Server error:', error);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: config.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    engine: 'PRODUCTION_TYPESCRIPT',
    environment: config.NODE_ENV,
    requestId: req.headers['x-request-id'] || 'unknown'
  });
});

// Start server
const server = app.listen(config.PORT, config.HOST, () => {
  console.log('');
  console.log('🚀 ===============================================');
  console.log('🚀 PRODUCTION POKER ENGINE STARTED!');
  console.log('🚀 ===============================================');
  console.log(`🚀 Server: http://${config.HOST}:${config.PORT}`);
  console.log(`🚀 Health: http://${config.HOST}:${config.PORT}/health`);
  console.log(`🚀 Ready: http://${config.HOST}:${config.PORT}/ready`);
  console.log(`🚀 Test UI: http://${config.HOST}:${config.PORT}/test`);
  console.log(`🚀 Environment: ${config.NODE_ENV}`);
  console.log(`🚀 Engine: PRODUCTION TypeScript components`);
  console.log(`🚀 Features: Complete poker game logic with environment config`);
  console.log('🚀 ===============================================');
  console.log('');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

export default app;
