/**
 * PlayerIdentityService - Stable player identity management
 * 
 * This service provides persistent player identities that survive
 * browser refreshes and server restarts. It manages the mapping
 * between user IDs and player IDs within games.
 */

const crypto = require('crypto');

class PlayerIdentityService {
  constructor(db) {
    this.db = db;
    this.sessionCache = new Map(); // In-memory cache for performance
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get or create a stable player ID for a user in a game
   * @param {string} userId - The user's ID
   * @param {string} gameId - The game ID
   * @param {number} seatIndex - The seat index the player is claiming
   * @param {string} roomId - Optional room ID for reference
   * @returns {Promise<{playerId: string, sessionToken: string, isNew: boolean}>}
   */
  async getOrCreatePlayerId(userId, gameId, seatIndex, roomId = null) {
    try {
      // Check cache first
      const cacheKey = `${userId}:${gameId}`;
      const cached = this.sessionCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        console.log(`✅ [IDENTITY] Player session found in cache for ${userId}`);
        return { 
          playerId: cached.playerId, 
          sessionToken: cached.sessionToken,
          isNew: false 
        };
      }

      // Check existing session in database
      const existingResult = await this.db.query(
        `SELECT player_id, session_token, seat_index 
         FROM player_sessions 
         WHERE user_id = $1 AND game_id = $2 AND expires_at > NOW()`,
        [userId, gameId]
      );

      if (existingResult.rows.length > 0) {
        const session = existingResult.rows[0];
        
        // Update cache
        this.sessionCache.set(cacheKey, {
          playerId: session.player_id,
          sessionToken: session.session_token,
          timestamp: Date.now()
        });

        console.log(`✅ [IDENTITY] Existing player session found for ${userId}: ${session.player_id}`);
        
        // Update last accessed time
        await this.db.query(
          'UPDATE player_sessions SET last_accessed_at = NOW() WHERE user_id = $1 AND game_id = $2',
          [userId, gameId]
        );

        return {
          playerId: session.player_id,
          sessionToken: session.session_token,
          isNew: false
        };
      }

      // Create new stable identity
      const playerId = this.generateStablePlayerId(userId, gameId);
      const sessionToken = this.generateSessionToken();

      // Insert into database
      await this.db.query(
        `INSERT INTO player_sessions 
         (user_id, game_id, player_id, seat_index, room_id, session_token) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userId, gameId, playerId, seatIndex, roomId, sessionToken]
      );

      // Update cache
      this.sessionCache.set(cacheKey, {
        playerId,
        sessionToken,
        timestamp: Date.now()
      });

      console.log(`✅ [IDENTITY] New player session created for ${userId}: ${playerId}`);

      return {
        playerId,
        sessionToken,
        isNew: true
      };

    } catch (error) {
      console.error(`❌ [IDENTITY] Error managing player identity for ${userId}:`, error);
      
      // Fallback to ephemeral ID if database fails
      const fallbackId = `player_${userId}_${seatIndex}_${Date.now()}`;
      return {
        playerId: fallbackId,
        sessionToken: null,
        isNew: true
      };
    }
  }

  /**
   * Verify a player session token
   * @param {string} sessionToken - The session token to verify
   * @returns {Promise<{valid: boolean, playerId?: string, userId?: string, gameId?: string}>}
   */
  async verifySession(sessionToken) {
    try {
      const result = await this.db.query(
        `SELECT player_id, user_id, game_id, seat_index 
         FROM player_sessions 
         WHERE session_token = $1 AND expires_at > NOW()`,
        [sessionToken]
      );

      if (result.rows.length === 0) {
        return { valid: false };
      }

      const session = result.rows[0];

      // Update last accessed time
      await this.db.query(
        'UPDATE player_sessions SET last_accessed_at = NOW() WHERE session_token = $1',
        [sessionToken]
      );

      return {
        valid: true,
        playerId: session.player_id,
        userId: session.user_id,
        gameId: session.game_id,
        seatIndex: session.seat_index
      };

    } catch (error) {
      console.error('❌ [IDENTITY] Error verifying session:', error);
      return { valid: false };
    }
  }

  /**
   * Get player session by user and game
   * @param {string} userId - The user ID
   * @param {string} gameId - The game ID
   * @returns {Promise<{playerId: string, sessionToken: string, seatIndex: number} | null>}
   */
  async getPlayerSession(userId, gameId) {
    try {
      const result = await this.db.query(
        `SELECT player_id, session_token, seat_index 
         FROM player_sessions 
         WHERE user_id = $1 AND game_id = $2 AND expires_at > NOW()`,
        [userId, gameId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return {
        playerId: result.rows[0].player_id,
        sessionToken: result.rows[0].session_token,
        seatIndex: result.rows[0].seat_index
      };

    } catch (error) {
      console.error('❌ [IDENTITY] Error getting player session:', error);
      return null;
    }
  }

  /**
   * Extend a player session
   * @param {string} sessionToken - The session token to extend
   * @param {number} hours - Hours to extend (default 24)
   * @returns {Promise<boolean>} Success status
   */
  async extendSession(sessionToken, hours = 24) {
    try {
      const result = await this.db.query(
        `UPDATE player_sessions 
         SET expires_at = NOW() + INTERVAL '${hours} hours',
             last_accessed_at = NOW()
         WHERE session_token = $1 AND expires_at > NOW()`,
        [sessionToken]
      );

      return result.rowCount > 0;

    } catch (error) {
      console.error('❌ [IDENTITY] Error extending session:', error);
      return false;
    }
  }

  /**
   * Remove a player session
   * @param {string} userId - The user ID
   * @param {string} gameId - The game ID
   * @returns {Promise<boolean>} Success status
   */
  async removeSession(userId, gameId) {
    try {
      // Remove from cache
      const cacheKey = `${userId}:${gameId}`;
      this.sessionCache.delete(cacheKey);

      // Remove from database
      const result = await this.db.query(
        'DELETE FROM player_sessions WHERE user_id = $1 AND game_id = $2',
        [userId, gameId]
      );

      console.log(`🗑️ [IDENTITY] Removed session for user ${userId} in game ${gameId}`);
      return result.rowCount > 0;

    } catch (error) {
      console.error('❌ [IDENTITY] Error removing session:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions
   * @returns {Promise<number>} Number of sessions cleaned
   */
  async cleanupExpiredSessions() {
    try {
      const result = await this.db.query('SELECT cleanup_expired_player_sessions()');
      const count = result.rows[0].cleanup_expired_player_sessions;
      
      if (count > 0) {
        console.log(`🧹 [IDENTITY] Cleaned up ${count} expired sessions`);
      }
      
      return count;

    } catch (error) {
      console.error('❌ [IDENTITY] Error cleaning up sessions:', error);
      return 0;
    }
  }

  /**
   * Generate a stable player ID
   * @private
   */
  generateStablePlayerId(userId, gameId) {
    // Create a deterministic but unique player ID
    const timestamp = Date.now();
    const hash = crypto.createHash('sha256')
      .update(`${userId}:${gameId}:${timestamp}`)
      .digest('hex')
      .substring(0, 8);
    
    return `player_${userId}_${hash}`;
  }

  /**
   * Generate a secure session token
   * @private
   */
  generateSessionToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Clear the in-memory cache
   */
  clearCache() {
    this.sessionCache.clear();
    console.log('🧹 [IDENTITY] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.sessionCache.size,
      ttl: this.cacheTTL
    };
  }
}

module.exports = PlayerIdentityService;
