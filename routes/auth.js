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
    
    if (!id) {
      return res.status(400).json({ error: 'Missing required field: id' });
    }
    
    // Username optional - will be set later via profile modal
    const finalUsername = username || `user_${id.substring(0, 8)}`;
    
    // Skip syncing guest users
    if (isGuest) {
      console.log('ℹ️ Skipping sync for guest user:', finalUsername);
      return res.json({ 
        success: true, 
        message: 'Guest user - no sync needed',
        user: { id, username: finalUsername, isGuest: true }
      });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    console.log('🔄 Syncing user to backend:', { id, email, username: finalUsername, provider });
    
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
        [id, finalUsername, finalUsername]
      );
      console.log('✅ Created new user profile:', finalUsername);
    } else {
      // Update existing profile if needed (only if username provided)
      if (username) {
        await db.query(
          `UPDATE user_profiles 
           SET username = $2, display_name = $3, updated_at = NOW()
           WHERE id = $1`,
          [id, finalUsername, finalUsername]
        );
        console.log('✅ Updated existing user profile:', finalUsername);
      } else {
        console.log('ℹ️ User profile exists, no username update needed');
      }
    }
    
    res.json({ 
      success: true,
      user: {
        id,
        username: finalUsername,
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
    
    console.log(`🔍 Username check: "${username}" - ${available ? 'AVAILABLE' : 'TAKEN'} (found ${result.rowCount} matches)`);
    
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
    
    // Check current username first
    const currentUser = await db.query(
      'SELECT username FROM user_profiles WHERE id = $1',
      [userId]
    );
    
    if (currentUser.rowCount === 0) {
      console.error(`❌ Set username: User ${userId} not found in database`);
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Your user profile was not found. Please try logging in again.'
      });
    }
    
    const currentUsername = currentUser.rows[0].username;
    
    // If username is the same, no change needed
    if (currentUsername && currentUsername.toLowerCase() === username.toLowerCase()) {
      return res.json({ 
        success: true,
        username,
        message: 'Username unchanged'
      });
    }
    
    // Check if username is already taken by another user
    const existingUser = await db.query(
      'SELECT id FROM user_profiles WHERE LOWER(username) = LOWER($1) AND id != $2',
      [username, userId]
    );
    
    if (existingUser.rowCount > 0) {
      console.log(`❌ Username "${username}" already taken by user ${existingUser.rows[0].id}`);
      return res.status(409).json({ 
        error: 'Username already taken',
        message: 'This username is already in use. Please choose another.'
      });
    }
    
    // Update username
    const updateResult = await db.query(
      `UPDATE user_profiles 
       SET username = $1, 
           username_changed_at = NOW(),
           username_change_count = COALESCE(username_change_count, 0) + 1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING username`,
      [username, userId]
    );
    
    if (updateResult.rowCount === 0) {
      console.error(`❌ Set username: Update failed - user ${userId} not found`);
      return res.status(404).json({ 
        error: 'Update failed',
        message: 'Failed to update username. User profile not found.'
      });
    }
    
    console.log(`✅ Username updated for user ${userId}: "${currentUsername}" → "${username}"`);
    
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
        (SELECT COUNT(DISTINCT room_id) FROM room_participations WHERE user_id = $1) as total_rooms_played,
        total_winnings, 
        best_hand, best_hand_date, biggest_pot,
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

// PUT /api/auth/profile - Update own profile (avatar_url, display_name)
router.put('/profile', async (req, res) => {
  try {
    // Get user from token (if using Supabase, extract from Authorization header)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify token and get user ID (simplified - you may need to use Supabase client)
    // For now, we'll use a simple approach: get user from token
    const getDb = req.app.locals.getDb;
    const db = getDb();
    if (!db) return res.status(500).json({ error: 'Database not configured' });
    
    // Try to get user from Supabase token
    // This is a simplified version - you may need to use Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Supabase not configured' });
    }
    
    // Use Supabase to verify token and get user
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    const userId = user.id;
    const { avatar_url, display_name } = req.body;
    
    // Update profile
    const result = await db.query(
      `UPDATE user_profiles 
       SET 
         avatar_url = COALESCE($1, avatar_url),
         display_name = COALESCE($2, display_name),
         updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, display_name, avatar_url, updated_at`,
      [avatar_url || null, display_name || null, userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json({ success: true, profile: result.rows[0] });
    
  } catch (error) {
    console.error('❌ Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;

