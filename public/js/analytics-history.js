/**
 * ANALYTICS HAND HISTORY SERVICE
 * Fetches and renders user's hand history with filters
 */

class HandHistoryService {
  constructor() {
    this.hands = [];
    this.currentPage = 0;
    this.limit = 20;
    this.total = 0;
    this.filters = {};
    this.rooms = [];
  }
  
  async init() {
    console.log('📖 [HAND HISTORY] Initializing...');
    
    // Wait for auth
    if (!window.authManager || !window.authManager.user) {
      console.warn('⚠️ [HAND HISTORY] No user authenticated');
      return;
    }
    
    // Load rooms for filter dropdown
    await this.loadRooms();
    
    // Load initial hands
    await this.loadHands({}, 0);
  }
  
  async loadRooms() {
    try {
      const userId = window.authManager.user?.id;
      if (!userId) return;
      
      const token = await window.authManager.getAccessToken();
      const response = await fetch(`/api/social/analytics/rooms/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.rooms = data.rooms || [];
        this.populateRoomFilter();
      }
    } catch (error) {
      console.error('Error loading rooms:', error);
    }
  }
  
  populateRoomFilter() {
    const select = document.getElementById('filter-room');
    if (!select) return;
    
    // Clear existing options (except "All Rooms")
    select.innerHTML = '<option value="">All Rooms</option>';
    
    // Add rooms
    this.rooms.forEach(room => {
      const option = document.createElement('option');
      option.value = room.id;
      option.textContent = `${room.name} (${room.hand_count} hands)`;
      select.appendChild(option);
    });
  }
  
  async loadHands(filters = {}, page = 0) {
    try {
      const userId = window.authManager.user?.id;
      if (!userId) {
        console.error('No user ID');
        document.getElementById('hand-history-list').innerHTML = 
          '<p class="error">Please log in to view hand history</p>';
        return;
      }
      
      const token = await window.authManager.getAccessToken();
      const offset = page * this.limit;
      
      const queryParams = new URLSearchParams({
        limit: this.limit,
        offset: offset,
        ...filters
      });
      
      console.log(`📖 [HAND HISTORY] Fetching hands (page ${page})...`);
      
      const response = await fetch(`/api/social/analytics/hands/${userId}?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to load hands');
      }
      
      const data = await response.json();
      this.hands = data.hands;
      this.total = data.total;
      this.currentPage = page;
      this.filters = filters;
      
      console.log(`📖 [HAND HISTORY] Loaded ${this.hands.length} hands (total: ${this.total})`);
      
      this.renderHands();
      this.updatePagination();
      
    } catch (error) {
      console.error('Error loading hands:', error);
      document.getElementById('hand-history-list').innerHTML = 
        '<p class="error">Failed to load hand history</p>';
    }
  }
  
  renderHands() {
    const container = document.getElementById('hand-history-list');
    
    if (this.hands.length === 0) {
      container.innerHTML = '<p class="text-muted">No hands found. Play some poker and your hands will appear here!</p>';
      return;
    }
    
    container.innerHTML = this.hands.map((hand, index) => {
      const date = new Date(hand.created_at).toLocaleString();
      const isWinner = hand.winner_id === window.authManager.user?.id;
      
      // Decode PHE if available
      let decodedHtml = '';
      if (hand.encoded_hand && window.HandEncoder) {
        try {
          const decoded = window.HandEncoder.decode(hand.encoded_hand);
          decodedHtml = this.renderDecodedHand(decoded, hand);
        } catch (e) {
          console.error('Failed to decode hand:', e);
          decodedHtml = '<p class="error">Unable to decode hand data</p>';
        }
      } else {
        decodedHtml = '<p class="text-muted">Hand data not available (legacy format)</p>';
      }
      
      return `
        <div class="hand-card ${isWinner ? 'hand-won' : 'hand-lost'}">
          <div class="hand-summary" onclick="toggleHandDetails(${index})">
            <div class="hand-info">
              <span class="hand-number">Hand #${hand.hand_number}</span>
              <span class="hand-date">${date}</span>
              <span class="hand-room">${hand.room_name || 'Unknown Room'}</span>
            </div>
            <div class="hand-stats">
              <span class="hand-pot">💰 $${hand.pot_size || 0}</span>
              <span class="hand-result ${isWinner ? 'won' : 'lost'}">${isWinner ? '🏆 Won' : '❌ Lost'}</span>
              <span class="hand-rank">${this.getRankName(hand.hand_rank)}</span>
            </div>
            <span class="expand-icon">▼</span>
          </div>
          
          <div class="hand-details" id="hand-details-${index}" hidden>
            ${decodedHtml}
          </div>
        </div>
      `;
    }).join('');
  }
  
  renderDecodedHand(decoded, hand) {
    const myUserId = window.authManager.user?.id;
    
    return `
      <div class="decoded-hand">
        <div class="decoded-section">
          <h4>🎴 Players</h4>
          <ul class="player-cards-list">
            ${decoded.players.map(p => `
              <li>
                <span class="player-seat">Seat ${p.seatIndex}</span>
                <span class="player-cards">${p.revealed ? p.cards.join(' ') : '🂠 🂠 (Mucked)'}</span>
                ${p.seatIndex === decoded.winner ? '<span class="winner-badge">🏆 Winner</span>' : ''}
              </li>
            `).join('')}
          </ul>
        </div>
        
        <div class="decoded-section">
          <h4>🌍 Board</h4>
          <div class="board-cards">
            ${decoded.board && decoded.board.length > 0 ? decoded.board.join(' ') : 'No flop (everyone folded preflop)'}
          </div>
        </div>
        
        <div class="decoded-section">
          <h4>📊 Actions (${decoded.actions.length})</h4>
          <div class="actions-timeline">
            ${decoded.actions.slice(0, 10).map(a => 
              `<div class="action-item">Seat ${a.seatIndex}: ${a.action}${a.amount ? ` $${a.amount}` : ''}</div>`
            ).join('')}
            ${decoded.actions.length > 10 ? `<div class="action-more">... and ${decoded.actions.length - 10} more actions</div>` : ''}
          </div>
        </div>
        
        ${hand.winning_hand ? `
          <div class="decoded-section">
            <h4>🏆 Winner</h4>
            <div class="winner-display">
              <strong>${hand.winner_username || 'Unknown'}</strong> won with ${hand.winning_hand}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
  
  getRankName(rank) {
    const ranks = {
      1: '👑 Royal Flush',
      2: '🔥 Straight Flush',
      3: '🎰 Four of a Kind',
      4: '🏠 Full House',
      5: '♠️ Flush',
      6: '📈 Straight',
      7: '🎲 Three of a Kind',
      8: '👥 Two Pair',
      9: '🎯 Pair',
      10: '🃏 High Card'
    };
    return ranks[rank] || 'Unknown';
  }
  
  updatePagination() {
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const pageInfo = document.getElementById('page-info');
    
    if (!btnPrev || !btnNext || !pageInfo) return;
    
    btnPrev.disabled = this.currentPage === 0;
    btnNext.disabled = (this.currentPage + 1) * this.limit >= this.total;
    
    const totalPages = Math.ceil(this.total / this.limit) || 1;
    pageInfo.textContent = `Page ${this.currentPage + 1} of ${totalPages} (${this.total} hands)`;
  }
}

// Global instance
window.handHistoryService = new HandHistoryService();

// Global functions
function toggleHandDetails(index) {
  const details = document.getElementById(`hand-details-${index}`);
  if (!details) return;
  
  const isHidden = details.hasAttribute('hidden');
  details.hidden = !isHidden;
  
  // Update expand icon
  const card = details.parentElement;
  const icon = card.querySelector('.expand-icon');
  if (icon) {
    icon.textContent = isHidden ? '▲' : '▼';
  }
}

function applyHandHistoryFilters() {
  const filters = {
    startDate: document.getElementById('filter-start-date')?.value || undefined,
    endDate: document.getElementById('filter-end-date')?.value || undefined,
    roomId: document.getElementById('filter-room')?.value || undefined,
    minHandRank: document.getElementById('filter-hand-rank')?.value || undefined,
    maxHandRank: document.getElementById('filter-hand-rank')?.value || undefined
  };
  
  // Remove undefined values
  Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);
  
  console.log('📖 [HAND HISTORY] Applying filters:', filters);
  window.handHistoryService.loadHands(filters, 0);
}

function clearHandHistoryFilters() {
  document.getElementById('filter-start-date').value = '';
  document.getElementById('filter-end-date').value = '';
  document.getElementById('filter-room').value = '';
  document.getElementById('filter-hand-rank').value = '';
  
  window.handHistoryService.loadHands({}, 0);
}

function loadPreviousPage() {
  if (window.handHistoryService.currentPage > 0) {
    window.handHistoryService.loadHands(
      window.handHistoryService.filters,
      window.handHistoryService.currentPage - 1
    );
  }
}

function loadNextPage() {
  const totalPages = Math.ceil(window.handHistoryService.total / window.handHistoryService.limit);
  if (window.handHistoryService.currentPage < totalPages - 1) {
    window.handHistoryService.loadHands(
      window.handHistoryService.filters,
      window.handHistoryService.currentPage + 1
    );
  }
}

// Auto-load on page load
window.addEventListener('DOMContentLoaded', async () => {
  // Wait for auth to initialize
  if (window.initializeAuth) {
    await window.initializeAuth();
  }
  
  // Initialize hand history service
  if (window.authManager && window.authManager.user) {
    await window.handHistoryService.init();
  } else {
    document.getElementById('hand-history-list').innerHTML = 
      '<p class="text-muted">Please log in to view your hand history</p>';
  }
});

console.log('📖 Analytics Hand History Service loaded');

