/**
 * PokerGeek.ai - Empty States Manager
 * Generate friendly empty state messages
 */

window.emptyStates = {
  friends: {
    icon: '👥',
    title: 'No Friends Yet',
    message: 'Add friends to play poker together and climb the leaderboards!',
    action: {
      text: '🔍 Find Friends',
      onClick: 'switchTab("search")'
    }
  },
  
  friendRequests: {
    icon: '📬',
    title: 'No Pending Requests',
    message: 'When someone sends you a friend request, it will appear here.',
    action: null
  },
  
  onlineFriends: {
    icon: '🟢',
    title: 'No Friends Online',
    message: 'Your friends are currently offline. Invite them to play!',
    action: null
  },
  
  rooms: {
    icon: '🎰',
    title: 'No Active Rooms',
    message: 'Create your own poker room or join an existing one to start playing.',
    action: {
      text: '➕ Create Room',
      onClick: 'openCreateModal()'
    }
  },
  
  notifications: {
    icon: '🔔',
    title: 'No Notifications',
    message: 'You\'re all caught up! Friend requests and game invites will appear here.',
    action: null
  },
  
  gameHistory: {
    icon: '📊',
    title: 'No Games Played',
    message: 'Play your first hand to start building your poker history and stats.',
    action: {
      text: '🎮 Play Now',
      onclick: 'window.location.href="/pages/play.html"'
    }
  },
  
  handHistory: {
    icon: '🃏',
    title: 'No Hand History',
    message: 'Complete hands will be saved here for review and analysis.',
    action: null
  },
  
  searchResults: {
    icon: '🔍',
    title: 'No Results Found',
    message: 'Try searching for a different username.',
    action: null
  }
};

// Generate empty state HTML
window.createEmptyState = function(type, customOptions = {}) {
  const state = window.emptyStates[type];
  
  if (!state) {
    console.warn(`Unknown empty state type: ${type}`);
    return '<p style="text-align: center; opacity: 0.7; padding: 2rem;">No items found</p>';
  }
  
  const options = { ...state, ...customOptions };
  const cssClass = `empty-state-${type}`;
  
  let html = `
    <div class="empty-state ${cssClass}">
      <div class="empty-state-icon">${options.icon}</div>
      <div class="empty-state-title">${options.title}</div>
      <div class="empty-state-message">${options.message}</div>
  `;
  
  if (options.action) {
    html += `
      <div class="empty-state-action">
        <button class="btn btn-primary" onclick="${options.action.onClick}">
          ${options.action.text}
        </button>
      </div>
    `;
  }
  
  html += `</div>`;
  
  return html;
};

// Small version for lists
window.createEmptyStateSmall = function(icon, title, message) {
  return `
    <div class="empty-state empty-state-small">
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">${title}</div>
      <div class="empty-state-message">${message}</div>
    </div>
  `;
};

console.log('✅ Empty states manager loaded');

