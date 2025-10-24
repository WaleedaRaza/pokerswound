// Simple test server without TypeScript compilation issues
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
  path: '/ws',
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Game state storage (in-memory for testing)
const games = new Map();
const players = new Map();

// Helper function to generate IDs
function generateId() {
  return 'game_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Simple Poker Test Server',
    status: 'running'
  });
});

app.get('/test', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'test-client.html'));
});

// Create game
app.post('/api/games', (req, res) => {
  console.log('POST /api/games called with:', req.body);
  try {
    const { small_blind, big_blind, max_players } = req.body;
    
    if (!small_blind || !big_blind || !max_players) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        error: 'Missing required fields: small_blind, big_blind, max_players' 
      });
    }
    
    const gameId = generateId();
    const game = {
      id: gameId,
      smallBlind: small_blind,
      bigBlind: big_blind,
      maxPlayers: max_players,
      status: 'WAITING',
      players: [],
      handNumber: 0,
      pot: 0,
      communityCards: [],
      street: 'WAITING',
      toAct: null,
      createdAt: new Date().toISOString()
    };
    
    games.set(gameId, game);
    console.log('Game created:', gameId);
    
    // Broadcast event
    io.to(`game:${gameId}`).emit('GAME_CREATED', { gameId });
    
    const response = {
      gameId,
      status: game.status,
      playerCount: 0
    };
    
    console.log('Sending response:', response);
    res.status(201).json(response);
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(400).json({ error: error.message });
  }
});

// Join game
app.post('/api/games/:id/join', (req, res) => {
  try {
    const gameId = req.params.id;
    const { player_id, player_name, buy_in_amount, seat_index } = req.body;
    
    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.players.length >= game.maxPlayers) {
      return res.status(400).json({ error: 'Game is full' });
    }
    
    // Find available seat
    const occupiedSeats = new Set(game.players.map(p => p.seatIndex));
    let seatIdx = seat_index;
    if (seatIdx === undefined) {
      for (let i = 0; i < game.maxPlayers; i++) {
        if (!occupiedSeats.has(i)) {
          seatIdx = i;
          break;
        }
      }
    }
    
    const player = {
      id: player_id,
      name: player_name,
      stack: buy_in_amount,
      seatIndex: seatIdx,
      isActive: true,
      hasFolded: false,
      isAllIn: false,
      betThisStreet: 0,
      holeCards: []
    };
    
    game.players.push(player);
    players.set(player_id, { gameId, ...player });
    
    // Broadcast event
    io.to(`game:${gameId}`).emit('PLAYER_JOINED', {
      gameId,
      playerId: player_id,
      playerName: player_name,
      seatIndex: seatIdx
    });
    
    res.status(201).json({
      gameId,
      playerId: player_id,
      seatIndex: seatIdx,
      playerCount: game.players.length,
      canStart: game.players.length >= 2
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Start hand
app.post('/api/games/:id/start-hand', (req, res) => {
  try {
    const gameId = req.params.id;
    const game = games.get(gameId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    if (game.players.length < 2) {
      return res.status(400).json({ error: 'Need at least 2 players' });
    }
    
    // Start new hand
    game.handNumber++;
    game.status = 'PREFLOP';
    game.street = 'PREFLOP';
    game.pot = 0;
    game.communityCards = [];
    
    // Reset players
    game.players.forEach(player => {
      player.hasFolded = false;
      player.isAllIn = false;
      player.betThisStreet = 0;
      player.holeCards = ['??', '??']; // Hidden cards for now
    });
    
    // Set dealer and blinds (simplified)
    const dealerIndex = (game.handNumber - 1) % game.players.length;
    const sbIndex = (dealerIndex + 1) % game.players.length;
    const bbIndex = (dealerIndex + 2) % game.players.length;
    
    // Post blinds
    if (game.players[sbIndex]) {
      game.players[sbIndex].stack -= game.smallBlind;
      game.players[sbIndex].betThisStreet = game.smallBlind;
      game.pot += game.smallBlind;
    }
    
    if (game.players[bbIndex]) {
      game.players[bbIndex].stack -= game.bigBlind;
      game.players[bbIndex].betThisStreet = game.bigBlind;
      game.pot += game.bigBlind;
    }
    
    // Set first to act (after big blind)
    const toActIndex = (bbIndex + 1) % game.players.length;
    game.toAct = game.players[toActIndex]?.id || null;
    
    // Broadcast event
    io.to(`game:${gameId}`).emit('HAND_STARTED', {
      gameId,
      handNumber: game.handNumber,
      dealerPosition: dealerIndex
    });
    
    res.status(201).json({
      gameId,
      handNumber: game.handNumber,
      dealerPosition: dealerIndex,
      communityCards: game.communityCards,
      pot: game.pot,
      toAct: game.toAct
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Player action
app.post('/api/games/:id/actions', (req, res) => {
  try {
    const gameId = req.params.id;
    const { player_id, action, amount } = req.body;
    
    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const player = game.players.find(p => p.id === player_id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    if (game.toAct !== player_id) {
      return res.status(400).json({ error: 'Not your turn' });
    }
    
    // Process action (simplified)
    switch (action) {
      case 'FOLD':
        player.hasFolded = true;
        break;
      case 'CHECK':
        // No action needed
        break;
      case 'CALL':
        const callAmount = Math.max(0, game.bigBlind - player.betThisStreet);
        const actualCall = Math.min(callAmount, player.stack);
        player.stack -= actualCall;
        player.betThisStreet += actualCall;
        game.pot += actualCall;
        break;
      case 'BET':
      case 'RAISE':
        if (amount && amount > 0) {
          const betAmount = Math.min(amount, player.stack);
          player.stack -= betAmount;
          player.betThisStreet += betAmount;
          game.pot += betAmount;
        }
        break;
      case 'ALL_IN':
        game.pot += player.stack;
        player.betThisStreet += player.stack;
        player.stack = 0;
        player.isAllIn = true;
        break;
    }
    
    // Find next player to act (simplified)
    const activePlayers = game.players.filter(p => !p.hasFolded && !p.isAllIn);
    if (activePlayers.length <= 1) {
      // Hand is over
      game.status = 'COMPLETED';
      game.toAct = null;
    } else {
      const currentIndex = game.players.findIndex(p => p.id === player_id);
      let nextIndex = (currentIndex + 1) % game.players.length;
      while (game.players[nextIndex].hasFolded || game.players[nextIndex].isAllIn) {
        nextIndex = (nextIndex + 1) % game.players.length;
      }
      game.toAct = game.players[nextIndex].id;
    }
    
    // Broadcast event
    io.to(`game:${gameId}`).emit('PLAYER_ACTION', {
      gameId,
      playerId: player_id,
      action,
      amount,
      street: game.street
    });
    
    res.status(201).json({
      gameId,
      action,
      amount,
      street: game.street,
      pot: game.pot,
      toAct: game.toAct,
      isHandComplete: game.status === 'COMPLETED'
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get game state
app.get('/api/games/:id', (req, res) => {
  try {
    const gameId = req.params.id;
    const game = games.get(gameId);
    
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json({
      gameId,
      status: game.status,
      handNumber: game.handNumber,
      street: game.street,
      communityCards: game.communityCards,
      pot: game.pot,
      toAct: game.toAct,
      players: game.players.map(p => ({
        id: p.id,
        name: p.name,
        stack: p.stack,
        seatIndex: p.seatIndex,
        isActive: p.isActive,
        hasFolded: p.hasFolded,
        isAllIn: p.isAllIn,
        betThisStreet: p.betThisStreet
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get legal actions
app.get('/api/games/:id/legal-actions', (req, res) => {
  try {
    const gameId = req.params.id;
    const playerId = req.query.player_id;
    
    const game = games.get(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    const player = game.players.find(p => p.id === playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    let actions = [];
    
    if (game.toAct === playerId && !player.hasFolded && !player.isAllIn) {
      actions.push('FOLD');
      
      if (player.betThisStreet >= game.bigBlind) {
        actions.push('CHECK');
      } else {
        actions.push('CALL');
      }
      
      if (player.stack > 0) {
        actions.push('BET');
        actions.push('RAISE');
        actions.push('ALL_IN');
      }
    }
    
    res.json({
      gameId,
      playerId,
      legalActions: actions,
      bettingInfo: {
        currentBet: game.bigBlind,
        minRaise: game.bigBlind,
        pot: game.pot,
        toAct: game.toAct
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join', (room) => {
    socket.join(room);
    socket.emit('joined', room);
    console.log(`Client ${socket.id} joined room: ${room}`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Simple Poker Test Server running on port ${PORT}`);
  console.log(`📱 Test client available at: http://localhost:${PORT}/test`);
  console.log(`🎮 API available at: http://localhost:${PORT}/api`);
});
