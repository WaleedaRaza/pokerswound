/**
 * PokerGeek.ai - Username Selection Modal
 * Prompts users to choose a unique username on first login
 */

// Inject modal HTML into page
function injectUsernameModal() {
  const modalHTML = `
    <div id="usernameModal" class="username-modal" style="display: none;">
      <div class="username-modal-overlay"></div>
      <div class="username-modal-content">
        <h2>Choose Your Username</h2>
        <p class="username-modal-subtitle">This is how other players will find and invite you</p>
        
        <div class="username-input-group">
          <div class="username-input-wrapper">
            <span class="username-prefix">@</span>
            <input 
              type="text" 
              id="usernameInput" 
              placeholder="username" 
              maxlength="20"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
          <div id="usernameValidation" class="username-validation"></div>
        </div>
        
        <div class="username-rules">
          <ul>
            <li>3-20 characters</li>
            <li>Letters, numbers, and underscores only</li>
            <li>Cannot be changed later (choose wisely!)</li>
          </ul>
        </div>
        
        <button id="submitUsername" class="username-submit-btn" disabled>
          Confirm Username
        </button>
        
        <div id="usernameError" class="username-error" style="display: none;"></div>
      </div>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  injectUsernameStyles();
}

// Inject modal styles
function injectUsernameStyles() {
  const styles = `
    <style id="username-modal-styles">
      .username-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .username-modal-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.85);
        backdrop-filter: blur(8px);
      }
      
      .username-modal-content {
        position: relative;
        background: linear-gradient(135deg, rgba(15, 15, 25, 0.98), rgba(20, 20, 30, 0.98));
        border: 2px solid rgba(0, 212, 170, 0.3);
        border-radius: 20px;
        padding: 40px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        animation: modalSlideIn 0.3s ease-out;
      }
      
      @keyframes modalSlideIn {
        from {
          opacity: 0;
          transform: translateY(-30px) scale(0.95);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      
      .username-modal-content h2 {
        font-family: "JetBrains Mono", monospace;
        font-size: 28px;
        font-weight: 700;
        color: #00d4aa;
        margin: 0 0 10px 0;
        text-align: center;
      }
      
      .username-modal-subtitle {
        color: #9aa3b2;
        font-size: 14px;
        text-align: center;
        margin: 0 0 30px 0;
      }
      
      .username-input-group {
        margin-bottom: 25px;
      }
      
      .username-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 0 20px;
        transition: all 0.2s;
      }
      
      .username-input-wrapper:focus-within {
        border-color: #00d4aa;
        background: rgba(0, 212, 170, 0.05);
        box-shadow: 0 0 20px rgba(0, 212, 170, 0.2);
      }
      
      .username-prefix {
        font-family: "JetBrains Mono", monospace;
        font-size: 20px;
        font-weight: 600;
        color: #00d4aa;
        margin-right: 5px;
      }
      
      #usernameInput {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        font-family: "JetBrains Mono", monospace;
        font-size: 20px;
        font-weight: 600;
        color: #e9eef7;
        padding: 18px 0;
      }
      
      #usernameInput::placeholder {
        color: rgba(255, 255, 255, 0.3);
      }
      
      .username-validation {
        margin-top: 10px;
        font-size: 13px;
        font-weight: 500;
        min-height: 20px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .username-validation.checking {
        color: #9aa3b2;
      }
      
      .username-validation.available {
        color: #00d4aa;
      }
      
      .username-validation.taken {
        color: #ff3b3b;
      }
      
      .username-rules {
        background: rgba(0, 212, 170, 0.05);
        border: 1px solid rgba(0, 212, 170, 0.2);
        border-radius: 12px;
        padding: 20px;
        margin-bottom: 25px;
      }
      
      .username-rules ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      .username-rules li {
        color: #9aa3b2;
        font-size: 13px;
        padding: 6px 0;
        padding-left: 22px;
        position: relative;
      }
      
      .username-rules li::before {
        content: "✓";
        position: absolute;
        left: 0;
        color: #00d4aa;
        font-weight: 700;
      }
      
      .username-submit-btn {
        width: 100%;
        background: linear-gradient(135deg, #00d4aa, #00b890);
        color: #0b0b12;
        border: none;
        border-radius: 12px;
        padding: 18px;
        font-family: "JetBrains Mono", monospace;
        font-size: 16px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s;
        box-shadow: 0 4px 16px rgba(0, 212, 170, 0.3);
      }
      
      .username-submit-btn:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 6px 24px rgba(0, 212, 170, 0.4);
      }
      
      .username-submit-btn:active:not(:disabled) {
        transform: translateY(0);
      }
      
      .username-submit-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
        background: rgba(255, 255, 255, 0.1);
        box-shadow: none;
      }
      
      .username-error {
        margin-top: 15px;
        padding: 12px;
        background: rgba(255, 59, 59, 0.1);
        border: 1px solid rgba(255, 59, 59, 0.3);
        border-radius: 8px;
        color: #ff3b3b;
        font-size: 13px;
        text-align: center;
      }
    </style>
  `;
  
  document.head.insertAdjacentHTML('beforeend', styles);
}

// Username validation state
let checkUsernameTimeout = null;
let lastCheckedUsername = null;
let isUsernameAvailable = false;

// Show username modal
function showUsernameModal(userId, currentUsername) {
  // Inject modal if not already present
  if (!document.getElementById('usernameModal')) {
    injectUsernameModal();
  }
  
  const modal = document.getElementById('usernameModal');
  const input = document.getElementById('usernameInput');
  const submitBtn = document.getElementById('submitUsername');
  const validation = document.getElementById('usernameValidation');
  const errorDiv = document.getElementById('usernameError');
  
  // Pre-fill with current username (from email)
  if (currentUsername) {
    // Remove any @username prefix and domain
    const cleanUsername = currentUsername.replace(/^@/, '').split('@')[0];
    input.value = cleanUsername;
    checkUsernameAvailability(cleanUsername);
  }
  
  // Input event handler with debounce
  input.addEventListener('input', (e) => {
    const username = e.target.value.trim();
    errorDiv.style.display = 'none';
    
    // Clear previous timeout
    if (checkUsernameTimeout) {
      clearTimeout(checkUsernameTimeout);
    }
    
    // Validate format first
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    
    if (username.length === 0) {
      validation.textContent = '';
      validation.className = 'username-validation';
      submitBtn.disabled = true;
      return;
    }
    
    if (!usernameRegex.test(username)) {
      validation.textContent = '❌ Invalid format (3-20 chars, letters/numbers/underscore only)';
      validation.className = 'username-validation taken';
      submitBtn.disabled = true;
      return;
    }
    
    // Check availability after 500ms
    validation.textContent = '⏳ Checking availability...';
    validation.className = 'username-validation checking';
    submitBtn.disabled = true;
    
    checkUsernameTimeout = setTimeout(() => {
      checkUsernameAvailability(username);
    }, 500);
  });
  
  // Submit handler
  submitBtn.addEventListener('click', async () => {
    const username = input.value.trim();
    
    if (!isUsernameAvailable) {
      errorDiv.textContent = 'Please choose an available username';
      errorDiv.style.display = 'block';
      return;
    }
    
    try {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Setting username...';
      
      const response = await fetch('/api/auth/set-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, username })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Username set successfully:', username);
        
        // ✅ Username updated in DB - refresh all UI from DB (single source of truth)
        if (window.refreshUsernameInUI && userId) {
          await window.refreshUsernameInUI(userId);
        } else {
          // Fallback: Update auth manager cache
        if (window.authManager && window.authManager.user) {
          window.authManager.user.username = username;
          window.authManager.saveToCache();
          }
        }
        
        // Hide modal
        modal.style.display = 'none';
        
        // Refresh navbar to show new username
        if (typeof initializeAuth === 'function') {
          initializeAuth();
        }
        
        // Success notification
        alert(`✅ Username set to @${username}`);
      } else {
        const errorMsg = data.error || data.message || `Server error: ${response.status}`;
        throw new Error(errorMsg);
      }
      
    } catch (error) {
      console.error('❌ Error setting username:', error);
      errorDiv.textContent = error.message || 'Failed to set username. Please try again.';
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.textContent = 'Confirm Username';
      
      // Also show in validation area
      const validation = document.getElementById('usernameValidation');
      if (validation) {
        validation.textContent = '❌ ' + error.message;
        validation.className = 'username-validation taken';
      }
    }
  });
  
  // Show modal
  modal.style.display = 'flex';
  input.focus();
}

// Check username availability
async function checkUsernameAvailability(username) {
  const validation = document.getElementById('usernameValidation');
  const submitBtn = document.getElementById('submitUsername');
  
  try {
    const response = await fetch('/api/auth/check-username', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || errorData.message || `Server error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.hasOwnProperty('available')) {
      console.error('❌ Invalid response format:', data);
      throw new Error('Invalid response from server');
    }
    
    lastCheckedUsername = username;
    isUsernameAvailable = data.available;
    
    if (data.available) {
      validation.textContent = '✅ Username is available!';
      validation.className = 'username-validation available';
      submitBtn.disabled = false;
    } else {
      validation.textContent = '❌ Username is already taken';
      validation.className = 'username-validation taken';
      submitBtn.disabled = true;
    }
    
  } catch (error) {
    console.error('❌ Error checking username:', error);
    validation.textContent = '⚠️ Error checking availability - ' + (error.message || 'Unknown error');
    validation.className = 'username-validation taken';
    submitBtn.disabled = true;
  }
}

// Hide username modal
function hideUsernameModal() {
  const modal = document.getElementById('usernameModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// Export functions
window.showUsernameModal = showUsernameModal;
window.hideUsernameModal = hideUsernameModal;

console.log('✅ Username modal loaded');

