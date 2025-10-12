/**
 * PokerDisplayState - Frontend state manager that processes events
 * 
 * KEY INSIGHT: This solves the race condition by:
 * 1. Maintaining its own display state (separate from backend)
 * 2. Processing events in a queue when animating
 * 3. Controlling WHEN things update (not backend)
 * 
 * Flow:
 * - Backend sends events (facts about what happened)
 * - Frontend queues events if animating
 * - Frontend applies events when ready
 * - No more race conditions!
 */
class PokerDisplayState {
  constructor() {
    // Card image mapping (server format -> image file)
    this.CARD_MAPPING = {
      'SA': 'spades_A.png', 'S2': 'spades_2.png', 'S3': 'spades_3.png', 'S4': 'spades_4.png',
      'S5': 'spades_5.png', 'S6': 'spades_6.png', 'S7': 'spades_7.png', 'S8': 'spades_8.png',
      'S9': 'spades_9.png', 'ST': 'spades_10.png', 'SJ': 'spades_J.png', 'SQ': 'spades_Q.png', 'SK': 'spades_K.png',
      'HA': 'hearts_A.png', 'H2': 'hearts_2.png', 'H3': 'hearts_3.png', 'H4': 'hearts_4.png',
      'H5': 'hearts_5.png', 'H6': 'hearts_6.png', 'H7': 'hearts_7.png', 'H8': 'hearts_8.png',
      'H9': 'hearts_9.png', 'HT': 'hearts_10.png', 'HJ': 'hearts_J.png', 'HQ': 'hearts_Q.png', 'HK': 'hearts_K.png',
      'DA': 'diamonds_A.png', 'D2': 'diamonds_2.png', 'D3': 'diamonds_3.png', 'D4': 'diamonds_4.png',
      'D5': 'diamonds_5.png', 'D6': 'diamonds_6.png', 'D7': 'diamonds_7.png', 'D8': 'diamonds_8.png',
      'D9': 'diamonds_9.png', 'DT': 'diamonds_10.png', 'DJ': 'diamonds_J.png', 'DQ': 'diamonds_Q.png', 'DK': 'diamonds_K.png',
      'CA': 'clubs_A.png', 'C2': 'clubs_2.png', 'C3': 'clubs_3.png', 'C4': 'clubs_4.png',
      'C5': 'clubs_5.png', 'C6': 'clubs_6.png', 'C7': 'clubs_7.png', 'C8': 'clubs_8.png',
      'C9': 'clubs_9.png', 'CT': 'clubs_10.png', 'CJ': 'clubs_J.png', 'CQ': 'clubs_Q.png', 'CK': 'clubs_K.png'
    };
    
    this.CACHE_BUSTER = `?v=${Date.now()}&cb=${Math.random()}`;
    
    // Display state
    this.players = new Map(); // playerId -> {name, stack, betThisStreet, ...}
    this.pot = 0;
    this.communityCards = [];
    this.currentStreet = 'PREFLOP';
    
    // Event processing
    this.eventQueue = [];
    this.isProcessingAnimation = false;
    this.animationPromise = null;
    
    // UI references (set these after DOM is ready)
    this.potElement = null;
    this.communityCardsElement = null;
    this.playersGridElement = null;
    this.statusElement = null;
    
    // Config
    this.CARD_REVEAL_DELAY = 1000; // ms per card
    this.CHIP_TRANSFER_DELAY = 500; // ms for chip animation
  }

  /**
   * Initialize with DOM elements
   */
  setElements(potEl, communityCardsEl, playersGridEl, statusEl) {
    this.potElement = potEl;
    this.communityCardsElement = communityCardsEl;
    this.playersGridElement = playersGridEl;
    this.statusElement = statusEl;
  }

  /**
   * Receive event from backend
   * This is called by Socket.IO listener
   */
  receiveEvent(event) {
    console.log(`📥 Event received: ${event.type}`, event.data);
    
    if (this.isProcessingAnimation) {
      // Queue it for later
      this.eventQueue.push(event);
      console.log(`  ⏸️  Queued (animation in progress), queue size: ${this.eventQueue.length}`);
    } else {
      // Apply immediately
      this.applyEvent(event);
    }
  }

  /**
   * Apply event to display state
   * Returns a Promise if the event triggers an animation
   */
  async applyEvent(event) {
    try {
      switch(event.type) {
        case GameEventType.HAND_STARTED:
          await this.handleHandStarted(event.data);
          break;

        case GameEventType.PLAYER_FOLDED:
        case GameEventType.PLAYER_CHECKED:
        case GameEventType.PLAYER_CALLED:
        case GameEventType.PLAYER_RAISED:
        case GameEventType.PLAYER_BET:
        case GameEventType.PLAYER_WENT_ALL_IN:
          await this.handlePlayerAction(event.data);
          break;

        case GameEventType.CHIPS_COMMITTED_TO_POT:
          await this.handleChipsCommittedToPot(event.data);
          break;

        case GameEventType.ALL_IN_RUNOUT_STARTED:
          await this.handleAllInRunoutStarted(event.data);
          break;

        case GameEventType.FLOP_REVEALED:
          await this.handleFlopRevealed(event.data);
          break;

        case GameEventType.TURN_REVEALED:
          await this.handleTurnRevealed(event.data);
          break;

        case GameEventType.RIVER_REVEALED:
          await this.handleRiverRevealed(event.data);
          break;

        case GameEventType.WINNER_DETERMINED:
          await this.handleWinnerDetermined(event.data);
          break;

        case GameEventType.POT_AWARDED:
          await this.handlePotAwarded(event.data);
          break;

        case GameEventType.CHIPS_TRANSFERRED_TO_WINNER:
          await this.handleChipsTransferredToWinner(event.data);
          break;

        case GameEventType.HAND_ENDED:
          await this.handleHandEnded(event.data);
          break;

        case GameEventType.TURN_STARTED:
          await this.handleTurnStarted(event.data);
          break;

        default:
          console.warn(`⚠️  Unhandled event type: ${event.type}`);
      }
    } catch (error) {
      console.error(`❌ Error applying event ${event.type}:`, error);
    }
  }

  /**
   * Process next queued event
   */
  async processNextEvent() {
    if (this.eventQueue.length > 0 && !this.isProcessingAnimation) {
      const nextEvent = this.eventQueue.shift();
      console.log(`▶️  Processing queued event: ${nextEvent.type}, ${this.eventQueue.length} remaining`);
      await this.applyEvent(nextEvent);
    }
  }

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  async handleHandStarted(data) {
    console.log(`🎴 Hand started: #${data.handNumber}`);
    
    // Reset state
    this.players.clear();
    this.pot = 0;
    this.communityCards = [];
    this.currentStreet = 'PREFLOP';
    
    // Initialize players
    data.players.forEach(p => {
      this.players.set(p.id, {
        id: p.id,
        name: p.name,
        stack: p.stack,
        seatIndex: p.seatIndex,
        betThisStreet: 0,
        userId: p.userId
      });
    });
    
    // Render
    this.renderPot();
    this.renderCommunityCards();
    this.showStatus(`Hand #${data.handNumber} started`, 'info');
  }

  async handlePlayerAction(data) {
    console.log(`🎲 Player action: ${data.playerName} ${data.action}${data.amount ? ` $${data.amount}` : ''}`);
    this.showStatus(`${data.playerName} ${data.action}${data.amount ? ` $${data.amount}` : ''}`, 'info');
  }

  async handleChipsCommittedToPot(data) {
    console.log(`💰 Chips committed: ${data.playerName} → pot ($${data.amount})`);
    
    // Update player stack
    const player = this.players.get(data.playerId);
    if (player) {
      player.stack = data.newStack;
      player.betThisStreet = data.amount;
      this.updatePlayerDisplay(data.playerId);
    }
    
    // Update pot
    this.pot = data.newPot;
    this.renderPot();
  }

  async handleAllInRunoutStarted(data) {
    console.log(`🎬 All-in runout started! Revealing: ${data.streetsToReveal.join(', ')}`);
    
    // Enter animation mode
    this.isProcessingAnimation = true;
    
    // Update all-in players to show stack = 0
    data.playersAllIn.forEach(p => {
      const player = this.players.get(p.id);
      if (player) {
        player.stack = 0;
        this.updatePlayerDisplay(p.id);
      }
    });
    
    this.showStatus('All-in! Dealing remaining cards...', 'warning');
  }

  async handleFlopRevealed(data) {
    console.log(`🃏 Flop revealed: ${data.cards.join(', ')}`);
    this.currentStreet = 'FLOP';
    
    // Animate cards one by one
    this.isProcessingAnimation = true;
    for (const card of data.cards) {
      this.communityCards.push(card);
      this.renderCommunityCards();
      await this.delay(this.CARD_REVEAL_DELAY);
    }
    this.isProcessingAnimation = false;
    
    // Process next event
    await this.processNextEvent();
  }

  async handleTurnRevealed(data) {
    console.log(`🃏 Turn revealed: ${data.card}`);
    this.currentStreet = 'TURN';
    
    this.isProcessingAnimation = true;
    this.communityCards.push(data.card);
    this.renderCommunityCards();
    await this.delay(this.CARD_REVEAL_DELAY);
    this.isProcessingAnimation = false;
    
    await this.processNextEvent();
  }

  async handleRiverRevealed(data) {
    console.log(`🃏 River revealed: ${data.card}`);
    this.currentStreet = 'RIVER';
    
    this.isProcessingAnimation = true;
    this.communityCards.push(data.card);
    this.renderCommunityCards();
    await this.delay(this.CARD_REVEAL_DELAY);
    this.isProcessingAnimation = false;
    
    await this.processNextEvent();
  }

  async handleWinnerDetermined(data) {
    console.log(`🏆 Winner(s) determined:`, data.winners);
    
    const winnerNames = data.winners.map(w => w.playerName).join(', ');
    this.showStatus(`🏆 ${winnerNames} wins!`, 'success');
  }

  async handlePotAwarded(data) {
    console.log(`💰 Pot awarded: ${data.winnerName} wins $${data.amount}`);
    // Just logging, actual chip transfer comes next
  }

  async handleChipsTransferredToWinner(data) {
    console.log(`💸 Transferring $${data.amount} to ${data.winnerName}`);
    
    // THIS IS THE KEY: Winner's stack only updates HERE, not before
    this.isProcessingAnimation = true;
    
    // Animate pot → 0
    this.pot = 0;
    this.renderPot();
    await this.delay(this.CHIP_TRANSFER_DELAY);
    
    // Update winner's stack
    const winner = this.players.get(data.winnerId);
    if (winner) {
      winner.stack = data.newStack;
      this.updatePlayerDisplay(data.winnerId, true); // true = highlight
    }
    
    this.isProcessingAnimation = false;
    
    // Process next event
    await this.processNextEvent();
  }

  async handleHandEnded(data) {
    console.log(`🏁 Hand ended`);
    // Clean up, reset for next hand
    this.isProcessingAnimation = false;
    
    // Process any remaining queued events
    while (this.eventQueue.length > 0) {
      await this.processNextEvent();
    }
  }

  async handleTurnStarted(data) {
    console.log(`⏰ ${data.playerName}'s turn`);
    this.showStatus(`${data.playerName}'s turn`, 'info');
  }

  // ==========================================
  // UI RENDERING
  // ==========================================

  renderPot() {
    if (this.potElement) {
      this.potElement.textContent = this.pot;
    }
  }

  renderCommunityCards() {
    if (!this.communityCardsElement) return;
    
    this.communityCardsElement.innerHTML = '';
    
    this.communityCards.forEach(card => {
      const imageName = this.CARD_MAPPING[card];
      if (!imageName) {
        console.warn(`⚠️ No mapping for card: ${card}`);
        return;
      }
      
      const cardEl = document.createElement('img');
      cardEl.src = `/cards/${imageName}${this.CACHE_BUSTER}`;
      cardEl.className = 'card';
      cardEl.style.cssText = 'width: 60px; height: 84px; margin: 2px; border-radius: 4px;';
      this.communityCardsElement.appendChild(cardEl);
      
      console.log(`🃏 Rendered card: ${card} -> ${imageName}`);
    });
  }

  updatePlayerDisplay(playerId, highlight = false) {
    if (!this.playersGridElement) return;
    
    const player = this.players.get(playerId);
    if (!player) return;
    
    // Find player's card in DOM
    const playerCards = this.playersGridElement.querySelectorAll('.player-card');
    playerCards.forEach(card => {
      const nameEl = card.querySelector('.player-name');
      if (nameEl && nameEl.textContent === player.name) {
        const stackEl = card.querySelector('.player-stack');
        if (stackEl) {
          stackEl.textContent = `$${player.stack}`;
          
          // Highlight winner
          if (highlight) {
            stackEl.style.animation = 'pulse 0.5s ease-in-out';
            setTimeout(() => {
              stackEl.style.animation = '';
            }, 500);
          }
        }
      }
    });
  }

  showStatus(message, type = 'info') {
    if (this.statusElement) {
      this.statusElement.textContent = message;
      this.statusElement.className = `status-message ${type}`;
    }
    console.log(`📢 Status: ${message}`);
  }

  // ==========================================
  // UTILITIES
  // ==========================================

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current display state (for debugging)
   */
  getState() {
    return {
      players: Array.from(this.players.values()),
      pot: this.pot,
      communityCards: this.communityCards,
      currentStreet: this.currentStreet,
      isAnimating: this.isProcessingAnimation,
      queueSize: this.eventQueue.length
    };
  }

  /**
   * Clear all state (for debugging)
   */
  reset() {
    this.players.clear();
    this.pot = 0;
    this.communityCards = [];
    this.currentStreet = 'PREFLOP';
    this.eventQueue = [];
    this.isProcessingAnimation = false;
  }
}

