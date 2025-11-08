/**
 * ANALYTICS UI COMPONENTS
 * Reusable components for analytics page
 */

// ============================================
// METRIC CARD COMPONENT (Mission Control Style)
// ============================================
function createMetricCard({ label, value, trend, trendPeriod, status = 'positive', sparkline }) {
  const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '';
  const trendValue = trend ? Math.abs(trend) : null;
  const statusClass = `status-${status}`;
  
  return `
    <div class="metric-card liquid-glass liquid-glass--lg">
      <div class="metric-header">
        <span class="metric-label">${label}</span>
        <span class="metric-status-indicator ${statusClass}"></span>
      </div>
      <div class="metric-value">${value}</div>
      ${trendValue ? `
        <div class="metric-trend">
          <span class="trend-arrow">${trendIcon}</span>
          <span class="trend-value">${trendValue}%</span>
          ${trendPeriod ? `<span class="trend-period">vs ${trendPeriod}</span>` : ''}
        </div>
      ` : ''}
      ${sparkline ? `<div class="metric-sparkline">${sparkline}</div>` : ''}
    </div>
  `;
}

// ============================================
// POST-GAME INSIGHT CARD COMPONENT (Chess.com Style)
// ============================================
function createInsightCard({ type, title, message, handPreview, handId, onClick }) {
  // type: 'good-move' | 'mistake' | 'blunder' | 'learning'
  const typeConfig = {
    'good-move': { icon: '✅', badge: 'Good Move', color: 'positive', bgColor: 'rgba(34, 197, 94, 0.1)' },
    'mistake': { icon: '⚠️', badge: 'Mistake', color: 'warning', bgColor: 'rgba(234, 179, 8, 0.1)' },
    'blunder': { icon: '❌', badge: 'Blunder', color: 'negative', bgColor: 'rgba(239, 68, 68, 0.1)' },
    'learning': { icon: '💡', badge: 'Learning Opportunity', color: 'info', bgColor: 'rgba(59, 130, 246, 0.1)' }
  };
  
  const config = typeConfig[type] || typeConfig['learning'];
  
  return `
    <div class="insight-card liquid-glass liquid-glass--lg" data-hand-id="${handId || ''}" style="background: ${config.bgColor}; border-left: 3px solid var(--${config.color === 'positive' ? 'teal' : config.color === 'negative' ? 'orange' : config.color === 'warning' ? 'orange' : 'mint'});">
      <div class="insight-header">
        <div class="insight-badge insight-badge--${config.color}">
          ${config.icon} ${config.badge}
        </div>
      </div>
      <h3 class="insight-title">${title}</h3>
      <p class="insight-message">${message}</p>
      ${handPreview ? `
        <div class="insight-hand-preview">
          ${handPreview}
        </div>
      ` : ''}
      ${onClick ? `
        <button class="insight-button" onclick="${onClick}">
          View Full Analysis →
        </button>
      ` : ''}
    </div>
  `;
}

// ============================================
// STAT CARD COMPONENT (Legacy Support)
// ============================================
function createStatCard({ icon, label, value, trend, subtitle, color = 'teal' }) {
  const trendIcon = trend > 0 ? '↑' : trend < 0 ? '↓' : '';
  const trendClass = trend > 0 ? 'positive' : trend < 0 ? 'negative' : '';
  
  return `
    <div class="stat-card-modern liquid-glass liquid-glass--lg">
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
        <div class="empty-state-modern-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <line x1="9" y1="3" x2="9" y2="21"/>
            <line x1="15" y1="3" x2="15" y2="21"/>
          </svg>
        </div>
        <h3>No hands found</h3>
        <p>Play some games to see your hand history!</p>
      </div>
    `;
  }
  
  const rows = hands.map(hand => {
    const wonClass = hand.won ? 'won' : 'lost';
    const wonIcon = hand.won ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
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
        <div class="empty-state-modern-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
        </div>
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
        <div class="empty-state-modern-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
            <path d="M4 22h16"/>
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
          </svg>
        </div>
        <h3>No badges yet</h3>
        <p>Keep playing to unlock achievements!</p>
      </div>
    `;
  }
  
  const badgeCards = badges.map(badge => `
    <div class="badge-card-modern liquid-glass liquid-glass--sm" title="${badge.description || badge.name}">
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
  createMetricCard,
  createInsightCard,
  createStatCard,
  createHandHistoryTable,
  createChartContainer,
  createPositionalStatsTable,
  createBadgeDisplay,
  renderWinRateChart,
  renderProfitLossChart
};

