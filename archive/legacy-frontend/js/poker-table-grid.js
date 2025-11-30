/**
 * Poker Table (zoom-locked virtual canvas)
 * Single root scale + letterboxing + hit-test remap + preset switch
 */

// ---------- Virtual stage constants ----------
const VIRT_W = 2100;
const VIRT_H = 1000;

// Default (horizontal) preset (normalized 0..1 from your tool)
const SEATS_DEFAULT = [
  [0.50, 0.87], // 0
  [0.75, 0.78], // 1
  [0.90, 0.28], // 2
  [0.90, 0.60], // 3
  [0.66, 0.08], // 4
  [0.49, 0.13], // 5
  [0.32, 0.08], // 6
  [0.11, 0.32], // 7
  [0.11, 0.63], // 8
  [0.26, 0.74], // 9
];

// Vertical preset (normalized, from your portrait block)
const SEATS_VERTICAL = [
  [0.50, 0.88], // 0
  [0.70, 0.80], // 1
  [0.85, 0.65], // 2
  [0.85, 0.50], // 3
  [0.85, 0.35], // 4
  [0.70, 0.20], // 5
  [0.50, 0.12], // 6
  [0.30, 0.20], // 7
  [0.15, 0.35], // 8
  [0.15, 0.65], // 9
];

// ---------- Uniform contain scaling + offsets ----------
function computeFit(containerW, containerH, virtW, virtH) {
  const s = Math.min(containerW / virtW, containerH / virtH);
  const scaledW = virtW * s, scaledH = virtH * s;
  const offsetX = Math.floor((containerW - scaledW) / 2);
  const offsetY = Math.floor((containerH - scaledH) / 2);
  return { s, offsetX, offsetY, scaledW, scaledH };
}

class StageScaler {
  constructor(stageEl, wrapperEl) {
    this.stage = stageEl;
    this.wrapper = wrapperEl;
    this.metrics = null;

    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(this.wrapper);
    window.addEventListener('resize', () => this.layout());

    this.layout();
  }

  layout() {
    const rect = this.wrapper.getBoundingClientRect();
    this.metrics = computeFit(rect.width, rect.height, VIRT_W, VIRT_H);
    const { s, offsetX, offsetY } = this.metrics;

    // Single root transform = zoom-locked
    this.stage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${s})`;

    // Mode switch: choose vertical if very skinny or scale gets too small
    const aspect = rect.width / rect.height;
    const mode = (s < 0.55 || aspect < 1.1) ? 'vertical' : 'default';
    if (this.stage.dataset.mode !== mode) {
      this.stage.dataset.mode = mode;
      this.onModeChange?.(mode); // callback into table code
    }
  }

  // Map pointer coords (screen) -> stage coords (virtual)
  toStage(clientX, clientY) {
    const { left, top } = this.wrapper.getBoundingClientRect();
    const { s, offsetX, offsetY } = this.metrics;
    return {
      x: (clientX - left - offsetX) / s,
      y: (clientY - top  - offsetY) / s
    };
  }
}

class PokerTableGrid {
  constructor() {
    this.roomId = null;
    this.userId = null;
    this.gameState = null;
    console.log('🎰 Poker Table (zoom-locked) initialized');
  }
  
  async init() {
    // Demo data for now
    this.initDemo();
    this.initHostControls();
  
    const stage = document.querySelector('.poker-table');
    const wrapper = stage.parentElement; // .table-wrapper
  
    // Create scaler and react to mode changes
    this.scaler = new StageScaler(stage, wrapper);
    this.scaler.onModeChange = (mode) => this.applySeatPreset(mode);
  
    // Initial placement (uses current mode)
    this.applySeatPreset(stage.dataset.mode || 'default');
  
    // Example: hit testing using virtual coords
    stage.addEventListener('pointerdown', (e) => {
      const { x, y } = this.scaler.toStage(e.clientX, e.clientY);
      // Use (x,y) in 0..VIRT_W / 0..VIRT_H for precise interaction
      // console.log('stage pointer', x.toFixed(1), y.toFixed(1));
    });
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
      closeBtn.addEventListener('click', () => modal.classList.remove('show'));
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('show'); });
    }
    
    // Felt color changing
    document.querySelectorAll('.felt-option').forEach(option => {
      option.addEventListener('click', () => {
        const color = option.dataset.color;
        document.body.dataset.felt = color;
        document.querySelectorAll('.felt-option').forEach(o => o.classList.remove('active'));
        option.classList.add('active');
        console.log(`Changed felt color to: ${color}`);
      });
    });
    
    // Host action buttons (placeholder)
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
      if (seat.isMe) seatEl.classList.add('active', 'seat-main');
      
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
    if (potEl) potEl.textContent = `$${amount.toLocaleString()}`;
  }
  
  renderHudInfo(data) {
    const room = document.getElementById('hudRoom');
    const hand = document.getElementById('hudHand');
    const chips = document.getElementById('hudChips');
    if (room) room.textContent = data.room;
    if (hand) hand.textContent = `#${data.hand}`;
    if (chips) chips.textContent = `$${data.seats[0].chips.toLocaleString()}`;
  }

  // Convert normalized coords to absolute placement in virtual space
  placeSeat(el, nx, ny) {
    const x = nx * VIRT_W;
    const y = ny * VIRT_H;
    el.style.position = 'absolute';
    el.style.left = `${x}px`;
    el.style.top  = `${y}px`;
    el.style.transform = 'translate(-50%, -50%)';
  }

  applySeatPreset(mode) {
    const preset = (mode === 'vertical') ? SEATS_VERTICAL : SEATS_DEFAULT;
    const seats = document.querySelectorAll('.seat');
    for (let i = 0; i < seats.length; i++) {
      const p = preset[i] || [0.5, 0.5];
      this.placeSeat(seats[i], p[0], p[1]);
    }
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
