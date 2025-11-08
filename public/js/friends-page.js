/**
 * PokerGeek.ai - Friends Page Controller
 * Manages friends list, requests, and search functionality
 */

let currentTab = 'friends';
let friendsData = {
  friends: [],
  requests: [],
  sent: []
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format username with @ prefix (ensures no double @)
 * @param {string} username - Username to format
 * @returns {string} Formatted username with @ prefix
 */
function formatUsername(username) {
  if (!username) return '@unknown';
  // Remove existing @ if present, then add it
  const clean = username.replace(/^@+/, '');
  return `@${clean}`;
}

/**
 * Sanitize username for display (escape HTML)
 * @param {string} username - Username to sanitize
 * @returns {string} Sanitized username
 */
function sanitizeUsername(username) {
  if (!username) return 'unknown';
  const div = document.createElement('div');
  div.textContent = username.replace(/^@+/, ''); // Remove @ for sanitization
  return div.innerHTML;
}

// ============================================
// INITIALIZATION
// ============================================

async function initFriendsPage() {
  console.log('🔄 Initializing friends page...');
  
  // Check if user is logged in
  const token = await window.authManager.getAccessToken();
  if (!token) {
    window.location.href = '/';
    return;
  }
  
  // Load all data
  await Promise.all([
    loadFriends(),
    loadFriendRequests(),
    loadNotificationCount()
  ]);
  
  // Render initial view
  renderCurrentTab();
  
  console.log('✅ Friends page initialized');
}

// ============================================
// DATA LOADING
// ============================================

async function loadFriends() {
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch('/api/social/friends', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      friendsData.friends = await response.json();
      updateFriendsCount();
    }
  } catch (error) {
    console.error('Error loading friends:', error);
  }
}

async function loadFriendRequests() {
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch('/api/social/friends/requests', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      friendsData.requests = await response.json();
      updateRequestsCount();
    }
  } catch (error) {
    console.error('Error loading friend requests:', error);
  }
}

async function loadNotificationCount() {
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch('/api/social/notifications/count', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const { count } = await response.json();
      if (count > 0) {
        // Show notification badge somewhere
        console.log(`📬 ${count} unread notifications`);
      }
    }
  } catch (error) {
    console.error('Error loading notification count:', error);
  }
}

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tab) {
  currentTab = tab;
  
  // Update tab buttons
  document.querySelectorAll('.friends-tab').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  
  // Render content
  renderCurrentTab();
}

function renderCurrentTab() {
  const container = document.getElementById('friendsContent');
  
  switch (currentTab) {
    case 'friends':
      renderFriendsList(container);
      break;
    case 'requests':
      renderRequestsList(container);
      break;
    case 'search':
      renderSearchView(container);
      break;
    default:
      renderFriendsList(container);
  }
}

// ============================================
// RENDER FUNCTIONS
// ============================================

function renderFriendsList(container) {
  if (friendsData.friends.length === 0) {
    container.innerHTML = `
      <div class="empty-state-modern">
        <div class="empty-state-modern-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </div>
        <h3>No friends yet</h3>
        <p>Add friends to start playing together!</p>
        <button onclick="switchTab('search')" class="btn btn-primary">
          Find Friends
        </button>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="friends-grid">
      ${friendsData.friends.map(friend => `
        <div class="friend-card liquid-glass liquid-glass--lg">
          <div class="friend-avatar">
            ${friend.avatar_url ? 
              `<img src="${friend.avatar_url}" alt="${sanitizeUsername(friend.username)}" onerror="this.style.display='none'; this.parentElement.innerHTML='<svg width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><path d=\\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\\'/><circle cx=\\'12\\' cy=\\'7\\' r=\\'4\\'/></svg>';" />` : 
              '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
            }
          </div>
          <div class="friend-info">
            <div class="friend-name" title="${formatUsername(friend.username || 'unknown')}">${formatUsername(friend.username || 'unknown')}</div>
            <div class="friend-display-name" title="${friend.display_name || 'Player'}">${friend.display_name || 'Player'}</div>
          </div>
          <div class="friend-actions">
            <button onclick="window.openPlayerProfile('${friend.id}')" class="btn btn-sm btn-primary" title="View Profile">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </button>
            <button onclick="inviteToGame('${friend.id}')" class="btn btn-sm btn-success" title="Invite to Game">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </button>
            <button onclick="removeFriend('${friend.id}')" class="btn btn-sm btn-danger" title="Remove Friend">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderRequestsList(container) {
  if (friendsData.requests.length === 0) {
    container.innerHTML = `
      <div class="empty-state-modern">
        <div class="empty-state-modern-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h3>No pending requests</h3>
        <p>You're all caught up!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="requests-list">
      ${friendsData.requests.map(request => `
        <div class="request-card liquid-glass liquid-glass--lg">
          <div class="request-info">
            <div class="request-avatar">
              ${request.sender.avatar_url ? 
                `<img src="${request.sender.avatar_url}" alt="${sanitizeUsername(request.sender.username)}" onerror="this.style.display='none'; this.parentElement.innerHTML='<svg width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><path d=\\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\\'/><circle cx=\\'12\\' cy=\\'7\\' r=\\'4\\'/></svg>';" />` : 
                '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
              }
            </div>
            <div class="request-details">
              <div class="request-name" title="${formatUsername(request.sender.username || 'unknown')}">${formatUsername(request.sender.username || 'unknown')}</div>
              <div class="request-display-name" title="${request.sender.display_name || 'Player'}">${request.sender.display_name || 'Player'}</div>
              <div class="request-time">${formatTimestamp(request.created_at)}</div>
            </div>
          </div>
          <div class="request-actions">
            <button onclick="acceptFriendRequest('${request.id}')" class="btn btn-sm btn-success">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Accept
            </button>
            <button onclick="rejectFriendRequest('${request.id}')" class="btn btn-sm btn-danger">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Reject
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderSearchView(container) {
  container.innerHTML = `
    <div class="search-container">
      <div class="search-box liquid-glass liquid-glass--lg">
        <h3>Find Friends</h3>
        <div class="search-input-group">
          <input 
            type="text" 
            id="searchInput" 
            class="social-input" 
            placeholder="Enter username..."
            autocomplete="off"
          />
          <button onclick="searchUsers()" class="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            Search
          </button>
        </div>
        <div id="searchResults" class="search-results"></div>
      </div>
    </div>
  `;
  
  // Enter key to search
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchUsers();
    }
  });
}

// ============================================
// ACTIONS
// ============================================

async function searchUsers() {
  const input = document.getElementById('searchInput');
  const resultsDiv = document.getElementById('searchResults');
  let username = input.value.trim();
  
  // Remove @ prefix if user typed it
  username = username.replace(/^@+/, '');
  
  if (!username) {
    resultsDiv.innerHTML = '<p class="text-muted">Enter a username to search</p>';
    return;
  }
  
  resultsDiv.innerHTML = '<p class="text-muted">Searching...</p>';
  
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch(`/api/social/username/${encodeURIComponent(username)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 404) {
      resultsDiv.innerHTML = '<p class="text-muted">User not found</p>';
      return;
    }
    
    const user = await response.json();
    
    // Check if already friends
    const isFriend = friendsData.friends.some(f => f.id === user.id);
    
    resultsDiv.innerHTML = `
      <div class="search-result-card liquid-glass liquid-glass--lg">
        <div class="result-avatar">
          ${user.avatar_url ? 
            `<img src="${user.avatar_url}" alt="${sanitizeUsername(user.username)}" onerror="this.style.display='none'; this.parentElement.innerHTML='<svg width=\\'30\\' height=\\'30\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><path d=\\'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\\'/><circle cx=\\'12\\' cy=\\'7\\' r=\\'4\\'/></svg>';" />` : 
            '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
          }
        </div>
        <div class="result-info">
          <div class="result-name" title="${formatUsername(user.username || 'unknown')}">${formatUsername(user.username || 'unknown')}</div>
          <div class="result-display-name" title="${user.display_name || 'Player'}">${user.display_name || 'Player'}</div>
          <div class="result-stats">
            ${user.total_hands_played || 0} hands played • 
            ${user.win_rate || 0}% win rate
          </div>
        </div>
        <div class="result-actions">
          ${isFriend ? 
            '<span class="text-success">Already friends</span>' : 
            `<button onclick="sendFriendRequest('${sanitizeUsername(user.username)}')" class="btn btn-primary btn-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="5" x2="12" y2="19"/>
                <line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add
            </button>`
          }
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error searching users:', error);
    resultsDiv.innerHTML = '<p class="text-error">Error searching. Try again.</p>';
  }
}

async function sendFriendRequest(username) {
  try {
    // Remove @ prefix if present (username from DB doesn't have @)
    const cleanUsername = username.replace(/^@+/, '');
    
    const token = await window.authManager.getAccessToken();
    const response = await fetch('/api/social/friends/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username: cleanUsername })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      showNotification('success', 'Friend request sent!');
      document.getElementById('searchInput').value = '';
      document.getElementById('searchResults').innerHTML = '';
    } else {
      showNotification('error', data.error || 'Failed to send request');
    }
  } catch (error) {
    console.error('Error sending friend request:', error);
    showNotification('error', 'Failed to send request');
  }
}

async function acceptFriendRequest(requestId) {
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch(`/api/social/friends/accept/${requestId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      showNotification('success', 'Friend request accepted!');
      await Promise.all([loadFriends(), loadFriendRequests()]);
      renderCurrentTab();
    } else {
      showNotification('error', 'Failed to accept request');
    }
  } catch (error) {
    console.error('Error accepting friend request:', error);
    showNotification('error', 'Failed to accept request');
  }
}

async function rejectFriendRequest(requestId) {
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch(`/api/social/friends/reject/${requestId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      showNotification('success', 'Friend request rejected');
      await loadFriendRequests();
      renderCurrentTab();
    } else {
      showNotification('error', 'Failed to reject request');
    }
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    showNotification('error', 'Failed to reject request');
  }
}

async function removeFriend(friendId) {
  if (!confirm('Remove this friend?')) return;
  
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch(`/api/social/friends/${friendId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      showNotification('success', 'Friend removed');
      await loadFriends();
      renderCurrentTab();
    } else {
      showNotification('error', 'Failed to remove friend');
    }
  } catch (error) {
    console.error('Error removing friend:', error);
    showNotification('error', 'Failed to remove friend');
  }
}

async function inviteToGame(friendId) {
  try {
    // Get user's active rooms
    const token = await window.authManager.getAccessToken();
    const roomsResponse = await fetch('/api/rooms/my-rooms', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!roomsResponse.ok) {
      throw new Error('Failed to load rooms');
    }
    
    const roomsData = await roomsResponse.json();
    const rooms = roomsData.rooms || [];
    
    if (rooms.length === 0) {
      showNotification('info', 'Create a room first, then invite your friend!');
      return;
    }
    
    // Show invite modal
    const friend = friendsData.friends.find(f => f.id === friendId);
    const modal = document.createElement('div');
    modal.id = 'inviteGameModal';
    modal.className = 'social-modal-overlay';
    
    modal.innerHTML = `
      <div class="social-modal">
        <div class="social-modal-header">
          <h2>Invite ${friend?.username || 'Friend'} to Game</h2>
          <button onclick="closeInviteGameModal()" class="close-btn">×</button>
        </div>
        
        <div class="social-modal-body">
          <p>Select a room to invite your friend to:</p>
          
          <div class="rooms-list">
            ${rooms.map(room => `
              <div class="room-invite-card" onclick="sendGameInvite('${friendId}', '${room.id}', '${room.name}')">
                <div class="room-invite-name">${room.name}</div>
                <div class="room-invite-details">
                  ${room.player_count || 0}/${room.max_players || 8} players • 
                  ${room.game_format || 'Private Room'}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        
        <div class="social-modal-actions">
          <button onclick="closeInviteGameModal()" class="btn btn-secondary">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('Error opening invite modal:', error);
    showNotification('error', 'Failed to load rooms');
  }
}

function closeInviteGameModal() {
  const modal = document.getElementById('inviteGameModal');
  if (modal) modal.remove();
}

async function sendGameInvite(friendId, roomId, roomName) {
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch(`/api/rooms/${roomId}/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ friendId })
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to send invite');
    }
    
    showNotification('success', `Invite sent to ${roomName}!`);
    closeInviteGameModal();
    
  } catch (error) {
    console.error('Error sending game invite:', error);
    showNotification('error', error.message || 'Failed to send invite');
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function updateFriendsCount() {
  const countEl = document.getElementById('friendsCount');
  if (countEl) {
    countEl.textContent = friendsData.friends.length;
  }
}

function updateRequestsCount() {
  const countEl = document.getElementById('requestsCount');
  if (countEl) {
    countEl.textContent = friendsData.requests.length;
    countEl.style.display = friendsData.requests.length > 0 ? 'inline' : 'none';
  }
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  return `${Math.floor(diffMins / 1440)}d ago`;
}

function showNotification(type, message) {
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ============================================
// AUTO-INITIALIZE
// ============================================

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFriendsPage);
} else {
  initFriendsPage();
}

console.log('✅ Friends page controller loaded');

