// ✅ Load environment variables FIRST
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
const { Server } = require('socket.io');
// ✅ AUTH: Supabase integration
const { createClient } = require('@supabase/supabase-js');

// Import our SOPHISTICATED compiled engine components
const { GameStateModel } = require('./dist/core/models/game-state');
const { PlayerModel } = require('./dist/core/models/player');
const { GameStateMachine } = require('./dist/core/engine/game-state-machine');
const { BettingEngine } = require('./dist/core/engine/betting-engine');
const { RoundManager } = require('./dist/core/engine/round-manager');
const { TurnManager } = require('./dist/core/engine/turn-manager');
const { ActionType, Street } = require('./dist/types/common.types');
// ✅ NEW: Display State Manager to fix all-in display bug
const { DisplayStateManager } = require('./dist/application/services/DisplayStateManager');
// ✅ DAY 2-4: Event Sourcing + EventBus Integration
const { EventStoreRepository } = require('./dist/services/database/event-store.repo');
const { EventBus } = require('./dist/application/events/EventBus');
const { GameEventHandler } = require('./dist/application/events/handlers/GameEventHandler');
const { WebSocketEventHandler } = require('./dist/application/events/handlers/WebSocketEventHandler');
// ✅ DAY 5: Event Replay + Crash Recovery
const { EventReplayer } = require('./dist/application/services/EventReplayer');
// ✅ DAY 5: CQRS - Application Service (CommandBus + QueryBus)
const { GameApplicationService } = require('./dist/application/services/GameApplicationService');

// ✅ NEW: Social Features Services
const { createUserRoutes } = require('./dist/routes/user.routes');
const { createFriendRoutes } = require('./dist/routes/friends.routes');
const { createGameDisplayRoutes } = require('./dist/routes/game-display.routes');

// ✅ MIGRATION: Database connection module
const { initializeDatabase, getDb: getNewDb } = require('./dist/database/connection');

// ✅ LOGGING: Structured logger (compiled from src/utils/logger.ts - may not exist yet)
let Logger, LogCategory;
try {
  const loggerModule = require('./dist/utils/logger');
  Logger = loggerModule.Logger;
  LogCategory = loggerModule.LogCategory;
} catch (e) {
  // Fallback to console if logger not compiled yet
  Logger = {
    debug: (cat, msg, ctx) => console.log(`[DEBUG] [${cat}] ${msg}`, ctx || ''),
    info: (cat, msg, ctx) => console.log(`[INFO] [${cat}] ${msg}`, ctx || ''),
    success: (cat, msg, ctx) => console.log(`[SUCCESS] [${cat}] ${msg}`, ctx || ''),
    warn: (cat, msg, ctx) => console.warn(`[WARN] [${cat}] ${msg}`, ctx || ''),
    error: (cat, msg, ctx) => console.error(`[ERROR] [${cat}] ${msg}`, ctx || ''),
  };
  LogCategory = {
    STARTUP: 'STARTUP', DATABASE: 'DATABASE', MIGRATION: 'MIGRATION',
    GAME: 'GAME', SOCKET: 'SOCKET', AUTH: 'AUTH', API: 'API',
    RECOVERY: 'RECOVERY', PERSIST: 'PERSIST', EVENT: 'EVENT'
  };
}

const app = express();
app.use(cors());
app.use(express.json());

// ============================================
// WEEK 1 DAY 2: RATE LIMITING
// Protect against abuse, spam, and DDoS attacks
// ============================================

const rateLimit = require('express-rate-limit');

// Global rate limiter: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  message: { 
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    console.warn(`⚠️  Rate limit exceeded: ${req.ip} - ${req.method} ${req.path}`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: '15 minutes'
    });
  }
});

// Strict limiter for resource creation: 5 creations per 15 minutes
const createLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { 
    error: 'Too many resources created, please wait before creating more.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all attempts
  handler: (req, res) => {
    console.warn(`⚠️  Creation rate limit exceeded: ${req.ip} - ${req.method} ${req.path}`);
    res.status(429).json({
      error: 'Too many creations',
      message: 'You have created too many resources. Please wait 15 minutes.',
      retryAfter: '15 minutes'
    });
  }
});

// Action limiter: 1 action per second per player
const actionLimiter = rateLimit({
  windowMs: 1000, // 1 second
  max: 1, // 1 action per second
  keyGenerator: (req) => {
    // Use player_id from body or IP as fallback
    return req.body?.player_id || req.body?.playerId || req.ip;
  },
  message: { 
    error: 'Action too fast, please wait.',
    retryAfter: '1 second'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️  Action rate limit exceeded: ${req.body?.player_id || req.ip}`);
    res.status(429).json({
      error: 'Action too fast',
      message: 'You are performing actions too quickly. Please wait 1 second.',
      retryAfter: '1 second'
    });
  }
});

// Auth limiter: Stricter for login/register (10 per 15 minutes)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { 
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`⚠️  Auth rate limit exceeded: ${req.ip} - ${req.method} ${req.path}`);
    res.status(429).json({
      error: 'Too many authentication attempts',
      message: 'Too many login/register attempts. Please wait 15 minutes.',
      retryAfter: '15 minutes'
    });
  }
});

// Apply global rate limiter to all API routes
app.use('/api/', globalLimiter);

console.log('✅ Rate limiting enabled:');
console.log('   • Global: 100 req/15 min');
console.log('   • Create: 5 req/15 min');
console.log('   • Actions: 1 req/sec per player');
console.log('   • Auth: 10 req/15 min');

// ============================================
// WEEK 1 DAY 3: INPUT VALIDATION
// Validate all request bodies to prevent bad data
// ============================================

const { z } = require('zod');

// Validation schemas for all endpoints
const CreateGameSchema = z.object({
  small_blind: z.number().int().positive().describe('Small blind amount must be positive'),
  big_blind: z.number().int().positive().describe('Big blind amount must be positive'),
  max_players: z.number().int().min(2).max(10).optional().default(9).describe('Max players between 2-10'),
  roomId: z.string().uuid().optional().nullable().describe('Optional room UUID'),
  hostUserId: z.string().min(1).optional().describe('Host user ID')
}).refine(data => data.big_blind > data.small_blind, {
  message: 'Big blind must be greater than small blind'
});

const CreateRoomSchema = z.object({
  name: z.string().min(3).max(50).describe('Room name 3-50 characters'),
  small_blind: z.number().int().positive().describe('Small blind must be positive'),
  big_blind: z.number().int().positive().describe('Big blind must be positive'),
  min_buy_in: z.number().int().positive().describe('Minimum buy-in must be positive'),
  max_buy_in: z.number().int().positive().describe('Maximum buy-in must be positive'),
  max_players: z.number().int().min(2).max(10).optional().default(9),
  is_private: z.boolean().optional().default(false),
  user_id: z.string().uuid().describe('User ID must be valid UUID format')
}).refine(data => data.big_blind > data.small_blind, {
  message: 'Big blind must be greater than small blind'
}).refine(data => data.max_buy_in > data.min_buy_in, {
  message: 'Max buy-in must be greater than min buy-in'
}).refine(data => data.min_buy_in >= data.big_blind * 10, {
  message: 'Min buy-in must be at least 10x big blind'
});

const JoinRoomSchema = z.object({
  user_id: z.string().uuid().describe('User ID must be valid UUID format'),
  seat_index: z.number().int().min(0).max(9).optional().describe('Seat index 0-9'),
  buy_in_amount: z.number().int().positive().optional().describe('Buy-in amount must be positive')
});

const PlayerActionSchema = z.object({
  player_id: z.string().uuid().optional().describe('Player ID in UUID format'),
  playerId: z.string().uuid().optional().describe('Alternative player ID in UUID format'),
  action: z.enum(['FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN']).describe('Must be valid action type'),
  amount: z.number().int().nonnegative().optional().describe('Amount must be non-negative')
}).refine(data => data.player_id || data.playerId, {
  message: 'Either player_id or playerId is required'
}).refine(data => {
  // BET and RAISE require amount
  if ((data.action === 'BET' || data.action === 'RAISE') && !data.amount) {
    return false;
  }
  return true;
}, {
  message: 'BET and RAISE actions require an amount'
});

const JoinGameSchema = z.object({
  userId: z.string().uuid().describe('User ID must be valid UUID format'),
  seatIndex: z.number().int().min(0).max(9).describe('Seat index 0-9'),
  buyIn: z.number().int().positive().describe('Buy-in must be positive')
});

const AuthSchema = z.object({
  email: z.string().email().optional().describe('Must be valid email'),
  password: z.string().min(6).optional().describe('Password must be at least 6 characters')
});

// Validation middleware factory
function validateBody(schema, schemaName = 'Request') {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.validatedBody = validated; // Attach validated data
      next();
    } catch (error) {
      console.warn(`⚠️  Validation failed for ${schemaName}:`, error.errors);
      
      // Format Zod errors into user-friendly response
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        message: `Invalid ${schemaName} data`,
        details: formattedErrors,
        hint: 'Check the API documentation for correct field types and values'
      });
    }
  };
}

// Optional: Validate query parameters
function validateQuery(schema, schemaName = 'Query') {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.validatedQuery = validated;
      next();
    } catch (error) {
      const formattedErrors = error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        message: `Invalid ${schemaName} parameters`,
        details: formattedErrors
      });
    }
  };
}

console.log('✅ Input validation configured:');
console.log('   • CreateGameSchema');
console.log('   • CreateRoomSchema');
console.log('   • PlayerActionSchema');
console.log('   • JoinRoomSchema');
console.log('   • JoinGameSchema');
console.log('   • AuthSchema');

// Serve static files (card images and UI)
app.use('/cards', express.static(path.join(__dirname, 'public/cards')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/css', express.static(path.join(__dirname, 'public/css')));
app.use('/js', express.static(path.join(__dirname, 'public/js')));

// ============================================
// MIGRATION INFRASTRUCTURE - Phase 1: Database Persistence
// Feature flags to toggle between old (Map) and new (Repository) implementations
// ============================================

const MIGRATION_FLAGS = {
  USE_DB_REPOSITORY: process.env.USE_DB_REPOSITORY === 'true',
  USE_INPUT_VALIDATION: process.env.USE_INPUT_VALIDATION === 'true',
  USE_AUTH_MIDDLEWARE: process.env.USE_AUTH_MIDDLEWARE === 'true',
  USE_EVENT_PERSISTENCE: process.env.USE_EVENT_PERSISTENCE === 'true',
  LOG_MIGRATION: process.env.NODE_ENV === 'development'
};

function logMigration(operation, implementation, metadata = {}) {
  if (MIGRATION_FLAGS.LOG_MIGRATION) {
    console.log(`🔄 [MIGRATION] ${operation} → ${implementation}`, metadata);
  }
}

// ============================================
// DUAL STORAGE: Old (Map) + New (Repository)
// ============================================

// OLD: In-memory storage (preserved during migration)
const games = new Map();
let gameCounter = 1;

// Store userId mappings separately (since PlayerModel doesn't have userId property)
const playerUserIds = new Map(); // gameId -> Map(playerId -> userId)
// Store game metadata for full schema tracking
const gameMetadata = new Map(); // gameId -> { gameUuid, currentHandId, currentHandNumber }

// NEW: Database-backed storage (conditional initialization)
let gameStatesRepository = null;
let fullGameRepository = null;

if (MIGRATION_FLAGS.USE_DB_REPOSITORY) {
  try {
    const { GameStatesRepository } = require('./dist/services/database/repos/game-states.repo');
    const { FullGameRepository } = require('./dist/services/database/repos/full-game.repo');
    const db = getNewDb();
    
    if (!db) {
      console.warn('⚠️  Database not available, falling back to in-memory storage');
      MIGRATION_FLAGS.USE_DB_REPOSITORY = false;
    } else {
      gameStatesRepository = new GameStatesRepository(db);
      fullGameRepository = new FullGameRepository(db);
      console.log('✅ GameStatesRepository initialized (database persistence active)');
      console.log('✅ FullGameRepository initialized (full schema persistence active)');
    }
  } catch (error) {
    console.error('❌ Failed to initialize repositories:', error.message);
    console.warn('⚠️  Falling back to in-memory storage');
    MIGRATION_FLAGS.USE_DB_REPOSITORY = false;
  }
}

// ============================================
// STORAGE ADAPTER: Dual write pattern for safe migration
// Writes go to BOTH in-memory AND database (when enabled)
// Reads come from in-memory Map (fast)
// ============================================

const StorageAdapter = {
  /**
   * Save game to both in-memory and database (dual write)
   * This ensures zero downtime during migration
   */
  async saveGame(gameId, gameState) {
    // Always write to in-memory store first (fast, synchronous)
    games.set(gameId, gameState);
    logMigration('saveGame', 'IN_MEMORY', { gameId });
    
    // Then persist to database if feature flag is enabled
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY && gameStatesRepository) {
      try {
        const snapshot = gameState.toSnapshot();
        const isUpdate = await gameStatesRepository.updateGameStateAtomic(gameId, gameState.version - 1, {
          status: snapshot.status,
          current_state: snapshot,
          hand_number: snapshot.handState.handNumber,
          dealer_position: snapshot.handState.dealerPosition,
          total_pot: snapshot.pot.totalPot
        });
        
        if (isUpdate) {
          logMigration('saveGame', 'DB_SUCCESS', { gameId, version: gameState.version });
        } else {
          // Version mismatch - this is a concurrency issue
          console.warn(`⚠️  [MIGRATION] Version conflict for game ${gameId}`);
        }
      } catch (error) {
        // Database persistence failed, but in-memory store still has the data
        // Log and continue - this is non-blocking
        console.error(`❌ [MIGRATION] DB persist failed for game ${gameId}:`, error.message);
      }
    }
  },
  
  /**
   * Create new game in both stores
   * 
   * @param gameId - Unique game identifier
   * @param gameState - GameStateModel instance
   * @param hostUserId - User who created the game
   * @param roomId - Optional room ID to link game to lobby (nullable)
   */
  async createGame(gameId, gameState, hostUserId, roomId = null) {
    // Write to in-memory store
    games.set(gameId, gameState);
    logMigration('createGame', 'IN_MEMORY', { gameId, roomId });
    
    // Persist to database if enabled
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY && gameStatesRepository) {
      try {
        const snapshot = gameState.toSnapshot();
        await gameStatesRepository.create(
          gameId, 
          roomId,  // Link to room if provided
          snapshot, 
          hostUserId || 'anonymous'
        );
        logMigration('createGame', 'DB_SUCCESS', { gameId, roomId });
      } catch (error) {
        console.error(`❌ [MIGRATION] DB create failed for game ${gameId}:`, error.message);
      }
    }
  },
  
  /**
   * Load game from in-memory store (or database if not in memory)
   */
  async getGame(gameId) {
    // Try in-memory first
    const gameState = games.get(gameId);
    if (gameState) {
      logMigration('getGame', 'IN_MEMORY', { gameId });
      return gameState;
    }
    
    // Fallback to database if enabled
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY && gameStatesRepository) {
      try {
        const dbGameState = await gameStatesRepository.findById(gameId);
        if (dbGameState) {
          // Hydrate in-memory cache
          games.set(gameId, dbGameState);
          logMigration('getGame', 'DB_HYDRATE', { gameId });
          return dbGameState;
        }
      } catch (error) {
        console.error(`❌ [MIGRATION] DB load failed for game ${gameId}:`, error.message);
      }
    }
    
    logMigration('getGame', 'NOT_FOUND', { gameId });
    return null;
  },
  
  /**
   * Delete game from both stores
   */
  async deleteGame(gameId) {
    // Remove from in-memory
    const deleted = games.delete(gameId);
    logMigration('deleteGame', 'IN_MEMORY', { gameId, deleted });
    
    // Soft delete in database if enabled
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY && gameStatesRepository) {
      try {
        await gameStatesRepository.delete(gameId);
        logMigration('deleteGame', 'DB_SUCCESS', { gameId });
      } catch (error) {
        console.error(`❌ [MIGRATION] DB delete failed for game ${gameId}:`, error.message);
      }
    }
    
    return deleted;
  }
};

// Engine instances (stateMachine will be created after EventBus is initialized)
let stateMachine = null;
const bettingEngine = new BettingEngine();
const roundManager = new RoundManager();
const turnManager = new TurnManager();
// ✅ NEW: Display state manager for correct UI rendering
const displayStateManager = new DisplayStateManager();

// ✅ AUTH: Supabase client
let supabase = null;

/**
 * Initialize Supabase Auth (basic version, full version at bottom of file)
 */
function initializeSupabaseEarly() {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('⚠️ Supabase credentials not found, auth disabled');
      return;
    }
    
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase auth initialized (early)');
  } catch (error) {
    console.error('❌ Failed to initialize Supabase:', error.message);
  }
}

// Initialize Supabase early
initializeSupabaseEarly();

// Placeholder for GameStateMachine (will be initialized after EventBus in initializeEventSourcing)
// Note: This will be properly initialized in the initializeEventSourcing function at the bottom of the file

// ============================================
// HELPER FUNCTIONS
// ============================================
function generateGameId() {
  return `sophisticated_${Date.now()}_${gameCounter++}`;
}

function generatePlayerId() {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
}

// ---- Database (PostgreSQL via DATABASE_URL) ---------------------------------
let dbPool = null;
let isReconnecting = false;

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
    application_name: 'sophisticated-engine-server',
    max: 20, // Maximum number of clients
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 10000 // Timeout connection attempts after 10 seconds
  });
  
  // ✅ CRITICAL: Handle database errors gracefully (Supabase free tier auto-pause)
  dbPool.on('error', async (err) => {
    console.error('❌ Database pool error:', err.message);
    
    // Check if it's a termination error (Supabase going to sleep)
    if (err.message.includes('termination') || err.message.includes('shutdown')) {
      console.warn('⚠️  Database connection terminated (likely Supabase auto-pause)');
      console.log('🔄 Database will reconnect automatically on next query...');
      
      // Don't crash - just mark pool as invalid and let it reconnect
      if (!isReconnecting) {
        isReconnecting = true;
        try {
          await dbPool.end();
        } catch (endError) {
          // Ignore errors when ending pool
        }
        dbPool = null; // Force recreation on next getDb() call
        isReconnecting = false;
        console.log('✅ Database pool reset, ready to reconnect');
      }
    }
  });
  
  dbPool.on('connect', () => {
    console.log('✅ Database client connected to pool');
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
    // Ensure user profile exists (auto-provision guest if missing)
    await client.query(
      `INSERT INTO user_profiles (id, username, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (id) DO NOTHING`,
      [userId, `Guest_${userId.substring(0, 6)}`, `Guest_${userId.substring(0, 6)}`]
    );
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
// ===== PAGE ROUTES =====
// Root route - serve new index page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/index.html'));
});

// Play lobby page
app.get('/play', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/play.html'));
});

// Friends page
app.get('/friends', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/friends.html'));
});

// AI Solver page
app.get('/ai-solver', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/ai-solver.html'));
});

// Analysis page
app.get('/analysis', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/analysis.html'));
});

// Learning page
app.get('/learning', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/learning.html'));
});

// Poker Today page
app.get('/poker-today', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/pages/poker-today.html'));
});

// Game table route (existing poker.html - full game interface)
app.get('/game', (req, res) => {
  // Always serve poker.html - it will handle ?room= parameter and auto-join
  res.sendFile(path.join(__dirname, 'public/poker.html'));
});

// Legacy route - redirect to game
app.get('/poker', (req, res) => {
  res.redirect('/game');
});

// Redirect old poker-test.html requests to /game
app.get('/poker-test.html', (req, res) => {
  res.redirect('/game');
});

app.get('/public/poker-test.html', (req, res) => {
  res.redirect('/game');
});

// ✅ Register social features routes
const socialDbPool = getDb();
if (socialDbPool) {
  app.use('/api/user', createUserRoutes(socialDbPool));
  app.use('/api/friends', createFriendRoutes(socialDbPool));
  app.use('/api/game', createGameDisplayRoutes(socialDbPool));
}

// Create game with sophisticated engine
// ⚡ RATE LIMITED: Max 5 games per 15 minutes
// ✅ VALIDATED: CreateGameSchema
// 🔒 AUTH REQUIRED: User must be authenticated to create games
app.post('/api/games', authenticateToken, createLimiter, validateBody(CreateGameSchema, 'CreateGame'), async (req, res) => {
  try {
    const { small_blind, big_blind, max_players, roomId, hostUserId } = req.validatedBody;
    
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
    await StorageAdapter.createGame(gameId, gameState, hostUser, roomId);
    
    // ✅ FULL SCHEMA PERSISTENCE: Create records in games & game_states tables
    let gameUuid = null;
    if (fullGameRepository) {
      try {
        const result = await fullGameRepository.createGame({
          gameId,
          roomId,
          hostUserId: hostUser,
          smallBlind: small_blind,
          bigBlind: big_blind,
          ante: 0,
          maxPlayers: max_players,
          gameType: 'NLHE',
          initialState: gameState.toSnapshot()
        });
        
        gameUuid = result.gameUuid;
        gameMetadata.set(gameId, { 
          gameUuid, 
          currentHandId: null, 
          currentHandNumber: 0,
          actionSequence: 0 
        });
        
        Logger.success(LogCategory.PERSIST, 'Game persisted to full schema', { 
          gameId, 
          gameUuid, 
          roomId 
        });
      } catch (error) {
        Logger.error(LogCategory.PERSIST, 'Failed to persist game to full schema', { 
          gameId, 
          error: error.message 
        });
      }
    }
    
    // Store game_id in room table for room lookup
    if (roomId) {
      const db = getDb();
      if (db) {
        try {
          await db.query(
            'UPDATE rooms SET game_id = $1, current_game_id = $2 WHERE id = $3',
            [gameId, gameUuid, roomId]
          );
          Logger.debug(LogCategory.GAME, 'Linked game to room', { gameId, gameUuid, roomId });
        } catch (dbError) {
          Logger.error(LogCategory.GAME, 'Error linking game to room', { 
            gameId, 
            roomId, 
            error: dbError.message 
          });
        }
      }
    }
    
    Logger.success(LogCategory.GAME, 'Game created successfully', { 
      gameId, 
      gameUuid, 
      roomId 
    });
    
    res.json({
      gameId,
      status: gameState.status,
      playerCount: gameState.players.size,
      engine: 'SOPHISTICATED_TYPESCRIPT'
    });
    
  } catch (error) {
    Logger.error(LogCategory.GAME, 'Create game error', { error: error.message });
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
  console.log(`🔒 AUTH CHECK: ${req.method} ${req.path} - Header:`, req.headers['authorization'] ? 'present' : 'MISSING');
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
  
  if (!token) {
    console.log(`❌ AUTH REJECTED: No token provided for ${req.path}`);
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.log(`❌ AUTH REJECTED: Invalid token for ${req.path}:`, err.message);
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    console.log(`✅ AUTH PASSED: ${req.path}`);
    req.user = user; // Attach user info to request
    next();
  });
}

// ⚡ RATE LIMITED: Max 10 auth attempts per 15 minutes
// ✅ VALIDATED: AuthSchema
app.post('/api/auth/register', authLimiter, validateBody(AuthSchema, 'Auth'), async (req, res) => {
  // ⚠️ DEPRECATED: This endpoint is no longer used
  // Registration is now handled by Supabase Google OAuth
  return res.status(410).json({ 
    error: 'This registration method is deprecated. Please use Google Sign-In.',
    message: 'User registration is now handled via Supabase OAuth. Use the Google Sign-In button on the frontend.'
  });
  
  /* OLD CODE - REMOVED
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
  */
});

// ⚡ RATE LIMITED: Max 10 auth attempts per 15 minutes
// ✅ VALIDATED: AuthSchema  
app.post('/api/auth/login', authLimiter, validateBody(AuthSchema, 'Auth'), async (req, res) => {
  // ⚠️ DEPRECATED: This endpoint is no longer used
  // Authentication is now handled by Supabase Google OAuth
  // See: poker.html -> signInWithGoogle()
  return res.status(410).json({ 
    error: 'This login method is deprecated. Please use Google Sign-In.',
    message: 'Authentication is now handled via Supabase OAuth. Use the Google Sign-In button on the frontend.'
  });
  
  /* OLD CODE - REMOVED (kept for reference)
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Find user - THIS TABLE NO LONGER EXISTS
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
  */
});

// ============================================
// AUTH SYNC ENDPOINT
// ============================================

// Sync Supabase user to backend database
// 🔒 AUTH REQUIRED: User must be authenticated to sync profile
app.post('/api/auth/sync-user', authenticateToken, async (req, res) => {
  try {
    const { id, email, username, provider, isGuest } = req.body;
    
    if (!id || !username) {
      return res.status(400).json({ error: 'Missing required fields: id, username' });
    }
    
    // Skip syncing guest users
    if (isGuest) {
      console.log('ℹ️ Skipping sync for guest user:', username);
      return res.json({ message: 'Guest user, no sync needed' });
    }
    
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    // Check if user profile already exists
    const existingProfile = await db.query(
      'SELECT id, username FROM user_profiles WHERE id = $1',
      [id]
    );
    
    if (existingProfile.rowCount > 0) {
      console.log('✅ User profile already exists:', username);
      return res.json({ 
        message: 'User already synced',
        user: existingProfile.rows[0]
      });
    }
    
    // Create new user profile
    const result = await db.query(
      `INSERT INTO user_profiles (id, username, email, provider, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE
       SET username = EXCLUDED.username,
           email = EXCLUDED.email,
           provider = EXCLUDED.provider
       RETURNING id, username, email`,
      [id, username, email || null, provider || 'google']
    );
    
    console.log('✅ User synced to backend:', result.rows[0]);
    
    res.json({
      message: 'User synced successfully',
      user: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ User sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// LOBBY SYSTEM ENDPOINTS
// ============================================

// Join room lobby (request to join)
// ✅ VALIDATED: JoinRoomSchema
// 🔒 AUTH REQUIRED: User must be authenticated to join lobby
app.post('/api/rooms/:roomId/lobby/join', authenticateToken, validateBody(JoinRoomSchema, 'JoinRoom'), async (req, res) => {
  try {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'Missing user_id' });
    
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Check if room exists
    const roomCheck = await db.query('SELECT id, host_user_id FROM rooms WHERE id = $1', [req.params.roomId]);
    if (roomCheck.rowCount === 0) return res.status(404).json({ error: 'Room not found' });
    
    const isHost = roomCheck.rows[0].host_user_id === user_id;
    
    // Check if user profile already exists
    const profileCheck = await db.query('SELECT id, username FROM user_profiles WHERE id = $1', [user_id]);
    
    if (profileCheck.rowCount === 0) {
      // No profile exists - need to create one
      // Try to get username from request body (sent by frontend)
      const username = req.body.username || `Guest_${user_id.substring(0, 6)}`;
      
      console.log(`📝 Creating user profile for ${user_id} with username: ${username}`);
      
      await db.query(
        `INSERT INTO user_profiles (id, username, display_name)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [user_id, username, username]
      );
    } else {
      console.log(`✅ User profile exists: ${profileCheck.rows[0].username}`);
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
    
    // Get username for broadcast (from request body or generate from user_id)
    const playerUsername = req.body.username || `Guest_${user_id.substring(0, 6)}`;
    
    // Broadcast to room that a player joined
    io.to(`room:${req.params.roomId}`).emit('player_joined', {
      userId: user_id,
      username: playerUsername,
      status: status
    });
    
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
              u.username, u.display_name
       FROM room_players rp
       LEFT JOIN user_profiles u ON rp.user_id = u.id
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
// 🔒 AUTH REQUIRED: Only room owner can approve joins
app.post('/api/rooms/:roomId/lobby/approve', authenticateToken, async (req, res) => {
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
    
    // Broadcast approval to room
    io.to(`room:${req.params.roomId}`).emit('player_approved', {
      userId: target_user_id
    });
    
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
// 🔒 AUTH REQUIRED: Only room owner can reject joins
app.post('/api/rooms/:roomId/lobby/reject', authenticateToken, async (req, res) => {
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
// Get all active rooms (for lobby)
app.get('/api/rooms', async (req, res) => {
  try {
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const result = await db.query(`
      SELECT 
        r.id,
        r.name,
        r.small_blind,
        r.big_blind,
        r.max_players,
        r.is_private,
        r.status,
        r.created_at,
        COUNT(DISTINCT rs.user_id) as player_count
      FROM rooms r
      LEFT JOIN room_seats rs ON r.id = rs.room_id AND rs.status = 'occupied'
      WHERE r.status IN ('waiting', 'active')
      GROUP BY r.id, r.name, r.small_blind, r.big_blind, r.max_players, r.is_private, r.status, r.created_at
      ORDER BY r.created_at DESC
      LIMIT 50
    `);

    res.json({ rooms: result.rows });
  } catch (error) {
    console.error('❌ Get rooms error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific room by ID or invite code
app.get('/api/rooms/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;
    const db = getDb();
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    // Check if roomId is a UUID or an invite code
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roomId);
    
    let result;
    if (isUUID) {
      // Query by UUID
      result = await db.query(`
        SELECT 
          r.*,
          COUNT(DISTINCT rs.user_id) as player_count
        FROM rooms r
        LEFT JOIN room_seats rs ON r.id = rs.room_id AND rs.status = 'occupied'
        WHERE r.id = $1
        GROUP BY r.id
      `, [roomId]);
    } else {
      // Query by invite code
      result = await db.query(`
        SELECT 
          r.*,
          COUNT(DISTINCT rs.user_id) as player_count
        FROM rooms r
        LEFT JOIN room_seats rs ON r.id = rs.room_id AND rs.status = 'occupied'
        WHERE r.invite_code = $1
        GROUP BY r.id
      `, [roomId]);
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room: result.rows[0] });
  } catch (error) {
    console.error('❌ Get room error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ⚡ RATE LIMITED: Max 5 rooms per 15 minutes
// ✅ VALIDATED: CreateRoomSchema
// 🔒 AUTH REQUIRED: User must be authenticated to create rooms
app.post('/api/rooms', authenticateToken, createLimiter, validateBody(CreateRoomSchema, 'CreateRoom'), async (req, res) => {
  try {
    const { name, small_blind, big_blind, min_buy_in, max_buy_in, max_players, is_private, user_id } = req.validatedBody;
    if (!name || !small_blind || !big_blind || !min_buy_in || !max_buy_in) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (!user_id) {
      return res.status(400).json({ error: 'user_id required - please sign in first' });
    }
    
    const room = await createRoom({ name, small_blind, big_blind, min_buy_in, max_buy_in, max_players, is_private, host_user_id: user_id });
    
    // Auto-join host to lobby
    const db = getDb();
    if (db) {
      await db.query(
        `INSERT INTO room_players (room_id, user_id, status, approved_at)
         VALUES ($1, $2, 'approved', NOW())`,
        [room.id, user_id]
      );
      console.log(`👑 Host ${user_id} auto-joined room ${room.id}`);
    }
    
    res.status(201).json({ 
      roomId: room.id, 
      inviteCode: room.invite_code, 
      maxPlayers: room.max_players, 
      hostUserId: room.host_user_id 
    });
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

// ✅ VALIDATED: JoinRoomSchema
// 🔒 AUTH REQUIRED: User must be authenticated to join rooms
app.post('/api/rooms/:roomId/join', authenticateToken, validateBody(JoinRoomSchema, 'JoinRoom'), async (req, res) => {
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

// 🔒 AUTH REQUIRED: User must be authenticated to leave rooms
app.post('/api/rooms/:roomId/leave', authenticateToken, async (req, res) => {
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
// ✅ VALIDATED: JoinGameSchema
// 🔒 AUTH REQUIRED: User must be authenticated to join games
app.post('/api/games/:id/join', authenticateToken, validateBody(JoinGameSchema, 'JoinGame'), (req, res) => {
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
// 🔒 AUTH REQUIRED: Only authenticated users can start hands
app.post('/api/games/:id/start-hand', authenticateToken, async (req, res) => {
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
    
    const handNumber = result.newState.handState.handNumber;
    Logger.success(LogCategory.GAME, 'Hand started', { gameId, handNumber });
    
    // Store roomId in game state for later WebSocket broadcasts
    result.newState.roomId = roomId;
    
    // Update stored state
    games.set(gameId, result.newState);
    
    // ✅ FULL SCHEMA PERSISTENCE: Record hand in `hands` table
    const metadata = gameMetadata.get(gameId);
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

// ============================================
// ✅ FIX 2: GAME RECOVERY ENDPOINT
// ============================================
app.get('/api/rooms/:roomId/game-state', async (req, res) => {
  const { roomId } = req.params;
  const startTime = Date.now();
  
  Logger.info(LogCategory.RECOVERY, 'Game recovery requested', { roomId, userId: req.query.userId });
  
  try {
    if (!gameStatesRepository) {
      Logger.warn(LogCategory.RECOVERY, 'Database persistence not enabled');
      return res.json({ game: null });
    }
    
    const db = getDb();
    const result = await db.query(
      `SELECT id, status, hand_number, total_pot 
       FROM game_states 
       WHERE room_id = $1 
       AND status NOT IN ('completed', 'deleted')
       ORDER BY created_at DESC 
       LIMIT 1`,
      [roomId]
    );
    
    if (result.rows.length === 0) {
      Logger.info(LogCategory.RECOVERY, 'No active game found', { roomId, duration: Date.now() - startTime });
      return res.json({ game: null });
    }
    
    const gameId = result.rows[0].id;
    Logger.debug(LogCategory.RECOVERY, 'Found game in database', { gameId, roomId });
    
    const gameState = await gameStatesRepository.findById(gameId);
    
    if (!gameState) {
      Logger.error(LogCategory.RECOVERY, 'Game exists in DB but failed to load', { gameId });
      return res.json({ game: null });
    }
    
    games.set(gameId, gameState);
    Logger.success(LogCategory.RECOVERY, 'Game recovered successfully', { 
      gameId, 
      roomId, 
      handNumber: gameState.handState?.handNumber || 0,
      playerCount: gameState.players.size,
      duration: Date.now() - startTime 
    });
    
    res.json({
      game: {
        id: gameState.id,
        status: gameState.status,
        handNumber: gameState.handState?.handNumber || 0,
        pot: gameState.pot?.totalPot || 0,
        players: Array.from(gameState.players.values()).map(p => ({
          id: p.uuid,
          name: p.name,
          stack: p.stack,
          seatIndex: p.seatIndex
        }))
      }
    });
  } catch (error) {
    Logger.error(LogCategory.RECOVERY, 'Game recovery failed', { 
      roomId, 
      error: error.message
    });
    res.status(500).json({ error: 'Recovery failed', details: error.message });
  }
});

// Process player action with sophisticated BettingEngine and TurnManager
// ⚡ RATE LIMITED: Max 1 action per second per player
// ✅ VALIDATED: PlayerActionSchema
// 🔒 AUTH REQUIRED: Only authenticated players can take actions
app.post('/api/games/:id/actions', authenticateToken, actionLimiter, validateBody(PlayerActionSchema, 'PlayerAction'), async (req, res) => {
  try {
    const gameId = req.params.id;
    const { player_id, action, amount } = req.validatedBody;
    
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
    
    // Capture pre-action player states (for all-in edge case detection)
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
    
    Logger.success(LogCategory.GAME, 'Action processed', { gameId, player_id, action, amount });
    
    // ✅ FULL SCHEMA PERSISTENCE: Record action in `actions` table
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
    
    // 🔍 DIAGNOSTIC: Post-action state
    Logger.debug(LogCategory.GAME, 'Post-action state', {
      currentBet: result.newState.bettingRound.currentBet,
      isBettingComplete: result.newState.isBettingRoundComplete()
    });
    
    // Preserve roomId from old state (it's not part of GameStateModel, so we need to manually preserve it)
    const oldState = games.get(gameId);
    const roomId = oldState ? oldState.roomId : null;
    
    // Store roomId in new state
    if (roomId) {
      result.newState.roomId = roomId;
    }
    
    // Update stored state
    games.set(gameId, result.newState);
    
    Logger.debug(LogCategory.GAME, 'Broadcasting update', { roomId, ioExists: !!io });
    
    // Check if this will be an all-in runout (cards dealt progressively)
    const isHandComplete = result.newState.isHandComplete();
    const willBeAllInRunout = isHandComplete && result.events.filter(e => e.type === 'STREET_ADVANCED').length > 1;
    
    // Capture pot amount from HAND_COMPLETED event (before engine resets it)
    let potAmount = result.newState.pot.totalPot;
    const handCompletedEvent = result.events.find(e => e.type === 'HAND_COMPLETED');
    
    if (willBeAllInRunout) {
      if (handCompletedEvent && handCompletedEvent.data && handCompletedEvent.data.pot) {
        potAmount = handCompletedEvent.data.pot;
        Logger.debug(LogCategory.GAME, 'Captured pot from HAND_COMPLETED event', { potAmount });
      } else {
        // Fallback: calculate from winners
        const winners = (handCompletedEvent && handCompletedEvent.data) ? handCompletedEvent.data.winners : [];
        if (winners && winners.length > 0) {
          potAmount = winners.reduce((sum, w) => sum + (w.amount || 0), 0);
          Logger.debug(LogCategory.GAME, 'Calculated pot from winners', { potAmount });
        }
      }
    }
    
    // ✅ FULL SCHEMA PERSISTENCE: Complete hand and update statistics
    if (isHandComplete && fullGameRepository && metadata && metadata.gameUuid && metadata.currentHandId) {
      try {
        const userIdMap = playerUserIds.get(gameId);
        const winners = handCompletedEvent?.data?.winners || [];
        const communityCards = result.newState.handState.communityCards.map(c => ({
          rank: c.rank,
          suit: c.suit
        }));
        
        // Build player results
        const playerResults = [];
        const finalStacks = {};
        
        for (const player of result.newState.players.values()) {
          const userId = userIdMap ? userIdMap.get(player.uuid) : null;
          if (!userId) continue;
          
          const winner = winners.find(w => w.playerId === player.uuid);
          const potWinnings = winner ? winner.amount : 0;
          const netResult = potWinnings - (player.betThisHand || 0);
          
          finalStacks[userId] = player.stack;
          
          playerResults.push({
            userId,
            seatIndex: player.seatIndex,
            holeCards: player.holeCards ? player.holeCards.map(c => ({ rank: c.rank, suit: c.suit })) : [],
            finalHandRank: winner?.handRank || 0,
            finalHandDescription: winner?.handDescription || 'Folded',
            potContribution: player.betThisHand || 0,
            potWinnings,
            netResult
          });
        }
        
        await fullGameRepository.completeHand({
          gameTextId: gameId,
          roomId: roomId || '',
          handId: metadata.currentHandId,
          handNumber: metadata.currentHandNumber,
          potSize: potAmount,
          communityCards,
          winners: winners.map(w => ({
            playerId: w.playerId,
            amount: w.amount,
            handRank: w.handRank || 0
          })),
          playerActions: result.events.filter(e => e.type === 'PLAYER_ACTION'),
          finalStacks,
          playerResults
        });
        
        Logger.success(LogCategory.PERSIST, 'Hand completed and persisted', { 
          gameId, 
          handNumber: metadata.currentHandNumber,
          potSize: potAmount,
          winners: winners.length
        });
      } catch (error) {
        Logger.error(LogCategory.PERSIST, 'Failed to persist hand completion', { 
          gameId, 
          error: error.message 
        });
      }
    }
    
    if (io && roomId) {
      if (willBeAllInRunout) {
        // ✅ ALL-IN DISPLAY BUG FIX: Use DisplayStateManager
        const userIdMap = playerUserIds.get(gameId);
        
        // Extract pre-distribution snapshot from HAND_COMPLETED event
        const preDistributionSnapshot = handCompletedEvent?.data?.preDistributionSnapshot;
        
        if (!preDistributionSnapshot) {
          console.error('❌ CRITICAL: No preDistributionSnapshot in HAND_COMPLETED event!');
          // Fallback to basic behavior
          io.to(`room:${roomId}`).emit('pot_update', {
            gameId,
            pot: potAmount,
            action: action,
            playerId: player_id,
            message: 'All players all-in - dealing remaining cards...'
          });
        } else {
          // Create domain outcomes from event
          const outcomes = {
            type: 'HAND_COMPLETED',
            wasAllIn: handCompletedEvent.data.wasAllIn || true,
            potAmount: preDistributionSnapshot.potAmount,
            winners: handCompletedEvent.data.winners || []
          };
          
          // Calculate correct display state
          const displayState = displayStateManager.calculateDisplayState(
            preDistributionSnapshot,
            outcomes,
            result.newState
          );
          
          // Map display players to include userId
          const displayPlayers = displayState.visibleState.players.map(p => ({
            ...p,
            userId: userIdMap ? userIdMap.get(p.id) : null
          }));
          
          console.log(`✅ DisplayStateManager calculated all-in display state:`);
          console.log(`   Pot: $${displayState.visibleState.pot}`);
          displayPlayers.forEach(p => console.log(`   ${p.name}: stack=$${p.stack}, allIn=${p.isAllIn}`));
          
          io.to(`room:${roomId}`).emit('pot_update', {
            gameId,
            pot: displayState.visibleState.pot,
            action: action,
            playerId: player_id,
            players: displayPlayers,
            message: 'All players all-in - dealing remaining cards...'
          });
          console.log(`📡 Emitted pot_update with CORRECT display state`);
        }
        
        // Log sockets in room
        const roomSockets = io.sockets.adapter.rooms.get(`room:${roomId}`);
        console.log(`   Sockets in room: ${roomSockets ? roomSockets.size : 0}`);
      } else {
        // Normal action - full game state update
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
      }
    } else {
      console.log(`❌ Cannot broadcast - io: ${!!io}, roomId: ${roomId}`);
    }
    
    // Check if betting round is complete using sophisticated logic
    let isBettingComplete = result.newState.isBettingRoundComplete();
    
    // 🔍 DIAGNOSTIC: Betting round completion
    console.log('🔍 BETTING ROUND COMPLETION CHECK:');
    console.log('  isBettingComplete (from engine):', isBettingComplete);
    console.log('  Current bet:', result.newState.bettingRound.currentBet);
    console.log('  Last aggressor:', result.newState.bettingRound.lastAggressor);
    console.log('  Current street:', result.newState.currentStreet);
    console.log('  Action history this street:');
    result.newState.actionHistory
      .filter(a => a.street === result.newState.currentStreet && a.handNumber === result.newState.handState.handNumber)
      .forEach(a => console.log(`    ${a.player}: ${a.action} ${a.amount || ''}`));
    console.log('  Player states:');
    for (const player of result.newState.players.values()) {
      if (!player.hasFolded) {
        console.log(`    ${player.name}: betThisStreet=${player.betThisStreet}, isAllIn=${player.isAllIn}`);
      }
    }
    
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
      // Extract winner info from the action's events (with safe null checks)
      const winners = (handCompletedEvent && handCompletedEvent.data && handCompletedEvent.data.winners) 
        ? handCompletedEvent.data.winners 
        : [];
      
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
              pot: potAmount, // Use captured pot (not reset value)
              message: `Dealing ${streetEvent.data.street}...`
            });
          }, (index + 1) * 1000);
        });
        
        // NOW broadcast hand_complete AFTER all streets revealed to players
        // Add extra 2 seconds after last card so players can see it
        const finalDelay = (streetEvents.length + 2) * 1000;
        console.log(`⏰ Winner will be announced in ${finalDelay}ms (after all cards shown to players)`);
        
        setTimeout(async () => {
          console.log(`🎉 ALL CARDS REVEALED - Now announcing winner!`);
          console.log(`💸 Transferring pot ($${potAmount}) to winner's stack`);
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
            })),
            potTransfer: true, // Signal that pot is being transferred to winner
            previousPot: potAmount // Pot before transfer (for animation)
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
          
          // IMPORTANT: Send response AFTER animation completes
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
            events: result.events,
            message: 'All-in runout - cards being revealed progressively'
          });
        }, finalDelay);
        
        // Early return - response will be sent after animation
        return;
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

// ============================================
// SERVER STARTUP with database initialization
// ============================================

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    console.log('🚀 Starting SOPHISTICATED POKER ENGINE...');
    
    // Initialize database connection if repository is enabled
    if (MIGRATION_FLAGS.USE_DB_REPOSITORY) {
      console.log('🗄️  Initializing database connection...');
      const db = initializeDatabase();
      
      // Test connection
      try {
        await db.query('SELECT NOW()');
        console.log('✅ Database connection established');
      } catch (dbError) {
        console.error('❌ Database connection failed:', dbError.message);
        console.warn('⚠️  Continuing with in-memory storage only');
        MIGRATION_FLAGS.USE_DB_REPOSITORY = false;
      }
    }
    
    // Start HTTP server
    const httpServer = app.listen(PORT, () => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 SOPHISTICATED POKER ENGINE running on port ${PORT}`);
      console.log(`🎯 Using: GameStateMachine, BettingEngine, RoundManager, TurnManager`);
      console.log(`🎰 Test at: http://localhost:${PORT}/poker`);
      console.log(`✅ REAL poker rules with sophisticated betting round completion!`);
      console.log(`\n📊 Migration Status:`);
      console.log(`  - Database Repository: ${MIGRATION_FLAGS.USE_DB_REPOSITORY ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`  - Input Validation: ${MIGRATION_FLAGS.USE_INPUT_VALIDATION ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`  - Auth Middleware: ${MIGRATION_FLAGS.USE_AUTH_MIDDLEWARE ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`  - Event Persistence: ${MIGRATION_FLAGS.USE_EVENT_PERSISTENCE ? '✅ ENABLED' : '❌ DISABLED'}`);
      console.log(`${'='.repeat(60)}\n`);
    });
    
    return httpServer;
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Socket.IO instance (initialized after server starts)
let io = null;

// Export for external use if needed
module.exports = { app, io, games, StorageAdapter };

// ============================================================================
// ✅ DAY 5: CQRS ENDPOINTS (Using GameApplicationService)
// These demonstrate the clean command/query separation pattern
// ============================================================================

// Query: Get game state (read-only)
app.get('/api/v2/game/:gameId', async (req, res) => {
  try {
    if (!gameApplicationService) {
      return res.status(503).json({ error: 'Application service not initialized' });
    }

    const { gameId } = req.params;
    const gameState = await gameApplicationService.getGameState(gameId);

    if (!gameState) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      gameId: gameState.id,
      status: gameState.status,
      pot: gameState.pot.totalPot,
      currentStreet: gameState.currentStreet,
      players: Array.from(gameState.players.values()).map(p => ({
        id: p.uuid,
        name: p.name,
        stack: p.stack,
        seatIndex: p.seatIndex
      }))
    });
  } catch (error) {
    console.error('❌ Error fetching game state:', error);
    res.status(500).json({ error: error.message });
  }
});

// Query: Get room info
app.get('/api/v2/room/:roomId', async (req, res) => {
  try {
    if (!gameApplicationService) {
      return res.status(503).json({ error: 'Application service not initialized' });
    }

    const { roomId } = req.params;
    const roomInfo = await gameApplicationService.getRoomInfo(roomId);

    if (!roomInfo) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json(roomInfo);
  } catch (error) {
    console.error('❌ Error fetching room info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Command: Process player action (CQRS-style, but keeping compatibility with existing system)
// ⚡ RATE LIMITED: Max 1 action per second per player
// ✅ VALIDATED: PlayerActionSchema
// 🔒 AUTH REQUIRED: Only authenticated players can take actions
app.post('/api/v2/game/:gameId/action', authenticateToken, actionLimiter, validateBody(PlayerActionSchema, 'PlayerAction'), async (req, res) => {
  try {
    if (!gameApplicationService) {
      return res.status(503).json({ error: 'Application service not initialized' });
    }

    const { gameId } = req.params;
    const { playerId, action, amount } = req.body;

    const result = await gameApplicationService.processPlayerAction(
      gameId,
      playerId,
      action,
      amount
    );

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    // Update game state in store
    games.set(gameId, result.newState);

    res.json({
      success: true,
      gameId,
      action,
      amount: amount || 0,
      pot: result.newState.pot.totalPot,
      toAct: result.newState.toAct
    });
  } catch (error) {
    console.error('❌ Error processing action:', error);
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO connection handlers (initialized after server starts)
async function setupSocketIO() {
  if (!io) {
    console.warn('⚠️  Socket.IO not initialized, skipping connection handlers');
    return;
  }
  
  io.on('connection', (socket) => {
    socket.on('join_room', (data) => {
      // Handle both old format (string) and new format (object)
      const roomId = typeof data === 'string' ? data : data?.roomId;
      const userId = typeof data === 'object' ? data?.userId : null;
      
      if (!roomId) return;
      console.log(`🔌 Socket ${socket.id} joining room:${roomId}${userId ? ` (user: ${userId})` : ''}`);
      socket.join(`room:${roomId}`);
      socket.emit('joined_room', { roomId });
      console.log(`✅ Socket ${socket.id} joined room:${roomId}`);
    });
    
    socket.on('start_game', (data) => {
      const { roomId, gameId, game } = data;
      if (!roomId) return;
      console.log(`🎮 Broadcasting game start to room:${roomId}, game:${gameId}`);
      io.to(`room:${roomId}`).emit('game_started', { 
        roomId, 
        gameId,
        game: game || { id: gameId } 
      });
    });
  });
  
  console.log('✅ Socket.IO connection handlers registered');
}

async function broadcastSeats(roomId) {
  try {
    if (!io) return; // Skip if Socket.IO not initialized
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

// ============================================
// MIDDLEWARE INITIALIZATION
// ============================================

// ✅ AUTH MIDDLEWARE
function authenticateUser(req, res, next) {
  if (!MIGRATION_FLAGS.USE_AUTH_MIDDLEWARE) {
    return next(); // Skip if auth middleware disabled
  }
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    Logger.warn(LogCategory.AUTH, 'Missing auth token', { path: req.path });
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    Logger.error(LogCategory.AUTH, 'Invalid token', { error: error.message });
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// ✅ INPUT VALIDATION MIDDLEWARE
function validateGameAction(req, res, next) {
  if (!MIGRATION_FLAGS.USE_INPUT_VALIDATION) {
    return next(); // Skip if validation disabled
  }
  
  const { player_id, action, amount } = req.body;
  
  // Basic validation
  if (!player_id || typeof player_id !== 'string') {
    Logger.warn(LogCategory.API, 'Invalid player_id', { body: req.body });
    return res.status(400).json({ error: 'Invalid player_id' });
  }
  
  const validActions = ['FOLD', 'CHECK', 'CALL', 'BET', 'RAISE', 'ALL_IN'];
  if (!action || !validActions.includes(action.toUpperCase())) {
    Logger.warn(LogCategory.API, 'Invalid action', { action });
    return res.status(400).json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` });
  }
  
  if (amount !== undefined && (typeof amount !== 'number' || amount < 0)) {
    Logger.warn(LogCategory.API, 'Invalid amount', { amount });
    return res.status(400).json({ error: 'Amount must be a non-negative number' });
  }
  
  next();
}

// ✅ EVENT SOURCING INITIALIZATION
let eventStore = null;
let eventBus = null;
let gameApplicationService = null;

function initializeEventSourcing(io) {
  try {
    const db = getDb();
    
    // Initialize EventStore if persistence is enabled
    if (MIGRATION_FLAGS.USE_EVENT_PERSISTENCE && db) {
      eventStore = new EventStoreRepository(db);
      Logger.success(LogCategory.STARTUP, 'EventStore initialized');
    } else {
      Logger.info(LogCategory.STARTUP, 'Event persistence disabled');
    }
    
    // Initialize EventBus (works with or without EventStore)
    eventBus = new EventBus({
      eventStore: eventStore,
      persistEvents: MIGRATION_FLAGS.USE_EVENT_PERSISTENCE && !!eventStore,
      asyncHandlers: true,
      swallowHandlerErrors: true,
    });
    Logger.success(LogCategory.STARTUP, 'EventBus initialized', { 
      persistEvents: MIGRATION_FLAGS.USE_EVENT_PERSISTENCE && !!eventStore 
    });
    
    // ✅ CRITICAL: Initialize GameStateMachine with EventBus
    stateMachine = new GameStateMachine(Math.random, eventBus);
    Logger.success(LogCategory.STARTUP, 'GameStateMachine initialized with EventBus');
    
    // Register event handlers
    if (io) {
      const gameEventHandler = new GameEventHandler();
      const webSocketHandler = new WebSocketEventHandler(io, displayStateManager);
      
      eventBus.subscribe('game.*', gameEventHandler.getHandlerFunction(), {
        priority: 50,
        id: 'GameEventHandler'
      });
      
      eventBus.subscribe('game.*', webSocketHandler.getHandlerFunction(), {
        priority: 10,
        id: 'WebSocketEventHandler'
      });
      
      Logger.success(LogCategory.STARTUP, 'Event handlers registered');
    }
    
    // Initialize CQRS Application Service
    gameApplicationService = new GameApplicationService({
      stateMachine: stateMachine,
      gameStateStore: games,
      playerStatsStore: new Map()
    });
    Logger.success(LogCategory.STARTUP, 'GameApplicationService initialized');
    
  } catch (error) {
    Logger.error(LogCategory.STARTUP, 'Failed to initialize event sourcing', { error: error.message });
    // Fallback: Create GameStateMachine without EventBus
    if (!stateMachine) {
      stateMachine = new GameStateMachine(Math.random, null);
      Logger.warn(LogCategory.STARTUP, 'GameStateMachine initialized without EventBus (fallback)');
    }
  }
}

// ✅ SUPABASE INITIALIZATION
function initializeSupabase() {
  if (!supabase) {
    Logger.warn(LogCategory.STARTUP, 'Supabase client not initialized');
    return;
  }
  Logger.info(LogCategory.STARTUP, 'Supabase client ready');
}

// ✅ CRASH RECOVERY
async function recoverIncompleteGames() {
  if (!MIGRATION_FLAGS.USE_DB_REPOSITORY || !gameStatesRepository) {
    Logger.info(LogCategory.RECOVERY, 'Crash recovery skipped (DB not enabled)');
    return;
  }
  
  Logger.info(LogCategory.RECOVERY, 'Starting crash recovery...');
  
  try {
    const db = getDb();
    const result = await db.query(
      `SELECT id FROM game_states 
       WHERE status NOT IN ('completed', 'deleted') 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    
    Logger.info(LogCategory.RECOVERY, `Found ${result.rows.length} incomplete games`);
    
    for (const row of result.rows) {
      try {
        const gameState = await gameStatesRepository.findById(row.id);
        if (gameState) {
          games.set(row.id, gameState);
          Logger.success(LogCategory.RECOVERY, 'Game recovered', { gameId: row.id });
        }
      } catch (error) {
        Logger.error(LogCategory.RECOVERY, 'Failed to recover game', { 
          gameId: row.id, 
          error: error.message 
        });
      }
    }
    
    Logger.success(LogCategory.RECOVERY, 'Crash recovery complete');
  } catch (error) {
    Logger.error(LogCategory.RECOVERY, 'Crash recovery failed', { error: error.message });
  }
}

// ============================================
// SERVER INITIALIZATION SEQUENCE
// ============================================

async function initializeServices() {
  // Initialize Supabase Auth
  initializeSupabase();
  
  // Initialize event sourcing infrastructure
  initializeEventSourcing(io);
  
  // Setup Socket.IO handlers
  await setupSocketIO();
  
  // Attempt crash recovery (async, don't block)
  recoverIncompleteGames().catch(err => {
    console.error('❌ Crash recovery error:', err);
  });
}

// Start server, then initialize all services
startServer().then(async (httpServer) => {
  // Socket.IO setup
  io = new Server(httpServer, {
    cors: { origin: '*', credentials: false },
  });
  
  console.log('✅ Socket.IO initialized');
  
  // Initialize all services now that io is ready
  await initializeServices();
  
  console.log('\n🎉 All systems operational!\n');
}).catch((error) => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});
