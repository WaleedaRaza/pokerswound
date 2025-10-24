// AUTH ROUTER - EXTRACTED FROM MONOLITH
// CRITICAL: Preserves Supabase OAuth integration and user sync logic

const express = require('express');
const router = express.Router();

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
router.post('/sync-user', async (req, res) => {
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

module.exports = router;

