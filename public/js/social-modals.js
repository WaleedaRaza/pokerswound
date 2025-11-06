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
      
      // Store username locally
      localStorage.setItem('pokergeek_username', username);
      
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
    const token = await window.authManager.getAccessToken();
    const response = await fetch('/api/social/profile/me', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to load profile');
    }
    
    const profile = await response.json();
    
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
            <div class="profile-avatar-large">
              ${profile.avatar_url 
                ? `<img src="${profile.avatar_url}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" />`
                : '👤'
              }
            </div>
            <h3>@${profile.username || 'No username set'}</h3>
            <p class="profile-display-name">${profile.display_name || 'Player'}</p>
          </div>
          
          <!-- Stats Grid -->
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-value">${profile.total_hands_played ?? 0}</div>
              <div class="stat-label">Hands Played</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">${profile.total_rooms_played ?? 0}</div>
              <div class="stat-label">Rooms Played</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">${profile.total_wins ?? 0}</div>
              <div class="stat-label">Total Wins</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">${parseFloat(profile.win_rate || 0).toFixed(1)}%</div>
              <div class="stat-label">Win Rate</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">${profile.friend_count ?? 0}</div>
              <div class="stat-label">Friends</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-value">$${formatChips(profile.biggest_pot ?? 0)}</div>
              <div class="stat-label">Biggest Pot</div>
            </div>
          </div>
          
          <!-- Best Hand -->
          <div class="best-hand-section">
            <h4>🏆 Best Hand</h4>
            <div class="best-hand-display">
              ${profile.best_hand ? `
                <div class="hand-rank">${profile.best_hand}</div>
                ${profile.best_hand_date ? `<div class="hand-date" style="font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-top: 0.5rem;">${new Date(profile.best_hand_date).toLocaleDateString()}</div>` : ''}
              ` : '<p class="text-muted">No hands recorded yet</p>'}
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
  } catch (error) {
    console.error('Error loading profile:', error);
    alert('Failed to load profile');
  }
}

function closeProfileModal() {
  const modal = document.getElementById('profileModal');
  if (modal) modal.remove();
}

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
    } else {
      // Store username locally
      localStorage.setItem('pokergeek_username', profile.username);
    }
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

