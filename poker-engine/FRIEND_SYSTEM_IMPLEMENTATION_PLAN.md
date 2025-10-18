# Friend System, Username & In-Game Display Implementation Plan

## 🎯 **System Overview**

A comprehensive social system that integrates with our database schema to provide:
- **Global Username Management** with change tracking and rate limiting
- **Friend System** with requests, acceptance, and blocking
- **In-Game Display Names** with per-game aliases and admin overrides
- **Scalable Architecture** that works with our existing poker engine

---

## 📊 **Database Integration Points**

### **Core Tables We'll Use:**
```sql
-- User Management
user_profiles (global_username, display_name, user_role, is_online, last_seen)
username_changes (audit trail for username changes)
role_permissions (RBAC for friend system features)

-- Social Features  
friendships (requester_id, addressee_id, status, created_at)
player_aliases (game_id, user_id, alias, is_admin_override)
conversations (dm conversations between friends)
messages (friend-to-friend messaging)

-- Moderation
user_blocks (blocker_user_id, blocked_user_id, block_type)
user_reports (reporting inappropriate behavior)
```

---

## 🏗️ **System Architecture**

### **1. Username Management System**

#### **Global Username Features:**
- **Unique Global Usernames**: One per user across the entire platform
- **Display Names**: Optional friendly names (can be different from username)
- **Rate Limiting**: Max 3 changes per month with 24-hour cooldown
- **Admin Override**: Admins can change any username
- **Audit Trail**: Complete history of username changes

#### **API Endpoints:**
```javascript
// Username Management
GET    /api/user/profile              // Get current user profile
PUT    /api/user/profile              // Update profile (username, display_name)
GET    /api/user/username/available   // Check if username is available
POST   /api/user/username/change      // Request username change
GET    /api/user/username/history     // Get username change history

// Admin Username Management
PUT    /api/admin/user/:id/username   // Admin override username
GET    /api/admin/username/changes    // View all username changes
```

#### **Frontend Components:**
```html
<!-- Username Management UI -->
<div class="username-management">
  <div class="current-username">
    <label>Global Username:</label>
    <span id="currentUsername">player123</span>
    <button onclick="showUsernameChangeModal()">✏️ Change</button>
  </div>
  
  <div class="display-name">
    <label>Display Name:</label>
    <input type="text" id="displayName" placeholder="Friendly Name">
    <button onclick="updateDisplayName()">💾 Save</button>
  </div>
  
  <div class="username-stats">
    <span>Changes this month: 1/3</span>
    <span>Next change available: 23h 45m</span>
  </div>
</div>
```

### **2. Friend System**

#### **Friend System Features:**
- **Send Friend Requests**: Search by username and send requests
- **Accept/Reject Requests**: Manage incoming friend requests
- **Friend List**: View all friends with online status
- **Block Users**: Block users from sending requests or messaging
- **Friend Activity**: See when friends are playing games

#### **API Endpoints:**
```javascript
// Friend Management
GET    /api/friends                    // Get friend list
POST   /api/friends/request            // Send friend request
PUT    /api/friends/request/:id        // Accept/reject friend request
DELETE /api/friends/:id                // Remove friend
POST   /api/friends/block              // Block user
DELETE /api/friends/block/:id          // Unblock user

// Friend Search
GET    /api/friends/search?q=username // Search for users by username
GET    /api/friends/requests           // Get pending friend requests
GET    /api/friends/blocked            // Get blocked users list
```

#### **Frontend Components:**
```html
<!-- Friend System UI -->
<div class="friend-system">
  <!-- Friend List -->
  <div class="friend-list">
    <h3>👥 Friends (12)</h3>
    <div class="friend-item online">
      <div class="friend-avatar">A</div>
      <div class="friend-info">
        <div class="friend-name">AliceThePoker</div>
        <div class="friend-status">Playing in Room #1234</div>
      </div>
      <div class="friend-actions">
        <button onclick="messageFriend('alice123')">💬</button>
        <button onclick="inviteToGame('alice123')">🎮</button>
      </div>
    </div>
  </div>
  
  <!-- Friend Requests -->
  <div class="friend-requests">
    <h3>📨 Friend Requests (2)</h3>
    <div class="request-item">
      <div class="request-info">
        <div class="request-name">BobTheBluffer</div>
        <div class="request-time">2 hours ago</div>
      </div>
      <div class="request-actions">
        <button onclick="acceptFriendRequest('req123')">✅ Accept</button>
        <button onclick="rejectFriendRequest('req123')">❌ Reject</button>
      </div>
    </div>
  </div>
  
  <!-- Add Friends -->
  <div class="add-friends">
    <h3>🔍 Add Friends</h3>
    <input type="text" id="friendSearch" placeholder="Search by username...">
    <button onclick="searchUsers()">🔍 Search</button>
    <div id="searchResults" class="search-results"></div>
  </div>
</div>
```

### **3. In-Game Display System**

#### **Display Name Hierarchy:**
1. **Admin Override** (if set by admin)
2. **Per-Game Alias** (if set by user for this game)
3. **Global Display Name** (if set by user)
4. **Global Username** (fallback)

#### **API Endpoints:**
```javascript
// In-Game Display
GET    /api/game/:gameId/players       // Get players with display names
POST   /api/game/:gameId/alias         // Set per-game alias
PUT    /api/game/:gameId/alias/:id     // Update per-game alias
DELETE /api/game/:gameId/alias/:id     // Remove per-game alias

// Admin Display Management
PUT    /api/admin/game/:gameId/player/:id/alias  // Admin override alias
GET    /api/admin/game/:gameId/aliases           // View all aliases
```

#### **Frontend Components:**
```html
<!-- In-Game Player Display -->
<div class="game-player-display">
  <div class="player-seat" data-seat="0">
    <div class="player-avatar">A</div>
    <div class="player-info">
      <div class="player-name">AliceThePoker</div>
      <div class="player-alias">"The Shark"</div>
      <div class="player-status">Online</div>
    </div>
    <div class="player-chips">$2,500</div>
  </div>
</div>

<!-- Alias Management -->
<div class="alias-management">
  <h3>🎭 Your Display Name in This Game</h3>
  <input type="text" id="gameAlias" placeholder="Enter alias for this game...">
  <button onclick="setGameAlias()">💾 Set Alias</button>
  <div class="alias-preview">
    <span>You'll appear as: </span>
    <strong id="aliasPreview">AliceThePoker</strong>
  </div>
</div>
```

---

## 🔧 **Backend Implementation**

### **1. Username Management Service**

```javascript
// services/usernameService.js
class UsernameService {
  async getUserProfile(userId) {
    const profile = await db.query(`
      SELECT up.*, 
             (SELECT COUNT(*) FROM username_changes WHERE user_id = up.id) as change_count,
             (SELECT MAX(changed_at) FROM username_changes WHERE user_id = up.id) as last_change
      FROM user_profiles up 
      WHERE up.id = $1
    `, [userId]);
    
    return profile.rows[0];
  }
  
  async checkUsernameAvailable(username) {
    const result = await db.query(`
      SELECT COUNT(*) FROM user_profiles 
      WHERE global_username = $1
    `, [username]);
    
    return result.rows[0].count === '0';
  }
  
  async changeUsername(userId, newUsername, adminOverride = false) {
    // Check rate limiting
    if (!adminOverride) {
      const canChange = await db.query(`
        SELECT can_change_username($1, $2)
      `, [userId, newUsername]);
      
      if (!canChange.rows[0].can_change_username) {
        throw new Error('Username change rate limit exceeded');
      }
    }
    
    // Check availability
    const available = await this.checkUsernameAvailable(newUsername);
    if (!available) {
      throw new Error('Username already taken');
    }
    
    // Update username
    await db.query(`
      UPDATE user_profiles 
      SET global_username = $2, 
          username_changed_at = NOW(),
          username_change_count = username_change_count + 1
      WHERE id = $1
    `, [userId, newUsername]);
    
    // Log change
    await db.query(`
      INSERT INTO username_changes (user_id, new_username, changed_at)
      VALUES ($1, $2, NOW())
    `, [userId, newUsername]);
  }
}
```

### **2. Friend System Service**

```javascript
// services/friendService.js
class FriendService {
  async getFriends(userId) {
    const friends = await db.query(`
      SELECT f.*, up.global_username, up.display_name, up.is_online, up.last_seen
      FROM friendships f
      JOIN user_profiles up ON (
        CASE 
          WHEN f.requester_id = $1 THEN f.addressee_id = up.id
          ELSE f.requester_id = up.id
        END
      )
      WHERE (f.requester_id = $1 OR f.addressee_id = $1) 
      AND f.status = 'accepted'
      ORDER BY up.is_online DESC, up.last_seen DESC
    `, [userId]);
    
    return friends.rows;
  }
  
  async sendFriendRequest(requesterId, addresseeUsername) {
    // Find addressee by username
    const addressee = await db.query(`
      SELECT id FROM user_profiles WHERE global_username = $1
    `, [addresseeUsername]);
    
    if (addressee.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const addresseeId = addressee.rows[0].id;
    
    // Check if already friends or request exists
    const existing = await db.query(`
      SELECT * FROM friendships 
      WHERE (requester_id = $1 AND addressee_id = $2) 
      OR (requester_id = $2 AND addressee_id = $1)
    `, [requesterId, addresseeId]);
    
    if (existing.rows.length > 0) {
      throw new Error('Friend request already exists');
    }
    
    // Check if blocked
    const blocked = await db.query(`
      SELECT is_user_blocked($1, $2, 'USER')
    `, [addresseeId, requesterId]);
    
    if (blocked.rows[0].is_user_blocked) {
      throw new Error('Cannot send friend request - user has blocked you');
    }
    
    // Create friend request
    await db.query(`
      INSERT INTO friendships (requester_id, addressee_id, status)
      VALUES ($1, $2, 'pending')
    `, [requesterId, addresseeId]);
  }
  
  async respondToFriendRequest(requestId, userId, action) {
    const result = await db.query(`
      UPDATE friendships 
      SET status = $3, updated_at = NOW()
      WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
      RETURNING *
    `, [requestId, userId, action]);
    
    if (result.rows.length === 0) {
      throw new Error('Friend request not found or already processed');
    }
    
    return result.rows[0];
  }
}
```

### **3. In-Game Display Service**

```javascript
// services/displayService.js
class DisplayService {
  async getPlayerDisplayName(userId, gameId) {
    // Check for admin override first
    const adminOverride = await db.query(`
      SELECT alias FROM player_aliases 
      WHERE user_id = $1 AND game_id = $2 AND is_admin_override = true
    `, [userId, gameId]);
    
    if (adminOverride.rows.length > 0) {
      return {
        displayName: adminOverride.rows[0].alias,
        type: 'admin_override'
      };
    }
    
    // Check for per-game alias
    const gameAlias = await db.query(`
      SELECT alias FROM player_aliases 
      WHERE user_id = $1 AND game_id = $2 AND is_admin_override = false
    `, [userId, gameId]);
    
    if (gameAlias.rows.length > 0) {
      return {
        displayName: gameAlias.rows[0].alias,
        type: 'game_alias'
      };
    }
    
    // Fall back to global display name or username
    const profile = await db.query(`
      SELECT display_name, global_username FROM user_profiles WHERE id = $1
    `, [userId]);
    
    const displayName = profile.rows[0].display_name || profile.rows[0].global_username;
    
    return {
      displayName,
      type: 'global'
    };
  }
  
  async setGameAlias(userId, gameId, alias) {
    // Validate alias format
    if (!/^[a-zA-Z0-9_-]{1,32}$/.test(alias)) {
      throw new Error('Invalid alias format');
    }
    
    // Check if alias is already taken in this game
    const existing = await db.query(`
      SELECT COUNT(*) FROM player_aliases 
      WHERE game_id = $1 AND alias = $2 AND user_id != $3
    `, [gameId, alias, userId]);
    
    if (existing.rows[0].count > '0') {
      throw new Error('Alias already taken in this game');
    }
    
    // Upsert alias
    await db.query(`
      INSERT INTO player_aliases (user_id, game_id, alias, is_admin_override)
      VALUES ($1, $2, $3, false)
      ON CONFLICT (user_id, game_id) 
      DO UPDATE SET alias = $3, updated_at = NOW()
    `, [userId, gameId, alias]);
  }
}
```

---

## 🎨 **Frontend Implementation**

### **1. Username Management Component**

```javascript
// components/UsernameManager.js
class UsernameManager {
  constructor() {
    this.currentUser = null;
    this.usernameChangeCooldown = null;
  }
  
  async loadUserProfile() {
    const response = await fetch('/api/user/profile');
    const profile = await response.json();
    this.currentUser = profile;
    this.render();
  }
  
  render() {
    const container = document.getElementById('usernameManager');
    container.innerHTML = `
      <div class="username-card">
        <h3>👤 Your Profile</h3>
        
        <div class="current-username">
          <label>Global Username:</label>
          <div class="username-display">
            <span class="username">${this.currentUser.global_username}</span>
            <button onclick="usernameManager.showChangeModal()" 
                    ${this.canChangeUsername() ? '' : 'disabled'}>
              ✏️ Change
            </button>
          </div>
        </div>
        
        <div class="display-name">
          <label>Display Name:</label>
          <input type="text" id="displayNameInput" 
                 value="${this.currentUser.display_name || ''}" 
                 placeholder="Friendly name (optional)">
          <button onclick="usernameManager.updateDisplayName()">💾 Save</button>
        </div>
        
        <div class="username-stats">
          <div class="stat">
            <span>Changes this month:</span>
            <span>${this.currentUser.username_change_count}/${this.currentUser.max_username_changes}</span>
          </div>
          <div class="stat">
            <span>Next change available:</span>
            <span id="cooldownTimer">${this.getCooldownText()}</span>
          </div>
        </div>
      </div>
    `;
  }
  
  canChangeUsername() {
    if (!this.currentUser) return false;
    
    const changesLeft = this.currentUser.max_username_changes - this.currentUser.username_change_count;
    const hasCooldown = this.usernameChangeCooldown && this.usernameChangeCooldown > Date.now();
    
    return changesLeft > 0 && !hasCooldown;
  }
  
  async showChangeModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <h3>Change Username</h3>
        <input type="text" id="newUsername" placeholder="Enter new username">
        <div id="usernameAvailability"></div>
        <div class="modal-actions">
          <button onclick="usernameManager.changeUsername()">💾 Change</button>
          <button onclick="this.closest('.modal').remove()">❌ Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Real-time availability checking
    document.getElementById('newUsername').addEventListener('input', 
      debounce(this.checkUsernameAvailability.bind(this), 500));
  }
  
  async checkUsernameAvailability() {
    const username = document.getElementById('newUsername').value;
    const availabilityDiv = document.getElementById('usernameAvailability');
    
    if (username.length < 3) {
      availabilityDiv.innerHTML = '';
      return;
    }
    
    try {
      const response = await fetch(`/api/user/username/available?username=${username}`);
      const result = await response.json();
      
      if (result.available) {
        availabilityDiv.innerHTML = '<span class="success">✅ Available</span>';
      } else {
        availabilityDiv.innerHTML = '<span class="error">❌ Already taken</span>';
      }
    } catch (error) {
      availabilityDiv.innerHTML = '<span class="error">❌ Error checking availability</span>';
    }
  }
  
  async changeUsername() {
    const newUsername = document.getElementById('newUsername').value;
    
    try {
      await fetch('/api/user/username/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername })
      });
      
      this.loadUserProfile();
      document.querySelector('.modal').remove();
      showStatus('✅ Username changed successfully!', 'success');
    } catch (error) {
      showStatus(`❌ ${error.message}`, 'error');
    }
  }
}

// Initialize
const usernameManager = new UsernameManager();
```

### **2. Friend System Component**

```javascript
// components/FriendSystem.js
class FriendSystem {
  constructor() {
    this.friends = [];
    this.requests = [];
    this.searchResults = [];
  }
  
  async loadFriends() {
    try {
      const response = await fetch('/api/friends');
      const data = await response.json();
      this.friends = data.friends;
      this.requests = data.requests;
      this.render();
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  }
  
  render() {
    const container = document.getElementById('friendSystem');
    container.innerHTML = `
      <div class="friend-system">
        <!-- Friend List -->
        <div class="friend-list">
          <h3>👥 Friends (${this.friends.length})</h3>
          <div class="friends-container">
            ${this.friends.map(friend => this.renderFriend(friend)).join('')}
          </div>
        </div>
        
        <!-- Friend Requests -->
        <div class="friend-requests">
          <h3>📨 Friend Requests (${this.requests.length})</h3>
          <div class="requests-container">
            ${this.requests.map(request => this.renderRequest(request)).join('')}
          </div>
        </div>
        
        <!-- Add Friends -->
        <div class="add-friends">
          <h3>🔍 Add Friends</h3>
          <div class="search-container">
            <input type="text" id="friendSearchInput" placeholder="Search by username...">
            <button onclick="friendSystem.searchUsers()">🔍 Search</button>
          </div>
          <div id="searchResults" class="search-results"></div>
        </div>
      </div>
    `;
  }
  
  renderFriend(friend) {
    const statusClass = friend.is_online ? 'online' : 'offline';
    const statusText = friend.is_online ? 'Online' : `Last seen ${this.formatLastSeen(friend.last_seen)}`;
    
    return `
      <div class="friend-item ${statusClass}">
        <div class="friend-avatar">${friend.display_name?.charAt(0) || friend.global_username.charAt(0)}</div>
        <div class="friend-info">
          <div class="friend-name">${friend.display_name || friend.global_username}</div>
          <div class="friend-status">${statusText}</div>
        </div>
        <div class="friend-actions">
          <button onclick="friendSystem.messageFriend('${friend.id}')" title="Send Message">💬</button>
          <button onclick="friendSystem.inviteToGame('${friend.id}')" title="Invite to Game">🎮</button>
          <button onclick="friendSystem.removeFriend('${friend.id}')" title="Remove Friend">❌</button>
        </div>
      </div>
    `;
  }
  
  renderRequest(request) {
    return `
      <div class="request-item">
        <div class="request-info">
          <div class="request-name">${request.display_name || request.global_username}</div>
          <div class="request-time">${this.formatTimeAgo(request.created_at)}</div>
        </div>
        <div class="request-actions">
          <button onclick="friendSystem.acceptRequest('${request.id}')" class="btn-success">✅ Accept</button>
          <button onclick="friendSystem.rejectRequest('${request.id}')" class="btn-danger">❌ Reject</button>
        </div>
      </div>
    `;
  }
  
  async searchUsers() {
    const query = document.getElementById('friendSearchInput').value;
    if (query.length < 3) return;
    
    try {
      const response = await fetch(`/api/friends/search?q=${encodeURIComponent(query)}`);
      const results = await response.json();
      this.searchResults = results;
      this.renderSearchResults();
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }
  
  renderSearchResults() {
    const container = document.getElementById('searchResults');
    container.innerHTML = `
      <div class="search-results">
        ${this.searchResults.map(user => `
          <div class="search-result-item">
            <div class="user-info">
              <div class="user-name">${user.display_name || user.global_username}</div>
              <div class="user-status">${user.is_online ? 'Online' : 'Offline'}</div>
            </div>
            <button onclick="friendSystem.sendFriendRequest('${user.id}')" class="btn-primary">
              👥 Add Friend
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }
  
  async sendFriendRequest(userId) {
    try {
      await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId })
      });
      
      showStatus('✅ Friend request sent!', 'success');
      this.searchUsers(); // Refresh search results
    } catch (error) {
      showStatus(`❌ ${error.message}`, 'error');
    }
  }
  
  async acceptRequest(requestId) {
    try {
      await fetch(`/api/friends/request/${requestId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' })
      });
      
      showStatus('✅ Friend request accepted!', 'success');
      this.loadFriends();
    } catch (error) {
      showStatus(`❌ ${error.message}`, 'error');
    }
  }
}

// Initialize
const friendSystem = new FriendSystem();
```

### **3. In-Game Display Component**

```javascript
// components/GameDisplayManager.js
class GameDisplayManager {
  constructor(gameId) {
    this.gameId = gameId;
    this.playerAliases = new Map();
  }
  
  async loadPlayerDisplayNames() {
    try {
      const response = await fetch(`/api/game/${this.gameId}/players`);
      const players = await response.json();
      
      // Store display names for quick access
      players.forEach(player => {
        this.playerAliases.set(player.user_id, {
          displayName: player.display_name,
          type: player.display_type,
          isOnline: player.is_online
        });
      });
      
      this.updateGameDisplay();
    } catch (error) {
      console.error('Error loading player display names:', error);
    }
  }
  
  updateGameDisplay() {
    // Update all player seats with proper display names
    document.querySelectorAll('.player-seat').forEach(seat => {
      const userId = seat.dataset.userId;
      if (userId && this.playerAliases.has(userId)) {
        const playerInfo = this.playerAliases.get(userId);
        const nameElement = seat.querySelector('.player-name');
        
        if (nameElement) {
          nameElement.textContent = playerInfo.displayName;
          
          // Add visual indicators
          nameElement.className = 'player-name';
          if (playerInfo.type === 'admin_override') {
            nameElement.classList.add('admin-override');
          } else if (playerInfo.type === 'game_alias') {
            nameElement.classList.add('game-alias');
          }
          
          // Add online status
          const statusElement = seat.querySelector('.player-status');
          if (statusElement) {
            statusElement.textContent = playerInfo.isOnline ? '🟢 Online' : '🔴 Offline';
          }
        }
      }
    });
  }
  
  async setGameAlias(alias) {
    try {
      await fetch(`/api/game/${this.gameId}/alias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alias })
      });
      
      showStatus('✅ Game alias set!', 'success');
      this.loadPlayerDisplayNames();
    } catch (error) {
      showStatus(`❌ ${error.message}`, 'error');
    }
  }
  
  renderAliasManager() {
    const container = document.getElementById('aliasManager');
    container.innerHTML = `
      <div class="alias-manager">
        <h3>🎭 Your Display Name in This Game</h3>
        <div class="alias-input">
          <input type="text" id="gameAliasInput" placeholder="Enter alias for this game...">
          <button onclick="gameDisplayManager.setGameAlias(document.getElementById('gameAliasInput').value)">
            💾 Set Alias
          </button>
        </div>
        <div class="alias-preview">
          <span>You'll appear as: </span>
          <strong id="aliasPreview">Loading...</strong>
        </div>
        <div class="alias-info">
          <small>• Aliases are only visible in this game</small>
          <small>• Must be 1-32 characters, letters, numbers, hyphens, underscores only</small>
        </div>
      </div>
    `;
    
    // Update preview in real-time
    document.getElementById('gameAliasInput').addEventListener('input', (e) => {
      const preview = document.getElementById('aliasPreview');
      preview.textContent = e.target.value || 'Your Global Username';
    });
  }
}

// Initialize for current game
const gameDisplayManager = new GameDisplayManager(currentGame?.gameId);
```

---

## 🔄 **Integration Points**

### **1. Database Triggers**
```sql
-- Auto-update last_seen when user is active
CREATE OR REPLACE FUNCTION update_user_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_profiles 
  SET last_seen = NOW(), is_online = TRUE 
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on game actions
CREATE TRIGGER update_last_seen_on_action
  AFTER INSERT ON actions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_last_seen();
```

### **2. WebSocket Events**
```javascript
// Real-time friend status updates
socket.on('friend_status_update', (data) => {
  friendSystem.updateFriendStatus(data.user_id, data.is_online, data.last_seen);
});

// Real-time username changes
socket.on('username_changed', (data) => {
  if (data.user_id === currentUser.id) {
    usernameManager.loadUserProfile();
  }
  // Update any displays of this user
  gameDisplayManager.updatePlayerDisplay(data.user_id, data.new_username);
});
```

### **3. Permission System Integration**
```javascript
// Check if user can perform friend actions
async function canPerformFriendAction(action, targetUserId) {
  const response = await fetch(`/api/friends/permissions?action=${action}&target=${targetUserId}`);
  return response.json();
}

// Check if user can change username
async function canChangeUsername() {
  const response = await fetch('/api/user/username/can-change');
  return response.json();
}
```

---

## 📱 **Mobile Responsiveness**

### **Responsive Design Considerations:**
- **Touch-friendly buttons** (minimum 44px touch targets)
- **Swipe gestures** for friend list management
- **Collapsible sections** to save screen space
- **Bottom navigation** for easy thumb access
- **Pull-to-refresh** for friend list updates

### **Mobile-Specific Features:**
- **Quick actions** (swipe to accept/reject friend requests)
- **Push notifications** for friend requests and messages
- **Offline mode** with sync when reconnected
- **Voice search** for finding friends

---

## 🚀 **Scalability Considerations**

### **Performance Optimizations:**
- **Lazy loading** of friend lists (load 20 at a time)
- **Debounced search** (500ms delay on input)
- **Caching** of display names in memory
- **Pagination** for large friend lists
- **IndexedDB** for offline friend data

### **Database Optimizations:**
- **Composite indexes** on frequently queried columns
- **Materialized views** for complex friend queries
- **Partitioning** of large tables by user_id
- **Connection pooling** for high concurrency

### **Caching Strategy:**
- **Redis cache** for frequently accessed user profiles
- **CDN caching** for static assets
- **Browser caching** with proper cache headers
- **Service worker** for offline functionality

---

## 🧪 **Testing Strategy**

### **Unit Tests:**
- Username validation and rate limiting
- Friend request logic and edge cases
- Display name hierarchy resolution
- Permission checking functions

### **Integration Tests:**
- API endpoint functionality
- Database constraint validation
- WebSocket event handling
- Cross-component communication

### **E2E Tests:**
- Complete friend request flow
- Username change process
- In-game display name updates
- Mobile responsiveness

---

## 📊 **Analytics & Monitoring**

### **Key Metrics:**
- **Friend request acceptance rate**
- **Username change frequency**
- **Display name usage patterns**
- **User engagement with social features**

### **Performance Monitoring:**
- **API response times**
- **Database query performance**
- **WebSocket connection stability**
- **Mobile app performance**

---

This implementation plan provides a comprehensive, scalable foundation for the friend system, username management, and in-game display features that integrates seamlessly with your existing database schema and poker engine architecture.
