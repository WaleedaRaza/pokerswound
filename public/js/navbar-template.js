/**
 * PokerGeek.ai - Unified Navbar Template
 * Single source of truth for navbar HTML across all pages
 * Version: 1.0.0
 */

window.NAVBAR_HTML = `
<nav class="navbar">
  <a href="/" class="navbar-brand">
    <img src="/public/Logo.svg" alt="PokerGeek" class="navbar-logo" />
    PokerGeek.ai
  </a>
  <ul class="navbar-links">
    <li><a href="/">Home</a></li>
    <li><a href="/play">Play Now</a></li>
    <li><a href="/friends">Friends</a></li>
    <li><a href="/ai-solver">AI Solver</a></li>
    <li><a href="/analysis">Analysis</a></li>
    <li><a href="/learning">Learning</a></li>
    <li><a href="/poker-today">Poker Today</a></li>
  </ul>
  
  <!-- Login/Signup Buttons (shown when logged out) -->
  <div class="navbar-auth" id="navbarAuth">
    <a href="#" class="navbar-btn navbar-btn-login" onclick="openLoginModal()">Log In</a>
    <a href="#" class="navbar-btn navbar-btn-signup" onclick="openLoginModal()">Sign Up</a>
  </div>
  
  <!-- User Profile Tile (shown when logged in) -->
  <div class="navbar-user" id="navbarUser" style="display: none;">
    <div class="user-profile-tile liquid-glass-tile" onclick="toggleUserDropdown()">
      <div class="user-avatar" id="userAvatar">👤</div>
      <div class="user-info">
        <div class="user-name" id="userName">Username</div>
        <div class="user-status">Online</div>
      </div>
      <div class="user-menu-icon">⚙️</div>
    </div>
    
    <!-- User Dropdown Menu -->
    <div id="userDropdown" class="user-dropdown">
      <div class="dropdown-header">
        <div class="dropdown-user-info">
          <div class="dropdown-avatar" id="dropdownAvatar">👤</div>
          <div class="dropdown-user-details">
            <div class="dropdown-username" id="dropdownUsername">Username</div>
            <div class="dropdown-email" id="dropdownEmail">user@example.com</div>
          </div>
        </div>
      </div>
      
      <div class="dropdown-actions">
        <button class="dropdown-btn" onclick="openProfileModal()">👤 View Profile</button>
        <button class="dropdown-btn" onclick="window.location.href='/friends'">👥 Friends</button>
        <button class="dropdown-btn logout" onclick="handleLogout()">🚪 Logout</button>
      </div>
    </div>
  </div>
</nav>
`;

/**
 * Initialize navbar on page load
 * Call this in every page's DOMContentLoaded
 */
function initNavbar() {
  const container = document.getElementById('navbar-container');
  if (container) {
    container.innerHTML = window.NAVBAR_HTML;
    console.log('✅ Navbar injected');
    
    // Auto-initialize auth after navbar injection
    if (typeof initializeAuth === 'function') {
      initializeAuth();
      console.log('✅ Auth auto-initialized');
    } else {
      console.warn('⚠️ initializeAuth not found. Make sure auth-manager.js is loaded before navbar-template.js');
    }
  } else {
    console.error('❌ navbar-container not found! Add <div id="navbar-container"></div> to your page.');
  }
}

// Auto-inject if container exists when script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNavbar);
} else {
  initNavbar();
}

console.log('✅ Navbar template loaded');

