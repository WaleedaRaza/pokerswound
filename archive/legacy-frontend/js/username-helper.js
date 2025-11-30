/**
 * Username Helper - Single Source of Truth
 * All username operations go through this module
 * Database is the ONLY source of truth
 */

/**
 * Get username from database (single source of truth)
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Username or null
 */
async function getUsernameFromDB(userId) {
  if (!userId) {
    console.warn('⚠️ getUsernameFromDB: No userId provided');
    return null;
  }
  
  try {
    const response = await fetch(`/api/auth/profile/${userId}`);
    if (response.ok) {
      const profile = await response.json();
      const username = profile.username || null;
      console.log(`✅ getUsernameFromDB: Fetched username "${username}" for user ${userId}`);
      return username;
    } else {
      console.error(`❌ getUsernameFromDB: Failed to fetch profile (${response.status})`);
      return null;
    }
  } catch (error) {
    console.error('❌ getUsernameFromDB: Error fetching username from DB:', error);
    return null;
  }
}

/**
 * Refresh username in all UI components
 * Fetches fresh from DB and updates all displays
 * @param {string} userId - User ID
 * @returns {Promise<void>}
 */
async function refreshUsernameInUI(userId) {
  if (!userId) {
    console.warn('⚠️ refreshUsernameInUI: No userId provided');
    return;
  }
  
  // ✅ Fetch full profile (username + avatar_url)
  let profile = null;
  try {
    const response = await fetch(`/api/auth/profile/${userId}`);
    if (response.ok) {
      profile = await response.json();
    } else {
      console.warn('⚠️ refreshUsernameInUI: Could not fetch profile from DB');
      return;
    }
  } catch (error) {
    console.error('❌ refreshUsernameInUI: Error fetching profile:', error);
    return;
  }
  
  const username = profile.username;
  if (!username) {
    console.warn('⚠️ refreshUsernameInUI: No username in profile');
    return;
  }
  
  console.log(`🔄 refreshUsernameInUI: Refreshing username "${username}" and avatar in all UI components`);
  
  // Update navbar username
  const userNameEl = document.getElementById('userName');
  if (userNameEl) {
    const formatted = username.startsWith('@') ? username : `@${username}`;
    userNameEl.textContent = formatted;
    console.log('✅ Updated navbar username');
  }
  
  // ✅ Update navbar avatar
  const userAvatarEl = document.getElementById('userAvatar');
  if (userAvatarEl && window.authManager?.user) {
    const user = window.authManager.user;
    if (profile.avatar_url) {
      userAvatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.parentElement.textContent='${user.avatar || '👤'}'" />`;
    } else {
      userAvatarEl.textContent = user.avatar || '👤';
    }
    console.log('✅ Updated navbar avatar');
  }
  
  // Update dropdown username
  const dropdownUsernameEl = document.getElementById('dropdownUsername');
  if (dropdownUsernameEl) {
    const formatted = username.startsWith('@') ? username : `@${username}`;
    dropdownUsernameEl.textContent = formatted;
    console.log('✅ Updated dropdown username');
  }
  
  // ✅ Update dropdown avatar
  const dropdownAvatarEl = document.getElementById('dropdownAvatar');
  if (dropdownAvatarEl && window.authManager?.user) {
    const user = window.authManager.user;
    if (profile.avatar_url) {
      dropdownAvatarEl.innerHTML = `<img src="${profile.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.parentElement.textContent='${user.avatar || '👤'}'" />`;
    } else {
      dropdownAvatarEl.textContent = user.avatar || '👤';
    }
    console.log('✅ Updated dropdown avatar');
  }
  
  // Update auth manager cache (username + avatar_url)
  if (window.authManager && window.authManager.user) {
    window.authManager.user.username = username;
    window.authManager.user.avatar_url = profile.avatar_url || null;
    window.authManager.saveToCache();
    console.log('✅ Updated auth manager cache (username + avatar_url)');
  }
  
  // Update window.currentUser if it exists
  if (window.currentUser) {
    window.currentUser.username = username;
    window.currentUser.avatar_url = profile.avatar_url || null;
    console.log('✅ Updated window.currentUser');
  }
  
  // Trigger custom event for other components to listen
  window.dispatchEvent(new CustomEvent('usernameUpdated', { 
    detail: { userId, username, avatar_url: profile.avatar_url } 
  }));
  console.log('✅ Dispatched usernameUpdated event');
}

/**
 * Remove any localStorage username caching
 * Username should NEVER be cached in localStorage
 */
function clearUsernameCache() {
  localStorage.removeItem('pokergeek_username');
  console.log('✅ Cleared username from localStorage');
}

// Make functions globally available
window.getUsernameFromDB = getUsernameFromDB;
window.refreshUsernameInUI = refreshUsernameInUI;
window.clearUsernameCache = clearUsernameCache;

console.log('✅ Username helper loaded - DB is single source of truth');

