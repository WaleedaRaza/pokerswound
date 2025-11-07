/**
 * ANALYTICS UI COMPONENTS
 * Reusable components for analytics page
 */

// ============================================
// STAT CARD COMPONENT (MODERN)
// ============================================
function createStatCard({ icon, label, value, trend, subtitle, color = 'teal' }) {
  const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '';
  const trendClass = trend > 0 ? 'positive' : trend < 0 ? 'negative' : '';
  
  return `
    <div class="stat-card-modern">
      <div class="stat-card-header">
        <div class="stat-icon-modern">${icon}</div>
      </div>
      <div class="stat-label-modern">${label}</div>
      <div class="stat-value-modern">${value}</div>
      ${subtitle ? `<div class="stat-subtitle-modern">${subtitle}</div>` : ''}
      ${trend ? `<div class="stat-trend-modern ${trendClass}">${trendIcon} ${Math.abs(trend)}%</div>` : ''}
    </div>
  `;
}

// ============================================
// HAND HISTORY TABLE COMPONENT (MODERN)
// ============================================
function createHandHistoryTable(hands, onHandClick) {
  if (!hands || hands.length === 0) {
    return `
      <div class="empty-state-modern">
        <div class="empty-state-modern-icon">🎴</div>
        <h3>No hands found</h3>
        <p>Play some games to see your hand history!</p>
      </div>
    `;
  }
  
  const rows = hands.map(hand => {
    const wonClass = hand.won ? 'won' : 'lost';
    const wonIcon = hand.won ? '✅' : '❌';
    const date = new Date(hand.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const time = new Date(hand.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    return `
      <tr class="${wonClass}" onclick="${onHandClick ? `handleHandClick('${hand.id}')` : ''}">
        <td class="hand-date-modern">
          ${date}
          <span class="time">${time}</span>
        </td>
        <td>${hand.roomName || 'Unknown Room'}</td>
        <td class="hand-pot-modern">$${hand.potSize || 0}</td>
        <td>
          <span class="hand-result-modern ${wonClass}">
            ${wonIcon} ${hand.won ? 'Won' : 'Lost'}
          </span>
        </td>
        <td>${hand.winningHand || 'N/A'}</td>
        <td style="font-family: 'JetBrains Mono', monospace; font-size: 12px;">${hand.boardCards || 'N/A'}</td>
      </tr>
    `;
  }).join('');
  
  return `
    <table class="hand-history-modern">
      <thead>
        <tr>
          <th>Date & Time</th>
          <th>Room</th>
          <th>Pot Size</th>
          <th>Result</th>
          <th>Winning Hand</th>
          <th>Board</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// ============================================
// CHART CONTAINER COMPONENT (MODERN)
// ============================================
function createChartContainer({ id, title, type = 'line', data, options = {} }) {
  return `
    <div>
      <h4 class="chart-title-modern">${title}</h4>
      <div class="chart-container-modern">
        <canvas id="${id}"></canvas>
      </div>
    </div>
  `;
}

// ============================================
// POSITIONAL STATS TABLE (MODERN)
// ============================================
function createPositionalStatsTable(positionalData) {
  if (!positionalData) {
    return `
      <div class="empty-state-modern">
        <div class="empty-state-modern-icon">🎯</div>
        <h3>No positional data yet</h3>
        <p>Play more hands to see your positional stats</p>
      </div>
    `;
  }
  
  // Map positions to data structure
  const positionMap = {
    'UTG': { vpip: positionalData.vpip?.early || '0.00', winRate: positionalData.winRates?.['UTG'] },
    'UTG+1': { vpip: positionalData.vpip?.early || '0.00', winRate: positionalData.winRates?.['UTG+1'] },
    'MP': { vpip: positionalData.vpip?.middle || '0.00', winRate: positionalData.winRates?.['MP'] },
    'MP+1': { vpip: positionalData.vpip?.middle || '0.00', winRate: positionalData.winRates?.['MP+1'] },
    'CO': { vpip: positionalData.vpip?.late || '0.00', winRate: positionalData.winRates?.['CO'] },
    'BTN': { vpip: positionalData.vpip?.late || '0.00', winRate: positionalData.winRates?.['BTN'] },
    'SB': { vpip: positionalData.vpip?.blinds || '0.00', winRate: positionalData.winRates?.['SB'] },
    'BB': { vpip: positionalData.vpip?.blinds || '0.00', winRate: positionalData.winRates?.['BB'] }
  };
  
  const positions = ['UTG', 'UTG+1', 'MP', 'MP+1', 'CO', 'BTN', 'SB', 'BB'];
  const rows = positions.map(pos => {
    const posData = positionMap[pos] || {};
    const winRateData = posData.winRate || {};
    
    return `
      <tr>
        <td class="position-name-modern">${pos}</td>
        <td class="position-value-modern">${posData.vpip}%</td>
        <td>${winRateData.handsPlayed || 0}</td>
        <td>${winRateData.handsWon || 0}</td>
        <td class="position-value-modern">${winRateData.winRate || 0}%</td>
      </tr>
    `;
  }).join('');
  
  return `
    <table class="positional-table-modern">
      <thead>
        <tr>
          <th>Position</th>
          <th>VPIP</th>
          <th>Hands</th>
          <th>Wins</th>
          <th>Win Rate</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// ============================================
// BADGE DISPLAY COMPONENT (MODERN)
// ============================================
function createBadgeDisplay(badges) {
  if (!badges || badges.length === 0) {
    return `
      <div class="empty-state-modern">
        <div class="empty-state-modern-icon">🏆</div>
        <h3>No badges yet</h3>
        <p>Keep playing to unlock achievements!</p>
      </div>
    `;
  }
  
  const badgeCards = badges.map(badge => `
    <div class="badge-card-modern" title="${badge.description || badge.name}">
      <div class="badge-icon-modern">${badge.icon || '🏆'}</div>
      <div class="badge-name-modern">${badge.name}</div>
      <div class="badge-date-modern">${new Date(badge.earnedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
    </div>
  `).join('');
  
  return badgeCards;
}

// ============================================
// RENDER CHARTS (Chart.js)
// ============================================
function renderWinRateChart(canvasId, chartData) {
  if (!window.Chart) {
    console.warn('Chart.js not loaded');
    return;
  }
  
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: chartData.map(d => d.period),
      datasets: [{
        label: 'Win Rate %',
        data: chartData.map(d => d.winRate),
        borderColor: '#00d4aa',
        backgroundColor: 'rgba(0, 212, 170, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#e9eef7'
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            color: '#9aa3b2'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#9aa3b2'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      }
    }
  });
}

function renderProfitLossChart(canvasId, chartData) {
  if (!window.Chart) {
    console.warn('Chart.js not loaded');
    return;
  }
  
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.map(d => d.period),
      datasets: [{
        label: 'Profit/Loss',
        data: chartData.map(d => d.profit),
        backgroundColor: chartData.map(d => d.profit >= 0 ? 'rgba(0, 212, 170, 0.6)' : 'rgba(255, 59, 59, 0.6)'),
        borderColor: chartData.map(d => d.profit >= 0 ? '#00d4aa' : '#ff3b3b'),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            color: '#e9eef7'
          }
        }
      },
      scales: {
        y: {
          ticks: {
            color: '#9aa3b2',
            callback: function(value) {
              return '$' + value;
            }
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        },
        x: {
          ticks: {
            color: '#9aa3b2'
          },
          grid: {
            color: 'rgba(255, 255, 255, 0.1)'
          }
        }
      }
    }
  });
}

// Export functions
window.AnalyticsComponents = {
  createStatCard,
  createHandHistoryTable,
  createChartContainer,
  createPositionalStatsTable,
  createBadgeDisplay,
  renderWinRateChart,
  renderProfitLossChart
};

