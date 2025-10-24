const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Minimal test server working!' });
});

// Serve test page
app.get('/test', (req, res) => {
  res.sendFile(__dirname + '/simple-test.html');
});

// Serve full poker test page
app.get('/poker', (req, res) => {
  res.sendFile(__dirname + '/poker-test.html');
});

// Game storage
const games = new Map();
let gameCounter = 1;

// Helper functions
function generateGameId() {
  return `game_${Date.now()}_${gameCounter++}`;
}

function generatePlayerId() {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// Create game endpoint
app.post('/api/games', (req, res) => {
  console.log('Create game request:', req.body);
  
  const { small_blind, big_blind, max_players } = req.body;
  
  const gameId = generateGameId();
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
    dealerPosition: 0,
    createdAt: new Date().toISOString()
  };
  
  games.set(gameId, game);
  console.log('Game created:', gameId);
  
  res.json({ 
    gameId,
    status: game.status,
    playerCount: game.players.length
  });
});

// Join game endpoint
app.post('/api/games/:id/join', (req, res) => {
  console.log('Join game request:', req.params.id, req.body);
  
  const gameId = req.params.id;
  const { player_name, buy_in_amount } = req.body;
  
  const game = games.get(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  if (game.players.length >= game.maxPlayers) {
    return res.status(400).json({ error: 'Game is full' });
  }
  
  // Find available seat
  const occupiedSeats = new Set(game.players.map(p => p.seatIndex));
  let seatIndex = 0;
  while (occupiedSeats.has(seatIndex) && seatIndex < game.maxPlayers) {
    seatIndex++;
  }
  
  const playerId = generatePlayerId();
  const player = {
    id: playerId,
    name: player_name,
    stack: buy_in_amount,
    seatIndex,
    isActive: true,
    hasFolded: false,
    isAllIn: false,
    betThisStreet: 0,
    holeCards: []
  };
  
  game.players.push(player);
  console.log(`Player ${player_name} joined game ${gameId} at seat ${seatIndex}`);
  
  res.json({
    gameId,
    playerId,
    playerName: player_name,
    seatIndex,
    playerCount: game.players.length,
    canStart: game.players.length >= 2
  });
});

// Start hand endpoint
app.post('/api/games/:id/start-hand', (req, res) => {
  console.log('Start hand request:', req.params.id);
  
  const gameId = req.params.id;
  const game = games.get(gameId);
  
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }
  
  if (game.players.length < 2) {
    return res.status(400).json({ error: 'Need at least 2 players to start' });
  }
  
  // Start new hand
  game.handNumber++;
  game.status = 'PREFLOP';
  game.street = 'PREFLOP';
  game.pot = 0;
  game.communityCards = [];
  
  // Reset players for new hand
  game.players.forEach(player => {
    player.hasFolded = false;
    player.isAllIn = false;
    player.betThisStreet = 0;
    player.holeCards = ['🂠', '🂠']; // Face down cards
  });
  
  // Set positions
  const activePlayers = game.players.filter(p => p.stack > 0);
  if (activePlayers.length < 2) {
    return res.status(400).json({ error: 'Not enough players with chips' });
  }
  
  // Move dealer button
  game.dealerPosition = (game.dealerPosition) % activePlayers.length;
  
  // Post blinds
  const sbIndex = (game.dealerPosition + 1) % activePlayers.length;
  const bbIndex = (game.dealerPosition + 2) % activePlayers.length;
  
  // Small blind
  const sbPlayer = activePlayers[sbIndex];
  const sbAmount = Math.min(game.smallBlind, sbPlayer.stack);
  sbPlayer.stack -= sbAmount;
  sbPlayer.betThisStreet = sbAmount;
  game.pot += sbAmount;
  
  // Big blind
  const bbPlayer = activePlayers[bbIndex];
  const bbAmount = Math.min(game.bigBlind, bbPlayer.stack);
  bbPlayer.stack -= bbAmount;
  bbPlayer.betThisStreet = bbAmount;
  game.pot += bbAmount;
  
  // Set first to act (after big blind)
  const toActIndex = (bbIndex + 1) % activePlayers.length;
  game.toAct = activePlayers[toActIndex].id;
  
  console.log(`Hand ${game.handNumber} started, pot: ${game.pot}, to act: ${game.toAct}`);
  
  res.json({
    gameId,
    handNumber: game.handNumber,
    dealerPosition: game.dealerPosition,
    communityCards: game.communityCards,
    pot: game.pot,
    toAct: game.toAct,
    street: game.street
  });
});

// Get game state endpoint
app.get('/api/games/:id', (req, res) => {
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
});

// Player action endpoint
app.post('/api/games/:id/actions', (req, res) => {
  console.log('Player action:', req.params.id, req.body);
  
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
    return res.status(400).json({ error: 'Not your turn to act' });
  }
  
  // Process action
  let actionAmount = 0;
  
  switch (action) {
    case 'FOLD':
      player.hasFolded = true;
      break;
      
    case 'CHECK':
      // No chips moved
      break;
      
    case 'CALL':
      const callAmount = Math.max(0, game.bigBlind - player.betThisStreet);
      actionAmount = Math.min(callAmount, player.stack);
      player.stack -= actionAmount;
      player.betThisStreet += actionAmount;
      game.pot += actionAmount;
      break;
      
    case 'BET':
    case 'RAISE':
      if (amount && amount > 0) {
        actionAmount = Math.min(amount, player.stack);
        player.stack -= actionAmount;
        player.betThisStreet += actionAmount;
        game.pot += actionAmount;
      }
      break;
      
    case 'ALL_IN':
      actionAmount = player.stack;
      game.pot += actionAmount;
      player.betThisStreet += actionAmount;
      player.stack = 0;
      player.isAllIn = true;
      break;
  }
  
  console.log(`${player.name} ${action} ${actionAmount || ''}`);
  
  // Find next player to act
  const activePlayers = game.players.filter(p => !p.hasFolded && !p.isAllIn && p.stack > 0);
  
  if (activePlayers.length <= 1) {
    // Hand is over
    game.status = 'COMPLETED';
    game.toAct = null;
    console.log('Hand completed');
  } else {
    // Find next player
    const currentIndex = game.players.findIndex(p => p.id === player_id);
    let nextIndex = (currentIndex + 1) % game.players.length;
    
    while (game.players[nextIndex].hasFolded || 
           game.players[nextIndex].isAllIn || 
           game.players[nextIndex].stack === 0) {
      nextIndex = (nextIndex + 1) % game.players.length;
      
      // Safety check to prevent infinite loop
      if (nextIndex === currentIndex) {
        game.status = 'COMPLETED';
        game.toAct = null;
        break;
      }
    }
    
    if (game.status !== 'COMPLETED') {
      game.toAct = game.players[nextIndex].id;
    }
  }
  
  res.json({
    gameId,
    action,
    amount: actionAmount,
    street: game.street,
    pot: game.pot,
    toAct: game.toAct,
    isHandComplete: game.status === 'COMPLETED'
  });
});

// Get legal actions endpoint
app.get('/api/games/:id/legal-actions', (req, res) => {
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
  
  if (game.toAct === playerId && !player.hasFolded && !player.isAllIn && player.stack > 0) {
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
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Minimal server running on http://localhost:${PORT}`);
});
