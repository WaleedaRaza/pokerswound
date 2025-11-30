/**
 * GAME STATE CLIENT MODULE (Frontend)
 * 
 * Purpose: Frontend state management with sequence tracking
 * Responsibilities:
 * - Track game state with sequence numbers
 * - Handle out-of-order events
 * - Validate state consistency
 * - Provide state getters for UI
 * 
 * Architecture: Client-side state manager (complements backend state machine)
 * Maintains backward compatibility with existing frontend code
 */

class GameStateClient {
  constructor() {
    this.currentState = null;
    this.lastSeq = 0;
    this.pendingEvents = new Map(); // Store out-of-order events
    this.stateListeners = new Set(); // Callbacks for state changes
  }

  /**
   * UPDATE STATE
   * Updates state from server event
   * Handles sequence validation and out-of-order events
   * 
   * @param {Object} event - Server event with {type, seq, payload}
   * @returns {boolean} - True if state was updated
   */
  updateState(event) {
    if (!event || !event.payload) {
      console.warn('⚠️ [STATE] Invalid event received:', event);
      return false;
    }

    const eventSeq = event.seq || 0;

    // Handle out-of-order events
    if (eventSeq < this.lastSeq) {
      console.warn(`⚠️ [STATE] Out-of-order event: seq ${eventSeq} < lastSeq ${this.lastSeq}`);
      return false; // Ignore stale events
    }

    if (eventSeq > this.lastSeq + 1) {
      // Gap detected - store for later
      console.warn(`⚠️ [STATE] Gap detected: seq ${eventSeq} > lastSeq ${this.lastSeq + 1}, storing event`);
      this.pendingEvents.set(eventSeq, event);
      return false;
    }

    // Process event
    this.lastSeq = eventSeq;
    this.applyEvent(event);

    // Process any pending events that are now in order
    this.processPendingEvents();

    return true;
  }

  /**
   * APPLY EVENT
   * Applies event to current state
   * 
   * @param {Object} event - Server event
   */
  applyEvent(event) {
    const { type, payload } = event;

    switch (type) {
      case 'action_processed':
      case 'game_state_update':
        if (payload.gameState) {
          this.currentState = payload.gameState;
          this.notifyListeners();
        }
        break;

      case 'hand_started':
        if (payload.gameState) {
          this.currentState = payload.gameState;
          this.lastSeq = 0; // Reset sequence for new hand
          this.notifyListeners();
        }
        break;

      case 'hand_complete':
        if (payload.gameState) {
          this.currentState = payload.gameState;
          this.notifyListeners();
        }
        break;

      case 'street_reveal':
        if (payload.gameState) {
          // Merge street reveal into current state
          if (this.currentState) {
            this.currentState.communityCards = payload.gameState.communityCards || [];
            this.currentState.street = payload.gameState.street;
          } else {
            this.currentState = payload.gameState;
          }
          this.notifyListeners();
        }
        break;

      default:
        console.warn(`⚠️ [STATE] Unknown event type: ${type}`);
    }
  }

  /**
   * PROCESS PENDING EVENTS
   * Processes stored events that are now in order
   */
  processPendingEvents() {
    let nextSeq = this.lastSeq + 1;
    let processed = true;

    while (processed) {
      const event = this.pendingEvents.get(nextSeq);
      if (event) {
        this.pendingEvents.delete(nextSeq);
        this.lastSeq = nextSeq;
        this.applyEvent(event);
        nextSeq++;
      } else {
        processed = false;
      }
    }
  }

  /**
   * GET CURRENT STATE
   * Returns current game state
   * 
   * @returns {Object|null} - Current state or null
   */
  getState() {
    return this.currentState;
  }

  /**
   * GET MY PLAYER
   * Returns current user's player object
   * 
   * @param {string} userId - Current user's ID
   * @returns {Object|null} - Player object or null
   */
  getMyPlayer(userId) {
    if (!this.currentState || !this.currentState.players) {
      return null;
    }
    return this.currentState.players.find(p => p.userId === userId) || null;
  }

  /**
   * IS MY TURN
   * Checks if it's current user's turn
   * 
   * @param {string} userId - Current user's ID
   * @returns {boolean} - True if user's turn
   */
  isMyTurn(userId) {
    const myPlayer = this.getMyPlayer(userId);
    if (!myPlayer || !this.currentState) {
      return false;
    }
    return this.currentState.currentActorSeat === myPlayer.seatIndex;
  }

  /**
   * GET CALL AMOUNT
   * Calculates call amount for current user
   * 
   * @param {string} userId - Current user's ID
   * @returns {number} - Call amount needed
   */
  getCallAmount(userId) {
    const myPlayer = this.getMyPlayer(userId);
    if (!myPlayer || !this.currentState) {
      return 0;
    }

    const currentBet = this.currentState.currentBet || 0;
    const myBet = myPlayer.betThisStreet || 0;
    const callAmount = currentBet - myBet;

    return Math.max(0, Math.min(callAmount, myPlayer.chips || 0));
  }

  /**
   * CAN CHECK
   * Checks if current user can check
   * 
   * @param {string} userId - Current user's ID
   * @returns {boolean} - True if can check
   */
  canCheck(userId) {
    const myPlayer = this.getMyPlayer(userId);
    if (!myPlayer || !this.currentState) {
      return false;
    }

    const currentBet = this.currentState.currentBet || 0;
    const myBet = myPlayer.betThisStreet || 0;

    return currentBet === 0 || myBet >= currentBet;
  }

  /**
   * CAN CALL
   * Checks if current user can call
   * 
   * @param {string} userId - Current user's ID
   * @returns {boolean} - True if can call
   */
  canCall(userId) {
    const myPlayer = this.getMyPlayer(userId);
    if (!myPlayer || !this.currentState) {
      return false;
    }

    const callAmount = this.getCallAmount(userId);
    return callAmount > 0 && (myPlayer.chips || 0) >= callAmount;
  }

  /**
   * CAN RAISE
   * Checks if current user can raise
   * 
   * @param {string} userId - Current user's ID
   * @returns {boolean} - True if can raise
   */
  canRaise(userId) {
    const myPlayer = this.getMyPlayer(userId);
    if (!myPlayer || !this.currentState) {
      return false;
    }

    const currentBet = this.currentState.currentBet || 0;
    if (currentBet === 0) {
      return false; // Can't raise when no bet
    }

    const myBet = myPlayer.betThisStreet || 0;
    const callAmount = currentBet - myBet;
    const minRaise = this.currentState.lastRaiseSize || this.currentState.bigBlind || 0;
    const chipsAfterCall = (myPlayer.chips || 0) - callAmount;

    return chipsAfterCall >= minRaise;
  }

  /**
   * CALCULATE MIN RAISE AMOUNT
   * Calculates minimum raise amount
   * 
   * @param {Object} gameState - Game state (optional, uses currentState if not provided)
   * @returns {number} - Minimum raise amount
   */
  calculateMinRaiseAmount(gameState = null) {
    const state = gameState || this.currentState;
    if (!state) return 0;

    const currentBet = state.currentBet || 0;
    const minRaise = state.lastRaiseSize || state.bigBlind || 0;
    return currentBet + minRaise;
  }

  /**
   * ADD STATE LISTENER
   * Adds callback for state changes
   * 
   * @param {Function} callback - Callback function
   */
  addStateListener(callback) {
    this.stateListeners.add(callback);
  }

  /**
   * REMOVE STATE LISTENER
   * Removes callback for state changes
   * 
   * @param {Function} callback - Callback function
   */
  removeStateListener(callback) {
    this.stateListeners.delete(callback);
  }

  /**
   * NOTIFY LISTENERS
   * Notifies all listeners of state change
   */
  notifyListeners() {
    this.stateListeners.forEach(callback => {
      try {
        callback(this.currentState);
      } catch (error) {
        console.error('❌ [STATE] Listener error:', error);
      }
    });
  }

  /**
   * RESET STATE
   * Resets state (for new hand or disconnect)
   */
  resetState() {
    this.currentState = null;
    this.lastSeq = 0;
    this.pendingEvents.clear();
  }
}

// Export singleton instance
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameStateClient;
} else {
  // Browser global
  window.GameStateClient = GameStateClient;
}

