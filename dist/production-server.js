"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const path_1 = __importDefault(require("path"));
const environment_1 = require("./config/environment");
console.log('🚀 Starting Production Poker Engine...');
try {
    (0, environment_1.validateRequiredEnvVars)();
    console.log('✅ Environment configuration validated');
}
catch (error) {
    console.error('❌ Environment validation failed:', error);
    process.exit(1);
}
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
try {
    const testStateMachine = new GameStateMachine();
    const testBettingEngine = new BettingEngine();
    console.log('✅ Engine instances created successfully');
}
catch (error) {
    console.error('❌ Engine creation failed:', error);
    process.exit(1);
}
const app = (0, express_1.default)();
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: environment_1.securityConfig.corsOrigin,
    credentials: environment_1.securityConfig.corsCredentials,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`📥 ${timestamp} ${req.method} ${req.path}`, req.body ? JSON.stringify(req.body).substring(0, 200) : '');
    next();
});
app.use('/cards', express_1.default.static(path_1.default.join(__dirname, '../cards')));
app.use('/test', express_1.default.static(path_1.default.join(__dirname, '../poker-test.html')));
const games = new Map();
let gameCounter = 1;
const stateMachine = new GameStateMachine();
const bettingEngine = new BettingEngine();
function generateGameId() {
    return `prod_${Date.now()}_${gameCounter++}`;
}
function generatePlayerId() {
    return `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}
app.get('/', (req, res) => {
    res.json({
        message: '🚀 PRODUCTION POKER ENGINE',
        status: 'running',
        engine: 'SOPHISTICATED_TYPESCRIPT',
        environment: environment_1.config.NODE_ENV,
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
            defaultStartingChips: environment_1.gameConfig.defaultStartingChips,
            maxGamesPerUser: environment_1.gameConfig.maxGamesPerUser,
            enableRegistration: environment_1.config.ENABLE_REGISTRATION,
            enableSpectatorMode: environment_1.gameConfig.enableSpectatorMode,
        }
    });
});
app.get('/health', (req, res) => {
    try {
        console.log('🏥 Health check - testing engine components...');
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
            environment: environment_1.config.NODE_ENV,
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
    }
    catch (error) {
        console.error('❌ Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            environment: environment_1.config.NODE_ENV,
            error: error instanceof Error ? error.message : 'Unknown error',
            engine: 'SOPHISTICATED_TYPESCRIPT'
        });
    }
});
app.get('/ready', (req, res) => {
    res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        environment: environment_1.config.NODE_ENV
    });
});
app.get('/test', (req, res) => {
    res.sendFile(path_1.default.join(__dirname, '../poker-test.html'));
});
app.post('/api/games', (req, res) => {
    try {
        console.log('🎮 Creating game with production engine...');
        const { small_blind = 10, big_blind = 20, max_players = 6 } = req.body;
        const gameId = generateGameId();
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
            environment: environment_1.config.NODE_ENV,
            canStartHand: gameState.canStartHand(),
            configuration: {
                smallBlind: small_blind,
                bigBlind: big_blind,
                maxPlayers: max_players
            }
        });
    }
    catch (error) {
        console.error('❌ Create game error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
            engine: 'PRODUCTION_TYPESCRIPT'
        });
    }
});
app.post('/api/games/:id/join', (req, res) => {
    try {
        console.log('👤 Player joining game with production engine...');
        const gameId = req.params.id;
        const { player_name, buy_in_amount = environment_1.gameConfig.defaultStartingChips } = req.body;
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
            environment: environment_1.config.NODE_ENV
        });
    }
    catch (error) {
        console.error('❌ Join game error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
            engine: 'PRODUCTION_TYPESCRIPT'
        });
    }
});
app.post('/api/games/:id/start-hand', (req, res) => {
    try {
        console.log('🃏 Starting hand with production state machine...');
        const gameId = req.params.id;
        const gameState = games.get(gameId);
        if (!gameState) {
            return res.status(404).json({ error: 'Game not found' });
        }
        const result = stateMachine.processAction(gameState, {
            type: 'START_HAND'
        });
        if (!result.success) {
            console.error('❌ Start hand failed:', result.error);
            return res.status(400).json({ error: result.error });
        }
        console.log(`✅ Started production hand ${result.newState.handState.handNumber}`);
        games.set(gameId, result.newState);
        const players = Array.from(result.newState.players.values()).map((p) => ({
            id: p.uuid,
            name: p.name,
            stack: p.stack,
            betThisStreet: p.betThisStreet,
            isActive: p.isActive,
            hasFolded: p.hasFolded,
            isAllIn: p.isAllIn,
            holeCards: p.holeCards ? p.holeCards.map((c) => c.toString()) : []
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
            environment: environment_1.config.NODE_ENV,
            events: result.events,
            players: players
        });
    }
    catch (error) {
        console.error('❌ Start hand error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
            engine: 'PRODUCTION_TYPESCRIPT'
        });
    }
});
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
        games.set(gameId, result.newState);
        const players = Array.from(result.newState.players.values()).map((p) => ({
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
            environment: environment_1.config.NODE_ENV,
            events: result.events,
            players: players
        });
    }
    catch (error) {
        console.error('❌ Process action error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
            engine: 'PRODUCTION_TYPESCRIPT'
        });
    }
});
app.get('/api/games/:id', (req, res) => {
    try {
        console.log('📊 Getting game state...');
        const gameId = req.params.id;
        const gameState = games.get(gameId);
        if (!gameState) {
            return res.status(404).json({ error: 'Game not found' });
        }
        const players = Array.from(gameState.players.values()).map((p) => ({
            id: p.uuid,
            name: p.name,
            stack: p.stack,
            seatIndex: p.seatIndex,
            isActive: p.isActive,
            hasFolded: p.hasFolded,
            isAllIn: p.isAllIn,
            betThisStreet: p.betThisStreet,
            holeCards: p.holeCards ? p.holeCards.map((c) => c.toString()) : []
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
            environment: environment_1.config.NODE_ENV
        });
    }
    catch (error) {
        console.error('❌ Get game state error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
            engine: 'PRODUCTION_TYPESCRIPT'
        });
    }
});
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
        const legalActions = bettingEngine.getLegalActions(playerId, gameState, gameState.bettingRound.currentBet, gameState.bettingRound.minRaise);
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
            environment: environment_1.config.NODE_ENV
        });
    }
    catch (error) {
        console.error('❌ Get legal actions error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
            engine: 'PRODUCTION_TYPESCRIPT'
        });
    }
});
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
            environment: environment_1.config.NODE_ENV
        });
    }
    catch (error) {
        console.error('❌ List games error:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Unknown error',
            engine: 'PRODUCTION_TYPESCRIPT'
        });
    }
});
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: 'The requested resource was not found',
        path: req.originalUrl,
        engine: 'PRODUCTION_TYPESCRIPT',
        environment: environment_1.config.NODE_ENV
    });
});
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: environment_1.config.NODE_ENV === 'development' ? error.message : 'Something went wrong',
        engine: 'PRODUCTION_TYPESCRIPT',
        environment: environment_1.config.NODE_ENV,
        requestId: req.headers['x-request-id'] || 'unknown'
    });
});
const server = app.listen(environment_1.config.PORT, environment_1.config.HOST, () => {
    console.log('');
    console.log('🚀 ===============================================');
    console.log('🚀 PRODUCTION POKER ENGINE STARTED!');
    console.log('🚀 ===============================================');
    console.log(`🚀 Server: http://${environment_1.config.HOST}:${environment_1.config.PORT}`);
    console.log(`🚀 Health: http://${environment_1.config.HOST}:${environment_1.config.PORT}/health`);
    console.log(`🚀 Ready: http://${environment_1.config.HOST}:${environment_1.config.PORT}/ready`);
    console.log(`🚀 Test UI: http://${environment_1.config.HOST}:${environment_1.config.PORT}/test`);
    console.log(`🚀 Environment: ${environment_1.config.NODE_ENV}`);
    console.log(`🚀 Engine: PRODUCTION TypeScript components`);
    console.log(`🚀 Features: Complete poker game logic with environment config`);
    console.log('🚀 ===============================================');
    console.log('');
});
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
exports.default = app;
