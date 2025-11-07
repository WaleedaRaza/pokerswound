/**
 * PokerGeek.ai - Social Features API
 * Handles usernames, friends, profile stats, and notifications
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// ✅ TWO CLIENTS: 
// 1. Auth client (ANON key) for validating user tokens
// 2. Admin client (SERVICE ROLE) for database operations
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('✅ Social router: Auth client (ANON) + Admin client (SERVICE ROLE)');

// ============================================
// MIDDLEWARE: AUTH CHECK
// ============================================
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  
  // ✅ Use ANON client to validate user token
  const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
  
  if (error || !user) {
    console.error('Auth error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = user;
  next();
}

// ============================================
// USERNAME ENDPOINTS
// ============================================

/**
 * POST /api/social/username/check
 * Check if username is available
 */
router.post('/username/check', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    const currentUserId = req.user.id;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    // Validate format (3-20 chars, alphanumeric + underscore)
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters (letters, numbers, underscore only)' 
      });
    }

    // ✅ Use Supabase (service role bypasses RLS)
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .ilike('username', username)  // Case-insensitive
      .neq('id', currentUserId)  // Exclude current user
      .maybeSingle();

    if (error) {
      console.error('Error checking username:', error);
      throw error;
    }

    const available = !data;
    res.json({ available, username });
  } catch (error) {
    console.error('Error checking username:', error);
    res.status(500).json({ error: 'Failed to check username' });
  }
});

/**
 * POST /api/social/username/set
 * Set username for current user
 */
router.post('/username/set', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    // Validate format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters (letters, numbers, underscore only)' 
      });
    }

    // Check if user already has username
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username')
      .eq('id', userId)
      .single();

    if (profile && profile.username) {
      return res.status(400).json({ error: 'Username already set' });
    }

    // Set username
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        username, 
        username_set_at: new Date().toISOString() 
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Username already taken' });
      }
      throw error;
    }

    res.json({ success: true, username: data.username });
  } catch (error) {
    console.error('Error setting username:', error);
    res.status(500).json({ error: 'Failed to set username' });
  }
});

/**
 * POST /api/social/username/change
 * Change existing username
 */
router.post('/username/change', requireAuth, async (req, res) => {
  try {
    const { username } = req.body;
    const userId = req.user.id;

    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Validate format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters (letters, numbers, underscore only)' 
      });
    }

    // Get current profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username, username_change_count, max_username_changes')
      .eq('id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Check if trying to set same username
    if (profile.username === username) {
      return res.status(400).json({ error: 'This is already your username' });
    }

    // ✅ No username change limit - users can change unlimited times
    const changeCount = profile.username_change_count || 0;

    // Check if new username is available
    const { data: existing } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    // Log the change to username_changes table
    await supabase
      .from('username_changes')
      .insert({
        user_id: userId,
        old_username: profile.username,
        new_username: username
      });

    // Update username
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ 
        username,
        username_changed_at: new Date().toISOString(),
        username_change_count: changeCount + 1
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'Username already taken' });
      }
      throw error;
    }

    res.json({ 
      success: true, 
      username: data.username,
      changes_remaining: 999  // Unlimited
    });
  } catch (error) {
    console.error('Error changing username:', error);
    res.status(500).json({ error: 'Failed to change username' });
  }
});

/**
 * GET /api/social/username/:username
 * Get user profile by username
 */
router.get('/username/:username', requireAuth, async (req, res) => {
  try {
    const { username } = req.params;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url, total_hands_played, total_games_played, win_rate')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'User not found' });
      }
      throw error;
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching user by username:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ============================================
// PROFILE STATS ENDPOINTS
// ============================================

/**
 * GET /api/social/profile/me
 * Get current user's profile with stats
 * ⚠️ MUST BE BEFORE /:userId TO AVOID ROUTE COLLISION
 */
router.get('/profile/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // ✅ USE POSTGRESQL QUERY (like /api/auth/profile/:userId) for computed fields
    const getDb = req.app.locals.getDb;
    const db = getDb();
    
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
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
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    // Get friend count using Supabase (for RLS compatibility)
    const { count: friendCount } = await supabase
      .from('friendships')
      .select('*', { count: 'exact', head: true })
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');
    
    res.json({ ...result.rows[0], friend_count: friendCount || 0 });
    
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PUT /api/social/profile
 * Update current user's profile (avatar_url, display_name)
 */
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { avatar_url, display_name } = req.body;
    
    if (!avatar_url && !display_name) {
      return res.status(400).json({ error: 'At least one field (avatar_url or display_name) is required' });
    }
    
    // ✅ Use Supabase to update profile
    const updates = {};
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;
    if (display_name !== undefined) updates.display_name = display_name;
    
    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select('id, username, display_name, avatar_url, updated_at')
      .single();
    
    if (error) {
      console.error('Error updating profile:', error);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
    
    if (!data) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json({ success: true, profile: data });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * GET /api/social/profile/:userId
 * Get any user's profile (with privacy controls)
 * ⚠️ MUST BE AFTER /me TO AVOID ROUTE COLLISION
 */
router.get('/profile/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    // Get profile
    const result = await db.query(
      `SELECT 
        id, username, display_name, avatar_url, bio,
        total_hands_played, total_wins, win_rate,
        (SELECT COUNT(DISTINCT room_id) FROM room_participations WHERE user_id = $1) as total_rooms_played,
        total_winnings, 
        best_hand, best_hand_date, biggest_pot,
        show_game_history, show_online_status,
        created_at
       FROM user_profiles 
       WHERE id = $1`,
      [userId]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    const profile = result.rows[0];
    
    // Check privacy: if not friends and show_game_history is false, hide stats
    if (profile.show_game_history === false && requesterId !== userId) {
      // Check if friends
      const friendCheck = await db.query(
        `SELECT id FROM friendships 
         WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
           AND status = 'accepted'`,
        [requesterId, userId]
      );
      
      if (friendCheck.rowCount === 0) {
        // Not friends, hide stats
        profile.total_hands_played = null;
        profile.total_wins = null;
        profile.win_rate = null;
        profile.total_rooms_played = null;
        profile.total_winnings = null;
        profile.best_hand = null;
        profile.biggest_pot = null;
      }
    }
    
    // Get friend count
    const friendCountResult = await db.query(
      `SELECT COUNT(*) as count FROM friendships 
       WHERE ((requester_id = $1) OR (addressee_id = $1))
         AND status = 'accepted'`,
      [userId]
    );
    const friendCount = parseInt(friendCountResult.rows[0]?.count || 0);
    
    // Check if requester and profile user are friends
    const areFriends = await db.query(
      `SELECT id FROM friendships 
       WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
         AND status = 'accepted'`,
      [requesterId, userId]
    );
    
    // Check if there's a pending friend request
    const pendingRequest = await db.query(
      `SELECT id, requester_id FROM friendships 
       WHERE ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
         AND status = 'pending'`,
      [requesterId, userId]
    );
    
    res.json({ 
      ...profile, 
      friend_count: friendCount,
      is_friend: areFriends.rowCount > 0,
      is_own_profile: requesterId === userId,
      pending_friend_request: pendingRequest.rowCount > 0 ? {
        exists: true,
        sent_by_me: pendingRequest.rows[0]?.requester_id === requesterId
      } : { exists: false }
    });
    
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * PATCH /api/social/profile/me
 * Update current user's profile
 */
router.patch('/profile/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { display_name, avatar_url } = req.body;

    const updates = {};
    if (display_name) updates.display_name = display_name;
    if (avatar_url) updates.avatar_url = avatar_url;

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ============================================
// FRIENDS ENDPOINTS
// ============================================

/**
 * GET /api/social/friends
 * Get list of current user's friends
 */
router.get('/friends', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get friendships where user is either requester_id or addressee_id (existing schema)
    const { data: friendships, error } = await supabase
      .from('friendships')
      .select(`
        id,
        requester_id,
        addressee_id,
        status,
        created_at
      `)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted');

    if (error) throw error;

    // Get friend IDs
    const friendIds = friendships.map(f => 
      f.requester_id === userId ? f.addressee_id : f.requester_id
    );

    if (friendIds.length === 0) {
      return res.json([]);
    }

    // Fetch friend profiles
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', friendIds);

    if (profileError) throw profileError;

    res.json(profiles);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

/**
 * POST /api/social/friends/request
 * Send friend request
 */
router.post('/friends/request', requireAuth, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ error: 'Username required' });
    }

    // Find receiver by username
    const { data: receiver, error: receiverError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (receiverError || !receiver) {
      return res.status(404).json({ error: 'User not found' });
    }

    const receiverId = receiver.id;

    // Can't friend yourself
    if (senderId === receiverId) {
      return res.status(400).json({ error: 'Cannot friend yourself' });
    }

    // Check if already friends (existing schema uses requester_id/addressee_id)
    const { data: existing } = await supabase
      .from('friendships')
      .select('id')
      .or(`and(requester_id.eq.${senderId},addressee_id.eq.${receiverId}),and(requester_id.eq.${receiverId},addressee_id.eq.${senderId})`)
      .eq('status', 'accepted')
      .single();

    if (existing) {
      return res.status(409).json({ error: 'Already friends' });
    }

    // Check if request already exists
    const { data: existingRequest } = await supabase
      .from('friend_requests')
      .select('id, status')
      .eq('sender_id', senderId)
      .eq('receiver_id', receiverId)
      .single();

    if (existingRequest) {
      return res.status(409).json({ error: 'Friend request already sent' });
    }

    // Create friend request
    const { data, error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // Create notification for receiver
    await supabase
      .from('notifications')
      .insert({
        user_id: receiverId,
        type: 'friend_request',
        title: 'New Friend Request',
        message: `You have a new friend request`,
        action_url: '/friends'
      });

    res.json({ success: true, request: data });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

/**
 * GET /api/social/friends/requests
 * Get pending friend requests (received)
 */
router.get('/friends/requests', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from('friend_requests')
      .select(`
        id,
        sender_id,
        created_at,
        sender:user_profiles!sender_id(id, username, display_name, avatar_url)
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching friend requests:', error);
    res.status(500).json({ error: 'Failed to fetch friend requests' });
  }
});

/**
 * POST /api/social/friends/accept/:requestId
 * Accept friend request
 */
router.post('/friends/accept/:requestId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    // Get request
    const { data: request, error: requestError } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('id', requestId)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .single();

    if (requestError || !request) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Update request status
    await supabase
      .from('friend_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    // Create friendship using existing schema (requester_id, addressee_id)
    const { data: friendship, error: friendshipError } = await supabase
      .from('friendships')
      .insert({
        requester_id: request.sender_id,
        addressee_id: userId,
        status: 'accepted'
      })
      .select()
      .single();

    if (friendshipError) throw friendshipError;

    // Create notification for sender
    await supabase
      .from('notifications')
      .insert({
        user_id: request.sender_id,
        type: 'friend_accepted',
        title: 'Friend Request Accepted',
        message: 'Your friend request was accepted',
        action_url: '/friends'
      });

    res.json({ success: true, friendship });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

/**
 * POST /api/social/friends/reject/:requestId
 * Reject friend request
 */
router.post('/friends/reject/:requestId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    const { data, error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('receiver_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

/**
 * DELETE /api/social/friends/:friendId
 * Remove friend
 */
router.delete('/friends/:friendId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { friendId } = req.params;

    // Delete using existing schema (requester_id/addressee_id)
    const { error } = await supabase
      .from('friendships')
      .delete()
      .or(`and(requester_id.eq.${userId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${userId})`);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================

/**
 * GET /api/social/notifications
 * Get notifications for current user
 */
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, unread_only = false } = req.query;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * PATCH /api/social/notifications/:id/read
 * Mark notification as read
 */
router.patch('/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

/**
 * PATCH /api/social/notifications/read-all
 * Mark all notifications as read
 */
router.patch('/notifications/read-all', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

/**
 * GET /api/social/notifications/count
 * Get unread notification count
 */
router.get('/notifications/count', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    res.json({ count: count || 0 });
  } catch (error) {
    console.error('Error fetching notification count:', error);
    res.status(500).json({ error: 'Failed to fetch count' });
  }
});

// ============================================
// ANALYTICS ENDPOINTS
// ============================================

/**
 * GET /api/social/analytics/hands/:userId
 * Fetch paginated hand history for a user with filters
 * 
 * Query params:
 * - limit: 100 (default)
 * - offset: 0 (default)
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - roomId: UUID filter
 * - minHandRank: 1-10 (1=Royal Flush, 10=High Card)
 * - maxHandRank: 1-10
 */
router.get('/analytics/hands/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { 
      limit = 100, 
      offset = 0, 
      startDate, 
      endDate, 
      roomId,
      minHandRank,
      maxHandRank
    } = req.query;
    
    // Security: Users can only view their own hands (unless admin)
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    // Build dynamic query
    const conditions = ['$1 = ANY(player_ids)'];  // User was in hand
    const params = [userId];
    let paramIndex = 2;
    
    if (startDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(new Date(startDate));
      paramIndex++;
    }
    
    if (endDate) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(new Date(endDate));
      paramIndex++;
    }
    
    if (roomId) {
      conditions.push(`room_id = $${paramIndex}`);
      params.push(roomId);
      paramIndex++;
    }
    
    if (minHandRank) {
      conditions.push(`hand_rank >= $${paramIndex}`);
      params.push(parseInt(minHandRank));
      paramIndex++;
    }
    
    if (maxHandRank) {
      conditions.push(`hand_rank <= $${paramIndex}`);
      params.push(parseInt(maxHandRank));
      paramIndex++;
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM hand_history WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || 0);
    
    // Get hands
    const handsResult = await db.query(
      `SELECT 
        hh.id, hh.game_id, hh.room_id, hh.hand_number, hh.pot_size,
        hh.player_ids, hh.winner_id, hh.winning_hand, hh.hand_rank,
        hh.board_cards, hh.encoded_hand, hh.created_at,
        r.name as room_name,
        up.username as winner_username
       FROM hand_history hh
       LEFT JOIN rooms r ON r.id = hh.room_id
       LEFT JOIN user_profiles up ON up.id = hh.winner_id
       WHERE ${whereClause}
       ORDER BY hh.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), parseInt(offset)]
    );
    
    res.json({
      hands: handsResult.rows,
      total: total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      hasMore: offset + handsResult.rows.length < total
    });
    
  } catch (error) {
    console.error('Error fetching hand history:', error);
    res.status(500).json({ error: 'Failed to fetch hand history' });
  }
});

/**
 * GET /api/social/analytics/stats/:userId
 * Get comprehensive analytics stats (lifetime stats, VPIP/PFR, aggression factor)
 */
router.get('/analytics/stats/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Security check
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    // Get profile stats
    const profileResult = await db.query(
      `SELECT 
        total_hands_played,
        total_wins,
        win_rate,
        biggest_pot,
        best_hand,
        best_hand_date,
        (SELECT COUNT(DISTINCT room_id) FROM room_participations WHERE user_id = $1) as total_rooms_played
       FROM user_profiles
       WHERE id = $1`,
      [userId]
    );
    
    // Get player statistics (VPIP/PFR/Aggression)
    const statsResult = await db.query(
      `SELECT 
        vpip_percentage,
        pfr_percentage,
        aggression_factor,
        total_profit_loss,
        current_win_streak,
        longest_win_streak
       FROM player_statistics
       WHERE user_id = $1`,
      [userId]
    );
    
    // Calculate profit/loss from hand history
    const profitLossResult = await db.query(
      `SELECT 
        SUM(CASE WHEN winner_id = $1 THEN pot_size ELSE 0 END) as total_winnings,
        COUNT(*) as total_hands
       FROM hand_history
       WHERE $1 = ANY(player_ids)`,
      [userId]
    );
    
    const profile = profileResult.rows[0] || {};
    const stats = statsResult.rows[0] || {};
    const profitLoss = profitLossResult.rows[0] || {};
    
    // Calculate estimated profit (simplified: winnings - estimated losses)
    // In a real system, you'd track buy-ins and cash-outs per hand
    const estimatedProfit = profitLoss.total_winnings 
      ? Math.round(profitLoss.total_winnings * 0.3) // Rough estimate
      : 0;
    
    res.json({
      lifetime: {
        handsPlayed: profile.total_hands_played || 0,
        handsWon: profile.total_wins || 0,
        winRate: parseFloat(profile.win_rate || 0).toFixed(2),
        roomsPlayed: parseInt(profile.total_rooms_played || 0),
        biggestPot: profile.biggest_pot || 0,
        bestHand: profile.best_hand || null,
        bestHandDate: profile.best_hand_date || null
      },
      advanced: {
        vpip: parseFloat(stats.vpip_percentage || 0).toFixed(2),
        pfr: parseFloat(stats.pfr_percentage || 0).toFixed(2),
        aggressionFactor: parseFloat(stats.aggression_factor || 0).toFixed(2),
        profitLoss: stats.total_profit_loss || estimatedProfit,
        currentStreak: stats.current_win_streak || 0,
        longestStreak: stats.longest_win_streak || 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    res.status(500).json({ error: 'Failed to fetch analytics stats' });
  }
});

/**
 * GET /api/social/analytics/hands/:userId
 * Get paginated hand history with filters
 */
router.get('/analytics/hands/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, roomId, startDate, endDate, minPot, handRank } = req.query;
    
    // Security check
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build WHERE clause
    let whereClause = `$1 = ANY(hh.player_ids)`;
    const params = [userId];
    let paramIndex = 2;
    
    if (roomId) {
      whereClause += ` AND hh.room_id = $${paramIndex}`;
      params.push(roomId);
      paramIndex++;
    }
    
    if (startDate) {
      whereClause += ` AND hh.created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }
    
    if (endDate) {
      whereClause += ` AND hh.created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }
    
    if (minPot) {
      whereClause += ` AND hh.pot_size >= $${paramIndex}`;
      params.push(parseInt(minPot));
      paramIndex++;
    }
    
    if (handRank) {
      whereClause += ` AND hh.hand_rank = $${paramIndex}`;
      params.push(parseInt(handRank));
      paramIndex++;
    }
    
    // Get total count
    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM hand_history hh WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);
    
    // Get hands
    const handsResult = await db.query(
      `SELECT 
        hh.id,
        hh.game_id,
        hh.room_id,
        hh.hand_number,
        hh.pot_size,
        hh.winner_id,
        hh.winning_hand,
        hh.hand_rank,
        hh.board_cards,
        hh.created_at,
        r.name as room_name,
        CASE WHEN hh.winner_id = $1 THEN true ELSE false END as won
       FROM hand_history hh
       LEFT JOIN rooms r ON r.id = hh.room_id
       WHERE ${whereClause}
       ORDER BY hh.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );
    
    res.json({
      hands: handsResult.rows.map(row => ({
        id: row.id,
        gameId: row.game_id,
        roomId: row.room_id,
        roomName: row.room_name || 'Unknown Room',
        handNumber: row.hand_number,
        potSize: row.pot_size,
        won: row.won,
        winningHand: row.winning_hand,
        handRank: row.hand_rank,
        boardCards: row.board_cards,
        createdAt: row.created_at
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Error fetching hand history:', error);
    res.status(500).json({ error: 'Failed to fetch hand history' });
  }
});

/**
 * GET /api/social/analytics/positional/:userId
 * Get stats broken down by position
 */
router.get('/analytics/positional/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Security check
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    // Get positional stats from player_statistics
    const statsResult = await db.query(
      `SELECT 
        vpip_early_position,
        vpip_middle_position,
        vpip_late_position,
        vpip_blinds
       FROM player_statistics
       WHERE user_id = $1`,
      [userId]
    );
    
    const stats = statsResult.rows[0] || {};
    
    // Get win rate by position from player_hand_history
    const winRateResult = await db.query(
      `SELECT 
        position,
        COUNT(*) as hands_played,
        SUM(CASE WHEN hand_outcome = 'WIN' THEN 1 ELSE 0 END) as hands_won
       FROM player_hand_history
       WHERE user_id = $1 AND position IS NOT NULL
       GROUP BY position`,
      [userId]
    );
    
    const positionalWinRates = {};
    winRateResult.rows.forEach(row => {
      const winRate = row.hands_played > 0 
        ? ((row.hands_won / row.hands_played) * 100).toFixed(2)
        : 0;
      positionalWinRates[row.position] = {
        handsPlayed: parseInt(row.hands_played),
        handsWon: parseInt(row.hands_won),
        winRate: parseFloat(winRate)
      };
    });
    
    res.json({
      vpip: {
        early: parseFloat(stats.vpip_early_position || 0).toFixed(2),
        middle: parseFloat(stats.vpip_middle_position || 0).toFixed(2),
        late: parseFloat(stats.vpip_late_position || 0).toFixed(2),
        blinds: parseFloat(stats.vpip_blinds || 0).toFixed(2)
      },
      winRates: positionalWinRates
    });
    
  } catch (error) {
    console.error('Error fetching positional stats:', error);
    res.status(500).json({ error: 'Failed to fetch positional stats' });
  }
});

/**
 * GET /api/social/analytics/charts/:userId
 * Get chart data (win rate over time, profit/loss)
 */
router.get('/analytics/charts/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { period = 'weekly' } = req.query; // daily, weekly, monthly
    
    // Security check
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    // Determine date grouping
    let dateFormat, interval;
    if (period === 'daily') {
      dateFormat = 'YYYY-MM-DD';
      interval = '1 day';
    } else if (period === 'weekly') {
      dateFormat = 'YYYY-"W"WW';
      interval = '1 week';
    } else {
      dateFormat = 'YYYY-MM';
      interval = '1 month';
    }
    
    // Win rate over time
    const winRateResult = await db.query(
      `SELECT 
        TO_CHAR(hh.created_at, $1) as period,
        COUNT(*) as total_hands,
        SUM(CASE WHEN hh.winner_id = $2 THEN 1 ELSE 0 END) as wins
       FROM hand_history hh
       WHERE $2 = ANY(hh.player_ids)
       GROUP BY period
       ORDER BY period DESC
       LIMIT 30`,
      [dateFormat, userId]
    );
    
    const winRateData = winRateResult.rows.map(row => ({
      period: row.period,
      winRate: row.total_hands > 0 
        ? parseFloat(((row.wins / row.total_hands) * 100).toFixed(2))
        : 0,
      handsPlayed: parseInt(row.total_hands)
    })).reverse(); // Oldest first for chart
    
    // Profit/loss over time (simplified)
    const profitLossResult = await db.query(
      `SELECT 
        TO_CHAR(hh.created_at, $1) as period,
        SUM(CASE WHEN hh.winner_id = $2 THEN hh.pot_size ELSE 0 END) as winnings,
        COUNT(*) as total_hands
       FROM hand_history hh
       WHERE $2 = ANY(hh.player_ids)
       GROUP BY period
       ORDER BY period DESC
       LIMIT 30`,
      [dateFormat, userId]
    );
    
    const profitLossData = profitLossResult.rows.map(row => {
      // Estimate losses (rough calculation)
      const estimatedLoss = row.total_hands > 0 
        ? Math.round(row.winnings * 0.7) // Rough estimate
        : 0;
      return {
        period: row.period,
        profit: row.winnings - estimatedLoss,
        winnings: parseInt(row.winnings),
        handsPlayed: parseInt(row.total_hands)
      };
    }).reverse();
    
    res.json({
      winRate: winRateData,
      profitLoss: profitLossData,
      period
    });
    
  } catch (error) {
    console.error('Error fetching chart data:', error);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

/**
 * GET /api/social/analytics/rooms/:userId
 * Get list of rooms user has played in (for filter dropdown)
 */
router.get('/analytics/rooms/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Security check
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    const result = await db.query(
      `SELECT DISTINCT r.id, r.name, COUNT(hh.id) as hand_count
       FROM room_participations rp
       JOIN rooms r ON r.id = rp.room_id
       LEFT JOIN hand_history hh ON hh.room_id = r.id AND $1 = ANY(hh.player_ids)
       WHERE rp.user_id = $1
       GROUP BY r.id, r.name
       ORDER BY hand_count DESC
       LIMIT 50`,
      [userId]
    );
    
    res.json({ rooms: result.rows });
    
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

/**
 * GET /api/social/badges/:userId
 * Get user's earned badges and rank
 */
router.get('/badges/:userId', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Security check
    if (req.user.id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const getDb = req.app.locals.getDb;
    const db = getDb();
    
    if (!db) {
      return res.status(500).json({ error: 'Database not configured' });
    }
    
    // Get user badges
    const badgesResult = await db.query(
      `SELECT 
        ub.id,
        ub.earned_at,
        bd.name,
        bd.description,
        bd.icon,
        bd.category,
        bd.rarity
       FROM user_badges ub
       JOIN badge_definitions bd ON bd.id = ub.badge_id
       WHERE ub.user_id = $1
       ORDER BY ub.earned_at DESC`,
      [userId]
    );
    
    // Get user rank
    const rankResult = await db.query(
      `SELECT level, experience_points, rank_title
       FROM user_ranks
       WHERE user_id = $1`,
      [userId]
    );
    
    const rank = rankResult.rows[0] || {
      level: 1,
      experience_points: 0,
      rank_title: 'Novice'
    };
    
    res.json({
      badges: badgesResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        description: row.description,
        icon: row.icon,
        category: row.category,
        rarity: row.rarity,
        earnedAt: row.earned_at
      })),
      rank: {
        level: parseInt(rank.level),
        xp: parseInt(rank.experience_points),
        title: rank.rank_title
      }
    });
    
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

module.exports = router;

