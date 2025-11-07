# 🏗️ USERNAME ARCHITECTURE - Single Source of Truth

**Date:** November 6, 2025  
**Principle:** Database is the ONLY source of truth. UI always fetches fresh.

---

## 🎯 CORE PRINCIPLES

1. **Database is Authoritative**
   - `user_profiles.username` is the ONLY source of truth
   - Once set, username persists in DB
   - All reads must come from DB (or verified cache)

2. **No Stale Caching**
   - localStorage is for performance only, not truth
   - Always verify cached username against DB
   - Invalidate cache on username change

3. **UI Always Reflects DB**
   - Every username display fetches from DB
   - No hardcoded usernames in UI
   - Refresh mechanism on page load

4. **Single Column**
   - Only `username` column (not `global_username`)
   - All code uses same column
   - Consistent across all layers

---

## 🔄 DATA FLOW ARCHITECTURE

### **Flow 1: User Login → Username Display**

```
1. User logs in (Google OAuth)
   ↓
2. Supabase returns user object (NO username)
   ↓
3. Backend: POST /api/auth/sync-user
   - Creates/updates user_profiles
   - Sets username if new user: `user_${id.substring(0,8)}`
   ↓
4. Frontend: AuthManager.normalizeUser()
   - Fetches from DB: GET /api/auth/profile/${userId}
   - Gets username from DB response
   - Stores in memory: this.user.username
   ↓
5. UI: NavbarController.showUser()
   - Fetches FRESH from DB: GET /api/auth/profile/${userId}
   - Displays: @${profile.username}
   - NO localStorage for username
```

**Key Points:**
- Username fetched TWICE: once for auth, once for display
- Display always fetches fresh (no cache trust)
- localStorage NOT used for username

---

### **Flow 2: Username Change → UI Update**

```
1. User changes username via modal
   ↓
2. Frontend: POST /api/auth/set-username
   - Updates DB: user_profiles.username = newUsername
   ↓
3. Backend updates DB
   - Logs change to username_changes table
   - Updates user_profiles.username
   ↓
4. Frontend receives success
   - Updates in-memory: authManager.user.username = newUsername
   - Invalidates localStorage (if any)
   - Refreshes UI: Fetches fresh from DB
   ↓
5. All UI components refresh
   - Navbar: Fetches fresh username
   - Profile modal: Fetches fresh username
   - Friends list: Fetches fresh username
```

**Key Points:**
- DB update happens FIRST
- Then in-memory cache updated
- Then UI refreshes from DB (not cache)

---

### **Flow 3: Page Refresh → Username Persistence**

```
1. Page loads
   ↓
2. AuthManager.checkAuth()
   - Checks Supabase session
   - If session exists:
     a. Syncs to backend (ensures user exists)
     b. Fetches username from DB: GET /api/auth/profile/${userId}
     c. Normalizes user object
   ↓
3. NavbarController.init()
   - Calls showUser(user)
   - showUser() fetches FRESH from DB
   - Displays username
   ↓
4. All other components
   - Fetch username from DB when needed
   - Never trust localStorage
```

**Key Points:**
- Every page load fetches fresh username
- No reliance on localStorage
- DB is always checked

---

## 🚨 CURRENT PROBLEMS

### **Problem 1: localStorage Caching**

**Location:** `public/js/social-modals.js` lines 153, 783

```javascript
// ❌ BAD: Caching username in localStorage
localStorage.setItem('pokergeek_username', username);
```

**Issue:**
- Username cached in localStorage
- Can become stale if changed elsewhere
- UI might display old username

**Fix:**
- Remove localStorage caching for username
- Always fetch from DB

---

### **Problem 2: In-Memory Cache Not Refreshed**

**Location:** `public/js/username-modal.js` line 347

```javascript
// ⚠️ Updates in-memory but doesn't refresh UI from DB
window.authManager.user.username = username;
```

**Issue:**
- Updates in-memory cache
- But UI might not refresh
- Other components might have stale data

**Fix:**
- After username change, force refresh all UI components
- Fetch fresh from DB for all displays

---

### **Problem 3: Multiple Username Sources**

**Current State:**
- Some code uses `user.username` (from authManager)
- Some code uses `localStorage.getItem('pokergeek_username')`
- Some code fetches from DB
- Some code uses `window.currentUser.username`

**Issue:**
- Inconsistent sources
- Can show different usernames in different places

**Fix:**
- Standardize: Always fetch from DB
- Create helper function: `getUsernameFromDB(userId)`
- Use helper everywhere

---

### **Problem 4: TypeScript Services Use Wrong Column**

**Location:** All TypeScript services use `global_username`

**Issue:**
- FriendService searches by `global_username`
- But DB has username in `username` column
- Searches fail

**Fix:**
- Update all TypeScript services to use `username`
- Remove `global_username` references

---

## ✅ SOLUTION ARCHITECTURE

### **Layer 1: Database (Source of Truth)**

```sql
-- user_profiles table
username VARCHAR NOT NULL UNIQUE  -- ONLY column for username
```

**Rules:**
- Username stored here
- Never stored elsewhere
- Always queried from here

---

### **Layer 2: Backend API (Read/Write)**

```javascript
// GET /api/auth/profile/:userId
// Returns: { username, ... }
// Always queries DB

// POST /api/auth/set-username
// Updates: user_profiles.username
// Returns: { success, username }
// Always updates DB first
```

**Rules:**
- All endpoints query DB directly
- No caching in backend
- Always return fresh data

---

### **Layer 3: Frontend Auth Manager (Session Cache)**

```javascript
// AuthManager.user.username
// - Cached for current session
// - Fetched from DB on login
// - Updated after username change
// - NOT used for display (display fetches fresh)
```

**Rules:**
- In-memory cache for performance
- Always verified against DB
- Not trusted for display

---

### **Layer 4: UI Components (Always Fresh)**

```javascript
// Navbar, Profile Modal, Friends List, etc.
// Always fetch username from DB when displaying
// Never trust cache
```

**Rules:**
- Every display fetches fresh
- No localStorage for username
- Refresh on username change

---

## 🔧 IMPLEMENTATION PLAN

### **Step 1: Remove localStorage Username Caching**

**Files:**
- `public/js/social-modals.js` - Remove lines 153, 783
- Any other files using `localStorage.setItem('pokergeek_username', ...)`

**Change:**
```javascript
// ❌ REMOVE:
localStorage.setItem('pokergeek_username', username);

// ✅ REPLACE WITH:
// Nothing - just fetch from DB when needed
```

---

### **Step 2: Create Username Helper Function**

**File:** `public/js/username-helper.js` (new file)

```javascript
/**
 * Get username from database (single source of truth)
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} Username or null
 */
async function getUsernameFromDB(userId) {
  try {
    const response = await fetch(`/api/auth/profile/${userId}`);
    if (response.ok) {
      const profile = await response.json();
      return profile.username || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching username from DB:', error);
    return null;
  }
}

/**
 * Refresh username in all UI components
 * @param {string} userId - User ID
 */
async function refreshUsernameInUI(userId) {
  const username = await getUsernameFromDB(userId);
  if (!username) return;
  
  // Update navbar
  const userNameEl = document.getElementById('userName');
  if (userNameEl) userNameEl.textContent = `@${username}`;
  
  // Update dropdown
  const dropdownUsernameEl = document.getElementById('dropdownUsername');
  if (dropdownUsernameEl) dropdownUsernameEl.textContent = `@${username}`;
  
  // Update auth manager cache
  if (window.authManager && window.authManager.user) {
    window.authManager.user.username = username;
  }
  
  // Trigger custom event for other components
  window.dispatchEvent(new CustomEvent('usernameUpdated', { 
    detail: { userId, username } 
  }));
}
```

---

### **Step 3: Update All UI Components**

**Files to Update:**

1. **`public/js/nav-shared.js`**
   ```javascript
   // ✅ ALREADY GOOD: Fetches from DB
   async showUser(user) {
     // Fetches fresh from DB
     const response = await fetch(`/api/auth/profile/${user.id}`);
     const profile = await response.json();
     displayUsername = profile.username;
   }
   ```

2. **`public/js/social-modals.js`**
   ```javascript
   // After username set:
   // ❌ REMOVE: localStorage.setItem('pokergeek_username', username);
   // ✅ ADD: await refreshUsernameInUI(userId);
   ```

3. **`public/js/friends-page.js`**
   ```javascript
   // When displaying friend username:
   // ✅ ALREADY GOOD: Uses friend.username from API response
   // API response comes from DB, so it's fresh
   ```

4. **`public/poker-table-zoom-lock.html`**
   ```javascript
   // When displaying player username:
   // ✅ ALREADY GOOD: Uses seat.username from API response
   // API response comes from DB JOIN, so it's fresh
   ```

---

### **Step 4: Update TypeScript Services**

**Files:**
- `src/services/social/FriendService.ts`
- `src/services/user/UsernameService.ts`
- `src/services/user/UserProfileService.ts`
- `src/services/game/DisplayService.ts`

**Change:**
```typescript
// ❌ BEFORE:
up.global_username

// ✅ AFTER:
up.username
```

---

### **Step 5: Username Change Flow**

**File:** `public/js/username-modal.js`

```javascript
// After successful username change:
if (response.ok) {
  // 1. Update in-memory cache
  window.authManager.user.username = username;
  
  // 2. Refresh all UI components from DB
  await refreshUsernameInUI(userId);
  
  // 3. Close modal
  modal.style.display = 'none';
}
```

---

## 🧪 TESTING CHECKLIST

### **Test 1: Username Persistence**
- [ ] Set username
- [ ] Refresh page
- [ ] Username still shows (fetched from DB)
- [ ] No localStorage dependency

### **Test 2: Username Change**
- [ ] Change username
- [ ] All UI updates immediately
- [ ] Navbar shows new username
- [ ] Profile modal shows new username
- [ ] Friends list shows new username

### **Test 3: Multi-Tab**
- [ ] Open two tabs
- [ ] Change username in tab 1
- [ ] Tab 2 refreshes (or shows new username on next action)
- [ ] Both tabs show same username

### **Test 4: Friend Search**
- [ ] Search by username
- [ ] Finds user correctly
- [ ] Displays correct username
- [ ] Uses `username` column (not `global_username`)

---

## 📊 ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────┐
│                    DATABASE LAYER                        │
│  user_profiles.username (NOT NULL, UNIQUE)              │
│  ← SINGLE SOURCE OF TRUTH                               │
└─────────────────────────────────────────────────────────┘
                          ↑ ↓
                    (Read/Write)
┌─────────────────────────────────────────────────────────┐
│                   BACKEND API LAYER                      │
│  GET  /api/auth/profile/:userId  → SELECT username      │
│  POST /api/auth/set-username      → UPDATE username     │
│  GET  /api/social/username/:username → SELECT by username│
│  ← Always queries DB, no caching                        │
└─────────────────────────────────────────────────────────┘
                          ↑ ↓
                    (HTTP Requests)
┌─────────────────────────────────────────────────────────┐
│              FRONTEND AUTH MANAGER LAYER                 │
│  authManager.user.username (in-memory cache)            │
│  ← Session cache only, not trusted for display          │
└─────────────────────────────────────────────────────────┘
                          ↑ ↓
                    (Used for auth, not display)
┌─────────────────────────────────────────────────────────┐
│                   UI COMPONENTS LAYER                     │
│  Navbar, Profile Modal, Friends List, etc.              │
│  ← Always fetches fresh from DB via API                 │
│  ← Never uses localStorage for username                 │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 SUCCESS CRITERIA

1. ✅ Username stored ONLY in `user_profiles.username`
2. ✅ All reads come from DB (via API)
3. ✅ No localStorage caching of username
4. ✅ UI always displays fresh username from DB
5. ✅ Username changes reflect immediately everywhere
6. ✅ All code uses `username` column (not `global_username`)
7. ✅ Friend search works (uses `username` column)
8. ✅ Page refresh shows correct username (fetched from DB)

---

**This architecture ensures database is the single source of truth, and UI always reflects it.**

