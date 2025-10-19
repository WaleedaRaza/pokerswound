# Authentication Implementation Plan

## ✅ Completed

### 1. Architecture Documentation
- Created `AUTH_ARCHITECTURE.md` with complete state diagrams
- Defined 4 user states with UI representations
- Documented state transitions and routing logic

### 2. AuthManager Implementation
- Created `auth-manager.js` with full state management
- Implements all 4 auth states
- Handles Supabase OAuth and local guests
- Provides UI update methods
- Includes route guards

## 📋 Next Steps

### Phase 1: Integration (Do NOT implement yet - review first!)

#### Step 1.1: Add AuthManager to Pages
Add this script tag to ALL pages (before other scripts):
```html
<script src="/js/auth-manager.js"></script>
```

Pages to update:
- `poker-engine/public/pages/index.html`
- `poker-engine/public/pages/play.html`
- `poker-engine/public/poker.html`
- All other pages in `/pages/`

#### Step 1.2: Replace Auth Initialization
In each page, replace:
```javascript
// OLD:
function checkAuthState() {
  const savedUser = localStorage.getItem('pokerUser');
  if (savedUser) {
    currentUser = JSON.parse(savedUser);
    updateNavbarForLoggedInUser();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuthState();
});
```

With:
```javascript
// NEW:
document.addEventListener('DOMContentLoaded', async () => {
  const user = await window.authManager.init();
  console.log('Auth initialized:', user);
  
  // Rest of page initialization...
});
```

#### Step 1.3: Replace Logout Functions
In each page, replace:
```javascript
// OLD:
function handleLogout() {
  currentUser = null;
  isLoggedIn = false;
  localStorage.removeItem('pokerUser');
  updateNavbarForLoggedOutUser();
}
```

With:
```javascript
// NEW:
async function handleLogout() {
  if (confirm('Are you sure you want to logout?')) {
    await window.authManager.logout();
    showNotification('Logged out successfully', 'success');
    
    // Optional: redirect to home
    if (window.location.pathname !== '/') {
      setTimeout(() => window.location.href = '/', 1000);
    }
  }
}
```

#### Step 1.4: Replace Login Functions
In each page, replace:
```javascript
// OLD:
function handleGoogleAuth() {
  // Mock auth code...
}
```

With:
```javascript
// NEW:
async function handleGoogleAuth() {
  try {
    await window.authManager.signInWithGoogle();
    // User will be redirected to Google OAuth
  } catch (error) {
    showNotification('Sign in failed: ' + error.message, 'error');
  }
}

async function handleGuestSignIn() {
  try {
    const user = await window.authManager.signInAsGuest();
    closeLoginModal();
    showNotification(`Playing as ${user.username}`, 'success');
  } catch (error) {
    showNotification('Failed to create guest session', 'error');
  }
}
```

#### Step 1.5: Use AuthManager State
Replace all references to `currentUser` with `authManager.getUser()`:
```javascript
// OLD:
if (currentUser) {
  console.log('User:', currentUser.username);
}

// NEW:
const user = authManager.getUser();
if (user) {
  console.log('User:', user.username);
}
```

### Phase 2: Testing Plan

#### Test 1: Google OAuth Flow
1. Go to `/` (home page)
2. Click "Log In"
3. Click "Sign in with Google"
4. Complete OAuth flow
5. Verify: Navbar shows email username
6. Navigate to `/play`
7. Verify: Still logged in, same username
8. Click logout
9. Verify: Logged out, navbar shows login buttons
10. Refresh page
11. Verify: Still logged out

**Expected Result:** ✅ Clean login/logout, persists across pages

#### Test 2: Guest Flow
1. Go to `/play`
2. Click "Join as Guest"
3. Verify: Navbar shows "Guest_XXXX" with 👻
4. Navigate to `/`
5. Verify: Still shows guest username
6. Click logout
7. Verify: Logged out
8. Refresh page
9. Verify: Still logged out

**Expected Result:** ✅ Guest session works, clears properly

#### Test 3: Cross-Page Persistence
1. Login with Google on `/`
2. Navigate to `/play`
3. Verify: Still logged in
4. Navigate to `/friends`
5. Verify: Still logged in
6. Open new tab, go to `/play`
7. Verify: Already logged in (same session)

**Expected Result:** ✅ Session persists across tabs and pages

#### Test 4: Session Expiry
1. Login with Google
2. Manually clear Supabase session (dev tools)
3. Refresh page
4. Verify: Shows "Session expired" and logs out

**Expected Result:** ✅ Detects expired session

### Phase 3: UI Enhancements (Optional)

#### Add Status Badges
```html
<div class="user-status">
  <!-- For Google users -->
  <span class="status-badge verified">🔐 Verified</span>
  
  <!-- For guests -->
  <span class="status-badge guest">👻 Guest Mode</span>
  
  <!-- For anonymous -->
  <span class="status-badge anonymous">🎭 Anonymous</span>
</div>
```

#### Add Loading States
```javascript
async function handleGoogleAuth() {
  showLoadingState('Signing in...');
  try {
    await window.authManager.signInWithGoogle();
  } catch (error) {
    hideLoadingState();
    showError(error.message);
  }
}
```

#### Add Guest Warnings
```javascript
if (authManager.isGuest()) {
  showWarning('Guest mode: Progress won\'t be saved. Sign up to keep your games!');
}
```

## ⚠️ Important Notes

### DO NOT Implement Yet!
This is a **review document**. Before implementing:
1. Review the architecture document
2. Understand the state transitions
3. Test the AuthManager in isolation
4. Plan the integration carefully

### Rollback Plan
If something breaks:
1. Remove `<script src="/js/auth-manager.js"></script>` from all pages
2. Revert to previous auth code
3. Clear localStorage and Supabase session
4. Refresh browser

### Migration Strategy
1. **Start with ONE page** (`index.html`)
2. Test thoroughly
3. If working, migrate `play.html`
4. Test thoroughly
5. If working, migrate `poker.html`
6. Test thoroughly
7. Migrate remaining pages

### Success Criteria
✅ Login works on all pages
✅ Logout works on all pages
✅ Username displays consistently
✅ Session persists across pages
✅ Session persists across refresh
✅ No "Guest_576de1" for Google users
✅ No need to logout twice
✅ Navbar updates immediately

## 🎯 Current Status

- [x] Architecture designed
- [x] AuthManager implemented
- [ ] Integration started
- [ ] Testing completed
- [ ] Deployed to production

**Next Action:** Review this plan with the user before proceeding!

