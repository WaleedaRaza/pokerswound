// ⚔️ GAME STATE MANAGER - Centralized state for consistent UI
// WEEK 2 DAY 5: Frontend State Management

/**
 * GameStateManager: Single source of truth for frontend game state
 * 
 * Responsibilities:
 * - Store and update game state from server
 * - Provide consistent interface for UI queries
 * - Handle socket reconnection and state recovery
 * - Persist critical state to localStorage
 * - Manage optimistic updates
 */

class GameStateManager {
  constructor() {
    this.state = {
      // Room info
      roomId: null,
      gameId: null,
      
      // Player info
      myUserId: null,
      myPlayerId: null,
      mySeatIndex: null,
      
      // Game state
      players: [], // Array of player objects
      pot: 0,
      currentBet: 0,
      currentStreet: 'PREFLOP',
      communityCards: [],
      
      // Turn tracking
      toAct: null, // Player ID whose turn it is
      
      // Hand state
      isHandActive: false,
      isMyTurn: false,
      
      // Connection state
      isConnected: false,
      lastSync: null
    };
    
    // State change listeners
    this.listeners = [];
    
    // Load persisted state from localStorage
    this.loadPersistedState();
    
    console.log('🎮 GameStateManager initialized');
  }
  
  /**
   * Update state with new data from server
   * @param {Object} newState - Partial or full state update
   */
  updateState(newState) {
    const oldState = { ...this.state };
    
    // Merge new state
    this.state = {
      ...this.state,
      ...newState,
      lastSync: Date.now()
    };
    
    // Recalculate derived state
    this._updateDerivedState();
    
    // Persist critical state
    this.persistState();
    
    // Notify listeners
    this._notifyListeners(oldState, this.state);
    
    console.log('🔄 State updated:', this.state);
  }
  
  /**
   * Update derived state (computed properties)
   */
  _updateDerivedState() {
    // Check if it's my turn
    this.state.isMyTurn = (
      this.state.toAct === this.state.myPlayerId &&
      this.state.isHandActive
    );
    
    // Find my player object
    const myPlayer = this.state.players.find(p => 
      p.id === this.state.myPlayerId || 
      p.userId === this.state.myUserId
    );
    
    if (myPlayer) {
      this.state.mySeatIndex = myPlayer.seatIndex;
    }
  }
  
  /**
   * Initialize state for a new game
   */
  initializeGame(roomId, gameId, userId) {
    this.updateState({
      roomId,
      gameId,
      myUserId: userId,
      isHandActive: false
    });
    
    console.log('🎮 Game initialized:', { roomId, gameId, userId });
  }
  
  /**
   * Update player list
   */
  updatePlayers(players) {
    this.updateState({ players });
  }
  
  /**
   * Update pot and bet amounts
   */
  updatePot(pot, currentBet) {
    this.updateState({ 
      pot: pot || this.state.pot,
      currentBet: currentBet !== undefined ? currentBet : this.state.currentBet
    });
  }
  
  /**
   * Update community cards
   */
  updateCommunityCards(cards) {
    this.updateState({ communityCards: cards });
  }
  
  /**
   * Update current street
   */
  updateStreet(street) {
    this.updateState({ currentStreet: street });
  }
  
  /**
   * Update whose turn it is
   */
  updateTurn(playerId) {
    this.updateState({ 
      toAct: playerId,
      isHandActive: true
    });
  }
  
  /**
   * Mark hand as complete
   */
  completeHand() {
    this.updateState({
      isHandActive: false,
      isMyTurn: false,
      toAct: null
    });
  }
  
  /**
   * Get current player (whose turn it is)
   */
  getCurrentPlayer() {
    return this.state.players.find(p => p.id === this.state.toAct);
  }
  
  /**
   * Get my player object
   */
  getMyPlayer() {
    return this.state.players.find(p => 
      p.id === this.state.myPlayerId || 
      p.userId === this.state.myUserId
    );
  }
  
  /**
   * Check if it's my turn
   */
  isMyTurn() {
    return this.state.isMyTurn;
  }
  
  /**
   * Check if I can take action
   */
  canTakeAction() {
    return this.state.isMyTurn && this.state.isHandActive;
  }
  
  /**
   * Get my seat index
   */
  getMySeatIndex() {
    return this.state.mySeatIndex;
  }
  
  /**
   * Get full state (for debugging)
   */
  getState() {
    return { ...this.state };
  }
  
  /**
   * Set connection status
   */
  setConnected(isConnected) {
    this.updateState({ isConnected });
  }
  
  /**
   * Reset state (for leaving game)
   */
  reset() {
    this.state = {
      roomId: null,
      gameId: null,
      myUserId: this.state.myUserId, // Keep user ID
      myPlayerId: null,
      mySeatIndex: null,
      players: [],
      pot: 0,
      currentBet: 0,
      currentStreet: 'PREFLOP',
      communityCards: [],
      toAct: null,
      isHandActive: false,
      isMyTurn: false,
      isConnected: false,
      lastSync: null
    };
    
    this.clearPersistedState();
    console.log('🔄 State reset');
  }
  
  /**
   * Persist critical state to localStorage
   */
  persistState() {
    try {
      const persistData = {
        roomId: this.state.roomId,
        gameId: this.state.gameId,
        myUserId: this.state.myUserId,
        myPlayerId: this.state.myPlayerId,
        mySeatIndex: this.state.mySeatIndex
      };
      
      localStorage.setItem('gameState', JSON.stringify(persistData));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }
  
  /**
   * Load persisted state from localStorage
   */
  loadPersistedState() {
    try {
      const persistedData = localStorage.getItem('gameState');
      if (persistedData) {
        const data = JSON.parse(persistedData);
        this.state = {
          ...this.state,
          ...data
        };
        console.log('📦 Loaded persisted state:', data);
      }
    } catch (error) {
      console.error('Failed to load persisted state:', error);
    }
  }
  
  /**
   * Clear persisted state
   */
  clearPersistedState() {
    localStorage.removeItem('gameState');
  }
  
  /**
   * Add state change listener
   */
  addListener(callback) {
    this.listeners.push(callback);
  }
  
  /**
   * Remove state change listener
   */
  removeListener(callback) {
    this.listeners = this.listeners.filter(l => l !== callback);
  }
  
  /**
   * Notify all listeners of state change
   */
  _notifyListeners(oldState, newState) {
    this.listeners.forEach(listener => {
      try {
        listener(newState, oldState);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }
  
  /**
   * Fetch current game state from server (for reconnection)
   */
  async syncWithServer() {
    if (!this.state.roomId) {
      console.warn('Cannot sync: no roomId');
      return false;
    }
    
    try {
      const response = await fetch(`/api/rooms/${this.state.roomId}/game`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.gameId) {
          // Game is active, update state
          this.updateState({
            gameId: data.gameId,
            isHandActive: true,
            // Server will send full state via socket
          });
          
          console.log('✅ Synced with server:', data);
          return true;
        } else {
          // No active game
          console.log('ℹ️ No active game on server');
          return false;
        }
      } else {
        console.error('Sync failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('Sync error:', error);
      return false;
    }
  }
}

// Export for use in poker.html
window.GameStateManager = GameStateManager;

console.log('✅ GameStateManager loaded');

