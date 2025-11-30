/**
 * TABLE RENDERER
 * 
 * Purpose: Main orchestrator for rendering poker table from state
 * Responsibilities:
 * - Coordinate all components (Seats, Pot, Actions, Cards)
 * - Use gameStateClient for state management
 * - Render from server state only (no guessing)
 * 
 * Architecture: State-driven renderer (single source of truth: server)
 */

class TableRenderer {
  constructor(userId, gameStateClient) {
    this.userId = userId;
    this.gameStateClient = gameStateClient;
    
    // Components
    this.seatComponents = new Map(); // seatIndex -> SeatComponent
    this.potDisplay = null;
    this.actionButtons = null;
    this.communityCards = null;
    
    // State
    this.seats = []; // Seat data from database
    this.myHoleCards = [];
    this.isSpectator = false;
  }

  /**
   * INITIALIZE
   * Initializes all components
   */
  initialize() {
    // Initialize pot display
    this.potDisplay = new PotDisplay('potDisplay');
    this.potDisplay.initialize();

    // Initialize action buttons
    this.actionButtons = new ActionButtons('actionButtons', this.gameStateClient, (action, amount) => {
      this.handleAction(action, amount);
    });
    this.actionButtons.initialize();

    // Initialize community cards
    this.communityCards = new CommunityCards('communityCards');
    this.communityCards.initialize();

    // Initialize seat components
    const seatsContainer = document.getElementById('seats');
    if (seatsContainer) {
      for (let i = 0; i < 10; i++) {
        const seatComponent = new SeatComponent(i, seatsContainer);
        this.seatComponents.set(i, seatComponent);
      }
    }

    // Listen for state changes
    this.gameStateClient.addStateListener((gameState) => {
      this.renderFromState(gameState);
    });
  }

  /**
   * SET SEATS
   * Sets seat data from database
   * 
   * @param {Array} seats - Seat data from database
   */
  setSeats(seats) {
    this.seats = seats;
  }

  /**
   * SET MY HOLE CARDS
   * Sets current user's hole cards
   * 
   * @param {Array} cards - Hole cards
   */
  setMyHoleCards(cards) {
    this.myHoleCards = cards || [];
  }

  /**
   * SET SPECTATOR STATUS
   * Sets whether user is spectator
   * 
   * @param {boolean} isSpectator - Spectator status
   */
  setSpectatorStatus(isSpectator) {
    this.isSpectator = isSpectator;
  }

  /**
   * RENDER FROM STATE
   * Renders entire table from gameState (single source of truth)
   * 
   * @param {Object} gameState - Current game state
   */
  renderFromState(gameState) {
    if (!gameState) {
      // No game state - render seats only
      this.renderSeats();
      return;
    }

    // Update gameStateClient state
    // (This should already be done by the client, but ensure it's synced)
    
    // Render pot
    if (this.potDisplay) {
      this.potDisplay.render(gameState);
    }

    // Render community cards
    if (this.communityCards) {
      this.communityCards.render(gameState);
    }

    // Render seats (with gameState player data)
    this.renderSeats(gameState);

    // Render action buttons
    if (this.actionButtons) {
      this.actionButtons.render(gameState, this.userId);
    }

    // Update position badges (handled by seat components)
    // Update current turn highlight (handled by seat components)
  }

  /**
   * RENDER SEATS
   * Renders all seats from seats data and gameState
   * 
   * @param {Object} gameState - Current game state (optional)
   */
  renderSeats(gameState = null) {
    const seatsContainer = document.getElementById('seats');
    if (!seatsContainer) return;

    seatsContainer.innerHTML = '';

    // Render each seat
    for (let i = 0; i < 10; i++) {
      const seat = this.seats[i] || null;
      const player = gameState?.players?.find(p => p.seatIndex === i);
      
      const seatComponent = this.seatComponents.get(i);
      if (!seatComponent) continue;

      const seatElement = seatComponent.render(
        seat,
        player,
        gameState,
        this.userId,
        this.myHoleCards,
        this.isSpectator
      );

      if (seatElement) {
        seatsContainer.appendChild(seatElement);
        
        // Update from gameState if available
        if (player && gameState) {
          seatComponent.updateFromGameState(player, gameState, this.userId, this.myHoleCards);
        }
      }
    }

    // Apply seat positions (circular layout)
    this.applySeatPositions();
  }

  /**
   * APPLY SEAT POSITIONS
   * Applies circular positioning to seats
   */
  applySeatPositions() {
    // This should match your existing seat positioning logic
    // For now, we'll use a simple circular layout
    const seats = document.querySelectorAll('.seat');
    const centerX = 800; // Table center X
    const centerY = 600; // Table center Y
    const radius = 450; // Radius for seat positions

    seats.forEach((seat, index) => {
      const seatIndex = parseInt(seat.dataset.seatIndex);
      const angle = (seatIndex * 2 * Math.PI) / 10 - Math.PI / 2; // Start at top
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);

      seat.style.position = 'absolute';
      seat.style.left = `${x}px`;
      seat.style.top = `${y}px`;
      seat.style.transform = 'translate(-50%, -50%)';
    });
  }

  /**
   * HANDLE ACTION
   * Handles action button click
   * 
   * @param {string} action - Action type
   * @param {number} amount - Action amount
   */
  handleAction(action, amount) {
    // Get current sequence from gameStateClient
    const currentState = this.gameStateClient.getState();
    const actionSeq = currentState?.actionSeq || 0;

    // Emit custom event for parent to handle
    const event = new CustomEvent('playerAction', {
      detail: { action, amount, actionSeq }
    });
    document.dispatchEvent(event);
  }

  /**
   * HANDLE STREET REVEAL
   * Handles progressive street reveal (all-in runout)
   * 
   * @param {string} street - Street name
   * @param {Array} cards - Cards revealed
   */
  handleStreetReveal(street, cards) {
    if (this.communityCards) {
      cards.forEach(card => {
        this.communityCards.addCard(card);
      });
    }
  }
}

// Export for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TableRenderer;
} else {
  window.TableRenderer = TableRenderer;
}

