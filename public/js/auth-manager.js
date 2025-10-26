/**
 * Minimal Auth Manager - Single Source of Truth
 * Handles both Supabase (Google OAuth) and Guest authentication
 */

class AuthManager {
  constructor() {
    // Initialize Supabase client
    this.supabase = window.supabase.createClient(
      'https://curkkakmkiyrimqsafps.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1cmtrYWtta2l5cmltcXNhZnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDI5NTYsImV4cCI6MjA3NTY3ODk1Nn0.68l4EDYgeK2oWJ_p69MaHkbjn8T52BqetWpcnxCU1gU'
    );
    this.user = null;
    this.listeners = [];
  }

  /**
   * Check authentication state
   * Priority: Supabase session > localStorage guest
   * @returns {Promise<Object|null>} User object or null
   */
  async checkAuth() {
    console.log('🔍 AuthManager: Checking auth state...');
    
    // 1. Check Supabase session first (source of truth)
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      
      if (session && session.user) {
        console.log('✅ AuthManager: Found Supabase session');
        this.user = this.normalizeUser(session.user, 'google');
        this.saveToCache();
        
        // Sync to backend (non-blocking)
        this.syncToBackend().catch(err => 
          console.warn('⚠️ Backend sync failed:', err)
        );
        
        this.notifyListeners();
        return this.user;
      }
    } catch (error) {
      console.warn('⚠️ AuthManager: Supabase check failed:', error);
    }
    
    // 2. Check localStorage for guest user
    const cached = localStorage.getItem('pokerUser');
    if (cached) {
      try {
        this.user = JSON.parse(cached);
        
        // CRITICAL: Validate UUID format - reject old non-UUID guest IDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(this.user.id)) {
          console.warn('❌ AuthManager: Invalid guest ID format (not a UUID):', this.user.id);
          console.warn('🧹 Clearing invalid cached user...');
          localStorage.removeItem('pokerUser');
          this.user = null;
          this.notifyListeners();
          return null;
        }
        
        console.log('✅ AuthManager: Found cached user:', this.user.username);
        this.notifyListeners();
        return this.user;
      } catch (error) {
        console.warn('⚠️ AuthManager: Invalid cached user data');
        localStorage.removeItem('pokerUser');
      }
    }
    
    console.log('ℹ️ AuthManager: No authenticated user');
    return null;
  }

  /**
   * Normalize user data to consistent structure
   * @param {Object} supabaseUser - Supabase user object
   * @param {string} provider - Auth provider ('google', 'guest', 'anonymous')
   * @returns {Object} Normalized user object
   */
  normalizeUser(supabaseUser, provider) {
    const email = supabaseUser.email || null;
    const username = email 
      ? email.split('@')[0] 
      : `Guest_${supabaseUser.id.substring(0, 6)}`;
    
    return {
      id: supabaseUser.id,
      email: email,
      username: username,
      avatar: provider === 'google' ? '👤' : '👻',
      provider: provider,
      isGuest: provider === 'guest' || provider === 'anonymous',
      isAnonymous: provider === 'anonymous'
    };
  }

  /**
   * Login with Google OAuth
   * @returns {Promise<void>}
   */
  async loginWithGoogle() {
    console.log('🔐 AuthManager: Starting Google OAuth...');
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      console.log('✅ AuthManager: Google OAuth initiated');
    } catch (error) {
      console.error('❌ AuthManager: Google OAuth failed:', error);
      throw error;
    }
  }

  /**
   * Create a guest user (DEPRECATED - use signInAnonymously instead)
   * This creates fake IDs that don't work with UUID database fields!
   * @returns {Promise<Object>} Guest user object
   */
  async createGuest() {
    console.warn('⚠️ createGuest() is deprecated! Using signInAnonymously() instead...');
    // Redirect to proper Supabase anonymous auth which gives real UUIDs
    return await this.signInAnonymously();
  }

  /**
   * Sign in anonymously with Supabase
   * @returns {Promise<Object>} Anonymous user object
   */
  async signInAnonymously() {
    console.log('🔐 AuthManager: Signing in anonymously...');
    try {
      const { data, error } = await this.supabase.auth.signInAnonymously();
      
      if (error) {
        console.error('❌ Supabase anonymous auth error:', error);
        throw error;
      }
      
      if (!data || !data.user) {
        throw new Error('No user data returned from Supabase');
      }
      
      console.log('✅ Supabase anonymous user:', data.user);
      console.log('✅ Session exists:', !!data.session);
      if (data.session) {
        console.log('✅ Token exists:', !!data.session.access_token);
      }
      
      this.user = this.normalizeUser(data.user, 'anonymous');
      this.saveToCache();
      this.notifyListeners();
      console.log('✅ AuthManager: Anonymous sign-in successful', this.user);
      return this.user;
    } catch (error) {
      console.error('❌ AuthManager: Anonymous sign-in failed:', error);
      console.error('❌ Error details:', error.message);
      
      // Create local guest as fallback (NO circular call to signInAnonymously)
      console.warn('⚠️ Creating local guest as fallback...');
      
      // Generate a proper UUID v4 for the guest
      const generateUUID = () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };
      
      const guestId = generateUUID();
      const guestNum = Math.floor(Math.random() * 9999);
      
      this.user = {
        id: guestId,
        username: `Guest_${guestNum}`,
        email: null,
        isGuest: true,
        isAnonymous: true,
        avatar: '👻',
        provider: 'guest',
        createdAt: new Date().toISOString()
      };
      
      this.saveToCache();
      this.notifyListeners();
      console.log('✅ Local guest created with UUID:', this.user);
      return this.user;
    }
  }

  /**
   * Get current JWT access token
   * @returns {Promise<string|null>} JWT token or null
   */
  async getAccessToken() {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();
      if (error) throw error;
      
      const token = session?.access_token || null;
      console.log('🔑 getAccessToken:', token ? `Token exists (${token.substring(0, 20)}...)` : 'No token found');
      
      return token;
    } catch (error) {
      console.warn('⚠️ AuthManager: Failed to get access token:', error);
      return null;
    }
  }

  /**
   * Get authorization headers for API calls
   * @returns {Promise<Object>} Headers object with Authorization
   */
  async getAuthHeaders() {
    const token = await this.getAccessToken();
    const headers = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  /**
   * Logout - Clear everything
   * @returns {Promise<void>}
   */
  async logout() {
    console.log('🚪 AuthManager: Logging out...');
    
    // 1. Sign out from Supabase (if logged in with Supabase)
    try {
      await this.supabase.auth.signOut();
      console.log('✅ AuthManager: Signed out from Supabase');
    } catch (error) {
      console.warn('⚠️ AuthManager: Supabase sign-out failed:', error);
    }
    
    // 2. Clear localStorage
    localStorage.removeItem('pokerUser');
    console.log('✅ AuthManager: Cleared localStorage');
    
    // 3. Clear memory
    this.user = null;
    
    // 4. Notify listeners
    this.notifyListeners();
    
    console.log('✅ AuthManager: Logout complete');
  }

  /**
   * Save user to localStorage (cache)
   */
  saveToCache() {
    if (this.user) {
      localStorage.setItem('pokerUser', JSON.stringify(this.user));
      console.log('[AuthManager] Saved user cache entry');
    }
  }

  /**
   * Get the current user, optionally forcing a fresh auth check
   * @param {Object} [options]
   * @param {boolean} [options.forceRefresh=false]
   * @returns {Promise<Object|null>}
   */
  async getCurrentUser(options = {}) {
    const { forceRefresh = false } = options;

    if (!forceRefresh && this.user) {
      return this.user;
    }

    try {
      const user = await this.checkAuth();
      return user || this.user;
    } catch (error) {
      console.warn('Warning: AuthManager getCurrentUser failed to refresh auth:', error);
      return this.user;
    }
  }

  /**
   * Get current user
   * @returns {Object|null} Current user or null
   */
  getUser() {
    return this.user;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return this.user !== null;
  }

  /**
   * Register a listener for auth state changes
   * @param {Function} callback - Function to call when auth state changes
   */
  onAuthStateChange(callback) {
    this.listeners.push(callback);
  }

  /**
   * Notify all listeners of auth state change
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.user);
      } catch (error) {
        console.error('❌ AuthManager: Listener error:', error);
      }
    });
  }

  /**
   * Sync Supabase user to backend
   * @returns {Promise<void>}
   */
  async syncToBackend() {
    if (!this.user || this.user.isGuest) {
      console.log('ℹ️ AuthManager: Skipping backend sync (guest user)');
      return;
    }

    console.log('🔄 AuthManager: Syncing user to backend...');
    try {
      const response = await fetch('/api/auth/sync-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.user)
      });

      if (!response.ok) {
        throw new Error(`Backend sync failed: ${response.statusText}`);
      }

      console.log('✅ AuthManager: User synced to backend');
    } catch (error) {
      console.warn('⚠️ AuthManager: Backend sync failed:', error);
      // Non-critical, continue anyway
    }
  }
}

// Create global instance
window.authManager = new AuthManager();

console.log('✅ AuthManager loaded');




