/**
 * POT DISPLAY COMPONENT
 * 
 * Purpose: Render pot display (main pot, side pots, total)
 * Responsibilities:
 * - Display main pot
 * - Display side pots if any
 * - Display total pot for chip conservation validation
 * 
 * Architecture: Pure rendering component (no state management)
 */

class PotDisplay {
  constructor(containerId) {
    this.containerId = containerId;
    this.mainPotEl = null;
    this.sidePotsContainer = null;
    this.sidePotsList = null;
    this.totalPotEl = null;
  }

  /**
   * INITIALIZE
   * Gets references to DOM elements
   */
  initialize() {
    this.mainPotEl = document.getElementById('mainPotAmount');
    this.sidePotsContainer = document.getElementById('sidePotsContainer');
    this.sidePotsList = document.getElementById('sidePotsList');
    this.totalPotEl = document.getElementById('totalPotAmount');
  }

  /**
   * RENDER
   * Renders pot display from gameState
   * 
   * @param {Object} gameState - Current game state
   */
  render(gameState) {
    if (!gameState) return;

    const mainPot = gameState.mainPot !== undefined ? gameState.mainPot : (gameState.pot || 0);
    const sidePots = gameState.sidePots || [];
    const totalPot = gameState.totalPot !== undefined 
      ? gameState.totalPot 
      : (mainPot + sidePots.reduce((sum, pot) => sum + (pot.amount || 0), 0));

    // Update main pot
    if (this.mainPotEl) {
      this.mainPotEl.textContent = this.formatChipAmount(mainPot);
    }

    // Update side pots
    if (this.sidePotsContainer && this.sidePotsList) {
      if (sidePots.length > 1) {
        // Show side pots (skip first one as it's the main pot)
        const sidePotsToShow = sidePots.slice(1);
        this.sidePotsList.innerHTML = sidePotsToShow.map((pot, index) => {
          return `<div class="side-pot-item" style="font-size: 0.65rem; color: var(--muted);">
            Side Pot ${index + 1}: ${this.formatChipAmount(pot.amount || 0)}
          </div>`;
        }).join('');
        this.sidePotsContainer.style.display = 'block';
      } else {
        this.sidePotsContainer.style.display = 'none';
      }
    }

    // Update total pot
    if (this.totalPotEl) {
      this.totalPotEl.textContent = this.formatChipAmount(totalPot);
    }

    // Backwards compatibility: Update old potAmount element if it exists
    const oldPotEl = document.getElementById('potAmount');
    if (oldPotEl) {
      oldPotEl.textContent = this.formatChipAmount(mainPot);
    }
  }

  /**
   * FORMAT CHIP AMOUNT
   * Formats chip amount for display
   */
  formatChipAmount(amount) {
    return `$${amount.toLocaleString()}`;
  }
}

// Export for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PotDisplay;
} else {
  window.PotDisplay = PotDisplay;
}

