/**
 * Avatar Persistence Test Suite
 * Run this in browser console to test avatar persistence
 * 
 * Usage:
 * 1. Open browser console (F12)
 * 2. Copy and paste this entire file
 * 3. Run: await testAvatarPersistence()
 */

async function testAvatarPersistence() {
  console.log('🧪 Starting Avatar Persistence Test Suite...\n');
  
  const results = {
    passed: [],
    failed: [],
    warnings: []
  };
  
  // Helper to log test results
  function logTest(name, passed, message = '') {
    if (passed) {
      console.log(`✅ ${name}`);
      results.passed.push(name);
    } else {
      console.error(`❌ ${name}${message ? ': ' + message : ''}`);
      results.failed.push(name);
    }
  }
  
  // Helper to log warnings
  function logWarning(name, message) {
    console.warn(`⚠️ ${name}: ${message}`);
    results.warnings.push({ name, message });
  }
  
  // Test 1: Check if authManager exists
  console.log('\n📋 Test 1: Auth Manager Check');
  if (!window.authManager) {
    logTest('AuthManager exists', false, 'window.authManager not found');
    return results;
  }
  logTest('AuthManager exists', true);
  
  // Test 2: Check if user is logged in
  console.log('\n📋 Test 2: User Authentication Check');
  const user = window.authManager.user;
  if (!user) {
    logTest('User logged in', false, 'No user found. Please log in first.');
    return results;
  }
  logTest('User logged in', true, `User: ${user.username} (${user.id})`);
  
  // Test 3: Check if avatar_url is in user object
  console.log('\n📋 Test 3: Avatar URL in User Object');
  const hasAvatarUrl = user.avatar_url !== undefined;
  logTest('avatar_url property exists', hasAvatarUrl, 
    hasAvatarUrl ? `Value: ${user.avatar_url ? user.avatar_url.substring(0, 50) + '...' : 'null'}` : 'Missing avatar_url property');
  
  // Test 4: Check localStorage
  console.log('\n📋 Test 4: LocalStorage Check');
  const cachedUser = localStorage.getItem('pokerUser');
  if (cachedUser) {
    try {
      const parsed = JSON.parse(cachedUser);
      const hasCachedAvatar = parsed.avatar_url !== undefined;
      logTest('avatar_url in localStorage', hasCachedAvatar,
        hasCachedAvatar ? `Value: ${parsed.avatar_url ? parsed.avatar_url.substring(0, 50) + '...' : 'null'}` : 'Missing');
      
      // Check if values match
      if (hasCachedAvatar && user.avatar_url) {
        const matches = parsed.avatar_url === user.avatar_url;
        logTest('localStorage matches memory', matches,
          matches ? 'Values match' : 'Values differ');
      }
    } catch (e) {
      logTest('localStorage parseable', false, e.message);
    }
  } else {
    logTest('localStorage has pokerUser', false, 'No cached user found');
  }
  
  // Test 5: Check database
  console.log('\n📋 Test 5: Database Check');
  try {
    const response = await fetch(`/api/auth/profile/${user.id}`);
    if (response.ok) {
      const profile = await response.json();
      const dbHasAvatar = profile.avatar_url !== undefined;
      logTest('avatar_url in database', dbHasAvatar,
        dbHasAvatar ? `Value: ${profile.avatar_url ? profile.avatar_url.substring(0, 50) + '...' : 'null'}` : 'Missing');
      
      // Check if DB matches memory
      if (dbHasAvatar && user.avatar_url) {
        const matches = profile.avatar_url === user.avatar_url;
        logTest('Database matches memory', matches,
          matches ? 'Values match' : `DB: ${profile.avatar_url}, Memory: ${user.avatar_url}`);
      }
    } else {
      logTest('Database fetch successful', false, `Status: ${response.status}`);
    }
  } catch (e) {
    logTest('Database fetch', false, e.message);
  }
  
  // Test 6: Check UI elements
  console.log('\n📋 Test 6: UI Display Check');
  const userAvatar = document.getElementById('userAvatar');
  const dropdownAvatar = document.getElementById('dropdownAvatar');
  
  logTest('Navbar avatar element exists', !!userAvatar);
  logTest('Dropdown avatar element exists', !!dropdownAvatar);
  
  if (userAvatar) {
    const hasImage = userAvatar.querySelector('img') !== null;
    const hasText = userAvatar.textContent.trim() !== '';
    logTest('Navbar avatar displays content', hasImage || hasText,
      hasImage ? 'Image displayed' : hasText ? `Emoji: ${userAvatar.textContent}` : 'Empty');
  }
  
  if (dropdownAvatar) {
    const hasImage = dropdownAvatar.querySelector('img') !== null;
    const hasText = dropdownAvatar.textContent.trim() !== '';
    logTest('Dropdown avatar displays content', hasImage || hasText,
      hasImage ? 'Image displayed' : hasText ? `Emoji: ${dropdownAvatar.textContent}` : 'Empty');
  }
  
  // Test 7: Test avatar update flow
  console.log('\n📋 Test 7: Avatar Update Flow');
  const testAvatarUrl = 'https://via.placeholder.com/150';
  
  try {
    const token = await window.authManager.getAccessToken();
    if (!token) {
      logTest('Can get access token', false, 'No token available');
    } else {
      logTest('Can get access token', true);
      
      // Try to update avatar
      const response = await fetch('/api/social/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ avatar_url: testAvatarUrl })
      });
      
      if (response.ok) {
        logTest('Avatar update API call', true);
        
        // Check if authManager updated
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait for updates
        const updatedUser = window.authManager.user;
        const updated = updatedUser.avatar_url === testAvatarUrl;
        logTest('AuthManager updated after save', updated,
          updated ? 'Value updated' : `Expected: ${testAvatarUrl}, Got: ${updatedUser.avatar_url}`);
        
        // Check localStorage
        const cached = JSON.parse(localStorage.getItem('pokerUser') || '{}');
        const cachedUpdated = cached.avatar_url === testAvatarUrl;
        logTest('LocalStorage updated after save', cachedUpdated,
          cachedUpdated ? 'Value updated' : `Expected: ${testAvatarUrl}, Got: ${cached.avatar_url}`);
      } else {
        logTest('Avatar update API call', false, `Status: ${response.status}`);
      }
    }
  } catch (e) {
    logTest('Avatar update flow', false, e.message);
  }
  
  // Test 8: Test persistence after refresh simulation
  console.log('\n📋 Test 8: Refresh Simulation');
  const beforeRefresh = {
    memory: user.avatar_url,
    localStorage: JSON.parse(localStorage.getItem('pokerUser') || '{}').avatar_url,
    db: null
  };
  
  try {
    const response = await fetch(`/api/auth/profile/${user.id}`);
    if (response.ok) {
      const profile = await response.json();
      beforeRefresh.db = profile.avatar_url;
    }
  } catch (e) {
    logWarning('Refresh simulation', 'Could not fetch from DB');
  }
  
  // Simulate refresh by re-normalizing user
  try {
    const { data: { session } } = await window.authManager.supabase.auth.getSession();
    if (session && session.user) {
      const refreshedUser = await window.authManager.normalizeUser(session.user, 'google');
      const afterRefresh = refreshedUser.avatar_url;
      
      const persisted = beforeRefresh.db === afterRefresh;
      logTest('Avatar persists after refresh simulation', persisted,
        persisted ? 'Value matches' : `Before: ${beforeRefresh.db}, After: ${afterRefresh}`);
    } else {
      logTest('Refresh simulation', false, 'No session found');
    }
  } catch (e) {
    logTest('Refresh simulation', false, e.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`⚠️ Warnings: ${results.warnings.length}`);
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(test => console.log(`  - ${test}`));
  }
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    results.warnings.forEach(w => console.log(`  - ${w.name}: ${w.message}`));
  }
  
  const successRate = (results.passed.length / (results.passed.length + results.failed.length)) * 100;
  console.log(`\n📈 Success Rate: ${successRate.toFixed(1)}%`);
  
  if (successRate === 100) {
    console.log('🎉 All tests passed! Avatar persistence is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Review the errors above.');
  }
  
  return results;
}

// Quick test functions
async function testAvatarSet() {
  console.log('🧪 Testing avatar set...');
  const testUrl = prompt('Enter avatar URL to test:', 'https://via.placeholder.com/150');
  if (!testUrl) return;
  
  try {
    const token = await window.authManager.getAccessToken();
    const response = await fetch('/api/social/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ avatar_url: testUrl })
    });
    
    if (response.ok) {
      console.log('✅ Avatar set successfully');
      console.log('🔄 Refreshing display...');
      await window.authManager.checkAuth();
      await window.navbarController.showUser(window.authManager.user);
      console.log('✅ Display refreshed');
    } else {
      console.error('❌ Failed to set avatar:', await response.text());
    }
  } catch (e) {
    console.error('❌ Error:', e);
  }
}

async function testAvatarRefresh() {
  console.log('🧪 Testing avatar refresh from DB...');
  const user = window.authManager.user;
  if (!user) {
    console.error('❌ No user logged in');
    return;
  }
  
  try {
    const response = await fetch(`/api/auth/profile/${user.id}`);
    if (response.ok) {
      const profile = await response.json();
      console.log('📊 Database avatar_url:', profile.avatar_url || 'null');
      console.log('📊 Memory avatar_url:', user.avatar_url || 'null');
      
      // Update memory
      user.avatar_url = profile.avatar_url;
      window.authManager.saveToCache();
      await window.navbarController.showUser(user);
      console.log('✅ Refreshed from database');
    } else {
      console.error('❌ Failed to fetch profile');
    }
  } catch (e) {
    console.error('❌ Error:', e);
  }
}

// Make functions globally available
window.testAvatarPersistence = testAvatarPersistence;
window.testAvatarSet = testAvatarSet;
window.testAvatarRefresh = testAvatarRefresh;

console.log('✅ Avatar persistence test suite loaded!');
console.log('📝 Run: await testAvatarPersistence()');
console.log('📝 Or: await testAvatarSet()');
console.log('📝 Or: await testAvatarRefresh()');

