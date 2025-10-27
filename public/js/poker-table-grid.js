/**
 * Poker Table Grid - Production Ready
 * Uses CSS Grid, design tokens, proper responsive design
 */

class PokerTableGrid {
  constructor() {
    this.roomId = null;
    this.userId = null;
    this.gameState = null;
    console.log('🎰 Poker Table Grid initialized');
  }
  
  async init() {
    // Initialize demo data for now
    this.initDemo();
    this.initHostControls();
  }
  
  initDemo() {
    console.log('🎬 Demo mode');
    
    // Show host button in demo
    const hostBtn = document.getElementById('hostControlsBtn');
    if (hostBtn) hostBtn.style.display = 'block';
    
    const demoData = {
      seats: [
        { index: 0, name: 'WALEED', chips: 5280, avatar: '🦈', cards: ['hearts_A', 'diamonds_A'], isMe: true },
        { index: 1, name: 'ProPlayer', chips: 3750, avatar: '🎯', cards: ['back', 'back'] },
        { index: 3, name: 'RocketMan', chips: 8875, avatar: '🚀', cards: ['back', 'back'] },
        { index: 5, name: 'DiamondH', chips: 11200, avatar: '💎', cards: ['back', 'back'] },
        { index: 7, name: 'LuckyAce', chips: 2100, avatar: '🎲', cards: ['back', 'back'] }
      ],
      board: ['hearts_A', 'spades_K', 'hearts_Q', 'clubs_J', 'back'],
      pot: 3450,
      room: 'DEMO',
      hand: 42
    };
    
    this.renderSeats(demoData.seats);
    this.renderBoard(demoData.board);
    this.renderPot(demoData.pot);
    this.renderHudInfo(demoData);
  }
  
  initHostControls() {
    // Close modal
    const closeBtn = document.getElementById('closeHostModal');
    const modal = document.getElementById('hostModal');
    
    if (closeBtn && modal) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
      });
      
      // Close on overlay click
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show');
        }
      });
    }
    
    // Felt color changing
    document.querySelectorAll('.felt-option').forEach(option => {
      option.addEventListener('click', () => {
        const color = option.dataset.color;
        document.body.dataset.felt = color;
        
        // Update active state
        document.querySelectorAll('.felt-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        
        console.log(`Changed felt color to: ${color}`);
      });
    });
    
    // Host action buttons (placeholder for now)
    document.querySelectorAll('.host-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.textContent.trim();
        console.log(`Host action: ${action}`);
        alert(`Demo: ${action} - This will be wired to backend`);
      });
    });
  }
  
  renderSeats(seats) {
    seats.forEach(seat => {
      const seatEl = document.querySelector(`[data-seat="${seat.index}"]`);
      if (!seatEl) return;
      
      seatEl.classList.remove('empty');
      seatEl.classList.add('occupied');
      
      if (seat.isMe) {
        seatEl.classList.add('active', 'seat-main');
      }
      
      const avatar = seatEl.querySelector('.player-avatar');
      const name = seatEl.querySelector('.player-name');
      const chips = seatEl.querySelector('.player-chips');
      const cardsContainer = seatEl.querySelector('.player-cards');
      
      if (avatar) avatar.textContent = seat.avatar;
      if (name) name.textContent = seat.name;
      if (chips) chips.textContent = `$${seat.chips.toLocaleString()}`;
      
      if (cardsContainer && seat.cards) {
        cardsContainer.innerHTML = seat.cards.map(card => 
          `<div class="player-card" style="background-image: url('/cards/${card}.png');"></div>`
        ).join('');
      }
    });
    
    // Mark empty seats
    for (let i = 0; i < 10; i++) {
      if (!seats.find(s => s.index === i)) {
        const seatEl = document.querySelector(`[data-seat="${i}"]`);
        if (seatEl) {
          seatEl.classList.add('empty');
          const avatar = seatEl.querySelector('.player-avatar');
          const name = seatEl.querySelector('.player-name');
          const chips = seatEl.querySelector('.player-chips');
          
          if (avatar) avatar.textContent = '➕';
          if (name) name.textContent = `Seat ${i + 1}`;
          if (chips) chips.textContent = 'Empty';
        }
      }
    }
  }
  
  renderBoard(cards) {
    const container = document.getElementById('communityCards');
    if (!container) return;
    
    container.innerHTML = cards.map(card => 
      `<div class="card" style="background-image: url('/cards/${card}.png');"></div>`
    ).join('');
  }
  
  renderPot(amount) {
    const potEl = document.getElementById('potAmount');
    if (potEl) {
      potEl.textContent = `$${amount.toLocaleString()}`;
    }
  }
  
  renderHudInfo(data) {
    const room = document.getElementById('hudRoom');
    const hand = document.getElementById('hudHand');
    const chips = document.getElementById('hudChips');
    
    if (room) room.textContent = data.room;
    if (hand) hand.textContent = `#${data.hand}`;
    if (chips) chips.textContent = `$${data.seats[0].chips.toLocaleString()}`;
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  window.pokerTable = new PokerTableGrid();
  window.pokerTable.init();
  
  // Demo interactions
  document.querySelectorAll('.quick-bet').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const mult = parseFloat(e.target.dataset.mult);
      const pot = 3450;
      const amount = Math.floor(pot * mult);
      document.getElementById('betInput').value = amount;
      document.getElementById('betSlider').value = amount;
      document.getElementById('raiseAmount').textContent = `$${amount.toLocaleString()}`;
    });
  });
  
  const slider = document.getElementById('betSlider');
  const input = document.getElementById('betInput');
  
  if (slider && input) {
    slider.addEventListener('input', (e) => {
      input.value = e.target.value;
      const raiseAmt = document.getElementById('raiseAmount');
      if (raiseAmt) raiseAmt.textContent = `$${parseInt(e.target.value).toLocaleString()}`;
    });
    
    input.addEventListener('input', (e) => {
      slider.value = e.target.value;
      const raiseAmt = document.getElementById('raiseAmount');
      if (raiseAmt) raiseAmt.textContent = `$${parseInt(e.target.value).toLocaleString()}`;
    });
  }
  
  // Action buttons
  document.querySelectorAll('.action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const label = btn.querySelector('.btn-label').textContent;
      console.log(`Demo: ${label} clicked`);
    });
  });
});

console.log('✅ Poker Table Grid script loaded');
