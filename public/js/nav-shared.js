/**
 * Shared Navbar Controller & Global Auth Functions
 * Single source of truth for navbar state across ALL pages
 * Version: 1.0.0
 */

class NavbarController {
  constructor() {
    this.navbarAuth = null;
    this.navbarUser = null;
    this.userName = null;
    this.userAvatar = null;
    this.initialized = false;
  }

  /**
   * Initialize navbar elements (call on every page load)
   */
  init() {
    this.navbarAuth = document.getElementById('navbarAuth');
    this.navbarUser = document.getElementById('navbarUser');
    this.userName = document.getElementById('userName');
    this.userAvatar = document.getElementById('userAvatar');
    
    this.initialized = true;
    console.log('✅ NavbarController initialized');
  }

  /**
   * Update navbar for authenticated user
   * ROBUST VERSION - Always hides login buttons and shows user tile
   */
  async showUser(user) {
    if (!user) {
      console.warn('⚠️ showUser called with no user, showing logged out instead');
      this.showLoggedOut();
      return;
    }
    
    console.log('👤 NavbarController: Showing user:', user.username);
    
    // Fetch actual username and avatar_url from backend if not a guest
    let displayUsername = user.username;
    if (!user.isGuest) {
      try {
        const response = await fetch(`/api/auth/profile/${user.id}`);
        if (response.ok) {
          const profile = await response.json();
          displayUsername = profile.username;
          // ✅ Also update avatar_url if available (ensures consistency)
          if (profile.avatar_url !== undefined) {
            user.avatar_url = profile.avatar_url;
            // Save updated avatar_url to cache
            if (window.authManager) {
              window.authManager.saveToCache();
            }
          }
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch profile, using cached:', error);
      }
    }
    
    // Format username with @ prefix for display
    const formattedUsername = displayUsername.startsWith('@') ? displayUsername : `@${displayUsername}`;
    
    // Re-fetch elements in case they weren't initialized
    const navbarAuth = document.getElementById('navbarAuth');
    const navbarUser = document.getElementById('navbarUser');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    // CRITICAL: Hide login buttons
    if (navbarAuth) {
      navbarAuth.style.display = 'none';
      navbarAuth.style.visibility = 'hidden';
      console.log('✅ Login buttons hidden');
    } else {
      console.error('❌ navbarAuth element not found!');
    }
    
    // CRITICAL: Show user profile tile
    // Match the CSS: .navbar-user { display: flex }
    if (navbarUser) {
      navbarUser.style.display = 'flex';
      navbarUser.style.visibility = 'visible';
      navbarUser.style.opacity = '1';
      console.log('✅ User tile shown');
    } else {
      console.error('❌ navbarUser element not found!');
    }
    
    // Update user info with @username format
    if (userName) userName.textContent = formattedUsername;
    
    // ✅ Display avatar image if available, otherwise use emoji fallback
    if (userAvatar) {
      if (user.avatar_url) {
        // Use image if avatar_url exists
        userAvatar.innerHTML = `<img src="${user.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.parentElement.textContent='${user.avatar || (user.isGuest ? '👻' : '👤')}'" />`;
      } else {
        // Fallback to emoji
        userAvatar.textContent = user.avatar || (user.isGuest ? '👻' : '👤');
      }
    }
    
    // Update dropdown if exists
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    const dropdownUsername = document.getElementById('dropdownUsername');
    const dropdownEmail = document.getElementById('dropdownEmail');
    
    // ✅ Display avatar image in dropdown if available
    if (dropdownAvatar) {
      if (user.avatar_url) {
        dropdownAvatar.innerHTML = `<img src="${user.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.parentElement.textContent='${user.avatar || (user.isGuest ? '👻' : '👤')}'" />`;
      } else {
        dropdownAvatar.textContent = user.avatar || (user.isGuest ? '👻' : '👤');
      }
    }
    if (dropdownUsername) dropdownUsername.textContent = formattedUsername;
    if (dropdownEmail) dropdownEmail.textContent = user.email || (user.isGuest ? 'Guest User' : 'No email');
    
    // Add visual indicator for guest users
    const statusBadge = navbarUser?.querySelector('.user-status');
    if (statusBadge && user.isGuest) {
      statusBadge.textContent = 'Guest';
      statusBadge.style.color = '#fbbf24'; // Yellow for guests
    } else if (statusBadge) {
      statusBadge.textContent = 'Online';
      statusBadge.style.color = '';
    }
    
    console.log('✅ User display complete');
  }

  /**
   * Update navbar for logged out state
   * ROBUST VERSION - Always shows login buttons
   */
  showLoggedOut() {
    console.log('🚪 NavbarController: Showing logged out state');
    
    // Re-fetch elements in case they weren't initialized
    const navbarAuth = document.getElementById('navbarAuth');
    const navbarUser = document.getElementById('navbarUser');
    const userName = document.getElementById('userName');
    const userAvatar = document.getElementById('userAvatar');
    
    // CRITICAL: Show login/signup buttons
    // Match the CSS: .navbar-auth { display: flex }
    if (navbarAuth) {
      navbarAuth.style.display = 'flex';
      navbarAuth.style.visibility = 'visible';
      navbarAuth.style.opacity = '1';
      console.log('✅ Login buttons shown');
    } else {
      console.error('❌ navbarAuth element not found!');
    }
    
    // Hide user profile tile
    if (navbarUser) {
      navbarUser.style.display = 'none';
      navbarUser.style.visibility = 'hidden';
      console.log('✅ User tile hidden');
    } else {
      console.error('❌ navbarUser element not found!');
    }
    
    // CLEAR user data to prevent lingering
    if (userName) userName.textContent = '';
    if (userAvatar) userAvatar.textContent = '👤';
    
    // Clear dropdown data
    const dropdownAvatar = document.getElementById('dropdownAvatar');
    const dropdownUsername = document.getElementById('dropdownUsername');
    const dropdownEmail = document.getElementById('dropdownEmail');
    
    if (dropdownAvatar) dropdownAvatar.textContent = '👤';
    if (dropdownUsername) dropdownUsername.textContent = '';
    if (dropdownEmail) dropdownEmail.textContent = '';
    
    // Close dropdown if open
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) dropdown.style.display = 'none';
    
    // Reset status badge
    const statusBadge = navbarUser?.querySelector('.user-status');
    if (statusBadge) {
      statusBadge.textContent = 'Online';
      statusBadge.style.color = '';
    }
    
    console.log('✅ Logged out state complete');
  }

  /**
   * Show loading state
   */
  showLoading() {
    if (!this.initialized) return;
    
    if (this.navbarAuth) this.navbarAuth.style.opacity = '0.5';
    if (this.navbarUser) this.navbarUser.style.opacity = '0.5';
  }

  /**
   * Hide loading state
   */
  hideLoading() {
    if (!this.initialized) return;
    
    if (this.navbarAuth) this.navbarAuth.style.opacity = '1';
    if (this.navbarUser) this.navbarUser.style.opacity = '1';
  }
}

// Create global instance
window.navbarController = new NavbarController();

/**
 * Opens the login modal (the actual modal UI, not a confirm())
 */
function openLoginModal() {
  console.log('🔓 openLoginModal() called');
  const modal = document.getElementById('loginModal');
  if (modal) {
    modal.classList.add('show');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    console.log('✅ Modal opened');
  } else {
    console.error('❌ loginModal element not found');
  }
}

// Expose globally
window.openLoginModal = openLoginModal;

/**
 * Google OAuth handler (called from modal button)
 */
async function handleGoogleAuth() {
  console.log('🔐 handleGoogleAuth() called');
  
  // Check if authManager is available
  if (!window.authManager) {
    console.error('❌ authManager not found!');
    alert('Auth system not initialized. Please refresh the page.');
    return;
  }
  
  try {
    console.log('🔐 Starting Google OAuth...');
    
    // Save pending room join before OAuth redirect
    const pendingRoom = sessionStorage.getItem('pendingRoomJoin');
    if (pendingRoom) {
      localStorage.setItem('pendingRoomAfterOAuth', pendingRoom);
      sessionStorage.removeItem('pendingRoomJoin');
    }
    
    await window.authManager.loginWithGoogle();
    // Will redirect to OAuth, then back to this page
  } catch (error) {
    console.error('❌ Google login failed:', error);
    console.error('Error details:', error);
    
    // Show user-friendly error
    if (typeof showNotification === 'function') {
      showNotification('Login failed: ' + error.message, 'error');
    } else {
      alert('Login failed: ' + error.message);
    }
  }
}

// Expose globally
window.handleGoogleAuth = handleGoogleAuth;

/**
 * Guest login handler (called from modal button)
 */
async function handleGuestLogin() {
  console.log('👻 handleGuestLogin() called');
  
  // Check if authManager is available
  if (!window.authManager) {
    console.error('❌ authManager not found!');
    alert('Auth system not initialized. Please refresh the page.');
    return;
  }
  
  try {
    console.log('👻 Creating guest user...');
    const user = await window.authManager.signInAnonymously();
    
    console.log('👻 signInAnonymously returned:', user);
    
    // Check if user was actually created (fallback may have succeeded even if Supabase failed)
    if (!user || !user.id) {
      console.error('❌ signInAnonymously returned invalid user:', user);
      throw new Error('Failed to create guest user - no valid user object returned');
    }
    
    console.log('✅ Guest user created:', user);
    
    // Close modal
    const modal = document.getElementById('loginModal');
    if (modal) {
      modal.classList.remove('show');
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }
    
    // Update navbar
    window.navbarController.showUser(user);
    
    // Show welcome notification
    if (typeof showNotification === 'function') {
      showNotification('Welcome, ' + user.username + '! 👻', 'success');
    }
    
    // Store in global (ALWAYS set it)
    window.currentUser = user;
    
    // Check for pending room join (play page)
    const pendingRoom = sessionStorage.getItem('pendingRoomJoin');
    if (pendingRoom && typeof window.joinRoomById === 'function') {
      sessionStorage.removeItem('pendingRoomJoin');
      console.log('🔗 Auto-joining pending room:', pendingRoom);
      setTimeout(() => window.joinRoomById(pendingRoom), 500);
    }
    
  } catch (error) {
    console.error('❌ Guest login failed completely:', error);
    console.error('Error details:', error);
    
    // Only show error if user creation truly failed
    if (typeof showNotification === 'function') {
      showNotification('Failed to create guest user. Please try again.', 'error');
    } else {
      alert('Failed to create guest user. Please try again.');
    }
  }
}

// Expose globally
window.handleGuestLogin = handleGuestLogin;

/**
 * Global Logout Handler
 * Clears all auth state and redirects to home
 */
async function handleLogout() {
  if (!confirm('Are you sure you want to logout?')) {
    return;
  }
  
  console.log('🚪 Logging out...');
  
  try {
    // 1. Logout from auth manager (clears Supabase + localStorage)
    await window.authManager.logout();
    console.log('✅ Auth cleared');
    
    // 2. Clear global user reference
    if (typeof window.currentUser !== 'undefined') {
      window.currentUser = null;
    }
    
    // 3. IMMEDIATELY update navbar to show login buttons
    window.navbarController.showLoggedOut();
    console.log('✅ Navbar updated to logged out state');
    
    // 4. Show notification
    if (typeof showNotification === 'function') {
      showNotification('Logged out successfully', 'success');
    }
    
    // 5. Redirect to home after brief delay (so user sees the change)
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
    
  } catch (error) {
    console.error('❌ Logout failed:', error);
    
    // Even if logout fails, show logged out state
    window.navbarController.showLoggedOut();
    
    if (typeof showNotification === 'function') {
      showNotification('Logout error (still logged out locally): ' + error.message, 'warning');
    } else {
      alert('Logout error: ' + error.message);
    }
    
    // Still redirect
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  }
}

/**
 * Toggle user dropdown menu
 */
function toggleUserDropdown() {
  const dropdown = document.getElementById('userDropdown');
  if (dropdown) {
    const isVisible = dropdown.style.display !== 'none' && dropdown.style.display !== '';
    dropdown.style.display = isVisible ? 'none' : 'block';
    console.log('🔽 Dropdown toggled:', !isVisible);
  }
}

/**
 * Open settings modal (if exists on page)
 */
function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) {
    modal.style.display = 'flex';
  } else {
    console.warn('⚠️ Settings modal not found on this page');
    if (typeof showNotification === 'function') {
      showNotification('Settings available on home page', 'info');
    }
  }
}

/**
 * Close dropdown when clicking outside
 */
document.addEventListener('click', (e) => {
  const dropdown = document.getElementById('userDropdown');
  const tile = document.querySelector('.user-profile-tile');
  
  if (dropdown && tile && !tile.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

/**
 * Global Page Initialization
 * Call this on EVERY page's DOMContentLoaded
 * 
 * @returns {Promise<Object|null>} Current user or null
 */
async function initializeAuth() {
  console.log('🔐 Initializing auth for page:', window.location.pathname);
  
  try {
    // 1. Initialize navbar controller
    window.navbarController.init();
    window.navbarController.showLoading();
    
    // 2. Check authentication state
    const user = await window.authManager.checkAuth();
    
    // 3. Update navbar based on auth state
    window.navbarController.hideLoading();
    
    if (user) {
      console.log('✅ User authenticated:', user.username, user.isGuest ? '(Guest)' : '(Registered)');
      window.navbarController.showUser(user);
      
      // Check for pending room join after OAuth redirect
      const pendingAfterOAuth = localStorage.getItem('pendingRoomAfterOAuth');
      if (pendingAfterOAuth && typeof window.joinRoomById === 'function') {
        localStorage.removeItem('pendingRoomAfterOAuth');
        console.log('🔗 Auto-joining room after OAuth:', pendingAfterOAuth);
        setTimeout(() => window.joinRoomById(pendingAfterOAuth), 1000);
      }
      
      return user;
    } else {
      console.log('ℹ️ No user authenticated');
      window.navbarController.showLoggedOut();
      return null;
    }
  } catch (error) {
    console.error('❌ Auth initialization failed:', error);
    window.navbarController.hideLoading();
    window.navbarController.showLoggedOut();
    return null;
  }
}

/**
 * Refresh the navbar and auth display
 * Call this after username changes or profile updates
 */
async function refreshAuthDisplay() {
  console.log('🔄 Refreshing auth display...');
  try {
    const user = await window.authManager.checkAuth();
    if (user) {
      await window.navbarController.showUser(user);
      console.log('✅ Auth display refreshed');
    } else {
      window.navbarController.showLoggedOut();
    }
  } catch (error) {
    console.error('❌ Failed to refresh auth display:', error);
  }
}

// Expose globally
window.refreshAuthDisplay = refreshAuthDisplay;
window.initializeAuth = initializeAuth;

/**
 * Listen for auth state changes from other tabs/windows
 * Ensures consistency across multiple tabs
 */
window.addEventListener('storage', (e) => {
  if (e.key === 'pokerUser') {
    console.log('🔄 Auth state changed in another tab');
    
    if (e.newValue) {
      // User logged in elsewhere
      try {
        const user = JSON.parse(e.newValue);
        console.log('✅ Syncing login from other tab:', user.username);
        window.navbarController.showUser(user);
        
        // Update global reference
        if (typeof window.currentUser !== 'undefined') {
          window.currentUser = user;
        }
      } catch (error) {
        console.error('❌ Failed to sync login:', error);
      }
    } else {
      // User logged out elsewhere
      console.log('🚪 Syncing logout from other tab');
      window.navbarController.showLoggedOut();
      
      if (typeof window.currentUser !== 'undefined') {
        window.currentUser = null;
      }
    }
  }
});

/**
 * Supabase auth state change listener
 * Handles OAuth redirects and session changes
 */
window.addEventListener('DOMContentLoaded', () => {
  if (window.authManager && window.authManager.supabase) {
    window.authManager.supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔄 Supabase auth state changed:', event);
      
      if (event === 'SIGNED_IN' && session) {
        console.log('✅ Supabase session established');
        // Page will refresh or auth will be checked
      } else if (event === 'SIGNED_OUT') {
        console.log('🚪 Supabase session ended');
        window.navbarController.showLoggedOut();
      }
    });
  }
});

console.log('✅ NavbarController and global auth functions loaded');
