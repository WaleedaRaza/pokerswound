/**
 * POKER TABLE V2 - Database Access Layer
 * Day 1 Afternoon: Foundation for all new features
 */

const { Pool } = require('pg');

class PokerTableV2DB {
  constructor(connectionString) {
    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 20, // Connection pool size
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  /**
   * SEQUENCE NUMBER MANAGEMENT
   */
  async incrementSequence(roomId) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `UPDATE game_states 
         SET seq = seq + 1 
         WHERE room_id = $1 
         RETURNING seq`,
        [roomId]
      );
      
      if (result.rows.length === 0) {
        throw new Error(`No game state found for room ${roomId}`);
      }
      
      return result.rows[0].seq;
    } finally {
      client.release();
    }
  }

  async getCurrentSequence(roomId) {
    const result = await this.pool.query(
      'SELECT seq FROM game_states WHERE room_id = $1',
      [roomId]
    );
    
    return result.rows[0]?.seq || 0;
  }

  /**
   * IDEMPOTENCY MANAGEMENT
   */
  async checkIdempotency(key, userId) {
    const result = await this.pool.query(
      `SELECT result 
       FROM processed_actions 
       WHERE idempotency_key = $1 AND user_id = $2`,
      [key, userId]
    );
    
    return result.rows[0]?.result || null;
  }

  async storeIdempotency(key, userId, actionType, result, roomId = null) {
    // Extract roomId from result if not provided
    const finalRoomId = roomId || result.roomId || '00000000-0000-0000-0000-000000000000';
    
    await this.pool.query(
      `INSERT INTO processed_actions 
       (idempotency_key, room_id, user_id, action_type, result, expires_at)
       VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '1 hour')
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [key, finalRoomId, userId, actionType, result]
    );
  }

  /**
   * AUDIT LOGGING
   */
  async auditLog(entry) {
    await this.pool.query(
      `INSERT INTO game_audit_log 
       (trace_id, room_id, game_id, hand_id, user_id, seq, action, payload)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        entry.traceId,
        entry.roomId,
        entry.gameId || null,
        entry.handId || null,
        entry.userId,
        entry.seq || null,
        entry.action,
        JSON.stringify(entry.payload || {})
      ]
    );
  }

  /**
   * RATE LIMITING
   */
  async checkRateLimit(userId, actionType, windowMs, maxCount) {
    const windowStart = new Date(Date.now() - windowMs);
    
    // Count recent actions
    const result = await this.pool.query(
      `SELECT COUNT(*) as count
       FROM rate_limits
       WHERE user_id = $1 
         AND action_type = $2 
         AND window_start > $3`,
      [userId, actionType, windowStart]
    );
    
    const count = parseInt(result.rows[0].count);
    
    if (count >= maxCount) {
      return { allowed: false, count, limit: maxCount };
    }
    
    // Record this action
    await this.pool.query(
      `INSERT INTO rate_limits (user_id, action_type, window_start)
       VALUES ($1, $2, NOW())`,
      [userId, actionType]
    );
    
    return { allowed: true, count: count + 1, limit: maxCount };
  }

  /**
   * REJOIN TOKEN MANAGEMENT
   */
  async createRejoinToken(roomId, userId, seatIndex, tokenHash) {
    await this.pool.query(
      `INSERT INTO rejoin_tokens 
       (token_hash, room_id, user_id, seat_index, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '4 hours')
       ON CONFLICT (room_id, user_id) 
       DO UPDATE SET 
         token_hash = EXCLUDED.token_hash,
         seat_index = EXCLUDED.seat_index,
         expires_at = EXCLUDED.expires_at`,
      [tokenHash, roomId, userId, seatIndex]
    );
  }

  async validateRejoinToken(tokenHash, roomId) {
    const result = await this.pool.query(
      `SELECT user_id, seat_index 
       FROM rejoin_tokens 
       WHERE token_hash = $1 
         AND room_id = $2 
         AND expires_at > NOW()`,
      [tokenHash, roomId]
    );
    
    return result.rows[0] || null;
  }

  /**
   * TIMER MANAGEMENT
   */
  async startTurn(gameId, playerId, turnTimeSeconds) {
    const turnStartedAt = Date.now();
    
    await this.pool.query(
      `UPDATE game_states 
       SET actor_turn_started_at = $1,
           actor_timebank_remaining = COALESCE(actor_timebank_remaining, 60)
       WHERE room_id = (SELECT room_id FROM games WHERE id = $2)`,
      [turnStartedAt, gameId]
    );
    
    return { turnStartedAt, turnTimeSeconds };
  }

  async getTurnTimer(gameId) {
    const result = await this.pool.query(
      `SELECT gs.actor_turn_started_at, gs.actor_timebank_remaining, r.turn_time_seconds
       FROM game_states gs
       JOIN rooms r ON gs.room_id = r.id
       WHERE gs.room_id = (SELECT room_id FROM games WHERE id = $1)`,
      [gameId]
    );
    
    return result.rows[0] || null;
  }

  /**
   * ROOM JOIN REQUESTS
   */
  async createJoinRequest(roomId, userId) {
    const result = await this.pool.query(
      `INSERT INTO room_join_requests 
       (room_id, user_id, status)
       VALUES ($1, $2, 'pending')
       ON CONFLICT (room_id, user_id, status) 
       DO UPDATE SET requested_at = NOW()
       RETURNING id`,
      [roomId, userId]
    );
    
    return result.rows[0].id;
  }

  async getPendingJoinRequests(roomId) {
    const result = await this.pool.query(
      `SELECT rjr.*, up.username
       FROM room_join_requests rjr
       JOIN user_profiles up ON rjr.user_id = up.id
       WHERE rjr.room_id = $1 AND rjr.status = 'pending'
       ORDER BY rjr.requested_at ASC`,
      [roomId]
    );
    
    return result.rows;
  }

  async approveJoinRequest(requestId, approverId, spectatorUntilHand) {
    await this.pool.query(
      `UPDATE room_join_requests
       SET status = 'approved',
           approved_by = $2,
           processed_at = NOW(),
           spectator_until_hand = $3
       WHERE id = $1`,
      [requestId, approverId, spectatorUntilHand]
    );
  }

  /**
   * CARD REVEAL TRACKING
   */
  async recordCardReveal(handId, playerId, cards) {
    await this.pool.query(
      `INSERT INTO card_reveals (hand_id, player_id, cards)
       VALUES ($1, $2, $3)`,
      [handId, playerId, cards]
    );
  }

  /**
   * SHUFFLE AUDIT
   */
  async recordShuffleCommitment(handId, commitmentHash, serverSecretHash, clientEntropy) {
    await this.pool.query(
      `INSERT INTO shuffle_audit 
       (hand_id, commitment_hash, server_secret_hash, client_entropy)
       VALUES ($1, $2, $3, $4)`,
      [handId, commitmentHash, serverSecretHash, clientEntropy || null]
    );
  }

  async recordShuffleResult(handId, shuffleSeed, deckHash) {
    await this.pool.query(
      `UPDATE shuffle_audit
       SET shuffle_seed = $2, deck_hash = $3
       WHERE hand_id = $1`,
      [handId, shuffleSeed, deckHash]
    );
  }

  /**
   * PLAYER STATUS MANAGEMENT
   */
  async updatePlayerStatus(roomId, userId, status, missedTurns = null) {
    const query = missedTurns !== null
      ? `UPDATE room_seats 
         SET player_status = $3, missed_turns = $4, last_action_at = NOW()
         WHERE room_id = $1 AND user_id = $2`
      : `UPDATE room_seats 
         SET player_status = $3, last_action_at = NOW()
         WHERE room_id = $1 AND user_id = $2`;
    
    const params = missedTurns !== null
      ? [roomId, userId, status, missedTurns]
      : [roomId, userId, status];
    
    await this.pool.query(query, params);
  }

  /**
   * CLEANUP OPERATIONS
   */
  async cleanupExpiredData() {
    // Clean expired idempotency keys
    await this.pool.query(
      'DELETE FROM processed_actions WHERE expires_at < NOW()'
    );
    
    // Clean old rate limit entries
    await this.pool.query(
      'DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL \'1 hour\''
    );
    
    // Clean expired rejoin tokens
    await this.pool.query(
      'DELETE FROM rejoin_tokens WHERE expires_at < NOW()'
    );
  }

  /**
   * TRANSACTION HELPER
   */
  async withTransaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * HEALTH CHECK
   */
  async healthCheck() {
    const result = await this.pool.query('SELECT NOW() as time');
    return { healthy: true, time: result.rows[0].time };
  }

  /**
   * CLEANUP
   */
  async close() {
    await this.pool.end();
  }
}

module.exports = PokerTableV2DB;
