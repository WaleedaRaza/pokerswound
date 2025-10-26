/**
 * GameStateHydrator - Production-grade game state management
 * 
 * This service provides automatic hydration of game state from the database,
 * treating the database as the single source of truth while maintaining
 * an in-memory cache for performance.
 */

const { GameStateModel } = require('../dist/core/models/game-state');
const { PlayerModel } = require('../dist/core/models/player');

class GameStateHydrator {
  constructor(db, games, playerUserIds, gameStatesRepository) {
    this.db = db;
    this.games = games; // In-memory cache
    this.playerUserIds = playerUserIds; // In-memory userId mappings
    this.gameStatesRepository = gameStatesRepository;
    
    // Cache configuration
    this.cacheStats = {
      hits: 0,
      misses: 0,
      hydrations: 0,
      errors: 0
    };
    
    // TTL for cache entries (5 minutes)
    this.cacheTTL = 5 * 60 * 1000;
    this.cacheTimestamps = new Map();
  }

  /**
   * Get game state, hydrating from database if necessary
   * @param {string} gameId - The game ID to retrieve
   * @returns {Promise<GameStateModel|null>} The game state or null if not found
   */
  async hydrateGame(gameId) {
    try {
      // Check memory cache first
      const cachedGame = this.games.get(gameId);
      const cacheTimestamp = this.cacheTimestamps.get(gameId);
      
      // If cached and not expired, return it
      if (cachedGame && cacheTimestamp && (Date.now() - cacheTimestamp < this.cacheTTL)) {
        this.cacheStats.hits++;
        return cachedGame;
      }
      
      this.cacheStats.misses++;
      
      // Load from database
      console.log(`🔄 [HYDRATION] Game ${gameId} not in memory, checking database...`);
      
      const result = await this.db.query(
        `SELECT current_state, room_id, status, version 
         FROM game_states 
         WHERE id = $1 
         AND status NOT IN ('COMPLETED', 'completed', 'deleted')`,
        [gameId]
      );
      
      if (result.rows.length === 0) {
        console.log(`❌ [HYDRATION] Game ${gameId} not found in database`);
        // Remove from cache if it exists
        this.games.delete(gameId);
        this.cacheTimestamps.delete(gameId);
        this.playerUserIds.delete(gameId);
        return null;
      }
      
      const { current_state: snapshot, room_id, status, version } = result.rows[0];
      
      if (!snapshot) {
        console.error(`❌ [HYDRATION] Game ${gameId} has null state in database`);
        return null;
      }
      
      // Reconstruct GameStateModel from snapshot
      const gameState = this.reconstructGameState(snapshot);
      if (!gameState) {
        console.error(`❌ [HYDRATION] Failed to reconstruct game ${gameId}`);
        return null;
      }
      
      // Restore room association
      gameState.roomId = room_id;
      
      // Store in memory cache
      this.games.set(gameId, gameState);
      this.cacheTimestamps.set(gameId, Date.now());
      
      // Reconstruct player-user mappings
      const userIdMap = new Map();
      if (snapshot.players) {
        snapshot.players.forEach(playerData => {
          if (playerData.userId) {
            userIdMap.set(playerData.id, playerData.userId);
          }
        });
      }
      this.playerUserIds.set(gameId, userIdMap);
      
      this.cacheStats.hydrations++;
      console.log(`✅ [HYDRATION] Game ${gameId} restored from database (version: ${version})`);
      
      return gameState;
      
    } catch (error) {
      console.error(`❌ [HYDRATION] Error hydrating game ${gameId}:`, error);
      this.cacheStats.errors++;
      return null;
    }
  }

  /**
   * Reconstruct GameStateModel from database snapshot
   * @private
   */
  reconstructGameState(snapshot) {
    try {
      // Handle both direct snapshot and nested structure
      const stateData = snapshot.current_state || snapshot;
      
      // Create new GameStateModel
      const gameState = new GameStateModel({
        id: stateData.id,
        configuration: stateData.configuration,
        createdAt: stateData.createdAt
      });
      
      // Restore state properties
      gameState.status = stateData.status;
      gameState.currentStreet = stateData.currentStreet;
      gameState.toAct = stateData.toAct;
      gameState.version = stateData.version || 1;
      gameState.updatedAt = stateData.updatedAt;
      
      // Restore complex objects
      if (stateData.handState) {
        gameState.handState = {
          ...stateData.handState,
          communityCards: (stateData.handState.communityCards || []).map(c => 
            typeof c === 'string' ? c : c.toString()
          ),
          deck: stateData.handState.deck || []
        };
      }
      
      if (stateData.bettingRound) {
        gameState.bettingRound = { ...stateData.bettingRound };
      }
      
      if (stateData.pot) {
        gameState.pot = {
          ...stateData.pot,
          sidePots: (stateData.pot.sidePots || []).map(sp => ({
            ...sp,
            eligiblePlayers: new Set(sp.eligiblePlayers || [])
          }))
        };
      }
      
      if (stateData.timing) {
        gameState.timing = { ...stateData.timing };
      }
      
      if (stateData.actionHistory) {
        gameState.actionHistory = stateData.actionHistory;
      }
      
      // Reconstruct players
      gameState.players.clear();
      if (stateData.players && Array.isArray(stateData.players)) {
        stateData.players.forEach(playerData => {
          const player = new PlayerModel({
            uuid: playerData.id || playerData.uuid,
            name: playerData.name,
            stack: playerData.stack,
            seatIndex: playerData.seatIndex
          });
          
          // Restore player state
          player.isActive = playerData.isActive !== undefined ? playerData.isActive : true;
          player.hasFolded = playerData.hasFolded || false;
          player.isAllIn = playerData.isAllIn || false;
          player.betThisStreet = playerData.betThisStreet || 0;
          player.totalPotContribution = playerData.totalPotContribution || 0;
          
          // Restore hole cards if present
          if (playerData.holeCards && playerData.holeCards.length > 0) {
            player.holeCards = playerData.holeCards.map(c => 
              typeof c === 'string' ? c : c.toString()
            );
          }
          
          // Restore betting round state
          if (playerData.bettingRound) {
            player.bettingRound = { ...playerData.bettingRound };
          }
          
          gameState.players.set(player.uuid, player);
        });
      }
      
      return gameState;
      
    } catch (error) {
      console.error('❌ [HYDRATION] Error reconstructing game state:', error);
      return null;
    }
  }

  /**
   * Hydrate all active games from database
   * Used on server startup to restore state
   */
  async hydrateAllActiveGames() {
    try {
      console.log('🔄 [HYDRATION] Restoring all active games from database...');
      
      const result = await this.db.query(
        `SELECT id, current_state, room_id, status, version
         FROM game_states 
         WHERE status NOT IN ('COMPLETED', 'completed', 'deleted') 
         ORDER BY updated_at DESC`
      );
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const row of result.rows) {
        try {
          const gameState = this.reconstructGameState(row.current_state);
          if (gameState) {
            gameState.roomId = row.room_id;
            
            // Store in memory
            this.games.set(row.id, gameState);
            this.cacheTimestamps.set(row.id, Date.now());
            
            // Reconstruct user mappings
            const userIdMap = new Map();
            if (row.current_state.players) {
              row.current_state.players.forEach(playerData => {
                if (playerData.userId) {
                  userIdMap.set(playerData.id || playerData.uuid, playerData.userId);
                }
              });
            }
            this.playerUserIds.set(row.id, userIdMap);
            
            successCount++;
            console.log(`✅ [HYDRATION] Restored game ${row.id} (status: ${row.status})`);
          } else {
            errorCount++;
          }
        } catch (error) {
          console.error(`❌ [HYDRATION] Failed to restore game ${row.id}:`, error);
          errorCount++;
        }
      }
      
      console.log(`✅ [HYDRATION] Startup complete: ${successCount} games restored, ${errorCount} errors`);
      this.cacheStats.hydrations += successCount;
      
      return { successCount, errorCount, total: result.rows.length };
      
    } catch (error) {
      console.error('❌ [HYDRATION] Error during startup hydration:', error);
      throw error;
    }
  }

  /**
   * Clear expired entries from cache
   */
  cleanupCache() {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [gameId, timestamp] of this.cacheTimestamps) {
      if (now - timestamp > this.cacheTTL) {
        this.games.delete(gameId);
        this.cacheTimestamps.delete(gameId);
        this.playerUserIds.delete(gameId);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`🧹 [HYDRATION] Cleaned ${cleaned} expired games from cache`);
    }
  }

  /**
   * Get hydration statistics
   */
  getStats() {
    return {
      ...this.cacheStats,
      cacheSize: this.games.size,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0
    };
  }

  /**
   * Force refresh a game from database
   */
  async refreshGame(gameId) {
    // Remove from cache
    this.games.delete(gameId);
    this.cacheTimestamps.delete(gameId);
    this.playerUserIds.delete(gameId);
    
    // Hydrate fresh from database
    return await this.hydrateGame(gameId);
  }
}

module.exports = GameStateHydrator;
