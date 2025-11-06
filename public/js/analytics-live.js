/**
 * ANALYTICS LIVE DATA SERVICE
 * Real-time data extraction observatory
 */

class AnalyticsDataService {
  constructor() {
    this.socket = null;
    this.dataFeed = [];
    this.stats = {
      totalHands: 0,
      successfulExtractions: 0,
      failedExtractions: 0,
      avgExtractionTime: 0,
      totalPotExtracted: 0
    };
    this.isConnected = false;
  }
  
  connect() {
    console.log('📊 [ANALYTICS] Connecting to data stream...');
    
    // Connect to Socket.IO
    this.socket = io();
    
    this.socket.on('connect', () => {
      console.log('✅ [ANALYTICS] Connected to live data stream');
      this.isConnected = true;
      this.updateConnectionStatus(true);
    });
    
    this.socket.on('disconnect', () => {
      console.log('❌ [ANALYTICS] Disconnected from data stream');
      this.isConnected = false;
      this.updateConnectionStatus(false);
    });
    
    // Listen for data extraction events
    this.socket.on('data_extracted', (event) => {
      console.log('📊 [ANALYTICS] Data extraction event received:', event);
      this.handleDataExtraction(event);
    });
    
    // Listen for any hand_complete events as fallback
    this.socket.on('hand_complete', (event) => {
      console.log('🎮 [ANALYTICS] Hand complete event received:', event);
      this.handleHandComplete(event);
    });
  }
  
  handleDataExtraction(event) {
    // Add to feed (prepend for newest first)
    this.dataFeed.unshift({
      ...event,
      timestamp: event.timestamp || Date.now(),
      type: 'extraction'
    });
    
    // Limit feed to 50 items
    if (this.dataFeed.length > 50) this.dataFeed.pop();
    
    // Update stats
    this.stats.totalHands++;
    this.stats.successfulExtractions++;
    
    if (event.data) {
      if (event.data.extractionTime) {
        this.stats.avgExtractionTime = 
          (this.stats.avgExtractionTime * (this.stats.totalHands - 1) + event.data.extractionTime) / 
          this.stats.totalHands;
      }
      
      if (event.data.pot) {
        this.stats.totalPotExtracted += event.data.pot;
      }
    }
    
    // Update UI
    this.render();
  }
  
  handleHandComplete(event) {
    // Fallback: if data_extracted doesn't fire, use hand_complete
    const payload = event.payload || event;
    
    this.dataFeed.unshift({
      timestamp: event.timestamp || Date.now(),
      type: 'hand_complete',
      data: {
        pot: payload.finalPot || 0,
        winners: payload.winners || [],
        board: payload.board || []
      }
    });
    
    if (this.dataFeed.length > 50) this.dataFeed.pop();
    
    this.stats.totalHands++;
    this.stats.totalPotExtracted += (payload.finalPot || 0);
    
    this.render();
  }
  
  render() {
    this.renderLiveFeed();
    this.renderHealthMetrics();
  }
  
  renderLiveFeed() {
    const feedContainer = document.getElementById('live-data-feed');
    if (!feedContainer) return;
    
    if (this.dataFeed.length === 0) {
      feedContainer.innerHTML = '<p class="text-muted">Waiting for hand completions...</p>';
      return;
    }
    
    feedContainer.innerHTML = this.dataFeed.map((event, index) => {
      const time = new Date(event.timestamp).toLocaleTimeString();
      const data = event.data || {};
      
      if (event.type === 'extraction') {
        // Decode PHE if available
        let decodedHtml = '';
        if (data.encodedHand && window.HandEncoder) {
          try {
            const decoded = window.HandEncoder.decode(data.encodedHand);
            const savings = data.savings || 0;
            
            decodedHtml = `
              <div class="encoded-section">
                <details>
                  <summary class="encoded-summary">
                    📦 PHE Encoding (${data.encodedSize || 0} bytes, ${savings}% smaller)
                  </summary>
                  <div class="encoded-content">
                    <div class="encoded-raw">
                      <strong>Raw:</strong>
                      <code>${data.encodedHand}</code>
                    </div>
                    <div class="decoded-view">
                      <strong>Decoded:</strong>
                      <ul class="decoded-list">
                        ${decoded.players.map(p => 
                          `<li>Seat ${p.seatIndex}: ${p.revealed ? p.cards.join(' ') : '[Mucked]'} ${p.seatIndex === decoded.winner ? '🏆' : ''}</li>`
                        ).join('')}
                      </ul>
                      <div class="decoded-board">Board: ${decoded.board.join(' ') || 'None'}</div>
                      <div class="decoded-actions">${decoded.actions.length} actions recorded</div>
                    </div>
                  </div>
                </details>
              </div>
            `;
          } catch (e) {
            console.error('Failed to decode hand:', e);
          }
        }
        
        return `
          <div class="data-event extraction-event" data-event-id="${index}">
            <div class="event-time">${time}</div>
            <div class="event-details">
              <strong>📊 Hand #${data.handNumber || '?'}</strong> extracted<br>
              💰 Pot: $${data.pot || 0}<br>
              ${data.winner ? `🏆 Winner: ${data.winner.hand || 'Unknown'} (Rank ${data.winner.rank || '?'})` : ''}<br>
              ⚡ ${data.extractionTime ? data.extractionTime + 'ms' : 'N/A'}
              ${decodedHtml}
              <div class="event-status">✅ Extraction Complete</div>
            </div>
          </div>
        `;
      } else {
        const winners = data.winners || [];
        const winnerText = winners.length > 0 
          ? winners.map(w => `${w.username}: $${w.amount}`).join(', ')
          : 'Unknown';
        
        return `
          <div class="data-event hand-complete-event">
            <div class="event-time">${time}</div>
            <div class="event-details">
              <strong>🎮 Hand Complete</strong><br>
              💰 Pot: $${data.pot || 0}<br>
              🏆 ${winnerText}
              <div class="event-status">⏳ Awaiting extraction...</div>
            </div>
          </div>
        `;
      }
    }).join('');
  }
  
  renderHealthMetrics() {
    const totalHands = document.getElementById('total-hands');
    const successRate = document.getElementById('success-rate');
    const avgTime = document.getElementById('avg-extraction-time');
    const totalPot = document.getElementById('total-pot-extracted');
    
    if (totalHands) totalHands.textContent = this.stats.totalHands;
    
    if (successRate) {
      const rate = this.stats.totalHands > 0 
        ? Math.round(this.stats.successfulExtractions / this.stats.totalHands * 100)
        : 0;
      successRate.textContent = `${this.stats.successfulExtractions} (${rate}%)`;
    }
    
    if (avgTime) {
      avgTime.textContent = `${Math.round(this.stats.avgExtractionTime)}ms`;
    }
    
    if (totalPot) {
      totalPot.textContent = `$${this.stats.totalPotExtracted}`;
    }
  }
  
  updateConnectionStatus(isConnected) {
    const statusEl = document.getElementById('connection-status');
    if (statusEl) {
      statusEl.textContent = isConnected ? '🟢 Live' : '🔴 Disconnected';
      statusEl.className = isConnected ? 'status-live' : 'status-disconnected';
    }
  }
  
  // Get recent hand history for display
  getRecentHands(limit = 10) {
    return this.dataFeed.slice(0, limit);
  }
}

// Global instance
window.analyticsService = new AnalyticsDataService();

console.log('📊 Analytics Live Data Service loaded');

