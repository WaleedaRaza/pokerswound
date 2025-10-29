/**
 * Timer Service - Server-side authoritative timer management
 * Handles turn timers, timebank, and auto-fold enforcement
 */

class TimerService {
  constructor() {
    this.activeTimers = new Map(); // key: "gameId:playerId", value: timeoutId
    this.timebankChunkSeconds = 10; // How much timebank to use at once
    console.log('⏰ Timer Service initialized');
  }

  /**
   * Start a turn timer for a player
   * @param {Object} params - Timer parameters
   * @param {string} params.gameId - Game ID
   * @param {string} params.playerId - Player ID
   * @param {string} params.roomId - Room ID (for broadcasts)
   * @param {number} params.turnTimeSeconds - Turn time in seconds
   * @param {Object} params.dbV2 - Database instance
   * @param {Object} params.io - Socket.IO instance
   * @param {Function} params.onTimeout - Callback when timer expires
   */
  async startTurnTimer({ gameId, playerId, roomId, turnTimeSeconds, dbV2, io, onTimeout }) {
    const key = `${gameId}:${playerId}`;
    
    // Clear any existing timer for this player
    this.clearTimer(key);
    
    console.log(`⏱️ Starting ${turnTimeSeconds}s timer for player ${playerId} in game ${gameId}`);
    
    // Record timer start in database (pass roomId to avoid UUID lookup)
    if (dbV2) {
      await dbV2.startTurn(gameId, playerId, turnTimeSeconds, roomId);
    }
    
    // Store the timeout callback for this timer
    const timerData = {
      timerId: null,
      onTimeout,
      gameId,
      playerId,
      roomId,
      dbV2,
      io
    };
    
    // Schedule the timeout
    timerData.timerId = setTimeout(async () => {
      console.log(`⏰ Timer expired for player ${playerId} in game ${gameId}`);
      this.activeTimers.delete(key);
      
      // Check if player has timebank available
      if (dbV2) {
        const timebankRemaining = await this.getTimebankRemaining(gameId, playerId, dbV2);
        if (timebankRemaining > 0) {
          console.log(`⏱️ Auto-activating timebank for player ${playerId}`);
          await this.useTimebank({
            gameId,
            playerId,
            roomId,
            currentTimebank: timebankRemaining,
            dbV2,
            io,
            onTimeout
          });
          return;
        }
      }
      
      // Execute timeout callback (usually auto-fold)
      if (onTimeout) {
        await onTimeout(gameId, playerId);
      }
    }, turnTimeSeconds * 1000);
    
    this.activeTimers.set(key, timerData);
    
    // Broadcast timer start
    if (io) {
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      io.to(`room:${roomId}`).emit('turn_started', {
        type: 'turn_started',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          gameId,
          playerId,
          turnStartedAt: new Date().toISOString(),
          turnTimeSeconds,
          timebankAvailable: true // TODO: Get actual timebank from player data
        }
      });
    }
    
    return {
      key,
      turnStartedAt: new Date(),
      turnTimeSeconds
    };
  }

  /**
   * Cancel a timer (called when player acts)
   */
  clearTimer(key) {
    if (this.activeTimers.has(key)) {
      const timerData = this.activeTimers.get(key);
      if (timerData && timerData.timerId) {
        clearTimeout(timerData.timerId);
      }
      this.activeTimers.delete(key);
      console.log(`🛑 Cleared timer for ${key}`);
    }
  }

  /**
   * Clear timer for a specific player
   */
  clearPlayerTimer(gameId, playerId) {
    const key = `${gameId}:${playerId}`;
    this.clearTimer(key);
  }

  /**
   * Clear all timers for a game (e.g., when hand ends)
   */
  clearGameTimers(gameId) {
    let cleared = 0;
    for (const [key, timerData] of this.activeTimers.entries()) {
      if (key.startsWith(`${gameId}:`)) {
        if (timerData && timerData.timerId) {
          clearTimeout(timerData.timerId);
        }
        this.activeTimers.delete(key);
        cleared++;
      }
    }
    console.log(`🧹 Cleared ${cleared} timers for game ${gameId}`);
  }

  /**
   * Use timebank for a player
   */
  async useTimebank({ gameId, playerId, roomId, currentTimebank, dbV2, io, onTimeout }) {
    if (currentTimebank <= 0) {
      console.log(`⏰ No timebank remaining for player ${playerId}`);
      return false;
    }
    
    const key = `${gameId}:${playerId}`;
    const timebankToUse = Math.min(this.timebankChunkSeconds * 1000, currentTimebank);
    
    console.log(`⏱️ Using ${timebankToUse}ms of timebank for player ${playerId}`);
    
    // NOTE: Skipping database update - using in-memory game state
    // The players table (UUID system) doesn't exist - we use game_states (TEXT system)
    // TODO: Track timebank in game state when timebank feature is fully implemented
    
    // Extend the timer
    this.clearTimer(key);
    
    // Create new timer data
    const timerData = {
      timerId: null,
      onTimeout,
      gameId,
      playerId,
      roomId,
      dbV2,
      io
    };
    
    timerData.timerId = setTimeout(async () => {
      console.log(`⏰ Timebank expired for player ${playerId}`);
      this.activeTimers.delete(key);
      
      // Check if more timebank available
      const remaining = await this.getTimebankRemaining(gameId, playerId, dbV2);
      if (remaining > 0) {
        // Use more timebank
        await this.useTimebank({ gameId, playerId, roomId, currentTimebank: remaining, dbV2, io, onTimeout });
      } else {
        // Really timeout now
        if (onTimeout) {
          await onTimeout(gameId, playerId);
        }
      }
    }, timebankToUse);
    
    this.activeTimers.set(key, timerData);
    
    // Broadcast timebank usage
    if (io) {
      const seq = dbV2 ? await dbV2.incrementSequence(roomId) : Date.now();
      io.to(`room:${roomId}`).emit('timebank_used', {
        type: 'timebank_used',
        version: '1.0.0',
        seq: seq,
        timestamp: Date.now(),
        payload: {
          gameId,
          playerId,
          millisecondsUsed: timebankToUse,
          remaining: currentTimebank - timebankToUse
        }
      });
    }
    
    return true;
  }

  /**
   * Get remaining timebank for a player
   * NOTE: Using default timebank since we're using in-memory game state
   * The players table (UUID system) doesn't exist - we use game_states (TEXT system)
   */
  async getTimebankRemaining(gameId, playerId, dbV2) {
    // Return default timebank of 30 seconds
    // TODO: Read from room settings or game state when timebank is implemented
    return 30000; // 30 seconds in milliseconds
  }

  /**
   * Check if a timer is active for a player
   */
  hasActiveTimer(gameId, playerId) {
    const key = `${gameId}:${playerId}`;
    return this.activeTimers.has(key);
  }

  /**
   * Get all active timers (for monitoring)
   */
  getActiveTimers() {
    return Array.from(this.activeTimers.keys());
  }

  /**
   * Cleanup all timers (on shutdown)
   */
  cleanup() {
    console.log('🧹 Cleaning up all timers...');
    for (const [key, timerData] of this.activeTimers.entries()) {
      if (timerData && timerData.timerId) {
        clearTimeout(timerData.timerId);
      }
    }
    this.activeTimers.clear();
  }
}

// Export singleton instance
module.exports = new TimerService();
