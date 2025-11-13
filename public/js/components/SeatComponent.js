/**
 * SEAT COMPONENT
 * 
 * Purpose: Render individual seat with player info, chips, cards, badges
 * Responsibilities:
 * - Render seat HTML from player data
 * - Update chips, cards, badges from gameState
 * - Handle seat click events
 * 
 * Architecture: Pure rendering component (no state management)
 */

class SeatComponent {
  constructor(seatIndex, container) {
    this.seatIndex = seatIndex;
    this.container = container;
    this.element = null;
  }

  /**
   * RENDER SEAT
   * Creates seat HTML element
   * 
   * @param {Object} seat - Seat data from database
   * @param {Object} player - Player data from gameState (optional)
   * @param {Object} gameState - Current game state (optional)
   * @param {string} userId - Current user's ID
   * @param {Array} myHoleCards - Current user's hole cards (optional)
   * @param {boolean} isSpectator - Whether user is spectator
   * @returns {HTMLElement} - Seat element
   */
  render(seat, player, gameState, userId, myHoleCards = [], isSpectator = false) {
    const isEmpty = !seat || !seat.userId;
    const isMe = seat && seat.userId === userId;
    const isGameActive = gameState && (gameState.status === 'IN_PROGRESS' || gameState.status === 'COMPLETED');
    
    // Skip empty seats if game is active AND user is NOT a spectator
    if (isEmpty && isGameActive && !isSpectator) {
      return null;
    }

    const div = document.createElement('div');
    div.className = 'seat';
    div.dataset.seatIndex = this.seatIndex;
    
    if (isEmpty) {
      div.className += ' empty';
    } else if (isMe) {
      div.className += ' taken me';
    } else {
      div.className += ' taken';
    }

    // Seat label
    const label = document.createElement('div');
    label.className = 'seat-label';
    label.textContent = `Seat ${this.seatIndex}`;
    if (isGameActive && !isEmpty) {
      label.style.display = 'none';
    }
    div.appendChild(label);

    // Player name
    const playerDiv = document.createElement('div');
    playerDiv.className = 'seat-player';
    if (seat && seat.nickname) {
      playerDiv.textContent = seat.nickname;
    } else if (seat && seat.username) {
      playerDiv.textContent = seat.username;
    }
    div.appendChild(playerDiv);

    // Chips display (use gameState player chips if available, else seat chips)
    const chipsDiv = document.createElement('div');
    chipsDiv.className = 'seat-chips';
    if (player && player.chips !== undefined) {
      chipsDiv.textContent = this.formatChipAmount(player.chips);
    } else if (seat && seat.chips_in_play) {
      chipsDiv.textContent = this.formatChipAmount(parseInt(seat.chips_in_play));
    } else {
      chipsDiv.textContent = '$0';
    }
    div.appendChild(chipsDiv);

    // Card backings container
    const cardBacksContainer = document.createElement('div');
    cardBacksContainer.className = 'seat-cards';
    cardBacksContainer.dataset.seatIndex = this.seatIndex;
    div.appendChild(cardBacksContainer);

    // Position badges container
    const badgesContainer = document.createElement('div');
    badgesContainer.className = 'position-badges';
    badgesContainer.dataset.seatIndex = this.seatIndex;
    div.appendChild(badgesContainer);

    // Bet display (if player has bet)
    if (player && player.bet > 0) {
      const betDiv = document.createElement('div');
      betDiv.className = 'seat-bet';
      betDiv.textContent = `Bet: $${player.bet}`;
      div.appendChild(betDiv);
    }

    this.element = div;
    return div;
  }

  /**
   * UPDATE FROM GAME STATE
   * Updates seat with player data from gameState
   * 
   * @param {Object} player - Player from gameState
   * @param {Object} gameState - Current game state
   * @param {string} userId - Current user's ID
   * @param {Array} myHoleCards - Current user's hole cards
   */
  updateFromGameState(player, gameState, userId, myHoleCards = []) {
    if (!this.element) return;

    // Update chips
    const chipsEl = this.element.querySelector('.seat-chips');
    if (chipsEl && player) {
      chipsEl.textContent = this.formatChipAmount(player.chips || 0);
    }

    // Update bet display
    const betEl = this.element.querySelector('.seat-bet');
    if (player && player.bet > 0) {
      if (!betEl) {
        const betDiv = document.createElement('div');
        betDiv.className = 'seat-bet';
        this.element.appendChild(betDiv);
      }
      const betDisplay = this.element.querySelector('.seat-bet');
      if (betDisplay) {
        betDisplay.textContent = `Bet: $${player.bet}`;
      }
    } else if (betEl) {
      betEl.remove();
    }

    // Update cards
    this.updateCards(player, gameState, userId, myHoleCards);

    // Update badges
    this.updateBadges(gameState);

    // Update current turn highlight
    if (gameState.currentActorSeat === this.seatIndex) {
      this.element.classList.add('current-turn');
    } else {
      this.element.classList.remove('current-turn');
    }

    // Update folded status
    if (player && player.folded) {
      this.element.classList.add('folded');
    } else {
      this.element.classList.remove('folded');
    }

    // Update all-in status
    if (player && player.status === 'ALL_IN') {
      this.element.classList.add('all-in');
    } else {
      this.element.classList.remove('all-in');
    }
  }

  /**
   * UPDATE CARDS
   * Updates card backings based on game state
   */
  updateCards(player, gameState, userId, myHoleCards = []) {
    const cardBacksContainer = this.element.querySelector('.seat-cards');
    if (!cardBacksContainer) return;

    cardBacksContainer.innerHTML = '';

    if (!player || !gameState) return;

    const shouldShowCards = gameState.status === 'IN_PROGRESS' || gameState.status === 'COMPLETED';
    if (!shouldShowCards) return;

    const isMe = player.userId === userId;
    const isSpectator = !isMe;

    // Show cards based on visibility rules
    if (isMe && myHoleCards.length === 2) {
      // My cards - show actual cards
      myHoleCards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card-back my-card';
        cardEl.textContent = this.formatCard(card);
        cardBacksContainer.appendChild(cardEl);
      });
    } else if (player.shownCards && player.shownCards.length > 0) {
      // Shown cards (showdown)
      player.shownCards.forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card-back shown-card';
        cardEl.textContent = this.formatCard(card);
        cardBacksContainer.appendChild(cardEl);
      });
    } else if (player.folded) {
      // Folded - show muck
      const muckEl = document.createElement('div');
      muckEl.className = 'card-back muck';
      muckEl.textContent = 'MUCK';
      cardBacksContainer.appendChild(muckEl);
    } else {
      // Active player - show card backs
      for (let i = 0; i < 2; i++) {
        const cardBack = document.createElement('div');
        cardBack.className = 'card-back';
        cardBack.textContent = '🂠';
        cardBacksContainer.appendChild(cardBack);
      }
    }
  }

  /**
   * UPDATE BADGES
   * Updates position badges (dealer, SB, BB)
   */
  updateBadges(gameState) {
    const badgesContainer = this.element.querySelector('.position-badges');
    if (!badgesContainer || !gameState) return;

    badgesContainer.innerHTML = '';

    if (gameState.status !== 'IN_PROGRESS' && gameState.status !== 'COMPLETED') return;

    // Dealer badge
    if (gameState.dealerPosition === this.seatIndex) {
      const badge = document.createElement('span');
      badge.className = 'position-badge dealer';
      badge.textContent = 'D';
      badge.title = 'Dealer';
      badgesContainer.appendChild(badge);
    }

    // Small blind badge
    if (gameState.sbPosition === this.seatIndex) {
      const badge = document.createElement('span');
      badge.className = 'position-badge sb';
      badge.textContent = 'SB';
      badge.title = 'Small Blind';
      badgesContainer.appendChild(badge);
    }

    // Big blind badge
    if (gameState.bbPosition === this.seatIndex) {
      const badge = document.createElement('span');
      badge.className = 'position-badge bb';
      badge.textContent = 'BB';
      badge.title = 'Big Blind';
      badgesContainer.appendChild(badge);
    }
  }

  /**
   * FORMAT CHIP AMOUNT
   * Formats chip amount for display
   */
  formatChipAmount(amount) {
    return `$${amount.toLocaleString()}`;
  }

  /**
   * FORMAT CARD
   * Formats card code for display
   */
  formatCard(card) {
    if (!card || card.length !== 2) return card;
    const rank = card[0].toUpperCase();
    const suit = card[1].toLowerCase();
    const suitSymbols = { h: '♥', d: '♦', c: '♣', s: '♠' };
    return `${rank}${suitSymbols[suit] || suit}`;
  }
}

// Export for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SeatComponent;
} else {
  window.SeatComponent = SeatComponent;
}

