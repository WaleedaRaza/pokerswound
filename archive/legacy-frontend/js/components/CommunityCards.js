/**
 * COMMUNITY CARDS COMPONENT
 * 
 * Purpose: Render community cards (flop, turn, river)
 * Responsibilities:
 * - Display community cards from gameState
 * - Handle progressive reveals (all-in runout)
 * - Format cards for display
 * 
 * Architecture: Pure rendering component (no state management)
 */

class CommunityCards {
  constructor(containerId) {
    this.containerId = containerId;
    this.container = null;
  }

  /**
   * INITIALIZE
   * Gets reference to container element
   */
  initialize() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`❌ [CommunityCards] Container not found: ${this.containerId}`);
    }
  }

  /**
   * RENDER
   * Renders community cards from gameState
   * 
   * @param {Object} gameState - Current game state
   */
  render(gameState) {
    if (!this.container) return;

    const cards = gameState.communityCards || [];
    const street = gameState.street || 'PREFLOP';

    // Clear container
    this.container.innerHTML = '';

    // Render cards
    cards.forEach((card, index) => {
      const cardEl = document.createElement('div');
      cardEl.className = 'community-card';
      cardEl.textContent = this.formatCard(card);
      cardEl.dataset.index = index;
      this.container.appendChild(cardEl);
    });

    // Add street label if cards exist
    if (cards.length > 0) {
      const streetLabel = document.createElement('div');
      streetLabel.className = 'street-label';
      streetLabel.textContent = street;
      this.container.appendChild(streetLabel);
    }
  }

  /**
   * ADD CARD
   * Adds a single card (for progressive reveals)
   * 
   * @param {string} card - Card code
   */
  addCard(card) {
    if (!this.container) return;

    const cardEl = document.createElement('div');
    cardEl.className = 'community-card';
    cardEl.textContent = this.formatCard(card);
    this.container.appendChild(cardEl);
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
  module.exports = CommunityCards;
} else {
  window.CommunityCards = CommunityCards;
}

