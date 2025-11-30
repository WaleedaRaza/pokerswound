/**
 * PokerGeek Production Poker Table
 * Professional-grade poker interface
 */

class PokerTableProduction {
  constructor() {
    this.socket = null;
    this.sequenceTracker = null;
    this.roomId = null;
    this.userId = null;
    this.gameState = null;
    
    console.log('🎰 PokerTable Production initialized');
  }
  
  async init() {
    // Get room ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    this.roomId = urlParams.get('room');
    
    if (!this.roomId) {
      console.log('No room ID - running in demo mode');
      return this.initDemo();
    }
    
    // Initialize auth
    await this.initAuth();
    
    // Initialize WebSocket
    this.initSocket();
    
    // Initialize UI handlers
    this.initHandlers();
    
    // Attempt hydration
    await this.hydrate();
  }
  
  async initAuth() {
    // TODO: Implement Supabase auth
    console.log('🔐 Auth initialized');
  }
  
  initSocket() {
    this.socket = io();
    this.sequenceTracker = new SequenceTracker();
    
    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.socket.emit('authenticate', {
        roomId: this.roomId,
        userId: this.userId
      });
    });
    
    this.socket.on('state_sync', this.sequenceTracker.createHandler((data) => {
      console.log('🌊 State sync received', data);
      this.renderGameState(data.payload);
    }));
    
    // Add more socket handlers here
  }
  
  initHandlers() {
    // Action buttons
    document.getElementById('foldBtn')?.addEventListener('click', () => this.sendAction('FOLD', 0));
    document.getElementById('callBtn')?.addEventListener('click', () => this.sendAction('CALL', this.getCallAmount()));
    document.getElementById('raiseBtn')?.addEventListener('click', () => this.sendAction('RAISE', this.getRaiseAmount()));
    
    // Bet slider
    const slider = document.getElementById('betSlider');
    const input = document.getElementById('betInput');
    
    slider?.addEventListener('input', (e) => {
      input.value = e.target.value;
      this.updateRaiseAmount(e.target.value);
    });
    
    input?.addEventListener('input', (e) => {
      slider.value = e.target.value;
      this.updateRaiseAmount(e.target.value);
    });
    
    // Quick bets
    document.querySelectorAll('.quick-bet').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mult = parseFloat(e.target.dataset.amount);
        const pot = this.getPotAmount();
        const amount = Math.floor(pot * mult);
        input.value = amount;
        slider.value = amount;
        this.updateRaiseAmount(amount);
      });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      
      switch(e.key.toLowerCase()) {
        case 'f': this.sendAction('FOLD', 0); break;
        case 'c': this.sendAction('CALL', this.getCallAmount()); break;
        case 'r': this.sendAction('RAISE', this.getRaiseAmount()); break;
      }
    });
  }
  
  async hydrate() {
    try {
      const response = await fetch(`/api/rooms/${this.roomId}/hydrate?userId=${this.userId}`);
      if (!response.ok) throw new Error('Hydration failed');
      
      const data = await response.json();
      console.log('✅ Hydration successful', data);
      
      this.gameState = data;
      this.renderGameState(data);
    } catch (error) {
      console.error('❌ Hydration failed:', error);
    }
  }
  
  renderGameState(state) {
    // TODO: Implement full game state rendering
    console.log('🎨 Rendering game state', state);
  }
  
  async sendAction(action, amount) {
    console.log(`🎯 Sending action: ${action} ${amount}`);
    
    // TODO: Implement action sending with idempotency
    try {
      const response = await fetch(`/api/games/${this.gameState.game.id}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${this.gameState.game.id}-${this.userId}-${action}-${Date.now()}`
        },
        body: JSON.stringify({
          player_id: this.userId,
          action: action,
          amount: amount
        })
      });
      
      if (!response.ok) throw new Error('Action failed');
      
      const result = await response.json();
      console.log('✅ Action successful', result);
    } catch (error) {
      console.error('❌ Action failed:', error);
    }
  }
  
  getCallAmount() {
    // TODO: Calculate call amount from game state
    return parseInt(document.getElementById('callAmount')?.textContent.replace('$', '') || 0);
  }
  
  getRaiseAmount() {
    return parseInt(document.getElementById('betInput')?.value || 0);
  }
  
  getPotAmount() {
    return parseInt(document.getElementById('potAmount')?.textContent.replace('$', '').replace(',', '') || 0);
  }
  
  updateRaiseAmount(amount) {
    const raiseAmountEl = document.getElementById('raiseAmount');
    if (raiseAmountEl) {
      raiseAmountEl.textContent = `$${parseInt(amount).toLocaleString()}`;
    }
  }
  
  initDemo() {
    console.log('🎬 Running in demo mode');
    // Demo mode already initialized in HTML
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  window.pokerTable = new PokerTableProduction();
  // Don't auto-init if seats are already populated (demo mode)
  const firstSeat = document.querySelector('[data-seat-index="0"]');
  if (!firstSeat?.classList.contains('occupied')) {
    window.pokerTable.init();
  }
});

console.log('✅ Poker Table Production script loaded');
