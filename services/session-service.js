// Session Service - Stable Player Identity & Seat Binding
const { v4: uuidv4 } = require('uuid');

const SESSION_TTL = 60 * 60 * 24 * 7; // 7 days
const GRACE_PERIOD = 60 * 5; // 5 minutes
const SEAT_TOKEN_TTL = 60 * 60 * 2; // 2 hours

class SessionService {
  constructor(redisClient, db) {
    this.redis = redisClient;
    this.db = db;
  }

  // ============================================
  // SESSION LIFECYCLE
  // ============================================

  /**
   * Create or retrieve stable session for user
   * @param {string} userId - User ID from auth (guest or OAuth)
   * @param {string} fingerprint - Browser fingerprint
   * @returns {Promise<Object>} Session data
   */
  async getOrCreateSession(userId, fingerprint = null) {
    const sessionKey = `session:${userId}`;
    
    // Check if session exists in Redis
    let sessionData = await this.redis.get(sessionKey);
    
    if (sessionData) {
      sessionData = JSON.parse(sessionData);
      
      // Extend TTL on activity
      await this.redis.expire(sessionKey, SESSION_TTL);
      
      console.log(`♻️  Session restored for user: ${userId}`);
      return sessionData;
    }

    // Create new session
    sessionData = {
      userId,
      sessionId: uuidv4(),
      fingerprint,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      currentRoomId: null,
      currentSeatIndex: null
    };

    await this.redis.setex(sessionKey, SESSION_TTL, JSON.stringify(sessionData));
    
    // Note: Session metadata stored in Redis only
    // Express-session handles its own DB persistence to app_sessions table

    console.log(`✨ New session created for user: ${userId}`);
    return sessionData;
  }

  /**
   * Update session activity timestamp
   */
  async touchSession(userId) {
    const sessionKey = `session:${userId}`;
    const sessionData = await this.redis.get(sessionKey);
    
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      parsed.lastActivity = Date.now();
      await this.redis.setex(sessionKey, SESSION_TTL, JSON.stringify(parsed));
      await this.redis.expire(sessionKey, SESSION_TTL);
    }
  }

  // ============================================
  // SEAT BINDING (Server-Authoritative)
  // ============================================

  /**
   * Bind user to seat with grace period
   * @param {string} userId 
   * @param {string} roomId 
   * @param {number} seatIndex 
   * @returns {Promise<string>} Seat token (JWT)
   */
  async bindUserToSeat(userId, roomId, seatIndex) {
    const seatKey = `seat:${roomId}:${seatIndex}`;
    const userSeatKey = `userSeat:${userId}`;

    // Check if seat is already taken
    const existingBinding = await this.redis.get(seatKey);
    if (existingBinding) {
      const existing = JSON.parse(existingBinding);
      if (existing.userId !== userId) {
        throw new Error('Seat already occupied by another player');
      }
    }

    // Generate seat token
    const jwt = require('jsonwebtoken');
    const seatToken = jwt.sign(
      { userId, roomId, seatIndex },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '2h' }
    );

    const bindingData = {
      userId,
      roomId,
      seatIndex,
      seatToken,
      boundAt: Date.now(),
      lastHeartbeat: Date.now(),
      status: 'ACTIVE'
    };

    // Store in Redis with TTL
    await this.redis.setex(seatKey, SEAT_TOKEN_TTL, JSON.stringify(bindingData));
    await this.redis.setex(userSeatKey, SEAT_TOKEN_TTL, JSON.stringify(bindingData));

    // Persist to database
    try {
      await this.db.query(
        `INSERT INTO room_seats (room_id, seat_index, user_id, status, chips_in_play, joined_at)
         VALUES ($1, $2, $3, 'active', 0, NOW())
         ON CONFLICT (room_id, seat_index) DO UPDATE
         SET user_id = $3, status = 'active', joined_at = NOW()`,
        [roomId, seatIndex, userId]
      );
    } catch (error) {
      console.warn('Failed to persist seat binding to DB:', error.message);
    }

    console.log(`🪑 User ${userId} bound to seat ${seatIndex} in room ${roomId}`);
    return seatToken;
  }

  /**
   * Verify seat token and return binding
   */
  async verifySeatToken(seatToken) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(seatToken, process.env.JWT_SECRET || 'fallback-secret');
      
      const seatKey = `seat:${decoded.roomId}:${decoded.seatIndex}`;
      const bindingData = await this.redis.get(seatKey);
      
      if (!bindingData) {
        throw new Error('Seat binding expired or invalid');
      }

      return JSON.parse(bindingData);
    } catch (error) {
      throw new Error(`Invalid seat token: ${error.message}`);
    }
  }

  /**
   * Heartbeat to keep seat binding alive
   */
  async heartbeat(userId) {
    const userSeatKey = `userSeat:${userId}`;
    const bindingData = await this.redis.get(userSeatKey);
    
    if (!bindingData) {
      return null;
    }

    const binding = JSON.parse(bindingData);
    binding.lastHeartbeat = Date.now();
    binding.status = 'ACTIVE';

    const seatKey = `seat:${binding.roomId}:${binding.seatIndex}`;
    
    // Update both keys
    await this.redis.setex(userSeatKey, SEAT_TOKEN_TTL, JSON.stringify(binding));
    await this.redis.setex(seatKey, SEAT_TOKEN_TTL, JSON.stringify(binding));

    return binding;
  }

  /**
   * Mark player as AWAY (grace period starts)
   */
  async markPlayerAway(userId) {
    const userSeatKey = `userSeat:${userId}`;
    const bindingData = await this.redis.get(userSeatKey);
    
    if (!bindingData) {
      return null;
    }

    const binding = JSON.parse(bindingData);
    binding.status = 'AWAY';
    binding.awayTimestamp = Date.now();

    const seatKey = `seat:${binding.roomId}:${binding.seatIndex}`;
    
    // Keep binding for grace period
    await this.redis.setex(userSeatKey, GRACE_PERIOD, JSON.stringify(binding));
    await this.redis.setex(seatKey, GRACE_PERIOD, JSON.stringify(binding));

    console.log(`⏰ Player ${userId} marked AWAY, grace period: ${GRACE_PERIOD}s`);
    return binding;
  }

  /**
   * Release seat binding (logout or grace period expired)
   */
  async releaseSeat(userId) {
    const userSeatKey = `userSeat:${userId}`;
    const bindingData = await this.redis.get(userSeatKey);
    
    if (!bindingData) {
      return;
    }

    const binding = JSON.parse(bindingData);
    const seatKey = `seat:${binding.roomId}:${binding.seatIndex}`;

    // Remove from Redis
    await this.redis.del(userSeatKey);
    await this.redis.del(seatKey);

    // Update database
    try {
      await this.db.query(
        `UPDATE room_seats SET status = 'vacant', user_id = NULL WHERE room_id = $1 AND seat_index = $2`,
        [binding.roomId, binding.seatIndex]
      );
    } catch (error) {
      console.warn('Failed to release seat in DB:', error.message);
    }

    console.log(`🚪 Seat ${binding.seatIndex} in room ${binding.roomId} released for user ${userId}`);
  }

  /**
   * Get current seat binding for user
   */
  async getUserSeat(userId) {
    const userSeatKey = `userSeat:${userId}`;
    const bindingData = await this.redis.get(userSeatKey);
    
    if (!bindingData) {
      return null;
    }

    return JSON.parse(bindingData);
  }

  /**
   * Get all active seats in a room
   */
  async getRoomSeats(roomId) {
    const pattern = `seat:${roomId}:*`;
    const keys = await this.redis.keys(pattern);
    
    const seats = [];
    for (const key of keys) {
      const data = await this.redis.get(key);
      if (data) {
        seats.push(JSON.parse(data));
      }
    }

    return seats;
  }
}

module.exports = { SessionService };

