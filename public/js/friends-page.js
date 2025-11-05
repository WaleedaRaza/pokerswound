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
      <div class="empty-state">
        <div class="empty-icon">👥</div>
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
        <div class="friend-card liquid-glass-tile">
          <div class="friend-avatar">${friend.avatar_url || '👤'}</div>
          <div class="friend-info">
            <div class="friend-name">@${friend.username}</div>
            <div class="friend-display-name">${friend.display_name || 'Player'}</div>
          </div>
          <div class="friend-actions">
            <button onclick="inviteToGame('${friend.id}')" class="btn btn-sm btn-primary">
              🎮 Invite
            </button>
            <button onclick="removeFriend('${friend.id}')" class="btn btn-sm btn-danger">
              ❌
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
      <div class="empty-state">
        <div class="empty-icon">📬</div>
        <h3>No pending requests</h3>
        <p>You're all caught up!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = `
    <div class="requests-list">
      ${friendsData.requests.map(request => `
        <div class="request-card liquid-glass-tile">
          <div class="request-info">
            <div class="request-avatar">${request.sender.avatar_url || '👤'}</div>
            <div>
              <div class="request-name">@${request.sender.username}</div>
              <div class="request-display-name">${request.sender.display_name || 'Player'}</div>
              <div class="request-time">${formatTimestamp(request.created_at)}</div>
            </div>
          </div>
          <div class="request-actions">
            <button onclick="acceptFriendRequest('${request.id}')" class="btn btn-sm btn-success">
              ✅ Accept
            </button>
            <button onclick="rejectFriendRequest('${request.id}')" class="btn btn-sm btn-danger">
              ❌ Reject
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
      <div class="search-box liquid-glass-tile">
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
            🔍 Search
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
  const username = input.value.trim();
  
  if (!username) {
    resultsDiv.innerHTML = '<p class="text-muted">Enter a username to search</p>';
    return;
  }
  
  resultsDiv.innerHTML = '<p class="text-muted">⏳ Searching...</p>';
  
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch(`/api/social/username/${username}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 404) {
      resultsDiv.innerHTML = '<p class="text-muted">❌ User not found</p>';
      return;
    }
    
    const user = await response.json();
    
    // Check if already friends
    const isFriend = friendsData.friends.some(f => f.id === user.id);
    
    resultsDiv.innerHTML = `
      <div class="search-result-card">
        <div class="result-avatar">${user.avatar_url || '👤'}</div>
        <div class="result-info">
          <div class="result-name">@${user.username}</div>
          <div class="result-display-name">${user.display_name || 'Player'}</div>
          <div class="result-stats">
            ${user.total_hands_played || 0} hands played • 
            ${user.win_rate || 0}% win rate
          </div>
        </div>
        <div class="result-actions">
          ${isFriend ? 
            '<span class="text-success">✅ Already friends</span>' : 
            `<button onclick="sendFriendRequest('${user.username}')" class="btn btn-primary">
              ➕ Add Friend
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
    const token = await window.authManager.getAccessToken();
    const response = await fetch('/api/social/friends/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username })
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

function inviteToGame(friendId) {
  // TODO: Implement game invite system (Task #11)
  showNotification('info', 'Game invites coming soon!');
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

