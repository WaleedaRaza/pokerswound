# Authentication Architecture & State Management

## 🎯 Overview
Unified authentication system with clear state management, UI feedback, and routing logic.

---

## 📊 User States & UI Representation

### State 1: **NOT_AUTHENTICATED** (No user)
**Visual Indicators:**
- Navbar: Shows "Log In" and "Sign Up" buttons
- User avatar: Hidden
- Dropdown: Hidden
- Protected actions: Disabled/Hidden

**Allowed Actions:**
- ✅ View public pages (home, about)
- ✅ Open login modal
- ✅ Sign in with Google
- ✅ Join as Guest
- ❌ Create games
- ❌ Join games
- ❌ Access profile

**Routing:**
- Can access: `/`, `/play` (shows login prompt)
- Redirected from: Protected pages → `/` with login modal

---

### State 2: **AUTHENTICATED_GOOGLE** (Real user via OAuth)
**Visual Indicators:**
- Navbar: Shows user profile tile with email/username
- User avatar: Shows first letter of username
- Dropdown: Shows full profile (email, username, settings, logout)
- Status badge: "🔐 Verified" or "💎 Premium"

**User Data Structure:**
```javascript
{
  id: "uuid-from-supabase",
  email: "waleedraza1211@gmail.com",
  username: "waleedraza1211",
  avatar: "👤",
  provider: "google",
  isGuest: false,
  isAnonymous: false,
  verified: true
}
```

**Allowed Actions:**
- ✅ All public actions
- ✅ Create games
- ✅ Join games
- ✅ Access profile
- ✅ Add friends
- ✅ Save preferences
- ✅ View history

**Routing:**
- Can access: All pages
- Persists across: Page navigation, refresh

---

### State 3: **AUTHENTICATED_GUEST** (Local guest)
**Visual Indicators:**
- Navbar: Shows user profile tile with guest name
- User avatar: Shows ghost emoji 👻
- Dropdown: Shows guest profile (limited options)
- Status badge: "👤 Guest Mode"

**User Data Structure:**
```javascript
{
  id: "uuid-local-generated",
  email: null,
  username: "Guest_1234",
  avatar: "👻",
  provider: "guest",
  isGuest: true,
  isAnonymous: false,
  verified: false
}
```

**Allowed Actions:**
- ✅ All public actions
- ✅ Create games (temporary)
- ✅ Join games
- ⚠️ No profile (prompt to sign up)
- ⚠️ No friends (prompt to sign up)
- ⚠️ No save preferences (session only)
- ⚠️ No history (prompt to sign up)

**Routing:**
- Can access: All pages (with limitations)
- Lost on: Browser close (no persistence)

---

### State 4: **AUTHENTICATED_ANONYMOUS** (Supabase anonymous)
**Visual Indicators:**
- Navbar: Shows user profile tile
- User avatar: Shows "🎭"
- Dropdown: Shows anonymous profile
- Status badge: "🎭 Anonymous"

**User Data Structure:**
```javascript
{
  id: "uuid-from-supabase-anon",
  email: null,
  username: "Guest_abc123",
  avatar: "🎭",
  provider: "anonymous",
  isGuest: false,
  isAnonymous: true,
  verified: false
}
```

**Allowed Actions:**
- Same as AUTHENTICATED_GUEST
- ✅ Can upgrade to full account

**Routing:**
- Can access: All pages (with limitations)
- Persists across: Refresh (Supabase session)

---

## 🔄 State Transitions & UI Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    STATE TRANSITIONS                         │
└─────────────────────────────────────────────────────────────┘

NOT_AUTHENTICATED
    │
    ├─→ [Click "Sign in with Google"] ──→ AUTHENTICATED_GOOGLE
    │                                      (Redirect to OAuth)
    │                                      (Return with session)
    │
    ├─→ [Click "Join as Guest"] ──────→ AUTHENTICATED_GUEST
    │                                    (Generate local UUID)
    │                                    (Store in localStorage)
    │
    └─→ [Auto-create anonymous] ──────→ AUTHENTICATED_ANONYMOUS
                                        (Supabase anonymous auth)

AUTHENTICATED_GOOGLE
    │
    ├─→ [Click "Logout"] ──────────────→ NOT_AUTHENTICATED
    │                                    (Clear Supabase session)
    │                                    (Clear localStorage)
    │                                    (Show logout animation)
    │
    └─→ [Session expires] ─────────────→ NOT_AUTHENTICATED
                                        (Auto-detect on page load)
                                        (Show "Session expired" toast)

AUTHENTICATED_GUEST
    │
    ├─→ [Click "Logout"] ──────────────→ NOT_AUTHENTICATED
    │                                    (Clear localStorage)
    │
    ├─→ [Click "Sign Up"] ─────────────→ AUTHENTICATED_GOOGLE
    │                                    (Upgrade account)
    │                                    (Migrate data)
    │
    └─→ [Browser close] ───────────────→ NOT_AUTHENTICATED
                                        (Session lost)

AUTHENTICATED_ANONYMOUS
    │
    ├─→ [Click "Logout"] ──────────────→ NOT_AUTHENTICATED
    │                                    (Clear Supabase session)
    │
    └─→ [Click "Upgrade"] ─────────────→ AUTHENTICATED_GOOGLE
                                        (Link anonymous to Google)
                                        (Keep game history)
```

---

## 🎨 UI Components by State

### Navbar Component States

#### NOT_AUTHENTICATED
```html
<div class="navbar-auth" style="display: flex;">
  <button class="navbar-btn navbar-btn-login">Log In</button>
  <button class="navbar-btn navbar-btn-signup">Sign Up</button>
</div>
<div class="navbar-user" style="display: none;"></div>
```

#### AUTHENTICATED (Any type)
```html
<div class="navbar-auth" style="display: none;"></div>
<div class="navbar-user" style="display: flex;">
  <div class="user-profile-tile">
    <div class="user-avatar">W</div>
    <div class="user-info">
      <div class="user-name">waleedraza1211</div>
      <div class="user-status">
        <span class="status-badge verified">🔐 Verified</span>
        <!-- OR -->
        <span class="status-badge guest">👤 Guest</span>
      </div>
    </div>
  </div>
</div>
```

### Login Modal States

#### Initial State
```html
<div class="modal-tabs">
  <button class="tab active">Sign In</button>
  <button class="tab">Sign Up</button>
</div>
<div class="modal-body">
  <button class="btn-google">
    <img src="google-icon.svg"> Sign in with Google
  </button>
  <div class="divider">OR</div>
  <button class="btn-guest">
    👻 Continue as Guest
  </button>
</div>
```

#### Loading State
```html
<div class="modal-body">
  <div class="loading-spinner"></div>
  <p>Signing you in...</p>
</div>
```

#### Error State
```html
<div class="modal-body">
  <div class="error-message">
    ❌ Sign in failed. Please try again.
  </div>
  <button class="btn-retry">Retry</button>
</div>
```

### Protected Action States

#### When NOT_AUTHENTICATED
```html
<button class="btn-create-game" disabled>
  🔒 Sign in to Create Game
</button>
```

#### When AUTHENTICATED_GUEST
```html
<button class="btn-create-game">
  🎮 Create Game (Guest Mode)
</button>
<div class="guest-notice">
  ⚠️ Games won't be saved. <a href="#upgrade">Sign up</a> to keep your progress.
</div>
```

#### When AUTHENTICATED_GOOGLE
```html
<button class="btn-create-game">
  🎮 Create Game
</button>
```

---

## 🛣️ Routing & Page Access Control

### Public Routes (No auth required)
- `/` - Home page
- `/about` - About page
- `/how-to-play` - Instructions

### Semi-Protected Routes (Guest allowed with warnings)
- `/play` - Play page (can join as guest)
- `/ai-solver` - AI tools (limited for guests)

### Protected Routes (Auth required)
- `/friends` - Friends list (redirect to login)
- `/profile` - User profile (redirect to login)
- `/history` - Game history (redirect to login)

### Route Guard Logic
```javascript
function canAccessRoute(route, userState) {
  const publicRoutes = ['/', '/about', '/how-to-play'];
  const semiProtectedRoutes = ['/play', '/ai-solver'];
  const protectedRoutes = ['/friends', '/profile', '/history'];
  
  if (publicRoutes.includes(route)) {
    return { allowed: true };
  }
  
  if (semiProtectedRoutes.includes(route)) {
    if (userState === 'NOT_AUTHENTICATED') {
      return { allowed: true, showLoginPrompt: true };
    }
    if (userState === 'AUTHENTICATED_GUEST') {
      return { allowed: true, showGuestWarning: true };
    }
    return { allowed: true };
  }
  
  if (protectedRoutes.includes(route)) {
    if (userState === 'NOT_AUTHENTICATED') {
      return { allowed: false, redirectTo: '/', showLoginModal: true };
    }
    if (userState === 'AUTHENTICATED_GUEST') {
      return { allowed: false, showUpgradePrompt: true };
    }
    return { allowed: true };
  }
}
```

---

## 💾 State Persistence

### localStorage Structure
```javascript
{
  "pokerUser": {
    "id": "uuid",
    "email": "user@gmail.com",
    "username": "username",
    "avatar": "👤",
    "provider": "google",
    "isGuest": false,
    "isAnonymous": false,
    "verified": true,
    "lastLogin": "2025-01-18T10:30:00Z"
  },
  "pokerPreferences": {
    "theme": "dark",
    "soundEnabled": true,
    "autoMuck": false
  }
}
```

### Supabase Session
- Managed automatically by Supabase SDK
- Stored in browser's secure storage
- Auto-refreshes tokens
- Expires after inactivity

---

## 🔔 Notifications & Feedback

### Success States
- ✅ "Signed in as waleedraza1211"
- ✅ "Joined as Guest_1234"
- ✅ "Logged out successfully"

### Warning States
- ⚠️ "Guest mode: Progress won't be saved"
- ⚠️ "Session expired. Please sign in again"
- ⚠️ "This feature requires a full account"

### Error States
- ❌ "Sign in failed. Please try again"
- ❌ "Network error. Check your connection"
- ❌ "Session invalid. Please sign in again"

---

## 🔧 Implementation Checklist

### Phase 1: Core Auth Manager
- [ ] Create AuthManager class
- [ ] Implement state detection
- [ ] Implement state transitions
- [ ] Add event emitters for state changes

### Phase 2: UI Components
- [ ] Update navbar to reflect states
- [ ] Add status badges
- [ ] Create loading states
- [ ] Add error states

### Phase 3: Routing & Guards
- [ ] Implement route guards
- [ ] Add redirect logic
- [ ] Show appropriate prompts

### Phase 4: Persistence
- [ ] Sync with localStorage
- [ ] Sync with Supabase
- [ ] Handle session refresh

### Phase 5: Notifications
- [ ] Success toasts
- [ ] Warning toasts
- [ ] Error toasts

### Phase 6: Testing
- [ ] Test all state transitions
- [ ] Test all routes
- [ ] Test persistence
- [ ] Test error handling

---

## 📝 Code Examples

### AuthManager with State Management
```javascript
class AuthManager {
  constructor() {
    this.state = 'NOT_AUTHENTICATED';
    this.user = null;
    this.listeners = [];
  }

  async init() {
    const session = await this.supabase.auth.getSession();
    if (session) {
      this.setState('AUTHENTICATED_GOOGLE', this.normalizeUser(session.user));
    } else {
      const cached = localStorage.getItem('pokerUser');
      if (cached) {
        const user = JSON.parse(cached);
        this.setState(
          user.isGuest ? 'AUTHENTICATED_GUEST' : 'AUTHENTICATED_ANONYMOUS',
          user
        );
      }
    }
  }

  setState(newState, user = null) {
    this.state = newState;
    this.user = user;
    this.notifyListeners();
    this.updateUI();
  }

  updateUI() {
    switch (this.state) {
      case 'NOT_AUTHENTICATED':
        this.showLoginButtons();
        this.hideUserProfile();
        break;
      case 'AUTHENTICATED_GOOGLE':
        this.hideLoginButtons();
        this.showUserProfile('verified');
        break;
      case 'AUTHENTICATED_GUEST':
        this.hideLoginButtons();
        this.showUserProfile('guest');
        break;
    }
  }
}
```

---

This architecture ensures:
✅ Clear state management
✅ Consistent UI feedback
✅ Proper routing logic
✅ Persistence across pages
✅ Error handling
✅ User experience clarity
