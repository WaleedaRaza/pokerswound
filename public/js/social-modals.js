/**
 * PokerGeek.ai - Social Feature Modals
 * Username selection, profile modal, friend requests
 */

// ============================================
// USERNAME SELECTION MODAL
// ============================================

function showUsernameModal() {
  const modal = document.createElement('div');
  modal.id = 'usernameModal';
  modal.className = 'social-modal-overlay';
  modal.innerHTML = `
    <div class="social-modal">
      <div class="social-modal-header">
        <h2>🎯 Choose Your Username</h2>
        <p>This will be your unique identity on PokerGeek.ai</p>
      </div>
      
      <div class="social-modal-body">
        <div class="form-group">
          <label for="usernameInput">Username</label>
          <input 
            type="text" 
            id="usernameInput" 
            class="social-input" 
            placeholder="Enter username (3-20 chars)"
            maxlength="20"
            autocomplete="off"
          />
          <div id="usernameStatus" class="input-status"></div>
          <p class="input-hint">Letters, numbers, and underscore only</p>
        </div>
      </div>
      
      <div class="social-modal-actions">
        <button onclick="checkUsernameAndSet()" class="btn btn-primary" id="setUsernameBtn">
          Set Username
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Focus input
  setTimeout(() => {
    document.getElementById('usernameInput').focus();
  }, 100);
  
  // Real-time validation
  document.getElementById('usernameInput').addEventListener('input', debounce(checkUsernameAvailability, 500));
  
  // Enter key to submit
  document.getElementById('usernameInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      checkUsernameAndSet();
    }
  });
}

async function checkUsernameAvailability() {
  const input = document.getElementById('usernameInput');
  const status = document.getElementById('usernameStatus');
  const username = input.value.trim();
  
  if (!username) {
    status.textContent = '';
    status.className = 'input-status';
    return;
  }
  
  // Client-side validation
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    status.textContent = '❌ Invalid format';
    status.className = 'input-status error';
    return;
  }
  
  status.textContent = '⏳ Checking...';
  status.className = 'input-status checking';
  
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch('/api/social/username/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username })
    });
    
    const data = await response.json();
    
    if (data.available) {
      status.textContent = '✅ Available';
      status.className = 'input-status success';
    } else {
      status.textContent = '❌ Already taken';
      status.className = 'input-status error';
    }
  } catch (error) {
    console.error('Error checking username:', error);
    status.textContent = '⚠️ Error checking';
    status.className = 'input-status error';
  }
}

async function checkUsernameAndSet() {
  const input = document.getElementById('usernameInput');
  const btn = document.getElementById('setUsernameBtn');
  const username = input.value.trim();
  
  if (!username) {
    alert('Please enter a username');
    return;
  }
  
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    alert('Username must be 3-20 characters (letters, numbers, underscore only)');
    return;
  }
  
  btn.disabled = true;
  btn.textContent = 'Setting...';
  
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch('/api/social/username/set', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Success! Close modal and update UI
      document.getElementById('usernameModal').remove();
      
      // Update navbar username display
      const userNameEl = document.getElementById('userName');
      const dropdownUsernameEl = document.getElementById('dropdownUsername');
      if (userNameEl) userNameEl.textContent = `@${username}`;
      if (dropdownUsernameEl) dropdownUsernameEl.textContent = `@${username}`;
      
      // ✅ Username stored in DB - refresh UI from DB (single source of truth)
      if (window.refreshUsernameInUI) {
        await window.refreshUsernameInUI(window.authManager?.user?.id);
      }
      
      // Show success message
      showNotification('success', 'Username set successfully!');
    } else {
      alert(data.error || 'Failed to set username');
      btn.disabled = false;
      btn.textContent = 'Set Username';
    }
  } catch (error) {
    console.error('Error setting username:', error);
    alert('Failed to set username. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Set Username';
  }
}

// ============================================
// PROFILE MODAL
// ============================================

async function openProfileModal() {
  try {
    // First check if user is authenticated (don't rely solely on token)
    const currentUser = await window.authManager.getCurrentUser();
    if (!currentUser) {
      console.error('❌ Cannot load profile: Not authenticated');
      showNotification('error', 'Please log in to view your profile');
      return;
    }
    
    // Try to get token (will attempt refresh if needed)
    let token = await window.authManager.getAccessToken();
    
    // If no token but user exists, try refreshing auth state
    if (!token && currentUser && !currentUser.isGuest) {
      console.log('🔄 Token missing, refreshing auth state...');
      await window.authManager.checkAuth();
      token = await window.authManager.getAccessToken();
    }
    
    // If still no token and user is not a guest, there's an auth issue
    if (!token && !currentUser.isGuest) {
      console.error('❌ Cannot load profile: Authentication token unavailable');
      showNotification('error', 'Unable to authenticate. Please try refreshing the page.');
      return;
    }
    
    // For guests, we might not have a token but that's okay for some endpoints
    // But profile/me requires auth, so skip if no token
    if (!token) {
      console.error('❌ Cannot load profile: No authentication token');
      showNotification('error', 'Please log in to view your profile');
      return;
    }
    
    const response = await fetch('/api/social/profile/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    // Handle auth errors gracefully
    if (response.status === 401 || response.status === 403) {
      // Token might be expired - try refreshing auth
      console.log('🔄 Auth error, refreshing session...');
      await window.authManager.checkAuth();
      const newToken = await window.authManager.getAccessToken();
      
      if (newToken) {
        // Retry with new token
        const retryResponse = await fetch('/api/social/profile/me', {
          headers: {
            'Authorization': `Bearer ${newToken}`
          }
        });
        
        if (!retryResponse.ok) {
          throw new Error('Failed to load profile after refresh');
        }
        
        const profile = await retryResponse.json();
        // Continue with profile display...
        displayProfileModalContent(profile);
        return;
      } else {
        throw new Error('Authentication failed. Please log in again.');
      }
    }
    
    if (!response.ok) {
      throw new Error('Failed to load profile');
    }
    
    const profile = await response.json();
    displayProfileModalContent(profile);
  } catch (error) {
    console.error('Error loading profile:', error);
    const errorMessage = error.message || 'Failed to load profile';
    showNotification('error', errorMessage);
  }
}

// Helper function to display profile modal content (extracted for reuse)
function displayProfileModalContent(profile) {
  // Handle legacy users (no username yet)
  if (!profile.username) {
    showNotification('info', 'Please set your username first');
    showUsernameModal();
    return;
  }
  
  const modal = document.createElement('div');
  modal.id = 'profileModal';
  modal.className = 'social-modal-overlay';
  modal.innerHTML = `
      <div class="social-modal large">
        <div class="social-modal-header">
          <h2>👤 Your Profile</h2>
          <button onclick="closeProfileModal()" class="close-btn">×</button>
        </div>
        
        <div class="social-modal-body">
          <!-- Profile Info -->
          <div class="profile-section">
            <div class="profile-avatar-large" id="profileAvatarDisplay">
              ${profile.avatar_url 
                ? `<img src="${profile.avatar_url}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`
                : '👤'
              }
            </div>
            <h3>@${profile.username || 'No username set'}</h3>
            <p class="profile-display-name">${profile.display_name || 'Player'}</p>
            
            <!-- Avatar Upload Section -->
            <div class="avatar-upload-section" style="margin-top: 20px; padding: 16px; background: rgba(255,255,255,0.05); border-radius: 8px;">
              <h4 style="margin: 0 0 12px 0; font-size: 14px; color: #9aa3b2;">Change Profile Picture</h4>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <input 
                  type="text" 
                  id="avatarUrlInput" 
                  placeholder="Paste image URL" 
                  style="flex: 1; min-width: 200px; padding: 8px 12px; background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #e9eef7; font-size: 14px;"
                />
                <input 
                  type="file" 
                  id="avatarFileInput" 
                  accept="image/*" 
                  style="display: none;"
                />
                <button 
                  onclick="document.getElementById('avatarFileInput').click()" 
                  class="btn btn-secondary"
                  style="padding: 8px 16px; font-size: 14px;"
                >
                  📁 Choose File
                </button>
                <button 
                  onclick="saveAvatar()" 
                  class="btn btn-primary"
                  style="padding: 8px 16px; font-size: 14px;"
                >
                  💾 Save Avatar
                </button>
              </div>
              <p style="margin: 8px 0 0 0; font-size: 12px; color: #9aa3b2;">Upload an image file or paste an image URL</p>
            </div>
          </div>
        </div>
        
        <div class="social-modal-actions">
          <button onclick="openChangeUsername()" class="btn btn-secondary">
            ✏️ Change Username
          </button>
          <button onclick="openChangePassword()" class="btn btn-secondary">
            🔒 Change Password
          </button>
          <button onclick="closeProfileModal()" class="btn btn-primary">
            Close
          </button>
        </div>
      </div>
    `;
    
  document.body.appendChild(modal);
  
  // Setup avatar upload handlers
  setTimeout(() => {
    setupAvatarUpload();
  }, 100);
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.remove();
}

// ============================================
// AVATAR UPLOAD FUNCTIONS
// ============================================

// Handle file input change
document.addEventListener('DOMContentLoaded', () => {
  // This will be set up when the modal opens
});

function setupAvatarUpload() {
  const fileInput = document.getElementById('avatarFileInput');
  const urlInput = document.getElementById('avatarUrlInput');
  
  if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        showNotification('error', 'Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        showNotification('error', 'Image must be less than 5MB');
        return;
      }
      
      // Convert to data URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target.result;
        urlInput.value = dataUrl;
        previewAvatar(dataUrl);
      };
      reader.readAsDataURL(file);
    });
  }
  
  if (urlInput) {
    urlInput.addEventListener('input', (e) => {
      const url = e.target.value.trim();
      if (url && (url.startsWith('http') || url.startsWith('data:image'))) {
        previewAvatar(url);
      }
    });
  }
}

function previewAvatar(url) {
  const avatarDisplay = document.getElementById('profileAvatarDisplay');
  if (avatarDisplay && url) {
    avatarDisplay.innerHTML = `<img src="${url}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.parentElement.innerHTML='👤';" />`;
  }
}

async function saveAvatar() {
  const urlInput = document.getElementById('avatarUrlInput');
  if (!urlInput) {
    showNotification('error', 'Avatar input not found');
    return;
  }
  
  const avatarUrl = urlInput.value.trim();
  if (!avatarUrl) {
    showNotification('error', 'Please enter an image URL or upload a file');
    return;
  }
  
  // Validate URL format
  if (!avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:image')) {
    showNotification('error', 'Please enter a valid image URL or upload a file');
    return;
  }
  
  try {
    const token = await window.authManager.getAccessToken();
    if (!token) {
      showNotification('error', 'Not authenticated');
      return;
    }
    
    // Try /api/social/profile first (has proper Supabase auth)
    let response = await fetch('/api/social/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ avatar_url: avatarUrl })
    });
    
    // If that doesn't work, try /api/user/profile (TypeScript route)
    if (!response.ok && response.status === 404) {
      response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar_url: avatarUrl })
      });
    }
    
    // If that doesn't work, try /api/auth/profile as final fallback
    if (!response.ok && response.status === 404) {
      response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar_url: avatarUrl })
      });
    }
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to update avatar' }));
      throw new Error(error.error || 'Failed to update avatar');
    }
    
    const data = await response.json();
    
    // Update the display
    previewAvatar(avatarUrl);
    
    // Refresh username in UI (which also refreshes avatar)
    if (window.refreshUsernameInUI && window.authManager?.user?.id) {
      await window.refreshUsernameInUI(window.authManager.user.id);
    }
    
    showNotification('success', 'Profile picture updated successfully!');
    
    // Clear the input
    urlInput.value = '';
    const fileInput = document.getElementById('avatarFileInput');
    if (fileInput) fileInput.value = '';
    
  } catch (error) {
    console.error('Error saving avatar:', error);
    showNotification('error', error.message || 'Failed to update profile picture');
  }
}

// ============================================
// VIEW ANY PLAYER'S PROFILE
// ============================================

/**
 * Open profile modal for any user (with privacy checks)
 * @param {string} userId - The user ID to view
 */
async function openPlayerProfile(userId) {
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch(`/api/social/profile/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load profile');
    }
    
    const profile = await response.json();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'playerProfileModal';
    modal.className = 'social-modal-overlay';
    
    // Check if stats are hidden due to privacy
    const statsHidden = profile.total_hands_played === null;
    
    modal.innerHTML = `
      <div class="social-modal profile-modal-wide">
        <div class="social-modal-header">
          <h2>👤 ${profile.username || 'Unknown User'}'s Profile</h2>
          <button onclick="closePlayerProfileModal()" class="close-btn">×</button>
        </div>
        
        <div class="social-modal-body">
          ${profile.bio ? `<p class="profile-bio">${profile.bio}</p>` : ''}
          
          ${statsHidden ? `
            <div class="privacy-notice">
              <p>🔒 This player's stats are private. Add them as a friend to see their stats!</p>
            </div>
          ` : `
            <div class="profile-stats-grid">
              <div class="stat-box">
                <div class="stat-label">Hands Played</div>
                <div class="stat-value">${profile.total_hands_played || 0}</div>
              </div>
              
              <div class="stat-box">
                <div class="stat-label">Rooms Played</div>
                <div class="stat-value">${profile.total_rooms_played || 0}</div>
              </div>
              
              <div class="stat-box">
                <div class="stat-label">Total Wins</div>
                <div class="stat-value">${profile.total_wins || 0}</div>
              </div>
              
              <div class="stat-box">
                <div class="stat-label">Win Rate</div>
                <div class="stat-value">${parseFloat(profile.win_rate || 0).toFixed(1)}%</div>
              </div>
              
              <div class="stat-box">
                <div class="stat-label">Friends</div>
                <div class="stat-value">${profile.friend_count || 0}</div>
              </div>
              
              <div class="stat-box">
                <div class="stat-label">Biggest Pot</div>
                <div class="stat-value">$${profile.biggest_pot || 0}</div>
              </div>
              
              ${profile.best_hand ? `
                <div class="stat-box stat-box-wide">
                  <div class="stat-label">Best Hand</div>
                  <div class="stat-value">${profile.best_hand}</div>
                  ${profile.best_hand_date ? `<div class="stat-sublabel">${new Date(profile.best_hand_date).toLocaleDateString()}</div>` : ''}
                </div>
              ` : ''}
            </div>
          `}
        </div>
        
        <div class="social-modal-actions">
          ${profile.is_own_profile ? '' : 
            profile.is_friend ? 
              '<button class="btn btn-secondary" disabled>✅ Already Friends</button>' :
              profile.pending_friend_request.exists ?
                (profile.pending_friend_request.sent_by_me ? 
                  '<button class="btn btn-secondary" disabled>⏳ Request Sent</button>' : 
                  '<button onclick="acceptFriendRequestFromProfile(\'' + userId + '\')" class="btn btn-primary">✅ Accept Friend Request</button>') :
                '<button onclick="sendFriendRequestFromProfile(\'' + userId + '\')" class="btn btn-primary">➕ Add Friend</button>'
          }
          <button onclick="closePlayerProfileModal()" class="btn btn-secondary">Close</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
  } catch (error) {
    console.error('Error loading player profile:', error);
    showNotification('error', 'Failed to load profile');
  }
}

function closePlayerProfileModal() {
  const modal = document.getElementById('playerProfileModal');
  if (modal) modal.remove();
}

async function sendFriendRequestFromProfile(userId) {
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch('/api/social/friends/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ addressee_id: userId })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send friend request');
    }
    
    showNotification('success', 'Friend request sent!');
    closePlayerProfileModal();
    
    // Refresh if on friends page
    if (typeof loadFriends === 'function') {
      loadFriends();
    }
  } catch (error) {
    console.error('Error sending friend request:', error);
    showNotification('error', error.message || 'Failed to send friend request');
  }
}

async function acceptFriendRequestFromProfile(userId) {
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch(`/api/social/friends/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ requester_id: userId })
    });
    
    if (!response.ok) {
      throw new Error('Failed to accept friend request');
    }
    
    showNotification('success', 'Friend request accepted!');
    closePlayerProfileModal();
    
    // Refresh if on friends page
    if (typeof loadFriends === 'function') {
      loadFriends();
    }
  } catch (error) {
    console.error('Error accepting friend request:', error);
    showNotification('error', error.message || 'Failed to accept request');
  }
}

// Make function globally available
window.openPlayerProfile = openPlayerProfile;

// ============================================
// CHANGE USERNAME MODAL
// ============================================

function openChangeUsername() {
  closeProfileModal();
  
  const modal = document.createElement('div');
  modal.id = 'changeUsernameModal';
  modal.className = 'social-modal-overlay';
  modal.innerHTML = `
    <div class="social-modal">
      <div class="social-modal-header">
        <h2>✏️ Change Username</h2>
        <button onclick="closeChangeUsername()" class="close-btn">×</button>
      </div>
      
      <div class="social-modal-body">
        <div class="form-group">
          <label for="newUsernameInput">New Username</label>
          <input 
            type="text" 
            id="newUsernameInput" 
            class="social-input" 
            placeholder="Enter new username"
            maxlength="20"
            autocomplete="off"
          />
          <div id="newUsernameStatus" class="input-status"></div>
          <p class="input-hint">Letters, numbers, and underscore only</p>
        </div>
      </div>
      
      <div class="social-modal-actions">
        <button onclick="closeChangeUsername()" class="btn btn-secondary">Cancel</button>
        <button onclick="submitUsernameChange()" class="btn btn-primary" id="changeUsernameBtn">
          Save Username
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Real-time validation
  document.getElementById('newUsernameInput').addEventListener('input', debounce(checkNewUsernameAvailability, 500));
}

function closeChangeUsername() {
  const modal = document.getElementById('changeUsernameModal');
  if (modal) modal.remove();
}

async function checkNewUsernameAvailability() {
  const input = document.getElementById('newUsernameInput');
  const status = document.getElementById('newUsernameStatus');
  const username = input.value.trim();
  
  if (!username) {
    status.textContent = '';
    status.className = 'input-status';
    return;
  }
  
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    status.textContent = '❌ Invalid format';
    status.className = 'input-status error';
    return;
  }
  
  status.textContent = '⏳ Checking...';
  status.className = 'input-status checking';
  
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch('/api/social/username/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username })
    });
    
    const data = await response.json();
    
    if (data.available) {
      status.textContent = '✅ Available';
      status.className = 'input-status success';
    } else {
      status.textContent = '❌ Already taken';
      status.className = 'input-status error';
    }
  } catch (error) {
    console.error('Error checking username:', error);
    status.textContent = '❌ Error checking';
    status.className = 'input-status error';
  }
}

async function submitUsernameChange() {
  const input = document.getElementById('newUsernameInput');
  const username = input.value.trim();
  
  if (!username || !/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    showNotification('error', 'Invalid username format');
    return;
  }
  
  const btn = document.getElementById('changeUsernameBtn');
  btn.disabled = true;
  btn.textContent = 'Saving...';
  
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch('/api/social/username/change', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ username })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to update username');
    }
    
    const changesMsg = data.changes_remaining !== undefined 
      ? ` (${data.changes_remaining} changes remaining)` 
      : '';
    
    // ✅ Update AuthManager cache IMMEDIATELY
    if (window.authManager && window.authManager.user) {
      window.authManager.user.username = username;
      window.authManager.saveToCache();
      console.log('✅ Username updated in AuthManager cache:', username);
    }
    
    showNotification('success', `Username changed to @${username}${changesMsg}`);
    closeChangeUsername();
    
    // Refresh navbar to show new username
    if (window.refreshAuthDisplay) {
      await window.refreshAuthDisplay();
    }
  } catch (error) {
    console.error('Error changing username:', error);
    showNotification('error', error.message || 'Failed to change username');
    btn.disabled = false;
    btn.textContent = 'Save Username';
  }
}

// ============================================
// CHANGE PASSWORD MODAL
// ============================================

async function openChangePassword() {
  closeProfileModal();
  
  const modal = document.createElement('div');
  modal.id = 'changePasswordModal';
  modal.className = 'social-modal-overlay';
  modal.innerHTML = `
    <div class="social-modal">
      <div class="social-modal-header">
        <h2>🔒 Change Password</h2>
        <button onclick="closeChangePassword()" class="close-btn">×</button>
      </div>
      
      <div class="social-modal-body">
        <p style="color: #9aa3b2; margin-bottom: 20px;">
          We'll send a password reset link to your email address.
        </p>
        <div id="passwordEmailDisplay" style="padding: 12px; background: rgba(0, 212, 170, 0.1); border-radius: 8px; color: #00d4aa; font-family: monospace;">
          Loading...
        </div>
      </div>
      
      <div class="social-modal-actions">
        <button onclick="closeChangePassword()" class="btn btn-secondary">Cancel</button>
        <button onclick="sendPasswordReset()" class="btn btn-primary" id="sendResetBtn">
          Send Reset Link
        </button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Get user email
  const user = await window.authManager.getUser();
  const emailDisplay = document.getElementById('passwordEmailDisplay');
  if (user && user.email) {
    emailDisplay.textContent = user.email;
  } else {
    emailDisplay.textContent = 'Unable to load email';
  }
}

function closeChangePassword() {
  const modal = document.getElementById('changePasswordModal');
  if (modal) modal.remove();
}

async function sendPasswordReset() {
  const btn = document.getElementById('sendResetBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';
  
  try {
    const user = await window.authManager.getUser();
    if (!user || !user.email) {
      throw new Error('No email found');
    }
    
    const { error } = await window.authManager.supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`
    });
    
    if (error) throw error;
    
    showNotification('success', 'Password reset email sent! Check your inbox.');
    closeChangePassword();
  } catch (error) {
    console.error('Error sending reset:', error);
    showNotification('error', 'Failed to send reset email');
    btn.disabled = false;
    btn.textContent = 'Send Reset Link';
  }
}

// ============================================
// AVATAR PICKER MODAL
// ============================================

function openAvatarPicker() {
  closeProfileModal();
  showNotification('info', 'Avatar picker coming soon!');
}

// ============================================
// PROFILE SETTINGS MODAL
// ============================================

function openProfileSettings() {
  closeProfileModal();
  showNotification('info', 'Profile settings coming soon!');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function formatChips(amount) {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + 'M';
  } else if (amount >= 1000) {
    return (amount / 1000).toFixed(1) + 'K';
  }
  return amount.toString();
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
// AUTO-CHECK USERNAME ON LOAD
// ============================================

async function checkIfNeedsUsername() {
  try {
    const token = await window.authManager.getAccessToken();
    if (!token) return; // Not logged in
    
    const response = await fetch('/api/social/profile/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const profile = await response.json();
    
    // If no username, show modal
    if (!profile.username) {
      setTimeout(() => showUsernameModal(), 500); // Small delay for better UX
    }
    // ✅ Username is in DB - no localStorage caching needed
    // UI will fetch fresh from DB when displaying
  } catch (error) {
    console.error('Error checking username:', error);
  }
}

// Auto-check on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', checkIfNeedsUsername);
} else {
  checkIfNeedsUsername();
}

console.log('✅ Social modals loaded');

