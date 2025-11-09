/**
 * Username Styling Utility - MVP
 * Simple rank color mapping and badge display
 */

// Rank color mapping (MVP - simple colors, no animations)
const RANK_COLORS = {
  'NOVICE': '#9CA3AF',
  'APPRENTICE': '#6B7280',
  'COMPETENT': '#4B5563',
  'SKILLED': '#10B981',
  'EXPERT': '#3B82F6',
  'MASTER': '#8B5CF6'
};

/**
 * Get rank color for a user
 * @param {string} userId - User ID
 * @returns {Promise<string>} Hex color code
 */
async function getRankColor(userId) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return RANK_COLORS['NOVICE'];
    
    const response = await fetch(`/api/social/badges/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) return RANK_COLORS['NOVICE'];
    
    const data = await response.json();
    const tier = data.rank?.tier || 'NOVICE';
    return RANK_COLORS[tier] || RANK_COLORS['NOVICE'];
  } catch (error) {
    console.error('Error fetching rank color:', error);
    return RANK_COLORS['NOVICE'];
  }
}

/**
 * Get top badge for a user (launch badges prioritized, then by rarity)
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} Badge object or null
 */
async function getTopBadge(userId) {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return null;
    
    const response = await fetch(`/api/social/badges/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) return null;
    
    const data = await response.json();
    const badges = data.badges || [];
    
    if (badges.length === 0) return null;
    
    // Prioritize launch badges
    const launchBadge = badges.find(b => b.category === 'launch');
    if (launchBadge) return launchBadge;
    
    // Then by rarity (legendary > epic > rare > common)
    const rarityOrder = { 'legendary': 4, 'epic': 3, 'rare': 2, 'common': 1 };
    const sorted = badges.sort((a, b) => 
      (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0)
    );
    
    return sorted[0] || null;
  } catch (error) {
    console.error('Error fetching top badge:', error);
    return null;
  }
}

/**
 * Format username with rank color
 * @param {string} username - Username to format
 * @param {string} rankColor - Hex color code
 * @returns {string} HTML string with styled username
 */
function formatUsernameWithRank(username, rankColor) {
  return `<span style="color: ${rankColor}">@${username}</span>`;
}

/**
 * Format username with rank color and badge icon
 * @param {string} username - Username to format
 * @param {string} rankColor - Hex color code
 * @param {Object|null} badge - Badge object (optional)
 * @returns {string} HTML string with styled username and badge
 */
function formatUsernameWithRankAndBadge(username, rankColor, badge = null) {
  let html = `<span style="color: ${rankColor}">@${username}</span>`;
  
  if (badge) {
    html += ` <span class="badge-icon" title="${badge.name}: ${badge.description}">${badge.icon}</span>`;
  }
  
  return html;
}

/**
 * Apply rank styling to an element
 * @param {HTMLElement} element - Element to style
 * @param {string} userId - User ID
 * @param {boolean} includeBadge - Whether to include badge icon
 */
async function applyRankStyling(element, userId, includeBadge = false) {
  if (!element || !userId) return;
  
  const rankColor = await getRankColor(userId);
  const username = element.textContent.replace('@', '').replace(' (YOU)', '').trim();
  
  if (includeBadge) {
    const badge = await getTopBadge(userId);
    element.innerHTML = formatUsernameWithRankAndBadge(username, rankColor, badge);
  } else {
    element.innerHTML = formatUsernameWithRank(username, rankColor);
  }
}

// Export for use in other files
window.UsernameStyling = {
  getRankColor,
  getTopBadge,
  formatUsernameWithRank,
  formatUsernameWithRankAndBadge,
  applyRankStyling
};

