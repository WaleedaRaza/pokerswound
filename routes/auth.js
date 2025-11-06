// AUTH ROUTER - EXTRACTED FROM MONOLITH
// CRITICAL: Preserves Supabase OAuth integration and user sync logic

const express = require('express');
const router = express.Router();
const { withIdempotency } = require('../src/middleware/idempotency');

/**
 * IMPORTANT: This router expects the following to be passed via app.locals:
 * - getDb: Database connection getter
 * - bcrypt: Password hashing library (for legacy endpoints)
 * - jwt: JWT library (for legacy endpoints)
 * - JWT_SECRET: Secret for JWT signing (for legacy endpoints)
 */

// ============================================
// AUTH ENDPOINTS
// ============================================

// POST /api/auth/register - DEPRECATED
// Registration is now handled by Supabase Google OAuth
router.post('/register', async (req, res) => {
  // ⚠️ DEPRECATED: This endpoint is no longer used
  // Registration is now handled by Supabase Google OAuth
  return res.status(410).json({ 
    error: 'This registration method is deprecated. Please use Google Sign-In.',
    message: 'User registration is now handled via Supabase OAuth. Use the Google Sign-In button on the frontend.'
  });
});

// POST /api/auth/login - DEPRECATED
// Authentication is now handled by Supabase Google OAuth
router.post('/login', async (req, res) => {
  // ⚠️ DEPRECATED: This endpoint is no longer used
  // Authentication is now handled by Supabase Google OAuth
  // See: poker.html -> signInWithGoogle()
  return res.status(410).json({ 
    error: 'This login method is deprecated. Please use Google Sign-In.',
    message: 'Authentication is now handled via Supabase OAuth. Use the Google Sign-In button on the frontend.'
  });
});

// POST /api/auth/sync-user - Sync Supabase user to backend database
// ⚠️ NO AUTH: This is called DURING login before token exists
router.post('/sync-user', withIdempotency, async (req, res) => {
  try {
    const { id, email, username, provider, isGuest } = req.body;
    
    if (!id || !username) {
      return res.status(400).json({ error: 'Missing required fields: id, username' });
    }
    
    // Skip syncing guest users
    if (isGuest) {
      console.log('ℹ️ Skipping sync for guest user:', username);
      return res.json({ 
        success: true, 
        message: 'Guest user - no sync needed',
        user: { id, username, isGuest: true }
      });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    console.log('🔄 Syncing user to backend:', { id, email, username, provider });
    
    // Check if user profile exists
    const existingProfile = await db.query(
      'SELECT id, username, display_name FROM user_profiles WHERE id = $1',
      [id]
    );
    
    if (existingProfile.rowCount === 0) {
      // Create new profile
      await db.query(
        `INSERT INTO user_profiles (id, username, display_name, created_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [id, username, username]
      );
      console.log('✅ Created new user profile:', username);
    } else {
      // Update existing profile if needed
      await db.query(
        `UPDATE user_profiles 
         SET username = $2, display_name = $3, updated_at = NOW()
         WHERE id = $1`,
        [id, username, username]
      );
      console.log('✅ Updated existing user profile:', username);
    }
    
    res.json({ 
      success: true,
      user: {
        id,
        username,
        email: email || '',
        provider: provider || 'google'
      }
    });
    
  } catch (error) {
    console.error('❌ User sync error:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
});

// POST /api/auth/check-username - Check if username is available
router.post('/check-username', async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Validate format: 3-20 chars, alphanumeric + underscore
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        error: 'Invalid username format',
        message: 'Username must be 3-20 characters (letters, numbers, underscore only)'
      });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Check if username exists (case-insensitive)
    const result = await db.query(
      'SELECT id FROM user_profiles WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    
    const available = result.rowCount === 0;
    
    res.json({ 
      available,
      username,
      message: available ? 'Username is available' : 'Username is already taken'
    });
    
  } catch (error) {
    console.error('❌ Check username error:', error);
    res.status(500).json({ error: 'Failed to check username' });
  }
});

// POST /api/auth/set-username - Set or update username for logged-in user
router.post('/set-username', async (req, res) => {
  try {
    const { userId, username } = req.body;
    
    if (!userId || !username) {
      return res.status(400).json({ error: 'userId and username are required' });
    }
    
    // Validate format
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ 
        error: 'Invalid username format',
        message: 'Username must be 3-20 characters (letters, numbers, underscore only)'
      });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Check if username is already taken by another user
    const existingUser = await db.query(
      'SELECT id FROM user_profiles WHERE LOWER(username) = LOWER($1) AND id != $2',
      [username, userId]
    );
    
    if (existingUser.rowCount > 0) {
      return res.status(409).json({ 
        error: 'Username already taken',
        message: 'This username is already in use. Please choose another.'
      });
    }
    
    // Update username
    await db.query(
      `UPDATE user_profiles 
       SET username = $1, 
           username_changed_at = NOW(),
           username_change_count = COALESCE(username_change_count, 0) + 1,
           updated_at = NOW()
       WHERE id = $2`,
      [username, userId]
    );
    
    console.log(`✅ Username set for user ${userId}: ${username}`);
    
    res.json({ 
      success: true,
      username,
      message: 'Username updated successfully'
    });
    
  } catch (error) {
    console.error('❌ Set username error:', error);
    res.status(500).json({ error: 'Failed to set username' });
  }
});

// GET /api/auth/profile/:userId - Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    const result = await db.query(
      `SELECT 
        id, username, display_name, avatar_url, bio,
        total_hands_played, total_wins, win_rate,
        total_games_played, total_winnings, best_hand,
        created_at
       FROM user_profiles 
       WHERE id = $1`,
      [userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    
    res.json(result.rows[0]);
    
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

module.exports = router;

