const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const { Server } = require('socket.io');

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

// Serve static files (card images)
app.use('/cards', express.static(path.join(__dirname, 'cards')));

// In-memory storage for demo (normally would use database)
const games = new Map();
let gameCounter = 1;

// Store userId mappings separately (since PlayerModel doesn't have userId property)
const playerUserIds = new Map(); // gameId -> Map(playerId -> userId)

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

// ---- Database (PostgreSQL via DATABASE_URL) ---------------------------------
let dbPool = null;
function getDb() {
  if (dbPool) return dbPool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn('⚠️  No DATABASE_URL found. Room persistence will be disabled.');
    return null;
  }
  dbPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    application_name: 'sophisticated-engine-server'
  });
  return dbPool;
}

async function createRoom({
  name,
  small_blind,
  big_blind,
  min_buy_in,
  max_buy_in,
  max_players,
  is_private = false,
  host_user_id = null
}) {
  const db = getDb();
  if (!db) throw new Error('Database not configured');
  const invite = Math.random().toString(36).substring(2, 8).toUpperCase();
  const res = await db.query(
    `INSERT INTO rooms (name, small_blind, big_blind, min_buy_in, max_buy_in, max_players, is_private, invite_code, host_user_id, lobby_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'lobby')
     RETURNING id, invite_code, max_players, host_user_id`,
    [name, small_blind, big_blind, min_buy_in, max_buy_in, max_players, is_private, invite, host_user_id]
  );
  return res.rows[0];
}

async function getRoomByInvite(inviteCode) {
  const db = getDb();
  if (!db) throw new Error('Database not configured');
  const roomRes = await db.query(
    `SELECT id, name, small_blind, big_blind, min_buy_in, max_buy_in, max_players, is_private, status
     FROM rooms WHERE invite_code = $1 LIMIT 1`,
    [inviteCode]
  );
  if (roomRes.rowCount === 0) return null;
  const room = roomRes.rows[0];
  const seatsRes = await db.query(
    `SELECT seat_index, user_id, status, chips_in_play
     FROM room_seats WHERE room_id = $1 ORDER BY seat_index ASC`,
    [room.id]
  );
  return { room, seats: seatsRes.rows };
}

async function claimSeat({ roomId, userId, seatIndex, buyInAmount }) {
  const db = getDb();
  if (!db) throw new Error('Database not configured');
  // Use unique constraints to ensure seat locking
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    // Ensure user exists (auto-provision guest if missing)
    const userExists = await client.query(`SELECT 1 FROM users WHERE id=$1`, [userId]);
    if (userExists.rowCount === 0) {
      const email = `guest-${userId}@poker.local`;
      const username = `guest_${userId.substring(0, 8)}`;
      // Dev-only bcrypt for placeholder password: 'guest'
      const placeholderHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewngHTNk.5gZLWhy';
      await client.query(
        `INSERT INTO users (id, email, username, password_hash, display_name, is_verified)
         VALUES ($1,$2,$3,$4,$5,true)`,
        [userId, email, username, placeholderHash, username]
      );
    }
    // Ensure seat is free
    const exists = await client.query(
      `SELECT 1 FROM room_seats WHERE room_id=$1 AND seat_index=$2 AND left_at IS NULL`,
      [roomId, seatIndex]
    );
    if (exists.rowCount > 0) {
      throw new Error('Seat already taken');
    }
    // Ensure user not already seated
    const seated = await client.query(
      `SELECT 1 FROM room_seats WHERE room_id=$1 AND user_id=$2 AND left_at IS NULL`,
      [roomId, userId]
    );
    if (seated.rowCount > 0) {
      throw new Error('User already seated');
    }
    // Insert seat
    await client.query(
      `INSERT INTO room_seats (room_id, user_id, seat_index, status, chips_in_play)
       VALUES ($1,$2,$3,'SEATED',$4)`,
      [roomId, userId, seatIndex, buyInAmount]
    );
    await client.query('COMMIT');
    // broadcast
    broadcastSeats(roomId).catch(()=>{});
    return { ok: true };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function releaseSeat({ roomId, userId }) {
  const db = getDb();
  if (!db) throw new Error('Database not configured');
  await db.query(
    `UPDATE room_seats SET left_at = NOW(), status='SITTING_OUT' WHERE room_id=$1 AND user_id=$2 AND left_at IS NULL`,
    [roomId, userId]
  );
  broadcastSeats(roomId).catch(()=>{});
  return { ok: true };
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
app.post('/api/games', async (req, res) => {
  try {
    const { small_blind, big_blind, max_players, roomId } = req.body;
    
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
    
    // Store roomId in game state for WebSocket broadcasts
    if (roomId) {
      gameState.roomId = roomId;
    }
    
    // Store in memory
    games.set(gameId, gameState);
    
    // Store game_id in room table for guest lookup
    if (roomId) {
      const db = getDb();
      if (db) {
        try {
          await db.query(
            'UPDATE rooms SET game_id = $1 WHERE id = $2',
            [gameId, roomId]
          );
          console.log(`✅ Linked game ${gameId} to room ${roomId}`);
        } catch (dbError) {
          console.error('Error linking game to room:', dbError.message);
        }
      }
    }
    
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

// ============================================
// AUTH ENDPOINTS (Simple version for demo)
// ============================================
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'poker-secret-change-in-production';

// JWT Authentication Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user; // Attach user info to request
    next();
  });
}

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password required' });
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Check if user exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingUser.rowCount > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, total_chips, created_at)
       VALUES ($1, $2, $3, 1000, NOW())
       RETURNING id, username, email, total_chips, created_at`,
      [username, email, hashedPassword]
    );
    
    const user = result.rows[0];
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        chips_total: user.total_chips
      }
    });
    
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Find user
    const result = await db.query(
      'SELECT id, username, email, password_hash, total_chips FROM users WHERE username = $1 OR email = $1',
      [username]
    );
    
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    
    // Verify password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        chips_total: user.total_chips
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ============================================
// LOBBY SYSTEM ENDPOINTS
// ============================================

// Join room lobby (request to join)
app.post('/api/rooms/:roomId/lobby/join', async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Check if room exists
    const roomCheck = await db.query('SELECT id, host_user_id FROM rooms WHERE id = $1', [req.params.roomId]);
    if (roomCheck.rowCount === 0) return res.status(404).json({ error: 'Room not found' });
    
    const isHost = roomCheck.rows[0].host_user_id === user_id;
    
    // Auto-provision user if they don't exist (temporary fix for JWT users not in DB)
    const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [user_id]);
    if (userCheck.rowCount === 0) {
      console.log(`⚠️ User ${user_id} not in DB, auto-provisioning...`);
      await db.query(
        `INSERT INTO users (id, username, email, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [user_id, `Guest_${user_id.substring(0, 6)}`, `${user_id}@temp.local`, 'temp']
      );
    }
    
    // Add player to lobby (auto-approve if host, otherwise pending)
    const status = isHost ? 'approved' : 'pending';
    const result = await db.query(
      `INSERT INTO room_players (room_id, user_id, status, approved_at)
       VALUES ($1, $2, $3, ${status === 'approved' ? 'NOW()' : 'NULL'})
       ON CONFLICT (room_id, user_id) 
       DO UPDATE SET status = $3, joined_at = NOW()
       RETURNING id, status`,
      [req.params.roomId, user_id, status]
    );
    
    console.log(`👋 Player ${user_id} ${status === 'approved' ? 'joined' : 'requesting to join'} room lobby`);
    res.json({ success: true, status: result.rows[0].status });
  } catch (e) {
    console.error('Lobby join error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get lobby players (for host to see pending requests)
app.get('/api/rooms/:roomId/lobby/players', async (req, res) => {
  try {
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    const result = await db.query(
      `SELECT rp.id, rp.user_id, rp.status, rp.joined_at, rp.approved_at,
              u.username, u.email
       FROM room_players rp
       JOIN users u ON rp.user_id = u.id
       WHERE rp.room_id = $1
       ORDER BY rp.joined_at ASC`,
      [req.params.roomId]
    );
    
    res.json({ players: result.rows });
  } catch (e) {
    console.error('Get lobby players error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Approve player (host only)
app.post('/api/rooms/:roomId/lobby/approve', async (req, res) => {
  try {
    const { user_id, target_user_id } = req.body;
    if (!user_id || !target_user_id) return res.status(400).json({ error: 'Missing user_id or target_user_id' });
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Verify requester is host
    const roomCheck = await db.query('SELECT host_user_id FROM rooms WHERE id = $1', [req.params.roomId]);
    if (roomCheck.rowCount === 0) return res.status(404).json({ error: 'Room not found' });
    if (roomCheck.rows[0].host_user_id !== user_id) {
      return res.status(403).json({ error: 'Only the host can approve players' });
    }
    
    // Approve the player
    await db.query(
      `UPDATE room_players SET status = 'approved', approved_at = NOW()
       WHERE room_id = $1 AND user_id = $2`,
      [req.params.roomId, target_user_id]
    );
    
    console.log(`✅ Host approved player ${target_user_id}`);
    res.json({ success: true });
  } catch (e) {
    console.error('Approve player error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Rebuy endpoint for cash game mode
app.post('/api/rooms/:roomId/rebuy', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const { amount } = req.body; // e.g., 500
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid rebuy amount' });
    }
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Check if room allows rebuys
    const roomRes = await db.query(
      'SELECT allow_rebuys, game_mode FROM rooms WHERE id = $1',
      [roomId]
    );
    
    if (roomRes.rowCount === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }
    
    if (!roomRes.rows[0].allow_rebuys) {
      return res.status(400).json({ error: 'Rebuys not allowed in this game (tournament mode)' });
    }
    
    // Update player's chip count
    const updateRes = await db.query(
      'UPDATE room_seats SET chips_in_play = chips_in_play + $1 WHERE room_id = $2 AND user_id = $3 RETURNING chips_in_play',
      [amount, roomId, userId]
    );
    
    if (updateRes.rowCount === 0) {
      return res.status(404).json({ error: 'Player not seated in this room' });
    }
    
    const newStack = updateRes.rows[0].chips_in_play;
    
    // Log rebuy
    await db.query(
      'INSERT INTO rebuys (room_id, user_id, amount) VALUES ($1, $2, $3)',
      [roomId, userId, amount]
    );
    
    console.log(`💰 Player ${userId} rebought for $${amount} (new stack: $${newStack})`);
    
    // Broadcast to room
    io.to(`room:${roomId}`).emit('player_rebuy', {
      userId,
      amount,
      newStack,
      message: `Player bought in for $${amount}`
    });
    
    res.json({ success: true, newStack });
  } catch (error) {
    console.error('Rebuy error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reject player (host only)
app.post('/api/rooms/:roomId/lobby/reject', async (req, res) => {
  try {
    const { user_id, target_user_id } = req.body;
    if (!user_id || !target_user_id) return res.status(400).json({ error: 'Missing user_id or target_user_id' });
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Verify requester is host
    const roomCheck = await db.query('SELECT host_user_id FROM rooms WHERE id = $1', [req.params.roomId]);
    if (roomCheck.rowCount === 0) return res.status(404).json({ error: 'Room not found' });
    if (roomCheck.rows[0].host_user_id !== user_id) {
      return res.status(403).json({ error: 'Only the host can reject players' });
    }
    
    // Reject the player
    await db.query(
      `UPDATE room_players SET status = 'rejected'
       WHERE room_id = $1 AND user_id = $2`,
      [req.params.roomId, target_user_id]
    );
    
    console.log(`❌ Host rejected player ${target_user_id}`);
    res.json({ success: true });
  } catch (e) {
    console.error('Reject player error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Check my lobby status
app.get('/api/rooms/:roomId/lobby/my-status', async (req, res) => {
  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: 'Missing user_id' });
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    const result = await db.query(
      `SELECT status, joined_at, approved_at FROM room_players
       WHERE room_id = $1 AND user_id = $2`,
      [req.params.roomId, userId]
    );
    
    if (result.rowCount === 0) {
      return res.json({ status: 'not_joined' });
    }
    
    res.json({ status: result.rows[0].status, joined_at: result.rows[0].joined_at, approved_at: result.rows[0].approved_at });
  } catch (e) {
    console.error('Check lobby status error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Get hand history for a room (audit trail)
app.get('/api/rooms/:roomId/history', authenticateToken, async (req, res) => {
  try {
    const { roomId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    const historyRes = await db.query(
      'SELECT * FROM hand_history WHERE room_id = $1 ORDER BY created_at DESC LIMIT $2',
      [roomId, limit]
    );
    
    res.json({ hands: historyRes.rows });
  } catch (error) {
    console.error('Get hand history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ----- Rooms & Seats (Multi-player support, DB-backed) -----------------------
app.post('/api/rooms', async (req, res) => {
  try {
    const { name, small_blind, big_blind, min_buy_in, max_buy_in, max_players = 9, is_private, host_user_id } = req.body || {};
    if (!name || !small_blind || !big_blind || !min_buy_in || !max_buy_in) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const room = await createRoom({ name, small_blind, big_blind, min_buy_in, max_buy_in, max_players, is_private, host_user_id });
    
    // Auto-join host to lobby if host_user_id provided
    if (host_user_id) {
      const db = getDb();
      if (db) {
        await db.query(
          `INSERT INTO room_players (room_id, user_id, status, approved_at)
           VALUES ($1, $2, 'approved', NOW())`,
          [room.id, host_user_id]
        );
        console.log(`👑 Host ${host_user_id} auto-joined room ${room.id}`);
      }
    }
    
    res.status(201).json({ roomId: room.id, inviteCode: room.invite_code, maxPlayers: room.max_players, hostUserId: room.host_user_id });
  } catch (e) {
    console.error('Create room error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/rooms/invite/:code', async (req, res) => {
  try {
    const data = await getRoomByInvite(req.params.code);
    if (!data) return res.status(404).json({ error: 'Room not found' });
    res.json(data);
  } catch (e) {
    console.error('Get room by invite error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/rooms/:roomId/seats', async (req, res) => {
  try {
    const db = getDb();
    if (!db) throw new Error('Database not configured');
    const { rows } = await db.query(
      `SELECT seat_index, user_id, status, chips_in_play FROM room_seats WHERE room_id=$1 ORDER BY seat_index ASC`,
      [req.params.roomId]
    );
    res.json({ seats: rows });
  } catch (e) {
    console.error('List seats error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/rooms/:roomId/join', async (req, res) => {
  try {
    console.log('🎯 Claim seat request:', {
      roomId: req.params.roomId,
      body: req.body
    });
    
    const { user_id, seat_index, buy_in_amount } = req.body || {};
    if (!user_id || seat_index === undefined || buy_in_amount === undefined) {
      console.error('❌ Missing fields:', { user_id, seat_index, buy_in_amount });
      return res.status(400).json({ error: 'Missing required fields: user_id, seat_index, buy_in_amount' });
    }
    
    await claimSeat({ roomId: req.params.roomId, userId: user_id, seatIndex: seat_index, buyInAmount: buy_in_amount });
    console.log('✅ Seat claimed successfully');
    res.status(201).json({ ok: true, seatIndex: seat_index });
  } catch (e) {
    console.error('❌ Join room error:', e.message);
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/rooms/:roomId/leave', async (req, res) => {
  try {
    const { user_id } = req.body || {};
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    await releaseSeat({ roomId: req.params.roomId, userId: user_id });
    res.json({ ok: true });
  } catch (e) {
    console.error('Leave room error:', e);
    res.status(500).json({ error: e.message });
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

// Start hand with sophisticated GameStateMachine (BRIDGED with room_seats)
app.post('/api/games/:id/start-hand', async (req, res) => {
  try {
    const gameId = req.params.id;
    const { roomId } = req.body; // UI should pass the roomId
    
    let gameState = games.get(gameId);
    
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // ============================================
    // BIG EDIT 3: BRIDGE ROOM SEATS TO GAME
    // ============================================
    
    // If roomId provided, sync players from room_seats table
    if (roomId) {
      const db = getDb();
      if (db) {
        // 🏆 TOURNAMENT MODE: Exclude players with 0 chips (eliminated)
        const seatsRes = await db.query(
          `SELECT rs.seat_index, rs.user_id, rs.chips_in_play, u.username
           FROM room_seats rs
           JOIN users u ON rs.user_id = u.id
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
    const result = stateMachine.processAction(gameState, {
      type: 'START_HAND'
    });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    console.log(`✅ Started sophisticated hand ${result.newState.handState.handNumber}`);
    
    // Store roomId in game state for later WebSocket broadcasts
    result.newState.roomId = roomId;
    
    // Update stored state
    games.set(gameId, result.newState);
    
    // Broadcast hand start via WebSocket
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

// Process player action with sophisticated BettingEngine and TurnManager
app.post('/api/games/:id/actions', async (req, res) => {
  try {
    const gameId = req.params.id;
    const { player_id, action, amount } = req.body;
    
    const gameState = games.get(gameId);
    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }
    
    // 🔍 CAPTURE STATE BEFORE ACTION (for all-in detection)
    const actingPlayer = gameState.getPlayer(player_id);
    const isAllInAction = action === 'ALL_IN';
    const willBeAllIn = isAllInAction || (actingPlayer && actingPlayer.stack === amount);
    
    // Calculate what the bet will be AFTER this action
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
    console.log('  Current bet:', gameState.bettingRound.currentBet);
    console.log('  Projected bet after action:', projectedTotalBet);
    
    // Capture pre-action player states
    const preActionPlayers = Array.from(gameState.players.values()).map(p => ({
      uuid: p.uuid,
      name: p.name,
      betThisStreet: p.betThisStreet,
      stack: p.stack,
      isAllIn: p.isAllIn,
      hasFolded: p.hasFolded
    }));
    
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
    
    // 🔍 DIAGNOSTIC: Post-action state
    console.log('🔍 POST-ACTION STATE:');
    console.log('  Current bet:', result.newState.bettingRound.currentBet);
    console.log('  Players:');
    for (const player of result.newState.players.values()) {
      console.log(`    ${player.name}:`, {
        betThisStreet: player.betThisStreet,
        stack: player.stack,
        isAllIn: player.isAllIn,
        hasFolded: player.hasFolded
      });
    }
    console.log('  isBettingComplete (raw from engine):', result.newState.isBettingRoundComplete());
    
    // Preserve roomId from old state (it's not part of GameStateModel, so we need to manually preserve it)
    const oldState = games.get(gameId);
    const roomId = oldState ? oldState.roomId : null;
    
    // Store roomId in new state
    if (roomId) {
      result.newState.roomId = roomId;
    }
    
    // Update stored state
    games.set(gameId, result.newState);
    
    console.log(`🔍 Broadcasting update - roomId: ${roomId}, io exists: ${!!io}`);
    
    if (io && roomId) {
      const updatePayload = {
        gameId,
        action,
        playerId: player_id,
        street: result.newState.currentStreet,
        pot: result.newState.pot.totalPot,
        toAct: result.newState.toAct
      };
      
      console.log(`📡 Broadcasting to room:${roomId}:`, updatePayload);
      io.to(`room:${roomId}`).emit('game_state_update', updatePayload);
      
      // Log how many sockets are in the room
      const roomSockets = io.sockets.adapter.rooms.get(`room:${roomId}`);
      console.log(`   Sockets in room:${roomId}: ${roomSockets ? roomSockets.size : 0}`);
    } else {
      console.log(`❌ Cannot broadcast - io: ${!!io}, roomId: ${roomId}`);
    }
    
    // Check if betting round is complete using sophisticated logic
    let isBettingComplete = result.newState.isBettingRoundComplete();
    const isHandComplete = result.newState.isHandComplete();
    
    // EDGE CASE FIX: If someone just went all-in and raised, other players must respond
    // We use PROJECTED bet because engine may have already reset betThisStreet
    const postActivePlayers = Array.from(result.newState.players.values()).filter(p => !p.hasFolded);
    const postAllInPlayers = postActivePlayers.filter(p => p.isAllIn);
    const postNonAllInPlayers = postActivePlayers.filter(p => !p.isAllIn);
    
    if (willBeAllIn && postAllInPlayers.length > 0 && postNonAllInPlayers.length >= 1) {
      console.log('🔍 ALL-IN EDGE CASE DETECTED:');
      console.log('  Action was all-in:', willBeAllIn);
      console.log('  All-in players:', postAllInPlayers.map(p => p.name));
      console.log('  Non-all-in players:', postNonAllInPlayers.map(p => p.name));
      console.log('  Projected bet after all-in:', projectedTotalBet);
      
      // Check if any non-all-in player needs to act
      let someoneNeedsToAct = false;
      for (const player of postNonAllInPlayers) {
        const preActionPlayer = preActionPlayers.find(p => p.uuid === player.uuid);
        const playerBet = preActionPlayer ? preActionPlayer.betThisStreet : 0;
        console.log(`  ${player.name}: bet ${playerBet} vs required ${projectedTotalBet}`);
        
        if (playerBet < projectedTotalBet) {
          console.log(`    ↳ ${player.name} must act (${playerBet} < ${projectedTotalBet})`);
          someoneNeedsToAct = true;
        }
      }
      
      if (someoneNeedsToAct) {
        console.log(`🔧 OVERRIDING: Players must respond to all-in bet`);
        console.log(`   isBettingComplete changed from ${isBettingComplete} to FALSE`);
        isBettingComplete = false;
      } else {
        console.log(`✅ All players have matched bet - round can complete`);
      }
    }
    
    // Handle hand completion (showdown) - extract winners from action events
    if (isHandComplete) {
      console.log('🏆 Hand is complete! Action already processed winners.');
      
      // The GameStateMachine already handled END_HAND during the action
      // Extract winner info from the action's events
      const handCompletedEvent = result.events.find(e => e.type === 'HAND_COMPLETED');
      const winners = handCompletedEvent ? handCompletedEvent.data.winners : [];
      
      console.log('🏆 Winners from action events:', winners);
      
      // 🃏 CHECK FOR ALL-IN RUNOUT: Progressive card reveal animation
      const streetEvents = result.events.filter(e => e.type === 'STREET_ADVANCED');
      if (streetEvents.length > 1 && io && roomId) {
        // Multiple streets were dealt at once (all-in scenario)
        console.log(`🎬 All-in runout detected: ${streetEvents.length} streets to reveal`);
        console.log(`⏸️  SUSPENDING winner announcement until cards are revealed to players...`);
        
        // Broadcast each street with 1-second delays
        streetEvents.forEach((streetEvent, index) => {
          setTimeout(() => {
            console.log(`  🃏 Revealing ${streetEvent.data.street}: ${streetEvent.data.communityCards.join(', ')}`);
            io.to(`room:${roomId}`).emit('street_reveal', {
              gameId,
              street: streetEvent.data.street,
              communityCards: streetEvent.data.communityCards,
              pot: result.newState.pot.totalPot,
              message: `Dealing ${streetEvent.data.street}...`
            });
          }, (index + 1) * 1000);
        });
        
        // NOW broadcast hand_complete AFTER all streets revealed to players
        const finalDelay = (streetEvents.length + 1) * 1000;
        console.log(`⏰ Winner will be announced in ${finalDelay}ms (after all cards shown to players)`);
        
        setTimeout(async () => {
          console.log(`🎉 ALL CARDS REVEALED - Now announcing winner!`);
          const userIdMap = playerUserIds.get(gameId);
          io.to(`room:${roomId}`).emit('hand_complete', {
            gameId,
            winners: winners.map(w => ({
              playerId: w.playerId,
              amount: w.amount,
              handRank: w.handRank
            })),
            players: Array.from(result.newState.players.values()).map(p => ({
              id: p.uuid,
              name: p.name,
              stack: p.stack,
              userId: userIdMap ? userIdMap.get(p.uuid) : null
            }))
          });
          console.log(`📡 Broadcasted hand completion to room:${roomId} (after animation)`);
          
          // 💾 UPDATE DATABASE: Persist player stacks after hand completion
          if (userIdMap) {
            const db = getDb(); // Get db instance inside setTimeout callback
            console.log('💾 Updating player stacks in database after hand completion...');
            for (const player of result.newState.players.values()) {
              const userId = userIdMap.get(player.uuid);
              if (userId) {
                try {
                  await db.query(
                    `UPDATE room_seats 
                     SET chips_in_play = $1 
                     WHERE room_id = $2 AND user_id = $3`,
                    [player.stack, roomId, userId]
                  );
                  console.log(`  ✅ Updated ${player.name}: stack=${player.stack}`);
                } catch (dbErr) {
                  console.error(`  ❌ Failed to update ${player.name} stack:`, dbErr.message);
                }
              }
            }
            
            // 📝 LOG HAND HISTORY for audit trail
            try {
              const finalStacks = {};
              Array.from(result.newState.players.values()).forEach(p => {
                finalStacks[p.uuid] = p.stack;
              });
              
              await db.query(
                `INSERT INTO hand_history 
                 (game_id, room_id, hand_number, pot_size, community_cards, winners, player_actions, final_stacks)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                  gameId,
                  roomId,
                  result.newState.handState.handNumber,
                  result.newState.pot.totalPot,
                  result.newState.handState.communityCards.map(c => c.toString()),
                  JSON.stringify(winners),
                  JSON.stringify(result.events.filter(e => e.type === 'PLAYER_ACTION')),
                  JSON.stringify(finalStacks)
                ]
              );
              console.log('📝 Hand history saved to database');
            } catch (historyErr) {
              console.error('❌ Failed to save hand history:', historyErr.message);
            }
          }
        }, finalDelay);
      } else {
        // Normal showdown (no all-in runout) - immediate broadcast
        if (io && roomId) {
          const userIdMap = playerUserIds.get(gameId);
          io.to(`room:${roomId}`).emit('hand_complete', {
            gameId,
            winners: winners.map(w => ({
              playerId: w.playerId,
              amount: w.amount,
              handRank: w.handRank
            })),
            players: Array.from(result.newState.players.values()).map(p => ({
              id: p.uuid,
              name: p.name,
              stack: p.stack,
              userId: userIdMap ? userIdMap.get(p.uuid) : null
            }))
          });
          console.log(`📡 Broadcasted hand completion to room:${roomId}`);
          
          // 💾 UPDATE DATABASE: Persist player stacks after hand completion
          if (userIdMap) {
            const db = getDb(); // Get db instance
            console.log('💾 Updating player stacks in database after hand completion...');
            for (const player of result.newState.players.values()) {
              const userId = userIdMap.get(player.uuid);
              if (userId) {
                try {
                  await db.query(
                    `UPDATE room_seats 
                     SET chips_in_play = $1 
                     WHERE room_id = $2 AND user_id = $3`,
                    [player.stack, roomId, userId]
                  );
                  console.log(`  ✅ Updated ${player.name}: stack=${player.stack}`);
                } catch (dbErr) {
                  console.error(`  ❌ Failed to update ${player.name} stack:`, dbErr.message);
                }
              }
            }
            
            // 📝 LOG HAND HISTORY for audit trail
            try {
              const finalStacks = {};
              Array.from(result.newState.players.values()).forEach(p => {
                finalStacks[p.uuid] = p.stack;
              });
              
              await db.query(
                `INSERT INTO hand_history 
                 (game_id, room_id, hand_number, pot_size, community_cards, winners, player_actions, final_stacks)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                  gameId,
                  roomId,
                  result.newState.handState.handNumber,
                  result.newState.pot.totalPot,
                  result.newState.handState.communityCards.map(c => c.toString()),
                  JSON.stringify(winners),
                  JSON.stringify(result.events.filter(e => e.type === 'PLAYER_ACTION')),
                  JSON.stringify(finalStacks)
                ]
              );
              console.log('📝 Hand history saved to database');
            } catch (historyErr) {
              console.error('❌ Failed to save hand history:', historyErr.message);
            }
          }
        }
      }
      
      res.json({
        gameId,
        action,
        amount: amount || 0,
        street: result.newState.currentStreet,
        pot: result.newState.pot.totalPot,
        isHandComplete: true,
        winners,
        players: Array.from(result.newState.players.values()).map(p => ({
          id: p.uuid,
          name: p.name,
          stack: p.stack
        })),
        engine: 'SOPHISTICATED_TYPESCRIPT',
        events: result.events
      });
      return;
    }
    
    // Handle street advancement if betting complete but hand not done
    if (isBettingComplete && !isHandComplete) {
      console.log('✅ Sophisticated betting round complete - advancing street');
      
      // Advance street using sophisticated GameStateMachine
      const streetResult = stateMachine.processAction(result.newState, {
        type: 'ADVANCE_STREET'
      });
      
      if (streetResult.success) {
        // Preserve roomId in new state after street advancement
        if (roomId) {
          streetResult.newState.roomId = roomId;
        }
        
        games.set(gameId, streetResult.newState);
        
        // Check again if hand is complete after street advancement (e.g., all folded or showdown reached)
        if (streetResult.newState.isHandComplete()) {
          console.log('🏆 Hand completed after street advancement!');
          
          // Extract winners from street advancement events
          const handCompletedEvent = streetResult.events.find(e => e.type === 'HAND_COMPLETED');
          const winners = handCompletedEvent ? handCompletedEvent.data.winners : [];
          
          console.log('🏆 Winners from street advancement:', winners);
          
          if (io && roomId) {
            const userIdMap = playerUserIds.get(gameId);
            io.to(`room:${roomId}`).emit('hand_complete', {
              gameId,
              winners,
              players: Array.from(streetResult.newState.players.values()).map(p => ({
                id: p.uuid,
                name: p.name,
                stack: p.stack,
                userId: userIdMap ? userIdMap.get(p.uuid) : null
              }))
            });
            console.log(`📡 Broadcasted hand completion after street advancement`);
            
            // 💾 UPDATE DATABASE: Persist player stacks after hand completion
            if (userIdMap) {
              console.log('💾 Updating player stacks in database after street advancement hand completion...');
              for (const player of streetResult.newState.players.values()) {
                const userId = userIdMap.get(player.uuid);
                if (userId) {
                  try {
                    await db.query(
                      `UPDATE room_seats 
                       SET chips_in_play = $1 
                       WHERE room_id = $2 AND user_id = $3`,
                      [player.stack, roomId, userId]
                    );
                    console.log(`  ✅ Updated ${player.name}: stack=${player.stack}`);
                  } catch (dbErr) {
                    console.error(`  ❌ Failed to update ${player.name} stack:`, dbErr.message);
                  }
                }
              }
            }
          }
          
          res.json({
            gameId,
            action,
            amount: amount || 0,
            street: streetResult.newState.currentStreet,
            pot: streetResult.newState.pot.totalPot,
            isHandComplete: true,
            winners,
            players: Array.from(streetResult.newState.players.values()).map(p => ({
              id: p.uuid,
              name: p.name,
              stack: p.stack
            })),
            engine: 'SOPHISTICATED_TYPESCRIPT',
            events: streetResult.events
          });
          return;
        }
        
        // Just street advancement, not complete yet
        if (io && roomId) {
          io.to(`room:${roomId}`).emit('game_state_update', {
            gameId,
            street: streetResult.newState.currentStreet,
            pot: streetResult.newState.pot.totalPot,
            toAct: streetResult.newState.toAct,
            message: `Street advanced to ${streetResult.newState.currentStreet}`
          });
          console.log(`📡 Broadcasted street advancement to ${streetResult.newState.currentStreet}`);
        }
        
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

// Get games by roomId (for guests to find the game)
app.get('/api/games', async (req, res) => {
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

// Get game state using sophisticated GameStateModel
app.get('/api/games/:id', (req, res) => {
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
        userId: userIdMap ? userIdMap.get(p.uuid) : null,  // Get userId from mapping
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
    // CHECK means "no bet to call", CALL means "there's a bet to call"
    // The engine incorrectly allows both when player has matched the bet
    if (legalActions.includes('CALL') && legalActions.includes('CHECK')) {
      console.log('🔧 Filtering out CHECK (CALL is required)');
      legalActions = legalActions.filter(a => a !== 'CHECK');
    }
    
    // EDGE CASE FIX: If player can't afford to CALL but CALL is in the list, remove it and ensure ALL_IN is present
    if (player) {
      const currentBetNum = gameState.bettingRound.currentBet;
      const playerBetNum = player.betThisStreet;
      const callAmount = currentBetNum - playerBetNum;
      const playerStack = player.stack;
      
      if (callAmount > playerStack && legalActions.includes('CALL')) {
        console.log('🔧 Player cannot afford CALL, removing and ensuring ALL_IN');
        legalActions = legalActions.filter(a => a !== 'CALL');
        if (!legalActions.includes('ALL_IN')) {
          legalActions.push('ALL_IN');
        }
      }
    }
    
    console.log('  ✅ Final legal actions returned:', legalActions);
    
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

const PORT = process.env.PORT || 3000;
const httpServer = app.listen(PORT, () => {
  console.log(`🚀 SOPHISTICATED POKER ENGINE running on port ${PORT}`);
  console.log(`🎯 Using: GameStateMachine, BettingEngine, RoundManager, TurnManager`);
  console.log(`🎰 Test at: http://localhost:${PORT}/poker`);
  console.log(`✅ REAL poker rules with sophisticated betting round completion!`);
});

// Socket.IO setup
const io = new Server(httpServer, {
  cors: { origin: '*', credentials: false },
});

io.on('connection', (socket) => {
  socket.on('join_room', (roomId) => {
    if (!roomId) return;
    console.log(`🔌 Socket ${socket.id} joining room:${roomId}`);
    socket.join(`room:${roomId}`);
    socket.emit('joined_room', { roomId });
    console.log(`✅ Socket ${socket.id} joined room:${roomId}`);
  });
});

async function broadcastSeats(roomId) {
  try {
    const db = getDb();
    if (!db) return;
    const { rows } = await db.query(
      `SELECT seat_index, user_id, status, chips_in_play FROM room_seats WHERE room_id=$1 ORDER BY seat_index ASC`,
      [roomId]
    );
    io.to(`room:${roomId}`).emit('seat_update', { roomId, seats: rows });
  } catch (e) {
    console.warn('Seat broadcast failed:', e.message);
  }
}
