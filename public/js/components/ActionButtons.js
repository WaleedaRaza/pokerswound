/**
 * ACTION BUTTONS COMPONENT
 * 
 * Purpose: Render and manage action buttons (FOLD, CHECK/CALL, RAISE)
 * Responsibilities:
 * - Display action buttons based on gameState
 * - Calculate call amount from gameState (no guessing)
 * - Handle button clicks
 * - Show/hide buttons based on turn
 * 
 * Architecture: Pure rendering component (uses gameStateClient for state)
 */

class ActionButtons {
  constructor(containerId, gameStateClient, onAction) {
    this.containerId = containerId;
    this.gameStateClient = gameStateClient;
    this.onAction = onAction; // Callback: (action, amount) => void
    this.container = null;
    this.foldBtn = null;
    this.callBtn = null;
    this.raiseBtn = null;
    this.callBtnText = null;
    this.callAmountSpan = null;
  }

  /**
   * INITIALIZE
   * Gets references to DOM elements and sets up event listeners
   */
  initialize() {
    this.container = document.getElementById(this.containerId);
    if (!this.container) {
      console.error(`❌ [ActionButtons] Container not found: ${this.containerId}`);
      return;
    }

    this.foldBtn = document.getElementById('foldBtn');
    this.callBtn = document.getElementById('callBtn');
    this.raiseBtn = document.getElementById('raiseBtn');
    this.callBtnText = document.getElementById('callBtnText');
    this.callAmountSpan = document.getElementById('callAmount');

    if (!this.foldBtn || !this.callBtn || !this.raiseBtn) {
      console.error('❌ [ActionButtons] Button elements not found');
      return;
    }
  }

  /**
   * RENDER
   * Renders action buttons from gameState
   * 
   * @param {Object} gameState - Current game state
   * @param {string} userId - Current user's ID
   */
  render(gameState, userId) {
    if (!gameState || !userId) {
      this.hide();
      return;
    }

    // Use gameStateClient to get my player and state
    const myPlayer = this.gameStateClient.getMyPlayer(userId);
    if (!myPlayer) {
      this.hide();
      return;
    }

    const isMyTurn = this.gameStateClient.isMyTurn(userId);
    const callAmount = this.gameStateClient.getCallAmount(userId);
    const canCheck = this.gameStateClient.canCheck(userId);
    const canCall = this.gameStateClient.canCall(userId);
    const canRaise = this.gameStateClient.canRaise(userId);

    // Show/hide container based on game status and turn
    if (gameState.status === 'IN_PROGRESS' && isMyTurn) {
      this.show();
    } else {
      this.hide();
      return;
    }

    // Update call/check button
    if (callAmount === 0 || canCheck) {
      // Can check
      if (this.callBtnText) {
        this.callBtnText.textContent = 'CHECK';
      }
      if (this.callAmountSpan) {
        this.callAmountSpan.style.display = 'none';
      }
      if (this.callBtn) {
        this.callBtn.onclick = () => this.onAction('CHECK', 0);
        this.callBtn.disabled = !canCheck;
      }
    } else {
      // Must call
      if (this.callBtnText) {
        this.callBtnText.textContent = 'CALL';
      }
      if (this.callAmountSpan) {
        this.callAmountSpan.style.display = 'inline';
        this.callAmountSpan.textContent = callAmount;
      }
      if (this.callBtn) {
        this.callBtn.onclick = () => this.onAction('CALL', callAmount);
        this.callBtn.disabled = !canCall;
      }
    }

    // Update fold button
    if (this.foldBtn) {
      this.foldBtn.onclick = () => this.onAction('FOLD', 0);
      this.foldBtn.disabled = !isMyTurn;
    }

    // Update raise button
    if (this.raiseBtn) {
      const currentBet = gameState.currentBet || 0;
      const minRaise = this.gameStateClient.calculateMinRaiseAmount(gameState);
      this.raiseBtn.onclick = () => this.openRaiseModal(currentBet, myPlayer.chips, myPlayer.betThisStreet || 0);
      this.raiseBtn.disabled = !canRaise || !isMyTurn;
    }

    // Apply visual state
    if (isMyTurn) {
      // YOUR TURN - active pulse
      this.foldBtn?.classList.add('active');
      this.callBtn?.classList.add('active');
      this.raiseBtn?.classList.add('active');
      this.foldBtn?.classList.remove('not-your-turn');
      this.callBtn?.classList.remove('not-your-turn');
      this.raiseBtn?.classList.remove('not-your-turn');
    } else {
      // NOT YOUR TURN - blur
      this.foldBtn?.classList.remove('active');
      this.callBtn?.classList.remove('active');
      this.raiseBtn?.classList.remove('active');
      this.foldBtn?.classList.add('not-your-turn');
      this.callBtn?.classList.add('not-your-turn');
      this.raiseBtn?.classList.add('not-your-turn');
    }
  }

  /**
   * SHOW
   * Shows action buttons container
   */
  show() {
    if (this.container) {
      this.container.style.display = 'flex';
    }
  }

  /**
   * HIDE
   * Hides action buttons container
   */
  hide() {
    if (this.container) {
      this.container.style.display = 'none';
    }
  }

  /**
   * OPEN RAISE MODAL
   * Opens raise modal (delegates to parent)
   */
  openRaiseModal(currentBet, myChips, myBet) {
    // This should be handled by parent component
    // For now, we'll trigger a custom event
    const event = new CustomEvent('openRaiseModal', {
      detail: { currentBet, myChips, myBet }
    });
    document.dispatchEvent(event);
  }
}

// Export for browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActionButtons;
} else {
  window.ActionButtons = ActionButtons;
}

